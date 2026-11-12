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
  (typeof import.meta !== 'undefined' &&
    (import.meta as any)?.env?.VITE_GOOGLE_SHEETS_API_URL) ||
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
    // Ignora falha de storage em aba anônima restrita
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
    // Ignora falha de storage em aba anônima restrita
  }
}

/**
 * Normaliza chaves de colunas da planilha (remove acentos, espaços, símbolos e converte para minúsculas)
 * para busca insensível a formatação de cabeçalhos no Google Sheets.
 */
function normalizarChaveColuna(chave: string): string {
  return String(chave || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Busca um valor em um objeto de linha da planilha testando múltiplos nomes de colunas possíveis.
 */
function obterCampoFlexivel(row: Record<string, any>, candidatos: string[]): any {
  if (!row || typeof row !== 'object') return undefined;

  for (const cand of candidatos) {
    if (row[cand] !== undefined && row[cand] !== null && row[cand] !== '') {
      return row[cand];
    }
  }

  const alvosNormalizados = new Set(candidatos.map(normalizarChaveColuna));
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined && v !== null && v !== '' && alvosNormalizados.has(normalizarChaveColuna(k))) {
      return v;
    }
  }

  return undefined;
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
 * Converte valores monetários numéricos ou strings formatadas ("R$ 145.200,50" ou "145200.50") em número.
 */
function parseNumeroMonetario(val: any): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    // Se contiver vírgula decimal (formato BR "R$ 145.200,50")
    if (trimmed.includes(',')) {
      const limpo = trimmed
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const num = Number(limpo);
      if (!Number.isNaN(num)) return num;
    } else {
      const limpo = trimmed.replace(/[R$\s]/g, '');
      const num = Number(limpo);
      if (!Number.isNaN(num)) return num;
    }
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
 * Inclui campos planos em todos os formatos usuais de cabeçalho de planilha (camelCase, Português com/sem acento, MAIÚSCULAS),
 * um array `row` / `values` posicional e o objeto `detalhes` serializado em JSON.
 */
export function montarPayloadPlanilha(
  orcamento: OrcamentoSalvo,
  action: 'save' | 'updateStatus' | 'delete' = 'save',
  etapaFormulario?: number
) {
  const orcamentoCompacto = compactarOrcamentoParaNuvem(orcamento);
  const etapaConfig = obterConfigEtapaKanban(orcamento.status);
  const anomalias =
    orcamento.diagnostico?.anomalias || orcamento.diagnostico?.patologias || [];

  const nomeCondominio = orcamento.dadosCliente.nomeCondominio || 'Condomínio em Cadastro';
  const nomeSindico = orcamento.dadosCliente.nomeSindico || '';
  const telefone = orcamento.dadosCliente.telefone || '';
  const email = orcamento.dadosCliente.email || '';
  const cnpj = orcamento.dadosCliente.cnpj || '';
  const endereco = orcamento.dadosCliente.endereco || '';
  const anoConstrucao = orcamento.dadosCliente.anoConstrucao || '';
  const pavimentos = orcamento.dadosCliente.pavimentos || '';
  const valorGlobal = orcamento.calculos.valorGlobal;
  const valorFormatado = formatarMoeda(valorGlobal);
  const dataFormatada = new Date(orcamento.dataCriacao).toLocaleString('pt-BR');
  const detalhesJson = JSON.stringify(orcamentoCompacto);

  const resumoDetalhesTexto = [
    `Condomínio: ${nomeCondominio}`,
    `Síndico: ${nomeSindico || 'Não informado'}`,
    `Valor Global: ${valorFormatado}`,
    `Prazo: ${orcamento.calculos.mesesObra} meses`,
    `Patologias: ${anomalias.map((a) => a.nome_patologia).join('; ') || 'Em diagnóstico'}`,
  ].join(' | ');

  return {
    action,
    acao:
      action === 'save'
        ? 'salvar'
        : action === 'updateStatus'
          ? 'atualizar_status'
          : 'excluir',
    sheet: 'Orcamentos',
    aba: 'Orcamentos',
    sheetName: 'Orcamentos',
    etapaFormulario: etapaFormulario || 4,
    id: orcamento.id,
    ID: orcamento.id,
    Id: orcamento.id,
    orcamentoId: orcamento.id,
    codigo: orcamento.id,
    Codigo: orcamento.id,
    'Código': orcamento.id,
    dataCriacao: orcamento.dataCriacao,
    dataAtualizacao: orcamento.dataAtualizacao || new Date().toISOString(),
    data: dataFormatada,
    Data: dataFormatada,
    DATA: dataFormatada,
    Timestamp: dataFormatada,
    status: orcamento.status,
    Status: etapaConfig.titulo,
    STATUS: orcamento.status,
    fase: etapaConfig.titulo,
    Fase: etapaConfig.titulo,
    FASE: etapaConfig.titulo,
    statusTitulo: etapaConfig.titulo,
    etapa: orcamento.status,
    Etapa: etapaConfig.titulo,
    cliente: nomeCondominio,
    Cliente: nomeCondominio,
    CLIENTE: nomeCondominio,
    nomeCondominio,
    condominio: nomeCondominio,
    Condominio: nomeCondominio,
    'Condomínio': nomeCondominio,
    'Nome do Condomínio': nomeCondominio,
    cnpj,
    CNPJ: cnpj,
    endereco,
    Endereco: endereco,
    'Endereço': endereco,
    sindico: nomeSindico,
    Sindico: nomeSindico,
    'Síndico': nomeSindico,
    nomeSindico,
    'Nome do Síndico': nomeSindico,
    telefone,
    Telefone: telefone,
    TELEFONE: telefone,
    WhatsApp: telefone,
    email,
    Email: email,
    'E-mail': email,
    anoConstrucao,
    'Ano de Construção': anoConstrucao,
    pavimentos,
    Pavimentos: pavimentos,
    valor: valorGlobal,
    Valor: valorGlobal,
    VALOR: valorGlobal,
    valorGlobal,
    'Valor Global': valorFormatado,
    valorFormatado,
    mesesObra: orcamento.calculos.mesesObra,
    Prazo: `${orcamento.calculos.mesesObra} meses`,
    margemLucroPercentual: orcamento.calculos.margemLucroPercentual,
    resumoDetalhes: resumoDetalhesTexto,
    detalhes: detalhesJson,
    Detalhes: detalhesJson,
    DETALHES: detalhesJson,
    json: detalhesJson,
    JSON: detalhesJson,
    dadosCliente: orcamento.dadosCliente,
    calculos: orcamento.calculos,
    condicoesComerciais: orcamento.condicoesComerciais,
    row: [
      orcamento.id,
      dataFormatada,
      nomeCondominio,
      cnpj,
      endereco,
      nomeSindico,
      telefone,
      email,
      valorGlobal,
      etapaConfig.titulo,
      detalhesJson,
    ],
  };
}

/**
 * Converte uma matriz 2D (ex: retorno de `sheet.getDataRange().getValues()` ou `values` da API Google Sheets)
 * em uma lista de objetos indexados pelo cabeçalho ou pelas células.
 */
function converterLinhasBrutasPlanilha(listaBruta: any[]): any[] {
  if (!Array.isArray(listaBruta) || listaBruta.length === 0) return [];

  // Se os elementos não forem arrays, já são objetos de linha
  if (!Array.isArray(listaBruta[0])) {
    return listaBruta;
  }

  const primeiraLinha = listaBruta[0] as any[];
  const palavrasCabecalho = new Set([
    'id',
    'codigo',
    'proposta',
    'orcamentoid',
    'data',
    'datacriacao',
    'timestamp',
    'cliente',
    'condominio',
    'nomedocondominio',
    'nomecondominio',
    'sindico',
    'nomesindico',
    'telefone',
    'whatsapp',
    'email',
    'cnpj',
    'endereco',
    'valor',
    'valorglobal',
    'valortotal',
    'status',
    'fase',
    'etapa',
    'detalhes',
    'json',
    'dados',
  ]);

  const pareceCabecalho = primeiraLinha.some(
    (cell) =>
      typeof cell === 'string' &&
      palavrasCabecalho.has(normalizarChaveColuna(cell)) &&
      !cell.trim().startsWith('{') &&
      !cell.trim().startsWith('PROP-')
  );

  if (pareceCabecalho) {
    const cabecalhos = primeiraLinha.map((cell, idx) =>
      String(cell || `col_${idx}`).trim()
    );
    return listaBruta.slice(1).map((linha) => {
      if (!Array.isArray(linha)) return linha;
      const obj: Record<string, any> = { _rawCells: linha };
      cabecalhos.forEach((h, idx) => {
        obj[h] = linha[idx];
      });
      return obj;
    });
  }

  return listaBruta.map((linha) =>
    Array.isArray(linha) ? { _rawCells: linha } : linha
  );
}

/**
 * Procura em todas as propriedades ou células da linha se alguma contém o JSON serializado
 * completo do `OrcamentoSalvo`.
 */
function extrairSnapshotJsonDaLinha(row: any): Partial<OrcamentoSalvo> | null {
  const tentarParsear = (val: any): Partial<OrcamentoSalvo> | null => {
    if (!val) return null;
    if (typeof val === 'object' && !Array.isArray(val)) {
      if (val.dadosCliente || val.calculos || (val.id && String(val.id).startsWith('PROP-'))) {
        return val as Partial<OrcamentoSalvo>;
      }
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        } catch {
          return null;
        }
      }
    }
    return null;
  };

  const campoDireto = obterCampoFlexivel(row, [
    'detalhes',
    'json',
    'payload',
    'dados',
    'orcamento',
    'snapshot',
  ]);
  const direto = tentarParsear(campoDireto);
  if (direto) return direto;

  if (Array.isArray(row._rawCells)) {
    for (const cell of row._rawCells) {
      const p = tentarParsear(cell);
      if (p) return p;
    }
  }

  for (const val of Object.values(row)) {
    const p = tentarParsear(val);
    if (p) return p;
  }

  return null;
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

  const parsedDetalhes = extrairSnapshotJsonDaLinha(row);
  const rawCells: any[] = Array.isArray(row._rawCells) ? row._rawCells : [];

  // Ignora linhas marcadas como excluídas na planilha
  const rawStatus =
    obterCampoFlexivel(row, [
      'status',
      'fase',
      'etapa',
      'statusTitulo',
      'situacao',
      'estagio',
    ]) ?? '';

  if (
    typeof rawStatus === 'string' &&
    (rawStatus.toLowerCase() === 'deleted' ||
      rawStatus.toLowerCase() === 'excluido' ||
      rawStatus.toLowerCase() === 'excluído')
  ) {
    return null;
  }

  let idCandidato =
    obterCampoFlexivel(row, [
      'id',
      'orcamentoId',
      'codigo',
      'proposta',
      'numeroProposta',
    ]) ?? parsedDetalhes?.id;

  if (!idCandidato && rawCells.length > 0) {
    const cellProp = rawCells.find(
      (c) => typeof c === 'string' && c.trim().toUpperCase().startsWith('PROP-')
    );
    if (cellProp) idCandidato = cellProp.trim();
  }

  const idExtraido = String(idCandidato || `PROP-CLOUD-${index + 1}`).trim();
  if (!idExtraido) return null;

  const itemLocal = cacheLocalMap?.get(idExtraido);

  // Status da linha da planilha tem prioridade (pois pode ter sido atualizado na planilha ou no Kanban)
  const statusNormalizado = rawStatus
    ? normalizarStatusKanban(rawStatus)
    : parsedDetalhes?.status
      ? normalizarStatusKanban(parsedDetalhes.status)
      : itemLocal?.status || 'em_elaboracao';

  const nomeCondominio = String(
    obterCampoFlexivel(row, [
      'nomeCondominio',
      'condominio',
      'cliente',
      'nomeDoCondominio',
      'edificio',
      'nomeEdificio',
    ]) ??
      parsedDetalhes?.dadosCliente?.nomeCondominio ??
      itemLocal?.dadosCliente?.nomeCondominio ??
      (rawCells.length > 2 && typeof rawCells[2] === 'string' ? rawCells[2] : '') ??
      ''
  ).trim();

  const nomeSindico = String(
    obterCampoFlexivel(row, [
      'nomeSindico',
      'sindico',
      'nomeDoSindico',
      'gestor',
      'responsavel',
    ]) ??
      parsedDetalhes?.dadosCliente?.nomeSindico ??
      itemLocal?.dadosCliente?.nomeSindico ??
      ''
  ).trim();

  const telefone = String(
    obterCampoFlexivel(row, [
      'telefone',
      'celular',
      'whatsapp',
      'fone',
      'contato',
    ]) ??
      parsedDetalhes?.dadosCliente?.telefone ??
      itemLocal?.dadosCliente?.telefone ??
      ''
  ).trim();

  const email = String(
    obterCampoFlexivel(row, ['email', 'e-mail', 'correio']) ??
      parsedDetalhes?.dadosCliente?.email ??
      itemLocal?.dadosCliente?.email ??
      ''
  ).trim();

  const cnpj = String(
    obterCampoFlexivel(row, ['cnpj', 'documento']) ??
      parsedDetalhes?.dadosCliente?.cnpj ??
      itemLocal?.dadosCliente?.cnpj ??
      ''
  ).trim();

  const endereco = String(
    obterCampoFlexivel(row, ['endereco', 'localizacao', 'logradouro', 'enderecoObra']) ??
      parsedDetalhes?.dadosCliente?.endereco ??
      itemLocal?.dadosCliente?.endereco ??
      ''
  ).trim();

  const valorBruto =
    obterCampoFlexivel(row, [
      'valorGlobal',
      'valor_global',
      'valor',
      'valorTotal',
      'valorFormatado',
      'preco',
      'total',
    ]) ??
    parsedDetalhes?.calculos?.valorGlobal ??
    itemLocal?.calculos?.valorGlobal ??
    0;

  const valorGlobal = parseNumeroMonetario(valorBruto);

  // Ignora linhas totalmente vazias ou de cabeçalho da planilha
  if (
    (!nomeCondominio && !valorGlobal && !parsedDetalhes) ||
    normalizarChaveColuna(nomeCondominio) === 'cliente' ||
    normalizarChaveColuna(nomeCondominio) === 'condominio' ||
    normalizarChaveColuna(idExtraido) === 'id'
  ) {
    return null;
  }

  const dadosCliente: DadosCliente = {
    nomeCondominio: nomeCondominio || 'Condomínio',
    cnpj,
    endereco,
    nomeSindico,
    anoConstrucao: String(
      obterCampoFlexivel(row, ['anoConstrucao', 'idade', 'ano']) ??
        parsedDetalhes?.dadosCliente?.anoConstrucao ??
        itemLocal?.dadosCliente?.anoConstrucao ??
        ''
    ),
    pavimentos: String(
      obterCampoFlexivel(row, ['pavimentos', 'andares', 'numeroDePavimentos']) ??
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
  const mesesObra =
    Number(
      obterCampoFlexivel(row, ['mesesObra', 'prazo', 'meses']) ??
        parsedDetalhes?.mesesObra ??
        parsedDetalhes?.calculos?.mesesObra ??
        itemLocal?.mesesObra ??
        4
    ) || 4;
  const margemLucroPercentual =
    Number(
      obterCampoFlexivel(row, ['margemLucroPercentual', 'margemLucro', 'lucro']) ??
        parsedDetalhes?.margemLucroPercentual ??
        parsedDetalhes?.calculos?.margemLucroPercentual ??
        itemLocal?.margemLucroPercentual ??
        20
    ) || 20;

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
    ...(row.condicoesComerciais && typeof row.condicoesComerciais === 'object'
      ? row.condicoesComerciais
      : {}),
  };

  const diagnostico: DiagnosticoResponse | null =
    parsedDetalhes?.diagnostico || itemLocal?.diagnostico || null;

  const dataCriacaoBruta =
    obterCampoFlexivel(row, ['dataCriacao', 'data_criacao', 'data', 'timestamp']) ??
    parsedDetalhes?.dataCriacao ??
    itemLocal?.dataCriacao;

  let dataCriacaoIso = new Date().toISOString();
  if (dataCriacaoBruta) {
    const parsedDate = new Date(dataCriacaoBruta);
    if (!Number.isNaN(parsedDate.getTime())) {
      dataCriacaoIso = parsedDate.toISOString();
    }
  }

  const dataAtualizacaoBruta =
    obterCampoFlexivel(row, ['dataAtualizacao', 'updatedAt']) ??
    parsedDetalhes?.dataAtualizacao ??
    itemLocal?.dataAtualizacao ??
    dataCriacaoIso;

  let dataAtualizacaoIso = dataCriacaoIso;
  if (dataAtualizacaoBruta) {
    const parsedUpd = new Date(dataAtualizacaoBruta);
    if (!Number.isNaN(parsedUpd.getTime())) {
      dataAtualizacaoIso = parsedUpd.toISOString();
    }
  }

  return {
    id: idExtraido,
    dataCriacao: dataCriacaoIso,
    dataAtualizacao: dataAtualizacaoIso,
    status: statusNormalizado,
    dadosCliente,
    calculos,
    condicoesComerciais,
    materiais,
    equipe,
    mesesObra,
    margemLucroPercentual,
    diagnostico,
    registrosVistoria: itemLocal?.registrosVistoria || parsedDetalhes?.registrosVistoria || [],
    selectedImage: itemLocal?.selectedImage ?? parsedDetalhes?.selectedImage ?? null,
  };
}

