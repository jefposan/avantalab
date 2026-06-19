'use client';
import React, { useState, useRef, useEffect } from 'react';

type Mensagem = { role: 'user' | 'assistant'; content: string };

interface ChatFlutuanteProps {
  darkMode: boolean;
  textMuted: string;
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

export default function ChatFlutuante({
  darkMode,
  textMuted,
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
  supabaseUrl,
  contexto,
}: ChatFlutuanteProps) {
  const [iaMensagens, setIaMensagens] = useState<Mensagem[]>([
    { role: 'assistant', content: 'Olá! Sou a Ava, sua assistente financeira. Posso analisar seus resultados, dar dicas ou tirar dúvidas sobre o sistema. Como posso ajudar?' },
  ]);
  const [iaInput, setIaInput] = useState('');
  const [iaDigitando, setIaDigitando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [iaMensagens]);

  useEffect(() => {
    if (chatFeedbackEtapa === 'ia' && inputRef.current) inputRef.current.focus();
  }, [chatFeedbackEtapa]);

  const enviarIA = async () => {
    const texto = iaInput.trim();
    if (!texto || iaDigitando) return;
    const novas: Mensagem[] = [...iaMensagens, { role: 'user', content: texto }];
    setIaMensagens(novas);
    setIaInput('');
    setIaDigitando(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: novas.map(m => ({ role: m.role, content: m.content })),
          contexto,
        }),
      });
      if (!res.ok || !res.body) throw new Error('Erro');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let resposta = '';
      setIaMensagens(prev => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const linha of chunk.split('\n').filter(l => l.startsWith('data: '))) {
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
    } catch {
      setIaMensagens(prev => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' }]);
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
  const cardCls = darkMode
    ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
    : 'border-slate-200 bg-slate-50 hover:bg-sky-50';

  return (
    <div className="print-ocultar fixed bottom-6 right-6 z-[7800]">
      {chatFeedbackAberto && (
        <div className={'mb-4 w-[360px] overflow-hidden rounded-3xl border shadow-2xl ' + bg}>
          {/* Header */}
          <div
            className="flex items-start justify-between gap-3 px-5 py-4"
            style={{ background: 'linear-gradient(135deg, #020617, #003E73)', color: '#ffffff' }}
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200">AvantaLab</p>
              <h3 className="mt-1 text-base font-black leading-tight">
                {chatFeedbackEtapa === 'ia' ? 'Ava — Assistente IA' : 'Como podemos ajudar?'}
              </h3>
            </div>
            <button
              type="button"
              onClick={fecharChatFeedback}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg font-black text-white transition hover:bg-white/20 cursor-pointer"
              aria-label="Fechar chat"
            >×</button>
          </div>

          {/* ── Inicio ── */}
          {chatFeedbackEtapa === 'inicio' && (
            <div className="p-5">
              <p className={'text-sm leading-relaxed ' + textMuted}>
                Olá, agradecemos sua interação com a AvantaLab.<br />
                Selecione uma das opções abaixo:
              </p>
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => setChatFeedbackEtapa('ia')}
                  className={'rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ' + cardCls}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 text-lg font-black">✦</span>
                    <div>
                      <p className="text-sm font-black">Perguntar à Ava</p>
                      <p className={'mt-0.5 text-xs ' + textMuted}>Análises financeiras e dúvidas sobre o sistema.</p>
                    </div>
                  </div>
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

                <button
                  type="button"
                  onClick={() => abrirFormularioFeedback('duvida')}
                  className={'rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ' + cardCls}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-800 text-lg font-black">?</span>
                    <div>
                      <p className="text-sm font-black">Dúvidas</p>
                      <p className={'mt-0.5 text-xs ' + textMuted}>Envie uma dúvida sobre o uso do sistema.</p>
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
                {iaMensagens.map((msg, i) => {
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
                })}
              </div>
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
                    onClick={enviarIA}
                    disabled={!iaInput.trim() || iaDigitando}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm transition hover:bg-sky-700 active:scale-95 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <svg className="h-4 w-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
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

      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setChatFeedbackAberto((aberto) => !aberto)}
        className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-2xl transition hover:-translate-y-1 hover:shadow-sky-900/30 active:scale-95 cursor-pointer"
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
      </button>
    </div>
  );
}
