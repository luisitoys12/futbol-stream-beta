# ⚽ Futbol Stream Beta

Plataforma beta cerrada de streaming de fútbol con fuentes propias.

## Stack
- **Ingest:** MediaMTX (RTMP + SRT)
- **Transcodificación:** FFmpeg → HLS
- **Backend:** Node.js + Express
- **Frontend:** HTML/JS con Video.js
- **Auth:** JWT + invite codes (beta cerrada)
- **Storage:** Tigris (Fly.io nativo)
- **DB:** Neon PostgreSQL
- **Deploy:** Fly.io

## Apps en Fly.io
1. `futbol-stream-ingest` — MediaMTX recibe RTMP/SRT, genera HLS
2. `futbol-web` — Sitio principal con auth, player, uploads

## Fuentes soportadas
- 🔴 RTMP en vivo (OBS, vMix)
- 🔵 SRT en vivo (encoders hardware)
- 📺 Embed YouTube (nocookie, sin anuncios de YT)
- 📁 Videos subidos al sitio

## Publicidad
Solo publicidad propia y de asociados. Sin redes publicitarias externas.
