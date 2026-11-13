import {
  OrcamentoSalvo,
  StatusOrcamentoKanban,
} from '../types';
import {
  CONDICOES_COMERCIAIS_PADRAO,
  calcularOrcamento,
} from '../utils/budgetCalculator';
import {
  obterConfigEtapaKanban,
  salvarOrcamentosNoStorage,
} from '../utils/orcamentoKanbanUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '') || '';
const API_ORCAMENTOS_PATH = '/api/orcamentos';

type ApiResponse = {
  ok?: boolean;
  error?: string;
  data?: unknown;
};

type BudgetApiRow = {
  id: string;
  cliente?: string;
  status?: StatusOrcamentoKanban;
  created_at?: string;
  dados?: string | Partial<OrcamentoSalvo> | null;
};

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function lerRespostaApi(response: Response): Promise<ApiResponse> {
  const parsed: unknown = await response.json().catch(() => null);
  const body =
    parsed && typeof parsed === 'object' ? (parsed as ApiResponse) : null;
  if (!body) {
    throw new Error('A API de orçamentos retornou uma resposta inválida.');
  }
  if (!response.ok || body.ok === false) {
    throw new Error(
      body?.error ||
        `A API de orçamentos respondeu com status HTTP ${response.status}.`
    );
  }
  return body;
}

export function compactarOrcamentoParaPersistencia(
  orcamento: OrcamentoSalvo
): OrcamentoSalvo {
  return {
    ...orcamento,
    selectedImage: null,
    registrosVistoria: (orcamento.registrosVistoria || []).map((reg) => ({
      ...reg,
      imagemUrl: reg.imagemUrl || '',
    })),
  };
}

export async function compactarImagensParaPersistencia(
  orcamento: OrcamentoSalvo
): Promise<OrcamentoSalvo> {
  return compactarOrcamentoParaPersistencia(orcamento);
}

export function montarPayloadOrcamento(
  orcamento: OrcamentoSalvo,
  action: 'save' | 'updateStatus' | 'delete' = 'save',
  _etapaFormulario?: number
) {
  const orcamentoCompacto = compactarOrcamentoParaPersistencia(orcamento);
  return {
    ...orcamentoCompacto,
    action,
    id: orcamento.id,
    cliente: orcamento.dadosCliente.nomeCondominio || 'Cliente',
    status: orcamento.status,
  };
}

export async function salvarOrcamentoNoBanco(
  orcamento: OrcamentoSalvo,
  etapaFormulario?: number
): Promise<boolean> {
  if (!orcamento.dadosCliente.nomeCondominio.trim()) {
    throw new Error('Informe o nome do condomínio antes de salvar o orçamento.');
  }

  const payload = montarPayloadOrcamento(orcamento, 'save', etapaFormulario);

  const response = await fetch(apiUrl(API_ORCAMENTOS_PATH), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  await lerRespostaApi(response);
  return true;
}

export async function carregarOrcamentosDoBanco(): Promise<OrcamentoSalvo[]> {
  const response = await fetch(apiUrl(`${API_ORCAMENTOS_PATH}?t=${Date.now()}`), {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });

  const json = await lerRespostaApi(response);
  const rows = Array.isArray(json.data) ? json.data : [];

  const lista: OrcamentoSalvo[] = rows.map((value) => {
    const row = value as BudgetApiRow;
    let dados: Partial<OrcamentoSalvo> = {};
    if (typeof row.dados === 'string') {
      try {
        dados = JSON.parse(row.dados) as Partial<OrcamentoSalvo>;
      } catch {
        dados = {};
      }
    } else if (row.dados && typeof row.dados === 'object') {
      dados = row.dados;
    }
    const materiais = dados.materiais || [];
    const equipe = dados.equipe || [];
    const mesesObra = dados.mesesObra || 4;
    const margemLucroPercentual = dados.margemLucroPercentual || 20;
    return {
      id: row.id,
      dataCriacao: dados?.dataCriacao || row.created_at || new Date().toISOString(),
      dataAtualizacao: dados?.dataAtualizacao || new Date().toISOString(),
      status: row.status || dados?.status || 'em_elaboracao',
      dadosCliente: dados?.dadosCliente || {
        nomeCondominio: row.cliente || '',
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
}

export async function carregarOrcamentoDoBancoPorId(
  proposalId: string
): Promise<OrcamentoSalvo | null> {
  const orcamentos = await carregarOrcamentosDoBanco();
  return orcamentos.find((orcamento) => orcamento.id === proposalId) || null;
}

export async function atualizarStatusOrcamentoNoBanco(
  orcamento: OrcamentoSalvo,
  novoStatus: StatusOrcamentoKanban
): Promise<boolean> {
  const atualizado: OrcamentoSalvo = {
    ...orcamento,
    status: novoStatus,
    dataAtualizacao: new Date().toISOString(),
  };
  const payload = montarPayloadOrcamento(atualizado, 'updateStatus');

  const response = await fetch(apiUrl(API_ORCAMENTOS_PATH), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  await lerRespostaApi(response);
  return true;
}

export async function excluirOrcamentoDoBanco(id: string): Promise<boolean> {
  const proposalId = id.trim();
  if (!proposalId) {
    throw new Error('O ID da proposta é obrigatório para excluir o orçamento.');
  }

  const payload = {
    action: 'delete',
    id: proposalId,
    status: 'deleted',
  };

  const response = await fetch(apiUrl(API_ORCAMENTOS_PATH), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  await lerRespostaApi(response);
  return true;
}