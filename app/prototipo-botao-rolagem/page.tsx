'use client';

import { useState } from 'react';
import BotaoProximoScroll from '../components/BotaoProximoScroll';

const blocos = [
  ['Visão geral', 'O botão aparece apenas quando existe conteúdo abaixo da área visível.'],
  ['Próxima tela', 'Cada toque avança aproximadamente uma tela. A rolagem continua suave.'],
  ['Final inteligente', 'Quando restar menos de uma tela, o próximo toque vai diretamente ao final.'],
  ['Estado final', 'Ao chegar ao fim, o botão desaparece até que exista conteúdo abaixo novamente.'],
];

export default function PrototipoBotaoRolagemPage() {
  const [escuro, setEscuro] = useState(false);

  return (
    <main className={escuro ? 'dark min-h-screen bg-slate-950 text-slate-100' : 'min-h-screen bg-slate-50 text-slate-900'}>
      <section className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-5 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Protótipo local</p>
            <h1 className="mt-1 text-lg font-semibold tracking-[-0.01em]">Botão para próximo trecho</h1>
          </div>
          <button
            type="button"
            onClick={() => setEscuro((atual) => !atual)}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {escuro ? 'Modo claro' : 'Modo escuro'}
          </button>
        </div>
      </section>

      <div className="mx-auto grid max-w-3xl gap-8 px-5 py-8 pb-28">
        <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-[#003E73] to-cyan-600 p-6 text-white shadow-lg shadow-sky-950/15">
          <p className="text-xs font-semibold text-cyan-100">Teste de comportamento</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.01em]">Role normalmente ou toque na seta circular.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-cyan-50/90">
            O botão fica centralizado no limite inferior, avança para o próximo trecho visível e some no fim do conteúdo.
          </p>
        </section>

        {blocos.map(([titulo, descricao], indice) => (
          <section key={titulo} className="min-h-[72vh] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">Trecho {indice + 1} de {blocos.length}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.01em]">{titulo}</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">{descricao}</p>
            <div className="mt-12 grid gap-3 sm:grid-cols-2">
              <div className="h-36 rounded-xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-36 rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          </section>
        ))}
      </div>

      <BotaoProximoScroll />
    </main>
  );
}
