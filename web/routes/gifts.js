const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function auth(req,res,next){
  const t=req.cookies?.session;
  if(!t) return res.status(401).json({error:'No autorizado'});
  try{req.user=jwt.verify(t,process.env.JWT_SECRET);next();}
  catch{res.status(401).json({error:'Token invalido'});}
}

const GIFTS = {
  pelota:  { emoji:'⚽', label:'Pelota',   coins: 10 },
  trofeo:  { emoji:'🏆', label:'Trofeo',   coins: 50 },
  fuego:   { emoji:'🔥', label:'Fuego',    coins: 20 },
  corazon: { emoji:'❤️', label:'Corazón',  coins: 5  },
  estrella:{ emoji:'⭐', label:'Estrella', coins: 30 },
  diamante:{ emoji:'💎', label:'Diamante', coins: 100}
};

router.get('/types', (req,res) => res.json(GIFTS));

router.post('/:channelId', auth, async (req,res) => {
  const { gift_type, message='' } = req.body;
  const { channelId } = req.params;
  if (!GIFTS[gift_type]) return res.status(400).json({error:'Regalo inválido'});
  try {
    const {rows} = await pool.query(
      'INSERT INTO gifts (sender_id,channel_id,gift_type,message) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, channelId, gift_type, message.slice(0,100)]
    );
    const gift = rows[0];
    gift.emoji   = GIFTS[gift_type].emoji;
    gift.label   = GIFTS[gift_type].label;
    gift.username = req.user.email.split('@')[0];
    // Emitir via Socket.io
    const io = req.app.get('io');
    if(io){
      const {rows:ch} = await pool.query('SELECT slug FROM channels WHERE id=$1',[channelId]);
      if(ch[0]) io.to(ch[0].slug).emit('gift', gift);
    }
    res.json(gift);
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.get('/:channelId/recent', auth, async (req,res) => {
  const {rows} = await pool.query(`
    SELECT g.*, u.email as sender_email
    FROM gifts g LEFT JOIN users u ON u.id=g.sender_id
    WHERE g.channel_id=$1
    ORDER BY g.created_at DESC LIMIT 20
  `,[req.params.channelId]);
  res.json(rows);
});

module.exports = router;