/**
 * Monta URL da planilha Google Sheets com query parameters principais para compatibilidade
 * com Google Apps Scripts que leem `e.parameter` além de `e.postData.contents`.
 */
function montarUrlComQueryParamsPlanilha(payload: Record<string, any>): string {
  const params = new URLSearchParams();
  if (payload.action) params.set('action', String(payload.action));
  if (payload.acao) params.set('acao', String(payload.acao));
  if (payload.sheet) params.set('sheet', String(payload.sheet));
  if (payload.id) params.set('id', String(payload.id));
  if (payload.status) params.set('status', String(payload.status));
  if (payload.fase) params.set('fase', String(payload.fase));
  if (payload.cliente) params.set('cliente', String(payload.cliente));
  if (payload.sindico) params.set('sindico', String(payload.sindico));
  if (payload.telefone) params.set('telefone', String(payload.telefone));
  if (payload.email) params.set('email', String(payload.email));
  if (payload.cnpj) params.set('cnpj', String(payload.cnpj));
  if (payload.valor !== undefined) params.set('valor', String(payload.valor));
  return `${GOOGLE_SHEETS_API_URL}?${params.toString()}`;
}

/**
 * 1. SALVAR (POST): Envia o orçamento ou avanço de etapa para a planilha do Google Sheets
 * e para o endpoint sincronizado `/api/sheets/orcamentos`.
 */
