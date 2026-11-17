import React, { useState, useEffect } from 'react';
import { BASE_API_URL } from './api/apiClient';
import { recordService, EnterpriseRecord } from './services/recordService';
import { aiService, DiagnosticResult } from './services/aiService';
import {
  Server,
  Cloud,
  Cpu,
  Database,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

export default function App() {
  const [records, setRecords] = useState<EnterpriseRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Estados para criação de registro
  const [newEntityName, setNewEntityName] = useState('');
  const [newStatus, setNewStatus] = useState('active');

  // Estados para IA
  const [aiPrompt, setAiPrompt] = useState('Analise as manifestações técnicas deste elemento construtivo e aponte anomalias.');
  const [aiImageBase64, setAiImageBase64] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<DiagnosticResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const carregarRegistros = async () => {
    setLoadingRecords(true);
    setApiError(null);
    try {
      const data = await recordService.getAll();
      setRecords(data);
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    void carregarRegistros();
  }, []);

  const handleSalvarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntityName.trim()) return;

    try {
      const id = `REC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      await recordService.save({
        id,
        entityName: newEntityName,
        status: newStatus,
        metadata: {
          origem: 'Front-end Edge',
          timestamp: new Date().toISOString(),
        },
      });
      setNewEntityName('');
      void carregarRegistros();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleExcluirRegistro = async (id: string) => {
    try {
      await recordService.delete(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAiImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExecutarIA = async () => {
    if (!aiPrompt && !aiImageBase64) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const result = await aiService.runDiagnostic({
        prompt: aiPrompt,
        imageBase64: aiImageBase64 || undefined,
      });
      setAiResult(result);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Enterprise Fullstack Starter</h1>
              <p className="text-xs text-slate-400 font-mono">React 19 • Vite • Node.js VPS • Neon PostgreSQL • Gemini AI</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-sky-400" />
              API: {BASE_API_URL || 'Origem Relativa (Proxy Local)'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Banner de Erro Global */}
        {apiError && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-start justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Falha de Comunicação</strong>
                <p className="text-xs text-red-300 mt-0.5">{apiError}</p>
              </div>
            </div>
            <button
              onClick={() => void carregarRegistros()}
              className="px-3 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-xs text-white font-medium transition cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna 1: Persistência PostgreSQL / Neon */}
          <section className="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Banco de Dados (Neon PostgreSQL)</h2>
              </div>
              <button
                onClick={() => void carregarRegistros()}
                disabled={loadingRecords}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                title="Recarregar dados"
              >
                <RefreshCw className={`w-4 h-4 ${loadingRecords ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Form de Criação */}
            <form onSubmit={handleSalvarRegistro} className="flex gap-2">
              <input
                type="text"
                value={newEntityName}
                onChange={(e) => setNewEntityName(e.target.value)}
                placeholder="Nome da entidade / registro..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
              >
                <option value="active">Ativo</option>
                <option value="pending">Pendente</option>
                <option value="archived">Arquivado</option>
              </select>
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Salvar</span>
              </button>
            </form>

            {/* Lista de Registros */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {loadingRecords && records.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">Conectando ao banco Neon...</div>
              ) : records.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Nenhum registro encontrado no banco de dados.
                </div>
              ) : (
                records.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-amber-400">{r.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                          {r.status}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-200 mt-1">{r.entity_name}</p>
                    </div>
                    <button
                      onClick={() => handleExcluirRegistro(r.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Coluna 2: Inteligência Artificial (Gemini) */}
          <section className="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Diagnóstico com Google Gemini</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                JSON Estruturado
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Prompt da Perícia / Instrução:</label>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Instrução para a IA..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fotografia / Imagem (Opcional):</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadFoto}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              {aiImageBase64 && (
                <div className="relative rounded-xl overflow-hidden border border-slate-800 h-28 bg-slate-950 flex items-center justify-center">
                  <img src={aiImageBase64} alt="Preview" className="h-full object-contain" />
                  <button
                    onClick={() => setAiImageBase64(null)}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-900/90 text-[10px] text-rose-300 rounded hover:bg-rose-950 cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              )}

              <button
                onClick={handleExecutarIA}
                disabled={aiLoading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processando via Gemini AI...</span>
                  </>
                ) : (
                  <span>Executar Diagnóstico Técnico</span>
                )}
              </button>

              {aiError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                  {aiError}
                </div>
              )}

              {aiResult && (
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Diagnóstico Concluído
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Severidade: {aiResult.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{aiResult.summary}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
