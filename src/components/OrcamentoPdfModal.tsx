import React, { useMemo, useState } from 'react';
import {
  X,
  Printer,
  Download,
  Loader2,
  ShieldAlert,
  FileSpreadsheet,
  Building2,
  User,
  HardHat,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Layers,
  Award,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Camera,
  CheckCircle,
  FileText,
  Hammer,
  Wrench,
  BookOpen,
  MessageCircle,
} from 'lucide-react';
import {
  DadosCliente,
  CalculosOrcamento,
  DiagnosticoResponse,
  ItemMaterial,
  CargoProfissional,
  HistoricoInspecao,
  PatologiaItem,
  CondicoesComerciais,
  StatusOrcamentoKanban,
} from '../types';
import {
  formatarMoeda,
  calcularParcelamentoComercial,
  CONDICOES_COMERCIAIS_PADRAO,
} from '../utils/budgetCalculator';
import { downloadProposalPdf } from '../utils/pdfGenerator';
import { enviarOrcamentoWebhook } from '../services/webhookService';
import {
  ETAPAS_KANBAN,
  obterConfigEtapaKanban,
  gerarLinkWhatsAppOrcamento,
} from '../utils/orcamentoKanbanUtils';

interface OrcamentoPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  dadosCliente: DadosCliente;
  diagnostico: DiagnosticoResponse | null;
  selectedImage: string | null;
  historico?: HistoricoInspecao[];
  materiais: ItemMaterial[];
  equipe: CargoProfissional[];
  calculos: CalculosOrcamento;
  condicoesComerciais?: CondicoesComerciais;
  orcamentoIdProp?: string | null;
  statusOrcamento?: StatusOrcamentoKanban;
  onUpdateStatusOrcamento?: (novoStatus: StatusOrcamentoKanban) => void;
}

