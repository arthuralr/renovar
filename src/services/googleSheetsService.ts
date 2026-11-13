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
} from '../utils/orcamentoKanbanUtils';

export const GOOGLE_SHEETS_API_URL = '';

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
    action,
    id: orcamento.id,
    cliente: orcamento.dadosCliente.nomeCondominio || 'Cliente',
    status: orcamento.status,
    ...orcamentoCompacto,
  };
}

export async function salvarOrcamentoNaNuvem(
  orcamento: OrcamentoSalvo,
  etapaFormulario?: number
): Promise<boolean> {
  if (!orcamento.dadosCliente.nomeCondominio.trim()) {
    throw new Error('Informe o nome do condomínio antes de salvar o orçamento.');
  }

  const payload = montarPayloadPlanilha(orcamento, 'save', etapaFormulario);

  const response = await fetch('/api/sheets/orcamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Erro ao salvar o orçamento no banco de dados.');
  }

  return true;
}

export async function carregarOrcamentosDaNuvem(): Promise<OrcamentoSalvo[]> {
  const response = await fetch(`/api/sheets/orcamentos?t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });

  if (!response.ok) {
    throw new Error('Não foi possível carregar os orçamentos do banco de dados.');
  }

  const json = await response.json();
  const rows = json.data || json.serverItems || [];

  const lista: OrcamentoSalvo[] = rows.map((row: any) => {
    let dados = row.dados;
    if (typeof dados === 'string') {
      try {
        dados = JSON.parse(dados);
      } catch {
        dados = {};
      }
    }
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
      calculos: dados?.calculos || { valorGlobal: 0, mesesObra: 4, margemLucroPercentual: 20 },
      condicoesComerciais: dados?.condicoesComerciais || CONDICOES_COMERCIAIS_PADRAO,
      materiais: dados?.materiais || [],
      equipe: dados?.equipe || [],
      mesesObra: dados?.mesesObra || 4,
      margemLucroPercentual: dados?.margemLucroPercentual || 20,
      diagnostico: dados?.diagnostico || null,
      registrosVistoria: dados?.registrosVistoria || [],
      selectedImage: null,
    };
  });

  salvarOrcamentosNoStorage(lista);
  return lista;
}

export async function carregarOrcamentoDaNuvemPorId(
  proposalId: string
): Promise<OrcamentoSalvo | null> {
  const orcamentos = await carregarOrcamentosDaNuvem();
  return orcamentos.find((orcamento) => orcamento.id === proposalId) || null;
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

  const response = await fetch('/api/sheets/orcamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.ok;
}

export async function excluirOrcamentoNaNuvem(id: string): Promise<boolean> {
  const proposalId = id.trim();
  if (!proposalId) {
    throw new Error('O ID da proposta é obrigatório para excluir o orçamento.');
  }

  const payload = {
    action: 'delete',
    id: proposalId,
    status: 'deleted',
  };

  const response = await fetch('/api/sheets/orcamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Não foi possível excluir o orçamento do banco de dados.');
  }

  return true;
}