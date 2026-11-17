import React, { useState, useRef } from 'react';
import {
  Upload,
  Camera,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Building2,
  User,
  HardHat,
  Compass,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Clock3,
  Image as ImageIcon,
} from 'lucide-react';
import { InspecaoContexto, HistoricoInspecao } from '../types';

interface UploadSectionProps {
  onImageSelected: (base64: string, name: string, mimeType: string) => void;
  contexto: InspecaoContexto;
  setContexto: React.Dispatch<React.SetStateAction<InspecaoContexto>>;
  onAnalyze: () => void;
  isLoading: boolean;
  hasSelectedImage: boolean;
  registrosVistoria?: HistoricoInspecao[];
  selectedImage?: string | null;
  selectedRegistroId?: string | null;
  onSelectRegistro?: (item: HistoricoInspecao) => void;
  onRemoveRegistro?: (id: string) => void;
  modoEntrada?: 'foto' | 'texto';
  onModoEntradaChange?: (modo: 'foto' | 'texto') => void;
  textoManual?: string;
  onTextoManualChange?: (texto: string) => void;
  onAnalyzeTexto?: (texto: string) => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onImageSelected,
  contexto,
  setContexto,
  onAnalyze,
  isLoading,
  hasSelectedImage,
  registrosVistoria = [],
  selectedImage,
  selectedRegistroId,
  onSelectRegistro,
  onRemoveRegistro,
  modoEntrada,
  onModoEntradaChange,
  textoManual,
  onTextoManualChange,
  onAnalyzeTexto,
}) => {
  const [localModoEntrada, setLocalModoEntrada] = useState<'foto' | 'texto'>('foto');
  const [localTextoManual, setLocalTextoManual] = useState('');

  const modo = modoEntrada !== undefined ? modoEntrada : localModoEntrada;
  const setModo = onModoEntradaChange || setLocalModoEntrada;

  const texto = textoManual !== undefined ? textoManual : localTextoManual;
  const setTexto = onTextoManualChange || setLocalTextoManual;
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;

      // Automatically optimize image (max 1600px, JPEG 0.85) to prevent 413 payload errors
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          onImageSelected(optimizedBase64, file.name, 'image/jpeg');
        } else {
          onImageSelected(rawDataUrl, file.name, file.type || 'image/jpeg');
        }
      };

      img.onerror = () => {
        onImageSelected(rawDataUrl, file.name, file.type || 'image/jpeg');
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  };

  const handleMultipleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    Array.from(fileList).forEach((file) => {
      handleFileProcess(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Seletor simples de abas: Foto vs. Texto Manual */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setModo('foto')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            modo === 'foto'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Foto</span>
        </button>

        <button
          type="button"
          onClick={() => setModo('texto')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            modo === 'texto'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Texto Manual</span>
        </button>
      </div>

      {modo === 'foto' ? (
        /* Top Action & Upload Bar — Immediately visible at the top of Step 2 */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-4 sm:p-5 transition-all ${
            isDragOver
              ? 'border-amber-400 bg-amber-500/10 scale-[1.005]'
              : 'border-slate-700 bg-slate-900/75 hover:border-slate-600'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            multiple
            onChange={(e) => {
              handleMultipleFiles(e.target.files);
              e.target.value = '';
            }}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={(e) => {
              handleMultipleFiles(e.target.files);
              e.target.value = '';
            }}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Fotografias da Manifestação Patológica
                  </h3>
                  {registrosVistoria.length > 0 && (
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {registrosVistoria.length}{' '}
                      {registrosVistoria.length === 1
                        ? 'foto registrada no laudo'
                        : 'fotos registradas no laudo'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adicione ou arraste as fotos da vistoria. Cada foto enviada gera exatamente 1 registro patológico correspondente no PDF.
                </p>
              </div>
            </div>

            {/* Primary Upload & Analyze Buttons in Top Bar */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                {hasSelectedImage || registrosVistoria.length > 0 ? (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Nova Foto</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Selecionar Fotos</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm rounded-xl border border-slate-700 transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-sky-400" />
                <span>Câmera no Local</span>
              </button>

              {(hasSelectedImage || registrosVistoria.length > 0) && (
                <button
                  type="button"
                  onClick={onAnalyze}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Analisando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>Executar Diagnóstico ABNT</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Thumbnail Strip of User-Uploaded Photos for the Report */}
          {registrosVistoria.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-slate-800/90">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  Fotos Enviadas para o Laudo ({registrosVistoria.length}{' '}
                  {registrosVistoria.length === 1 ? 'item no PDF' : 'itens no PDF'}):
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar mais fotos</span>
                </button>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {registrosVistoria.map((reg, idx) => {
                  const isSelected =
                    selectedRegistroId === reg.id || selectedImage === reg.imagemUrl;
                  const anomPrincipal =
                    reg.resultado?.anomalias?.[0] || reg.resultado?.patologias?.[0];

                  return (
                    <div
                      key={reg.id}
                      onClick={() => onSelectRegistro?.(reg)}
                      className={`group relative flex items-center gap-2.5 p-2 rounded-xl border transition cursor-pointer shrink-0 min-w-[210px] max-w-[260px] ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 shadow-md'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={reg.imagemUrl}
                        alt={reg.nomeArquivo}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-amber-400">
                            Foto #{idx + 1}
                          </span>
                          {reg.resultado ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Clock3
                              className="w-3.5 h-3.5 text-amber-400 shrink-0"
                              aria-label="Aguardando validação e diagnóstico"
                            />
                          )}
                        </div>
                        <p className="text-xs font-semibold text-white truncate mt-0.5">
                          {anomPrincipal?.nome_patologia ||
                            (reg.resultado ? reg.nomeArquivo : 'Aguardando diagnóstico ABNT')}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate font-mono">
                          {reg.nomeArquivo}
                        </p>
                      </div>
                      {onRemoveRegistro && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRegistro(reg.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                          title="Remover esta foto do laudo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Modo Texto Manual: Campo limpo para descrição técnica ou escopo da obra */
        <div className="border border-slate-700 bg-slate-900/75 rounded-2xl p-4 sm:p-5 transition-all space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Descrição Técnica Manual da Patologia ou Escopo
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Digite a descrição detalhada das anomalias ou o escopo dos serviços. A IA formulará o laudo pericial completo conforme as normas da ABNT.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onAnalyzeTexto) {
                    onAnalyzeTexto(texto);
                  } else {
                    onAnalyze();
                  }
                }}
                disabled={isLoading || !texto.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Analisando Escopo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Executar Diagnóstico ABNT</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <textarea
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex: Identificado desplacamento de revestimento cerâmico nas pastilhas da fachada leste entre o 4º e o 6º pavimento, com presença de eflorescências salinas e som cavo à percussão. Há fissuras mapeadas no emboço e infiltração na junção de dilatação..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition font-sans leading-relaxed resize-y"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>{texto.trim().length} caracteres digitados</span>
              {texto.trim().length > 0 && (
                <span className="text-emerald-400 font-medium">Pronto para diagnóstico técnico pericial</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Inspection Context Parameters (Optional for Perito) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Dados da Edificação e do Laudo Pericial (Opcional)</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-xs font-normal">
            <span>{showAdvanced ? 'Recolher' : 'Preencher Dados'}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                Nome do Edifício / Condomínio:
              </label>
              <input
                type="text"
                value={contexto.nomeEdificio || ''}
                onChange={(e) => setContexto({ ...contexto, nomeEdificio: e.target.value })}
                placeholder="Ex: Edifício Solar das Palmeiras"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <HardHat className="w-3.5 h-3.5 text-amber-400" />
                Elemento / Substrato:
              </label>
              <input
                type="text"
                value={contexto.tipoElemento || ''}
                onChange={(e) => setContexto({ ...contexto, tipoElemento: e.target.value })}
                placeholder="Ex: Fachada Cerâmica, Viga V-102, Platibanda"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Idade Estimada da Edificação:
              </label>
              <input
                type="text"
                value={contexto.idadeEdificio || ''}
                onChange={(e) => setContexto({ ...contexto, idadeEdificio: e.target.value })}
                placeholder="Ex: 15 anos"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                Localização / Orientação:
              </label>
              <input
                type="text"
                value={contexto.localizacao || ''}
                onChange={(e) => setContexto({ ...contexto, localizacao: e.target.value })}
                placeholder="Ex: Fachada Norte (insolação direta), Orla marítima"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Engenheiro Perito / CREA:
              </label>
              <input
                type="text"
                value={contexto.responsavelTecnico || ''}
                onChange={(e) => setContexto({ ...contexto, responsavelTecnico: e.target.value })}
                placeholder="Ex: Eng. Civil André Luiz Nefi - CREA/SP"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Observações Preliminares:
              </label>
              <input
                type="text"
                value={contexto.observacoes || ''}
                onChange={(e) => setContexto({ ...contexto, observacoes: e.target.value })}
                placeholder="Ex: Queda recente de fragmentos ou histórico de infiltração"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Analysis Trigger Button */}
      {modo === 'foto' ? (
        hasSelectedImage ? (
          <div className="pt-2">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm sm:text-base rounded-xl shadow-xl shadow-amber-500/25 transition transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Processando Diagnóstico Pericial com IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-slate-950" />
                  <span>Executar Diagnóstico Técnico Pericial ABNT</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            Selecione uma fotografia ou capture pelo celular para habilitar o diagnóstico técnico pericial.
          </div>
        )
      ) : texto.trim() ? (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              if (onAnalyzeTexto) {
                onAnalyzeTexto(texto);
              } else {
                onAnalyze();
              }
            }}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm sm:text-base rounded-xl shadow-xl shadow-amber-500/25 transition transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Processando Diagnóstico Pericial com IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span>Executar Diagnóstico Técnico Pericial ABNT</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
          Digite a descrição técnica ou escopo da obra no campo acima para habilitar o diagnóstico pericial.
        </div>
      )}
    </div>
  );
};
