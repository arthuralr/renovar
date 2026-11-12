import React from 'react';
import { X, History, Trash2, ArrowRight, Eye, Calendar, Building2 } from 'lucide-react';
import { HistoricoInspecao } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  historico: HistoricoInspecao[];
  onSelect: (item: HistoricoInspecao) => void;
  onClear: () => void;
  onDeleteSingle: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  historico,
  onSelect,
  onClear,
  onDeleteSingle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase">Histórico de Vistorias ({historico.length})</h3>
          </div>

          <div className="flex items-center gap-2">
            {historico.length > 0 && (
              <button
                onClick={onClear}
                className="text-[11px] text-red-400 hover:text-red-300 transition px-2 py-1 rounded hover:bg-red-500/10"
              >
                Limpar Tudo
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {historico.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p>Nenhuma vistoria salva nesta sessão.</p>
              <p className="mt-1 text-[11px] text-slate-600">Fotografias analisadas aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            historico.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 transition group flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={item.imagemUrl}
                    alt={item.nomeArquivo}
                    className="w-16 h-16 object-cover rounded-lg border border-slate-700 shrink-0 bg-slate-900"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate group-hover:text-amber-300 transition">
                      {item.contexto.nomeEdificio || item.nomeArquivo || 'Vistoria Predial'}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 font-mono">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{new Date(item.dataHora).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      <span className="text-amber-400 font-semibold">
                        {(item.resultado?.anomalias || item.resultado?.patologias || []).length}
                      </span>{' '}
                      manifestação(ões) identificada(s)
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <button
                    onClick={() => onDeleteSingle(item.id)}
                    className="text-slate-500 hover:text-red-400 transition p-1"
                    title="Excluir do histórico"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-medium transition cursor-pointer"
                  >
                    <span>Carregar</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
