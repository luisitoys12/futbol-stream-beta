require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt  = require('jsonwebtoken');
const path = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth',         require('./routes/auth'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/videos',   require('./routes/videos'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/studio',   require('./routes/studio'));

function requireAuth(req, res, next) {
  const token = req.cookies.session;
  if (!token) return res.redirect('/login');
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.redirect('/login'); }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res.status(403).sendFile(path.join(__dirname, 'public/403.html'));
    next();
  };
}

app.get('/login',             (req,res) => res.sendFile(path.join(__dirname,'public/login.html')));
app.get('/register',          (req,res) => res.sendFile(path.join(__dirname,'public/register.html')));
app.get('/register/streamer', (req,res) => res.sendFile(path.join(__dirname,'public/register-streamer.html')));

app.get('/',            requireAuth,                             (req,res) => res.sendFile(path.join(__dirname,'public/home.html')));
app.get('/home',        requireAuth,                             (req,res) => res.sendFile(path.join(__dirname,'public/home.html')));
app.get('/watch/:slug', requireAuth,                             (req,res) => res.sendFile(path.join(__dirname,'public/watch.html')));
app.get('/studio',      requireAuth, requireRole('streamer','admin'), (req,res) => res.sendFile(path.join(__dirname,'public/studio.html')));
app.get('/admin',       requireAuth, requireRole('admin'),       (req,res) => res.sendFile(path.join(__dirname,'public/admin.html')));

app.listen(PORT, () => console.log(`FutbolStream en puerto ${PORT}`));
