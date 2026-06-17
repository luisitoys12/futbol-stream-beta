require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const jwt        = require('jsonwebtoken');
const path       = require('path');
const { Pool }   = require('pg');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
const pool   = new Pool({ connectionString: process.env.DATABASE_URL });
const PORT   = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Pasar io a rutas
app.set('io', io);

// APIs
app.use('/auth',         require('./routes/auth'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/videos',   require('./routes/videos'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/studio',   require('./routes/studio'));

// Auth helpers
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

// Paginas publicas
app.get('/login',             (req,res) => res.sendFile(path.join(__dirname,'public/login.html')));
app.get('/register',          (req,res) => res.sendFile(path.join(__dirname,'public/register.html')));
app.get('/register/streamer', (req,res) => res.sendFile(path.join(__dirname,'public/register-streamer.html')));

// Paginas protegidas
app.get('/',            requireAuth,                                  (req,res) => res.sendFile(path.join(__dirname,'public/home.html')));
app.get('/home',        requireAuth,                                  (req,res) => res.sendFile(path.join(__dirname,'public/home.html')));
app.get('/watch/:slug', requireAuth,                                  (req,res) => res.sendFile(path.join(__dirname,'public/watch.html')));
app.get('/studio',      requireAuth, requireRole('streamer','admin'), (req,res) => res.sendFile(path.join(__dirname,'public/studio.html')));
app.get('/admin',       requireAuth, requireRole('admin'),            (req,res) => res.sendFile(path.join(__dirname,'public/admin.html')));

// ---- Socket.io chat en tiempo real ----
const viewers = {}; // { channelSlug: Set(socketId) }

io.use((socket, next) => {
  try {
    const cookie = socket.handshake.headers.cookie || '';
    const match  = cookie.match(/session=([^;]+)/);
    if (!match) return next(new Error('No autenticado'));
    socket.user = jwt.verify(match[1], process.env.JWT_SECRET);
    next();
  } catch { next(new Error('Token invalido')); }
});

io.on('connection', (socket) => {
  const user = socket.user;

  socket.on('join-channel', async (slug) => {
    socket.join(slug);
    if (!viewers[slug]) viewers[slug] = new Set();
    viewers[slug].add(socket.id);
    const count = viewers[slug].size;
    io.to(slug).emit('viewer-count', count);

    // Ultimos 50 mensajes del chat
    try {
      const { rows } = await pool.query(`
        SELECT cm.message, cm.username, cm.created_at
        FROM chat_messages cm
        JOIN channels c ON c.id = cm.channel_id
        WHERE c.slug = $1
        ORDER BY cm.created_at DESC LIMIT 50
      `, [slug]);
      socket.emit('chat-history', rows.reverse());
    } catch(e) { console.error('chat-history error:', e.message); }
  });

  socket.on('chat-message', async ({ slug, message }) => {
    if (!message || message.trim().length === 0) return;
    if (message.length > 300) return;
    const msg = message.trim();
    const username = user.email.split('@')[0];

    try {
      const { rows } = await pool.query('SELECT id FROM channels WHERE slug=$1', [slug]);
      if (!rows[0]) return;
      await pool.query(
        'INSERT INTO chat_messages (channel_id,user_id,username,message) VALUES ($1,$2,$3,$4)',
        [rows[0].id, user.id, username, msg]
      );
      io.to(slug).emit('chat-message', {
        username,
        message: msg,
        created_at: new Date().toISOString()
      });
    } catch(e) { console.error('chat-message error:', e.message); }
  });

  socket.on('disconnecting', () => {
    for (const slug of socket.rooms) {
      if (viewers[slug]) {
        viewers[slug].delete(socket.id);
        io.to(slug).emit('viewer-count', viewers[slug].size);
      }
    }
  });
});

server.listen(PORT, () => console.log(`FutbolStream en puerto ${PORT}`));
