'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/app/projetos/components/Icon';
import { Modal } from '@/app/projetos/components/Modal';
import CampoBusca from '@/app/components/CampoBusca';
import CampoMoeda from '@/app/components/CampoMoeda';
import { formatarMoeda, formatarMoedaDigitada, moedaDigitadaParaNumero, normalizarTexto } from '@/app/lib/formatters';
import {
  aplicarReajusteTabelas, importarCadastroProdutosPrecos, salvarPrecoTabela, salvarTabelaPreco,
} from './repository';
import {
  calcularPrecoReajustado, colunasExportacaoTabelasPreco, gerarCodigoTecnicoTabelaPreco, precoEfetivoTabela,
  type PrecoTabelaItem, type ProdutoCustos, type ResumoImportacaoCadastro, type ResultadoReajusteTabelas,
  type TabelaPreco, type TipoReajusteTabela,
} from './types';
import styles from './custos.module.css';

type ImportacaoPendente = {
  arquivoNome: string;
  exportadoEm: string | null;
  produtos: Array<Record<string, unknown>>;
  precos: Array<Record<string, unknown>>;
  resumo: ResumoImportacaoCadastro;
};

const cabecalhosProdutos = [
  'ID interno (não alterar)', 'Código', 'Tipo', 'Nome', 'Marca', 'Categoria', 'Descrição',
  'Custo', 'Preço padrão', 'Unidade', 'Código de barras', 'Ativo', 'Disponível no catálogo',
  'NCM', 'CEST', 'Origem', 'Unidade tributável', 'CFOP padrão', 'CST', 'CSOSN',
  'CST PIS', 'CST COFINS', 'CST IBS/CBS', 'Classificação IBS/CBS',
  'Código tributação nacional', 'Código tributação municipal', 'NBS', 'Item LC 116',
  'Município da prestação', 'Alíquota ISS', 'Atualizado em (não alterar)',
] as const;
const simNao = (valor: boolean) => valor ? 'Sim' : 'Não';
const booleanoPlanilha = (valor: unknown, padrao: boolean) => {
  const texto = String(valor ?? '').trim().toLocaleLowerCase('pt-BR');
  if (!texto) return padrao;
  if (['sim', 's', 'true', '1', 'ativo'].includes(texto)) return true;
  if (['não', 'nao', 'n', 'false', '0', 'inativo'].includes(texto)) return false;
  return padrao;
};
const numeroPlanilha = (valor: unknown) => {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!texto) return 0;
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
};
const numeroPlanilhaOpcional = (valor: unknown, contexto: string) => {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  if (typeof valor === 'number') {
    if (Number.isFinite(valor)) return valor;
    throw new Error(`Valor inválido em ${contexto}.`);
  }
  const texto = String(valor).trim().replace(/R\$/gi, '').replace(/\s/g, '');
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) throw new Error(`Valor inválido em ${contexto}.`);
  return numero;
};
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
const valorLinha = (linha: Record<string, unknown>, cabecalho: string) => linha[cabecalho];

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
  const [importacao, setImportacao] = useState<ImportacaoPendente | null>(null);
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
    setProcessando(true); onErro('');
    try {
      const XLSX = await import('xlsx');
      const agora = new Date().toISOString();
      const livro = XLSX.utils.book_new();
      const colunasPrecos = colunasExportacaoTabelasPreco(tabelas);
      const indicePrecoPadrao = cabecalhosProdutos.indexOf('Preço padrão');
      const cabecalhosPlanilhaProdutos = [
        ...cabecalhosProdutos.slice(0, indicePrecoPadrao + 1),
        ...colunasPrecos.map((coluna) => coluna.cabecalho),
        ...cabecalhosProdutos.slice(indicePrecoPadrao + 1),
      ];
      const instrucoes = XLSX.utils.aoa_to_sheet([
        ['Cadastro de produtos e tabelas de preços — AvantaLab'],
        ['Como usar'],
        ['1. Edite os produtos e seus preços somente na planilha Produtos.'],
        ['2. Não altere IDs internos nem datas de atualização. Eles evitam duplicidades e sobrescritas.'],
        ['3. Para cadastrar um produto, crie uma linha com ID em branco e um Código ainda não utilizado.'],
        ['4. Tipo aceita Produto ou Serviço. Ativo e Disponível no catálogo aceitam Sim ou Não.'],
        ['5. Cada tabela existente aparece em uma coluna “Preço · Nome da tabela”. Células vazias não alteram o preço já cadastrado.'],
        ['6. Não renomeie a planilha nem os cabeçalhos. Importe o arquivo e revise a prévia antes de confirmar.'],
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
        return linha;
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
      const colunaAliquotaIss = XLSX.utils.encode_col(cabecalhosPlanilhaProdutos.indexOf('Alíquota ISS'));
      for (let linha = 2; linha <= linhasProdutos.length + 1; linha += 1) {
        for (const coluna of colunasMoeda) if (planilhaProdutos[`${coluna}${linha}`]) planilhaProdutos[`${coluna}${linha}`].z = 'R$ #,##0.00';
        if (planilhaProdutos[`${colunaAliquotaIss}${linha}`]) planilhaProdutos[`${colunaAliquotaIss}${linha}`].z = '0.00';
      }
      XLSX.utils.book_append_sheet(livro, planilhaProdutos, 'Produtos');

      const metadados = XLSX.utils.aoa_to_sheet([
        ['chave', 'valor', 'nome', 'cabecalho'],
        ['formato', 'AVANTALAB-CUSTOS-2', '', ''],
        ['exportado_em', agora, '', ''],
        ...colunasPrecos.map((coluna) => ['tabela_preco', coluna.codigo, coluna.nome, coluna.cabecalho]),
      ]);
      XLSX.utils.book_append_sheet(livro, metadados, 'Metadados');
      if (livro.Workbook?.Sheets) livro.Workbook.Sheets.find((item) => item.name === 'Metadados')!.Hidden = 2;
      XLSX.writeFile(livro, `avantalab-produtos-precos-${agora.slice(0, 10)}.xlsx`, { compression: true });
    } catch (falha) { onErro(falha instanceof Error ? falha.message : 'Não foi possível gerar a planilha.'); }
    finally { setProcessando(false); }
  };

  const lerArquivo = async (arquivo: File) => {
    setProcessando(true); onErro('');
    try {
      const XLSX = await import('xlsx');
      const livro = XLSX.read(await arquivo.arrayBuffer(), { type: 'array', cellDates: true });
      const abaProdutos = livro.Sheets['Produtos'];
      if (!abaProdutos) throw new Error('Use uma planilha exportada pelo AvantaLab, com a aba Produtos.');
      const linhasProdutos = XLSX.utils.sheet_to_json<Record<string, unknown>>(abaProdutos, { defval: '' });
      const abaMetadados = livro.Sheets['Metadados'];
      const linhasMetadados = abaMetadados ? XLSX.utils.sheet_to_json<Array<unknown>>(abaMetadados, { header: 1, defval: '' }) : [];
      const colunasPrecosMetadados = linhasMetadados.filter((linha) => String(linha[0]).trim() === 'tabela_preco').map((linha) => ({
        codigo: String(linha[1] || '').trim().toUpperCase(),
        cabecalho: String(linha[3] || '').trim(),
      })).filter((coluna) => coluna.codigo && coluna.cabecalho);
      const produtosImportados = linhasProdutos.filter((linha) => String(valorLinha(linha, 'Código')).trim()).map((linha) => ({
        id: String(valorLinha(linha, 'ID interno (não alterar)') || '').trim(),
        sku: String(valorLinha(linha, 'Código') || '').trim().toUpperCase(),
        tipo_item: String(valorLinha(linha, 'Tipo') || '').toLocaleLowerCase('pt-BR').startsWith('serv') ? 'servico' : 'produto',
        nome: String(valorLinha(linha, 'Nome') || '').trim(), marca: String(valorLinha(linha, 'Marca') || '').trim(),
        categoria: String(valorLinha(linha, 'Categoria') || '').trim(), descricao: String(valorLinha(linha, 'Descrição') || '').trim(),
        preco_custo: numeroPlanilha(valorLinha(linha, 'Custo')), preco_venda: numeroPlanilha(valorLinha(linha, 'Preço padrão')),
        unidade: String(valorLinha(linha, 'Unidade') || '').trim(), codigo_barras: String(valorLinha(linha, 'Código de barras') || '').trim(),
        ativo: booleanoPlanilha(valorLinha(linha, 'Ativo'), true),
        disponivel_catalogo: booleanoPlanilha(valorLinha(linha, 'Disponível no catálogo'), false),
        ncm: String(valorLinha(linha, 'NCM') || '').trim(), cest: String(valorLinha(linha, 'CEST') || '').trim(),
        origem_mercadoria: String(valorLinha(linha, 'Origem') || '').trim(), unidade_tributavel: String(valorLinha(linha, 'Unidade tributável') || '').trim(),
        cfop_padrao: String(valorLinha(linha, 'CFOP padrão') || '').trim(), cst: String(valorLinha(linha, 'CST') || '').trim(),
        csosn: String(valorLinha(linha, 'CSOSN') || '').trim(), cst_pis: String(valorLinha(linha, 'CST PIS') || '').trim(),
        cst_cofins: String(valorLinha(linha, 'CST COFINS') || '').trim(), cst_ibs_cbs: String(valorLinha(linha, 'CST IBS/CBS') || '').trim(),
        classificacao_ibs_cbs: String(valorLinha(linha, 'Classificação IBS/CBS') || '').trim(),
        codigo_tributacao_nacional: String(valorLinha(linha, 'Código tributação nacional') || '').trim(),
        codigo_tributacao_municipal: String(valorLinha(linha, 'Código tributação municipal') || '').trim(),
        nbs: String(valorLinha(linha, 'NBS') || '').trim(), item_lc116: String(valorLinha(linha, 'Item LC 116') || '').trim(),
        municipio_prestacao: String(valorLinha(linha, 'Município da prestação') || '').trim(),
        aliquota_iss: numeroPlanilha(valorLinha(linha, 'Alíquota ISS')),
        atualizado_em: String(valorLinha(linha, 'Atualizado em (não alterar)') || '').trim(),
      }));
      const precosColunas = linhasProdutos.flatMap((linha) => {
        const sku = String(valorLinha(linha, 'Código') || '').trim().toUpperCase();
        if (!sku) return [];
        return colunasPrecosMetadados.flatMap((coluna) => {
          if (!Object.prototype.hasOwnProperty.call(linha, coluna.cabecalho)) return [];
          const preco = numeroPlanilhaOpcional(valorLinha(linha, coluna.cabecalho), `${coluna.cabecalho}, produto ${sku}`);
          return preco === null ? [] : [{ sku, tabela_codigo: coluna.codigo, preco }];
        });
      });
      const abaPrecosLegados = livro.Sheets['Tabelas de preços'];
      const linhasPrecosLegados = abaPrecosLegados
        ? XLSX.utils.sheet_to_json<Record<string, unknown>>(abaPrecosLegados, { defval: '' })
        : [];
      const precosLegados = linhasPrecosLegados.filter((linha) => String(valorLinha(linha, 'Código do produto')).trim()).map((linha) => ({
        sku: String(valorLinha(linha, 'Código do produto') || '').trim().toUpperCase(),
        tabela_codigo: String(valorLinha(linha, 'Código da tabela') || '').trim().toUpperCase(),
        preco: numeroPlanilha(valorLinha(linha, 'Preço')),
      }));
      const precosImportados = colunasPrecosMetadados.length ? precosColunas : precosLegados;
      if (!produtosImportados.length) throw new Error('A planilha não contém produtos para validar.');
      const exportadoEm = String(linhasMetadados.find((linha) => linha[0] === 'exportado_em')?.[1] || '').trim() || null;
      const resumo = await importarCadastroProdutosPrecos(companyId, catalogoId, arquivo.name, exportadoEm, produtosImportados, precosImportados, false);
      setImportacao({ arquivoNome: arquivo.name, exportadoEm, produtos: produtosImportados, precos: precosImportados, resumo });
    } catch (falha) { onErro(falha instanceof Error ? falha.message : 'Não foi possível ler a planilha.'); }
    finally { setProcessando(false); if (inputArquivo.current) inputArquivo.current.value = ''; }
  };

  const confirmarImportacao = async () => {
    if (!importacao) return;
    setProcessando(true); onErro('');
    try {
      await importarCadastroProdutosPrecos(companyId, catalogoId, importacao.arquivoNome, importacao.exportadoEm, importacao.produtos, importacao.precos, true);
      setImportacao(null);
      await onRecarregar();
    } catch (falha) { onErro(falha instanceof Error ? falha.message : 'Não foi possível aplicar a planilha.'); }
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
    <header className={styles.pageHeader}><div><span>Custos e precificação</span><h1>Tabelas de preços</h1><p>Organize políticas comerciais, atualize o cadastro por Excel e mantenha o preço negociado de cada cliente.</p></div><div className={styles.headerActions}>
      <input ref={inputArquivo} type="file" accept=".xlsx,.xls" hidden onChange={(evento) => { const arquivo = evento.target.files?.[0]; if (arquivo) void lerArquivo(arquivo); }} />
      <button type="button" aria-label="Importar Excel" className={`${styles.secondaryButton} ${styles.spreadsheetAction}`} disabled={!podeEditar || processando} onClick={() => inputArquivo.current?.click()}><span className={styles.spreadsheetActionIcon}><Icon name="upload" size={17} /></span><span className={styles.spreadsheetActionText}><strong>Importar</strong><small>Excel</small></span></button>
      <button type="button" aria-label="Exportar Excel" className={`${styles.secondaryButton} ${styles.spreadsheetAction}`} disabled={processando} onClick={() => void exportar()}><span className={styles.spreadsheetActionIcon}><Icon name="download" size={17} /></span><span className={styles.spreadsheetActionText}><strong>Exportar</strong><small>Excel</small></span></button>
      <button type="button" className={`${styles.secondaryButton} ${styles.repriceAction}`} disabled={!podeEditar || processando || !tabelasDisponiveisReajuste.length} onClick={abrirReajuste}><Icon name="trendUp" size={17} />Reajuste</button>
      <button type="button" className={styles.primaryButton} disabled={!podeEditar || processando} onClick={() => setEditandoTabela({ nome: '', ativo: true })}>Nova tabela</button>
    </div></header>

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
        {!produtosFiltrados.length && <tr><td colSpan={4} className={styles.empty}>Nenhum produto localizado.</td></tr>}
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

    <Modal open={Boolean(importacao)} onClose={() => !processando && setImportacao(null)} title="Revisar importação" description={importacao?.arquivoNome || ''}>
      {importacao && <div className={styles.importPreview}><div><strong>{importacao.resumo.produtos_criados}</strong><span>novos produtos</span></div><div><strong>{importacao.resumo.produtos_atualizados}</strong><span>produtos atualizados</span></div><div><strong>{importacao.resumo.precos_atualizados}</strong><span>preços processados</span></div><p>Nenhuma alteração foi aplicada ainda. Confirme somente se os totais estiverem de acordo com a planilha.</p><div className={styles.formActions}><button type="button" className={styles.secondaryButton} disabled={processando} onClick={() => setImportacao(null)}>Cancelar</button><button type="button" className={styles.primaryButton} disabled={processando} onClick={() => void confirmarImportacao()}>{processando ? 'Aplicando…' : 'Confirmar importação'}</button></div></div>}
    </Modal>
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
