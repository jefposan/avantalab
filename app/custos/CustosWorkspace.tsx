'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { formatarMoeda, formatarMoedaDigitada, moedaDigitadaParaNumero } from '@/app/lib/formatters';
import { supabase } from '@/app/lib/supabase';
import type { CustosAccess } from './CustosClient';
import { carregarCustos, enviarImagemProduto, salvarDocumentoCustos, salvarProdutoCustos } from './repository';
import {
  calcularComposicao, composicaoVazia, documentoVazio, novoProduto, proximoCodigo,
  type CampoCenario, type CenarioPreco, type ComposicaoCusto, type DocumentoCustos,
  type ProdutoCustos, type RecursoCusto, type TipoItem,
} from './types';
import styles from './custos.module.css';

type Aba = 'visao' | 'produtos' | 'recursos' | 'simulacoes' | 'historico';

const navegacao: Array<{ id: Aba; rotulo: string; icone: string }> = [
  { id: 'visao', rotulo: 'Visão geral', icone: '▦' },
  { id: 'produtos', rotulo: 'Produtos e serviços', icone: '≡' },
  { id: 'recursos', rotulo: 'Insumos e recursos', icone: '◇' },
  { id: 'simulacoes', rotulo: 'Simulações', icone: '%' },
  { id: 'historico', rotulo: 'Histórico de custos', icone: '↺' },
];

const erroTexto = (erro: unknown) => erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.';

