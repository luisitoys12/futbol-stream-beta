require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Corriendo migraciones...');

  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    avatar TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    type TEXT DEFAULT 'rtmp',
    stream_key TEXT,
    youtube_id TEXT,
    thumbnail TEXT,
    banner TEXT,
    category TEXT DEFAULT 'Futbol',
    language TEXT DEFAULT 'es',
    is_live BOOLEAN DEFAULT false,
    viewer_count INTEGER DEFAULT 0,
    total_followers INTEGER DEFAULT 0,
    chat_mode TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  const alterCols = [
    'ALTER TABLE channels ADD COLUMN IF NOT EXISTS stream_key TEXT',
    'ALTER TABLE channels ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0',
    'ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false',
    'ALTER TABLE channels ADD COLUMN IF NOT EXISTS thumbnail TEXT',
    'ALTER TABLE channels ADD COLUMN IF NOT EXISTS youtube_id TEXT',
    'ALTER TABLE channels ADD COLUMN IF NOT EXISTS banner TEXT',
    'ALTER TABLE channels ADD COLUMN IF NOT EXISTS category TEXT DEFAULT \'Futbol\'',
    'ALTER TABLE channels ADD COLUMN IF NOT EXISTS language TEXT DEFAULT \'es\'',
    'ALTER TABLE channels ADD COLUMN IF NOT EXISTS total_followers INTEGER DEFAULT 0',
    'ALTER TABLE channels ADD COLUMN IF NOT EXISTS chat_mode TEXT DEFAULT \'open\'',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT'
  ];
  for (const q of alterCols) await pool.query(q).catch(()=>{});

  await pool.query(`CREATE TABLE IF NOT EXISTS followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    tier TEXT DEFAULT 'basic',
    price_usd NUMERIC(6,2) DEFAULT 4.99,
    active BOOLEAN DEFAULT true,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, channel_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    gift_type TEXT NOT NULL,
    amount INTEGER DEFAULT 1,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    badge TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    url TEXT,
    thumbnail TEXT,
    duration INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_channel ON chat_messages(channel_id, created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_followers_channel ON followers(channel_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_gifts_channel ON gifts(channel_id, created_at DESC)`);

  // Canal test 24/7 YouTube
  await pool.query(`
    INSERT INTO users (id, email, password_hash, role) VALUES
    ('00000000-0000-0000-0000-000000000001','system@futbolstream.tv','$2b$10$noop','admin')
    ON CONFLICT (email) DO NOTHING
  `);
  await pool.query(`
    INSERT INTO channels (id, owner_id, name, slug, description, type, youtube_id, is_live, thumbnail, category)
    VALUES ('00000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000001',
            'Futbol 24/7', 'futbol-247',
            'Canal de fútbol 24/7 con los mejores momentos',
            'youtube', 'jfKfPfyJRdk', true,
            'https://picsum.photos/seed/futbol/640/360', 'Futbol')
    ON CONFLICT (slug) DO NOTHING
  `);

  console.log('Migraciones completadas.');
  await pool.end();
}

migrate().catch(e => { console.error(e); process.exit(1); });
