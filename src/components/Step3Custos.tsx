import React from 'react';
import {
  Package,
  Users,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Calculator,
  Percent,
  ShieldAlert,
  HardHat,
  CreditCard,
  FileText,
} from 'lucide-react';
import {
  ItemMaterial,
  CargoProfissional,
  CalculosOrcamento,
  CondicoesComerciais,
} from '../types';
import {
  formatarMoeda,
  MATERIAIS_PADRAO,
  calcularParcelamentoComercial,
} from '../utils/budgetCalculator';

interface Step3CustosProps {
  materiais: ItemMaterial[];
  setMateriais: React.Dispatch<React.SetStateAction<ItemMaterial[]>>;
  equipe: CargoProfissional[];
  setEquipe: React.Dispatch<React.SetStateAction<CargoProfissional[]>>;
  mesesObra: number;
  setMesesObra: React.Dispatch<React.SetStateAction<number>>;
  calculos: CalculosOrcamento;
  condicoesComerciais: CondicoesComerciais;
  onUpdateCondicoesComerciais: (novasCondicoes: Partial<CondicoesComerciais>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const Step3Custos: React.FC<Step3CustosProps> = ({
  materiais,
  setMateriais,
  equipe,
  setEquipe,
  mesesObra,
  setMesesObra,
  calculos,
  condicoesComerciais,
  onUpdateCondicoesComerciais,
  onNext,
  onPrev,
}) => {
  const parcelamento = calcularParcelamentoComercial(calculos.valorGlobal, condicoesComerciais);
  // Add new material row
  const handleAddMaterial = () => {
    const novoItem: ItemMaterial = {
      id: `mat-${Date.now()}`,
      nome: 'Novo Insumo / Material',
      unidade: 'un',
      quantidade: 1,
      precoUnitario: 50,
    };
    setMateriais([...materiais, novoItem]);
  };

  // Remove material row
  const handleRemoveMaterial = (id: string) => {
    setMateriais(materiais.filter((m) => m.id !== id));
  };

  // Update material field
  const handleUpdateMaterial = (id: string, field: keyof ItemMaterial, value: any) => {
    setMateriais(
      materiais.map((m) => {
        if (m.id === id) {
          return { ...m, [field]: value };
        }
        return m;
      })
    );
  };

  // Update professional quantity
  const handleUpdateQuantidadeProfissional = (id: string, delta: number) => {
    setEquipe(
      equipe.map((p) => {
        if (p.id === id) {
          const novaQtd = Math.max(0, p.quantidade + delta);
          return { ...p, quantidade: novaQtd };
        }
        return p;
      })
    );
  };

  const handleSetQuantidadeProfissional = (id: string, val: number) => {
    setEquipe(
      equipe.map((p) => {
        if (p.id === id) {
          return { ...p, quantidade: Math.max(0, val) };
        }
        return p;
      })
    );
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calculator className="w-4 h-4" />
            Passo 3: Orçamentação Técnica & Backoffice
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
            Materiais, Insumos e Dimensionamento de Equipe
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Os custos diretos, encargos e contingências são recalculados instantaneamente de acordo com as diretrizes do projeto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMateriais(MATERIAIS_PADRAO)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-slate-700 transition cursor-pointer"
            title="Recarregar insumos habituais de restauração de fachadas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Insumos Padrão</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Tabela Dinâmica de Materiais */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">1. Planilha de Materiais e Insumos</h3>
              <p className="text-xs text-slate-400">
                Itens necessários para tratamento de substrato, ancoragem mecânica e repintura.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Subtotal Materiais</span>
              <span className="text-base font-bold font-mono text-amber-400">
                {formatarMoeda(calculos.custoMateriais)}
              </span>
            </div>

            <button
              onClick={handleAddMaterial}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Insumo</span>
            </button>
          </div>
        </div>

        {/* Dynamic Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-[11px] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 min-w-[240px]">Descrição do Material / Insumo</th>
                <th className="py-3 px-3 w-28">Unidade</th>
                <th className="py-3 px-3 w-28 text-center">Quantidade</th>
                <th className="py-3 px-3 w-36 text-right">Preço Unit. (R$)</th>
                <th className="py-3 px-4 w-36 text-right">Subtotal (R$)</th>
                <th className="py-3 px-3 w-12 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
              {materiais.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    Nenhum material adicionado. Clique no botão "Adicionar Insumo" acima.
                  </td>
                </tr>
              ) : (
                materiais.map((item, idx) => {
                  const subtotalItem = (Number(item.quantidade) || 0) * (Number(item.precoUnitario) || 0);

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/60 transition group">
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={item.nome}
                          onChange={(e) => handleUpdateMaterial(item.id, 'nome', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={item.unidade}
                          onChange={(e) => handleUpdateMaterial(item.id, 'unidade', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="saco">saco</option>
                          <option value="balde">balde 18L</option>
                          <option value="galão">galão 3.6L</option>
                          <option value="tubo">tubo 600ml</option>
                          <option value="rolo">rolo</option>
                          <option value="m²">m²</option>
                          <option value="m">metros</option>
                          <option value="kg">kg</option>
                          <option value="un">unidade</option>
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantidade}
                          onChange={(e) => handleUpdateMaterial(item.id, 'quantidade', Math.max(0, Number(e.target.value)))}
                          className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-2 py-1.5 text-xs text-center font-mono text-white focus:outline-none focus:border-amber-400"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={item.precoUnitario}
                          onChange={(e) => handleUpdateMaterial(item.id, 'precoUnitario', Math.max(0, Number(e.target.value)))}
                          className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono text-white focus:outline-none focus:border-amber-400"
                        />
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-200">
                        {formatarMoeda(subtotalItem)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleRemoveMaterial(item.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-red-500/10 cursor-pointer"
                          title="Remover insumo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Dimensionamento de Equipe e Prazo de Obra */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">2. Dimensionamento de Equipe & Cronograma</h3>
              <p className="text-xs text-slate-400">
                Alocação de mão de obra operacional e prazo de execução da recuperação da fachada.
              </p>
            </div>
          </div>

          {/* Duração em Meses de Obra */}
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <Calendar className="w-4 h-4 text-amber-400" />
            <label className="text-xs font-semibold text-slate-300">Prazo de Obra:</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="36"
                value={mesesObra}
                onChange={(e) => setMesesObra(Math.max(1, Number(e.target.value)))}
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sm text-amber-400 focus:outline-none focus:border-amber-400"
              />
              <span className="text-xs text-slate-400 font-medium">meses</span>
            </div>
          </div>
        </div>

        {/* Professional Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {equipe.map((prof) => {
            const subtotalMensal = prof.salarioBase * prof.quantidade;
            const subtotalObra = subtotalMensal * mesesObra;

            return (
              <div
                key={prof.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <HardHat className="w-3.5 h-3.5 text-amber-400" />
                      {prof.cargo}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                    {prof.descricaoFuncao}
                  </p>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Salário Base: <span className="text-slate-200 font-semibold">{formatarMoeda(prof.salarioBase)}/mês</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] font-mono">
                    <span className="text-slate-500 block">Total ({mesesObra}m):</span>
                    <span className="text-amber-400 font-bold">{formatarMoeda(subtotalObra)}</span>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center gap-1 bg-slate-900 rounded-lg border border-slate-800 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantidadeProfissional(prof.id, -1)}
                      className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white rounded hover:bg-slate-800 transition text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs text-white">
                      {prof.quantidade}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantidadeProfissional(prof.id, 1)}
                      className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white rounded hover:bg-slate-800 transition text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Prévia dos Cálculos Matemáticos Rígidos */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
          <Calculator className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
            Consolidação dos Custos Diretos & Encargos (Backoffice)
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">1. Materiais</span>
            <span className="text-sm font-bold text-slate-200 block mt-1">
              {formatarMoeda(calculos.custoMateriais)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">2. Mão de Obra Direta</span>
            <span className="text-sm font-bold text-slate-200 block mt-1">
              {formatarMoeda(calculos.maoDeObraDireta)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">({mesesObra} meses)</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">3. Periculosidade</span>
            <span className="text-sm font-bold text-amber-300 block mt-1">
              {formatarMoeda(calculos.periculosidade)}
            </span>
            <span className="text-[10px] text-amber-500/80 block mt-0.5">(30% sobre MO)</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">4. Encargos Sociais</span>
            <span className="text-sm font-bold text-sky-300 block mt-1">
              {formatarMoeda(calculos.encargosSociais)}
            </span>
            <span className="text-[10px] text-sky-500/80 block mt-0.5">(60% sobre MO)</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Custo Total Direto</span>
            <span className="text-sm font-bold text-emerald-400 block mt-1">
              {formatarMoeda(calculos.custoTotalDireto)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">(Mat + MO + Enc)</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block">Margem de Erro</span>
            <span className="text-sm font-bold text-rose-300 block mt-1">
              {formatarMoeda(calculos.margemErro)}
            </span>
            <span className="text-[10px] text-rose-400/80 block mt-0.5">(7% s/ Custo Direto)</span>
          </div>
        </div>
      </div>

      {/* SECTION 4: Condições Comerciais e Pagamento (Sincronizado com o Passo 4 e PDF) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                3. Condições Comerciais, Entrada e Parcelamento
              </h3>
              <p className="text-xs text-slate-400">
                Defina o percentual/parcelas de entrada, o parcelamento mensal do saldo restante e as observações de faturamento do PDF.
              </p>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-[10px] text-slate-500 uppercase block">Valor Global Estimado</span>
            <span className="text-sm font-bold text-amber-400">
              {formatarMoeda(calculos.valorGlobal)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Percentual de Entrada */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <label className="block font-semibold text-slate-300">
              Percentual de Entrada (%):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={condicoesComerciais.percentualEntrada}
                onChange={(e) =>
                  onUpdateCondicoesComerciais({
                    percentualEntrada: Math.min(100, Math.max(0, Number(e.target.value))),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400"
              />
              <span className="font-mono text-slate-400 font-bold">%</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Sinal: <strong className="text-emerald-400">{formatarMoeda(parcelamento.valorEntradaTotal)}</strong>
            </div>
          </div>

          {/* Parcelas da Entrada */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <label className="block font-semibold text-slate-300">
              Parcelas da Entrada (Qtd.):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="12"
                step="1"
                value={condicoesComerciais.parcelasEntrada}
                onChange={(e) =>
                  onUpdateCondicoesComerciais({
                    parcelasEntrada: Math.max(1, Math.round(Number(e.target.value) || 1)),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono font-bold text-white focus:outline-none focus:border-amber-400"
              />
              <span className="font-mono text-slate-400">x</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {parcelamento.parcelasEntrada}x de{' '}
              <strong className="text-slate-200">{formatarMoeda(parcelamento.valorParcelaEntrada)}</strong>
            </div>
          </div>

          {/* Parcelas Mensais do Saldo Restante */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <label className="block font-semibold text-slate-300">
              Parcelas Mensais do Saldo ({parcelamento.percentualSaldo}%):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="60"
                step="1"
                value={condicoesComerciais.parcelasSaldo}
                onChange={(e) =>
                  onUpdateCondicoesComerciais({
                    parcelasSaldo: Math.max(1, Math.round(Number(e.target.value) || 1)),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono font-bold text-sky-400 focus:outline-none focus:border-amber-400"
              />
              <span className="font-mono text-slate-400">meses</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {parcelamento.parcelasSaldo}x de{' '}
              <strong className="text-sky-300">{formatarMoeda(parcelamento.valorParcelaSaldo)}</strong>
            </div>
          </div>

          {/* Modalidade / Meio de Pagamento */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <label className="block font-semibold text-slate-300">
              Meio de Pagamento / Validade:
            </label>
            <input
              type="text"
              value={condicoesComerciais.formaPagamento}
              onChange={(e) =>
                onUpdateCondicoesComerciais({ formaPagamento: e.target.value })
              }
              placeholder="Ex: Boleto Bancário / PIX / TED"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
            <div className="text-[11px] font-mono text-slate-400">
              Saldo: <strong className="text-slate-200">{formatarMoeda(parcelamento.valorSaldoTotal)}</strong>
            </div>
          </div>
        </div>

        {/* Observações de Faturamento */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Observações de Faturamento e Condições Contratuais (Exibido no PDF):</span>
          </label>
          <textarea
            rows={3}
            value={condicoesComerciais.observacoesFaturamento}
            onChange={(e) =>
              onUpdateCondicoesComerciais({ observacoesFaturamento: e.target.value })
            }
            placeholder="Descreva as condições de faturamento, emissão de NF-e, medições quinzenais ou cláusulas específicas..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrev}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Diagnóstico (Passo 2)</span>
        </button>

        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
        >
          <span>Avançar para Passo 4 (Resumo Financeiro)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
