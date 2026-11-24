import {receivableBalance, receivableStatus} from './domain.mjs';

export const REPORT_AREAS = [
  ['overview','Visão geral','chart'],['sales','Vendas','cart'],['clients','Clientes','users'],['sellers','Vendedores','users'],['products','Produtos e margem','box'],['services','Serviços','service'],['stock','Estoque','stock'],['fiscal','Fiscal','fiscal'],['receivables','Recebimentos','money'],
];
export const REPORT_TYPES = [
  {id:'orders',area:'sales',title:'Pedidos',permission:'sales.view'},
  {id:'quotes',area:'sales',title:'Orçamentos',permission:'sales.view'},
  {id:'billing',area:'sales',title:'Faturamento',permission:'sales.view'},
  {id:'products',area:'sales',title:'Produtos mais vendidos',permission:'sales.view'},
  {id:'client-products',area:'sales',title:'Produtos por cliente',permission:'sales.view'},
  {id:'clients-ranking',area:'sales',title:'Clientes que mais compram',permission:'sales.view'},
  {id:'clients',area:'clients',title:'Cadastro de clientes',permission:'clients.view'},
  {id:'sellers',area:'sellers',title:'Vendas por vendedor',permission:'sales.view'},
  {id:'product-margin',area:'products',title:'Produtos e margem',permission:'sales.view',cost:true},
  {id:'services',area:'services',title:'Serviços concluídos',permission:'services.view'},
  {id:'stock',area:'stock',title:'Posição de estoque',permission:'stock.view'},
  {id:'fiscal',area:'fiscal',title:'Documentos fiscais',permission:'fiscal.view'},
  {id:'receivables',area:'receivables',title:'Parcelas comerciais',permission:'receivables.view',financial:true},
];
const text=v=>String(v??'');
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const cents=v=>Math.round(num(v)*100);
const round=v=>Math.round((num(v)+Number.EPSILON)*100)/100;
const day=v=>/^\d{4}-\d{2}-\d{2}/.test(text(v))?text(v).slice(0,10):'';
const selected=(values,value)=>!values?.length||values.includes(text(value));
const paymentLabel=v=>({pix:'PIX',boleto:'Boleto',cartao:'Cartão',prazo:'A prazo',consignado:'Consignado'})[v]||v;
const column=(id,label,format='text')=>({id,label,format});
export const freshReportFilters=()=>({from:'',to:'',clients:[],products:[],sellers:[],statuses:[],methods:[],sort:'date-desc',group:'none',columns:[]});
export function validateReportFilters(f){
  const valid=v=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v);
  if(!valid(f.from)||!valid(f.to))return 'Informe datas válidas para o período.';
  if(f.from&&f.to&&f.from>f.to)return 'A data inicial deve ser anterior ou igual à data final.';
  return '';
}
export function reportDate(record,id){
  if(['billing','products','client-products','clients-ranking','sellers','product-margin'].includes(id))return day(record.invoicedAt)||day(record.events?.filter(e=>/faturad/i.test(e.label||'')).at(-1)?.date)||day(record.order?.orderDate)||day(record.createdAt);
  return day(record.order?.orderDate)||day(record.createdAt);
}
export function reportFiltersSummary(f,labels={}){
 const result=[f.from||f.to?`Período: ${f.from?f.from.split('-').reverse().join('/'):'início'} a ${f.to?f.to.split('-').reverse().join('/'):'hoje'}`:'Todo o histórico'];
 for(const [key,label] of [['clients','Clientes'],['products','Produtos'],['sellers','Vendedores'],['statuses','Situação'],['methods','Pagamento']])if(f[key]?.length)result.push(`${label}: ${f[key].map(v=>labels[v]||v).join(', ')}`);
 return result;
}
export function buildCommercialReport({id,filters=freshReportFilters(),operations=[],clients=[],catalog=[],receivables=[],fiscalDrafts=[],canViewCosts=false,canViewFinancial=false,today=new Date().toISOString().slice(0,10)}){
 const spec=REPORT_TYPES.find(r=>r.id===id);if(!spec)throw Error('Selecione um tipo de relatório.');
 const invalid=validateReportFilters(filters);if(invalid)throw Error(invalid);
 if(spec.cost&&!canViewCosts)throw Error('Seu acesso não permite visualizar custos e margens.');
 if(spec.financial&&!canViewFinancial)throw Error('Seu acesso não permite visualizar valores financeiros.');
 const matchesDate=date=>(!filters.from||date>=filters.from)&&(!filters.to||date<=filters.to)&&(!(filters.from||filters.to)||Boolean(date));
 const clientKey=o=>text(o.customerId||o.persistence?.customerId||o.client);
 const productKey=l=>text(l.catalogItemId||l.sku||l.name);
 const productReports=['products','client-products','product-margin'];
 const billedIds=['billing','products','client-products','clients-ranking','sellers','product-margin'];
 const source=operations.filter(o=>{
  const lines=o.order?.lines||o.quote?.items||o.serviceOrder?.lines||[];
  if(id==='quotes'?o.type!=='orcamento':id==='services'?o.type!=='ordem_servico':!['pedido','venda'].includes(o.type))return false;
  const billed=o.status==='Faturado'||o.type==='venda'&&o.status==='Concluído';
  if(billedIds.includes(id)&&!billed)return false;
  if(id==='services'&&o.status!=='Concluído')return false;
  return matchesDate(reportDate(o,id))&&selected(filters.clients,clientKey(o))&&selected(filters.sellers,o.order?.seller||o.serviceOrder?.technician||'Não informado')&&selected(filters.statuses,o.status||'Rascunho')&&selected(filters.methods,o.order?.paymentMethod||o.serviceOrder?.paymentMethod||'')&&(!filters.products.length||lines.some(l=>filters.products.includes(productKey(l))));
 });
 let columns=[],rows=[],totals={};
 if(['orders','quotes','billing','services'].includes(id)){
  columns=[column('date',id==='billing'?'Data do faturamento':id==='services'?'Data da operação':id==='quotes'?'Data do orçamento':'Data do pedido','date'),column('order','Registro'),column('client','Cliente'),column('seller','Vendedor'),column('status','Situação'),column('method','Pagamento'),column('value','Valor total','currency')];
  rows=source.map(o=>({date:reportDate(o,id),order:o.id,client:o.client,seller:o.order?.seller||o.serviceOrder?.technician||'Não informado',status:o.status||'Rascunho',method:paymentLabel(o.order?.paymentMethod||o.serviceOrder?.paymentMethod||''),value:round(o.total)}));
  totals={records:rows.length,value:round(rows.reduce((n,r)=>n+r.value,0))};
 }else if(productReports.includes(id)){
  const map=new Map();
  for(const o of source){
   const lines=o.order?.lines||[];
   const lineCents=lines.map(l=>Math.max(0,cents(num(l.quantity)*(num(l.unitPrice)-num(l.unitDiscount)))));
   const base=lineCents.reduce((n,v)=>n+v,0),discount=Math.min(base,Math.max(0,cents(o.order?.commercialTotals?.orderDiscount)));
   let remaining=discount;
   lines.forEach((l,i)=>{
    const share=i===lines.length-1?remaining:Math.min(remaining,Math.round(base?discount*lineCents[i]/base:0));remaining-=share;
    if(l.kind==='servico'||!selected(filters.products,productKey(l)))return;
    const key=JSON.stringify([id==='client-products'?clientKey(o):'',productKey(l),l.unit||'un']);
    const item=map.get(key)||{client:o.client,product:l.name,sku:l.sku||'',unit:l.unit||'un',quantity:0,value:0,lastDate:'',cost:0};
    item.quantity+=num(l.quantity);item.value+=lineCents[i]-share;item.lastDate=[item.lastDate,reportDate(o,id)].sort().at(-1);
    if(canViewCosts)item.cost+=cents(num(l.quantity)*num(l.cost));map.set(key,item);
   });
  }
  columns=[...(id==='client-products'?[column('client','Cliente')]:[]),column('product','Produto'),column('sku','Código'),column('unit','Unidade'),column('quantity','Quantidade','number'),column('value','Valor dos produtos','currency'),column('lastDate','Última compra','date'),...(canViewCosts&&id==='product-margin'?[column('cost','Custo','currency'),column('margin','Resultado bruto','currency')]:[])];
  rows=[...map.values()].map(r=>({...r,value:r.value/100,...(canViewCosts&&id==='product-margin'?{cost:r.cost/100,margin:(r.value-r.cost)/100}:{})}));
  if(id!=='product-margin')rows=rows.map(({cost,...r})=>r);
  totals={records:rows.length,value:round(rows.reduce((n,r)=>n+r.value,0))};
 }else if(['clients-ranking','sellers'].includes(id)){
  const map=new Map();for(const o of source){const key=id==='sellers'?text(o.order?.seller||'Não informado'):clientKey(o);const r=map.get(key)||{label:id==='sellers'?key:o.client,orders:0,value:0,lastDate:''};r.orders++;r.value+=cents(o.total);r.lastDate=[r.lastDate,reportDate(o,id)].sort().at(-1);map.set(key,r);}
  columns=[column('label',id==='sellers'?'Vendedor':'Cliente'),column('orders','Pedidos','number'),column('value','Valor faturado','currency'),column('ticket','Ticket médio','currency'),column('lastDate','Último faturamento','date')];
  rows=[...map.values()].map(r=>({...r,value:r.value/100,ticket:round(r.value/100/r.orders)}));totals={records:rows.length,value:round(rows.reduce((n,r)=>n+r.value,0))};
 }else if(id==='clients'){
  columns=[column('label','Cliente'),column('document','CPF/CNPJ'),column('city','Cidade'),column('status','Situação')];
  rows=clients.filter(c=>selected(filters.clients,c.id)&&selected(filters.statuses,c.status)&&matchesDate(day(c.createdAt))).map(c=>({label:c.legalName||c.name||c.tradeName||c.displayName,document:c.document,city:c.cityName||c.city,status:c.status}));totals={records:rows.length};
 }else if(id==='stock'){
  columns=[column('sku','Código'),column('product','Produto'),column('unit','Unidade'),column('physical','Saldo físico','number'),column('reserved','Reservado','number'),column('available','Disponível','number'),...(canViewCosts?[column('cost','Custo unitário','currency')]:[])];
  rows=catalog.filter(c=>c.kind!=='servico'&&c.category!=='Serviço'&&c.trackStock===true&&selected(filters.products,c.catalogItemId||c.sku)).map(c=>({sku:c.sku,product:c.name,unit:c.unit,physical:num(c.current??c.stock??c.physical),reserved:num(c.reserved),available:num(c.available),...(canViewCosts?{cost:num(c.cost)}:{})}));totals={records:rows.length};
 }else if(id==='fiscal'){
  columns=[column('date','Data','date'),column('order','Origem'),column('client','Cliente'),column('document','Documento'),column('status','Situação'),column('value','Valor','currency')];
  rows=fiscalDrafts.filter(f=>matchesDate(day(f.createdAt))&&selected(filters.statuses,f.status)&&(!filters.clients.length||operations.some(o=>o.id===f.originId&&selected(filters.clients,clientKey(o))))).map(f=>({date:day(f.createdAt),order:f.originId,client:f.client,document:f.documentType.toUpperCase(),status:f.remoteState||f.status,value:num(f.total)}));totals={records:rows.length,value:round(rows.reduce((n,r)=>n+r.value,0))};
 }else if(id==='receivables'){
  columns=[column('date','Data do pedido','date'),column('client','Cliente'),column('order','Origem'),column('due','Vencimento','date'),column('status','Situação'),column('value','Valor original','currency'),column('received','Recebido líquido','currency'),column('balance','Saldo','currency')];
  rows=receivables.filter(r=>matchesDate(day(r.orderDate||r.createdAt))&&selected(filters.methods,r.method)&&(!filters.clients.length||operations.some(o=>(o.id===r.origin||o.persistence?.operationId===r.persistence?.operationId)&&selected(filters.clients,clientKey(o))))&&(!filters.statuses.length||filters.statuses.some(status=>status==='Em aberto'?receivableBalance(r)>0:receivableStatus(r,today)===status))).map(r=>({date:day(r.orderDate),client:r.client,order:r.origin,due:r.dueDate,status:receivableStatus(r,today),value:num(r.value)-num(r.reversed),received:Math.max(0,num(r.received)-num(r.refunded)),balance:receivableBalance(r)}));totals={records:rows.length,value:round(rows.reduce((n,r)=>n+r.value,0)),balance:round(rows.reduce((n,r)=>n+r.balance,0))};
 }
 const sort=filters.sort||'date-desc';
 rows.sort((a,b)=>sort==='value-desc'?num(b.value)-num(a.value):sort==='quantity-desc'?num(b.quantity)-num(a.quantity):sort==='name'?text(a.client||a.label||a.product).localeCompare(text(b.client||b.label||b.product),'pt-BR'):text(b.date||b.lastDate).localeCompare(text(a.date||a.lastDate)));
 const group=filters.group;if(['client','seller','product'].includes(group)&&columns.some(c=>c.id===group))rows.sort((a,b)=>text(a[group]).localeCompare(text(b[group]),'pt-BR'));
 if(filters.columns?.length)columns=columns.filter(c=>filters.columns.includes(c.id));
 // Only projected columns leave the builder: no hidden costs in exports or snapshots.
 rows=rows.map(r=>Object.fromEntries(columns.map(c=>[c.id,r[c.id]??''])));
 return {id,title:spec.title,columns,rows,totals,generatedAt:new Date().toISOString(),filters:structuredClone(filters),notes:id==='stock'?['Posição atual; não representa saldo histórico.']:productReports.includes(id)?['Valores dos produtos após descontos, sem frete, seguro ou outras despesas. Quantidades separadas por unidade.']:[]};
}
