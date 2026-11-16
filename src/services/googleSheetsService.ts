import {
  OrcamentoSalvo,
  StatusOrcamentoKanban,
  DadosCliente,
  CalculosOrcamento,
  CondicoesComerciais,
  ItemMaterial,
  CargoProfissional,
  DiagnosticoResponse,
} from '../types';
import {
  CONDICOES_COMERCIAIS_PADRAO,
  calcularOrcamento,
} from '../utils/budgetCalculator';
import {
  obterConfigEtapaKanban,
  salvarOrcamentosNoStorage,
  carregarOrcamentosSalvos,
} from '../utils/orcamentoKanbanUtils';

export const GOOGLE_SHEETS_REQUEST_TIMEOUT_MS = 45_000;

export const GOOGLE_SHEETS_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SHEETS_API_URL?.trim()) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SHEETS_URL?.trim()) ||
  '';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL?.trim().replace(/\/+$/, '')) ||
  '';

export function formatarErroAmigavelRede(error: unknown, operacao: string = 'sincronização'): string {
  const msg = error instanceof Error ? error.message : String(error || '');
  const lower = msg.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('aborted') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout')
  ) {
    return `O serviço de ${operacao} demorou a responder ou está offline no momento. Seus orçamentos continuam salvos e acessíveis no navegador.`;
  }
  return msg || `Não foi possível concluir a ${operacao}.`;
}

export function compactarOrcamentoParaNuvem(orcamento: OrcamentoSalvo): OrcamentoSalvo {
  return {
    ...orcamento,
    selectedImage: null,
    registrosVistoria: (orcamento.registrosVistoria || []).map((reg) => ({
      ...reg,
      imagemUrl: reg.imagemUrl || '',
    })),
  };
}

export async function compactarImagensParaPlanilha(
  orcamento: OrcamentoSalvo
): Promise<OrcamentoSalvo> {
  return compactarOrcamentoParaNuvem(orcamento);
}

export function montarPayloadPlanilha(
  orcamento: OrcamentoSalvo,
  action: 'save' | 'updateStatus' | 'delete' = 'save',
  _etapaFormulario?: number
) {
  const orcamentoCompacto = compactarOrcamentoParaNuvem(orcamento);
  return {
    ...orcamentoCompacto,
    action,
    id: orcamento.id,
    cliente: orcamento.dadosCliente.nomeCondominio || 'Cliente',
    status: orcamento.status,
  };
}

