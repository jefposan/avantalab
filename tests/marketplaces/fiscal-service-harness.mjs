import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fixture, ids } from './fiscal-fixture.mjs';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(specifier,context,next){
 if(specifier==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
 if(specifier==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}',shortCircuit:true};
 if(specifier==='./mercadolivre-management')return{url:'data:text/javascript,export async function loadConnection(db,company,id){if(company!==db.company||id!==db.connection.id)throw Error("Conta não encontrada");return db.connection} export async function mlRequest(db,c,p,m="GET",body,options){return db.request(p,m,body,options)} export async function mlBinaryRequest(db,c,p,f){return db.download(p,f)}',shortCircuit:true};
 const candidate=specifier.startsWith('@/')?resolve(root,specifier.slice(2)):specifier.startsWith('.')&&context.parentURL?.startsWith('file:')?resolve(dirname(new URL(context.parentURL).pathname),specifier):null;
 if(candidate&&existsSync(`${candidate}.ts`))return next(pathToFileURL(`${candidate}.ts`).href,context);
 return next(specifier,context);
}});
const {issueDceForSale,syncOrder,listSales,parseSaleNotification,readDceState,publicSale}=await import('../../app/modules/marketplaces/services/mercadolivre-sales.ts');
const {loadFiscalSale,reconcileFiscal,issueNfeForSale,importNfeForSale,fiscalDocumentForSale}=await import('../../app/modules/marketplaces/services/mercadolivre-fiscal.ts');
const {FiscalProviderError,fiscalProviderProblem,isFiscalPath}=await import('../../app/modules/marketplaces/services/fiscal-provider-error.ts');
const {fiscalHistory}=await import('../../app/modules/marketplaces/services/fiscal-history.ts');
hooks.deregister();
class Query{
 constructor(db,table){this.db=db;this.table=table;this.filters=[];this.args=[];this.columns='*';this.sorts=[];}
 select(c='*'){this.columns=c;this.returning=true;return this;}
 eq(k,v){this.args.push(v);this.filters.push(`${k}=$${this.args.length}`);return this;}
 in(k,values){this.args.push(values);this.filters.push(`${k}=any($${this.args.length})`);return this;}
 order(k,o){this.sorts.push(`${k} ${o?.ascending===false?'desc':'asc'}`);return this;}
 limit(n){this.count=n;return this;}
 range(a,b){this.offset=a;this.count=b-a+1;return this;}
 insert(value){this.value=value;this.mode='insert';return this;}
 update(value){this.value=value;this.mode='update';this.returning=false;return this;}
 single(){this.one=true;return this;}
 maybeSingle(){this.one=true;return this;}
 then(ok,fail){return this.execute().then(ok,fail);}
 async execute(){
  try{
   if(this.mode==='update'&&this.table==='marketplace_sales'&&this.db.beforeSaleUpdate)await this.db.beforeSaleUpdate();
   let sql,params=[...this.args];const where=this.filters.length?` where ${this.filters.join(' and ')}`:'';
   if(this.mode){const entries=Object.entries(this.value).filter(([,v])=>v!==undefined);const keys=entries.map(([k])=>k);const values=entries.map(([,v])=>v&&typeof v==='object'?JSON.stringify(v):v);const start=params.length;params.push(...values);
    sql=this.mode==='insert'?`insert into ${this.table}(${keys.join(',')}) values(${keys.map((_,i)=>`$${start+i+1}`).join(',')})`:`update ${this.table} set ${keys.map((k,i)=>`${k}=$${start+i+1}`).join(',')}${where}`;
    if(this.returning||this.mode==='insert')sql+=` returning ${this.columns}`;
   }else sql=`select ${this.columns} from ${this.table}${where}${this.sorts.length?` order by ${this.sorts.join(',')}`:''}${this.count?` limit ${this.count}`:''}${this.offset?` offset ${this.offset}`:''}`;
   const result=await this.db.sql.query(sql,params);return{data:this.one?(result.rows[0]||null):result.rows,error:null};
  }catch(error){return{data:null,error:{code:error.code,message:error.message}};}
 }
}
export async function serviceFixture(legacy=false){
 const sql=await fixture(legacy);
 await sql.exec('alter table marketplace_sales add column operation_checked_at timestamptz');
 const db={sql,company:ids.company,connection:{id:ids.connection,empresa_id:ids.company,seller_reference:'123'},calls:[],
 order:{id:'2000019139347426',seller:{id:123},status:'paid',shipping:{id:555},order_items:[{quantity:1,item:{id:'MLB123456',variation_id:123,title:'Calculadora'}}]},shipment:{id:555,status:'ready_to_ship',substatus:'invoice_pending',mode:'me2',logistic_type:'xd_drop_off'},
 from(table){return new Query(this,table);},
 async request(path,method='GET',body,options){this.calls.push({path,method,body,options});
  if(path===`/orders/${this.order.id}`)return this.order;
  if(path==='/shipments/555')return this.shipment;
  if(path==='/users/123')return{id:123,identification:{type:'CNPJ',number:'11111111111111'}};
  if(path.endsWith('/dce/info')){if(this.dce)return this.dce;throw new FiscalProviderError(this.dceHttp||404);}
  if(path.includes('/invoices/orders/')||path.includes('/invoices/shipments/')){if(this.nfe)return this.nfe;throw new FiscalProviderError(404);}
  if(path.includes('/invoice_data?')){if(this.imported)return this.imported;throw new FiscalProviderError(404);}
  if(method!=='GET'){
   if(this.beforeSend)await this.beforeSend();
   if(this.postError)throw this.postError;
   return this.postResponse || {id:'fiscal-receipt'};
  }
  throw Error(`Unexpected request ${path}`);
 },download:async()=>new Uint8Array([37,80,68,70,45])};
 return db;
}
export const issue=db=>issueDceForSale(db,ids.company,ids.connection,ids.sale,true);
export const state=async db=>{const scope=await loadFiscalSale(db,ids.company,ids.connection,ids.sale);return fiscalHistory(db,scope.sale);};

export {ids,readDceState,publicSale,issueDceForSale,syncOrder,listSales,parseSaleNotification,loadFiscalSale,reconcileFiscal,issueNfeForSale,importNfeForSale,fiscalDocumentForSale,FiscalProviderError,fiscalProviderProblem,isFiscalPath};
