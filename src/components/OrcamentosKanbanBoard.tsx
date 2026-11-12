import React, { useState, useMemo } from 'react';
import {
  Kanban,
  ListFilter,
  Trash2,
  Eye,
  MessageCircle,
  Building2,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  FolderOpen,
  X,
  PlusCircle,
  Phone,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { OrcamentoSalvo, StatusOrcamentoKanban, WizardStep } from '../types';
import { WizardStepper } from './WizardStepper';
import { formatarMoeda, calcularParcelamentoComercial } from '../utils/budgetCalculator';
import {
  ETAPAS_KANBAN,
  obterConfigEtapaKanban,
  gerarLinkWhatsAppOrcamento,
} from '../utils/orcamentoKanbanUtils';
import { downloadProposalPdf } from '../utils/pdfGenerator';

interface OrcamentosKanbanBoardProps {
  orcamentos: OrcamentoSalvo[];
  activeOrcamentoId?: string | null;
  onUpdateStatus: (id: string, novoStatus: StatusOrcamentoKanban) => void;
  onViewOrcamentoPdf: (orcamento: OrcamentoSalvo) => void;
  onLoadOrcamento: (orcamento: OrcamentoSalvo) => void;
  onDeleteOrcamento: (id: string) => void;
  onClearAllOrcamentos?: () => void;
  onSaveCurrentOrcamento?: () => void;
  onRefreshCloud?: () => void;
  isSyncingCloud?: boolean;
  isModal?: boolean;
  onCloseModal?: () => void;
  currentStep?: WizardStep;
  isStepComplete?: (step: WizardStep) => boolean;
  onSelectStep?: (step: WizardStep) => void;
}

export const OrcamentosKanbanBoard: React.FC<OrcamentosKanbanBoardProps> = ({
  orcamentos,
  activeOrcamentoId,
  onUpdateStatus,
  onViewOrcamentoPdf,
  onLoadOrcamento,
  onDeleteOrcamento,
  onClearAllOrcamentos,
  onSaveCurrentOrcamento,
  onRefreshCloud,
  isSyncingCloud = false,
  isModal = false,
  onCloseModal,
  currentStep,
  isStepComplete,
  onSelectStep,
}) => {
  const [modoVisualizacao, setModoVisualizacao] = useState<'kanban' | 'lista'>('kanban');
  const [busca, setBusca] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<StatusOrcamentoKanban | 'todos'>('todos');

  const orcamentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return orcamentos.filter((orc) => {
      if (filtroEtapa !== 'todos' && orc.status !== filtroEtapa) return false;
      if (!termo) return true;
      const cond = (orc.dadosCliente.nomeCondominio || '').toLowerCase();
      const sind = (orc.dadosCliente.nomeSindico || '').toLowerCase();
      const cnpj = (orc.dadosCliente.cnpj || '').toLowerCase();
      const id = (orc.id || '').toLowerCase();
      return (
        cond.includes(termo) ||
        sind.includes(termo) ||
        cnpj.includes(termo) ||
        id.includes(termo)
      );
    });
  }, [orcamentos, busca, filtroEtapa]);

  // Métricas consolidadas do pipeline
  const metricas = useMemo(() => {
    const totalPropostas = orcamentos.length;
    const valorTotalGeral = orcamentos.reduce((acc, o) => acc + (o.calculos?.valorGlobal || 0), 0);
    const emNegociacao = orcamentos.filter(
      (o) => o.status === 'enviado_sindico' || o.status === 'aguardando_aprovacao'
    );
    const valorEmNegociacao = emNegociacao.reduce(
      (acc, o) => acc + (o.calculos?.valorGlobal || 0),
      0
    );
    const aprovados = orcamentos.filter((o) => o.status === 'aprovado');
    const valorAprovado = aprovados.reduce((acc, o) => acc + (o.calculos?.valorGlobal || 0), 0);

    return {
      totalPropostas,
      valorTotalGeral,
      qtdEmNegociacao: emNegociacao.length,
      valorEmNegociacao,
      qtdAprovados: aprovados.length,
      valorAprovado,
    };
  }, [orcamentos]);

  const moverEtapa = (orcamento: OrcamentoSalvo, direcao: -1 | 1) => {
    const idxAtual = ETAPAS_KANBAN.findIndex((e) => e.id === orcamento.status);
    if (idxAtual === -1) return;
    const novoIdx = idxAtual + direcao;
    if (novoIdx >= 0 && novoIdx < ETAPAS_KANBAN.length) {
      onUpdateStatus(orcamento.id, ETAPAS_KANBAN[novoIdx].id);
    }
  };

  const handleCompartilharWhatsApp = (orcamento: OrcamentoSalvo) => {
    const totalPatologias =
      orcamento.registrosVistoria && orcamento.registrosVistoria.length > 0
        ? orcamento.registrosVistoria.length
        : (orcamento.diagnostico?.anomalias || orcamento.diagnostico?.patologias || []).length;

    const url = gerarLinkWhatsAppOrcamento({
      id: orcamento.id,
      status: orcamento.status,
      dadosCliente: orcamento.dadosCliente,
      calculos: orcamento.calculos,
      condicoesComerciais: orcamento.condicoesComerciais,
      totalPatologias,
    });

    // 1. Abre imediatamente o link do WhatsApp com a mensagem executiva formatada
    window.open(url, '_blank', 'noopener,noreferrer');

    // 2. Simultaneamente carrega os dados deste orçamento no template #pdf-content e dispara o download do arquivo PDF
    onLoadOrcamento(orcamento);
    const cleanCondo = (orcamento.dadosCliente.nomeCondominio || 'Condominio')
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim();
    const safeName = cleanCondo ? cleanCondo.replace(/\s+/g, '-') : 'Condominio';

    setTimeout(() => {
      void downloadProposalPdf({
        elementId: 'pdf-content',
        filename: `Orcamento-Renovar-${safeName}.pdf`,
      }).catch((err) => {
        console.error('Erro ao baixar PDF ao compartilhar no WhatsApp:', err);
      });
    }, 150);
  };

  const renderCardOrcamento = (orc: OrcamentoSalvo) => {
    const idxEtapa = ETAPAS_KANBAN.findIndex((e) => e.id === orc.status);
    const configEtapa = obterConfigEtapaKanban(orc.status);
    const parcelamento = calcularParcelamentoComercial(
      orc.calculos.valorGlobal,
      orc.condicoesComerciais
    );
    const isAtivo = activeOrcamentoId === orc.id;

    return (
      <div
        key={orc.id}
        className={`rounded-2xl bg-slate-950/90 border p-4 shadow-lg transition flex flex-col justify-between gap-3 ${
          isAtivo
            ? 'border-amber-400/80 ring-1 ring-amber-400/30'
            : 'border-slate-800/90 hover:border-slate-700'
        }`}
      >
        {/* Top Row: ID + Date + Delete */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-amber-400 border border-slate-800">
              {orc.id}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(orc.dataCriacao).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <button
                type="button"
                onClick={() => onDeleteOrcamento(orc.id)}
                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                title="Excluir orçamento do histórico"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Condominium & Síndico */}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white leading-snug flex items-start gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">
                {orc.dadosCliente.nomeCondominio || 'Condomínio Não Informado'}
              </span>
            </h4>
            {orc.dadosCliente.nomeSindico && (
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <User className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">Síndico(a): {orc.dadosCliente.nomeSindico}</span>
              </p>
            )}
            {orc.dadosCliente.telefone && (
              <p className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-slate-600 shrink-0" />
                <span>{orc.dadosCliente.telefone}</span>
              </p>
            )}
          </div>

          {/* Value & Payment Summary Box */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400">Valor Global:</span>
              <span className="text-sm font-black font-mono text-amber-400">
                {formatarMoeda(orc.calculos.valorGlobal)}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>Prazo: {orc.calculos.mesesObra} meses</span>
              <span>
                {parcelamento.percentualEntrada}% ent. + {parcelamento.parcelasSaldo}x
              </span>
            </div>
          </div>

          {/* Stage Selector + Arrow Controls */}
          <div className="pt-1 space-y-1.5">
            <label className="block text-[10px] font-mono uppercase text-slate-400">
              Estágio do Orçamento:
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={idxEtapa <= 0}
                onClick={() => moverEtapa(orc, -1)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-slate-800 transition cursor-pointer"
                title="Voltar para etapa anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <select
                value={orc.status}
                onChange={(e) =>
                  onUpdateStatus(orc.id, e.target.value as StatusOrcamentoKanban)
                }
                aria-label={`Status do orçamento ${orc.id}`}
                className={`flex-1 text-[11px] font-bold rounded-lg px-2 py-1.5 border focus:outline-none cursor-pointer ${configEtapa.badgeClass}`}
              >
                {ETAPAS_KANBAN.map((etapa) => (
                  <option
                    key={etapa.id}
                    value={etapa.id}
                    className="bg-slate-900 text-slate-100"
                  >
                    {etapa.titulo}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={idxEtapa >= ETAPAS_KANBAN.length - 1}
                onClick={() => moverEtapa(orc, 1)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 border border-slate-800 transition cursor-pointer"
                title="Avançar para próxima etapa"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons: PDF, Load & 1-Click WhatsApp */}
        <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5">
          <button
            type="button"
            onClick={() => handleCompartilharWhatsApp(orc)}
            className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Enviar status e resumo da proposta diretamente para o WhatsApp do síndico"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Enviar Status no WhatsApp</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onViewOrcamentoPdf(orc)}
              className="py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
              title="Visualizar e baixar o PDF deste orçamento"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver PDF</span>
            </button>

            <button
              type="button"
              onClick={() => onLoadOrcamento(orc)}
              className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
              title="Carregar os dados deste orçamento na calculadora para edição"
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Editar</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const content = (
    <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Kanban className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Gestão de Orçamentos & Painel Kanban de Acompanhamento
              </h3>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {orcamentos.length} {orcamentos.length === 1 ? 'proposta na nuvem' : 'propostas na nuvem'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Cloud className="w-3 h-3 text-emerald-400" />
                {isSyncingCloud ? 'Sincronizando Google Sheets...' : 'Google Sheets Cloud Ativo'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Persistência em nuvem via Google Sheets com acompanhamento de etapas Kanban e envio em 1 clique para o WhatsApp do síndico.
            </p>
          </div>
        </div>

        {/* Controls: Refresh Cloud, Save current, View toggle, Clear all, Close modal */}
        <div className="flex items-center flex-wrap gap-2">
          {onRefreshCloud && (
            <button
              type="button"
              disabled={isSyncingCloud}
              onClick={onRefreshCloud}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-sky-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Recarregar orçamentos diretamente da planilha no Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'Sincronizando...' : 'Atualizar da Nuvem'}</span>
            </button>
          )}

          {onSaveCurrentOrcamento && (
            <button
              type="button"
              onClick={onSaveCurrentOrcamento}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Salvar o orçamento atual na planilha do Google Sheets"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Salvar na Planilha</span>
            </button>
          )}

          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setModoVisualizacao('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                modoVisualizacao === 'kanban'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setModoVisualizacao('lista')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                modoVisualizacao === 'lista'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {orcamentos.length > 0 && onClearAllOrcamentos && (
            <button
              type="button"
              onClick={onClearAllOrcamentos}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Limpar todos os orçamentos salvos"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar Histórico</span>
            </button>
          )}

          {isModal && onCloseModal && (
            <button
              type="button"
              onClick={onCloseModal}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Fechar Painel"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">
              Volume Total Orçado ({metricas.totalPropostas})
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-white">
              {formatarMoeda(metricas.valorTotalGeral)}
            </span>
          </div>
          <FileSpreadsheet className="w-7 h-7 text-slate-700" />
        </div>

        <div className="p-3.5 rounded-2xl bg-sky-950/20 border border-sky-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-sky-300 block">
              Em Análise / Aprovação ({metricas.qtdEmNegociacao})
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-sky-300">
              {formatarMoeda(metricas.valorEmNegociacao)}
            </span>
          </div>
          <Clock className="w-7 h-7 text-sky-500/40" />
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-emerald-300 block">
              Orçamentos Aprovados ({metricas.qtdAprovados})
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
              {formatarMoeda(metricas.valorAprovado)}
            </span>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-500/40" />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por condomínio, síndico, CNPJ ou código da proposta (ex: PROP-2026)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 shrink-0">Filtrar Etapa:</span>
          <select
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value as StatusOrcamentoKanban | 'todos')}
            aria-label="Filtrar orçamentos por etapa"
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="todos">Todas as Etapas ({orcamentos.length})</option>
            {ETAPAS_KANBAN.map((etapa) => {
              const count = orcamentos.filter((o) => o.status === etapa.id).length;
              return (
                <option key={etapa.id} value={etapa.id}>
                  {etapa.titulo} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {orcamentos.length === 0 ? (
        <div className="rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 p-10 text-center space-y-3">
          <Kanban className="w-10 h-10 text-amber-400/50 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-200">
              Nenhum orçamento registrado no histórico ainda
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              A proposta aparece aqui depois de ser salva na planilha ou concluída na Etapa 4.
            </p>
          </div>
        </div>
      ) : modoVisualizacao === 'kanban' ? (
        /* KANBAN COLUMNS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
          {ETAPAS_KANBAN.map((etapa) => {
            const itensColuna = orcamentosFiltrados.filter((o) => o.status === etapa.id);
            const somaColuna = itensColuna.reduce(
              (acc, o) => acc + (o.calculos?.valorGlobal || 0),
              0
            );

            return (
              <div
                key={etapa.id}
                className="rounded-2xl bg-slate-950/50 border border-slate-800/90 flex flex-col min-h-[320px]"
              >
                {/* Column Header */}
                <div className={`p-3.5 rounded-t-2xl border-b ${etapa.headerBorderClass}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${etapa.dotClass}`} />
                      <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                        {etapa.titulo}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-950/90 text-slate-200 border border-slate-700">
                      {itensColuna.length}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="truncate">{etapa.descricaoCurta}</span>
                  </div>
                  <div className="mt-1 text-xs font-mono font-bold text-slate-200">
                    {formatarMoeda(somaColuna)}
                  </div>
                </div>

                {/* Column Cards */}
                <div className="p-3 space-y-3 flex-1">
                  {itensColuna.length === 0 ? (
                    <div className="h-36 rounded-xl border border-dashed border-slate-800/70 flex items-center justify-center p-4 text-center">
                      <span className="text-[11px] text-slate-600 font-mono">
                        Nenhum orçamento em "{etapa.titulo}"
                      </span>
                    </div>
                  ) : (
                    itensColuna.map((orc) => renderCardOrcamento(orc))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 font-mono text-[11px] uppercase text-slate-400">
                <th className="py-3 px-4">ID / Data</th>
                <th className="py-3 px-4">Condomínio / Síndico</th>
                <th className="py-3 px-4">Valor Global</th>
                <th className="py-3 px-4">Etapa Kanban</th>
                <th className="py-3 px-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {orcamentosFiltrados.map((orc) => {
                const configEtapa = obterConfigEtapaKanban(orc.status);
                return (
                  <tr key={orc.id} className="hover:bg-slate-900/50 transition">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-amber-400">{orc.id}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(orc.dataCriacao).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">
                        {orc.dadosCliente.nomeCondominio || 'Condomínio Não Informado'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Síndico(a): {orc.dadosCliente.nomeSindico || '—'}{' '}
                        {orc.dadosCliente.telefone ? `• ${orc.dadosCliente.telefone}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-amber-400 text-sm">
                        {formatarMoeda(orc.calculos.valorGlobal)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Prazo: {orc.calculos.mesesObra} meses
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={orc.status}
                        onChange={(e) =>
                          onUpdateStatus(orc.id, e.target.value as StatusOrcamentoKanban)
                        }
                        aria-label={`Alterar status do orçamento ${orc.id}`}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:outline-none cursor-pointer ${configEtapa.badgeClass}`}
                      >
                        {ETAPAS_KANBAN.map((etapa) => (
                          <option
                            key={etapa.id}
                            value={etapa.id}
                            className="bg-slate-900 text-slate-100"
                          >
                            {etapa.titulo}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCompartilharWhatsApp(orc)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                          title="Enviar pelo WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewOrcamentoPdf(orc)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                          title="Visualizar PDF"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onLoadOrcamento(orc)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                          title="Carregar orçamento no editor"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteOrcamento(orc.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Excluir orçamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-sm p-3 sm:p-6 flex items-start justify-center no-print">
        <div className="w-full max-w-7xl my-4 space-y-4">
          {currentStep !== undefined && isStepComplete && onSelectStep && (
            <WizardStepper
              currentStep={currentStep}
              isStepComplete={isStepComplete}
              onSelectStep={onSelectStep}
            />
          )}
          {content}
        </div>
      </div>
    );
  }

  return content;
};
