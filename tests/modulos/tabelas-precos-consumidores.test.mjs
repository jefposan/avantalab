import test from 'node:test';import assert from 'node:assert/strict';
import {priceFromTable,repriceNoteLines} from '../../app/vendas/lib/fiscal-note-editor.mjs';
import {createPostgresCommercialCatalogRepository} from '../../app/vendas/lib/server/commercial-catalog.mjs';
import {createPostgresCommercialCatalogResolver} from '../../app/vendas/lib/server/commercial-runtime-resolvers.mjs';
import {createFiscalEditorSettingsRepository} from '../../app/vendas/lib/server/fiscal-editor-settings.mjs';
const company='10000000-0000-4000-8000-000000000001',table='20000000-0000-4000-8000-000000000001',pid='30000000-0000-4000-8000-000000000001';
const product={id:pid,sku:'T016',nome:'Escova',preco_venda:109,ativo:true,disponivel_catalogo:true,tipo_item:'produto'};
function pool(price=80){return {async query(sql,params){
 if(sql.includes('select t.id,p.id as produto_id'))return {rows:[{id:table,produto_id:pid,sku:'T016',preco:price}]};
 if(sql.includes('select p.id as produto_id'))return {rows:[{produto_id:pid,sku:'T016',preco_venda:109}]};
 if(sql.includes('number_sequences'))return {rows:[]};
 if(sql.includes('vendas_fiscal_mensagens'))return {rows:[]};
 if(sql.includes('select c.id,c.tabela_preco_id'))return {rows:[]};
 if(sql.includes('from public.custos_tabelas_preco'))return {rows:params?.length>1&&params[1]!==table?[]:[{id:table,nome:'NEILTON',padrao:false}]};
 if(sql.includes('from public.custos_tabela_preco_itens'))return {rows:[{produto_id:pid,preco:price}]};
 if(sql.includes('from public.vendas_mobile_catalogo_produtos'))return {rows:[product]};
 if(sql.includes('from public.vendas_mobile_catalogos'))return {rows:[{id:'catalog'}]};
 throw Error('Consulta inesperada: '+sql);
}};}
test('catálogo e resolvedor da gravação aplicam NEILTON 80, zero e herança por ausência real',async()=>{
 for(const price of [80,0]){
  const db=pool(price),catalog=await createPostgresCommercialCatalogRepository({pool:db}).list({companyId:company,priceTableId:table});
  assert.equal(catalog.itens[0].preco,price);
  const result=await createPostgresCommercialCatalogResolver({pool:db})({companyId:company,priceTableId:table,itemIds:[pid]});assert.equal(result.items[0].salePrice,price);
 }
 const db=pool();const original=db.query;db.query=async(sql,p)=>sql.includes('from public.custos_tabela_preco_itens')?{rows:[]}:original(sql,p);
 assert.equal((await createPostgresCommercialCatalogRepository({pool:db}).list({companyId:company,priceTableId:table})).itens[0].preco,109);
});
test('lista indisponível não é substituída silenciosamente pela padrão',async()=>{
 const db=pool();await assert.rejects(createPostgresCommercialCatalogRepository({pool:db}).list({companyId:company,priceTableId:'outra'}),/não está disponível/);
 await assert.rejects(createPostgresCommercialCatalogResolver({pool:db})({companyId:company,priceTableId:'outra',itemIds:[pid]}),/não está disponível/);
});
test('opções fiscais e recálculo priorizam identidade do produto e não confundem SKU repetido',async()=>{
 const editor=await createFiscalEditorSettingsRepository({pool:pool(),issuerResolver:async()=>({})}).load(company);
 assert.equal(priceFromTable({catalogItemId:pid,sku:'T016',price:109},editor.priceTables[0]),80);
 const lines=[{catalogItemId:pid,sku:'T016',quantity:3,unitPrice:109,unitDiscount:2}];
 const t={prices:{T016:999},pricesByProductId:{[pid]:80,other:0}};
 const catalog=[{catalogItemId:'other',sku:'T016',price:109},{catalogItemId:pid,sku:'T016',price:109}];
 assert.equal(priceFromTable(catalog[0],t),0);assert.equal(priceFromTable(catalog[1],t),80);
 const changed=repriceNoteLines(lines,catalog,t);assert.deepEqual(changed,[{...lines[0],unitPrice:80}]);assert.equal(lines[0].unitPrice,109);
});

test('a troca de tabela só sinaliza linhas com preço diferente e mantém quantidades e descontos', () => {
  const catalog = [
    { catalogItemId: 'a', sku: 'A', price: 10 },
    { catalogItemId: 'b', sku: 'B', price: 20 },
  ];
  const lines = [
    { catalogItemId: 'a', sku: 'A', unitPrice: 10, quantity: 3, unitDiscount: 2 },
    { catalogItemId: 'b', sku: 'B', unitPrice: 20, quantity: 1, unitDiscount: 0 },
    { catalogItemId: 'removed', sku: 'B', unitPrice: 15, quantity: 2, unitDiscount: 1 },
  ];
  const same = repriceNoteLines(lines, catalog, { prices: { A: 10, B: 20 } });
  assert.ok(same.every((line, index) => line === lines[index]));
  const changed = repriceNoteLines(lines, catalog, { prices: { A: 12, B: 19 } });
  assert.deepEqual(changed, [{ ...lines[0], unitPrice: 12 }, { ...lines[1], unitPrice: 19 }, lines[2]]);
  assert.equal(changed[2], lines[2]);
  assert.equal(lines[0].unitPrice, 10);
});
