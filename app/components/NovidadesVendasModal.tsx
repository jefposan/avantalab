'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type Novidade = { id: string; tipo: string; titulo: string; descricao: string; criado_em: string };
type Pasta = { id: string; nome: string; descricao: string | null; criado_em: string };
type Material = {
  id: string; pasta_id: string; titulo: string; tipo: 'imagem' | 'video'; arquivo_path: string;
  arquivo_url: string; miniatura_path: string | null; miniatura_url: string | null; criado_em: string;
};
type Props = { aberto: boolean; empresaId: string | null; nomeEmpresa: string; darkMode: boolean; corPrimaria: string; onFechar: () => void };

const TIPOS = [['lancamento', 'Lançamento'], ['evento', 'Evento'], ['campanha', 'Campanha'], ['promocao', 'Promoção'], ['comunicado', 'Comunicado'], ['aviso', 'Aviso']] as const;
const BUCKET = 'vendas-divulgacao';

function rotuloTipo(tipo: string) { return TIPOS.find(([valor]) => valor === tipo)?.[1] || tipo; }
function nomeSeguro(nome: string) { return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-'); }

function Icone({ tipo, className = 'h-5 w-5' }: { tipo: string; className?: string }) {
  const props = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (tipo === 'folder') return <svg {...props}><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>;
  if (tipo === 'image') return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>;
  if (tipo === 'video') return <svg {...props}><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m17 10 4-2v8l-4-2" /></svg>;
  if (tipo === 'upload') return <svg {...props}><path d="M12 16V4m0 0L7 9m5-5 5 5M4 20h16" /></svg>;
  if (tipo === 'evento') return <svg {...props}><path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" /></svg>;
  if (tipo === 'campanha' || tipo === 'comunicado') return <svg {...props}><path d="m3 11 18-5v12L3 14zM11.6 16.4 13 21H8l-1.5-6" /></svg>;
  if (tipo === 'promocao') return <svg {...props}><path d="M20 12v8H4v-8M2 7h20v5H2zM12 7v13M12 7H7.5A2.5 2.5 0 1 1 10 4.5L12 7Zm0 0h4.5A2.5 2.5 0 1 0 14 4.5L12 7Z" /></svg>;
  if (tipo === 'aviso') return <svg {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>;
  return <svg {...props}><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="9" /></svg>;
}

async function miniaturaVideo(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const limpar = () => { URL.revokeObjectURL(url); video.remove(); };
    video.muted = true; video.playsInline = true; video.preload = 'metadata'; video.src = url;
    video.onloadeddata = () => { video.currentTime = Math.min(0.2, Math.max(0, video.duration / 10)); };
    video.onseeked = () => {
      const escala = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(video.videoWidth * escala)); canvas.height = Math.max(1, Math.round(video.videoHeight * escala));
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => { limpar(); resolve(blob); }, 'image/jpeg', .82);
    };
    video.onerror = () => { limpar(); resolve(null); };
  });
}

