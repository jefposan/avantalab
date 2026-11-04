'use client';
import {useEffect,useRef,useState} from 'react';
import {printLabelPdf} from '@/app/modules/marketplaces/label-native-print';
import styles from './sale-actions.module.css';

export default function LabelNativePrint({url,filename,orderId,onBusyChange}:{url:string;filename:string;orderId:string;onBusyChange:(busy:boolean)=>void}) {
 const frame=useRef<HTMLIFrameElement>(null),started=useRef(false),active=useRef(true),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const [error,setError]=useState('');
 useEffect(()=>{
  active.current=true;onBusyChange(!started.current);
  timer.current=setTimeout(()=>{if(active.current&&!started.current){setError('Não foi possível abrir a impressão automaticamente. Abra o PDF para imprimir neste navegador.');onBusyChange(false);}},15000);
  return()=>{active.current=false;if(timer.current)clearTimeout(timer.current);onBusyChange(false);};
 },[onBusyChange]);
 function loaded(){
  if(!active.current||started.current)return;
  if(frame.current?.contentDocument?.URL==='about:blank')return;
  started.current=true;if(timer.current)clearTimeout(timer.current);
  // Chrome may fire iframe load before its built-in PDF reader is ready.
  timer.current=setTimeout(()=>{if(!active.current)return;try{printLabelPdf(frame.current?.contentWindow||null);}catch{if(active.current)setError('O navegador não abriu a impressão. Abra o PDF em outra guia e imprima por lá.');}finally{if(active.current)onBusyChange(false);}},1000);
 }
 return <><iframe ref={frame} src={url} title={`PDF para impressão do Pedido #${orderId}`} className={styles.nativePrintFrame} tabIndex={-1} aria-hidden="true" onLoad={loaded}/>{error&&<p className={styles.documentFeedback} role="alert">{error} <a href={url} target="_blank" rel="noopener noreferrer">Abrir PDF ↗</a> · <a href={url} download={filename}>Baixar PDF</a></p>}</>;
}
