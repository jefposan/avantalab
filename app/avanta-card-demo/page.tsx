'use client';
import type { CSSProperties } from 'react';
import AvantaCard from '../components/AvantaCard';

// Página de teste do padrão AvantaCard (header em duas camadas).
// Acessível em /avanta-card-demo — não linkada no app; remover após aprovação.
export default function AvantaCardDemo() {
  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const peleDemo = (cor = '#3b82f6'): CSSProperties => ({
    ['--cp' as string]: cor,
    ['--avanta-tras-bg' as string]: 'linear-gradient(160deg, color-mix(in srgb, var(--cp) 30%, #131b2b), color-mix(in srgb, var(--cp) 14%, #0d1422) 70%)',
    ['--avanta-tras-overlay' as string]: 'radial-gradient(ellipse at 64% 100%, rgba(0, 0, 0, 0.38) 0%, rgba(0, 0, 0, 0.18) 38%, transparent 72%), linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.34) 100%)',
    ['--avanta-tras-shadow' as string]: 'inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 10px 26px rgba(0, 0, 0, 0.45)',
    ['--avanta-front-bg' as string]: 'color-mix(in srgb, var(--cp) 8%, #0d1420)',
    ['--avanta-body-bg' as string]: 'linear-gradient(180deg, color-mix(in srgb, var(--cp) 8%, #0d1420) 0px, color-mix(in srgb, var(--cp) 8%, #0d1420) 110px, color-mix(in srgb, var(--cp) 3%, #070b13) 100%)',
    ['--avanta-title-color' as string]: '#f5f7ff',
    ['--avanta-accent-bg' as string]: 'linear-gradient(180deg, var(--cp), transparent 140%)',
    ['--avanta-control-color' as string]: 'color-mix(in srgb, var(--cp) 35%, rgba(220, 230, 255, 0.75))',
    ['--avanta-control-hover-bg' as string]: 'color-mix(in srgb, var(--cp) 18%, transparent)',
    ['--avanta-control-hover-color' as string]: '#f5f7ff',
    ['--avanta-front-filter' as string]: 'drop-shadow(0 -0.5px 0 color-mix(in srgb, var(--cp) 45%, rgba(160, 180, 255, 0.35))) drop-shadow(0 0.5px 0 color-mix(in srgb, var(--cp) 45%, rgba(160, 180, 255, 0.35))) drop-shadow(-0.5px 0 0 color-mix(in srgb, var(--cp) 45%, rgba(160, 180, 255, 0.35))) drop-shadow(0.5px 0 0 color-mix(in srgb, var(--cp) 45%, rgba(160, 180, 255, 0.35))) drop-shadow(0 22px 34px rgba(0, 0, 0, 0.5))',
  });

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8" style={{ background: '#080B12' }}>
      <div className="mx-auto grid max-w-5xl gap-10">
        <p className="text-center text-xs font-black uppercase tracking-[0.3em]" style={{ color: '#8E9AB8' }}>
          AvantaCard — demonstração do padrão
        </p>

        <AvantaCard
          title="Lançamentos Mensais"
          onSettingsClick={() => alert('Ajustes do card')}
          style={peleDemo()}
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {meses.map((mes) => (
              <button
                key={mes}
                type="button"
                className="flex h-14 items-center justify-center rounded-2xl text-xs font-black transition hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(160deg, #151E2C, #0d131f)',
                  border: '1px solid rgba(120,150,255,0.14)',
                  color: '#8E9AB8',
                }}
              >
                {mes}
              </button>
            ))}
          </div>
        </AvantaCard>

        <AvantaCard
          title="Resumo Anual"
          onSettingsClick={() => alert('Ajustes do card')}
          style={peleDemo('#00A6C8')}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { rotulo: 'Receitas', valor: 'R$ 182.400,00', cor: '#34d399' },
              { rotulo: 'Despesas', valor: 'R$ 97.210,00', cor: '#f87171' },
              { rotulo: 'Lucro', valor: 'R$ 85.190,00', cor: '#F5F7FF' },
            ].map((item) => (
              <div
                key={item.rotulo}
                className="rounded-2xl p-4"
                style={{ background: 'linear-gradient(160deg, #151E2C, #0d131f)', border: '1px solid rgba(120,150,255,0.14)' }}
              >
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#8E9AB8' }}>{item.rotulo}</p>
                <p className="mt-1 text-lg font-black tabular-nums" style={{ color: item.cor }}>{item.valor}</p>
              </div>
            ))}
          </div>
        </AvantaCard>

        <AvantaCard title="Card sem controles" hideDragHandle hideMenu style={peleDemo('#7c3aed')}>
          <p className="text-sm leading-relaxed" style={{ color: '#8E9AB8' }}>
            Variante sem pontinhos de arrastar e sem menu — para cards fixos.
            O corpo aceita qualquer conteúdo via <code>children</code>.
          </p>
        </AvantaCard>
      </div>
    </main>
  );
}
