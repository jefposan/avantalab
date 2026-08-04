'use client';

import { useEffect, useRef, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import AvantaCard from './AvantaCard';
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

function AvisoFotossensibilidadeOculto() {
  return null;
}

export default function PontoFacialLiveness({ identityPoolId }: { identityPoolId: string }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [mensagem, setMensagem] = useState('');
  const detectorRef = useRef<HTMLDivElement>(null);
  const cancelarAreaRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const emCadastro = sessao?.tipo === 'cadastro';
  const cancelar = () => { setSessao(null); setMensagem(''); window.dispatchEvent(new CustomEvent('avantalab:facial-cancelado')); };

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

  useEffect(() => {
    if (!sessao || !detectorRef.current) return;
    const organizarAcoes = () => {
      const iniciar = detectorRef.current?.querySelector<HTMLButtonElement>('.amplify-button--primary');
      const cancelarBotao = cancelarRef.current;
      if (!cancelarBotao) return;
      if (iniciar?.parentElement) {
        iniciar.parentElement.classList.add('avanta-facial-acoes');
        if (!iniciar.parentElement.contains(cancelarBotao)) iniciar.parentElement.appendChild(cancelarBotao);
        return;
      }
      // Ao iniciar a leitura, o componente da AWS substitui a tela inicial e
      // desmonta seu botão primário. Recolocamos o cancelar na área fixa do
      // card para que a pessoa nunca fique sem saída durante a captura.
      if (cancelarAreaRef.current && !cancelarAreaRef.current.contains(cancelarBotao)) {
        cancelarAreaRef.current.appendChild(cancelarBotao);
      }
    };
    organizarAcoes();
    const observador = new MutationObserver(organizarAcoes);
    observador.observe(detectorRef.current, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, [sessao]);

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
    <style>{`.avanta-facial .amplify-button--primary{min-height:40px!important;height:40px!important;width:220px!important;border-radius:10px!important;background:#1687D9!important;border-color:#1687D9!important;color:#fff!important;font-size:14px!important;font-weight:800!important;box-shadow:0 6px 14px rgba(22,135,217,.22)!important}.avanta-facial-acoes{display:flex!important;justify-content:center!important;gap:8px!important;margin-top:0!important}.avanta-facial-acoes .amplify-button--primary,.avanta-facial-acoes .avanta-facial-cancelar{width:auto!important;min-width:0!important;flex:1 1 0!important;white-space:nowrap}.avanta-facial-acoes .avanta-facial-cancelar{order:-1}.avanta-facial .amplify-button--primary:active{transform:scale(.98)}.avanta-facial .amplify-button--primary:focus-visible{outline:3px solid rgba(22,135,217,.35)!important;outline-offset:3px}.avanta-facial .amplify-liveness-start-screen{padding-bottom:0!important}.avanta-facial .amplify-liveness-figures{margin-bottom:0!important}.avanta-facial-captura{display:flex!important;min-height:0!important;flex:1 1 0%!important}.avanta-facial-captura>div:last-child{display:flex!important;min-height:0!important;flex:1 1 0%!important;flex-direction:column!important}`}</style>
    <AvantaCard title={sessao ? 'Verificação em andamento' : emCadastro ? 'Cadastro facial' : 'Confirmação facial'} corPrimaria="#007f99" hideDragHandle hideMenu className="avanta-facial mx-auto max-w-xl text-slate-900" bodyClassName="!min-h-[calc(100dvh-130px)] !p-0 !overflow-visible" style={temaFacial}>
      {!sessao && <div className="border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600 text-white">1</span><span className="text-cyan-800">Preparar</span>
          <span className="h-px flex-1 bg-cyan-200" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500">2</span><span className="text-slate-500">Confirmar</span>
        </div>
      </div>}
      <div className={sessao ? 'flex min-h-[calc(100dvh-195px)] flex-col gap-2 p-3' : 'p-4 sm:p-5'}>
        {!sessao && <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs font-semibold leading-snug text-slate-700" role="status">
          {mensagem || 'Posicione o rosto inteiro no contorno, com boa luz. Siga as orientações na tela e fique imóvel quando solicitado.'}
        </div>}
        {sessao && <><AvantaCard title="Captura facial" corPrimaria="#007f99" hideDragHandle hideMenu className="avanta-facial-captura" bodyClassName="!flex !min-h-0 !flex-1 !flex-col !overflow-hidden !p-0" plato={<span className="rounded-full bg-cyan-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-800">Ponto seguro</span>}><div ref={detectorRef} className="avanta-facial-leitura relative z-10 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white pt-2 shadow-sm"><FaceLivenessDetector sessionId={sessao.sessaoId} region={sessao.regiao} displayText={textosPtBr} components={{ PhotosensitiveWarning: AvisoFotossensibilidadeOculto }} onAnalysisComplete={concluir} onError={() => setMensagem('A câmera não conseguiu concluir a verificação. Mantenha o celular na vertical e tente novamente.')} onUserCancel={cancelar} /></div></AvantaCard><div ref={cancelarAreaRef} className="flex min-h-10 justify-center"><button ref={cancelarRef} type="button" className="avanta-facial-cancelar h-10 min-h-10 w-[220px] rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-black text-slate-600 shadow-sm transition active:scale-[0.98] hover:bg-slate-50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#1687D9]" onClick={cancelar}>Cancelar</button></div></>}
        {mensagem && <button type="button" className="mt-4 min-h-12 w-full rounded-xl bg-slate-900 px-4 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition active:scale-[0.99]" onClick={cancelar}>Voltar ao ponto</button>}
      </div>
    </AvantaCard>
  </div>;
}
