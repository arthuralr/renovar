import {
  OrcamentoSalvo,
  StatusOrcamentoKanban,
  DadosCliente,
  CalculosOrcamento,
  CondicoesComerciais,
} from '../types';
import {
  formatarMoeda,
  calcularParcelamentoComercial,
  CONDICOES_COMERCIAIS_PADRAO,
} from './budgetCalculator';

export const ORCAMENTOS_STORAGE_KEY = 'patologias_orcamentos_salvos_v1';

export interface EtapaKanbanConfig {
  id: StatusOrcamentoKanban;
  titulo: string;
  descricaoCurta: string;
  badgeClass: string;
  headerBorderClass: string;
  dotClass: string;
}

export const ETAPAS_KANBAN: EtapaKanbanConfig[] = [
  {
    id: 'em_elaboracao',
    titulo: 'Em Elaboração',
    descricaoCurta: 'Proposta gerada / em revisão técnica',
    badgeClass: 'bg-slate-800 text-slate-200 border-slate-600',
    headerBorderClass: 'border-slate-600/80 bg-slate-900/90',
    dotClass: 'bg-slate-400',
  },
  {
    id: 'enviado_sindico',
    titulo: 'Enviado ao Síndico',
    descricaoCurta: 'Encaminhado para análise da administração',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    headerBorderClass: 'border-sky-500/50 bg-sky-950/25',
    dotClass: 'bg-sky-400',
  },
  {
    id: 'aguardando_aprovacao',
    titulo: 'Aguardando Aprovação',
    descricaoCurta: 'Em pauta de assembleia / conselho',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    headerBorderClass: 'border-amber-500/50 bg-amber-950/25',
    dotClass: 'bg-amber-400',
  },
  {
    id: 'aprovado',
    titulo: 'Aprovado',
    descricaoCurta: 'Proposta aceita para contratação',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    headerBorderClass: 'border-emerald-500/50 bg-emerald-950/25',
    dotClass: 'bg-emerald-400',
  },
  {
    id: 'recusado',
    titulo: 'Recusado',
    descricaoCurta: 'Proposta declinada ou suspensa',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    headerBorderClass: 'border-rose-500/50 bg-rose-950/25',
    dotClass: 'bg-rose-400',
  },
];

export function obterConfigEtapaKanban(status: StatusOrcamentoKanban): EtapaKanbanConfig {
  return ETAPAS_KANBAN.find((e) => e.id === status) || ETAPAS_KANBAN[0];
}

export function carregarOrcamentosSalvos(): OrcamentoSalvo[] {
  try {
    const raw = localStorage.getItem(ORCAMENTOS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Erro ao carregar histórico de orçamentos salvos:', e);
    return [];
  }
}

export function salvarOrcamentosNoStorage(orcamentos: OrcamentoSalvo[]): void {
  try {
    localStorage.setItem(ORCAMENTOS_STORAGE_KEY, JSON.stringify(orcamentos));
  } catch (quotaErr) {
    // Caso as imagens base64 excedam o limite do localStorage, mantém a imagem apenas nos 5 mais recentes
    try {
      const compactados = orcamentos.map((orc, idx) => {
        if (idx < 5) return orc;
        return {
          ...orc,
          selectedImage: null,
          registrosVistoria: (orc.registrosVistoria || []).map((r) => ({
            ...r,
            imagemUrl: '',
          })),
        };
      });
      localStorage.setItem(ORCAMENTOS_STORAGE_KEY, JSON.stringify(compactados));
    } catch (innerErr) {
      console.warn('Não foi possível persistir orçamentos no localStorage:', innerErr);
    }
  }
}

export interface DadosMensagemWhatsApp {
  id: string;
  status: StatusOrcamentoKanban;
  dadosCliente: DadosCliente;
  calculos: CalculosOrcamento;
  condicoesComerciais?: CondicoesComerciais;
  totalPatologias?: number;
}

/**
 * Monta a mensagem pré-configurada de WhatsApp puxando os dados do orçamento
 * (ID, condomínio/cliente, síndico, status atual, valor global e condições de pagamento).
 */
export function gerarMensagemWhatsAppOrcamento(dados: DadosMensagemWhatsApp): string {
  const {
    id,
    status,
    dadosCliente,
    calculos,
    condicoesComerciais = CONDICOES_COMERCIAIS_PADRAO,
    totalPatologias,
  } = dados;

  const etapa = obterConfigEtapaKanban(status);
  const parcelamento = calcularParcelamentoComercial(calculos.valorGlobal, condicoesComerciais);
  const nomeSindico = dadosCliente.nomeSindico?.trim() || 'Síndico(a)';
  const nomeCondominio = dadosCliente.nomeCondominio?.trim() || 'Condomínio';
  const validadeDias = condicoesComerciais?.prazoValidadeDias || 30;

  const linhas: string[] = [
    `Olá, *${nomeSindico}*! Tudo bem?`,
    ``,
    `Segue atualização referente à Proposta Técnica e Comercial da *Renovar Engenharia Diagnóstica*:`,
    ``,
    `📋 *Proposta:* ${id}`,
    `🏢 *Cliente / Condomínio:* ${nomeCondominio}${dadosCliente.cnpj ? ` (CNPJ: ${dadosCliente.cnpj})` : ''}`,
    `📌 *Status Atual:* *${etapa.titulo.toUpperCase()}*`,
    `💰 *Valor Global:* *${formatarMoeda(calculos.valorGlobal)}*`,
    `⏱️ *Prazo de Execução:* ${calculos.mesesObra} ${calculos.mesesObra === 1 ? 'mês' : 'meses'}`,
    `💳 *Condições de Pagamento:* Entrada de ${parcelamento.percentualEntrada}% (${formatarMoeda(parcelamento.valorEntradaTotal)}${parcelamento.parcelasEntrada > 1 ? ` em ${parcelamento.parcelasEntrada}x` : ' à vista'}) + Saldo em ${parcelamento.parcelasSaldo}x mensais de ${formatarMoeda(parcelamento.valorParcelaSaldo)} (${condicoesComerciais.formaPagamento})`,
  ];

  if (typeof totalPatologias === 'number' && totalPatologias > 0) {
    linhas.push(`🔍 *Escopo Pericial ABNT:* ${totalPatologias} ${totalPatologias === 1 ? 'registro patológico diagnosticado' : 'registros patológicos diagnosticados'}`);
  }

  linhas.push(
    `📅 *Validade da Proposta:* ${validadeDias} dias`,
    ``,
    `Permanecemos à disposição para esclarecimentos técnicos ou agendamento de apresentação em assembleia.`,
    ``,
    `Atenciosamente,`,
    `*Renovar Engenharia de Fachadas*`
  );

  return linhas.join('\n');
}

/**
 * Gera a URL oficial de compartilhamento do WhatsApp (https://wa.me/...)
 * direcionando automaticamente para o telefone do síndico caso informado.
 */
export function gerarLinkWhatsAppOrcamento(dados: DadosMensagemWhatsApp): string {
  const mensagem = gerarMensagemWhatsAppOrcamento(dados);
  const textoCodificado = encodeURIComponent(mensagem);

  const digitosTelefone = (dados.dadosCliente.telefone || '').replace(/\D/g, '');
  if (digitosTelefone.length >= 10) {
    const foneComDdi = digitosTelefone.startsWith('55')
      ? digitosTelefone
      : `55${digitosTelefone}`;
    return `https://wa.me/${foneComDdi}?text=${textoCodificado}`;
  }

  return `https://wa.me/?text=${textoCodificado}`;
}
