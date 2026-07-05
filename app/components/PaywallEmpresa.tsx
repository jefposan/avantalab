'use client';
import React, { useState } from 'react';

interface PaywallEmpresaProps {
  darkMode?: boolean;
  corPrimaria?: string;
  nomePerfil?: string;
  // Retorna uma mensagem de erro (string) em caso de falha, ou nada em caso de
  // sucesso (nesse caso a navegação para o pagamento já acontece).
  onAssinar?: (ciclo: 'mensal' | 'anual') => Promise<string | null | void>;
  onSair?: () => void;
}

// Tela mostrada quando o trial de 7 dias da empresa venceu e não há assinatura.
export default function PaywallEmpresa({
  darkMode = false,
  corPrimaria = '#0A1F44',
  nomePerfil,
  onAssinar,
  onSair,
}: PaywallEmpresaProps) {
  const [carregando, setCarregando] = useState<'mensal' | 'anual' | null>(null);
  const [erro, setErro] = useState('');

  const clicar = async (ciclo: 'mensal' | 'anual') => {
    if (carregando) return;
    setErro('');
    setCarregando(ciclo);
    try {
      const r = await onAssinar?.(ciclo);
      if (typeof r === 'string' && r) setErro(r);
    } catch {
      setErro('Não foi possível iniciar a assinatura agora.');
    } finally {
      setCarregando(null);
    }
  };

  const fundo = darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900';
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  return (
    <div className={`min-h-screen w-full ${fundo} flex items-center justify-center px-4 py-10`}>
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] opacity-60">AvantaLab</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Seu teste de 7 dias terminou</h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-semibold opacity-70">
            {nomePerfil ? `O perfil "${nomePerfil}" ` : 'Este perfil '}
            está com o período de avaliação encerrado. Escolha um plano para continuar
            usando o sistema completo — seus dados estão guardados e voltam assim que assinar.
          </p>
        </div>

        {erro && (
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
            {erro}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {/* Mensal */}
          <div className={`rounded-2xl border p-5 shadow-sm ${card}`}>
            <p className="text-sm font-black uppercase tracking-wide opacity-60">Mensal</p>
            <p className="mt-2 text-3xl font-black">R$ 34,90<span className="text-base font-bold opacity-60">/mês</span></p>
            <p className="mt-1 text-xs font-semibold opacity-60">Cobrança todo mês. Cancele quando quiser.</p>
            <button
              type="button"
              onClick={() => clicar('mensal')}
              disabled={carregando !== null}
              className="mt-4 w-full rounded-xl border px-4 py-3 text-sm font-black transition hover:brightness-105 disabled:opacity-50"
              style={{ borderColor: corPrimaria, color: corPrimaria }}
            >
              {carregando === 'mensal' ? 'Processando…' : 'Assinar mensal'}
            </button>
          </div>

          {/* Anual (destaque) */}
          <div className="relative rounded-2xl border-2 p-5 shadow-md" style={{ borderColor: corPrimaria }}>
            <span
              className="absolute -top-3 left-5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white"
              style={{ backgroundColor: corPrimaria }}
            >
              Melhor valor · 2 meses grátis
            </span>
            <p className="text-sm font-black uppercase tracking-wide opacity-60">Anual</p>
            <p className="mt-2 text-3xl font-black">R$ 29,00<span className="text-base font-bold opacity-60">/mês</span></p>
            <p className="mt-1 text-xs font-semibold opacity-60">R$ 348,00 por ano — economize ~R$ 70.</p>
            <button
              type="button"
              onClick={() => clicar('anual')}
              disabled={carregando !== null}
              className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-black text-white shadow transition hover:brightness-110 disabled:opacity-50"
              style={{ backgroundColor: corPrimaria }}
            >
              {carregando === 'anual' ? 'Processando…' : 'Assinar anual'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onSair}
            className="text-xs font-black uppercase tracking-wide opacity-50 transition hover:opacity-80"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
