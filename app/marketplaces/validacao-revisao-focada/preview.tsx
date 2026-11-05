'use client';
import {useCallback,useState} from 'react';
import ProductListingReview from '../ProductListingReview';
import {QualityCacheProvider} from '../QualitySummary';
import type {MarketplaceAccount,marketplaceClientRequest} from '../Anunciados';
const ids=['MLB123456','MLB234567','MLB345678','MLB456789'];
const source={companyId:'demo-company',productId:'demo-product',sourceConnectionId:'account-0',sourceId:ids[0]};
const accounts=ids.map((_,i)=>({id:'account-'+i,status:'connected',seller_name:['ALINE','JEFF','ADRIANO','CIDY'][i]})) as MarketplaceAccount[];
const rule=(id:string,name:string,value='',editable=true)=>({id,name,value,type:'string',editable,valueId:null,reason:editable?'':'Identidade preservada',required:false,maxLength:100,options:[],units:[]});
const photo={id:'photo-demo-123',url:'https://http2.mlstatic.com/foto-demonstrativa.jpg'};
export default function Preview(){
 const [open,setOpen]=useState(false),[blocked,setBlocked]=useState(false),[busy,setBusy]=useState(false);
 const request:typeof marketplaceClientRequest=useCallback(async(path,body,_signal,method)=>{
  if(path.startsWith('anunciados/qualidade/cache?'))return {records:ids.map((id,i)=>({connection_id:'account-'+i,listing_id:id,score:61,checked_at:new Date().toISOString(),issue:null}))};
  if(path.startsWith('anunciados/qualidade?')){const params=new URLSearchParams(path.split('?')[1]);return {connectionId:params.get('connectionId'),listingId:params.get('id'),quality:[{goals:[{id:'CHARACTERISTICS:PICTURES:PICTURES_QUANTITY_MIN',title:'Adicione fotos do produto de diferentes ângulos, pelo menos 3.',group:'Melhore suas fotos',completed:false},{id:'STOCK',title:'Certifique-se de ter 2 ou mais unidades disponíveis.',group:'Estoque',completed:false},{id:'VIDEO',title:'Crie um vídeo vertical de até um minuto.',group:'Vídeo',completed:false}]}]};}
  if(path.startsWith('produtos/qualidade?')){
   const kind=new URLSearchParams(path.split('?')[1]).get('kind'),reason=blocked&&kind!=='details'?'Conteúdo controlado pelo catálogo do ML.':'';
   const attributes=kind==='details'?[rule('TITLE','Título','Batedeira de demonstração',false),{...rule('DESCRIPTION','Descrição','Descrição registrada'),type:'text',maxLength:50000}]:[rule('POWER','Potência','',!blocked),rule('GTIN','EAN','7899882311471',false)];
   const reviewTargets=ids.map((id,i)=>({id,connectionId:'account-'+i,revision:'revision',affectedIds:[id],...(kind==='details'?{details:{values:{title:'Batedeira de demonstração',description:'Descrição registrada',listingType:'gold_special'},fields:{title:{editable:false,reason:'Identidade preservada'},description:{editable:true},listingType:{editable:false}},listingTypes:[]}}:{content:{attributes,pictures:[photo],reason:blocked&&i===1?'':reason,maxPictures:12,contextFields:[]}})}));
   return {...source,id:source.sourceId,connectionId:source.sourceConnectionId,revision:'revision',scopeHash:'scope',kind:kind==='pictures'?'pictures':'attributes',title:'Batedeira de demonstração',maxPictures:12,pictures:[photo],reason,attributes,reviewTargets,restrictions:reason?[{connectionId:'account-0',id:ids[0],message:reason}]:[],affectedIds:ids,different:false};
  }
  if(path==='produtos/qualidade/ia')return {productId:source.productId,sourceId:source.sourceId,sourceConnectionId:source.sourceConnectionId,revisions:{details:'revision',pictures:'revision',attributes:'revision'},suggestions:[{field:'POWER',name:'Potência',value:'400 W',source:'Fabricante fictício'}],pictures:blocked?[photo,{...photo,id:'photo-extra-1'},{...photo,id:'photo-extra-2'}]:[],description:'',pending:[]};
  if(method==='PATCH'||body)throw Error('Prévia sem escrita externa.');
  throw Error('Consulta não prevista na demonstração.');
 },[blocked]);
 return <main style={{padding:24}}><h1>Revisão de demonstração · sem dados reais</h1><button disabled={busy} onClick={()=>{setBlocked(false);setOpen(true);}}>Abrir revisão editável</button><button disabled={busy} onClick={()=>{setBlocked(true);setOpen(true);}}>Abrir revisão com catálogo</button>{open&&<QualityCacheProvider companyId={source.companyId} request={request}><ProductListingReview source={source} accounts={accounts} request={request} dark={false} brand="#003e73" onClose={()=>setOpen(false)} onBusy={setBusy} onSaved={()=>{}}/></QualityCacheProvider>}</main>;
}
