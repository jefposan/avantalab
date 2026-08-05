'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import PontoFacialExperienceV2, { type EtapaFacialV2 } from './PontoFacialExperienceV2';
import '@aws-amplify/ui-react/styles.css';

type Inicio = { empresaId: string; token: string; tipo: 'cadastro' | 'marcacao' };
type Sessao = Inicio & { sessaoId: string; regiao: string };
type Conclusao = { tipo: Inicio['tipo']; horario: string };

const textosPtBr = {
  photosensitivityWarningHeadingText: 'Aviso de fotossensibilidade',
  photosensitivityWarningBodyText: 'Esta verificação pode exibir luzes coloridas. Tenha cuidado se você tiver sensibilidade à luz.',
  photosensitivityWarningInfoText: 'Algumas pessoas podem sentir desconforto com luzes coloridas. Não prossiga se isso não for seguro para você.',
  photosensitivityWarningLabelText: 'Saiba mais sobre fotossensibilidade',
  startScreenBeginCheckText: 'Iniciar verificação',
  goodFitCaptionText: 'Enquadramento adequado', goodFitAltText: 'Exemplo de rosto bem posicionado no oval',
  tooFarCaptionText: 'Aproxime-se um pouco', tooFarAltText: 'Exemplo de rosto distante demais da câmera',
  hintCenterFaceText: 'Centralize seu rosto',
  hintCenterFaceInstructionText: 'Mantenha o rosto dentro do contorno',
  hintFaceOffCenterText: 'Centralize seu rosto', hintMatchIndicatorText: 'Rosto alinhado',
  hintMoveFaceFrontOfCameraText: 'Olhe para frente',
  hintTooManyFacesText: 'Deixe apenas uma pessoa na câmera',
  hintFaceDetectedText: 'Excelente',
  hintCanNotIdentifyText: 'Centralize seu rosto',
  hintTooCloseText: 'Afaste-se um pouco', hintTooFarText: 'Aproxime-se um pouco',
  hintConnectingText: 'Conectando câmera…', hintVerifyingText: 'Verificando…', hintCheckCompleteText: 'Captura realizada',
  hintIlluminationTooBrightText: 'A luz está muito forte', hintIlluminationTooDarkText: 'Melhore a iluminação', hintIlluminationNormalText: 'Iluminação adequada',
  hintHoldFaceForFreshnessText: 'Não mova o rosto',
  cameraNotFoundHeadingText: 'Câmera não encontrada', cameraNotFoundMessageText: 'Permita o uso da câmera e tente novamente.', retryCameraPermissionsText: 'Tentar novamente',
  waitingCameraPermissionText: 'Aguardando permissão da câmera…', cancelLivenessCheckText: 'Cancelar', recordingIndicatorText: '',
  landscapeHeaderText: 'Mantenha o celular na vertical', landscapeMessageText: 'Gire o celular para a posição vertical e tente novamente.', portraitMessageText: 'Mantenha o celular na vertical durante toda a verificação.',
  tryAgainText: 'Tentar novamente', connectionTimeoutHeaderText: 'A conexão demorou demais', connectionTimeoutMessageText: 'Verifique sua internet e tente novamente.', timeoutHeaderText: 'Tempo esgotado', timeoutMessageText: 'A verificação demorou demais. Tente novamente.',
  faceDistanceHeaderText: 'Ajuste a posição do rosto', faceDistanceMessageText: 'Centralize seu rosto e tente novamente.', multipleFacesHeaderText: 'Mais de um rosto identificado', multipleFacesMessageText: 'Deixe apenas você na câmera e tente novamente.',
  clientHeaderText: 'Não foi possível usar a câmera', clientMessageText: 'Verifique as permissões e mantenha o celular na vertical.', serverHeaderText: 'Não foi possível concluir', serverMessageText: 'Vamos tentar novamente em alguns instantes.',
};

function AvisoFotossensibilidadeOculto() { return null; }

