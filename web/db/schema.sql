-- Schema para Futbol Stream Beta
-- Ejecutar en Neon PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_beta BOOLEAN DEFAULT false,
  role VARCHAR(20) DEFAULT 'viewer', -- viewer, club, admin
  created_at TIMESTAMP DEFAULT NOW()
);

-- Códigos de invitación beta
CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Canales de fútbol
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('rtmp', 'srt', 'youtube', 'video')),
  stream_key VARCHAR(64),       -- Para RTMP/SRT
  youtube_id VARCHAR(50),       -- Para embeds de YouTube
  description TEXT,
  thumbnail VARCHAR(500),
  is_live BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Videos subidos
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,  -- Ruta en Tigris
  duration INTEGER,               -- Segundos
  thumbnail VARCHAR(500),
  channel_id UUID REFERENCES channels(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Anuncios propios
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255),
  vast_xml TEXT,                  -- VAST tag XML
  advertiser VARCHAR(100),        -- 'propio' o nombre de asociado
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_channels_slug ON channels(slug);
CREATE INDEX idx_channels_live ON channels(is_live) WHERE is_live = true;
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
