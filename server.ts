import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { gerarLaudoTecnicoAbntFallback } from './src/utils/abntEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega explicitamente as variáveis de ambiente do arquivo .env e .env.local na raiz do projeto
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: true });
dotenv.config({ override: true });

// Desativa explicitamente qualquer tentativa do SDK @google/genai de usar Google Cloud Application Default Credentials (ADC / Vertex AI)
delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.GOOGLE_CLOUD_PROJECT;
delete process.env.GCLOUD_PROJECT;

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsers with generous limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const GEMINI_PRIMARY_MODEL = 'gemini-2.5-flash';
const GEMINI_BACKUP_MODEL = 'gemini-2.0-flash';
const GEMINI_FALLBACK_CHAIN = [
  GEMINI_PRIMARY_MODEL,
  GEMINI_BACKUP_MODEL,
] as const;

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
        const candidate =
          parsed.VITE_GEMINI_API_KEY ||
          parsed.GEMINI_API_KEY ||
          parsed.VITE_API_KEY ||
          parsed.API_KEY;
        if (isValidApiKey(candidate)) {
          return candidate.trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // Prossegue para o próximo arquivo candidato
    }
  }
  return undefined;
};

export const getResolvedGeminiApiKey = (): string => {
  const fromDotenvFile = readApiKeyFromEnvFiles();
  if (isValidApiKey(fromDotenvFile)) {
    return fromDotenvFile;
  }

  const fromViteEnv = process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY;
  if (isValidApiKey(fromViteEnv)) {
    return fromViteEnv.trim().replace(/^["']|["']$/g, '');
  }

  const fromGeminiEnv = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (isValidApiKey(fromGeminiEnv)) {
    return fromGeminiEnv.trim().replace(/^["']|["']$/g, '');
  }

  return '';
};

// Sincroniza variáveis de ambiente caso a chave esteja presente no .env
const RESOLVED_API_KEY = getResolvedGeminiApiKey();
if (RESOLVED_API_KEY) {
  process.env.VITE_GEMINI_API_KEY = RESOLVED_API_KEY;
  process.env.GEMINI_API_KEY = RESOLVED_API_KEY;
}

const createGeminiClient = (apiKey?: string): GoogleGenAI | null => {
  const resolvedKey =
    (isValidApiKey(apiKey) ? apiKey.trim().replace(/^["']|["']$/g, '') : undefined) ||
    getResolvedGeminiApiKey();

  if (!isValidApiKey(resolvedKey)) {
    return null;
  }

  return new GoogleGenAI({
    apiKey: resolvedKey,
    vertexai: false,
  });
};

// Inicialização opcional do cliente Google Gen AI passando a chave do .env (sem ADC do Google Cloud)
const ai = createGeminiClient(RESOLVED_API_KEY);

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout (${timeoutMs}ms) ao aguardar resposta de ${label}.`));
    }, timeoutMs);

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const systemInstruction = `Você é um Engenheiro Civil Perito, especializado em Patologias das Construções, Recuperação Estrutural e Engenharia Diagnóstica. Sua atuação é estritamente técnica, pautada pelo rigor metodológico das normas da ABNT e pelas melhores práticas de engenharia de manutenção.

Sua tarefa é analisar fotografias de manifestações patológicas em edificações (fachadas, elementos estruturais, áreas internas ou muros) fornecidas pelo usuário e elaborar um diagnóstico pericial completo.

Para cada anomalia identificada na imagem, você deve extrair e formular os seguintes dados:

1. NOME DA PATOLOGIA: Classificação técnica e concisa da manifestação (ex: "Fissuras e Desplacamento de Revestimento Cerâmico"). Inclua a gravidade estimada (Alta, Média, Crítica).
2. CONSTATAÇÃO VISUAL E ASPECTO TÉCNICO: Descrição detalhada e pericial do que é visível na foto (localização, aspecto, extensão aparente e estado de degradação).
3. JUSTIFICATIVA TÉCNICA E CAUSA PROVÁVEL: A explicação de engenharia que originou o problema (ex: tensões de cisalhamento, movimentação higrotérmica, falha de ancoragem, lixiviação, carbonatação).
4. RISCO EVOLUTIVO E CONSEQUÊNCIAS: O impacto estrutural, financeiro e de segurança caso a anomalia não sofra intervenção imediata (ex: risco de queda de fragmentos, saturação do substrato, perda de seção do aço).
5. NORMAS TÉCNICAS ABNT: Liste de 3 a 5 normas técnicas aplicáveis ao caso e ao reparo (ex: NBR 16747, NBR 13755, NBR 9575).
6. ENSAIOS COMPLEMENTARES: Liste de 2 a 4 testes periciais que confirmariam o diagnóstico (ex: Teste de Percussão, Termografia Infravermelha, Ensaio de Esclerometria).
7. DIRETRIZES DE REPARO: Um passo a passo técnico (3 a 5 etapas) descrevendo a metodologia correta de recuperação e tratamento do elemento afetado.

DIRETRIZES DE ESTILO:
- Utilize vocabulário técnico de engenharia diagnóstica (ex: substrato, emboço, aderência, percolação, gradiente térmico).
- Seja objetivo, direto e não utilize jargões leigos.
- Responda EXCLUSIVAMENTE em formato JSON estruturado. Não adicione saudações, observações ou qualquer texto fora do objeto JSON.`;

const anomaliasSchema = {
  type: Type.OBJECT,
  properties: {
    anomalias: {
      type: Type.ARRAY,
      description: 'Lista de anomalias patológicas identificadas na imagem periciada.',
      items: {
        type: Type.OBJECT,
        properties: {
          nome_patologia: {
            type: Type.STRING,
            description: 'Classificação técnica e concisa da manifestação (ex: "Fissuras e Desplacamento de Revestimento Cerâmico").',
          },
          gravidade: {
            type: Type.STRING,
            description: 'Gravidade estimada da anomalia ("Crítica", "Alta", "Média" ou "Leve").',
          },
          constatacao_visual: {
            type: Type.STRING,
            description: 'Descrição detalhada e pericial do que é visível na foto (localização, aspecto, extensão aparente e estado de degradação).',
          },
          justificativa_tecnica_causa: {
            type: Type.STRING,
            description: 'Explicação de engenharia que originou o problema (causa provável).',
          },
          risco_evolutivo_consequencias: {
            type: Type.STRING,
            description: 'Impacto estrutural, financeiro e de segurança caso a anomalia não sofra intervenção imediata.',
          },
          normas_tecnicas_abnt: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Lista de 3 a 5 normas técnicas ABNT aplicáveis ao caso e ao reparo.',
          },
          ensaios_complementares: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Lista de 2 a 4 testes periciais que confirmariam o diagnóstico.',
          },
          diretrizes_reparo: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Passo a passo técnico (3 a 5 etapas) descrevendo a metodologia correta de recuperação e tratamento.',
          },
        },
        required: [
          'nome_patologia',
          'gravidade',
          'constatacao_visual',
          'justificativa_tecnica_causa',
          'risco_evolutivo_consequencias',
          'normas_tecnicas_abnt',
          'ensaios_complementares',
          'diretrizes_reparo',
        ],
      },
    },
  },
  required: ['anomalias'],
};

// Diagnostic endpoint handler
const handleDiagnosticar = async (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { imageBase64, mimeType = 'image/jpeg', contexto, photoIndex = 0 } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.trim().length === 0) {
      return res.status(400).json({ error: 'Nenhuma fotografia foi fornecida para a análise pericial.' });
    }

    // Strip data prefix if present (e.g. data:image/png;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    let userPrompt = `Analise pericialmente a fotografia técnica desta edificação e formule 1 (um) registro de diagnóstico pericial consolidado correspondente a esta imagem, em estrita conformidade com as normas ABNT vigentes.`;

    if (contexto && typeof contexto === 'object') {
      const details: string[] = [];
      if (contexto.nomeEdificio) details.push(`Identificação do Imóvel: ${contexto.nomeEdificio}`);
      if (contexto.tipoElemento) details.push(`Elemento/Substrato inspecionado: ${contexto.tipoElemento}`);
      if (contexto.idadeEdificio) details.push(`Idade aproximada da edificação: ${contexto.idadeEdificio}`);
      if (contexto.localizacao) details.push(`Localização / Orientação solar: ${contexto.localizacao}`);
      if (contexto.observacoes) details.push(`Observações periciais preliminares: ${contexto.observacoes}`);
      if (details.length > 0) {
        userPrompt += `\n\nDados cadastrais e contexto preliminar informado pelo perito inspetor:\n- ${details.join('\n- ')}`;
      }
    }

    const apiKey = getResolvedGeminiApiKey();
    if (apiKey) {
      process.env.VITE_GEMINI_API_KEY = apiKey;
      process.env.GEMINI_API_KEY = apiKey;
    }

    const geminiClient = apiKey && apiKey === RESOLVED_API_KEY ? ai : createGeminiClient(apiKey);

    if (!geminiClient) {
      console.info(
        '[Contingência ABNT] Chave da API Gemini não configurada no ambiente. Acionando geração automatizada do laudo ABNT.'
      );
      const fallbackResult = gerarLaudoTecnicoAbntFallback(contexto, Number(photoIndex) || 0);
      return res.json(fallbackResult);
    }

    const requestContents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: userPrompt,
          },
        ],
      },
    ];

    const requestConfig = {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: anomaliasSchema,
    };

    let response: any = null;

    // Tenta os modelos Gemini usando exclusivamente a chave do .env (sem Vertex ADC) e com timeout curto
    for (const modelName of GEMINI_FALLBACK_CHAIN) {
      try {
        response = await withTimeout(
          geminiClient.models.generateContent({
            model: modelName,
            contents: requestContents,
            config: requestConfig,
          }),
          6500,
          `Gemini ${modelName}`
        );
        if (response?.text) break;
      } catch (modelErr: any) {
        console.warn(
          `[Contingência ABNT] Modelo ${modelName} indisponível ou instável (${modelErr?.message || modelErr}).`
        );
      }
    }

    // Fallback robusto imediato: se a API do Gemini falhar ou sofrer instabilidade (503/timeout/credenciais),
    // gera imediatamente o laudo técnico estruturado com base nas normas ABNT
    if (!response?.text) {
      console.info(
        '[Contingência ABNT] Acionando geração automatizada imediata do laudo técnico estruturado conforme normas ABNT.'
      );
      const fallbackResult = gerarLaudoTecnicoAbntFallback(contexto, Number(photoIndex) || 0);
      return res.json(fallbackResult);
    }

    const rawText = response.text;
    let parsedData: any;
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        const fallbackResult = gerarLaudoTecnicoAbntFallback(contexto, Number(photoIndex) || 0);
        return res.json(fallbackResult);
      }
    }

    const rawList = parsedData?.anomalias || parsedData?.patologias || [];
    if (!Array.isArray(rawList) || rawList.length === 0) {
      const fallbackResult = gerarLaudoTecnicoAbntFallback(contexto, Number(photoIndex) || 0);
      return res.json(fallbackResult);
    }

    const normalizedItems = rawList.slice(0, 1).map((item: any) => ({
      nome_patologia: item.nome_patologia || 'Manifestação Patológica Não Classificada',
      gravidade: item.gravidade || 'Média',
      constatacao_visual: item.constatacao_visual || item.descricao || '',
      descricao: item.constatacao_visual || item.descricao || '',
      justificativa_tecnica_causa: item.justificativa_tecnica_causa || item.causa_provavel || '',
      causa_provavel: item.justificativa_tecnica_causa || item.causa_provavel || '',
      risco_evolutivo_consequencias: item.risco_evolutivo_consequencias || item.risco_evolutivo || '',
      risco_evolutivo: item.risco_evolutivo_consequencias || item.risco_evolutivo || '',
      normas_tecnicas_abnt: Array.isArray(item.normas_tecnicas_abnt) ? item.normas_tecnicas_abnt : [],
      ensaios_complementares: Array.isArray(item.ensaios_complementares) ? item.ensaios_complementares : [],
      diretrizes_reparo: Array.isArray(item.diretrizes_reparo) ? item.diretrizes_reparo : [],
    }));

    return res.json({
      anomalias: normalizedItems,
      patologias: normalizedItems,
    });
  } catch (error: any) {
    console.warn(
      'Acionando contingência ABNT imediata após exceção no endpoint /api/diagnosticar:',
      error?.message || error
    );
    const fallbackResult = gerarLaudoTecnicoAbntFallback(
      req.body?.contexto,
      Number(req.body?.photoIndex) || 0
    );
    return res.json(fallbackResult);
  }
};

// Register endpoint for both with and without trailing slash
app.post('/api/diagnosticar', handleDiagnosticar);
app.post('/api/diagnosticar/', handleDiagnosticar);

// Webhook n8n relay endpoint (POST JSON para https://n8n.ia01.online/webhook-test/renovar-proposta)
const N8N_WEBHOOK_TEST_URL = 'https://n8n.ia01.online/webhook-test/renovar-proposta';

const handleWebhookRenovarProposta = async (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const payload = req.body || {};
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const n8nResponse = await fetch(N8N_WEBHOOK_TEST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const responseText = await n8nResponse.text().catch(() => '');
      return res.status(200).json({
        ok: n8nResponse.ok,
        status: n8nResponse.status,
        url: N8N_WEBHOOK_TEST_URL,
        response: responseText,
        message: n8nResponse.ok
          ? 'Webhook enviado com sucesso para o n8n.'
          : `n8n retornou status ${n8nResponse.status}.`,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    console.warn('Erro ao enviar POST para o webhook do n8n:', error?.message || error);
    return res.status(200).json({
      ok: false,
      url: N8N_WEBHOOK_TEST_URL,
      message: error?.message || 'Erro de conexão com o webhook do n8n.',
    });
  }
};

app.post('/api/webhook/renovar-proposta', handleWebhookRenovarProposta);
app.post('/api/webhook/renovar-proposta/', handleWebhookRenovarProposta);

// Google Sheets Web App API Relay + Persistência Sincronizada (GET & POST para acesso universal em nuvem / guias anônimas)
const GOOGLE_SHEETS_API_URL =
  process.env.GOOGLE_SHEETS_API_URL ||
  process.env.VITE_GOOGLE_SHEETS_API_URL ||
  'https://script.google.com/macros/s/AKfycbwEJsdwH7Rrb3rhb1Ytd7IvyqHTQvpFcfmS5Yof6Zs7DXTBmsC4LPYAl3jP2SjN7krw2g/exec';

const CLOUD_CACHE_DIR = path.resolve(__dirname, 'data');
const CLOUD_CACHE_FILE = path.resolve(CLOUD_CACHE_DIR, 'orcamentos-nuvem.json');

interface CloudCacheStore {
  orcamentos: Record<string, any>;
  deletedIds: string[];
  updatedAt: string;
}

const readServerCloudStore = (): CloudCacheStore => {
  try {
    if (fs.existsSync(CLOUD_CACHE_FILE)) {
      const raw = fs.readFileSync(CLOUD_CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        orcamentos: parsed?.orcamentos && typeof parsed.orcamentos === 'object' ? parsed.orcamentos : {},
        deletedIds: Array.isArray(parsed?.deletedIds) ? parsed.deletedIds : [],
        updatedAt: parsed?.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('Aviso ao ler store local de sincronização:', err);
  }
  return { orcamentos: {}, deletedIds: [], updatedAt: new Date().toISOString() };
};

const writeServerCloudStore = (store: CloudCacheStore): void => {
  try {
    if (!fs.existsSync(CLOUD_CACHE_DIR)) {
      fs.mkdirSync(CLOUD_CACHE_DIR, { recursive: true });
    }
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(CLOUD_CACHE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Aviso ao gravar store local de sincronização:', err);
  }
};

const extractRowsFromSheetsResponse = (parsed: any): any[] => {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object') {
    const keys = [
      'data',
      'dados',
      'orcamentos',
      'propostas',
      'values',
      'rows',
      'items',
      'result',
      'records',
      'historico',
      'lista',
      'clientes',
      'planilha',
    ];
    for (const k of keys) {
      if (Array.isArray(parsed[k])) return parsed[k];
    }
    for (const [k, val] of Object.entries(parsed)) {
      if (k !== 'deletedIds' && k !== 'serverItems' && Array.isArray(val)) {
        return val;
      }
    }
  }
  return [];
};

const handleGetOrcamentosSheets = async (_req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  const store = readServerCloudStore();
  const serverItems = Object.values(store.orcamentos);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(GOOGLE_SHEETS_API_URL, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
      const text = await response.text();
      let sheetsRows: any[] = [];
      let sheetsWarning: string | undefined;
      try {
        const parsed = JSON.parse(text);
        sheetsRows = extractRowsFromSheetsResponse(parsed);
        if (parsed?.ok === false || parsed?.success === false || parsed?.error) {
          sheetsWarning = String(parsed.error || 'A API do Google Sheets informou uma falha.');
        }
      } catch {
        sheetsRows = [];
        if (text.trim()) {
          sheetsWarning = 'A resposta do Google Sheets não contém JSON válido.';
        }
      }

      return res.status(200).json({
        ok: true,
        data: sheetsRows,
        serverItems,
        deletedIds: store.deletedIds,
        ...(!response.ok
          ? { warning: `Google Sheets respondeu com status ${response.status}.` }
          : sheetsWarning
            ? { warning: sheetsWarning }
            : {}),
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    console.warn('Erro ao buscar orçamentos no Google Sheets (retornando espelho sincronizado):', error?.message || error);
    return res.status(200).json({
      ok: true,
      data: [],
      serverItems,
      deletedIds: store.deletedIds,
      warning: error?.message,
    });
  }
};

const handlePostOrcamentosSheets = async (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  const payload = req.body || {};
  const action = String(payload.action || 'save');
  const id = String(payload.id || payload.orcamentoId || '').trim();
  const status = String(payload.status || '');

  // 1. Atualiza imediatamente o espelho em nuvem do servidor para garantir consistência instantânea em abas anônimas e outros dispositivos
  if (id) {
    const store = readServerCloudStore();
    if (action === 'delete' || status === 'deleted') {
      delete store.orcamentos[id];
      if (!store.deletedIds.includes(id)) {
        store.deletedIds.push(id);
      }
    } else if (action === 'updateStatus') {
      store.deletedIds = store.deletedIds.filter((delId) => delId !== id);
      const existing = store.orcamentos[id] || {};
      store.orcamentos[id] = {
        ...existing,
        ...payload,
        id,
        status: status || existing.status || 'em_elaboracao',
        dataAtualizacao: new Date().toISOString(),
      };
    } else {
      store.deletedIds = store.deletedIds.filter((delId) => delId !== id);
      store.orcamentos[id] = {
        ...payload,
        id,
        dataAtualizacao: payload.dataAtualizacao || new Date().toISOString(),
      };
    }
    writeServerCloudStore(store);
  }

  // 2. Dispara a persistência na planilha Google Sheets via Google Apps Script (query params + JSON body)
  try {
    const queryParams = new URLSearchParams();
    if (action) queryParams.set('action', action);
    if (payload.acao) queryParams.set('acao', String(payload.acao));
    if (id) queryParams.set('id', id);
    if (status) queryParams.set('status', status);
    if (payload.fase) queryParams.set('fase', String(payload.fase));
    if (payload.cliente) queryParams.set('cliente', String(payload.cliente));
    if (payload.sindico) queryParams.set('sindico', String(payload.sindico));
    if (payload.telefone) queryParams.set('telefone', String(payload.telefone));
    if (payload.email) queryParams.set('email', String(payload.email));
    if (payload.cnpj) queryParams.set('cnpj', String(payload.cnpj));
    if (payload.valor !== undefined) queryParams.set('valor', String(payload.valor));
    if (payload.sheet) queryParams.set('sheet', String(payload.sheet));

    const targetUrl = queryParams.toString()
      ? `${GOOGLE_SHEETS_API_URL}?${queryParams.toString()}`
      : GOOGLE_SHEETS_API_URL;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: controller.signal,
      });
      const text = await response.text().catch(() => '');
      let apiIndicatesFailure = false;
      try {
        const result = JSON.parse(text);
        apiIndicatesFailure =
          result?.ok === false || result?.success === false || Boolean(result?.error);
      } catch {
        // Respostas não JSON são aceitas quando o Apps Script retorna HTTP 2xx.
      }
      return res.status(200).json({
        ok: true,
        sheetsOk: response.ok && !apiIndicatesFailure,
        status: response.status,
        response: text,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    console.warn('Aviso ao gravar no Google Sheets externo (salvo no espelho do servidor):', error?.message || error);
    return res.status(200).json({
      ok: true,
      sheetsOk: false,
      error: error?.message,
    });
  }
};

app.get('/api/sheets/orcamentos', handleGetOrcamentosSheets);
app.get('/api/sheets/orcamentos/', handleGetOrcamentosSheets);
app.post('/api/sheets/orcamentos', handlePostOrcamentosSheets);
app.post('/api/sheets/orcamentos/', handlePostOrcamentosSheets);

// Explicit error handler for all /api routes to GUARANTEE json response, never HTML
app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro no interceptador da API:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro no processamento da requisição da API.',
  });
});

// Explicit 404 for any unmatched /api route - PREVENTS dropping to Vite SPA index.html!
app.all('/api/*', (_req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Endpoint da API não encontrado.',
  });
});

// Setup Vite in Dev or static in Prod (only reached for frontend requests, never /api)
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Engenharia Diagnóstica server rodando na porta ${PORT}`);
});
