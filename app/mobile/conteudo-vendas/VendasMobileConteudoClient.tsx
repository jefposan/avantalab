'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NovidadesVendasModal from '../../components/NovidadesVendasModal';
import { supabase } from '../../lib/supabase';

export default function VendasMobileConteudoClient({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [permitido, setPermitido] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [erro, setErro] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [progresso, setProgresso] = useState(8);

  useEffect(() => {
    if (!carregando) return;
    const timer = window.setInterval(() => setProgresso((atual) => Math.min(92, atual + Math.max(1, Math.round((94 - atual) / 7)))), 260);
    return () => window.clearInterval(timer);
  }, [carregando]);

  useEffect(() => {
    setDarkMode(localStorage.getItem('avantalab_mobile_dark') === '1');
    let ativo = true;
    void (async () => {
      if (!empresaId) { setErro('Perfil não informado.'); setCarregando(false); return; }
      const usuario = await supabase.auth.getUser();
      if (!usuario.data.user) { router.replace('/mobile'); return; }
      const [modulo, acesso, empresa] = await Promise.all([
        supabase.from('empresa_modulos').select('modulo_id').eq('empresa_id', empresaId).eq('modulo_id', 'vendas_mobile').eq('ativo', true).maybeSingle(),
        supabase.from('usuarios_empresa').select('perfil, status').eq('empresa_id', empresaId).eq('user_id', usuario.data.user.id).eq('status', 'ativo').maybeSingle(),
        supabase.from('empresas').select('*').eq('id', empresaId).maybeSingle(),
      ]);
      if (!ativo) return;
      const perfil = String(acesso.data?.perfil || '');
      const temPermissao = Boolean(modulo.data && ['gestor_master', 'administrador'].includes(perfil));
      setNomeEmpresa(String(empresa.data?.nome_empresa || empresa.data?.nome || 'Perfil atual'));
      setPermitido(temPermissao);
      if (!temPermissao) setErro('O módulo Vendas Mobile não está instalado neste perfil ou seu acesso não permite publicar conteúdos.');
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, [empresaId, router]);

  const voltar = () => router.replace('/mobile');

  if (carregando || !permitido) return <main className={`fixed inset-0 grid place-items-center px-5 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}><section className={`w-full max-w-sm rounded-3xl border p-6 text-center shadow-xl ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}><p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-600">Vendas Mobile</p><h1 className="mt-2 text-xl font-black">{carregando ? 'Preparando conteúdo' : 'Acesso indisponível'}</h1><p className={`mt-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>{carregando ? 'Verificando o perfil e carregando seus materiais.' : erro}</p>{carregando && <><div className={`mt-4 h-2 overflow-hidden rounded-full ${darkMode ? 'bg-white/15' : 'bg-slate-900/10'}`} aria-label="Carregando conteúdo"><i className="block h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-500 transition-[width] duration-200" style={{ width: `${progresso}%` }} /></div><b className="mt-1 block text-[11px] font-black text-cyan-600">{progresso}%</b></>}{!carregando && <button type="button" onClick={voltar} className="mt-5 h-11 w-full rounded-full bg-cyan-700 text-xs font-black uppercase text-white">Voltar ao início</button>}</section></main>;

  return <main className={darkMode ? 'min-h-screen bg-slate-950' : 'min-h-screen bg-slate-100'}><NovidadesVendasModal aberto empresaId={empresaId} nomeEmpresa={nomeEmpresa} darkMode={darkMode} corPrimaria="#003E73" onFechar={voltar} /></main>;
}
