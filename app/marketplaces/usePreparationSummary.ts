'use client';
import {useEffect,useRef} from 'react';

/** Mantém a prévia na altura útil, inclusive quando o rodapé entra na tela. */
export default function usePreparationSummary(identity:string){
 const area=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const layout=area.current,heading=document.getElementById('new-listing-heading');
  const rail=layout?.querySelector<HTMLElement>('[data-preparation-summary-rail]');
  if(!layout||!heading||!rail)return;
  const scroller=layout.closest<HTMLElement>('[data-product-scroll]');
  const search=scroller?.querySelector<HTMLElement>('[data-preparation-search]');
  let frame=0;
  const measure=()=>{
   frame=0;
   const viewport=window.visualViewport,height=viewport?.height??window.innerHeight,offset=viewport?.offsetTop??0;
   const navigation=parseFloat(getComputedStyle(layout).getPropertyValue('--marketplace-navigation-height'))||200;
   const headingHeight=heading.getBoundingClientRect().height;
   const searchHeight=search?.getBoundingClientRect().height??0;
   const top=(scroller?0:offset+navigation)+headingHeight+searchHeight+12;
   scroller?.style.setProperty('--preparation-heading-height',`${headingHeight}px`);
   scroller?.style.setProperty('--preparation-search-height',`${searchHeight}px`);
   const available=scroller?scroller.clientHeight-top-12:height+offset-top-24;
   const bounds=layout.getBoundingClientRect(),column=rail.getBoundingClientRect();
   const floating=!scroller&&window.innerWidth>1000&&height>500&&bounds.top<=top&&bounds.bottom>top+120;
   layout.toggleAttribute('data-summary-floating',floating);
   layout.toggleAttribute('data-summary-contained',!!scroller);
   layout.style.setProperty('--preparation-content-top',`${top}px`);
   layout.style.setProperty('--preparation-summary-height',`${Math.max(120,available)}px`);
   layout.style.setProperty('--preparation-summary-left',`${column.left}px`);
   layout.style.setProperty('--preparation-summary-width',`${column.width}px`);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
  const observer=new ResizeObserver(schedule);
  observer.observe(layout);observer.observe(heading);observer.observe(rail);
  if(scroller)observer.observe(scroller);
  if(search)observer.observe(search);
  measure();
  scroller?.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  return()=>{
   cancelAnimationFrame(frame);observer.disconnect();
   scroller?.removeEventListener('scroll',schedule);
   window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);
   window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);
   layout.removeAttribute('data-summary-floating');layout.removeAttribute('data-summary-contained');
  };
 },[identity]);
 return area;
}
