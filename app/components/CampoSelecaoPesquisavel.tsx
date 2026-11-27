'use client';
import {useEffect,useLayoutEffect,useId,useRef,useState,type CSSProperties,type Ref} from 'react';
import {createPortal} from 'react-dom';
import CampoBusca from './CampoBusca';
import {filtrarOpcoesPesquisaveis,type OpcaoSelecaoPesquisavel} from '../lib/selecao-pesquisavel';
import styles from './CampoSelecaoPesquisavel.module.css';
export type EstadoOpcoesPesquisaveis =
 | { tipo: 'carregando'; mensagem: string }
 | { tipo: 'erro'; mensagem: string; aoTentarNovamente?: () => void };

type Props={value:string;onChange:(value:string)=>void;options:OpcaoSelecaoPesquisavel[];label:string;name?:string;className?:string;disabled?:boolean;placeholder?:string;searchOnTypeOnly?:boolean;maxResults?:number;inputId?:string;inputRef?:Ref<HTMLInputElement>;invalid?:boolean;estadoOpcoes?:EstadoOpcoesPesquisaveis};
export default function CampoSelecaoPesquisavel({value,onChange,options,label,name,className,disabled=false,placeholder='Busque por código ou descrição',searchOnTypeOnly=false,maxResults=Infinity,inputId,inputRef,invalid,estadoOpcoes}:Props){
 const popup=useRef<HTMLSpanElement>(null);const [position,setPosition]=useState<CSSProperties|null>(null);
 const id=useId();const root=useRef<HTMLSpanElement>(null);const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const [active,setActive]=useState(-1);
 const selected=options.find(option=>option.value===value);const display=selected?.selectedLabel||selected?.label||value;
 const matches=filtrarOpcoesPesquisaveis(options,query,searchOnTypeOnly);
 const filtered=matches.slice(0,Math.max(1,maxResults));
 const showList=open&&!disabled&&(!searchOnTypeOnly||Boolean(query.trim()));
 useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node)&&!popup.current?.contains(event.target as Node)){setOpen(false);setQuery('');}};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 useEffect(()=>{if(open&&active>=0)popup.current?.querySelector(`[id="${id}-${active}"]`)?.scrollIntoView({block:'nearest'});},[open,active,id]);
 useLayoutEffect(()=>{if(!showList){setPosition(null);return;}const update=()=>{if(!root.current)return;const rect=root.current.getBoundingClientRect();const viewport=window.visualViewport;const top=viewport?.offsetTop||0;const bottom=top+(viewport?.height||window.innerHeight);const left=viewport?.offsetLeft||0;const width=Math.min(rect.width,(viewport?.width||window.innerWidth)-16);const below=bottom-rect.bottom-12;const above=rect.top-top-12;const upward=below<180&&above>below;const height=Math.max(44,Math.min(280,upward?above:below));const computed=getComputedStyle(root.current);const tokens=Object.fromEntries(['--av-surface','--av-border','--av-text-strong','--brand'].map(key=>[key,computed.getPropertyValue(key)]));setPosition({...tokens,position:'fixed',left:Math.max(left+8,Math.min(rect.left,left+(viewport?.width||window.innerWidth)-width-8)),top:upward?rect.top-4:rect.bottom+4,width,maxHeight:height,transform:upward?'translateY(-100%)':undefined,fontFamily:computed.fontFamily,fontSize:computed.fontSize,colorScheme:computed.colorScheme} as CSSProperties);};update();window.addEventListener('resize',update);document.addEventListener('scroll',update,true);window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);return()=>{window.removeEventListener('resize',update);document.removeEventListener('scroll',update,true);window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update);};},[showList]);
 const retry=estadoOpcoes?.tipo==='erro'?estadoOpcoes.aoTentarNovamente:undefined;
 const choose=(index:number)=>{const option=filtered[index];if(option&&!option.disabled){onChange(option.value);setOpen(false);setQuery('');setActive(-1);}};
 return <span className={styles.root} ref={root}>
  <CampoBusca id={inputId} inputRef={inputRef} className={className} name={name} role="combobox" aria-label={label} aria-invalid={invalid} aria-expanded={showList} aria-busy={showList&&estadoOpcoes?.tipo==='carregando'?true:undefined} aria-controls={`${id}-list`} aria-autocomplete="list" aria-describedby={showList&&!filtered.length&&estadoOpcoes?`${id}-status`:undefined} aria-activedescendant={showList&&active>=0&&active<filtered.length?`${id}-${active}`:undefined} disabled={disabled} value={open?query:display} placeholder={placeholder} autoComplete="off"
   onFocus={()=>{setOpen(true);setQuery('');}}
   onClick={()=>{if(!open){setOpen(true);setQuery('');}}}
   onChange={next=>{setOpen(true);setQuery(next);setActive(-1);if(!next)onChange('');}}
   onBlur={event=>{if(!root.current?.contains(event.relatedTarget as Node)&&!popup.current?.contains(event.relatedTarget as Node)){setOpen(false);setQuery('');}}}
   onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);setQuery('');}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true);if(filtered.length)setActive(current=>Math.max(0,Math.min(filtered.length-1,current+(event.key==='ArrowDown'?1:-1))));}if(event.key==='Enter'&&open){event.preventDefault();if(active>=0)choose(active);else if(filtered.length===1)choose(0);else if(showList&&!filtered.length)retry?.();}}}
  />
  {showList&&position&&createPortal(<span ref={popup} style={position} id={`${id}-list`} role="listbox" aria-label={label} className={styles.list}>
   {filtered.length?filtered.map((option,index)=><button key={option.value} id={`${id}-${index}`} type="button" role="option" disabled={option.disabled} aria-disabled={option.disabled||undefined} tabIndex={-1} aria-selected={index===active} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(index)}>{option.label}</button>):<span id={estadoOpcoes?`${id}-status`:undefined} role="status">{estadoOpcoes?.mensagem ?? 'Nenhuma opção encontrada.'}</span>}
   {!filtered.length&&retry&&<button type="button" tabIndex={-1} onMouseDown={event=>event.preventDefault()} onClick={retry}>Tentar novamente</button>}
   {matches.length>filtered.length&&<span role="status">Digite mais para refinar a busca.</span>}
  </span>,document.body)}
 </span>;
}
