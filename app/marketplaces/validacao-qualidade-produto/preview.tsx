'use client';
import {useCallback,useState,type CSSProperties} from 'react';
import ProductQuality from '../ProductQuality';
import {QualityCacheProvider} from '../QualitySummary';
import type {LocalProduct} from '@/app/modules/marketplaces/services/local-product-model';
import type {MarketplaceAccount,marketplaceClientRequest} from '../Anunciados';
import {normalizeListing} from '@/app/modules/marketplaces/services/listing-model';
import {normalizeListingQuality} from '@/app/modules/marketplaces/listing-quality';
const ids=['MLB123456','MLB654321'];
const product={id:'demo-product',empresa_id:'demo-company',name:'Aquecedor demonstrativo',links:ids.map((id,i)=>({id,connection_id:`demo-${i}`,provider:'mercado_livre',provider_listing_id:id,status:'active'}))} as LocalProduct;
const accounts=ids.map((_,i)=>({id:`demo-${i}`,status:'connected',seller_name:`Conta ${i+1}`})) as MarketplaceAccount[];
export default function Preview(){
 const [busy,setBusy]=useState(false),[dark,setDark]=useState(false),[narrow,setNarrow]=useState(false),[canManage,setCanManage]=useState(true);
 const request:typeof marketplaceClientRequest=useCallback(async(path,body,_signal,method)=>{
  const params=new URL(path,'http://localhost').searchParams,kind=params.get('kind')||String((body as {kind?:string}|undefined)?.kind||'attributes');
  if(path.startsWith('anunciados/qualidade/cache?'))return {records:ids.map((id,i)=>({connection_id:`demo-${i}`,listing_id:id,score:i?81:58,checked_at:new Date().toISOString(),issue:null,quality:[{entityId:id,entityType:'ITEM',goals:[{id:'PICTURES_QUANTITY',title:'Fotos',completed:false,field:null},{id:'TECHNICAL_ATTRIBUTES',title:'Ficha técnica',completed:false,field:null}]}]}))};
  if(path==='produtos/qualidade/ia')return {productId:product.id,suggestions:[{field:'POWER',name:'Potência',value:'1500 W',source:'Fabricante fictício — teste',sourceUrl:'https://fabricante.example/produto/aq-100',evidence:'Potência: 1500 W.'}],description:'',pictures:[],pending:['Linha'],cached:false,sourceConnectionId:'demo-0',sourceId:ids[0],revisions:{attributes:'r',details:'r',pictures:'r'},restrictions:[{connectionId:'demo-0',id:ids[0],message:'Conteúdo controlado pelo catálogo do ML.'}]};
  if(path.startsWith('produtos/qualidade')){
   if(method==='PATCH')return {success:true};
   if(body)return {scopeHash:'demo-scope',parts:[{id:ids[1],connectionId:'demo-1',revision:'r',affectedIds:[ids[1]]}],blocked:[{connectionId:'demo-0',id:ids[0],message:'Conteúdo controlado pelo catálogo do ML.'}]};
   return {id:ids[0],connectionId:'demo-0',productId:product.id,kind:kind==='details'?'attributes':kind,revision:'r',scopeHash:'demo-scope',different:true,title:product.name,affectedIds:ids,reason:'',maxPictures:6,pictures:[{id:'demo-photo-123',url:''}],attributes:(kind==='details'?[{id:'TITLE',name:'Título / nome base',value:'Aquecedor demonstrativo',type:'string'},{id:'DESCRIPTION',name:'Descrição',value:'Descrição demonstrativa do produto.',type:'text'}]:[{id:'POWER',name:'Potência',value:'1500 W',type:'string'},{id:'LINE',name:'Linha',value:'',type:'string'}]).map(a=>({...a,editable:true,valueId:null,reason:'',required:true,maxLength:500,options:[],units:[]}))};
  }
  if(path.startsWith('anunciados/qualidade?')){
   const id=params.get('id')!,connectionId=params.get('connectionId')!;
   return {listingId:id,connectionId,snapshot:normalizeListing({id,seller_id:123,title:product.name,status:'active'},'123'),checkedAt:new Date().toISOString(),notices:[],quality:[normalizeListingQuality({entity_id:id,entity_type:'ITEM',score:id===ids[0]?69:85,level_wording:'Avaliação demonstrativa',buckets:[{key:'CHARACTERISTICS',variables:[{key:'PICTURES',title:'Fotos',rules:[{key:'PICTURES_QUANTITY_MIN',status:'PENDING',mode:'WARNING',wordings:{title:'Adicione fotos de outros ângulos.'}}]}]}]},id,'ITEM')]};
  }
  throw Error('Esta prévia não envia dados para a plataforma.');
 },[]);
 return <main style={{'--brand':'#d50000',padding:24,maxWidth:1280,margin:'auto',background:dark?'#172132':'#fff',color:dark?'#e6edf4':'#1d2b3d'} as CSSProperties}><h1>Prévia local · Produto com duas contas</h1><p>Somente dados fictícios; não consulta nem altera anúncios reais. Preços preservados: R$ 100,00 e R$ 200,00.</p><button onClick={()=>setDark(!dark)}>Alternar tema</button><button onClick={()=>setNarrow(v=>!v)}>Tela estreita</button><button onClick={()=>setCanManage(v=>!v)}>Alternar permissão de edição</button><div style={{width:narrow?360:'100%',maxWidth:'100%'}}><QualityCacheProvider companyId={product.empresa_id} request={request}><ProductQuality product={product} accounts={accounts} canManage={canManage} busy={busy} dark={dark} brand="#d50000" request={request} onBusy={setBusy}/></QualityCacheProvider></div><section><h3>Cadastro do produto</h3><p>Aquecedor demonstrativo · EAN preservado</p></section></main>;
}
