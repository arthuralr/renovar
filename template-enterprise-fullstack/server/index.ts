import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, initDb } from './db/pool.js';
import { analyzeWithGemini } from './services/geminiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// 1. MIDDLEWARE CORS UNIVERSAL E RESILIENTE
// Permite que o front-end na Vercel (ou qualquer origem autorizada) consuma a VPS sem bloqueios
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Vary', 'Origin, Access-Control-Request-Headers');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] ||
      'Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma, Accept'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  // Responde imediatamente a requisições de preflight do navegador
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// 2. PARSER COM LIMITE ROBUSTO PARA IMAGENS / PAYLOADS PESADOS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. INICIALIZAÇÃO ASSÍNCRONA NÃO-BLOQUEANTE DO BANCO
void initDb();

// 4. ROTAS DE SAÚDE E DIAGNÓSTICO DO SERVIÇO
app.get('/api/health', async (_req, res) => {
  try {
    const dbTest = await pool.query('SELECT NOW() as now');
    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTime: dbTest.rows[0].now,
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message,
    });
  }
});

// 5. ROTAS DE PERSISTÊNCIA CRUD (POSTGRESQL / NEON)
app.get('/api/records', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM enterprise_records ORDER BY updated_at DESC LIMIT 100');
    return res.json({ ok: true, data: rows });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/records', async (req, res) => {
  const { id, entityName = 'Default Entity', status = 'active', metadata = {} } = req.body || {};

  if (!id) {
    return res.status(400).json({ ok: false, error: 'O identificador (id) é obrigatório.' });
  }

  try {
    // UPSERT atômico nativo: previne conflitos de concorrência ou duplicação de chave primária
    const query = `
      INSERT INTO enterprise_records (id, entity_name, status, metadata, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        entity_name = EXCLUDED.entity_name,
        status = EXCLUDED.status,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [id, entityName, status, JSON.stringify(metadata)]);
    return res.json({ ok: true, data: rows[0], message: 'Registro salvo com sucesso.' });
  } catch (err: any) {
    console.error('[API Records] Erro ao persistir registro:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM enterprise_records WHERE id = $1', [id]);
    return res.json({ ok: true, message: 'Registro excluído com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// 6. ROTAS DE PROCESSAMENTO DE IA COM GOOGLE GEMINI
app.post('/api/ai/diagnose', async (req, res) => {
  const { prompt, imageBase64, mimeType } = req.body || {};

  if (!prompt && !imageBase64) {
    return res.status(400).json({ ok: false, error: 'Forneça um prompt ou uma imagem em Base64 para diagnóstico.' });
  }

  try {
    const result = await analyzeWithGemini(prompt || 'Realize o diagnóstico pericial técnico.', imageBase64, mimeType);
    return res.json({ ok: true, result });
  } catch (err: any) {
    console.error('[API AI] Falha no diagnóstico Gemini:', err.message);
    return res.status(502).json({
      ok: false,
      error: err.message || 'Falha ao processar requisição de inteligência artificial.',
    });
  }
});

// 7. INICIALIZAÇÃO DO SERVIDOR COM TIMEOUT ESTENDIDO
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Enterprise Backend] Servidor ativo em http://0.0.0.0:${PORT}`);
});

// Timeout de socket de 90 segundos para suportar grandes fluxos de upload de imagens e resposta da IA
server.setTimeout(90_000);
