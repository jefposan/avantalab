'use client';

import { type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import CatalogoProdutosVendas from './CatalogoProdutosVendas';
import ModalConfirmacao from './ModalConfirmacao';
import CardExpandidoModal from './CardExpandidoModal';
import BotaoAcaoCompacto from './BotaoAcaoCompacto';

type Novidade = { id: string; tipo: string; titulo: string; descricao: string; criado_em: string };
type Pasta = { id: string; pasta_pai_id: string | null; capa_material_id: string | null; capa_arquivo_path: string | null; capa_arquivo_url: string | null; nome: string; descricao: string | null; criado_em: string };
type Material = {
  id: string; pasta_id: string; titulo: string; tipo: 'imagem' | 'video' | 'pdf'; arquivo_path: string;
  arquivo_url: string; miniatura_path: string | null; miniatura_url: string | null;
  miniatura_status: 'nao_aplicavel' | 'pendente' | 'processando' | 'pronta' | 'erro';
  arquivo_hash: string | null; tamanho_bytes: number | null; criado_em: string;
};
type Props = { aberto: boolean; empresaId: string | null; nomeEmpresa: string; darkMode: boolean; corPrimaria: string; onFechar: () => void; rotuloFechar?: string };
type ExclusaoPendente =
  | { tipo: 'novidade'; item: Novidade }
  | { tipo: 'material'; item: Material }
  | { tipo: 'pasta'; item: Pasta };

const TIPOS = [['lancamento', 'Lançamento'], ['evento', 'Evento'], ['campanha', 'Campanha'], ['promocao', 'Promoção'], ['comunicado', 'Comunicado'], ['aviso', 'Aviso']] as const;
const BUCKET = 'vendas-divulgacao';
const LIMITE_ARQUIVO_DIVULGACAO_BYTES = 100 * 1024 * 1024;
const LIMITE_ARQUIVO_DIVULGACAO_MB = 100;
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
function mensagemErroEnvioMaterial(erro: unknown) {
  const mensagem = String(erro instanceof Error ? erro.message : erro || '').trim();
  if (/exceeded the maximum allowed size|maximum allowed size|payload too large|entity too large|file(?: size)? limit/i.test(mensagem)) {
    return `O arquivo excede o limite permitido de ${LIMITE_ARQUIVO_DIVULGACAO_MB} MB.`;
  }
  if (/mime type|content type|unsupported media|not allowed/i.test(mensagem)) {
    return 'O formato deste arquivo não é permitido.';
  }
  if (/network|failed to fetch|load failed|conexão/i.test(mensagem)) {
    return 'Falha de conexão durante o envio. Tente novamente.';
  }
  if (/sessão expirou|session|jwt|unauthor/i.test(mensagem)) {
    return 'Sua sessão expirou. Entre novamente para enviar materiais.';
  }
  const parecePortugues = /[áàâãéêíóôõúç]|\b(?:nao|não|possivel|possível|erro|falha|arquivo|envio|sessao|sessão|formato|conexao|conexão|material|tente)\b/i.test(mensagem);
  return parecePortugues ? mensagem : 'Não foi possível enviar o arquivo. Tente novamente.';
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

function urlCapaDaPasta(pasta: Pasta, pastas: Pasta[], materiais: Material[]) {
  if (pasta.capa_arquivo_url) return pasta.capa_arquivo_url;
  const materialDaCapa = pasta.capa_material_id ? materiais.find((material) => material.id === pasta.capa_material_id) : null;
  if (materialDaCapa) return materialDaCapa.miniatura_url || materialDaCapa.arquivo_url;
  const idsDaPasta = new Set([pasta.id, ...idsSubpastasDaPasta(pasta.id, pastas)]);
  const primeiraImagem = materiais.find((material) => idsDaPasta.has(material.pasta_id) && material.tipo === 'imagem');
  return primeiraImagem?.miniatura_url || primeiraImagem?.arquivo_url || null;
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
      let mensagem: unknown = 'Não foi possível enviar o arquivo.';
      try {
        const detalhe = JSON.parse(requisicao.responseText);
        mensagem = detalhe?.message || detalhe?.error || mensagem;
      } catch { /* resposta sem JSON */ }
      reject(new Error(mensagemErroEnvioMaterial(mensagem)));
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

export default function NovidadesVendasModal({ aberto, empresaId, nomeEmpresa, darkMode, corPrimaria, onFechar, rotuloFechar }: Props) {
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
  const inputArquivos = useRef<HTMLInputElement>(null);
  const inputCapaArquivo = useRef<HTMLInputElement>(null);
  const controladorEnvio = useRef<AbortController | null>(null);
  const gestoVisualizacao = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const [arrastandoMateriais, setArrastandoMateriais] = useState(false);
  const [arrastandoCapa, setArrastandoCapa] = useState(false);
  const menuMaisRef = useRef<HTMLDetailsElement>(null);
  const [menuMais, setMenuMais] = useState(false);
  useEffect(() => {
    if (!menuMais) return;
    const fecharFora = (evento: PointerEvent) => {
      if (evento.target instanceof Node && !menuMaisRef.current?.contains(evento.target)) setMenuMais(false);
    };
    const fecharEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') { setMenuMais(false); menuMaisRef.current?.querySelector('summary')?.focus(); }
    };
    document.addEventListener('pointerdown', fecharFora, true);
    document.addEventListener('keydown', fecharEsc);
    return () => {
      document.removeEventListener('pointerdown', fecharFora, true);
      document.removeEventListener('keydown', fecharEsc);
    };
  }, [menuMais]);
  const [renomearItem, setRenomearItem] = useState<{ id: string; tipo: 'material' | 'pasta'; nome: string } | null>(null);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [erroNome, setErroNome] = useState('');
  const [painelSelecao, setPainelSelecao] = useState<'detalhes' | 'compartilhar' | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [moverSelecaoAberta, setMoverSelecaoAberta] = useState(false);
  const [excluirSelecaoAberta, setExcluirSelecaoAberta] = useState(false);
  const [acaoSelecao, setAcaoSelecao] = useState<'mover' | 'excluir' | null>(null);
  const operacaoSelecaoRef = useRef(false);
  const [materialArrastadoId, setMaterialArrastadoId] = useState<string | null>(null);
  const [pastaDestinoArraste, setPastaDestinoArraste] = useState<string | null>(null);
  const [materialParaMover, setMaterialParaMover] = useState<Material | null>(null);
  const [destinoMovimento, setDestinoMovimento] = useState('');
  const [movendoMaterialId, setMovendoMaterialId] = useState<string | null>(null);
  const [subpastaLocal, setSubpastaLocal] = useState<{ paiId: string; nome: string } | null>(null);
  const arrasteMaterialRef = useRef<{ id: string; empresaId: string } | null>(null);
  const movimentoAtivoRef = useRef(false);
  const contextoOperacaoRef = useRef(0);

  const carregar = async () => {
    if (!empresaId) return;
    setCarregando(true); setErro('');
    const [novidadesRes, pastasRes, materiaisRes] = await Promise.all([
      supabase.from('vendas_mobile_conteudos').select('id, tipo, titulo, descricao, criado_em').eq('empresa_id', empresaId).eq('pagina', 'novidades').order('criado_em', { ascending: false }),
      supabase.from('vendas_mobile_divulgacao_pastas').select('id, pasta_pai_id, capa_material_id, capa_arquivo_path, capa_arquivo_url, nome, descricao, criado_em').eq('empresa_id', empresaId).eq('ativo', true).order('ordem').order('criado_em', { ascending: false }),
      supabase.from('vendas_mobile_divulgacao_materiais').select('id, pasta_id, titulo, tipo, arquivo_path, arquivo_url, miniatura_path, miniatura_url, miniatura_status, arquivo_hash, tamanho_bytes, criado_em').eq('empresa_id', empresaId).eq('ativo', true).order('ordem').order('criado_em', { ascending: false }),
    ]);
    setCarregando(false);
    if (novidadesRes.error) setErro('Não foi possível carregar as novidades.'); else setNovidades((novidadesRes.data || []) as Novidade[]);
    if (pastasRes.error || materiaisRes.error) setErro('A estrutura de Divulgação ainda precisa ser instalada no banco.');
    else { setPastas((pastasRes.data || []) as Pasta[]); setMateriais((materiaisRes.data || []) as Material[]); }
  };

  useEffect(() => {
    if (!aberto || !empresaId) return;
    contextoOperacaoRef.current += 1;
    setRenomearItem(null); setErroNome(''); setSalvandoNome(false); setMenuMais(false); setPainelSelecao(null); setLinkCopiado(false); setModoSelecao(false); setItensSelecionados(new Set()); setMoverSelecaoAberta(false); setExcluirSelecaoAberta(false); setAcaoSelecao(null); operacaoSelecaoRef.current = false;
    setMaterialParaMover(null); setSubpastaLocal(null); setMovendoMaterialId(null); setSalvando(false);
    movimentoAtivoRef.current = false; arrasteMaterialRef.current = null;
    setMaterialArrastadoId(null); setPastaDestinoArraste(null);
    setAba('divulgacao');
    setCriacaoPastaAberta(false);
    setPastaEmEdicao(null);
    setPastaPaiNova('');
    setPastasExpandidas(new Set());
    setResultadoEnvio(null);
    setMaterialEmVisualizacao(null);
    setPastaCapaEmEdicao(null);
    void carregar();
    return () => { contextoOperacaoRef.current += 1; };
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

  const criarPasta = async (contexto?: { paiId: string; nome: string }) => {
    const nomeDaPasta = contexto ? contexto.nome : novaPasta;
    if (salvando) return;
    if (!empresaId || !nomeDaPasta.trim()) { setErro('Informe o nome da pasta.'); return; }
    const pastaPaiId = contexto?.paiId || pastaPaiNova || null;
    const geracao = contextoOperacaoRef.current;
    setSalvando(true); setErro('');
    try {
      const { data, error } = await supabase.from('vendas_mobile_divulgacao_pastas').insert({ empresa_id: empresaId, pasta_pai_id: pastaPaiId, nome: formatarNomePasta(nomeDaPasta.trim()), descricao: contexto ? null : novaDescricao.trim() || null }).select('id, pasta_pai_id, capa_material_id, capa_arquivo_path, capa_arquivo_url, nome, descricao, criado_em').single();
      if (geracao !== contextoOperacaoRef.current) return;
      if (error || !data) { setErro('Não foi possível criar a pasta.'); return; }
      setPastas((atuais) => [data as Pasta, ...atuais]);
      if (!contexto) setPastaAtiva(data.id);
      setSubpastaLocal(null);
      if (pastaPaiId) setPastasExpandidas((atuais) => new Set([...atuais, pastaPaiId]));
      if (!contexto) { setPastaPaiNova(''); setNovaPasta(''); setNovaDescricao(''); setCriacaoPastaAberta(false); }
    } catch {
      if (geracao === contextoOperacaoRef.current) setErro('Não foi possível criar a pasta. Tente novamente.');
    } finally {
      if (geracao === contextoOperacaoRef.current) setSalvando(false);
    }
  };

  const salvarNomeDaPasta = async () => {
    if (!pastaEmEdicao || !novaPasta.trim()) { setErro('Informe o nome da pasta.'); return; }
    setSalvando(true); setErro('');
    const nome = formatarNomePasta(novaPasta.trim());
    const { data, error } = await supabase.from('vendas_mobile_divulgacao_pastas').update({ nome }).eq('id', pastaEmEdicao.id).eq('empresa_id', empresaId).select('id, pasta_pai_id, capa_material_id, capa_arquivo_path, capa_arquivo_url, nome, descricao, criado_em').single();
    setSalvando(false);
    if (error || !data) { setErro('Não foi possível atualizar o nome da pasta.'); return; }
    setPastas((atuais) => atuais.map((pasta) => pasta.id === data.id ? data as Pasta : pasta));
    setPastaEmEdicao(null); setNovaPasta(''); setNovaDescricao(''); setCriacaoPastaAberta(false);
  };

  const limparArrasteMaterial = () => {
    arrasteMaterialRef.current = null; setMaterialArrastadoId(null); setPastaDestinoArraste(null);
  };
  const iniciarArrasteMaterial = (evento: ReactDragEvent<HTMLElement>, material: Material) => {
    if (!empresaId || modoSelecao || operacaoSelecaoRef.current || movimentoAtivoRef.current || salvando || excluindo) { evento.preventDefault(); return; }
    arrasteMaterialRef.current = { id: material.id, empresaId };
    setMaterialArrastadoId(material.id);
    evento.dataTransfer.effectAllowed = 'move';
    evento.dataTransfer.setData('application/x-avanta-material', material.id);
  };
  const moverMaterial = async (material: Material, pastaDestinoId: string, emLote = false): Promise<boolean> => {
    if (!empresaId || movimentoAtivoRef.current || (!emLote && operacaoSelecaoRef.current) || salvando || excluindo || material.pasta_id === pastaDestinoId) return false;
    if (!pastas.some((pasta) => pasta.id === pastaDestinoId)) return false;
    const geracao = contextoOperacaoRef.current;
    movimentoAtivoRef.current = true; setMovendoMaterialId(material.id); setErro(''); setResultadoEnvio(null);
    try {
      const { data, error } = await supabase.rpc('mover_material_divulgacao_rpc', {
        p_empresa_id: empresaId, p_material_id: material.id,
        p_pasta_origem_id: material.pasta_id, p_pasta_destino_id: pastaDestinoId,
      });
      if (geracao !== contextoOperacaoRef.current) return false;
      const resultado = data as { material?: Material; capas_limpas?: string[] } | null;
      if (error || resultado?.material?.id !== material.id || resultado.material.pasta_id !== pastaDestinoId) {
        throw new Error(error?.code === 'P0001' ? error.message : 'Não foi possível mover o material. Tente novamente.');
      }
      setMateriais((atuais) => atuais.map((item) => item.id === material.id ? { ...item, ...resultado.material! } : item));
      const capasLimpas = new Set(resultado.capas_limpas || []);
      setPastas((atuais) => atuais.map((pasta) => capasLimpas.has(pasta.id) ? { ...pasta, capa_material_id: null } : pasta));
      if (!emLote) {
        setMaterialParaMover(null); setDestinoMovimento('');
        setResultadoEnvio({ tipo: 'sucesso', mensagem: `Material movido para “${pastas.find((pasta) => pasta.id === pastaDestinoId)?.nome || 'a pasta selecionada'}”.` });
      }
      return true;
    } catch (erroMovimento) {
      if (geracao === contextoOperacaoRef.current) setErro(erroMovimento instanceof Error && /Não foi possível|Material indisponível|Pasta de destino|O material já|Sessão expirada/.test(erroMovimento.message) ? erroMovimento.message : 'Não foi possível mover o material. Tente novamente.');
      return false;
    } finally {
      if (geracao === contextoOperacaoRef.current) { movimentoAtivoRef.current = false; setMovendoMaterialId(null); }
    }
  };
  const receberArrasteNaPasta = (evento: ReactDragEvent<HTMLElement>, pastaId: string, soltar = false) => {
    const arraste = arrasteMaterialRef.current;
    const material = arraste?.empresaId === empresaId ? materiais.find((item) => item.id === arraste.id) : null;
    if (!material || material.pasta_id === pastaId || movimentoAtivoRef.current || salvando || excluindo) return;
    evento.preventDefault(); evento.stopPropagation(); evento.dataTransfer.dropEffect = 'move';
    if (!soltar) { setPastaDestinoArraste(pastaId); return; }
    limparArrasteMaterial(); void moverMaterial(material, pastaId);
  };
  const eventosDestinoPasta = (pastaId: string) => ({
    onDragOver: (evento: ReactDragEvent<HTMLElement>) => receberArrasteNaPasta(evento, pastaId),
    onDrop: (evento: ReactDragEvent<HTMLElement>) => receberArrasteNaPasta(evento, pastaId, true),
    onDragLeave: (evento: ReactDragEvent<HTMLElement>) => {
      if (!evento.currentTarget.contains(evento.relatedTarget as Node)) setPastaDestinoArraste(null);
    },
  });
  const destaqueDestino = (pastaId: string) => pastaDestinoArraste === pastaId ? 'ring-2 ring-inset ring-cyan-500 bg-cyan-500/10' : '';

  const enviarArquivos = async (files: FileList | File[] | null, pastaDestino = pastaAtiva, capaDaPasta: Pasta | null = null) => {
    if (!empresaId || !pastaDestino || !files?.length) return;
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
        if (file.size > LIMITE_ARQUIVO_DIVULGACAO_BYTES) {
          falhas.push(`${file.name}: excede o limite permitido de ${LIMITE_ARQUIVO_DIVULGACAO_MB} MB`);
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
        const caminho = `${empresaId}/${pastaDestino}/${chave}-${nomeSeguro(file.name)}`;
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
          falhas.push(`${file.name}: ${mensagemErroEnvioMaterial(e)}`);
          bytesConcluidos += file.size;
          continue;
        }
        const arquivoUrl = supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
        const miniaturaUrl: string | null = tipoMaterial === 'imagem' ? arquivoUrl : null;
        const tituloMaterial = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
        const { data, error } = await supabase.from('vendas_mobile_divulgacao_materiais').insert({ empresa_id: empresaId, pasta_id: pastaDestino, titulo: tituloMaterial, tipo: tipoMaterial, arquivo_path: caminho, arquivo_url: arquivoUrl, miniatura_path: null, miniatura_url: miniaturaUrl, mime_type: file.type, tamanho_bytes: file.size, arquivo_hash: arquivoHash }).select('id, pasta_id, titulo, tipo, arquivo_path, arquivo_url, miniatura_path, miniatura_url, miniatura_status, arquivo_hash, tamanho_bytes, criado_em').abortSignal(controlador.signal).single();
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
      const imagemEnviadaComoCapa = capaDaPasta ? registrosCriados.find((item) => item.tipo === 'imagem') || null : null;
      const capaAtualizada = imagemEnviadaComoCapa && capaDaPasta
        ? await salvarCapaPasta(imagemEnviadaComoCapa.id, capaDaPasta)
        : false;
      const partes: string[] = [];
      if (enviados) partes.push(`${enviados} ${enviados === 1 ? 'arquivo enviado' : 'arquivos enviados'}`);
      if (duplicados.length) partes.push(`${duplicados.length} ${duplicados.length === 1 ? 'duplicado ignorado' : 'duplicados ignorados'}`);
      if (capaAtualizada) partes.push('capa atualizada');
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
      } else setErro(mensagemErroEnvioMaterial(e));
    } finally {
      controladorEnvio.current = null;
      setEnvioAtivo(null); setSalvando(false);
      if (inputArquivos.current) inputArquivos.current.value = '';
      if (inputCapaArquivo.current) inputCapaArquivo.current.value = '';
    }
  };

  const cancelarEnvio = () => {
    if (!controladorEnvio.current || !envioAtivo || envioAtivo.cancelando) return;
    setEnvioAtivo((atual) => atual ? { ...atual, cancelando: true } : null);
    controladorEnvio.current.abort();
  };

  const salvarCapaPasta = async (materialId: string | null, pastaAlvo = pastaCapaEmEdicao) => {
    if (!pastaAlvo || !empresaId || salvandoCapa) return false;
    setSalvandoCapa(true);
    setErro('');
    const { data, error } = await supabase
      .from('vendas_mobile_divulgacao_pastas')
      .update({ capa_material_id: materialId, capa_arquivo_path: null, capa_arquivo_url: null })
      .eq('id', pastaAlvo.id)
      .eq('empresa_id', empresaId)
      .select('id, pasta_pai_id, capa_material_id, capa_arquivo_path, capa_arquivo_url, nome, descricao, criado_em')
      .single();
    setSalvandoCapa(false);
    if (error || !data) {
      setErro('Não foi possível atualizar a capa da pasta.');
      return false;
    }
    setPastas((atuais) => atuais.map((pasta) => pasta.id === data.id ? data as Pasta : pasta));
    if (pastaAlvo.capa_arquivo_path) void supabase.storage.from(BUCKET).remove([pastaAlvo.capa_arquivo_path]);
    setResultadoEnvio({ tipo: 'sucesso', mensagem: materialId ? 'Capa da pasta atualizada.' : 'Capa da pasta removida.' });
    setPastaCapaEmEdicao(null);
    return true;
  };

  const enviarCapaExterna = (files: FileList | File[] | null) => {
    if (!pastaCapaEmEdicao || !files?.length) return;
    const imagem = Array.from(files).find((arquivo) => tipoMaterialArquivo(arquivo) === 'imagem');
    if (!imagem) {
      setErro('Escolha uma imagem para usar como capa da pasta.');
      return;
    }
    void (async () => {
      const pastaAlvo = pastaCapaEmEdicao;
      if (!empresaId || salvandoCapa) return;
      const chave = `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
      const caminho = `${empresaId}/capas-pastas/${pastaAlvo.id}/${chave}-${nomeSeguro(imagem.name)}`;
      setSalvandoCapa(true);
      setErro('');
      try {
        const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, imagem, { contentType: imagem.type, upsert: false });
        if (erroUpload) throw erroUpload;
        const capaArquivoUrl = supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
        const { data, error } = await supabase
          .from('vendas_mobile_divulgacao_pastas')
          .update({ capa_material_id: null, capa_arquivo_path: caminho, capa_arquivo_url: capaArquivoUrl })
          .eq('id', pastaAlvo.id)
          .eq('empresa_id', empresaId)
          .select('id, pasta_pai_id, capa_material_id, capa_arquivo_path, capa_arquivo_url, nome, descricao, criado_em')
          .single();
        if (error || !data) {
          await supabase.storage.from(BUCKET).remove([caminho]);
          throw error || new Error('Não foi possível salvar a capa da pasta.');
        }
        setPastas((atuais) => atuais.map((pasta) => pasta.id === data.id ? data as Pasta : pasta));
        if (pastaAlvo.capa_arquivo_path) void supabase.storage.from(BUCKET).remove([pastaAlvo.capa_arquivo_path]);
        setResultadoEnvio({ tipo: 'sucesso', mensagem: 'Capa da pasta atualizada.' });
        setPastaCapaEmEdicao(null);
      } catch {
        setErro('Não foi possível adicionar a imagem como capa da pasta.');
      } finally {
        setSalvandoCapa(false);
        if (inputCapaArquivo.current) inputCapaArquivo.current.value = '';
      }
    })();
  };

  const iniciarArrasteDeArquivo = (evento: ReactDragEvent<HTMLElement>, destino: 'materiais' | 'capa') => {
    if (arrasteMaterialRef.current) return;
    if (!evento.dataTransfer.types.includes('Files')) return;
    evento.preventDefault();
    if (destino === 'materiais') setArrastandoMateriais(true); else setArrastandoCapa(true);
  };

  const sairDoArrasteDeArquivo = (evento: ReactDragEvent<HTMLElement>, destino: 'materiais' | 'capa') => {
    if (evento.currentTarget.contains(evento.relatedTarget as Node)) return;
    if (destino === 'materiais') setArrastandoMateriais(false); else setArrastandoCapa(false);
  };

  const excluirItemConfirmado = async (alvo: ExclusaoPendente): Promise<string[]> => {
      const geracao = contextoOperacaoRef.current;
      if (alvo.tipo === 'novidade') {
        const item = alvo.item;
        const { data: removido, error } = await supabase.from('vendas_mobile_conteudos').delete().eq('id', item.id).eq('empresa_id', empresaId).select('id').single();
        if (error || !removido?.id) throw new Error('Não foi possível excluir.');
        if (geracao !== contextoOperacaoRef.current) return [];
        setNovidades((lista) => lista.filter((i) => i.id !== item.id));
        return [];
      }

      if (alvo.tipo === 'material') {
        const item = alvo.item;
        const { data: removido, error } = await supabase.from('vendas_mobile_divulgacao_materiais').delete().eq('id', item.id).eq('empresa_id', empresaId).select('id').single();
        if (error || !removido?.id) {
          throw new Error('Não foi possível excluir o material.');
        }
        await supabase.storage.from(BUCKET).remove([item.arquivo_path, ...(item.miniatura_path ? [item.miniatura_path] : [])]).catch(() => undefined);
        if (geracao !== contextoOperacaoRef.current) return [];
        setMateriais((lista) => lista.filter((i) => i.id !== item.id));
        setPastas((lista) => lista.map((pasta) => pasta.capa_material_id === item.id ? { ...pasta, capa_material_id: null } : pasta));
        return [`material:${item.id}`];
      }

      const pasta = alvo.item;
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
      const { data: removido, error } = await supabase.from('vendas_mobile_divulgacao_pastas').delete().eq('id', pasta.id).eq('empresa_id', empresaId).select('id').single();
      if (error || !removido?.id) {
        throw new Error('Não foi possível excluir a pasta.');
      }
      if (arquivos.length) await supabase.storage.from(BUCKET).remove(arquivos).catch(() => undefined);
      if (geracao !== contextoOperacaoRef.current) return [];
      setPastas((lista) => lista
        .filter((item) => !ids.has(item.id))
        .map((item) => item.capa_material_id && materiaisExcluidos.has(item.capa_material_id) ? { ...item, capa_material_id: null } : item));
      setMateriais((lista) => lista.filter((item) => !ids.has(item.pasta_id)));
      if (pastaAtiva && ids.has(pastaAtiva)) setPastaAtiva(null);
      if (pastaPaiNova && ids.has(pastaPaiNova)) setPastaPaiNova('');
      return [...ids].map((id) => `pasta:${id}`).concat([...materiaisExcluidos].map((id) => `material:${id}`));
  };
  const executarExclusaoPendente = async () => {
    if (!exclusaoPendente || excluindo || operacaoSelecaoRef.current) return;
    setExcluindo(true); setErro('');
    try { await excluirItemConfirmado(exclusaoPendente); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : 'Não foi possível excluir.'); }
    finally { setExcluindo(false); setExclusaoPendente(null); }
  };
  const cancelarSelecao = () => {
    if (operacaoSelecaoRef.current) return;
    setRenomearItem(null); setErroNome(''); setSalvandoNome(false); setMenuMais(false); setPainelSelecao(null); setLinkCopiado(false); setModoSelecao(false); setItensSelecionados(new Set()); setMoverSelecaoAberta(false); setExcluirSelecaoAberta(false);
  };
  const alternarSelecao = (chave: string) => {
    if (operacaoSelecaoRef.current) return;
    setItensSelecionados((atuais) => { const novos = new Set(atuais); if (novos.has(chave)) novos.delete(chave); else novos.add(chave); return novos; });
  };
  const arquivosSelecionados = materiais.filter((item) => itensSelecionados.has(`material:${item.id}`));
  const pastasSelecionadas = pastas.filter((item) => itensSelecionados.has(`pasta:${item.id}`));
  const itemUnico: Material | Pasta | null = itensSelecionados.size === 1 ? (arquivosSelecionados.length ? arquivosSelecionados[0] : pastasSelecionadas.length ? pastasSelecionadas[0] : null) : null;
  const pastaUnica = itemUnico && 'nome' in itemUnico ? itemUnico : null;
  const arquivosDoItem = pastaUnica ? materiais.filter((item) => (item.pasta_id === pastaUnica.id || idsSubpastasDaPasta(pastaUnica.id, pastas).has(item.pasta_id))) : arquivosSelecionados;
  const textoCompartilhar = itemUnico ? [ 'titulo' in itemUnico ? itemUnico.titulo : itemUnico.nome, ...arquivosDoItem.map((item) => `${item.titulo}\n${item.arquivo_url}`)].join('\n\n') : '';
  const salvarNomeSelecionado = async () => {
    if (!renomearItem || !empresaId || salvandoNome || operacaoSelecaoRef.current) return;
    const nome = renomearItem.nome.trim();
    if (!nome) { setErroNome('Informe o nome.'); return; }
    const geracao = contextoOperacaoRef.current;
    const alvo = renomearItem;
    setSalvandoNome(true); setErroNome('');
    try {
      const pasta = alvo.tipo === 'pasta';
      const { data, error } = await supabase.from(pasta ? 'vendas_mobile_divulgacao_pastas' : 'vendas_mobile_divulgacao_materiais')
        .update(pasta ? { nome } : { titulo: nome }).eq('id', alvo.id).eq('empresa_id', empresaId)
        .select(pasta ? 'id, nome' : 'id, titulo').single();
      if (geracao !== contextoOperacaoRef.current) return;
      if (error || !data || data.id !== alvo.id) throw new Error('Não foi possível renomear. Tente novamente.');
      if (pasta) setPastas((lista) => lista.map((item) => item.id === alvo.id ? { ...item, nome } : item));
      else setMateriais((lista) => lista.map((item) => item.id === alvo.id ? { ...item, titulo: nome } : item));
      setRenomearItem(null);
    } catch {
      if (geracao === contextoOperacaoRef.current) setErroNome('Não foi possível renomear. Tente novamente.');
    } finally {
      if (geracao === contextoOperacaoRef.current) setSalvandoNome(false);
    }
  };
  const compartilharSelecao = async () => {
    if (!itemUnico) return;
    try {
      if (navigator.share) await navigator.share({ title: 'titulo' in itemUnico ? itemUnico.titulo : itemUnico.nome, text: textoCompartilhar });
      else { await navigator.clipboard.writeText(textoCompartilhar); setLinkCopiado(true); }
    } catch (falha) { if (!(falha instanceof Error && falha.name === 'AbortError')) setErro('Não foi possível compartilhar. Copie o conteúdo exibido.'); }
  };

  const executarMovimentoSelecao = async () => {
    if (!destinoMovimento || !arquivosSelecionados.length || pastasSelecionadas.length || operacaoSelecaoRef.current) return;
    const geracao = contextoOperacaoRef.current;
    operacaoSelecaoRef.current = true; setAcaoSelecao('mover'); setErro('');
    let feitos = 0;
    try {
      for (const item of arquivosSelecionados) {
        if (geracao !== contextoOperacaoRef.current) break;
        if (!await moverMaterial(item, destinoMovimento, true)) break;
        feitos += 1;
        setItensSelecionados((atuais) => { const novos = new Set(atuais); novos.delete(`material:${item.id}`); return novos; });
      }
      if (geracao !== contextoOperacaoRef.current) return;
      setResultadoEnvio({ tipo: feitos === arquivosSelecionados.length ? 'sucesso' : 'aviso', mensagem: `${feitos} de ${arquivosSelecionados.length} arquivo(s) movido(s).` });
      if (feitos === arquivosSelecionados.length) { setMoverSelecaoAberta(false); setModoSelecao(false); setItensSelecionados(new Set()); }
    } finally { if (geracao === contextoOperacaoRef.current) { operacaoSelecaoRef.current = false; setAcaoSelecao(null); } }
  };
  const executarExclusaoSelecao = async () => {
    if (!itensSelecionados.size || operacaoSelecaoRef.current) return;
    const geracao = contextoOperacaoRef.current;
    const pastasRaiz = pastasSelecionadas.filter((pasta) => !pastasSelecionadas.some((outra) => outra.id !== pasta.id && idsSubpastasDaPasta(outra.id, pastas).has(pasta.id)));
    const idsDentro = new Set(pastasRaiz.flatMap((pasta) => [pasta.id, ...idsSubpastasDaPasta(pasta.id, pastas)]));
    const plano: ExclusaoPendente[] = [
      ...pastasRaiz.map((item): ExclusaoPendente => ({ tipo: 'pasta', item })),
      ...arquivosSelecionados.filter((item) => !idsDentro.has(item.pasta_id)).map((item): ExclusaoPendente => ({ tipo: 'material', item })),
    ];
    operacaoSelecaoRef.current = true; setAcaoSelecao('excluir'); setExcluindo(true); setErro('');
    let feitos = 0;
    try {
      for (const item of plano) {
        if (geracao !== contextoOperacaoRef.current) break;
        const removidos = new Set(await excluirItemConfirmado(item));
        if (geracao !== contextoOperacaoRef.current) break;
        feitos += 1;
        setItensSelecionados((atuais) => new Set([...atuais].filter((id) => !removidos.has(id))));
      }
      if (geracao !== contextoOperacaoRef.current) return;
      setModoSelecao(false); setItensSelecionados(new Set());
      setResultadoEnvio({ tipo: 'sucesso', mensagem: 'Itens selecionados excluídos.' });
    } catch (falha) {
      if (geracao === contextoOperacaoRef.current) { setErro(falha instanceof Error ? falha.message : 'Não foi possível excluir.'); setResultadoEnvio({ tipo: 'aviso', mensagem: `${feitos} de ${plano.length} operação(ões) concluída(s). Os itens restantes continuam selecionados.` }); }
    } finally { if (geracao === contextoOperacaoRef.current) { operacaoSelecaoRef.current = false; setAcaoSelecao(null); setExcluindo(false); setExcluirSelecaoAberta(false); } }
  };

  const fundo = darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'; const campo = darkMode ? 'border-slate-600 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'; const suave = darkMode ? 'text-slate-400' : 'text-slate-500';
  const materiaisAtivos = materiais.filter((item) => item.pasta_id === pastaAtiva);
  const pastaAtivaObjeto = pastas.find((pasta) => pasta.id === pastaAtiva) || null;
  const subpastasAtivas = pastaAtiva
    ? pastas
      .filter((pasta) => pasta.pasta_pai_id === pastaAtiva)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    : [];
  const pastasPrincipais = pastas
    .filter((pasta) => pasta.pasta_pai_id === null)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const idsSubpastasCapa = pastaCapaEmEdicao
    ? new Set([pastaCapaEmEdicao.id, ...idsSubpastasDaPasta(pastaCapaEmEdicao.id, pastas)])
    : new Set<string>();
  const imagensCandidatasCapa = materiais.filter((item) => item.tipo === 'imagem' && idsSubpastasCapa.has(item.pasta_id));
  const materialCapaAtual = pastaCapaEmEdicao?.capa_material_id
    ? materiais.find((item) => item.id === pastaCapaEmEdicao.capa_material_id) || null
    : null;
  const temCapaAtual = Boolean(materialCapaAtual || pastaCapaEmEdicao?.capa_arquivo_url);
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
  const focarDetalheDaPastaNoMobile = () => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    window.requestAnimationFrame(() => {
      const detalhe = document.getElementById('detalhe-divulgacao-vendas');
      detalhe?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      detalhe?.focus({ preventScroll: true });
    });
  };
  const selecionarPasta = (pasta: Pasta, temFilhos: boolean) => {
    if (operacaoSelecaoRef.current) return;
    cancelarSelecao();
    setPastaAtiva(pasta.id);
    if (!temFilhos) {
      focarDetalheDaPastaNoMobile();
      return;
    }
    setPastasExpandidas((atuais) => {
      const proximas = new Set(atuais);
      if (proximas.has(pasta.id)) proximas.delete(pasta.id); else proximas.add(pasta.id);
      return proximas;
    });
    focarDetalheDaPastaNoMobile();
  };
  const abrirPastaPeloConteudo = (pasta: Pasta) => {
    if (operacaoSelecaoRef.current) return;
    if (modoSelecao) { alternarSelecao(`pasta:${pasta.id}`); return; }
    setPastaAtiva(pasta.id);
    if (pasta.pasta_pai_id) setPastasExpandidas((atuais) => new Set([...atuais, pasta.pasta_pai_id as string]));
    focarDetalheDaPastaNoMobile();
  };
  const voltarPastaPeloConteudo = () => {
    if (operacaoSelecaoRef.current) return;
    cancelarSelecao();
    setPastaAtiva(pastaAtivaObjeto?.pasta_pai_id || null);
    focarDetalheDaPastaNoMobile();
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
  return <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/65 px-3 py-5" onClick={(evento) => {
    if (evento.target === evento.currentTarget) onFechar();
  }}>
    {pastaCapaEmEdicao && <div className="fixed inset-0 z-[6150] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center" onClick={() => { if (!salvandoCapa) setPastaCapaEmEdicao(null); }} role="dialog" aria-modal="true" aria-label={`Escolher capa da pasta ${pastaCapaEmEdicao.nome}`}>
      <section className={`flex max-h-[86dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-white bg-white text-slate-900'}`} onClick={(e) => e.stopPropagation()}>
        <header className={`flex shrink-0 items-start justify-between gap-3 border-b p-4 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-600">Capa da pasta principal</p><h3 className="mt-1 text-lg font-black">{pastaCapaEmEdicao.nome}</h3><p className={`mt-1 text-xs ${suave}`}>Use uma imagem já publicada ou envie uma capa privada.</p></div>
          <button type="button" onClick={() => setPastaCapaEmEdicao(null)} disabled={salvandoCapa} aria-label="Fechar seleção de capa" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-black disabled:opacity-50 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>×</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <input ref={inputCapaArquivo} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => enviarCapaExterna(e.target.files)} />
          <button type="button" onClick={() => inputCapaArquivo.current?.click()} onDragEnter={(e) => iniciarArrasteDeArquivo(e, 'capa')} onDragOver={(e) => iniciarArrasteDeArquivo(e, 'capa')} onDragLeave={(e) => sairDoArrasteDeArquivo(e, 'capa')} onDrop={(e) => { e.preventDefault(); setArrastandoCapa(false); enviarCapaExterna(e.dataTransfer.files); }} disabled={salvando || salvandoCapa} className={`mb-4 flex min-h-28 w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 ${arrastandoCapa ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700' : darkMode ? 'border-slate-700 bg-slate-800/60 text-slate-200 hover:border-cyan-500/70' : 'border-cyan-200 bg-cyan-50/60 text-cyan-800 hover:border-cyan-500'}`}>
            <Icone tipo="upload" className="h-6 w-6" /><b className="mt-2 text-xs font-black">Enviar capa privada</b><span className={`mt-1 text-[11px] ${suave}`}>Arraste uma imagem aqui ou clique para selecionar.</span><span className={`mt-1 text-[10px] ${suave}`}>Ela aparece apenas no cartão da pasta e não fica disponível para vendedores.</span>
          </button>
          {imagensCandidatasCapa.length ? <><div className={`mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] ${suave}`}><span className={`h-px flex-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />Imagens já publicadas<span className={`h-px flex-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} /></div><p className={`mb-3 text-center text-[10px] ${suave}`}>Essas imagens continuam disponíveis para os vendedores, mesmo quando usadas como capa.</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {imagensCandidatasCapa.map((item) => {
              const selecionada = pastaCapaEmEdicao.capa_material_id === item.id;
              const nomePasta = pastas.find((pasta) => pasta.id === item.pasta_id)?.nome || 'Subpasta';
              return <button key={item.id} type="button" onClick={() => void salvarCapaPasta(item.id)} disabled={salvandoCapa} aria-pressed={selecionada} className={`overflow-hidden rounded-2xl border-2 text-left transition disabled:opacity-60 ${selecionada ? 'border-cyan-500 ring-2 ring-cyan-500/20' : darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className="relative block aspect-square overflow-hidden bg-slate-950"><img src={item.miniatura_url || item.arquivo_url} alt={item.titulo} className="h-full w-full object-cover" />{selecionada && <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-cyan-500 text-lg font-black text-white shadow-lg">✓</span>}</span>
                <span className="block p-2"><b className="block truncate text-xs">{item.titulo}</b><small className={`mt-0.5 block truncate text-[10px] ${suave}`}>{nomePasta}</small></span>
              </button>;
            })}
          </div></> : <div className={`rounded-2xl border border-dashed px-5 py-10 text-center ${darkMode ? 'border-slate-700' : 'border-slate-300'}`}><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-cyan-500/10 text-cyan-600"><Icone tipo="image" /></span><h4 className="mt-3 text-sm font-black">Nenhuma imagem publicada</h4><p className={`mx-auto mt-1 max-w-sm text-xs leading-relaxed ${suave}`}>Envie uma capa privada acima ou adicione imagens à pasta e às subpastas.</p></div>}
        </div>
        {temCapaAtual && <footer className={`shrink-0 border-t p-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><button type="button" onClick={() => void salvarCapaPasta(null)} disabled={salvandoCapa} className="min-h-11 w-full rounded-xl border border-red-300 px-4 text-xs font-black uppercase text-red-600 disabled:opacity-60">{salvandoCapa ? 'Salvando...' : 'Remover capa atual'}</button></footer>}
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
          <p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-cyan-600">Conteúdo AvantaVendas</p>
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
    <section className={`flex h-[94dvh] max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${fundo}`} onClick={(e) => e.stopPropagation()}>
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 text-white" style={{ background: `linear-gradient(135deg, ${corPrimaria}, #1687D9)` }}><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.18em] text-white/70">Conteúdo AvantaVendas</p><h2 className="mt-0.5 whitespace-nowrap text-base font-black leading-tight">Conteúdo para a equipe</h2><p className="mt-0.5 truncate whitespace-nowrap text-[10px] leading-tight text-white/80">Novidades e divulgação de {nomeEmpresa || 'este perfil'}.</p></div><button type="button" onClick={onFechar} aria-label={rotuloFechar ? 'Voltar para Meus módulos' : 'Fechar'} className={`flex shrink-0 items-center justify-center bg-white/15 font-medium hover:bg-white/25 ${rotuloFechar ? 'min-h-11 rounded-xl px-3 text-sm' : 'h-8 w-8 rounded-full text-base'}`}>{rotuloFechar || '×'}</button></header>
      <nav className={`grid shrink-0 grid-cols-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><button type="button" onClick={() => setAba('novidades')} className={`h-9 text-[10px] font-black uppercase ${aba === 'novidades' ? 'text-white' : suave}`} style={aba === 'novidades' ? { backgroundColor: corPrimaria } : undefined}>Novidades</button><button type="button" onClick={() => setAba('divulgacao')} className={`h-9 text-[10px] font-black uppercase ${aba === 'divulgacao' ? 'text-white' : suave}`} style={aba === 'divulgacao' ? { backgroundColor: corPrimaria } : undefined}>Divulgação</button><button type="button" onClick={() => setAba('produtos')} className={`h-9 text-[10px] font-black uppercase ${aba === 'produtos' ? 'text-white' : suave}`} style={aba === 'produtos' ? { backgroundColor: corPrimaria } : undefined}>Produtos</button></nav>
      {erro && <p className="mx-4 mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}
      {resultadoEnvio && <p role="status" aria-live="polite" className={`mx-4 mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${resultadoEnvio.tipo === 'sucesso' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>{resultadoEnvio.mensagem}</p>}
      {aba === 'novidades' ? <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        <div className={`self-start rounded-xl border p-4 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}><h3 className="text-base font-black">Nova publicação</h3><p className={`mt-1 text-xs ${suave}`}>Aparece somente para vendedores vinculados a este perfil.</p><label className="mt-4 block text-[10px] font-black uppercase opacity-60">Tipo</label><select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-bold ${campo}`}>{TIPOS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select><label className="mt-3 block text-[10px] font-black uppercase opacity-60">Título</label><input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-bold ${campo}`} /><label className="mt-3 block text-[10px] font-black uppercase opacity-60">Descrição</label><textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} className={`mt-1 w-full rounded-lg border p-3 text-sm ${campo}`} /><button type="button" onClick={() => void publicar()} disabled={salvando} className="mt-3 h-11 w-full rounded-xl text-xs font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{salvando ? 'Publicando...' : 'Publicar novidade'}</button></div>
        <div><h3 className="text-base font-black">Histórico</h3><p className={`text-xs ${suave}`}>Publicações mais recentes primeiro.</p><div className="mt-3 grid gap-2">{carregando ? <p className="py-8 text-center text-sm opacity-60">Carregando...</p> : novidades.length ? novidades.map((item) => <article key={item.id} className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200'}`}><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: corPrimaria }}><Icone tipo={item.tipo} className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><span className="text-[8px] font-black uppercase" style={{ color: corPrimaria }}>{rotuloTipo(item.tipo)}</span><h4 className="text-sm font-black">{item.titulo}</h4></div><button type="button" onClick={() => setExclusaoPendente({ tipo: 'novidade', item })} className="h-8 w-8 shrink-0 rounded-lg border border-red-300 text-red-600">×</button></div><p className={`mt-1 whitespace-pre-wrap text-xs ${suave}`}>{item.descricao}</p></div></div></article>) : <p className="py-8 text-center text-sm opacity-60">Nenhuma novidade publicada.</p>}</div></div>
      </div> : aba === 'produtos' ? <CatalogoProdutosVendas empresaId={empresaId || ''} darkMode={darkMode} corPrimaria={corPrimaria} /> : <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:overflow-hidden">
        <aside className={`order-2 self-start rounded-xl border p-3 lg:order-1 lg:flex lg:h-full lg:min-h-0 lg:flex-col ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
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
              return <div key={pasta.id} {...eventosDestinoPasta(pasta.id)} style={{ marginLeft: `${Math.min(nivel, 4) * 12}px` }} className={`flex flex-wrap items-center gap-1.5 rounded-lg border p-2 ${destaquePasta} ${destaqueDestino(pasta.id)}`}><button type="button" onClick={() => selecionarPasta(pasta, temFilhos)} aria-expanded={temFilhos ? expandida : undefined} className="flex min-w-0 flex-1 items-center gap-2 text-left"><Icone tipo="folder" className={`h-5 w-5 shrink-0 ${pastaAtiva === pasta.id || subpastaDoRamoAtivo ? 'text-cyan-500' : 'text-amber-500'}`} /><span className="min-w-0 flex-1"><b className="block truncate text-xs">{pasta.nome}</b><small className={`block text-[9px] ${suave}`}>{totalMateriais} {totalMateriais === 1 ? 'material' : 'materiais'} · {totalSubpastas} {totalSubpastas === 1 ? 'subpasta' : 'subpastas'}</small></span>{temFilhos && <span className={`shrink-0 text-base transition-transform ${expandida ? 'rotate-90' : ''}`} aria-hidden="true">›</span>}</button><button type="button" onClick={() => iniciarEdicaoPasta(pasta)} aria-label={`Editar nome da pasta ${pasta.nome}`} title="Editar nome" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-cyan-600 hover:bg-cyan-500/10"><Icone tipo="edit" className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setExclusaoPendente({ tipo: 'pasta', item: pasta })} aria-label={`Excluir pasta ${pasta.nome}`} title="Excluir pasta" className="h-8 w-8 shrink-0 rounded-md text-red-500 hover:bg-red-500/10">×</button>{pastaAtiva === pasta.id && <button type="button" onClick={() => inputArquivos.current?.click()} disabled={salvando} className="mt-1 flex h-12 basis-full items-center justify-center gap-2 rounded-lg text-xs font-black uppercase text-white disabled:opacity-60 lg:hidden" style={{ backgroundColor: corPrimaria }}><Icone tipo="upload" className="h-4 w-4" />{salvando ? 'Enviando...' : 'Enviar arquivos para esta pasta'}</button>}</div>;
            })}
            {!listaPastasVisiveis.length && <p className={`py-3 text-center text-xs ${suave}`}>Nenhuma pasta criada.</p>}
          </div>
        </aside>
        <section id="detalhe-divulgacao-vendas" tabIndex={-1} className="order-1 min-w-0 scroll-mt-3 focus:outline-none lg:order-2 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          <header className={`sticky top-0 z-20 flex flex-wrap items-start justify-between gap-3 pb-3 ${darkMode ? 'bg-slate-900' : 'bg-white'}`} data-divulgacao-fixed-header>
            <div className="flex min-w-0 items-center gap-3">
              {pastaAtivaObjeto && <button type="button" aria-label="Voltar à pasta anterior" {...(pastaAtivaObjeto.pasta_pai_id ? eventosDestinoPasta(pastaAtivaObjeto.pasta_pai_id) : {})} onClick={voltarPastaPeloConteudo} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-xl">‹</button>}
              <h3 className="min-w-0 truncate text-sm font-semibold"><span className={suave}>Divulgação</span>{pastaAtivaObjeto && <> / {pastaAtivaObjeto.nome}</>}</h3>
            </div>
            {pastaAtivaObjeto && <div className="flex items-center gap-2">
              <details ref={menuMaisRef} open={menuMais} onToggle={(evento) => setMenuMais(evento.currentTarget.open)} className="relative">
                <summary aria-label="Mais opções" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full text-2xl text-white focus-visible:outline-2 focus-visible:outline-offset-2" style={{ backgroundColor: corPrimaria }}>+</summary>
                <div className={`absolute right-0 top-12 z-30 w-52 rounded-xl border p-1 shadow-lg ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                  <button type="button" aria-label="Nova pasta dentro da pasta aberta" disabled={salvando || Boolean(acaoSelecao)} onClick={() => { setMenuMais(false); setSubpastaLocal({ paiId: pastaAtivaObjeto.id, nome: '' }); setErro(''); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-xs hover:bg-cyan-500/10"><Icone tipo="folder" className="h-4 w-4" />Nova pasta</button>
                  <button type="button" disabled={salvando} onClick={() => { setMenuMais(false); inputArquivos.current?.click(); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-xs hover:bg-cyan-500/10"><Icone tipo="upload" className="h-4 w-4" />Adicionar arquivo</button>
                  {pastaAtivaObjeto.pasta_pai_id === null && <button type="button" onClick={() => { setMenuMais(false); setPastaCapaEmEdicao(pastaAtivaObjeto); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-xs hover:bg-cyan-500/10"><Icone tipo="image" className="h-4 w-4" />Trocar capa</button>}
                  <button type="button" onClick={() => { setMenuMais(false); setModoSelecao(true); setItensSelecionados(new Set([`pasta:${pastaAtivaObjeto.id}`])); }} className="min-h-11 w-full rounded-lg px-3 text-left text-xs hover:bg-cyan-500/10">Selecionar esta pasta</button>
                </div>
              </details>
              <input ref={inputArquivos} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf,.pdf" multiple className="hidden" onChange={(e) => void enviarArquivos(e.target.files)} />
              {!modoSelecao && <BotaoAcaoCompacto disabled={Boolean(movendoMaterialId) || salvando || excluindo} onClick={() => { limparArrasteMaterial(); setItensSelecionados(new Set()); setModoSelecao(true); }}>Selecionar</BotaoAcaoCompacto>}
            </div>}

          </header>
          {pastaAtivaObjeto && !modoSelecao && <button type="button" onClick={() => inputArquivos.current?.click()} onDragEnter={(e) => iniciarArrasteDeArquivo(e, 'materiais')} onDragOver={(e) => iniciarArrasteDeArquivo(e, 'materiais')} onDragLeave={(e) => sairDoArrasteDeArquivo(e, 'materiais')} onDrop={(e) => { e.preventDefault(); setArrastandoMateriais(false); void enviarArquivos(e.dataTransfer.files); }} disabled={salvando} className={`mt-3 hidden min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 lg:flex ${arrastandoMateriais ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700' : darkMode ? 'border-slate-700 bg-slate-800/60 text-slate-200 hover:border-cyan-500/70' : 'border-cyan-200 bg-cyan-50/60 text-cyan-800 hover:border-cyan-500'}`}>
            <Icone tipo="upload" className="h-4 w-4" /><span className="text-xs">Arraste arquivos para enviar ou clique em <b>Adicionar arquivo</b></span>
          </button>}
          {!pastaAtiva && <section className="mt-5" aria-labelledby="pastas-de-divulgacao"><div className="mb-2 flex items-center justify-between gap-3"><h4 id="pastas-de-divulgacao" className="text-xs font-black uppercase tracking-[.12em]">Pastas de divulgação</h4><span className={`text-[10px] font-bold ${suave}`}>{pastasPrincipais.length} {pastasPrincipais.length === 1 ? 'pasta' : 'pastas'}</span></div>{pastasPrincipais.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{pastasPrincipais.map((pasta) => { const capa = urlCapaDaPasta(pasta, pastas, materiais); const quantidade = contarMateriaisNaArvore(pasta.id, pastas, materiais); const subpastas = pastas.filter((item) => item.pasta_pai_id === pasta.id).length; return <button key={pasta.id} {...eventosDestinoPasta(pasta.id)} type="button" onClick={() => abrirPastaPeloConteudo(pasta)} className={`${destaqueDestino(pasta.id)} overflow-hidden rounded-xl border text-left transition hover:border-cyan-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-800/70' : 'border-slate-200 bg-white hover:bg-cyan-50/50'}`}>{capa ? <img src={capa} alt="" className="aspect-[16/10] w-full object-cover" /> : <span className={`flex aspect-[16/10] items-center justify-center ${darkMode ? 'bg-slate-950 text-amber-400' : 'bg-amber-50 text-amber-600'}`}><Icone tipo="folder" className="h-9 w-9" /></span>}<span className="block p-3"><b className="block truncate text-xs">{pasta.nome}</b><span className={`mt-1 block text-[10px] ${suave}`}>{quantidade} {quantidade === 1 ? 'material' : 'materiais'} · {subpastas} {subpastas === 1 ? 'subpasta' : 'subpastas'}</span></span></button>; })}</div> : <p className={`rounded-xl border border-dashed px-4 py-10 text-center text-sm ${suave}`}>Crie a primeira pasta para começar a publicar materiais.</p>}</section>}
          {pastaAtivaObjeto && subpastasAtivas.length > 0 && <section className="mt-5" aria-labelledby="subpastas-da-pasta"><div className="mb-2 flex items-center justify-between gap-3"><h4 id="subpastas-da-pasta" className="text-xs font-black uppercase tracking-[.12em]">Subpastas</h4><span className={`text-[10px] font-bold ${suave}`}>{subpastasAtivas.length} {subpastasAtivas.length === 1 ? 'subpasta' : 'subpastas'}</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{subpastasAtivas.map((pasta) => { const quantidade = contarMateriaisNaArvore(pasta.id, pastas, materiais); return <div key={pasta.id} className="relative">{modoSelecao && <input type="checkbox" aria-label={`Selecionar pasta ${pasta.nome}`} checked={itensSelecionados.has(`pasta:${pasta.id}`)} disabled={Boolean(acaoSelecao)} onChange={() => alternarSelecao(`pasta:${pasta.id}`)} className="absolute right-3 top-3 z-10 h-5 w-5" />}<button {...eventosDestinoPasta(pasta.id)} type="button" onClick={() => abrirPastaPeloConteudo(pasta)} aria-pressed={modoSelecao ? itensSelecionados.has(`pasta:${pasta.id}`) : undefined} className={`${destaqueDestino(pasta.id)} w-full min-h-24 rounded-xl border p-3 text-left transition hover:border-cyan-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 ${darkMode ? 'border-slate-700 bg-slate-800 hover:bg-slate-800/70' : 'border-slate-200 bg-white hover:bg-cyan-50/50'}`}><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600"><Icone tipo="folder" className="h-4 w-4" /></span><b className="mt-2 block truncate text-xs">{pasta.nome}</b><span className={`mt-1 block text-[10px] ${suave}`}>{quantidade} {quantidade === 1 ? 'material' : 'materiais'}</span></button></div>; })}</div></section>}
          {pastaAtivaObjeto && <section className="mt-5" aria-labelledby="materiais-publicados"><div className="mb-2 flex items-center justify-between gap-3"><h4 id="materiais-publicados" className="text-xs font-black uppercase tracking-[.12em]">Materiais publicados</h4><span className={`text-[10px] font-bold ${suave}`}>{movendoMaterialId ? 'Movendo material...' : materialArrastadoId ? 'Solte sobre a pasta de destino' : materiaisAtivos.length} {movendoMaterialId || materialArrastadoId ? '' : materiaisAtivos.length === 1 ? 'material' : 'materiais'}</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{materiaisAtivos.map((item) => <article key={item.id} draggable={!modoSelecao && !movendoMaterialId && !salvando && !excluindo} onDragStart={(evento) => iniciarArrasteMaterial(evento, item)} onDragEnd={limparArrasteMaterial} className={`group relative flex flex-col overflow-hidden rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>{modoSelecao && <input type="checkbox" aria-label={`Selecionar arquivo ${item.titulo}`} checked={itensSelecionados.has(`material:${item.id}`)} disabled={Boolean(acaoSelecao)} onChange={() => alternarSelecao(`material:${item.id}`)} className="absolute right-3 top-3 z-10 h-5 w-5" />}<button type="button" onClick={() => modoSelecao ? alternarSelecao(`material:${item.id}`) : setMaterialEmVisualizacao(item)} aria-pressed={modoSelecao ? itensSelecionados.has(`material:${item.id}`) : undefined} aria-label={`${modoSelecao ? 'Selecionar' : 'Visualizar'} ${item.titulo}`} className="relative block aspect-square w-full bg-slate-950 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-400">{item.miniatura_url ? <img src={item.miniatura_url} alt="" draggable={false} className="h-full w-full object-cover" /> : item.tipo === 'video' ? <span className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-slate-300"><span className={`h-7 w-7 rounded-full border-2 border-cyan-400/25 ${item.miniatura_status === 'erro' ? '' : 'animate-spin border-t-cyan-400'}`} /><b className="text-[10px] uppercase tracking-wide">{item.miniatura_status === 'erro' ? 'Capa indisponível' : 'Preparando capa'}</b></span> : <span className="flex h-full items-center justify-center text-slate-500"><Icone tipo="image" /></span>}<span className="absolute bottom-2 left-2 rounded-full bg-black/70 p-1.5 text-white"><Icone tipo={item.tipo === 'video' ? 'video' : 'image'} className="h-3.5 w-3.5" /></span></button><div className="flex flex-1 flex-col p-3"><b className="whitespace-normal break-words text-xs [overflow-wrap:anywhere]">{item.titulo}</b><span className={`mt-1 text-[10px] ${suave}`}>{rotuloMaterial(item.tipo)}</span><div className="mt-auto flex items-center justify-end gap-2 pt-2"><BotaoAcaoCompacto aria-label={`Mover ${item.titulo}`} hidden={modoSelecao} disabled={Boolean(movendoMaterialId) || salvando || excluindo} onClick={() => { setMaterialParaMover(item); setDestinoMovimento(''); setErro(''); }}>Mover</BotaoAcaoCompacto><button type="button" onClick={() => setExclusaoPendente({ tipo: 'material', item })} aria-label={`Excluir ${item.titulo}`} hidden={modoSelecao} className="h-7 w-7 shrink-0 rounded-md text-red-500">×</button></div></div></article>)}{!materiaisAtivos.length && <p className={`col-span-full rounded-xl border border-dashed px-4 py-12 text-center text-sm ${suave}`}>Esta pasta ainda não possui materiais publicados.</p>}</div></section>}
        </section>
      </div>}
            {aba === 'divulgacao' && pastaAtivaObjeto && modoSelecao && <footer className={`flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-3 ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`} aria-label="Seleção de materiais">
                <span role="status" className={`mr-auto text-xs ${suave}`}>{itensSelecionados.size} selecionado(s)</span>
                <BotaoAcaoCompacto className="focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!shadow-none [&>span]:transition-[transform,border-color] [&>span]:duration-150 [&:enabled:hover>span]:!border-current [&:enabled:hover>span]:!filter-none [&:enabled:hover>span]:scale-[1.04] [&:enabled:active>span]:scale-[0.97] [&:focus-visible>span]:!border-current [&:focus-visible>span]:shadow-[inset_0_0_0_1px_currentColor] motion-reduce:[&>span]:!transform-none motion-reduce:[&>span]:transition-none" disabled={!arquivosSelecionados.length || Boolean(pastasSelecionadas.length) || Boolean(acaoSelecao)} title={pastasSelecionadas.length ? 'Para mover, selecione somente arquivos.' : undefined} onClick={() => { setDestinoMovimento(''); setMoverSelecaoAberta(true); setErro(''); }}>{acaoSelecao === 'mover' ? 'Movendo...' : 'Mover'}</BotaoAcaoCompacto>
                {itemUnico && <><BotaoAcaoCompacto className="focus-visible:!outline-none [&:focus-visible>span]:border-current [&>span]:transition-[transform,border-color] [&:enabled:hover>span]:!border-current [&:enabled:hover>span]:!filter-none [&:enabled:hover>span]:scale-[1.04] [&:enabled:active>span]:scale-[0.97] motion-reduce:[&>span]:!transform-none" disabled={Boolean(acaoSelecao)} onClick={() => { setErroNome(''); setRenomearItem({ id: itemUnico.id, tipo: pastaUnica ? 'pasta' : 'material', nome: pastaUnica ? pastaUnica.nome : arquivosSelecionados[0].titulo }); }}>Renomear</BotaoAcaoCompacto><BotaoAcaoCompacto className="focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!shadow-none [&>span]:transition-[transform,border-color] [&>span]:duration-150 [&:enabled:hover>span]:!border-current [&:enabled:hover>span]:!filter-none [&:enabled:hover>span]:scale-[1.04] [&:enabled:active>span]:scale-[0.97] [&:focus-visible>span]:!border-current [&:focus-visible>span]:shadow-[inset_0_0_0_1px_currentColor] motion-reduce:[&>span]:!transform-none motion-reduce:[&>span]:transition-none" disabled={Boolean(acaoSelecao)} onClick={() => { setLinkCopiado(false); setPainelSelecao('compartilhar'); }}>Compartilhar</BotaoAcaoCompacto><BotaoAcaoCompacto className="focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!shadow-none [&>span]:transition-[transform,border-color] [&>span]:duration-150 [&:enabled:hover>span]:!border-current [&:enabled:hover>span]:!filter-none [&:enabled:hover>span]:scale-[1.04] [&:enabled:active>span]:scale-[0.97] [&:focus-visible>span]:!border-current [&:focus-visible>span]:shadow-[inset_0_0_0_1px_currentColor] motion-reduce:[&>span]:!transform-none motion-reduce:[&>span]:transition-none" disabled={Boolean(acaoSelecao)} onClick={() => setPainelSelecao('detalhes')}>Detalhes</BotaoAcaoCompacto></>}
                <BotaoAcaoCompacto className="focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!shadow-none [&>span]:transition-[transform,border-color] [&>span]:duration-150 [&:enabled:hover>span]:!border-current [&:enabled:hover>span]:!filter-none [&:enabled:hover>span]:scale-[1.04] [&:enabled:active>span]:scale-[0.97] [&:focus-visible>span]:!border-current [&:focus-visible>span]:shadow-[inset_0_0_0_1px_currentColor] motion-reduce:[&>span]:!transform-none motion-reduce:[&>span]:transition-none" variante="destrutivo" disabled={!itensSelecionados.size || Boolean(acaoSelecao)} onClick={() => setExcluirSelecaoAberta(true)}>{acaoSelecao === 'excluir' ? 'Excluindo...' : 'Excluir'}</BotaoAcaoCompacto>
                <BotaoAcaoCompacto className="focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!shadow-none [&>span]:transition-[transform,border-color] [&>span]:duration-150 [&:enabled:hover>span]:!border-current [&:enabled:hover>span]:!filter-none [&:enabled:hover>span]:scale-[1.04] [&:enabled:active>span]:scale-[0.97] [&:focus-visible>span]:!border-current [&:focus-visible>span]:shadow-[inset_0_0_0_1px_currentColor] motion-reduce:[&>span]:!transform-none motion-reduce:[&>span]:transition-none" disabled={Boolean(acaoSelecao)} onClick={cancelarSelecao}>Cancelar</BotaoAcaoCompacto>
            </footer>}
    </section>
    <CardExpandidoModal aberto={Boolean(renomearItem)} rotulo="Renomear item" variante="compacto" darkMode={darkMode} onFechar={() => { if (!salvandoNome) setRenomearItem(null); }}>
      <form className={`rounded-2xl border p-5 ${fundo}`} onSubmit={(evento) => { evento.preventDefault(); void salvarNomeSelecionado(); }}>
        <h3 className="text-lg font-semibold">Renomear {renomearItem?.tipo === 'pasta' ? 'pasta' : 'arquivo'}</h3>
        <label className="mt-4 block text-xs font-medium">Nome<input autoFocus required value={renomearItem?.nome || ''} onChange={(evento) => setRenomearItem((item) => item ? { ...item, nome: evento.target.value } : null)} disabled={salvandoNome} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm ${campo}`} /></label>
        {erroNome && <p role="alert" className="mt-2 text-xs text-red-600">{erroNome}</p>}
        <div className="mt-4 flex justify-end gap-2"><BotaoAcaoCompacto disabled={salvandoNome} onClick={() => setRenomearItem(null)}>Cancelar</BotaoAcaoCompacto><BotaoAcaoCompacto type="submit" disabled={salvandoNome}>{salvandoNome ? 'Salvando...' : 'Salvar nome'}</BotaoAcaoCompacto></div>
      </form>
    </CardExpandidoModal>
    <CardExpandidoModal aberto={Boolean(painelSelecao && itemUnico)} rotulo={painelSelecao === 'detalhes' ? 'Detalhes da seleção' : 'Compartilhar seleção'} variante="compacto" darkMode={darkMode} onFechar={() => setPainelSelecao(null)}>
      {itemUnico && <section className={`rounded-2xl border p-5 ${fundo}`}>
        <h3 className="text-lg font-semibold">{painelSelecao === 'detalhes' ? 'Detalhes' : 'Compartilhar'}</h3>
        <p className="mt-2 break-words text-sm font-medium">{'titulo' in itemUnico ? itemUnico.titulo : itemUnico.nome}</p>
        {painelSelecao === 'detalhes' ? <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-xs">
          <dt>Tipo</dt><dd>{pastaUnica ? 'Pasta' : rotuloMaterial(arquivosSelecionados[0].tipo)}</dd>
          <dt>Criado em</dt><dd>{itemUnico.criado_em ? new Date(itemUnico.criado_em).toLocaleString('pt-BR') : 'Não informado'}</dd>
          <dt>Localização</dt><dd>{pastaUnica ? pastas.find((pasta) => pasta.id === pastaUnica.pasta_pai_id)?.nome || 'Divulgação' : pastas.find((pasta) => pasta.id === arquivosSelecionados[0].pasta_id)?.nome || 'Não informada'}</dd>
          <dt>Tamanho{pastaUnica ? ' conhecido' : ''}</dt><dd>{arquivosDoItem.some((item) => item.tamanho_bytes != null) ? `${(arquivosDoItem.reduce((total, item) => total + (item.tamanho_bytes || 0), 0) / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB` : 'Não informado'}</dd>
          {pastaUnica && <><dt>Conteúdo</dt><dd>{arquivosDoItem.length} arquivo(s) · {idsSubpastasDaPasta(pastaUnica.id, pastas).size} subpasta(s)</dd></>}
          <dt>Identificador</dt><dd className="break-all">{itemUnico.id}</dd>
        </dl> : <><p className={`mt-2 text-xs ${suave}`}>{pastaUnica ? 'Compartilha os links dos arquivos desta pasta. As permissões existentes não são alteradas.' : 'Compartilhe o link do arquivo.'}</p><textarea readOnly aria-label="Conteúdo para compartilhar" value={textoCompartilhar} className={`mt-3 min-h-28 w-full rounded-xl border p-3 text-xs ${campo}`} /><BotaoAcaoCompacto disabled={!arquivosDoItem.length} onClick={() => void compartilharSelecao()}>{linkCopiado ? 'Copiado' : 'Compartilhar ou copiar'}</BotaoAcaoCompacto></>}
        <div className="mt-4 flex justify-end"><BotaoAcaoCompacto onClick={() => setPainelSelecao(null)}>Fechar</BotaoAcaoCompacto></div>
      </section>}
    </CardExpandidoModal>
    <CardExpandidoModal aberto={Boolean(subpastaLocal)} rotulo="Nova subpasta" variante="compacto" darkMode={darkMode} onFechar={() => { if (!salvando) setSubpastaLocal(null); }}>
      <form className={`rounded-2xl border p-5 ${fundo}`} onSubmit={(evento) => { evento.preventDefault(); if (subpastaLocal) void criarPasta(subpastaLocal); }}>
        <h3 className="text-lg font-semibold">Nova pasta</h3><p className={`mt-1 text-xs ${suave}`}>Dentro de {pastas.find((pasta) => pasta.id === subpastaLocal?.paiId)?.nome}</p>
        <label className="mt-4 block text-xs font-medium">Nome da pasta<input autoFocus value={subpastaLocal?.nome || ''} onChange={(evento) => setSubpastaLocal((atual) => atual ? { ...atual, nome: evento.target.value } : null)} disabled={salvando} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm ${campo}`} required /></label>
        {erro && <p role="alert" className="mt-2 text-xs text-red-600">{erro}</p>}
        <div className="mt-4 flex justify-end gap-2"><BotaoAcaoCompacto onClick={() => setSubpastaLocal(null)} disabled={salvando}>Cancelar</BotaoAcaoCompacto><BotaoAcaoCompacto type="submit" disabled={salvando}>{salvando ? 'Criando...' : 'Criar pasta'}</BotaoAcaoCompacto></div>
      </form>
    </CardExpandidoModal>
    <CardExpandidoModal aberto={Boolean(materialParaMover) || moverSelecaoAberta} rotulo="Mover material" variante="compacto" darkMode={darkMode} onFechar={() => { if (!movendoMaterialId && !acaoSelecao) { setMaterialParaMover(null); setMoverSelecaoAberta(false); } }}>
      <form className={`rounded-2xl border p-5 ${fundo}`} onSubmit={(evento) => { evento.preventDefault(); if (moverSelecaoAberta) void executarMovimentoSelecao(); else if (materialParaMover && destinoMovimento) void moverMaterial(materialParaMover, destinoMovimento); }}>
        <h3 className="text-lg font-semibold">{moverSelecaoAberta ? 'Mover arquivos selecionados' : 'Mover material'}</h3><p className={`mt-1 truncate text-xs ${suave}`}>{moverSelecaoAberta ? `${arquivosSelecionados.length} arquivo(s)` : materialParaMover?.titulo}</p>
        <label className="mt-4 block text-xs font-medium">Pasta de destino<select value={destinoMovimento} onChange={(evento) => setDestinoMovimento(evento.target.value)} disabled={Boolean(movendoMaterialId) || Boolean(acaoSelecao)} className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm ${campo}`} required><option value="">Selecione a pasta</option>{pastasOrdenadas.filter(({ pasta }) => pasta.id !== (moverSelecaoAberta ? pastaAtiva : materialParaMover?.pasta_id)).map(({ pasta, nivel }) => <option key={pasta.id} value={pasta.id}>{`${'— '.repeat(nivel)}${pasta.nome}`}</option>)}</select></label>
        {erro && <p role="alert" className="mt-2 text-xs text-red-600">{erro}</p>}
        <div className="mt-4 flex justify-end gap-2"><BotaoAcaoCompacto onClick={() => { setMaterialParaMover(null); setMoverSelecaoAberta(false); }} disabled={Boolean(movendoMaterialId) || Boolean(acaoSelecao)}>Cancelar</BotaoAcaoCompacto><BotaoAcaoCompacto type="submit" disabled={Boolean(movendoMaterialId) || Boolean(acaoSelecao) || !destinoMovimento}>{movendoMaterialId ? 'Movendo...' : 'Mover'}</BotaoAcaoCompacto></div>
      </form>
    </CardExpandidoModal>
    <ModalConfirmacao aberto={excluirSelecaoAberta} titulo="Excluir itens selecionados" mensagem={`Excluir ${arquivosSelecionados.length} arquivo(s) e ${pastasSelecionadas.length} pasta(s) selecionada(s)? As pastas serão excluídas com todas as suas subpastas e arquivos. Esta ação não pode ser desfeita.`} textoCancelar="Voltar" textoConfirmar="Confirmar exclusão" carregando={acaoSelecao === 'excluir'} corPrimaria={corPrimaria} darkMode={darkMode} aoCancelar={() => { if (!acaoSelecao) setExcluirSelecaoAberta(false); }} aoConfirmar={() => void executarExclusaoSelecao()} />
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
