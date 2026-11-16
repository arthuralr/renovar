import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: true });
dotenv.config({ override: true });

delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.GOOGLE_CLOUD_PROJECT;
delete process.env.GCLOUD_PROJECT;

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const allowedCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed =
    !origin ||
    allowedCorsOrigins.includes(origin) ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
    /\.vercel\.app$/.test(origin);

  if (origin && isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Pragma, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err: any) => {
  console.error('[Banco de Dados] Erro no pool do Postgres:', err?.message || err);
});

async function garantirTabela() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS propostas_renovar (
        id VARCHAR(255) PRIMARY KEY,
        cliente TEXT,
        status VARCHAR(100),
        dados JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[Banco de Dados] Tabela propostas_renovar pronta no Neon.tech.');
  } catch (err: any) {
    console.warn('[Banco de Dados] Aviso ao verificar/criar tabela inicial no Neon:', err?.message || err);
  }
}
void garantirTabela();

const GEMINI_PRIMARY_MODEL = 'gemini-2.5-flash';
const GEMINI_BACKUP_MODEL = 'gemini-2.0-flash';
const GEMINI_FALLBACK_CHAIN = [GEMINI_PRIMARY_MODEL, GEMINI_BACKUP_MODEL] as const;

const isValidApiKey = (val?: string): val is string => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  return (
    trimmed.length > 10 &&
    trimmed !== 'MY_GEMINI_API_KEY' &&
    trimmed !== 'YOUR_GEMINI_API_KEY' &&
    trimmed !== 'undefined' &&
    trimmed !== 'null'
  );
};

const readApiKeyFromEnvFiles = (): string | undefined => {
  const candidateFiles = [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
  ];
  for (const filePath of candidateFiles) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = dotenv.parse(fs.readFileSync(filePath, 'utf-8'));
        const candidate = parsed.VITE_GEMINI_API_KEY || parsed.GEMINI_API_KEY || parsed.VITE_API_KEY || parsed.API_KEY;
        if (isValidApiKey(candidate)) return candidate.trim().replace(/^["']|["']$/g, '');
      }
    } catch {}
  }
  return undefined;
};

export const getResolvedGeminiApiKey = (): string => {
  const fromDotenvFile = readApiKeyFromEnvFiles();
  if (isValidApiKey(fromDotenvFile)) return fromDotenvFile;
  const fromViteEnv = process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY;
  if (isValidApiKey(fromViteEnv)) return fromViteEnv.trim().replace(/^["']|["']$/g, '');
  const fromGeminiEnv = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (isValidApiKey(fromGeminiEnv)) return fromGeminiEnv.trim().replace(/^["']|["']$/g, '');
  return '';
};

const RESOLVED_API_KEY = getResolvedGeminiApiKey();
if (RESOLVED_API_KEY) {
  process.env.VITE_GEMINI_API_KEY = RESOLVED_API_KEY;
  process.env.GEMINI_API_KEY = RESOLVED_API_KEY;
}

const createGeminiClient = (apiKey?: string): GoogleGenAI | null => {
  const resolvedKey = (isValidApiKey(apiKey) ? apiKey.trim().replace(/^["']|["']$/g, '') : undefined) || getResolvedGeminiApiKey();
  if (!isValidApiKey(resolvedKey)) return null;
  return new GoogleGenAI({ apiKey: resolvedKey, vertexai: false, httpOptions: { apiVersion: 'v1beta' } });
};

const ai = createGeminiClient(RESOLVED_API_KEY);
const GEMINI_REQUEST_TIMEOUT_MS = 60_000;
const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);

const normalizarImagemParaGemini = (imageData: string, mimeType: string) => {
  const trimmed = imageData.trim();
  const dataUrlMatch = trimmed.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]*)$/i);
  const resolvedMimeType = (dataUrlMatch?.[1] || mimeType || 'image/jpeg').toLowerCase().replace('image/jpg', 'image/jpeg');
  const data = (dataUrlMatch?.[2] || trimmed).replace(/\s/g, '');
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(resolvedMimeType)) throw new Error(`Formato não suportado: ${resolvedMimeType}`);
  if (!data) throw new Error('Imagem vazia ou inválida.');
  return { data, mimeType: resolvedMimeType };
};

const generateContentWithTimeout = async (geminiClient: GoogleGenAI, model: string, contents: any[], config: any, label: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
  try {
    return await geminiClient.models.generateContent({
      model,
      contents,
      config: { ...config, abortSignal: controller.signal },
    });
  } catch (error: any) {
    if (controller.signal.aborted) throw new Error(`Timeout durante ${label}.`);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const systemInstruction = `Você é um Engenheiro Civil Perito, especializado em Patologias das Construções e Engenharia Diagnóstica. Analise a imagem fornecida da edificação/fachada e emita o diagnóstico pericial técnico conforme as normas da ABNT.`;

const anomaliasSchema = {
  type: Type.OBJECT,
  properties: {
    anomalias: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nome_patologia: { type: Type.STRING },
          gravidade: { type: Type.STRING },
          constatacao_visual: { type: Type.STRING },
          justificativa_tecnica_causa: { type: Type.STRING },
          risco_evolutivo_consequencias: { type: Type.STRING },
          normas_tecnicas_abnt: { type: Type.ARRAY, items: { type: Type.STRING } },
          ensaios_complementares: { type: Type.ARRAY, items: { type: Type.STRING } },
          diretrizes_reparo: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          'nome_patologia',
          'gravidade',
          'constatacao_visual',
          'justificativa_tecnica_causa',
          'risco_evolutivo_consequencias',
          'normas_tecnicas_abnt',
          'ensaios_complementares',
          'diretrizes_reparo'
        ],
      },
    },
  },
  required: ['anomalias'],
};

const parseGeminiJson = (text: string) => {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(trimmed); } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON inválido.');
    return JSON.parse(jsonMatch[0]);
  }
};

