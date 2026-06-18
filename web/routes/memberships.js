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

const TIERS = {
  basic:   { label:'Básico',   price:4.99,  color:'#4f98a3', perks:['Badge exclusivo','Chat prioritario'] },
  pro:     { label:'Pro',      price:9.99,  color:'#d19900', perks:['Todo lo anterior','Emojis exclusivos','VOD sin anuncios'] },
  vip:     { label:'VIP',      price:24.99, color:'#a86fdf', perks:['Todo lo anterior','Nombre en pantalla','Acceso anticipado'] }
};

router.get('/tiers', (req,res) => res.json(TIERS));

router.get('/:channelId/mine', auth, async (req,res) => {
  const {rows} = await pool.query(
    'SELECT * FROM memberships WHERE user_id=$1 AND channel_id=$2 AND active=true',
    [req.user.id, req.params.channelId]
  );
  res.json(rows[0]||null);
});

router.post('/:channelId', auth, async (req,res) => {
  const { tier='basic' } = req.body;
  if(!TIERS[tier]) return res.status(400).json({error:'Tier inválido'});
  const price = TIERS[tier].price;
  const expires = new Date();
  expires.setMonth(expires.getMonth()+1);
  try {
    const {rows} = await pool.query(`
      INSERT INTO memberships (user_id,channel_id,tier,price_usd,active,expires_at)
      VALUES ($1,$2,$3,$4,true,$5)
      ON CONFLICT (user_id,channel_id) DO UPDATE
        SET tier=$3, price_usd=$4, active=true, expires_at=$5
      RETURNING *
    `,[req.user.id, req.params.channelId, tier, price, expires]);
    res.json(rows[0]);
  } catch(e){ res.status(500).json({error:e.message}); }
});

router.delete('/:channelId', auth, async (req,res) => {
  await pool.query(
    'UPDATE memberships SET active=false WHERE user_id=$1 AND channel_id=$2',
    [req.user.id, req.params.channelId]
  );
  res.json({success:true});
});

module.exports = router;
