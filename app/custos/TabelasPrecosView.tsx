'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@/app/projetos/components/Icon';
import { Modal } from '@/app/projetos/components/Modal';
import CampoBusca from '@/app/components/CampoBusca';
import CampoMoeda from '@/app/components/CampoMoeda';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import { formatarMoeda, formatarMoedaDigitada, moedaDigitadaParaNumero, normalizarTexto } from '@/app/lib/formatters';
import {
  aplicarReajusteTabelas, salvarPrecoTabela, salvarTabelaPreco,
} from './repository';
import {
  calcularPrecoReajustado, colunasExportacaoTabelasPreco, gerarCodigoTecnicoTabelaPreco, precoEfetivoTabela,
  type PrecoTabelaItem, type ProdutoCustos, type ResultadoReajusteTabelas,
  type TabelaPreco, type TipoReajusteTabela,
} from './types';
import styles from './custos.module.css';
import { CAMPOS_EXCEL } from './excel-seletivo';
import dynamic from 'next/dynamic';
const ImportarPrecosModal = dynamic(() => import('./ImportarPrecosModal'), { ssr: false });

const cabecalhosProdutos = [
  'ID interno (não alterar)', 'Código', 'Tipo', 'Nome', 'Marca', 'Categoria', 'Descrição',
  'Custo', 'Preço padrão', 'Unidade', 'Código de barras', 'Ativo', 'Disponível no catálogo',
  'NCM', 'CEST', 'Origem', 'Unidade tributável', 'CFOP padrão', 'CST', 'CSOSN',
  'CST PIS', 'CST COFINS', 'CST IBS/CBS', 'Classificação IBS/CBS',
  'Código tributação nacional', 'Código tributação municipal', 'NBS', 'Item LC 116',
  'Município da prestação', 'Alíquota ISS', 'Atualizado em (não alterar)',
] as const;
const simNao = (valor: boolean) => valor ? 'Sim' : 'Não';
const percentualDigitado = (valor: string) => {
  const limpo = valor.replace('.', ',').replace(/[^\d,]/g, '');
  const [inteiro = '', ...decimais] = limpo.split(',');
  return `${inteiro.slice(0, 4)}${decimais.length ? `,${decimais.join('').slice(0, 2)}` : ''}`;
};
const percentualParaNumero = (valor: string) => {
  const numero = Number(valor.replace(',', '.'));
  return Number.isFinite(numero) ? numero : 0;
};
const formatarPercentual = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TabelasPrecosView({
  companyId, catalogoId, produtos, tabelas, precos, podeEditar, onRecarregar, onErro,
}: {
  companyId: string;
  catalogoId: string;
  produtos: ProdutoCustos[];
  tabelas: TabelaPreco[];
  precos: PrecoTabelaItem[];
  podeEditar: boolean;
  onRecarregar: () => Promise<void>;
  onErro: (texto: string) => void;
}) {
  const [tabelaAtivaId, setTabelaAtivaId] = useState(tabelas.find((item) => item.padrao)?.id || tabelas[0]?.id || '');
  const [busca, setBusca] = useState('');
  const [editandoTabela, setEditandoTabela] = useState<Partial<TabelaPreco> | null>(null);
  const [processando, setProcessando] = useState(false);
  const [arquivoImportacao, setArquivoImportacao] = useState<File | null>(null);
  const [exportacaoAberta, setExportacaoAberta] = useState(false);
  const [erroExportacao, setErroExportacao] = useState('');
  const [camposExportacao, setCamposExportacao] = useState<string[]>([]);
  const [camposExportacaoAbertos, setCamposExportacaoAbertos] = useState(false);
  const camposExportacaoId = useId();
  const [tabelasExportacao, setTabelasExportacao] = useState<string[]>([]);
  const camposCadastro = CAMPOS_EXCEL.filter(([campo]) => campo !== 'preco_venda');
  const todosCamposCadastro = camposCadastro.every(([campo]) => camposExportacao.includes(campo));
  const colunasTabelasExportacao = colunasExportacaoTabelasPreco(tabelas);
  const todasTabelasExportacao = camposExportacao.includes('preco_venda') && colunasTabelasExportacao.every((coluna) => tabelasExportacao.includes(coluna.codigo));
  const [reajusteAberto, setReajusteAberto] = useState(false);
  const [reajusteEtapa, setReajusteEtapa] = useState<'edicao' | 'revisao' | 'resultado'>('edicao');
  const [reajusteTipo, setReajusteTipo] = useState<TipoReajusteTabela>('percentual');
  const [reajusteValor, setReajusteValor] = useState('');
  const [tabelasReajusteIds, setTabelasReajusteIds] = useState<string[]>([]);
  const [reajusteId, setReajusteId] = useState('');
  const [erroReajuste, setErroReajuste] = useState('');
  const [resultadoReajuste, setResultadoReajuste] = useState<ResultadoReajusteTabelas | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const tabelaAtiva = tabelas.find((item) => item.id === tabelaAtivaId) || tabelas[0];
  const produtosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    return produtos.filter((produto) => !termo || [produto.sku, produto.nome, produto.marca, produto.categoria]
      .some((valor) => normalizarTexto(valor).includes(termo)));
  }, [busca, produtos]);
  const tabelasDisponiveisReajuste = useMemo(() => tabelas.filter((tabela) => tabela.ativo), [tabelas]);
  const produtosDisponiveisReajuste = useMemo(
    () => produtos.filter((produto) => produto.ativo && !produto.excluido_em),
    [produtos],
  );
  const valorReajusteNumero = reajusteTipo === 'valor'
    ? moedaDigitadaParaNumero(reajusteValor) || 0
    : percentualParaNumero(reajusteValor);
  const resumosReajuste = useMemo(() => tabelasDisponiveisReajuste.map((tabela) => {
    const valores = produtosDisponiveisReajuste.map((produto) => {
      const atual = precoEfetivoTabela(tabela, produto, precos);
      const novo = calcularPrecoReajustado(atual, reajusteTipo, valorReajusteNumero);
      const herdado = !tabela.padrao && !precos.some((item) => item.tabela_preco_id === tabela.id && item.produto_id === produto.id);
      return { atual, novo, herdado, alterado: Math.abs(novo - atual) >= 0.005 };
    });
    const divisor = valores.length || 1;
    return {
      tabela,
      itens: valores.length,
      alteracoes: valores.filter((item) => item.alterado).length,
      herdados: valores.filter((item) => item.herdado && item.alterado).length,
      mediaAtual: valores.reduce((total, item) => total + item.atual, 0) / divisor,
      mediaNova: valores.reduce((total, item) => total + item.novo, 0) / divisor,
    };
  }), [precos, produtosDisponiveisReajuste, reajusteTipo, tabelasDisponiveisReajuste, valorReajusteNumero]);
  const resumosSelecionados = resumosReajuste.filter((item) => tabelasReajusteIds.includes(item.tabela.id));
  const totalPrecosReajuste = resumosSelecionados.reduce((total, item) => total + item.alteracoes, 0);
  const totalHerdadosReajuste = resumosSelecionados.reduce((total, item) => total + item.herdados, 0);
  const podeRevisarReajuste = valorReajusteNumero > 0 && tabelasReajusteIds.length > 0 && totalPrecosReajuste > 0;

  const abrirReajuste = () => {
    setReajusteEtapa('edicao'); setReajusteTipo('percentual'); setReajusteValor('');
    setTabelasReajusteIds([]); setReajusteId(crypto.randomUUID()); setErroReajuste(''); setResultadoReajuste(null);
    setReajusteAberto(true); onErro('');
  };
  const fecharReajuste = () => {
    if (processando) return;
    setReajusteAberto(false); setErroReajuste(''); setResultadoReajuste(null);
  };
  const alternarTabelaReajuste = (id: string) => setTabelasReajusteIds((atuais) =>
    atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]);
  const alternarTodasTabelasReajuste = () => setTabelasReajusteIds((atuais) =>
    atuais.length === tabelasDisponiveisReajuste.length ? [] : tabelasDisponiveisReajuste.map((tabela) => tabela.id));
  const aplicarReajuste = async () => {
    if (!podeRevisarReajuste || !reajusteId) return;
    setProcessando(true); setErroReajuste(''); onErro('');
    try {
      const resultado = await aplicarReajusteTabelas(companyId, reajusteId, tabelasReajusteIds, reajusteTipo, valorReajusteNumero);
      setResultadoReajuste(resultado); setReajusteEtapa('resultado');
      try { await onRecarregar(); }
      catch { setErroReajuste('O reajuste foi aplicado, mas os dados da tela não puderam ser atualizados. Reabra o módulo para conferir.'); }
    } catch (falha) {
      setErroReajuste(falha instanceof Error ? falha.message : 'Não foi possível aplicar o reajuste.');
    } finally { setProcessando(false); }
  };

  const exportar = async () => {
    setProcessando(true); setErroExportacao(''); onErro('');
    try {
      const XLSX = await import('xlsx');
      const agora = new Date().toISOString();
      const livro = XLSX.utils.book_new();
      const colunasPrecos = colunasExportacaoTabelasPreco(tabelas).filter((coluna) => tabelasExportacao.includes(coluna.codigo));
      const indicePrecoPadrao = cabecalhosProdutos.indexOf('Preço padrão');
      const cabecalhosCompletos = [
        ...cabecalhosProdutos.slice(0, indicePrecoPadrao + 1),
        ...colunasPrecos.map((coluna) => coluna.cabecalho),
        ...cabecalhosProdutos.slice(indicePrecoPadrao + 1),
      ];
      const titulosEscolhidos = CAMPOS_EXCEL.filter(([campo]) => camposExportacao.includes(campo)).map(([, titulo]) => String(titulo));
      const obrigatorios = ['ID interno (não alterar)', 'Código', 'Nome', 'Atualizado em (não alterar)'];
      const cabecalhosPlanilhaProdutos = cabecalhosCompletos.filter((titulo) => obrigatorios.includes(titulo) || titulosEscolhidos.includes(titulo) || colunasPrecos.some((coluna) => coluna.cabecalho === titulo));
      const instrucoes = XLSX.utils.aoa_to_sheet([
        ['Cadastro de produtos e tabelas de preços — AvantaLab'],
        ['Como usar'],
        ['1. Edite somente os campos e tabelas escolhidos, na aba Produtos. Colunas ausentes não são alteradas.'],
        ['2. Não altere IDs internos nem datas de atualização. Eles evitam duplicidades e sobrescritas.'],
        ['3. Esta planilha atualiza cadastros existentes. Não altere ID nem Código. Nome é identificação, salvo quando selecionado para edição.'],
        ['4. Tipo aceita Produto ou Serviço. Ativo e Disponível no catálogo aceitam Sim ou Não.'],
        ['5. Cada tabela existente aparece em uma coluna “Preço · Nome da tabela”. Células vazias não alteram o preço já cadastrado.'],
        ['6. Não renomeie a planilha nem os cabeçalhos. Importe o arquivo e revise a prévia antes de confirmar.'],
        ['7. Texto vazio limpa o campo selecionado. Números e Sim/Não não podem ficar vazios; nos preços das tabelas, vazio mantém e zero grava zero.'],
      ]);
      instrucoes['!cols'] = [{ wch: 105 }];
      XLSX.utils.book_append_sheet(livro, instrucoes, 'Instruções');

      const linhasProdutos = produtos.map((produto) => {
        const linha = [
          produto.id, produto.sku, produto.tipo_item === 'servico' ? 'Serviço' : 'Produto', produto.nome,
        produto.marca, produto.categoria, produto.descricao, produto.preco_custo, produto.preco_venda,
        produto.unidade, produto.codigo_barras, simNao(produto.ativo), simNao(produto.disponivel_catalogo),
        produto.ncm, produto.cest, produto.origem_mercadoria, produto.unidade_tributavel, produto.cfop_padrao,
        produto.cst, produto.csosn, produto.cst_pis, produto.cst_cofins, produto.cst_ibs_cbs,
        produto.classificacao_ibs_cbs, produto.codigo_tributacao_nacional, produto.codigo_tributacao_municipal,
          produto.nbs, produto.item_lc116, produto.municipio_prestacao, produto.aliquota_iss, produto.atualizado_em,
        ];
        linha.splice(indicePrecoPadrao + 1, 0, ...colunasPrecos.map((coluna) => {
          const tabela = tabelas.find((item) => item.codigo === coluna.codigo);
          return precoEfetivoTabela(tabela, produto, precos);
        }));
        return cabecalhosPlanilhaProdutos.map((titulo) => linha[cabecalhosCompletos.indexOf(titulo)]);
      });
      const planilhaProdutos = XLSX.utils.aoa_to_sheet([cabecalhosPlanilhaProdutos, ...linhasProdutos]);
      const ultimaColuna = XLSX.utils.encode_col(cabecalhosPlanilhaProdutos.length - 1);
      planilhaProdutos['!autofilter'] = { ref: `A1:${ultimaColuna}${Math.max(2, linhasProdutos.length + 1)}` };
      planilhaProdutos['!freeze'] = { xSplit: 2, ySplit: 1 };
      planilhaProdutos['!cols'] = cabecalhosPlanilhaProdutos.map((cabecalho) => ({
        wch: cabecalho.startsWith('Preço ·') ? Math.min(30, Math.max(18, cabecalho.length + 2)) : Math.min(34, Math.max(12, cabecalho.length + 2)),
        hidden: cabecalho === 'ID interno (não alterar)' || cabecalho === 'Atualizado em (não alterar)',
      }));
      const colunasMoeda = cabecalhosPlanilhaProdutos
        .map((cabecalho, indice) => cabecalho === 'Custo' || cabecalho === 'Preço padrão' || cabecalho.startsWith('Preço ·') ? XLSX.utils.encode_col(indice) : null)
        .filter((coluna): coluna is string => Boolean(coluna));
      const indiceAliquotaIss = cabecalhosPlanilhaProdutos.indexOf('Alíquota ISS');
      const colunaAliquotaIss = indiceAliquotaIss >= 0 ? XLSX.utils.encode_col(indiceAliquotaIss) : null;
      for (let linha = 2; linha <= linhasProdutos.length + 1; linha += 1) {
        for (const coluna of colunasMoeda) if (planilhaProdutos[`${coluna}${linha}`]) planilhaProdutos[`${coluna}${linha}`].z = 'R$ #,##0.00';
        if (colunaAliquotaIss && planilhaProdutos[`${colunaAliquotaIss}${linha}`]) planilhaProdutos[`${colunaAliquotaIss}${linha}`].z = '0.00';
      }
      XLSX.utils.book_append_sheet(livro, planilhaProdutos, 'Produtos');

      const metadados = XLSX.utils.aoa_to_sheet([
        ['chave', 'valor', 'nome', 'cabecalho'],
        ['formato', 'AVANTALAB-CUSTOS-3', '', ''],
        ['exportado_em', agora, '', ''],
        ['empresa_id', companyId, '', ''],
        ...camposExportacao.map((campo) => ['campo_editavel', campo, '', '']),
        ...colunasPrecos.map((coluna) => ['tabela_preco', coluna.codigo, coluna.nome, coluna.cabecalho]),
      ]);
      XLSX.utils.book_append_sheet(livro, metadados, 'Metadados');
      livro.Workbook = { ...livro.Workbook, Sheets: livro.SheetNames.map((name) => ({ name, Hidden: name === 'Metadados' ? 2 : 0 })) };
      const {baixarLivroPrecos}=await import('./excel-apresentacao');
      await baixarLivroPrecos(XLSX.write(livro,{type:'array',bookType:'xlsx',compression:true}),cabecalhosPlanilhaProdutos,`avantalab-produtos-precos-${agora.slice(0, 10)}.xlsx`);
      setExportacaoAberta(false);
    } catch (falha) { setErroExportacao(falha instanceof Error ? falha.message : 'Não foi possível gerar a planilha.'); }
    finally { setProcessando(false); }
  };

  const gravarTabela = async () => {
    if (!editandoTabela) return;
    setProcessando(true); onErro('');
    try {
      const salva = await salvarTabelaPreco(companyId, {
        ...editandoTabela,
        codigo: editandoTabela.id
          ? editandoTabela.codigo
          : gerarCodigoTecnicoTabelaPreco(editandoTabela.nome || '', tabelas.map((tabela) => tabela.codigo)),
      });
      setTabelaAtivaId(salva.id); setEditandoTabela(null);
      await onRecarregar();
    } catch (falha) { onErro(falha instanceof Error ? falha.message : 'Não foi possível salvar a tabela.'); }
    finally { setProcessando(false); }
  };

  return <>
    <header className={styles.pageHeader}><div><h1>Tabelas de preços</h1></div><div className={styles.headerActions}>
      <input ref={inputArquivo} type="file" accept=".xlsx,.xls" hidden onChange={(evento) => { const arquivo = evento.target.files?.[0]; if (arquivo) setArquivoImportacao(arquivo); evento.target.value = ''; }} />
      <button type="button" aria-label="Importar Excel" className={`${styles.secondaryButton} ${styles.spreadsheetAction}`} disabled={!podeEditar || processando} onClick={() => inputArquivo.current?.click()}><span className={styles.spreadsheetActionIcon}><Icon name="upload" size={17} /></span><span className={styles.spreadsheetActionText}><strong>Importar</strong><small>Excel</small></span></button>
      <button type="button" aria-label="Exportar Excel" className={`${styles.secondaryButton} ${styles.spreadsheetAction}`} disabled={processando} onClick={() => { setCamposExportacao([]); setTabelasExportacao(tabelaAtiva && !tabelaAtiva.padrao ? [tabelaAtiva.codigo] : []); if (tabelaAtiva?.padrao) setCamposExportacao(['preco_venda']); setExportacaoAberta(true); }}><span className={styles.spreadsheetActionIcon}><Icon name="download" size={17} /></span><span className={styles.spreadsheetActionText}><strong>Exportar</strong><small>Excel</small></span></button>
      <button type="button" className={`${styles.secondaryButton} ${styles.repriceAction}`} disabled={!podeEditar || processando || !tabelasDisponiveisReajuste.length} onClick={abrirReajuste}><Icon name="trendUp" size={17} />Reajuste</button>
      <button type="button" className={styles.primaryButton} disabled={!podeEditar || processando} onClick={() => setEditandoTabela({ nome: '', ativo: true })}>Nova tabela</button>
    </div></header>

    <Modal open={exportacaoAberta} onClose={() => !processando && setExportacaoAberta(false)} title="Escolher colunas do Excel" description="Exporte somente o que deseja alterar. Os demais dados serão preservados." wide compact headerTone="accent">
      <div className={styles.exportSelection}>
        {erroExportacao && <p className={styles.repriceError} role="alert">{erroExportacao}</p>}
        <p>Código e Nome acompanham o arquivo para identificação. IDs e datas de atualização ficam ocultos e não devem ser alterados.</p>
        <section aria-label="Dados do cadastro para exportação">
          <div className={styles.exportGroupHeader}><strong>Dados do cadastro <span>· {camposExportacao.filter((campo) => campo !== 'preco_venda').length} selecionado(s)</span></strong><BotaoAcaoCompacto variante="primario" aria-label={todosCamposCadastro ? 'Desmarcar todos os campos do cadastro' : 'Selecionar todos os campos do cadastro'} onClick={() => setCamposExportacao((atuais) => todosCamposCadastro ? atuais.filter((campo) => campo === 'preco_venda') : [...new Set([...atuais, ...camposCadastro.map(([campo]) => campo)])])}>{todosCamposCadastro ? 'Desmarcar todos' : 'Selecionar todos'}</BotaoAcaoCompacto></div>
          <div className={styles.exportExpandHint}><BotaoExpandirCard variante="painel" modo="lista" somenteIcone contexto="campos do cadastro para seleção" controlsId={camposExportacaoId} expandido={camposExportacaoAbertos} onClick={() => setCamposExportacaoAbertos((atual) => !atual)} corPrimaria="var(--brand)" /><span>{camposExportacaoAbertos ? 'Ocultar opções de campos do cadastro' : 'Exibir mais campos do cadastro para seleção'}</span></div>
          <fieldset id={camposExportacaoId} hidden={!camposExportacaoAbertos}><legend>Campos opcionais</legend><div className={styles.exportColumnGrid}>{camposCadastro.map(([campo, titulo]) => <label key={campo}><input type="checkbox" checked={camposExportacao.includes(campo)} onChange={() => setCamposExportacao((atuais) => atuais.includes(campo) ? atuais.filter((item) => item !== campo) : [...atuais, campo])} />{titulo}</label>)}</div></fieldset>
        </section>
        <section aria-label="Tabelas de preços para exportação"><div className={styles.exportGroupHeader}><strong>Tabelas de preços <span>· {tabelasExportacao.length + Number(camposExportacao.includes('preco_venda'))} selecionada(s)</span></strong><BotaoAcaoCompacto variante="primario" aria-label={todasTabelasExportacao ? 'Desmarcar todas as tabelas de preços' : 'Selecionar todas as tabelas de preços'} onClick={() => { setCamposExportacao((atuais) => todasTabelasExportacao ? atuais.filter((campo) => campo !== 'preco_venda') : [...new Set([...atuais, 'preco_venda'])]); setTabelasExportacao(todasTabelasExportacao ? [] : colunasTabelasExportacao.map((coluna) => coluna.codigo)); }}>{todasTabelasExportacao ? 'Desmarcar todas' : 'Selecionar todas'}</BotaoAcaoCompacto></div>
        <fieldset><legend>Escolha as tabelas que deseja editar</legend><div className={styles.exportColumnGrid}>
          <label><input type="checkbox" checked={camposExportacao.includes('preco_venda')} onChange={() => setCamposExportacao((atuais) => atuais.includes('preco_venda') ? atuais.filter((item) => item !== 'preco_venda') : [...atuais, 'preco_venda'])} />Preço padrão</label>
          {colunasExportacaoTabelasPreco(tabelas).map((coluna) => <label key={coluna.codigo}><input type="checkbox" checked={tabelasExportacao.includes(coluna.codigo)} onChange={() => setTabelasExportacao((atuais) => atuais.includes(coluna.codigo) ? atuais.filter((item) => item !== coluna.codigo) : [...atuais, coluna.codigo])} />{coluna.nome}</label>)}
        </div></fieldset></section>
        <footer className={styles.formActions}><button type="button" className={styles.secondaryButton} disabled={processando} onClick={() => setExportacaoAberta(false)}>Cancelar</button><button type="button" className={styles.primaryButton} disabled={processando || !produtos.length || !camposExportacao.length && !tabelasExportacao.length} onClick={() => void exportar()}>{processando ? 'Gerando…' : 'Exportar seleção'}</button></footer>
      </div>
    </Modal>

    <section className={styles.panel}>
      <div className={styles.panelTitle}><div><h2>Políticas comerciais</h2><p>A tabela padrão é usada quando a cliente não possui vínculo específico.</p></div></div>
      <div className={styles.priceTableCards} role="list">
        {tabelas.map((tabela) => <button type="button" role="listitem" key={tabela.id} className={`${styles.priceTableCard} ${tabela.id === tabelaAtiva?.id ? styles.priceTableCardActive : ''}`} onClick={() => setTabelaAtivaId(tabela.id)}>
          <span>{tabela.padrao ? 'Padrão' : tabela.ativo ? 'Ativa' : 'Inativa'}</span><strong>{tabela.nome}</strong>{tabela.descricao && <small>{tabela.descricao}</small>}
        </button>)}
      </div>
    </section>

    {tabelaAtiva ? <section className={styles.panel}>
      <div className={styles.panelTitle}><div><h2>{tabelaAtiva.nome}</h2><p>{tabelaAtiva.padrao ? 'Preço principal do cadastro mestre.' : tabelaAtiva.descricao || 'Preços específicos desta negociação.'}</p></div><div className={styles.priceTableTools}>
        <label className={styles.search}>Localizar produto<CampoBusca value={busca} onChange={setBusca} placeholder="Código, nome, marca…" /></label>
        {!tabelaAtiva.padrao && <button type="button" className={styles.secondaryButton} disabled={!podeEditar} onClick={() => setEditandoTabela(tabelaAtiva)}>Ajustar tabela</button>}
      </div></div>
      <div className={styles.tableWrap}><table><thead><tr><th scope="col">Código</th><th scope="col">Produto ou serviço</th><th scope="col">Preço padrão</th><th scope="col">Preço nesta tabela</th></tr></thead><tbody>
        {produtosFiltrados.map((produto) => <tr key={produto.id}><td><b>{produto.sku}</b></td><td>{produto.nome}<small>{produto.tipo_item === 'servico' ? 'Serviço' : 'Produto'} · {produto.unidade}</small></td><td className={styles.numeric}>{formatarMoeda(produto.preco_venda)}</td><td className={styles.priceEditorCell}><PriceEditor value={precoEfetivoTabela(tabelaAtiva, produto, precos)} disabled={!podeEditar || !tabelaAtiva.ativo || processando} onSave={async (valor) => { try { await salvarPrecoTabela(companyId, tabelaAtiva.id, produto.id, valor); await onRecarregar(); } catch (falha) { onErro(falha instanceof Error ? falha.message : 'Não foi possível salvar o preço.'); throw falha; } }} /></td></tr>)}
        {!produtosFiltrados.length && <tr><td colSpan={4} className={styles.empty}>{produtos.length ? 'Nenhum produto ou serviço localizado.' : 'Nenhum produto ou serviço em catálogos ativos em Vendas e Serviços.'}</td></tr>}
      </tbody></table></div>
    </section> : <section className={styles.panel}><p className={styles.empty}>A tabela padrão ainda não foi preparada.</p></section>}

    <section className={styles.importSafety}><strong>Importação protegida</strong><p>O arquivo é validado antes de qualquer alteração. IDs impedem duplicidades e a data de atualização bloqueia a substituição de um produto alterado após a exportação.</p></section>

    <Modal open={reajusteAberto} onClose={fecharReajuste} title={reajusteEtapa === 'resultado' ? 'Reajuste concluído' : 'Reajustar tabelas de preços'} description={reajusteEtapa === 'resultado' ? 'Os preços foram gravados e o histórico foi preservado.' : 'Informe o reajuste, selecione as tabelas e revise antes de aplicar.'} wide compact headerTone="accent">
      {reajusteEtapa === 'edicao' && <div className={styles.repriceFlow}>
        <section aria-labelledby="reprice-step-one">
          <div className={styles.repriceStepTitle}><span aria-hidden="true">1</span><div><h3 id="reprice-step-one">Defina o reajuste</h3><p>Escolha como o valor será acrescido aos preços vigentes.</p></div></div>
          <div className={styles.repriceDefinition}>
            <fieldset className={styles.repriceType}><legend>Tipo de reajuste</legend><div>
              <button type="button" aria-pressed={reajusteTipo === 'percentual'} onClick={() => { setReajusteTipo('percentual'); setReajusteValor(''); setErroReajuste(''); }}>Percentual (%)</button>
              <button type="button" aria-pressed={reajusteTipo === 'valor'} onClick={() => { setReajusteTipo('valor'); setReajusteValor(''); setErroReajuste(''); }}>Valor adicional (R$)</button>
            </div></fieldset>
            <label className={styles.repriceValue}><span>{reajusteTipo === 'percentual' ? 'Percentual de reajuste' : 'Valor adicional'}</span>{reajusteTipo === 'percentual'
              ? <span className={styles.repricePercent}><input autoFocus aria-label="Percentual de reajuste" inputMode="decimal" value={reajusteValor} placeholder="0,00" onChange={(evento) => setReajusteValor(percentualDigitado(evento.target.value))} onBlur={() => { if (valorReajusteNumero > 0) setReajusteValor(formatarPercentual(valorReajusteNumero)); }} /><b>%</b></span>
              : <span className={styles.repriceMoney}><b>R$</b><CampoMoeda autoFocus aria-label="Valor adicional do reajuste" value={reajusteValor} placeholder="0,00" onChange={setReajusteValor} /></span>}
            </label>
            <div className={styles.repriceExample}><span>Exemplo do resultado</span><strong>{formatarMoeda(100)} <i aria-hidden="true">→</i> <b>{formatarMoeda(calcularPrecoReajustado(100, reajusteTipo, valorReajusteNumero))}</b></strong></div>
          </div>
        </section>

        <section aria-labelledby="reprice-step-two">
          <div className={styles.repriceSelectionHeader}><div className={styles.repriceStepTitle}><span aria-hidden="true">2</span><div><h3 id="reprice-step-two">Selecione as tabelas</h3><p>Clique nos quadros para incluir ou retirar uma tabela.</p></div></div>{tabelasDisponiveisReajuste.length > 0 && <label className={styles.repriceSelectAll}><input type="checkbox" checked={tabelasReajusteIds.length === tabelasDisponiveisReajuste.length} onChange={alternarTodasTabelasReajuste} />Selecionar todas</label>}</div>
          <div className={styles.repriceTableGrid} role="group" aria-label="Tabelas disponíveis para reajuste">
            {resumosReajuste.map((resumo) => { const selecionada = tabelasReajusteIds.includes(resumo.tabela.id); return <label key={resumo.tabela.id} className={`${styles.repriceTableCard} ${selecionada ? styles.repriceTableCardSelected : ''}`}>
              <input type="checkbox" checked={selecionada} onChange={() => alternarTabelaReajuste(resumo.tabela.id)} />
              <span className={styles.repriceTableIdentity}><strong>{resumo.tabela.nome}</strong><small>{resumo.tabela.padrao ? 'Principal' : 'Ativa'}</small></span>
              <span className={styles.repriceTableDetail}>{resumo.itens} preços{resumo.herdados ? ` · ${resumo.herdados} herdados` : ''}</span>
              <span className={styles.repriceTablePreview}>Média <b>{formatarMoeda(resumo.mediaAtual)}</b><i aria-hidden="true">→</i><strong>{formatarMoeda(resumo.mediaNova)}</strong></span>
            </label>; })}
            {!resumosReajuste.length && <p className={styles.repriceEmpty}>Nenhuma tabela ativa disponível para reajuste.</p>}
          </div>
        </section>

        {totalHerdadosReajuste > 0 && <p className={styles.repriceNotice}>Valores herdados passarão a ter preço próprio nas tabelas selecionadas.</p>}
        {!produtosDisponiveisReajuste.length && <p className={styles.repriceError} role="alert">Não há produtos ou serviços ativos para reajustar.</p>}
        {erroReajuste && <p className={styles.repriceError} role="alert">{erroReajuste}</p>}
        <footer className={styles.repriceFooter}><span><b>{tabelasReajusteIds.length} tabela(s)</b> selecionada(s) · <b>{totalPrecosReajuste} preço(s)</b> serão atualizados</span><div><button type="button" className={styles.secondaryButton} onClick={fecharReajuste}>Cancelar</button><button type="button" className={styles.primaryButton} disabled={!podeRevisarReajuste} onClick={() => { setErroReajuste(''); setReajusteEtapa('revisao'); }}>Revisar</button></div></footer>
      </div>}

      {reajusteEtapa === 'revisao' && <div className={styles.repriceReview}>
        <div className={styles.repriceReviewSummary}><span>Reajuste definido</span><strong>{reajusteTipo === 'percentual' ? `${formatarPercentual(valorReajusteNumero)}%` : formatarMoeda(valorReajusteNumero)} adicionais sobre cada preço vigente</strong><small>{tabelasReajusteIds.length} tabela(s) · {totalPrecosReajuste} preço(s)</small></div>
        <div className={styles.repriceReviewGrid}>{resumosSelecionados.map((resumo) => <article key={resumo.tabela.id}><span>{resumo.tabela.padrao ? 'Tabela principal' : 'Tabela ativa'}</span><h3>{resumo.tabela.nome}</h3><p>{resumo.alteracoes} preço(s){resumo.herdados ? ` · ${resumo.herdados} herdado(s)` : ''}</p><strong>{formatarMoeda(resumo.mediaAtual)} <i aria-hidden="true">→</i> <b>{formatarMoeda(resumo.mediaNova)}</b></strong></article>)}</div>
        <p className={styles.repriceConfirmation}>Confirme somente se o tipo, o valor e todas as tabelas estiverem corretos. O lote ficará registrado no histórico.</p>
        {erroReajuste && <p className={styles.repriceError} role="alert">{erroReajuste}</p>}
        <footer className={styles.repriceFooter}><span>Nenhuma alteração foi aplicada ainda.</span><div><button type="button" className={styles.secondaryButton} disabled={processando} onClick={() => setReajusteEtapa('edicao')}>Voltar</button><button type="button" className={styles.primaryButton} disabled={processando} onClick={() => void aplicarReajuste()}>{processando ? 'Aplicando…' : 'Aplicar reajuste'}</button></div></footer>
      </div>}

      {reajusteEtapa === 'resultado' && resultadoReajuste && <div className={styles.repriceResult} role="status"><span className={styles.repriceResultIcon}><Icon name="check" size={28} /></span><h3>Reajuste aplicado com segurança</h3><p>{resultadoReajuste.precos_atualizados} preço(s) foram atualizados em {resultadoReajuste.tabelas_atualizadas} tabela(s).</p><small>Lote {resultadoReajuste.reajuste_id}</small>{erroReajuste && <p className={styles.repriceError}>{erroReajuste}</p>}<button type="button" className={styles.primaryButton} onClick={fecharReajuste}>Concluir</button></div>}
    </Modal>

    <Modal open={Boolean(editandoTabela)} onClose={() => !processando && setEditandoTabela(null)} title={editandoTabela?.id ? 'Ajustar tabela de preços' : 'Nova tabela de preços'} description={editandoTabela?.id ? 'Altere o nome, a descrição ou a disponibilidade desta tabela.' : 'Informe somente um nome para identificar a nova tabela.'}>
      {editandoTabela && <div className={styles.priceTableForm}><label>Nome<input autoFocus minLength={2} value={editandoTabela.nome || ''} maxLength={80} onChange={(evento) => setEditandoTabela({ ...editandoTabela, nome: evento.target.value })} /></label>{editandoTabela.id && <label>Descrição<textarea rows={3} value={editandoTabela.descricao || ''} onChange={(evento) => setEditandoTabela({ ...editandoTabela, descricao: evento.target.value })} /></label>}{editandoTabela.id && !editandoTabela.padrao && <label className={styles.checkboxLine}><input type="checkbox" checked={editandoTabela.ativo !== false} onChange={(evento) => setEditandoTabela({ ...editandoTabela, ativo: evento.target.checked })} />Tabela ativa</label>}<div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setEditandoTabela(null)} disabled={processando}>Cancelar</button><button type="button" className={styles.primaryButton} onClick={() => void gravarTabela()} disabled={processando || (editandoTabela.nome?.trim().length || 0) < 2}>Salvar tabela</button></div></div>}
    </Modal>

    {arquivoImportacao && <ImportarPrecosModal key={`${companyId}:${arquivoImportacao.name}:${arquivoImportacao.lastModified}`} arquivo={arquivoImportacao} companyId={companyId} produtos={produtos} tabelas={tabelas} podeEditar={podeEditar} onClose={()=>setArquivoImportacao(null)} onRecarregar={onRecarregar} />}
  </>;
}

function PriceEditor({ value, disabled, onSave }: { value: number; disabled: boolean; onSave: (valor: number) => Promise<void> }) {
  const [texto, setTexto] = useState(formatarMoeda(value).replace('R$ ', ''));
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { if (!salvando) setTexto(formatarMoeda(value).replace('R$ ', '')); }, [salvando, value]);
  const confirmar = async () => {
    const numero = moedaDigitadaParaNumero(texto) ?? 0;
    setTexto(formatarMoeda(numero).replace('R$ ', ''));
    if (Math.abs(numero - value) < 0.005) return;
    setSalvando(true);
    try { await onSave(numero); } catch { setTexto(formatarMoeda(value).replace('R$ ', '')); }
    finally { setSalvando(false); }
  };
  return <label className={styles.inlineMoney}><span>R$</span><input aria-label="Preço nesta tabela" inputMode="numeric" value={texto} disabled={disabled || salvando} onChange={(evento) => setTexto(formatarMoedaDigitada(evento.target.value))} onBlur={() => void confirmar()} onKeyDown={(evento) => { if (evento.key === 'Enter') evento.currentTarget.blur(); }} /></label>;
}
