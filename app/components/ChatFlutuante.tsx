'use client';
import React from 'react';

interface ChatFlutuanteProps {
  darkMode: boolean;
  textMuted: string;
  chatFeedbackAberto: boolean;
  setChatFeedbackAberto: React.Dispatch<React.SetStateAction<boolean>>;
  chatFeedbackEtapa: 'inicio' | 'formulario' | 'confirmacao';
  feedbackTipo: 'sugestao' | 'duvida' | null;
  feedbackMensagem: string;
  setFeedbackMensagem: React.Dispatch<React.SetStateAction<string>>;
  feedbackEnviando: boolean;
  fecharChatFeedback: () => void;
  abrirFormularioFeedback: (tipo: 'sugestao' | 'duvida') => void;
  voltarInicioChatFeedback: () => void;
  enviarFeedbackVisual: () => Promise<void>;
}

export default function ChatFlutuante({
  darkMode,
  textMuted,
  chatFeedbackAberto,
  setChatFeedbackAberto,
  chatFeedbackEtapa,
  feedbackTipo,
  feedbackMensagem,
  setFeedbackMensagem,
  feedbackEnviando,
  fecharChatFeedback,
  abrirFormularioFeedback,
  voltarInicioChatFeedback,
  enviarFeedbackVisual,
}: ChatFlutuanteProps) {
  return (
    <div className="print-ocultar fixed bottom-6 right-6 z-[7800]">
      {chatFeedbackAberto && (
        <div
          className={`mb-4 w-[360px] overflow-hidden rounded-3xl border shadow-2xl ${
            darkMode
              ? 'border-slate-700 bg-slate-900 text-slate-100'
              : 'border-slate-200 bg-white text-slate-800'
          }`}
        >
          <div
            className="flex items-start justify-between gap-3 px-5 py-4"
            style={{
              background: 'linear-gradient(135deg, #020617, #003E73)',
              color: '#ffffff',
            }}
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200">
                AvantaLab
              </p>
              <h3 className="mt-1 text-base font-black leading-tight">
                Como podemos ajudar?
              </h3>
            </div>
            <button
              type="button"
              onClick={fecharChatFeedback}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg font-black text-white transition hover:bg-white/20 cursor-pointer"
              aria-label="Fechar chat"
            >
              ×
            </button>
          </div>

          <div className="p-5">
            {chatFeedbackEtapa === 'inicio' && (
              <div>
                <p className={`text-sm leading-relaxed ${textMuted}`}>
                  Olá, agradecemos sua interação com a AvantaLab.
                  <br />
                  Selecione uma das opções abaixo:
                </p>
                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    onClick={() => abrirFormularioFeedback('sugestao')}
                    className={`rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                      darkMode
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                        : 'border-slate-200 bg-slate-50 hover:bg-sky-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">
                        ✦
                      </span>
                      <div>
                        <p className="text-sm font-black">Sugestões</p>
                        <p className={`mt-0.5 text-xs ${textMuted}`}>
                          Envie ideias, avaliações ou pontos de melhoria.
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => abrirFormularioFeedback('duvida')}
                    className={`rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                      darkMode
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                        : 'border-slate-200 bg-slate-50 hover:bg-sky-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                        ?
                      </span>
                      <div>
                        <p className="text-sm font-black">Dúvidas</p>
                        <p className={`mt-0.5 text-xs ${textMuted}`}>
                          Envie uma dúvida sobre o uso do sistema.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {chatFeedbackEtapa === 'formulario' && (
              <div>
                <button
                  type="button"
                  onClick={voltarInicioChatFeedback}
                  className={`mb-4 text-xs font-black uppercase tracking-wide transition hover:underline cursor-pointer ${
                    darkMode ? 'text-sky-300' : 'text-sky-700'
                  }`}
                >
                  ← Voltar
                </button>
                <h4 className="text-lg font-black">
                  {feedbackTipo === 'sugestao' ? 'Enviar sugestão' : 'Enviar dúvida'}
                </h4>
                <p className={`mt-2 text-sm leading-relaxed ${textMuted}`}>
                  {feedbackTipo === 'sugestao'
                    ? 'Sua opinião é muito importante para melhorarmos o AvantaLab. Escreva abaixo sua sugestão, avaliação ou ponto de melhoria.'
                    : 'Descreva sua dúvida sobre o uso do AvantaLab. Em breve, este atendimento poderá ser respondido por uma IA treinada para ajudar no sistema.'}
                </p>
                <textarea
                  value={feedbackMensagem}
                  onChange={(e) => setFeedbackMensagem(e.target.value)}
                  placeholder={
                    feedbackTipo === 'sugestao'
                      ? 'Escreva sua sugestão...'
                      : 'Escreva sua dúvida...'
                  }
                  rows={5}
                  className={`mt-4 w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${
                    darkMode
                      ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-sky-500/20'
                      : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:ring-sky-600/20'
                  }`}
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

            {chatFeedbackEtapa === 'confirmacao' && (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl font-black text-emerald-700">
                  ✓
                </div>
                <h4 className="mt-4 text-lg font-black">Mensagem registrada</h4>
                <p className={`mt-2 text-sm leading-relaxed ${textMuted}`}>
                  Obrigado! Sua mensagem foi registrada com sucesso.
                </p>
                <button
                  type="button"
                  onClick={voltarInicioChatFeedback}
                  className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:bg-slate-800 cursor-pointer"
                >
                  Enviar outra mensagem
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
