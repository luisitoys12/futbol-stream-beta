const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 * 1024 } }); // 2GB max

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.TIGRIS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.TIGRIS_ACCESS_KEY,
    secretAccessKey: process.env.TIGRIS_SECRET_KEY
  }
});

// Listar videos
router.get('/', async (req, res) => {
  const result = await pool.query('SELECT id, title, thumbnail, duration, created_at FROM videos ORDER BY created_at DESC');
  res.json(result.rows);
});

// Presigned URL para upload directo a Tigris
router.post('/presign', async (req, res) => {
  const { filename, contentType } = req.body;
  const key = `videos/${uuidv4()}/${filename}`;
  const command = new PutObjectCommand({
    Bucket: process.env.TIGRIS_BUCKET,
    Key: key,
    ContentType: contentType
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  res.json({ uploadUrl: url, key });
});

// Registrar video en DB después del upload
router.post('/register', async (req, res) => {
  const { title, key, duration, thumbnail } = req.body;
  const result = await pool.query(
    'INSERT INTO videos (id, title, s3_key, duration, thumbnail) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [uuidv4(), title, key, duration, thumbnail]
  );
  res.json(result.rows[0]);
});

// URL firmada para reproducir video (token temporal 1h)
router.get('/:id/play', async (req, res) => {
  const result = await pool.query('SELECT * FROM videos WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'Video no encontrado' });
  const command = new GetObjectCommand({
    Bucket: process.env.TIGRIS_BUCKET,
    Key: result.rows[0].s3_key
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  res.json({ url });
});

module.exports = router;
