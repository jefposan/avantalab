'use client';
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type Mensagem = { role: 'user' | 'assistant'; content: string };

interface ChatFlutuanteProps {
  darkMode: boolean;
  textMuted: string;
  nomeUsuario?: string;
  chatFeedbackAberto: boolean;
  setChatFeedbackAberto: React.Dispatch<React.SetStateAction<boolean>>;
  chatFeedbackEtapa: 'inicio' | 'formulario' | 'confirmacao' | 'ia';
  setChatFeedbackEtapa: React.Dispatch<React.SetStateAction<'inicio' | 'formulario' | 'confirmacao' | 'ia'>>;
  feedbackTipo: 'sugestao' | 'duvida' | null;
  feedbackMensagem: string;
  setFeedbackMensagem: React.Dispatch<React.SetStateAction<string>>;
  feedbackEnviando: boolean;
  fecharChatFeedback: () => void;
  abrirFormularioFeedback: (tipo: 'sugestao' | 'duvida') => void;
  voltarInicioChatFeedback: () => void;
  enviarFeedbackVisual: () => Promise<void>;
  supabaseUrl: string;
  contexto: string;
  // Perfil ativo — enviado à API da Ava para a checagem do Premium no servidor.
  empresaId?: string | null;
  // Ava bloqueada no plano Pessoal grátis (mostra o cadeado; o clique é
  // interceptado pelo setChatFeedbackEtapa que a página passa).
  avaBloqueada?: boolean;
}

function DotsBounce() {
  return (
    <span className="flex gap-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></span>
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></span>
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></span>
    </span>
  );
}

function AvaLogo({ className = 'h-8 w-24' }: { className?: string }) {
  return (
    <img
      src="/images/ava-logo-principal.png"
      alt="Ava"
      className={'object-contain ' + className}
      draggable={false}
    />
  );
}

function mensagemErroAva(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Desculpe, ocorreu um erro. Tente novamente.';
}

