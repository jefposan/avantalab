'use client';

import { useEffect, useState } from 'react';
import DraggableModalCard from './DraggableModalCard';
import type { DadosCobrancaAssinatura } from '../lib/cobranca';

type Props = {
  aberto: boolean;
  nomePerfil: string;
  plano: 'business_pro' | 'business_premium';
  vagasIncluidas: number;
  nomePadrao?: string;
  emailPadrao?: string;
  telefonePadrao?: string;
  onFechar: () => void;
  onContratar: (dados: DadosCobrancaAssinatura) => Promise<{ ok: boolean; url?: string; mensagem?: string }>;
};

export default function PerfilAdicionalPremiumModal({
  aberto, nomePerfil, plano, vagasIncluidas, nomePadrao = '', emailPadrao = '', telefonePadrao = '', onFechar, onContratar,
}: Props) {
  const [nome, setNome] = useState(nomePadrao);
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [email, setEmail] = useState(emailPadrao);
  const [telefone, setTelefone] = useState(telefonePadrao);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!aberto) return;
    setNome(nomePadrao);
    setEmail(emailPadrao);
    setTelefone(telefonePadrao);
    setCpfCnpj('');
    setErro('');
  }, [aberto, emailPadrao, nomePadrao, telefonePadrao]);

  if (!aberto) return null;
  const nomePlano = plano === 'business_pro' ? 'Business Pro' : 'Business Premium';

  const contratar = async () => {
    const dados = {
      nome: nome.trim().replace(/\s+/g, ' '),
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      email: email.trim().toLowerCase(),
      telefone: telefone.replace(/\D/g, ''),
    };
    if (dados.nome.length < 3) return setErro('Informe o nome ou a razão social da cobrança.');
    if (dados.cpfCnpj.length !== 11 && dados.cpfCnpj.length !== 14) return setErro('Informe um CPF ou CNPJ válido para a cobrança.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) return setErro('Informe um e-mail de cobrança válido.');
    if (dados.telefone.length < 10 || dados.telefone.length > 13) return setErro('Informe um telefone válido para a cobrança.');

    // A janela é aberta no gesto do usuário para não ser bloqueada pelo navegador.
    const janela = window.open('', '_blank');
    setProcessando(true);
    setErro('');
    try {
      const resultado = await onContratar(dados);
      if (!resultado.ok) {
        janela?.close();
        setErro(resultado.mensagem || 'Não foi possível preparar a cobrança.');
        return;
      }
      if (resultado.url) {
        if (janela) janela.location.href = resultado.url;
        else window.open(resultado.url, '_blank', 'noopener,noreferrer');
      } else {
        janela?.close();
      }
      onFechar();
    } catch {
      janela?.close();
      setErro('Não foi possível preparar a cobrança agora.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[13050] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !processando) onFechar(); }}>
      <DraggableModalCard className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div data-modal-drag-handle className="shrink-0 bg-[#003E73] px-5 py-4 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">{nomePlano}</p>
          <h2 className="mt-1 text-lg font-black">Adicionar perfil empresarial</h2>
        </div>
        <div className="min-h-0 overflow-y-auto p-5">
          <p className="text-sm font-semibold leading-relaxed text-slate-600">
            As {vagasIncluidas} vagas incluídas já estão em uso. <b className="text-slate-900">{nomePerfil}</b> será um perfil adicional por <b className="text-slate-900">R$ 14,99/mês</b>.
          </p>
          <p className="mt-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-semibold leading-relaxed text-sky-900">
            Esta cobrança é sempre mensal, mesmo que o plano principal seja anual. O perfil será liberado somente após a confirmação do pagamento pela Asaas.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs font-black text-slate-700">Nome ou razão social da cobrança
              <input value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="name" className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20" />
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-700">CPF ou CNPJ
              <input value={cpfCnpj} onChange={(event) => setCpfCnpj(event.target.value)} inputMode="numeric" autoComplete="off" className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20" />
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-700">E-mail de cobrança
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20" />
            </label>
            <label className="grid gap-1 text-xs font-black text-slate-700">Telefone
              <input value={telefone} onChange={(event) => setTelefone(event.target.value)} inputMode="tel" autoComplete="tel" className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20" />
            </label>
          </div>
          {erro && <p role="alert" className="mt-3 text-xs font-bold text-red-700">{erro}</p>}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" disabled={processando} onClick={onFechar} className="h-11 rounded-xl border border-slate-300 px-3 text-xs font-black uppercase text-slate-600 disabled:opacity-50">Cancelar</button>
            <button type="button" disabled={processando} onClick={() => void contratar()} className="h-11 rounded-xl bg-[#003E73] px-3 text-xs font-black uppercase text-white disabled:opacity-50">{processando ? 'Preparando...' : 'Ir para pagamento'}</button>
          </div>
        </div>
      </DraggableModalCard>
    </div>
  );
}
