import React, { useMemo, useState } from 'react';
import { X, Printer, Download, Loader2, ShieldAlert, Award, FileText, CheckCircle } from 'lucide-react';
import { DiagnosticoResponse, InspecaoContexto, HistoricoInspecao, PatologiaItem } from '../types';
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
    const list: { id: string; imageUrl: string; nomeArquivo: string; anomalia: PatologiaItem }[] = [];
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
        elementId: 'pdf-content',
        filename: `${laudoId}-Laudo-Pericial.pdf`,
      });
    } catch (err) {
      console.error('Erro ao baixar laudo em PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="print-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-2 sm:p-6 flex items-start justify-center print:static print:inset-auto print:p-0 print:m-0 print:block print:bg-white print:overflow-visible print:h-auto">
      <style>{`@media print { body * { visibility: hidden; } #pdf-content, #pdf-content * { visibility: visible; } #pdf-content { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>

      {/* Top Floating Controls (hidden in print) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 no-print">
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

      {/* Official A4 Engineering Paper Sheet */}
      <div
        id="pdf-content"
        className="bg-white text-slate-900 w-full max-w-4xl shadow-2xl rounded-xl sm:rounded-2xl p-6 sm:p-12 my-6 font-sans text-sm border border-slate-200 print:shadow-none print:border-none print:my-0 print:p-0 print:max-w-none print:w-full"
      >
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xl">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-950 tracking-tight uppercase">
                Laudo Técnico Pericial de Patologias Prediais
              </h1>
              <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                Engenharia Diagnóstica • Restauração de Fachadas • Recuperação Estrutural
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right font-mono text-xs text-slate-600">
            <div><span className="font-bold text-slate-900">DOC:</span> {laudoId}</div>
            <div><span className="font-bold text-slate-900">DATA:</span> {dataAtual}</div>
            <div><span className="font-bold text-slate-900">NORMA BASE:</span> ABNT NBR 16747</div>
          </div>
        </div>

        {/* 1. Identificação do Objeto Periciado */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-3 py-1.5 rounded border-l-4 border-slate-900 mb-3">
            1. Identificação da Edificação e Objeto Periciado
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs border border-slate-200 rounded-lg p-3 bg-slate-50/50">
            <div>
              <span className="font-semibold text-slate-700">Edificação / Condomínio:</span>{' '}
              <span className="text-slate-900 font-medium">{contexto.nomeEdificio || 'Edificação Comercial/Residencial'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Elemento Inspecionado:</span>{' '}
              <span className="text-slate-900 font-medium">{contexto.tipoElemento || 'Envoltória / Fachada Predial'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Localização / Orientação:</span>{' '}
              <span className="text-slate-900 font-medium">{contexto.localizacao || 'Fachada Externa'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Idade Estimada da Construção:</span>{' '}
              <span className="text-slate-900 font-medium">{contexto.idadeEdificio || 'Não informada'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Responsável Técnico / CREA:</span>{' '}
              <span className="text-slate-900 font-medium">{contexto.responsavelTecnico || 'Engenheiro Civil Especialista'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Finalidade:</span>{' '}
              <span className="text-slate-900 font-medium">Diagnóstico de Manifestações Patológicas e Risco Evolutivo</span>
            </div>
          </div>
        </div>

        {/* 2. Diagnóstico Pormenorizado por Fotografia Enviada (1 Foto = 1 Registro Patológico) */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-3 py-1.5 rounded border-l-4 border-slate-900 mb-3">
            2. Registro Fotográfico e Diagnóstico Técnico das Manifestações Patológicas ({registrosUnicos.length}{' '}
            {registrosUnicos.length === 1 ? 'registro' : 'registros'})
          </h2>

          <div className="space-y-5">
            {registrosUnicos.map((reg, idx) => {
              const p = reg.anomalia;
              const info = classificarPatologia(p);
              const gravidade = p.gravidade || info.gravidade;
              const normas = p.normas_tecnicas_abnt?.length ? p.normas_tecnicas_abnt : info.normasAbnt;
              const ensaios = p.ensaios_complementares?.length ? p.ensaios_complementares : info.ensaiosRecomendados;
              const reparo = p.diretrizes_reparo?.length ? p.diretrizes_reparo : info.metodologiaReparo;

              return (
                <div key={reg.id} className="border border-slate-300 rounded-lg p-4 bg-white avoid-break shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      {p.nome_patologia}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300">
                      Gravidade: {gravidade}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 flex flex-col items-center">
                    <img
                      src={reg.imageUrl}
                      alt={p.nome_patologia}
                      className="max-h-[260px] w-auto object-contain rounded border border-slate-300 shadow-sm"
                    />
                    <p className="text-[10px] text-slate-500 font-mono mt-1.5 text-center">
                      Figura {idx + 1} ({reg.nomeArquivo}) — Evidência fotográfica correspondente ao registro #{idx + 1}.
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-800">
                    <div>
                      <span className="font-bold text-slate-950 uppercase tracking-wide text-[10px] block">
                        1. Constatação Visual e Aspecto Técnico:
                      </span>
                      <p className="text-slate-700 leading-relaxed pl-2 border-l-2 border-slate-300">
                        {p.constatacao_visual || p.descricao}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-950 uppercase tracking-wide text-[10px] block">
                        2. Justificativa Técnica e Causa Provável:
                      </span>
                      <p className="text-slate-700 leading-relaxed pl-2 border-l-2 border-slate-300">
                        {p.justificativa_tecnica_causa || p.causa_provavel}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-red-900 uppercase tracking-wide text-[10px] block">
                        3. Risco Evolutivo e Consequências (Estrutural / Segurança / Financeiro):
                      </span>
                      <p className="text-red-950 leading-relaxed pl-2 border-l-2 border-red-300 bg-red-50/50 p-1.5 rounded">
                        {p.risco_evolutivo_consequencias || p.risco_evolutivo}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-950 uppercase tracking-wide text-[10px] block">
                        4. Normas Técnicas ABNT Aplicáveis:
                      </span>
                      <ul className="list-disc list-inside text-slate-700 pl-2">
                        {normas.map((n, nIdx) => (
                          <li key={nIdx}>{n}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="font-bold text-slate-950 uppercase tracking-wide text-[10px] block">
                        5. Ensaios Complementares de Confirmação:
                      </span>
                      <ul className="list-disc list-inside text-slate-700 pl-2">
                        {ensaios.map((ens, eIdx) => (
                          <li key={eIdx}>{ens}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="font-bold text-slate-950 uppercase tracking-wide text-[10px] block">
                        6. Diretrizes Técnicas de Reparo (Metodologia de Recuperação):
                      </span>
                      <ol className="list-decimal list-inside text-slate-700 pl-2 space-y-0.5">
                        {reparo.map((rep, rIdx) => (
                          <li key={rIdx}>{rep.replace(/^\d+[\.\-\)]\s*/, '')}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Fundamentação Normativa ABNT */}
        <div className="mb-6 avoid-break">
          <h2 className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-3 py-1.5 rounded border-l-4 border-slate-900 mb-2">
            4. Referências Normativas Brasileiras Aplicáveis
          </h2>
          <div className="text-xs text-slate-700 space-y-1 pl-2">
            <div>• <strong>ABNT NBR 16747:</strong> Inspeção predial — Diretrizes, conceitos, terminologia e procedimentos.</div>
            <div>• <strong>ABNT NBR 13755:</strong> Revestimento de paredes externas e fachadas com placas cerâmicas e com utilização de argamassa colante.</div>
            <div>• <strong>ABNT NBR 6118:</strong> Projeto de estruturas de concreto — Procedimento e controle de cobrimento.</div>
            <div>• <strong>ABNT NBR 9575:</strong> Impermeabilização — Seleção e projeto.</div>
            <div>• <strong>ABNT NBR 5674:</strong> Manutenção de edificações — Requisitos para o sistema de gestão de manutenção.</div>
          </div>
        </div>

        {/* 5. Conclusão & Encerramento */}
        <div className="pt-4 border-t-2 border-slate-900 avoid-break">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
            5. Parecer Conclusivo e Encerramento
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed mb-8">
            Com base na inspeção visual fotográfica periciada, conclui-se que as manifestações patológicas catalogadas exigem intervenção corretiva estruturada. O adiamento dos reparos acarretará na progressão contínua da deterioração dos materiais, agravamento de custos de recuperação e potenciais riscos à segurança física dos usuários e transeuntes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-6 border-t border-slate-300">
            <div className="text-center sm:text-left text-xs text-slate-500">
              <div>Documento emitido eletronicamente</div>
              <div>Patologias.Lab Engenharia Diagnóstica</div>
            </div>

            <div className="text-center">
              <div className="w-56 border-b border-slate-900 pb-1 mb-1 font-mono text-xs font-bold text-slate-900">
                {contexto.responsavelTecnico || 'Engenheiro Civil Perito'}
              </div>
              <div className="text-[11px] text-slate-600 font-mono">
                CREA / CAU • Anotação de Responsabilidade Técnica (ART)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
