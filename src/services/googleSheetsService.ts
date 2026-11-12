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
  MATERIAIS_PADRAO,
  PROFISSIONAIS_PADRAO,
  calcularOrcamento,
  formatarMoeda,
} from '../utils/budgetCalculator';
import {
  obterConfigEtapaKanban,
  carregarOrcamentosSalvos,
  salvarOrcamentosNoStorage,
} from '../utils/orcamentoKanbanUtils';

export const GOOGLE_SHEETS_API_URL =
  'https://script.google.com/macros/s/AKfycbwEJsdwH7Rrb3rhb1Ytd7IvyqHTQvpFcfmS5Yof6Zs7DXTBmsC4LPYAl3jP2SjN7krw2g/exec';

const DELETED_IDS_STORAGE_KEY = 'patologias_orcamentos_excluidos_v1';

function obterIdsExcluidosLocalmente(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function registrarIdExcluidoLocalmente(id: string): void {
  try {
    const set = obterIdsExcluidosLocalmente();
    set.add(id);
    localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignora falha de storage
  }
}

function removerIdExcluidoLocalmente(id: string): void {
  try {
    const set = obterIdsExcluidosLocalmente();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(DELETED_IDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {
    // Ignora falha de storage
  }
}

/**
 * Converte qualquer variação de texto ou código de fase/status vinda da planilha
 * para o tipo padronizado `StatusOrcamentoKanban`.
 */
export function normalizarStatusKanban(valorBruto: any): StatusOrcamentoKanban {
  if (!valorBruto || typeof valorBruto !== 'string') return 'em_elaboracao';
  const limpo = valorBruto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    limpo === 'enviado_sindico' ||
    limpo.includes('enviado') ||
    limpo.includes('sindico')
  ) {
    return 'enviado_sindico';
  }
  if (
    limpo === 'aguardando_aprovacao' ||
    limpo.includes('aguardando') ||
    limpo.includes('assembleia') ||
    limpo.includes('analise')
  ) {
    return 'aguardando_aprovacao';
  }
  if (limpo === 'aprovado' || limpo.includes('aprovad') || limpo.includes('aceit')) {
    return 'aprovado';
  }
  if (
    limpo === 'recusado' ||
    limpo.includes('recusad') ||
    limpo.includes('reprovad') ||
    limpo.includes('declinad') ||
    limpo.includes('cancelad')
  ) {
    return 'recusado';
  }
  return 'em_elaboracao';
}

/**
 * Converte valores monetários numéricos ou strings formatadas ("R$ 145.200,50") em número.
 */
function parseNumeroMonetario(val: any): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'string') {
    const limpo = val
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = Number(limpo);
    if (!Number.isNaN(num)) return num;
  }
  return 0;
}

/**
 * Remove strings base64 pesadas (>50k caracteres) antes de enviar para o Google Sheets
 * (o limite máximo de uma célula no Google Sheets é de 50.000 caracteres).
 */
export function compactarOrcamentoParaNuvem(orcamento: OrcamentoSalvo): OrcamentoSalvo {
  return {
    ...orcamento,
    selectedImage: null,
    registrosVistoria: (orcamento.registrosVistoria || []).map((reg) => ({
      ...reg,
      imagemUrl: '',
    })),
  };
}

/**
 * Monta o payload completo para envio via POST ao Google Apps Script Web App.
 * Inclui campos planos (compatíveis com colunas de planilha) e o objeto `detalhes` serializado.
 */
