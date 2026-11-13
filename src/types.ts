export interface PatologiaItem {
  nome_patologia: string;
  gravidade: string; // "Crítica" | "Alta" | "Média" | "Leve"
  constatacao_visual: string;
  descricao?: string; // alias para compatibilidade
  justificativa_tecnica_causa: string;
  causa_provavel?: string; // alias para compatibilidade
  risco_evolutivo_consequencias: string;
  risco_evolutivo?: string; // alias para compatibilidade
  normas_tecnicas_abnt: string[];
  ensaios_complementares: string[];
  diretrizes_reparo: string[];
}

export interface DiagnosticoResponse {
  anomalias?: PatologiaItem[];
  patologias: PatologiaItem[];
}

export interface InspecaoContexto {
  nomeEdificio?: string;
  tipoElemento?: string;
  idadeEdificio?: string;
  localizacao?: string;
  observacoes?: string;
  responsavelTecnico?: string;
  crea?: string;
  artNumero?: string;
}

export interface HistoricoInspecao {
  id: string;
  dataHora: string;
  imagemUrl: string;
  nomeArquivo: string;
  contexto: InspecaoContexto;
  resultado: DiagnosticoResponse | null;
}

export interface DetalhesPatologiaCalculados {
  gravidade: 'Crítica' | 'Alta' | 'Média' | 'Leve';
  urgencia: 'Imediata' | 'Curto Prazo (<90 dias)' | 'Médio Prazo' | 'Preventiva';
  normasAbnt: string[];
  ensaiosRecomendados: string[];
  metodologiaReparo: string[];
}

// Wizard Step 1: Dados do Cliente
export interface DadosCliente {
  nomeCondominio: string;
  cnpj: string;
  endereco: string;
  nomeSindico: string;
  anoConstrucao: string;
  pavimentos: string;
  telefone?: string;
  email?: string;
}

// Wizard Step 3: Materiais
export interface ItemMaterial {
  id: string;
  nome: string;
  unidade: string; // saco, lata, un, m², m, kg
  quantidade: number;
  precoUnitario: number;
}

// Wizard Step 3: Dimensionamento de Equipe
export interface CargoProfissional {
  id: string;
  cargo: string;
  salarioBase: number; // Salário base mensal
  quantidade: number;
  descricaoFuncao?: string;
}

// Wizard Step 4: Cálculos Financeiros (Backoffice rígido)
export interface CalculosOrcamento {
  custoMateriais: number;
  salariosMensaisTotal: number;
  mesesObra: number;
  maoDeObraDireta: number; // (Soma dos salários) * Meses
  periculosidade: number; // 30% sobre Mão de Obra Direta
  encargosSociais: number; // 60% sobre Mão de Obra Direta
  custoTotalDireto: number; // Materiais + MO + Periculosidade + Encargos
  margemErro: number; // 7% sobre Custo Total Direto
  margemLucroPercentual: number; // % digitado pelo usuário (ex: 20%)
  valorMargemLucro: number;
  valorGlobal: number; // Custo Total Direto + Margem Erro + Margem Lucro
}

// Condições Comerciais e Pagamento da Proposta
export interface CondicoesComerciais {
  percentualEntrada: number; // ex: 20 (%)
  parcelasEntrada: number; // ex: 1 (à vista) ou mais parcelas de entrada
  parcelasSaldo: number; // ex: 4 parcelas mensais do saldo restante
  formaPagamento: string; // ex: 'Boleto Bancário Registrado / PIX / TED'
  prazoValidadeDias: number; // ex: 30 dias
  observacoesFaturamento: string; // Observações customizadas de faturamento e medição
}

// Etapas do Kanban de Acompanhamento de Orçamentos
export type StatusOrcamentoKanban =
  | 'em_elaboracao'
  | 'enviado_sindico'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'recusado';

// Registro completo de Orçamento Salvo no Histórico / Kanban
export interface OrcamentoSalvo {
  id: string; // ex: PROP-2026-4821
  dataCriacao: string; // ISO string
  dataAtualizacao: string; // ISO string
  status: StatusOrcamentoKanban;
  dadosCliente: DadosCliente;
  calculos: CalculosOrcamento;
  condicoesComerciais: CondicoesComerciais;
  materiais: ItemMaterial[];
  equipe: CargoProfissional[];
  mesesObra: number;
  margemLucroPercentual: number;
  diagnostico: DiagnosticoResponse | null;
  registrosVistoria?: HistoricoInspecao[];
  selectedImage?: string | null;
}

export type WizardStep = 1 | 2 | 3 | 4;
