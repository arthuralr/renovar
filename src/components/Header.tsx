import React from 'react';
import { ShieldAlert, BookOpen, History, Kanban } from 'lucide-react';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenNormas: () => void;
  onOpenOrcamentosKanban?: () => void;
  historyCount: number;
  orcamentosCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenNormas,
  onOpenOrcamentosKanban,
  historyCount,
  orcamentosCount = 0,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
            <ShieldAlert className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white font-mono">PATOLOGIAS<span className="text-amber-400">.LAB</span></span>
              <span className="hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30">
                ABNT NBR 16747
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Perícia de Fachadas, Recuperação Estrutural e Engenharia Diagnóstica
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {onOpenOrcamentosKanban && (
            <button
              onClick={onOpenOrcamentosKanban}
              className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 rounded-lg border border-amber-500/40 transition cursor-pointer"
              title="Painel Kanban e Histórico de Orçamentos Gerados"
            >
              <Kanban className="w-4 h-4 text-amber-400" />
              <span>Orçamentos & Kanban</span>
              {orcamentosCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                  {orcamentosCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenNormas}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 hover:text-white rounded-lg border border-slate-700 transition cursor-pointer"
            title="Diretrizes e Normas Técnicas da ABNT"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Normas ABNT</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 hover:text-white rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <History className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Vistorias</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-sky-500 text-slate-950 text-[10px] font-bold">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
