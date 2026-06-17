require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/admin', require('./routes/admin'));

// Middleware beta - protege todas las rutas /watch
app.use('/watch', (req, res, next) => {
  const token = req.cookies.session;
  if (!token) return res.redirect('/login');
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (!user.is_beta) return res.status(403).sendFile(path.join(__dirname, 'public/403.html'));
    req.user = user;
    next();
  } catch {
    res.redirect('/login');
  }
});

// Páginas principales
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/watch/:channelSlug', (req, res) => res.sendFile(path.join(__dirname, 'public/watch.html')));
app.get('/join', (req, res) => res.sendFile(path.join(__dirname, 'public/join.html')));

app.listen(PORT, () => console.log(`Futbol Stream Beta corriendo en puerto ${PORT}`));
