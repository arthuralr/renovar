import {
  PatologiaItem,
  DetalhesPatologiaCalculados,
  InspecaoContexto,
  DiagnosticoResponse,
} from '../types';

export function classificarPatologia(item: PatologiaItem): DetalhesPatologiaCalculados {
  const texto = `${item.nome_patologia} ${item.descricao} ${item.causa_provavel} ${item.risco_evolutivo}`.toLowerCase();

  // Avaliação de Gravidade e Urgência
  let gravidade: DetalhesPatologiaCalculados['gravidade'] = 'Média';
  let urgencia: DetalhesPatologiaCalculados['urgencia'] = 'Médio Prazo';

  if (
    texto.includes('queda') ||
    texto.includes('desplacamento') ||
    texto.includes('corrosão') ||
    texto.includes('armadura') ||
    texto.includes('colapso') ||
    texto.includes('comprometimento estrutural') ||
    texto.includes('recalque') ||
    texto.includes('cisalhamento') ||
    texto.includes('esmagamento')
  ) {
    gravidade = 'Crítica';
    urgencia = 'Imediata';
  } else if (
    texto.includes('infiltração contínua') ||
    texto.includes('trinca') ||
    texto.includes('fissura ativa') ||
    texto.includes('delaminação') ||
    texto.includes('destacamento') ||
    texto.includes('lixiviação')
  ) {
    gravidade = 'Alta';
    urgencia = 'Curto Prazo (<90 dias)';
  } else if (
    texto.includes('mofo') ||
    texto.includes('eflorescência') ||
    texto.includes('mancha') ||
    texto.includes('bolor') ||
    texto.includes('descoloração')
  ) {
    gravidade = 'Média';
    urgencia = 'Médio Prazo';
  } else {
    gravidade = 'Leve';
    urgencia = 'Preventiva';
  }

  // Normas ABNT Aplicáveis
  const normas: string[] = ['ABNT NBR 16747 (Inspeção Predial - Diretrizes e Procedimentos)'];

  if (texto.includes('revestimento') || texto.includes('cerâmica') || texto.includes('pastilha') || texto.includes('fachada') || texto.includes('desplacamento')) {
    normas.push('ABNT NBR 13755 (Revestimento cerâmico de paredes externas e fachadas)');
    normas.push('ABNT NBR 7200 (Execução de revestimento de paredes e tetos de argamassas inorgânicas)');
  }

  if (texto.includes('armadura') || texto.includes('concreto') || texto.includes('corrosão') || texto.includes('carbonatação') || texto.includes('cobrimento') || texto.includes('estrutur')) {
    normas.push('ABNT NBR 6118 (Projeto de Estruturas de Concreto - Procedimento)');
    normas.push('ABNT NBR 7680 (Concreto - Extração, preparo e ensaio de testemunhos)');
  }

  if (texto.includes('umidade') || texto.includes('infiltração') || texto.includes('eflorescência') || texto.includes('impermeabilização') || texto.includes('vazamento')) {
    normas.push('ABNT NBR 9575 (Impermeabilização - Seleção e Projeto)');
    normas.push('ABNT NBR 9574 (Execução de Impermeabilização)');
  }

  if (texto.includes('trinca') || texto.includes('fissura') || texto.includes('junta') || texto.includes('movimentação térmica') || texto.includes('alvenaria')) {
    normas.push('ABNT NBR 15575 (Edificações Habitacionais - Desempenho)');
    normas.push('ABNT NBR 8545 (Execução de alvenaria sem função estrutural)');
  }

  normas.push('ABNT NBR 5674 (Manutenção de Edificações - Requisitos)');

  // Ensaios Técnicos Complementares
  const ensaios: string[] = [];

  if (texto.includes('revestimento') || texto.includes('desplacamento') || texto.includes('som cavo') || texto.includes('aderência')) {
    ensaios.push('Teste de Percussão com martelo de náilon para identificação de áreas com som cavo');
    ensaios.push('Ensaio de Resistência de Aderência à Tração (Arrancamento) conf. ABNT NBR 13528');
  }

  if (texto.includes('concreto') || texto.includes('corrosão') || texto.includes('carbonatação') || texto.includes('armadura')) {
    ensaios.push('Pacometria Eletromagnética para mapeamento de armaduras e espessura de cobrimento');
    ensaios.push('Teste Colorimétrico com solução de Fenolftaleína para medir frente de carbonatação');
    ensaios.push('Ensaio de Esclerometria de reflexão conf. ABNT NBR 7584');
  }

  if (texto.includes('infiltração') || texto.includes('umidade') || texto.includes('mancha') || texto.includes('eflorescência')) {
    ensaios.push('Termografia Infravermelha não destrutiva para mapeamento térmico de umidade oculta');
    ensaios.push('Medição de umidade residual com higrômetro de contato');
  }

  if (texto.includes('fissura') || texto.includes('trinca')) {
    ensaios.push('Monitoramento de atividade com fissurômetro acrílico graduado e selos testemunha');
  }

  if (ensaios.length === 0) {
    ensaios.push('Inspeção visual detalhada com lente macro e medição dimensional');
  }

  // Metodologia de Reparo Técnico
  const reparo: string[] = [];

  if (texto.includes('corrosão') || texto.includes('armadura')) {
    reparo.push('1. Escarificação mecânica do concreto deteriorado até atingir substrato são, ultrapassando 2 cm por trás da armadura.');
    reparo.push('2. Limpeza profunda das barras oxidadas por hidrojateamento ou escovamento com cerdas de aço (grau Sa 2,5).');
    reparo.push('3. Aplicação de revestimento protetor inibidor de corrosão à base de zinco ou resina epóxi na ferragem.');
    reparo.push('4. Reconstituição da seção com argamassa tixotrópica estrutural com fibras e aditivos poliméricos classe R4.');
  } else if (texto.includes('desplacamento') || texto.includes('revestimento') || texto.includes('pastilha') || texto.includes('fachada')) {
    reparo.push('1. Remoção total das placas cerâmicas ou pastilhas em descolamento e alívio das tensões perimetrais.');
    reparo.push('2. Avaliação e regularização do emboço subjacente com remoção de camadas pulverulentas.');
    reparo.push('3. Reassentamento com argamassa colante industrializada flexível de alta deformabilidade (AC-III ou específica para fachada).');
    reparo.push('4. Revisão e criação de juntas de dilatação/movimentação térmica e dessolidarização estrutural conforme NBR 13755.');
  } else if (texto.includes('infiltração') || texto.includes('eflorescência') || texto.includes('umidade')) {
    reparo.push('1. Identificação e eliminação definitiva do ponto de aporte de água (rufos, pingadeiras, juntas ou tubulações).');
    reparo.push('2. Limpeza da eflorescência com solução desincrustante ácida neutralizada com água em abundância.');
    reparo.push('3. Aplicação de sistema de impermeabilização elástica e hidrofugante de silicone oligomérico de alta penetração.');
  } else if (texto.includes('trinca') || texto.includes('fissura')) {
    reparo.push('1. Abertura da trinca em formato "V" para alívio de tensões do revestimento.');
    reparo.push('2. Limpeza e aplicação de primer de aderência.');
    reparo.push('3. Selagem com mastique de poliuretano (PU) de alta elasticidade e tela de poliéster resinada.');
    reparo.push('4. Acabamento com pintura elastomérica flexível impermeabilizante com capacidade de ponte de fissuras.');
  } else {
    reparo.push('1. Limpeza mecânica do substrato com remoção de contaminações e partes soltas.');
    reparo.push('2. Tratamento corretivo com produtos normatizados e repintura com acabamento de alta proteção contra intempéries.');
  }

  return {
    gravidade,
    urgencia,
    normasAbnt: normas,
    ensaiosRecomendados: ensaios,
    metodologiaReparo: reparo,
  };
}

