'use client';
import React, { useState } from 'react';

// Formata como CPF (000.000.000-00) até 11 dígitos, ou CNPJ (00.000.000/0000-00) acima.
function formatarCpfCnpj(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    let out = d.slice(0, 3);
    if (d.length > 3) out += '.' + d.slice(3, 6);
    if (d.length > 6) out += '.' + d.slice(6, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }
  let out = d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8, 12);
  if (d.length > 12) out += '-' + d.slice(12, 14);
  return out;
}

interface PaywallEmpresaProps {
  nomePerfil?: string;
  // Retorna { ok, url } em caso de sucesso, ou { ok:false, mensagem } em caso de falha.
  onAssinar?: (ciclo: 'mensal' | 'anual', cpfCnpj: string) => Promise<{ ok: boolean; url?: string; mensagem?: string } | void>;
  onSair?: () => void;
}

const GRADIENTE = 'linear-gradient(135deg,#003E73,#00A6C8)';

// Tela mostrada quando o trial de 7 dias da empresa venceu — com a identidade
// visual da tela de login (fundo AvantaLab + card "vidro fosco").
export default function PaywallEmpresa({ nomePerfil, onAssinar, onSair }: PaywallEmpresaProps) {
  const [carregando, setCarregando] = useState<'mensal' | 'anual' | null>(null);
  const [erro, setErro] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [aguardandoPagamento, setAguardandoPagamento] = useState(false);

  const clicar = async (ciclo: 'mensal' | 'anual') => {
    if (carregando) return;
    const digitos = cpfCnpj.replace(/\D/g, '');
    if (digitos.length !== 11 && digitos.length !== 14) {
      setErro('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) para a cobrança.');
      return;
    }
    // Abre a aba do pagamento já no clique (evita bloqueio de pop-up).
    const janela = window.open('', '_blank');
    setErro('');
    setCarregando(ciclo);
    try {
      const r = await onAssinar?.(ciclo, digitos);
      if (r && typeof r === 'object' && r.ok && r.url) {
        if (janela) janela.location.href = r.url;
        else window.open(r.url, '_blank');
        setAguardandoPagamento(true);
      } else {
        if (janela) janela.close();
        setErro((r && typeof r === 'object' && r.mensagem) || 'Não foi possível iniciar a assinatura.');
      }
    } catch {
      if (janela) janela.close();
      setErro('Não foi possível iniciar a assinatura agora.');
    } finally {
      setCarregando(null);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white/90 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20';

  return (
    <main className="relative min-h-screen overflow-hidden font-sans">
      {/* Fundo (mesmo da tela de login) */}
      <div
        className="absolute inset-0 hidden bg-cover bg-center lg:block"
        style={{ backgroundImage: "image-set(url('/images/bg-avantalab.webp') type('image/webp'), url('/images/bg-avantalab.png') type('image/png'))" }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:hidden"
        style={{ backgroundImage: "image-set(url('/images/bg-avantalab-mobile.webp') type('image/webp'), url('/images/bg-avantalab-mobile.png') type('image/png'))" }}
      />
      <div className="pointer-events-none absolute inset-0 hidden bg-white/10 lg:block" />

      <section className="relative z-10 flex min-h-screen items-start px-4 pb-6 pt-8 lg:items-center lg:px-20 lg:py-10">
        <div className="w-full lg:max-w-7xl">
          <div className="relative z-20 w-full rounded-3xl border border-white/20 bg-white/10 p-5 shadow-2xl lg:max-w-2xl lg:border-white/30 lg:bg-white/70 lg:p-8 lg:backdrop-blur-xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.35em] text-sky-700">Assinatura</p>
          <h1 className="text-2xl font-black leading-tight text-slate-900 lg:text-3xl">
            Seu teste de 7 dias terminou
          </h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
            {nomePerfil ? `O perfil "${nomePerfil}" ` : 'Este perfil '}
            está com o período de avaliação encerrado. Escolha um plano para continuar —
            seus dados estão guardados e voltam assim que assinar.
          </p>

          {erro && (
            <div className="mt-5 rounded-xl border border-red-300 bg-red-50/90 px-4 py-3 text-sm font-bold text-red-700">
              {erro}
            </div>
          )}

          {aguardandoPagamento && (
            <div className="mt-5 rounded-xl border border-sky-300 bg-sky-50/90 px-4 py-3 text-sm font-semibold text-sky-900">
              Abrimos o pagamento em outra aba. Depois de concluir (Pix na hora, ou boleto ao compensar), volte aqui e clique em atualizar.
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 h-10 w-full rounded-xl text-sm font-black uppercase tracking-wide text-white shadow transition hover:brightness-110"
                style={{ background: GRADIENTE }}
              >
                Já paguei — atualizar
              </button>
            </div>
          )}

          {/* CPF/CNPJ */}
          <div className="mt-5">
            <label className="mb-1 block text-sm font-semibold text-slate-700">CPF ou CNPJ para a cobrança</label>
            <input
              type="text"
              inputMode="numeric"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(formatarCpfCnpj(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={18}
              className={inputCls}
            />
          </div>

          {/* Planos */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Mensal</p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                R$ 34,90<span className="text-sm font-bold text-slate-500">/mês</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Cancele quando quiser.</p>
              <button
                type="button"
                onClick={() => clicar('mensal')}
                disabled={carregando !== null}
                className="mt-3 h-11 w-full rounded-xl border border-slate-300 bg-white/85 text-sm font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-white active:scale-[0.98] disabled:opacity-50"
              >
                {carregando === 'mensal' ? 'Processando…' : 'Assinar mensal'}
              </button>
            </div>

            <div className="relative rounded-2xl border-2 border-sky-600 bg-white/85 p-4">
              <span className="absolute -top-2.5 left-4 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: GRADIENTE }}>
                2 meses grátis
              </span>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Anual</p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                R$ 29,00<span className="text-sm font-bold text-slate-500">/mês</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">R$ 348,00/ano — economize ~R$ 70.</p>
              <button
                type="button"
                onClick={() => clicar('anual')}
                disabled={carregando !== null}
                className="mt-3 h-11 w-full rounded-xl text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                style={{ background: GRADIENTE }}
              >
                {carregando === 'anual' ? 'Processando…' : 'Assinar anual'}
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onSair}
              className="text-xs font-black uppercase tracking-wide text-slate-500 transition hover:text-slate-800"
            >
              Sair
            </button>
          </div>
          </div>
        </div>
      </section>
    </main>
  );
}