const normalizarDiagnosticoGemini = (payload: any) => {
  const rawItems = payload?.anomalias || payload?.patologias;
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new Error('Nenhuma patologia retornada.');
  const normalizedItems = rawItems.slice(0, 1).map((item: any) => ({
    nome_patologia: String(item?.nome_patologia || 'Patologia'),
    gravidade: String(item?.gravidade || 'Média'),
    constatacao_visual: String(item?.constatacao_visual || ''),
    justificativa_tecnica_causa: String(item?.justificativa_tecnica_causa || ''),
    risco_evolutivo_consequencias: String(item?.risco_evolutivo_consequencias || ''),
    normas_tecnicas_abnt: Array.isArray(item?.normas_tecnicas_abnt) ? item.normas_tecnicas_abnt : [],
    ensaios_complementares: Array.isArray(item?.ensaios_complementares) ? item.ensaios_complementares : [],
    diretrizes_reparo: Array.isArray(item?.diretrizes_reparo) ? item.diretrizes_reparo : [],
  }));
  return { anomalias: normalizedItems, patologias: normalizedItems };
};

const handleDiagnosticar = async (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { imageBase64, mimeType = 'image/jpeg', contexto } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'Nenhuma foto fornecida.' });
    const imagem = normalizarImagemParaGemini(imageBase64, mimeType);
    const geminiClient = ai || createGeminiClient();
    if (!geminiClient) return res.status(503).json({ error: 'Gemini não configurado.' });

    let userPrompt = `Faça a análise e o diagnóstico pericial técnico desta fotografia de fachada ou elemento construtivo.`;
    if (contexto && typeof contexto === 'object') {
      const details: string[] = [];
      if (contexto.nomeEdificio) details.push(`Imóvel: ${contexto.nomeEdificio}`);
      if (contexto.tipoElemento) details.push(`Elemento: ${contexto.tipoElemento}`);
      if (details.length > 0) userPrompt += `\nContexto:\n- ${details.join('\n- ')}`;
    }

    const imagePart = { inlineData: { mimeType: imagem.mimeType, data: imagem.data } };
    let resp: any = null;
    let lastError: any = null;

    for (const modelName of GEMINI_FALLBACK_CHAIN) {
      try {
        resp = await generateContentWithTimeout(
          geminiClient,
          modelName,
          [{ role: 'user', parts: [imagePart, { text: userPrompt }] }],
          { systemInstruction, responseMimeType: 'application/json', responseSchema: anomaliasSchema },
          `diagnóstico (${modelName})`
        );
        if (resp?.text) break;
      } catch (e: any) {
        lastError = e;
        console.warn(`[server.ts] Modelo ${modelName} falhou, tentando próximo da cadeia...`, e?.message || e);
      }
    }

    if (!resp?.text) {
      throw lastError || new Error('Não foi possível obter resposta de nenhum modelo Gemini.');
    }

    return res.json(normalizarDiagnosticoGemini(parseGeminiJson(resp.text || '')));
  } catch (err: any) {
    return res.status(502).json({ error: err?.message || 'Erro no diagnóstico.' });
  }
};

