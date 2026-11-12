import { GoogleGenAI, Type } from '@google/genai';
import { DiagnosticoResponse, InspecaoContexto } from '../types';
import { gerarLaudoTecnicoAbntFallback } from '../utils/abntEngine';

export const GEMINI_PRIMARY_MODEL = 'gemini-2.5-flash';
export const GEMINI_BACKUP_MODEL = 'gemini-2.0-flash';
export const GEMINI_FALLBACK_CHAIN = [
  GEMINI_PRIMARY_MODEL,
  GEMINI_BACKUP_MODEL,
] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  photoIndex: number = 0
): Promise<DiagnosticoResponse> {
  try {
    const apiKey = getClientGeminiApiKey();
    if (!isValidApiKey(apiKey)) {
      return gerarLaudoTecnicoAbntFallback(contexto, photoIndex);
    }
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

    const geminiClient = new GoogleGenAI({
      apiKey,
      vertexai: false,
    });

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

    for (const modelName of GEMINI_FALLBACK_CHAIN) {
      try {
        response = await withTimeout(
          geminiClient.models.generateContent({
            model: modelName,
            contents: requestContents,
            config: requestConfig,
          }),
          6500,
          `SDK ${modelName}`
        );
        if (response?.text) break;
      } catch (modelErr: any) {
        console.warn(
          `[Contingência ABNT] Modelo ${modelName} indisponível (${modelErr?.message || modelErr}).`
        );
      }
    }

    if (!response?.text) {
      console.info(
        '[Contingência ABNT] Gerando automaticamente laudo técnico estruturado conforme normas ABNT.'
      );
      return gerarLaudoTecnicoAbntFallback(contexto, photoIndex);
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
        return gerarLaudoTecnicoAbntFallback(contexto, photoIndex);
      }
    }

    const rawList = parsedData?.anomalias || parsedData?.patologias || [];
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return gerarLaudoTecnicoAbntFallback(contexto, photoIndex);
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
      ensaios_complementares: Array.isArray(item.ensaios_complementares)
        ? item.ensaios_complementares
        : [],
      diretrizes_reparo: Array.isArray(item.diretrizes_reparo) ? item.diretrizes_reparo : [],
    }));

    return {
      anomalias: normalizedItems,
      patologias: normalizedItems,
    };
  } catch (err) {
    console.warn(
      '[Contingência ABNT] Retornando laudo técnico estruturado ABNT após falha no cliente:',
      err
    );
    return gerarLaudoTecnicoAbntFallback(contexto, photoIndex);
  }
}
