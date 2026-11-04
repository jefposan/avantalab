import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PDFDocument, PageSizes, decodePDFRawStream } from 'pdf-lib';
import { lotTotals, parseLotCost } from '../../app/modules/marketplaces/price-lots.ts';

const company='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',lot='00000000-0000-4000-8000-000000000003',history='00000000-0000-4000-8000-000000000004',item='00000000-0000-4000-8000-000000000005';
const priced={quantity:3,market_price_cents:1999,minimum_price_cents:1000,medium_price_cents:1399,ideal_price_cents:1799};
function pdfText(pdf){
  return pdf.getPages().map(page=>{
    const contents=page.node.Contents();let result='';
    for(let index=0;index<contents.size();index++){
      const stream=Buffer.from(decodePDFRawStream(pdf.context.lookup(contents.get(index))).decode()).toString('latin1');
      for(const match of stream.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g))result+=Buffer.from(match[1],'hex').toString('latin1')+'\n';
    }
    return result;
  }).join('\n');
}

test('lote soma centavos e quantidades; cenários permitem diferença bruta negativa',()=>{
  const totals=lotTotals([priced,{...priced,quantity:1}],6000);
  assert.deepEqual(totals,{quantity:4,pending:0,sales:{minimum:4000,medium:5596,ideal:7196},difference:{minimum:-2000,medium:-404,ideal:1196}});
  assert.equal(lotTotals([priced],null).difference,null);
  assert.equal(lotTotals([],0).difference,null);
});
test('produto sem preço conta no lote, não vira zero e impede comparação incompleta',()=>{
  const totals=lotTotals([priced,{...priced,quantity:2,market_price_cents:null,minimum_price_cents:null,medium_price_cents:null,ideal_price_cents:null}],0);
  assert.equal(totals.quantity,5);assert.equal(totals.pending,2);assert.equal(totals.sales.minimum,3000);assert.equal(totals.difference,null);
  assert.throws(()=>lotTotals([{...priced,quantity:1.5}],0),/Quantidade/);
  assert.throws(()=>lotTotals([{...priced,market_price_cents:NaN}],0),/Preço/);
});
test('custo distingue vazio de zero e valida moeda brasileira sem truncar centavos',()=>{
  assert.equal(parseLotCost('1.234,56'),123456);assert.equal(parseLotCost('0'),0);assert.equal(parseLotCost('12,3'),1230);assert.equal(parseLotCost(''),null);
  for(const input of ['-1','1,234','1.23','abc',Infinity,{},'20000001'])assert.throws(()=>parseLotCost(input));
});