export default function NovidadesVendasModal({ aberto, empresaId, nomeEmpresa, darkMode, corPrimaria, onFechar }: Props) {
  const [aba, setAba] = useState<'novidades' | 'divulgacao'>('novidades');
  const [tipo, setTipo] = useState('lancamento'); const [titulo, setTitulo] = useState(''); const [descricao, setDescricao] = useState('');
  const [novidades, setNovidades] = useState<Novidade[]>([]); const [pastas, setPastas] = useState<Pasta[]>([]); const [materiais, setMateriais] = useState<Material[]>([]);
  const [pastaAtiva, setPastaAtiva] = useState<string | null>(null); const [novaPasta, setNovaPasta] = useState(''); const [novaDescricao, setNovaDescricao] = useState('');
  const [carregando, setCarregando] = useState(false); const [salvando, setSalvando] = useState(false); const [erro, setErro] = useState('');
  const inputArquivos = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    if (!empresaId) return;
    setCarregando(true); setErro('');
    const [novidadesRes, pastasRes, materiaisRes] = await Promise.all([
      supabase.from('vendas_mobile_conteudos').select('id, tipo, titulo, descricao, criado_em').eq('empresa_id', empresaId).eq('pagina', 'novidades').order('criado_em', { ascending: false }),
      supabase.from('vendas_mobile_divulgacao_pastas').select('id, nome, descricao, criado_em').eq('empresa_id', empresaId).eq('ativo', true).order('ordem').order('criado_em', { ascending: false }),
      supabase.from('vendas_mobile_divulgacao_materiais').select('id, pasta_id, titulo, tipo, arquivo_path, arquivo_url, miniatura_path, miniatura_url, criado_em').eq('empresa_id', empresaId).eq('ativo', true).order('ordem').order('criado_em', { ascending: false }),
    ]);
    setCarregando(false);
    if (novidadesRes.error) setErro('Não foi possível carregar as novidades.'); else setNovidades((novidadesRes.data || []) as Novidade[]);
    if (pastasRes.error || materiaisRes.error) setErro('A estrutura de Divulgação ainda precisa ser instalada no banco.');
    else { setPastas((pastasRes.data || []) as Pasta[]); setMateriais((materiaisRes.data || []) as Material[]); }
  };

  useEffect(() => { if (aberto && empresaId) void carregar(); }, [aberto, empresaId]);
  if (!aberto) return null;

  const publicar = async () => {
    if (!empresaId || !titulo.trim() || !descricao.trim()) { setErro('Preencha o título e a descrição.'); return; }
    setSalvando(true); setErro('');
    const { data, error } = await supabase.from('vendas_mobile_conteudos').insert({ empresa_id: empresaId, pagina: 'novidades', tipo, titulo: titulo.trim(), descricao: descricao.trim(), ativo: true }).select('id, tipo, titulo, descricao, criado_em').single();
    setSalvando(false); if (error || !data) { setErro('Não foi possível publicar.'); return; }
    setNovidades((atuais) => [data as Novidade, ...atuais]); setTitulo(''); setDescricao('');
  };

  const criarPasta = async () => {
    if (!empresaId || !novaPasta.trim()) { setErro('Informe o nome da pasta.'); return; }
    setSalvando(true); setErro('');
    const { data, error } = await supabase.from('vendas_mobile_divulgacao_pastas').insert({ empresa_id: empresaId, nome: novaPasta.trim(), descricao: novaDescricao.trim() || null }).select('id, nome, descricao, criado_em').single();
    setSalvando(false); if (error || !data) { setErro('Não foi possível criar a pasta.'); return; }
    setPastas((atuais) => [data as Pasta, ...atuais]); setPastaAtiva(data.id); setNovaPasta(''); setNovaDescricao('');
  };

  const enviarArquivos = async (files: FileList | null) => {
    if (!empresaId || !pastaAtiva || !files?.length) return;
    setSalvando(true); setErro('');
    try {
      for (const file of Array.from(files)) {
        const tipoMaterial = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'imagem' : null;
        if (!tipoMaterial) throw new Error(`${file.name}: formato não aceito.`);
        const chave = `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
        const caminho = `${empresaId}/${pastaAtiva}/${chave}-${nomeSeguro(file.name)}`;
        const envio = await supabase.storage.from(BUCKET).upload(caminho, file, { contentType: file.type, cacheControl: '31536000' });
        if (envio.error) throw envio.error;
        const arquivoUrl = supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
        let miniaturaPath: string | null = null; let miniaturaUrl: string | null = tipoMaterial === 'imagem' ? arquivoUrl : null;
        if (tipoMaterial === 'video') {
          const miniatura = await miniaturaVideo(file);
          if (miniatura) {
            miniaturaPath = `${empresaId}/${pastaAtiva}/${chave}-capa.jpg`;
            const capa = await supabase.storage.from(BUCKET).upload(miniaturaPath, miniatura, { contentType: 'image/jpeg', cacheControl: '31536000' });
            if (!capa.error) miniaturaUrl = supabase.storage.from(BUCKET).getPublicUrl(miniaturaPath).data.publicUrl;
          }
        }
        const tituloMaterial = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        const { data, error } = await supabase.from('vendas_mobile_divulgacao_materiais').insert({ empresa_id: empresaId, pasta_id: pastaAtiva, titulo: tituloMaterial, tipo: tipoMaterial, arquivo_path: caminho, arquivo_url: arquivoUrl, miniatura_path: miniaturaPath, miniatura_url: miniaturaUrl, mime_type: file.type, tamanho_bytes: file.size }).select('id, pasta_id, titulo, tipo, arquivo_path, arquivo_url, miniatura_path, miniatura_url, criado_em').single();
        if (error || !data) { await supabase.storage.from(BUCKET).remove([caminho, ...(miniaturaPath ? [miniaturaPath] : [])]); throw error || new Error('Falha ao registrar material.'); }
        setMateriais((atuais) => [data as Material, ...atuais]);
      }
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível enviar os materiais.'); }
    finally { setSalvando(false); if (inputArquivos.current) inputArquivos.current.value = ''; }
  };

  const excluirNovidade = async (item: Novidade) => { if (!window.confirm(`Excluir “${item.titulo}”?`)) return; const { error } = await supabase.from('vendas_mobile_conteudos').delete().eq('id', item.id).eq('empresa_id', empresaId); if (error) setErro('Não foi possível excluir.'); else setNovidades((lista) => lista.filter((i) => i.id !== item.id)); };
  const excluirMaterial = async (item: Material) => { if (!window.confirm(`Excluir “${item.titulo}”?`)) return; const { error } = await supabase.from('vendas_mobile_divulgacao_materiais').delete().eq('id', item.id).eq('empresa_id', empresaId); if (error) { setErro('Não foi possível excluir o material.'); return; } await supabase.storage.from(BUCKET).remove([item.arquivo_path, ...(item.miniatura_path ? [item.miniatura_path] : [])]); setMateriais((lista) => lista.filter((i) => i.id !== item.id)); };
  const excluirPasta = async (pasta: Pasta) => { if (!window.confirm(`Excluir a pasta “${pasta.nome}” e todos os materiais contidos nela?`)) return; const arquivos = materiais.filter((i) => i.pasta_id === pasta.id).flatMap((i) => [i.arquivo_path, ...(i.miniatura_path ? [i.miniatura_path] : [])]); const { error } = await supabase.from('vendas_mobile_divulgacao_pastas').delete().eq('id', pasta.id).eq('empresa_id', empresaId); if (error) { setErro('Não foi possível excluir a pasta.'); return; } if (arquivos.length) await supabase.storage.from(BUCKET).remove(arquivos); setPastas((lista) => lista.filter((i) => i.id !== pasta.id)); setMateriais((lista) => lista.filter((i) => i.pasta_id !== pasta.id)); if (pastaAtiva === pasta.id) setPastaAtiva(null); };

  const fundo = darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'; const campo = darkMode ? 'border-slate-600 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'; const suave = darkMode ? 'text-slate-400' : 'text-slate-500';
  const materiaisAtivos = materiais.filter((item) => item.pasta_id === pastaAtiva);

  return <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/65 px-3 py-5" onClick={onFechar}>
    <section className={`flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${fundo}`} onClick={(e) => e.stopPropagation()}>
      <header className="flex shrink-0 items-center justify-between gap-4 px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${corPrimaria}, #1687D9)` }}><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/70">Vendas Mobile</p><h2 className="mt-1 text-xl font-black">Conteúdo para a equipe</h2><p className="mt-1 text-xs text-white/80">Gerencie novidades e divulgação de {nomeEmpresa || 'este perfil'}.</p></div><button type="button" onClick={onFechar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-black hover:bg-white/25">×</button></header>
      <nav className={`grid shrink-0 grid-cols-2 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><button type="button" onClick={() => setAba('novidades')} className={`h-11 text-xs font-black uppercase ${aba === 'novidades' ? 'text-white' : suave}`} style={aba === 'novidades' ? { backgroundColor: corPrimaria } : undefined}>Novidades</button><button type="button" onClick={() => setAba('divulgacao')} className={`h-11 text-xs font-black uppercase ${aba === 'divulgacao' ? 'text-white' : suave}`} style={aba === 'divulgacao' ? { backgroundColor: corPrimaria } : undefined}>Divulgação</button></nav>
      {erro && <p className="mx-4 mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}
      {aba === 'novidades' ? <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <div className={`self-start rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}><h3 className="text-base font-black">Nova publicação</h3><p className={`mt-1 text-xs ${suave}`}>Aparece somente para vendedores vinculados a este perfil.</p><label className="mt-4 block text-[10px] font-black uppercase opacity-60">Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-bold ${campo}`}>{TIPOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select><label className="mt-3 block text-[10px] font-black uppercase opacity-60">Título</label><input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-bold ${campo}`} /><label className="mt-3 block text-[10px] font-black uppercase opacity-60">Descrição</label><textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} className={`mt-1 w-full rounded-lg border p-3 text-sm ${campo}`} /><button type="button" onClick={() => void publicar()} disabled={salvando} className="mt-3 h-11 w-full rounded-xl text-xs font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{salvando ? 'Publicando...' : 'Publicar novidade'}</button></div>
        <div><h3 className="text-base font-black">Histórico</h3><p className={`text-xs ${suave}`}>Publicações mais recentes primeiro.</p><div className="mt-3 grid gap-2">{carregando ? <p className="py-8 text-center text-sm opacity-60">Carregando...</p> : novidades.length ? novidades.map((item) => <article key={item.id} className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200'}`}><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: corPrimaria }}><Icone tipo={item.tipo} className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><span className="text-[8px] font-black uppercase" style={{ color: corPrimaria }}>{rotuloTipo(item.tipo)}</span><h4 className="text-sm font-black">{item.titulo}</h4></div><button type="button" onClick={() => void excluirNovidade(item)} className="h-8 w-8 shrink-0 rounded-lg border border-red-300 text-red-600">×</button></div><p className={`mt-1 whitespace-pre-wrap text-xs ${suave}`}>{item.descricao}</p></div></div></article>) : <p className="py-8 text-center text-sm opacity-60">Nenhuma novidade publicada.</p>}</div></div>
      </div> : <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={`self-start rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}><h3 className="text-sm font-black">Nova pasta</h3><input value={novaPasta} onChange={(e) => setNovaPasta(e.target.value)} placeholder="Nome da pasta" className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm font-bold ${campo}`} /><input value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} placeholder="Descrição breve (opcional)" className={`mt-2 h-10 w-full rounded-lg border px-3 text-sm ${campo}`} /><button type="button" onClick={() => void criarPasta()} disabled={salvando} className="mt-2 h-10 w-full rounded-lg text-xs font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>Criar pasta</button><div className="mt-4 grid gap-2">{pastas.map((pasta) => <div key={pasta.id} className={`flex items-center gap-2 rounded-lg border p-2 ${pastaAtiva === pasta.id ? 'border-cyan-500 bg-cyan-500/10' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}><button type="button" onClick={() => setPastaAtiva(pasta.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Icone tipo="folder" className="h-5 w-5 shrink-0 text-amber-500" /><span className="min-w-0"><b className="block truncate text-xs">{pasta.nome}</b><small className={`block text-[9px] ${suave}`}>{materiais.filter((i) => i.pasta_id === pasta.id).length} materiais</small></span></button><button type="button" onClick={() => void excluirPasta(pasta)} className="h-7 w-7 shrink-0 rounded-md text-red-500">×</button></div>)}</div></aside>
        <section className="min-w-0"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-black">{pastas.find((p) => p.id === pastaAtiva)?.nome || 'Materiais de divulgação'}</h3><p className={`text-xs ${suave}`}>{pastaAtiva ? 'Envie fotos ou vídeos para esta pasta.' : 'Selecione ou crie uma pasta para começar.'}</p></div>{pastaAtiva && <><input ref={inputArquivos} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={(e) => void enviarArquivos(e.target.files)} /><button type="button" onClick={() => inputArquivos.current?.click()} disabled={salvando} className="flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-black text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}><Icone tipo="upload" className="h-4 w-4" />{salvando ? 'Enviando...' : 'Adicionar'}</button></>}</div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{materiaisAtivos.map((item) => <article key={item.id} className={`group overflow-hidden rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}><div className="relative aspect-square bg-slate-950">{item.miniatura_url ? <img src={item.miniatura_url} alt="" className="h-full w-full object-cover" /> : item.tipo === 'video' ? <video src={item.arquivo_url} preload="metadata" muted className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-slate-500"><Icone tipo="image" /></span>}<span className="absolute bottom-2 left-2 rounded-full bg-black/70 p-1.5 text-white"><Icone tipo={item.tipo === 'video' ? 'video' : 'image'} className="h-3.5 w-3.5" /></span></div><div className="flex items-center gap-2 p-2"><b className="min-w-0 flex-1 truncate text-[11px]">{item.titulo}</b><button type="button" onClick={() => void excluirMaterial(item)} className="h-7 w-7 shrink-0 rounded-md text-red-500">×</button></div></article>)}{pastaAtiva && !materiaisAtivos.length && <p className={`col-span-full rounded-xl border border-dashed px-4 py-12 text-center text-sm ${suave}`}>Esta pasta ainda está vazia.</p>}</div></section>
      </div>}
    </section>
  </div>;
}
