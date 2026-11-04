'use client';
import {useEffect,useId,useRef,useState} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import LoadingPontos from '@/app/components/LoadingPontos';
import {droppedProductPhoto} from '@/app/modules/marketplaces/product-photo-transfer';
import styles from './ProductPhotoInput.module.css';
type PhotoResult=void|string|Promise<void|string>;
/** Seleção, carregamento e resultado ficam na mesma área; envio pertence ao consumidor. */
export default function ProductPhotoInput({disabled,error='',onFile,onUrl,compacto=false}:{disabled:boolean;error?:string;onFile:(file:File)=>PhotoResult;onUrl:(url:string)=>PhotoResult;compacto?:boolean}){
 const input=useRef<HTMLInputElement>(null),lock=useRef(false),alive=useRef(true),help=useId();
 const [dragging,setDragging]=useState(false),[feedback,setFeedback]=useState({loading:false,error:'',message:''});
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const blocked=disabled||feedback.loading,photoError=feedback.error||error;
 async function run(send:()=>PhotoResult){
  if(blocked||lock.current)return;lock.current=true;setFeedback({loading:true,error:'',message:''});
  try{const message=await send();if(alive.current)setFeedback({loading:false,error:'',message:typeof message==='string'?message:''});}
  catch(e){if(alive.current)setFeedback({loading:false,error:e instanceof Error?e.message:'Não foi possível adicionar a imagem.',message:''});}
  finally{lock.current=false;}
 }
 return <div className={`${styles.dropArea} ${compacto?styles.compact:''} ${dragging&&!blocked?styles.dragging:''}`} aria-label="Adicionar imagens do produto" aria-disabled={blocked} aria-busy={feedback.loading}
  onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect=blocked?'none':'copy';if(!blocked)setDragging(true);}}
  onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setDragging(false);}}
  onDrop={async event=>{event.preventDefault();setDragging(false);if(blocked||lock.current)return;try{const photo=droppedProductPhoto(event.dataTransfer);await run(()=>photo.file?onFile(photo.file):onUrl(photo.url!));}catch(e){setFeedback({loading:false,error:(e as Error).message,message:''});}}}>
  <p id={help} className={styles.help}>Arraste uma imagem para cá, do computador ou de outra página.</p>
  <BotaoAcaoCompacto variante={compacto?'secundario':'primario'} disabled={blocked} aria-label={compacto?'Adicionar fotos do computador':undefined} aria-describedby={help} onClick={()=>input.current?.click()}>{compacto?<><span aria-hidden="true">＋</span><small>Adicionar</small></>:'Adicionar fotos do computador'}</BotaoAcaoCompacto>
  <input ref={input} hidden type="file" aria-label="Selecionar foto do produto" accept="image/jpeg,image/png,image/webp,image/avif" disabled={blocked} onChange={async event=>{const file=event.target.files?.[0];event.target.value='';if(file)await run(()=>onFile(file));}}/>
  {feedback.loading?<div className={styles.status} role="status"><LoadingPontos compacto cor="currentColor"/><span>Carregando…</span></div>:photoError?<p role="alert" className={styles.error}>{photoError}</p>:feedback.message?<p role="status" className={styles.message}>{feedback.message}</p>:null}
 </div>;
}
