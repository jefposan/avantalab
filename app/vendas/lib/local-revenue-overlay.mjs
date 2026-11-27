import {fetchCommercialPages} from './commercial-pages.mjs';
const MONTHS=['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
export const revenueLabKey=companyId=>`avantalab:vendas-servicos:revenue-lab:v1:${companyId}`;
export function localRevenueLabActive(){return process.env.NODE_ENV==='development'&&typeof window!=='undefined'&&['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);}
export function projectLocalRevenue({operations,companyId,year,enabled}){
 const totals=new Map();const ids=new Set();
 for(const row of operations){
  if(row.companyId!==companyId||ids.has(row.id))throw Error('O contexto das vendas mudou. Atualize a consulta.');ids.add(row.id);
  if(!((row.type==='pedido'&&row.status==='faturado')||(row.type==='ordem_servico'&&row.status==='concluido')))continue;
  const explicit=String(row.deliverySnapshot?.orderDate||'');let date=explicit;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date){
   const created=new Date(row.createdAt);if(!Number.isFinite(created.getTime()))throw Error('Uma venda não tem competência válida.');
   date=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(created);
  }
  if(Number(date.slice(0,4))!==year)continue;
  const amount=Number(row.total);if(!Number.isFinite(amount)||amount<0)throw Error('Uma venda não tem total válido.');
  const month=Number(date.slice(5,7))-1;
  totals.set(month,(totals.get(month)||0)+(enabled?Math.round(amount*100):0));
 }
 return [...totals].filter(([,cents])=>cents>0).map(([month,cents])=>({id:`local-vendas:${companyId}:${year}:${month+1}`,empresa_id:companyId,ano:year,mes:MONTHS[month],dia:new Date(Date.UTC(year,month+1,0)).getUTCDate(),origem:'Venda Avantalab',origem_etiqueta:'Venda Avantalab',tipo_obs:'vendas_servicos_sistema',valor:cents/100,status:null,centro_custo_id:null}));
}
export function mergeLocalRevenueEntries(existing,projected,companyId,year,centerId){
 const other=existing.filter(row=>row.tipo_obs!=='vendas_servicos_sistema');
 if(centerId)return other;
 if(projected.some(row=>row.empresa_id!==companyId||row.ano!==year))throw Error('Competência ou empresa incompatível.');
 return [...other,...projected];
}
export function mergeLocalRevenueTotals(existing,previous,projected){
 const amounts=new Map(existing.map(row=>[row.mes,{...row,valor:Math.round(Number(row.valor)*100)}]));
 for(const [rows,sign] of [[previous,-1],[projected,1]])for(const row of rows){const current=amounts.get(row.mes)||{mes:row.mes,ano:row.ano,empresa_id:row.empresa_id,valor:0};current.valor+=sign*Math.round(Number(row.valor)*100);amounts.set(row.mes,current);}
 return [...amounts.values()].map(row=>({...row,valor:Math.max(0,row.valor)/100}));
}
const pending=new Map();
export async function loadLocalRevenue({companyId,year,token,fetcher=fetch}){
 const raw=localStorage.getItem(revenueLabKey(companyId));let enabled=true;
 if(raw){const saved=JSON.parse(raw);if(typeof saved.enabled!=='boolean')throw Error('Atualize a configuração local de receitas.');enabled=saved.enabled;}
 const key=JSON.stringify([companyId,year,enabled,token]);const hit=pending.get(key);if(hit&&Date.now()-hit.time<5000)return hit.promise;
 const promise=(async()=>{
  const channels=await Promise.all(['vendas','servicos'].map(channel=>fetchCommercialPages({url:`/api/modulos/vendas/commercial/operations?companyId=${encodeURIComponent(companyId)}&channel=${channel}`,key:'operations',token,fetcher})));
  return projectLocalRevenue({operations:channels.flat(),companyId,year,enabled});
 })();pending.set(key,{time:Date.now(),promise});
 try{return await promise;}catch(error){pending.delete(key);throw error;}
}
