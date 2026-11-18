/**
 * Conteúdo Institucional Oficial — RenovarSC Soluções Prediais
 * Dados cadastrais, diretrizes corporativas, apresentação institucional,
 * história dos fundadores, cultura e pilares, engenharia, seguros e garantia.
 */

export interface DadosEmpresa {
  nome: string;
  nomeFantasia: string;
  slogan: string;
  cnpj: string;
  creaSC: string;
  anoFundacao: number;
  tempoExperiencia: string;
  telefone: string;
  whatsapp: string;
  instagram: string;
  cidade: string;
  estado: string;
  enderecoCompleto: string;
  atuacaoExclusiva: string;
  cidadesAtendidas: string[];
}

export interface SecaoCapa {
  titulo: string;
  subtitulo: string;
  slogan: string;
  dadosCadastrais: {
    empresa: string;
    cnpj: string;
    crea: string;
    fundacao: string;
    experiencia: string;
    atuacao: string;
    localizacao: string;
    contato: string;
    instagram: string;
  };
  destaques: string[];
}

export interface SecaoApresentacao {
  titulo: string;
  subtitulo: string;
  focoSindicosAdministradoras: {
    titulo: string;
    paragrafos: string[];
    beneficiosChave: string[];
  };
  metodoEOrganizacao: {
    titulo: string;
    paragrafos: string[];
    pilaresMetodologia: {
      titulo: string;
      descricao: string;
    }[];
  };
  regiaoAtuacao: {
    titulo: string;
    descricao: string;
    cidades: string[];
  };
  compromissoEParcerias: {
    titulo: string;
    paragrafos: string[];
  };
}

export interface SecaoHistoriaFundadores {
  titulo: string;
  subtitulo: string;
  origemEVisao: {
    titulo: string;
    paragrafos: string[];
  };
  aVivenciaPratica: {
    titulo: string;
    paragrafos: string[];
  };
  insatisfacaoComMaquiagem: {
    titulo: string;
    paragrafos: string[];
  };
  aConsolidacaoRenovar: {
    titulo: string;
    paragrafos: string[];
    diferenciaisFundadores: string[];
  };
}

export interface SecaoQuemSomos {
  titulo: string;
  subtitulo: string;
  paragrafos: string[];
  destaques: string[];
}

export interface PilarCultura {
  numero: number;
  titulo: string;
  subtitulo?: string;
  descricao: string;
  pontosChave: string[];
}

export interface SecaoCulturaEPilares {
  titulo: string;
  subtitulo: string;
  introducao: string;
  pilares: {
    seguranca: PilarCultura;
    qualidade: PilarCultura;
    respeito: PilarCultura;
  };
}

export interface ItemSeguro {
  nome: string;
  descricao: string;
  cobertura: string;
}

export interface SecaoProcessosEngenhariaSegurosGarantia {
  titulo: string;
  subtitulo: string;
  processosETreinamento: {
    titulo: string;
    paragrafos: string[];
  };
  engenhariaEAcompanhamento: {
    titulo: string;
    paragrafos: string[];
  };
  seguros: {
    titulo: string;
    descricao: string;
    itens: ItemSeguro[];
  };
  garantia: {
    titulo: string;
    periodo: string;
    paragrafos: string[];
    termosGarantia: string[];
  };
}

export interface EtapaMetodoTrabalho {
  numero: number;
  etapa: string;
  subtitulo: string;
  descricao: string;
  detalhes: string[];
}

export interface DimensionamentoEquipe {
  porteEdificio: string;
  numeroAndares: string;
  tamanhoEquipe: string;
  descricao: string;
  atividadesSimultaneas: string[];
}

export interface SecaoMetodoTrabalho {
  titulo: string;
  subtitulo: string;
  introducao: string;
  etapas: EtapaMetodoTrabalho[];
  dimensionamentoEquipes: {
    titulo: string;
    subtitulo: string;
    paragrafos: string[];
    equipesPorPorte: DimensionamentoEquipe[];
    politicaCLT: string[];
  };
  acompanhamentoEConferencia: {
    titulo: string;
    paragrafos: string[];
    itensChecklist: string[];
  };
}

export interface ServicoDetalhado {
  id: string;
  nome: string;
  subtitulo: string;
  descricaoGeral: string;
  etapasExecutivas: string[];
  normasTecnicas: string[];
  materiaisUtilizados: string[];
  beneficiosCondominio: string[];
}

export interface SecaoServicos {
  titulo: string;
  subtitulo: string;
  introducao: string;
  servicos: {
    tratamentoEstrutural: ServicoDetalhado;
    restauracaoPinturaFachadas: ServicoDetalhado;
    reformasTelhados: ServicoDetalhado;
    pastilhasETexturasEspeciais: ServicoDetalhado;
    calcadasGaragensSinalizacao: ServicoDetalhado;
  };
}

export interface ItemDiferencial {
  numero: number;
  titulo: string;
  subtitulo: string;
  descricao: string;
  impactoParaCondominio: string;
}

export interface SecaoDiferenciaisEFechamento {
  titulo: string;
  subtitulo: string;
  diferenciais: ItemDiferencial[];
  fechamentoComercial: {
    titulo: string;
    subtitulo: string;
    paragrafos: string[];
    compromissosExclusivosCondominio: string[];
    chamadaAcao: {
      titulo: string;
      descricao: string;
      canais: {
        tipo: string;
        valor: string;
        descricao: string;
      }[];
    };
  };
}

export interface ConteudoInstitucionalRenovar {
  empresa: DadosEmpresa;
  capa: SecaoCapa;
  apresentacao: SecaoApresentacao;
  historiaFundadores: SecaoHistoriaFundadores;
  quemSomos: SecaoQuemSomos;
  culturaEPilares: SecaoCulturaEPilares;
  processosEngenhariaSegurosGarantia: SecaoProcessosEngenhariaSegurosGarantia;
  metodoTrabalho: SecaoMetodoTrabalho;
  servicos: SecaoServicos;
  diferenciaisEFechamento: SecaoDiferenciaisEFechamento;
}