export const OrcamentoPdfModal: React.FC<OrcamentoPdfModalProps> = ({
  isOpen,
  onClose,
  dadosCliente,
  diagnostico,
  selectedImage,
  historico = [],
  materiais,
  equipe,
  calculos,
  condicoesComerciais = CONDICOES_COMERCIAIS_PADRAO,
  orcamentoIdProp = null,
  statusOrcamento = 'em_elaboracao',
  onUpdateStatusOrcamento,
}) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const parcelamento = useMemo(
    () => calcularParcelamentoComercial(calculos.valorGlobal, condicoesComerciais),
    [calculos.valorGlobal, condicoesComerciais]
  );
  const validadeDias = condicoesComerciais?.prazoValidadeDias || 30;

  const fallbackOrcamentoId = useMemo(
    () => `PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    []
  );
  const orcamentoId = orcamentoIdProp || fallbackOrcamentoId;

  // Compila exclusivamente os registros correspondentes às fotos enviadas pelo usuário (1 foto = 1 registro patológico, sem duplicação nem itens vazios)
  const inspectionsList = useMemo(() => {
    const list: {
      id: string;
      imageUrl: string;
      nomeArquivo: string;
      dataHora?: string;
      anomalia: PatologiaItem;
    }[] = [];

    const seenImages = new Set<string>();

    // 1. Prioriza os registros de fotos enviadas na vistoria atual (em ordem de envio)
    if (historico && historico.length > 0) {
      historico.forEach((h, idx) => {
        const items = h.resultado?.anomalias || h.resultado?.patologias || [];
        const imgUrl = h.imagemUrl?.trim() || '';
        if (imgUrl && items.length > 0 && !seenImages.has(imgUrl)) {
          seenImages.add(imgUrl);
          list.push({
            id: h.id || `foto-${idx + 1}`,
            imageUrl: imgUrl,
            nomeArquivo: h.nomeArquivo || `Registro Fotográfico ${list.length + 1}`,
            dataHora: h.dataHora,
            anomalia: items[0],
          });
        }
      });
    }

    // 2. Caso a imagem selecionada atual ainda não esteja na lista acima, adiciona como registro único
    const currentItems = diagnostico?.anomalias || diagnostico?.patologias || [];
    const currentImg = selectedImage?.trim() || '';
    if (currentImg && currentItems.length > 0 && !seenImages.has(currentImg)) {
      seenImages.add(currentImg);
      list.push({
        id: 'atual',
        imageUrl: currentImg,
        nomeArquivo: `Registro Fotográfico ${list.length + 1}`,
        dataHora: new Date().toISOString(),
        anomalia: currentItems[0],
      });
    }

    return list;
  }, [diagnostico, selectedImage, historico]);

  const dataAtualExtenso = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const cleanCondo = (dadosCliente.nomeCondominio || 'Condominio')
    .replace(/[/\\?%*:|"<>]/g, '')
    .trim();

  // Download direto do arquivo .pdf utilizando cópia isolada do container da proposta
  const handleDownloadPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isDownloadingPdf) return;

    setIsDownloadingPdf(true);
    try {
      // Dispara o POST em JSON para o webhook do n8n no momento da geração do PDF
      void enviarOrcamentoWebhook({
        orcamentoId,
        dadosCliente,
        calculos,
        condicoesComerciais,
        materiais,
        equipe,
        diagnostico,
        registrosVistoria: historico,
        origemAcionamento: 'baixar_pdf_modal',
      });

      const safeName = cleanCondo ? cleanCondo.replace(/\s+/g, '-') : 'Condominio';
      await downloadProposalPdf({
        elementId: 'pdf-content',
        filename: `Orcamento-Renovar-${safeName}.pdf`,
      });
    } catch (err) {
      console.error('Erro ao gerar o PDF da proposta:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const totalPatologias = inspectionsList.length;

  // Ação simultânea ao clicar no botão WhatsApp: baixa o PDF para o dispositivo e abre o WhatsApp com o texto formatado
  const handleShareWhatsAppAndDownloadPdf = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const url = gerarLinkWhatsAppOrcamento({
      id: orcamentoId,
      status: statusOrcamento,
      dadosCliente,
      calculos,
      condicoesComerciais,
      totalPatologias,
    });

    // 1. Abre imediatamente a janela/aba do WhatsApp com a mensagem executiva formatada
    window.open(url, '_blank', 'noopener,noreferrer');

    // 2. Simultaneamente dispara o download automático do arquivo PDF do orçamento
    void handleDownloadPdf();
  };

  // Corporate Renovar Header Component for Inner Pages
  const DocumentHeader = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
    <div className="border-b-2 border-slate-900 pb-3 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-slate-950 flex items-center justify-center text-amber-400 font-black text-xs">
          R
        </div>
        <span className="font-extrabold text-slate-950 tracking-tight text-xs uppercase font-mono">
          Renovar Engenharia Diagnóstica
        </span>
        <span className="text-slate-300 mx-1">|</span>
        <span className="text-slate-600 text-[11px] truncate max-w-xs">
          {dadosCliente.nomeCondominio || 'Proposta Técnica'}
        </span>
      </div>
      <div className="font-mono text-[10px] text-slate-500">
        Pág. {pageNum} de {totalPages} • {orcamentoId}
      </div>
    </div>
  );

  // Corporate Renovar Footer Component for Inner Pages
  const DocumentFooter = () => (
    <div className="border-t border-slate-200 pt-3 mt-8 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-slate-500">
      <div>Renovar Engenharia de Fachadas • CREA/SP nº 124.987-D</div>
      <div>Validade: {validadeDias} dias • Emissão: {dataAtualExtenso}</div>
    </div>
  );

  return (
    <div
      id="print-proposal-modal"
      aria-hidden={!isOpen}
      className={
        isOpen
          ? 'print-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/95 flex flex-col items-center p-3 sm:p-6 print:static print:inset-auto print:p-0 print:m-0 print:block print:bg-white print:overflow-visible print:h-auto print:min-h-0 print:max-h-none print:w-full print:border-none print:shadow-none'
          : 'fixed -left-[20000px] top-0 w-[850px] pointer-events-none overflow-hidden opacity-0 no-print'
      }
    >
      {isOpen && (
        <style>{`@media print { body * { visibility: hidden; } #pdf-content, #pdf-content * { visibility: visible; } #pdf-content { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
      )}

      {/* Barra Superior Única de Ações (Sempre Oculta na Impressão) */}
      {isOpen && (
        <header className="sticky top-0 z-50 w-full max-w-4xl bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-2xl px-4 sm:px-6 py-3.5 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-2xl no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-sm">
              R
            </div>
            <div>
              <div className="text-white font-bold text-xs sm:text-sm tracking-tight uppercase flex items-center gap-2">
                <span>Renovar Engenharia • Proposta</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                  {orcamentoId}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono hidden sm:block truncate max-w-sm">
                {dadosCliente.nomeCondominio || 'Condomínio'} • Formato A4
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {onUpdateStatusOrcamento && (
              <select
                value={statusOrcamento}
                onChange={(e) =>
                  onUpdateStatusOrcamento(e.target.value as StatusOrcamentoKanban)
                }
                aria-label="Status do orçamento"
                className={`text-xs font-bold rounded-xl px-2.5 py-2 border focus:outline-none cursor-pointer ${obterConfigEtapaKanban(statusOrcamento).badgeClass}`}
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
            )}

            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={handleShareWhatsAppAndDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-70 text-emerald-300 border border-emerald-500/40 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              title="Baixar automaticamente o PDF do orçamento e abrir o WhatsApp do síndico com a mensagem pronta"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>{isDownloadingPdf ? 'Baixando PDF + WhatsApp...' : 'WhatsApp + PDF'}</span>
            </button>

            <button
              type="button"
              id="btn-download-pdf"
              disabled={isDownloadingPdf}
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-70 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-xl transition transform active:scale-95 cursor-pointer"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Baixar Orçamento (PDF)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer"
              title="Fechar Visualização"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>
      )}

      {/* Multipage Document Container */}
      <div
        id="pdf-content"
        className="print-document-container w-full max-w-4xl space-y-8 print:w-full print:max-w-none print:m-0 print:p-0 print:space-y-0 print:block"
      >
        {/* ========================================================================= */}
        {/* PÁGINA 1: CAPA E IDENTIFICAÇÃO DO CONDOMÍNIO                              */}
        {/* ========================================================================= */}
        <section className="print-document-sheet page-break-after bg-white text-slate-900 shadow-2xl rounded-2xl p-8 sm:p-14 min-h-[1050px] flex flex-col justify-between border border-slate-200 relative overflow-hidden print:min-h-0 print:h-auto print:max-h-none print:overflow-visible print:block print:p-0 print:border-none print:shadow-none print:rounded-none">
          {/* Top Decorative Header with Renovar Corporate Logo */}
          <div>
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
              <div className="flex items-center gap-4">
                {/* Logomarca Renovar */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black shadow-lg">
                    <span className="text-2xl font-black font-sans tracking-tighter text-amber-400">
                      R
                    </span>
                  </div>
                  <div>
                    <div className="text-xl font-black tracking-tight text-slate-950 uppercase font-sans">
                      RENOVAR
                    </div>
                    <div className="text-[10px] font-bold text-amber-600 tracking-widest uppercase font-mono">
                      Engenharia Diagnóstica & Restauração
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-[11px] text-slate-600">
                <div className="font-bold text-slate-900">CREA/SP: 124.987-D</div>
                <div>ART de Execução nº 2026/89412</div>
              </div>
            </div>

            {/* Document Title Block */}
            <div className="mt-14 sm:mt-20 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-mono text-xs font-bold uppercase tracking-wider">
                <Award className="w-4 h-4 text-amber-600" />
                Orçamento Técnico e Comercial Oficial
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight uppercase leading-tight font-sans">
                Proposta Técnica e Comercial
              </h1>

              <div className="text-lg sm:text-2xl font-bold text-amber-600 uppercase tracking-tight">
                Restauração de Fachadas, Tratamento de Patologias & Pintura Predial
              </div>

              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                Elaborada com rigor metodológico conforme as normas brasileiras{' '}
                <strong>ABNT NBR 16747</strong> (Inspeção Predial), <strong>NBR 13755</strong>{' '}
                (Revestimentos Cerâmicos e Argamassados de Fachada) e <strong>NBR 9575</strong>{' '}
                (Impermeabilização).
              </p>
            </div>
          </div>

          {/* Client & Building Identification Box */}
          <div className="my-6 space-y-6">
            <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-6 sm:p-8">
              <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-900" />
                  Dados do Condomínio Contratante
                </span>
                <span className="text-slate-900 font-bold">Proposta nº {orcamentoId}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wide">
                    Nome do Condomínio / Edifício:
                  </span>
                  <span className="font-extrabold text-slate-950 text-base">
                    {dadosCliente.nomeCondominio || 'Condomínio Residencial'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wide">
                    CNPJ:
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {dadosCliente.cnpj || 'Não informado'}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wide">
                    Endereço da Obra:
                  </span>
                  <span className="font-medium text-slate-900">
                    {dadosCliente.endereco || 'Não informado'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wide">
                    Nome do Síndico(a) / Gestor:
                  </span>
                  <span className="font-semibold text-slate-900">
                    {dadosCliente.nomeSindico || 'Administração Condominial'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] uppercase tracking-wide">
                    Características da Edificação:
                  </span>
                  <span className="font-medium text-slate-900">
                    {dadosCliente.pavimentos ? `${dadosCliente.pavimentos} Pavimentos` : 'Porte Médio/Alto'}{' '}
                    • {dadosCliente.anoConstrucao ? `Construído em ${dadosCliente.anoConstrucao}` : 'Ano a vistoriar'}
                  </span>
                </div>

                {dadosCliente.telefone && (
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wide">
                      Telefone de Contato:
                    </span>
                    <span className="font-mono text-slate-900">{dadosCliente.telefone}</span>
                  </div>
                )}

                {dadosCliente.email && (
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wide">
                      E-mail:
                    </span>
                    <span className="font-mono text-slate-900">{dadosCliente.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Cover Metadata */}
          <div className="border-t border-slate-200 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono text-slate-600 gap-2">
            <div>
              <span className="font-bold text-slate-900">Data de Emissão:</span> {dataAtualExtenso}
            </div>
            <div>
              <span className="font-bold text-slate-900">Validade da Proposta:</span> {validadeDias} dias
            </div>
            <div>
              <span className="font-bold text-slate-900">Prazo Estimado de Execução:</span> {calculos.mesesObra} meses
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PÁGINA 2: APRESENTAÇÃO E CULTURA INSTITUCIONAL (MISSÃO E 3 PILARES)        */}
        {/* ========================================================================= */}
        <section className="print-document-sheet page-break-after bg-white text-slate-900 shadow-2xl rounded-2xl p-8 sm:p-14 min-h-[1050px] border border-slate-200 flex flex-col justify-between print:min-h-0 print:h-auto print:max-h-none print:overflow-visible print:block print:p-0 print:border-none print:shadow-none print:rounded-none">
          <div>
            <DocumentHeader pageNum={2} totalPages={6} />

            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight mb-2">
              Apresentação e Cultura Institucional
            </h2>
            <div className="w-16 h-1 bg-amber-500 mb-6" />

            {/* Carta de Apresentação */}
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3.5 mb-6 text-justify">
              <p>
                A <strong>Renovar Engenharia</strong> é uma empresa especializada em engenharia diagnóstica, recuperação estrutural e restauração de fachadas prediais de alto padrão. Atuamos há anos proporcionando soluções definitivas para condomínios residenciais e comerciais, aliando capacidade técnica de ponta à gestão transparente e humanizada de canteiros de obra.
              </p>
              <p>
                Nossa atuação é estritamente pautada pelo cumprimento rigoroso das normas da <strong>ABNT</strong> e das Normas Regulamentadoras de Segurança do Trabalho do Ministério do Trabalho. Tratamos cada condomínio com exclusividade, realizando vistorias profundas das causas das anomalias antes de prescrever qualquer tipo de intervenção estética.
              </p>
            </div>

            {/* Missão */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl mb-6">
              <span className="text-[11px] font-mono font-bold text-amber-900 uppercase block mb-1">
                Nossa Missão:
              </span>
              <p className="text-xs sm:text-sm text-slate-800 italic leading-relaxed">
                "Preservar o patrimônio arquitetônico e estrutural das edificações com soluções definitivas de engenharia diagnóstica, garantindo segurança patrimonial e humana com excelência técnica, previsibilidade orçamentária e total tranquilidade para a gestão condominial."
              </p>
            </div>

            {/* Três Pilares Inegociáveis */}
            <div className="space-y-4">
              <h3 className="text-sm font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Os Três Pilares Inegociáveis da Renovar:
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Pilar 1 */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-slate-950 uppercase text-xs">
                    1. Segurança acima de tudo
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Foco intransigente em <strong>Zero Acidentes</strong>. Cumprimento estrito das normas <strong>NR-18</strong> e <strong>NR-35</strong>. Balancins elétricos com cabos secundários e travas de segurança automáticas (blockstop), linhas de vida verticais de aço independentes, exames médicos periódicos (ASO específico para altura) e treinamentos diários de segurança com nossa equipe.
                  </p>
                </div>

                {/* Pilar 2 */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-slate-950 uppercase text-xs">
                    2. Qualidade como padrão mínimo
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Rigor técnico normativo absoluto. Emprego exclusivo de insumos e matérias-primas homologadas pelas normas da ABNT: argamassas poliméricas tixotrópicas reforçadas com fibras, passivadores anticorrosivos para armaduras expostas, mástiques de poliuretano de alta elasticidade e tintas elastoméricas com memória mecânica.
                  </p>
                </div>

                {/* Pilar 3 */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-slate-950 uppercase text-xs">
                    3. Respeito no dia a dia da obra
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Comunicação constante e transparente com o síndico e moradores, envio de relatórios quinzenais com fotos de evolução física da obra, respeito irrevogável aos horários de silêncio e repouso, conduta ética irrepreensível dos operários e isolamento seguro e limpo de garagens e áreas de circulação comuns.
                  </p>
                </div>
              </div>
            </div>

            {/* Banner de Valorização Patrimonial */}
            <div className="mt-6 p-4 rounded-xl bg-slate-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                  Garantia de Retorno do Investimento
                </span>
                <div className="text-xs sm:text-sm font-bold text-slate-100">
                  Estanqueidade Absoluta + Proteção Estrutural + Valorização de até 20% do Imóvel
                </div>
              </div>
              <div className="text-xs font-mono text-amber-300 font-bold px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 shrink-0">
                Garantia de 5 Anos
              </div>
            </div>
          </div>

          <DocumentFooter />
        </section>

        {/* ========================================================================= */}
        {/* PÁGINA 3+: LAUDO PATOLÓGICO FOTOGRÁFICO (CRÍTICO & DINÂMICO)               */}
        {/* ========================================================================= */}
        <section className="print-document-sheet page-break-after bg-white text-slate-900 shadow-2xl rounded-2xl p-8 sm:p-14 min-h-[1050px] border border-slate-200 flex flex-col justify-between print:min-h-0 print:h-auto print:max-h-none print:overflow-visible print:block print:p-0 print:border-none print:shadow-none print:rounded-none">
          <div>
            <DocumentHeader pageNum={3} totalPages={6} />

            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight mb-2">
                Laudo Pericial Fotográfico de Campo
              </h2>
              <div className="w-16 h-1 bg-amber-500 mb-3" />
              <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                Mapeamento das manifestações patológicas inspecionadas na edificação. Análise pericial orientada pelas diretrizes da{' '}
                <strong>ABNT NBR 16747</strong> (Inspeção Predial). Cada anomalia contém foto detalhada, constatação visual, causa provável, risco evolutivo de degradação, normas ABNT aplicáveis e as diretrizes de reparo.
              </p>
            </div>

            {/* Renderiza exatamente 1 registro patológico por foto enviada pelo usuário */}
            {inspectionsList.length > 0 ? (
              <div className="space-y-6">
                {inspectionsList.map((insp, inspIndex) => {
                  const anom = insp.anomalia;
                  const gravidadeColor =
                    anom.gravidade === 'Crítica'
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : anom.gravidade === 'Alta'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-blue-50 text-blue-700 border-blue-300';

                  return (
                    <div
                      key={insp.id}
                      className="avoid-break border-2 border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 p-5 space-y-4 shadow-sm"
                    >
                      {/* Finding Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                            {inspIndex + 1}
                          </span>
                          <h3 className="font-extrabold text-slate-950 text-sm sm:text-base uppercase tracking-tight">
                            {anom.nome_patologia}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span
                            className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${gravidadeColor}`}
                          >
                            Gravidade: {anom.gravidade || 'Média'}
                          </span>
                        </div>
                      </div>

                      {/* Two Columns: Photo (50%) & Technical Findings (50%) */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                        {/* Image Column */}
                        <div className="md:col-span-5 space-y-2">
                          <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-900 shadow-inner">
                            <img
                              src={insp.imageUrl}
                              alt={anom.nome_patologia}
                              className="w-full h-auto max-h-[300px] object-cover mx-auto"
                            />
                            <div className="bg-slate-950 px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span className="truncate max-w-[160px]">{insp.nomeArquivo}</span>
                              <span className="text-amber-400">Foto #{inspIndex + 1}</span>
                            </div>
                          </div>

                          {/* Applied ABNT Standards */}
                          {anom.normas_tecnicas_abnt && anom.normas_tecnicas_abnt.length > 0 && (
                            <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                              <span className="text-[10px] font-mono font-bold text-slate-600 block mb-1 uppercase">
                                Normas ABNT Aplicáveis:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {anom.normas_tecnicas_abnt.map((norma, nIdx) => (
                                  <span
                                    key={nIdx}
                                    className="px-1.5 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-mono rounded border border-slate-200"
                                  >
                                    {norma}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Technical Details Column */}
                        <div className="md:col-span-7 space-y-2.5 text-xs">
                          {/* Constatação Visual */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-1 text-slate-800">
                              <CheckCircle className="w-3.5 h-3.5 text-amber-600" />
                              Constatação Visual:
                            </h4>
                            <p className="text-slate-700 leading-relaxed text-[11px] sm:text-xs">
                              {anom.constatacao_visual || anom.descricao}
                            </p>
                          </div>

                          {/* Causa Provável */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-1 text-slate-800">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                              Causa Provável (Justificativa Técnica):
                            </h4>
                            <p className="text-slate-700 leading-relaxed text-[11px] sm:text-xs">
                              {anom.justificativa_tecnica_causa || anom.causa_provavel}
                            </p>
                          </div>

                          {/* Risco Evolutivo */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            <h4 className="font-bold text-rose-800 text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              Risco Evolutivo e Consequências:
                            </h4>
                            <p className="text-slate-700 leading-relaxed text-[11px] sm:text-xs">
                              {anom.risco_evolutivo_consequencias || anom.risco_evolutivo}
                            </p>
                          </div>

                          {/* Diretrizes de Reparo */}
                          {anom.diretrizes_reparo && anom.diretrizes_reparo.length > 0 && (
                            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                              <h4 className="font-bold text-emerald-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Diretrizes Técnicas de Reparo:
                              </h4>
                              <ol className="list-decimal list-inside space-y-1 text-slate-800 text-[11px] leading-relaxed">
                                {anom.diretrizes_reparo.map((etapa, eIdx) => (
                                  <li key={eIdx}>
                                    <span>{etapa}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                <Camera className="w-8 h-8 opacity-40 mx-auto mb-2 text-slate-400" />
                Nenhum registro fotográfico anexado no Passo 2. As manifestações serão cadastradas na vistoria preliminar da obra.
              </div>
            )}
          </div>

          <DocumentFooter />
        </section>

        {/* ========================================================================= */}
        {/* PÁGINA 4: METODOLOGIA EXECUTIVA E PLANO DE SEGURANÇA (NR-18 E NR-35)       */}
        {/* ========================================================================= */}
        <section className="print-document-sheet page-break-after bg-white text-slate-900 shadow-2xl rounded-2xl p-8 sm:p-14 min-h-[1050px] border border-slate-200 flex flex-col justify-between print:min-h-0 print:h-auto print:max-h-none print:overflow-visible print:block print:p-0 print:border-none print:shadow-none print:rounded-none">
          <div>
            <DocumentHeader pageNum={4} totalPages={6} />

            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight mb-2">
              Metodologia Executiva e Plano de Segurança
            </h2>
            <div className="w-16 h-1 bg-amber-500 mb-6" />

            {/* Fases Executivas */}
            <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed mb-6">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-950 text-xs uppercase mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-mono text-[10px]">
                    1
                  </span>
                  Fase 1: Isolamento, Proteções Coletivas e Hidrojateamento Pressurizado
                </h3>
                <p className="text-slate-600 text-[11px] sm:text-xs">
                  Isolamento perimetral do solo com cones e fitas zebradas, colocação de lonas de proteção sobre garagens e jardins. Realização de lavagem por hidrojateamento com bico turbo rotativo com pressão calibrada para descontaminação total de fuligem, bolores e material pulverulento sem danificar o emboço firme subjacente.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-950 text-xs uppercase mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-mono text-[10px]">
                    2
                  </span>
                  Fase 2: Teste de Percussão em 100% da Fachada e Demolição Controlada
                </h3>
                <p className="text-slate-600 text-[11px] sm:text-xs">
                  Execução de batimento sonoro percussivo em 100% da área da fachada por técnicos habilitados. Mapeamento sonoro e marcação das regiões com som cavo (chocho). Corte das bordas com serra mármore diamantada para evitar propagação das trincas e remoção cirúrgica com ponteiro e martelete leve.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-950 text-xs uppercase mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-mono text-[10px]">
                    3
                  </span>
                  Fase 3: Tratamento de Armaduras Expostas e Recomposição Estrutural
                </h3>
                <p className="text-slate-600 text-[11px] sm:text-xs">
                  Abertura do concreto até 2 cm além da armadura oxidada, limpeza mecânica das barras de aço até o padrão visual SA 2.5 (metal quase branco), aplicação imediata de primer inibidor de corrosão à base de zinco ou epóxi e preenchimento volumétrico com argamassa tixotrópica estrutural polimérica com fibras de polipropileno.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-950 text-xs uppercase mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-mono text-[10px]">
                    4
                  </span>
                  Fase 4: Tratamento de Trincas Dinâmicas e Calafetação de Juntas com PU
                </h3>
                <p className="text-slate-600 text-[11px] sm:text-xs">
                  Abertura de sulco em formato de "V" nas fissuras ativas, aplicação de ar comprimido para despoeiramento, colocação de tarugo delimitador de profundidade (tarucel) e selamento elastomérico com mástique à base de poliuretano (PU 40) de alta elasticidade e memória mecânica resistente aos raios UV.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-950 text-xs uppercase mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-mono text-[10px]">
                    5
                  </span>
                  Fase 5: Sistema de Pintura Técnica Elastomérica Impermeável
                </h3>
                <p className="text-slate-600 text-[11px] sm:text-xs">
                  Aplicação de 01 demão de selador/fundo preparador acrílico de penetração profunda, seguida da aplicação de 03 (três) demãos cruzadas de tinta elastomérica 100% acrílica impermeável com película emborrachada flexível, antifúngica e resistente a intempéries e microfissurações térmicas.
                </p>
              </div>
            </div>

            {/* Exigências NR-18 e NR-35 */}
            <div className="border-t border-slate-200 pt-5">
              <h3 className="text-sm font-mono font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Exigências de Segurança do Trabalho (NR-18 e NR-35)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    NR-35 — Trabalho em Altura
                  </h4>
                  <ul className="space-y-1 text-slate-600 text-[11px]">
                    <li>• Cinto tipo paraquedista com duplo talabarte com absorvedor de energia e trava-quedas.</li>
                    <li>• Linha de vida vertical de cabo de aço 100% independente do balancim.</li>
                    <li>• Balancins elétricos com cabos de sustentação duplos e freio automático blockstop.</li>
                    <li>• Operadores 100% certificados em NR-35 com ASO apto para trabalho em altura.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    NR-18 — Indústria da Construção & RCF
                  </h4>
                  <ul className="space-y-1 text-slate-600 text-[11px]">
                    <li>• Telas de proteção fachadeiras envolventes em todo o perímetro trabalhado.</li>
                    <li>• Bandejas primárias e secundárias de retenção de materiais e ferramentas.</li>
                    <li>• Emissão de ART (Anotação de Responsabilidade Técnica) no CREA/SP.</li>
                    <li>• Elaboração prévia de PGR e PCMSO com seguro de Responsabilidade Civil Cruzada (RCF).</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DocumentFooter />
        </section>

        {/* ========================================================================= */}
        {/* PÁGINA 5: PLANILHA DE MATERIAIS E ESCOPO DE EQUIPE                        */}
        {/* ========================================================================= */}
        <section className="print-document-sheet page-break-after bg-white text-slate-900 shadow-2xl rounded-2xl p-8 sm:p-14 min-h-[1050px] border border-slate-200 flex flex-col justify-between print:min-h-0 print:h-auto print:max-h-none print:overflow-visible print:block print:p-0 print:border-none print:shadow-none print:rounded-none">
          <div>
            <DocumentHeader pageNum={5} totalPages={6} />

            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight mb-2">
              Planilha de Materiais e Escopo de Equipe
            </h2>
            <div className="w-16 h-1 bg-amber-500 mb-6" />

            {/* Planilha de Materiais */}
            <div className="mb-6 avoid-break">
              <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-3 py-1.5 rounded border-l-4 border-slate-900 mb-2 font-mono flex items-center justify-between">
                <span>1. Relação Consolidada de Materiais & Insumos Homologados</span>
                <span className="text-slate-600">Total: {materiais.length} itens</span>
              </h3>

              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-mono text-[11px]">
                  <tr>
                    <th className="py-2 px-3 border-b">Descrição do Item / Especificação</th>
                    <th className="py-2 px-2 border-b">Unid.</th>
                    <th className="py-2 px-2 border-b text-center">Qtd</th>
                    <th className="py-2 px-3 border-b text-right">Preço Unit.</th>
                    <th className="py-2 px-3 border-b text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {materiais.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 px-3 text-slate-800">{item.nome}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-600">{item.unidade}</td>
                      <td className="py-1.5 px-2 text-center font-mono">{item.quantidade}</td>
                      <td className="py-1.5 px-3 text-right font-mono">{formatarMoeda(item.precoUnitario)}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatarMoeda(item.quantidade * item.precoUnitario)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold font-mono text-slate-900">
                    <td colSpan={4} className="py-2 px-3 text-right">
                      CUSTO TOTAL DE MATERIAIS:
                    </td>
                    <td className="py-2 px-3 text-right text-slate-900">
                      {formatarMoeda(calculos.custoMateriais)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Escopo da Equipe Alocada */}
            <div className="mb-6 avoid-break">
              <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-3 py-1.5 rounded border-l-4 border-slate-900 mb-2 font-mono flex items-center justify-between">
                <span>2. Dimensionamento da Equipe Técnica Especializada</span>
                <span className="text-slate-600">Cronograma: {calculos.mesesObra} Meses de Obra</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
                {equipe.map((prof) => (
                  <div key={prof.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-extrabold text-slate-950 text-xs uppercase flex items-center justify-between">
                      <span>{prof.cargo}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px]">
                        {prof.quantidade} un.
                      </span>
                    </div>
                    <div className="text-slate-600 mt-1 text-[11px]">
                      Efetivo alocado: {prof.quantidade} profissional(is)
                    </div>
                    <div className="text-slate-900 font-semibold mt-0.5 text-[11px]">
                      Salário Base: {formatarMoeda(prof.salarioBase)}/mês
                    </div>
                    <div className="text-slate-500 mt-0.5 text-[10px]">
                      Total período: {formatarMoeda(prof.salarioBase * prof.quantidade * calculos.mesesObra)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo da Folha Direta */}
            <div className="p-3.5 bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-slate-800">
                Total Acumulado de Mão de Obra Direta ({calculos.mesesObra} meses):
              </span>
              <span className="font-extrabold text-slate-950 text-sm">
                {formatarMoeda(calculos.maoDeObraDireta)}
              </span>
            </div>
          </div>

          <DocumentFooter />
        </section>

        {/* ========================================================================= */}
        {/* PÁGINA 6: RESUMO FINANCEIRO, CONDIÇÕES, GARANTIA & PÓS-OBRA                 */}
        {/* ========================================================================= */}
        <section className="print-document-sheet page-break-after bg-white text-slate-900 shadow-2xl rounded-2xl p-8 sm:p-14 min-h-[1050px] border border-slate-200 flex flex-col justify-between print:min-h-0 print:h-auto print:max-h-none print:overflow-visible print:block print:p-0 print:border-none print:shadow-none print:rounded-none">
          <div>
            <DocumentHeader pageNum={6} totalPages={6} />

            <h2 className="text-2xl font-black text-slate-950 uppercase tracking-tight mb-2">
              Resumo Financeiro e Condições Comerciais
            </h2>
            <div className="w-16 h-1 bg-amber-500 mb-6" />

            {/* Memória de Cálculo Financeiro Completa */}
            <div className="mb-6 avoid-break">
              <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-3 py-1.5 rounded border-l-4 border-slate-900 mb-2 font-mono">
                1. Memória de Cálculo e Formação do Preço Global
              </h3>

              <table className="w-full text-left text-xs border border-slate-300 font-mono">
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2 px-3 text-slate-700">1. Custo de Materiais e Insumos Homologados</td>
                    <td className="py-2 px-3 text-right font-semibold">
                      {formatarMoeda(calculos.custoMateriais)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      2. Mão de Obra Direta ({calculos.mesesObra} meses de contrato)
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">
                      {formatarMoeda(calculos.maoDeObraDireta)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      3. Adicional de Periculosidade (30% sobre Mão de Obra Direta)
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-amber-700">
                      {formatarMoeda(calculos.periculosidade)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      4. Encargos Sociais e Trabalhistas (60% sobre Mão de Obra Direta)
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-sky-800">
                      {formatarMoeda(calculos.encargosSociais)}
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-bold">
                    <td className="py-2 px-3 text-slate-900">SUBTOTAL: CUSTO TOTAL DIRETO</td>
                    <td className="py-2 px-3 text-right text-slate-900">
                      {formatarMoeda(calculos.custoTotalDireto)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      5. Margem de Erro / Imprevistos Técnicos (7% sobre Custo Total Direto)
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-rose-700">
                      {formatarMoeda(calculos.margemErro)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      6. BDI / Margem Operacional de Lucro ({calculos.margemLucroPercentual}%)
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-800">
                      {formatarMoeda(calculos.valorMargemLucro)}
                    </td>
                  </tr>
                  <tr className="bg-slate-950 text-white font-extrabold text-sm sm:text-base">
                    <td className="py-3 px-4">VALOR GLOBAL DA PROPOSTA COMERCIAL</td>
                    <td className="py-3 px-4 text-right text-amber-400">
                      {formatarMoeda(calculos.valorGlobal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Condições Comerciais, Parcelamento e Faturamento Customizado */}
            <div className="mb-4 avoid-break">
              <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-3 py-1.5 rounded border-l-4 border-slate-900 mb-2 font-mono flex items-center justify-between">
                <span>2. Condições Comerciais, Cronograma de Desembolso e Faturamento</span>
                <span className="text-slate-600">Validade: {validadeDias} dias</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2.5 text-xs font-mono">
                {/* Card Entrada */}
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Entrada / Mobilização ({parcelamento.percentualEntrada}%)
                  </span>
                  <span className="text-sm font-extrabold text-slate-950 block mt-0.5">
                    {formatarMoeda(parcelamento.valorEntradaTotal)}
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold block mt-0.5">
                    {parcelamento.parcelasEntrada === 1
                      ? 'À vista na assinatura (1x)'
                      : `Em ${parcelamento.parcelasEntrada}x de ${formatarMoeda(parcelamento.valorParcelaEntrada)}`}
                  </span>
                </div>

                {/* Card Saldo Remanescente */}
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Saldo Remanescente ({parcelamento.percentualSaldo}%)
                  </span>
                  <span className="text-sm font-extrabold text-slate-950 block mt-0.5">
                    {formatarMoeda(parcelamento.valorSaldoTotal)}
                  </span>
                  <span className="text-[10px] text-sky-800 font-semibold block mt-0.5">
                    Em {parcelamento.parcelasSaldo}x mensais de{' '}
                    {formatarMoeda(parcelamento.valorParcelaSaldo)}
                  </span>
                </div>

                {/* Card Forma de Faturamento */}
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Modalidade de Faturamento
                  </span>
                  <span className="text-xs font-bold text-slate-900 block mt-0.5 leading-snug">
                    {condicoesComerciais.formaPagamento ||
                      'Boleto Bancário Registrado / PIX / TED'}
                  </span>
                  <span className="text-[10px] text-emerald-800 font-semibold block mt-0.5">
                    Emissão de Nota Fiscal (NF-e)
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 space-y-1">
                <div className="font-bold text-slate-950 uppercase">
                  Observações de Faturamento e Condições de Pagamento:
                </div>
                <p className="leading-relaxed whitespace-pre-line text-slate-700">
                  {condicoesComerciais.observacoesFaturamento?.trim() ||
                    `Sinal de ${parcelamento.percentualEntrada}% (${formatarMoeda(parcelamento.valorEntradaTotal)}) na assinatura do contrato para compra antecipada de materiais e mobilização inicial. O saldo remanescente de ${parcelamento.percentualSaldo}% (${formatarMoeda(parcelamento.valorSaldoTotal)}) será faturado em ${parcelamento.parcelasSaldo} parcelas mensais de ${formatarMoeda(parcelamento.valorParcelaSaldo)} vinculadas aos laudos de medição de evolução física aprovados pela gestão condominial.`}
                </p>
              </div>
            </div>

            {/* Termo de Garantia de 5 Anos */}
            <div className="mb-4 p-3 bg-amber-50/70 border border-amber-300 rounded-lg text-[11px] text-slate-800 space-y-1">
              <div className="font-bold text-amber-950 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Termo de Garantia Quinquenal (05 Anos — Código Civil Art. 618):
              </div>
              <p className="text-slate-700">
                A Renovar Engenharia assegura garantia técnica integral de <strong>05 (cinco) anos</strong> para solidez, estabilidade dos revestimentos tratados, impermeabilidade e estanqueidade das juntas seladas, em estrita conformidade com o <strong>Artigo 618 da Lei Federal nº 10.406/2002 (Código Civil Brasileiro)</strong>.
              </p>
            </div>

            {/* Plano de Manutenção Pós-Obra (ABNT NBR 5674) */}
            <div className="mb-6 p-3 bg-sky-50/70 border border-sky-300 rounded-lg text-[11px] text-slate-800 space-y-1.5">
              <div className="font-bold text-sky-950 uppercase flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-sky-600" />
                Plano de Manutenção Pós-Obra (ABNT NBR 5674):
              </div>
              <p className="text-slate-700">
                Visando a longevidade dos serviços realizados e a manutenção contínua da garantia de 5 anos, o condomínio receberá o <strong>Manual de Uso e Manutenção da Fachada</strong> contendo as seguintes diretrizes:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-slate-600 font-mono pt-1">
                <li>• Inspeção anual preventiva gratuita realizada pela Renovar.</li>
                <li>• Lavagem suave periódica a cada 24 meses com água neutra.</li>
                <li>• Verificação dos mástiques de juntas a cada 2 anos.</li>
                <li>• Canal direto de suporte técnico para a administração do condomínio.</li>
              </ul>
            </div>
          </div>

          {/* Assinaturas Formais */}
          <div className="pt-6 border-t-2 border-slate-900 avoid-break">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-10">
              <div className="text-center w-72">
                <div className="border-b-2 border-slate-900 pb-1 mb-1 font-bold text-xs text-slate-900 uppercase">
                  Renovar Engenharia Diagnóstica
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                  Engenheiro Civil Responsável Técnico • CREA Ativo
                </div>
              </div>

              <div className="text-center w-72">
                <div className="border-b-2 border-slate-900 pb-1 mb-1 font-bold text-xs text-slate-900 uppercase">
                  {dadosCliente.nomeSindico || 'Síndico(a) / Administração'}
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                  {dadosCliente.nomeCondominio || 'Condomínio Contratante'}
                  {dadosCliente.cnpj && ` • CNPJ: ${dadosCliente.cnpj}`}
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] font-mono text-slate-400 mt-5">
              Proposta nº {orcamentoId} • Documento emitido em {dataAtualExtenso} • Válida por {validadeDias} dias corridos
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
