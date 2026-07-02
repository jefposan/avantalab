'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './ava-chat.module.css';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  time: string;
};

type CompanyAccess = {
  empresa_id: string;
  nome: string | null;
};

const MONTHS = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
] as const;

const NORMALIZED_MONTHS = MONTHS.map((month) => (
  month.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
));

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

const SUGGESTIONS = [
  { icon: 'doc', label: 'Por onde inicio o uso do sistema?', color: '#22c55e', background: 'rgba(34,197,94,.16)' },
  { icon: 'chart', label: 'Analise meus resultados.', color: '#f59e0b', background: 'rgba(245,158,11,.16)' },
  { icon: 'wallet', label: 'Como reduzir gastos sem afetar o essencial?', color: '#3b82f6', background: 'rgba(59,130,246,.16)' },
  { icon: 'plus', label: 'Como montar uma reserva de emergência?', color: '#ef4444', background: 'rgba(239,68,68,.16)' },
] as const;

const LAST_PROFILE_KEY = 'avantalab_mobile_ultimo_perfil_id';
const CHAT_STORAGE_PREFIX = 'avantalab_ava_chat_session';

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function currentTime() {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function money(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizedMonth(value: string | null) {
  if (!value) return new Date().getMonth();
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const index = NORMALIZED_MONTHS.indexOf(normalized);
  return index >= 0 ? index : new Date().getMonth();
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || '';
}

function SuggestionIcon({ type, color }: { type: string; color: string }) {
  if (type === 'chart') {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 14l3-3 3 3 5-6" /></svg>;
  }
  if (type === 'plus') {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>;
  }
  if (type === 'wallet') {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h18V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5ZM3 7.5 5 4h14l2 3.5M16 13.5h2" /></svg>;
  }
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6M9 17h6M9 9h2M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /></svg>;
}

function HomeIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9Z" /><path d="M9 21v-7h6v7" /></svg>;
}

function BackIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" /></svg>;
}

function MicIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></svg>;
}

function SendIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24"><path fill="currentColor" d="m12 4-7.5 7.5 1.4 1.4L11 8.8V20h2V8.8l5.1 5.1 1.4-1.4Z" /></svg>;
}

async function buildFinancialContext(db: SupabaseClient, companyId: string, companyName: string, year: number, monthIndex: number) {
  const month = MONTHS[monthIndex];
  const [expensesResult, revenueResult, entriesResult] = await Promise.all([
    db.from('lancamentos').select('dia, despesa_nome, valor, status').eq('empresa_id', companyId).eq('ano', year).eq('mes', month),
    db.from('faturamentos').select('valor').eq('empresa_id', companyId).eq('ano', year).eq('mes', month).maybeSingle(),
    db.from('faturamentos_entradas').select('valor').eq('empresa_id', companyId).eq('ano', year).eq('mes', month),
  ]);

  if (expensesResult.error) throw expensesResult.error;
  if (revenueResult.error) throw revenueResult.error;
  if (entriesResult.error) throw entriesResult.error;

  const now = new Date();
  const expenses = (expensesResult.data || []).filter((item) => item.status !== 'cancelada');
  const realizedExpenses = expenses.filter((item) => {
    const itemDate = new Date(year, monthIndex, Number(item.dia || 1), 23, 59, 59);
    return itemDate <= now;
  });
  const totalExpenses = realizedExpenses.reduce((total, item) => total + Number(item.valor || 0), 0);
  const entries = entriesResult.data || [];
  const totalRevenue = revenueResult.data
    ? Number(revenueResult.data.valor || 0)
    : entries.reduce((total, item) => total + Number(item.valor || 0), 0);
  const byType = new Map<string, number>();

  realizedExpenses.forEach((item) => {
    const name = String(item.despesa_nome || 'Sem categoria');
    byType.set(name, (byType.get(name) || 0) + Number(item.valor || 0));
  });

  const mainExpenses = Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => `  - ${name}: R$ ${money(value)}`);

  return [
    `Empresa: ${companyName}`,
    `Periodo: ${MONTH_LABELS[monthIndex]} / ${year}`,
    `Receita total: R$ ${money(totalRevenue)}`,
    `Total de despesas: R$ ${money(totalExpenses)}`,
    `Resultado: R$ ${money(totalRevenue - totalExpenses)}`,
    `Lancamentos no mes: ${expenses.length}`,
    mainExpenses.length ? `Despesas por tipo:\n${mainExpenses.join('\n')}` : '',
  ].filter(Boolean).join('\n');
}

