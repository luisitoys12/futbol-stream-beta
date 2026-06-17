const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !await bcrypt.compare(password, user.password_hash))
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    if (!user.is_beta)
      return res.status(403).json({ error: 'Solo acceso por invitación beta' });
    const token = jwt.sign(
      { id: user.id, email: user.email, is_beta: user.is_beta, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('session', token, { httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Registro con invite code
router.post('/register', async (req, res) => {
  const { email, password, invite_code } = req.body;
  try {
    const invite = await pool.query(
      'SELECT * FROM invite_codes WHERE code = $1 AND used = false AND expires_at > NOW()',
      [invite_code]
    );
    if (!invite.rows[0]) return res.status(400).json({ error: 'Código de invitación inválido o expirado' });
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (email, password_hash, is_beta) VALUES ($1, $2, true)',
      [email, hash]
    );
    await pool.query('UPDATE invite_codes SET used = true WHERE code = $1', [invite_code]);
    res.json({ success: true, message: 'Cuenta creada. Ya puedes iniciar sesión.' });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('session');
  res.redirect('/');
});

module.exports = router;
