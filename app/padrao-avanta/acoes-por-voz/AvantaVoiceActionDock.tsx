'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type {
  AvantaVoiceAccount,
  AvantaVoiceActionOperation,
  AvantaVoiceNotificationOptions,
} from './contract';
import { AVANTA_VOICE_ACTIONS_STANDARD_VERSION } from './contract';

const SCRIPT_SRC = '/recursos/padrao-avanta/avanta-voice-actions.js';
const SCRIPT_URL = `${SCRIPT_SRC}?v=${AVANTA_VOICE_ACTIONS_STANDARD_VERSION}`;

let carregamentoModulo: Promise<NonNullable<Window['AvantaVoiceActions']>> | null = null;

function carregarModulo() {
  if (window.AvantaVoiceActions?.open && window.AvantaVoiceActions.version === AVANTA_VOICE_ACTIONS_STANDARD_VERSION) {
    return Promise.resolve(window.AvantaVoiceActions);
  }
  if (carregamentoModulo) return carregamentoModulo;
  carregamentoModulo = new Promise<NonNullable<Window['AvantaVoiceActions']>>((resolve, reject) => {
    document.querySelectorAll<HTMLScriptElement>(`script[src^="${SCRIPT_SRC}"]`).forEach((item) => {
      if (!item.src.endsWith(`?v=${AVANTA_VOICE_ACTIONS_STANDARD_VERSION}`)) item.remove();
    });
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    const script = existente ?? document.createElement('script');
    const concluir = () => window.AvantaVoiceActions?.open && window.AvantaVoiceActions.version === AVANTA_VOICE_ACTIONS_STANDARD_VERSION
      ? resolve(window.AvantaVoiceActions)
      : reject(new Error('O módulo de voz não iniciou corretamente.'));
    script.addEventListener('load', concluir, { once: true });
    script.addEventListener('error', () => reject(new Error('Não foi possível carregar a solicitação por voz.')), { once: true });
    if (!existente) {
      script.src = SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }
  }).catch((error) => {
    carregamentoModulo = null;
    throw error;
  });
  return carregamentoModulo;
}

type Props = {
  id: string;
  account: AvantaVoiceAccount;
  storageNamespace: string;
  label?: string;
  helpTitle?: string;
  helpText: string;
  request: (
    operation: AvantaVoiceActionOperation,
    payload: Record<string, unknown> | FormData,
  ) => Promise<unknown>;
  afterExecute?: (result: unknown) => void | Promise<void>;
  onPendingChange?: () => void;
  shareReceipt?: (recordId: string, intent: string) => void | Promise<void>;
};

type Aviso = { mensagem: string; opcoes?: AvantaVoiceNotificationOptions };

export default function AvantaVoiceActionDock({
  id,
  account,
  storageNamespace,
  label = 'Solicitação por Voz',
  helpTitle = 'Solicitação por Voz',
  helpText,
  request,
  afterExecute,
  onPendingChange,
  shareReceipt,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const helpButtonRef = useRef<HTMLButtonElement | null>(null);
  const toastTimerRef = useRef<number>(0);
  const helpId = `${id}-${useId().replaceAll(':', '')}-help`;
  const [helpOpen, setHelpOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const fecharAjuda = useCallback((restaurarFoco = false) => {
    setHelpOpen(false);
    if (restaurarFoco) requestAnimationFrame(() => helpButtonRef.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!helpOpen) return;
    const fecharFora = (event: PointerEvent) => {
      const mount = mountRef.current;
      if (mount && event.target instanceof Node && !mount.contains(event.target)) fecharAjuda();
    };
    const fecharEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') fecharAjuda(true);
    };
    document.addEventListener('pointerdown', fecharFora, true);
    document.addEventListener('keydown', fecharEscape);
    return () => {
      document.removeEventListener('pointerdown', fecharFora, true);
      document.removeEventListener('keydown', fecharEscape);
    };
  }, [fecharAjuda, helpOpen]);

  useEffect(() => () => {
    window.clearTimeout(toastTimerRef.current);
    if (mountRef.current?.querySelector('avanta-voice-command')) window.AvantaVoiceActions?.close();
  }, []);

  const notificar = useCallback((mensagem: string, opcoes?: AvantaVoiceNotificationOptions) => {
    window.clearTimeout(toastTimerRef.current);
    setAviso({ mensagem, opcoes });
    toastTimerRef.current = window.setTimeout(() => setAviso(null), opcoes?.duracao ?? 4600);
  }, []);

  async function abrir() {
    const mount = mountRef.current;
    if (!mount || loading) return;
    setLoading(true);
    fecharAjuda();
    try {
      const modulo = await carregarModulo();
      modulo.open({
        mount,
        mountId: id,
        autoStart: true,
        account,
        storageNamespace,
        request,
        notify: notificar,
        afterExecute,
        onPendingChange,
        shareReceipt,
      });
    } catch (error) {
      notificar(error instanceof Error ? error.message : 'Não foi possível iniciar a solicitação por voz.', {
        tipo: 'erro',
        titulo: 'Solicitação por Voz',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div ref={mountRef} id={id} className="mobile-voice-command-slot">
        <div className="mobile-voice-command-body">
          <button type="button" className="mobile-voice-command-trigger" disabled={loading} onClick={() => void abrir()} aria-label="Iniciar solicitação por voz">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15.4a3.9 3.9 0 0 0 3.9-3.9V6.4a3.9 3.9 0 1 0-7.8 0v5.1a3.9 3.9 0 0 0 3.9 3.9Z" />
              <path d="M5.7 10.9v.7a6.3 6.3 0 0 0 12.6 0v-.7M12 17.9V21M9.2 21h5.6" />
            </svg>
          </button>
          <span className="mobile-voice-command-label">{label}</span>
        </div>
        <button ref={helpButtonRef} type="button" className="mobile-voice-command-help" onClick={() => setHelpOpen((open) => !open)} aria-label={helpOpen ? `Fechar ajuda de ${label}` : `Como usar ${label}`} aria-expanded={helpOpen} aria-controls={helpId}>
          <span className="mobile-voice-command-help-symbol" aria-hidden="true"><i>i</i></span>
        </button>
        <aside id={helpId} className="mobile-voice-command-help-popover" role="status" hidden={!helpOpen}>
          <b>{helpTitle}</b>
          <p>{helpText}</p>
        </aside>
      </div>
      {aviso && (
        <section className="avanta-voice-toast" role="status" aria-live="polite">
          <div>{aviso.opcoes?.titulo && <b>{aviso.opcoes.titulo}</b>}<span>{aviso.mensagem}</span></div>
          {aviso.opcoes?.acao && <button type="button" onClick={() => void aviso.opcoes?.acao?.executar()}>{aviso.opcoes.acao.rotulo}</button>}
          <i style={{ animationDuration: `${aviso.opcoes?.duracao ?? 4600}ms` }} aria-hidden="true" />
        </section>
      )}
    </>
  );
}
