# ⚽ Futbol Stream Beta

Plataforma beta cerrada de streaming de fútbol con fuentes propias.

## Stack
- **Ingest:** MediaMTX (RTMP + SRT)
- **Transcodificación:** FFmpeg → HLS
- **Backend:** Node.js + Express
- **Frontend:** HTML/JS con Video.js
- **Auth:** JWT + invite codes (beta cerrada)
- **Storage:** Tigris (Fly.io nativo)
- **DB:** Fly PostgreSQL
- **Deploy:** Fly.io

## Apps en Fly.io
1. `futbol-stream-ingest` — MediaMTX recibe RTMP/SRT, genera HLS
2. `futbol-web` — Sitio principal con auth, player, uploads
3. `futbol-stream-db` — Fly PostgreSQL (adjunto a futbol-web)

## Setup DB
```bash
# 1. Crear la base de datos en Fly
fly postgres create --name futbol-stream-db --region mia

# 2. Adjuntar a la app web (inyecta DATABASE_URL automaticamente)
fly postgres attach --app futbol-web futbol-stream-db

# 3. Correr el schema
fly ssh console -a futbol-web -C "node db/migrate.js"
```

## Fuentes soportadas
- 🔴 RTMP en vivo (OBS, vMix) → `rtmp://futbol-stream-ingest.fly.dev:1935/live/{stream_key}`
- 🔵 SRT en vivo (encoders hardware) → `srt://futbol-stream-ingest.fly.dev:8890?streamid={stream_key}`
- 📺 Embed YouTube (nocookie, sin anuncios externos)
- 📁 Videos subidos al sitio (almacenados en Tigris)

## Deploy
```bash
# IP dedicada para RTMP/SRT (obligatorio)
fly ips allocate-v4 --dedicated -a futbol-stream-ingest

# Deploy ingest
cd ingest && fly deploy

# Deploy web
cd web && fly deploy
```

## Publicidad
Solo publicidad propia y de asociados. Sin redes publicitarias externas (VAST propio).
