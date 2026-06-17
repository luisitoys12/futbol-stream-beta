const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middleware admin
const requireAdmin = (req, res, next) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (user.role !== 'admin') return res.status(403).json({ error: 'Solo admins' });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: 'Token inválido' }); }
};

// Generar invite codes
router.post('/invite-codes', requireAdmin, async (req, res) => {
  const { count = 1, expires_days = 7 } = req.body;
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    const expires_at = new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO invite_codes (code, expires_at) VALUES ($1, $2)',
      [code, expires_at]
    );
    codes.push(code);
  }
  res.json({ codes });
});

// Listar usuarios beta
router.get('/users', requireAdmin, async (req, res) => {
  const result = await pool.query('SELECT id, email, is_beta, role, created_at FROM users ORDER BY created_at DESC');
  res.json(result.rows);
});

module.exports = router;