function resolveEndpoint(path: string): string {
  if (GOOGLE_SHEETS_API_URL) return GOOGLE_SHEETS_API_URL;
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function fetchComTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = GOOGLE_SHEETS_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (controller.signal.aborted) {
      throw new Error(`Tempo limite de ${timeoutMs / 1000}s excedido ao comunicar com o servidor.`);
    }
    throw new Error(formatarErroAmigavelRede(err));
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function salvarOrcamentoNaNuvem(
  orcamento: OrcamentoSalvo,
  etapaFormulario?: number
): Promise<boolean> {
  if (!orcamento.dadosCliente.nomeCondominio.trim()) {
    throw new Error('Informe o nome do condomínio antes de salvar o orçamento.');
  }

  const payload = montarPayloadPlanilha(orcamento, 'save', etapaFormulario);

  try {
    const response = await fetchComTimeout(resolveEndpoint('/api/orcamentos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || (body && body.ok === false)) {
      throw new Error(body?.error || `Resposta com status HTTP ${response.status}`);
    }
    return true;
  } catch (error: any) {
    console.warn('[googleSheetsService] Erro ao salvar orçamento:', error);
    throw new Error(formatarErroAmigavelRede(error, 'salvamento'));
  }
}

export async function carregarOrcamentosDaNuvem(): Promise<OrcamentoSalvo[]> {
  try {
    const response = await fetchComTimeout(
      resolveEndpoint(`/api/orcamentos?t=${Date.now()}`),
      {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      }
    );

    const json = await response.json().catch(() => null);
    if (!response.ok || (json && json.ok === false)) {
      throw new Error(json?.error || `Resposta HTTP ${response.status}`);
    }

    const rows = Array.isArray(json?.data) ? json.data : [];
    const lista: OrcamentoSalvo[] = rows.map((value: any) => {
      let dados: Partial<OrcamentoSalvo> = {};
      if (typeof value.dados === 'string') {
        try {
          dados = JSON.parse(value.dados);
        } catch {
          dados = {};
        }
      } else if (value.dados && typeof value.dados === 'object') {
        dados = value.dados;
      }
      const materiais = dados.materiais || [];
      const equipe = dados.equipe || [];
      const mesesObra = dados.mesesObra || 4;
      const margemLucroPercentual = dados.margemLucroPercentual || 20;

      return {
        id: value.id,
        dataCriacao: dados?.dataCriacao || value.created_at || new Date().toISOString(),
        dataAtualizacao: dados?.dataAtualizacao || new Date().toISOString(),
        status: value.status || dados?.status || 'em_elaboracao',
        dadosCliente: dados?.dadosCliente || {
          nomeCondominio: value.cliente || '',
          cnpj: '',
          endereco: '',
          nomeSindico: '',
          anoConstrucao: '',
          pavimentos: '',
          telefone: '',
          email: '',
        },
        calculos:
          dados.calculos ||
          calcularOrcamento(materiais, equipe, mesesObra, margemLucroPercentual),
        condicoesComerciais: dados?.condicoesComerciais || CONDICOES_COMERCIAIS_PADRAO,
        materiais,
        equipe,
        mesesObra,
        margemLucroPercentual,
        diagnostico: dados?.diagnostico || null,
        registrosVistoria: dados?.registrosVistoria || [],
        selectedImage: null,
      };
    });

    salvarOrcamentosNoStorage(lista);
    return lista;
  } catch (error) {
    console.warn('[googleSheetsService] Falha de comunicação ao carregar:', error);
    // Fallback gracioso para os orçamentos locais para não quebrar a aplicação
    const locais = carregarOrcamentosSalvos();
    if (locais.length > 0) {
      return locais;
    }
    throw new Error(formatarErroAmigavelRede(error, 'sincronização de orçamentos'));
  }
}

export async function carregarOrcamentoDaNuvemPorId(
  proposalId: string
): Promise<OrcamentoSalvo | null> {
  const lista = await carregarOrcamentosDaNuvem();
  return lista.find((item) => item.id === proposalId) || null;
}

export async function atualizarStatusOrcamentoNaNuvem(
  orcamento: OrcamentoSalvo,
  novoStatus: StatusOrcamentoKanban
): Promise<boolean> {
  const atualizado: OrcamentoSalvo = {
    ...orcamento,
    status: novoStatus,
    dataAtualizacao: new Date().toISOString(),
  };
  const payload = montarPayloadPlanilha(atualizado, 'updateStatus');

  try {
    const response = await fetchComTimeout(resolveEndpoint('/api/orcamentos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || (body && body.ok === false)) {
      throw new Error(body?.error || `Resposta HTTP ${response.status}`);
    }
    return true;
  } catch (error) {
    console.warn('[googleSheetsService] Erro ao atualizar status:', error);
    throw new Error(formatarErroAmigavelRede(error, 'atualização de etapa'));
  }
}

export async function excluirOrcamentoDaNuvem(id: string): Promise<boolean> {
  const proposalId = id.trim();
  if (!proposalId) {
    throw new Error('O ID da proposta é obrigatório para exclusão.');
  }

  const payload = {
    action: 'delete',
    id: proposalId,
    status: 'deleted',
  };

  try {
    const response = await fetchComTimeout(resolveEndpoint('/api/orcamentos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok || (body && body.ok === false)) {
      throw new Error(body?.error || `Resposta HTTP ${response.status}`);
    }
    return true;
  } catch (error) {
    console.warn('[googleSheetsService] Erro ao excluir orçamento:', error);
    throw new Error(formatarErroAmigavelRede(error, 'exclusão'));
  }
}
