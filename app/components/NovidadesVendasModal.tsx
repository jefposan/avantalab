'use client';

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import CatalogoProdutosVendas from './CatalogoProdutosVendas';
import ModalConfirmacao from './ModalConfirmacao';

type Novidade = { id: string; tipo: string; titulo: string; descricao: string; criado_em: string };
type Pasta = { id: string; pasta_pai_id: string | null; capa_material_id: string | null; nome: string; descricao: string | null; criado_em: string };
type Material = {
  id: string; pasta_id: string; titulo: string; tipo: 'imagem' | 'video' | 'pdf'; arquivo_path: string;
  arquivo_url: string; miniatura_path: string | null; miniatura_url: string | null;
  miniatura_status: 'nao_aplicavel' | 'pendente' | 'processando' | 'pronta' | 'erro';
  arquivo_hash: string | null; tamanho_bytes: number | null; criado_em: string;
};
type Props = { aberto: boolean; empresaId: string | null; nomeEmpresa: string; darkMode: boolean; corPrimaria: string; onFechar: () => void };
type ExclusaoPendente =
  | { tipo: 'novidade'; item: Novidade }
  | { tipo: 'material'; item: Material }
  | { tipo: 'pasta'; item: Pasta };

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
async function calcularHashSha256(arquivo: Blob) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Este navegador não oferece a verificação segura de arquivos duplicados.');
  }
  const resumo = await globalThis.crypto.subtle.digest('SHA-256', await arquivo.arrayBuffer());
  return Array.from(new Uint8Array(resumo), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function erroDeArquivoDuplicado(erro: unknown) {
  return Boolean(erro && typeof erro === 'object' && 'code' in erro && erro.code === '23505');
}
function resumirNomesArquivos(nomes: string[]) {
  const limite = 3;
  const visiveis = nomes.slice(0, limite).join(', ');
  return nomes.length > limite ? `${visiveis} e mais ${nomes.length - limite}` : visiveis;
}
function aguardarPinturaDaInterface() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
function tipoMaterialArquivo(arquivo: File): Material['tipo'] | null {
  const nome = arquivo.name.toLocaleLowerCase('pt-BR');
  if (arquivo.type === 'application/pdf' || nome.endsWith('.pdf')) return 'pdf';
  if (arquivo.type.startsWith('video/')) return 'video';
  if (arquivo.type.startsWith('image/')) return 'imagem';
  return null;
}
function rotuloMaterial(tipo: Material['tipo']) {
  return tipo === 'video' ? 'Vídeo' : tipo === 'pdf' ? 'PDF' : 'Imagem';
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

function contarMateriaisNaArvore(pastaId: string, pastas: Pasta[], materiais: Material[]) {
  const pastasIncluidas = new Set([pastaId]);
  const pendentes = [pastaId];
  while (pendentes.length) {
    const pastaAtual = pendentes.pop();
    pastas.forEach((pasta) => {
      if (pasta.pasta_pai_id !== pastaAtual || pastasIncluidas.has(pasta.id)) return;
      pastasIncluidas.add(pasta.id);
      pendentes.push(pasta.id);
    });
  }
  return materiais.filter((material) => pastasIncluidas.has(material.pasta_id)).length;
}

function idsSubpastasDaPasta(pastaId: string, pastas: Pasta[]) {
  const ids = new Set<string>();
  const pendentes = [pastaId];
  while (pendentes.length) {
    const pastaAtual = pendentes.pop();
    pastas.forEach((pasta) => {
      if (pasta.pasta_pai_id !== pastaAtual || ids.has(pasta.id)) return;
      ids.add(pasta.id);
      pendentes.push(pasta.id);
    });
  }
  return ids;
}

function pastaDescendeDaSelecionada(pastaId: string, pastaSelecionadaId: string | null, pastas: Pasta[]) {
  if (!pastaSelecionadaId || pastaId === pastaSelecionadaId) return false;
  const pastasPorId = new Map(pastas.map((pasta) => [pasta.id, pasta]));
  const visitadas = new Set<string>();
  let pastaAtual = pastasPorId.get(pastaId);
  while (pastaAtual?.pasta_pai_id && !visitadas.has(pastaAtual.id)) {
    if (pastaAtual.pasta_pai_id === pastaSelecionadaId) return true;
    visitadas.add(pastaAtual.id);
    pastaAtual = pastasPorId.get(pastaAtual.pasta_pai_id);
  }
  return false;
}

function Icone({ tipo, className = 'h-5 w-5' }: { tipo: string; className?: string }) {
  const props = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (tipo === 'folder') return <svg {...props}><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>;
  if (tipo === 'edit') return <svg {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>;
  if (tipo === 'image') return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>;
  if (tipo === 'video') return <svg {...props}><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m17 10 4-2v8l-4-2" /></svg>;
  if (tipo === 'pdf') return <svg {...props}><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M8.5 15h7M8.5 18h5" /></svg>;
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
  const [resultadoEnvio, setResultadoEnvio] = useState<{ tipo: 'sucesso' | 'aviso'; mensagem: string } | null>(null);
  const [exclusaoPendente, setExclusaoPendente] = useState<ExclusaoPendente | null>(null);
  const [materialEmVisualizacao, setMaterialEmVisualizacao] = useState<Material | null>(null);
  const [pastaCapaEmEdicao, setPastaCapaEmEdicao] = useState<Pasta | null>(null);
  const [salvandoCapa, setSalvandoCapa] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [envioAtivo, setEnvioAtivo] = useState<{ nome: string; atual: number; total: number; progresso: number; etapa: string; cancelando: boolean } | null>(null);
  const [seletorArquivosAberto, setSeletorArquivosAberto] = useState(false);
  const inputArquivos = useRef<HTMLInputElement>(null);
  const inputFotosVideos = useRef<HTMLInputElement>(null);
  const inputCamera = useRef<HTMLInputElement>(null);
  const inputPdf = useRef<HTMLInputElement>(null);
  const controladorEnvio = useRef<AbortController | null>(null);
  const gestoVisualizacao = useRef<{ x: number; y: number; pointerId: number } | null>(null);

  const carregar = async () => {
    if (!empresaId) return;
    setCarregando(true); setErro('');
    const [novidadesRes, pastasRes, materiaisRes] = await Promise.all([
      supabase.from('vendas_mobile_conteudos').select('id, tipo, titulo, descricao, criado_em').eq('empresa_id', empresaId).eq('pagina', 'novidades').order('criado_em', { ascending: false }),
      supabase.from('vendas_mobile_divulgacao_pastas').select('id, pasta_pai_id, capa_material_id, nome, descricao, criado_em').eq('empresa_id', empresaId).eq('ativo', true).order('ordem').order('criado_em', { ascending: false }),
      supabase.from('vendas_mobile_divulgacao_materiais').select('id, pasta_id, titulo, tipo, arquivo_path, arquivo_url, miniatura_path, miniatura_url, miniatura_status, arquivo_hash, tamanho_bytes, criado_em').eq('empresa_id', empresaId).eq('ativo', true).order('ordem').order('criado_em', { ascending: false }),
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
    setResultadoEnvio(null);
    setMaterialEmVisualizacao(null);
    setPastaCapaEmEdicao(null);
    void carregar();
  }, [aberto, empresaId]);

  useEffect(() => {
    if (!materialEmVisualizacao) return;
    const fecharComEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMaterialEmVisualizacao(null);
    };
    window.addEventListener('keydown', fecharComEsc);
    return () => window.removeEventListener('keydown', fecharComEsc);
  }, [materialEmVisualizacao]);

  useEffect(() => {
    const input = inputArquivos.current;
    if (!input || !pastaAtiva) return;
    const abrirSeletor = (evento: MouseEvent) => {
      evento.preventDefault();
      setSeletorArquivosAberto(true);
    };
    input.addEventListener('click', abrirSeletor);
    return () => input.removeEventListener('click', abrirSeletor);
  }, [pastaAtiva]);

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
    const { data, error } = await supabase.from('vendas_mobile_divulgacao_pastas').insert({ empresa_id: empresaId, pasta_pai_id: pastaPaiId, nome: formatarNomePasta(novaPasta.trim()), descricao: novaDescricao.trim() || null }).select('id, pasta_pai_id, capa_material_id, nome, descricao, criado_em').single();
    setSalvando(false); if (error || !data) { setErro('Não foi possível criar a pasta.'); return; }
    setPastas((atuais) => [data as Pasta, ...atuais]); setPastaAtiva(data.id);
    if (pastaPaiId) setPastasExpandidas((atuais) => new Set([...atuais, pastaPaiId]));
    setPastaPaiNova(''); setNovaPasta(''); setNovaDescricao(''); setCriacaoPastaAberta(false);
  };

  const salvarNomeDaPasta = async () => {
    if (!pastaEmEdicao || !novaPasta.trim()) { setErro('Informe o nome da pasta.'); return; }
    setSalvando(true); setErro('');
    const nome = formatarNomePasta(novaPasta.trim());
    const { data, error } = await supabase.from('vendas_mobile_divulgacao_pastas').update({ nome }).eq('id', pastaEmEdicao.id).eq('empresa_id', empresaId).select('id, pasta_pai_id, capa_material_id, nome, descricao, criado_em').single();
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
    const duplicados: string[] = [];
    const falhas: string[] = [];
    const totalBytes = listaArquivos.reduce((soma, arquivo) => soma + arquivo.size, 0);
    let bytesConcluidos = 0;
    let enviados = 0;
    controladorEnvio.current = controlador;
    setSalvando(true); setErro(''); setResultadoEnvio(null);
    setEnvioAtivo({ nome: listaArquivos[0].name, atual: 1, total: listaArquivos.length, progresso: 1, etapa: 'Preparando arquivos para envio', cancelando: false });
    try {
      await aguardarPinturaDaInterface();
      if (controlador.signal.aborted) throw new DOMException('Envio cancelado.', 'AbortError');
      setEnvioAtivo((atual) => atual ? { ...atual, progresso: 2, etapa: 'Verificando duplicidade' } : null);
      const { data: existentesData, error: erroExistentes } = await supabase
        .from('vendas_mobile_divulgacao_materiais')
        .select('id, pasta_id, titulo, tipo, arquivo_path, arquivo_url, miniatura_path, miniatura_url, miniatura_status, arquivo_hash, tamanho_bytes, criado_em')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .abortSignal(controlador.signal);
      if (erroExistentes) throw new Error('Não foi possível verificar os arquivos já publicados.');

      const existentes = (existentesData || []) as Material[];
      const materiaisPorHash = new Map(
        existentes
          .filter((item) => item.arquivo_hash)
          .map((item) => [item.arquivo_hash as string, item]),
      );
      const materiaisSemHashPorTamanho = new Map<number, Material[]>();
      existentes.forEach((item) => {
        if (item.arquivo_hash || item.tamanho_bytes == null) return;
        const tamanho = Number(item.tamanho_bytes);
        materiaisSemHashPorTamanho.set(tamanho, [...(materiaisSemHashPorTamanho.get(tamanho) || []), item]);
      });

      for (const [indice, file] of listaArquivos.entries()) {
        if (controlador.signal.aborted) throw new DOMException('Envio cancelado.', 'AbortError');
        const progressoInicial = Math.max(2, totalBytes ? bytesConcluidos / totalBytes * 100 : 0);
        setEnvioAtivo({ nome: file.name, atual: indice + 1, total: listaArquivos.length, progresso: progressoInicial, etapa: 'Verificando duplicidade', cancelando: false });
        const tipoMaterial = tipoMaterialArquivo(file);
        if (!tipoMaterial) {
          falhas.push(`${file.name}: formato não aceito`);
          bytesConcluidos += file.size;
          continue;
        }

        let arquivoHash = '';
        try {
          arquivoHash = await calcularHashSha256(file);
        } catch (e) {
          if (controlador.signal.aborted) throw e;
          falhas.push(`${file.name}: não foi possível verificar o conteúdo`);
          bytesConcluidos += file.size;
          continue;
        }

        let materialDuplicado = materiaisPorHash.get(arquivoHash) || null;
        const candidatosAntigos = materiaisSemHashPorTamanho.get(file.size) || [];
        let verificacaoAntigaFalhou = false;
        while (!materialDuplicado && candidatosAntigos.length) {
          if (controlador.signal.aborted) throw new DOMException('Envio cancelado.', 'AbortError');
          const candidato = candidatosAntigos.shift() as Material;
          try {
            const resposta = await fetch(candidato.arquivo_url, { signal: controlador.signal, cache: 'force-cache' });
            if (!resposta.ok) throw new Error('Não foi possível ler um material já publicado.');
            const hashExistente = await calcularHashSha256(await resposta.blob());
            candidato.arquivo_hash = hashExistente;
            materiaisPorHash.set(hashExistente, candidato);
            const { error: erroAtualizacaoHash } = await supabase
              .from('vendas_mobile_divulgacao_materiais')
              .update({ arquivo_hash: hashExistente })
              .eq('id', candidato.id)
              .eq('empresa_id', empresaId)
              .is('arquivo_hash', null)
              .abortSignal(controlador.signal);
            if (erroAtualizacaoHash && !erroDeArquivoDuplicado(erroAtualizacaoHash)) {
              throw erroAtualizacaoHash;
            }
            if (hashExistente === arquivoHash) materialDuplicado = candidato;
          } catch (e) {
            if (controlador.signal.aborted) throw e;
            candidatosAntigos.unshift(candidato);
            verificacaoAntigaFalhou = true;
            break;
          }
        }
        materiaisSemHashPorTamanho.set(file.size, candidatosAntigos);

        if (!materialDuplicado && verificacaoAntigaFalhou) {
          falhas.push(`${file.name}: não foi possível comparar com um material antigo`);
          bytesConcluidos += file.size;
          continue;
        }

        if (materialDuplicado) {
          duplicados.push(file.name);
          bytesConcluidos += file.size;
          setEnvioAtivo((atual) => atual ? {
            ...atual,
            progresso: totalBytes ? bytesConcluidos / totalBytes * 100 : 100,
            etapa: 'Duplicado ignorado',
          } : null);
          continue;
        }

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
            await supabase.storage.from(BUCKET).remove(caminhosDesteMaterial);
            caminhosDesteMaterial.forEach((caminhoCriado) => {
              const indiceCriado = caminhosCriados.indexOf(caminhoCriado);
              if (indiceCriado >= 0) caminhosCriados.splice(indiceCriado, 1);
            });
          }
          if (controlador.signal.aborted) throw e;
          falhas.push(`${file.name}: ${e instanceof Error ? e.message : 'falha no envio'}`);
          bytesConcluidos += file.size;
          continue;
        }
        const arquivoUrl = supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
        const miniaturaUrl: string | null = tipoMaterial === 'imagem' ? arquivoUrl : null;
        const tituloMaterial = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        const { data, error } = await supabase.from('vendas_mobile_divulgacao_materiais').insert({ empresa_id: empresaId, pasta_id: pastaAtiva, titulo: tituloMaterial, tipo: tipoMaterial, arquivo_path: caminho, arquivo_url: arquivoUrl, miniatura_path: null, miniatura_url: miniaturaUrl, mime_type: file.type, tamanho_bytes: file.size, arquivo_hash: arquivoHash }).select('id, pasta_id, titulo, tipo, arquivo_path, arquivo_url, miniatura_path, miniatura_url, miniatura_status, arquivo_hash, tamanho_bytes, criado_em').abortSignal(controlador.signal).single();
        if (error || !data) {
          await supabase.storage.from(BUCKET).remove(caminhosDesteMaterial);
          caminhosCriados.splice(caminhosCriados.indexOf(caminho), 1);
          bytesConcluidos += file.size;
          if (erroDeArquivoDuplicado(error)) {
            duplicados.push(file.name);
            continue;
          }
          falhas.push(`${file.name}: falha ao registrar material`);
          continue;
        }
        registrosCriados.push(data as Material);
        setMateriais((atuais) => [data as Material, ...atuais]);
        materiaisPorHash.set(arquivoHash, data as Material);
        enviados += 1;
        bytesConcluidos += file.size;
        setEnvioAtivo((atual) => atual ? { ...atual, progresso: totalBytes ? bytesConcluidos / totalBytes * 100 : 100, etapa: tipoMaterial === 'video' ? 'Vídeo enviado · preparando capa' : tipoMaterial === 'pdf' ? 'PDF enviado · preparando capa' : 'Material concluído' } : null);
      }
      const partes: string[] = [];
      if (enviados) partes.push(`${enviados} ${enviados === 1 ? 'arquivo enviado' : 'arquivos enviados'}`);
      if (duplicados.length) partes.push(`${duplicados.length} ${duplicados.length === 1 ? 'duplicado ignorado' : 'duplicados ignorados'}`);
      if (partes.length) {
        setResultadoEnvio({
          tipo: duplicados.length || falhas.length ? 'aviso' : 'sucesso',
          mensagem: `${partes.join(' · ')}.`,
        });
      }
      if (falhas.length) {
        setErro(`${falhas.length} ${falhas.length === 1 ? 'arquivo não foi enviado' : 'arquivos não foram enviados'}: ${resumirNomesArquivos(falhas)}.`);
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
      [inputArquivos, inputFotosVideos, inputCamera, inputPdf].forEach((referencia) => {
        if (referencia.current) referencia.current.value = '';
      });
    }
  };

  const cancelarEnvio = () => {
    if (!controladorEnvio.current || !envioAtivo || envioAtivo.cancelando) return;
    setEnvioAtivo((atual) => atual ? { ...atual, cancelando: true } : null);
    controladorEnvio.current.abort();
  };

  const salvarCapaPasta = async (materialId: string | null) => {
    if (!pastaCapaEmEdicao || !empresaId || salvandoCapa) return;
    setSalvandoCapa(true);
    setErro('');
    const { data, error } = await supabase
      .from('vendas_mobile_divulgacao_pastas')
      .update({ capa_material_id: materialId })
      .eq('id', pastaCapaEmEdicao.id)
      .eq('empresa_id', empresaId)
      .select('id, pasta_pai_id, capa_material_id, nome, descricao, criado_em')
      .single();
    setSalvandoCapa(false);
    if (error || !data) {
      setErro('Não foi possível atualizar a capa da pasta.');
      return;
    }
    setPastas((atuais) => atuais.map((pasta) => pasta.id === data.id ? data as Pasta : pasta));
    setResultadoEnvio({ tipo: 'sucesso', mensagem: materialId ? 'Capa da pasta atualizada.' : 'Capa da pasta removida.' });
    setPastaCapaEmEdicao(null);
  };

  const executarExclusaoPendente = async () => {
    if (!exclusaoPendente || excluindo) return;
    setExcluindo(true);
    setErro('');
    try {
      if (exclusaoPendente.tipo === 'novidade') {
        const item = exclusaoPendente.item;
        const { error } = await supabase.from('vendas_mobile_conteudos').delete().eq('id', item.id).eq('empresa_id', empresaId);
        if (error) setErro('Não foi possível excluir.');
        else setNovidades((lista) => lista.filter((i) => i.id !== item.id));
        return;
      }

      if (exclusaoPendente.tipo === 'material') {
        const item = exclusaoPendente.item;
        const { error } = await supabase.from('vendas_mobile_divulgacao_materiais').delete().eq('id', item.id).eq('empresa_id', empresaId);
        if (error) {
          setErro('Não foi possível excluir o material.');
          return;
        }
        await supabase.storage.from(BUCKET).remove([item.arquivo_path, ...(item.miniatura_path ? [item.miniatura_path] : [])]);
        setMateriais((lista) => lista.filter((i) => i.id !== item.id));
        setPastas((lista) => lista.map((pasta) => pasta.capa_material_id === item.id ? { ...pasta, capa_material_id: null } : pasta));
        return;
      }

      const pasta = exclusaoPendente.item;
      const ids = new Set([pasta.id]);
      let encontrou = true;
      while (encontrou) {
        encontrou = false;
        pastas.forEach((item) => {
          if (item.pasta_pai_id && ids.has(item.pasta_pai_id) && !ids.has(item.id)) {
            ids.add(item.id);
            encontrou = true;
          }
        });
      }
      const arquivos = materiais
        .filter((item) => ids.has(item.pasta_id))
        .flatMap((item) => [item.arquivo_path, ...(item.miniatura_path ? [item.miniatura_path] : [])]);
      const materiaisExcluidos = new Set(materiais.filter((item) => ids.has(item.pasta_id)).map((item) => item.id));
      const { error } = await supabase.from('vendas_mobile_divulgacao_pastas').delete().eq('id', pasta.id).eq('empresa_id', empresaId);
      if (error) {
        setErro('Não foi possível excluir a pasta.');
        return;
      }
      if (arquivos.length) await supabase.storage.from(BUCKET).remove(arquivos);
      setPastas((lista) => lista
        .filter((item) => !ids.has(item.id))
        .map((item) => item.capa_material_id && materiaisExcluidos.has(item.capa_material_id) ? { ...item, capa_material_id: null } : item));
      setMateriais((lista) => lista.filter((item) => !ids.has(item.pasta_id)));
      if (pastaAtiva && ids.has(pastaAtiva)) setPastaAtiva(null);
      if (pastaPaiNova && ids.has(pastaPaiNova)) setPastaPaiNova('');
    } finally {
      setExcluindo(false);
      setExclusaoPendente(null);
    }
  };

  const fundo = darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'; const campo = darkMode ? 'border-slate-600 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'; const suave = darkMode ? 'text-slate-400' : 'text-slate-500';
  const materiaisAtivos = materiais.filter((item) => item.pasta_id === pastaAtiva);
  const pastaAtivaObjeto = pastas.find((pasta) => pasta.id === pastaAtiva) || null;
  const idsSubpastasCapa = pastaCapaEmEdicao ? idsSubpastasDaPasta(pastaCapaEmEdicao.id, pastas) : new Set<string>();
  const imagensCandidatasCapa = materiais.filter((item) => item.tipo === 'imagem' && idsSubpastasCapa.has(item.pasta_id));
  const materialCapaAtual = pastaCapaEmEdicao?.capa_material_id
    ? materiais.find((item) => item.id === pastaCapaEmEdicao.capa_material_id) || null
    : null;
  const indiceMaterialVisualizado = materialEmVisualizacao ? materiaisAtivos.findIndex((item) => item.id === materialEmVisualizacao.id) : -1;
  const materialAnterior = indiceMaterialVisualizado > 0 ? materiaisAtivos[indiceMaterialVisualizado - 1] : null;
  const proximoMaterial = indiceMaterialVisualizado >= 0 && indiceMaterialVisualizado < materiaisAtivos.length - 1 ? materiaisAtivos[indiceMaterialVisualizado + 1] : null;
  const navegarMaterial = (direcao: -1 | 1) => {
    const destino = direcao === -1 ? materialAnterior : proximoMaterial;
    if (destino) setMaterialEmVisualizacao(destino);
  };
  const iniciarGestoVisualizacao = (evento: ReactPointerEvent<HTMLDivElement>) => {
    if (!evento.isPrimary || (evento.pointerType === 'mouse' && evento.button !== 0)) return;
    const video = (evento.target as HTMLElement).closest('video');
    if (video) {
      const limites = video.getBoundingClientRect();
      if (evento.clientY >= limites.bottom - 64) return;
    }
    gestoVisualizacao.current = { x: evento.clientX, y: evento.clientY, pointerId: evento.pointerId };
  };
  const concluirGestoVisualizacao = (evento: ReactPointerEvent<HTMLDivElement>) => {
    const inicio = gestoVisualizacao.current;
    gestoVisualizacao.current = null;
    if (!inicio || inicio.pointerId !== evento.pointerId) return;
    const deslocamentoX = evento.clientX - inicio.x;
    const deslocamentoY = evento.clientY - inicio.y;
    if (Math.abs(deslocamentoX) < 56 || Math.abs(deslocamentoX) <= Math.abs(deslocamentoY)) return;
    navegarMaterial(deslocamentoX < 0 ? 1 : -1);
  };
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
  const tituloExclusao = exclusaoPendente?.tipo === 'pasta'
    ? 'Excluir pasta e conteúdo'
    : exclusaoPendente?.tipo === 'material'
      ? 'Excluir material'
      : 'Excluir novidade';
  const mensagemExclusao = exclusaoPendente?.tipo === 'pasta'
    ? `A pasta “${exclusaoPendente.item.nome}”, todas as subpastas e os materiais contidos nelas serão excluídos definitivamente.`
    : exclusaoPendente
      ? `“${exclusaoPendente.item.titulo}” será excluído definitivamente.`
      : '';
  const abrirSeletorArquivos = () => setSeletorArquivosAberto(true);
  const selecionarArquivos = (referencia: React.RefObject<HTMLInputElement | null>) => {
    setSeletorArquivosAberto(false);
    referencia.current?.click();
  };

  return <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/65 px-3 py-5" onClick={(evento) => {
    if (evento.target === evento.currentTarget) onFechar();
  }}>
    <input ref={inputFotosVideos} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={(e) => void enviarArquivos(e.target.files)} />
    <input ref={inputCamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void enviarArquivos(e.target.files)} />
    <input ref={inputPdf} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => void enviarArquivos(e.target.files)} />
    {seletorArquivosAberto && <div className="fixed inset-0 z-[6150] flex items-end justify-center bg-slate-950/55 p-3 sm:items-center" onClick={() => setSeletorArquivosAberto(false)} role="dialog" aria-modal="true" aria-label="Adicionar materiais">
      <section className={`w-full max-w-sm rounded-3xl border p-3 shadow-2xl ${darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-white bg-white text-slate-900'}`} onClick={(e) => e.stopPropagation()}>
        <h3 className="px-2 pt-1 text-base font-black">Adicionar materiais</h3>
        <p className={`px-2 pt-1 text-xs ${suave}`}>Escolha como deseja incluir o material nesta pasta.</p>
        <div className="mt-3 grid gap-2">
          <button type="button" onClick={() => selecionarArquivos(inputFotosVideos)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left text-sm font-black ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}><Icone tipo="image" className="h-5 w-5 text-cyan-600" /><span>Selecionar fotos e vídeos</span></button>
          <button type="button" onClick={() => selecionarArquivos(inputCamera)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left text-sm font-black ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}><Icone tipo="image" className="h-5 w-5 text-cyan-600" /><span>Tirar foto</span></button>
          <button type="button" onClick={() => selecionarArquivos(inputPdf)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left text-sm font-black ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}><Icone tipo="pdf" className="h-5 w-5 text-red-600" /><span>Selecionar arquivos PDF</span></button>
        </div>
        <button type="button" onClick={() => setSeletorArquivosAberto(false)} className={`mt-2 min-h-11 w-full rounded-xl text-xs font-black uppercase ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>Cancelar</button>
      </section>
    </div>}
    {pastaCapaEmEdicao && <div className="fixed inset-0 z-[6150] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center" onClick={() => { if (!salvandoCapa) setPastaCapaEmEdicao(null); }} role="dialog" aria-modal="true" aria-label={`Escolher capa da pasta ${pastaCapaEmEdicao.nome}`}>
      <section className={`flex max-h-[86dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-white bg-white text-slate-900'}`} onClick={(e) => e.stopPropagation()}>
        <header className={`flex shrink-0 items-start justify-between gap-3 border-b p-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-600">Capa da pasta principal</p><h3 className="mt-1 text-lg font-black">{pastaCapaEmEdicao.nome}</h3><p className={`mt-1 text-xs ${suave}`}>Escolha uma imagem publicada dentro de qualquer subpasta.</p></div>
          <button type="button" onClick={() => setPastaCapaEmEdicao(null)} disabled={salvandoCapa} aria-label="Fechar seleção de capa" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-black disabled:opacity-50 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>×</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {imagensCandidatasCapa.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {imagensCandidatasCapa.map((item) => {
              const selecionada = pastaCapaEmEdicao.capa_material_id === item.id;
              const nomePasta = pastas.find((pasta) => pasta.id === item.pasta_id)?.nome || 'Subpasta';
              return <button key={item.id} type="button" onClick={() => void salvarCapaPasta(item.id)} disabled={salvandoCapa} aria-pressed={selecionada} className={`overflow-hidden rounded-2xl border-2 text-left transition disabled:opacity-60 ${selecionada ? 'border-cyan-500 ring-2 ring-cyan-500/20' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className="relative block aspect-square overflow-hidden bg-slate-950"><img src={item.miniatura_url || item.arquivo_url} alt={item.titulo} className="h-full w-full object-cover" />{selecionada && <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-cyan-500 text-lg font-black text-white shadow-lg">✓</span>}</span>
                <span className="block p-2"><b className="block truncate text-xs">{item.titulo}</b><small className={`mt-0.5 block truncate text-[10px] ${suave}`}>{nomePasta}</small></span>
              </button>;
            })}
          </div> : <div className={`rounded-2xl border border-dashed px-5 py-12 text-center ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-cyan-500/10 text-cyan-600"><Icone tipo="image" /></span><h4 className="mt-3 text-sm font-black">Nenhuma imagem disponível</h4><p className={`mx-auto mt-1 max-w-sm text-xs leading-relaxed ${suave}`}>Adicione uma imagem em uma subpasta. Vídeos e PDFs não são usados como capa da pasta principal.</p></div>}
        </div>
        {materialCapaAtual && <footer className={`shrink-0 border-t p-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><button type="button" onClick={() => void salvarCapaPasta(null)} disabled={salvandoCapa} className="min-h-11 w-full rounded-xl border border-red-300 px-4 text-xs font-black uppercase text-red-600 disabled:opacity-60">{salvandoCapa ? 'Salvando...' : 'Remover capa atual'}</button></footer>}
      </section>
    </div>}
    {materialEmVisualizacao && <div className="fixed inset-0 z-[6100] flex items-center justify-center bg-slate-950/95 sm:p-5" onClick={(e) => { e.stopPropagation(); setMaterialEmVisualizacao(null); }} role="dialog" aria-modal="true" aria-label={`Visualização de ${materialEmVisualizacao.titulo}`}>
      <section className="flex h-full w-full max-w-5xl flex-col overflow-hidden bg-slate-950 text-white sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-white/15 sm:shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/15 px-4 py-2">
          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-400">{rotuloMaterial(materialEmVisualizacao.tipo)}{indiceMaterialVisualizado >= 0 && materiaisAtivos.length > 1 ? ` · ${indiceMaterialVisualizado + 1} de ${materiaisAtivos.length}` : ''}</p><h3 className="truncate text-sm font-black sm:text-base">{materialEmVisualizacao.titulo}</h3></div>
          <button type="button" autoFocus onClick={() => setMaterialEmVisualizacao(null)} aria-label="Fechar visualização" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400">×</button>
        </header>
        <div className="relative flex min-h-0 flex-1 touch-pan-y select-none items-center justify-center overflow-auto p-2 sm:p-4" onPointerDown={iniciarGestoVisualizacao} onPointerUp={concluirGestoVisualizacao} onPointerCancel={() => { gestoVisualizacao.current = null; }}>
          {materialAnterior && <button type="button" onClick={() => navegarMaterial(-1)} aria-label="Visualizar material anterior" className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-3xl text-white shadow-lg backdrop-blur-sm hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:left-4">‹</button>}
          {materialEmVisualizacao.tipo === 'video'
            ? <video src={materialEmVisualizacao.arquivo_url} controls playsInline preload="metadata" className="max-h-full max-w-full rounded-lg object-contain" />
            : materialEmVisualizacao.tipo === 'pdf'
              ? <iframe src={`${materialEmVisualizacao.arquivo_url}#view=FitH`} title={materialEmVisualizacao.titulo} className="h-full w-full rounded-lg bg-white" />
              : <img src={materialEmVisualizacao.arquivo_url} alt={materialEmVisualizacao.titulo} draggable={false} className="max-h-full max-w-full rounded-lg object-contain" />}
          {proximoMaterial && <button type="button" onClick={() => navegarMaterial(1)} aria-label="Visualizar próximo material" className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-3xl text-white shadow-lg backdrop-blur-sm hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 sm:right-4">›</button>}
        </div>
      </section>
    </div>}
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
      {resultadoEnvio && <p role="status" aria-live="polite" className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${resultadoEnvio.tipo === 'sucesso' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>{resultadoEnvio.mensagem}</p>}
      {aba === 'novidades' ? <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <div className={`self-start rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}><h3 className="text-base font-black">Nova publicação</h3><p className={`mt-1 text-xs ${suave}`}>Aparece somente para vendedores vinculados a este perfil.</p><label className="mt-4 block text-[10px] font-black uppercase opacity-60">Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-bold ${campo}`}>{TIPOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select><label className="mt-3 block text-[10px] font-black uppercase opacity-60">Título</label><input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-bold ${campo}`} /><label className="mt-3 block text-[10px] font-black uppercase opacity-60">Descrição</label><textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} className={`mt-1 w-full rounded-lg border p-3 text-sm ${campo}`} /><button type="button" onClick={() => void publicar()} disabled={salvando} className="mt-3 h-11 w-full rounded-xl text-xs font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{salvando ? 'Publicando...' : 'Publicar novidade'}</button></div>
        <div><h3 className="text-base font-black">Histórico</h3><p className={`text-xs ${suave}`}>Publicações mais recentes primeiro.</p><div className="mt-3 grid gap-2">{carregando ? <p className="py-8 text-center text-sm opacity-60">Carregando...</p> : novidades.length ? novidades.map((item) => <article key={item.id} className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200'}`}><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: corPrimaria }}><Icone tipo={item.tipo} className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><span className="text-[8px] font-black uppercase" style={{ color: corPrimaria }}>{rotuloTipo(item.tipo)}</span><h4 className="text-sm font-black">{item.titulo}</h4></div><button type="button" onClick={() => setExclusaoPendente({ tipo: 'novidade', item })} className="h-8 w-8 shrink-0 rounded-lg border border-red-300 text-red-600">×</button></div><p className={`mt-1 whitespace-pre-wrap text-xs ${suave}`}>{item.descricao}</p></div></div></article>) : <p className="py-8 text-center text-sm opacity-60">Nenhuma novidade publicada.</p>}</div></div>
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
            {listaPastasVisiveis.map(({ pasta, nivel, temFilhos, expandida }) => {
              const totalMateriais = contarMateriaisNaArvore(pasta.id, pastas, materiais);
              const totalSubpastas = pastas.filter((item) => item.pasta_pai_id === pasta.id).length;
              const subpastaDoRamoAtivo = pastaDescendeDaSelecionada(pasta.id, pastaAtiva, pastas);
              const destaquePasta = pastaAtiva === pasta.id
                ? 'border-cyan-500 bg-cyan-500/10'
                : subpastaDoRamoAtivo
                  ? 'border-cyan-400/70 bg-cyan-500/5 ring-1 ring-inset ring-cyan-500/15'
                  : darkMode ? 'border-slate-700' : 'border-slate-200';
              return <div key={pasta.id} style={{ marginLeft: `${Math.min(nivel, 4) * 12}px` }} className={`flex flex-wrap items-center gap-1.5 rounded-lg border p-2 ${destaquePasta}`}><button type="button" onClick={() => selecionarPasta(pasta, temFilhos)} aria-expanded={temFilhos ? expandida : undefined} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Icone tipo="folder" className={`h-5 w-5 shrink-0 ${pastaAtiva === pasta.id || subpastaDoRamoAtivo ? 'text-cyan-500' : 'text-amber-500'}`} /><span className="min-w-0 flex-1"><b className="block truncate text-xs">{pasta.nome}</b><small className={`block text-[9px] ${suave}`}>{totalMateriais} {totalMateriais === 1 ? 'material' : 'materiais'} · {totalSubpastas} {totalSubpastas === 1 ? 'subpasta' : 'subpastas'}</small></span>{temFilhos && <span className={`shrink-0 text-base transition-transform ${expandida ? 'rotate-90' : ''}`} aria-hidden="true">›</span>}</button><button type="button" onClick={() => iniciarEdicaoPasta(pasta)} aria-label={`Editar nome da pasta ${pasta.nome}`} title="Editar nome" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-cyan-600 hover:bg-cyan-500/10"><Icone tipo="edit" className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setExclusaoPendente({ tipo: 'pasta', item: pasta })} aria-label={`Excluir pasta ${pasta.nome}`} title="Excluir pasta" className="h-8 w-8 shrink-0 rounded-md text-red-500 hover:bg-red-500/10">×</button>{pastaAtiva === pasta.id && <button type="button" onClick={() => inputArquivos.current?.click()} disabled={salvando} className="mt-1 flex h-12 basis-full items-center justify-center gap-2 rounded-lg text-xs font-black uppercase text-white disabled:opacity-60 lg:hidden" style={{ backgroundColor: corPrimaria }}><Icone tipo="upload" className="h-4 w-4" />{salvando ? 'Enviando...' : 'Enviar arquivos para esta pasta'}</button>}</div>;
            })}
            {!listaPastasVisiveis.length && <p className={`py-3 text-center text-xs ${suave}`}>Nenhuma pasta criada.</p>}
          </div>
        </aside>
        <section className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="text-base font-black">{pastaAtivaObjeto?.nome || 'Materiais de divulgação'}</h3><p className={`text-xs ${suave}`}>{pastaAtiva ? 'Envie fotos ou vídeos para esta pasta.' : 'Selecione ou crie uma pasta para começar.'}</p></div>
            {pastaAtivaObjeto && <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {pastaAtivaObjeto.pasta_pai_id === null && <button type="button" onClick={() => setPastaCapaEmEdicao(pastaAtivaObjeto)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-black ${darkMode ? 'border-cyan-700 bg-cyan-950/30 text-cyan-300' : 'border-cyan-200 bg-cyan-50 text-cyan-700'}`}><Icone tipo="image" className="h-4 w-4" />{pastaAtivaObjeto.capa_material_id ? 'Trocar capa' : 'Escolher capa'}</button>}
              <input ref={inputArquivos} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={(e) => void enviarArquivos(e.target.files)} />
              <button type="button" onClick={() => inputArquivos.current?.click()} disabled={salvando} className="hidden min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-black text-white disabled:opacity-60 lg:flex" style={{ backgroundColor: corPrimaria }}><Icone tipo="upload" className="h-4 w-4" />{salvando ? 'Enviando...' : 'Adicionar'}</button>
            </div>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{materiaisAtivos.map((item) => <article key={item.id} className={`group overflow-hidden rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}><button type="button" onClick={() => setMaterialEmVisualizacao(item)} aria-label={`Visualizar ${item.titulo}`} className="relative block aspect-square w-full bg-slate-950 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-400">{item.miniatura_url ? <img src={item.miniatura_url} alt="" className="h-full w-full object-cover" /> : item.tipo === 'video' ? <span className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-slate-300"><span className={`h-7 w-7 rounded-full border-2 border-cyan-400/25 ${item.miniatura_status === 'erro' ? '' : 'animate-spin border-t-cyan-400'}`} /><b className="text-[10px] uppercase tracking-wide">{item.miniatura_status === 'erro' ? 'Capa indisponível' : 'Preparando capa'}</b></span> : <span className="flex h-full items-center justify-center text-slate-500"><Icone tipo="image" /></span>}<span className="absolute bottom-2 left-2 rounded-full bg-black/70 p-1.5 text-white"><Icone tipo={item.tipo === 'video' ? 'video' : 'image'} className="h-3.5 w-3.5" /></span></button><div className="flex items-center gap-2 p-2"><b className="min-w-0 flex-1 truncate text-[11px]">{item.titulo}</b><button type="button" onClick={() => setExclusaoPendente({ tipo: 'material', item })} aria-label={`Excluir ${item.titulo}`} className="h-7 w-7 shrink-0 rounded-md text-red-500">×</button></div></article>)}{pastaAtiva && !materiaisAtivos.length && <p className={`col-span-full rounded-xl border border-dashed px-4 py-12 text-center text-sm ${suave}`}>Esta pasta ainda está vazia.</p>}</div>
        </section>
      </div>}
    </section>
    <ModalConfirmacao
      aberto={Boolean(exclusaoPendente)}
      titulo={tituloExclusao}
      mensagem={mensagemExclusao}
      textoCancelar="Voltar"
      textoConfirmar={exclusaoPendente?.tipo === 'pasta' ? 'Excluir tudo' : 'Excluir'}
      carregando={excluindo}
      corPrimaria={corPrimaria}
      darkMode={darkMode}
      aoCancelar={() => {
        if (!excluindo) setExclusaoPendente(null);
      }}
      aoConfirmar={() => void executarExclusaoPendente()}
    />
  </div>;
}
