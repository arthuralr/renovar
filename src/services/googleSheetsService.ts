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

async function respostaSheetsConfirmouGravacao(response: Response): Promise<boolean> {
  if (!response.ok) return false;

  const text = await response.clone().text();
  if (!text.trim()) return true;
  if (/<(?:!doctype|html|head|body)\b/i.test(text)) return false;

  try {
    const body = JSON.parse(text);
    return body?.ok !== false && body?.success !== false && !body?.error;
  } catch {
    return true;
  }
}

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
 * Retorna a primeira string não vazia dentre os candidatos passados.
 * Evita que strings vazias ("") retornadas por células em branco do Google Sheets bloqueiem fallbacks.
 */
function primeiroTextoNaoVazio(...valores: any[]): string {
  for (const v of valores) {
    if (v !== undefined && v !== null && typeof v !== 'object') {
      const s = String(v).trim();
      if (s !== '' && s !== 'undefined' && s !== 'null') {
        return s;
      }
    }
  }
  return '';
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
 * Busca um valor não vazio em um objeto de linha da planilha testando múltiplos nomes de colunas possíveis.
 */
function obterCampoFlexivel(row: Record<string, any>, candidatos: string[]): any {
  if (!row || typeof row !== 'object') return undefined;

  for (const cand of candidatos) {
    const val = row[cand];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return val;
    }
  }

  const alvosNormalizados = new Set(candidatos.map(normalizarChaveColuna));
  for (const [k, v] of Object.entries(row)) {
    if (k === '_rawCells') continue;
    if (
      v !== undefined &&
      v !== null &&
      String(v).trim() !== '' &&
      alvosNormalizados.has(normalizarChaveColuna(k))
    ) {
      return v;
    }
  }

  return undefined;
}

/**
 * Verifica se uma string corresponde explicitamente a um status/etapa do Kanban.
 */
function pareceStatusKanbanExplicito(valorBruto: any): boolean {
  if (!valorBruto || typeof valorBruto !== 'string') return false;
  const limpo = valorBruto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return (
    limpo === 'em_elaboracao' ||
    limpo === 'em elaboracao' ||
    limpo === 'enviado_sindico' ||
    limpo === 'enviado ao sindico' ||
    limpo === 'aguardando_aprovacao' ||
    limpo === 'aguardando aprovacao' ||
    limpo === 'aprovado' ||
    limpo === 'recusado'
  );
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
    // Ignora códigos PROP- ou datas ou telefones
    if (
      /^PROP-/i.test(trimmed) ||
      /^\d{2}\/\d{2}\/\d{4}/.test(trimmed) ||
      /^\d{4}-\d{2}-\d{2}/.test(trimmed) ||
      /^\(\d{2}\)/.test(trimmed) ||
      /^\d{2}\.\d{3}\.\d{3}\//.test(trimmed)
    ) {
      return 0;
    }
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

function primeiroNumeroPositivo(...valores: any[]): number {
  for (const v of valores) {
    const n = parseNumeroMonetario(v);
    if (n > 0) return n;
  }
  return 0;
}

/**
 * Faz o parse de datas vindas do Google Sheets (ISO 8601, Date serial ou formato brasileiro DD/MM/YYYY HH:mm:ss).
 */
function parseDataPlanilhaIso(valorBruto: any): string | null {
  if (!valorBruto) return null;
  if (valorBruto instanceof Date && !Number.isNaN(valorBruto.getTime())) {
    return valorBruto.toISOString();
  }
  const str = String(valorBruto).trim();
  if (!str) return null;

  // Formato brasileiro: DD/MM/YYYY ou DD/MM/YYYY, HH:mm:ss
  const matchBr = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/
  );
  if (matchBr) {
    const dia = Number(matchBr[1]);
    const mes = Number(matchBr[2]) - 1;
    const ano = Number(matchBr[3]);
    const hora = Number(matchBr[4] || 12);
    const min = Number(matchBr[5] || 0);
    const seg = Number(matchBr[6] || 0);
    const dt = new Date(ano, mes, dia, hora, min, seg);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString();
    }
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return null;
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
 * Converte uma matriz 2D (ex: retorno de `sheet.getDataRange().getValues()`) ou objetos mal indexados
 * em uma lista uniforme de objetos de linha com `_rawCells`.
 */
function converterLinhasBrutasPlanilha(listaBruta: any[]): any[] {
  if (!Array.isArray(listaBruta) || listaBruta.length === 0) return [];

  // Caso 1: Matriz 2D (Array de Arrays)
  if (Array.isArray(listaBruta[0])) {
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
      'nomedocliente',
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
        !cell.trim().toUpperCase().startsWith('PROP-')
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

  // Caso 2: Array de Objetos — verifica se a 1ª linha de dados foi usada acidentalmente como chave pelo Apps Script
  const primeiroObj = listaBruta[0];
  if (primeiroObj && typeof primeiroObj === 'object') {
    const chaves = Object.keys(primeiroObj);
    const chavePareceDado = chaves.some(
      (k) => k.trim().toUpperCase().startsWith('PROP-') || k.trim().startsWith('{')
    );

    if (chavePareceDado) {
      const resultado: any[] = [{ _rawCells: chaves }];
      for (const item of listaBruta) {
        if (item && typeof item === 'object') {
          resultado.push({ ...item, _rawCells: Object.values(item) });
        }
      }
      return resultado;
    }

    return listaBruta.map((item) =>
      item && typeof item === 'object'
        ? { ...item, _rawCells: Array.isArray(item._rawCells) ? item._rawCells : Object.values(item) }
        : item
    );
  }

  return listaBruta;
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
    'resumo',
  ]);
  const direto = tentarParsear(campoDireto);
  if (direto) return direto;

  if (Array.isArray(row._rawCells)) {
    for (const cell of row._rawCells) {
      const p = tentarParsear(cell);
      if (p) return p;
    }
  }

  for (const [k, val] of Object.entries(row)) {
    if (k === '_rawCells') continue;
    const p = tentarParsear(val);
    if (p) return p;
  }

  return null;
}

