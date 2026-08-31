'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/app/projetos/components/Modal';
import { formatarMoeda, formatarMoedaDigitada, moedaDigitadaParaNumero } from '@/app/lib/formatters';
import {
  importarCadastroProdutosPrecos, salvarPrecoTabela, salvarTabelaPreco,
} from './repository';
import {
  precoEfetivoTabela, type PrecoTabelaItem, type ProdutoCustos,
  type ResumoImportacaoCadastro, type TabelaPreco,
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
const cabecalhosPrecos = ['Código do produto', 'Código da tabela', 'Tabela', 'Preço'] as const;

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
const valorLinha = (linha: Record<string, unknown>, cabecalho: string) => linha[cabecalho];

export default function TabelasPrecosView({
  companyId, catalogoId, produtos, tabelas, precos, podeEditar, onRecarregar, onMensagem, onErro,
}: {
  companyId: string;
  catalogoId: string;
  produtos: ProdutoCustos[];
  tabelas: TabelaPreco[];
  precos: PrecoTabelaItem[];
  podeEditar: boolean;
  onRecarregar: () => Promise<void>;
  onMensagem: (texto: string) => void;
  onErro: (texto: string) => void;
}) {
  const [tabelaAtivaId, setTabelaAtivaId] = useState(tabelas.find((item) => item.padrao)?.id || tabelas[0]?.id || '');
  const [busca, setBusca] = useState('');
  const [editandoTabela, setEditandoTabela] = useState<Partial<TabelaPreco> | null>(null);
  const [processando, setProcessando] = useState(false);
  const [importacao, setImportacao] = useState<ImportacaoPendente | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const tabelaAtiva = tabelas.find((item) => item.id === tabelaAtivaId) || tabelas[0];
  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return produtos.filter((produto) => !termo || [produto.sku, produto.nome, produto.marca, produto.categoria]
      .some((valor) => String(valor || '').toLocaleLowerCase('pt-BR').includes(termo)));
  }, [busca, produtos]);

  const exportar = async () => {
    setProcessando(true); onErro('');
    try {
      const XLSX = await import('xlsx');
      const agora = new Date().toISOString();
      const livro = XLSX.utils.book_new();
      const instrucoes = XLSX.utils.aoa_to_sheet([
        ['Cadastro de produtos e tabelas de preços — AvantaLab'],
        ['Como usar'],
        ['1. Edite somente as planilhas Produtos e Tabelas de preços.'],
        ['2. Não altere IDs internos nem datas de atualização. Eles evitam duplicidades e sobrescritas.'],
        ['3. Para cadastrar um produto, crie uma linha com ID em branco e um Código ainda não utilizado.'],
        ['4. Tipo aceita Produto ou Serviço. Ativo e Disponível no catálogo aceitam Sim ou Não.'],
        ['5. Para adicionar preço a um produto novo, repita seu Código na planilha Tabelas de preços.'],
        ['6. Não renomeie as planilhas nem os cabeçalhos. Importe o arquivo e revise a prévia antes de confirmar.'],
      ]);
      instrucoes['!cols'] = [{ wch: 105 }];
      XLSX.utils.book_append_sheet(livro, instrucoes, 'Instruções');

      const linhasProdutos = produtos.map((produto) => [
        produto.id, produto.sku, produto.tipo_item === 'servico' ? 'Serviço' : 'Produto', produto.nome,
        produto.marca, produto.categoria, produto.descricao, produto.preco_custo, produto.preco_venda,
        produto.unidade, produto.codigo_barras, simNao(produto.ativo), simNao(produto.disponivel_catalogo),
        produto.ncm, produto.cest, produto.origem_mercadoria, produto.unidade_tributavel, produto.cfop_padrao,
        produto.cst, produto.csosn, produto.cst_pis, produto.cst_cofins, produto.cst_ibs_cbs,
        produto.classificacao_ibs_cbs, produto.codigo_tributacao_nacional, produto.codigo_tributacao_municipal,
        produto.nbs, produto.item_lc116, produto.municipio_prestacao, produto.aliquota_iss, produto.atualizado_em,
      ]);
      const planilhaProdutos = XLSX.utils.aoa_to_sheet([[...cabecalhosProdutos], ...linhasProdutos]);
      planilhaProdutos['!autofilter'] = { ref: `A1:AE${Math.max(2, linhasProdutos.length + 1)}` };
      planilhaProdutos['!freeze'] = { xSplit: 2, ySplit: 1 };
      planilhaProdutos['!cols'] = cabecalhosProdutos.map((cabecalho, indice) => ({
        wch: indice === 0 || indice === 30 ? 16 : Math.min(34, Math.max(12, cabecalho.length + 2)),
        hidden: indice === 0 || indice === 30,
      }));
      for (let linha = 2; linha <= linhasProdutos.length + 1; linha += 1) {
        for (const coluna of ['H', 'I']) if (planilhaProdutos[`${coluna}${linha}`]) planilhaProdutos[`${coluna}${linha}`].z = 'R$ #,##0.00';
        if (planilhaProdutos[`AD${linha}`]) planilhaProdutos[`AD${linha}`].z = '0.00';
      }
      XLSX.utils.book_append_sheet(livro, planilhaProdutos, 'Produtos');

      const linhasPrecos = tabelas.flatMap((tabela) => produtos.map((produto) => [
        produto.sku, tabela.codigo, tabela.nome, precoEfetivoTabela(tabela, produto, precos),
      ]));
      const planilhaPrecos = XLSX.utils.aoa_to_sheet([[...cabecalhosPrecos], ...linhasPrecos]);
      planilhaPrecos['!autofilter'] = { ref: `A1:D${Math.max(2, linhasPrecos.length + 1)}` };
      planilhaPrecos['!freeze'] = { ySplit: 1 };
      planilhaPrecos['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 30 }, { wch: 18 }];
      for (let linha = 2; linha <= linhasPrecos.length + 1; linha += 1) if (planilhaPrecos[`D${linha}`]) planilhaPrecos[`D${linha}`].z = 'R$ #,##0.00';
      XLSX.utils.book_append_sheet(livro, planilhaPrecos, 'Tabelas de preços');

      const metadados = XLSX.utils.aoa_to_sheet([['chave', 'valor'], ['formato', 'AVANTALAB-CUSTOS-1'], ['exportado_em', agora]]);
      XLSX.utils.book_append_sheet(livro, metadados, 'Metadados');
      if (livro.Workbook?.Sheets) livro.Workbook.Sheets.find((item) => item.name === 'Metadados')!.Hidden = 2;
      XLSX.writeFile(livro, `avantalab-produtos-precos-${agora.slice(0, 10)}.xlsx`, { compression: true });
      onMensagem('Cadastro e tabelas de preços exportados para Excel.');
    } catch (falha) { onErro(falha instanceof Error ? falha.message : 'Não foi possível gerar a planilha.'); }
    finally { setProcessando(false); }
  };

  const lerArquivo = async (arquivo: File) => {
    setProcessando(true); onErro('');
    try {
      const XLSX = await import('xlsx');
      const livro = XLSX.read(await arquivo.arrayBuffer(), { type: 'array', cellDates: true });
      const abaProdutos = livro.Sheets['Produtos'];
      const abaPrecos = livro.Sheets['Tabelas de preços'];
      if (!abaProdutos || !abaPrecos) throw new Error('Use uma planilha exportada pelo AvantaLab, com as abas Produtos e Tabelas de preços.');
      const linhasProdutos = XLSX.utils.sheet_to_json<Record<string, unknown>>(abaProdutos, { defval: '' });
      const linhasPrecos = XLSX.utils.sheet_to_json<Record<string, unknown>>(abaPrecos, { defval: '' });
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
      const precosImportados = linhasPrecos.filter((linha) => String(valorLinha(linha, 'Código do produto')).trim()).map((linha) => ({
        sku: String(valorLinha(linha, 'Código do produto') || '').trim().toUpperCase(),
        tabela_codigo: String(valorLinha(linha, 'Código da tabela') || '').trim().toUpperCase(),
        preco: numeroPlanilha(valorLinha(linha, 'Preço')),
      }));
      if (!produtosImportados.length) throw new Error('A planilha não contém produtos para validar.');
      const abaMetadados = livro.Sheets['Metadados'];
      const linhasMetadados = abaMetadados ? XLSX.utils.sheet_to_json<Array<unknown>>(abaMetadados, { header: 1, defval: '' }) : [];
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
      const resumo = await importarCadastroProdutosPrecos(companyId, catalogoId, importacao.arquivoNome, importacao.exportadoEm, importacao.produtos, importacao.precos, true);
      setImportacao(null);
      await onRecarregar();
      onMensagem(`${resumo.produtos_criados} produtos criados, ${resumo.produtos_atualizados} atualizados e ${resumo.precos_atualizados} preços processados.`);
    } catch (falha) { onErro(falha instanceof Error ? falha.message : 'Não foi possível aplicar a planilha.'); }
    finally { setProcessando(false); }
  };

  const gravarTabela = async () => {
    if (!editandoTabela) return;
    setProcessando(true); onErro('');
    try {
      const salva = await salvarTabelaPreco(companyId, editandoTabela);
      setTabelaAtivaId(salva.id); setEditandoTabela(null);
      await onRecarregar(); onMensagem('Tabela de preços salva.');
    } catch (falha) { onErro(falha instanceof Error ? falha.message : 'Não foi possível salvar a tabela.'); }
    finally { setProcessando(false); }
  };

  return <>
    <header className={styles.pageHeader}><div><span>Custos e precificação</span><h1>Tabelas de preços</h1><p>Organize políticas comerciais, atualize o cadastro por Excel e mantenha o preço negociado de cada cliente.</p></div><div className={styles.headerActions}>
      <input ref={inputArquivo} type="file" accept=".xlsx,.xls" hidden onChange={(evento) => { const arquivo = evento.target.files?.[0]; if (arquivo) void lerArquivo(arquivo); }} />
      <button type="button" className={styles.secondaryButton} disabled={!podeEditar || processando} onClick={() => inputArquivo.current?.click()}>Importar Excel</button>
      <button type="button" className={styles.secondaryButton} disabled={processando} onClick={() => void exportar()}>Exportar Excel</button>
      <button type="button" className={styles.primaryButton} disabled={!podeEditar || processando} onClick={() => setEditandoTabela({ codigo: '', nome: '', descricao: '', ativo: true })}>Nova tabela</button>
    </div></header>

    <section className={styles.panel}>
      <div className={styles.panelTitle}><div><h2>Políticas comerciais</h2><p>A tabela padrão é usada quando a cliente não possui vínculo específico.</p></div></div>
      <div className={styles.priceTableCards} role="list">
        {tabelas.map((tabela) => <button type="button" role="listitem" key={tabela.id} className={`${styles.priceTableCard} ${tabela.id === tabelaAtiva?.id ? styles.priceTableCardActive : ''}`} onClick={() => setTabelaAtivaId(tabela.id)}>
          <span>{tabela.padrao ? 'Padrão' : tabela.ativo ? 'Ativa' : 'Inativa'}</span><strong>{tabela.nome}</strong><small>{tabela.codigo}</small>
        </button>)}
      </div>
    </section>

    {tabelaAtiva ? <section className={styles.panel}>
      <div className={styles.panelTitle}><div><h2>{tabelaAtiva.nome}</h2><p>{tabelaAtiva.padrao ? 'Preço principal do cadastro mestre.' : tabelaAtiva.descricao || 'Preços específicos desta negociação.'}</p></div><div className={styles.priceTableTools}>
        <label className={styles.search}>Localizar produto<input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Código, nome, marca…" /></label>
        {!tabelaAtiva.padrao && <button type="button" className={styles.secondaryButton} disabled={!podeEditar} onClick={() => setEditandoTabela(tabelaAtiva)}>Ajustar tabela</button>}
      </div></div>
      <div className={styles.tableWrap}><table><thead><tr><th scope="col">Código</th><th scope="col">Produto ou serviço</th><th scope="col">Preço padrão</th><th scope="col">Preço nesta tabela</th></tr></thead><tbody>
        {produtosFiltrados.map((produto) => <tr key={produto.id}><td><b>{produto.sku}</b></td><td>{produto.nome}<small>{produto.tipo_item === 'servico' ? 'Serviço' : 'Produto'} · {produto.unidade}</small></td><td className={styles.numeric}>{formatarMoeda(produto.preco_venda)}</td><td className={styles.priceEditorCell}><PriceEditor value={precoEfetivoTabela(tabelaAtiva, produto, precos)} disabled={!podeEditar || !tabelaAtiva.ativo || processando} onSave={async (valor) => { try { await salvarPrecoTabela(companyId, tabelaAtiva.id, produto.id, valor); await onRecarregar(); onMensagem(`Preço de ${produto.sku} atualizado.`); } catch (falha) { onErro(falha instanceof Error ? falha.message : 'Não foi possível salvar o preço.'); throw falha; } }} /></td></tr>)}
        {!produtosFiltrados.length && <tr><td colSpan={4} className={styles.empty}>Nenhum produto localizado.</td></tr>}
      </tbody></table></div>
    </section> : <section className={styles.panel}><p className={styles.empty}>A tabela padrão ainda não foi preparada.</p></section>}

    <section className={styles.importSafety}><strong>Importação protegida</strong><p>O arquivo é validado antes de qualquer alteração. IDs impedem duplicidades e a data de atualização bloqueia a substituição de um produto alterado após a exportação.</p></section>

    <Modal open={Boolean(editandoTabela)} onClose={() => !processando && setEditandoTabela(null)} title={editandoTabela?.id ? 'Ajustar tabela de preços' : 'Nova tabela de preços'} description="Use um código curto e estável, como ATACADO, REVENDA ou CLIENTE-A.">
      {editandoTabela && <div className={styles.priceTableForm}><label>Código<input value={editandoTabela.codigo || ''} maxLength={30} disabled={Boolean(editandoTabela.padrao)} onChange={(evento) => setEditandoTabela({ ...editandoTabela, codigo: evento.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} /></label><label>Nome<input value={editandoTabela.nome || ''} maxLength={80} onChange={(evento) => setEditandoTabela({ ...editandoTabela, nome: evento.target.value })} /></label><label>Descrição<textarea rows={3} value={editandoTabela.descricao || ''} onChange={(evento) => setEditandoTabela({ ...editandoTabela, descricao: evento.target.value })} /></label>{editandoTabela.id && !editandoTabela.padrao && <label className={styles.checkboxLine}><input type="checkbox" checked={editandoTabela.ativo !== false} onChange={(evento) => setEditandoTabela({ ...editandoTabela, ativo: evento.target.checked })} />Tabela ativa</label>}<div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setEditandoTabela(null)} disabled={processando}>Cancelar</button><button type="button" className={styles.primaryButton} onClick={() => void gravarTabela()} disabled={processando || !editandoTabela.codigo?.trim() || !editandoTabela.nome?.trim()}>Salvar tabela</button></div></div>}
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
