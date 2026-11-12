import React from 'react';
import {
  FileSpreadsheet,
  Printer,
  DollarSign,
  TrendingUp,
  Percent,
  Building2,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  HardHat,
  Layers,
  Sparkles,
  PieChart,
  Calendar,
  CreditCard,
  FileText,
  RotateCcw,
  MessageCircle,
  Kanban,
} from 'lucide-react';
import {
  DadosCliente,
  CalculosOrcamento,
  DiagnosticoResponse,
  CondicoesComerciais,
  OrcamentoSalvo,
  StatusOrcamentoKanban,
} from '../types';
import {
  formatarMoeda,
  calcularParcelamentoComercial,
  CONDICOES_COMERCIAIS_PADRAO,
} from '../utils/budgetCalculator';
import { OrcamentosKanbanBoard } from './OrcamentosKanbanBoard';
import { gerarLinkWhatsAppOrcamento } from '../utils/orcamentoKanbanUtils';

interface Step4ResumoProps {
  dadosCliente: DadosCliente;
  diagnostico: DiagnosticoResponse | null;
  calculos: CalculosOrcamento;
  condicoesComerciais: CondicoesComerciais;
  onUpdateCondicoesComerciais: (novasCondicoes: Partial<CondicoesComerciais>) => void;
  setMargemLucroPercentual: (pct: number) => void;
  onOpenPdf: () => void;
  onPrev: () => void;
  orcamentosSalvos?: OrcamentoSalvo[];
  activeOrcamentoId?: string | null;
  onUpdateStatusOrcamento?: (id: string, novoStatus: StatusOrcamentoKanban) => void;
  onViewOrcamentoPdf?: (orcamento: OrcamentoSalvo) => void;
  onLoadOrcamento?: (orcamento: OrcamentoSalvo) => void;
  onDeleteOrcamento?: (id: string) => void;
  onClearAllOrcamentos?: () => void;
  onSaveCurrentOrcamento?: () => void;
  onRefreshCloud?: () => void;
  isSyncingCloud?: boolean;
}

