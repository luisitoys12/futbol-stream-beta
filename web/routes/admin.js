const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function requireAdmin(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Solo admins' });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: 'Token invalido' }); }
}

function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token invalido' }); }
}

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id,email,role,created_at FROM users WHERE id=$1', [req.user.id]);
  res.json(rows[0] || {});
});

router.get('/stats', requireAdmin, async (req, res) => {
  const [users, streamers, channels, codes] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM users WHERE role='user'"),
    pool.query("SELECT COUNT(*) FROM users WHERE role='streamer'"),
    pool.query('SELECT COUNT(*) FROM channels'),
    pool.query('SELECT COUNT(*) FROM invite_codes WHERE used=false AND expires_at > NOW()')
  ]);
  res.json({
    users: parseInt(users.rows[0].count),
    streamers: parseInt(streamers.rows[0].count),
    channels: parseInt(channels.rows[0].count),
    codes_available: parseInt(codes.rows[0].count)
  });
});

router.get('/users', requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT id,email,role,created_at FROM users ORDER BY created_at DESC');
  res.json(rows);
});

router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['user','streamer','admin'].includes(role)) return res.status(400).json({ error: 'Rol invalido' });
  await pool.query('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id]);
  res.json({ success: true });
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

router.get('/invite-codes', requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM invite_codes ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/invite-codes', requireAdmin, async (req, res) => {
  const { count = 1, expires_days = 30 } = req.body;
  const codes = [];
  for (let i = 0; i < Math.min(count, 50); i++) {
    const code = 'FSTV-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const expires_at = new Date(Date.now() + expires_days * 86400000);
    await pool.query('INSERT INTO invite_codes (id,code,used,expires_at) VALUES (gen_random_uuid(),$1,false,$2)', [code, expires_at]);
    codes.push(code);
  }
  res.json({ success: true, codes });
});

router.delete('/invite-codes/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM invite_codes WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

router.get('/channels', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*, u.email as owner_email
    FROM channels c LEFT JOIN users u ON u.id=c.owner_id
    ORDER BY c.created_at DESC
  `);
  res.json(rows);
});

router.delete('/channels/:id', requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM channels WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
