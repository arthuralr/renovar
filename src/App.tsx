/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { WizardStepper } from './components/WizardStepper';
import { Step1Cliente } from './components/Step1Cliente';
import { Step3Custos } from './components/Step3Custos';
import { Step4Resumo } from './components/Step4Resumo';
import { OrcamentoPdfModal } from './components/OrcamentoPdfModal';
import { UploadSection } from './components/UploadSection';
import { ImageInspector } from './components/ImageInspector';
import { DiagnosticsResult } from './components/DiagnosticsResult';
import { JsonModal } from './components/JsonModal';
import { OfficialReportModal } from './components/OfficialReportModal';
import { NormasModal } from './components/NormasModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { OrcamentosKanbanBoard } from './components/OrcamentosKanbanBoard';
import {
  DiagnosticoResponse,
  InspecaoContexto,
  HistoricoInspecao,
  DadosCliente,
  ItemMaterial,
  CargoProfissional,
  CondicoesComerciais,
  OrcamentoSalvo,
  StatusOrcamentoKanban,
  WizardStep,
} from './types';
import {
  calcularOrcamento,
  MATERIAIS_PADRAO,
  CONDICOES_COMERCIAIS_PADRAO,
} from './utils/budgetCalculator';
import { gerarLaudoTecnicoAbntFallback } from './utils/abntEngine';
import { diagnosticarImagemClient } from './services/geminiService';
import { enviarOrcamentoWebhook } from './services/webhookService';
import {
  salvarOrcamentosNoStorage,
} from './utils/orcamentoKanbanUtils';
import {
  carregarOrcamentoDaNuvemPorId,
  carregarOrcamentosDaNuvem,
  compactarImagensParaPlanilha,
  salvarOrcamentoNaNuvem,
  atualizarStatusOrcamentoNaNuvem,
  excluirOrcamentoNaNuvem,
} from './services/googleSheetsService';
import {
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';

const STORAGE_KEY = 'patologias_historico_v1';

export default function App() {
  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1: Dados do Cliente
  const [dadosCliente, setDadosCliente] = useState<DadosCliente>({
    nomeCondominio: '',
    cnpj: '',
    endereco: '',
    nomeSindico: '',
    anoConstrucao: '',
    pavimentos: '',
    telefone: '',
    email: '',
  });

  const handleUpdateCliente = (novosDados: Partial<DadosCliente>) => {
    setDadosCliente((prev) => {
      return { ...prev, ...novosDados };
    });
  };

  // Step 2: Diagnóstico Pericial
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageRecordId, setSelectedImageRecordId] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const selectedImageRecordIdRef = useRef<string | null>(null);
  const isPersistingStepRef = useRef(false);
  const [contexto, setContexto] = useState<InspecaoContexto>({
    responsavelTecnico: 'Engenheiro Civil Especialista em Estruturas e Fachadas',
    crea: 'CREA Ativo',
  });
  const [diagnostico, setDiagnostico] = useState<DiagnosticoResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize building name and age with diagnosis context
  useEffect(() => {
    setContexto((prev) => ({
      ...prev,
      nomeEdificio: dadosCliente.nomeCondominio || prev.nomeEdificio,
      idadeEdificio: dadosCliente.anoConstrucao
        ? `${dadosCliente.anoConstrucao} (${new Date().getFullYear() - parseInt(dadosCliente.anoConstrucao || '0', 10) || ''} anos)`
        : prev.idadeEdificio,
      localizacao: dadosCliente.endereco || prev.localizacao,
    }));
  }, [dadosCliente.nomeCondominio, dadosCliente.anoConstrucao, dadosCliente.endereco]);

  // Step 3: Materiais e Equipe
  const [materiais, setMateriais] = useState<ItemMaterial[]>([]);
  const [equipe, setEquipe] = useState<CargoProfissional[]>([]);
  const [mesesObra, setMesesObra] = useState<number>(0);
  const [margemLucroPercentual, setMargemLucroPercentual] = useState<number>(0);

  // Condições Comerciais e Pagamento
  const [condicoesComerciais, setCondicoesComerciais] =
    useState<CondicoesComerciais>(CONDICOES_COMERCIAIS_PADRAO);

  const handleUpdateCondicoesComerciais = (novasCondicoes: Partial<CondicoesComerciais>) => {
    setCondicoesComerciais((prev) => {
      return { ...prev, ...novasCondicoes };
    });
  };

  // Step 4: Cálculos Automáticos de Backoffice
  const calculos = useMemo(() => {
    return calcularOrcamento(materiais, equipe, mesesObra, margemLucroPercentual);
  }, [materiais, equipe, mesesObra, margemLucroPercentual]);

  // Modals
  const [isOrcamentoPdfOpen, setIsOrcamentoPdfOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isNormasModalOpen, setIsNormasModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isKanbanModalOpen, setIsKanbanModalOpen] = useState(false);
  const [historico, setHistorico] = useState<HistoricoInspecao[]>([]);
  // Registros fotográficos exatos da vistoria atual (1 item patológico por foto enviada)
  const [registrosVistoria, setRegistrosVistoria] = useState<HistoricoInspecao[]>([]);

  // Histórico e Kanban de Orçamentos Gerados (sincronizado com Google Sheets Cloud)
  const [orcamentosSalvos, setOrcamentosSalvos] = useState<OrcamentoSalvo[]>([]);
  const [activeOrcamentoId, setActiveOrcamentoId] = useState<string | null>(null);
  const editLoadRequestRef = useRef(0);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudRetryAction, setCloudRetryAction] = useState<(() => void) | null>(null);

  // Sincroniza o histórico remoto sem preencher ou alterar os campos do novo orçamento.
  const sincronizarOrcamentosDaNuvem = async () => {
    setIsSyncingCloud(true);
    try {
      const listaNuvem = await carregarOrcamentosDaNuvem();
      setOrcamentosSalvos(listaNuvem);
      setCloudError(null);
      setCloudRetryAction(null);
    } catch (e) {
      console.warn('Erro ao sincronizar orçamentos da nuvem (Google Sheets):', e);
      setCloudError(
        e instanceof Error ? e.message : 'Não foi possível sincronizar com o Google Sheets.'
      );
      setCloudRetryAction(() => () => void sincronizarOrcamentosDaNuvem());
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Busca o estado atual da nuvem na inicialização e continua atualizando o Kanban aberto.
  useEffect(() => {
    void sincronizarOrcamentosDaNuvem();
    if (isKanbanModalOpen) {
      const handleWindowFocus = () => void sincronizarOrcamentosDaNuvem();
      window.addEventListener('focus', handleWindowFocus);
      const timer = setInterval(() => {
        void sincronizarOrcamentosDaNuvem();
      }, 15000);
      return () => {
        window.removeEventListener('focus', handleWindowFocus);
        clearInterval(timer);
      };
    }
  }, [isKanbanModalOpen]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistorico(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Erro ao carregar histórico local', e);
    }
  }, []);

  const setSelectedImageRecord = (recordId: string | null) => {
    selectedImageRecordIdRef.current = recordId;
    setSelectedImageRecordId(recordId);
  };

  const upsertRegistroVistoria = (res: DiagnosticoResponse, img: string, name: string) => {
    const selectedRecordId = selectedImageRecordIdRef.current;
    setRegistrosVistoria((prev) => {
      const existingIdx = prev.findIndex(
        (r) => r.id === selectedRecordId || r.imagemUrl === img
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          dataHora: new Date().toISOString(),
          nomeArquivo: name || updated[existingIdx].nomeArquivo || 'vistoria-fotografica.jpg',
          contexto,
          resultado: res,
        };
        return updated;
      }
      const newItem: HistoricoInspecao = {
        id:
          selectedRecordId ||
          `insp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        dataHora: new Date().toISOString(),
        imagemUrl: img,
        nomeArquivo: name || `vistoria-foto-${prev.length + 1}.jpg`,
        contexto,
        resultado: res,
      };
      return [...prev, newItem];
    });
  };

  const saveToHistory = (res: DiagnosticoResponse, img: string, name: string) => {
    upsertRegistroVistoria(res, img, name);

    setHistorico((prev) => {
      const filtered = prev.filter((h) => h.imagemUrl !== img);
      const newItem: HistoricoInspecao = {
        id: `insp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        dataHora: new Date().toISOString(),
        imagemUrl: img,
        nomeArquivo: name || 'vistoria-fotografica.jpg',
        contexto,
        resultado: res,
      };
      const updated = [newItem, ...filtered.slice(0, 19)];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Não foi possível persistir histórico no localStorage', e);
      }
      return updated;
    });
  };

  const handleImageSelected = (base64: string, name: string, mType: string) => {
    const recordId = `insp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setSelectedImage(base64);
    setSelectedImageRecord(recordId);
    setImageName(name);
    setMimeType(mType);
    setErrorMessage(null);

    setRegistrosVistoria((prev) => {
      const nextIndex = prev.length;
      const autoDiag = gerarLaudoTecnicoAbntFallback(contexto, nextIndex);
      setDiagnostico(autoDiag);
      const newItem: HistoricoInspecao = {
        id: recordId,
        dataHora: new Date().toISOString(),
        imagemUrl: base64,
        nomeArquivo: name || `vistoria-foto-${nextIndex + 1}.jpg`,
        contexto,
        resultado: autoDiag,
      };
      return [...prev, newItem];
    });
  };

  const handleRemoveRegistroVistoria = (id: string) => {
    setRegistrosVistoria((prev) => {
      const target = prev.find((r) => r.id === id);
      const remaining = prev.filter((r) => r.id !== id);
      if (target && (target.id === selectedImageRecordIdRef.current || target.imagemUrl === selectedImage)) {
        if (remaining.length > 0) {
          const next = remaining[remaining.length - 1];
          setSelectedImage(next.imagemUrl);
          setSelectedImageRecord(next.id);
          setImageName(next.nomeArquivo);
          setDiagnostico(next.resultado);
        } else {
          setSelectedImage(null);
          setSelectedImageRecord(null);
          setImageName('');
          setDiagnostico(null);
        }
      }
      return remaining;
    });
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    if (!selectedImage.startsWith('data:image/')) {
      setErrorMessage(
        'Esta fotografia está vinculada por uma URL externa e não pode ser reanalisada nesta sessão. Reenvie o arquivo original para executar um novo diagnóstico.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const currentPhotoIdx = Math.max(
      0,
      registrosVistoria.findIndex((r) => r.id === selectedImageRecordId)
    );

    try {
      let data: DiagnosticoResponse | null = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        try {
          const response = await fetch('/api/diagnosticar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageBase64: selectedImage,
              mimeType: mimeType || 'image/jpeg',
              contexto,
              photoIndex: currentPhotoIdx,
            }),
            signal: controller.signal,
          });

          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json') && response.ok) {
            data = await response.json();
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (serverErr: any) {
        console.warn(
          'Acionando contingência no cliente após falha na rota /api/diagnosticar:',
          serverErr?.message || serverErr
        );
      }

      if (!data || !Array.isArray(data.anomalias || data.patologias) || (data.anomalias || data.patologias || []).length === 0) {
        data = await diagnosticarImagemClient(
          selectedImage,
          mimeType || 'image/jpeg',
          contexto,
          currentPhotoIdx
        );
      }

      const items = data?.anomalias || data?.patologias;
      if (!data || !Array.isArray(items) || items.length === 0) {
        data = gerarLaudoTecnicoAbntFallback(contexto, currentPhotoIdx);
      }

      setDiagnostico(data);
      saveToHistory(data, selectedImage, imageName);
    } catch (err: any) {
      console.warn('Acionando geração imediata de laudo técnico ABNT por contingência:', err);
      const fallbackData = gerarLaudoTecnicoAbntFallback(contexto, currentPhotoIdx);
      setDiagnostico(fallbackData);
      saveToHistory(fallbackData, selectedImage, imageName);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Deseja realmente limpar todo o histórico de vistorias?')) {
      setHistorico([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleDeleteHistorySingle = (id: string) => {
    const updated = historico.filter((h) => h.id !== id);
    setHistorico(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleSelectHistoryItem = (item: HistoricoInspecao) => {
    setSelectedImage(item.imagemUrl);
    setSelectedImageRecord(item.id);
    setImageName(item.nomeArquivo);
    const imageMimeType = item.imagemUrl.match(/^data:(image\/[^;]+);base64,/)?.[1];
    if (imageMimeType) setMimeType(imageMimeType);
    setContexto(item.contexto);
    setDiagnostico(item.resultado);
    setErrorMessage(null);
    upsertRegistroVistoria(item.resultado, item.imagemUrl, item.nomeArquivo);
    setCurrentStep(2); // Jump to step 2 when selecting history
  };

  const handleReset = () => {
    if (selectedImage) {
      const target = registrosVistoria.find(
        (r) => r.id === selectedImageRecordIdRef.current || r.imagemUrl === selectedImage
      );
      if (target) {
        handleRemoveRegistroVistoria(target.id);
        return;
      }
    }
    setSelectedImage(null);
    setSelectedImageRecord(null);
    setImageName('');
    setDiagnostico(null);
    setErrorMessage(null);
  };

  // Diagnóstico consolidado da vistoria atual (1 item patológico por foto enviada)
  const diagnosticoConsolidado = useMemo<DiagnosticoResponse | null>(() => {
    if (registrosVistoria.length > 0) {
      const itens = registrosVistoria
        .map((r) => (r.resultado?.anomalias || r.resultado?.patologias || [])[0])
        .filter(Boolean);
      if (itens.length > 0) {
        return {
          anomalias: itens,
          patologias: itens,
        };
      }
    }
    return diagnostico;
  }, [registrosVistoria, diagnostico]);

  // Salva (ou atualiza) o orçamento e dados do cliente na planilha do Google Sheets e retorna o registro salvo
  const salvarOrcamentoNoHistorico = async (
    forcarNovoId = false,
    etapaFormulario: WizardStep = currentStep
  ): Promise<OrcamentoSalvo | null> => {
    if (!dadosCliente.nomeCondominio.trim()) {
      setCloudError('Informe o nome do condomínio antes de salvar ou concluir o orçamento.');
      setCloudRetryAction(null);
      return null;
    }

    const agora = new Date().toISOString();
    const idGerado =
      activeOrcamentoId && !forcarNovoId
        ? activeOrcamentoId
        : `PROP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const existente = orcamentosSalvos.find((o) => o.id === idGerado);
    const statusPreservado: StatusOrcamentoKanban = existente?.status || 'em_elaboracao';

    const novoRegistroBase: OrcamentoSalvo = {
      id: idGerado,
      dataCriacao: existente?.dataCriacao || agora,
      dataAtualizacao: agora,
      status: statusPreservado,
      dadosCliente: { ...dadosCliente },
      calculos: { ...calculos },
      condicoesComerciais: { ...condicoesComerciais },
      materiais: materiais.map((m) => ({ ...m })),
      equipe: equipe.map((e) => ({ ...e })),
      mesesObra,
      margemLucroPercentual,
      diagnostico: diagnosticoConsolidado,
      registrosVistoria: [...registrosVistoria],
      selectedImage,
    };

    try {
      const novoRegistro = await compactarImagensParaPlanilha(novoRegistroBase);
      await salvarOrcamentoNaNuvem(novoRegistro, etapaFormulario);
      setRegistrosVistoria(novoRegistro.registrosVistoria || []);
      const imagemAtualCompactada = novoRegistro.registrosVistoria?.find(
        (registro) => registro.id === selectedImageRecordIdRef.current
      )?.imagemUrl;
      if (imagemAtualCompactada && selectedImage?.startsWith('data:image/')) {
        setSelectedImage(imagemAtualCompactada);
      }
      setOrcamentosSalvos((prev) => {
        const semDuplicata = prev.filter((o) => o.id !== idGerado);
        const atualizados = [novoRegistro, ...semDuplicata];
        salvarOrcamentosNoStorage(atualizados);
        return atualizados;
      });
      setActiveOrcamentoId(idGerado);
      setCloudError(null);
      setCloudRetryAction(null);
      return novoRegistro;
    } catch (error) {
      console.error('Erro ao salvar orçamento no Google Sheets:', error);
      setCloudError(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar o orçamento no Google Sheets.'
      );
      setCloudRetryAction(() =>
        () => void salvarOrcamentoNoHistorico(forcarNovoId, etapaFormulario)
      );
      return null;
    }
  };

  // Persist photo-bearing budgets when the user explicitly advances the wizard.
  const handleMudarEtapaFormulario = async (proximaEtapa: WizardStep) => {
    if (proximaEtapa === currentStep || isPersistingStepRef.current) return;
    const temFotosParaPersistir = registrosVistoria.some((registro) =>
      registro.imagemUrl.startsWith('data:image/')
    );
    if (
      proximaEtapa > currentStep &&
      temFotosParaPersistir &&
      dadosCliente.nomeCondominio.trim()
    ) {
      isPersistingStepRef.current = true;
      try {
        const salvo = await salvarOrcamentoNoHistorico(false, proximaEtapa);
        if (!salvo) return;
      } finally {
        isPersistingStepRef.current = false;
      }
    }
    setCurrentStep(proximaEtapa);
  };

  // Limpa o formulário para iniciar o cadastro de um novo orçamento / cliente
  const handleNovoOrcamento = () => {
    setActiveOrcamentoId(null);
    setCloudError(null);
    setCloudRetryAction(null);
    setIsOrcamentoPdfOpen(false);
    setIsJsonModalOpen(false);
    setIsReportModalOpen(false);
    setIsHistoryOpen(false);
    setIsKanbanModalOpen(false);
    setDadosCliente({
      nomeCondominio: '',
      cnpj: '',
      endereco: '',
      nomeSindico: '',
      anoConstrucao: '',
      pavimentos: '',
      telefone: '',
      email: '',
    });
    setSelectedImage(null);
    setSelectedImageRecord(null);
    setImageName('');
    setMimeType('image/jpeg');
    setContexto({
      responsavelTecnico: 'Engenheiro Civil Especialista em Estruturas e Fachadas',
      crea: 'CREA Ativo',
    });
    setDiagnostico(null);
    setRegistrosVistoria([]);
    setErrorMessage(null);
    setMateriais([]);
    setEquipe([]);
    setMesesObra(0);
    setMargemLucroPercentual(0);
    setCondicoesComerciais(CONDICOES_COMERCIAIS_PADRAO);
    setCurrentStep(1);
  };

  // Atualiza a etapa Kanban de um orçamento salvo (local + Google Sheets Cloud)
  const handleUpdateStatusOrcamento = (id: string, novoStatus: StatusOrcamentoKanban) => {
    const alvo = orcamentosSalvos.find((orc) => orc.id === id);
    setOrcamentosSalvos((prev) => {
      const atualizados = prev.map((orc) =>
        orc.id === id
          ? { ...orc, status: novoStatus, dataAtualizacao: new Date().toISOString() }
          : orc
      );
      salvarOrcamentosNoStorage(atualizados);
      return atualizados;
    });

    if (alvo) {
      void atualizarStatusOrcamentoNaNuvem(alvo, novoStatus);
    }
  };

  // Exclui um orçamento salvo da lista e da nuvem (Google Sheets)
  const handleDeleteOrcamento = async (id: string) => {
    try {
      await excluirOrcamentoNaNuvem(id);
      setOrcamentosSalvos((prev) => {
        const atualizados = prev.filter((orc) => orc.id !== id);
        salvarOrcamentosNoStorage(atualizados);
        return atualizados;
      });
      if (activeOrcamentoId === id) setActiveOrcamentoId(null);
      setCloudError(null);
    } catch (error) {
      console.error(`Erro ao excluir orçamento ${id} do Google Sheets:`, error);
      const message =
        error instanceof Error ? error.message : 'Não foi possível excluir o orçamento da nuvem.';
      setCloudError(message);
      window.alert(message);
    }
  };

  // Limpa todos os orçamentos salvos
  const handleClearAllOrcamentos = async () => {
    if (confirm('Deseja realmente excluir todos os orçamentos salvos do histórico?')) {
      const idsAtuais = orcamentosSalvos.map((o) => o.id);
      const resultados = await Promise.all(
        idsAtuais.map(async (id) => {
          try {
            await excluirOrcamentoNaNuvem(id);
            return { id, excluido: true };
          } catch (error) {
            console.error(`Erro ao excluir orçamento ${id} do Google Sheets:`, error);
            return { id, excluido: false };
          }
        })
      );
      const excluidos = new Set(
        resultados.filter((resultado) => resultado.excluido).map((resultado) => resultado.id)
      );
      const restantes = orcamentosSalvos.filter((orcamento) => !excluidos.has(orcamento.id));
      setOrcamentosSalvos(restantes);
      salvarOrcamentosNoStorage(restantes);
      if (activeOrcamentoId && excluidos.has(activeOrcamentoId)) setActiveOrcamentoId(null);
      setCloudError(
        restantes.length > 0
          ? 'Alguns orçamentos não puderam ser excluídos da nuvem. Tente novamente.'
          : null
      );
      if (restantes.length > 0) {
        window.alert('Alguns orçamentos não puderam ser excluídos da nuvem. Tente novamente.');
      }
    }
  };

  // Carrega do snapshot remoto correspondente ao ID selecionado, sem reutilizar o objeto da linha.
  const handleLoadOrcamento = async (proposalId: string): Promise<boolean> => {
    const requestId = ++editLoadRequestRef.current;
    const localSnapshot = orcamentosSalvos.find((orcamento) => orcamento.id === proposalId);
    let orcamento: OrcamentoSalvo | null = null;

    try {
      orcamento = await carregarOrcamentoDaNuvemPorId(proposalId);
      if (requestId !== editLoadRequestRef.current) return false;
      if (!orcamento) {
        setCloudError(`O orçamento ${proposalId} não foi encontrado na planilha.`);
        return false;
      }
      const orcamentoAtualizado = orcamento;
      setOrcamentosSalvos((anteriores) => {
        const existe = anteriores.some((item) => item.id === orcamentoAtualizado.id);
        return existe
          ? anteriores.map((item) =>
              item.id === orcamentoAtualizado.id ? orcamentoAtualizado : item
            )
          : [...anteriores, orcamentoAtualizado];
      });
      setCloudError(null);
      setCloudRetryAction(null);
    } catch (error) {
      if (requestId !== editLoadRequestRef.current) return false;
      console.error(`Erro ao buscar o orçamento ${proposalId} na nuvem:`, error);
      if (!localSnapshot) {
        setCloudError(
          error instanceof Error
            ? `Não foi possível carregar o orçamento ${proposalId}: ${error.message}`
            : `Não foi possível carregar o orçamento ${proposalId} da nuvem.`
        );
        setCloudRetryAction(() => () => void handleLoadOrcamento(proposalId));
        return false;
      }
      orcamento = localSnapshot;
      setCloudError(
        `Não foi possível atualizar o orçamento ${proposalId} da nuvem. O snapshot disponível foi carregado.`
      );
      setCloudRetryAction(() => () => void handleLoadOrcamento(proposalId));
    }

    if (!orcamento || requestId !== editLoadRequestRef.current) return false;

    const registros = orcamento.registrosVistoria || [];
    const selectedRecord =
      registros.find((registro) => registro.imagemUrl === orcamento?.selectedImage) ||
      registros[registros.length - 1] ||
      null;
    const selectedImage = selectedRecord?.imagemUrl || orcamento.selectedImage || null;
    const imageMimeType = selectedImage?.match(/^data:(image\/[^;]+);base64,/)?.[1];

    setActiveOrcamentoId(orcamento.id);
    setDadosCliente(orcamento.dadosCliente);
    setMateriais(orcamento.materiais || []);
    setEquipe(orcamento.equipe || []);
    setMesesObra(orcamento.mesesObra || 0);
    setMargemLucroPercentual(orcamento.margemLucroPercentual || 0);
    setCondicoesComerciais(orcamento.condicoesComerciais || CONDICOES_COMERCIAIS_PADRAO);
    setDiagnostico(orcamento.diagnostico || null);
    setRegistrosVistoria(registros);
    setContexto(
      selectedRecord?.contexto || {
        responsavelTecnico: 'Engenheiro Civil Especialista em Estruturas e Fachadas',
        crea: 'CREA Ativo',
        nomeEdificio: orcamento.dadosCliente.nomeCondominio,
        idadeEdificio: orcamento.dadosCliente.anoConstrucao
          ? `${orcamento.dadosCliente.anoConstrucao} (${new Date().getFullYear() - parseInt(orcamento.dadosCliente.anoConstrucao, 10) || ''} anos)`
          : '',
        localizacao: orcamento.dadosCliente.endereco,
      }
    );
    setSelectedImage(selectedImage);
    setSelectedImageRecord(selectedRecord?.id || null);
    setImageName(selectedRecord?.nomeArquivo || '');
    setMimeType(imageMimeType || 'image/jpeg');
    setErrorMessage(null);
    setCurrentStep(4);
    setIsKanbanModalOpen(false);
    return true;
  };

  // Abre diretamente o PDF de um orçamento salvo no histórico/Kanban
  const handleViewOrcamentoPdf = async (proposalId: string) => {
    if (await handleLoadOrcamento(proposalId)) {
      setIsOrcamentoPdfOpen(true);
    }
  };

  // Gerar o PDF é uma visualização; a gravação formal ocorre em "Concluir Orçamento".
  const handleGerarOrcamento = () => {
    setIsOrcamentoPdfOpen(true);
  };

  const handleConcluirOrcamento = async (): Promise<boolean> => {
    const registroSalvo = await salvarOrcamentoNoHistorico(false, 4);
    if (!registroSalvo) return false;

    void enviarOrcamentoWebhook({
      orcamentoId: registroSalvo.id,
      dadosCliente,
      calculos,
      condicoesComerciais,
      materiais,
      equipe,
      diagnostico: diagnosticoConsolidado,
      registrosVistoria,
      contexto,
      origemAcionamento: 'concluir_orcamento_step4',
    });
    return true;
  };

  // Completion check for stepper
  const isStepComplete = (step: WizardStep): boolean => {
    if (step === 1) {
      return !!dadosCliente.nomeCondominio.trim();
    }
    if (step === 2) {
      const items = diagnostico?.anomalias || diagnostico?.patologias;
      return Array.isArray(items) && items.length > 0;
    }
    if (step === 3) {
      return calculos.custoTotalDireto > 0;
    }
    if (step === 4) {
      return calculos.valorGlobal > 0;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Main Interactive Screen Content (Hidden completely during document printing) */}
      <div id="app-screen-content" className="flex-1 flex flex-col no-print">
        {/* Top Header */}
        <Header
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenNormas={() => setIsNormasModalOpen(true)}
          onOpenOrcamentosKanban={() => setIsKanbanModalOpen(true)}
          historyCount={historico.length}
          orcamentosCount={orcamentosSalvos.length}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {cloudError && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-start gap-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-semibold">Atenção</strong>
              <p className="text-xs text-red-300 mt-0.5">{cloudError}</p>
            </div>
            <button
              onClick={() =>
                cloudRetryAction
                  ? cloudRetryAction()
                  : void sincronizarOrcamentosDaNuvem()
              }
              className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-xs text-white rounded-lg transition cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        )}
        {/* Wizard Stepper Bar */}
        <WizardStepper
          currentStep={currentStep}
          onSelectStep={handleMudarEtapaFormulario}
          isStepComplete={isStepComplete}
        />

        {/* STEP 1: DADOS DO CLIENTE */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Step1Cliente
              dados={dadosCliente}
              onChange={handleUpdateCliente}
              onNext={() => handleMudarEtapaFormulario(2)}
              activeOrcamentoId={activeOrcamentoId}
              onNovoOrcamento={handleNovoOrcamento}
              isSyncingCloud={isSyncingCloud}
            />
          </div>
        )}

        {/* STEP 2: DIAGNÓSTICO PERICIAL (FOTOGRAFIAS & IA) */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Header / Sub-banner for Step 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>Passo 2: Diagnóstico Pericial de Fachadas</span>
                    {dadosCliente.nomeCondominio && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700 font-normal">
                        {dadosCliente.nomeCondominio}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Faça o upload ou captura das anomalias da edificação para emissão pericial conforme ABNT NBR 16747.
                  </p>
                </div>
              </div>

              {/* Step Navigation buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => handleMudarEtapaFormulario(1)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar: Dados do Cliente</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMudarEtapaFormulario(3)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  <span>Avançar: Materiais & Custos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* TOP BAR: Upload / Adicionar Fotos da Vistoria (logo abaixo do título do Passo 2) */}
            <UploadSection
              onImageSelected={handleImageSelected}
              contexto={contexto}
              setContexto={setContexto}
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              hasSelectedImage={!!selectedImage}
              registrosVistoria={registrosVistoria}
              selectedImage={selectedImage}
              selectedRegistroId={selectedImageRecordId}
              onSelectRegistro={handleSelectHistoryItem}
              onRemoveRegistro={handleRemoveRegistroVistoria}
            />

            {/* Error notification if any */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-start gap-3 shadow-lg">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="block font-semibold">Falha no processamento do diagnóstico:</strong>
                  <p className="text-xs text-red-300 mt-0.5">{errorMessage}</p>
                </div>
                <button
                  onClick={handleAnalyze}
                  className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-xs text-white rounded-lg transition cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            )}

            {/* Dual Column Layout: Left Image Inspector, Right Diagnosis Output */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {selectedImage ? (
                  <div className="space-y-4">
                    <ImageInspector imageUrl={selectedImage} imageName={imageName} />

                    {/* Quick actions for image */}
                    <div className="flex items-center justify-between text-xs">
                      <button
                        onClick={handleReset}
                        className="text-slate-400 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Remover fotografia ativa</span>
                      </button>

                      <button
                        onClick={handleAnalyze}
                        disabled={isLoading}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        {isLoading ? 'Analisando...' : 'Reavaliar com IA'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[260px]">
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      Utilize o botão <strong className="text-amber-400">"Selecionar Fotos"</strong> no topo desta seção para enviar 1 ou mais fotografias da vistoria técnica.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column (7 cols): Diagnostic Results */}
              <div className="lg:col-span-7">
                {isLoading ? (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
                    <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
                    <h3 className="text-base font-bold text-white mb-2">
                      Engenheiro Perito Analisando Evidências...
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md leading-relaxed font-mono">
                      Identificando anomalias na imagem, formulando constatação visual, causas prováveis, riscos evolutivos, normas ABNT, ensaios complementares e diretrizes de reparo.
                    </p>
                  </div>
                ) : diagnostico &&
                  ((diagnostico.anomalias && diagnostico.anomalias.length > 0) ||
                    (diagnostico.patologias && diagnostico.patologias.length > 0)) ? (
                  <div className="space-y-4">
                    <DiagnosticsResult
                      resultado={diagnostico}
                      contexto={contexto}
                      imageUrl={selectedImage || ''}
                      onOpenJson={() => setIsJsonModalOpen(true)}
                      onOpenReport={() => setIsReportModalOpen(true)}
                      onReset={handleReset}
                    />
                    {/* Prompt to proceed to budget */}
                    <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="text-xs text-slate-200">
                          Diagnóstico pericial concluído com sucesso ({registrosVistoria.length}{' '}
                          {registrosVistoria.length === 1 ? 'foto registrada' : 'fotos registradas'}). Avance para dimensionar os insumos e a equipe de obra.
                        </span>
                      </div>
                      <button
                        onClick={() => handleMudarEtapaFormulario(3)}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1.5 shadow-md"
                      >
                        <span>Avançar para Passo 3</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
                      <FileSpreadsheet className="w-8 h-8 opacity-40 text-amber-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-200 mb-2">
                      Aguardando Registro Fotográfico para Perícia
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                      Carregue ou capture uma fotografia na barra superior e clique em{' '}
                      <strong className="text-amber-400">
                        "Executar Diagnóstico ABNT"
                      </strong>{' '}
                      para processar a análise pericial completa com IA.
                    </p>
                    <button
                      onClick={() => handleMudarEtapaFormulario(3)}
                      className="text-xs text-slate-400 hover:text-amber-400 underline transition cursor-pointer"
                    >
                      Ou pule direto para o Passo 3 (Materiais e Custos) →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: MATERIAIS E EQUIPE (CUSTOS) */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Step3Custos
              materiais={materiais}
              setMateriais={setMateriais}
              equipe={equipe}
              setEquipe={setEquipe}
              mesesObra={mesesObra}
              setMesesObra={setMesesObra}
              calculos={calculos}
              condicoesComerciais={condicoesComerciais}
              onUpdateCondicoesComerciais={handleUpdateCondicoesComerciais}
              onPrev={() => handleMudarEtapaFormulario(2)}
              onNext={() => handleMudarEtapaFormulario(4)}
            />
          </div>
        )}

        {/* STEP 4: RESUMO FINANCEIRO (VALOR GLOBAL & PDF) */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <Step4Resumo
              dadosCliente={dadosCliente}
              diagnostico={diagnosticoConsolidado}
              calculos={calculos}
              condicoesComerciais={condicoesComerciais}
              onUpdateCondicoesComerciais={handleUpdateCondicoesComerciais}
              setMargemLucroPercentual={setMargemLucroPercentual}
              onOpenPdf={handleGerarOrcamento}
              onConcludeOrcamento={handleConcluirOrcamento}
              onPrev={() => handleMudarEtapaFormulario(3)}
              orcamentoId={activeOrcamentoId}
              statusOrcamento={
                orcamentosSalvos.find((orcamento) => orcamento.id === activeOrcamentoId)
                  ?.status || 'em_elaboracao'
              }
            />
          </div>
        )}
      </main>

        {/* Screen Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500 font-mono no-print">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>PATOLOGIAS.LAB • Sistema Integrado de Diagnóstico Pericial e Orçamentação de Fachadas</span>
            <span>Em conformidade com normas ABNT NBR 16747, NBR 13755 e NBR 6118</span>
          </div>
        </footer>
      </div>

      {/* Structured JSON Modal */}
      {diagnostico && (
        <JsonModal
          isOpen={isJsonModalOpen}
          onClose={() => setIsJsonModalOpen(false)}
          data={diagnosticoConsolidado || diagnostico}
        />
      )}

      {/* Official ABNT Report Printable Modal */}
      {diagnostico && selectedImage && (
        <OfficialReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          data={diagnosticoConsolidado || diagnostico}
          contexto={contexto}
          imageUrl={selectedImage}
          registrosVistoria={registrosVistoria}
        />
      )}

      {/* Commercial Budget PDF Printable Modal */}
      <OrcamentoPdfModal
        isOpen={isOrcamentoPdfOpen}
        onClose={() => setIsOrcamentoPdfOpen(false)}
        dadosCliente={dadosCliente}
        diagnostico={diagnosticoConsolidado}
        selectedImage={selectedImage}
        historico={registrosVistoria}
        materiais={materiais}
        equipe={equipe}
        calculos={calculos}
        condicoesComerciais={condicoesComerciais}
        orcamentoIdProp={activeOrcamentoId}
        statusOrcamento={
          orcamentosSalvos.find((o) => o.id === activeOrcamentoId)?.status || 'em_elaboracao'
        }
        onUpdateStatusOrcamento={(novoStatus) => {
          if (activeOrcamentoId) {
            handleUpdateStatusOrcamento(activeOrcamentoId, novoStatus);
          }
        }}
      />

      {/* Kanban & Saved Budgets Modal (Accessible from Header at any step) */}
      {isKanbanModalOpen && (
        <OrcamentosKanbanBoard
          orcamentos={orcamentosSalvos}
          activeOrcamentoId={activeOrcamentoId}
          onUpdateStatus={handleUpdateStatusOrcamento}
          onViewOrcamentoPdf={handleViewOrcamentoPdf}
          onLoadOrcamento={handleLoadOrcamento}
          onDeleteOrcamento={handleDeleteOrcamento}
          onClearAllOrcamentos={handleClearAllOrcamentos}
          onSaveCurrentOrcamento={() =>
            void salvarOrcamentoNoHistorico(false, currentStep)
          }
          onRefreshCloud={() => sincronizarOrcamentosDaNuvem()}
          isSyncingCloud={isSyncingCloud}
          isModal={true}
          onCloseModal={() => setIsKanbanModalOpen(false)}
          currentStep={currentStep}
          isStepComplete={isStepComplete}
          onSelectStep={(step) => {
            handleMudarEtapaFormulario(step);
            setIsKanbanModalOpen(false);
          }}
        />
      )}

      {/* ABNT Standards Reference Modal */}
      <NormasModal
        isOpen={isNormasModalOpen}
        onClose={() => setIsNormasModalOpen(false)}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historico={historico}
        onSelect={handleSelectHistoryItem}
        onClear={handleClearHistory}
        onDeleteSingle={handleDeleteHistorySingle}
      />
    </div>
  );
}
