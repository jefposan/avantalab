'use client';

import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import '@aws-amplify/ui-react/styles.css';

type Inicio = { empresaId: string; token: string; tipo: 'cadastro' | 'marcacao' };
type Sessao = Inicio & { sessaoId: string; regiao: string };

const textosPtBr = {
  photosensitivityWarningHeadingText: 'Aviso de fotossensibilidade',
  photosensitivityWarningBodyText: 'Esta verificação pode exibir luzes coloridas. Tenha cuidado se você tiver sensibilidade à luz.',
  photosensitivityWarningInfoText: 'Algumas pessoas podem sentir desconforto com luzes coloridas. Não prossiga se isso não for seguro para você.',
  photosensitivityWarningLabelText: 'Saiba mais sobre fotossensibilidade',
  startScreenBeginCheckText: 'Iniciar verificação',
  hintCenterFaceText: 'Centralize seu rosto',
  hintCenterFaceInstructionText: 'Mantenha o rosto dentro do contorno',
  hintMoveFaceFrontOfCameraText: 'Posicione o rosto em frente à câmera',
  hintTooManyFacesText: 'Deixe apenas uma pessoa na câmera',
  hintFaceDetectedText: 'Rosto identificado',
  hintCanNotIdentifyText: 'Não foi possível identificar seu rosto',
  hintTooCloseText: 'Afaste-se um pouco', hintTooFarText: 'Aproxime-se um pouco',
  hintConnectingText: 'Conectando câmera…', hintVerifyingText: 'Verificando…', hintCheckCompleteText: 'Verificação concluída',
  hintIlluminationTooBrightText: 'A luz está muito forte', hintIlluminationTooDarkText: 'O ambiente está escuro', hintIlluminationNormalText: 'Iluminação adequada',
  cameraNotFoundHeadingText: 'Câmera não encontrada', cameraNotFoundMessageText: 'Permita o uso da câmera e tente novamente.', retryCameraPermissionsText: 'Tentar novamente',
  waitingCameraPermissionText: 'Aguardando permissão da câmera…', cancelLivenessCheckText: 'Cancelar', recordingIndicatorText: 'Verificação em andamento',
  landscapeHeaderText: 'Mantenha o celular na vertical', landscapeMessageText: 'Esta verificação funciona somente em modo retrato. Gire o celular para a posição vertical e tente novamente.', portraitMessageText: 'Mantenha o celular na vertical durante toda a verificação.',
  tryAgainText: 'Tentar novamente', connectionTimeoutHeaderText: 'A conexão demorou demais', connectionTimeoutMessageText: 'Verifique sua internet e tente novamente.', timeoutHeaderText: 'Tempo esgotado', timeoutMessageText: 'A verificação demorou demais. Tente novamente.',
  faceDistanceHeaderText: 'Ajuste a posição do rosto', faceDistanceMessageText: 'Siga as orientações na tela e tente novamente.', multipleFacesHeaderText: 'Mais de um rosto identificado', multipleFacesMessageText: 'Deixe apenas você na câmera e tente novamente.',
  clientHeaderText: 'Não foi possível usar a câmera', clientMessageText: 'Verifique as permissões e mantenha o celular na vertical.', serverHeaderText: 'Não foi possível concluir a verificação', serverMessageText: 'Tente novamente em alguns instantes.',
};

export default function PontoFacialLiveness({ identityPoolId }: { identityPoolId: string }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    if (!identityPoolId) return;
    Amplify.configure({ Auth: { Cognito: { identityPoolId, allowGuestAccess: true } } });
    const iniciar = async (event: Event) => {
      const inicio = (event as CustomEvent<Inicio>).detail;
      if (!inicio?.empresaId || !inicio.token) return;
      setMensagem('Preparando a câmera…');
      try {
        const resposta = await fetch('/api/ponto/reconhecimento-facial/sessao', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${inicio.token}` },
          body: JSON.stringify({ empresaId: inicio.empresaId, tipo: inicio.tipo }),
        });
        const dados = await resposta.json();
        if (!resposta.ok || dados.erro) throw new Error(dados.mensagem || 'Não foi possível iniciar a verificação.');
        setSessao({ ...inicio, sessaoId: dados.sessaoId, regiao: dados.regiao }); setMensagem('');
      } catch (erro) {
        const detalhe = erro instanceof Error ? erro.message : 'Não foi possível iniciar a verificação.';
        setMensagem(detalhe); window.dispatchEvent(new CustomEvent('avantalab:facial-erro', { detail: { mensagem: detalhe } }));
      }
    };
    window.addEventListener('avantalab:facial-iniciar', iniciar);
    return () => window.removeEventListener('avantalab:facial-iniciar', iniciar);
  }, [identityPoolId]);

  const concluir = async () => {
    if (!sessao) return;
    const sessaoConcluida = sessao;
    // A captura terminou. Desmontamos imediatamente o detector para que a
    // orientação do aparelho não seja mais avaliada durante a confirmação no
    // servidor — o funcionário pode guardar o celular nesta etapa.
    setSessao(null);
    setMensagem('Analisando a prova de vida…');
    const proximaEtapa = window.setTimeout(() => setMensagem('Conferindo identidade…'), 1200);
    try {
      const resposta = await fetch('/api/ponto/reconhecimento-facial/resultado', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessao.token}` },
        body: JSON.stringify({ empresaId: sessaoConcluida.empresaId, sessaoId: sessaoConcluida.sessaoId }),
      });
      const dados = await resposta.json();
      if (!resposta.ok || !dados.aprovado) throw new Error(dados.mensagem || 'Identidade não confirmada.');
      window.dispatchEvent(new CustomEvent('avantalab:facial-concluido', { detail: { tipo: sessaoConcluida.tipo } })); setMensagem('');
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : 'Não foi possível confirmar a identidade.';
      setMensagem(detalhe); window.dispatchEvent(new CustomEvent('avantalab:facial-erro', { detail: { mensagem: detalhe } }));
    } finally {
      window.clearTimeout(proximaEtapa);
    }
  };

  if (!sessao && !mensagem) return null;
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Verificação facial">
    <div className="avanta-facial mx-auto w-full max-w-xl rounded-3xl bg-white p-4 shadow-2xl" style={{ ['--amplify-colors-brand-primary-80' as string]: '#007f99', ['--amplify-colors-brand-primary-90' as string]: '#006b83', ['--amplify-colors-brand-primary-100' as string]: '#00566a' }}>
      <h2 className="text-base font-black text-slate-900">Confirmação facial</h2>
      <p className="mt-1 text-sm font-semibold text-slate-600" role="status">{mensagem || 'Siga as instruções na tela. A câmera é usada somente nesta confirmação.'}</p>
      {sessao && <FaceLivenessDetector sessionId={sessao.sessaoId} region={sessao.regiao} displayText={textosPtBr} onAnalysisComplete={concluir} onError={() => setMensagem('A câmera não conseguiu concluir a verificação. Mantenha o celular na vertical e tente novamente.')} onUserCancel={() => { setSessao(null); setMensagem(''); window.dispatchEvent(new CustomEvent('avantalab:facial-cancelado')); }} />}
      {mensagem && <button type="button" className="mt-4 min-h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-black text-white" onClick={() => { setSessao(null); setMensagem(''); window.dispatchEvent(new CustomEvent('avantalab:facial-cancelado')); }}>Voltar</button>}
    </div>
  </div>;
}
