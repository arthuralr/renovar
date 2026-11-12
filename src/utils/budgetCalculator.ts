import { ItemMaterial, CargoProfissional, CalculosOrcamento, CondicoesComerciais } from '../types';

export const CONDICOES_COMERCIAIS_PADRAO: CondicoesComerciais = {
  percentualEntrada: 20,
  parcelasEntrada: 1,
  parcelasSaldo: 4,
  formaPagamento: 'Boleto Bancário Registrado / PIX Corporativo / Transferência TED',
  prazoValidadeDias: 30,
  observacoesFaturamento:
    'Sinal na assinatura do contrato para compra antecipada de materiais e mobilização inicial de canteiro e equipamentos. O saldo remanescente será faturado em parcelas mensais mediante emissão de Nota Fiscal Eletrônica (NF-e), vinculadas aos laudos de medição de evolução física quinzenal aprovados pela administração e comissão de obras.',
};

export function calcularParcelamentoComercial(
  valorGlobal: number,
  condicoes: CondicoesComerciais
) {
  const total = Math.max(0, Number(valorGlobal) || 0);
  const pctEntrada = Math.min(100, Math.max(0, Number(condicoes.percentualEntrada) || 0));
  const qtdParcelasEntrada = Math.max(1, Math.round(Number(condicoes.parcelasEntrada) || 1));
  const qtdParcelasSaldo = Math.max(1, Math.round(Number(condicoes.parcelasSaldo) || 1));

  const valorEntradaTotal = total * (pctEntrada / 100);
  const valorParcelaEntrada = valorEntradaTotal / qtdParcelasEntrada;

  const percentualSaldo = Math.max(0, 100 - pctEntrada);
  const valorSaldoTotal = Math.max(0, total - valorEntradaTotal);
  const valorParcelaSaldo = pctEntrada >= 100 ? 0 : valorSaldoTotal / qtdParcelasSaldo;

  return {
    percentualEntrada: pctEntrada,
    parcelasEntrada: qtdParcelasEntrada,
    valorEntradaTotal,
    valorParcelaEntrada,
    percentualSaldo,
    parcelasSaldo: qtdParcelasSaldo,
    valorSaldoTotal,
    valorParcelaSaldo,
  };
}

export const PROFISSIONAIS_PADRAO: CargoProfissional[] = [
  {
    id: 'engenheiro',
    cargo: 'Engenheiro Civil Residente / RT',
    salarioBase: 10500,
    quantidade: 1,
    descricaoFuncao: 'Responsabilidade técnica, vistorias periódicas e ART.',
  },
  {
    id: 'encarregado',
    cargo: 'Encarregado Geral de Obras',
    salarioBase: 5200,
    quantidade: 1,
    descricaoFuncao: 'Gestão diária de canteiro, segurança e produtividade.',
  },
  {
    id: 'pintor_n1',
    cargo: 'Pintor Nível 1',
    salarioBase: 3092, // Conforme exemplo especificado pelo usuário
    quantidade: 2,
    descricaoFuncao: 'Tratamento de trincas, lixamento e pintura de fachadas.',
  },
  {
    id: 'pintor_n2',
    cargo: 'Pintor Nível 2 (Fachadeiro / Balancim)',
    salarioBase: 3850,
    quantidade: 2,
    descricaoFuncao: 'Trabalho em altura, hidrojateamento e recuperação de pastilhas.',
  },
  {
    id: 'servente',
    cargo: 'Servente de Obras',
    salarioBase: 2150,
    quantidade: 2,
    descricaoFuncao: 'Apoio logístico, limpeza de substrato e preparo de massas.',
  },
];

export const MATERIAIS_PADRAO: ItemMaterial[] = [
  {
    id: 'mat-1',
    nome: 'Argamassa Polimérica Tixotrópica R4 (Saco 25kg)',
    unidade: 'saco',
    quantidade: 40,
    precoUnitario: 88.50,
  },
  {
    id: 'mat-2',
    nome: 'Tinta Acrílica Elastomérica para Fachada (Balde 18L)',
    unidade: 'balde',
    quantidade: 35,
    precoUnitario: 420.00,
  },
  {
    id: 'mat-3',
    nome: 'Primer Anticorrosivo Rico em Zinco (Galão 3,6L)',
    unidade: 'galão',
    quantidade: 10,
    precoUnitario: 245.00,
  },
  {
    id: 'mat-4',
    nome: 'Selante Mastique Poliuretano PU 40 Fachada (Tubo 600ml)',
    unidade: 'tubo',
    quantidade: 60,
    precoUnitario: 38.00,
  },
  {
    id: 'mat-5',
    nome: 'Tela de Poliéster Resinada para Fissuras (Rolo 50m)',
    unidade: 'rolo',
    quantidade: 6,
    precoUnitario: 145.00,
  },
  {
    id: 'mat-6',
    nome: 'Argamassa Colante AC-III Branca para Pastilha (Saco 20kg)',
    unidade: 'saco',
    quantidade: 25,
    precoUnitario: 48.00,
  },
];

export function calcularOrcamento(
  materiais: ItemMaterial[],
  equipe: CargoProfissional[],
  mesesObra: number,
  margemLucroPercentual: number
): CalculosOrcamento {
  const meses = Math.max(1, Number(mesesObra) || 1);

  // 1. Custo de Materiais = Soma de (Quantidade * Preço Unitário)
  const custoMateriais = materiais.reduce((acc, item) => {
    const qtd = Number(item.quantidade) || 0;
    const preco = Number(item.precoUnitario) || 0;
    return acc + qtd * preco;
  }, 0);

  // 2. Mão de Obra Direta = (Soma dos salários base dos profissionais preenchidos) * Meses de obra
  const salariosMensaisTotal = equipe.reduce((acc, prof) => {
    const qtd = Math.max(0, Number(prof.quantidade) || 0);
    const salario = Number(prof.salarioBase) || 0;
    return acc + qtd * salario;
  }, 0);

  const maoDeObraDireta = salariosMensaisTotal * meses;

  // 3. Periculosidade = 30% sobre o total da Mão de Obra Direta
  const periculosidade = maoDeObraDireta * 0.30;

  // 4. Encargos Sociais = 60% sobre o total da Mão de Obra Direta
  const encargosSociais = maoDeObraDireta * 0.60;

  // 5. Custo Total Direto = Materiais + Mão de Obra Direta + Periculosidade + Encargos
  const custoTotalDireto = custoMateriais + maoDeObraDireta + periculosidade + encargosSociais;

  // 6. Margem de Erro = 7% sobre o Custo Total Direto
  const margemErro = custoTotalDireto * 0.07;

  // 7. Margem de Lucro (%) digitada pelo usuário
  const pctLucro = Math.max(0, Number(margemLucroPercentual) || 0);
  const valorMargemLucro = (custoTotalDireto + margemErro) * (pctLucro / 100);

  // 8. Valor Global = Custo Total Direto + Margem de Erro + Margem de Lucro
  const valorGlobal = custoTotalDireto + margemErro + valorMargemLucro;

  return {
    custoMateriais,
    salariosMensaisTotal,
    mesesObra: meses,
    maoDeObraDireta,
    periculosidade,
    encargosSociais,
    custoTotalDireto,
    margemErro,
    margemLucroPercentual: pctLucro,
    valorMargemLucro,
    valorGlobal,
  };
}

export function formatarMoeda(valor: number): string {
  return (valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
