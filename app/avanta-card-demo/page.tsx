'use client';
import AvantaCard from '../components/AvantaCard';

// Página de teste do padrão AvantaCard (header em duas camadas).
// Acessível em /avanta-card-demo — não linkada no app; remover após aprovação.
export default function AvantaCardDemo() {
  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8" style={{ background: '#080B12' }}>
      <div className="mx-auto grid max-w-5xl gap-10">
        <p className="text-center text-xs font-black uppercase tracking-[0.3em]" style={{ color: '#8E9AB8' }}>
          AvantaCard — demonstração do padrão
        </p>

        <AvantaCard
          title="Lançamentos Mensais"
          onSettingsClick={() => alert('Ajustes do card')}
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
          accentColor="#38bdf8"
          onSettingsClick={() => alert('Ajustes do card')}
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

        <AvantaCard title="Card sem controles" hideDragHandle hideMenu>
          <p className="text-sm leading-relaxed" style={{ color: '#8E9AB8' }}>
            Variante sem pontinhos de arrastar e sem menu — para cards fixos.
            O corpo aceita qualquer conteúdo via <code>children</code>.
          </p>
        </AvantaCard>
      </div>
    </main>
  );
}
