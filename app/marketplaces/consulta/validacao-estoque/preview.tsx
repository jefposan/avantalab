'use client';
import { useCallback, useRef, useState } from 'react';
import PriceProductStock from '../../PriceProductStock';
import ProductPost from '../../ProductPost';
const company='00000000-0000-4000-8000-000000000001', product='00000000-0000-4000-8000-000000000002';
export default function Preview() {
  const [scenario,setScenario]=useState(0),[dark,setDark]=useState(false),[reader,setReader]=useState(false),[writes,setWrites]=useState(0),[busy,setBusy]=useState(false);
  const [post,setPost]=useState(false),[savedNotes,setSavedNotes]=useState('Embalagem aberta. Produto completo e testado.');
  const [wide,setWide]=useState(false);
  const notes=useRef({value:'Embalagem aberta. Produto completo e testado.',revision:1});
  const data=useRef({quantity:null as number|null,revision:1}), receipts=useRef(new Map<string,unknown>()), pending=useRef<(() => void)|null>(null), hold=useRef(false), fail=useRef(false);
  const balances=useRef([{id:'online',name:'Online',is_online:true,quantity:3 as number|null,revision:1,confirmed_at:new Date().toISOString() as string|null},{id:'saldao',name:'Saldão',is_online:false,quantity:2 as number|null,revision:1,confirmed_at:new Date().toISOString() as string|null}]);
  const request=useCallback(async(_path:string,options?:RequestInit)=>{
    const body=JSON.parse(String(options?.body||'{}'));
    const stock=()=>({productId:product,quantity:balances.current[0].quantity,confirmed:balances.current[0].quantity!=null,revision:data.current.revision,canManage:!reader,warehousesReady:true,warehouses:structuredClone(balances.current),internalNotes:notes.current.value,internalNotesRevision:notes.current.revision,internalNotesAvailable:true,syncLinkedCount:0});
    if (_path.endsWith('/vendas-diretas')) {
      if (body.action !== 'context') throw Error('Esta prévia é somente de entrada/ajuste de estoque.');
      return {...stock(),actorId:'preview',canSell:false,canWithdraw:false,product:{id:product,name:'Produto de exemplo',ean:'7908103790527',picture:null,referenceCents:21909},percentages:{minimum:50,medium:70,ideal:90}};
    }
    if(body.action==='context')return {stock:stock()};
    if(receipts.current.has(body.requestKey))return receipts.current.get(body.requestKey);
    if(hold.current){hold.current=false;await new Promise<void>(done=>{pending.current=done;});}
    if(fail.current){fail.current=false;throw Error('Falha de rede simulada.');}
    const selected=balances.current.find(w=>w.id===body.warehouseId);
    if(!selected||body.revision!==selected.revision)throw Error('O cadastro foi atualizado por outra operação. Atualize antes de salvar.');
    const destination=balances.current.find(w=>w.id===body.destinationId);
    if(body.internalNotes!==undefined && body.internalNotesRevision!==notes.current.revision)throw Error('Observações alteradas. Atualize antes de salvar.');
    if(body.action==='transfer'&&(!destination||destination.id===selected.id||body.destinationRevision!==destination.revision||Number(selected.quantity)<body.quantity))throw Error('Confira a origem, o destino e o saldo.');
    if(body.action==='transfer'&&destination){destination.quantity=(destination.quantity||0)+body.quantity;destination.revision++;selected.quantity=Number(selected.quantity)-body.quantity;}
    else selected.quantity=body.action==='add'?(selected.quantity||0)+body.quantity:body.quantity;
    selected.revision++;selected.confirmed_at=new Date().toISOString();data.current.revision++;setWrites(n=>n+1);
    if(body.internalNotes!==undefined){notes.current={value:body.internalNotes,revision:notes.current.revision+1};setSavedNotes(body.internalNotes);}
    const response={stock:stock()};receipts.current.set(body.requestKey,response);return response;
  },[reader]);
  return <main style={{minHeight:'100vh',background:dark?'#142338':'#eff5f9',color:dark?'#edf4fc':'#1f3044',padding:12}}>
    <section style={{maxWidth:wide?760:540,margin:'0 auto',background:dark?'#1b3048':'white',padding:14,borderRadius:20}}>
      <small>AvantaPreços · prévia local fictícia, sem banco</small><h1 style={{fontSize:22}}>Produto consultado</h1>
      <details style={{marginBottom:16}}><summary>Controles de teste</summary>
      <button onClick={()=>setWide(v=>!v)}>Alternar largura Web</button>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}><button disabled={busy} onClick={()=>setDark(v=>!v)}>Alternar tema</button><button disabled={busy} onClick={()=>{setReader(v=>!v);setScenario(n=>n+1);}}>Alternar permissão</button><button disabled={busy} onClick={()=>{data.current={quantity:null,revision:1};balances.current=balances.current.map(w=>({...w,quantity:null,confirmed_at:null,revision:1}));receipts.current.clear();setWrites(0);setScenario(n=>n+1);}}>Novo produto</button><button disabled={busy} onClick={()=>{hold.current=true;}}>Reter próxima gravação</button><button onClick={()=>{pending.current?.();pending.current=null;}}>Liberar gravação</button><button disabled={busy} onClick={()=>{fail.current=true;}}>Falhar próxima gravação</button><button disabled={busy} onClick={()=>{data.current.revision++;balances.current.forEach(w=>w.revision++);}}>Simular alteração concorrente</button><button disabled={busy} onClick={()=>setScenario(n=>n+1)}>Reabrir histórico</button></div>
      </details>
      <PriceProductStock compactSummary dark={dark} key={scenario} companyId={company} productId={product} request={request} onBusyChange={setBusy}/>
      <button disabled={busy} onClick={()=>setPost(true)}>Criar post com observações</button>
      {post&&<ProductPost product={{id:product,name:'Fritadeira Airfryer Philips Walita 127V',description:'Produto de exemplo para avaliação local',image:'https://http2.mlstatic.com/D_643328-MLA99931158063_112025-O.jpg',internalNotes:savedNotes}} companyName="SALDÃO ALINE" referencePrice={219.09} prices={{minimum:109.55,medium:153.36,ideal:197.18}} dark={dark} onClose={()=>setPost(false)}/>}
      <h2 style={{fontSize:18}}>Fritadeira Airfryer — produto fictício de exemplo</h2><p>EAN 8720389031151</p><p>Referência: R$ 219,09</p><p role="status">Movimentações confirmadas nesta prévia: {writes}</p>
    </section>
  </main>;
}
