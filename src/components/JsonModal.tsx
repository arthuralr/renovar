import React, { useState } from 'react';
import { X, Copy, CheckCircle2, Download, FileCode } from 'lucide-react';
import { DiagnosticoResponse, PatologiaItem } from '../types';

interface JsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DiagnosticoResponse;
}

export const JsonModal: React.FC<JsonModalProps> = ({ isOpen, onClose, data }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const lista: PatologiaItem[] = data.anomalias || data.patologias || [];

  // Format pure clean JSON matching the 7-attribute pericial schema
  const cleanJson = JSON.stringify(
    {
      anomalias: lista.map((p) => ({
        nome_patologia: p.nome_patologia,
        gravidade: p.gravidade || 'Média',
        constatacao_visual: p.constatacao_visual || p.descricao || '',
        justificativa_tecnica_causa: p.justificativa_tecnica_causa || p.causa_provavel || '',
        risco_evolutivo_consequencias: p.risco_evolutivo_consequencias || p.risco_evolutivo || '',
        normas_tecnicas_abnt: p.normas_tecnicas_abnt || [],
        ensaios_complementares: p.ensaios_complementares || [],
        diretrizes_reparo: p.diretrizes_reparo || [],
      })),
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([cleanJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laudo-pericial-anomalias-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">SAÍDA JSON ESTRUTURADO PERICIAL</h3>
              <p className="text-[11px] text-slate-400">7 atributos periciais estritamente tipados conforme ABNT</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-mono transition cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copiar JSON</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Baixar arquivo .json"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 overflow-auto flex-1 bg-slate-950 font-mono text-xs text-emerald-300 leading-relaxed">
          <pre className="whitespace-pre-wrap select-all">{cleanJson}</pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>{lista.length} anomalia(s) estruturada(s)</span>
          <span className="text-slate-500">MIME: application/json</span>
        </div>
      </div>
    </div>
  );
};
