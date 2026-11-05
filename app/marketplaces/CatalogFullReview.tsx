'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import ProductPhotoInput from './ProductPhotoInput';
import type {marketplaceClientRequest} from './Anunciados';
import type {CatalogCompletionSource} from '@/app/modules/marketplaces/catalog-completion';
import {uniqueCatalogPhotos,type CatalogPhoto} from '@/app/modules/marketplaces/catalog-photos';
import {CATALOG_COMPLETION_REQUESTED} from './product-stock-events';
import styles from './CatalogFullReview.module.css';
type Preview={productId:string;revision:number;fingerprint:string;connectionId:string;source:CatalogCompletionSource;pictures:CatalogPhoto[]};
export default function CatalogFullReview({companyId,productId,request,brand,dark,disabled,onBusy}:{companyId:string;productId:string;request:typeof marketplaceClientRequest;brand:string;dark:boolean;disabled:boolean;onBusy:(busy:boolean)=>void}){
 const [open,setOpen]=useState(false),[preview,setPreview]=useState<Preview|null>(null),[mode,setMode]=useState<'catalog'|'custom'>('catalog'),[photos,setPhotos]=useState<CatalogPhoto[]>([]);
 const [loading,setLoading]=useState(false),[sending,setSending]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[needsRefresh,setNeedsRefresh]=useState(false);
 const controller=useRef<AbortController|null>(null),locked=useRef(false),alive=useRef(true);const busy=loading||sending||uploading;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{if(!busy)return;onBusy(true);return()=>onBusy(false);},[busy,onBusy]);
 function close(){if(sending||uploading)return;controller.current?.abort();setOpen(false);setPreview(null);setLoading(false);}
 async function load(){
  if(locked.current)return;locked.current=true;setOpen(true);setPreview(null);setLoading(true);setError('');setMessage('');setNeedsRefresh(false);const abort=new AbortController();controller.current=abort;
  try{const data=await request(`catalogo/ficha?${new URLSearchParams({empresaId:companyId,productId})}`,undefined,AbortSignal.any([abort.signal,AbortSignal.timeout(45_000)]));if(!alive.current||abort.signal.aborted)return;if(data.productId!==productId)throw Error('Produto da prévia divergente.');setPreview(data);setPhotos(uniqueCatalogPhotos(data.pictures));setMode(data.source.pictures.length?'catalog':'custom');}
  catch(e){if(alive.current&&!abort.signal.aborted)setError(e instanceof Error?e.message:'Não foi possível consultar a ficha.');}
  finally{locked.current=false;if(alive.current&&!abort.signal.aborted)setLoading(false);}
 }
 async function sendPhoto(file:File|string):Promise<CatalogPhoto>{
  if(!preview)throw Error('Consulte a ficha novamente.');
  if(typeof file!=='string'&&(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)||file.size>2_621_440))throw Error('Use JPG, PNG, WebP ou AVIF de até 2,5 MB.');
  const payload=typeof file==='string'?{url:file}:{mime:file.type,base64:await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('Não foi possível ler a foto.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.readAsDataURL(file);})};
  const result=await request('catalogo/ficha/foto',{empresaId:companyId,productId,connectionId:preview.connectionId,...payload},AbortSignal.any([controller.current!.signal,AbortSignal.timeout(55_000)]));
  if(typeof result.id!=='string'||typeof result.url!=='string'||typeof result.receipt!=='string')throw Error('Não foi possível confirmar a foto.');return result;
 }
 async function addPhoto(file:File|string){
  if(locked.current||!preview)return;if(photos.length>=12)throw Error('Use até 12 fotos.');locked.current=true;setUploading(true);setError('');
  try{const photo=await sendPhoto(file);if(!alive.current)return;if(photos.some(p=>p.id===photo.id||p.url===photo.url))throw Error('Esta foto já está selecionada.');setPhotos(old=>uniqueCatalogPhotos([...old,photo]));}
  catch(e){if(alive.current)setError(e instanceof Error?e.message:'Não foi possível adicionar a foto.');throw e;}
  finally{locked.current=false;if(alive.current)setUploading(false);}
 }
 async function apply(){
  if(locked.current||!preview||needsRefresh)return;const selected=mode==='catalog'?preview.source.pictures:photos;if(!selected.length){setError('Adicione ao menos uma foto.');return;}
  locked.current=true;setSending(true);setError('');
  try{const resolved:CatalogPhoto[]=[];if(mode==='custom')for(const photo of photos){if(!alive.current)return;resolved.push(photo.id?photo:await sendPhoto(photo.url));}if(!alive.current)return;
   await request('catalogo/ficha',{empresaId:companyId,productId,revision:preview.revision,fingerprint:preview.fingerprint,confirm:true,photoMode:mode,...(mode==='custom'?{photos:resolved}:{})},AbortSignal.any([controller.current!.signal,AbortSignal.timeout(58_000)]));
   if(!alive.current)return;window.dispatchEvent(new CustomEvent(CATALOG_COMPLETION_REQUESTED,{detail:{companyId}}));setMessage('Importação agendada. Acompanhe em Contas conectadas.');setOpen(false);setPreview(null);
  }catch(e){if(alive.current){setError((e instanceof Error?e.message:'Resposta não confirmada.')+' Confira o andamento antes de repetir.');setNeedsRefresh(true);}}
  finally{locked.current=false;if(alive.current)setSending(false);}
 }
 const displayed=mode==='catalog'?preview?.source.pictures||[]:photos;
 return <>
  <BotaoAcaoCompacto disabled={disabled||busy} onClick={()=>void load()}>Usar ficha do catálogo</BotaoAcaoCompacto>{message&&<p role="status">{message}</p>}
  <CardExpandidoModal aberto={open} variante="compacto" rotulo="Importar do catálogo" darkMode={dark} onFechar={close}>
   <section className={`${styles.card} ${dark?styles.dark:''}`} style={{'--brand':brand}as CSSProperties} aria-busy={busy}>
    <header><h2>Importar do catálogo</h2><BotaoAcaoCompacto somenteIcone variante="discreto" aria-label="Fechar importação" disabled={sending||uploading} onClick={close}>×</BotaoAcaoCompacto></header>
    {loading&&<p role="status">Consultando catálogo…</p>}
    {preview&&<>
     <div className={styles.product}>{preview.source.pictures[0]&&<img src={preview.source.pictures[0].url} alt=""/>}<div><strong>{preview.source.name}</strong><small>Mercado Livre · ficha técnica e {displayed.length} foto(s)</small></div></div>
     <div className={styles.tabs} role="group" aria-label="Como importar as fotos"><BotaoAcaoCompacto variante="discreto" aria-pressed={mode==='catalog'} disabled={busy||!preview.source.pictures.length} onClick={()=>setMode('catalog')}>Padrão do catálogo</BotaoAcaoCompacto><BotaoAcaoCompacto variante="discreto" aria-pressed={mode==='custom'} disabled={busy} onClick={()=>setMode('custom')}>Personalizar fotos</BotaoAcaoCompacto></div>
     <div className={styles.gallery} aria-label="Fotos para importar">{displayed.map((photo,i)=><div className={`${styles.photo} ${i===0?styles.cover:''}`} key={photo.url}>
      <button type="button" className={styles.choose} disabled={busy||mode==='catalog'} aria-label={mode==='custom'?`Usar foto ${i+1} como capa`:`Foto ${i+1}${i===0?', capa do catálogo':''}`} aria-pressed={i===0} onClick={()=>setPhotos(old=>[old[i],...old.filter((_,index)=>index!==i)])}><img src={photo.url} alt={`Foto ${i+1}`}/></button>
      {i===0&&<span className={styles.cap}>CAPA</span>}{mode==='custom'&&<button className={styles.remove} type="button" disabled={busy} aria-label={`Remover foto ${i+1}`} onClick={()=>setPhotos(old=>old.filter((_,index)=>index!==i))}><span aria-hidden="true">×</span></button>}
     </div>)}{mode==='custom'&&<ProductPhotoInput compacto disabled={busy||photos.length>=12} onFile={addPhoto} onUrl={addPhoto}/>}</div>
     <p className={mode==='catalog'?styles.ready:styles.hint}>{mode==='catalog'?'✓ Fotos e capa prontas para usar':photos.length?'Clique na foto para escolher a capa.':'Adicione as fotos do produto.'}</p>
    </>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}{error&&!busy&&(!preview||needsRefresh)&&<BotaoAcaoCompacto onClick={()=>void load()}>Recarregar</BotaoAcaoCompacto>}
    <footer><small>Preço e estoque<br/>preservados.</small><div><BotaoAcaoCompacto disabled={sending||uploading} onClick={close}>Cancelar</BotaoAcaoCompacto><BotaoAcaoCompacto variante="primario" disabled={busy||!preview||needsRefresh||!displayed.length} onClick={()=>void apply()}>{sending?'Importando…':uploading?'Carregando…':'Importar'}</BotaoAcaoCompacto></div></footer>
   </section>
  </CardExpandidoModal>
 </>;
}
