'use client';

import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './voice-command-lab.module.css';

type Props = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  configuredLabOrigin: string;
  allowLocalLab: boolean;
};

type SalesAccount = { id: string; nome?: string; empresa_nome?: string; papel?: string };
type LabRequest = {
  type: 'AVANTALAB_VOICE_LAB_REQUEST_V1';
  requestId: string;
  operation: 'transcribe' | 'process' | 'execute' | 'log';
  payload?: Record<string, unknown>;
  audio?: Blob;
  extension?: string;
};

const ACTIVE_ACCOUNT_KEY = 'avantalab.vendas_mobile.conta_ativa.v1';
const READY_MESSAGE = 'AVANTALAB_VOICE_LAB_READY_V1';
const CONTEXT_MESSAGE = 'AVANTALAB_VOICE_LAB_CONTEXT_V1';
const RESPONSE_MESSAGE = 'AVANTALAB_VOICE_LAB_RESPONSE_V1';
const REQUEST_TIMEOUT_MS = 45_000;
const REQUEST_ID = /^[A-Za-z0-9:_-]{8,120}$/;

function normalizeOrigin(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
  } catch {
    return '';
  }
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function VoiceCommandLabBridge({
  supabaseUrl,
  supabaseAnonKey,
  configuredLabOrigin,
  allowLocalLab,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeRequestsRef = useRef(new Set<string>());
  const [labOrigin, setLabOrigin] = useState(() => normalizeOrigin(configuredLabOrigin));
  const [iframeReady, setIframeReady] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [account, setAccount] = useState<SalesAccount | null>(null);
  const [bootError, setBootError] = useState('');
  const db = useMemo(() => createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'avantalab-vendas-mobile-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }), [supabaseAnonKey, supabaseUrl]);

  useEffect(() => {
    if (labOrigin || !allowLocalLab) return;
    const frame = window.requestAnimationFrame(() => {
      setLabOrigin(normalizeOrigin(`${window.location.protocol}//${window.location.hostname}:3021`));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [allowLocalLab, labOrigin]);

  useEffect(() => {
    if (!labOrigin || iframeReady) return;
    const timeout = window.setTimeout(() => {
      setConnectionError('O servidor externo do laboratório não respondeu. Execute npm run dev:solicitacao-voz e tente novamente.');
    }, 6_000);
    return () => window.clearTimeout(timeout);
  }, [iframeReady, labOrigin]);

  useEffect(() => {
    let active = true;
    async function boot() {
      if (!supabaseUrl || !supabaseAnonKey) throw new Error('O Avanta Vendas não está configurado neste ambiente.');
      const { data: sessionData } = await db.auth.getSession();
      if (!sessionData.session) throw new Error('Faça login no Avanta Vendas antes de abrir este laboratório.');
      const { data, error } = await db.rpc('minhas_contas_vendas_mobile_rpc');
      if (error) throw error;
      const accounts = (Array.isArray(data) ? data : []) as SalesAccount[];
      if (!accounts.length) throw new Error('Nenhuma conta ativa do Avanta Vendas foi encontrada.');
      const savedAccountId = localStorage.getItem(ACTIVE_ACCOUNT_KEY) || '';
      const selected = accounts.find((item) => item.id === savedAccountId) || accounts[0];
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, selected.id);
      if (active) setAccount(selected);
    }
    boot().catch((error) => {
      if (active) setBootError(error instanceof Error ? error.message : 'Não foi possível preparar o laboratório.');
    });
    return () => { active = false; };
  }, [db, supabaseAnonKey, supabaseUrl]);

  const postContext = useCallback(() => {
    const destination = iframeRef.current?.contentWindow;
    if (!destination || !labOrigin || !iframeReady) return;
    destination.postMessage({
      type: CONTEXT_MESSAGE,
      ready: Boolean(account) && !bootError,
      account: account ? {
        id: account.id,
        label: account.empresa_nome || account.nome || 'Conta ativa',
      } : null,
      error: bootError || (!account ? 'Preparando sua conta do Avanta Vendas...' : ''),
      assetBase: window.location.origin,
    }, labOrigin);
  }, [account, bootError, iframeReady, labOrigin]);

  useEffect(() => { postContext(); }, [postContext]);

  useEffect(() => {
    if (!labOrigin) return;
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== labOrigin || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === READY_MESSAGE) {
        setConnectionError('');
        setIframeReady(true);
        return;
      }
      const message = event.data as LabRequest;
      if (!message || message.type !== 'AVANTALAB_VOICE_LAB_REQUEST_V1'
        || !REQUEST_ID.test(String(message.requestId || ''))
        || !['transcribe', 'process', 'execute', 'log'].includes(message.operation)
        || activeRequestsRef.current.has(message.requestId)) return;

      const destination = iframeRef.current?.contentWindow;
      const respond = (ok: boolean, status: number, data: unknown) => destination?.postMessage({
        type: RESPONSE_MESSAGE,
        requestId: message.requestId,
        ok,
        status,
        data,
      }, labOrigin);

      activeRequestsRef.current.add(message.requestId);
      try {
        if (!account) throw new Error(bootError || 'A conta ativa ainda não está disponível.');
        const { data } = await db.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Sua sessão do Avanta Vendas expirou.');
        const endpoint = `/api/teste/solicitacao-voz/${message.operation === 'transcribe' ? 'transcrever'
          : message.operation === 'process' ? 'processar'
            : message.operation === 'execute' ? 'executar' : 'log'}`;
        let init: RequestInit;
        if (message.operation === 'transcribe') {
          if (!(message.audio instanceof Blob) || !message.audio.size || message.audio.size > 10 * 1024 * 1024) {
            throw new Error('O áudio recebido não é válido ou ficou muito longo.');
          }
          const form = new FormData();
          const extension = message.extension === 'mp4' ? 'mp4' : 'webm';
          form.append('accountId', account.id);
          form.append('audio', message.audio, `solicitacao-voz.${extension}`);
          init = {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'X-Avanta-Vendas-Account': account.id },
            body: form,
          };
        } else {
          init = {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...(message.payload || {}), accountId: account.id }),
          };
        }
        const response = await fetchWithTimeout(endpoint, init);
        const result = await response.json().catch(() => ({ message: 'O servidor retornou uma resposta inválida.' }));
        respond(response.ok, response.status, result);
      } catch (error) {
        const messageText = error instanceof DOMException && error.name === 'AbortError'
          ? 'A solicitação demorou mais que o esperado. Tente novamente.'
          : error instanceof Error ? error.message : 'Não foi possível concluir a solicitação.';
        respond(false, 500, { message: messageText });
      } finally {
        activeRequestsRef.current.delete(message.requestId);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [account, bootError, db, labOrigin]);

  if (!labOrigin) {
    return (
      <main className={styles.unavailable}>
        <h1>Laboratório de voz não conectado</h1>
        <p>Configure a origem externa do laboratório antes de usar esta rota.</p>
      </main>
    );
  }

  return (
    <main className={styles.bridge}>
      <iframe
        ref={iframeRef}
        className={styles.frame}
        src={`${labOrigin}/?embed=avantalab`}
        title="Laboratório de solicitação por voz"
        allow="microphone"
        sandbox="allow-scripts allow-same-origin"
      />
      {!iframeReady && (
        <div className={styles.loading} role={connectionError ? 'alert' : 'status'} aria-live="polite">
          {connectionError ? (
            <>
              <strong>Laboratório externo indisponível</strong>
              <p>{connectionError}</p>
              <button type="button" onClick={() => window.location.reload()}>Tentar novamente</button>
            </>
          ) : (
            <>
              <span />
              <p>Conectando ao laboratório de voz...</p>
            </>
          )}
        </div>
      )}
    </main>
  );
}