/**
 * Analisa células posicionais da linha quando os cabeçalhos da planilha são personalizados ou ausentes.
 */
function analisarCelulasDaLinha(cells: any[]) {
  let idDetectado = '';
  let statusDetectado = '';
  let valorDetectado = 0;
  let dataDetectada = '';
  let emailDetectado = '';
  let cnpjDetectado = '';
  let telefoneDetectado = '';
  const textosLivres: string[] = [];

  for (const raw of cells) {
    if (raw === undefined || raw === null) continue;
    if (typeof raw === 'number' && !Number.isNaN(raw)) {
      // Ignora números pequenos ou anos (ex: 4 meses, 20%, 2026) se já houver valor maior
      if (raw > 2100 || (raw > 50 && valorDetectado === 0 && (raw < 1900 || raw > 2100))) {
        if (raw > valorDetectado) valorDetectado = raw;
      }
      continue;
    }
    if (typeof raw !== 'string') continue;
    const str = raw.trim();
    if (!str || str.startsWith('{')) continue;

    if (/^PROP-[A-Z0-9-]+/i.test(str)) {
      if (!idDetectado) idDetectado = str;
      continue;
    }
    if (pareceStatusKanbanExplicito(str)) {
      if (!statusDetectado) statusDetectado = str;
      continue;
    }
    if (/^R\$\s*[\d.,]+/i.test(str) || /^\d{1,3}(\.\d{3})+,\d{2}$/.test(str)) {
      const v = parseNumeroMonetario(str);
      if (v > valorDetectado) valorDetectado = v;
      continue;
    }
    const iso = parseDataPlanilhaIso(str);
    if (iso && (/^\d{4}-\d{2}-\d{2}/.test(str) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(str))) {
      if (!dataDetectada) dataDetectada = iso;
      continue;
    }
    if (str.includes('@') && str.includes('.') && !str.includes(' ')) {
      if (!emailDetectado) emailDetectado = str;
      continue;
    }
    if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(str)) {
      if (!cnpjDetectado) cnpjDetectado = str;
      continue;
    }
    if (/^\(?\d{2}\)?\s*\d{4,5}-?\d{4}$/.test(str)) {
      if (!telefoneDetectado) telefoneDetectado = str;
      continue;
    }

    // Se for string puramente numérica grande (ex: "145200.50")
    if (/^\d+(\.\d+)?$/.test(str)) {
      const n = Number(str);
      if (n > 2100 && n > valorDetectado) {
        valorDetectado = n;
        continue;
      }
    }

    // Se contiver resumo formatado "Condomínio: X | Síndico: Y"
    if (str.includes('Condomínio:') && str.includes('|')) {
      const partes = str.split('|').map((p) => p.trim());
      for (const p of partes) {
        if (p.toLowerCase().startsWith('condomínio:') || p.toLowerCase().startsWith('condominio:')) {
          const nome = p.split(':').slice(1).join(':').trim();
          if (nome && !textosLivres.includes(nome)) textosLivres.unshift(nome);
        }
      }
      continue;
    }

    textosLivres.push(str);
  }

  return {
    idDetectado,
    statusDetectado,
    valorDetectado,
    dataDetectada,
    emailDetectado,
    cnpjDetectado,
    telefoneDetectado,
    clienteDetectado: textosLivres[0] || '',
    sindicoDetectado: textosLivres[1] || '',
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

  const parsedDetalhes = extrairSnapshotJsonDaLinha(row);
  const rawCells: any[] = Array.isArray(row._rawCells)
    ? row._rawCells
    : Object.values(row);
  const scan = analisarCelulasDaLinha(rawCells);

  // Ignora linhas marcadas como excluídas na planilha
  const rawStatus = primeiroTextoNaoVazio(
    obterCampoFlexivel(row, [
      'status',
      'fase',
      'etapa',
      'statusTitulo',
      'situacao',
      'estagio',
      'status/fase',
      'statusFase',
    ]),
    scan.statusDetectado
  );

  if (
    rawStatus &&
    (rawStatus.toLowerCase() === 'deleted' ||
      rawStatus.toLowerCase() === 'excluido' ||
      rawStatus.toLowerCase() === 'excluído')
  ) {
    return null;
  }

  const idExtraido = primeiroTextoNaoVazio(
    obterCampoFlexivel(row, [
      'id',
      'orcamentoId',
      'codigo',
      'proposta',
      'numeroProposta',
      'idOrcamento',
    ]),
    parsedDetalhes?.id,
    scan.idDetectado,
    `PROP-CLOUD-${index + 1}`
  );

  if (!idExtraido) return null;

  const itemLocal = cacheLocalMap?.get(idExtraido);

  // Status da linha da planilha tem prioridade (pois pode ter sido atualizado na planilha ou no Kanban)
  const statusNormalizado = rawStatus
    ? normalizarStatusKanban(rawStatus)
    : parsedDetalhes?.status
      ? normalizarStatusKanban(parsedDetalhes.status)
      : itemLocal?.status || 'em_elaboracao';

  const nomeCondominio = primeiroTextoNaoVazio(
    obterCampoFlexivel(row, [
      'nomeCondominio',
      'condominio',
      'cliente',
      'nomeDoCondominio',
      'nomeDoCliente',
      'nomeCliente',
      'nome',
      'edificio',
      'nomeEdificio',
      'contratante',
      'empresa',
      'razaoSocial',
    ]),
    parsedDetalhes?.dadosCliente?.nomeCondominio,
    itemLocal?.dadosCliente?.nomeCondominio,
    scan.clienteDetectado
  );

  const nomeSindico = primeiroTextoNaoVazio(
    obterCampoFlexivel(row, [
      'nomeSindico',
      'sindico',
      'nomeDoSindico',
      'gestor',
      'responsavel',
    ]),
    parsedDetalhes?.dadosCliente?.nomeSindico,
    itemLocal?.dadosCliente?.nomeSindico,
    scan.sindicoDetectado
  );

  const telefone = primeiroTextoNaoVazio(
    obterCampoFlexivel(row, [
      'telefone',
      'celular',
      'whatsapp',
      'fone',
      'contato',
    ]),
    parsedDetalhes?.dadosCliente?.telefone,
    itemLocal?.dadosCliente?.telefone,
    scan.telefoneDetectado
  );

  const email = primeiroTextoNaoVazio(
    obterCampoFlexivel(row, ['email', 'e-mail', 'correio']),
    parsedDetalhes?.dadosCliente?.email,
    itemLocal?.dadosCliente?.email,
    scan.emailDetectado
  );

  const cnpj = primeiroTextoNaoVazio(
    obterCampoFlexivel(row, ['cnpj', 'documento']),
    parsedDetalhes?.dadosCliente?.cnpj,
    itemLocal?.dadosCliente?.cnpj,
    scan.cnpjDetectado
  );

  const endereco = primeiroTextoNaoVazio(
    obterCampoFlexivel(row, ['endereco', 'localizacao', 'logradouro', 'enderecoObra']),
    parsedDetalhes?.dadosCliente?.endereco,
    itemLocal?.dadosCliente?.endereco
  );

  const valorGlobal = primeiroNumeroPositivo(
    obterCampoFlexivel(row, [
      'valorGlobal',
      'valor_global',
      'valor',
      'valorTotal',
      'valorFormatado',
      'preco',
      'total',
      'orcamento',
    ]),
    parsedDetalhes?.calculos?.valorGlobal,
    itemLocal?.calculos?.valorGlobal,
    scan.valorDetectado
  );

  // Ignora linhas totalmente vazias ou que sejam literalmente a linha de cabeçalho da planilha
  const chaveCond = normalizarChaveColuna(nomeCondominio);
  const chaveId = normalizarChaveColuna(idExtraido);
  if (
    (!nomeCondominio && !valorGlobal && !parsedDetalhes && !scan.idDetectado) ||
    chaveCond === 'cliente' ||
    chaveCond === 'condominio' ||
    chaveCond === 'nomedocondominio' ||
    chaveId === 'id' ||
    chaveId === 'codigo'
  ) {
    return null;
  }

  const dadosCliente: DadosCliente = {
    nomeCondominio: nomeCondominio || 'Condomínio Cadastrado',
    cnpj,
    endereco,
    nomeSindico,
    anoConstrucao: primeiroTextoNaoVazio(
      obterCampoFlexivel(row, ['anoConstrucao', 'idade', 'ano']),
      parsedDetalhes?.dadosCliente?.anoConstrucao,
      itemLocal?.dadosCliente?.anoConstrucao
    ),
    pavimentos: primeiroTextoNaoVazio(
      obterCampoFlexivel(row, ['pavimentos', 'andares', 'numeroDePavimentos']),
      parsedDetalhes?.dadosCliente?.pavimentos,
      itemLocal?.dadosCliente?.pavimentos
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

  const dataCriacaoIso =
    parseDataPlanilhaIso(
      obterCampoFlexivel(row, ['dataCriacao', 'data_criacao', 'data', 'timestamp'])
    ) ||
    parseDataPlanilhaIso(parsedDetalhes?.dataCriacao) ||
    parseDataPlanilhaIso(scan.dataDetectada) ||
    parseDataPlanilhaIso(itemLocal?.dataCriacao) ||
    new Date().toISOString();

  const dataAtualizacaoIso =
    parseDataPlanilhaIso(obterCampoFlexivel(row, ['dataAtualizacao', 'updatedAt'])) ||
    parseDataPlanilhaIso(parsedDetalhes?.dataAtualizacao) ||
    parseDataPlanilhaIso(itemLocal?.dataAtualizacao) ||
    dataCriacaoIso;

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
 * 1. SALVAR (POST): Envia o orçamento para o Web App do Google Sheets
 * e sincroniza com o espelho `/api/sheets/orcamentos`.
 */
export async function salvarOrcamentoNaNuvem(
  orcamento: OrcamentoSalvo,
  etapaFormulario?: number
): Promise<boolean> {
  removerIdExcluidoLocalmente(orcamento.id);
  const payload = montarPayloadPlanilha(orcamento, 'save', etapaFormulario);

  let salvouDireto = false;

  // 1. Envia diretamente do Front-End para o Web App do Google Sheets (text/plain evita preflight CORS)
  try {
    const targetUrl = montarUrlComQueryParamsPlanilha(payload);
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      credentials: 'omit',
    });

    salvouDireto = await respostaSheetsConfirmouGravacao(response);
  } catch (directErr) {
    console.warn('[Google Sheets] Aviso no POST direto ao Apps Script:', directErr);
  }

  // 2. Sincroniza também com o espelho do backend (/api/sheets/orcamentos) caso disponível
  try {
    const proxyRes = await fetch('/api/sheets/orcamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (proxyRes.ok) {
      const resultado = await proxyRes.json();
      if (resultado?.sheetsOk === true) return true;
    }
  } catch (proxyErr) {
    console.warn('[Google Sheets] Aviso no POST pelo servidor:', proxyErr);
  }

  if (salvouDireto) return true;
  throw new Error('A API do Google Sheets não confirmou a gravação do orçamento.');
}

/**
 * Extrai a lista de linhas de qualquer formato de resposta JSON do Web App do Google Sheets.
 */
export function extrairListaBrutaDeResposta(rawData: any): any[] {
  if (!rawData) return [];
  if (Array.isArray(rawData)) return rawData;

  if (typeof rawData === 'object') {
    const chavesConhecidas = [
      'data',
      'dados',
      'orcamentos',
      'propostas',
      'values',
      'rows',
      'items',
      'result',
      'records',
      'historico',
      'lista',
      'clientes',
      'planilha',
      'sheet',
    ];

    for (const chave of chavesConhecidas) {
      if (Array.isArray(rawData[chave])) {
        return rawData[chave];
      }
      if (rawData[chave] && typeof rawData[chave] === 'object') {
        for (const subChave of chavesConhecidas) {
          if (Array.isArray(rawData[chave][subChave])) {
            return rawData[chave][subChave];
          }
        }
      }
    }

    // Procura qualquer propriedade que seja um Array dentro do objeto retornado pelo Apps Script
    for (const [k, val] of Object.entries(rawData)) {
      if (k === 'deletedIds' || k === 'serverItems') continue;
      if (Array.isArray(val)) {
        return val;
      }
    }

    // Se o próprio objeto for um único orçamento retornado
    if (rawData.id || rawData.cliente || rawData.nomeCondominio || rawData.dadosCliente) {
      return [rawData];
    }
  }

  return [];
}

/**
 * Faz o fetch GET diretamente no Web App do Google Sheets (`GOOGLE_SHEETS_API_URL`)
 * e retorna as linhas brutas da planilha.
 */
async function buscarLinhasDiretoDoGoogleSheetsWebApp(): Promise<any[] | null> {
  const urlsCandidatas = [
    GOOGLE_SHEETS_API_URL,
    `${GOOGLE_SHEETS_API_URL}?t=${Date.now()}`,
  ];

  for (const url of urlsCandidatas) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        credentials: 'omit',
      });

      if (response.ok) {
        const text = await response.text();
        if (text && text.trim()) {
          try {
            const parsed = JSON.parse(text);
            const extraidos = extrairListaBrutaDeResposta(parsed);
            if (
              Array.isArray(parsed) ||
              extraidos.length > 0 ||
              (typeof parsed === 'object' &&
                parsed !== null &&
                ['data', 'dados', 'orcamentos', 'values', 'rows', 'items'].some(
                  (key) => Array.isArray(parsed[key])
                ))
            ) {
              return extraidos;
            }
          } catch {
            // Caso não seja JSON válido, tenta próxima URL candidata
          }
        }
      }
    } catch (err) {
      console.warn(`[Google Sheets GET] Tentativa falhou para ${url}:`, err);
    }
  }

  return null;
}

