'use client';
import { useState } from 'react';
import AvantaCard from '../components/AvantaCard';

// Página de teste do padrão AvantaCard — usa o MESMO visual de produção
// (criarAvantaShellPreset, como em app/recebimentos e Dashboard).
// Acessível em /avanta-card-demo — não linkada no app; remover após aprovação.

const CORES = ['#3b82f6', '#00A6C8', '#7c3aed', '#0f766e', '#dc2626', '#d97706'];

export default function AvantaCardDemo() {
  const [corPrimaria, setCorPrimaria] = useState(CORES[0]);
  const [darkMode, setDarkMode] = useState(false);
  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const fundoPagina = darkMode ? '#0f172a' : '#f1f5f9';
  const textoMuted = darkMode ? '#94a3b8' : '#64748b';

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8 transition-colors" style={{ background: fundoPagina, color: darkMode ? '#e2e8f0' : '#0f172a' }}>
      <div className="mx-auto grid max-w-5xl gap-8">
        <p className="text-center text-xs font-black uppercase tracking-[0.3em]" style={{ color: textoMuted }}>
          AvantaCard — preset de produção (recebimentos / dashboard)
        </p>

        {/* Controles da demo: cor primária e tema */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {CORES.map((cor) => (
            <button
              key={cor}
              type="button"
              onClick={() => setCorPrimaria(cor)}
              aria-label={`Cor primária ${cor}`}
              className="h-8 w-8 rounded-full transition"
              style={{
                background: cor,
                outline: cor === corPrimaria ? `3px solid ${darkMode ? '#e2e8f0' : '#0f172a'}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => setDarkMode((v) => !v)}
            className="ml-4 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider"
            style={{ background: darkMode ? '#e2e8f0' : '#0f172a', color: darkMode ? '#0f172a' : '#f8fafc' }}
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
        </div>

        <AvantaCard
          title="Lançamentos Mensais"
          corPrimaria={corPrimaria}
          darkMode={darkMode}
          onSettingsClick={() => alert('Menu do card')}
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {meses.map((mes) => (
              <button
                key={mes}
                type="button"
                className="flex h-14 items-center justify-center rounded-2xl text-xs font-black transition hover:-translate-y-0.5"
                style={{
                  background: darkMode ? '#1e293b' : '#ffffff',
                  border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                  color: textoMuted,
                }}
              >
                {mes}
              </button>
            ))}
          </div>
        </AvantaCard>

        <AvantaCard
          title="Resumo Anual"
          corPrimaria={corPrimaria}
          darkMode={darkMode}
          plato={<span style={{ fontSize: 12, fontWeight: 800, color: textoMuted, letterSpacing: '0.08em' }}>2026</span>}
          onSettingsClick={() => alert('Menu do card')}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { rotulo: 'Receitas', valor: 'R$ 182.400,00', cor: '#059669' },
              { rotulo: 'Despesas', valor: 'R$ 97.210,00', cor: '#dc2626' },
              { rotulo: 'Lucro', valor: 'R$ 85.190,00', cor: darkMode ? '#f1f5f9' : '#0f172a' },
            ].map((item) => (
              <div
                key={item.rotulo}
                className="rounded-2xl p-4"
                style={{ background: darkMode ? '#1e293b' : '#ffffff', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` }}
              >
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: textoMuted }}>{item.rotulo}</p>
                <p className="mt-1 text-lg font-black tabular-nums" style={{ color: item.cor }}>{item.valor}</p>
              </div>
            ))}
          </div>
        </AvantaCard>

        <AvantaCard title="Card sem controles" corPrimaria={corPrimaria} darkMode={darkMode} hideDragHandle hideMenu>
          <p className="text-sm leading-relaxed" style={{ color: textoMuted }}>
            Variante sem pontinhos de arrastar e sem menu — para cards fixos.
            O corpo aceita qualquer conteúdo via <code>children</code>.
          </p>
        </AvantaCard>
      </div>
    </main>
  );
}
