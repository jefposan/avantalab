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
  goodFitCaptionText: 'Enquadramento adequado', goodFitAltText: 'Exemplo de rosto bem posicionado no oval',
  tooFarCaptionText: 'Aproxime-se um pouco', tooFarAltText: 'Exemplo de rosto distante demais da câmera',
  hintCenterFaceText: 'Centralize seu rosto',
  hintCenterFaceInstructionText: 'Mantenha o rosto dentro do contorno',
  hintFaceOffCenterText: 'Centralize melhor o rosto', hintMatchIndicatorText: 'Rosto alinhado',
  hintMoveFaceFrontOfCameraText: 'Posicione o rosto em frente à câmera',
  hintTooManyFacesText: 'Deixe apenas uma pessoa na câmera',
  hintFaceDetectedText: 'Rosto identificado',
  hintCanNotIdentifyText: 'Não foi possível identificar seu rosto',
  hintTooCloseText: 'Afaste-se um pouco', hintTooFarText: 'Aproxime-se um pouco',
  hintConnectingText: 'Conectando câmera…', hintVerifyingText: 'Verificando…', hintCheckCompleteText: 'Verificação concluída',
  hintIlluminationTooBrightText: 'A luz está muito forte', hintIlluminationTooDarkText: 'O ambiente está escuro', hintIlluminationNormalText: 'Iluminação adequada',
  hintHoldFaceForFreshnessText: 'Fique imóvel por alguns instantes',
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
  const emCadastro = sessao?.tipo === 'cadastro';

  useEffect(() => {
    if (!identityPoolId) return;
    Amplify.configure({ Auth: { Cognito: { identityPoolId, allowGuestAccess: true } } });
    const iniciar = async (event: Event) => {
      const inicio = (event as CustomEvent<Inicio>).detail;
      if (!inicio?.empresaId || !inicio.token) return;
      // Compatibilidade com versões antigas do PWA: elas ainda disparavam este
      // evento para toda a empresa em preparação. Antes de abrir a câmera,
      // confirmamos a habilitação individual. Se não houver facial ativo, a
      // marcação comum continua sem mostrar aviso nem erro.
      if (inicio.tipo === 'marcacao') {
        try {
          const habilitacao = await fetch(`/api/ponto/reconhecimento-facial/status?empresaId=${encodeURIComponent(inicio.empresaId)}`, {
            headers: { Authorization: `Bearer ${inicio.token}` },
          });
          const dadosHabilitacao = await habilitacao.json();
          if (habilitacao.ok && dadosHabilitacao?.ativo !== true) {
            window.dispatchEvent(new CustomEvent('avantalab:facial-concluido', { detail: { tipo: inicio.tipo, dispensado: true } }));
            return;
          }
        } catch {
          // A versão atual não envia a marcação comum para esta etapa. Em uma
          // versão antiga, mantemos a resposta segura da sessão abaixo.
        }
      }
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
  const temaFacial = {
    ['--amplify-colors-brand-primary-10' as string]: '#e6f7fb',
    ['--amplify-colors-brand-primary-20' as string]: '#c7eef6',
    ['--amplify-colors-brand-primary-60' as string]: '#00a6c8',
    ['--amplify-colors-brand-primary-80' as string]: '#007f99',
    ['--amplify-colors-brand-primary-90' as string]: '#006b83',
    ['--amplify-colors-brand-primary-100' as string]: '#003e73',
    ['--amplify-colors-font-primary' as string]: '#0f172a',
    ['--amplify-colors-font-secondary' as string]: '#475569',
    ['--amplify-colors-border-primary' as string]: '#cbd5e1',
    ['--amplify-components-liveness-camera-module-background-color' as string]: '#f8fafc',
  };
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-[radial-gradient(circle_at_top,#075985_0%,#003e73_42%,#020617_100%)] px-3 py-5 sm:p-8" role="dialog" aria-modal="true" aria-label="Verificação facial">
    <div className="avanta-facial mx-auto w-full max-w-xl overflow-hidden rounded-[28px] bg-slate-50 shadow-2xl ring-1 ring-white/20" style={temaFacial}>
      <header className="bg-gradient-to-br from-[#003e73] via-[#075985] to-[#00a6c8] px-5 py-5 text-white">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" strokeLinecap="round"/><path d="M8.5 11.5c.8 1 1.8 1.5 3.5 1.5s2.7-.5 3.5-1.5M9 8.5h.01M15 8.5h.01" strokeLinecap="round"/></svg>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">AvantaLab · Ponto seguro</p>
            <h2 className="mt-1 text-xl font-black leading-tight">{emCadastro ? 'Cadastrar reconhecimento facial' : 'Confirmação de identidade'}</h2>
            <p className="mt-1 text-xs font-semibold text-cyan-50">Sua câmera é usada somente nesta verificação.</p>
          </div>
        </div>
      </header>
      <div className="border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600 text-white">1</span><span className="text-cyan-800">Preparar</span>
          <span className="h-px flex-1 bg-cyan-200" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500">2</span><span className="text-slate-500">Confirmar</span>
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-700" role="status">
          {mensagem || 'Posicione o rosto inteiro no contorno, com boa luz. Siga as orientações na tela e fique imóvel quando solicitado.'}
        </div>
        {sessao && <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><FaceLivenessDetector sessionId={sessao.sessaoId} region={sessao.regiao} displayText={textosPtBr} onAnalysisComplete={concluir} onError={() => setMensagem('A câmera não conseguiu concluir a verificação. Mantenha o celular na vertical e tente novamente.')} onUserCancel={() => { setSessao(null); setMensagem(''); window.dispatchEvent(new CustomEvent('avantalab:facial-cancelado')); }} /></div>}
        {mensagem && <button type="button" className="mt-4 min-h-12 w-full rounded-xl bg-slate-900 px-4 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition active:scale-[0.99]" onClick={() => { setSessao(null); setMensagem(''); window.dispatchEvent(new CustomEvent('avantalab:facial-cancelado')); }}>Voltar ao ponto</button>}
      </div>
    </div>
  </div>;
}