export default function CustosWorkspace({ companyId, access }: { companyId: string; access: CustosAccess }) {
  const [aba, setAba] = useState<Aba>('visao');
  const [catalogoId, setCatalogoId] = useState('');
  const [produtos, setProdutos] = useState<ProdutoCustos[]>([]);
  const [documento, setDocumento] = useState<DocumentoCustos>(documentoVazio);
  const [produtoAtivoId, setProdutoAtivoId] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const carregamentoRef = useRef(0);
  const revisaoRef = useRef(0);

  const recarregar = useCallback(async (silencioso = false) => {
    const chamada = ++carregamentoRef.current;
    if (!silencioso) setCarregando(true);
    setErro('');
    try {
      const dados = await carregarCustos(companyId, access.podeEditar);
      if (chamada !== carregamentoRef.current) return;
      setCatalogoId(dados.catalogoId);
      setProdutos(dados.produtos);
      setDocumento(dados.documento);
      revisaoRef.current = dados.revisao;
      setProdutoAtivoId((atual) => dados.produtos.some((produto) => produto.id === atual) ? atual : dados.produtos[0]?.id || '');
    } catch (falha) { setErro(erroTexto(falha)); }
    finally { if (chamada === carregamentoRef.current && !silencioso) setCarregando(false); }
  }, [access.podeEditar, companyId]);

  useEffect(() => { const timer = window.setTimeout(() => void recarregar(), 0); return () => window.clearTimeout(timer); }, [recarregar]);
  useEffect(() => {
    if (!catalogoId) return;
    const canal = supabase.channel(`custos-produtos-${catalogoId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas_mobile_catalogo_produtos', filter: `catalogo_id=eq.${catalogoId}` }, () => void recarregar(true))
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, [catalogoId, recarregar]);
  useEffect(() => { if (!mensagem) return; const timer = window.setTimeout(() => setMensagem(''), 4500); return () => window.clearTimeout(timer); }, [mensagem]);

  const salvarDocumento = async (proximo: DocumentoCustos, retorno: string) => {
    setDocumento(proximo);
    try {
      revisaoRef.current = await salvarDocumentoCustos(companyId, proximo, revisaoRef.current);
      setMensagem(retorno);
    }
    catch (falha) { setErro(erroTexto(falha)); void recarregar(true); throw falha; }
  };
  const salvarProduto = (produto: ProdutoCustos) => salvarProdutoCustos(produto);
  const enviarImagem = (arquivo: File) => enviarImagemProduto(companyId, arquivo);
  const selecionarProduto = (id: string) => setProdutoAtivoId(id);
  const produtoAtivo = produtos.find((produto) => produto.id === produtoAtivoId) || produtos[0];

  if (carregando) return <div className={styles.loading}><span /><strong>Preparando custos e precificação</strong><p>Carregando o cadastro compartilhado e as composições…</p></div>;

  return <div className={styles.workspace}>
    <aside className={styles.sidebar} aria-label="Áreas de Custos e Precificação">
      <nav>{navegacao.map((item) => <button key={item.id} type="button" className={aba === item.id ? styles.navActive : ''} onClick={() => setAba(item.id)}><span aria-hidden="true">{item.icone}</span>{item.rotulo}</button>)}</nav>
      <div className={styles.sharedNote}><strong>Base compartilhada</strong><p>Catálogo e Custos usam o mesmo produto. Não há cópias para sincronizar.</p></div>
    </aside>
    <section className={styles.content}>
      <div className={styles.feedbackBar} aria-live="polite">
        {erro && <div className={styles.error}><span>{erro}</span><button type="button" onClick={() => void recarregar()}>Tentar novamente</button></div>}
        {mensagem && <div className={styles.success}>{mensagem}</div>}
      </div>
      {aba === 'visao' && <VisaoGeral produtos={produtos} documento={documento} produtoAtivo={produtoAtivo} onSelecionar={selecionarProduto} onAbrir={() => setAba('produtos')} onAtualizar={() => void recarregar()} />}
      {aba === 'produtos' && <ProdutosView key={`${produtoAtivoId}:${produtoAtivo?.atualizado_em || 'novo'}`} catalogoId={catalogoId} produtos={produtos} setProdutos={setProdutos} documento={documento} produtoAtivoId={produtoAtivoId} onSelecionar={selecionarProduto} onDocumento={salvarDocumento} onSalvarProduto={salvarProduto} onEnviarImagem={enviarImagem} podeEditar={access.podeEditar} onMensagem={setMensagem} onErro={setErro} />}
      {aba === 'recursos' && <RecursosView documento={documento} produtos={produtos} onDocumento={salvarDocumento} podeEditar={access.podeEditar} onMensagem={setMensagem} />}
      {aba === 'simulacoes' && <SimulacoesView documento={documento} onDocumento={salvarDocumento} podeEditar={access.podeEditar} onMensagem={setMensagem} />}
      {aba === 'historico' && <HistoricoView produtos={produtos} documento={documento} produtoAtivoId={produtoAtivoId} onSelecionar={selecionarProduto} />}
    </section>
  </div>;
}

function PageHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return <header className={styles.pageHeader}><div><span>Custos e precificação</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className={styles.headerActions}>{actions}</div>}</header>;
}

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <article className={`${styles.metric} ${accent ? styles.metricAccent : ''}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function ProductStrip({ produtos, ativoId, documento, onSelecionar }: { produtos: ProdutoCustos[]; ativoId: string; documento: DocumentoCustos; onSelecionar: (id: string) => void }) {
  const [busca, setBusca] = useState('');
  const filtrados = produtos.filter((produto) => `${produto.sku} ${produto.nome} ${produto.categoria}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')));
  return <section className={styles.panel}>
    <div className={styles.panelTitle}><div><h2>Produtos cadastrados</h2><p>Selecione um card para visualizar e trabalhar o cadastro.</p></div><label className={styles.search}><span>Procurar</span><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Código ou nome" /></label></div>
    <div className={styles.productStrip} tabIndex={filtrados.length > 1 ? 0 : undefined}>
      {filtrados.map((produto) => {
        const calculo = calcularComposicao(documento.composicoes[produto.id] || composicaoVazia(), documento.recursos);
        return <button type="button" key={produto.id} className={`${styles.productCard} ${produto.id === ativoId ? styles.productCardActive : ''}`} onClick={() => onSelecionar(produto.id)}>
          <span className={`${styles.status} ${!produto.ativo ? styles.statusInactive : produto.disponivel_catalogo ? styles.statusPublished : styles.statusDraft}`}>{!produto.ativo ? 'Inativo' : produto.disponivel_catalogo ? 'No catálogo' : 'Em estudo'}</span>
          <strong>{produto.sku || 'Sem código'} · {produto.nome}</strong>
          <small>{produto.tipo_item === 'produto' ? 'Produto' : 'Serviço'} · {documento.composicoes[produto.id]?.itens.length || 0} componentes</small>
          <span>Custo atual <b>{formatarMoeda(calculo.total || produto.preco_custo)}</b></span>
          <span>Venda <b>{formatarMoeda(produto.preco_venda)}</b></span>
        </button>;
      })}
      {!filtrados.length && <div className={styles.emptyStrip}>Nenhum cadastro encontrado.</div>}
    </div>
  </section>;
}

function VisaoGeral({ produtos, documento, produtoAtivo, onSelecionar, onAbrir, onAtualizar }: { produtos: ProdutoCustos[]; documento: DocumentoCustos; produtoAtivo?: ProdutoCustos; onSelecionar: (id: string) => void; onAbrir: () => void; onAtualizar: () => void }) {
  const pendencias = produtos.filter((produto) => !produto.sku || (produto.tipo_item === 'produto' ? !produto.ncm : !produto.codigo_tributacao_nacional) || !documento.composicoes[produto.id]?.itens.length).length;
  const publicados = produtos.filter((produto) => produto.ativo && produto.disponivel_catalogo).length;
  const emEstudo = produtos.filter((produto) => produto.ativo && !produto.disponivel_catalogo).length;
  const calculo = produtoAtivo ? calcularComposicao(documento.composicoes[produtoAtivo.id] || composicaoVazia(), documento.recursos) : null;
  return <>
    <PageHeader title="Visão geral" description="Situação atual dos cadastros, custos e publicação no catálogo." actions={<button className={styles.secondaryButton} type="button" onClick={onAtualizar}>Atualizar dados</button>} />
    <section className={styles.metrics}>
      <Metric accent label="Produtos e serviços" value={String(produtos.length)} detail={`${produtos.filter((p) => p.tipo_item === 'produto').length} produtos · ${produtos.filter((p) => p.tipo_item === 'servico').length} serviços`} />
      <Metric label="No catálogo" value={String(publicados)} detail="Ativos e disponíveis para divulgação" />
      <Metric label="Em estudo" value={String(emEstudo)} detail="Ainda não publicados no catálogo" />
      <Metric label="Pendências" value={String(pendencias)} detail="Código, fiscal ou composição incompleta" />
    </section>
    <ProductStrip produtos={produtos} ativoId={produtoAtivo?.id || ''} documento={documento} onSelecionar={onSelecionar} />
    {produtoAtivo && calculo ? <>
      <section className={styles.metrics}>
        <Metric label="Custos diretos" value={formatarMoeda(calculo.direto)} detail={`${calculo.linhas.length} componentes`} />
        <Metric label="Custos indiretos" value={formatarMoeda(calculo.indireto)} detail={`${(documento.composicoes[produtoAtivo.id]?.indiretos || 0).toFixed(2)}% sobre os diretos`} />
        <Metric accent label="Custo unitário" value={formatarMoeda(calculo.total)} detail="Composição vigente" />
        <Metric label="Preço sugerido" value={calculo.valido ? formatarMoeda(calculo.preco) : 'Revisar percentuais'} detail={`Venda atual: ${formatarMoeda(produtoAtivo.preco_venda)}`} />
      </section>
      <section className={styles.twoColumns}><article className={styles.panel}><div className={styles.panelTitle}><div><h2>Composição de {produtoAtivo.nome}</h2><p>Participação dos principais componentes no custo.</p></div><button type="button" className={styles.linkButton} onClick={onAbrir}>Abrir cadastro</button></div>
        <div className={styles.costBars}>{calculo.linhas.sort((a, b) => b.custo - a.custo).slice(0, 8).map((linha) => <div key={linha.item.id}><span>{linha.recurso?.nome || 'Recurso não localizado'}<b>{formatarMoeda(linha.custo)}</b></span><i><em style={{ width: `${calculo.total ? Math.max(3, linha.custo / calculo.total * 100) : 3}%` }} /></i></div>)}{!calculo.linhas.length && <p className={styles.empty}>Ainda não há componentes neste cadastro.</p>}</div>
      </article><article className={`${styles.panel} ${styles.quickRead}`}><span>Leitura rápida</span><h2>{produtoAtivo.disponivel_catalogo ? 'Disponível no catálogo' : 'Produto em estudo'}</h2><p>Alterações de identificação feitas no Catálogo aparecem aqui porque o registro é único.</p><ul><li>{produtoAtivo.sku ? '✓' : '!'} Código interno</li><li>{calculo.linhas.length ? '✓' : '!'} Composição de custo</li><li>{produtoAtivo.tipo_item === 'produto' ? (produtoAtivo.ncm ? '✓ NCM informado' : '! NCM pendente') : (produtoAtivo.codigo_tributacao_nacional ? '✓ Tributação informada' : '! Tributação pendente')}</li></ul></article></section>
    </> : <section className={styles.panel}><p className={styles.empty}>Cadastre o primeiro produto ou serviço na área Produtos e serviços.</p></section>}
  </>;
}

function ProdutosView({ catalogoId, produtos, setProdutos, documento, produtoAtivoId, onSelecionar, onDocumento, onSalvarProduto, onEnviarImagem, podeEditar, onMensagem, onErro }: {
  catalogoId: string; produtos: ProdutoCustos[]; setProdutos: React.Dispatch<React.SetStateAction<ProdutoCustos[]>>;
  documento: DocumentoCustos; produtoAtivoId: string; onSelecionar: (id: string) => void;
  onDocumento: (proximo: DocumentoCustos, retorno: string) => Promise<void>; podeEditar: boolean;
  onSalvarProduto: (produto: ProdutoCustos) => Promise<ProdutoCustos>; onEnviarImagem: (arquivo: File) => Promise<string>;
  onMensagem: (texto: string) => void; onErro: (texto: string) => void;
}) {
  const produtoSelecionado = produtos.find((produto) => produto.id === produtoAtivoId);
  const [rascunho, setRascunho] = useState<ProdutoCustos>(() => produtoSelecionado || novoProduto('produto', catalogoId));
  const [composicao, setComposicao] = useState<ComposicaoCusto>(() => produtoSelecionado ? documento.composicoes[produtoSelecionado.id] || composicaoVazia() : composicaoVazia());
  const [salvando, setSalvando] = useState(false);
  const [confirmarInativacao, setConfirmarInativacao] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const calculo = calcularComposicao(composicao, documento.recursos);
  const codigos = produtos.filter((produto) => produto.id !== rascunho.id).map((produto) => produto.sku).filter(Boolean);
  const prefixo = rascunho.sku.match(/^[A-Za-z_-]+/)?.[0] || (rascunho.tipo_item === 'produto' ? 'T' : 'S');
  const proximo = proximoCodigo(prefixo, codigos);
  const alterar = <K extends keyof ProdutoCustos>(campo: K, valor: ProdutoCustos[K]) => setRascunho((atual) => ({ ...atual, [campo]: valor }));

  const iniciar = (tipo: TipoItem) => { const novo = novoProduto(tipo, catalogoId); setRascunho(novo); setComposicao(composicaoVazia()); onSelecionar(''); };
  const validar = () => {
    if (!rascunho.sku.trim() || !rascunho.nome.trim()) return 'Código e nome são obrigatórios.';
    if (codigos.some((codigo) => codigo.toUpperCase() === rascunho.sku.trim().toUpperCase())) return 'Este código já está sendo usado.';
    const anterior = produtos.find((produto) => produto.id === rascunho.id);
    const publicandoAgora = rascunho.disponivel_catalogo && !anterior?.disponivel_catalogo;
    if (publicandoAgora && rascunho.preco_venda <= 0) return 'Informe o preço de venda antes de publicar no catálogo.';
    if (publicandoAgora && rascunho.tipo_item === 'produto' && !rascunho.ncm.trim()) return 'Informe o NCM antes de publicar o produto.';
    if (publicandoAgora && rascunho.tipo_item === 'servico' && !rascunho.codigo_tributacao_nacional.trim()) return 'Informe o código de tributação nacional antes de publicar o serviço.';
    return '';
  };
  const salvarCadastro = async () => {
    const falha = validar(); if (falha) { onErro(falha); return null; }
    setSalvando(true); onErro('');
    try {
      const salvo = await onSalvarProduto({ ...rascunho, preco_custo: calculo.total || rascunho.preco_custo });
      setProdutos((atuais) => atuais.some((produto) => produto.id === salvo.id) ? atuais.map((produto) => produto.id === salvo.id ? salvo : produto) : [salvo, ...atuais]);
      setRascunho(salvo); onSelecionar(salvo.id); onMensagem('Cadastro salvo na base compartilhada.'); return salvo;
    } catch (falhaSalvamento) { onErro(erroTexto(falhaSalvamento)); return null; }
    finally { setSalvando(false); }
  };
  const salvarComposicao = async () => {
    let salvo = rascunho.id ? rascunho : await salvarCadastro();
    if (!salvo) return;
    const atualizada = { ...composicao, atualizadoEm: new Date().toISOString() };
    const calculoAtual = calcularComposicao(atualizada, documento.recursos);
    if (!calculoAtual.valido) { onErro('A soma de impostos, taxas e margem deve ficar abaixo de 100%.'); return; }
    salvo = await onSalvarProduto({ ...salvo, preco_custo: calculoAtual.total });
    setProdutos((atuais) => atuais.map((produto) => produto.id === salvo!.id ? salvo! : produto)); setRascunho(salvo);
    const ultima = documento.historico.find((versao) => versao.produtoId === salvo.id);
    const mudou = !ultima || Math.abs(ultima.custoTotal - calculoAtual.total) >= 0.005 || Math.abs(ultima.precoSugerido - calculoAtual.preco) >= 0.005;
    const proximo: DocumentoCustos = {
      ...documento,
      composicoes: { ...documento.composicoes, [salvo.id]: atualizada },
      historico: mudou ? [{ id: crypto.randomUUID(), produtoId: salvo.id, custoDireto: calculoAtual.direto, custoTotal: calculoAtual.total, precoSugerido: calculoAtual.preco, criadoEm: new Date().toISOString() }, ...documento.historico] : documento.historico,
    };
    await onDocumento(proximo, mudou ? 'Composição salva e nova versão de custo registrada.' : 'Composição salva sem alteração de valores.');
  };
  const inativar = async () => {
    setSalvando(true); setConfirmarInativacao(false);
    try { const salvo = await onSalvarProduto({ ...rascunho, ativo: false }); setProdutos((atuais) => atuais.map((produto) => produto.id === salvo.id ? salvo : produto)); setRascunho(salvo); onMensagem('Cadastro inativado. O histórico foi preservado.'); }
    catch (falha) { onErro(erroTexto(falha)); } finally { setSalvando(false); }
  };
  const carregarImagem = async (arquivo?: File) => {
    if (!arquivo) return; setSalvando(true);
    try { alterar('imagem_url', await onEnviarImagem(arquivo)); onMensagem('Imagem pronta. Salve o cadastro para confirmar.'); }
    catch (falha) { onErro(erroTexto(falha)); } finally { setSalvando(false); }
  };

  return <>
    <PageHeader title="Produtos e serviços" description="Crie o cadastro mestre, complete dados fiscais e monte o custo." actions={<><button className={styles.secondaryButton} type="button" disabled={!podeEditar} onClick={() => iniciar('servico')}>Novo serviço</button><button className={styles.primaryButton} type="button" disabled={!podeEditar} onClick={() => iniciar('produto')}>Novo produto</button></>} />
    <ProductStrip produtos={produtos} ativoId={rascunho.id} documento={documento} onSelecionar={onSelecionar} />
    <fieldset className={styles.editor} disabled={!podeEditar || salvando}>
      <section className={styles.panel}><div className={styles.panelTitle}><div><h2>Identificação</h2><p>O código próprio é obrigatório e nunca é gerado às cegas.</p></div><span className={`${styles.status} ${!rascunho.ativo ? styles.statusInactive : rascunho.disponivel_catalogo ? styles.statusPublished : styles.statusDraft}`}>{!rascunho.ativo ? 'Inativo' : rascunho.disponivel_catalogo ? 'No catálogo' : 'Em estudo'}</span></div>
        <div className={styles.identification}><div className={styles.imageBox}>{rascunho.imagem_url ? <Image src={rascunho.imagem_url} alt={`Imagem de ${rascunho.nome || 'cadastro'}`} width={135} height={135} unoptimized /> : <span>{rascunho.tipo_item === 'produto' ? 'Produto' : 'Serviço'}<small>Imagem opcional</small></span>}<input ref={arquivoRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void carregarImagem(e.target.files?.[0])} /><button type="button" className={styles.secondaryButton} onClick={() => arquivoRef.current?.click()}>Escolher imagem</button></div>
          <div className={styles.formGrid}>
            <Field label="Tipo"><select value={rascunho.tipo_item} onChange={(e) => alterar('tipo_item', e.target.value as TipoItem)}><option value="produto">Produto</option><option value="servico">Serviço</option></select></Field>
            <Field label="Código interno *"><input value={rascunho.sku} onChange={(e) => alterar('sku', e.target.value.toUpperCase())} placeholder={proximo} /></Field>
            <Field label="Nome *" wide><input value={rascunho.nome} onChange={(e) => alterar('nome', e.target.value)} /></Field>
            <Field label="Categoria"><input value={rascunho.categoria} onChange={(e) => alterar('categoria', e.target.value)} /></Field>
            <Field label="Marca"><input value={rascunho.marca} onChange={(e) => alterar('marca', e.target.value)} /></Field>
            <Field label="Unidade"><input value={rascunho.unidade} onChange={(e) => alterar('unidade', e.target.value)} /></Field>
            <Field label="Preço de venda"><MoneyInput value={rascunho.preco_venda} onChange={(valor) => alterar('preco_venda', valor)} label="Preço de venda" /></Field>
            <Field label="Descrição" wide><textarea rows={2} value={rascunho.descricao} onChange={(e) => alterar('descricao', e.target.value)} /></Field>
          </div>
        </div>
        <div className={styles.codeAssistant}><span>Próximo na sequência <b>{proximo}</b></span><button type="button" className={styles.linkButton} onClick={() => alterar('sku', proximo)}>Usar código</button><div>{codigos.filter((codigo) => codigo.startsWith(prefixo.toUpperCase())).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })).map((codigo) => <i key={codigo}>{codigo}</i>)}</div></div>
        <div className={styles.switches}><label><input type="checkbox" checked={rascunho.ativo} onChange={(e) => alterar('ativo', e.target.checked)} /> Cadastro ativo</label><label><input type="checkbox" checked={rascunho.disponivel_catalogo} onChange={(e) => alterar('disponivel_catalogo', e.target.checked)} /> Disponível no catálogo</label><small>Itens novos começam em estudo. A publicação usa este mesmo cadastro no Catálogo.</small></div>
      </section>

      <section className={styles.panel}><div className={styles.panelTitle}><div><h2>Dados fiscais para emissão</h2><p>Campos ausentes nos produtos Tridium permanecem disponíveis para complemento.</p></div></div>
        {rascunho.tipo_item === 'produto' ? <div className={styles.fiscalGrid}>
          <Field label="GTIN / EAN"><input value={rascunho.codigo_barras} onChange={(e) => alterar('codigo_barras', e.target.value)} /></Field><Field label="NCM"><input value={rascunho.ncm} onChange={(e) => alterar('ncm', e.target.value)} placeholder="0000.00.00" /></Field><Field label="CEST"><input value={rascunho.cest} onChange={(e) => alterar('cest', e.target.value)} /></Field><Field label="Origem"><input value={rascunho.origem_mercadoria} onChange={(e) => alterar('origem_mercadoria', e.target.value)} /></Field><Field label="Unidade tributável"><input value={rascunho.unidade_tributavel} onChange={(e) => alterar('unidade_tributavel', e.target.value)} /></Field><Field label="CFOP padrão"><input value={rascunho.cfop_padrao} onChange={(e) => alterar('cfop_padrao', e.target.value)} /></Field><Field label="CST ICMS"><input value={rascunho.cst} onChange={(e) => alterar('cst', e.target.value)} /></Field><Field label="CSOSN"><input value={rascunho.csosn} onChange={(e) => alterar('csosn', e.target.value)} /></Field><Field label="CST PIS"><input value={rascunho.cst_pis} onChange={(e) => alterar('cst_pis', e.target.value)} /></Field><Field label="CST COFINS"><input value={rascunho.cst_cofins} onChange={(e) => alterar('cst_cofins', e.target.value)} /></Field>
        </div> : <div className={styles.fiscalGrid}>
          <Field label="Tributação nacional"><input value={rascunho.codigo_tributacao_nacional} onChange={(e) => alterar('codigo_tributacao_nacional', e.target.value)} /></Field><Field label="Código municipal"><input value={rascunho.codigo_tributacao_municipal} onChange={(e) => alterar('codigo_tributacao_municipal', e.target.value)} /></Field><Field label="Item LC 116"><input value={rascunho.item_lc116} onChange={(e) => alterar('item_lc116', e.target.value)} /></Field><Field label="NBS"><input value={rascunho.nbs} onChange={(e) => alterar('nbs', e.target.value)} /></Field><Field label="Município da prestação"><input value={rascunho.municipio_prestacao} onChange={(e) => alterar('municipio_prestacao', e.target.value)} /></Field><Field label="Alíquota ISS"><PercentInput value={rascunho.aliquota_iss} onChange={(valor) => alterar('aliquota_iss', valor)} /></Field>
        </div>}
        <details className={styles.taxDetails}><summary>Classificações IBS/CBS</summary><div className={styles.formGrid}><Field label="CST IBS/CBS"><input value={rascunho.cst_ibs_cbs} onChange={(e) => alterar('cst_ibs_cbs', e.target.value)} /></Field><Field label="Classificação tributária"><input value={rascunho.classificacao_ibs_cbs} onChange={(e) => alterar('classificacao_ibs_cbs', e.target.value)} /></Field></div></details>
      </section>

      <section className={styles.panel}><div className={styles.panelTitle}><div><h2>Composição do custo</h2><p>Insumos, embalagens, mão de obra e recursos compartilhados.</p></div><button type="button" className={styles.secondaryButton} onClick={() => setComposicao((atual) => ({ ...atual, itens: [...atual.itens, { id: crypto.randomUUID(), recursoId: documento.recursos[0]?.id || '', quantidade: 1, perda: 0 }] }))}>Adicionar recurso</button></div>
        <div className={styles.tableWrap}><table><thead><tr><th>Recurso</th><th>Quantidade</th><th>Perda</th><th className={styles.numeric}>Custo</th><th /></tr></thead><tbody>{composicao.itens.map((item) => { const recurso = documento.recursos.find((registro) => registro.id === item.recursoId); const custo = (recurso?.custo || 0) * item.quantidade * (1 + item.perda / 100); return <tr key={item.id}><td><select value={item.recursoId} onChange={(e) => setComposicao((atual) => ({ ...atual, itens: atual.itens.map((linha) => linha.id === item.id ? { ...linha, recursoId: e.target.value } : linha) }))}><option value="">Selecione</option>{documento.recursos.map((registro) => <option key={registro.id} value={registro.id}>{registro.codigo} · {registro.nome}</option>)}</select></td><td><input className={styles.compactNumber} type="number" min="0" step="0.001" value={item.quantidade} onChange={(e) => setComposicao((atual) => ({ ...atual, itens: atual.itens.map((linha) => linha.id === item.id ? { ...linha, quantidade: Number(e.target.value) || 0 } : linha) }))} /></td><td><PercentInput compact value={item.perda} onChange={(valor) => setComposicao((atual) => ({ ...atual, itens: atual.itens.map((linha) => linha.id === item.id ? { ...linha, perda: valor } : linha) }))} /></td><td className={styles.numeric}><b>{formatarMoeda(custo)}</b></td><td><button className={styles.rowAction} type="button" aria-label={`Remover ${recurso?.nome || 'recurso'}`} onClick={() => setComposicao((atual) => ({ ...atual, itens: atual.itens.filter((linha) => linha.id !== item.id) }))}>×</button></td></tr>; })}{!composicao.itens.length && <tr><td colSpan={5} className={styles.empty}>Nenhum recurso adicionado.</td></tr>}</tbody></table></div>
      </section>

      <section className={styles.panel}><div className={styles.panelTitle}><div><h2>Formação do preço</h2><p>Percentuais próprios deste produto ou serviço.</p></div></div><div className={styles.priceParams}><Field label="Custos indiretos"><PercentInput value={composicao.indiretos} onChange={(valor) => setComposicao({ ...composicao, indiretos: valor })} /></Field><Field label="Impostos"><PercentInput value={composicao.impostos} onChange={(valor) => setComposicao({ ...composicao, impostos: valor })} /></Field><Field label="Taxas e comissões"><PercentInput value={composicao.taxas} onChange={(valor) => setComposicao({ ...composicao, taxas: valor })} /></Field><Field label="Margem desejada"><PercentInput value={composicao.margem} onChange={(valor) => setComposicao({ ...composicao, margem: valor })} /></Field></div>
        <div className={styles.priceResults}><div><span>Custo direto</span><b>{formatarMoeda(calculo.direto)}</b></div><div><span>Custo total</span><b>{formatarMoeda(calculo.total)}</b></div><div className={styles.priceHighlight}><span>Preço sugerido</span><strong>{calculo.valido ? formatarMoeda(calculo.preco) : 'Revisar percentuais'}</strong></div><div><span>Preço no catálogo</span><b>{formatarMoeda(rascunho.preco_venda)}</b><button type="button" className={styles.linkButton} disabled={!calculo.valido} onClick={() => alterar('preco_venda', calculo.preco)}>Aplicar sugerido</button></div></div>
      </section>
      <footer className={styles.saveBar}>{rascunho.id && rascunho.ativo ? <button type="button" className={styles.dangerLink} onClick={() => setConfirmarInativacao(true)}>Inativar cadastro</button> : <span />}
        <div><small>Salvar composição registra uma nova versão apenas quando os valores mudarem.</small><button type="button" className={styles.secondaryButton} onClick={() => void salvarCadastro()}>Salvar cadastro</button><button type="button" className={styles.primaryButton} onClick={() => void salvarComposicao()}>Salvar composição</button></div></footer>
    </fieldset>
    <ModalConfirmacao aberto={confirmarInativacao} titulo={`Inativar ${rascunho.nome || 'cadastro'}?`} mensagem="O item ficará inativo no Catálogo e em Custos. Composição e histórico serão preservados para consulta e eventual reativação." textoCancelar="Manter ativo" textoConfirmar="Inativar" carregando={salvando} corPrimaria="var(--custos-brand)" variante="alerta" aoCancelar={() => setConfirmarInativacao(false)} aoConfirmar={() => void inativar()} />
  </>;
}

function RecursosView({ documento, produtos, onDocumento, podeEditar, onMensagem }: { documento: DocumentoCustos; produtos: ProdutoCustos[]; onDocumento: (proximo: DocumentoCustos, retorno: string) => Promise<void>; podeEditar: boolean; onMensagem: (texto: string) => void }) {
  const vazio = (): RecursoCusto => ({ id: crypto.randomUUID(), codigo: '', nome: '', categoria: 'Matéria-prima', unidade: 'un', custo: 0 });
  const [form, setForm] = useState<RecursoCusto>(vazio);
  const [editando, setEditando] = useState(false);
  const [busca, setBusca] = useState('');
  const [menu, setMenu] = useState('');
  const [excluir, setExcluir] = useState<RecursoCusto | null>(null);
  const usados = documento.recursos.map((recurso) => recurso.codigo).filter((codigo) => codigo !== form.codigo);
  const prefixo = form.codigo.match(/^[A-Za-z_-]+/)?.[0] || (form.categoria === 'Embalagem' ? 'EMB' : 'MP');
  const proximo = proximoCodigo(prefixo, [...usados, ...produtos.map((produto) => produto.sku)]);
  const filtrados = documento.recursos.filter((recurso) => `${recurso.codigo} ${recurso.nome} ${recurso.categoria}`.toLowerCase().includes(busca.toLowerCase()));
  const salvar = async (e: React.FormEvent) => { e.preventDefault(); if (!form.codigo.trim() || !form.nome.trim()) { onMensagem('Informe código e nome do recurso.'); return; } if (usados.some((codigo) => codigo.toUpperCase() === form.codigo.toUpperCase())) { onMensagem('Este código já está em uso.'); return; } const pronto = { ...form, codigo: form.codigo.trim().toUpperCase(), nome: form.nome.trim() }; const recursos = editando ? documento.recursos.map((recurso) => recurso.id === pronto.id ? pronto : recurso) : [pronto, ...documento.recursos]; await onDocumento({ ...documento, recursos }, editando ? 'Recurso atualizado.' : 'Recurso cadastrado.'); setForm(vazio()); setEditando(false); };
  const confirmarExclusao = async () => { if (!excluir) return; if (Object.values(documento.composicoes).some((composicao) => composicao.itens.some((item) => item.recursoId === excluir.id))) { setExcluir(null); onMensagem('Este recurso está em uso e não pode ser excluído.'); return; } await onDocumento({ ...documento, recursos: documento.recursos.filter((recurso) => recurso.id !== excluir.id) }, 'Recurso excluído.'); setExcluir(null); };
  return <>
    <PageHeader title="Insumos e recursos" description="Base compartilhada das composições de todos os produtos e serviços." />
    <div className={styles.resourcesLayout}><form className={styles.panel} onSubmit={(e) => void salvar(e)}><div className={styles.panelTitle}><div><h2>{editando ? 'Editar recurso' : 'Novo recurso'}</h2><p>Matéria-prima, embalagem, mão de obra ou operação.</p></div></div><div className={styles.formGrid}><Field label="Código *"><input disabled={!podeEditar} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} placeholder={proximo} /></Field><Field label="Nome *"><input disabled={!podeEditar} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field><Field label="Categoria"><select disabled={!podeEditar} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}><option>Matéria-prima</option><option>Embalagem</option><option>Mão de obra</option><option>Operação</option><option>Terceirização</option><option>Outro</option></select></Field><Field label="Unidade"><input disabled={!podeEditar} value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} /></Field><Field label="Custo unitário" wide><MoneyInput disabled={!podeEditar} value={form.custo} onChange={(custo) => setForm({ ...form, custo })} label="Custo unitário" /></Field></div><div className={styles.codeAssistant}><span>Próximo código <b>{proximo}</b></span><button type="button" className={styles.linkButton} disabled={!podeEditar} onClick={() => setForm({ ...form, codigo: proximo })}>Usar código</button></div><div className={styles.formActions}>{editando && <button type="button" className={styles.secondaryButton} onClick={() => { setForm(vazio()); setEditando(false); }}>Cancelar</button>}<button type="submit" className={styles.primaryButton} disabled={!podeEditar}>{editando ? 'Salvar alterações' : 'Cadastrar recurso'}</button></div></form>
      <section className={styles.panel}><div className={styles.panelTitle}><div><h2>Recursos cadastrados</h2><p>{documento.recursos.length} disponíveis nas composições.</p></div><label className={styles.search}><span>Procurar</span><input value={busca} onChange={(e) => setBusca(e.target.value)} /></label></div><div className={styles.tableWrap}><table><thead><tr><th>Código</th><th>Recurso</th><th>Categoria</th><th>Unidade</th><th className={styles.numeric}>Custo</th><th /></tr></thead><tbody>{filtrados.map((recurso) => <tr key={recurso.id}><td><b>{recurso.codigo}</b></td><td>{recurso.nome}</td><td>{recurso.categoria}</td><td>{recurso.unidade}</td><td className={styles.numeric}><b>{formatarMoeda(recurso.custo)}</b></td><td className={styles.menuCell}><button type="button" className={styles.moreButton} disabled={!podeEditar} aria-label={`Opções de ${recurso.nome}`} onClick={() => setMenu(menu === recurso.id ? '' : recurso.id)}>•••</button>{menu === recurso.id && <div className={styles.contextMenu}><button type="button" onClick={() => { setForm({ ...recurso }); setEditando(true); setMenu(''); }}>Editar</button><button type="button" className={styles.dangerLink} onClick={() => { setExcluir(recurso); setMenu(''); }}>Excluir</button></div>}</td></tr>)}</tbody></table></div></section></div>
    <ModalConfirmacao aberto={Boolean(excluir)} titulo={`Excluir ${excluir?.nome || 'recurso'}?`} mensagem="A exclusão só será permitida se o recurso não estiver em nenhuma composição." textoConfirmar="Excluir" corPrimaria="var(--custos-brand)" aoCancelar={() => setExcluir(null)} aoConfirmar={() => void confirmarExclusao()} />
  </>;
}

const camposIniciais = (): CampoCenario[] => [{ id: crypto.randomUUID(), nome: 'Custo base', tipo: 'valor', valor: 0 }, { id: crypto.randomUUID(), nome: 'Frete e embalagem', tipo: 'valor', valor: 0 }, { id: crypto.randomUUID(), nome: 'Impostos', tipo: 'percentual', valor: 0 }, { id: crypto.randomUUID(), nome: 'Margem desejada', tipo: 'percentual', valor: 30 }];
const cenarioVazio = (): CenarioPreco => ({ id: crypto.randomUUID(), nome: '', campos: camposIniciais(), atualizadoEm: new Date().toISOString() });

function SimulacoesView({ documento, onDocumento, podeEditar, onMensagem }: { documento: DocumentoCustos; onDocumento: (proximo: DocumentoCustos, retorno: string) => Promise<void>; podeEditar: boolean; onMensagem: (texto: string) => void }) {
  const [cenario, setCenario] = useState<CenarioPreco>(cenarioVazio);
  const valores = cenario.campos.filter((campo) => campo.tipo === 'valor').reduce((total, campo) => total + campo.valor, 0);
  const percentuais = cenario.campos.filter((campo) => campo.tipo === 'percentual').reduce((total, campo) => total + campo.valor, 0);
  const valido = percentuais < 100; const preco = valido ? valores / (1 - percentuais / 100) : 0;
  const alterarCampo = (id: string, patch: Partial<CampoCenario>) => setCenario((atual) => ({ ...atual, campos: atual.campos.map((campo) => campo.id === id ? { ...campo, ...patch } : campo) }));
  const salvar = async () => { if (!cenario.nome.trim()) { onMensagem('Dê um nome ao cenário antes de salvar.'); return; } const pronto = { ...cenario, nome: cenario.nome.trim(), atualizadoEm: new Date().toISOString() }; const cenarios = documento.cenarios.some((item) => item.id === pronto.id) ? documento.cenarios.map((item) => item.id === pronto.id ? pronto : item) : [pronto, ...documento.cenarios]; await onDocumento({ ...documento, cenarios }, 'Cenário salvo para consulta.'); setCenario(pronto); };
  return <><PageHeader title="Simulações de preço" description="Estudos rápidos e independentes do cadastro mestre." actions={<button type="button" className={styles.secondaryButton} disabled={!podeEditar} onClick={() => setCenario(cenarioVazio())}>Nova simulação</button>} />
    <section className={`${styles.panel} ${styles.simulationHeader}`}><Field label="Cenários salvos"><select value={documento.cenarios.some((item) => item.id === cenario.id) ? cenario.id : ''} onChange={(e) => { const encontrado = documento.cenarios.find((item) => item.id === e.target.value); if (encontrado) setCenario(structuredClone(encontrado)); }}><option value="">Selecione um estudo</option>{documento.cenarios.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field><Field label="Nome do estudo"><input disabled={!podeEditar} value={cenario.nome} onChange={(e) => setCenario({ ...cenario, nome: e.target.value })} /></Field><button type="button" className={styles.primaryButton} disabled={!podeEditar} onClick={() => void salvar()}>Salvar cenário</button></section>
    <div className={styles.simulationLayout}><section className={styles.panel}><div className={styles.panelTitle}><div><h2>Formação do preço</h2><p>Adicione valores ou percentuais com nomes próprios.</p></div><button type="button" className={styles.secondaryButton} disabled={!podeEditar} onClick={() => setCenario({ ...cenario, campos: [...cenario.campos, { id: crypto.randomUUID(), nome: 'Novo componente', tipo: 'valor', valor: 0 }] })}>Adicionar campo</button></div><div className={styles.scenarioRows}>{cenario.campos.map((campo) => <div key={campo.id}><input disabled={!podeEditar} aria-label="Nome da composição" value={campo.nome} onChange={(e) => alterarCampo(campo.id, { nome: e.target.value })} /><select disabled={!podeEditar} value={campo.tipo} onChange={(e) => alterarCampo(campo.id, { tipo: e.target.value as CampoCenario['tipo'] })}><option value="valor">Valor (R$)</option><option value="percentual">Percentual (%)</option></select>{campo.tipo === 'valor' ? <MoneyInput compact disabled={!podeEditar} value={campo.valor} onChange={(valor) => alterarCampo(campo.id, { valor })} label={campo.nome} /> : <PercentInput compact disabled={!podeEditar} value={campo.valor} onChange={(valor) => alterarCampo(campo.id, { valor })} />}<button type="button" className={styles.rowAction} disabled={!podeEditar} onClick={() => setCenario({ ...cenario, campos: cenario.campos.filter((item) => item.id !== campo.id) })}>×</button></div>)}</div></section><aside className={`${styles.panel} ${styles.simulationResult}`}><h2>Resultado do estudo</h2><div><span>Base em valores</span><b>{formatarMoeda(valores)}</b></div><div><span>Total de percentuais</span><b>{percentuais.toFixed(2)}%</b></div><div className={styles.priceHighlight}><span>Preço sugerido</span><strong>{valido ? formatarMoeda(preco) : 'Percentuais inválidos'}</strong></div><small>O cenário não altera produtos ou serviços cadastrados.</small></aside></div>
  </>;
}

function HistoricoView({ produtos, documento, produtoAtivoId, onSelecionar }: { produtos: ProdutoCustos[]; documento: DocumentoCustos; produtoAtivoId: string; onSelecionar: (id: string) => void }) {
  const versoes = documento.historico.filter((versao) => !produtoAtivoId || versao.produtoId === produtoAtivoId);
  return <><PageHeader title="Histórico de custos" description="Compare versões registradas sempre que a composição alterar valores." /><section className={styles.panel}><div className={styles.panelTitle}><div><h2>Produto ou serviço</h2><p>O histórico permanece mesmo se o cadastro for inativado.</p></div><label className={styles.search}><span>Selecionar</span><select value={produtoAtivoId} onChange={(e) => onSelecionar(e.target.value)}><option value="">Todos</option>{produtos.map((produto) => <option key={produto.id} value={produto.id}>{produto.sku} · {produto.nome}</option>)}</select></label></div><div className={styles.tableWrap}><table><thead><tr><th>Data</th><th>Cadastro</th><th className={styles.numeric}>Custo direto</th><th className={styles.numeric}>Custo total</th><th className={styles.numeric}>Preço sugerido</th><th className={styles.numeric}>Variação</th></tr></thead><tbody>{versoes.map((versao, indice) => { const produto = produtos.find((item) => item.id === versao.produtoId); const anterior = versoes.slice(indice + 1).find((item) => item.produtoId === versao.produtoId); const variacao = anterior?.custoTotal ? (versao.custoTotal / anterior.custoTotal - 1) * 100 : null; return <tr key={versao.id}><td>{new Date(versao.criadoEm).toLocaleString('pt-BR')}</td><td><b>{produto?.sku || '—'}</b><small>{produto?.nome || 'Cadastro não localizado'}</small></td><td className={styles.numeric}>{formatarMoeda(versao.custoDireto)}</td><td className={styles.numeric}><b>{formatarMoeda(versao.custoTotal)}</b></td><td className={styles.numeric}>{formatarMoeda(versao.precoSugerido)}</td><td className={styles.numeric}>{variacao === null ? 'Versão inicial' : `${variacao >= 0 ? '+' : ''}${variacao.toFixed(2)}%`}</td></tr>; })}{!versoes.length && <tr><td colSpan={6} className={styles.empty}>Nenhuma versão registrada para esta seleção.</td></tr>}</tbody></table></div></section></>;
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`${styles.field} ${wide ? styles.fieldWide : ''}`}><span>{label}</span>{children}</label>;
}

function MoneyInput({ value, onChange, label, compact = false, disabled = false }: { value: number; onChange: (valor: number) => void; label: string; compact?: boolean; disabled?: boolean }) {
  const [texto, setTexto] = useState(formatarMoeda(value).replace('R$ ', ''));
  const [editando, setEditando] = useState(false);
  const exibido = editando ? texto : formatarMoeda(value).replace('R$ ', '');
  return <div className={`${styles.moneyInput} ${compact ? styles.inputCompact : ''}`}><span>R$</span><input disabled={disabled} aria-label={label} inputMode="numeric" value={exibido} onFocus={(e) => { setTexto(formatarMoeda(value).replace('R$ ', '')); setEditando(true); e.currentTarget.select(); }} onChange={(e) => { const formatado = formatarMoedaDigitada(e.target.value); setTexto(formatado); onChange(moedaDigitadaParaNumero(formatado) || 0); }} onBlur={() => setEditando(false)} /><i><button type="button" disabled={disabled} aria-label={`Aumentar ${label}`} onClick={() => onChange(Math.round((value + .01) * 100) / 100)}>▲</button><button type="button" disabled={disabled} aria-label={`Diminuir ${label}`} onClick={() => onChange(Math.max(0, Math.round((value - .01) * 100) / 100))}>▼</button></i></div>;
}

function PercentInput({ value, onChange, compact = false, disabled = false }: { value: number; onChange: (valor: number) => void; compact?: boolean; disabled?: boolean }) {
  return <div className={`${styles.percentInput} ${compact ? styles.inputCompact : ''}`}><input disabled={disabled} type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} /><span>%</span></div>;
}
