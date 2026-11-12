import {
  DadosCliente,
  CalculosOrcamento,
  DiagnosticoResponse,
  ItemMaterial,
  CargoProfissional,
  CondicoesComerciais,
  HistoricoInspecao,
  InspecaoContexto,
} from '../types';
import {
  calcularParcelamentoComercial,
  formatarMoeda,
  CONDICOES_COMERCIAIS_PADRAO,
} from '../utils/budgetCalculator';

export const N8N_WEBHOOK_URL = 'https://n8n.ia01.online/webhook-test/renovar-proposta';

export interface EnviarOrcamentoWebhookParams {
  orcamentoId?: string;
  dadosCliente: DadosCliente;
  calculos: CalculosOrcamento;
  condicoesComerciais?: CondicoesComerciais;
  materiais: ItemMaterial[];
  equipe: CargoProfissional[];
  diagnostico?: DiagnosticoResponse | null;
  registrosVistoria?: HistoricoInspecao[];
  contexto?: InspecaoContexto;
  origemAcionamento?: 'gerar_orcamento_step4' | 'baixar_pdf_modal' | 'reenvio_manual';
}

export interface WebhookResult {
  ok: boolean;
  status?: number;
  url: string;
  message: string;
}

export function montarPayloadOrcamentoWebhook(params: EnviarOrcamentoWebhookParams) {
  const {
    orcamentoId = `PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    dadosCliente,
    calculos,
    condicoesComerciais = CONDICOES_COMERCIAIS_PADRAO,
    materiais,
    equipe,
    diagnostico,
    registrosVistoria = [],
    contexto,
    origemAcionamento = 'gerar_orcamento_step4',
  } = params;

  const parcelamento = calcularParcelamentoComercial(calculos.valorGlobal, condicoesComerciais);

  const patologiasConsolidado =
    registrosVistoria.length > 0
      ? registrosVistoria
          .map((reg, index) => {
            const item = (reg.resultado?.anomalias || reg.resultado?.patologias || [])[0];
            if (!item) return null;
            return {
              itemNumero: index + 1,
              idRegistro: reg.id,
              nomeArquivo: reg.nomeArquivo,
              dataHora: reg.dataHora,
              nome_patologia: item.nome_patologia,
              gravidade: item.gravidade,
              constatacao_visual: item.constatacao_visual || item.descricao || '',
              justificativa_tecnica_causa:
                item.justificativa_tecnica_causa || item.causa_provavel || '',
              risco_evolutivo_consequencias:
                item.risco_evolutivo_consequencias || item.risco_evolutivo || '',
              normas_tecnicas_abnt: item.normas_tecnicas_abnt || [],
              ensaios_complementares: item.ensaios_complementares || [],
              diretrizes_reparo: item.diretrizes_reparo || [],
            };
          })
          .filter(Boolean)
      : (diagnostico?.anomalias || diagnostico?.patologias || []).map((item, index) => ({
          itemNumero: index + 1,
          nome_patologia: item.nome_patologia,
          gravidade: item.gravidade,
          constatacao_visual: item.constatacao_visual || item.descricao || '',
          justificativa_tecnica_causa:
            item.justificativa_tecnica_causa || item.causa_provavel || '',
          risco_evolutivo_consequencias:
            item.risco_evolutivo_consequencias || item.risco_evolutivo || '',
          normas_tecnicas_abnt: item.normas_tecnicas_abnt || [],
          ensaios_complementares: item.ensaios_complementares || [],
          diretrizes_reparo: item.diretrizes_reparo || [],
        }));

  const materiaisAtivos = materiais
    .filter((m) => m.quantidade > 0)
    .map((m) => ({
      id: m.id,
      tipo: 'material',
      nome: m.nome,
      descricao: m.nome,
      unidade: m.unidade,
      quantidade: m.quantidade,
      precoUnitario: m.precoUnitario,
      subtotal: m.quantidade * m.precoUnitario,
      subtotalFormatado: formatarMoeda(m.quantidade * m.precoUnitario),
    }));

  const equipeAtiva = equipe
    .filter((p) => p.quantidadePessoas > 0)
    .map((p) => ({
      id: p.id,
      tipo: 'mao_de_obra',
      cargo: p.cargo,
      nome: p.cargo,
      descricao: `${p.cargo} (${calculos.mesesObra} meses)`,
      unidade: 'mês',
      quantidadePessoas: p.quantidadePessoas,
      quantidade: p.quantidadePessoas * calculos.mesesObra,
      custoMensalUnitario: p.custoMensalUnitario,
      precoUnitario: p.custoMensalUnitario,
      subtotalMensal: p.quantidadePessoas * p.custoMensalUnitario,
      subtotalPeriodoObra: p.quantidadePessoas * p.custoMensalUnitario * calculos.mesesObra,
      subtotal: p.quantidadePessoas * p.custoMensalUnitario * calculos.mesesObra,
      subtotalPeriodoFormatado: formatarMoeda(
        p.quantidadePessoas * p.custoMensalUnitario * calculos.mesesObra
      ),
    }));

  // Lista unificada de itens da proposta (materiais + equipe + escopo de patologias)
  const itensProposta = [
    ...materiaisAtivos.map((m) => ({
      categoria: 'Material / Insumo',
      item: m.nome,
      unidade: m.unidade,
      quantidade: m.quantidade,
      valorUnitario: m.precoUnitario,
      valorTotal: m.subtotal,
      valorTotalFormatado: m.subtotalFormatado,
    })),
    ...equipeAtiva.map((e) => ({
      categoria: 'Mão de Obra / Equipe',
      item: `${e.cargo} (${e.quantidadePessoas} prof. x ${calculos.mesesObra} meses)`,
      unidade: 'mês',
      quantidade: e.quantidadePessoas * calculos.mesesObra,
      valorUnitario: e.custoMensalUnitario,
      valorTotal: e.subtotalPeriodoObra,
      valorTotalFormatado: e.subtotalPeriodoFormatado,
    })),
    ...patologiasConsolidado.map((p: any) => ({
      categoria: 'Diagnóstico Patológico ABNT',
      item: p.nome_patologia,
      gravidade: p.gravidade,
      normasAbnt: p.normas_tecnicas_abnt,
      diretrizesReparo: p.diretrizes_reparo,
    })),
  ];

  const nomeCondominio = dadosCliente.nomeCondominio || 'Condomínio Não Informado';
  const nomeSindico = dadosCliente.nomeSindico || '';
  const telefone = dadosCliente.telefone || '';
  const email = dadosCliente.email || '';

  return {
    evento: 'orcamento_gerado',
    origemAcionamento,
    orcamentoId,
    timestamp: new Date().toISOString(),
    dataEmissao: new Date().toLocaleDateString('pt-BR'),

    // Campos principais da proposta diretamente na raiz do JSON (para acesso direto no n8n)
    nomeCondominio,
    nome_condominio: nomeCondominio,
    sindico: nomeSindico,
    nomeSindico,
    nome_sindico: nomeSindico,
    telefone,
    email,
    cnpj: dadosCliente.cnpj || '',
    endereco: dadosCliente.endereco || '',
    anoConstrucao: dadosCliente.anoConstrucao || '',
    pavimentos: dadosCliente.pavimentos || '',
    valorGlobal: calculos.valorGlobal,
    valor_global: calculos.valorGlobal,
    valorGlobalFormatado: formatarMoeda(calculos.valorGlobal),
    mesesObra: calculos.mesesObra,
    itens: itensProposta,

    // Objetos detalhados estruturados
    cliente: {
      nomeCondominio,
      cnpj: dadosCliente.cnpj || '',
      endereco: dadosCliente.endereco || '',
      nomeSindico,
      sindico: nomeSindico,
      anoConstrucao: dadosCliente.anoConstrucao || '',
      pavimentos: dadosCliente.pavimentos || '',
      telefone,
      email,
    },
    resumoFinanceiro: {
      mesesObra: calculos.mesesObra,
      custoMateriais: calculos.custoMateriais,
      custoMateriaisFormatado: formatarMoeda(calculos.custoMateriais),
      maoDeObraDireta: calculos.maoDeObraDireta,
      maoDeObraDiretaFormatado: formatarMoeda(calculos.maoDeObraDireta),
      periculosidade: calculos.periculosidade,
      periculosidadeFormatado: formatarMoeda(calculos.periculosidade),
      encargosSociais: calculos.encargosSociais,
      encargosSociaisFormatado: formatarMoeda(calculos.encargosSociais),
      custoTotalDireto: calculos.custoTotalDireto,
      custoTotalDiretoFormatado: formatarMoeda(calculos.custoTotalDireto),
      margemErro: calculos.margemErro,
      margemErroFormatado: formatarMoeda(calculos.margemErro),
      margemLucroPercentual: calculos.margemLucroPercentual,
      valorMargemLucro: calculos.valorMargemLucro,
      valorMargemLucroFormatado: formatarMoeda(calculos.valorMargemLucro),
      valorGlobal: calculos.valorGlobal,
      valorGlobalFormatado: formatarMoeda(calculos.valorGlobal),
    },
    condicoesComerciais: {
      percentualEntrada: parcelamento.percentualEntrada,
      parcelasEntrada: parcelamento.parcelasEntrada,
      valorEntradaTotal: parcelamento.valorEntradaTotal,
      valorEntradaTotalFormatado: formatarMoeda(parcelamento.valorEntradaTotal),
      valorParcelaEntrada: parcelamento.valorParcelaEntrada,
      valorParcelaEntradaFormatado: formatarMoeda(parcelamento.valorParcelaEntrada),
      percentualSaldo: parcelamento.percentualSaldo,
      parcelasSaldo: parcelamento.parcelasSaldo,
      valorSaldoTotal: parcelamento.valorSaldoTotal,
      valorSaldoTotalFormatado: formatarMoeda(parcelamento.valorSaldoTotal),
      valorParcelaSaldo: parcelamento.valorParcelaSaldo,
      valorParcelaSaldoFormatado: formatarMoeda(parcelamento.valorParcelaSaldo),
      formaPagamento: condicoesComerciais.formaPagamento,
      prazoValidadeDias: condicoesComerciais.prazoValidadeDias,
      observacoesFaturamento: condicoesComerciais.observacoesFaturamento,
    },
    materiais: materiaisAtivos,
    equipe: equipeAtiva,
    diagnosticoPericial: {
      totalRegistrosFotograficos: patologiasConsolidado.length,
      responsavelTecnico:
        contexto?.responsavelTecnico || 'Engenheiro Civil Especialista em Estruturas e Fachadas',
      crea: contexto?.crea || 'CREA Ativo',
      patologias: patologiasConsolidado,
    },
  };
}

/**
 * Envia os dados estruturados do orçamento gerado via HTTP POST em JSON para a URL de webhook do n8n:
 * https://n8n.ia01.online/webhook-test/renovar-proposta
 */
export async function enviarOrcamentoWebhook(
  params: EnviarOrcamentoWebhookParams
): Promise<WebhookResult> {
  const payload = montarPayloadOrcamentoWebhook(params);

  // 1. Disparo HTTP POST direto em JSON para a URL do n8n
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          url: N8N_WEBHOOK_URL,
          message: 'Dados da proposta enviados com sucesso para o webhook do n8n.',
        };
      }

      const errText = await response.text().catch(() => '');
      console.warn(
        `[Webhook n8n] Resposta HTTP ${response.status} de ${N8N_WEBHOOK_URL}:`,
        errText
      );
      return {
        ok: false,
        status: response.status,
        url: N8N_WEBHOOK_URL,
        message: `Webhook n8n respondeu com status ${response.status}.`,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (directErr: any) {
    // 2. Fallback via proxy backend (/api/webhook/renovar-proposta) caso o navegador sofra bloqueio de CORS
    console.warn(
      '[Webhook n8n] Falha de rede/CORS no envio direto pelo navegador, tentando via servidor backend:',
      directErr?.message || directErr
    );

    try {
      const proxyResponse = await fetch('/api/webhook/renovar-proposta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const proxyData = await proxyResponse.json().catch(() => ({}));
      return {
        ok: proxyResponse.ok && proxyData?.ok !== false,
        status: proxyData?.status || proxyResponse.status,
        url: N8N_WEBHOOK_URL,
        message:
          proxyData?.message ||
          (proxyResponse.ok
            ? 'Dados da proposta enviados ao n8n via servidor.'
            : `Falha ao enviar para o webhook n8n (status ${proxyResponse.status}).`),
      };
    } catch (proxyErr: any) {
      console.warn('[Webhook n8n] Erro no envio via backend:', proxyErr?.message || proxyErr);
      return {
        ok: false,
        url: N8N_WEBHOOK_URL,
        message: 'Não foi possível conectar ao webhook do n8n.',
      };
    }
  }
}
