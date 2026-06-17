const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Listar canales activos
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, slug, type, thumbnail, is_live FROM channels WHERE is_active = true ORDER BY is_live DESC, name ASC'
  );
  res.json(result.rows);
});

// Obtener canal por slug
router.get('/:slug', async (req, res) => {
  const result = await pool.query('SELECT * FROM channels WHERE slug = $1 AND is_active = true', [req.params.slug]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Canal no encontrado' });
  const ch = result.rows[0];
  // No exponer stream_key al frontend
  delete ch.stream_key;
  res.json(ch);
});

// Registrar club / agregar canal (requiere auth beta)
router.post('/register', async (req, res) => {
  const { name, slug, type, youtube_id, description } = req.body;
  const streamKey = crypto.randomBytes(16).toString('hex');
  try {
    const result = await pool.query(
      'INSERT INTO channels (id, name, slug, type, stream_key, youtube_id, description) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, name, slug, type',
      [uuidv4(), name, slug, type, streamKey, youtube_id || null, description || null]
    );
    const ch = result.rows[0];
    // Solo mostrar stream_key al registrar
    res.json({
      ...ch,
      stream_key: streamKey,
      rtmp_url: `rtmp://${process.env.INGEST_HOST}/live/${streamKey}`,
      srt_url: `srt://${process.env.INGEST_HOST}:8890?streamid=${streamKey}`
    });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Slug ya en uso' });
    res.status(500).json({ error: 'Error al registrar canal' });
  }
});

module.exports = router;
