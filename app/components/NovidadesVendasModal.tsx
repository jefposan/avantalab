'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Novidade = {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  criado_em: string;
};

type Props = {
  aberto: boolean;
  empresaId: string | null;
  nomeEmpresa: string;
  darkMode: boolean;
  corPrimaria: string;
  onFechar: () => void;
};

const TIPOS = [
  ['lancamento', 'Lançamento'],
  ['evento', 'Evento'],
  ['campanha', 'Campanha'],
  ['promocao', 'Promoção'],
  ['comunicado', 'Comunicado'],
  ['aviso', 'Aviso'],
] as const;

function rotuloTipo(tipo: string) {
  return TIPOS.find(([valor]) => valor === tipo)?.[1] || tipo;
}

function Icone({ tipo, className = 'h-5 w-5' }: { tipo: string; className?: string }) {
  const props = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (tipo === 'evento') return <svg {...props}><path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" /></svg>;
  if (tipo === 'campanha' || tipo === 'comunicado') return <svg {...props}><path d="m3 11 18-5v12L3 14zM11.6 16.4 13 21H8l-1.5-6" /></svg>;
  if (tipo === 'promocao') return <svg {...props}><path d="M20 12v8H4v-8M2 7h20v5H2zM12 7v13M12 7H7.5A2.5 2.5 0 1 1 10 4.5L12 7Zm0 0h4.5A2.5 2.5 0 1 0 14 4.5L12 7Z" /></svg>;
  if (tipo === 'aviso') return <svg {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>;
  return <svg {...props}><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="9" /></svg>;
}

export default function NovidadesVendasModal({ aberto, empresaId, nomeEmpresa, darkMode, corPrimaria, onFechar }: Props) {
  const [tipo, setTipo] = useState('lancamento');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [novidades, setNovidades] = useState<Novidade[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!aberto || !empresaId) return;
    let ativo = true;
    setCarregando(true);
    setErro('');
    void supabase.from('vendas_mobile_conteudos').select('id, tipo, titulo, descricao, criado_em').eq('empresa_id', empresaId).eq('pagina', 'novidades').order('criado_em', { ascending: false }).then(({ data, error }) => {
      if (!ativo) return;
      setCarregando(false);
      if (error) { setErro('Não foi possível carregar as novidades. Verifique se a atualização do banco foi aplicada.'); return; }
      setNovidades((data || []) as Novidade[]);
    });
    return () => { ativo = false; };
  }, [aberto, empresaId]);

  if (!aberto) return null;

  const publicar = async () => {
    if (!empresaId || !titulo.trim() || !descricao.trim()) { setErro('Preencha o título e a descrição.'); return; }
    setSalvando(true);
    setErro('');
    const { data, error } = await supabase.from('vendas_mobile_conteudos').insert({ empresa_id: empresaId, pagina: 'novidades', tipo, titulo: titulo.trim(), descricao: descricao.trim(), ativo: true }).select('id, tipo, titulo, descricao, criado_em').single();
    setSalvando(false);
    if (error || !data) { setErro('Não foi possível publicar. Somente gestores e administradores do perfil podem cadastrar novidades.'); return; }
    setNovidades((atuais) => [data as Novidade, ...atuais]);
    setTitulo('');
    setDescricao('');
  };

  const excluir = async (novidade: Novidade) => {
    if (!window.confirm(`Excluir “${novidade.titulo}” das Novidades do Vendas?`)) return;
    const { error } = await supabase.from('vendas_mobile_conteudos').delete().eq('id', novidade.id).eq('empresa_id', empresaId);
    if (error) { setErro('Não foi possível excluir a novidade.'); return; }
    setNovidades((atuais) => atuais.filter((item) => item.id !== novidade.id));
  };

  const fundo = darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900';
  const campo = darkMode ? 'border-slate-600 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900';

  return <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/65 px-3 py-5" onClick={onFechar}>
    <section className={`flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${fundo}`} onClick={(event) => event.stopPropagation()}>
      <header className="flex shrink-0 items-center justify-between gap-4 px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${corPrimaria}, #1687D9)` }}>
        <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">Vendas AvantaLab</p><h2 className="mt-1 text-xl font-black">Novidades da empresa</h2><p className="mt-1 text-xs text-white/80">Publique lançamentos, eventos e comunicados para os vendedores vinculados a {nomeEmpresa || 'este perfil'}.</p></div>
        <button type="button" onClick={onFechar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-black hover:bg-white/25">×</button>
      </header>
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <div className={`self-start rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
          <h3 className="text-base font-black">Nova publicação</h3><p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Este conteúdo aparecerá somente para vendedores vinculados a este perfil.</p>
          <label className="mt-4 block text-[10px] font-black uppercase opacity-60">Tipo</label><div className="mt-1 flex gap-2"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: corPrimaria }}><Icone tipo={tipo} className="h-4 w-4" /></span><select value={tipo} onChange={(event) => setTipo(event.target.value)} className={`h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm font-bold outline-none ${campo}`}>{TIPOS.map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></div>
          <label className="mt-3 block text-[10px] font-black uppercase opacity-60">Título</label><input value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength={120} placeholder="Ex.: Nova coleção disponível" className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-bold outline-none ${campo}`} />
          <label className="mt-3 block text-[10px] font-black uppercase opacity-60">Descrição</label><textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} maxLength={2000} rows={5} placeholder="Informe os detalhes para sua equipe de vendas..." className={`mt-1 w-full resize-y rounded-lg border p-3 text-sm outline-none ${campo}`} />
          {erro && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}
          <button type="button" onClick={() => void publicar()} disabled={salvando} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}><Icone tipo={tipo} className="h-4 w-4" />{salvando ? 'Publicando...' : 'Publicar novidade'}</button>
        </div>
        <div className="min-w-0"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-base font-black">Histórico</h3><p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Publicações mais recentes primeiro.</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-black ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>{novidades.length}</span></div>
          {carregando ? <p className="py-10 text-center text-sm opacity-60">Carregando...</p> : novidades.length === 0 ? <div className={`rounded-xl border border-dashed px-4 py-10 text-center text-sm ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}>Nenhuma novidade publicada por esta empresa.</div> : <div className="grid gap-2">{novidades.map((novidade) => <article key={novidade.id} className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: corPrimaria }}><Icone tipo={novidade.tipo} className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><span className="text-[8px] font-black uppercase tracking-wide" style={{ color: corPrimaria }}>{rotuloTipo(novidade.tipo)}</span><h4 className="truncate text-sm font-black">{novidade.titulo}</h4></div><button type="button" onClick={() => void excluir(novidade)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-300 text-red-600 hover:bg-red-50" aria-label="Excluir novidade"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" /></svg></button></div><p className={`mt-1 whitespace-pre-wrap text-xs leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{novidade.descricao}</p><time className="mt-2 block text-[9px] font-bold opacity-50">{new Date(novidade.criado_em).toLocaleString('pt-BR')}</time></div></div></article>)}</div>}
        </div>
      </div>
    </section>
  </div>;
}
