import React from 'react';
import { X, BookOpen, ShieldCheck, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface NormasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NormasModal: React.FC<NormasModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const normas = [
    {
      codigo: 'ABNT NBR 16747',
      titulo: 'Inspeção Predial — Diretrizes, conceitos, terminologia e procedimentos',
      foco: 'Classificação de anomalias (endógenas, exógenas, funcionais), falhas de manutenção e determinação da matriz de gravidade, urgência e tendência (GUT).',
    },
    {
      codigo: 'ABNT NBR 13755',
      titulo: 'Revestimento de paredes externas e fachadas com placas cerâmicas',
      foco: 'Diretrizes para argamassa colante, juntas de movimentação horizontal/vertical a cada 3m ou pavimento, ancoragem mecânica e testes de aderência à tração.',
    },
    {
      codigo: 'ABNT NBR 6118',
      titulo: 'Projeto de Estruturas de Concreto — Procedimento',
      foco: 'Classes de agressividade ambiental (I a IV), cobrimento mínimo de concreto sobre armaduras, controle de fissuração e durabilidade frente à carbonatação e cloretos.',
    },
    {
      codigo: 'ABNT NBR 9575 / NBR 9574',
      titulo: 'Impermeabilização — Seleção, projeto e execução',
      foco: 'Critérios contra umidade ascendente por capilaridade, impermeabilização de lajes de cobertura, platibandas, juntas e vedação contra infiltrações.',
    },
    {
      codigo: 'ABNT NBR 5674',
      titulo: 'Manutenção de Edificações — Requisitos para o sistema de gestão',
      foco: 'Programação de vistorias periódicas de fachadas e elementos estruturais para prevenir o encarecimento exponencial dos reparos por negligência.',
    },
    {
      codigo: 'ABNT NBR 15575',
      titulo: 'Edificações Habitacionais — Desempenho',
      foco: 'Exigências de estanqueidade à água, segurança estrutural, durabilidade e vida útil de projeto (VUP) para sistemas de vedação vertical externa.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">ACERVO TÉCNICO DE NORMAS ABNT</h3>
              <p className="text-[11px] text-slate-400">Referencial normativo para Engenharia Diagnóstica e Perícias</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-auto flex-1 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-relaxed flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              O diagnóstico emitido por este sistema é pautado pelo vocabulário e metodologia das normas técnicas oficiais da ABNT, com foco na identificação da causa raiz, contenção do risco evolutivo e preservação patrimonial.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {normas.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-400">{item.codigo}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">Vigente</span>
                </div>
                <h4 className="text-sm font-semibold text-white">{item.titulo}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{item.foco}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Associação Brasileira de Normas Técnicas</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