export default function AvaChatClient() {
  const db = useMemo(() => supabase, []);
  const [darkMode] = useState(() => typeof window !== 'undefined' && localStorage.getItem('avantalab_mobile_dark') === '1');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [ready, setReady] = useState(false);
  const [context, setContext] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [storageKey, setStorageKey] = useState('');
  const shellRef = useRef<HTMLElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sentMessage = messages.some((message) => message.role === 'user');

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const shell = shellRef.current;
    if (!shell) return;

    const previous = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlOverscroll: html.style.overscrollBehavior,
      htmlBackground: html.style.background,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyInset: body.style.inset,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyBackground: body.style.background,
    };
    let viewportFrame = 0;
    let messageScrollFrame = 0;
    const chatBackground = darkMode ? '#0b1220' : '#f4f8fc';

    html.style.height = '100%';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    html.style.background = chatBackground;
    body.style.position = 'fixed';
    body.style.inset = '0';
    body.style.width = '100%';
    body.style.height = '100%';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.background = chatBackground;

    const syncHeight = () => {
      const messages = messagesRef.current;
      const keepLastMessageVisible = Boolean(messages && (
        messages.scrollHeight - messages.scrollTop - messages.clientHeight < 96
      ));

      cancelAnimationFrame(viewportFrame);
      viewportFrame = requestAnimationFrame(() => {
        const visualHeight = window.visualViewport?.height;
        const height = visualHeight && visualHeight > 0 ? visualHeight : window.innerHeight;
        shell.style.setProperty('--ava-chat-height', `${Math.round(height)}px`);

        if (keepLastMessageVisible && messages) {
          cancelAnimationFrame(messageScrollFrame);
          messageScrollFrame = requestAnimationFrame(() => {
            messages.scrollTop = messages.scrollHeight;
          });
        }
      });
    };

    syncHeight();
    window.visualViewport?.addEventListener('resize', syncHeight);
    window.visualViewport?.addEventListener('scroll', syncHeight);
    window.addEventListener('resize', syncHeight);

    return () => {
      cancelAnimationFrame(viewportFrame);
      cancelAnimationFrame(messageScrollFrame);
      window.visualViewport?.removeEventListener('resize', syncHeight);
      window.visualViewport?.removeEventListener('scroll', syncHeight);
      window.removeEventListener('resize', syncHeight);
      shell.style.removeProperty('--ava-chat-height');
      html.style.overflow = previous.htmlOverflow;
      html.style.height = previous.htmlHeight;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      html.style.background = previous.htmlBackground;
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      body.style.position = previous.bodyPosition;
      body.style.inset = previous.bodyInset;
      body.style.width = previous.bodyWidth;
      body.style.height = previous.bodyHeight;
      body.style.background = previous.bodyBackground;
    };
  }, [darkMode]);

  useEffect(() => {
    let active = true;

    async function loadContext() {
      const sessionResult = await db.auth.getSession();
      const user = sessionResult.data.session?.user;
      if (!user) {
        window.location.replace('/mobile');
        return;
      }

      const accessResult = await db
        .from('usuarios_empresa')
        .select('empresa_id, nome')
        .eq('user_id', user.id)
        .eq('status', 'ativo');

      if (!active) return;
      if (accessResult.error || !accessResult.data?.length) {
        setError('Não foi possível identificar o perfil selecionado.');
        return;
      }

      const accesses = accessResult.data as CompanyAccess[];
      const savedCompanyId = localStorage.getItem(LAST_PROFILE_KEY) || '';
      const access = accesses.find((item) => item.empresa_id === savedCompanyId) || accesses[0];
      const companyResult = await db.from('empresas').select('id, nome').eq('id', access.empresa_id).single();

      if (!active) return;
      if (companyResult.error || !companyResult.data) {
        setError('Não foi possível carregar os dados do perfil.');
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const monthIndex = normalizedMonth(params.get('mes'));
      const requestedYear = Number(params.get('ano'));
      const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2200
        ? requestedYear
        : new Date().getFullYear();
      const companyName = String(companyResult.data.nome || 'Perfil atual');

      try {
        const financialContext = await buildFinancialContext(db, access.empresa_id, companyName, year, monthIndex);
        if (!active) return;
        setContext(financialContext);
      } catch (loadError) {
        console.error('Erro ao carregar contexto da Ava:', loadError);
        if (!active) return;
        setContext(`Empresa: ${companyName}\nPeriodo: ${MONTH_LABELS[monthIndex]} / ${year}`);
      }

      const metadataName = String(user.user_metadata?.nome || user.user_metadata?.name || '');
      const chatStorageKey = `${CHAT_STORAGE_PREFIX}:${user.id}:${access.empresa_id}`;
      try {
        const saved = JSON.parse(sessionStorage.getItem(chatStorageKey) || '[]');
        if (Array.isArray(saved)) {
          setMessages(saved.filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.content));
        }
      } catch {
        sessionStorage.removeItem(chatStorageKey);
      }
      setUserName(firstName(String(access.nome || metadataName)));
      setStorageKey(chatStorageKey);
      setReady(true);
    }

    loadContext().catch((loadError) => {
      console.error('Erro ao preparar a Ava:', loadError);
      if (active) setError('Não foi possível preparar a conversa agora.');
    });

    return () => {
      active = false;
    };
  }, [db]);

  useEffect(() => {
    if (!storageKey) return;
    const persistable = messages.filter((message) => message.content);
    sessionStorage.setItem(storageKey, JSON.stringify(persistable));
  }, [messages, storageKey]);

  useEffect(() => {
    const element = messagesRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '36px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
  }, [input]);

  useEffect(() => () => {
    mediaRecorderRef.current?.stop();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const sendMessage = useCallback(async (explicitText?: string) => {
    const text = String(explicitText ?? input).trim();
    if (!text || sending || !ready) return;

    const userMessage: ChatMessage = { id: messageId(), role: 'user', content: text, time: currentTime() };
    const assistantId = messageId();
    const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', content: '', time: currentTime() };
    const outbound = [...messages, userMessage]
      .filter((message) => message.content)
      .map(({ role, content: messageContent }) => ({ role, content: messageContent }));

    setInput('');
    setSending(true);
    setError('');
    setMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      const response = await fetch('/api/ava/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: outbound, contexto: context }),
      });

      if (!response.ok || !response.body) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.mensagem || 'A Ava não conseguiu responder agora.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseText = '';
      let buffer = '';

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        lines.forEach((line) => {
          if (!line.startsWith('data: ')) return;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            responseText += parsed.choices?.[0]?.delta?.content || '';
          } catch {
            // Partial or non-JSON server-sent events are ignored.
          }
        });

        if (responseText) {
          setMessages((current) => current.map((message) => (
            message.id === assistantId ? { ...message, content: responseText } : message
          )));
        }
      }
    } catch (sendError) {
      console.error('Erro ao responder com a Ava:', sendError);
      setMessages((current) => current.map((message) => (
        message.id === assistantId
          ? { ...message, content: 'Desculpe, ocorreu um erro ao gerar a resposta. Tente novamente em instantes.' }
          : message
      )));
    } finally {
      setSending(false);
    }
  }, [context, input, messages, ready, sending]);

  const toggleRecording = useCallback(async () => {
    if (transcribing || sending) return;
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('A gravação de áudio não está disponível neste navegador.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedTypes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        if (!audioChunksRef.current.length) return;

        setTranscribing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', blob, recorder.mimeType.includes('mp4') ? 'ava-audio.mp4' : 'ava-audio.webm');
          const response = await fetch('/api/ava/transcrever-audio', { method: 'POST', body: formData });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.texto) throw new Error(result.mensagem || 'Não foi possível transcrever o áudio.');
          await sendMessage(String(result.texto));
        } catch (audioError) {
          console.error('Erro ao transcrever áudio da Ava:', audioError);
          setError(audioError instanceof Error ? audioError.message : 'Não foi possível enviar o áudio para a Ava.');
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setRecording(true);
      setError('');
    } catch {
      setError('Autorize o uso do microfone para enviar áudio para a Ava.');
    }
  }, [recording, sendMessage, sending, transcribing]);

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign('/mobile');
  };

  return (
    <main ref={shellRef} className={`${styles.shell} ${darkMode ? styles.dark : ''}`}>
      <header className={styles.header}>
        <button type="button" className={styles.headerButton} onClick={goBack} aria-label="Voltar">
          <BackIcon />
        </button>
        <Image src="/images/ava-logo-principal.png" alt="Ava" width={96} height={52} priority className={styles.logo} />
        <span className={styles.headerSpacer} />
        <button type="button" className={`${styles.headerButton} ${styles.homeButton}`} onClick={() => window.location.assign('/mobile')} aria-label="Voltar para o início">
          <HomeIcon />
        </button>
      </header>

      <section ref={messagesRef} className={styles.messages} aria-live="polite">
        {!sentMessage && (
          <div className={styles.welcome}>
            <h1>Olá{userName ? `, ${userName}` : ''}.</h1>
            <p>Sou a Ava, sua assistente financeira. Como posso ajudar?</p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion.label} type="button" onClick={() => sendMessage(suggestion.label)} disabled={!ready || sending}>
                  <span className={styles.suggestionIcon} style={{ color: suggestion.color, background: suggestion.background }}>
                    <SuggestionIcon type={suggestion.icon} color={suggestion.color} />
                  </span>
                  <span>{suggestion.label}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {sentMessage && <div className={styles.dayDivider}><span />Hoje<span /></div>}

        {messages.map((message) => (
          <div key={message.id} className={`${styles.messageRow} ${message.role === 'user' ? styles.userRow : ''}`}>
            <div className={`${styles.bubble} ${message.role === 'user' ? styles.userBubble : styles.assistantBubble}`}>
              {message.content || <span className={styles.typing}><i /><i /><i /></span>}
              {message.content && <small>{message.time}</small>}
            </div>
          </div>
        ))}

        {!ready && !error && <p className={styles.status}>Preparando sua conversa...</p>}
      </section>

      <footer className={styles.composerArea}>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <div className={styles.composer}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            rows={1}
            placeholder="Como posso ajudar você hoje?"
            aria-label="Mensagem para a Ava"
            disabled={!ready}
          />
          <button type="button" className={`${styles.actionButton} ${recording ? styles.recording : ''}`} onClick={toggleRecording} disabled={!ready || sending || transcribing} aria-label={recording ? 'Parar gravação' : 'Gravar áudio para a Ava'}>
            {transcribing ? <span className={styles.spinner} /> : recording ? <span className={styles.stopIcon} /> : <MicIcon />}
          </button>
          <button type="button" className={`${styles.actionButton} ${input.trim() && ready && !sending ? styles.sendActive : ''}`} onClick={() => sendMessage()} disabled={!input.trim() || !ready || sending} aria-label="Enviar mensagem">
            <SendIcon />
          </button>
        </div>
      </footer>
    </main>
  );
}
