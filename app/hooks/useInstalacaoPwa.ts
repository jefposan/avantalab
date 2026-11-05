'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

export interface EventoInstalacaoPwa extends Event {
  prompt:()=>Promise<unknown>;
  userChoice:Promise<{outcome:'accepted'|'dismissed';platform?:string}>;
}
export function plataformaInstalacaoPwa(userAgent:string,platform:string,touchPoints:number):'ios'|'android'|'desktop'{
  if(/iPad|iPhone|iPod/i.test(userAgent)||(platform==='MacIntel'&&touchPoints>1))return 'ios';
  return /Android/i.test(userAgent)?'android':'desktop';
}
export default function useInstalacaoPwa(){
  const [ready,setReady]=useState(false),[installed,setInstalled]=useState(false),[platform,setPlatform]=useState<'ios'|'android'|'desktop'>('desktop');
  const [busy,setBusy]=useState(false),[instructions,setInstructions]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const prompt=useRef<EventoInstalacaoPwa|null>(null),locked=useRef(false),active=useRef(false),generation=useRef(0);
  useEffect(()=>{
    generation.current++;
    active.current=true;
    const display=window.matchMedia('(display-mode: standalone)');
    const standalone=()=>display.matches||!!(navigator as Navigator&{standalone?:boolean}).standalone;
    const update=()=>{if(standalone()){generation.current++;prompt.current=null;locked.current=false;setInstalled(true);setBusy(false);setInstructions(false);setMessage('');}else setInstalled(false);};
    const capture=(event:Event)=>{event.preventDefault();prompt.current=event as EventoInstalacaoPwa;setError('');};
    const complete=()=>{generation.current++;prompt.current=null;locked.current=false;setInstalled(true);setBusy(false);setInstructions(false);setMessage('');};
    window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',complete);display.addEventListener('change',update);
    const frame=requestAnimationFrame(()=>{if(!active.current)return;setPlatform(plataformaInstalacaoPwa(navigator.userAgent,navigator.platform,navigator.maxTouchPoints));update();setReady(true);});
    return()=>{active.current=false;cancelAnimationFrame(frame);prompt.current=null;window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',complete);display.removeEventListener('change',update);};
  },[]);
  const install=useCallback(async()=>{
    if(locked.current||!active.current)return;
    setError('');setMessage('');
    const event=prompt.current;
    if(!event){setInstructions(true);return;}
    prompt.current=null;locked.current=true;setBusy(true);setInstructions(false);
    const ticket=++generation.current;
    let timeout:ReturnType<typeof setTimeout>|undefined;
    try{
      // O gesto do clique precisa chegar diretamente ao navegador.
      const pending=event.prompt();
      const choice=await Promise.race([Promise.resolve(pending).then(()=>event.userChoice),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('install_timeout')),30_000);})]);
      if(!active.current||ticket!==generation.current)return;
      if(choice.outcome==='accepted')setMessage('Instalação solicitada. Conclua as etapas do navegador.');
      // Aceitar o prompt não comprova instalação. appinstalled/standalone confirmam.
    }catch{
      if(active.current&&ticket===generation.current){setError('Não foi possível abrir a instalação. Siga as instruções abaixo.');setInstructions(true);}
    }finally{
      if(timeout)clearTimeout(timeout);
      if(active.current&&ticket===generation.current){locked.current=false;setBusy(false);}
    }
  },[]);
  const closeInstructions=useCallback(()=>{setInstructions(false);setError('');},[]);
  return {ready,installed,platform,busy,instructions,message,error,install,closeInstructions};
}
export type EstadoInstalacaoPwa=ReturnType<typeof useInstalacaoPwa>;
