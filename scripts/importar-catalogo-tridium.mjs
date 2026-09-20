import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const csvPath = process.argv[2];
const pricesPath = process.argv[3];
const apply = process.argv.includes('--apply');
const correctDecimals = process.argv.includes('--corrigir-decimais');
if (!csvPath || !pricesPath) throw new Error('Uso: node scripts/importar-catalogo-tridium.mjs <cadastro.csv> <precos.xls> [--apply]');

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#') && line.includes('='))
  .map((line) => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1)]; }));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Credenciais do Supabase não encontradas.');
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const get = async (resource) => {
  const response = await fetch(`${url}/rest/v1/${resource}`, { headers });
  if (!response.ok) throw new Error(`Consulta falhou (${response.status}).`);
  return response.json();
};
const rpc = async (name, body) => {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Importação falhou (${response.status}): ${await response.text()}`);
  return response.json();
};
const write = async (resource, method, body, prefer = 'return=minimal') => {
  const response = await fetch(`${url}/rest/v1/${resource}`, { method, headers: { ...headers, Prefer: prefer }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Gravação falhou (${response.status}): ${await response.text()}`);
  return response;
};
const text = (value) => String(value ?? '').trim();
const number = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = text(value).replace(/R\$/gi, '').replace(/\s/g, '');
  if (!raw) return 0;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`Número inválido: ${value}`);
  return parsed;
};
const optionalNumber = (value) => text(value) ? number(value) : null;
const boolActive = (value) => !['inativo', 'não', 'nao', 'false', '0'].includes(text(value).toLocaleLowerCase('pt-BR'));

// Preserva vírgula decimal do CSV brasileiro; a conversão é feita por number().
const cadastroBook = XLSX.readFile(csvPath, { raw: true });
const cadastroRows = XLSX.utils.sheet_to_json(cadastroBook.Sheets[cadastroBook.SheetNames[0]], { defval: '' });
const ignoredNames = new Set(['ESCOVA TRILISS - BRANCA', 'SAQUE']);
const seenSkus = new Set();
const products = [];
for (const row of cadastroRows) {
  const sku = text(row['Código do Produto (60)']).toUpperCase();
  const name = text(row['Nome do Produto (120)']);
  if (!sku || ignoredNames.has(name.toUpperCase()) || seenSkus.has(sku)) continue;
  seenSkus.add(sku);
  products.push({
    sku,
    tipo_item: text(row['Tipo (Produto/Servico)']).toLocaleLowerCase('pt-BR').startsWith('serv') ? 'servico' : 'produto',
    nome: name,
    marca: text(row['Marca (25)']),
    categoria: text(row['ID Categoria']),
    descricao: text(row.Observações),
    preco_custo: number(row['Valor Custo']),
    preco_venda: number(row['Valor Venda (Tabela Padrão)']),
    unidade: text(row['Unidade (06)']) || 'un',
    codigo_barras: text(row['Código de Barras (GTIN-8,12,13,14)']),
    ativo: boolActive(row['Situação (Ativo/Inativo)']),
    disponivel_catalogo: false,
    ncm: text(row['NCM (8)']),
    cest: text(row['Código CEST']),
    origem_mercadoria: text(row['Origem (0 a 8)']),
    unidade_tributavel: text(row['Unidade tributável']),
    peso_bruto: optionalNumber(row.Peso),
    peso_liquido: optionalNumber(row['Peso Liq.']),
    cst: text(row['Tipo Class. (Fiscal)']),
    csosn: '',
    aliquota_icms: optionalNumber(row.ICMS),
    aliquota_ipi: optionalNumber(row.IPI),
    aliquota_pis: optionalNumber(row.PIS),
    aliquota_cofins: optionalNumber(row.COFINS),
    observacoes_fiscais: text(row.Observações),
    fornecedor_nome: text(row.Fornecedor),
    fornecedor_codigo_externo: text(row['ID Fornecedor']) === '0' ? '' : text(row['ID Fornecedor']),
    estoque_minimo: number(row['Estoque Mínimo']),
    estoque_maximo: optionalNumber(row['Estoque Máximo']),
    estoque_atual: number(row['Estoque Atual']),
  });
}

const priceBook = XLSX.readFile(pricesPath, { raw: true });
const priceRows = XLSX.utils.sheet_to_json(priceBook.Sheets[priceBook.SheetNames[0]], { defval: '' });
const tableColumns = [
  ['10% DESCONTO - TRIDIUM', 'DESCONTO_10', '10% DESCONTO'], ['ALEX', 'ALEX', 'ALEX'],
  ['EXCLUSIVE', 'EXCLUSIVE', 'EXCLUSIVE'], ['LOJA ONLINE - CLIENTE FINAL', 'LOJA_ONLINE', 'LOJA ONLINE'],
  ['MARCOS', 'MARCOS', 'MARCOS'], ['NEILTON', 'NEILTON', 'NEILTON'],
  ['NOTA FISCAL', 'NOTA_FISCAL', 'NOTA FISCAL'], ['NOTAL FISCAL 25%', 'NOTA_FISCAL_25', 'NOTA FISCAL 25%'],
  ['SALÃO', 'SALAO', 'SALÃO'], ['SÓCIO', 'SOCIO', 'SÓCIO'],
];
const priceBySku = new Map();
for (const row of priceRows) {
  const sku = text(row.Código).toUpperCase();
  if (!seenSkus.has(sku) || priceBySku.has(sku)) continue;
  priceBySku.set(sku, row);
}
if (priceBySku.size !== products.length) throw new Error(`O cruzamento de preços encontrou ${priceBySku.size} de ${products.length} produtos.`);
const tables = [{ codigo: 'PADRAO', nome: 'Tabela padrão', descricao: 'Preço de venda principal do cadastro.' }, ...tableColumns.map(([, codigo, nome]) => ({ codigo, nome, descricao: 'Importada do cadastro Tridium.' }))];
const prices = products.flatMap((product) => {
  const row = priceBySku.get(product.sku);
  return tableColumns.map(([column, tableCode]) => ({ sku: product.sku, tabela_codigo: tableCode, preco: number(row[column]) }));
});

