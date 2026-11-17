'use client';

import Image from 'next/image';
import CampoMoeda from './CampoMoeda';
import CampoBusca from './CampoBusca';
import BotaoAcaoCompacto from './BotaoAcaoCompacto';
import ChaveAtivacao from './ChaveAtivacao';
import styles from './CatalogoProdutosVendas.module.css';
import { corTextoSobreFundo } from '../lib/cores-avanta';
import { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { formatarDescricao, formatarMoeda, correspondeBusca } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import ModalConfirmacao from './ModalConfirmacao';

type Produto = { id: string; catalogo_id: string; sku: string | null; nome: string; marca: string | null; categoria: string | null; descricao: string | null; preco_divulgacao: number | null; preco_representante: number | null; unidade: string; imagem_url: string | null; ncm: string | null; codigo_barras: string | null; ativo: boolean; atualizado_em: string };
type Catalogo = { id: string; nome: string; codigo: string; origem: 'externa' | 'custos_local' | 'manual'; ativo: boolean; publicado_avantavendas: boolean; padrao: boolean; atualizado_em: string };
type Props = { empresaId: string; darkMode: boolean; corPrimaria: string };

const vazio = { id: '', sku: '', nome: '', marca: '', categoria: '', descricao: '', preco_divulgacao: '', preco_representante: '', unidade: 'un', imagem_url: '', ncm: '', codigo_barras: '', ativo: true };
const textoNumero = (valor: string) => {
  const texto = String(valor || '').replace(/R\$|\s/g, '');
  return Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
};
const formatarMoedaDigitada = (valor: string) => {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (!digitos) return '';
  return (Number(digitos) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const rotuloOrigemCatalogo = (origem: Catalogo['origem']) => origem === 'custos_local' ? 'Custos e Precificação' : origem === 'manual' ? 'Catálogo próprio' : 'Fonte externa';
const semInternet = () => typeof navigator !== 'undefined' && navigator.onLine === false;
const falhaDeConexao = (erro: unknown) => {
  const detalhe = erro && typeof erro === 'object' ? erro as { message?: unknown; details?: unknown } : {};
  return /failed to fetch|fetch failed|load failed|network(?:error| request failed)|network error|connection (?:refused|reset)|catalogo_conexao_tempo/i.test(String(detalhe.message || erro || '') + ' ' + String(detalhe.details || ''));
};
const nomeArquivoCatalogo = (codigo: string) => codigo.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'catalogo';

export default function CatalogoProdutosVendas({ empresaId, darkMode, corPrimaria }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
  const [formulario, setFormulario] = useState<Record<string, string | boolean>>(vazio);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [empresaConsultada, setEmpresaConsultada] = useState('');
  const [falhaCarga, setFalhaCarga] = useState<'offline' | 'conexao' | 'consulta' | null>(null);
  const sequenciaCargaRef = useRef(0);
  const abortarCargaRef = useRef<AbortController | null>(null);
  const empresaAtualRef = useRef(empresaId);
  empresaAtualRef.current = empresaId;
  const [salvando, setSalvando] = useState(false);
  const revisaoFormularioRef = useRef(0);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [produtoExclusao, setProdutoExclusao] = useState<{ id: string; nome: string } | null>(null);
  const [catalogosAbertos, setCatalogosAbertos] = useState(false);
  const [catalogoEmEdicao, setCatalogoEmEdicao] = useState<Pick<Catalogo, 'id' | 'nome' | 'codigo' | 'origem'> | null>(null);
  const [salvandoCatalogo, setSalvandoCatalogo] = useState(false);
  const [exportacaoAberta, setExportacaoAberta] = useState(false);
  const [catalogoParaExportarId, setCatalogoParaExportarId] = useState('');
  const arquivoRef = useRef<HTMLInputElement>(null);
  const formularioRef = useRef<HTMLElement>(null);
  const botaoNovoRef = useRef<HTMLButtonElement>(null);
  const indiceVozSolicitadoRef = useRef('');
  const campo = darkMode ? 'border-slate-600 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900';
  const painel = darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50';
  const campos = [['nome', 'Nome'], ['marca', 'Marca'], ['categoria', 'Categoria'], ['sku', 'SKU'], ['codigo_barras', 'EAN / GTIN'], ['ncm', 'NCM']];
  const dadosCatalogoProntos = empresaConsultada === empresaId;
  const produtosVisiveis = (dadosCatalogoProntos ? produtos : []).filter((produto) => correspondeBusca([produto.nome, produto.marca, produto.categoria, produto.sku, produto.codigo_barras].filter(Boolean).join(' '), busca));
  const haCatalogoPublicado = dadosCatalogoProntos && catalogos.some((catalogo) => catalogo.publicado_avantavendas);

  const solicitarIndiceVoz = useCallback(async (productId = '') => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || '';
      if (!token) return;
      await fetch('/api/conteudo-vendas/produtos/indexar-voz', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: empresaId, productId: productId || null }),
        keepalive: true,
      });
    } catch { /* O índice determinístico já está disponível; a IA tentará novamente depois. */ }
  }, [empresaId]);

  const carregar = useCallback(async (_emSegundoPlano = false) => {
    if (!empresaId) return;
    const sequencia = ++sequenciaCargaRef.current;
    abortarCargaRef.current?.abort();
    const vigente = () => sequencia === sequenciaCargaRef.current && empresaAtualRef.current === empresaId;
    if (semInternet()) {
      setFalhaCarga('offline');
      setCarregando(false);
      return;
    }
    const controlador = new AbortController();
    abortarCargaRef.current = controlador;
    let timer: number | undefined;
    setCarregando(true);
    setFalhaCarga(null);
    try {
      const prazo = new Promise<never>((_resolver, rejeitar) => {
        timer = window.setTimeout(() => {
          controlador.abort();
          rejeitar(new Error('catalogo_conexao_tempo'));
        }, 15000);
      });
      const [{ data, error }, catalogosResultado] = await Promise.race([
        Promise.all([
          supabase.rpc('listar_produtos_conteudo_vendas_mobile_rpc', { p_empresa_id: empresaId }).abortSignal(controlador.signal),
          supabase.rpc('listar_catalogos_conteudo_vendas_mobile_rpc', { p_empresa_id: empresaId }).abortSignal(controlador.signal),
        ]), prazo,
      ]);
      if (!vigente()) return;
      const resultado = data as { produtos?: Produto[] } | null;
      const catalogosDisponiveis = catalogosResultado.data as { catalogos?: Catalogo[] } | null;
      if (error || catalogosResultado.error) throw error || catalogosResultado.error;
      if (!Array.isArray(resultado?.produtos) || !Array.isArray(catalogosDisponiveis?.catalogos)) throw new Error('catalogo_resposta_invalida');
      setProdutos(resultado.produtos);
      setCatalogos(catalogosDisponiveis.catalogos);
      setEmpresaConsultada(empresaId);
      setFalhaCarga(semInternet() ? 'offline' : null);
      if (indiceVozSolicitadoRef.current !== empresaId) {
        indiceVozSolicitadoRef.current = empresaId;
        void solicitarIndiceVoz();
      }
    } catch (erroCarga) {
      if (vigente()) setFalhaCarga(semInternet() ? 'offline' : controlador.signal.aborted || falhaDeConexao(erroCarga) ? 'conexao' : 'consulta');
    } finally {
      if (timer !== undefined) window.clearTimeout(timer);
      if (vigente()) {
        setCarregando(false);
        abortarCargaRef.current = null;
      }
    }
  }, [empresaId, solicitarIndiceVoz]);

  useEffect(() => {
    setFormularioAberto(false);
    setFormulario(vazio);
    setErro('');
    const timer = window.setTimeout(() => void carregar(), 0);
    const aoDesconectar = () => {
      sequenciaCargaRef.current += 1;
      abortarCargaRef.current?.abort();
      setFalhaCarga('offline');
      setCarregando(false);
    };
    const aoReconectar = () => void carregar(true);
    window.addEventListener('offline', aoDesconectar);
    window.addEventListener('online', aoReconectar);
    return () => {
      window.clearTimeout(timer);
      sequenciaCargaRef.current += 1;
      abortarCargaRef.current?.abort();
      window.removeEventListener('offline', aoDesconectar);
      window.removeEventListener('online', aoReconectar);
    };
  }, [carregar]);
  const mudar = (nome: string, valor: string | boolean) => {
    if (formulario[nome] === valor) return;
    revisaoFormularioRef.current += 1;
    setFormulario((atual) => ({ ...atual, [nome]: valor }));
  };
  const levarAoFormulario = () => {
    window.requestAnimationFrame(() => formularioRef.current?.scrollTo({ top: 0, behavior: 'auto' }));
  };
  const iniciarNovoProduto = () => {
    if (salvando) return;
    if (!haCatalogoPublicado) {
      setErro('Ative um catálogo no AvantaVendas antes de cadastrar produtos.');
      return;
    }
    setErro('');
    setFormulario(vazio);
    setFormularioAberto(true);
    levarAoFormulario();
  };
  const retornarLista = () => {
    setErro('');
    setFormulario(vazio);
    setFormularioAberto(false);
    window.requestAnimationFrame(() => botaoNovoRef.current?.focus());
  };
  const cancelarFormulario = () => {
    if (!salvando) retornarLista();
  };
  const editar = (produto: Produto) => {
    if (salvando) return;
    setErro('');
    setFormulario({ ...vazio, ...produto, preco_representante: produto.preco_representante == null ? '' : Number(produto.preco_representante).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), preco_divulgacao: Number(produto.preco_divulgacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), imagem_url: produto.imagem_url || '', sku: /^LEGADO-[0-9A-F]{32}$/i.test(produto.sku || '') ? '' : produto.sku || '', descricao: produto.descricao || '', marca: produto.marca || '', categoria: produto.categoria || '', ncm: produto.ncm || '', codigo_barras: produto.codigo_barras || '' });
    setFormularioAberto(true);
    levarAoFormulario();
  };

  const abrirNovoCatalogo = () => {
    setErro('');
    setCatalogosAbertos(true);
    setCatalogoEmEdicao({ id: '', nome: '', codigo: '', origem: 'manual' });
  };
  const abrirGerenciadorCatalogos = () => {
    setErro('');
    setCatalogosAbertos(true);
    setCatalogoEmEdicao(null);
  };
  const salvarCatalogo = async () => {
    if (!catalogoEmEdicao?.nome.trim()) {
      setErro('Informe o nome do catálogo.');
      return;
    }
    setSalvandoCatalogo(true);
    setErro('');
    const { error } = await supabase.rpc('salvar_catalogo_conteudo_vendas_mobile_rpc', {
      p_empresa_id: empresaId,
      p_catalogo_id: catalogoEmEdicao.id || null,
      p_nome: catalogoEmEdicao.nome.trim(),
      p_codigo: catalogoEmEdicao.codigo.trim() || null,
    });
    setSalvandoCatalogo(false);
    if (error) {
      setErro(error.message || 'Não foi possível salvar o catálogo.');
      return;
    }
    setCatalogoEmEdicao(null);
    await carregar();
  };
  const ativarCatalogo = async (catalogo: Catalogo) => {
    setSalvandoCatalogo(true);
    setErro('');
    const { error } = await supabase.rpc('alterar_status_catalogo_conteudo_vendas_mobile_rpc', { p_empresa_id: empresaId, p_catalogo_id: catalogo.id, p_ativo: true });
    if (error) { setSalvandoCatalogo(false); setErro(error.message || 'Não foi possível ativar o catálogo no Vendas.'); return; }
    await carregar();
    setSalvandoCatalogo(false);
  };
  const desativarCatalogo = async (catalogo: Catalogo) => {
    setSalvandoCatalogo(true);
    setErro('');
    const { error } = await supabase.rpc('alterar_status_catalogo_conteudo_vendas_mobile_rpc', {
      p_empresa_id: empresaId, p_catalogo_id: catalogo.id, p_ativo: false,
    });
    if (error) { setSalvandoCatalogo(false); setErro(error.message || 'Não foi possível alterar o catálogo.'); return; }
    await carregar();
    setSalvandoCatalogo(false);
  };

  const salvar = async () => {
    if (salvando) return;
    const revisaoSalva = revisaoFormularioRef.current;
    const nome = formatarDescricao(String(formulario.nome || ''));
    const revenda = textoNumero(String(formulario.preco_divulgacao || ''));
    const custoInformado = String(formulario.preco_representante || '').trim();
    const custo = custoInformado ? textoNumero(custoInformado) : null;
    const sku = String(formulario.sku || '').trim().toUpperCase();
    if (custo !== null && (!Number.isFinite(custo) || custo < 0 || custo > 9999999999.99)) {
      setErro('Informe um preço de custo válido.');
      return;
    }
    if (!nome || !Number.isFinite(revenda) || revenda <= 0) {
      setErro('Nome e preço sugerido de revenda são obrigatórios.');
      return;
    }
    setSalvando(true);
    setErro('');
    const payload = { sku, codigo_barras: String(formulario.codigo_barras || '').trim() || null, marca: String(formulario.marca || '').trim() || null, categoria: String(formulario.categoria || '').trim() || null, nome, descricao: String(formulario.descricao || '').trim() || null, preco_divulgacao: revenda, preco_representante: custo, unidade: String(formulario.unidade || 'un').trim() || 'un', imagem_url: String(formulario.imagem_url || '').trim() || null, ncm: String(formulario.ncm || '').trim() || null, ativo: formulario.ativo !== false };
    // A rotina protegida separa o preço cobrado do representante dos custos internos da empresa.
    try {
      const { data, error } = await supabase.rpc('salvar_produto_conteudo_vendas_mobile_rpc', {
        p_empresa_id: empresaId,
        p_produto_id: formulario.id ? String(formulario.id) : null,
        p_dados: payload,
      });
      const produtoSalvo = data as { id?: string } | null;
      if (error || !produtoSalvo?.id) {
        setErro(error?.message.toLowerCase().includes('sku') ? 'Este SKU já existe neste pacote.' : error?.message.includes('Ative um catálogo') ? 'Ative um catálogo no AvantaVendas antes de cadastrar produtos.' : 'Não foi possível salvar o produto.');
        return;
      }
      void solicitarIndiceVoz(produtoSalvo.id);
      const semNovasAlteracoes = revisaoFormularioRef.current === revisaoSalva;
      setFormulario((atual) => ({ ...atual, id: produtoSalvo.id!, ...(semNovasAlteracoes ? { nome, sku } : {}) }));
      if (semNovasAlteracoes) retornarLista();
      void carregar(true).catch(() => setErro('Produto salvo, mas não foi possível atualizar a lista. Confira a conexão.'));
      if (!semNovasAlteracoes) setErro('Produto salvo. Há alterações posteriores ainda não salvas.');
    } catch {
      setErro('Não foi possível confirmar o salvamento. Confira a conexão e tente novamente.');
    } finally { setSalvando(false); }
  };

  const enviarImagem = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/') || arquivo.size > 5 * 1024 * 1024) {
      setErro('Use uma imagem de até 5 MB em JPG, PNG ou WebP.');
      return;
    }
    setSalvando(true);
    setErro('');
    const extensao = arquivo.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const caminho = `catalogos/${empresaId}/${crypto.randomUUID()}.${extensao}`;
    const { error } = await supabase.storage.from('vendas-produtos').upload(caminho, arquivo, { upsert: false, cacheControl: '31536000', contentType: arquivo.type });
    setSalvando(false);
    if (error) {
      setErro('Não foi possível enviar a imagem.');
      return;
    }
    mudar('imagem_url', supabase.storage.from('vendas-produtos').getPublicUrl(caminho).data.publicUrl);
  };

  const catalogosExportaveis = catalogos.filter((catalogo) => catalogo.publicado_avantavendas);
  const abrirExportacao = () => {
    if (!catalogosExportaveis.length) { setErro('Ative ao menos um catálogo no AvantaVendas antes de gerar o pacote.'); return; }
    if (catalogosExportaveis.length === 1) { void exportarPacoteZip(catalogosExportaveis[0]); return; }
    setErro('');
    setCatalogoParaExportarId(catalogos.find((catalogo) => catalogo.padrao)?.id || catalogosExportaveis[0].id);
    setExportacaoAberta(true);
  };
  const exportarPacoteZip = async (catalogo: Catalogo) => {
    setExportando(true);
    setErro('');
    try {
      const resultado = await supabase.rpc('listar_produtos_catalogo_conteudo_vendas_mobile_rpc', { p_empresa_id: empresaId, p_catalogo_id: catalogo.id });
      const dados = resultado.data as { produtos?: Produto[] } | null;
      const produtosParaExportar = Array.isArray(dados?.produtos) ? dados.produtos : [];
      if (resultado.error || !dados) throw new Error('Catálogo indisponível.');
      if (!produtosParaExportar.length) { setErro(`O catálogo “${catalogo.nome}” não possui produtos para exportar.`); return; }
      const zip = new JSZip();
      const itens = await Promise.all(produtosParaExportar.map(async (produto) => {
        let imagem_arquivo = '';
        if (produto.imagem_url) {
          try {
            const resposta = await fetch(produto.imagem_url);
            if (resposta.ok) {
              const extensao = resposta.headers.get('content-type')?.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'webp';
              imagem_arquivo = `imagens/${produto.id}.${extensao}`;
              zip.file(imagem_arquivo, await resposta.blob());
            }
          } catch { /* o produto ainda é exportado, apenas sem a cópia da imagem */ }
        }
        return { ...produto, preco_custo: Number(produto.preco_representante || 0), preco_venda: Number(produto.preco_divulgacao || 0), imagem_arquivo };
      }));
      zip.file('catalogo-vendas-mobile.json', JSON.stringify({ versao: 1, criado_em: new Date().toISOString(), catalogo: { id: catalogo.id, nome: catalogo.nome, codigo: catalogo.codigo }, produtos: itens }, null, 2));
      const arquivo = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pacote-${nomeArquivoCatalogo(catalogo.codigo)}-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setErro('Não foi possível gerar o pacote ZIP.'); }
    finally { setExportando(false); setExportacaoAberta(false); }
  };

  const solicitarExclusaoProduto = () => {
    if (salvando) return;
    const id = String(formulario.id || '');
    if (!id) return;
    setProdutoExclusao({ id, nome: String(formulario.nome || 'selecionado') });
  };

  const excluirProduto = async () => {
    if (salvando || !produtoExclusao) return;
    const { id } = produtoExclusao;
    setSalvando(true);
    setErro('');
    try {
      const { data, error } = await supabase.rpc('excluir_produto_conteudo_vendas_mobile_rpc', { p_empresa_id: empresaId, p_produto_id: id, p_confirmado: true });
      const produtoExcluido = data as { id?: string } | null;
      if (error || !produtoExcluido?.id) {
        setErro('Não foi possível confirmar a exclusão. O editor permanece aberto; confira a conexão e tente novamente.');
        return;
      }
      setProdutos((atuais) => atuais.filter((produto) => produto.id !== id));
      retornarLista();
    } catch {
      setErro('Não foi possível confirmar a exclusão. O editor permanece aberto; confira a conexão e tente novamente.');
    } finally {
      setSalvando(false);
      setProdutoExclusao(null);
    }
  };

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
    <div className={`${formularioAberto ? 'mb-2' : 'mb-4'} shrink-0 sm:flex sm:items-start sm:justify-between sm:gap-5`}>
      <div className="min-w-0"><h3 className="text-base font-black">Pacote de produtos</h3>{!formularioAberto && <p className={`mt-1 max-w-xl text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Somente catálogos ativos no AvantaVendas alimentam as contas vinculadas. O estado em Vendas e Serviços é independente.</p>}</div>
      <div className={`${formularioAberto ? 'hidden' : 'grid'} mt-3 w-full grid-cols-2 gap-2 sm:mt-0 sm:w-[min(100%,42rem)] sm:shrink-0`} aria-label="Ações do catálogo">
        <span className="flex h-9 items-center justify-center rounded-lg bg-cyan-500/10 px-2 text-[10px] font-black uppercase text-cyan-700">{dadosCatalogoProntos ? produtos.length + ' produtos' : 'Produtos'}</span>
        <button type="button" onClick={abrirExportacao} disabled={exportando || !dadosCatalogoProntos || carregando || Boolean(falhaCarga)} className="h-9 rounded-lg border border-cyan-300 px-2 text-[10px] font-black uppercase text-cyan-700 disabled:opacity-60">{exportando ? 'Gerando...' : 'Gerar ZIP'}</button>
        <button type="button" onClick={abrirGerenciadorCatalogos} disabled={!dadosCatalogoProntos || carregando || Boolean(falhaCarga)} className="col-span-2 h-9 rounded-lg border border-cyan-300 px-3 text-[10px] font-black uppercase text-cyan-700 disabled:opacity-50">Gerenciar catálogos</button>
        <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
          <CampoBusca aria-label="Pesquisar produtos" placeholder="Pesquisar produtos" value={busca} onChange={setBusca} className={`h-11 w-full min-w-0 rounded-lg border px-3 text-sm ${campo}`} />
        <button type="button" onClick={abrirNovoCatalogo} disabled={carregando || salvandoCatalogo || !dadosCatalogoProntos || Boolean(falhaCarga)} className="h-11 rounded-lg border border-cyan-300 px-2 text-[10px] font-black uppercase text-cyan-700 disabled:opacity-60">Novo catálogo</button>
        <button ref={botaoNovoRef} type="button" onClick={iniciarNovoProduto} disabled={carregando || salvando || !haCatalogoPublicado || Boolean(falhaCarga)} title={dadosCatalogoProntos && !falhaCarga && !haCatalogoPublicado ? 'Ative um catálogo no AvantaVendas em Gerenciar catálogos.' : undefined} className="h-11 rounded-lg px-2 text-[10px] font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>Novo produto</button>
        </div>
      </div>
    </div>
    {falhaCarga && <div role="alert" className={`mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${darkMode ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <p className="min-w-0 flex-1">{falhaCarga === 'offline' ? 'Sem conexão com a internet. Conecte-se para carregar o catálogo.' : falhaCarga === 'conexao' ? 'Não foi possível conectar para carregar o catálogo. Verifique sua conexão e tente novamente.' : 'Não foi possível carregar o catálogo. Tente novamente; se continuar, confira seu acesso com o responsável.'}{dadosCatalogoProntos ? ' Os dados da última consulta continuam visíveis.' : ' A consulta ainda não foi concluída.'}</p>
      <BotaoAcaoCompacto onClick={() => void carregar()} disabled={carregando}>Tentar novamente</BotaoAcaoCompacto>
    </div>}
    {dadosCatalogoProntos && !falhaCarga && !carregando && !haCatalogoPublicado && !formularioAberto && <p role="status" className={`mb-3 rounded-lg border px-3 py-2 text-xs font-bold ${darkMode ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>Nenhum catálogo está ativo no AvantaVendas. Use Gerenciar catálogos para ativar o desejado.</p>}
    <div aria-busy={carregando} className={`grid min-h-0 flex-1 gap-4 ${formularioAberto ? 'grid-rows-[minmax(0,1fr)] xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]' : 'grid-rows-[minmax(0,1fr)]'}`}>
      {formularioAberto && <div className="flex min-h-0">
      <section ref={formularioRef} tabIndex={-1} className={`h-full min-h-0 w-full overflow-y-auto rounded-xl border p-3 focus:outline-none md:overflow-visible ${painel}`}>
        <div className="flex flex-wrap items-center gap-2"><h4 className="rounded-full px-3 py-1 text-sm font-black text-white" style={{ backgroundColor: corPrimaria }}>{formulario.id ? 'Editar produto' : 'Novo produto'}</h4><p className="text-[10px] font-bold text-cyan-600">Obrigatórios: nome e preço sugerido de revenda.</p></div>
        {erro && <p role="alert" className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {campos.slice(0, 4).map(([chave, rotulo]) => <label key={chave} className="text-[9px] font-black uppercase opacity-70">{rotulo}<input value={String(formulario[chave] || '')} onChange={(e) => mudar(chave, chave.startsWith('preco') ? formatarMoedaDigitada(e.target.value) : e.target.value)} onBlur={chave === 'nome' ? () => mudar('nome', formatarDescricao(String(formulario.nome || ''))) : undefined} inputMode={chave.startsWith('preco') ? 'numeric' : undefined} className={`mt-0.5 h-8 w-full rounded-md border px-2 text-xs font-bold normal-case ${campo}`} /></label>)}
        </div>
        <div className="mt-1.5 grid grid-cols-[minmax(40px,.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1.5">
          <label className="min-w-0 text-[9px] font-black uppercase opacity-70">Unidade
            <input value={String(formulario.unidade || '')} onChange={(e) => mudar('unidade', e.target.value)} className={`mt-0.5 h-8 w-full rounded-md border px-1 text-xs font-bold normal-case ${campo}`} />
          </label>
          <label className="min-w-0 text-[9px] font-black uppercase opacity-70">Preço custo
            <CampoMoeda value={String(formulario.preco_representante || '')} onChange={(valor) => mudar('preco_representante', valor)} className={`mt-0.5 h-8 w-full rounded-md border px-2 text-xs font-bold normal-case ${campo}`} />
          </label>
          <label className="min-w-0 text-[9px] font-black uppercase opacity-70">Preço revenda
            <CampoMoeda value={String(formulario.preco_divulgacao || '')} onChange={(valor) => mudar('preco_divulgacao', valor)} className={`mt-0.5 h-8 w-full rounded-md border px-2 text-xs font-bold normal-case ${campo}`} />
          </label>
        </div>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
          {campos.slice(4).map(([chave, rotulo]) => <label key={chave} className="text-[9px] font-black uppercase opacity-70">{rotulo}<input value={String(formulario[chave] || '')} onChange={(e) => mudar(chave, e.target.value)} className={`mt-0.5 h-8 w-full rounded-md border px-2 text-xs font-bold normal-case ${campo}`} /></label>)}
        </div>
        <label className="mt-1.5 block text-[9px] font-black uppercase opacity-70">Descrição<textarea value={String(formulario.descricao || '')} onChange={(e) => mudar('descricao', e.target.value)} rows={2} className={`mt-0.5 w-full rounded-md border p-2 text-xs normal-case ${campo}`} /></label>
        <div className="mt-1.5 flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[9px] font-black uppercase opacity-70">Link da imagem<input value={String(formulario.imagem_url || '')} onChange={(e) => mudar('imagem_url', e.target.value)} className={`mt-0.5 h-8 w-full rounded-md border px-2 text-xs normal-case ${campo}`} /></label>
          <input ref={arquivoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void enviarImagem(e.target.files?.[0])} />
          {formulario.imagem_url && <a href={String(formulario.imagem_url)} target="_blank" rel="noreferrer" title="Abrir pré-visualização"><Image src={String(formulario.imagem_url)} alt="Pré-visualização do produto" width={32} height={32} unoptimized className="h-8 w-8 shrink-0 rounded-md border border-cyan-300 object-cover" /></a>}
          <button type="button" onClick={() => arquivoRef.current?.click()} disabled={salvando} className="h-8 shrink-0 rounded-md border border-cyan-300 px-3 text-[10px] font-black uppercase text-cyan-700">Enviar imagem</button>
        </div>
        <div className={styles.acoes} aria-label="Ações do produto" style={{ '--brand': corPrimaria, '--av-action-on-brand': corTextoSobreFundo(corPrimaria), '--av-action-danger': darkMode ? '#fca5a5' : '#b42318' } as React.CSSProperties}>
          <ChaveAtivacao checked={formulario.ativo !== false} onChange={(ativo) => mudar('ativo', ativo)} disabled={salvando} aria-label="Produto ativo" />
          {formulario.id ? <BotaoAcaoCompacto variante="destrutivo" onClick={solicitarExclusaoProduto} disabled={salvando} aria-label="Excluir produto">Excluir</BotaoAcaoCompacto> : <span />}
          <BotaoAcaoCompacto onClick={cancelarFormulario} disabled={salvando}>Cancelar</BotaoAcaoCompacto>
          <BotaoAcaoCompacto variante="primario" onClick={() => void salvar()} disabled={salvando} aria-live="polite" className={styles.salvar}>{salvando ? 'Salvando...' : 'Salvar alterações'}</BotaoAcaoCompacto>
        </div>
      </section>
      </div>}
      <section className={`min-h-0 flex-col ${formularioAberto ? 'hidden xl:flex' : 'flex lg:col-span-2'}`}>
        <div className="flex shrink-0 flex-wrap items-center gap-2"><h4 className="mr-auto text-sm font-black">Produtos dos catálogos publicados</h4>{formularioAberto && <CampoBusca aria-label="Pesquisar produtos" placeholder="Pesquisar produtos" value={busca} onChange={setBusca} className={`h-11 w-full min-w-0 rounded-lg border px-3 text-sm ${campo}`} />}</div>
        <div className="mt-2 min-h-0 flex-1 overflow-auto rounded-xl border">
          <table className="min-w-full text-left text-xs">
            <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <tr>
                <th scope="col" className="px-3 py-2">Produto</th>
                <th scope="col" className="px-3 py-2 text-center">Status</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2 text-right">Preço custo</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2 text-right">Preço revenda</th>
                <th scope="col" className="px-3 py-2 text-center">Imagem</th>
                <th scope="col" className="px-3 py-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!dadosCatalogoProntos ? <tr><td colSpan={6} className="px-3 py-10 text-center">{carregando ? 'Carregando...' : 'Consulta não concluída.'}</td></tr> : produtosVisiveis.length ? produtosVisiveis.map((produto) => <tr key={produto.id} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <td className="min-w-48 px-3 py-2"><button type="button" aria-label={`Editar produto ${produto.nome}`} onClick={() => editar(produto)} disabled={salvando} className="block min-h-11 w-full rounded-md text-left transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-wait"><b className="block">{produto.nome}</b><small className="text-slate-500">{catalogos.find((catalogo) => catalogo.id === produto.catalogo_id)?.nome || 'Catálogo'} · {produto.marca || 'Sem marca'} · {produto.categoria || 'Sem categoria'}</small></button></td>
                <td className="px-3 py-2 text-center"><span className={`inline-flex min-w-16 items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-medium ${produto.ativo ? darkMode ? 'bg-green-500/15 text-green-300' : 'bg-green-100 text-green-800' : darkMode ? 'bg-red-500/15 text-red-300' : 'bg-red-100 text-red-800'}`}>{produto.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{produto.preco_representante == null ? '—' : formatarMoeda(Number(produto.preco_representante))}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatarMoeda(Number(produto.preco_divulgacao || 0))}</td>
                <td className="px-3 py-2 text-center">{produto.imagem_url ? <a href={produto.imagem_url} target="_blank" rel="noreferrer" title="Abrir imagem" className="inline-block"><Image src={produto.imagem_url} alt={`Imagem de ${produto.nome}`} width={36} height={36} unoptimized className="h-9 w-9 rounded-md border object-cover" /></a> : <span className="text-slate-400">—</span>}</td>
                <td className="px-3 py-2 text-center"><BotaoAcaoCompacto onClick={() => editar(produto)} disabled={salvando} className={darkMode ? 'text-cyan-300' : 'text-cyan-700'}>Editar</BotaoAcaoCompacto></td>
              </tr>) : <tr><td colSpan={6} className="px-3 py-10 text-center">{busca ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    {erro && !formularioAberto && !catalogosAbertos && <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}
    <ModalConfirmacao
      aberto={Boolean(produtoExclusao)}
      titulo="Excluir produto"
      mensagem={`Excluir “${produtoExclusao?.nome || 'selecionado'}” dos catálogos, de Custos e Precificação, de Vendas e Serviços e das contas vinculadas do AvantaVendas? Pedidos, lançamentos e históricos anteriores serão preservados.`}
      textoCancelar="Manter produto"
      textoConfirmar="Confirmar exclusão"
      variante="destrutiva"
      carregando={salvando}
      corPrimaria={corPrimaria}
      darkMode={darkMode}
      aoCancelar={() => {
        if (!salvando) setProdutoExclusao(null);
      }}
      aoConfirmar={() => void excluirProduto()}
    />
    {exportacaoAberta && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={() => { if (!exportando) setExportacaoAberta(false); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="titulo-exportar-catalogo" className={`w-full max-w-md rounded-2xl border p-4 shadow-2xl ${darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'}`} onMouseDown={(evento) => evento.stopPropagation()} onSubmit={(evento) => { evento.preventDefault(); const catalogo = catalogosExportaveis.find((item) => item.id === catalogoParaExportarId); if (catalogo) void exportarPacoteZip(catalogo); }}>
        <p className="text-[9px] font-black uppercase tracking-[.15em] text-cyan-700">Conteúdo AvantaVendas</p><h3 id="titulo-exportar-catalogo" className="mt-1 text-lg font-black">Gerar pacote ZIP</h3><p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Escolha um catálogo já publicado no AvantaVendas. Isso não altera o Vendas interno.</p>
        <label className="mt-4 block text-[10px] font-black uppercase opacity-70">Catálogo para exportar<select autoFocus value={catalogoParaExportarId} onChange={(evento) => setCatalogoParaExportarId(evento.target.value)} className={`mt-1 h-11 w-full rounded-lg border px-3 text-sm font-bold normal-case ${campo}`}>{catalogosExportaveis.map((catalogo) => <option key={catalogo.id} value={catalogo.id}>{catalogo.nome} — publicado no AvantaVendas</option>)}</select></label>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setExportacaoAberta(false)} disabled={exportando} className="min-h-10 rounded-lg border px-3 text-[10px] font-black uppercase">Cancelar</button><button type="submit" disabled={exportando || !catalogoParaExportarId} className="min-h-10 rounded-lg px-3 text-[10px] font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{exportando ? 'Gerando...' : 'Gerar ZIP'}</button></div>
      </form>
    </div>}
    {catalogosAbertos && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={() => { if (!salvandoCatalogo) { setCatalogosAbertos(false); setCatalogoEmEdicao(null); } }}>
      <section role="dialog" aria-modal="true" aria-labelledby="titulo-catalogos-vendas" className={`max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border p-4 shadow-2xl ${darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'}`} onMouseDown={(evento) => evento.stopPropagation()}>
        <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-cyan-700">Conteúdo AvantaVendas</p><h3 id="titulo-catalogos-vendas" className="text-lg font-black">Catálogos</h3><p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Publicar aqui compartilha o catálogo com a equipe. O status no Vendas interno não é alterado.</p></div><button type="button" onClick={() => { if (!salvandoCatalogo) { setCatalogosAbertos(false); setCatalogoEmEdicao(null); } }} className="flex h-8 w-8 items-center justify-center rounded-full border text-base" aria-label="Fechar catálogos">×</button></div>
        {erro && <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}
        {catalogoEmEdicao ? <div className={`mt-4 rounded-xl border p-3 ${painel}`}><div className="flex items-center justify-between gap-2"><h4 className="text-sm font-black">{catalogoEmEdicao.id ? 'Editar catálogo' : 'Novo catálogo'}</h4><button type="button" onClick={() => setCatalogoEmEdicao(null)} disabled={salvandoCatalogo} className="text-[10px] font-black uppercase text-cyan-700">Voltar à lista</button></div><label className="mt-3 block text-[10px] font-black uppercase opacity-70">Nome do catálogo<input autoFocus value={catalogoEmEdicao.nome} onChange={(evento) => setCatalogoEmEdicao({ ...catalogoEmEdicao, nome: evento.target.value })} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-bold normal-case ${campo}`} /></label><label className="mt-2 block text-[10px] font-black uppercase opacity-70">Código interno<input value={catalogoEmEdicao.codigo} disabled={catalogoEmEdicao.origem !== 'manual'} onChange={(evento) => setCatalogoEmEdicao({ ...catalogoEmEdicao, codigo: evento.target.value.toUpperCase() })} className={`mt-1 h-10 w-full rounded-lg border px-3 text-sm font-bold normal-case disabled:cursor-not-allowed disabled:opacity-60 ${campo}`} /></label>{catalogoEmEdicao.origem !== 'manual' && <p className="mt-1.5 text-[10px] text-slate-500">O código desta origem é protegido; apenas o nome pode ser ajustado.</p>}<div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setCatalogoEmEdicao(null)} disabled={salvandoCatalogo} className="min-h-10 rounded-lg border px-3 text-[10px] font-black uppercase">Cancelar</button><button type="button" onClick={() => void salvarCatalogo()} disabled={salvandoCatalogo} className="min-h-10 rounded-lg px-3 text-[10px] font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{salvandoCatalogo ? 'Salvando...' : 'Salvar catálogo'}</button></div></div> : <>
          <div className="mt-4 flex justify-end"><button type="button" onClick={abrirNovoCatalogo} className="min-h-10 rounded-lg px-3 text-[10px] font-black uppercase text-white" style={{ backgroundColor: corPrimaria }}>Novo catálogo</button></div>
          <div className="mt-3 grid gap-2">{catalogos.map((catalogo) => {
            return <article key={catalogo.id} className={`rounded-xl border p-3 ${catalogo.publicado_avantavendas ? 'border-4 border-emerald-600' : darkMode ? 'border-slate-700' : 'border-slate-200'} ${catalogo.publicado_avantavendas ? darkMode ? 'bg-slate-800' : 'bg-slate-50' : darkMode ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="flex flex-wrap items-center gap-1.5"><h4 className="text-sm font-black">{catalogo.nome}</h4>{catalogo.publicado_avantavendas && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700">Ativo no AvantaVendas</span>}{!catalogo.publicado_avantavendas && <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500">Desativado no AvantaVendas</span>}</div><p className={`mt-1 text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{rotuloOrigemCatalogo(catalogo.origem)} · {catalogo.codigo} · Vendas e Serviços: {catalogo.ativo ? 'ativo' : 'desativado'}</p></div>
                <div className="flex flex-wrap justify-end gap-1.5"><button type="button" onClick={() => setCatalogoEmEdicao(catalogo)} disabled={salvandoCatalogo} className="min-h-9 rounded-lg border px-2.5 text-[10px] font-black uppercase">Editar</button>{!catalogo.publicado_avantavendas && <button type="button" data-destino="avantavendas" aria-label={`Ativar ${catalogo.nome} no AvantaVendas`} onClick={() => void ativarCatalogo(catalogo)} disabled={salvandoCatalogo} className="min-h-9 rounded-lg border border-emerald-500 px-2.5 text-[10px] font-black uppercase text-emerald-700">Ativar no AvantaVendas</button>}{catalogo.publicado_avantavendas && <button type="button" data-destino="avantavendas" aria-label={`Desativar ${catalogo.nome} no AvantaVendas`} onClick={() => void desativarCatalogo(catalogo)} disabled={salvandoCatalogo} className="min-h-9 rounded-lg border px-2.5 text-[10px] font-black uppercase">Desativar no AvantaVendas</button>}</div>
              </div>
            </article>;
          })}</div>
        </>}</section>
    </div>}
  </div>;
}