function mensagemHumana(valor: unknown) {
  const texto = valor instanceof Error ? valor.message : String(valor || '');
  const normalizado = texto.toLocaleLowerCase('pt-BR');
  if (normalizado.includes('ilumina') || normalizado.includes('escuro') || normalizado.includes('luz')) return 'A iluminação não está adequada. Procure um local mais iluminado e tente novamente.';
  if (normalizado.includes('câmera') || normalizado.includes('camera') || normalizado.includes('permiss')) return 'Não conseguimos acessar a câmera. Confira a permissão e tente novamente.';
  if (normalizado.includes('rosto') || normalizado.includes('face') || normalizado.includes('identidade')) return 'Não conseguimos confirmar seu rosto. Centralize-se no oval e tente novamente.';
  if (normalizado.includes('conex') || normalizado.includes('internet') || normalizado.includes('timeout')) return 'A conexão demorou mais que o esperado. Confira sua internet e tente novamente.';
  return 'Não foi possível concluir a verificação. Vamos tentar novamente.';
}

export default function PontoFacialLiveness({ identityPoolId }: { identityPoolId: string }) {
  const [inicioAtivo, setInicioAtivo] = useState<Inicio | null>(null);
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [etapa, setEtapa] = useState<EtapaFacialV2 | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [orientacao, setOrientacao] = useState('Centralize seu rosto');
  const [progresso, setProgresso] = useState(8);
  const [conclusao, setConclusao] = useState<Conclusao | null>(null);
  const detectorRef = useRef<HTMLDivElement>(null);

  const limpar = useCallback(() => {
    setInicioAtivo(null); setSessao(null); setEtapa(null); setMensagem('');
    setOrientacao('Centralize seu rosto'); setProgresso(8); setConclusao(null);
  }, []);

  const cancelar = useCallback(() => {
    limpar();
    window.dispatchEvent(new CustomEvent('avantalab:facial-cancelado'));
  }, [limpar]);

  const criarSessao = useCallback(async (inicio: Inicio) => {
    setInicioAtivo(inicio); setSessao(null); setConclusao(null); setEtapa('carregando');
    setMensagem('Preparando uma conexão segura com a câmera…'); setProgresso(12);
    try {
      const resposta = await fetch('/api/ponto/reconhecimento-facial/sessao', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${inicio.token}` },
        body: JSON.stringify({ empresaId: inicio.empresaId, tipo: inicio.tipo }),
      });
      const dados = await resposta.json();
      if (!resposta.ok || dados.erro) throw new Error(dados.mensagem || 'Não foi possível iniciar a verificação.');
      setSessao({ ...inicio, sessaoId: dados.sessaoId, regiao: dados.regiao });
      setMensagem(''); setProgresso(8); setEtapa('preparacao');
    } catch (erro) {
      setMensagem(mensagemHumana(erro)); setEtapa('erro');
    }
  }, []);

  useEffect(() => {
    if (identityPoolId) Amplify.configure({ Auth: { Cognito: { identityPoolId, allowGuestAccess: true } } });
    const iniciar = async (event: Event) => {
      const inicio = (event as CustomEvent<Inicio>).detail;
      if (!inicio?.empresaId || !inicio.token) return;
      setInicioAtivo(inicio);
      if (!identityPoolId) {
        setMensagem('O reconhecimento facial não está disponível neste ambiente.'); setEtapa('erro');
        return;
      }
      if (inicio.tipo === 'marcacao') {
        try {
          const habilitacao = await fetch(`/api/ponto/reconhecimento-facial/status?empresaId=${encodeURIComponent(inicio.empresaId)}`, { headers: { Authorization: `Bearer ${inicio.token}` } });
          const dadosHabilitacao = await habilitacao.json();
          if (habilitacao.ok && dadosHabilitacao?.ativo !== true) {
            limpar();
            window.dispatchEvent(new CustomEvent('avantalab:facial-concluido', { detail: { tipo: inicio.tipo, dispensado: true } }));
            return;
          }
        } catch {
          // A sessão abaixo mantém o comportamento seguro para versões antigas do PWA.
        }
      }
      await criarSessao(inicio);
    };
    window.addEventListener('avantalab:facial-iniciar', iniciar);
    return () => window.removeEventListener('avantalab:facial-iniciar', iniciar);
  }, [criarSessao, identityPoolId, limpar]);

  useEffect(() => {
    if (etapa !== 'captura') return;
    const intervalo = window.setInterval(() => setProgresso((atual) => Math.min(72, atual + 3)), 550);
    return () => window.clearInterval(intervalo);
  }, [etapa]);

  useEffect(() => {
    const pontoRoot = document.getElementById('ponto-root');
    if (!etapa || !pontoRoot) return;
    pontoRoot.setAttribute('inert', '');
    pontoRoot.setAttribute('aria-hidden', 'true');
    return () => {
      pontoRoot.removeAttribute('inert');
      pontoRoot.removeAttribute('aria-hidden');
    };
  }, [etapa]);

  useEffect(() => {
    if (etapa !== 'captura' || !detectorRef.current) return;
    const atualizarOrientacao = () => {
      const texto = detectorRef.current?.querySelector<HTMLElement>('.amplify-liveness-hint__text')?.innerText.trim();
      if (texto) setOrientacao(texto);
    };
    atualizarOrientacao();
    const observador = new MutationObserver(atualizarOrientacao);
    observador.observe(detectorRef.current, { childList: true, subtree: true, characterData: true });
    return () => observador.disconnect();
  }, [etapa, sessao]);

  const iniciarCaptura = () => {
    if (!sessao) return;
    setOrientacao('Centralize seu rosto'); setProgresso(14); setEtapa('captura');
  };

  const falharCaptura = (erro?: unknown) => {
    setSessao(null); setMensagem(mensagemHumana(erro)); setEtapa('erro');
  };

  const concluir = async () => {
    if (!sessao) return;
    const sessaoConcluida = sessao;
    setEtapa('processando'); setMensagem('Analisando a prova de vida…'); setProgresso(82);
    const proximaEtapa = window.setTimeout(() => { setMensagem('Conferindo sua identidade…'); setProgresso(92); }, 1000);
    try {
      const resposta = await fetch('/api/ponto/reconhecimento-facial/resultado', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessaoConcluida.token}` },
        body: JSON.stringify({ empresaId: sessaoConcluida.empresaId, sessaoId: sessaoConcluida.sessaoId }),
      });
      const dados = await resposta.json();
      if (!resposta.ok || !dados.aprovado) throw new Error(dados.mensagem || 'Identidade não confirmada.');
      setSessao(null); setMensagem(''); setProgresso(100);
      setConclusao({ tipo: sessaoConcluida.tipo, horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) });
      setEtapa('sucesso');
    } catch (erro) {
      setSessao(null); setMensagem(mensagemHumana(erro)); setEtapa('erro');
    } finally {
      window.clearTimeout(proximaEtapa);
    }
  };

  const tentarNovamente = () => { if (inicioAtivo) void criarSessao(inicioAtivo); };

  const continuar = () => {
    const tipo = conclusao?.tipo || inicioAtivo?.tipo;
    if (!tipo) return;
    limpar();
    window.dispatchEvent(new CustomEvent('avantalab:facial-concluido', { detail: { tipo } }));
  };

  if (!etapa || !inicioAtivo) return null;

  const detector = etapa === 'captura' && sessao ? <div ref={detectorRef} className="h-full w-full">
    <FaceLivenessDetector
      sessionId={sessao.sessaoId}
      region={sessao.regiao}
      disableStartScreen
      displayText={textosPtBr}
      components={{ PhotosensitiveWarning: AvisoFotossensibilidadeOculto }}
      onAnalysisComplete={concluir}
      onError={falharCaptura}
      onUserCancel={cancelar}
    />
  </div> : undefined;

  return <PontoFacialExperienceV2
    etapa={etapa}
    tipo={inicioAtivo.tipo}
    mensagem={mensagem}
    orientacao={orientacao}
    progresso={progresso}
    horario={conclusao?.horario}
    detector={detector}
    onIniciar={iniciarCaptura}
    onCancelar={cancelar}
    onTentarNovamente={tentarNovamente}
    onContinuar={continuar}
  />;
}
