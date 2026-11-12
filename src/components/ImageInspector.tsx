import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Eye, Maximize2, Sparkles, SlidersHorizontal, AlertCircle } from 'lucide-react';

interface ImageInspectorProps {
  imageUrl: string;
  imageName?: string;
  alt?: string;
}

export const ImageInspector: React.FC<ImageInspectorProps> = ({ imageUrl, imageName, alt }) => {
  const [zoom, setZoom] = useState<number>(1);
  const [filterMode, setFilterMode] = useState<'normal' | 'contrast' | 'grayscale' | 'invert'>('normal');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.5, 3.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.5, 1));
  const handleReset = () => {
    setZoom(1);
    setFilterMode('normal');
  };

  const getFilterStyle = () => {
    switch (filterMode) {
      case 'contrast':
        return 'contrast-175 brightness-110 saturate-150';
      case 'grayscale':
        return 'grayscale contrast-150';
      case 'invert':
        return 'invert contrast-125';
      default:
        return '';
    }
  };

  return (
    <div className={`relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col ${isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'w-full'}`}>
      {/* Top Inspector Bar */}
      <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium truncate max-w-[200px]">{imageName || 'Registro Fotográfico Pericial'}</span>
          <span className="text-slate-500 font-mono">({Math.round(zoom * 100)}%)</span>
        </div>

        {/* Filter & Zoom controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setFilterMode('normal')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                filterMode === 'normal' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Cores Naturais"
            >
              Real
            </button>
            <button
              onClick={() => setFilterMode('contrast')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                filterMode === 'contrast' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
              }`}
              title="Realce de Fissuras e Bordas (Alto Contraste)"
            >
              Fissuras
            </button>
            <button
              onClick={() => setFilterMode('grayscale')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                filterMode === 'grayscale' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-white'
              }`}
              title="Inspeção Monocromática (Relevo & Sombra)"
            >
              P&B
            </button>
            <button
              onClick={() => setFilterMode('invert')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                filterMode === 'invert' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
              }`}
              title="Inversão Térmica / Negativo Pericial"
            >
              Negativo
            </button>
          </div>

          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 3.5}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleReset}
              className="p-1 text-slate-400 hover:text-white"
              title="Redefinir visualização"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700"
            title={isFullscreen ? 'Fechar Tela Cheia' : 'Expandir Fotografia'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Image Canvas with Pan & Zoom container */}
      <div className={`relative overflow-auto flex items-center justify-center p-3 bg-slate-950/60 ${isFullscreen ? 'flex-1' : 'min-h-[320px] max-h-[500px]'}`}>
        <div
          className="relative transition-transform duration-200 ease-out origin-center"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src={imageUrl}
            alt={alt || 'Fotografia da manifestação patológica'}
            className={`max-w-full h-auto object-contain rounded-lg shadow-xl ${getFilterStyle()}`}
          />
        </div>

        {/* Forensic reticle / watermark stamp */}
        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded text-[11px] font-mono text-slate-400 border border-slate-800 flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>ANÁLISE PERICIAL DE CAMPO</span>
        </div>
      </div>
    </div>
  );
};
