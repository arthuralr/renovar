import { GoogleGenAI, Type } from '@google/genai';
import { DiagnosticoResponse, InspecaoContexto } from '../types';

export const GEMINI_PRIMARY_MODEL = 'gemini-2.5-flash';
export const GEMINI_BACKUP_MODEL = 'gemini-2.0-flash';
export const GEMINI_FALLBACK_CHAIN = [
  GEMINI_PRIMARY_MODEL,
  GEMINI_BACKUP_MODEL,
] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const GEMINI_REQUEST_TIMEOUT_MS = 10_000;
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
  if (!data || !/^[a-z0-9+/]*={0,2}$/i.test(data) || data.length % 4 === 1) {
    throw new Error('O conteúdo Base64 da imagem é inválido ou está incompleto.');
  }
  try {
    atob(data.padEnd(Math.ceil(data.length / 4) * 4, '='));
  } catch {
    throw new Error('Não foi possível decodificar a imagem Base64 enviada ao Gemini.');
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
      throw new Error(`Timeout de ${GEMINI_REQUEST_TIMEOUT_MS}ms durante ${label}.`);
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
  const apiKey = getClientGeminiApiKey();
  if (!isValidApiKey(apiKey)) {
    throw new Error('Não foi possível validar a imagem: a integração com o Gemini não está configurada.');
  }
  const imagem = normalizarImagemParaGemini(imageBase64, mimeType);

  const geminiClient = new GoogleGenAI({
    apiKey,
    vertexai: false,
  });
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

  const executarModelos = async (
    contents: any[],
    config: any,
    label: string,
    isValidResponse: (parsed: any) => boolean
  ) => {
    for (const modelName of GEMINI_FALLBACK_CHAIN) {
      try {
        const response = await generateContentWithTimeout(
          geminiClient,
          modelName,
          contents,
          config,
          `${label} (${modelName})`
        );
        if (response?.text) {
          const parsed = parseResponse(response.text);
          if (isValidResponse(parsed)) return parsed;
          throw new Error('O Gemini retornou dados em formato inesperado.');
        }
      } catch (error) {
        console.warn(`[${label}] Modelo ${modelName} indisponível:`, error);
      }
    }
    throw new Error(`O Gemini não conseguiu concluir ${label.toLowerCase()}.`);
  };

  try {
    const qualification = await executarModelos(
      [
        {
          role: 'user',
          parts: [
            imagePart,
            {
              text: 'Classifique exclusivamente o conteúdo visual da imagem. É válida somente se mostrar uma edificação, fachada, elemento construtivo ou patologia da construção civil. Panfletos, pessoas, paisagens sem relação com obras, animais e objetos comuns são inválidos. Não gere diagnóstico nesta etapa.',
            },
          ],
        },
      ],
      {
        responseMimeType: 'application/json',
        responseSchema: qualificacaoImagemSchema,
      },
      'Validação da imagem',
      (parsed) => typeof parsed?.isValidConstructionImage === 'boolean'
    );
    if (qualification?.isValidConstructionImage !== true) {
      throw new ImagemConstrutivaInvalidaError();
    }

    let userPrompt =
      'A imagem já foi validada como relacionada à construção civil. Analise-a pericialmente e formule um registro de diagnóstico consolidado, em conformidade com as normas ABNT vigentes.';

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

    const parsedData = await executarModelos(
      [{ role: 'user', parts: [imagePart, { text: userPrompt }] }],
      {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: anomaliasSchema,
      },
      'Diagnóstico ABNT',
      (parsed) => {
        const items =
          parsed?.anomalias ||
          parsed?.patologias ||
          parsed?.diagnostico?.anomalias ||
          parsed?.diagnostico?.patologias;
        return Array.isArray(items) && items.length > 0;
      }
    );

    return normalizarDiagnosticoGemini(parsedData);
  } catch (error) {
    if (error instanceof ImagemConstrutivaInvalidaError) throw error;
    console.error('Não foi possível validar ou diagnosticar a imagem com o Gemini:', error);
    throw error;
  }
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