test('banco real: leituras idempotentes, isolamento, retrato dos preços, quantidade e fechamento',async()=>{
  const db=new PGlite();
  const mutate=(companyId,action,data)=>db.query('select marketplace_price_lot_mutate($1,$2,$3,$4::jsonb)',[companyId,lot,action,JSON.stringify(data)]);
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table marketplace_price_consultations(id uuid primary key,empresa_id uuid,product_name text,product_description text,image_url text,sample_source text,last_researched_at timestamptz,market_price_cents int,minimum_price_cents int,medium_price_cents int,ideal_price_cents int);
      insert into empresas values('${company}'),('${other}');insert into marketplace_price_consultations values('${history}','${company}','Produto','Descrição',null,'manual_reference',now(),10000,5000,7000,9000);`);
    await db.exec(readFileSync('supabase/migrations/20261016190000_marketplace_price_lots.sql','utf8'));
    await db.query('insert into marketplace_price_lots(id,empresa_id,company_name,name) values($1,$2,$3,$4)',[lot,company,'Empresa teste','Lote recebido']);
    await mutate(company,'capture',{item_id:item,scanned_code:'7891129598607'});
    await mutate(company,'capture',{item_id:item,scanned_code:'7891129598607'});
    assert.equal((await db.query('select count(*)::int as n from marketplace_price_lot_items')).rows[0].n,1,'repetir entrega não duplica');
    const second=crypto.randomUUID();await mutate(company,'capture',{item_id:second,scanned_code:'7891129598607'});
    assert.equal((await db.query('select count(*)::int as n from marketplace_price_lot_items')).rows[0].n,2,'outro bipe do mesmo produto conta');
    await assert.rejects(mutate(other,'capture',{item_id:crypto.randomUUID(),scanned_code:'teste'}),/não encontrado/);
    const otherHistory=crypto.randomUUID();await db.query('insert into marketplace_price_consultations(id,empresa_id) values($1,$2)',[otherHistory,other]);
    await assert.rejects(mutate(company,'resolve',{item_id:item,history_id:otherHistory}),/nesta empresa/);
    await mutate(company,'resolve',{item_id:item,history_id:history});
    await db.exec(`update marketplace_price_consultations set market_price_cents=99999 where id='${history}'`);
    await mutate(company,'resolve',{item_id:item,history_id:history});
    assert.equal((await db.query('select market_price_cents from marketplace_price_lot_items where id=$1',[item])).rows[0].market_price_cents,10000,'histórico atualizado não muda o relatório salvo');
    await mutate(company,'metadata',{name:'Lote editado',supplier:'Fornecedor',received_on:'2026-10-10',notes:'Retomar depois',purchase_cost_cents:45000});
    const saved=(await db.query('select id,name,received_on::text,purchase_cost_cents from marketplace_price_lots where id=$1',[lot])).rows[0];
    assert.deepEqual(saved,{id:lot,name:'Lote editado',received_on:'2026-10-10',purchase_cost_cents:45000});
    assert.equal((await db.query('select count(*)::int as n from marketplace_price_lot_items')).rows[0].n,2,'editar data e custo preserva os produtos');
    await mutate(company,'quantity',{item_id:item,quantity:4});
    await assert.rejects(mutate(company,'quantity',{item_id:item,quantity:0}),/check constraint/);
    await mutate(company,'remove',{item_id:second});
    assert.equal((await db.query('select sum(quantity)::int as n from marketplace_price_lot_items')).rows[0].n,4);
    await mutate(company,'status',{status:'closed'});
    await assert.rejects(mutate(company,'capture',{item_id:crypto.randomUUID(),scanned_code:'teste'}),/concluído/);
    await mutate(company,'status',{status:'open'});
    await mutate(company,'capture',{item_id:crypto.randomUUID(),scanned_code:'outro código'});
    const webRead=crypto.randomUUID(),pwaRead=crypto.randomUUID();
    await Promise.all([mutate(company,'capture',{item_id:webRead,scanned_code:'web-EAN'}),mutate(company,'capture',{item_id:pwaRead,scanned_code:'pwa-EAN'})]);
    await mutate(company,'resolve',{item_id:webRead,history_id:history});
    await mutate(company,'resolve',{item_id:pwaRead,history_id:history});
    const shared=(await db.query('select id,lot_id,market_price_cents from marketplace_price_lot_items where id=any($1::uuid[]) order by id',[[webRead,pwaRead]])).rows;
    assert.equal(shared.length,2,'web e PWA acrescentam ao mesmo lote sem sobrescrever o outro canal');
    assert.ok(shared.every(row=>row.lot_id===lot&&row.market_price_cents===99999),'os dois canais resolvem a referência salva atual na mesma empresa');
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from marketplace_price_lots'),/permission denied/);
    await assert.rejects(mutate(company,'status',{status:'closed'}),/permission denied/);
    await db.exec('reset role');
  }finally{await db.close();}
});

test('PDF real pagina todas as linhas, tolera foto indisponível e caracteres fora da fonte',async()=>{
  const hooks=registerHooks({resolve(specifier,context,next){
    if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:')){const path=resolve(dirname(new URL(context.parentURL).pathname),specifier);if(existsSync(`${path}.ts`))return next(pathToFileURL(`${path}.ts`).href,context);}
    return next(specifier,context);
  }});
  try{
    const {createPriceLotPdf}=await import('../../app/modules/marketplaces/price-lot-pdf.ts');
    const sample={lot:{name:'Lote de teste 🧴',company_name:'Empresa demonstrativa',received_on:'2026-10-16',purchase_cost_cents:10000,status:'open',supplier:'Fornecedor teste',notes:'Informações extensas. '.repeat(95)},items:Array.from({length:36},(_,i)=>({...priced,id:String(i),product_name:`Produto ${i+1} com descrição longa`,product_description:'Descrição com acentuação',scanned_code:'7891129598607',image_url:'https://image.invalid/test.png',researched_at:'2026-10-16T10:00:00Z',reference_source:'manual_reference'}))};
    const generatedAt=new Date('2026-10-16T12:00:00Z');
    const bytes=await createPriceLotPdf(sample,async()=>null,{generatedAt});
    const pdf=await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(),4,'linhas de 36 pontos comportam onze produtos por página');
    assert.equal(pdf.getPages()[0].getWidth(),PageSizes.A4[1]);
    assert.equal(pdf.getPages()[0].getHeight(),PageSizes.A4[0]);
    assert.equal(pdf.getCreationDate().toISOString(),generatedAt.toISOString());
    const text=pdfText(pdf);
    for(let index=1;index<=36;index++)assert.match(text,new RegExp(`Produto ${index} com`));
    assert.match(text,/Lucro bruto:/);assert.match(text,/Gerado em 16\/10\/26/);assert.match(text,/108 unidades/);
    assert.ok(!text.includes('Estimativa bruta'));assert.ok(!text.includes('Informações extensas'));assert.ok(!text.includes('Fornecedor teste'));
    let photos=0;
    const summary=await PDFDocument.load(await createPriceLotPdf(sample,async()=>{photos++;return null;},{mode:'summary',generatedAt}));
    assert.equal(summary.getPageCount(),1);assert.equal(photos,0,'resumido não busca fotos nem monta linhas de produtos');
    const summaryText=pdfText(summary);assert.ok(!summaryText.includes('Produto 1'));assert.ok(!summaryText.includes('Código lido'));
    assert.ok(text.startsWith(summaryText.split('\n1 / 1')[0]),'detalhado e resumido compartilham os mesmos cabeçalhos, totais e lucros');
    assert.equal((summaryText.match(/Lucro bruto:/g)||[]).length,3);
    assert.match(summaryText,/1\.080,00/,'total mínimo inclui todas as quantidades');
    assert.match(summaryText,/980,00/,'lucro bruto mínimo desconta o valor pago');
    const noCost=await PDFDocument.load(await createPriceLotPdf({...sample,lot:{...sample.lot,purchase_cost_cents:null}},undefined,{mode:'summary',generatedAt}));
    assert.ok(!pdfText(noCost).includes('Valor pago:'));assert.equal((pdfText(noCost).match(/Lucro bruto: -/g)||[]).length,3);
    const pending=await PDFDocument.load(await createPriceLotPdf({...sample,items:[{...sample.items[0],market_price_cents:null,minimum_price_cents:null,medium_price_cents:null,ideal_price_cents:null}]},undefined,{mode:'summary',generatedAt}));
    assert.match(pdfText(pending),/Totais parciais/);assert.equal((pdfText(pending).match(/Lucro bruto: pendente/g)||[]).length,3);
  }finally{hooks.deregister();}
});