export async function salvarOrcamentoNaNuvem(
  orcamento: OrcamentoSalvo,
  etapaFormulario?: number
): Promise<boolean> {
  removerIdExcluidoLocalmente(orcamento.id);
  const payload = montarPayloadPlanilha(orcamento, 'save', etapaFormulario);

  // Caminho 1 (Preferencial): Envia via servidor `/api/sheets/orcamentos`, que grava no espelho em nuvem
  // e encaminha o POST ao Google Sheets sem bloqueios de CORS do navegador
  try {
    const proxyRes = await fetch('/api/sheets/orcamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (proxyRes.ok) {
      return true;
    }
  } catch (proxyErr) {
    console.warn(
      '[Google Sheets] Endpoint /api/sheets/orcamentos indisponível, enviando diretamente ao Google Apps Script:',
      proxyErr
    );
  }

  // Caminho 2 (Fallback Direto Browser -> Google Apps Script):
  try {
    const targetUrl = montarUrlComQueryParamsPlanilha(payload);
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    return response.ok;
  } catch (directErr) {
    console.warn('[Google Sheets] Erro ao salvar orçamento diretamente na nuvem:', directErr);
    return false;
  }
}

/**
 * Extrai a lista de linhas de qualquer formato de resposta JSON do Google Sheets.
 */
