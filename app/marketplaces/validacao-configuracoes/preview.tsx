'use client';
import { useCallback, useRef, useState } from 'react';
import PriceUsersPanel from '../PriceUsersPanel';
import { DEFAULT_PRICE_SETTINGS, type PriceSettings } from '@/app/modules/marketplaces/price-settings';
import type { PriceSettingsRequest } from '../usePriceSettings';

const company = '00000000-0000-4000-8000-000000000001';
const initialUsers = Array.from({length:6}, (_,i)=>({id:`demo-${i}`,user_id:`demo-user-${i}`,nome:i===0?'Jefferson Ferreira':`Usuário demonstrativo ${i+1}`,login:i===0?'jeff':`consulta${i+1}`,ativo:true,can_edit_stock:false,created_at:'2026-10-19',updated_at:'2026-10-19'}));
export default function Preview() {
  const [settings,setSettings] = useState<PriceSettings>(structuredClone(DEFAULT_PRICE_SETTINGS));
  const [open,setOpen] = useState(true), [dark,setDark] = useState(false), [writes,setWrites] = useState(0);
  const users = useRef(structuredClone(initialUsers)), current = useRef(settings), fail = useRef(false), hold = useRef(false), pending = useRef<(() => void) | null>(null);
  const request: PriceSettingsRequest = useCallback(async(path,options)=>{
    if(!path.startsWith('/api/modulos/marketplaces/precos/'))throw Error('Prévia sem rede: destino inválido.');
    if(!options?.method)return {users:structuredClone(users.current)};
    if(hold.current){hold.current=false;await new Promise<void>(done=>{pending.current=done;});}
    if(fail.current){fail.current=false;throw Error('Falha simulada. Corrija ou tente novamente.');}
    const body = JSON.parse(String(options.body));
    if(path.endsWith('/configuracoes')){
      if(body.revision!==current.current.revision)throw Error('Configurações alteradas. Recarregue.');
      current.current={...current.current,percentages:body.percentages,theme:body.theme,revision:current.current.revision+1};
      setWrites(n=>n+1);return {settings:structuredClone(current.current)};
    }
    if(options.method==='POST'){
      if(!body.nome?.trim()||!body.login?.trim()||body.senha?.length<8)throw Error('Informe nome, login e senha com pelo menos 8 caracteres.');
      users.current.unshift({...initialUsers[0],id:crypto.randomUUID(),nome:body.nome,login:body.login,can_edit_stock:body.can_edit_stock===true});
    } else if(options.method==='PATCH'){
      const user=users.current.find(u=>u.id===body.id);if(!user)throw Error('Usuário não encontrado.');
      user.nome=body.nome;user.login=body.login;user.can_edit_stock=body.can_edit_stock===true;
      setWrites(n=>n+1);return {user:structuredClone(user)};
    } else if(options.method==='DELETE') users.current=users.current.filter(u=>u.id!==body.id);
    else throw Error('Operação não simulada.');
    setWrites(n=>n+1);return {};
  },[]);
  return <main style={{minHeight:'100dvh',background:dark?'#0f172a':'#eff4f8',color:dark?'#f8fafc':'#334155',padding:24}}>
    <h1>Prévia local — configurações compactas</h1><p>Somente dados fictícios em memória; nenhum login ou banco real alterado. Gravações simuladas: {writes}.</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}><button onClick={()=>setOpen(true)}>Abrir configurações</button><button onClick={()=>setDark(v=>!v)}>Alternar tema da prévia</button><button onClick={()=>{fail.current=true;}}>Falhar próxima gravação</button><button onClick={()=>{hold.current=true;}}>Reter próxima gravação</button><button onClick={()=>{pending.current?.();pending.current=null;}}>Liberar gravação</button></div>
    {open&&<PriceUsersPanel companyId={company} settings={settings} settingsError="" brand="#d00000" dark={dark} request={request} onClose={()=>setOpen(false)} onSettingsSaved={value=>{current.current=value;setSettings(value);}} onReloadSettings={()=>setSettings(structuredClone(current.current))}/>}
  </main>;
}
