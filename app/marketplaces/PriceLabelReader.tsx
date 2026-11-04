'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import {DirectDialog} from './DirectSaleActions';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import {shippingLabelId,type LabelResult} from '@/app/modules/marketplaces/shipping-label';
import type {LotsRequest} from './usePriceLotCapture';
import styles from './price-label-reader.module.css';
export function LabelProducts({result}:{result:LabelResult}){
 return <div className={styles.products}><dl className={styles.labelCode}><dt>Código da etiqueta</dt><dd>{result.shipmentId}</dd></dl>{result.products.map((p,i)=><article key={i} className={styles.product}>{p.image?<img src={p.image} alt={p.description} referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>:<div className={styles.noPhoto}>Foto indisponível</div>}<h3>{p.description}</h3><dl className={styles.ean}><dt>EAN do produto</dt><dd>{p.ean||'Não informado'}</dd></dl></article>)}</div>;
}
export function LabelResultDialog({result,onClose,dark,brand}:{result:LabelResult;onClose:()=>void;dark?:boolean;brand?:string}){
 return <DirectDialog title={result.products.length>1?'Produtos da etiqueta':'Produto da etiqueta'} closeInFooter onClose={onClose} dark={dark} brand={brand}><LabelProducts result={result}/></DirectDialog>;
}
function LabelCamera({stream,onRead,onError}:{stream:MediaStream;onRead:(id:string)=>void;onError:(message:string)=>void}){
 const video=useRef<HTMLVideoElement>(null),[message,setMessage]=useState('Aponte para o QR da etiqueta Mercado Livre.');
 useEffect(()=>{let alive=true,read=false,controls:{stop:()=>void}|undefined;
  void import('@zxing/browser').then(async({BrowserMultiFormatReader,BarcodeFormat})=>{
   if(!alive||!video.current)return;const reader=new BrowserMultiFormatReader();reader.possibleFormats=[BarcodeFormat.QR_CODE];
   const next=await reader.decodeFromStream(stream,video.current,result=>{if(!alive||read||!result)return;const id=shippingLabelId(result.getText());if(!id){setMessage('QR não reconhecido. Aponte para o QR da etiqueta Mercado Livre.');return;}read=true;stream.getTracks().forEach(t=>t.stop());onRead(id);});controls=next;if(!alive||read)next.stop();
  }).catch(()=>{if(alive)onError('Não foi possível abrir o leitor. Feche e tente novamente.');});
  return()=>{alive=false;controls?.stop();};
 },[stream,onRead,onError]);
 return <div className={styles.capture}><div className={styles.videoWrap}><video ref={video} autoPlay muted playsInline aria-label="Câmera para ler o QR da etiqueta"/><span aria-hidden="true"/></div><p role="status">{message}</p></div>;
}
export default function PriceLabelReader({companyId,request,dark=false,brand='#003e73',disabled,className}:{companyId:string;request:LotsRequest;dark?:boolean;brand?:string;disabled?:boolean;className?:string}){
 const [open,setOpen]=useState(false),[stream,setStream]=useState<MediaStream|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<LabelResult|null>(null);
 const generation=useRef(0),activeStream=useRef<MediaStream|null>(null),controller=useRef<AbortController|null>(null);
 const stop=useCallback(()=>{generation.current++;controller.current?.abort();activeStream.current?.getTracks().forEach(t=>t.stop());activeStream.current=null;},[]);
 const close=useCallback(()=>{stop();setOpen(false);setStream(null);setResult(null);setError('');setBusy(false);},[stop]);
 useEffect(()=>()=>stop(),[companyId,stop]);
 // Mudança de perfil desmonta este leitor (key no consumidor); sem resultados entre perfis.
 const lookup=useCallback(async(id:string)=>{const run=++generation.current;activeStream.current?.getTracks().forEach(t=>t.stop());setStream(null);setBusy(true);setError('');const abort=new AbortController();controller.current=abort;
  try{const data=await request('/api/modulos/marketplaces/precos/etiqueta',{method:'POST',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(55000)]),body:JSON.stringify({empresaId:companyId,shipmentId:id})}) as LabelResult;if(run!==generation.current)return;if(data.shipmentId!==id||!Array.isArray(data.products)||!data.products.length)throw Error('Os produtos desta etiqueta não foram confirmados.');setResult(data);
  }catch(e){if(run===generation.current)setError(e instanceof Error?e.message:'Não foi possível consultar esta etiqueta.');}finally{if(run===generation.current)setBusy(false);}
 },[companyId,request]);
 const cameraError=useCallback((message:string)=>{activeStream.current?.getTracks().forEach(t=>t.stop());setStream(null);setError(message);},[]);
 function start(){if(disabled)return;stop();const run=generation.current;setResult(null);setError('');setBusy(false);setStream(null);setOpen(true);
  if(!navigator.mediaDevices?.getUserMedia){setError('Câmera indisponível. Abra em HTTPS ou localhost e permita o acesso à câmera.');return;}
  // A solicitação nasce diretamente do gesto do usuário, sem uma confirmação extra do app.
  void navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}}).then(s=>{if(run!==generation.current){s.getTracks().forEach(t=>t.stop());return;}activeStream.current=s;setStream(s);}).catch(()=>{if(run===generation.current)setError('Não foi possível acessar a câmera. Confira a permissão do aparelho e abra Ler etiqueta novamente.');});
 }
 return <><button type="button" disabled={disabled} className={className||styles.trigger} style={{'--brand':brand} as CSSProperties} onClick={start}><span><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6"/><path d="M7 7h3v3H7zm7 0h3v3h-3zM7 14h3v3H7zm7 0h3v3h-3z"/></svg></span><strong>Ler etiqueta</strong><small>QR Mercado Livre</small></button>
 {open&&(result?<LabelResultDialog result={result} onClose={close} dark={dark} brand={brand}/>:<DirectDialog title="Ler etiqueta" closeInFooter onClose={close} dark={dark} brand={brand}>{error?<p className={styles.message} role="alert">{error}</p>:busy?<CarregamentoDadosModulo ativo variante="local" titulo="Produto da etiqueta" mensagem="Localizando o produto…" corPrimaria={brand} temaEscuro={dark}/>:stream?<LabelCamera stream={stream} onRead={lookup} onError={cameraError}/>:<p className={styles.message} role="status">Abrindo câmera…</p>}</DirectDialog>)}
 </>;
}