const companies = await get('empresas?select=id,nome&nome=eq.TRIDIUM%20COSMETICOS');
if (companies.length !== 1) throw new Error('Empresa TRIDIUM COSMETICOS não encontrada de forma única.');
const catalogs = await get(`vendas_mobile_catalogos?select=id&empresa_id=eq.${companies[0].id}&ativo=eq.true`);
if (catalogs.length !== 1) throw new Error('Catálogo ativo da Tridium não encontrado de forma única.');
if (correctDecimals) {
  const companyId = companies[0].id;
  const catalogId = catalogs[0].id;
  const existingProducts = await get(`vendas_mobile_catalogo_produtos?select=id,sku&catalogo_id=eq.${catalogId}`);
  const productIdBySku = new Map(existingProducts.map((item) => [item.sku, item.id]));
  if (existingProducts.length !== products.length || products.some((product) => !productIdBySku.has(product.sku))) throw new Error('O catálogo atual não corresponde à carga que precisa de correção.');
  const productPayload = ({ fornecedor_nome, fornecedor_codigo_externo, estoque_minimo, estoque_atual, ...product }) => product;
  await Promise.all(products.map((product) => write(`vendas_mobile_catalogo_produtos?id=eq.${productIdBySku.get(product.sku)}`, 'PATCH', productPayload(product))));
  const currentTables = await get(`custos_tabelas_preco?select=id,codigo&empresa_id=eq.${companyId}`);
  const tableIdByCode = new Map(currentTables.map((table) => [table.codigo, table.id]));
  const customPrices = prices.map((price) => ({ tabela_preco_id: tableIdByCode.get(price.tabela_codigo), produto_id: productIdBySku.get(price.sku), preco: price.preco }));
  if (customPrices.some((price) => !price.tabela_preco_id || !price.produto_id)) throw new Error('Uma tabela de preço da correção não foi localizada.');
  await write('custos_tabela_preco_itens?on_conflict=tabela_preco_id,produto_id', 'POST', customPrices, 'resolution=merge-duplicates,return=minimal');
  const balances = await get(`vendas_estoque_saldos?select=id,empresa_id,local_id,produto_id,saldo_fisico,saldo_reservado,estoque_minimo,permite_negativo&produto_id=in.(${existingProducts.map((product) => product.id).join(',')})`);
  const productById = new Map(products.map((product) => [productIdBySku.get(product.sku), product]));
  const corrections = balances.flatMap((balance) => {
    const product = productById.get(balance.produto_id);
    const desired = product.estoque_atual;
    const previous = Number(balance.saldo_fisico);
    return Math.abs(desired - previous) < 0.0001 ? [] : [{
      empresa_id: companyId, saldo_id: balance.id, tipo: 'ajuste', quantidade: desired - previous,
      saldo_fisico_anterior: previous, saldo_fisico_final: desired,
      saldo_reservado_anterior: Number(balance.saldo_reservado), saldo_reservado_final: Number(balance.saldo_reservado),
      parceiro_retrato: { origem: 'Correção da importação Tridium' }, observacoes: 'Correção de escala decimal da importação Tridium.',
      chave_idempotencia: `correcao-importacao-tridium-${product.sku}`, data_movimentacao: new Date().toISOString().slice(0, 10),
    }];
  });
  await write('vendas_estoque_saldos?on_conflict=empresa_id,local_id,produto_id', 'POST', balances.map((balance) => {
    const product = productById.get(balance.produto_id);
    return { empresa_id: companyId, local_id: balance.local_id, produto_id: balance.produto_id, saldo_fisico: product.estoque_atual, saldo_reservado: balance.saldo_reservado, estoque_minimo: product.estoque_minimo, permite_negativo: product.estoque_atual < 0 };
  }), 'resolution=merge-duplicates,return=minimal');
  if (corrections.length) await write('vendas_estoque_movimentos', 'POST', corrections, 'return=minimal');
  console.log(JSON.stringify({ products: products.length, prices: customPrices.length, inventoryCorrections: corrections.length, corrected: true }, null, 2));
  process.exit(0);
}
const result = await rpc('custos_substituir_catalogo_completo_rpc', {
  p_empresa_id: companies[0].id, p_catalogo_id: catalogs[0].id,
  p_origem: `${path.basename(csvPath)} + ${path.basename(pricesPath)}`,
  p_produtos: products, p_tabelas: tables, p_precos: prices, p_aplicar: apply,
});
console.log(JSON.stringify({ products: products.length, prices: prices.length, result }, null, 2));
