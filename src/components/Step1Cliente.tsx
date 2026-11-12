import React from 'react';
import { Building2, FileText, MapPin, User, Calendar, Layers, Phone, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { DadosCliente } from '../types';

interface Step1ClienteProps {
  dados: DadosCliente;
  onChange: (novosDados: Partial<DadosCliente>) => void;
  onNext: () => void;
}

export const Step1Cliente: React.FC<Step1ClienteProps> = ({ dados, onChange, onNext }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  // Mask helper for CNPJ
  const handleCnpjChange = (value: string) => {
    const raw = value.replace(/\D/g, '').slice(0, 14);
    let formatted = raw;
    if (raw.length > 12) {
      formatted = raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
    } else if (raw.length > 8) {
      formatted = raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
    } else if (raw.length > 5) {
      formatted = raw.replace(/^(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (raw.length > 2) {
      formatted = raw.replace(/^(\d{2})(\d{1,3})/, '$1.$2');
    }
    onChange({ cnpj: formatted });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 pb-5 border-b border-slate-800 mb-6">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Dados Cadastrais do Cliente & Edificação
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Identificação formal do condomínio para emissão do diagnóstico pericial e proposta orçamentária.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Nome do Condomínio */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                Nome do Condomínio / Edifício *
              </label>
              <input
                type="text"
                required
                value={dados.nomeCondominio}
                onChange={(e) => onChange({ nomeCondominio: e.target.value })}
                placeholder="Ex: Condomínio Edifício Solar das Palmeiras"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition"
              />
            </div>

            {/* CNPJ */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                CNPJ do Condomínio (Opcional)
              </label>
              <input
                type="text"
                value={dados.cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition"
              />
            </div>

            {/* Endereço Completo */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Endereço da Obra *
              </label>
              <input
                type="text"
                required
                value={dados.endereco}
                onChange={(e) => onChange({ endereco: e.target.value })}
                placeholder="Ex: Av. Atlântica, 1420 - Ponta da Praia - Santos/SP"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition"
              />
            </div>

            {/* Nome do Síndico */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Nome do Síndico / Gestor Predial *
              </label>
              <input
                type="text"
                required
                value={dados.nomeSindico}
                onChange={(e) => onChange({ nomeSindico: e.target.value })}
                placeholder="Ex: Carlos Eduardo de Oliveira"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition"
              />
            </div>

            {/* Ano de Construção */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Ano de Construção (Idade) (Opcional)
              </label>
              <input
                type="text"
                value={dados.anoConstrucao}
                onChange={(e) => onChange({ anoConstrucao: e.target.value })}
                placeholder="Ex: 2008 (18 anos)"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition"
              />
            </div>

            {/* Pavimentos */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Número de Pavimentos (Opcional)
              </label>
              <input
                type="text"
                value={dados.pavimentos}
                onChange={(e) => onChange({ pavimentos: e.target.value })}
                placeholder="Ex: 18 andares + 2 subsolos"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition"
              />
            </div>

            {/* Telefone / WhatsApp */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                Telefone / WhatsApp (Opcional)
              </label>
              <input
                type="text"
                value={dados.telefone || ''}
                onChange={(e) => onChange({ telefone: e.target.value })}
                placeholder="(11) 98765-4321"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition"
              />
            </div>

            {/* E-mail */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                E-mail para Envio da Proposta (Opcional)
              </label>
              <input
                type="email"
                value={dados.email || ''}
                onChange={(e) => onChange({ email: e.target.value })}
                placeholder="sindico@condominio.com.br"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Etapa 1 de 4 do Orçamento
            </span>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <span>Avançar para Passo 2 (Diagnóstico Pericial)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