export const Step4Resumo: React.FC<Step4ResumoProps> = ({
  dadosCliente,
  diagnostico,
  calculos,
  condicoesComerciais,
  onUpdateCondicoesComerciais,
  setMargemLucroPercentual,
  onOpenPdf,
  onPrev,
  orcamentosSalvos = [],
  activeOrcamentoId = null,
  onUpdateStatusOrcamento,
  onViewOrcamentoPdf,
  onLoadOrcamento,
  onDeleteOrcamento,
  onClearAllOrcamentos,
  onSaveCurrentOrcamento,
  onRefreshCloud,
  isSyncingCloud = false,
}) => {
  const anomalias = diagnostico?.anomalias || diagnostico?.patologias || [];
  const parcelamento = calcularParcelamentoComercial(calculos.valorGlobal, condicoesComerciais);

  const orcamentoAtivo = orcamentosSalvos.find((o) => o.id === activeOrcamentoId);
  const statusAtual: StatusOrcamentoKanban = orcamentoAtivo?.status || 'em_elaboracao';
  const idPropostaAtual =
    orcamentoAtivo?.id || `PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const handleCompartilharWhatsAppAtual = () => {
    const url = gerarLinkWhatsAppOrcamento({
      id: idPropostaAtual,
      status: statusAtual,
      dadosCliente,
      calculos,
      condicoesComerciais,
      totalPatologias: anomalias.length,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Percentages for visual chart
  const pctMateriais = (calculos.custoMateriais / (calculos.valorGlobal || 1)) * 100;
  const pctMaoDeObra = (calculos.maoDeObraDireta / (calculos.valorGlobal || 1)) * 100;
  const pctPericulosidade = (calculos.periculosidade / (calculos.valorGlobal || 1)) * 100;
  const pctEncargos = (calculos.encargosSociais / (calculos.valorGlobal || 1)) * 100;
  const pctMargemErro = (calculos.margemErro / (calculos.valorGlobal || 1)) * 100;
  const pctLucro = (calculos.valorMargemLucro / (calculos.valorGlobal || 1)) * 100;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4">
        <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4" />
          Passo 4: Fechamento Comercial & Proposta
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
          Resumo Financeiro & Valor Global da Obra
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Demonstrativo sintético de formação de preço de venda conforme as diretrizes do diagnóstico pericial.
        </p>
      </div>

      {/* Hero Global Value Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 p-6 sm:p-10 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Valor Global da Proposta
              </span>
              <span className="text-xs font-mono text-slate-400">
                Prazo: {calculos.mesesObra} {calculos.mesesObra === 1 ? 'mês' : 'meses'}
              </span>
            </div>

            <div className="text-3xl sm:text-5xl font-black font-mono text-amber-400 tracking-tight">
              {formatarMoeda(calculos.valorGlobal)}
            </div>

            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
              Composição: Custo Total Direto ({formatarMoeda(calculos.custoTotalDireto)}) + Margem de Erro 7% ({formatarMoeda(calculos.margemErro)}) + Margem de Lucro {calculos.margemLucroPercentual}% ({formatarMoeda(calculos.valorMargemLucro)}).
            </p>
          </div>

          {/* Big Action Buttons: Generate PDF + 1-Click WhatsApp */}
          <div className="shrink-0 flex flex-col gap-2.5">
            <button
              onClick={onOpenPdf}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/25 transition transform active:scale-98 cursor-pointer flex items-center justify-center gap-2.5"
            >
              <Printer className="w-5 h-5" />
              <span>Gerar Orçamento (PDF)</span>
            </button>

            <button
              type="button"
              onClick={handleCompartilharWhatsAppAtual}
              className="px-6 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              title="Enviar resumo e status da proposta para o WhatsApp do síndico em 1 clique"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Enviar para o Síndico via WhatsApp</span>
            </button>

            <span className="text-[11px] text-center text-slate-500 font-mono">
              Salva automaticamente no histórico e Kanban ao gerar
            </span>
          </div>
        </div>

        {/* Profit Margin Control Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 bg-slate-950/60 -mx-6 -mb-6 sm:-mx-10 sm:-mb-10 p-6 sm:p-8 rounded-b-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <label className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-400" />
                Definir Margem de Lucro Desejada (%):
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ajuste o percentual para recalcular instantaneamente o valor da proposta comercial.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={calculos.margemLucroPercentual}
                onChange={(e) => setMargemLucroPercentual(Number(e.target.value))}
                className="w-36 sm:w-48 accent-amber-500 cursor-pointer"
              />

              <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={calculos.margemLucroPercentual}
                  onChange={(e) => setMargemLucroPercentual(Math.max(0, Number(e.target.value)))}
                  className="w-14 bg-transparent text-right font-mono font-bold text-sm text-amber-400 focus:outline-none"
                />
                <span className="text-xs text-slate-400 font-bold">%</span>
              </div>

              <div className="text-right font-mono text-xs hidden md:block">
                <span className="text-slate-500 text-[10px] uppercase block">Lucro Bruto</span>
                <span className="text-emerald-400 font-bold">{formatarMoeda(calculos.valorMargemLucro)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Detailed Math Formulation Table */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-400" />
              Composição Analítica dos Custos
            </h3>
            <span className="text-xs font-mono text-slate-400">Total: 100%</span>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div style={{ width: `${pctMateriais}%` }} className="bg-amber-500" title={`Materiais: ${pctMateriais.toFixed(1)}%`} />
            <div style={{ width: `${pctMaoDeObra}%` }} className="bg-sky-500" title={`Mão de Obra: ${pctMaoDeObra.toFixed(1)}%`} />
            <div style={{ width: `${pctPericulosidade}%` }} className="bg-orange-500" title={`Periculosidade: ${pctPericulosidade.toFixed(1)}%`} />
            <div style={{ width: `${pctEncargos}%` }} className="bg-indigo-500" title={`Encargos: ${pctEncargos.toFixed(1)}%`} />
            <div style={{ width: `${pctMargemErro}%` }} className="bg-rose-500" title={`Margem Erro: ${pctMargemErro.toFixed(1)}%`} />
            <div style={{ width: `${pctLucro}%` }} className="bg-emerald-500" title={`Lucro: ${pctLucro.toFixed(1)}%`} />
          </div>

          {/* Items breakdown list */}
          <div className="space-y-2 text-xs font-mono pt-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                1. Custo de Materiais e Insumos
              </span>
              <div className="text-right">
                <span className="text-white font-bold">{formatarMoeda(calculos.custoMateriais)}</span>
                <span className="text-slate-500 text-[10px] ml-2">({pctMateriais.toFixed(1)}%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                2. Mão de Obra Direta ({calculos.mesesObra} meses)
              </span>
              <div className="text-right">
                <span className="text-white font-bold">{formatarMoeda(calculos.maoDeObraDireta)}</span>
                <span className="text-slate-500 text-[10px] ml-2">({pctMaoDeObra.toFixed(1)}%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                3. Periculosidade (30% sobre MO Direta)
              </span>
              <div className="text-right">
                <span className="text-orange-300 font-bold">{formatarMoeda(calculos.periculosidade)}</span>
                <span className="text-slate-500 text-[10px] ml-2">({pctPericulosidade.toFixed(1)}%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                4. Encargos Sociais (60% sobre MO Direta)
              </span>
              <div className="text-right">
                <span className="text-indigo-300 font-bold">{formatarMoeda(calculos.encargosSociais)}</span>
                <span className="text-slate-500 text-[10px] ml-2">({pctEncargos.toFixed(1)}%)</span>
              </div>
            </div>

            {/* Total Direto Highlight */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700 font-bold">
              <span className="text-white">Subtotal: Custo Total Direto</span>
              <span className="text-emerald-400 text-sm">{formatarMoeda(calculos.custoTotalDireto)}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                5. Margem de Erro e Contingência (7% s/ Custo Direto)
              </span>
              <div className="text-right">
                <span className="text-rose-300 font-bold">{formatarMoeda(calculos.margemErro)}</span>
                <span className="text-slate-500 text-[10px] ml-2">({pctMargemErro.toFixed(1)}%)</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                6. Margem de Lucro Bruto ({calculos.margemLucroPercentual}%)
              </span>
              <div className="text-right">
                <span className="text-emerald-400 font-bold">{formatarMoeda(calculos.valorMargemLucro)}</span>
                <span className="text-slate-500 text-[10px] ml-2">({pctLucro.toFixed(1)}%)</span>
              </div>
            </div>

            {/* Total Global Highlight */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-sm font-bold text-amber-300">
              <span>VALOR GLOBAL DO ORÇAMENTO</span>
              <span className="text-base text-amber-400 font-mono">{formatarMoeda(calculos.valorGlobal)}</span>
            </div>
          </div>
        </div>

        {/* Right (5 cols): Client & Pathology Scope Summary */}
        <div className="lg:col-span-5 space-y-5">
          {/* Client Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2 pb-2 border-b border-slate-800">
              <Building2 className="w-4 h-4 text-amber-400" />
              Dados do Cliente Contratante
            </h3>
            <div className="text-xs space-y-1.5 text-slate-300">
              <div>
                <span className="text-slate-500">Condomínio:</span>{' '}
                <span className="font-semibold text-white">{dadosCliente.nomeCondominio || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-500">CNPJ:</span>{' '}
                <span className="font-mono text-slate-200">{dadosCliente.cnpj || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-500">Endereço:</span>{' '}
                <span className="text-slate-300">{dadosCliente.endereco || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-500">Síndico(a):</span>{' '}
                <span className="text-slate-200">{dadosCliente.nomeSindico || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-500">Edificação:</span>{' '}
                <span className="text-slate-200">{dadosCliente.anoConstrucao || 'Ano n/i'} • {dadosCliente.pavimentos || 'Pavimentos n/i'}</span>
              </div>
            </div>
          </div>

          {/* Pathology Scope Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2 pb-2 border-b border-slate-800">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Escopo Técnico Periciado (Passo 2)
            </h3>
            {anomalias.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Nenhuma fotografia foi analisada no Passo 2. O orçamento baseia-se no escopo padrão de restauração.
              </p>
            ) : (
              <div className="space-y-2">
                {anomalias.map((anom, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{anom.nome_patologia}</span>
                      <span className="text-[10px] font-mono text-amber-400 font-semibold">{anom.gravidade}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {anom.constatacao_visual || anom.descricao}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CONDIÇÕES COMERCIAIS, PARCELAMENTO E FATURAMENTO (EDITÁVEL PARA O PDF) */}
      {/* ===================================================================== */}
      <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Condições Comerciais, Pagamento e Faturamento da Proposta
              </h3>
              <p className="text-xs text-slate-400">
                Personalize a entrada, o parcelamento do saldo remanescente e as observações de faturamento. Todos os valores e textos aparecem explicitamente no PDF gerado.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateCondicoesComerciais({ parcelasSaldo: Math.max(1, calculos.mesesObra) })
              }
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              title="Igualar número de parcelas mensais ao prazo de meses da obra"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Usar Prazo da Obra ({calculos.mesesObra}x)</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateCondicoesComerciais(CONDICOES_COMERCIAIS_PADRAO)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-medium border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              title="Restaurar condições comerciais padrão de referência"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Padrão</span>
            </button>
          </div>
        </div>

        {/* Editable Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          {/* 1. Percentual de Entrada */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <label className="block font-bold text-slate-200 uppercase font-mono text-[11px]">
              1. Entrada / Sinal (%):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={condicoesComerciais.percentualEntrada}
                onChange={(e) =>
                  onUpdateCondicoesComerciais({
                    percentualEntrada: Math.min(100, Math.max(0, Number(e.target.value))),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono font-bold text-sm text-amber-400 focus:outline-none focus:border-amber-400"
              />
              <span className="font-mono font-bold text-slate-400">%</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
              Valor Entrada:{' '}
              <strong className="text-emerald-400 block text-xs">
                {formatarMoeda(parcelamento.valorEntradaTotal)}
              </strong>
            </div>
          </div>

          {/* 2. Parcelas da Entrada */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <label className="block font-bold text-slate-200 uppercase font-mono text-[11px]">
              2. Parcelas da Entrada:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="12"
                step="1"
                value={condicoesComerciais.parcelasEntrada}
                onChange={(e) =>
                  onUpdateCondicoesComerciais({
                    parcelasEntrada: Math.max(1, Math.round(Number(e.target.value) || 1)),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono font-bold text-sm text-white focus:outline-none focus:border-amber-400"
              />
              <span className="font-mono text-slate-400">x</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
              {parcelamento.parcelasEntrada === 1 ? 'À vista no ato:' : `${parcelamento.parcelasEntrada}x de:`}
              <strong className="text-slate-200 block text-xs">
                {formatarMoeda(parcelamento.valorParcelaEntrada)}
              </strong>
            </div>
          </div>

          {/* 3. Parcelas Mensais do Saldo Restante */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <label className="block font-bold text-slate-200 uppercase font-mono text-[11px]">
              3. Parcelas do Saldo ({parcelamento.percentualSaldo}%):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="60"
                step="1"
                value={condicoesComerciais.parcelasSaldo}
                onChange={(e) =>
                  onUpdateCondicoesComerciais({
                    parcelasSaldo: Math.max(1, Math.round(Number(e.target.value) || 1)),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono font-bold text-sm text-sky-400 focus:outline-none focus:border-amber-400"
              />
              <span className="font-mono text-slate-400">mensais</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
              {parcelamento.parcelasSaldo}x mensais de:
              <strong className="text-sky-300 block text-xs">
                {formatarMoeda(parcelamento.valorParcelaSaldo)}
              </strong>
            </div>
          </div>

          {/* 4. Forma de Pagamento */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <label className="block font-bold text-slate-200 uppercase font-mono text-[11px]">
              4. Modalidade de Pagamento:
            </label>
            <input
              type="text"
              value={condicoesComerciais.formaPagamento}
              onChange={(e) =>
                onUpdateCondicoesComerciais({ formaPagamento: e.target.value })
              }
              placeholder="Ex: Boleto Bancário / PIX / TED"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
              Saldo Restante:
              <strong className="text-slate-200 block text-xs">
                {formatarMoeda(parcelamento.valorSaldoTotal)}
              </strong>
            </div>
          </div>

          {/* 5. Validade da Proposta */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
            <label className="block font-bold text-slate-200 uppercase font-mono text-[11px]">
              5. Validade da Proposta:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="180"
                step="1"
                value={condicoesComerciais.prazoValidadeDias}
                onChange={(e) =>
                  onUpdateCondicoesComerciais({
                    prazoValidadeDias: Math.max(1, Math.round(Number(e.target.value) || 30)),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono font-bold text-sm text-white focus:outline-none focus:border-amber-400"
              />
              <span className="font-mono text-slate-400">dias</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
              Emissão c/ NF-e:
              <strong className="text-amber-400 block text-xs">Inclusa no Escopo</strong>
            </div>
          </div>
        </div>

        {/* Live Commercial Summary Strip */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-mono font-bold uppercase text-amber-300 block">
              Resumo do Fluxo de Pagamento que constará no PDF:
            </span>
            <p className="text-slate-200">
              <strong>Entrada ({parcelamento.percentualEntrada}%):</strong>{' '}
              {formatarMoeda(parcelamento.valorEntradaTotal)} (
              {parcelamento.parcelasEntrada === 1
                ? 'à vista na assinatura'
                : `em ${parcelamento.parcelasEntrada}x de ${formatarMoeda(parcelamento.valorParcelaEntrada)}`}
              ) • <strong>Saldo Restante ({parcelamento.percentualSaldo}%):</strong>{' '}
              {formatarMoeda(parcelamento.valorSaldoTotal)} em{' '}
              <strong>
                {parcelamento.parcelasSaldo}x parcelas mensais de{' '}
                {formatarMoeda(parcelamento.valorParcelaSaldo)}
              </strong>
              .
            </p>
          </div>
          <span className="font-mono text-[11px] text-amber-400 shrink-0 font-bold">
            Total: {formatarMoeda(calculos.valorGlobal)}
          </span>
        </div>

        {/* Editable Billing Observations */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-2 uppercase font-mono">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Observações de Faturamento, Medições e Notas Comerciais (Impresso no PDF):</span>
          </label>
          <textarea
            rows={3}
            value={condicoesComerciais.observacoesFaturamento}
            onChange={(e) =>
              onUpdateCondicoesComerciais({ observacoesFaturamento: e.target.value })
            }
            placeholder="Informe observações de faturamento, retenções fiscais, regras de medição quinzenal, dados bancários ou condições especiais..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <button
          onClick={onPrev}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Materiais e Equipe (Passo 3)</span>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCompartilharWhatsAppAtual}
            className="flex items-center gap-2 px-5 py-3.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>Compartilhar via WhatsApp</span>
          </button>

          <button
            onClick={onOpenPdf}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs sm:text-base font-extrabold rounded-xl shadow-xl shadow-amber-500/25 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Gerar Orçamento (PDF)</span>
          </button>
        </div>
      </div>

      {/* Kanban & Saved Budgets History Section */}
      {onUpdateStatusOrcamento &&
        onViewOrcamentoPdf &&
        onLoadOrcamento &&
        onDeleteOrcamento && (
          <div className="pt-4">
            <OrcamentosKanbanBoard
              orcamentos={orcamentosSalvos}
              activeOrcamentoId={activeOrcamentoId}
              onUpdateStatus={onUpdateStatusOrcamento}
              onViewOrcamentoPdf={onViewOrcamentoPdf}
              onLoadOrcamento={onLoadOrcamento}
              onDeleteOrcamento={onDeleteOrcamento}
              onClearAllOrcamentos={onClearAllOrcamentos}
              onSaveCurrentOrcamento={onSaveCurrentOrcamento}
              onRefreshCloud={onRefreshCloud}
              isSyncingCloud={isSyncingCloud}
            />
          </div>
        )}
    </div>
  );
};