/**
 * 2. CARREGAR (GET): Consome os dados diretamente do Web App do Google Sheets via método GET
 * para preencher dinamicamente o painel Kanban e as telas de consulta de orçamentos em qualquer
 * nova guia, aba anônima ou outro dispositivo.
 */
export async function carregarOrcamentosDaNuvem(): Promise<OrcamentoSalvo[]> {
  const cacheLocal = carregarOrcamentosSalvos();
  const cacheLocalMap = new Map<string, OrcamentoSalvo>(
    cacheLocal.map((item) => [item.id, item])
  );
  const excluidosSet = obterIdsExcluidosLocalmente();

  // 1. Chamada GET direta do Front-End ao Web App do Google Sheets (GOOGLE_SHEETS_API_URL)
  let linhasPlanilhaBrutas = await buscarLinhasDiretoDoGoogleSheetsWebApp();
  let consultaServidorConcluida = false;

  // 2. Consulta complementar ao endpoint `/api/sheets/orcamentos` para contornar CORS.
  try {
    const proxyRes = await fetch(`/api/sheets/orcamentos?t=${Date.now()}`);
    const contentType = proxyRes.headers.get('content-type') || '';
    if (proxyRes.ok && contentType.includes('application/json')) {
      const json = await proxyRes.json();
      if (json?.warning && linhasPlanilhaBrutas === null) {
        throw new Error(String(json.warning));
      }
      if (linhasPlanilhaBrutas === null || linhasPlanilhaBrutas.length === 0) {
        linhasPlanilhaBrutas = extrairListaBrutaDeResposta(json);
      }
      if (Array.isArray(json?.deletedIds)) {
        json.deletedIds.forEach((id: string) => excluidosSet.add(String(id)));
      }
      consultaServidorConcluida = true;
    }
  } catch (error) {
    if (linhasPlanilhaBrutas === null) {
      throw new Error(
        `Não foi possível consultar os orçamentos no Google Sheets: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (linhasPlanilhaBrutas === null && !consultaServidorConcluida) {
    throw new Error('Não foi possível conectar à API do Google Sheets.');
  }
  if (linhasPlanilhaBrutas === null) linhasPlanilhaBrutas = [];

  const mapaUnico = new Map<string, OrcamentoSalvo>();

  // 3. Processa todas as linhas vindas diretamente da planilha do Google Sheets
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

  const listaNuvem = Array.from(mapaUnico.values()).sort(
    (a, b) =>
      new Date(b.dataAtualizacao || b.dataCriacao).getTime() -
      new Date(a.dataAtualizacao || a.dataCriacao).getTime()
  );

  salvarOrcamentosNoStorage(listaNuvem);
  return listaNuvem;
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

  let okDireto = false;
  try {
    const url = montarUrlComQueryParamsPlanilha(payload);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      credentials: 'omit',
    });
    okDireto = await respostaSheetsConfirmouGravacao(response);
  } catch (err) {
    console.warn('[Google Sheets] Aviso ao atualizar status diretamente:', err);
  }

  try {
    const proxyRes = await fetch('/api/sheets/orcamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (proxyRes.ok) {
      const resultado = await proxyRes.json();
      if (resultado?.sheetsOk === true) return true;
    }
  } catch {
    // Ignora caso backend não esteja presente
  }

  return okDireto;
}

/**
 * 4. EXCLUIR ORÇAMENTO (POST): Solicita a exclusão do orçamento na planilha do Google Sheets.
 */
export async function excluirOrcamentoNaNuvem(id: string): Promise<boolean> {
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

  let erroProxy: string | null = null;
  try {
    const proxyRes = await fetch('/api/sheets/orcamentos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (proxyRes.ok) {
      const resultado = await proxyRes.json();
      if (resultado?.sheetsOk === true) {
        registrarIdExcluidoLocalmente(id);
        return true;
      }
      erroProxy = String(resultado?.error || 'O servidor não confirmou a exclusão no Google Sheets.');
    }
  } catch (err) {
    erroProxy = err instanceof Error ? err.message : String(err);
    console.warn('[Google Sheets] Aviso ao excluir orçamento pelo servidor:', err);
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
      credentials: 'omit',
    });
    if (await respostaSheetsConfirmouGravacao(response)) {
      registrarIdExcluidoLocalmente(id);
      return true;
    }
  } catch (err) {
    console.warn('[Google Sheets] Aviso ao excluir orçamento diretamente:', err);
  }

  removerIdExcluidoLocalmente(id);
  throw new Error(
    erroProxy
      ? `Não foi possível excluir o orçamento no Google Sheets: ${erroProxy}`
      : 'O Google Sheets não confirmou a exclusão do orçamento.'
  );
}
