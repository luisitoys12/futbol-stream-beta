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
app.set('io', io);

app.use('/auth',            require('./routes/auth'));
app.use('/api/channels',    require('./routes/channels'));
app.use('/api/videos',      require('./routes/videos'));
app.use('/api/admin',       require('./routes/admin'));
app.use('/api/studio',      require('./routes/studio'));
app.use('/api/follow',      require('./routes/follow'));
app.use('/api/gifts',       require('./routes/gifts'));
app.use('/api/memberships', require('./routes/memberships'));

function requireAuth(req,res,next){
  const token=req.cookies.session;
  if(!token) return res.redirect('/login');
  try{req.user=jwt.verify(token,process.env.JWT_SECRET);next();}
  catch{res.redirect('/login');}
}
function requireRole(...roles){
  return (req,res,next)=>{
    if(!roles.includes(req.user?.role))
      return res.status(403).sendFile(path.join(__dirname,'public/403.html'));
    next();
  };
}

app.get('/login',             (_,res)=>res.sendFile(path.join(__dirname,'public/login.html')));
app.get('/register',          (_,res)=>res.sendFile(path.join(__dirname,'public/register.html')));
app.get('/register/streamer', (_,res)=>res.sendFile(path.join(__dirname,'public/register-streamer.html')));

app.get('/',              requireAuth,                                  (_,res)=>res.sendFile(path.join(__dirname,'public/home.html')));
app.get('/home',          requireAuth,                                  (_,res)=>res.sendFile(path.join(__dirname,'public/home.html')));
app.get('/watch/:slug',   requireAuth,                                  (_,res)=>res.sendFile(path.join(__dirname,'public/watch.html')));
app.get('/channel/:slug', requireAuth,                                  (_,res)=>res.sendFile(path.join(__dirname,'public/channel.html')));
app.get('/studio',        requireAuth, requireRole('streamer','admin'), (_,res)=>res.sendFile(path.join(__dirname,'public/studio.html')));
app.get('/admin',         requireAuth, requireRole('admin'),            (_,res)=>res.sendFile(path.join(__dirname,'public/admin.html')));

// --- Socket.io ---
const viewers = {};

io.use((socket,next)=>{
  try{
    const cookie=socket.handshake.headers.cookie||'';
    const match=cookie.match(/session=([^;]+)/);
    if(!match) return next(new Error('No auth'));
    socket.user=jwt.verify(match[1],process.env.JWT_SECRET);
    next();
  }catch{