export const RENOVAR_INSTITUCIONAL: ConteudoInstitucionalRenovar = {
  // PARTE 1 — DADOS CADASTRAIS E CAPA
  empresa: {
    nome: 'RenovarSC — Soluções Prediais',
    nomeFantasia: 'RenovarSC',
    slogan: 'Mais que obra, excelência!',
    cnpj: '57.293.244/0001-27',
    creaSC: '105.402-1',
    anoFundacao: 2024,
    tempoExperiencia: 'Mais de 10 anos de experiência prática em reformas prediais',
    telefone: '(48) 99980-7965',
    whatsapp: '(48) 99980-7965',
    instagram: '@renovar_oficial03',
    cidade: 'São José',
    estado: 'SC',
    enderecoCompleto: 'São José - SC • Atendimento em toda a Grande Florianópolis',
    atuacaoExclusiva: 'Atuação exclusiva em condomínios e edifícios de grande porte na Grande Florianópolis.',
    cidadesAtendidas: [
      'Florianópolis',
      'São José',
      'Palhoça',
      'Biguaçu',
    ],
  },

  capa: {
    titulo: 'RenovarSC — Soluções Prediais',
    subtitulo: 'Proposta Técnica & Apresentação Institucional Oficial',
    slogan: 'Mais que obra, excelência!',
    dadosCadastrais: {
      empresa: 'RenovarSC — Soluções Prediais',
      cnpj: '57.293.244/0001-27',
      crea: 'CREA/SC: 105.402-1',
      fundacao: 'Fundada em 2024',
      experiencia: 'Mais de 10 anos de experiência prática em reformas prediais',
      atuacao: 'Atuação exclusiva em condomínios e edifícios de grande porte na Grande Florianópolis',
      localizacao: 'São José - SC',
      contato: '(48) 99980-7965',
      instagram: '@renovar_oficial03',
    },
    destaques: [
      'Engenharia Diagnóstica e Perícia de Patologias Prediais',
      'Restauração, Recuperação Estrutural e Pintura de Fachadas',
      'Gestão Direta e Ativa dos Sócios no Canteiro de Obras',
      'Conformidade Rigorosa com as Normas da ABNT e NRs de Segurança (NR-18 e NR-35)',
    ],
  },

  // PARTE 1 — APRESENTAÇÃO INSTITUCIONAL (PÁGINAS 2 E 3)
  apresentacao: {
    titulo: 'Apresentação Institucional — RenovarSC e Cultura Organizacional',
    subtitulo: 'Método, organização, previsibilidade e parcerias duradouras com condomínios',
    focoSindicosAdministradoras: {
      titulo: 'Foco Absoluto em Síndicos e Administradoras de Condomínios',
      paragrafos: [
        'A contratação de uma obra de reforma predial é uma das decisões mais desafiadoras e de maior responsabilidade na rotina de um síndico e de uma administradora de condomínios. Ela envolve a guarda do patrimônio coletivo, a gestão de recursos vultosos, a garantia da integridade física de colaboradores e moradores, além da necessidade contínua de manter a harmonia interna no condomínio.',
        'A RenovarSC foi estruturada desde a sua fundação para ser a solução definitiva para esse cenário. Nosso modelo operacional elimina a sobrecarga da administração predial: assumimos a gestão técnica integral do canteiro, asseguramos previsibilidade orçamentária rígida e garantimos conformidade documental, trabalhista e de engenharia do início ao fim.',
        'Atuamos lado a lado com os gestores prediais, fornecendo canais diretos de comunicação, relatórios periódicos de acompanhamento e suporte para esclarecimentos em assembleias e comissões de obras, transformando uma reforma que costumava ser motivo de estresse em um processo seguro, transparente e tranquilo.',
      ],
      beneficiosChave: [
        'Segurança jurídica e técnica com emissão de ART/CREA-SC e conformidade com a ABNT NBR 16747.',
        'Previsibilidade orçamentária: propostas detalhadas sem aditivos surpresa por omissões de escopo.',
        'Tranquilidade para o síndico: gestão direta e presença constante dos responsáveis no canteiro.',
        'Comunicação proativa com aviso prévio de interdições parciais, movimentação de balancins e cronograma das etapas.',
      ],
    },
    metodoEOrganizacao: {
      titulo: 'Método, Organização e Previsibilidade',
      paragrafos: [
        'Na RenovarSC, entendemos que o sucesso de uma obra de fachada não depende apenas de tintas de qualidade ou de equipamentos modernos, mas sim de método executivo e disciplina operacional. Obras prediais não admitem improvisos.',
        'Cada intervenção executada pela nossa equipe segue um planejamento prévio minucioso, onde o cronograma físico-financeiro é detalhado passo a passo. Antes de qualquer aplicação superficial, realizamos testes periciais de percussão, mapeamento de descolamentos cerâmicos, tratamento das armaduras corroídas e recuperação da base cimentícia.',
        'A organização do canteiro é uma marca inegociável da nossa atuação: isolamento adequado das áreas comuns, proteção de veículos nas garagens, envelopamento de esquadrias e vidros, limpeza diária dos acessos e rígido controle de acesso dos nossos colaboradores.',
      ],
      pilaresMetodologia: [
        {
          titulo: 'Planejamento Diagnóstico Preliminar',
          descricao:
            'Inspeção detalhada de cada pano de fachada e estrutura para mapeamento real das manifestações patológicas antes do início executivo.',
        },
        {
          titulo: 'Cronograma Físico-Financeiro Transparente',
          descricao:
            'Acompanhamento das etapas com metas claras de avanço semanal e medições vinculadas a entregas verificadas.',
        },
        {
          titulo: 'Canteiro Organizado e Limpo',
          descricao:
            'Proteção rigorosa das áreas de moradores, isolamento de acessos sob linhas de balancim e limpeza diária do condomínio.',
        },
        {
          titulo: 'Segurança Inegociável (NR-18 e NR-35)',
          descricao:
            'Equipamentos de alpinismo industrial e balancins certificados, linhas de vida inspecionadas e uso obrigatório de EPIs completos.',
        },
      ],
    },
    regiaoAtuacao: {
      titulo: 'Atuação Geográfica Especializada na Grande Florianópolis',
      descricao:
        'A RenovarSC concentra sua capacidade operacional de forma exclusiva em condomínios e edifícios de grande porte na Grande Florianópolis, garantindo logística rápida, visitas técnicas ágeis e atendimento emergencial presente.',
      cidades: [
        'Florianópolis (Ilha e Continente)',
        'São José',
        'Palhoça',
        'Biguaçu',
      ],
    },
    compromissoEParcerias: {
      titulo: 'Compromisso com o Resultado Final e Parcerias Duradouras',
      paragrafos: [
        'Não encaramos nossos contratos como transações isoladas de prestação de serviços. Nosso propósito é estabelecer relações de longo prazo com condomínios, síndicos profissionais e administradoras.',
        'O nosso compromisso com o resultado final abrange a durabilidade do sistema construtivo entregue, a valorização patrimonial das unidades e a satisfação real dos condôminos. Entregamos a obra acompanhada de documentação técnica, garantia formal e diretrizes de manutenção preventiva em conformidade com as normas da ABNT.',
      ],
    },
  },

  // PARTE 1 — A HISTÓRIA DOS FUNDADORES (PÁGINA 4)
  historiaFundadores: {
    titulo: 'A História dos Fundadores',
    subtitulo: 'Mais de uma década de vivência prática, herança familiar e a busca pela excelência na restauração predial',
    origemEVisao: {
      titulo: 'A União de Experiências e o Propósito Comum',
      paragrafos: [
        'A história da RenovarSC é fruto da convergência profissional e dos valores de seus dois fundadores. Antes de fundarem a empresa, ambos já trilhavam trajetórias consolidadas no setor de reformas e manutenções prediais na Grande Florianópolis, acumulando juntos mais de 10 anos de experiência direta no canteiro de obras.',
        'A vocação para a construção civil tem raízes profundas na experiência familiar de ambos os sócios. Crescendo no meio de obras, convivendo com mestres de ofício e vivenciando desde cedo os desafios práticos de engenharia, reformas estruturais e restauração de fachadas, eles desenvolveram uma sensibilidade técnica apurada sobre o que realmente funciona em campo.',
      ],
    },
    aVivenciaPratica: {
      titulo: 'Mais de 10 Anos de Vivência em Fachadas e Estruturas',
      paragrafos: [
        'Essa longa vivência prática não foi construída atrás de mesas de escritório, mas sim na linha de frente: sobre andaimes suspensos, balancins, rapéis industriais e no contato direto com a recuperação de pilares, vigas, juntas de dilatação, pastilhas cerâmicas e sistemas impermeabilizantes.',
        'Ao longo de mais de uma década, os fundadores acompanharam de perto as peculiaridades do clima litorâneo da Grande Florianópolis — como a alta salinidade, a incidência de vento marinho e as fortes variações térmicas —, fatores que aceleram a corrosão de armaduras e provocam fissuras precoces quando a obra não é executada com rigor.',
      ],
    },
    insatisfacaoComMaquiagem: {
      titulo: 'A Insatisfação com o Mercado de "Maquiagem" Visual',
      paragrafos: [
        'Foi exatamente a vivência diária no setor que gerou nos fundadores um incômodo profundo com as práticas predominantes no mercado de reformas prediais. Com frequência alarmante, eles observavam condomínios contratando serviços que se limitavam a uma mera "maquiagem estética".',
        'Empresas despreparadas aplicavam demãos de tinta por cima de infiltrações ativas, passavam argamassa sobre ferragens enferrujadas sem o devido tratamento anticorrosivo e cobriam fissuras estruturais com massa corrida para entregas rápidas.',
        'O resultado para o condomínio era sempre desastroso: em menos de 18 a 24 meses, as manchas de umidade retornavam, o reboco desprendia-se em placas perigosas e o condomínio se via obrigado a gastar novamente, muitas vezes com custos dobrados para reparar os danos agravados pela negligência inicial.',
      ],
    },
    aConsolidacaoRenovar: {
      titulo: 'A Consolidação de Processos Baseados em Planejamento e Segurança',
      paragrafos: [
        'Determinados a mudar essa realidade e elevar o padrão do setor, os fundadores decidiram criar a RenovarSC com uma premissa clara: a engenharia diagnóstica e a técnica construtiva devem prevalecer sobre qualquer solução superficial.',
        'Na RenovarSC, nenhum serviço de acabamento é iniciado antes que a saúde estrutural da edificação esteja 100% restabelecida. Criaram protocolos próprios de inspeção, conferência de ancoragens, treinamento de equipes para trabalho em altura (NR-35) e metodologias de aplicação com os melhores fornecedores de insumos da construção civil.',
        'Além disso, implementaram um modelo de gestão participativa onde os próprios sócios estão presentes no dia a dia da obra, assegurando alinhamento imediato entre o que foi contratado e o que está sendo executado.',
      ],
      diferenciaisFundadores: [
        'Mais de 10 anos de vivência técnica e prática no canteiro de obras e em fachadas de grande porte.',
        'Experiência familiar e geracional no segmento da construção civil e recuperação predial.',
        'Ruptura completa com o mercado de "maquiagem visual": foco em cura definitiva de patologias.',
        'Gestão presente e direta dos sócios em todas as etapas da obra, garantindo padrão de excelência.',
        'Segurança do trabalho como princípio inegociável, cumprindo rigorosamente as NRs 18 e 35.',
      ],
    },
  },

  // PARTE 2 — QUEM SOMOS
  quemSomos: {
    titulo: 'Quem Somos',
    subtitulo: 'Inconformismo com o superficial, excelência antes do lucro e maestria em obras de grande porte',
    paragrafos: [
      'A RenovarSC é uma empresa de engenharia diagnóstica e restauração de fachadas prediais que nasceu do inconformismo com as práticas superficiais e amadoras do mercado da construção civil. Observamos condomínios investindo valores significativos em reformas que duravam poucos meses devido à falta de método, negligência técnica e uso de materiais inadequados.',
      'Nossa filosofia é clara e intransigente: colocamos a excelência técnica antes do lucro. Acreditamos que o resultado financeiro positivo é fruto legítimo de um trabalho bem executado, seguro e que soluciona em definitivo as manifestações patológicas da edificação. Não aceitamos atalhos executivos, não suprimimos etapas de cura e não reduzimos especificações técnicas para baratear custos de forma irresponsável.',
      'Nossa equipe técnica e lideranças somam mais de 10 anos de experiência prática comprovada em reformas prediais de alta complexidade técnica e operacional, com atuação destacada em edifícios de grande porte que ultrapassam os 40 andares. Esse nível de exigência nos conferiu domínio pleno em trabalho em altura, gestão de ventos em fachadas litorâneas, ancoragem segura de balancins e planejamento logístico para minimizar qualquer impacto na rotina dos moradores.',
      'Atuamos exclusivamente no segmento de condomínios residenciais e edifícios comerciais de grande porte, desenvolvendo soluções integradas de perícia diagnóstica, recuperação de concreto armado, impermeabilização de lajes e jardineiras, restauração de pastilhas cerâmicas e pintura de alta durabilidade.',
    ],
    destaques: [
      'Nascimento fundamentado no inconformismo com soluções paliativas e maquiagens visuais.',
      'Compromisso ético de priorizar a excelência técnica e a segurança antes da margem de lucro.',
      'Mais de 10 anos de experiência prática em obras prediais de grande porte (mais de 40 andares).',
      'Domínio completo das exigências climáticas, de vento e de salinidade do litoral catarinense.',
      'Atendimento consultivo e técnico voltado para síndicos profissionais e administradoras.',
    ],
  },

  // PARTE 2 — CULTURA E PILARES RENOVAR
  culturaEPilares: {
    titulo: 'Cultura e Pilares RenovarSC',
    subtitulo: 'Os três valores fundamentais e inegociáveis que direcionam cada ação no canteiro de obras',
    introducao:
      'Para a RenovarSC, a cultura corporativa é o reflexo direto de nossas atitudes em campo. Não negociamos nossos princípios fundamentais, pois entendemos que a confiança de um condomínio se conquista com integridade, técnica rigorosa e respeito humano ininterrupto.',
    pilares: {
      seguranca: {
        numero: 1,
        titulo: 'Segurança acima de tudo',
        subtitulo: 'Tolerância zero para descumprimento de normas e protocolos de vida',
        descricao:
          'A preservação da vida e da integridade física de nossos colaboradores, moradores, funcionários do condomínio e transeuntes é nossa prioridade soberana. Em nenhuma circunstância o cumprimento de prazos ou a redução de custos se sobreporá à segurança.',
        pontosChave: [
          'Uso obrigatório, fiscalizado e incondicional de Equipamentos de Proteção Individual (EPIs) e Coletiva (EPCs).',
          'Fiscalização diária rigorosa dos sistemas de ancoragem predial, cordas, balancins elétricos e manuais, travas-quedas e linhas de vida.',
          'Tolerância zero para o descumprimento de qualquer diretriz de segurança: colaborador em desconformidade é imediatamente paralisado.',
          'Treinamentos contínuos e reciclagem periódica em NR-18 (Condições e Meio Ambiente de Trabalho na Indústria da Construção) e NR-35 (Trabalho em Altura).',
          'Realização de Diálogos Diários de Segurança (DDS) antes do início de qualquer atividade suspensa.',
        ],
      },
      qualidade: {
        numero: 2,
        titulo: 'Qualidade a qualquer custo',
        subtitulo: 'Obrigação básica: preferimos refazer o serviço a entregar fora do padrão',
        descricao:
          'Na RenovarSC, a qualidade não é tratada como um adjetivo comercial ou diferencial competitivo; ela é uma obrigação elementar. Executamos cada etapa com rigor científico, respeitando os tempos técnicos de cura e as recomendações dos fabricantes.',
        pontosChave: [
          'Proibição absoluta de pular etapas, acelerar processos de secagem ou recorrer a soluções improvisadas no canteiro.',
          'Preferimos refazer integralmente qualquer etapa com recursos próprios a entregar um serviço que não atinja 100% do padrão de excelência.',
          'Utilização exclusiva de insumos de alto desempenho, polímeros nobres, argamassas estruturais tixotrópicas e tintas elastoméricas premium.',
          'Controle de qualidade rastreável: conferência de espessura de película úmida/seca e ensaios de percussão em 100% da fachada.',
          'Garantia de que a solução implementada trata a causa raiz da patologia, impedindo o retorno precoce do problema.',
        ],
      },
      respeito: {
        numero: 3,
        titulo: 'Respeito no dia a dia',
        subtitulo: 'Postura profissional impecável dentro do lar das famílias',
        descricao:
          'Compreendemos com profunda empatia que o canteiro de obras de uma reforma predial é, antes de tudo, o lar de dezenas de famílias. O ambiente onde as pessoas descansam, convivem e buscam paz exige dos profissionais uma conduta ética e comportamental impecável.',
        pontosChave: [
          'Postura profissional respeitosa, educada e cordial com síndicos, conselheiros, moradores, zeladores e equipes de limpeza.',
          'Atenção especial, acolhimento e prioridade de segurança a idosos, mulheres, crianças e pessoas com necessidades especiais.',
          'Equipe 100% uniformizada, identificada com crachá e orientada sobre limites de circulação nas dependências do condomínio.',
          'Preservação rigorosa das áreas comuns, halls, jardins, garagens e veículos, mantendo organização e isolamentos bem sinalizados.',
          'Limpeza minuciosa ao final de cada jornada de trabalho e comunicação transparente para evitar transtornos na rotina condominial.',
        ],
      },
    },
  },

  // PARTE 2 — PROCESSOS, ENGENHARIA, SEGUROS E GARANTIA
  processosEngenhariaSegurosGarantia: {
    titulo: 'Processos, Engenharia, Seguros e Garantia',
    subtitulo: 'Estrutura técnica robusta, respaldo documental completo e segurança patrimonial absoluta',
    processosETreinamento: {
      titulo: 'Processos Padronizados e Treinamento Interno Exclusivo',
      paragrafos: [
        'A qualidade constante das entregas da RenovarSC resulta da padronização detalhada de cada procedimento operacional. Criamos manuais de procedimentos internos que descrevem com precisão cada ação executiva: do hidrojateamento à recuperação de armaduras e juntas de dilatação.',
        'Nossos colaboradores passam por um programa de treinamento interno exclusivo e contínuo, ministrado antes do início de cada projeto. Isso assegura que cada profissional compreenda a fundo as normas da empresa, a importância da segurança em altura e o nível de acabamento exigido pelos fundadores e pela engenharia.',
      ],
    },
    engenhariaEAcompanhamento: {
      titulo: 'Engenharia Diagnóstica e Acompanhamento Técnico Permanente',
      paragrafos: [
        'Toda obra realizada pela RenovarSC é acompanhada de perto por Engenheiro Civil habilitado e devidamente registrado no Conselho Regional de Engenharia e Agronomia de Santa Catarina (CREA/SC: 105.402-1).',
        'Cada contrato conta com a emissão formal de Anotação de Responsabilidade Técnica (ART), garantindo que a intervenção siga com rigor a legislação vigente e as normas da ABNT — especialmente a NBR 16747 (Inspeção Predial), NBR 13755 (Revestimento cerâmico de fachadas), NBR 6118 (Projetos de estruturas de concreto) e NBR 9575 (Impermeabilização).',
        'As vistorias técnicas periódicas geram relatórios fotográficos de evolução, oferecendo aos síndicos, comissões de obras e administradoras um registro histórico transparente de todas as camadas recuperadas antes da pintura final.',
      ],
    },
    seguros: {
      titulo: 'Coberturas de Seguro Completas (Proteção Tripla)',
      descricao:
        'Para blindar integralmente o condomínio, o síndico e os condôminos contra qualquer passivo financeiro, trabalhista ou material, a RenovarSC opera com uma estrutura de apólices de seguro completa:',
      itens: [
        {
          nome: 'Seguro de Obra (Riscos de Engenharia)',
          descricao:
            'Garante cobertura contra acidentes de causa externa, intempéries severas e danos materiais à estrutura ou instalações do edifício durante a execução dos serviços.',
          cobertura: 'Cobertura integral durante todo o período da obra até a entrega final.',
        },
        {
          nome: 'Seguro de Vida e Acidentes Pessoais para Colaboradores',
          descricao:
            'Garante proteção completa para 100% dos trabalhadores que atuam no canteiro de obras, com cobertura para despesas médicas, invalidez e auxílio à família, isentando o condomínio de responsabilidades indenizatórias.',
          cobertura: 'Apólice ativa cobrindo toda a equipe alocada no canteiro.',
        },
        {
          nome: 'Seguro de Responsabilidade Civil (RC Geral e Cruzada)',
          descricao:
            'Protege o condomínio e terceiros contra danos corporais ou materiais involuntários decorrentes das atividades da obra, incluindo danos a veículos nas garagens, esquadrias, vidraças ou bens de condôminos e imóveis vizinhos.',
          cobertura: 'Ampla cobertura securitária para danos a terceiros e bens de moradores.',
        },
      ],
    },
    garantia: {
      titulo: 'Garantia Mínima de 5 Anos em Contrato',
      periodo: 'Mínimo de 5 (cinco) anos',
      paragrafos: [
        'A RenovarSC concede garantia formal em contrato de no mínimo 5 (cinco) anos para todos os serviços executados em recuperação estrutural, tratamento de fissuras ativas e passivas, impermeabilização e ancoragem de revestimentos de fachadas.',
        'Nosso termo de garantia é respaldado pelo Código Civil Brasileiro e pelas normas da ABNT, conferindo aos proprietários e ao síndico a certeza de que o investimento realizado trará durabilidade duradoura e preservação de valor patrimonial.',
        'Ao término dos trabalhos, entregamos formalmente o Termo de Encerramento e o Manual de Uso, Operação e Manutenção Preventiva da Fachada, orientando as inspeções periódicas que maximizam a vida útil dos sistemas construtivos revitalizados.',
      ],
      termosGarantia: [
        'Garantia mínima de 5 anos para estanqueidade e cura de infiltrações tratadas.',
        'Garantia mínima de 5 anos contra desplacamento de pastilhas e argamassas recuperadas.',
        'Garantia mínima de 5 anos para tratamento e passivação de armaduras de concreto armado.',
        'Assistência técnica pós-obra ágil e atendimento direto na Grande Florianópolis.',
      ],
    },
  },

  // PARTE 3 — MÉTODO DE TRABALHO RENOVAR (PÁGINA 8)
  metodoTrabalho: {
    titulo: 'Método de Trabalho RenovarSC',
    subtitulo: 'Rigor científico, planejamento detalhado, equipes CLT dedicadas e acompanhamento diário dos sócios',
    introducao:
      'O método construtivo da RenovarSC foi concebido para erradicar o amadorismo e a imprevisibilidade nas reformas prediais. Não iniciamos nenhuma atividade prática sem antes compreender as causas raízes de cada degradação física e estruturar um cronograma operacional claro, seguro e transparente para a comunidade condominial.',
    etapas: [
      {
        numero: 1,
        etapa: 'Diagnóstico Técnico Detalhado',
        subtitulo: 'Investigação profunda para erradicação definitiva da causa raiz',
        descricao:
          'Antes de qualquer intervenção ou orçamento final, realizamos uma perícia diagnóstica minuciosa em todos os panos de fachada, estruturas aparentes, marquises e coberturas. Recusamos sumariamente o modelo de "maquiagem visual", identificando a origem exata das patologias para propor soluções de engenharia perenes.',
        detalhes: [
          'Ensaios de percussão acústica em 100% da área revestida para detecção precisa de áreas ocas com risco iminente de desprendimento.',
          'Mapeamento fotográfico e termográfico de umidades ascendentes, infiltrações em esquadrias e falhas de impermeabilização.',
          'Identificação da profundidade de carbonatação do concreto e grau de oxidação das armaduras em vigas e pilares.',
          'Elaboração de laudo técnico pericial preliminar com quantitativos exatos para embasar assembleias condominiais.',
        ],
      },
      {
        numero: 2,
        etapa: 'Planejamento Claro e Cronograma Físico-Financeiro',
        subtitulo: 'Previsibilidade total sem surpresas orçamentárias ou atrasos',
        descricao:
          'Definimos com antecedência todas as fases da obra, alocação de equipamentos e rotas de isolamento, garantindo que o síndico e os moradores saibam exatamente o que acontecerá em cada semana de execução.',
        detalhes: [
          'Cronograma semanal detalhado com metas claras de avanço por fachada (Norte, Sul, Leste, Oeste).',
          'Mapeamento de logística de canteiro: áreas de descarte de entulho, guarda de materiais e vestiários.',
          'Comunicação antecipada aos moradores sobre movimentação de balancins e interdição temporária de vagas de garagem.',
          'Medições quinzenais atreladas estritamente a serviços executados e atestados pela fiscalização do condomínio.',
        ],
      },
      {
        numero: 3,
        etapa: 'Equipes Próprias 100% CLT Dimensionadas por Porte',
        subtitulo: 'Mão de obra qualificada, estável e dimensionada para o ritmo correto da obra',
        descricao:
          'A RenovarSC não terceiriza suas atividades-fim e não contrata trabalhadores informais ("diaristas volantes"). Toda a nossa equipe é registrada em regime CLT, garantindo estabilidade, treinamento contínuo e blindagem jurídica completa para o condomínio.',
        detalhes: [
          'Profissionais com capacitação técnica formal em NR-35 (Trabalho em Altura) e NR-18.',
          'Supervisão contínua de encarregados gerais e técnicos de segurança no canteiro.',
          'Dimensionamento de efetivo proporcional à área construída para garantir entregas rápidas sem perda de qualidade.',
        ],
      },
      {
        numero: 4,
        etapa: 'Acompanhamento Próximo e Gestão Direta dos Sócios',
        subtitulo: 'Presença diária no canteiro e resposta imediata a qualquer demanda',
        descricao:
          'Diferente de grandes construtoras onde o cliente fala apenas com intermediários comerciais, na RenovarSC os sócios fundadores estão presentes no canteiro de obras, fiscalizando a execução técnica e conversando diretamente com o síndico.',
        detalhes: [
          'Vistorias presenciais diárias dos sócios para conferência de conformidade dos serviços.',
          'Canal de comunicação direta via WhatsApp e telefone para alinhamentos rápidos com síndicos e administradoras.',
          'Participação dos sócios em assembleias condominiais para esclarecimento de dúvidas técnicas dos moradores.',
        ],
      },
      {
        numero: 5,
        etapa: 'Conferência Completa e Checklist de Entrega',
        subtitulo: 'Rigor técnico na validação final antes da entrega das chaves da obra',
        descricao:
          'A entrega da obra só é formalizada após a conclusão de uma auditoria técnica de qualidade interna e uma vistoria minuciosa conjunta com o síndico e a comissão de obras.',
        detalhes: [
          'Checklist rigoroso de mais de 40 itens abrangendo alinhamento de pintura, estanqueidade e limpeza de vidros/esquadrias.',
          'Testes finais de percussão para garantia de 100% de aderência dos revestimentos reparados.',
          'Limpeza pós-obra impecável de calçadas, vidraças, halls e garagens.',
          'Emissão formal do Termo de Encerramento de Obra e entrega do Manual de Manutenção Preventiva da Edificação.',
        ],
      },
    ],
    dimensionamentoEquipes: {
      titulo: 'Dimensionamento Estratégico de Equipes por Porte de Edifício',
      subtitulo: 'Equipes próprias 100% CLT, com número proporcional de profissionais para entregas pontuais',
      paragrafos: [
        'A velocidade e o acabamento de uma reforma predial dependem diretamente da correta proporção entre a metragem da fachada e o número de colaboradores alocados. Na RenovarSC, repudiamos a prática de manter equipes reduzidas de 2 ou 3 pessoas que arrastam obras de fachada por anos.',
        'Nosso dimensionamento segue critérios rigorosos de produtividade e engenharia, mantendo frentes simultâneas de hidrojateamento, recuperação estrutural, aplicação de texturas e pintura de acabamento.',
      ],
      equipesPorPorte: [
        {
          porteEdificio: 'Edifícios de Pequeno Porte (até 4 andares)',
          numeroAndares: 'Até 4 pavimentos',
          tamanhoEquipe: 'No mínimo 5 colaboradores dedicados',
          descricao:
            'Composição balanceada com 1 encarregado técnico, 2 pintores/restauradores de fachada, 1 pedreiro estruturalista e 1 auxiliar de canteiro, assegurando ritmo acelerado e finalização ágil.',
          atividadesSimultaneas: [
            'Tratamento estrutural e lavagem técnica simultâneos',
            'Proteção de esquadrias e isolamento de garagens',
            'Pintura de panos com balancins manuais e andaimes tubulares certificados',
          ],
        },
        {
          porteEdificio: 'Edifícios de Médio Porte (até 8 andares)',
          numeroAndares: 'De 5 a 8 pavimentos',
          tamanhoEquipe: 'Aproximadamente 8 profissionais dedicados',
          descricao:
            'Equipe estruturada com encarregado geral, técnicos de alpinismo industrial, restauradores de fachada, especialistas em impermeabilização e assistentes de logística.',
          atividadesSimultaneas: [
            'Dois panos de fachada trabalhados em paralelo',
            'Recuperação de lajes de cobertura e telhados sem interromper o avanço das fachadas',
            'Manutenção da rotina condominial com desvios seguros e proteção de pedestres',
          ],
        },
        {
          porteEdificio: 'Edifícios de Grande Porte e Arranha-Céus (acima de 8 até mais de 40 andares)',
          numeroAndares: 'Mais de 8 andares (com vivência comprovada em prédios acima de 40 andares)',
          tamanhoEquipe: 'Equipes robustas dimensionadas proporcionalmente (12 a 20+ profissionais)',
          descricao:
            'Operação de alta complexidade com múltiplos balancins elétricos, sistemas redundantes de ancoragem, engenheiro de campo e técnicos de segurança dedicados exclusivamente à obra.',
          atividadesSimultaneas: [
            'Múltiplas fachadas sob intervenção coordenada simultânea',
            'Gestão técnica de ventos fortes e intempéries litorâneas típicas de grande altura',
            'Logística vertical ágil para subida e descida de insumos sem ocupar elevadores sociais',
          ],
        },
      ],
      politicaCLT: [
        'Contratação 100% formal sob a Consolidação das Leis do Trabalho (CLT), com FGTS, INSS e benefícios rigorosamente em dia.',
        'Total isenção de riscos de corresponsabilidade trabalhista ou fiscal para o condomínio e o síndico.',
        'Exames médicos ocupacionais (ASO) específicos para trabalho em altura (NR-35) rigorosamente válidos.',
        'Uniformes completos, crachás de identificação e registro biométrico de frequência.',
      ],
    },
    acompanhamentoEConferencia: {
      titulo: 'Acompanhamento dos Sócios e Vistoria Final Integrada',
      paragrafos: [
        'A presença dos fundadores no canteiro garante que o padrão de qualidade RenovarSC seja mantido em cada centímetro quadrado da obra. Não toleramos intermediários que filtrem problemas: quando surge um desafio técnico em campo, a liderança decide na hora a melhor solução de engenharia.',
        'Ao final dos serviços, realizamos a Vistoria de Entrega Compartilhada, percorrendo toda a edificação com o síndico e membros do conselho para conferência detalhada e assinatura do termo de aceite.',
      ],
      itensChecklist: [
        'Verificação da espessura e uniformidade da película de tinta sem manchas, escorridos ou sombras.',
        'Inspeção de percussão em 100% das áreas recuperadas estruturalmente e pastilhas cerâmicas substituídas.',
        'Conferência da perfeita vedação perimetral de caixilhos, rufos e calhas contra infiltrações de chuva.',
        'Limpeza minuciosa de vidros, esquadrias de alumínio, calçadas, pisos cerâmicos e gradis.',
        'Remoção completa de entulhos, andaimes e sobras de materiais com destinação ambiental certificada.',
      ],
    },
  },

  // PARTE 3 — SERVIÇOS RENOVARSC (PÁGINAS 9, 10 E 11)
  servicos: {
    titulo: 'Serviços RenovarSC Especializados',
    subtitulo: 'Soluções integradas de engenharia diagnóstica, recuperação estrutural, fachadas, telhados e acabamentos',
    introducao:
      'A RenovarSC oferece um portfólio completo de engenharia e manutenção predial, concebido especificamente para atender às exigências de condomínios residenciais e comerciais de grande porte na Grande Florianópolis.',
    servicos: {
      tratamentoEstrutural: {
        id: 'tratamento-estrutural',
        nome: 'Tratamento Estrutural em Colunas, Vigas e Lajes',
        subtitulo: 'Recuperação de ferragens oxidadas e recomposição volumétrica de concreto armado',
        descricaoGeral:
          'Recuperação técnica de elementos estruturais degradados pela carbonatação do concreto, fissuras de sobrecarga e ação agressiva da maresia litorânea. Eliminamos o risco de destacamento de cobrimento e restauramos a capacidade portante das estruturas conforme as normas da ABNT.',
        etapasExecutivas: [
          'Delimitação da área afetada com disco de corte diamantado para evitar fraturas no concreto são.',
          'Escarificação cuidadosa do concreto deteriorado até a completa exposição do contorno das armaduras de aço.',
          'Limpeza e hidrojateamento mecânico das barras de aço oxidadas até o padrão de metal quase branco (SA 2.5).',
          'Aplicação de primer inibidor de corrosão à base de zinco ou resinas epóxi-poliméricas para repassivação do aço.',
          'Recomposição volumétrica da seção estrutural com argamassa tixotrópica polimérica de alta resistência (fck ≥ 35 MPa) ou graute de retração compensada.',
          'Cura úmida controlada e aplicação de pintura de proteção anticarbonatação com barreira contra gás carbônico (CO2).',
        ],
        normasTecnicas: [
          'ABNT NBR 6118: Projeto de estruturas de concreto — Procedimento',
          'ABNT NBR 7684: Concreto — Determinação da consistência pelo abatimento do tronco de cone',
          'ABNT NBR 14931: Execução de estruturas de concreto — Procedimento',
        ],
        materiaisUtilizados: [
          'Argamassas tixotrópicas estruturais modificadas com polímeros e sílica ativa',
          'Grautes cimentícios fluidos de retração nula e altíssima resistência inicial',
          'Inibidores de corrosão e primers convertedores de óxido de ferro',
          'Telas e barras de aço CA-50 certificadas para substituição de seções com perda de área > 15%',
        ],
        beneficiosCondominio: [
          'Restauração definitiva da integridade estrutural e segurança do edifício.',
          'Eliminação do risco de desprendimento de pedaços de concreto sobre pedestres ou veículos.',
          'Preservação e valorização imediata do patrimônio coletivo dos condôminos.',
          'Emissão de Anotação de Responsabilidade Técnica (ART/CREA-SC) de engenharia.',
        ],
      },

      restauracaoPinturaFachadas: {
        id: 'restauracao-pintura-fachadas',
        nome: 'Restauração e Pintura de Fachadas',
        subtitulo: 'Hidrojateamento técnico, tratamento de trincas ativas e pintura elastomérica de alto desempenho',
        descricaoGeral:
          'Revitalização completa da envoltória predial com produtos de última geração que unem proteção impermeabilizante de alta durabilidade e acabamento estético sofisticado, resistindo à intensa radiação solar e à névoa salina da Grande Florianópolis.',
        etapasExecutivas: [
          'Lavagem técnica e hidrojateamento de alta pressão para remoção de fungos, algas, fuligens e películas calcinadas.',
          'Teste de percussão acústica em 100% da fachada para identificação e remoção de rebocos descolados ou soltos.',
          'Abertura em "V" de trincas e fissuras dinâmicas com aplicação de mastique de poliuretano (PU) de alta elasticidade e telas resinadas.',
          'Aplicação de fundo preparador e selador acrílico pigmentado de alta penetração para equalização de absorção.',
          'Aplicação de 3 (três) demãos de tinta elastomérica pura premium com espessura de película seca controlada, criando membrana impermeável e flexível.',
        ],
        normasTecnicas: [
          'ABNT NBR 13245: Tintas para construção civil — Execução de pinturas em edificações não industriais',
          'ABNT NBR 11702: Tintas para construção civil — Classificação e requisitos',
          'ABNT NBR 16747: Inspeção predial — Diretrizes, conceitos, terminologia e procedimento',
        ],
        materiaisUtilizados: [
          'Tintas elastoméricas acrílicas puras com capacidade de cobrir microfissuras de até 1,0 mm',
          'Selantes de poliuretano (PU 40) de alta aderência e resistência aos raios UV',
          'Fundos preparadores hidrorrepelentes e impermeabilizantes à base de água',
          'Argamassas colantes e de regularização de fachada aditivadas com polímeros nobres',
        ],
        beneficiosCondominio: [
          'Cura definitiva de infiltrações de água pluvial pelas paredes externas.',
          'Fachada autolimpante, resistente à poluição urbana e ao acúmulo de poeira e maresia.',
          'Embelezamento arquitetônico com valorização patrimonial média entre 15% e 25% das unidades.',
          'Garantia de 5 anos de estanqueidade e integridade do filme de pintura.',
        ],
      },

      reformasTelhados: {
        id: 'reformas-telhados',
        nome: 'Reformas e Impermeabilização de Telhados',
        subtitulo: 'Substituição de telhas, madeiramento, calhas, rufos e eliminação de infiltrações',
        descricaoGeral:
          'Soluções completas para coberturas, áticos, barriletes e telhados condominiais. Realizamos desde reparos pontuais de goteiras até a reformulação total do sistema de escoamento pluvial, eliminando infiltrações crônicas nos apartamentos das coberturas.',
        etapasExecutivas: [
          'Inspeção detalhada de madeiramento, vigamento estrutural, terças, caibros e ripas.',
          'Substituição de telhas danificadas, trincadas ou porosas por novas peças de alto padrão.',
          'Tratamento preventivo e corretivo contra umidade e cupins no madeiramento de suporte ou recuperação de estruturas metálicas.',
          'Fabricação e instalação de calhas, contra-rufos e rufos sob medida com inclinação correta para evitar transbordamentos.',
          'Impermeabilização de platibandas, lajes de barrilete e juntas de dilatação com mantas aluminizadas ou membranas líquidas de poliuretano.',
        ],
        normasTecnicas: [
          'ABNT NBR 8039: Projeto e execução de telhados com telhas cerâmicas tipo francesa e tipo colonial',
          'ABNT NBR 9575: Impermeabilização — Seleção e projeto',
          'ABNT NBR 10844: Instalações prediais de águas pluviais',
        ],
        materiaisUtilizados: [
          'Telhas cerâmicas esmaltadas, telhas de concreto ou metálicas termoacústicas',
          'Calhas e rufos em chapas galvanizadas bitola 24 ou alumínio com pintura eletrostática',
          'Mantas asfálticas elastoméricas e membranas de poliuretano (PU) puro',
          'Parafusos de fixação com vedação em EPDM vulcanizado resistentes a tempestades',
        ],
        beneficiosCondominio: [
          'Eliminação definitiva de goteiras e vazamentos nos apartamentos superiores e salão de festas.',
          'Proteção integral da estrutura de concreto do barrilete e caixas d’água.',
          'Sistema de captação de água pluvial dimensionado para chuvas torrenciais litorâneas.',
          'Eliminação de custos recorrentes de manutenção corretiva emergencial.',
        ],
      },

      pastilhasETexturasEspeciais: {
        id: 'pastilhas-texturas-especiais',
        nome: 'Restauração de Pastilhas, Cerâmicas e Efeitos Decorativos',
        subtitulo: 'Substituição cerâmica, textura projetada, efeito mármore e cimento queimado',
        descricaoGeral:
          'Tratamento especializado para fachadas pastilhadas e superfícies decorativas nobres. Recuperamos a ancoragem mecânica de revestimentos cerâmicos soltos e aplicamos acabamentos contemporâneos de alto padrão visual em áreas nobres e fachadas.',
        etapasExecutivas: [
          'Varredura percussiva completa para remoção cirúrgica de pastilhas ou placas cerâmicas sem aderência.',
          'Recomposição do emboço com argamassa estrutural impermeável e reaplicação de peças idênticas às originais com argamassa AC-III.',
          'Abertura e repolimento de juntas com rejunte resinado de altíssima densidade hidrorrepelente.',
          'Aplicação de textura projetada hidrorrepelente para renovação estética de panos de alvenaria.',
          'Execução de efeitos decorativos refinados (marmorizado realista, cimento queimado rústico/moderno e pedras nobres) em portarias, halls de entrada e áreas sociais.',
        ],
        normasTecnicas: [
          'ABNT NBR 13755: Revestimentos cerâmicos de fachadas e paredes externas com utilização de argamassa colante',
          'ABNT NBR 14081: Argamassa colante industrializada para assentamento de placas cerâmicas',
        ],
        materiaisUtilizados: [
          'Argamassa colante flexível AC-III de alto desempenho para áreas externas e grandes alturas',
          'Rejuntes acrílicos e epóxi bicomponentes antimofo e antibacterianos',
          'Texturas projetadas acrílicas com quartzo selecionado e hidro-repelência',
          'Massas nobres para marmorização e cimento queimado com resinas de proteção contra riscos e intempéries',
        ],
        beneficiosCondominio: [
          'Segurança total contra o desprendimento acidental de peças cerâmicas sobre transeuntes.',
          'Aspecto visual moderno e elegante, rejuvenescendo o design arquitetônico do condomínio.',
          'Áreas sociais internas e fachadas com acabamento de alto padrão de luxo.',
          'Alta durabilidade e facilidade de limpeza e lavagem no dia a dia.',
        ],
      },

      calcadasGaragensSinalizacao: {
        id: 'calcadas-garagens-sinalizacao',
        nome: 'Calçadas, Demarcação de Garagens e Sinalização Condominial',
        subtitulo: 'Recuperação de pisos de alta resistência, sinalização viária e demarcação de vagas',
        descricaoGeral:
          'Solução completa para áreas de circulação de veículos e pedestres no condomínio. Recuperamos pisos de concreto e pavimentos intertravados, realizamos pinturas epóxi de garagens e executamos toda a demarcação viária e de acessibilidade com perfeição milimétrica.',
        etapasExecutivas: [
          'Fresagem, polimento ou hidrojateamento de pisos para remoção de óleos, graxas e eflorescências.',
          'Tratamento de juntas de dilatação de garagens com selante flexível de poliuretano autonivelante.',
          'Recuperação de calçadas externas de passeio público conforme as normas de acessibilidade urbana.',
          'Pintura de pisos com resina epóxi ou poliuretano bicomponente de alta resistência ao tráfego de veículos pesados.',
          'Demarcação técnica de vagas normais, vagas para idosos e PCD, rotas de fuga, hidrantes e faixas de circulação de pedestres.',
        ],
        normasTecnicas: [
          'ABNT NBR 9050: Acessibilidade a edificações, mobiliário, espaços e equipamentos urbanos',
          'ABNT NBR 14050: Sistemas de revestimentos de alto desempenho à base de resinas epoxídicas',
          'Resoluções do CONTRAN para sinalização horizontal e vertical de trânsito em condomínios fechados',
        ],
        materiaisUtilizados: [
          'Tintas viárias de base acrílica à base de solvente com microesferas de vidro retrorrefletivas',
          'Tintas epóxi autonivelantes e poliuretanos industriais de alto sólidos',
          'Selantes de poliuretano elastomérico para juntas de piso',
          'Piso tátil direcional e de alerta para calçadas acessíveis',
        ],
        beneficiosCondominio: [
          'Organização do tráfego interno e eliminação de conflitos de estacionamento entre moradores.',
          'Garantia de acessibilidade universal e conformidade legal com as posturas municipais.',
          'Pisos de garagens claros, limpos, fáceis de varrer e livres de poeira constante de cimento.',
          'Sinalização de segurança visível mesmo no período noturno com excelente reflexão óptica.',
        ],
      },
    },
  },

  // PARTE 3 — DIFERENCIAIS COMPETITIVOS E FECHAMENTO COMERCIAL (PÁGINAS 12 E 13)
  diferenciaisEFechamento: {
    titulo: 'Diferenciais Competitivos & Fechamento Comercial',
    subtitulo: 'Por que a RenovarSC é a parceira definitiva para a gestão do seu condomínio',
    diferenciais: [
      {
        numero: 1,
        titulo: 'Capacidade Operacional Forte',
        subtitulo: 'Estrutura técnica própria, maquinário moderno e ritmo acelerado',
        descricao:
          'Possuímos maquinário próprio de hidrojateamento de alta pressão, balancins elétricos e manuais certificados, compressores e equipamentos de corte que eliminam gargalos operacionais e garantem ritmo de trabalho constante sem interrupções.',
        impactoParaCondominio: 'Obras rápidas e contínuas, sem paralisações por falta de ferramentas ou maquinário.',
      },
      {
        numero: 2,
        titulo: 'Entrega Rápida e Pontualidade Rigorosa',
        subtitulo: 'Respeito absoluto aos prazos contratuais acordados',
        descricao:
          'Nosso planejamento detalhado e o correto dimensionamento das equipes permitem cumprir rigorosamente o cronograma físico-financeiro aprovado em assembleia, eliminando a frustração de obras intermináveis.',
        impactoParaCondominio: 'Previsibilidade de datas e fim do estresse de canteiros instalados por meses a fio além do prazo.',
      },
      {
        numero: 3,
        titulo: 'Sócios Presentes no Canteiro de Obras',
        subtitulo: 'Gestão ativa, acompanhamento diário e decisão técnica imediata',
        descricao:
          'Os fundadores da RenovarSC acompanham a execução presencialmente no condomínio. Qualquer dúvida do síndico, alteração técnica ou alinhamento com moradores é resolvido na hora, sem a burocracia de grandes corporações.',
        impactoParaCondominio: 'Canal direto com quem decide e garantia de que o contratado é exatamente o que está sendo executado.',
      },
      {
        numero: 4,
        titulo: 'Equipes Próprias 100% CLT e Treinadas',
        subtitulo: 'Mão de obra estável, qualificada e sem intermediações precárias',
        descricao:
          'Não operamos com terceirização precarizada de mão de obra ("pejotização" disfarçada). Nossos colaboradores são registrados em regime CLT, uniformizados, identificados e treinados constantemente no método RenovarSC de qualidade e respeito.',
        impactoParaCondominio: 'Segurança patrimonial e blindagem jurídica completa contra riscos de processos trabalhistas contra o condomínio.',
      },
      {
        numero: 5,
        titulo: 'Segurança Rigorosa (Tolerância Zero)',
        subtitulo: 'Conformidade irrestrita com NR-18 e NR-35 e fiscalização diária',
        descricao:
          'Inspeção diária dos pontos de ancoragem, travas-quedas, cabos de aço e uso compulsório de EPIs completos. Nenhum colaborador sobe em balancim sem a verificação prévia de todos os itens de segurança.',
        impactoParaCondominio: 'Tranquilidade e proteção contra riscos de acidentes graves no ambiente do condomínio.',
      },
      {
        numero: 6,
        titulo: 'Garantia Real e Suporte Técnico Pós-Obra',
        subtitulo: 'Compromisso contratual formal mínimo de 5 anos e assistência rápida',
        descricao:
          'Nossa garantia de no mínimo 5 anos não é uma promessa de vendas, mas sim um termo formal em contrato respaldado por ART emitida junto ao CREA/SC e pelo Código Civil Brasileiro, com atendimento técnico rápido em toda a Grande Florianópolis.',
        impactoParaCondominio: 'Certeza de retorno sobre o investimento e amparo técnico imediato sempre que necessário.',
      },
    ],

    fechamentoComercial: {
      titulo: 'Fechamento Comercial — Uma Parceria Estratégica para o seu Condomínio',
      subtitulo: 'Mais que obra, excelência: a decisão mais segura para síndicos e administradoras',
      paragrafos: [
        'A gestão de um condomínio exige decisões corajosas e responsáveis. Escolher a empresa que executará a restauração da fachada e a recuperação estrutural do edifício é, sem dúvida, uma das decisões mais importantes do mandato de um síndico.',
        'Contratar a RenovarSC significa optar pelo fim das soluções superficiais, das surpresas orçamentárias e dos conflitos com moradores. Nossa equipe assume a responsabilidade técnica integral da obra, permitindo que a administração predial trabalhe com tranquilidade e foco em sua rotina.',
        'Entregamos edifícios estruturalmente saudáveis, esteticamente impecáveis e valorizados no mercado imobiliário em até 20% a 30%. Ao final dos trabalhos, os moradores têm orgulho de viver em um edifício seguro e bonito, e a administração tem a convicção de ter investido os recursos do condomínio com a máxima eficiência e responsabilidade.',
        'Convidamos você, síndico(a) e administradora de condomínios, a agendar uma Visita Técnica Pericial Gratuita e sem compromisso. Nossa equipe irá até o seu edifício, realizará os testes periciais preliminares de percussão e entregará uma Proposta Técnica Comercial detalhada, clara e transparente.',
      ],
      compromissosExclusivosCondominio: [
        'Atuação 100% exclusiva no segmento de condomínios e edifícios de grande porte.',
        'Orçamento transparente e sem surpresas: valores fechados por etapa executada.',
        'Emissão de ART/CREA-SC antes do início de qualquer atividade prática.',
        'Seguro triplo ativo: riscos de engenharia, responsabilidade civil e vida de colaboradores.',
        'Equipe 100% CLT com exames de trabalho em altura (NR-35) e antecedentes checados.',
        'Garantia formal mínima de 5 anos com atendimento pós-obra direto e ágil na Grande Florianópolis.',
      ],
      chamadaAcao: {
        titulo: 'Agende uma Vistoria Técnica Pericial Sem Compromisso',
        descricao:
          'Nossa equipe de engenharia está pronta para inspecionar sua edificação na Grande Florianópolis e apresentar o plano de ação ideal para a valorização do seu condomínio.',
        canais: [
          {
            tipo: 'Telefone e WhatsApp Comercial',
            valor: '(48) 99980-7965',
            descricao: 'Atendimento direto com a diretoria técnica e comercial da RenovarSC.',
          },
          {
            tipo: 'Instagram Oficial',
            valor: '@renovar_oficial03',
            descricao: 'Acompanhe fotos, vídeos e o dia a dia de nossas obras em tempo real.',
          },
          {
            tipo: 'Sede e Atendimento Presencial',
            valor: 'São José - SC',
            descricao: 'Atendimento com visitas presenciais em Florianópolis, São José, Palhoça e Biguaçu.',
          },
        ],
      },
    },
  },
};
