'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatarNomeCategoria } from '../lib/perfis';

type Produto = { id: string; sku: string | null; nome: string; marca: string | null; categoria: string | null; descricao: string | null; preco_custo: number; preco_venda: number; unidade: string; imagem_url: string | null; ncm: string | null; codigo_barras: string | null; ativo: boolean; atualizado_em: string };
type Props = { empresaId: string; darkMode: boolean; corPrimaria: string };

const vazio = { id: '', sku: '', nome: '', marca: '', categoria: '', descricao: '', preco_custo: '', preco_venda: '', unidade: 'un', imagem_url: '', ncm: '', codigo_barras: '', ativo: true };
const textoNumero = (valor: string) => {
  const texto = String(valor || '').replace(/R\$|\s/g, '');
  return Number(texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto);
};
const formatarMoedaDigitada = (valor: string) => {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (!digitos) return '';
  return (Number(digitos) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function CatalogoProdutosVendas({ empresaId, darkMode, corPrimaria }: Props) {
  const [catalogoId, setCatalogoId] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [formulario, setFormulario] = useState<Record<string, string | boolean>>(vazio);
  const [carregando, setCarregando] = useState(true); const [salvando, setSalvando] = useState(false); const [erro, setErro] = useState('');
  const arquivoRef = useRef<HTMLInputElement>(null);
  const campo = darkMode ? 'border-slate-600 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900';
  const painel = darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50';

  const carregar = async () => {
    if (!empresaId) return;
    setCarregando(true); setErro('');
    let { data: catalogo, error: erroCatalogo } = await supabase.from('vendas_mobile_catalogos').select('id').eq('empresa_id', empresaId).eq('ativo', true).order('criado_em').limit(1).maybeSingle();
    if (!catalogo && !erroCatalogo) {
      const criado = await supabase.from('vendas_mobile_catalogos').insert({ empresa_id: empresaId, nome: 'Catálogo principal', codigo: 'PRINCIPAL' }).select('id').single();
      catalogo = criado.data; erroCatalogo = criado.error;
    }
    if (erroCatalogo || !catalogo) { setErro('Não foi possível preparar o catálogo desta empresa.'); setCarregando(false); return; }
    setCatalogoId(catalogo.id);
    const { data, error } = await supabase.from('vendas_mobile_catalogo_produtos').select('id,sku,nome,marca,categoria,descricao,preco_custo,preco_venda,unidade,imagem_url,ncm,codigo_barras,ativo,atualizado_em').eq('catalogo_id', catalogo.id).order('nome');
    if (error) setErro('Não foi possível carregar os produtos.'); else setProdutos((data || []) as Produto[]);
    setCarregando(false);
  };
  useEffect(() => { void carregar(); }, [empresaId]);
  const mudar = (nome: string, valor: string | boolean) => setFormulario((atual) => ({ ...atual, [nome]: valor }));
  const editar = (produto: Produto) => setFormulario({ ...vazio, ...produto, preco_custo: Number(produto.preco_custo).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), preco_venda: Number(produto.preco_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), imagem_url: produto.imagem_url || '', sku: produto.sku || '', descricao: produto.descricao || '', marca: produto.marca || '', categoria: produto.categoria || '', ncm: produto.ncm || '', codigo_barras: produto.codigo_barras || '' });
  const salvar = async () => {
    const nome = String(formulario.nome || '').trim(); const custo = textoNumero(String(formulario.preco_custo || '')); const venda = textoNumero(String(formulario.preco_venda || ''));
    if (!nome || !Number.isFinite(custo) || custo < 0 || !Number.isFinite(venda) || venda <= 0) { setErro('Nome, preço de custo e preço de venda são obrigatórios.'); return; }
    setSalvando(true); setErro('');
    const payload = { catalogo_id: catalogoId, sku: String(formulario.sku || '').trim() || null, codigo_barras: String(formulario.codigo_barras || '').trim() || null, marca: String(formulario.marca || '').trim() || null, categoria: String(formulario.categoria || '').trim() || null, nome, descricao: String(formulario.descricao || '').trim() || null, preco_custo: custo, preco_venda: venda, unidade: String(formulario.unidade || 'un').trim() || 'un', imagem_url: String(formulario.imagem_url || '').trim() || null, ncm: String(formulario.ncm || '').trim() || null, ativo: formulario.ativo !== false, atualizado_em: new Date().toISOString() };
    const query = formulario.id ? supabase.from('vendas_mobile_catalogo_produtos').update(payload).eq('id', formulario.id) : supabase.from('vendas_mobile_catalogo_produtos').insert(payload);
    const { error } = await query; setSalvando(false);
    if (error) { setErro(error.message.includes('sku') ? 'Este SKU já existe neste pacote.' : 'Não foi possível salvar o produto.'); return; }
    setFormulario(vazio); await carregar();
  };
  const enviarImagem = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/') || arquivo.size > 5 * 1024 * 1024) { setErro('Use uma imagem de até 5 MB em JPG, PNG ou WebP.'); return; }
    setSalvando(true); setErro('');
    const extensao = arquivo.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const caminho = `catalogos/${empresaId}/${crypto.randomUUID()}.${extensao}`;
    const { error } = await supabase.storage.from('vendas-produtos').upload(caminho, arquivo, { upsert: false, cacheControl: '31536000', contentType: arquivo.type });
    setSalvando(false); if (error) { setErro('Não foi possível enviar a imagem.'); return; }
    mudar('imagem_url', supabase.storage.from('vendas-produtos').getPublicUrl(caminho).data.publicUrl);
  };
  const campos = [['nome', 'Nome'], ['marca', 'Marca'], ['categoria', 'Categoria'], ['sku', 'SKU'], ['unidade', 'Unidade'], ['preco_custo', 'Preço de custo'], ['preco_venda', 'Preço de venda'], ['codigo_barras', 'EAN / GTIN'], ['ncm', 'NCM']];
  return <div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-black">Pacote de produtos</h3><p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Os campos abaixo alimentam o Vendas Mobile. Dados fiscais podem ser completados sem afetar o catálogo atual.</p></div><span className="rounded-full bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase text-cyan-700">{produtos.length} produtos</span></div><div className="grid gap-4 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]"><section className={`self-start rounded-xl border p-3 ${painel}`}><h4 className="text-sm font-black">{formulario.id ? 'Editar produto' : 'Novo produto'}</h4><p className="mt-0.5 text-[10px] font-bold text-cyan-600">Obrigatórios: nome, custo e preço de venda.</p><div className="mt-2 grid gap-1.5 sm:grid-cols-2">{campos.map(([chave, rotulo]) => <label key={chave} className="text-[9px] font-black uppercase opacity-70">{rotulo}<input value={String(formulario[chave] || '')} onChange={(e) => { const valor = chave === 'nome' ? formatarNomeCategoria(e.target.value) : chave.startsWith('preco') ? formatarMoedaDigitada(e.target.value) : e.target.value; mudar(chave, valor); }} inputMode={chave.startsWith('preco') ? 'numeric' : undefined} className={`mt-0.5 h-8 w-full rounded-md border px-2 text-xs font-bold normal-case ${campo}`} /></label>)}</div><label className="mt-1.5 block text-[9px] font-black uppercase opacity-70">Descrição<textarea value={String(formulario.descricao || '')} onChange={(e) => mudar('descricao', e.target.value)} rows={2} className={`mt-0.5 w-full rounded-md border p-2 text-xs normal-case ${campo}`} /></label><label className="mt-1.5 block text-[9px] font-black uppercase opacity-70">Link da imagem<input value={String(formulario.imagem_url || '')} onChange={(e) => mudar('imagem_url', e.target.value)} className={`mt-0.5 h-8 w-full rounded-md border px-2 text-xs normal-case ${campo}`} /></label><input ref={arquivoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void enviarImagem(e.target.files?.[0])} /><button type="button" onClick={() => arquivoRef.current?.click()} disabled={salvando} className="mt-1.5 h-8 w-full rounded-md border border-cyan-300 text-[10px] font-black uppercase text-cyan-700">Enviar imagem</button><div className="mt-2 flex items-center gap-2"><label className="flex flex-1 items-center gap-2 text-xs font-bold"><input type="checkbox" checked={formulario.ativo !== false} onChange={(e) => mudar('ativo', e.target.checked)} /> Produto ativo</label><button type="button" onClick={() => void salvar()} disabled={salvando} className="h-8 w-1/2 rounded-md text-[10px] font-black uppercase text-white disabled:opacity-60" style={{ backgroundColor: corPrimaria }}>{salvando ? 'Salvando...' : 'Salvar produto'}</button>{formulario.id && <button type="button" onClick={() => setFormulario(vazio)} className="h-8 rounded-md border px-2 text-[10px] font-black">Cancelar</button>}</div></section><section><h4 className="text-sm font-black">Produtos do pacote</h4><div className="mt-2 overflow-x-auto rounded-xl border"><table className="min-w-full text-left text-xs"><thead className={darkMode ? 'bg-slate-800' : 'bg-slate-50'}><tr><th className="px-3 py-2">Produto</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Custo</th><th className="px-3 py-2">Venda</th><th /></tr></thead><tbody>{carregando ? <tr><td colSpan={5} className="px-3 py-10 text-center">Carregando...</td></tr> : produtos.length ? produtos.map((produto) => <tr key={produto.id} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><td className="px-3 py-2"><b className="block">{produto.nome}</b><small className="text-slate-500">{produto.marca || 'Sem marca'} · {produto.categoria || 'Sem categoria'}</small></td><td className="px-3 py-2">{produto.sku || '—'}</td><td className="px-3 py-2">R$ {Number(produto.preco_custo).toFixed(2)}</td><td className="px-3 py-2">R$ {Number(produto.preco_venda).toFixed(2)}</td><td className="px-3 py-2"><button type="button" onClick={() => editar(produto)} className="rounded-md border px-2 py-1 text-[10px] font-black text-cyan-700">Editar</button></td></tr>) : <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-500">Nenhum produto cadastrado.</td></tr>}</tbody></table></div></section></div>{erro && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{erro}</p>}</div>;
}
