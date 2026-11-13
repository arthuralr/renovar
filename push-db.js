import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log("Conectado com sucesso ao Neon.tech!");
    
    // Criação direta da tabela de propostas e patologias do Patologias.Lab
    await client.query(`
      CREATE TABLE IF NOT EXISTS propostas_renovar (
        id SERIAL PRIMARY KEY,
        cliente TEXT,
        status TEXT DEFAULT 'aguardando',
        dados JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("Tabela sincronizada com sucesso!");
  } catch (err) {
    console.error("Erro ao sincronizar banco:", err);
  } finally {
    await client.end();
  }
}

run();