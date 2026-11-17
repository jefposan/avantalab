'use client';
import {useEffect,useId,useRef,useState} from 'react';
import CampoBusca from './CampoBusca';
import {normalizarTexto} from '../lib/formatters';
import styles from './CampoSelecaoPesquisavel.module.css';
type Option={value:string;label:string};
export default function CampoSelecaoPesquisavel({value,onChange,options,label,name,className,disabled=false,placeholder='Busque por código ou descrição'}:{value:string;onChange:(value:string)=>void;options:Option[];label:string;name?:string;className?:string;disabled?:boolean;placeholder?:string}){
 const id=useId();const root=useRef<HTMLSpanElement>(null);const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const [active,setActive]=useState(-1);
 const selected=options.find(option=>option.value===value);const display=selected?.label||value;
 const filtered=options.filter(option=>normalizarTexto(option.label).includes(normalizarTexto(query)));
 useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node)){setOpen(false);setQuery('');}};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 useEffect(()=>{if(open&&active>=0)root.current?.querySelector(`[id="${id}-${active}"]`)?.scrollIntoView({block:'nearest'});},[open,active,id]);
 const choose=(index:number)=>{const option=filtered[index];if(option){onChange(option.value);setOpen(false);setQuery('');setActive(-1);}};
 return <span className={styles.root} ref={root}><CampoBusca className={className} name={name} role="combobox" aria-label={label} aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={open&&active>=0?`${id}-${active}`:undefined} disabled={disabled} value={open?query:display} placeholder={placeholder} autoComplete="off" onFocus={()=>{setOpen(true);setQuery('');}} onClick={()=>{if(!open){setOpen(true);setQuery('');}}} onChange={next=>{setOpen(true);setQuery(next);setActive(-1);if(!next)onChange('');}} onBlur={event=>{if(!root.current?.contains(event.relatedTarget as Node)){setOpen(false);setQuery('');}}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setOpen(false);setQuery('');}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true);setActive(current=>Math.max(0,Math.min(filtered.length-1,current+(event.key==='ArrowDown'?1:-1))));}if(event.key==='Enter'&&open){event.preventDefault();if(active>=0)choose(active);else if(filtered.length===1)choose(0);}}}/>{open&&!disabled&&<span id={`${id}-list`} role="listbox" aria-label={label} className={styles.list}>{filtered.length?filtered.map((option,index)=><button key={option.value} id={`${id}-${index}`} type="button" role="option" tabIndex={-1} aria-selected={index===active} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(index)}>{option.label}</button>):<span role="status">Nenhuma opção encontrada.</span>}</span>}</span>;
}