export function montarPayloadPlanilha(
  orcamento: OrcamentoSalvo,
  action: 'save' | 'updateStatus' | 'delete' = 'save'
) {
  const orcamentoCompacto = compactarOrcamentoParaNuvem(orcamento);
  const etapaConfig = obterConfigEtapaKanban(orcamento.status);
  const anomalias =
    orcamento.diagnostico?.anomalias || orcamento.diagnostico?.patologias || [];

  const resumoDetalhesTexto = [
    `Condomínio: ${orcamento.dadosCliente.nomeCondominio || 'Não informado'}`,
    `Síndico: ${orcamento.dadosCliente.nomeSindico || 'Não informado'}`,
    `Valor Global: ${formatarMoeda(orcamento.calculos.valorGlobal)}`,
    `Prazo: ${orcamento.calculos.mesesObra} meses`,
    `Patologias: ${anomalias.map((a) => a.nome_patologia).join('; ') || 'Nenhuma'}`,
  ].join(' | ');

  return {
    action,
    acao:
      action === 'save'
        ? 'salvar'
        : action === 'updateStatus'
          ? 'atualizar_status'
          : 'excluir',
    id: orcamento.id,
    orcamentoId: orcamento.id,
    dataCriacao: orcamento.dataCriacao,
    dataAtualizacao: orcamento.dataAtualizacao || new Date().toISOString(),
    data: new Date(orcamento.dataCriacao).toLocaleString('pt-BR'),
    status: orcamento.status,
    fase: etapaConfig.titulo,
    statusTitulo: etapaConfig.titulo,
    etapa: orcamento.status,
    cliente: orcamento.dadosCliente.nomeCondominio || 'Condomínio Não Informado',
    nomeCondominio: orcamento.dadosCliente.nomeCondominio || 'Condomínio Não Informado',
    condominio: orcamento.dadosCliente.nomeCondominio || 'Condomínio Não Informado',
    cnpj: orcamento.dadosCliente.cnpj || '',
    endereco: orcamento.dadosCliente.endereco || '',
    sindico: orcamento.dadosCliente.nomeSindico || '',
    nomeSindico: orcamento.dadosCliente.nomeSindico || '',
    telefone: orcamento.dadosCliente.telefone || '',
    email: orcamento.dadosCliente.email || '',
    anoConstrucao: orcamento.dadosCliente.anoConstrucao || '',
    pavimentos: orcamento.dadosCliente.pavimentos || '',
    valor: orcamento.calculos.valorGlobal,
    valorGlobal: orcamento.calculos.valorGlobal,
    valorFormatado: formatarMoeda(orcamento.calculos.valorGlobal),
    mesesObra: orcamento.calculos.mesesObra,
    margemLucroPercentual: orcamento.calculos.margemLucroPercentual,
    resumoDetalhes: resumoDetalhesTexto,
    detalhes: JSON.stringify(orcamentoCompacto),
    dadosCliente: orcamento.dadosCliente,
    calculos: orcamento.calculos,
    condicoesComerciais: orcamento.condicoesComerciais,
  };
}

/**
 * Converte uma linha/objeto retornado pelo GET da API do Google Sheets
 * em um objeto `OrcamentoSalvo` completo para o painel Kanban e histórico.
 */
