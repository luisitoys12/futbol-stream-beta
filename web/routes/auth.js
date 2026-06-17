const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── LOGIN ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !await bcrypt.compare(password, user.password_hash))
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, is_beta: true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('session', token, { httpOnly: true, secure: true, maxAge: 7*24*60*60*1000 });
    res.json({ success: true, role: user.role });
  } catch(e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─── REGISTRO USUARIO (libre, sin código) ────────────────
router.post('/register/user', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6)
    return res.status(400).json({ error: 'Email y contraseña requeridos (mín. 6 caracteres)' });
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (id, email, password_hash, role) VALUES ($1,$2,$3,$4)',
      [uuidv4(), email, hash, 'user']
    );
    res.json({ success: true, message: 'Cuenta creada. Ya puedes iniciar sesión.' });
  } catch(e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─── REGISTRO STREAMER (requiere invite code) ────────────
router.post('/register/streamer', async (req, res) => {
  const { email, password, invite_code } = req.body;
  if (!email || !password || !invite_code)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  try {
    const inv = await pool.query(
      'SELECT * FROM invite_codes WHERE code = $1 AND used = false AND expires_at > NOW()',
      [invite_code.toUpperCase()]
    );
    if (!inv.rows[0])
      return res.status(400).json({ error: 'Código inválido o expirado' });

    const hash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    await pool.query(
      'INSERT INTO users (id, email, password_hash, role) VALUES ($1,$2,$3,$4)',
      [userId, email, hash, 'streamer']
    );
    await pool.query('UPDATE invite_codes SET used = true WHERE code = $1', [invite_code.toUpperCase()]);
    res.json({ success: true, message: 'Cuenta de streamer creada. Ya puedes iniciar sesión.' });
  } catch(e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─── LOGOUT ──────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('session');
  res.redirect('/login');
});

module.exports = router;
