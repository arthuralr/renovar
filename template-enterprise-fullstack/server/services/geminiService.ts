import { GoogleGenAI, Type } from '@google/genai';

const apiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');

const GEMINI_PRIMARY_MODEL = 'gemini-2.5-flash';
const GEMINI_BACKUP_MODEL = 'gemini-2.0-flash';
const GEMINI_FALLBACK_CHAIN = [GEMINI_PRIMARY_MODEL, GEMINI_BACKUP_MODEL] as const;
const GEMINI_TIMEOUT_MS = 60_000; // 60 segundos robusto

const aiClient = apiKey
  ? new GoogleGenAI({
      apiKey,
      vertexai: false,
      httpOptions: { apiVersion: 'v1beta' }, // Obrigatório para JSON Schema estruturado
    })
  : null;

export const diagnosticOutputSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: 'Resumo executivo do diagnóstico técnico.' },
    severity: { type: Type.STRING, description: 'Nível de severidade: Baixa, Média, Alta ou Crítica.' },
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          rootCause: { type: Type.STRING },
          recommendedAction: { type: Type.STRING },
        },
        required: ['title', 'description', 'rootCause', 'recommendedAction'],
      },
    },
    technicalNorms: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Normas técnicas ou regulatórias aplicáveis.',
    },
  },
  required: ['summary', 'severity', 'findings', 'technicalNorms'],
};

export async function analyzeWithGemini(
  prompt: string,
  base64Image?: string,
  mimeType: string = 'image/jpeg'
): Promise<any> {
  if (!aiClient) {
    throw new Error('Chave de API do Google Gemini não configurada no servidor.');
  }

  const parts: any[] = [];

  if (base64Image) {
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '').replace(/\s/g, '');
    parts.push({
      inlineData: {
        mimeType: mimeType.toLowerCase().replace('image/jpg', 'image/jpeg'),
        data: cleanBase64,
      },
    });
  }

  parts.push({ text: prompt });

  let lastError: any = null;

  for (const model of GEMINI_FALLBACK_CHAIN) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const response = await aiClient.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          abortSignal: controller.signal,
          responseMimeType: 'application/json',
          responseSchema: diagnosticOutputSchema,
        },
      });

      clearTimeout(timeoutId);

      if (response?.text) {
        return JSON.parse(response.text.trim());
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (controller.signal.aborted) {
        console.warn(`[Gemini] Timeout de ${GEMINI_TIMEOUT_MS / 1000}s atingido no modelo ${model}.`);
      } else {
        console.warn(`[Gemini] Modelo ${model} falhou: ${err?.message || err}. Tentando próximo da cadeia...`);
      }
    }
  }

  throw lastError || new Error('Não foi possível obter resposta dos modelos do Gemini.');
}