export function normalizarLinhaPlanilhaParaOrcamento(
  row: any,
  index: number,
  cacheLocalMap?: Map<string, OrcamentoSalvo>
): OrcamentoSalvo | null {
  if (!row || typeof row !== 'object') return null;

  // Ignora linhas marcadas como excluídas na planilha
  const rawStatus =
    row.status ??
    row.Status ??
    row.STATUS ??
    row.fase ??
    row.Fase ??
    row.FASE ??
    row.etapa ??
    row.Etapa ??
    '';

  if (
    typeof rawStatus === 'string' &&
    (rawStatus.toLowerCase() === 'deleted' ||
      rawStatus.toLowerCase() === 'excluido' ||
      rawStatus.toLowerCase() === 'excluído')
  ) {
    return null;
  }

  // 1. Tenta extrair o snapshot JSON completo do campo `detalhes` / `json` / `payload`, se presente
  const rawDetalhes =
    row.detalhes ?? row.Detalhes ?? row.DETALHES ?? row.json ?? row.payload ?? null;
  let parsedDetalhes: Partial<OrcamentoSalvo> | null = null;

  if (typeof rawDetalhes === 'string' && rawDetalhes.trim().startsWith('{')) {
    try {
      parsedDetalhes = JSON.parse(rawDetalhes);
    } catch {
      parsedDetalhes = null;
    }
  } else if (rawDetalhes && typeof rawDetalhes === 'object') {
    parsedDetalhes = rawDetalhes;
  }

  const idExtraido = String(
    row.id ??
      row.ID ??
      row.Id ??
      row.orcamentoId ??
      row.codigo ??
      parsedDetalhes?.id ??
      `PROP-CLOUD-${index + 1}`
  ).trim();

  if (!idExtraido) return null;

  const itemLocal = cacheLocalMap?.get(idExtraido);

  // Status da linha da planilha tem prioridade (pois pode ter sido atualizado na planilha ou no Kanban)
  const statusNormalizado = rawStatus
    ? normalizarStatusKanban(rawStatus)
    : parsedDetalhes?.status
      ? normalizarStatusKanban(parsedDetalhes.status)
      : itemLocal?.status || 'em_elaboracao';

  const nomeCondominio = String(
    row.nomeCondominio ??
      row.condominio ??
      row.Condominio ??
      row['Condomínio'] ??
      row.cliente ??
      row.Cliente ??
      row.CLIENTE ??
      parsedDetalhes?.dadosCliente?.nomeCondominio ??
      itemLocal?.dadosCliente?.nomeCondominio ??
      ''
  ).trim();

  const nomeSindico = String(
    row.nomeSindico ??
      row.sindico ??
      row.Sindico ??
      row['Síndico'] ??
      parsedDetalhes?.dadosCliente?.nomeSindico ??
      itemLocal?.dadosCliente?.nomeSindico ??
      ''
  ).trim();

  const telefone = String(
    row.telefone ??
      row.Telefone ??
      row.TELEFONE ??
      row.celular ??
      parsedDetalhes?.dadosCliente?.telefone ??
      itemLocal?.dadosCliente?.telefone ??
      ''
  ).trim();

  const email = String(
    row.email ??
      row.Email ??
      row.EMAIL ??
      parsedDetalhes?.dadosCliente?.email ??
      itemLocal?.dadosCliente?.email ??
      ''
  ).trim();

  const cnpj = String(
    row.cnpj ??
      row.CNPJ ??
      parsedDetalhes?.dadosCliente?.cnpj ??
      itemLocal?.dadosCliente?.cnpj ??
      ''
  ).trim();

  const endereco = String(
    row.endereco ??
      row.Endereco ??
      row['Endereço'] ??
      parsedDetalhes?.dadosCliente?.endereco ??
      itemLocal?.dadosCliente?.endereco ??
      ''
  ).trim();

  const valorBruto =
    row.valorGlobal ??
    row.valor_global ??
    row.valor ??
    row.Valor ??
    row.VALOR ??
    parsedDetalhes?.calculos?.valorGlobal ??
    itemLocal?.calculos?.valorGlobal ??
    0;

  const valorGlobal = parseNumeroMonetario(valorBruto);

  // Ignora linhas totalmente vazias da planilha
  if (!nomeCondominio && !valorGlobal && !parsedDetalhes) {
    return null;
  }

  const dadosCliente: DadosCliente = {
    nomeCondominio: nomeCondominio || 'Condomínio',
    cnpj,
    endereco,
    nomeSindico,
    anoConstrucao: String(
      row.anoConstrucao ??
        parsedDetalhes?.dadosCliente?.anoConstrucao ??
        itemLocal?.dadosCliente?.anoConstrucao ??
        ''
    ),
    pavimentos: String(
      row.pavimentos ??
        parsedDetalhes?.dadosCliente?.pavimentos ??
        itemLocal?.dadosCliente?.pavimentos ??
        ''
    ),
    telefone,
    email,
  };

  const materiais: ItemMaterial[] =
    parsedDetalhes?.materiais || itemLocal?.materiais || MATERIAIS_PADRAO;
  const equipe: CargoProfissional[] =
    parsedDetalhes?.equipe || itemLocal?.equipe || PROFISSIONAIS_PADRAO;
  const mesesObra = Number(
    row.mesesObra ??
      row.prazo ??
      parsedDetalhes?.mesesObra ??
      parsedDetalhes?.calculos?.mesesObra ??
      itemLocal?.mesesObra ??
      4
  );
  const margemLucroPercentual = Number(
    row.margemLucroPercentual ??
      parsedDetalhes?.margemLucroPercentual ??
      parsedDetalhes?.calculos?.margemLucroPercentual ??
      itemLocal?.margemLucroPercentual ??
      20
  );

  const calculosBase =
    parsedDetalhes?.calculos ||
    itemLocal?.calculos ||
    calcularOrcamento(materiais, equipe, mesesObra, margemLucroPercentual);

  const calculos: CalculosOrcamento = {
    ...calculosBase,
    valorGlobal: valorGlobal > 0 ? valorGlobal : calculosBase.valorGlobal,
  };

  const condicoesComerciais: CondicoesComerciais = {
    ...CONDICOES_COMERCIAIS_PADRAO,
    ...(itemLocal?.condicoesComerciais || {}),
    ...(parsedDetalhes?.condicoesComerciais || {}),
  };

  const diagnostico: DiagnosticoResponse | null =
    parsedDetalhes?.diagnostico || itemLocal?.diagnostico || null;

  const dataCriacaoBruta =
    row.dataCriacao ??
    row.data_criacao ??
    row.data ??
    row.Data ??
    row.timestamp ??
    parsedDetalhes?.dataCriacao ??
    itemLocal?.dataCriacao;

  let dataCriacaoIso = new Date().toISOString();
  if (dataCriacaoBruta) {
    const parsedDate = new Date(dataCriacaoBruta);
    if (!Number.isNaN(parsedDate.getTime())) {
      dataCriacaoIso = parsedDate.toISOString();
    }
  }

  return {
    id: idExtraido,
    dataCriacao: dataCriacaoIso,
    dataAtualizacao:
      parsedDetalhes?.dataAtualizacao || itemLocal?.dataAtualizacao || dataCriacaoIso,
    status: statusNormalizado,
    dadosCliente,
    calculos,
    condicoesComerciais,
    materiais,
    equipe,
    mesesObra,
    margemLucroPercentual,
    diagnostico,
    // Restaura imagens do cache local se disponíveis para este ID
    registrosVistoria: itemLocal?.registrosVistoria || parsedDetalhes?.registrosVistoria || [],
    selectedImage: itemLocal?.selectedImage ?? parsedDetalhes?.selectedImage ?? null,
  };
}

