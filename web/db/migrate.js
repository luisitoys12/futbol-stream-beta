require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invite_codes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code       TEXT UNIQUE NOT NULL,
      used       BOOLEAN DEFAULT false,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS channels (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id     UUID REFERENCES users(id),
      name         TEXT NOT NULL,
      slug         TEXT UNIQUE NOT NULL,
      description  TEXT,
      type         TEXT NOT NULL DEFAULT 'rtmp',
      stream_key   TEXT,
      youtube_id   TEXT,
      thumbnail    TEXT,
      is_live      BOOLEAN DEFAULT false,
      viewer_count INT DEFAULT 0,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS videos (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      channel_id UUID REFERENCES channels(id),
      title      TEXT NOT NULL,
      s3_key     TEXT,
      duration   INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Migración: agregar columna role si no existe (para DBs antiguas)
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
        ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
      END IF;
    END $$;

    -- Migración: quitar columna is_beta si existe
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_beta') THEN
        ALTER TABLE users DROP COLUMN is_beta;
      END IF;
    END $$;
  `);
  console.log('✅ Schema aplicado correctamente en Fly PostgreSQL');
  await pool.end();
}

migrate().catch(e => { console.error('❌', e.message); process.exit(1); });
