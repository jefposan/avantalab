'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import CatalogoProdutosVendas from './CatalogoProdutosVendas';

type Novidade = { id: string; tipo: string; titulo: string; descricao: string; criado_em: string };
type Pasta = { id: string; pasta_pai_id: string | null; nome: string; descricao: string | null; criado_em: string };
type Material = {
  id: string; pasta_id: string; titulo: string; tipo: 'imagem' | 'video'; arquivo_path: string;
  arquivo_url: string; miniatura_path: string | null; miniatura_url: string | null;
  miniatura_status: 'nao_aplicavel' | 'pendente' | 'processando' | 'pronta' | 'erro'; criado_em: string;
};
type Props = { aberto: boolean; empresaId: string | null; nomeEmpresa: string; darkMode: boolean; corPrimaria: string; onFechar: () => void };

const TIPOS = [['lancamento', 'Lançamento'], ['evento', 'Evento'], ['campanha', 'Campanha'], ['promocao', 'Promoção'], ['comunicado', 'Comunicado'], ['aviso', 'Aviso']] as const;
const BUCKET = 'vendas-divulgacao';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function rotuloTipo(tipo: string) { return TIPOS.find(([valor]) => valor === tipo)?.[1] || tipo; }
function nomeSeguro(nome: string) { return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-'); }
function formatarNomePasta(nome: string) {
  const normalizado = nome.toLocaleLowerCase('pt-BR');
  return normalizado ? `${normalizado.charAt(0).toLocaleUpperCase('pt-BR')}${normalizado.slice(1)}` : '';
}
function pastasEmArvore(pastas: Pasta[], pai: string | null = null, nivel = 0): Array<{ pasta: Pasta; nivel: number }> {
  return pastas
    .filter((pasta) => (pasta.pasta_pai_id || null) === pai)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .flatMap((pasta) => [{ pasta, nivel }, ...pastasEmArvore(pastas, pasta.id, nivel + 1)]);
}

function pastasVisiveis(pastas: Pasta[], expandidas: Set<string>, pai: string | null = null, nivel = 0): Array<{ pasta: Pasta; nivel: number; temFilhos: boolean; expandida: boolean }> {
  return pastas
    .filter((pasta) => (pasta.pasta_pai_id || null) === pai)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .flatMap((pasta) => {
      const temFilhos = pastas.some((item) => item.pasta_pai_id === pasta.id);
      const expandida = temFilhos && expandidas.has(pasta.id);
      return [
        { pasta, nivel, temFilhos, expandida },
        ...(expandida ? pastasVisiveis(pastas, expandidas, pasta.id, nivel + 1) : []),
      ];
    });
}

function Icone({ tipo, className = 'h-5 w-5' }: { tipo: string; className?: string }) {
  const props = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (tipo === 'folder') return <svg {...props}><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>;
  if (tipo === 'edit') return <svg {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>;
  if (tipo === 'image') return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>;
  if (tipo === 'video') return <svg {...props}><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m17 10 4-2v8l-4-2" /></svg>;
  if (tipo === 'upload') return <svg {...props}><path d="M12 16V4m0 0L7 9m5-5 5 5M4 20h16" /></svg>;
  if (tipo === 'evento') return <svg {...props}><path d="M8 2v4M16 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" /></svg>;
  if (tipo === 'campanha' || tipo === 'comunicado') return <svg {...props}><path d="m3 11 18-5v12L3 14zM11.6 16.4 13 21H8l-1.5-6" /></svg>;
  if (tipo === 'promocao') return <svg {...props}><path d="M20 12v8H4v-8M2 7h20v5H2zM12 7v13M12 7H7.5A2.5 2.5 0 1 1 10 4.5L12 7Zm0 0h4.5A2.5 2.5 0 1 0 14 4.5L12 7Z" /></svg>;
  if (tipo === 'aviso') return <svg {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>;
  return <svg {...props}><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="9" /></svg>;
}

async function uploadCancelavel(caminho: string, arquivo: Blob, nomeArquivo: string, signal: AbortSignal, onProgresso?: (carregado: number, total: number) => void) {
  const sessao = await supabase.auth.getSession();
  const token = sessao.data.session?.access_token;
  if (!token) throw new Error('Sua sessão expirou. Entre novamente para enviar materiais.');
  const formulario = new FormData();
  formulario.append('cacheControl', '31536000');
  formulario.append('', arquivo, nomeArquivo);
  const caminhoSeguro = caminho.split('/').map(encodeURIComponent).join('/');
  await new Promise<void>((resolve, reject) => {
    const requisicao = new XMLHttpRequest();
    let finalizado = false;
    const concluir = (acao: () => void) => {
      if (finalizado) return;
      finalizado = true;
      signal.removeEventListener('abort', cancelar);
      acao();
    };
    const cancelar = () => requisicao.abort();
    requisicao.open('POST', `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminhoSeguro}`);
    requisicao.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    requisicao.setRequestHeader('Authorization', `Bearer ${token}`);
    requisicao.setRequestHeader('x-upsert', 'false');
    requisicao.upload.onprogress = (evento) => {
      if (evento.lengthComputable) onProgresso?.(evento.loaded, evento.total);
    };
    requisicao.onload = () => concluir(() => {
      if (requisicao.status >= 200 && requisicao.status < 300) { resolve(); return; }
      let mensagem = 'Não foi possível enviar o arquivo.';
      try {
        const detalhe = JSON.parse(requisicao.responseText);
        mensagem = String(detalhe?.message || detalhe?.error || mensagem);
      } catch { /* resposta sem JSON */ }
      reject(new Error(mensagem));
    });
    requisicao.onerror = () => concluir(() => reject(new Error('Falha de conexão durante o envio.')));
    requisicao.onabort = () => concluir(() => reject(new DOMException('Envio cancelado.', 'AbortError')));
    if (signal.aborted) {
      concluir(() => reject(new DOMException('Envio cancelado.', 'AbortError')));
      return;
    }
    signal.addEventListener('abort', cancelar, { once: true });
    requisicao.send(formulario);
  });
}

export default function NovidadesVendasModal({ aberto, empresaId, nomeEmpresa, darkMode, corPrimaria, onFechar }: Props) {
  const [aba, setAba] = useState<'novidades' | 'divulgacao' | 'produtos'>('divulgacao');
  const [tipo, setTipo] = useState('lancamento'); const [titulo, setTitulo] = useState(''); const [descricao, setDescricao] = useState('');
  const [novidades, setNovidades] = useState<Novidade[]>([]); const [pastas, setPastas] = useState<Pasta[]>([]); const [materiais, setMateriais] = useState<Material[]>([]);
  const [pastaAtiva, setPastaAtiva] = useState<string | null>(null); const [pastaPaiNova, setPastaPaiNova] = useState(''); const [novaPasta, setNovaPasta] = useState(''); const [novaDescricao, setNovaDescricao] = useState(''); const [pastaEmEdicao, setPastaEmEdicao] = useState<Pasta | null>(null);
  const [criacaoPastaAberta, setCriacaoPastaAberta] = useState(false);
  const [pastasExpandidas, setPastasExpandidas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false); const [salvando, setSalvando] = useState(false); const [erro, setErro] = useState('');
  const [envioAtivo, setEnvioAtivo] = useState<{ nome: string; atual: number; total: number; progresso: number; etapa: string; cancelando: boolean } | null>(null);
  const inputArquivos = useRef<HTMLInputElement>(null);
  const controladorEnvio = useRef<AbortController | null>(null);

  const carregar = async () => {
    if (!empresaId) return;
    setCarregando(true); setErro('');
    const [novidadesRes, pastasRes, materiaisRes] = await Promise.all([
      supabase.from('vendas_mobile_conteudos').select('id, tipo, titulo, descricao, criado_em').eq('empresa_id', empresaId).eq('pagina', 'novidades').order('criado_em', { ascending: false }),
      supabase.from('vendas_mobile_divulgacao_pastas').select('id, pasta_pai_id, nome, descricao, criado_em').eq('empresa_id', empresaId).eq('ativo', true).order('ordem').order('criado_em', { ascending: false }),
      supabase.from('vendas_mobile_divulgacao_materiais').select('id, pasta_id, titulo, tipo, arquivo_path, arquivo_url, miniatura_path, miniatura_url, miniatura_status, criado_em').eq('empresa_id', empresaId).eq('ativo', true).order('ordem').order('criado_em', { ascending: false }),
    ]);
    setCarregando(false);
    if (novidadesRes.error) setErro('Não foi possível carregar as novidades.'); else setNovidades((novidadesRes.data || []) as Novidade[]);
    if (pastasRes.error || materiaisRes.error) setErro('A estrutura de Divulgação ainda precisa ser instalada no banco.');
    else { setPastas((pastasRes.data || []) as Pasta[]); setMateriais((materiaisRes.data || []) as Material[]); }
  };

  useEffect(() => {
    if (!aberto || !empresaId) return;
    setAba('divulgacao');
    setCriacaoPastaAberta(false);
    setPastaEmEdicao(null);
    setPastaPaiNova('');
    setPastasExpandidas(new Set());
    void carregar();
  }, [aberto, empresaId]);

  useEffect(() => {
    if (!aberto || !empresaId) return;
    const canal = supabase
      .channel(`divulgacao-miniaturas-${empresaId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'vendas_mobile_divulgacao_materiais', filter: `empresa_id=eq.${empresaId}`,
      }, (evento) => {
        const atualizado = evento.new as Material;
        setMateriais((atuais) => atuais.map((item) => item.id === atualizado.id ? { ...item, ...atualizado } : item));
      })
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, [aberto, empresaId]);
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
    const pastaPaiId = pastaPaiNova || null;
    setSalvando(true); setErro('');
    const { data, error } = await supabase.from('vendas_mobile_divulgacao_pastas').insert({ empresa_id: empresaId, pasta_pai_id: pastaPaiId, nome: formatarNomePasta(novaPasta.trim()), descricao: novaDescricao.trim() || null }).select('id, pasta_pai_id, nome, descricao, criado_em').single();
    setSalvando(false); if (error || !data) { setErro('Não foi possível criar a pasta.'); return; }
    setPastas((atuais) => [data as Pasta, ...atuais]); setPastaAtiva(data.id);
    if (pastaPaiId) setPastasExpandidas((atuais) => new Set([...atuais, pastaPaiId]));
    setPastaPaiNova(''); setNovaPasta(''); setNovaDescricao(''); setCriacaoPastaAberta(false);
  };

  const salvarNomeDaPasta = async () => {
    if (!pastaEmEdicao || !novaPasta.trim()) { setErro('Informe o nome da pasta.'); return; }
    setSalvando(true); setErro('');
    const nome = formatarNomePasta(novaPasta.trim());
    const { data, error } = await supabase.from('vendas_mobile_divulgacao_pastas').update({ nome }).eq('id', pastaEmEdicao.id).eq('empresa_id', empresaId).select('id, pasta_pai_id, nome, descricao, criado_em').single();
    setSalvando(false);
    if (error || !data) { setErro('Não foi possível atualizar o nome da pasta.'); return; }
    setPastas((atuais) => atuais.map((pasta) => pasta.id === data.id ? data as Pasta : pasta));
    setPastaEmEdicao(null); setNovaPasta(''); setNovaDescricao(''); setCriacaoPastaAberta(false);
  };

  const enviarArquivos = async (files: FileList | null) => {
    if (!empresaId || !pastaAtiva || !files?.length) return;
    const listaArquivos = Array.from(files);
    const controlador = new AbortController();
    const registrosCriados: Material[] = [];
    const caminhosCriados: string[] = [];
    const totalBytes = listaArquivos.reduce((soma, arquivo) => soma + arquivo.size, 0);
    let bytesConcluidos = 0;
    controladorEnvio.current = controlador;
    setSalvando(true); setErro('');
    setEnvioAtivo({ nome: listaArquivos[0].name, atual: 1, total: listaArquivos.length, progresso: 0, etapa: 'Enviando arquivo', cancelando: false });
    try {
      for (const [indice, file] of listaArquivos.entries()) {
        if (controlador.signal.aborted) throw new DOMException('Envio cancelado.', 'AbortError');
        const progressoInicial = totalBytes ? bytesConcluidos / totalBytes * 100 : 0;
        setEnvioAtivo({ nome: file.name, atual: indice + 1, total: listaArquivos.length, progresso: progressoInicial, etapa: 'Enviando arquivo', cancelando: false });
        const tipoMaterial = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'imagem' : null;
        if (!tipoMaterial) throw new Error(`${file.name}: formato não aceito.`);
        const chave = `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
        const caminho = `${empresaId}/${pastaAtiva}/${chave}-${nomeSeguro(file.name)}`;
        const caminhosDesteMaterial = [caminho];
        caminhosCriados.push(caminho);
        try {
          await uploadCancelavel(caminho, file, file.name, controlador.signal, (carregado) => {
            const progresso = totalBytes ? (bytesConcluidos + Math.min(carregado, file.size) * .94) / totalBytes * 100 : 0;
            setEnvioAtivo((atual) => atual ? { ...atual, progresso: Math.min(99, progresso), etapa: 'Enviando arquivo' } : null);
          });
          const progressoConfirmacao = totalBytes ? (bytesConcluidos + file.size * .96) / totalBytes * 100 : 96;
          setEnvioAtivo((atual) => atual ? { ...atual, progresso: Math.min(99, progressoConfirmacao), etapa: 'Registrando material' } : null);
        } catch (e) {
          if (!controlador.signal.aborted) {
            await supabase.storage.from(BUCKET).remove([caminho]);
            caminhosCriados.splice(caminhosCriados.indexOf(caminho), 1);
          }
          throw e;
        }
        const arquivoUrl = supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
        const miniaturaPath: string | null = null;
        const miniaturaUrl: string | null = tipoMaterial === 'imagem' ? arquivoUrl : null;
        const tituloMaterial = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        const { data, error } = await supabase.from('vendas_mobile_divulgacao_materiais').insert({ empresa_id: empresaId, pasta_id: pastaAtiva, titulo: tituloMaterial, tipo: tipoMaterial, arquivo_path: caminho, arquivo_url: arquivoUrl, miniatura_path: miniaturaPath, miniatura_url: miniaturaUrl, mime_type: file.type, tamanho_bytes: file.size }).select('id, pasta_id, titulo, tipo, arquivo_path, arquivo_url, miniatura_path, miniatura_url, miniatura_status, criado_em').abortSignal(controlador.signal).single();
        if (error || !data) { await supabase.storage.from(BUCKET).remove(caminhosDesteMaterial); throw error || new Error('Falha ao registrar material.'); }
        registrosCriados.push(data as Material);
        setMateriais((atuais) => [data as Material, ...atuais]);
        bytesConcluidos += file.size;
        setEnvioAtivo((atual) => atual ? { ...atual, progresso: totalBytes ? bytesConcluidos / totalBytes * 100 : 100, etapa: tipoMaterial === 'video' ? 'Vídeo enviado · preparando capa' : 'Material concluído' } : null);
      }
    } catch (e) {
      if (controlador.signal.aborted) {
        const ids = registrosCriados.map((item) => item.id);
        if (ids.length) await supabase.from('vendas_mobile_divulgacao_materiais').delete().in('id', ids).eq('empresa_id', empresaId);
        if (caminhosCriados.length) await supabase.storage.from(BUCKET).remove([...new Set(caminhosCriados)]);
        if (ids.length) setMateriais((atuais) => atuais.filter((item) => !ids.includes(item.id)));
        setErro('Envio cancelado. Nenhum arquivo deste envio foi mantido.');
      } else setErro(e instanceof Error ? e.message : 'Não foi possível enviar os materiais.');
    } finally {
      controladorEnvio.current = null;
      setEnvioAtivo(null); setSalvando(false);
      if (inputArquivos.current) inputArquivos.current.value = '';
    }
  };

  const cancelarEnvio = () => {
    if (!controladorEnvio.current || !envioAtivo || envioAtivo.cancelando) return;
    setEnvioAtivo((atual) => atual ? { ...atual, cancelando: true } : null);
    controladorEnvio.current.abort();
  };

  const excluirNovidade = async (item: Novidade) => { if (!window.confirm(`Excluir “${item.titulo}”?`)) return; const { error } = await supabase.from('vendas_mobile_conteudos').delete().eq('id', item.id).eq('empresa_id', empresaId); if (error) setErro('Não foi possível excluir.'); else setNovidades((lista) => lista.filter((i) => i.id !== item.id)); };
  const excluirMaterial = async (item: Material) => { if (!window.confirm(`Excluir “${item.titulo}”?`)) return; const { error } = await supabase.from('vendas_mobile_divulgacao_materiais').delete().eq('id', item.id).eq('empresa_id', empresaId); if (error) { setErro('Não foi possível excluir o material.'); return; } await supabase.storage.from(BUCKET).remove([item.arquivo_path, ...(item.miniatura_path ? [item.miniatura_path] : [])]); setMateriais((lista) => lista.filter((i) => i.id !== item.id)); };
  const excluirPasta = async (pasta: Pasta) => { if (!window.confirm(`Excluir a pasta “${pasta.nome}”, suas subpastas e todos os materiais contidos nelas?`)) return; const ids = new Set([pasta.id]); let encontrou = true; while (encontrou) { encontrou = false; pastas.forEach((item) => { if (item.pasta_pai_id && ids.has(item.pasta_pai_id) && !ids.has(item.id)) { ids.add(item.id); encontrou = true; } }); } const arquivos = materiais.filter((i) => ids.has(i.pasta_id)).flatMap((i) => [i.arquivo_path, ...(i.miniatura_path ? [i.miniatura_path] : [])]); const { error } = await supabase.from('vendas_mobile_divulgacao_pastas').delete().eq('id', pasta.id).eq('empresa_id', empresaId); if (error) { setErro('Não foi possível excluir a pasta.'); return; } if (arquivos.length) await supabase.storage.from(BUCKET).remove(arquivos); setPastas((lista) => lista.filter((i) => !ids.has(i.id))); setMateriais((lista) => lista.filter((i) => !ids.has(i.pasta_id))); if (pastaAtiva && ids.has(pastaAtiva)) setPastaAtiva(null); if (pastaPaiNova && ids.has(pastaPaiNova)) setPastaPaiNova(''); };

  const fundo = darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'; const campo = darkMode ? 'border-slate-600 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'; const suave = darkMode ? 'text-slate-400' : 'text-slate-500';
  const materiaisAtivos = materiais.filter((item) => item.pasta_id === pastaAtiva);
  const pastasOrdenadas = pastasEmArvore(pastas);
  const listaPastasVisiveis = pastasVisiveis(pastas, pastasExpandidas);
  const alternarCriacaoPasta = () => {
    if (criacaoPastaAberta) { setCriacaoPastaAberta(false); setPastaEmEdicao(null); return; }
    setPastaEmEdicao(null); setPastaPaiNova(''); setNovaPasta(''); setNovaDescricao(''); setCriacaoPastaAberta(true);
  };
  const iniciarEdicaoPasta = (pasta: Pasta) => {
    setPastaEmEdicao(pasta); setPastaPaiNova(pasta.pasta_pai_id || ''); setNovaPasta(pasta.nome); setNovaDescricao(pasta.descricao || ''); setCriacaoPastaAberta(true);
  };
  const selecionarPasta = (pasta: Pasta, temFilhos: boolean) => {
    setPastaAtiva(pasta.id);
    if (!temFilhos) return;
    setPastasExpandidas((atuais) => {
      const proximas = new Set(atuais);
      if (proximas.has(pasta.id)) proximas.delete(pasta.id); else proximas.add(pasta.id);
      return proximas;
    });
  };

  return <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/65 px-3 py-5" onClick={onFechar}>
    {envioAtivo && <div className="fixed inset-0 z-[6200] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-sm" onClick={(e) => e.stopPropagation()} role="alert" aria-live="assertive">
      <section className={`w-full max-w-sm overflow-hidden rounded-3xl border text-center shadow-2xl ${darkMode ? 'border-slate-600 bg-slate-900 text-white' : 'border-white/80 bg-white text-slate-900'}`}>
        <div className="p-6">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cyan-500/15 text-cyan-500"><span className="h-9 w-9 animate-spin rounded-full border-4 border-cyan-500/25 border-t-cyan-500" /></span>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-cyan-600">Vendas Mobile</p>
          <h3 className="mt-1 text-xl font-black">{envioAtivo.cancelando ? 'Cancelando envio' : envioAtivo.etapa}</h3>
          <p className={`mt-2 truncate text-sm font-bold ${suave}`}>{envioAtivo.nome}</p>
          {envioAtivo.total > 1 && <p className={`mt-1 text-xs ${suave}`}>Arquivo {envioAtivo.atual} de {envioAtivo.total}</p>}
          <div className={`mt-5 h-3 w-full overflow-hidden rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} role="progressbar" aria-label="Progresso do envio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(envioAtivo.progresso)}>
            <span className="block h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-[width] duration-200 ease-out" style={{ width: `${Math.max(1, envioAtivo.progresso)}%` }} />
          </div>
          <p className="mt-2 text-sm font-black text-cyan-600">{Math.round(envioAtivo.progresso)}%</p>
          <p className={`mt-4 text-xs leading-relaxed ${suave}`}>{envioAtivo.cancelando ? 'Interrompendo e removendo os arquivos deste envio.' : envioAtivo.etapa.includes('preparando capa') ? 'O envio terminou. A capa será concluída em segundo plano pelo servidor.' : 'Mantenha esta tela aberta enquanto o material é enviado com segurança.'}</p>
          <button type="button" onClick={cancelarEnvio} disabled={envioAtivo.cancelando} className="mt-5 h-11 w-full rounded-full border border-red-300 bg-red-50 text-xs font-black uppercase text-red-700 transition active:scale-[.98] disabled:opacity-60">{envioAtivo.cancelando ? 'Cancelando...' : 'Cancelar envio'}</button>
        </div>
      </section>
    </div>}
    <section className={`flex max-h-[88dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${fundo}`} onClick={(e) => e.stopPropagation()}>
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 text-white" style={{ background: `linear-gradient(135deg, ${corPrimaria}, #1687D9)` }}><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.18em] text-white/70">Vendas Mobile</p><h2 className="mt-0.5 whitespace-nowrap text-base font-black leading-tight">Conteúdo para a equipe</h2><p className="mt-0.5 truncate whitespace-nowrap text-[10px] leading-tight text-white/80">Novidades e divulgação de {nomeEmpresa || 'este perfil'}.</p></div><button type="button" onClick={onFechar} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-base font-black hover:bg-white/25">×</button></header>
      <nav className={`grid shrink-0 grid-cols-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><button type="button" onClick={() => setAba('novidades')} className={`h-9 text-[10px] font-black uppercase ${aba === 'novidades' ? 'text-white' : suave}`} style={aba === 'novidades' ? { backgroundColor: corPrimaria } : undefined}>Novidades</button><button type="button" onClick={() => setAba('divulgacao')} className={`h-9 text-[10px] font-black uppercase ${aba === 'divulgacao' ? 'text-white' : suave}`} style={aba === 'divulgacao' ? { backgroundColor: corPrimaria } : undefined}>Divulgação</button><button type="button" onClick={() => setAba('produtos')} className={`h-9 text-[10px] font-black uppercase ${aba === 'produtos' ? 'text-white' : suave}`} style={aba === 'produtos' ? { backgroundColor: corPrimaria } : undefined}>Produtos</button></nav>
      {erro && <p className="mx-4 mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}
      {aba === 'novidades' ? <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <div className={`self-start rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}><h3 className="text-base font-black">Nova publicação</h3><p className={`mt-1 text-xs ${suave}`}>Aparece somente para vendedores vinculados a este perfil.</p><label className="mt-4 block text-[10px] font-black uppercase opacity-60">Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-bold ${campo}`}>{TIPOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select><label className="mt-3 block text-[10px] font-black uppercase opacity-60">Título</label><input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-bold ${campo}`} /><label className="mt-3 block text-[10px] font-black uppercase opacity-60">Descrição</label><textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} className={`mt-1 w-full rounded-lg border p-3 text-sm ${campo}`} /><button type="button" onClick={() => void publicar()} disabled={salvando} className="mt-3 h-11 w-full rounded-xl text-xs font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{salvando ? 'Publicando...' : 'Publicar novidade'}</button></div>
        <div><h3 className="text-base font-black">Histórico</h3><p className={`text-xs ${suave}`}>Publicações mais recentes primeiro.</p><div className="mt-3 grid gap-2">{carregando ? <p className="py-8 text-center text-sm opacity-60">Carregando...</p> : novidades.length ? novidades.map((item) => <article key={item.id} className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200'}`}><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: corPrimaria }}><Icone tipo={item.tipo} className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><span className="text-[8px] font-black uppercase" style={{ color: corPrimaria }}>{rotuloTipo(item.tipo)}</span><h4 className="text-sm font-black">{item.titulo}</h4></div><button type="button" onClick={() => void excluirNovidade(item)} className="h-8 w-8 shrink-0 rounded-lg border border-red-300 text-red-600">×</button></div><p className={`mt-1 whitespace-pre-wrap text-xs ${suave}`}>{item.descricao}</p></div></div></article>) : <p className="py-8 text-center text-sm opacity-60">Nenhuma novidade publicada.</p>}</div></div>
      </div> : aba === 'produtos' ? <CatalogoProdutosVendas empresaId={empresaId || ''} darkMode={darkMode} corPrimaria={corPrimaria} /> : <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:overflow-hidden">
        <aside className={`self-start rounded-xl border p-3 lg:flex lg:h-full lg:min-h-0 lg:flex-col ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
          <button type="button" onClick={alternarCriacaoPasta} className="flex h-9 w-full items-center justify-between rounded-lg px-3 text-xs font-black uppercase text-white" style={{ backgroundColor: corPrimaria }}><span>{criacaoPastaAberta ? pastaEmEdicao ? 'Cancelar edição' : 'Recolher criação' : 'Criar pasta'}</span><span className={`text-lg leading-none transition-transform ${criacaoPastaAberta ? 'rotate-45' : ''}`}>+</span></button>
          {criacaoPastaAberta && <div className={`mt-2 rounded-lg border p-2.5 ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
            {!pastaEmEdicao && <><label className={`block text-[9px] font-black uppercase ${suave}`}>Criar dentro de</label><select value={pastaPaiNova} onChange={(e) => setPastaPaiNova(e.target.value)} className={`mt-1 h-9 w-full rounded-lg border px-2.5 text-xs font-bold ${campo}`}><option value="">Pastas principais</option>{pastasOrdenadas.map(({ pasta, nivel }) => <option key={pasta.id} value={pasta.id}>{`${'— '.repeat(nivel + 1)}${pasta.nome}`}</option>)}</select></>}
            <label className={`block text-[9px] font-black uppercase ${pastaEmEdicao ? '' : 'mt-2'} ${suave}`}>Nome da {pastaEmEdicao ? 'pasta' : pastaPaiNova ? 'subpasta' : 'pasta'}</label>
            <input value={novaPasta} onChange={(e) => setNovaPasta(formatarNomePasta(e.target.value))} placeholder="Nome da pasta" className={`mt-1 h-9 w-full rounded-lg border px-2.5 text-xs font-bold ${campo}`} />
            {!pastaEmEdicao && <input value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} placeholder="Descrição breve (opcional)" className={`mt-2 h-9 w-full rounded-lg border px-2.5 text-xs ${campo}`} />}
            <button type="button" onClick={() => void (pastaEmEdicao ? salvarNomeDaPasta() : criarPasta())} disabled={salvando} className="mt-2 h-9 w-full rounded-lg text-[11px] font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{pastaEmEdicao ? 'Salvar nome' : `Criar ${pastaPaiNova ? 'subpasta' : 'pasta'}`}</button>
          </div>}
          <div className="mt-3 grid gap-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
            {listaPastasVisiveis.map(({ pasta, nivel, temFilhos, expandida }) => <div key={pasta.id} style={{ marginLeft: `${Math.min(nivel, 4) * 12}px` }} className={`flex items-center gap-1.5 rounded-lg border p-2 ${pastaAtiva === pasta.id ? 'border-cyan-500 bg-cyan-500/10' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}><button type="button" onClick={() => selecionarPasta(pasta, temFilhos)} aria-expanded={temFilhos ? expandida : undefined} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Icone tipo="folder" className="h-5 w-5 shrink-0 text-amber-500" /><span className="min-w-0 flex-1"><b className="block truncate text-xs">{pasta.nome}</b><small className={`block text-[9px] ${suave}`}>{materiais.filter((i) => i.pasta_id === pasta.id).length} materiais · {pastas.filter((i) => i.pasta_pai_id === pasta.id).length} subpastas</small></span>{temFilhos && <span className={`shrink-0 text-base transition-transform ${expandida ? 'rotate-90' : ''}`} aria-hidden="true">›</span>}</button><button type="button" onClick={() => iniciarEdicaoPasta(pasta)} aria-label={`Editar nome da pasta ${pasta.nome}`} title="Editar nome" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-cyan-600 hover:bg-cyan-500/10"><Icone tipo="edit" className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void excluirPasta(pasta)} aria-label={`Excluir pasta ${pasta.nome}`} title="Excluir pasta" className="h-8 w-8 shrink-0 rounded-md text-red-500 hover:bg-red-500/10">×</button></div>)}
            {!listaPastasVisiveis.length && <p className={`py-3 text-center text-xs ${suave}`}>Nenhuma pasta criada.</p>}
          </div>
        </aside>
        <section className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-1"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-black">{pastas.find((p) => p.id === pastaAtiva)?.nome || 'Materiais de divulgação'}</h3><p className={`text-xs ${suave}`}>{pastaAtiva ? 'Envie fotos ou vídeos para esta pasta.' : 'Selecione ou crie uma pasta para começar.'}</p></div>{pastaAtiva && <><input ref={inputArquivos} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={(e) => void enviarArquivos(e.target.files)} /><button type="button" onClick={() => inputArquivos.current?.click()} disabled={salvando} className="flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-black text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}><Icone tipo="upload" className="h-4 w-4" />{salvando ? 'Enviando...' : 'Adicionar'}</button></>}</div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{materiaisAtivos.map((item) => <article key={item.id} className={`group overflow-hidden rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}><div className="relative aspect-square bg-slate-950">{item.miniatura_url ? <img src={item.miniatura_url} alt="" className="h-full w-full object-cover" /> : item.tipo === 'video' ? <span className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-slate-300"><span className={`h-7 w-7 rounded-full border-2 border-cyan-400/25 ${item.miniatura_status === 'erro' ? '' : 'animate-spin border-t-cyan-400'}`} /><b className="text-[10px] uppercase tracking-wide">{item.miniatura_status === 'erro' ? 'Capa indisponível' : 'Preparando capa'}</b></span> : <span className="flex h-full items-center justify-center text-slate-500"><Icone tipo="image" /></span>}<span className="absolute bottom-2 left-2 rounded-full bg-black/70 p-1.5 text-white"><Icone tipo={item.tipo === 'video' ? 'video' : 'image'} className="h-3.5 w-3.5" /></span></div><div className="flex items-center gap-2 p-2"><b className="min-w-0 flex-1 truncate text-[11px]">{item.titulo}</b><button type="button" onClick={() => void excluirMaterial(item)} className="h-7 w-7 shrink-0 rounded-md text-red-500">×</button></div></article>)}{pastaAtiva && !materiaisAtivos.length && <p className={`col-span-full rounded-xl border border-dashed px-4 py-12 text-center text-sm ${suave}`}>Esta pasta ainda está vazia.</p>}</div></section>
      </div>}
    </section>
  </div>;
}
