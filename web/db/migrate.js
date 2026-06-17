// Script para correr el schema desde dentro del contenedor
// Uso: fly ssh console -a futbol-web -C "node db/migrate.js"
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ Schema aplicado correctamente en Fly PostgreSQL');
  } catch (err) {
    console.error('❌ Error al aplicar schema:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
