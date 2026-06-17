-- Schema para Futbol Stream Beta
-- Ejecutar despues de crear y adjuntar Fly PostgreSQL:
-- fly postgres create --name futbol-stream-db --region mia
-- fly postgres attach --app futbol-web futbol-stream-db
-- fly ssh console -a futbol-web -C "node db/migrate.js"
-- O manualmente: fly proxy 5432 -a futbol-stream-db
-- psql postgres://... < web/db/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_beta BOOLEAN DEFAULT false,
  role VARCHAR(20) DEFAULT 'viewer', -- viewer, club, admin
  created_at TIMESTAMP DEFAULT NOW()
);

-- Codigos de invitacion beta
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Canales de futbol
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('rtmp', 'srt', 'youtube', 'video')),
  stream_key VARCHAR(64),
  youtube_id VARCHAR(50),
  description TEXT,
  thumbnail VARCHAR(500),
  is_live BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Videos subidos
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  duration INTEGER,
  thumbnail VARCHAR(500),
  channel_id UUID REFERENCES channels(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Anuncios propios
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255),
  vast_xml TEXT,
  advertiser VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_channels_slug ON channels(slug);
CREATE INDEX IF NOT EXISTS idx_channels_live ON channels(is_live) WHERE is_live = true;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