app.post('/api/diagnosticar', handleDiagnosticar);
app.post('/api/diagnosticar/', handleDiagnosticar);

const handleGetOrcamentos = async (_req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { rows } = await pool.query('SELECT * FROM propostas_renovar ORDER BY id DESC');
    return res.status(200).json({ ok: true, data: rows, serverItems: rows, deletedIds: [] });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message, data: [], serverItems: [] });
  }
};

const handlePostOrcamentos = async (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  const payload = req.body || {};
  const action = String(payload.action || 'save');
  const id = String(payload.id || payload.orcamentoId || '').trim();
  const isDelete = action === 'delete' || payload.status === 'deleted' || payload.acao === 'excluir';

  try {
    if (isDelete) {
      if (!id) {
        return res.status(400).json({ ok: false, error: 'O ID da proposta é obrigatório para exclusão.' });
      }
      await pool.query('DELETE FROM propostas_renovar WHERE id = $1', [id]);
      return res.status(200).json({ ok: true, success: true, message: 'Excluído com sucesso.' });
    }

    if (!id) {
      return res.status(400).json({ ok: false, error: 'O ID da proposta é obrigatório para salvamento.' });
    }

    const clienteNome = payload.cliente || payload.dadosCliente?.nomeCondominio || 'Cliente';
    const statusProposta = payload.status || 'em_elaboracao';

    await pool.query(
      `INSERT INTO propostas_renovar (id, cliente, status, dados)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
       SET cliente = EXCLUDED.cliente,
           status = EXCLUDED.status,
           dados = EXCLUDED.dados;`,
      [id, clienteNome, statusProposta, JSON.stringify(payload)]
    );

    return res.status(200).json({ ok: true, success: true, message: 'Salvo com sucesso.' });
  } catch (err: any) {
    console.error('Erro ao salvar no banco:', err);
    return res.status(500).json({ ok: false, error: err?.message });
  }
};

app.get('/api/orcamentos', handleGetOrcamentos);
app.get('/api/orcamentos/', handleGetOrcamentos);
app.post('/api/orcamentos', handlePostOrcamentos);
app.post('/api/orcamentos/', handlePostOrcamentos);

// Aliases para compatibilidade total com Google Sheets / Apps Script
app.get('/api/sheets/orcamentos', handleGetOrcamentos);
app.get('/api/sheets/orcamentos/', handleGetOrcamentos);
app.post('/api/sheets/orcamentos', handlePostOrcamentos);
app.post('/api/sheets/orcamentos/', handlePostOrcamentos);

// Proxy para webhook n8n para contornar restrições de CORS no browser
app.post('/api/webhook/renovar-proposta', async (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    try {
      const n8nResp = await fetch('https://n8n.ia01.online/webhook-test/renovar-proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });
      const text = await n8nResp.text().catch(() => '');
      return res.status(n8nResp.status).json({
        ok: n8nResp.ok,
        status: n8nResp.status,
        message: n8nResp.ok ? 'Enviado ao n8n via servidor.' : `Status ${n8nResp.status}`,
        response: text,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    return res.status(502).json({
      ok: false,
      error: err?.message || 'Falha ao conectar ao webhook do n8n.',
    });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => { res.sendFile(path.resolve(__dirname, 'dist', 'index.html')); });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
server.setTimeout(90_000);