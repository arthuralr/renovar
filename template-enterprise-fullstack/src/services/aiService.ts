import { api } from '../api/apiClient';

export interface Finding {
  title: string;
  description: string;
  rootCause: string;
  recommendedAction: string;
}

export interface DiagnosticResult {
  summary: string;
  severity: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  findings: Finding[];
  technicalNorms: string[];
}

export const aiService = {
  async runDiagnostic(params: {
    prompt: string;
    imageBase64?: string;
    mimeType?: string;
  }): Promise<DiagnosticResult> {
    const res = await api.post<{ ok: boolean; result: DiagnosticResult }>(
      '/api/ai/diagnose',
      params,
      { timeoutMs: 60_000 } // 60 segundos dedicado para IA
    );
    return res.result;
  },
};