export default function ChatFlutuante({
  darkMode,
  textMuted,
  nomeUsuario,
  chatFeedbackAberto,
  setChatFeedbackAberto,
  chatFeedbackEtapa,
  setChatFeedbackEtapa,
  feedbackTipo,
  feedbackMensagem,
  setFeedbackMensagem,
  feedbackEnviando,
  fecharChatFeedback,
  abrirFormularioFeedback,
  voltarInicioChatFeedback,
  enviarFeedbackVisual,
  contexto,
  empresaId = null,
  avaBloqueada = false,
}: ChatFlutuanteProps) {
  const [iaMensagens, setIaMensagens] = useState<Mensagem[]>([
    { role: 'assistant', content: 'Olá! Sou a Ava, sua assistente financeira. Posso analisar seus resultados, dar dicas ou tirar dúvidas sobre o sistema. Como posso ajudar?' },
  ]);
  const [iaInput, setIaInput] = useState('');
  const [iaDigitando, setIaDigitando] = useState(false);
  const [balaoVisivel, setBalaoVisivel] = useState(false);
  const balaoVezes = useRef(0);
  const jaInteragiu = useRef(false);
  const prefereMenosMovimento = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [iaMensagens]);

  // Balão periódico de boas-vindas da Ava (descoberta do recurso).
  useEffect(() => {
    try {
      prefereMenosMovimento.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {}
    const MAX_VEZES = 3;
    let ocultar: ReturnType<typeof setTimeout> | undefined;
    const mostrar = () => {
      if (jaInteragiu.current || balaoVezes.current >= MAX_VEZES) return;
      setBalaoVisivel(true);
      balaoVezes.current += 1;
      ocultar = setTimeout(() => setBalaoVisivel(false), 6000);
    };
    const primeira = setTimeout(mostrar, 30000);
    const intervalo = setInterval(mostrar, 180000);
    return () => {
      clearTimeout(primeira);
      clearInterval(intervalo);
      if (ocultar) clearTimeout(ocultar);
    };
  }, []);

  // Ao abrir o chat, para de mostrar o balão (usuário já descobriu)
  useEffect(() => {
    if (chatFeedbackAberto) {
      jaInteragiu.current = true;
      setBalaoVisivel(false);
    }
  }, [chatFeedbackAberto]);

  useEffect(() => {
    if (chatFeedbackEtapa === 'ia' && inputRef.current) inputRef.current.focus();
  }, [chatFeedbackEtapa]);

  const enviarIA = async (textoDireto?: string) => {
    const texto = (textoDireto ?? iaInput).trim();
    if (!texto || iaDigitando) return;
    const novas: Mensagem[] = [...iaMensagens, { role: 'user', content: texto }];
    setIaMensagens(novas);
    setIaInput('');
    setIaDigitando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ava/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: novas.map(m => ({ role: m.role, content: m.content })),
          contexto,
          empresaId: empresaId || undefined,
        }),
      });

      if (!res.ok) {
        const erro = await res.json().catch(() => null);
        const mensagem = erro?.mensagem || erro?.message || 'A Ava nao conseguiu responder agora.';
        throw new Error(mensagem);
      }

      if (!res.body) throw new Error('A Ava nao retornou resposta agora.');

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        const conteudo = data?.resposta || data?.reply || data?.message || data?.mensagem;
        if (!conteudo) throw new Error('A Ava nao conseguiu gerar a resposta agora.');
        setIaMensagens(prev => [...prev, { role: 'assistant', content: String(conteudo) }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let resposta = '';
      let buffer = '';

      setIaMensagens(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const linhas = buffer.split('\n');
        buffer = linhas.pop() || '';

        for (const linha of linhas.filter(l => l.startsWith('data: '))) {
          const dado = linha.replace('data: ', '').trim();
          if (dado === '[DONE]') continue;
          try {
            const delta = JSON.parse(dado)?.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              resposta += delta;
              setIaMensagens(prev => {
                const c = [...prev];
                c[c.length - 1] = { role: 'assistant', content: resposta };
                return c;
              });
            }
          } catch { /* ignorar */ }
        }
      }

      if (!resposta.trim()) throw new Error('A Ava nao conseguiu gerar a resposta agora.');
    } catch (error) {
      const conteudo = mensagemErroAva(error);
      setIaMensagens(prev => {
        const copia = [...prev];
        const ultima = copia[copia.length - 1];

        if (ultima?.role === 'assistant' && !ultima.content) {
          copia[copia.length - 1] = { role: 'assistant', content: conteudo };
          return copia;
        }

        return [...prev, { role: 'assistant', content: conteudo }];
      });
    } finally {
      setIaDigitando(false);
    }
  };

  const bg = darkMode
    ? 'border-slate-700 bg-slate-900 text-slate-100'
    : 'border-slate-200 bg-white text-slate-800';
  const bgMsg = darkMode ? 'bg-slate-800' : 'bg-slate-100';
  const textMain = darkMode ? 'text-white' : 'text-slate-900';
  const borderT = darkMode ? 'border-slate-700' : 'border-slate-200';
  const primeiroNomeAva = (nomeUsuario || '').trim().split(/\s+/)[0] || '';
  const saudacaoAva = 'Olá' + (primeiroNomeAva ? ', ' + primeiroNomeAva : '') + '.';
  const idxPrimeiroUserAva = iaMensagens.findIndex((m) => m.role === 'user');
  const conversaIniciadaAva = idxPrimeiroUserAva >= 0;
  const msgsExibidasAva = conversaIniciadaAva ? iaMensagens.slice(idxPrimeiroUserAva) : [];
  const cardCls = darkMode
    ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
    : 'border-slate-200 bg-slate-50 hover:bg-sky-50';

  return (
    <div className="print-ocultar fixed inset-x-3 bottom-3 z-[7800] sm:inset-x-auto sm:bottom-6 sm:right-6">
      {chatFeedbackAberto && (
        <div className={'mb-3 w-full max-w-full overflow-hidden rounded-2xl border shadow-2xl sm:mb-4 sm:w-[360px] sm:rounded-3xl ' + bg}>
          {/* Header */}
          <div
            className={
              'flex items-start justify-between gap-3 px-5 py-4 ' +
              (chatFeedbackEtapa === 'ia' ? 'border-b border-slate-200 bg-white text-slate-900' : 'text-white')
            }
            style={chatFeedbackEtapa === 'ia' ? undefined : { background: 'linear-gradient(135deg, #020617, #003E73)' }}
          >
            <div className="flex min-w-0 items-center gap-3">
              {chatFeedbackEtapa === 'ia' && (
                <span className="flex h-10 w-28 items-center justify-center">
                  <AvaLogo className="h-11 w-28" />
                </span>
              )}
              <div className="min-w-0">
                <p
                  className="text-[11px] font-black uppercase tracking-[0.24em]"
                  style={{ color: chatFeedbackEtapa === 'ia' ? '#0A1F44' : 'rgba(255,255,255,0.65)' }}
                >AvantaLab</p>
                <h3 className="mt-1 truncate text-sm font-black leading-tight">
                  {chatFeedbackEtapa === 'ia' ? 'Ava — Assistente IA' : 'Como podemos ajudar?'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={fecharChatFeedback}
              className={
                'flex h-8 w-8 items-center justify-center rounded-full text-lg font-black transition cursor-pointer ' +
                (chatFeedbackEtapa === 'ia'
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  : 'bg-white/15 text-white hover:bg-white/25')
              }
              aria-label="Fechar chat"
            >×</button>
          </div>

          {/* ── Inicio ── */}
          {chatFeedbackEtapa === 'inicio' && (
            <div className="p-5">
              <p className={'text-sm leading-relaxed ' + textMuted}>
                Selecione uma das opções abaixo:
              </p>
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => setChatFeedbackEtapa('ia')}
                  className={(darkMode
                    ? 'border-slate-700 bg-slate-900 hover:bg-slate-800'
                    : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50') +
                    ' flex w-full items-center gap-3 rounded-full border px-4 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] cursor-pointer'}
                >
                  <span className="flex h-10 w-24 shrink-0 items-center justify-center">
                    <AvaLogo className="h-11 w-24" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-400">
                    Pergunte para Ava...
                    {avaBloqueada && <span className="ml-1.5 text-xs" title="Recurso Premium">🔒</span>}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-base font-black text-white shadow-sm">
                    &#8593;
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => abrirFormularioFeedback('sugestao')}
                  className={'rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ' + cardCls}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 text-lg">💡</span>
                    <div>
                      <p className="text-sm font-black">Sugestões</p>
                      <p className={'mt-0.5 text-xs ' + textMuted}>Envie ideias, avaliações ou pontos de melhoria.</p>
                    </div>
                  </div>
                </button>

              </div>
            </div>
          )}

          {/* ── IA ── */}
          {chatFeedbackEtapa === 'ia' && (
            <div className="flex flex-col" style={{ height: '420px' }}>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {!conversaIniciadaAva ? (
                  <div className="px-2 pt-4 pb-1 text-center">
                    <p className={'text-lg font-extrabold tracking-tight ' + textMain}>{saudacaoAva}</p>
                    <p className={'mx-auto mt-2 max-w-[282px] text-xs leading-relaxed ' + textMuted}>
                      Sou a Ava, sua assistente financeira. Como posso ajudar?
                    </p>
                  </div>
                ) : (
                  msgsExibidasAva.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    const wrapCls = 'flex ' + (isUser ? 'justify-end' : 'justify-start');
                    const bubbleCls = 'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap '
                      + (isUser ? 'bg-sky-600 text-white rounded-br-sm' : bgMsg + ' ' + textMain + ' rounded-bl-sm');
                    return (
                      <div key={i} className={wrapCls}>
                        <div className={bubbleCls}>
                          {msg.content ? msg.content : <DotsBounce />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {!conversaIniciadaAva && !iaDigitando && (
                <div className="grid grid-cols-2 gap-2 px-3 pb-1">
                  {['Por onde inicio o uso do sistema?', 'Analise meus resultados.', 'Como reduzir gastos sem afetar o essencial?', 'Como montar uma reserva de emergência?'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => enviarIA(s)}
                      className={'rounded-xl border px-2.5 py-2 text-left text-[11px] font-bold transition active:scale-[0.98] cursor-pointer ' +
                        (darkMode
                          ? 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100')}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className={'border-t p-3 ' + borderT}>
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={iaInput}
                    onChange={e => setIaInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarIA(); } }}
                    placeholder="Digite sua pergunta..."
                    rows={1}
                    disabled={iaDigitando}
                    className={'flex-1 resize-none rounded-xl border px-3 py-2 text-[13px] font-semibold outline-none transition focus:ring-1 disabled:opacity-60 '
                      + (darkMode
                        ? 'border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:ring-sky-500'
                        : 'border-slate-300 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:ring-sky-400')}
                    style={{ maxHeight: '80px', overflowY: 'auto' }}
                  />
                  <button
                    type="button"
                    onClick={() => enviarIA()}
                    disabled={!iaInput.trim() || iaDigitando}
                    aria-label="Enviar"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-base font-black text-white shadow-sm transition hover:bg-cyan-700 active:scale-95 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    &#8593;
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={voltarInicioChatFeedback}
                    className={'text-[11px] font-black uppercase tracking-wide transition hover:underline cursor-pointer '
                      + (darkMode ? 'text-sky-300' : 'text-sky-700')}
                  >← Voltar</button>
                  <p className={'text-[10px] ' + textMuted}>Enter para enviar</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Formulario ── */}
          {chatFeedbackEtapa === 'formulario' && (
            <div className="p-5">
              <button
                type="button"
                onClick={voltarInicioChatFeedback}
                className={'mb-4 text-xs font-black uppercase tracking-wide transition hover:underline cursor-pointer '
                  + (darkMode ? 'text-sky-300' : 'text-sky-700')}
              >← Voltar</button>
              <h4 className="text-lg font-black">
                {feedbackTipo === 'sugestao' ? 'Enviar sugestão' : 'Enviar dúvida'}
              </h4>
              <p className={'mt-2 text-sm leading-relaxed ' + textMuted}>
                {feedbackTipo === 'sugestao'
                  ? 'Sua opinião é muito importante para melhorarmos o AvantaLab. Escreva abaixo sua sugestão, avaliação ou ponto de melhoria.'
                  : 'Descreva sua dúvida sobre o uso do AvantaLab.'}
              </p>
              <textarea
                value={feedbackMensagem}
                onChange={(e) => setFeedbackMensagem(e.target.value)}
                placeholder={feedbackTipo === 'sugestao' ? 'Escreva sua sugestão...' : 'Escreva sua dúvida...'}
                rows={5}
                className={'mt-4 w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2 '
                  + (darkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20'
                    : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:ring-sky-600/20')}
              />
              <button
                type="button"
                onClick={enviarFeedbackVisual}
                disabled={feedbackEnviando}
                className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #003E73, #00A6C8)' }}
              >
                {feedbackEnviando ? 'Enviando...' : 'Enviar mensagem'}
              </button>
            </div>
          )}

          {/* ── Confirmacao ── */}
          {chatFeedbackEtapa === 'confirmacao' && (
            <div className="p-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-black text-emerald-700">✓</div>
              <h4 className="mt-4 text-lg font-black">Mensagem registrada</h4>
              <p className={'mt-2 text-sm leading-relaxed ' + textMuted}>Obrigado! Sua mensagem foi registrada com sucesso.</p>
              <button
                type="button"
                onClick={voltarInicioChatFeedback}
                className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:bg-slate-800 cursor-pointer"
              >Enviar outra mensagem</button>
            </div>
          )}
        </div>
      )}

      {/* Balão de boas-vindas da Ava */}
      {!chatFeedbackAberto && balaoVisivel && (
        <div
          className={
            'mb-3 ml-auto flex max-w-[240px] items-center gap-2 rounded-2xl border px-3 py-2 shadow-xl ' +
            (darkMode ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-white text-slate-700')
          }
        >
          <button
            type="button"
            onClick={() => { jaInteragiu.current = true; setBalaoVisivel(false); setChatFeedbackAberto(true); }}
            className="text-left text-xs font-semibold leading-snug cursor-pointer"
          >
            <span className="block">Olá, sou Ava 👋</span>
            <span className="block">No que posso ajudar?</span>
          </button>
          <button
            type="button"
            onClick={() => { jaInteragiu.current = true; setBalaoVisivel(false); }}
            aria-label="Dispensar"
            className={'shrink-0 rounded-full px-1 text-sm font-black ' + (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')}
          >
            ×
          </button>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setChatFeedbackAberto((aberto) => !aberto)}
        className="relative ml-auto flex h-16 w-16 items-center justify-center rounded-full text-white shadow-2xl transition hover:-translate-y-1 hover:shadow-sky-900/30 active:scale-95 cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #020617, #003E73)' }}
        aria-label="Abrir chat AvantaLab"
      >
        {chatFeedbackAberto ? (
          <span className="text-3xl font-black leading-none">×</span>
        ) : (
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              d="M8 10h8M8 14h5m7-2a8 8 0 11-3.2-6.4L21 5l-1.2 4.2A7.96 7.96 0 0120 12z"
            />
          </svg>
        )}
        {!chatFeedbackAberto && balaoVisivel && (
          <span className={'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-white ' + (prefereMenosMovimento.current ? '' : 'animate-pulse')}>?</span>
        )}
      </button>
    </div>
  );
}
