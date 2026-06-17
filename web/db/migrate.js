require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Corriendo migraciones...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invite_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code TEXT UNIQUE NOT NULL,
      used BOOLEAN DEFAULT false,
      used_by UUID REFERENCES users(id),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS channels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      type TEXT DEFAULT 'rtmp',
      stream_key TEXT,
      youtube_id TEXT,
      thumbnail TEXT,
      is_live BOOLEAN DEFAULT false,
      viewer_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Agregar stream_key si no existe (migracion segura)
  await pool.query(`
    ALTER TABLE channels ADD COLUMN IF NOT EXISTS stream_key TEXT
  `);
  await pool.query(`
    ALTER TABLE channels ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0
  `);
  await pool.query(`
    ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false
  `);
  await pool.query(`
    ALTER TABLE channels ADD COLUMN IF NOT EXISTS thumbnail TEXT
  `);
  await pool.query(`
    ALTER TABLE channels ADD COLUMN IF NOT EXISTS youtube_id TEXT
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chat_channel ON chat_messages(channel_id, created_at DESC)
  `);

  console.log('Migraciones completadas.');
  await pool.end();
}

migrate().catch(e => { console.error(e); process.exit(1); });
