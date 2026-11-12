import React, { useMemo, useState } from 'react';
import {
  X,
  Download,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  FileCheck,
} from 'lucide-react';
import {
  DiagnosticoResponse,
  InspecaoContexto,
  HistoricoInspecao,
  PatologiaItem,
} from '../types';
import { classificarPatologia } from '../utils/abntEngine';
import { downloadProposalPdf } from '../utils/pdfGenerator';

interface OfficialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DiagnosticoResponse;
  contexto: InspecaoContexto;
  imageUrl: string;
  registrosVistoria?: HistoricoInspecao[];
}

export const OfficialReportModal: React.FC<OfficialReportModalProps> = ({
  isOpen,
  onClose,
  data,
  contexto,
  imageUrl,
  registrosVistoria = [],
}) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const registrosUnicos = useMemo(() => {
    const list: {
      id: string;
      imageUrl: string;
      nomeArquivo: string;
      anomalia: PatologiaItem;
    }[] = [];
    const seen = new Set<string>();

    if (registrosVistoria && registrosVistoria.length > 0) {
      registrosVistoria.forEach((r, idx) => {
        const items = r.resultado?.anomalias || r.resultado?.patologias || [];
        const img = r.imagemUrl?.trim() || '';
        if (img && items.length > 0 && !seen.has(img)) {
          seen.add(img);
          list.push({
            id: r.id || `reg-${idx + 1}`,
            imageUrl: img,
            nomeArquivo: r.nomeArquivo || `Foto ${list.length + 1}`,
            anomalia: items[0],
          });
        }
      });
    }

    const currentItems = data?.anomalias || data?.patologias || [];
    const currentImg = imageUrl?.trim() || '';
    if (currentImg && currentItems.length > 0 && !seen.has(currentImg)) {
      seen.add(currentImg);
      list.push({
        id: 'atual',
        imageUrl: currentImg,
        nomeArquivo: `Foto ${list.length + 1}`,
        anomalia: currentItems[0],
      });
    }

    return list;
  }, [data, imageUrl, registrosVistoria]);

  if (!isOpen) return null;

  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const laudoId = `LTP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      await downloadProposalPdf({
        elementId: 'official-report-pdf-content',
        filename: `${laudoId}-Laudo-Pericial.pdf`,
      });
    } catch (err) {
      console.error('Erro ao baixar laudo em PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="print-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md p-2 sm:p-6 flex flex-col items-center print:static print:inset-auto print:p-0 print:m-0 print:block print:bg-white print:overflow-visible print:h-auto">
      <style>{`@media print { body * { visibility: hidden; } #official-report-pdf-content, #official-report-pdf-content * { visibility: visible; } #official-report-pdf-content { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>

      {/* Top Floating Controls (hidden in print) */}
      <div className="sticky top-2 z-50 w-full max-w-4xl bg-slate-900/95 border border-slate-700 rounded-2xl px-4 py-3 mb-6 flex items-center justify-between shadow-2xl no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-950 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-white font-bold text-xs sm:text-sm uppercase">
              Laudo Técnico Pericial ABNT • {laudoId}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {registrosUnicos.length}{' '}
              {registrosUnicos.length === 1
                ? 'registro patológico'
                : 'registros patológicos'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-70 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-xl transition cursor-pointer"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Baixar Laudo (PDF)</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Official A4 Engineering Paper Sheets */}
      <div
        id="official-report-pdf-content"
        className="w-full max-w-4xl space-y-8 font-sans text-sm print:space-y-0 print:max-w-none print:w-full"
      >
        {registrosUnicos.map((reg, idx) => {
          const p = reg.anomalia;
          const info = classificarPatologia(p);
          const gravidade = p.gravidade || info.gravidade;
          const normas = p.normas_tecnicas_abnt?.length
            ? p.normas_tecnicas_abnt
            : info.normasAbnt;
          const ensaios = p.ensaios_complementares?.length
            ? p.ensaios_complementares
            : info.ensaiosRecomendados;
          const reparo = p.diretrizes_reparo?.length
            ? p.diretrizes_reparo
            : info.metodologiaReparo;
          const isFirstPage = idx === 0;
          const isLastPage = idx === registrosUnicos.length - 1;

          return (
            <section
              key={reg.id}
              className="print-document-sheet bg-white text-slate-900 shadow-2xl rounded-2xl p-8 sm:p-10 border border-slate-200 flex flex-col justify-between gap-6 print:shadow-none print:border-none print:rounded-none"
            >
              <div className="space-y-5">
                {/* Document Header */}
                <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shrink-0">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-base sm:text-lg font-extrabold text-slate-950 tracking-tight uppercase leading-snug">
                        Laudo Técnico Pericial de Patologias Prediais
                      </h1>
                      <p className="text-[11px] text-slate-600 font-semibold uppercase tracking-wider mt-0.5">
                        Engenharia Diagnóstica • Restauração de Fachadas • ABNT NBR 16747
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono text-[11px] text-slate-600 shrink-0 space-y-0.5">
                    <div>
                      <span className="font-bold text-slate-900">DOC:</span> {laudoId}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">DATA:</span> {dataAtual}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">PÁGINA:</span> {idx + 1} de{' '}
                      {registrosUnicos.length}
                    </div>
                  </div>
                </div>

                {/* 1. Identificação da Edificação (Exibida na Página 1 com caixas bem espaçadas e sem sobreposição) */}
                {isFirstPage && (
                  <div className="avoid-break">
                    <h2 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-900 px-3.5 py-2 rounded-lg border-l-4 border-slate-900 mb-3">
                      1. Identificação da Edificação e Objeto Periciado
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Edificação / Condomínio
                        </span>
                        <div className="text-xs font-bold text-slate-950 leading-snug break-words">
                          {contexto.nomeEdificio || 'Edificação Comercial / Residencial'}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Elemento / Substrato Inspecionado
                        </span>
                        <div className="text-xs font-bold text-slate-950 leading-snug break-words">
                          {contexto.tipoElemento || 'Envoltória / Fachada Predial'}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Localização / Orientação
                        </span>
                        <div className="text-xs font-semibold text-slate-900 leading-snug break-words">
                          {contexto.localizacao || 'Fachada Externa'}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Idade Estimada da Construção
                        </span>
                        <div className="text-xs font-semibold text-slate-900 leading-snug break-words">
                          {contexto.idadeEdificio || 'Não informada'}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Responsável Técnico / CREA
                        </span>
                        <div className="text-xs font-semibold text-slate-900 leading-snug break-words">
                          {contexto.responsavelTecnico || 'Engenheiro Civil Especialista'}{' '}
                          {contexto.crea ? `(${contexto.crea})` : ''}
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Finalidade Pericial
                        </span>
                        <div className="text-xs font-semibold text-slate-900 leading-snug break-words">
                          Diagnóstico de Manifestações Patológicas e Risco Evolutivo
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Registro Patológico Individual */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-mono font-extrabold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wide leading-snug">
                        {p.nome_patologia}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                      Gravidade: {gravidade}
                    </span>
                  </div>

                  {/* Grid Superior: Foto + Constatação e Causa */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-5 border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col items-center">
                      <img
                        src={reg.imageUrl}
                        alt={p.nome_patologia}
                        className="max-h-[210px] w-auto object-contain rounded-lg border border-slate-300"
                      />
                      <p className="text-[10px] text-slate-500 font-mono mt-2 text-center leading-tight">
                        Figura {idx + 1} ({reg.nomeArquivo}) — Evidência fotográfica #{idx + 1}
                      </p>
                    </div>

                    <div className="md:col-span-7 space-y-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                        <span className="font-bold text-slate-950 uppercase tracking-wide text-[11px] flex items-center gap-1.5 mb-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>1. Constatação Visual e Aspecto Técnico:</span>
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed break-words whitespace-normal">
                          {p.constatacao_visual || p.descricao}
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                        <span className="font-bold text-slate-950 uppercase tracking-wide text-[11px] flex items-center gap-1.5 mb-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>2. Justificativa Técnica e Causa Provável:</span>
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed break-words whitespace-normal">
                          {p.justificativa_tecnica_causa || p.causa_provavel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bloco Completo em Largura Total: 3. Risco Evolutivo e Consequências */}
                  <div className="bg-red-50/80 border-2 border-red-200 rounded-xl p-4 avoid-break">
                    <h4 className="font-extrabold text-red-900 uppercase tracking-wide text-xs flex items-center gap-2 mb-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>
                        3. Risco Evolutivo e Consequências (Impacto Estrutural, Segurança e Financeiro):
                      </span>
                    </h4>
                    <p className="text-xs text-red-950 leading-relaxed break-words whitespace-normal">
                      {p.risco_evolutivo_consequencias || p.risco_evolutivo}
                    </p>
                  </div>

                  {/* Grid Inferior: Normas & Ensaios + Diretrizes de Reparo */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-5 space-y-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <span className="font-bold text-slate-950 uppercase tracking-wide text-[10px] block mb-1.5">
                          4. Normas Técnicas ABNT Aplicáveis:
                        </span>
                        <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-1 leading-snug">
                          {normas.map((n, nIdx) => (
                            <li key={nIdx} className="break-words">
                              {n}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <span className="font-bold text-slate-950 uppercase tracking-wide text-[10px] block mb-1.5">
                          5. Ensaios Complementares:
                        </span>
                        <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-1 leading-snug">
                          {ensaios.map((ens, eIdx) => (
                            <li key={eIdx} className="break-words">
                              {ens}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="md:col-span-7 bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5">
                      <span className="font-bold text-emerald-950 uppercase tracking-wide text-[11px] flex items-center gap-1.5 mb-2">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>6. Diretrizes Técnicas de Reparo (Metodologia Executiva):</span>
                      </span>
                      <ol className="list-decimal list-inside text-[11px] text-slate-800 space-y-1.5 leading-relaxed">
                        {reparo.map((rep, rIdx) => (
                          <li key={rIdx} className="break-words">
                            {rep.replace(/^\d+[\.\-\)]\s*/, '')}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Parecer Conclusivo na última página */}
                {isLastPage && (
                  <div className="pt-4 border-t-2 border-slate-900 avoid-break">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5">
                      Parecer Técnico Conclusivo
                    </h2>
                    <p className="text-xs text-slate-700 leading-relaxed mb-5">
                      Com base na inspeção visual fotográfica periciada conforme diretrizes da ABNT NBR 16747, conclui-se que as manifestações patológicas catalogadas demandam intervenção corretiva programada. A postergação dos reparos ocasionará evolução progressiva da degradação, elevação dos custos de recuperação e riscos à segurança dos usuários.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-slate-200">
                      <div className="text-center sm:text-left text-[11px] text-slate-500 font-mono">
                        <div>Laudo Técnico emitido eletronicamente</div>
                        <div>Renovar Engenharia Diagnóstica • ABNT NBR 16747</div>
                      </div>

                      <div className="text-center">
                        <div className="w-60 border-b border-slate-900 pb-1 mb-1 font-mono text-xs font-bold text-slate-900">
                          {contexto.responsavelTecnico || 'Engenheiro Civil Perito'}
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono">
                          {contexto.crea || 'CREA Ativo'} • Responsável Técnico
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