function extrairListaBrutaDeResposta(rawData: any): any[] {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;
  if (Array.isArray(rawData.data)) return rawData.data;
  if (Array.isArray(rawData.values)) return rawData.values;
  if (Array.isArray(rawData.orcamentos)) return rawData.orcamentos;
  if (Array.isArray(rawData.items)) return rawData.items;
  if (Array.isArray(rawData.rows)) return rawData.rows;
  if (Array.isArray(rawData.result)) return rawData.result;
  if (Array.isArray(rawData.records)) return rawData.records;
  return [];
}

/**
 * 2. CARREGAR (GET): Busca todos os orçamentos diretamente da planilha do Google Sheets na nuvem
 * (e do espelho sincronizado do servidor), garantindo acesso universal em abas anônimas e outros dispositivos.
 */
export async function carregarOrcamentosDaNuvem(): Promise<OrcamentoSalvo[]> {
  const cacheLocal = carregarOrcamentosSalvos();
  const cacheLocalMap = new Map<string, OrcamentoSalvo>(
    cacheLocal.map((item) => [item.id, item])
  );
  const excluidosSet = obterIdsExcluidosLocalmente();

  let linhasPlanilhaBrutas: any[] = [];
  let itensEspelhoServidor: any[] = [];
  let conectouComSucesso = false;

  // 1. Consulta o endpoint unificado `/api/sheets/orcamentos` (que busca no Google Sheets + espelho do servidor)
  try {
    const proxyRes = await fetch(`/api/sheets/orcamentos?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      conectouComSucesso = true;
      linhasPlanilhaBrutas = extrairListaBrutaDeResposta(json);
      if (Array.isArray(json?.serverItems)) {
        itensEspelhoServidor = json.serverItems;
      }
      if (Array.isArray(json?.deletedIds)) {
        json.deletedIds.forEach((id: string) => excluidosSet.add(String(id)));
      }
    }
  } catch (proxyErr) {
    console.warn('[Google Sheets] Buscando diretamente da URL do Google Apps Script:', proxyErr);
  }

  // 2. Se o servidor não retornou linhas da planilha (ou em ambiente puramente estático), consulta direto a URL do Google Sheets
  if (linhasPlanilhaBrutas.length === 0) {
    try {
      const urlComTimestamp = `${GOOGLE_SHEETS_API_URL}?action=list&t=${Date.now()}`;
      const response = await fetch(urlComTimestamp, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
      });

      if (response.ok) {
        const text = await response.text();
        if (text && text.trim()) {
          const parsed = JSON.parse(text);
          conectouComSucesso = true;
          linhasPlanilhaBrutas = extrairListaBrutaDeResposta(parsed);
        }
      }
    } catch (directErr) {
      console.warn('[Google Sheets] Aviso ao consultar planilha diretamente:', directErr);
    }
  }

  const mapaUnico = new Map<string, OrcamentoSalvo>();

  // 3. Processa as linhas vindas da planilha Google Sheets (suporta tanto objetos quanto arrays 2D)
  const linhasConvertidas = converterLinhasBrutasPlanilha(linhasPlanilhaBrutas);
  for (let i = 0; i < linhasConvertidas.length; i++) {
    const normalizado = normalizarLinhaPlanilhaParaOrcamento(
      linhasConvertidas[i],
      i,
      cacheLocalMap
    );
    if (normalizado && !excluidosSet.has(normalizado.id)) {
      mapaUnico.set(normalizado.id, normalizado);
    }
  }

  // 4. Mescla com os itens sincronizados no servidor (garante sincronização em tempo real mesmo se o Google Apps Script tiver delay)
  for (let i = 0; i < itensEspelhoServidor.length; i++) {
    const normalizadoServidor = normalizarLinhaPlanilhaParaOrcamento(
      itensEspelhoServidor[i],
      i,
      cacheLocalMap
    );
    if (normalizadoServidor && !excluidosSet.has(normalizadoServidor.id)) {
      const existenteNaPlanilha = mapaUnico.get(normalizadoServidor.id);
      if (!existenteNaPlanilha) {
        mapaUnico.set(normalizadoServidor.id, normalizadoServidor);
      } else {
        const tServidor = new Date(normalizadoServidor.dataAtualizacao || normalizadoServidor.dataCriacao).getTime();
        const tPlanilha = new Date(existenteNaPlanilha.dataAtualizacao || existenteNaPlanilha.dataCriacao).getTime();
        if (tServidor >= tPlanilha) {
          mapaUnico.set(normalizadoServidor.id, normalizadoServidor);
        }
      }
    }
  }

  const listaNuvem = Array.from(mapaUnico.values()).sort(
    (a, b) =>
      new Date(b.dataAtualizacao || b.dataCriacao).getTime() -
      new Date(a.dataAtualizacao || a.dataCriacao).getTime()
  );

  if (listaNuvem.length > 0) {
    salvarOrcamentosNoStorage(listaNuvem);
    return listaNuvem;
  }

  // Se houver registros locais ainda não sincronizados (ex: criados antes da conexão), envia-os para a nuvem
  const locaisValidos = cacheLocal.filter((o) => !excluidosSet.has(o.id));
  if (conectouComSucesso && locaisValidos.length > 0) {
    locaisValidos.forEach((orcLocal) => {
      void salvarOrcamentoNaNuvem(orcLocal);
    });
  }

  return locaisValidos;
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
    const proxyRes = await fetch('/api/sheets/orcamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (proxyRes.ok) return true;
  } catch (err) {
    console.warn('[Google Sheets] Fallback direto ao atualizar status:', err);
  }

  try {
    const url = montarUrlComQueryParamsPlanilha(payload);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    return response.ok;
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
    sheet: 'Orcamentos',
    aba: 'Orcamentos',
    id,
    ID: id,
    orcamentoId: id,
    status: 'deleted',
    Status: 'deleted',
    fase: 'deleted',
  };

  try {
    const proxyRes = await fetch('/api/sheets/orcamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (proxyRes.ok) return true;
  } catch (err) {
    console.warn('[Google Sheets] Fallback direto ao excluir orçamento:', err);
  }

  try {
    const url = `${GOOGLE_SHEETS_API_URL}?action=delete&acao=excluir&id=${encodeURIComponent(id)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    return response.ok;
  } catch {
    return false;
  }
}
