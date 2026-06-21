'use client';

import { useState, useRef, useEffect } from 'react';

type Mensagem = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatIAProps = {
  darkMode: boolean;
  supabaseUrl: string;
  contexto: string;
};

export default function ChatIA({ darkMode, supabaseUrl, contexto }: ChatIAProps) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    { role: 'assistant', content: 'Olá! Sou a Ava, sua assistente financeira. Posso analisar seus resultados, dar dicas ou tirar dúvidas sobre o sistema. Como posso ajudar?' },
  ]);
  const [input, setInput] = useState('');
  const [digitando, setDigitando] = useState(false);
  const [temNotificacao, setTemNotificacao] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens, digitando]);

  useEffect(() => {
    if (aberto && inputRef.current) {
      inputRef.current.focus();
    }
  }, [aberto]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || digitando) return;

    const novasMensagens: Mensagem[] = [...mensagens, { role: 'user', content: texto }];
    setMensagens(novasMensagens);
    setInput('');
    setDigitando(true);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/chat-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: novasMensagens.map(m => ({ role: m.role, content: m.content })),
          contexto,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Erro na resposta');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let resposta = '';

      setMensagens(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const linhas = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const linha of linhas) {
          const dado = linha.replace('data: ', '').trim();
          if (dado === '[DONE]') continue;
          try {
            const json = JSON.parse(dado);
            const delta = json.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              resposta += delta;
              setMensagens(prev => {
                const copia = [...prev];
                copia[copia.length - 1] = { role: 'assistant', content: resposta };
                return copia;
              });
            }
          } catch { /* ignorar chunks inválidos */ }
        }
      }
    } catch {
      setMensagens(prev => [
        ...prev,
        { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente em instantes.' },
      ]);
    } finally {
      setDigitando(false);
    }
  };

  const bg = darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const bgMsg = darkMode ? 'bg-slate-800' : 'bg-slate-100';
  const textMain = darkMode ? 'text-white' : 'text-slate-900';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => { setAberto(v => !v); setTemNotificacao(false); }}
        className={`fixed bottom-6 right-6 z-[5000] flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer ${
          aberto ? 'bg-slate-700 text-white' : 'bg-sky-600 text-white'
        }`}
        title="Assistente IA"
      >
        {aberto ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        {temNotificacao && !aberto && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center">1</span>
        )}
      </button>

      {/* Painel de chat */}
      {aberto && (
        <div
          className={`fixed bottom-24 right-6 z-[4999] flex w-[360px] max-w-[calc(100vw-48px)] flex-col rounded-2xl border shadow-2xl ${bg}`}
          style={{ height: '480px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-2xl bg-sky-600 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-black text-white">A</div>
            <div>
              <p className="text-sm font-black text-white">Ava</p>
              <p className="text-[10px] font-semibold text-sky-200">Assistente financeira AvantaLab</p>
            </div>
            <div className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400" title="Online" />
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
            {mensagens.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-sky-600 text-white rounded-br-sm'
                      : `${bgMsg} ${textMain} rounded-bl-sm`
                  }`}
                >
                  {msg.content || (
                    <span className="flex gap-1 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className={`border-t p-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
                }}
                placeholder="Digite sua pergunta..."
                rows={1}
                disabled={digitando}
                className={`flex-1 resize-none rounded-xl border px-3 py-2 text-[13px] font-semibold outline-none transition focus:ring-1 disabled:opacity-60 ${
                  darkMode
                    ? 'border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:ring-sky-500'
                    : 'border-slate-300 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:ring-sky-400'
                }`}
                style={{ maxHeight: '96px', overflowY: 'auto' }}
              />
              <button
                type="button"
                onClick={enviar}
                disabled={!input.trim() || digitando}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm transition hover:bg-sky-700 active:scale-95 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
            <p className={`mt-1.5 text-center text-[10px] ${textMuted}`}>Enter para enviar · Shift+Enter para nova linha</p>
          </div>
        </div>
      )}
    </>
  );
}
