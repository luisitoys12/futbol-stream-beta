const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function auth(req,res,next){
  const t=req.cookies?.session;
  if(!t) return res.status(401).json({error:'No autorizado'});
  try{req.user=jwt.verify(t,process.env.JWT_SECRET);next();}
  catch{res.status(401).json({error:'Token invalido'});}
}

// POST /api/follow/:channelId
router.post('/:channelId', auth, async (req,res) => {
  const { channelId } = req.params;
  try {
    await pool.query(
      'INSERT INTO followers (user_id,channel_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user.id, channelId]
    );
    await pool.query(
      'UPDATE channels SET total_followers=(SELECT COUNT(*) FROM followers WHERE channel_id=$1) WHERE id=$1',
      [channelId]
    );
    const {rows} = await pool.query('SELECT total_followers FROM channels WHERE id=$1',[channelId]);
    res.json({ following: true, total: rows[0]?.total_followers || 0 });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// DELETE /api/follow/:channelId
router.delete('/:channelId', auth, async (req,res) => {
  const { channelId } = req.params;
  await pool.query('DELETE FROM followers WHERE user_id=$1 AND channel_id=$2',[req.user.id, channelId]);
  await pool.query(
    'UPDATE channels SET total_followers=(SELECT COUNT(*) FROM followers WHERE channel_id=$1) WHERE id=$1',
    [channelId]
  );
  const {rows} = await pool.query('SELECT total_followers FROM channels WHERE id=$1',[channelId]);
  res.json({ following: false, total: rows[0]?.total_followers || 0 });
});

// GET /api/follow/:channelId/status
router.get('/:channelId/status', auth, async (req,res) => {
  const {rows} = await pool.query(
    'SELECT id FROM followers WHERE user_id=$1 AND channel_id=$2',
    [req.user.id, req.params.channelId]
  );
  res.json({ following: rows.length > 0 });
});

module.exports = router;
