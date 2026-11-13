const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('Conectando ao banco de dados no Neon.tech...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS propostas_renovar (
        id VARCHAR(255) PRIMARY KEY,
        cliente TEXT,
        status VARCHAR(100),
        dados JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tabela propostas_renovar criada/sincronizada com sucesso!');
  } catch (err) {
    console.error('Erro ao criar tabela:', err);
  } finally {
    await pool.end();
  }
}

run();