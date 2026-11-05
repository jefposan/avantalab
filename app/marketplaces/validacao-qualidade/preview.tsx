'use client';
import {useCallback,useRef,useState,type CSSProperties} from 'react';
import type {ContentEditor} from '@/app/modules/marketplaces/listing-content';
import ListingEditor from '../ListingEditor';
import type {marketplaceClientRequest} from '../Anunciados';
import {normalizeListing} from '@/app/modules/marketplaces/services/listing-model';
import {normalizeListingQuality} from '@/app/modules/marketplaces/listing-quality';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import styles from '../marketplaces.module.css';
const id='MLB123456',snapshot=normalizeListing({id,seller_id:123,title:'Aquecedor elétrico demonstrativo',price:150,available_quantity:2,status:'active',listing_type_id:'gold_special'},'123');
export default function Preview(){
 const [dark,setDark]=useState(false),[message,setMessage]=useState('');
 const refuse=useRef(false),memory=useRef({revision:1,pictures:[{id:'demo-picture-01',url:''},{id:'demo-picture-02',url:''}],text:'Produto demonstrativo',power:'1500 W'});
 const request:typeof marketplaceClientRequest=useCallback(async(path,body)=>{
  if(path.startsWith('anunciados/qualidade/conteudo')){
   const kind=new URL(path,'http://localhost').searchParams.get('kind')||(body as {kind?:string})?.kind||'attributes';
   if(body){if(refuse.current){refuse.current=false;throw Object.assign(new Error('Potência: use um número e uma unidade permitida. Rascunho preservado.'),{code:'invalid_fields'});}const input=body as {values:unknown;kind:string};memory.current.revision++;if(input.kind==='pictures')memory.current.pictures=(input.values as string[]).map(id=>({id,url:''}));else{const values=input.values as Record<string,string>;if(values.TEXT)memory.current.text=values.TEXT;if(values.POWER)memory.current.power=values.POWER;}}
   const editor:ContentEditor={id,connectionId:'demo-account',revision:String(memory.current.revision).padStart(64,'0'),kind:kind as 'pictures'|'attributes',title:snapshot.title,affectedIds:[id,'MLB654321'],reason:'',maxPictures:6,pictures:memory.current.pictures,attributes:[{id:'TEXT',name:'Características adicionais',type:'string',value:memory.current.text,valueId:null,editable:true,reason:'',required:false,maxLength:255,options:[],units:[]},{id:'POWER',name:'Potência',type:'number_unit',value:memory.current.power,valueId:null,editable:true,reason:'',required:true,maxLength:60,options:[],units:['W']},{id:'GTIN',name:'EAN',type:'string',value:'7899710028120',valueId:null,editable:false,reason:'Identidade do produto preservada.',required:true,maxLength:14,options:[],units:[]}]};
   return body?{success:true,pending:false,editor,message:'Simulação: alteração confirmada nos dois anúncios fictícios. Nenhum dado enviado ao ML.'}:editor;
  }
  if(path==='anunciados/qualidade/foto')return {id:`demo-upload-${Date.now()}`,url:'https://http2.mlstatic.com/demo.jpg'};
  if(body)throw new Error('Prévia: nenhuma alteração é enviada ao Mercado Livre.');
  if(path.startsWith('anunciados/qualidade?')){
   await new Promise(resolve=>setTimeout(resolve,450));
   return {listingId:id,connectionId:'demo-account',snapshot,notices:[],checkedAt:new Date().toISOString(),quality:[normalizeListingQuality({entity_id:id,entity_type:'ITEM',score:69,level_wording:'Satisfatória',calculated_at:'2026-10-24T12:00:00Z',buckets:[{key:'CHARACTERISTICS',variables:[{key:'TITLE',title:'Identificação do produto',rules:[{key:'TITLE',status:'PENDING',mode:'OPPORTUNITY',wordings:{title:'Melhore o título para identificar o produto com clareza.',link:'https://www.mercadolivre.com.br/anuncios/MLB123456/modificar'}}]},{key:'PICTURES',title:'Fotos do produto',rules:[{key:'PICTURES_QUANTITY_MIN',status:'PENDING',mode:'WARNING',wordings:{title:'Adicione fotos do produto de diferentes ângulos.',link:'https://www.mercadolivre.com.br/anuncios/MLB123456/modificar'}}]},{key:'DESCRIPTION',title:'Descrição',rules:[{key:'DESCRIPTION',status:'COMPLETED',mode:'OPPORTUNITY',wordings:{title:'Descrição preenchida.'}}]}]}]},id,'ITEM')]};
  }
  return {provider:'mercado_livre',id,revision:'demo-revision',currency:'BRL',values:{title:snapshot.title,price:150,stock:2,listingType:'gold_special',description:'Produto fictício para validação visual.'},fields:{title:{editable:true,maxLength:60},price:{editable:true,min:.01},stock:{editable:false,reason:'Estoque unificado. Confira o saldo físico no estoque.'},listingType:{editable:true},description:{editable:true,maxLength:5000}},listingTypes:[{id:'gold_special',name:'Clássico',fee:null,percent:null}]};
 },[]);
 return <main className={`${styles.page} ${dark?styles.dark:''}`} style={{'--brand':'#003e73',padding:24} as CSSProperties}>
  <h1>Qualidade do anúncio · Conta demonstração</h1><p>Prévia local com dados fictícios. Nenhuma consulta externa ou publicação.</p><BotaoAcaoCompacto onClick={()=>setDark(!dark)}>Alternar tema</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>{refuse.current=true;}}>Simular recusa na próxima gravação</BotaoAcaoCompacto>
  <section className={styles.panel}><ListingEditor companyId="demo-company" accountId="demo-account" itemId={id} snapshot={snapshot} permalink={null} dark={dark} brand="#003e73" request={request} onClose={()=>setMessage('Edição cancelada.')} onSaved={()=>{}} onBusy={()=>{}}>{null}</ListingEditor>{message&&<p role="status">{message}</p>}</section>
 </main>;
}
