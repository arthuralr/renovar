import { GoogleGenAI, Type } from '@google/genai';
import { DiagnosticoResponse, InspecaoContexto } from '../types';

export const GEMINI_PRIMARY_MODEL = 'gemini-3.8-flash';
export const GEMINI_BACKUP_MODEL = 'gemini-3.1-flash-lite';
export const GEMINI_FALLBACK_CHAIN = [
  GEMINI_PRIMARY_MODEL,
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const GEMINI_REQUEST_TIMEOUT_MS = 45_000;
const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

function normalizarImagemParaGemini(
  imageData: string,
  mimeType: string
): { data: string; mimeType: string } {
  const trimmed = imageData.trim();
  const dataUrlMatch = trimmed.match(/^data:(image\/[a-z0-9.+-]+);base64,([\s\S]*)$/i);
  const resolvedMimeType = (dataUrlMatch?.[1] || mimeType || 'image/jpeg')
    .toLowerCase()
    .replace('image/jpg', 'image/jpeg');
  const data = (dataUrlMatch?.[2] || trimmed).replace(/\s/g, '');

  if (!SUPPORTED_IMAGE_MIME_TYPES.has(resolvedMimeType)) {
    throw new Error(`Formato de imagem não suportado pelo Gemini: ${resolvedMimeType}.`);
  }
  if (!data || data.length < 8) {
    throw new Error('O conteúdo Base64 da imagem é inválido ou está incompleto.');
  }

  return { data, mimeType: resolvedMimeType };
}

async function generateContentWithTimeout(
  geminiClient: GoogleGenAI,
  model: string,
  contents: any[],
  config: any,
  label: string
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
  try {
    return await geminiClient.models.generateContent({
      model,
      contents,
      config: {
        ...config,
        abortSignal: controller.signal,
        httpOptions: {
          ...config?.httpOptions,
          timeout: GEMINI_REQUEST_TIMEOUT_MS,
        },
      },
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Tempo limite de ${GEMINI_REQUEST_TIMEOUT_MS / 1000}s excedido durante ${label}. O envio ou processamento da imagem demorou mais que o esperado.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Identifica se o erro é transitório (sobrecarga 503, limite de taxa 429, erro 5xx ou falha de rede)
 * e, portanto, elegível para repetição inteligente (retry) antes de alternar de modelo.
 */
export const isTransientOrOverloadError = (error: any): boolean => {
  const status = Number(error?.status || error?.code || error?.httpStatus || 0);
  if ([408, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  const msg = String(error?.message || error || '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('unavailable') ||
    msg.includes('overloaded') ||
    msg.includes('high demand') ||
    msg.includes('resource_exhausted') ||
    msg.includes('deadline_exceeded') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
};

/**
 * Executa uma chamada à API Gemini com repetição inteligente (retry) e pequenos intervalos
 * progressivos (backoff com jitter) para absorver oscilações de rede ou picos de demanda (503).
 */
export async function executeWithSmartRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: { label: string; maxRetries?: number; baseDelayMs?: number } = {
    label: 'Gemini API',
  }
): Promise<T> {
  const { label, maxRetries = 2, baseDelayMs = 650 } = options;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation(attempt);
    } catch (err: any) {
      lastError = err;
      const canRetry = attempt <= maxRetries && isTransientOrOverloadError(err);
      if (!canRetry) {
        break;
      }

      const jitter = Math.floor(Math.random() * 200);
      const waitMs = baseDelayMs * attempt + jitter;
      console.warn(
        `[${label}] Falha transitória/503 na tentativa ${attempt}/${maxRetries + 1} (${err?.message || err}). Aguardando ${waitMs}ms para nova tentativa...`
      );
      await sleep(waitMs);
    }
  }

  throw lastError;
}

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

export const getClientGeminiApiKey = (): string => {
  const viteKey =
    typeof import.meta !== 'undefined' && (import.meta as any).env
      ? (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_API_KEY
      : undefined;
  if (isValidApiKey(viteKey)) {
    return viteKey.trim().replace(/^["']|["']$/g, '');
  }

  const procViteKey =
    typeof process !== 'undefined' && process.env
      ? process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY
      : undefined;
  if (isValidApiKey(procViteKey)) {
    return procViteKey.trim().replace(/^["']|["']$/g, '');
  }

  const procKey =
    typeof process !== 'undefined' && process.env
      ? process.env.GEMINI_API_KEY || process.env.API_KEY
      : undefined;
  if (isValidApiKey(procKey)) {
    return procKey.trim().replace(/^["']|["']$/g, '');
  }

  return '';
};

export function createGeminiClientInstance(apiKey?: string): GoogleGenAI {
  const resolvedKey = apiKey || getClientGeminiApiKey();
  if (!isValidApiKey(resolvedKey)) {
    throw new Error('Chave da API do Gemini não configurada ou inválida. Verifique sua GEMINI_API_KEY no arquivo .env.');
  }
  return new GoogleGenAI({
    apiKey: resolvedKey,
  });
}

export function logAndFormatGeminiError(error: any, contextLabel: string): Error {
  const status = error?.status || error?.code || error?.httpStatus;
  const rawMessage = String(error?.message || error || '');
  const lowerMsg = rawMessage.toLowerCase();

  console.error(`[Gemini Service] ❌ Erro detalhado na chamada (${contextLabel}):`, {
    status,
    message: rawMessage,
    details: error?.details || error?.error,
    error,
  });

  if (status === 429 || lowerMsg.includes('quota') || lowerMsg.includes('resource_exhausted')) {
    return new Error(
      'Limite de requisições do Gemini atingido (Cota excedida no plano gratuito). Aguarde alguns instantes ou atualize sua chave de API.'
    );
  }

  if (
    status === 401 ||
    status === 403 ||
    lowerMsg.includes('api_key_invalid') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('permission_denied')
  ) {
    return new Error(
      'Chave da API do Gemini inválida ou não autorizada. Verifique se a GEMINI_API_KEY está correta.'
    );
  }

  if (
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('networkerror') ||
    lowerMsg.includes('etimedout')
  ) {
    return new Error(
      'Falha de conexão com a API do Google Gemini. Verifique sua conexão com a internet e tente novamente.'
    );
  }

  return error instanceof Error
    ? error
    : new Error(rawMessage || 'Erro desconhecido ao comunicar com a API do Gemini.');
}

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

export const INVALID_CONSTRUCTION_IMAGE_MESSAGE =
  'A imagem enviada não corresponde a uma patologia construtiva ou elemento de fachada válido';

export class ImagemConstrutivaInvalidaError extends Error {
  constructor() {
    super(INVALID_CONSTRUCTION_IMAGE_MESSAGE);
    this.name = 'ImagemConstrutivaInvalidaError';
  }
}

const qualificacaoImagemSchema = {
  type: Type.OBJECT,
  properties: {
    isValidConstructionImage: {
      type: Type.BOOLEAN,
      description:
        'Verdadeiro somente se a imagem mostrar uma edificação, fachada, elemento construtivo ou manifestação patológica da construção civil.',
    },
    reason: {
      type: Type.STRING,
      description: 'Motivo breve da classificação visual.',
    },
  },
  required: ['isValidConstructionImage', 'reason'],
};

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
            description:
              'Classificação técnica e concisa da manifestação (ex: "Fissuras e Desplacamento de Revestimento Cerâmico").',
          },
          gravidade: {
            type: Type.STRING,
            description: 'Gravidade estimada da anomalia ("Crítica", "Alta", "Média" ou "Leve").',
          },
          constatacao_visual: {
            type: Type.STRING,
            description:
              'Descrição detalhada e pericial do que é visível na foto (localização, aspecto, extensão aparente e estado de degradação).',
          },
          justificativa_tecnica_causa: {
            type: Type.STRING,
            description: 'Explicação de engenharia que originou o problema (causa provável).',
          },
          risco_evolutivo_consequencias: {
            type: Type.STRING,
            description:
              'Impacto estrutural, financeiro e de segurança caso a anomalia não sofra intervenção imediata.',
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
            description:
              'Passo a passo técnico (3 a 5 etapas) descrevendo a metodologia correta de recuperação e tratamento.',
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

export async function diagnosticarImagemClient(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  contexto?: InspecaoContexto,
  _photoIndex: number = 0
): Promise<DiagnosticoResponse> {
  try {
    const apiKey = getClientGeminiApiKey();
    if (!isValidApiKey(apiKey)) {
      throw new Error(
        'Não foi possível validar a imagem: a integração com o Gemini não está configurada (chave ausente no .env).'
      );
    }
    const imagem = normalizarImagemParaGemini(imageBase64, mimeType);

    const geminiClient = new GoogleGenAI({
      apiKey,
    });

    // Estruturação rigorosa da parte binária da imagem para o payload do SDK Google Gen AI
    const imagePart = {
      inlineData: {
        mimeType: imagem.mimeType,
        data: imagem.data,
      },
    };

    const parseResponse = (text: string) => {
      const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      try {
        return JSON.parse(trimmed);
      } catch {
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('O Gemini retornou uma resposta inválida.');
        return JSON.parse(jsonMatch[0]);
      }
    };

    // 1. Tenta validação preliminar do elemento construtivo (não bloqueia o laudo caso haja sobrecarga transitória na qualificação)
    try {
      for (const modelName of GEMINI_FALLBACK_CHAIN) {
        try {
          const qualResp = await generateContentWithTimeout(
            geminiClient,
            modelName,
            [
              {
                role: 'user',
                parts: [
                  imagePart,
                  {
                    text: 'Classifique exclusivamente o conteúdo visual da imagem. É válida somente se mostrar uma edificação, fachada, elemento construtivo ou patologia da construção civil. Panfletos, pessoas, paisagens sem relação com obras, animais e objetos comuns são inválidos.',
                  },
                ],
              },
            ],
            {
              responseMimeType: 'application/json',
              responseSchema: qualificacaoImagemSchema,
            },
            `Validação visual (${modelName})`
          );
          if (qualResp?.text) {
            const parsedQual = parseResponse(qualResp.text);
            if (parsedQual?.isValidConstructionImage === false) {
              throw new ImagemConstrutivaInvalidaError();
            }
            break;
          }
        } catch (qualInnerErr: any) {
          if (qualInnerErr instanceof ImagemConstrutivaInvalidaError) {
            throw qualInnerErr;
          }
          console.warn(
            `[Gemini Service] Aviso na qualificação preliminar (${modelName}):`,
            qualInnerErr?.message || qualInnerErr
          );
        }
      }
    } catch (qualErr: any) {
      if (qualErr instanceof ImagemConstrutivaInvalidaError) {
        throw qualErr;
      }
      console.warn('[Gemini Service] Prosseguindo diretamente com a análise pericial da fotografia.');
    }

    // 2. Montagem do prompt pericial e contexto do perito inspetor
    let userPrompt =
      'Analise pericialmente esta fotografia de manifestação patológica em edificação/fachada e formule um registro de diagnóstico técnico consolidado, em estrita conformidade com as normas ABNT vigentes.';

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

    const contents = [
      {
        role: 'user',
        parts: [
          imagePart,
          { text: userPrompt },
        ],
      },
    ];

    let lastError: any = null;
    for (const modelName of GEMINI_FALLBACK_CHAIN) {
      try {
        const response = await generateContentWithTimeout(
          geminiClient,
          modelName,
          contents,
          {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: anomaliasSchema,
          },
          `Diagnóstico ABNT Foto (${modelName})`
        );
        if (response?.text) {
          const parsed = parseResponse(response.text);
          const items =
            parsed?.anomalias ||
            parsed?.patologias ||
            parsed?.diagnostico?.anomalias ||
            parsed?.diagnostico?.patologias;
          if (Array.isArray(items) && items.length > 0) {
            return normalizarDiagnosticoGemini(parsed);
          }
          throw new Error('O Gemini retornou dados fora do esquema esperado.');
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`[Gemini Service] Tentativa falhou no modelo ${modelName}:`, {
          status: error?.status || error?.code,
          message: error?.message,
        });
      }
    }

    throw logAndFormatGeminiError(lastError, 'Diagnóstico por Imagem');
  } catch (error: any) {
    if (error instanceof ImagemConstrutivaInvalidaError) {
      throw error;
    }
    const formatted = logAndFormatGeminiError(error, 'Diagnóstico Pericial de Fotografia');
    throw formatted;
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function wrapTextToSvgSpans(
  text: string,
  maxCharsPerLine: number = 75,
  x: number = 72,
  startY: number = 210,
  lineHeight: number = 22
): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
    if (lines.length >= 7) break;
  }
  if (currentLine && lines.length < 7) lines.push(currentLine);

  return lines
    .map(
      (line, idx) =>
        `<tspan x="${x}" y="${startY + idx * lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');
}

export function gerarPlaceholderRegistroTexto(titulo: string, descricao: string): string {
  const safeTitle = escapeXml((titulo || 'Registro Técnico Descritivo').slice(0, 55));
  const spans = wrapTextToSvgSpans(descricao || '', 75, 72, 210, 22);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <rect width="800" height="500" fill="#020617"/>
    <rect x="24" y="24" width="752" height="452" rx="16" fill="#0f172a" stroke="#f59e0b" stroke-width="2" stroke-opacity="0.5"/>
    <rect x="48" y="48" width="704" height="64" rx="12" fill="#1e293b"/>
    <circle cx="76" cy="80" r="14" fill="#f59e0b"/>
    <text x="76" y="85" fill="#020617" font-family="sans-serif" font-size="14" font-weight="900" text-anchor="middle">R</text>
    <text x="104" y="78" fill="#ffffff" font-family="monospace" font-size="15" font-weight="bold">RenovarSC — SOLUÇÕES PREDIAIS</text>
    <text x="104" y="96" fill="#94a3b8" font-family="monospace" font-size="11">LAUDO TÉCNICO PERICIAL • REGISTRO DESCRITIVO</text>
    <rect x="48" y="132" width="704" height="280" rx="12" fill="#020617" stroke="#334155" stroke-width="1"/>
    <text x="72" y="172" fill="#f59e0b" font-family="sans-serif" font-size="17" font-weight="bold">${safeTitle}</text>
    <text fill="#e2e8f0" font-family="sans-serif" font-size="13">
      ${spans}
    </text>
    <line x1="48" y1="430" x2="752" y2="430" stroke="#1e293b" stroke-width="1"/>
    <text x="48" y="455" fill="#64748b" font-family="monospace" font-size="11">DIRETRIZES DA ABNT NBR 16747 • ENGENHARIA DIAGNÓSTICA</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function diagnosticarTextoClient(
  textoManual: string,
  contexto?: InspecaoContexto
): Promise<DiagnosticoResponse> {
  try {
    const apiKey = getClientGeminiApiKey();
    if (!isValidApiKey(apiKey)) {
      throw new Error(
        'Não foi possível emitir o laudo: a integração com o Gemini não está configurada (chave ausente no .env).'
      );
    }

    if (!textoManual || !textoManual.trim()) {
      throw new Error('Por favor, informe a descrição ou escopo técnico da patologia para análise.');
    }

    const geminiClient = new GoogleGenAI({
      apiKey,
    });

    const parseResponse = (text: string) => {
      const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      try {
        return JSON.parse(trimmed);
      } catch {
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('O Gemini retornou uma resposta inválida.');
        return JSON.parse(jsonMatch[0]);
      }
    };

    let userPrompt = `O perito ou cliente forneceu o seguinte relato/escopo técnico descritivo de manifestações patológicas ou serviços de reforma predial/fachadas:\n\n"""\n${textoManual.trim()}\n"""\n\nAnalise tecnicamente esse relato descritivo, identifique a manifestação patológica principal e formule um laudo de diagnóstico pericial consolidado, em estrita conformidade com as normas ABNT vigentes.`;

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

    // Envio exclusivo como prompt de texto puro, sem estruturas binárias
    const contents = [
      {
        role: 'user',
        parts: [
          { text: userPrompt },
        ],
      },
    ];

    let lastError: any = null;
    for (const modelName of GEMINI_FALLBACK_CHAIN) {
      try {
        const response = await generateContentWithTimeout(
          geminiClient,
          modelName,
          contents,
          {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: anomaliasSchema,
          },
          `Diagnóstico Descritivo ABNT (${modelName})`
        );
        if (response?.text) {
          const parsed = parseResponse(response.text);
          const items =
            parsed?.anomalias ||
            parsed?.patologias ||
            parsed?.diagnostico?.anomalias ||
            parsed?.diagnostico?.patologias;
          if (Array.isArray(items) && items.length > 0) {
            return normalizarDiagnosticoGemini(parsed);
          }
          throw new Error('O Gemini retornou dados fora do esquema esperado.');
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`[Gemini Service] Tentativa falhou no modelo ${modelName}:`, {
          status: error?.status || error?.code,
          message: error?.message,
        });
      }
    }

    throw logAndFormatGeminiError(lastError, 'Diagnóstico por Texto');
  } catch (error: any) {
    const formatted = logAndFormatGeminiError(error, 'Diagnóstico Descritivo por Texto');
    throw formatted;
  }
}

/**
 * Função de conveniência que roteia de forma transparente tanto imagens quanto textos manuais
 */
export async function diagnosticarPatologiaClient(params: {
  imageBase64?: string | null;
  mimeType?: string;
  textoManual?: string | null;
  contexto?: InspecaoContexto;
  photoIndex?: number;
}): Promise<DiagnosticoResponse> {
  if (params.textoManual && params.textoManual.trim()) {
    return diagnosticarTextoClient(params.textoManual, params.contexto);
  }
  if (params.imageBase64 && params.imageBase64.trim()) {
    return diagnosticarImagemClient(
      params.imageBase64,
      params.mimeType || 'image/jpeg',
      params.contexto,
      params.photoIndex
    );
  }
  throw new Error('Nenhuma fotografia ou texto descritivo fornecido para análise.');
}

export function normalizarDiagnosticoGemini(payload: any): DiagnosticoResponse {
  const rawItems =
    payload?.anomalias ||
    payload?.patologias ||
    payload?.diagnostico?.anomalias ||
    payload?.diagnostico?.patologias;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('O Gemini não retornou patologias em um formato reconhecido.');
  }

  const toStringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === 'string')
      : typeof value === 'string' && value.trim()
        ? [value.trim()]
        : [];
  const normalizedItems = rawItems.slice(0, 1).map((item: any) => {
    const nome =
      item?.nome_patologia || item?.nomePatologia || item?.patologia || item?.nome || '';
    const constatacao =
      item?.constatacao_visual ||
      item?.constatacaoVisual ||
      item?.descricao ||
      item?.evidencia_visual ||
      '';
    const causa =
      item?.justificativa_tecnica_causa ||
      item?.justificativaTecnicaCausa ||
      item?.causa_provavel ||
      item?.causaProvavel ||
      '';
    const risco =
      item?.risco_evolutivo_consequencias ||
      item?.riscoEvolutivoConsequencias ||
      item?.risco_evolutivo ||
      item?.riscoEvolutivo ||
      '';
    const normas = toStringArray(item?.normas_tecnicas_abnt || item?.normasAbnt);
    const ensaios = toStringArray(item?.ensaios_complementares || item?.ensaios);
    const reparos = toStringArray(item?.diretrizes_reparo || item?.diretrizesReparo);

    return {
      nome_patologia: String(nome || 'Manifestação Patológica Não Classificada'),
      gravidade: String(item?.gravidade || item?.severidade || 'Média'),
      constatacao_visual: String(constatacao),
      descricao: String(constatacao),
      justificativa_tecnica_causa: String(causa),
      causa_provavel: String(causa),
      risco_evolutivo_consequencias: String(risco),
      risco_evolutivo: String(risco),
      normas_tecnicas_abnt: normas,
      ensaios_complementares: ensaios,
      diretrizes_reparo: reparos,
    };
  });

  return { anomalias: normalizedItems, patologias: normalizedItems };
}
