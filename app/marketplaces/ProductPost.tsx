'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {WarehouseContext} from '@/app/modules/marketplaces/warehouses';
import CampoMoeda from '@/app/components/CampoMoeda';
import {loadProductPost,saveProductPost,type PostScope,type PostRequest} from './product-post-store';
import {preparePostPhoto} from './product-post-photo';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import {formatarMoedaDigitada} from '@/app/lib/formatters';
import {baixarImagem,compartilharImagem} from '@/app/lib/compartilhar-imagem';
import {POST_CONDITIONS,POST_VOLTAGES,productPostCaption,postSummary,suggestedPostVoltage,validateProductPost,postPrimaryColor,type ProductPostDraft} from '@/app/modules/marketplaces/product-post';
import {DirectDialog} from './DirectSaleActions';
import {createProductPostImage,createProductPostSource} from './product-post-image';
import styles from './product-post.module.css';
import ProductPostFlow from './ProductPostFlow';

export type PostProduct={id:string;name:string;description:string;image:string|null;internalNotes?:string;attributes?:Array<{id:string;name:string;value:string}>};
export type ProductPostProps={product:PostProduct;companyName:string;storageScope?:PostScope;request?:PostRequest;referencePrice?:number;prices?:{minimum:number;medium:number;ideal:number};onClose:()=>void;onBusyChange?:(busy:boolean)=>void;dark?:boolean;primaryColor?:string};
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
export default function ProductPost(props:ProductPostProps){
 return <ProductPostFlow {...props} renderImage={back=><ProductPostImage {...props} onBusyChange={undefined} onChooseDestination={back}/>}/>;
}
export function ProductPostImage({product,companyName,storageScope,request,referencePrice,prices,onClose,onBusyChange,dark,primaryColor,onChooseDestination}:ProductPostProps&{onChooseDestination?:()=>void}){
 const [description,setDescription]=useState(()=>postSummary(product.name)),[voltage,setVoltage]=useState(()=>suggestedPostVoltage(product.name,product.attributes)),[condition,setCondition]=useState(''),[details,setDetails]=useState(()=>product.internalNotes || ''),[price,setPrice]=useState(()=>prices?.medium!=null&&Number.isFinite(prices.medium)&&prices.medium>0?formatarMoedaDigitada(String(Math.round(prices.medium*100))):'');
 const [originalPrice,setOriginalPrice]=useState(()=>referencePrice!=null&&Number.isFinite(referencePrice)&&referencePrice>0?formatarMoedaDigitada(String(Math.round(referencePrice*100))):'');
 const [generating,setGenerating]=useState(false),[sharing,setSharing]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState('');
 const [image,setImage]=useState(product.image||''),[photoBusy,setPhotoBusy]=useState(false),[loadingSaved,setLoadingSaved]=useState(Boolean(storageScope)),[saved,setSaved]=useState(false),[revision,setRevision]=useState(0),[source,setSource]=useState<Blob|null>(null),[loadFailed,setLoadFailed]=useState(false),[readyDraft,setReadyDraft]=useState<ProductPostDraft|null>(null);
 const [stock,setStock]=useState<WarehouseContext|null>(null);
 const stockReady=stock?.warehousesReady===true;
 const gallery=useRef<HTMLInputElement|null>(null),camera=useRef<HTMLInputElement|null>(null),photoRun=useRef<AbortController|null>(null);
 const generation=useRef<AbortController|null>(null),currentUrl=useRef(''),alive=useRef(true),locked=useRef(false),shareLocked=useRef(false),sourceUrl=useRef(''),attempt=useRef('');
 useEffect(()=>{alive.current=true;onBusyChange?.(true);return()=>{alive.current=false;generation.current?.abort();photoRun.current?.abort();if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);if(sourceUrl.current)URL.revokeObjectURL(sourceUrl.current);onBusyChange?.(false);};},[onBusyChange]);
 useEffect(()=>{
  if(!storageScope||!request){setLoadingSaved(false);return;}
  let active=true;const controller=new AbortController();
  void loadProductPost(storageScope,request,controller.signal).then(context=>{
   if(!active)return;setStock(context.stock);const saved=context.post;
   if(!saved)return;
   const localSource=URL.createObjectURL(saved.source);sourceUrl.current=localSource;
   const d={...saved.draft,image:localSource};setSource(saved.source);setRevision(saved.revision);setDescription(d.description);setVoltage(d.voltage);setCondition(d.condition);setDetails(d.details??d.damage??'');setPrice(formatarMoedaDigitada(String(d.priceCents)));setOriginalPrice(formatarMoedaDigitada(String(d.originalPriceCents)));setImage(d.image);setReadyDraft(d);setSaved(true);
   const url=URL.createObjectURL(saved.image);currentUrl.current=url;setPreview(url);setFile(new File([saved.image],'post-produto.png',{type:'image/png'}));
  }).catch(reason=>{if(active){setLoadFailed(true);setError(reason instanceof Error?reason.message:'Não foi possível abrir o post salvo.');}}).finally(()=>{if(active)setLoadingSaved(false);});
  return()=>{active=false;controller.abort();};
 },[storageScope?.companyId,storageScope?.productId,storageScope?.historyId,request]);
 async function choosePhoto(input:HTMLInputElement){
  const chosen=input.files?.[0];input.value='';if(!chosen)return;
  photoRun.current?.abort();const controller=new AbortController();photoRun.current=controller;setPhotoBusy(true);setError('');
  try{const next=await preparePostPhoto(chosen,controller.signal);if(alive.current&&!controller.signal.aborted)setImage(next);}
  catch(reason){if(alive.current&&!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Não foi possível usar a foto.');}
  finally{if(alive.current&&photoRun.current===controller)setPhotoBusy(false);}
 }
 async function persist(draft:ProductPostDraft,blob:Blob,photo:Blob){
  if(!storageScope||!request){setError('Não foi possível identificar o produto para salvar. Reabra o produto.');return;}
  try{const result=await saveProductPost(storageScope,request,draft,blob,photo,revision,attempt.current);if(alive.current){setRevision(result.revision);setSaved(true);}}
  catch(reason){if(alive.current){setSaved(false);setError(reason instanceof Error?reason.message:'Não foi possível salvar o post.');}}
 }
 function clearPreview(){if(currentUrl.current)URL.revokeObjectURL(currentUrl.current);currentUrl.current='';setPreview('');setFile(null);setError('');setNotice('');attempt.current='';}
 async function generate(event:FormEvent){
  event.preventDefault();if(locked.current||photoBusy||loadingSaved||loadFailed)return;
  const draft:ProductPostDraft={company:companyName,name:product.name,image,description,voltage,condition,details,priceCents:Number(price.replace(/\D/g,'')),originalPriceCents:Number(originalPrice.replace(/\D/g,'')),primaryColor:postPrimaryColor(primaryColor)};
  const invalid=validateProductPost(draft);
  if(invalid){setError(invalid.message);document.getElementById(`post-${invalid.field}`)?.focus();return;}
  clearPreview();locked.current=true;setGenerating(true);
  const controller=new AbortController();generation.current=controller;
  try{
   const blob=await createProductPostImage(draft,controller.signal);
   const photo=await createProductPostSource(draft.image,controller.signal);
   if(!alive.current||controller.signal.aborted)return;
   const next=new File([blob],'post-produto.png',{type:'image/png'}),url=URL.createObjectURL(blob);
   currentUrl.current=url;setFile(next);setPreview(url);setReadyDraft({...draft});setSaved(false);setSource(photo);attempt.current=crypto.randomUUID();
   await persist(draft,blob,photo);
  }catch(reason){if(alive.current&&!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Não foi possível gerar o post. Tente novamente.');}
  finally{locked.current=false;if(alive.current)setGenerating(false);}
 }
 async function share(){
  if(!file||!saved||generating||shareLocked.current)return;shareLocked.current=true;setSharing(true);setError('');setNotice('');
  try{const result=await compartilharImagem(file,readyDraft?.name||product.name,readyDraft?productPostCaption(readyDraft,storageScope?.companyId):undefined);if(alive.current)setNotice(result==='compartilhado'?'Compartilhamento concluído.':result==='baixado'?'Imagem baixada.':'');}
  catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Não foi possível compartilhar. Use Baixar imagem.');}
  finally{shareLocked.current=false;if(alive.current)setSharing(false);}
 }
 return <DirectDialog title={loadingSaved?'Abrindo post…':file?'Post pronto':'Criar post'} onClose={onClose} dark={dark} brand={postPrimaryColor(primaryColor)}>
  <div className={styles.body} data-dark={dark||undefined}>
   {onChooseDestination&&<BotaoAcaoCompacto disabled={generating||sharing} onClick={onChooseDestination}>Escolher outro estoque</BotaoAcaoCompacto>}
   {stockReady&&<section className={styles.stockChooser} aria-label="Saldos do produto">
    <dl className={styles.stockOptions}>
     {[{id:'all',name:'Todos',quantity:stock.warehouses.every(w=>w.quantity!==null)?stock.warehouses.reduce((sum,w)=>sum+(w.quantity||0),0):null},...stock.warehouses].map(w=><div key={w.id} className={styles.stockIndicator}><dt>{w.name}</dt><dd>{w.quantity===null?'Indisponível':`${w.quantity} un.`}</dd></div>)}
    </dl>
   </section>}
   {!loadingSaved&&storageScope&&!stockReady&&<p role="status">{stock?.warehouseError||'Saldo indisponível no momento.'}</p>}
   {loadingSaved?<p role="status">Abrindo post salvo…</p>:loadFailed?<BotaoAcaoCompacto onClick={onClose}>Fechar</BotaoAcaoCompacto>:file?<>
    <img className={styles.preview} src={preview} alt={`Post de ${product.name}, ${POST_CONDITIONS[condition as keyof typeof POST_CONDITIONS]}, ${voltage}, de ${money.format(Number(originalPrice.replace(/\D/g,''))/100)} por ${money.format(Number(price.replace(/\D/g,''))/100)}`} />
    {readyDraft&&<section className={styles.caption} aria-label="Legenda do WhatsApp"><p>{productPostCaption(readyDraft,storageScope?.companyId)}</p></section>}
    {generating&&<p role="status">Salvando post…</p>}
    <div className={styles.actions}><BotaoAcaoCompacto disabled={sharing||generating} onClick={clearPreview}>Editar post</BotaoAcaoCompacto><BotaoAcaoCompacto disabled={sharing||generating} onClick={()=>baixarImagem(file)}>Baixar imagem</BotaoAcaoCompacto></div>
    <BotaoAcaoCompacto variante="primario" className={styles.share} disabled={sharing||generating||!saved} onClick={()=>void share()}>{sharing?'Compartilhando…':'Compartilhar post'}</BotaoAcaoCompacto>
    {!saved&&storageScope&&<div className={styles.actions}>
     <BotaoAcaoCompacto disabled={sharing||generating} onClick={()=>{if(!readyDraft||!source||locked.current)return;locked.current=true;setGenerating(true);setError('');void persist(readyDraft,file,source).finally(()=>{locked.current=false;if(alive.current)setGenerating(false);});}}>Salvar novamente</BotaoAcaoCompacto>
    </div>}
   </>:<form className={styles.form} onSubmit={generate} aria-busy={generating}>
    <div className={styles.product}>
     {image?<img id="post-image" tabIndex={-1} src={image} alt={`Foto escolhida de ${product.name}`} />:<span id="post-image" tabIndex={-1}>Sem foto</span>}
     <div><strong>{product.name}</strong><small>A foto escolhida será usada somente neste post</small></div>
    </div>
    <div className={styles.photoActions} aria-label="Foto do post">
     <BotaoAcaoCompacto disabled={generating||photoBusy||!product.image} aria-pressed={image===product.image} onClick={()=>setImage(product.image||'')}>Foto do produto</BotaoAcaoCompacto>
     <BotaoAcaoCompacto disabled={generating||photoBusy} onClick={()=>gallery.current?.click()}>Galeria</BotaoAcaoCompacto>
     <BotaoAcaoCompacto disabled={generating||photoBusy} onClick={()=>camera.current?.click()}>Tirar foto</BotaoAcaoCompacto>
    </div>
    <input ref={gallery} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Selecionar foto da galeria" onChange={e=>void choosePhoto(e.currentTarget)}/>
    <input ref={camera} hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Tirar foto do produto" onChange={e=>void choosePhoto(e.currentTarget)}/>
    {photoBusy&&<p role="status">Preparando foto…</p>}
    {!image&&<p>Escolha uma foto para gerar o post.</p>}
    <label htmlFor="post-description">Descrição do post<textarea id="post-description" rows={2} maxLength={180} value={description} onChange={e=>setDescription(e.target.value)} disabled={generating} required/></label>
    <div className={styles.grid}>
     <label htmlFor="post-voltage">Voltagem<select id="post-voltage" value={voltage} disabled={generating} onChange={e=>setVoltage(e.target.value)}><option value="">Selecione</option>{POST_VOLTAGES.map(value=><option key={value}>{value}</option>)}</select></label>
     <label htmlFor="post-condition">Condição<select id="post-condition" value={condition} disabled={generating} onChange={e=>setCondition(e.target.value)}><option value="">Selecione</option>{Object.entries(POST_CONDITIONS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <label className={styles.details} htmlFor="post-details">Detalhes<textarea id="post-details" value={details} onChange={e=>setDetails(e.target.value)} rows={3} maxLength={160} disabled={generating} required={condition==='damaged'||condition==='detailed'} placeholder="Observações sobre o produto, acessórios, embalagem ou avarias" aria-describedby="post-details-help"/><small id="post-details-help">{product.internalNotes?'Preenchido com observações internas. Revise o que deseja mostrar na imagem. Editar aqui não altera o cadastro.':condition==='damaged'||condition==='detailed'?'Descreva a avaria ou o detalhe do produto.':'Adicione observações, se desejar.'} Até 160 caracteres.</small></label>
    <section className={styles.pricing} aria-label="Preço do post">
     <span>Preços de referência</span>
     {prices&&<div className={styles.suggestions}>{Object.entries(prices).map(([key,value])=><BotaoAcaoCompacto key={key} data-price-level={key} aria-pressed={price!==''&&Number(price.replace(/\D/g,''))===Math.round(value*100)} disabled={generating||!Number.isFinite(value)||value<=0} onClick={()=>setPrice(formatarMoedaDigitada(String(Math.round(value*100))))}><span>{key==='minimum'?'Mínimo':key==='medium'?'Médio':'Ideal'}</span><strong>{money.format(value)}</strong></BotaoAcaoCompacto>)}</div>}
     <div className={styles.grid}>
      <label htmlFor="post-original-price">De · preço anterior (R$)<CampoMoeda id="post-original-price" value={originalPrice} maxLength={15} disabled={generating} placeholder="0,00" onChange={setOriginalPrice} required/></label>
      <label htmlFor="post-price">Por · preço de venda (R$)<CampoMoeda id="post-price" value={price} maxLength={15} disabled={generating} placeholder="0,00" onChange={setPrice} required/></label>
     </div>
    </section>
    <div className={styles.actions}><BotaoAcaoCompacto onClick={onClose}>Cancelar</BotaoAcaoCompacto><BotaoAcaoCompacto type="submit" variante="primario" disabled={generating||photoBusy||!image}>{generating?'Gerando imagem…':'Gerar e salvar'}</BotaoAcaoCompacto></div>
   </form>}
   {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  </div>
 </DirectDialog>;
}
