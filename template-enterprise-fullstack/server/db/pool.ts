import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[Database] AVISO: DATABASE_URL não definida nas variáveis de ambiente.');
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Evita queda do processo por encerramento de conexões ociosas pelo proxy do Neon
pool.on('error', (err: Error) => {
  console.error('[Database] Erro em cliente ocioso do pool PostgreSQL:', err.message);
});

/**
 * Criação resiliente das tabelas iniciais.
 * Executada com try/catch para não impedir a subida do servidor Express
 * caso o Neon esteja em fase de 'cold start' (despertando o compute node).
 */
export async function initDb(): Promise<void> {
  if (!connectionString) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enterprise_records (
        id VARCHAR(255) PRIMARY KEY,
        entity_name VARCHAR(150) NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_enterprise_records_status ON enterprise_records(status);
      CREATE INDEX IF NOT EXISTS idx_enterprise_records_entity ON enterprise_records(entity_name);
    `);
    console.log('[Database] PostgreSQL/Neon inicializado e tabelas prontas.');
  } catch (err: any) {
    console.warn('[Database] Aviso ao inicializar tabelas (Neon em cold start ou offline):', err.message);
  }
}
