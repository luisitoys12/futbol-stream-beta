const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token invalido' }); }
}

// GET /api/channels  -- todos los canales (para home grid)
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.id, c.name, c.slug, c.description, c.type,
           c.thumbnail, c.is_live, c.viewer_count, c.created_at,
           u.email as owner_email
    FROM channels c
    LEFT JOIN users u ON u.id = c.owner_id
    ORDER BY c.is_live DESC, c.viewer_count DESC, c.created_at DESC
  `);
  res.json(rows);
});

// GET /api/channels/:slug  -- canal individual
router.get('/:slug', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, u.email as owner_email
    FROM channels c
    LEFT JOIN users u ON u.id = c.owner_id
    WHERE c.slug = $1
  `, [req.params.slug]);
  if (!rows[0]) return res.status(404).json({ error: 'Canal no encontrado' });
  res.json(rows[0]);
});

module.exports = router;