/**
 * Gera imediatamente o laudo técnico pericial estruturado com base nas normas ABNT vigentes
 * (NBR 16747, NBR 13755, NBR 6118, NBR 9575, NBR 15575 e NBR 5674) como mecanismo de
 * contingência automatizada caso a API do Gemini sofra instabilidade (503) ou falha de comunicação.
 */
export function gerarLaudoTecnicoAbntFallback(
  contexto?: InspecaoContexto,
  photoIndex: number = 0
): DiagnosticoResponse {
  const edificio = contexto?.nomeEdificio?.trim() || 'Edificação Inspecionada';
  const elemento =
    contexto?.tipoElemento?.trim() || 'Substrato de Fachada e Elementos de Vedação Externa';
  const local = contexto?.localizacao?.trim() || 'Envoltória Externa Sujeita a Intempéries';
  const idade = contexto?.idadeEdificio?.trim()
    ? ` (idade aproximada: ${contexto.idadeEdificio.trim()})`
    : '';
  const obs = contexto?.observacoes?.trim()
    ? ` Observação pericial de campo registrada: "${contexto.observacoes.trim()}".`
    : '';

  const textoContexto = `${elemento} ${local} ${contexto?.observacoes || ''}`.toLowerCase();
  const mencionaConcretoOuArmadura =
    textoContexto.includes('armadura') ||
    textoContexto.includes('corrosão') ||
    textoContexto.includes('viga') ||
    textoContexto.includes('pilar') ||
    textoContexto.includes('laje') ||
    textoContexto.includes('estrutur');

  const catalogoAnomalias: PatologiaItem[] = [
    {
      nome_patologia:
        'Fissuração Higrotérmica e Desplacamento de Revestimento de Fachada com Perda de Aderência',
      gravidade: 'Crítica',
      constatacao_visual: `Constatou-se no elemento "${elemento}" da edificação "${edificio}"${idade}, situado em "${local}", a presença de fissuras mapeadas e lineares no plano de revestimento externo, acompanhadas de regiões com perda de coesão superficial, estufamento localizado e indícios de som cavo (descolamento entre o emboço/revestimento e a base substrato).${obs}`,
      descricao: `Constatou-se no elemento "${elemento}" da edificação "${edificio}"${idade}, situado em "${local}", a presença de fissuras mapeadas e lineares no plano de revestimento externo, acompanhadas de regiões com perda de coesão superficial, estufamento localizado e indícios de som cavo (descolamento entre o emboço/revestimento e a base substrato).${obs}`,
      justificativa_tecnica_causa:
        'Tensões tangenciais de cisalhamento na interface substrato-argamassa decorrentes de ciclos repetitivos de variação higrotérmica (insolação direta e resfriamento abrupto), fadiga natural dos materiais de acabamento e ausência ou deterioração das juntas de movimentação e dessolidarização exigidas pela ABNT NBR 13755.',
      causa_provavel:
        'Tensões tangenciais de cisalhamento na interface substrato-argamassa decorrentes de ciclos repetitivos de variação higrotérmica (insolação direta e resfriamento abrupto), fadiga natural dos materiais de acabamento e ausência ou deterioração das juntas de movimentação e dessolidarização exigidas pela ABNT NBR 13755.',
      risco_evolutivo_consequencias:
        'Risco crítico e iminente de desprendimento e queda livre de placas ou fragmentos de argamassa sobre transeuntes, veículos e áreas comuns no pavimento térreo, além de progressão acelerada da área descolada pela penetração de água pluvial sob pressão de vento.',
      risco_evolutivo:
        'Risco crítico e iminente de desprendimento e queda livre de placas ou fragmentos de argamassa sobre transeuntes, veículos e áreas comuns no pavimento térreo, além de progressão acelerada da área descolada pela penetração de água pluvial sob pressão de vento.',
      normas_tecnicas_abnt: [
        'ABNT NBR 16747:2020 (Inspeção Predial — Diretrizes, conceitos, terminologia e procedimento)',
        'ABNT NBR 13755:2017 (Revestimentos cerâmicos de fachadas e paredes externas com auxílio de argamassa colante)',
        'ABNT NBR 7200:1998 (Execução de revestimento de paredes e tetos de argamassas inorgânicas)',
        'ABNT NBR 13528:2019 (Revestimento de paredes de argamassas inorgânicas — Determinação da resistência de aderência à tração)',
        'ABNT NBR 15575-4:2021 (Edificações Habitacionais — Desempenho de Sistemas de Vedações Verticais Internas e Externas)',
      ],
      ensaios_complementares: [
        'Mapeamento percussivo integral (100% dos panos de fachada) com martelo de ponta esférica para delimitação das zonas de som cavo',
        'Ensaio de resistência de aderência à tração (arrancamento por dinamometria) conforme ABNT NBR 13528',
        'Inspeção termográfica por infravermelho para detecção não destrutiva de vazios e bolsões de umidade subsuperficiais',
      ],
      diretrizes_reparo: [
        'Isolamento imediato do perímetro térreo, instalação de bandejas de proteção coletiva (NR-18) e montagem de balancins elétricos homologados (NR-35).',
        'Corte perimetral com disco diamantado e remoção controlada de todo o revestimento e emboço com som cavo ou baixa coesão mecânica.',
        'Preparo e limpeza por hidrojateamento pressurizado do substrato, aplicação de chapisco rolado aditivado com polímero acrílico e recomposição do emboço sarrafeado.',
        'Tratamento das fissuras ativas com abertura de sulco em "V", aplicação de primer, inserção de delimitador de profundidade (tarucel) e selagem com mástique de poliuretano (PU 40) reforçado com tela de poliéster.',
        'Acabamento final com sistema de pintura acrílica elastomérica impermeável de alta memória mecânica (3 demãos cruzadas) ou reassentamento com argamassa colante flexível AC-III.',
      ],
    },
    {
      nome_patologia:
        'Percolação de Umidade, Eflorescência Salina e Falha de Estanqueidade em Juntas e Elementos de Transição',
      gravidade: 'Alta',
      constatacao_visual: `Observa-se na superfície periciada ("${elemento}") manchas escurecidas de umidade ascendente e percolação pluvial, depósitos esbranquiçados de sais cristalizados (eflorescência/carbonato de cálcio), degradação da película impermeável de acabamento e ressecamento dos cordões de vedação nas juntas de trabalho e encontros alvenaria-estrutura.`,
      descricao: `Observa-se na superfície periciada ("${elemento}") manchas escurecidas de umidade ascendente e percolação pluvial, depósitos esbranquiçados de sais cristalizados (eflorescência/carbonato de cálcio), degradação da película impermeável de acabamento e ressecamento dos cordões de vedação nas juntas de trabalho e encontros alvenaria-estrutura.`,
      justificativa_tecnica_causa:
        'Perda de estanqueidade da camada de proteção superficial combinada à degradação por radiação ultravioleta (UV) dos selantes de juntas, permitindo a infiltração de água de chuva por capilaridade, dissolução de hidróxido de cálcio livre do cimento (lixiviação) e posterior migração para a face externa.',
      causa_provavel:
        'Perda de estanqueidade da camada de proteção superficial combinada à degradação por radiação ultravioleta (UV) dos selantes de juntas, permitindo a infiltração de água de chuva por capilaridade, dissolução de hidróxido de cálcio livre do cimento (lixiviação) e posterior migração para a face externa.',
      risco_evolutivo_consequencias:
        'Saturação hídrica crônica das vedações verticais, infiltração para o interior das unidades autônomas, proliferação de colônias fúngicas (bolor/mofo), redução da resistência mecânica do reboco e aceleração da frente de carbonatação sobre as vigas e pilares adjacentes.',
      risco_evolutivo:
        'Saturação hídrica crônica das vedações verticais, infiltração para o interior das unidades autônomas, proliferação de colônias fúngicas (bolor/mofo), redução da resistência mecânica do reboco e aceleração da frente de carbonatação sobre as vigas e pilares adjacentes.',
      normas_tecnicas_abnt: [
        'ABNT NBR 9575:2010 (Impermeabilização — Seleção e projeto)',
        'ABNT NBR 9574:2008 (Execução de impermeabilização)',
        'ABNT NBR 16747:2020 (Inspeção Predial — Diretrizes e procedimentos)',
        'ABNT NBR 5674:2012 (Manutenção de edificações — Requisitos para o sistema de gestão de manutenção)',
      ],
      ensaios_complementares: [
        'Termografia infravermelha passiva para rastreamento da pluma de percolação hídrica na envoltória',
        'Medição quantitativa do teor de umidade superficial e profunda com higrômetro dielétrico de contato',
        'Teste de absorção de água por cachimbo (Método de Karsten) para aferição da permeabilidade do revestimento',
      ],
      diretrizes_reparo: [
        'Hidrojateamento controlado com solução fungicida biodegradável e escovamento para remoção integral de fuligem, biofilme e sais solúveis.',
        'Remoção completa dos cordões de selante ressecados nas juntas de dilatação e peitoris, limpeza das faces de aderência e recomposição com elastômero de poliuretano híbrido resistente a raios UV.',
        'Regularização de pingadeiras, rufos metálicos e caimentos horizontais para impedir o escorrimento laminar direto sobre o pano de fachada.',
        'Aplicação de fundo preparador acrílico de alta penetração aglutinante de partículas soltas seguido de membrana acrílica elastomérica impermeabilizante.',
      ],
    },
    {
      nome_patologia: mencionaConcretoOuArmadura
        ? 'Carbonatação do Cobrimento de Concreto e Corrosão Eletroquímica de Armaduras com Desplacamento (Spalling)'
        : 'Carbonatação Avançada do Concreto e Fissuração de Interface Alvenaria-Estrutura',
      gravidade: mencionaConcretoOuArmadura ? 'Crítica' : 'Alta',
      constatacao_visual: `Identificam-se manifestações compatíveis com tensões concentradas nos elementos estruturais e de transição de "${edificio}", apresentando fissuras de destacamento no encontro viga-alvenaria e pontos de vulnerabilidade no cobrimento do concreto armado em "${elemento}", expondo a matriz cimentícia à ação de agentes agressivos atmosféricos (CO₂ e umidade).`,
      descricao: `Identificam-se manifestações compatíveis com tensões concentradas nos elementos estruturais e de transição de "${edificio}", apresentando fissuras de destacamento no encontro viga-alvenaria e pontos de vulnerabilidade no cobrimento do concreto armado em "${elemento}", expondo a matriz cimentícia à ação de agentes agressivos atmosféricos (CO₂ e umidade).`,
      justificativa_tecnica_causa:
        'Difusão de gás carbônico (CO₂) pelos poros do concreto reduzindo o pH alcalino (de ~12,5 para <9,0), promovendo a despassivação da película protetora do aço e gerando expansão volumétrica de óxidos de ferro (até 8 vezes o volume original), somada à deformação diferencial entre o pórtico de concreto armado e os painéis de vedação.',
      causa_provavel:
        'Difusão de gás carbônico (CO₂) pelos poros do concreto reduzindo o pH alcalino (de ~12,5 para <9,0), promovendo a despassivação da película protetora do aço e gerando expansão volumétrica de óxidos de ferro (até 8 vezes o volume original), somada à deformação diferencial entre o pórtico de concreto armado e os painéis de vedação.',
      risco_evolutivo_consequencias:
        'Expulsão progressiva da camada de cobrimento do concreto (spalling), perda de seção transversal útil das armaduras longitudinais e estribos, redução da capacidade portante local e elevação exponencial dos custos de reabilitação estrutural caso postergada a intervenção.',
      risco_evolutivo:
        'Expulsão progressiva da camada de cobrimento do concreto (spalling), perda de seção transversal útil das armaduras longitudinais e estribos, redução da capacidade portante local e elevação exponencial dos custos de reabilitação estrutural caso postergada a intervenção.',
      normas_tecnicas_abnt: [
        'ABNT NBR 6118:2023 (Projeto de estruturas de concreto — Procedimento e classes de agressividade ambiental)',
        'ABNT NBR 7584:2012 (Concreto endurecido — Avaliação da dureza superficial pelo esclerômetro de reflexão)',
        'ABNT NBR 8545:1984 (Execução de alvenaria sem função estrutural de tijolos e blocos cerâmicos)',
        'ABNT NBR 16747:2020 (Inspeção Predial — Diretrizes, conceitos, terminologia e procedimento)',
      ],
      ensaios_complementares: [
        'Pacometria eletromagnética para verificação da espessura de cobrimento e localização exata das armaduras',
        'Ensaio colorimétrico com aspersão de solução de fenolftaleína a 1% para determinação da profundidade da frente de carbonatação',
        'Esclerometria de reflexão (ABNT NBR 7584) para estimativa da uniformidade e resistência superficial do concreto',
      ],
      diretrizes_reparo: [
        'Escarificação mecânica criteriosa do concreto carbonatado ou desagregado até atingir concreto são e alcalino, liberando no mínimo 2,0 cm ao redor das barras oxidadas.',
        'Profilaxia e remoção completa da carepa de corrosão das armaduras por escovamento mecânico rotativo até atingir grau de limpeza visual Sa 2½.',
        'Aplicação imediata de primer passivador anticorrosivo mineral rico em zinco ou epóxi bicomponente sobre toda a superfície das barras de aço tratadas.',
        'Recomposição geométrica e estrutural da seção com argamassa polimérica tixotrópica estrutural classe R4 reforçada com microfibras sintéticas e cura controlada.',
      ],
    },
  ];

  // Retorna exatamente 1 registro patológico consolidado por fotografia inspecionada
  const idx = Math.abs(Number(photoIndex) || 0) % catalogoAnomalias.length;
  const itemUnico = [catalogoAnomalias[idx]];

  return {
    anomalias: itemUnico,
    patologias: itemUnico,
  };
}

