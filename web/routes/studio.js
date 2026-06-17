const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function requireStreamer(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (!['streamer','admin'].includes(user.role)) return res.status(403).json({ error: 'Solo streamers' });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: 'Token invalido' }); }
}

// GET /api/studio/channel
router.get('/channel', requireStreamer, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM channels WHERE owner_id=$1 LIMIT 1', [req.user.id]);
  res.json(rows[0] || null);
});

// POST /api/studio/channel
router.post('/channel', requireStreamer, async (req, res) => {
  const { name, description, type = 'rtmp' } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const slug = name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  const stream_key = 'sk_' + crypto.randomBytes(12).toString('hex');
  try {
    const { rows } = await pool.query(
      `INSERT INTO channels (id,owner_id,name,slug,description,type,stream_key)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, name, slug, description||'', type, stream_key]
    );
    res.json(rows[0]);
  } catch(e) {
    if (e.code==='23505') return res.status(400).json({ error: 'Ya tienes un canal.' });
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/studio/channel
router.patch('/channel', requireStreamer, async (req, res) => {
  const { name, description, type, youtube_id, thumbnail } = req.body;
  const { rows } = await pool.query('SELECT * FROM channels WHERE owner_id=$1 LIMIT 1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'No tienes canal' });
  const ch = rows[0];
  const updated = await pool.query(
    `UPDATE channels SET name=$1,description=$2,type=$3,youtube_id=$4,thumbnail=$5 WHERE id=$6 RETURNING *`,
    [name||ch.name, description||ch.description, type||ch.type, youtube_id||ch.youtube_id, thumbnail||ch.thumbnail, ch.id]
  );
  res.json(updated.rows[0]);
});

// POST /api/studio/channel/rotate-key — tipo Kick
router.post('/channel/rotate-key', requireStreamer, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM channels WHERE owner_id=$1 LIMIT 1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'No tienes canal' });
  const new_key = 'sk_' + crypto.randomBytes(12).toString('hex');
  await pool.query('UPDATE channels SET stream_key=$1 WHERE id=$2', [new_key, rows[0].id]);
  res.json({ success: true, stream_key: new_key });
});

// GET /api/studio/ingest
router.get('/ingest', requireStreamer, (req, res) => {
  const base = process.env.INGEST_HOST || 'futbol-stream-ingest-floral-brook-5015.fly.dev';
  res.json({ rtmp: `rtmp://${base}/live`, srt: `srt://${base}:8890` });
});

module.exports = router;
