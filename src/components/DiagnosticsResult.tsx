import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  FileCode,
  Printer,
  Copy,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Wrench,
  Search,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  ListOrdered,
  FileText
} from 'lucide-react';
import { DiagnosticoResponse, InspecaoContexto, PatologiaItem } from '../types';
import { classificarPatologia } from '../utils/abntEngine';

interface DiagnosticsResultProps {
  resultado: DiagnosticoResponse;
  contexto: InspecaoContexto;
  imageUrl: string;
  onOpenJson: () => void;
  onOpenReport: () => void;
  onReset: () => void;
}

export const DiagnosticsResult: React.FC<DiagnosticsResultProps> = ({
  resultado,
  contexto,
  imageUrl,
  onOpenJson,
  onOpenReport,
  onReset,
}) => {
  const [expandedTabs, setExpandedTabs] = useState<Record<number, boolean>>({ 0: true });
  const [copiedText, setCopiedText] = useState(false);

  const toggleExpand = (index: number) => {
    setExpandedTabs((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const lista = resultado.anomalias || resultado.patologias || [];

  const handleCopySummary = () => {
    let text = `LAUDO PERICIAL DE ENGENHARIA DIAGNÓSTICA - MANIFESTAÇÕES PATOLÓGICAS\n`;
    if (contexto.nomeEdificio) text += `Edificação: ${contexto.nomeEdificio}\n`;
    text += `Data da Análise: ${new Date().toLocaleDateString('pt-BR')}\n`;
    text += `Responsável Técnico: ${contexto.responsavelTecnico || 'Eng. Civil Perito'}\n\n`;

    lista.forEach((p, idx) => {
      text += `=========================================\n`;
      text += `ANOMALIA #${idx + 1}: ${p.nome_patologia} [GRAVIDADE: ${p.gravidade || 'Média'}]\n`;
      text += `=========================================\n`;
      text += `1. CONSTATAÇÃO VISUAL E ASPECTO TÉCNICO:\n${p.constatacao_visual || p.descricao}\n\n`;
      text += `2. JUSTIFICATIVA TÉCNICA E CAUSA PROVÁVEL:\n${p.justificativa_tecnica_causa || p.causa_provavel}\n\n`;
      text += `3. RISCO EVOLUTIVO E CONSEQUÊNCIAS:\n${p.risco_evolutivo_consequencias || p.risco_evolutivo}\n\n`;
      if (p.normas_tecnicas_abnt?.length) {
        text += `4. NORMAS TÉCNICAS ABNT:\n- ${p.normas_tecnicas_abnt.join('\n- ')}\n\n`;
      }
      if (p.ensaios_complementares?.length) {
        text += `5. ENSAIOS COMPLEMENTARES:\n- ${p.ensaios_complementares.join('\n- ')}\n\n`;
      }
      if (p.diretrizes_reparo?.length) {
        text += `6. DIRETRIZES DE REPARO:\n${p.diretrizes_reparo.join('\n')}\n\n`;
      }
    });

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const totalPatologias = lista.length;
  const temRiscoCritico = lista.some(
    (p) => p.gravidade?.toLowerCase().includes('crítica') || p.gravidade?.toLowerCase().includes('critica')
  );

  return (
    <div className="space-y-6">
      {/* Top Engineering Alert Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        temRiscoCritico
          ? 'bg-red-950/40 border-red-800/80 text-red-200'
          : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
      } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${temRiscoCritico ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'} mt-0.5`}>
            {temRiscoCritico ? <AlertOctagon className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h4 className="font-bold text-base text-white flex items-center gap-2">
              <span>Diagnóstico Pericial Concluído</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono uppercase ${
                temRiscoCritico ? 'bg-red-500 text-slate-950 font-bold' : 'bg-amber-500 text-slate-950 font-bold'
              }`}>
                {temRiscoCritico ? 'Gravidade Crítica (Intervenção Urgente)' : 'Manutenção Corretiva Necessária'}
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {totalPatologias === 1
                ? 'Foi catalogada 1 anomalia patológica principal com 7 dimensões periciais completas.'
                : `Foram catalogadas ${totalPatologias} anomalias patológicas inter-relacionadas no elemento inspecionado.`}
              {' '}As diretrizes de reparo e ensaios complementares seguem as normas ABNT vigentes.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onOpenJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-mono font-medium transition cursor-pointer"
            title="Visualizar JSON estruturado pericial"
          >
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>JSON Pericial</span>
          </button>

          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-md shadow-amber-500/20 cursor-pointer"
            title="Emitir Laudo Oficial ABNT para PDF ou Impressora"
          >
            <Printer className="w-4 h-4" />
            <span>Gerar Laudo (PDF)</span>
          </button>
        </div>
      </div>

      {/* Pathology Breakdown List */}
      <div className="space-y-5">
        {lista.map((patologia: PatologiaItem, index: number) => {
          const fallbackInfo = classificarPatologia(patologia);
          const gravidade = patologia.gravidade || fallbackInfo.gravidade;
          const normas = patologia.normas_tecnicas_abnt?.length ? patologia.normas_tecnicas_abnt : fallbackInfo.normasAbnt;
          const ensaios = patologia.ensaios_complementares?.length ? patologia.ensaios_complementares : fallbackInfo.ensaiosRecomendados;
          const reparo = patologia.diretrizes_reparo?.length ? patologia.diretrizes_reparo : fallbackInfo.metodologiaReparo;
          const isExpanded = expandedTabs[index] ?? false;

          const isCritica = gravidade.toLowerCase().includes('crítica') || gravidade.toLowerCase().includes('critica');
          const isAlta = gravidade.toLowerCase().includes('alta');

          return (
            <div
              key={index}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition hover:border-slate-700"
            >
              {/* Pathology Card Header */}
              <div
                onClick={() => toggleExpand(index)}
                className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none bg-slate-900/80 hover:bg-slate-800/50 transition border-b border-slate-800/80"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/30 shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-2">
                      <span>{patologia.nome_patologia}</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold font-mono uppercase ${
                        isCritica
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : isAlta
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        Gravidade {gravidade}
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="text-slate-400 hover:text-white transition p-1">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>

              {/* Pathology Content Section */}
              <div className="p-4 sm:p-6 space-y-5">
                {/* 1. Constatação Visual e Aspecto Técnico */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
                    <Search className="w-4 h-4" />
                    <span>1. Constatação Visual e Aspecto Técnico</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {patologia.constatacao_visual || patologia.descricao}
                  </div>
                </div>

                {/* 2. Justificativa Técnica e Causa Provável */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                    <Wrench className="w-4 h-4" />
                    <span>2. Justificativa Técnica e Causa Provável</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {patologia.justificativa_tecnica_causa || patologia.causa_provavel}
                  </div>
                </div>

                {/* 3. Risco Evolutivo e Consequências */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider font-mono">
                    <TrendingUp className="w-4 h-4" />
                    <span>3. Risco Evolutivo e Consequências (Estrutural & Financeiro)</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/40 text-xs sm:text-sm text-red-200/90 leading-relaxed">
                    {patologia.risco_evolutivo_consequencias || patologia.risco_evolutivo}
                  </div>
                </div>

                {/* 4. Normas Técnicas ABNT Aplicáveis */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                    <BookOpen className="w-4 h-4" />
                    <span>4. Normas Técnicas ABNT Aplicáveis ao Caso e Reparo</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {normas.map((norma, nIdx) => (
                      <span
                        key={nIdx}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{norma}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* 5. Ensaios Complementares de Campo e Laboratório */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-wider font-mono">
                    <ShieldCheck className="w-4 h-4" />
                    <span>5. Ensaios Complementares para Confirmação do Diagnóstico</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                    {ensaios.map((ensaio, eIdx) => (
                      <div
                        key={eIdx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 leading-relaxed"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />
                        <span>{ensaio}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. Diretrizes Técnicas de Reparo (Passo a Passo) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                    <ListOrdered className="w-4 h-4" />
                    <span>6. Diretrizes Técnicas de Reparo e Metodologia de Recuperação</span>
                  </div>
                  <div className="space-y-2 pt-1">
                    {reparo.map((etapa, rIdx) => (
                      <div
                        key={rIdx}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 leading-relaxed flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-400 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 border border-cyan-500/20">
                          {rIdx + 1}
                        </span>
                        <span className="flex-1">{etapa.replace(/^\d+[\.\-\)]\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Inspecionar Outra Fotografia</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            {copiedText ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copiar Parecer Completo</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenReport}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Emitir Laudo ABNT Oficial</span>
          </button>
        </div>
      </div>
    </div>
  );
};
