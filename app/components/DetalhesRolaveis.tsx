'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import styles from './DetalhesRolaveis.module.css';

/** Área nativa contida. Cabeçalho pode ficar fora ou acompanhar o conteúdo como sticky. */
export default function DetalhesRolaveis({cabecalhoId,rotulo,children,className='',cabecalhoInterno=false}:{cabecalhoId:string;rotulo:string;children:ReactNode;className?:string;cabecalhoInterno?:boolean}){
 const area=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const body=area.current,header=document.getElementById(cabecalhoId);
  if(!body||!header)return;
  const main=header.closest('main');
  const navigation=[main?.querySelector('header'),main?.querySelector('[data-marketplace-selector]'),header.closest('[data-avantaprecos-viewport]')?.firstElementChild].filter((node):node is Element=>!!node);
  let frame=0;
  const measure=()=>{
   frame=0;
   const viewport=window.visualViewport;
   const height=viewport?.height??window.innerHeight;
   const offset=viewport?.offsetTop??0;
   const top=Math.max(offset,...navigation.map(node=>node.getBoundingClientRect().bottom));
   const contentTop=cabecalhoInterno?Math.max(top,body.getBoundingClientRect().top):top;
   const available=height+offset-contentTop-(cabecalhoInterno?0:header.getBoundingClientRect().height)-24;
   // Em zoom/telas muito baixas, a página continua livre para alcançar o conteúdo.
   body.style.maxBlockSize=`${Math.max(120,available)}px`;
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);
  observer?.observe(header);navigation.forEach(node=>observer?.observe(node));
  measure();
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,{passive:true});
  window.visualViewport?.addEventListener('resize',schedule);
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule);window.visualViewport?.removeEventListener('resize',schedule);};
 },[cabecalhoId,cabecalhoInterno]);
 return <div ref={area} data-product-scroll role="region" aria-label={rotulo} tabIndex={0} className={`${styles.area} ${className}`}>{children}</div>;
}
