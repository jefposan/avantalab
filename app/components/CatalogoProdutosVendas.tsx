'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { formatarDescricao } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import ModalConfirmacao from './ModalConfirmacao';

type Produto = { id: string; sku: string | null; nome: string; marca: string | null; categoria: string | null; descricao: string | null; preco_divulgacao: number | null; unidade: string; imagem_url: string | null; ncm: string | null; codigo_barras: string | null; ativo: boolean; atualizado_em: string };
type Props = { empresaId: string; darkMode: boolean; corPrimaria: string };

const vazio = { id: '', sku: '', nome: '', marca: '', categoria: '', descricao: '', preco_divulgacao: '', unidade: 'un', imagem_url: '', ncm: '', codigo_barras: '', ativo: true };
const textoNumero = (valor: string) => {
  const texto = String(valor || '').replace(/R\$|\s/g, '');
  return Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
};
const formatarMoedaDigitada = (valor: string) => {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (!digitos) return '';
  return (Number(digitos) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const skuLegado = (id: string) => `LEGADO-${id.replace(/-/g, '').toUpperCase()}`;

export default function CatalogoProdutosVendas({ empresaId, darkMode, corPrimaria }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [formulario, setFormulario] = useState<Record<string, string | boolean>>(vazio);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState('');
  const [produtoExclusao, setProdutoExclusao] = useState<{ id: string; nome: string } | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const formularioRef = useRef<HTMLElement>(null);
  const botaoNovoRef = useRef<HTMLButtonElement>(null);
  const indiceVozSolicitadoRef = useRef('');
  const campo = darkMode ? 'border-slate-600 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900';
  const painel = darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50';
  const campos = [['nome', 'Nome'], ['marca', 'Marca'], ['categoria', 'Categoria'], ['sku', 'SKU'], ['unidade', 'Unidade'], ['preco_divulgacao', 'Preço sugerido de revenda'], ['codigo_barras', 'EAN / GTIN'], ['ncm', 'NCM']];

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

  const carregar = useCallback(async () => {
    if (!empresaId) return;
    setCarregando(true);
    setErro('');
    const { data, error } = await supabase.rpc('listar_produtos_conteudo_vendas_mobile_rpc', { p_empresa_id: empresaId });
    const resultado = data as { produtos?: Produto[] } | null;
    if (error || !resultado) {
      setErro('Não foi possível preparar o catálogo desta empresa.');
      setCarregando(false);
      return;
    }
    setProdutos(Array.isArray(resultado.produtos) ? resultado.produtos : []);
    setCarregando(false);
    if (indiceVozSolicitadoRef.current !== empresaId) {
      indiceVozSolicitadoRef.current = empresaId;
      void solicitarIndiceVoz();
    }
  }, [empresaId, solicitarIndiceVoz]);

  useEffect(() => { const timer = window.setTimeout(() => void carregar(), 0); return () => window.clearTimeout(timer); }, [carregar]);
  const mudar = (nome: string, valor: string | boolean) => setFormulario((atual) => ({ ...atual, [nome]: valor }));
  const levarAoFormulario = () => {
    window.requestAnimationFrame(() => formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const iniciarNovoProduto = () => {
    setErro('');
    setFormulario(vazio);
    setFormularioAberto(true);
    levarAoFormulario();
  };
  const cancelarFormulario = () => {
    if (salvando) return;
    setErro('');
    setFormulario(vazio);
    setFormularioAberto(false);
    window.requestAnimationFrame(() => botaoNovoRef.current?.focus());
  };
  const editar = (produto: Produto) => {
    setErro('');
    setFormulario({ ...vazio, ...produto, preco_divulgacao: Number(produto.preco_divulgacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), imagem_url: produto.imagem_url || '', sku: produto.sku || skuLegado(produto.id), descricao: produto.descricao || '', marca: produto.marca || '', categoria: produto.categoria || '', ncm: produto.ncm || '', codigo_barras: produto.codigo_barras || '' });
    setFormularioAberto(true);
    levarAoFormulario();
  };

  const salvar = async () => {
    const nome = formatarDescricao(String(formulario.nome || ''));
    const revenda = textoNumero(String(formulario.preco_divulgacao || ''));
    const sku = String(formulario.sku || '').trim().toUpperCase();
    if (!sku || !nome || !Number.isFinite(revenda) || revenda <= 0) {
      setErro('Código, nome e preço sugerido de revenda são obrigatórios.');
      return;
    }
    setSalvando(true);
    setErro('');
    const payload = { sku, codigo_barras: String(formulario.codigo_barras || '').trim() || null, marca: String(formulario.marca || '').trim() || null, categoria: String(formulario.categoria || '').trim() || null, nome, descricao: String(formulario.descricao || '').trim() || null, preco_divulgacao: revenda, unidade: String(formulario.unidade || 'un').trim() || 'un', imagem_url: String(formulario.imagem_url || '').trim() || null, ncm: String(formulario.ncm || '').trim() || null, ativo: formulario.ativo !== false };
    // A rotina protegida aceita somente campos de divulgação. Ela confirma a
    // linha escrita e preserva preço de custo e venda internos da Gestão.
    const { data, error } = await supabase.rpc('salvar_produto_conteudo_vendas_mobile_rpc', {
      p_empresa_id: empresaId,
      p_produto_id: formulario.id ? String(formulario.id) : null,
      p_dados: payload,
    });
    const produtoSalvo = data as { id?: string } | null;
    setSalvando(false);
    if (error || !produtoSalvo?.id) {
      setErro(error?.message.toLowerCase().includes('sku') ? 'Este SKU já existe neste pacote.' : 'Não foi possível salvar o produto.');
      return;
    }
    void solicitarIndiceVoz(produtoSalvo.id);
    setFormulario(vazio);
    setFormularioAberto(false);
    await carregar();
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

  const exportarPacoteZip = async () => {
    if (!produtos.length) { setErro('Cadastre ao menos um produto antes de gerar o pacote.'); return; }
    setExportando(true);
    setErro('');
    try {
      const zip = new JSZip();
      const itens = await Promise.all(produtos.map(async (produto) => {
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
        return { ...produto, preco_custo: 0, preco_venda: Number(produto.preco_divulgacao || 0), imagem_arquivo };
      }));
      zip.file('catalogo-vendas-mobile.json', JSON.stringify({ versao: 1, criado_em: new Date().toISOString(), produtos: itens }, null, 2));
      const arquivo = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pacote-produtos-vendas-mobile-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setErro('Não foi possível gerar o pacote ZIP.'); }
    finally { setExportando(false); }
  };

  const solicitarExclusaoProduto = () => {
    const id = String(formulario.id || '');
    if (!id) return;
    setProdutoExclusao({ id, nome: String(formulario.nome || 'selecionado') });
  };

  const excluirProduto = async () => {
    if (!produtoExclusao) return;
    const { id } = produtoExclusao;
    setSalvando(true);
    setErro('');
    const { data, error } = await supabase.rpc('inativar_produto_conteudo_vendas_mobile_rpc', { p_empresa_id: empresaId, p_produto_id: id });
    const produtoInativado = data as { id?: string } | null;
    setSalvando(false);
    setProdutoExclusao(null);
    if (error || !produtoInativado?.id) {
      setErro('Não foi possível inativar o produto.');
      return;
    }
    setProdutos((atuais) => atuais.map((produto) => produto.id === id ? { ...produto, ativo: false } : produto));
    setFormulario(vazio);
    setFormularioAberto(false);
  };

  return <div className="min-h-0 flex-1 overflow-y-auto p-4 xl:flex xl:flex-col xl:overflow-hidden">
    <div className="mb-3 shrink-0">
      <div className="flex items-center justify-between gap-2"><h3 className="min-w-0 text-base font-black">Pacote de produtos</h3><div className="flex shrink-0 items-center gap-1.5"><span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[9px] font-black uppercase text-cyan-700">{produtos.length} produtos</span><button type="button" onClick={() => void exportarPacoteZip()} disabled={exportando} className="h-7 rounded-full border border-cyan-300 px-2.5 text-[9px] font-black uppercase text-cyan-700 disabled:opacity-60">{exportando ? 'Gerando...' : 'Gerar ZIP'}</button></div></div>
      <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Os campos abaixo alimentam o Vendas Mobile. Dados fiscais podem ser completados sem afetar o catálogo atual.</p>
    </div>
    <div className="mb-3 flex justify-end"><button ref={botaoNovoRef} type="button" onClick={iniciarNovoProduto} disabled={carregando || salvando} className="min-h-11 rounded-xl px-4 text-xs font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>Novo produto</button></div>
    <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
      {formularioAberto && <div className="xl:flex xl:min-h-0 xl:items-center">
      <section ref={formularioRef} tabIndex={-1} className={`scroll-mt-3 rounded-xl border p-3 focus:outline-none xl:max-h-full xl:w-full xl:overflow-y-auto ${painel}`}>
        <div className="flex flex-wrap items-center gap-2"><h4 className="rounded-full px-3 py-1 text-sm font-black text-white" style={{ backgroundColor: corPrimaria }}>{formulario.id ? 'Editar produto' : 'Novo produto'}</h4><p className="text-[10px] font-bold text-cyan-600">Obrigatórios: código, nome e preço sugerido de revenda.</p></div>
        {formulario.id && String(formulario.sku || '').startsWith('LEGADO-') && <p className="mt-2 text-[10px] font-bold text-cyan-700">Este produto não tinha código. Um SKU técnico foi preparado para salvar a edição.</p>}
        {erro && <p role="alert" className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {campos.map(([chave, rotulo]) => <label key={chave} className="text-[9px] font-black uppercase opacity-70">{rotulo}<input value={String(formulario[chave] || '')} onChange={(e) => mudar(chave, chave.startsWith('preco') ? formatarMoedaDigitada(e.target.value) : e.target.value)} onBlur={chave === 'nome' ? () => mudar('nome', formatarDescricao(String(formulario.nome || ''))) : undefined} inputMode={chave.startsWith('preco') ? 'numeric' : undefined} className={`mt-0.5 h-8 w-full rounded-md border px-2 text-xs font-bold normal-case ${campo}`} /></label>)}
        </div>
        <label className="mt-1.5 block text-[9px] font-black uppercase opacity-70">Descrição<textarea value={String(formulario.descricao || '')} onChange={(e) => mudar('descricao', e.target.value)} rows={2} className={`mt-0.5 w-full rounded-md border p-2 text-xs normal-case ${campo}`} /></label>
        <div className="mt-1.5 flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[9px] font-black uppercase opacity-70">Link da imagem<input value={String(formulario.imagem_url || '')} onChange={(e) => mudar('imagem_url', e.target.value)} className={`mt-0.5 h-8 w-full rounded-md border px-2 text-xs normal-case ${campo}`} /></label>
          <input ref={arquivoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void enviarImagem(e.target.files?.[0])} />
          {formulario.imagem_url && <a href={String(formulario.imagem_url)} target="_blank" rel="noreferrer" title="Abrir pré-visualização"><Image src={String(formulario.imagem_url)} alt="Pré-visualização do produto" width={32} height={32} unoptimized className="h-8 w-8 shrink-0 rounded-md border border-cyan-300 object-cover" /></a>}
          <button type="button" onClick={() => arquivoRef.current?.click()} disabled={salvando} className="h-8 shrink-0 rounded-md border border-cyan-300 px-3 text-[10px] font-black uppercase text-cyan-700">Enviar imagem</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2"><label className="mr-auto flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={formulario.ativo !== false} onChange={(e) => mudar('ativo', e.target.checked)} /> Produto ativo</label><div className="flex items-center gap-2">{formulario.id && formulario.ativo !== false && <button type="button" onClick={solicitarExclusaoProduto} disabled={salvando} className="min-h-11 rounded-md border border-amber-300 bg-amber-50 px-2.5 text-[10px] font-black uppercase text-amber-800 disabled:opacity-60">Inativar</button>}<button type="button" onClick={() => void salvar()} disabled={salvando} className="min-h-11 rounded-md px-3 text-[10px] font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{salvando ? 'Salvando...' : 'Salvar produto'}</button><button type="button" onClick={cancelarFormulario} disabled={salvando} className="min-h-11 rounded-md border px-2.5 text-[10px] font-black disabled:opacity-60">Cancelar</button></div></div>
      </section>
      </div>}
      <section className={`xl:flex xl:min-h-0 xl:flex-col ${formularioAberto ? '' : 'xl:col-span-2'}`}><h4 className="shrink-0 text-sm font-black">Produtos do pacote</h4><div className="mt-2 overflow-x-auto rounded-xl border xl:min-h-0 xl:flex-1 xl:overflow-auto"><table className="min-w-full text-left text-xs"><thead className={darkMode ? 'bg-slate-800' : 'bg-slate-50'}><tr><th className="px-3 py-2">Produto</th><th className="px-3 py-2">Revenda sugerida</th><th className="px-3 py-2">Imagem</th><th /></tr></thead><tbody>{carregando ? <tr><td colSpan={4} className="px-3 py-10 text-center">Carregando...</td></tr> : produtos.length ? produtos.map((produto) => <tr key={produto.id} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><td className="px-3 py-2"><b className="block">{produto.nome}</b><small className="text-slate-500">{produto.marca || 'Sem marca'} · {produto.categoria || 'Sem categoria'}</small></td><td className="px-3 py-2">R$ {Number(produto.preco_divulgacao || 0).toFixed(2)}</td><td className="px-3 py-2">{produto.imagem_url ? <a href={produto.imagem_url} target="_blank" rel="noreferrer" title="Abrir imagem"><Image src={produto.imagem_url} alt={`Imagem de ${produto.nome}`} width={36} height={36} unoptimized className="h-9 w-9 rounded-md border object-cover" /></a> : <span className="text-slate-400">—</span>}</td><td className="px-3 py-2"><button type="button" onClick={() => editar(produto)} className="min-h-11 rounded-md border px-2 py-1 text-[10px] font-black text-cyan-700">Editar</button></td></tr>) : <tr><td colSpan={4} className="px-3 py-10 text-center text-slate-500">Nenhum produto cadastrado.</td></tr>}</tbody></table></div></section>
    </div>
    {erro && !formularioAberto && <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}
    <ModalConfirmacao
      aberto={Boolean(produtoExclusao)}
      titulo="Inativar produto"
      mensagem={`O produto “${produtoExclusao?.nome || 'selecionado'}” ficará inativo no Catálogo e em Custos. O cadastro e o histórico serão preservados.`}
      textoCancelar="Manter produto"
      textoConfirmar="Inativar produto"
      variante="alerta"
      carregando={salvando}
      corPrimaria={corPrimaria}
      darkMode={darkMode}
      aoCancelar={() => {
        if (!salvando) setProdutoExclusao(null);
      }}
      aoConfirmar={() => void excluirProduto()}
    />
  </div>;
}