/**
 * 1. SALVAR (POST): Envia o orçamento gerado no Passo 4 para a API do Google Sheets.
 * Usa `text/plain;charset=utf-8` na chamada direta do browser para evitar bloqueio de preflight CORS
 * no Google Apps Script, com fallback via backend `/api/sheets/orcamentos`.
 */
export async function salvarOrcamentoNaNuvem(orcamento: OrcamentoSalvo): Promise<boolean> {
  removerIdExcluidoLocalmente(orcamento.id);
  const payload = montarPayloadPlanilha(orcamento, 'save');

  try {
    const response = await fetch(GOOGLE_SHEETS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (response.ok) {
      return true;
    }
  } catch (directErr) {
    console.warn(
      '[Google Sheets] Tentando envio via proxy backend após erro direto no navegador:',
      directErr
    );
  }

  try {
    const proxyRes = await fetch('/api/sheets/orcamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return proxyRes.ok;
  } catch (proxyErr) {
    console.warn('[Google Sheets] Erro ao salvar orçamento na nuvem:', proxyErr);
    return false;
  }
}

/**
 * 2. CARREGAR (GET): Busca todos os orçamentos salvos na planilha do Google Sheets
 * e mescla com imagens locais se existirem.
 */
export async function carregarOrcamentosDaNuvem(): Promise<OrcamentoSalvo[]> {
  const cacheLocal = carregarOrcamentosSalvos();
  const cacheLocalMap = new Map<string, OrcamentoSalvo>(
    cacheLocal.map((item) => [item.id, item])
  );
  const excluidosLocal = obterIdsExcluidosLocalmente();

  let rawData: any = null;

  // Tentativa 1: GET direto na URL do Google Apps Script
  try {
    const urlComTimestamp = `${GOOGLE_SHEETS_API_URL}?t=${Date.now()}`;
    const response = await fetch(urlComTimestamp, {
      method: 'GET',
      redirect: 'follow',
    });

    if (response.ok) {
      const text = await response.text();
      if (text && text.trim()) {
        rawData = JSON.parse(text);
      }
    }
  } catch (directErr) {
    console.warn(
      '[Google Sheets] Tentando buscar dados via proxy backend após falha direta:',
      directErr
    );
  }

  // Tentativa 2: Fallback via servidor Express (/api/sheets/orcamentos)
  if (!rawData) {
    try {
      const proxyRes = await fetch('/api/sheets/orcamentos');
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        rawData = json?.data ?? json;
      }
    } catch (proxyErr) {
      console.warn('[Google Sheets] Falha ao buscar via proxy backend:', proxyErr);
    }
  }

  if (!rawData) {
    return cacheLocal.filter((o) => !excluidosLocal.has(o.id));
  }

  const listaBruta: any[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.data)
      ? rawData.data
      : Array.isArray(rawData?.orcamentos)
        ? rawData.orcamentos
        : Array.isArray(rawData?.items)
          ? rawData.items
          : Array.isArray(rawData?.rows)
            ? rawData.rows
            : Array.isArray(rawData?.result)
              ? rawData.result
              : [];

  // Processa na ordem reversa para que registros mais recentes na planilha prevaleçam em caso de mesmo ID
  const mapaUnico = new Map<string, OrcamentoSalvo>();
  for (let i = 0; i < listaBruta.length; i++) {
    const normalizado = normalizarLinhaPlanilhaParaOrcamento(
      listaBruta[i],
      i,
      cacheLocalMap
    );
    if (normalizado && !excluidosLocal.has(normalizado.id)) {
      mapaUnico.set(normalizado.id, normalizado);
    }
  }

  const listaNuvem = Array.from(mapaUnico.values()).sort(
    (a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
  );

  // Atualiza cache local de segurança
  if (listaNuvem.length > 0) {
    salvarOrcamentosNoStorage(listaNuvem);
    return listaNuvem;
  }

  return cacheLocal.filter((o) => !excluidosLocal.has(o.id));
}

/**
 * 3. ATUALIZAR STATUS / FASE (POST): Atualiza o estágio Kanban do orçamento na planilha.
 */
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
    const url = `${GOOGLE_SHEETS_API_URL}?action=updateStatus&id=${encodeURIComponent(orcamento.id)}&status=${encodeURIComponent(novoStatus)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    if (response.ok) return true;
  } catch (err) {
    console.warn('[Google Sheets] Fallback backend ao atualizar status:', err);
  }

  try {
    const proxyRes = await fetch('/api/sheets/orcamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return proxyRes.ok;
  } catch {
    return false;
  }
}

/**
 * 4. EXCLUIR ORÇAMENTO (POST): Solicita a exclusão do orçamento na planilha do Google Sheets.
 */
export async function excluirOrcamentoNaNuvem(id: string): Promise<boolean> {
  registrarIdExcluidoLocalmente(id);
  const payload = {
    action: 'delete',
    acao: 'excluir',
    method: 'DELETE',
    id,
    orcamentoId: id,
    status: 'deleted',
  };

  try {
    const url = `${GOOGLE_SHEETS_API_URL}?action=delete&id=${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    if (response.ok) return true;
  } catch (err) {
    console.warn('[Google Sheets] Fallback backend ao excluir orçamento:', err);
  }

  try {
    const proxyRes = await fetch('/api/sheets/orcamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return proxyRes.ok;
  } catch {
    return false;
  }
}
