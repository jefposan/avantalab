'use client';
import {useEffect,useRef,useState} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import {Icon} from '@/app/projetos/components/Icon';
import {DirectDialog} from './DirectSaleActions';
import useDirectSaleCommand from './useDirectSaleCommand';
import type {LotsRequest} from './usePriceLotCapture';
import {STOCK_SYNC_PATH,syncTarget,type StockSyncContext} from '@/app/modules/marketplaces/stock-reconciliation';
import styles from './stock-sync.module.css';
type Props={companyId:string;productId:string;request:LotsRequest;dark?:boolean;brand?:string;hint?:string;compact?:boolean;badge?:boolean;onUpdated?:()=>void;onBusyChange?:(busy:boolean)=>void};
export default function StockSync(props:Props){
 const [open,setOpen]=useState(false);
 const changed=useRef(false);
 const {onBusyChange}=props;
 useEffect(()=>{onBusyChange?.(open);return()=>onBusyChange?.(false);},[open,onBusyChange]);
 if(props.badge&&!props.hint)return null;
 return <>{props.badge?<BotaoAcaoCompacto className={styles.badge} onClick={()=>setOpen(true)}><Icon name="alert" size={14}/>{props.hint}</BotaoAcaoCompacto>:<div className={`${styles.bar} ${props.compact?styles.compact:''}`}>
  <div>{!props.compact&&<strong>Estoque dos anúncios</strong>}{props.hint&&<span className={styles.warning}><Icon name="alert" size={14}/>{props.hint}</span>}</div>
  <BotaoAcaoCompacto onClick={()=>setOpen(true)}>{props.hint?'Resolver':'Conferir saldos'}</BotaoAcaoCompacto>
 </div>}{open&&<StockSyncDialog {...props} onUpdated={()=>{changed.current=true;}} onClose={()=>{setOpen(false);if(changed.current){changed.current=false;props.onUpdated?.();}}}/>}</>;
}
export function StockSyncDialog({companyId,productId,request,dark,brand,onClose,onUpdated,initialContext}:{companyId:string;productId:string;request:LotsRequest;dark?:boolean;brand?:string;onClose:()=>void;onUpdated?:()=>void;initialContext?:StockSyncContext}){
 const [context,setContext]=useState<StockSyncContext|null>(initialContext||null),[error,setError]=useState(''),[loading,setLoading]=useState(!initialContext),[refresh,setRefresh]=useState(0);
 useEffect(()=>{if(initialContext&&refresh===0)return;const controller=new AbortController();
  void request(STOCK_SYNC_PATH,{method:'POST',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(50000)]),body:JSON.stringify({empresaId:companyId,productId,action:'review'})}).then(data=>{if(!controller.signal.aborted)setContext(data as StockSyncContext);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[companyId,productId,request,refresh,initialContext]);
 function reload(){setLoading(true);setError('');setRefresh(n=>n+1);}
 return <DirectDialog title="Sincronizar estoque Online" dark={dark} brand={brand} className={styles.dialog} onClose={onClose}><div className={styles.body}>
  {loading?<p role="status">Conferindo saldos nas contas vinculadas…</p>:error?<div role="alert"><p>{error}</p><BotaoAcaoCompacto onClick={reload}>Tentar novamente</BotaoAcaoCompacto></div>:context&&<StockSyncForm key={context.reviewId} companyId={companyId} context={context} request={request} onClose={onClose} onReview={reload} onUpdated={onUpdated}/>} 
 </div></DirectDialog>;
}
export function StockSyncForm({companyId,context,request,onClose,onReview,onUpdated}:{companyId:string;context:StockSyncContext;request:LotsRequest;onClose:()=>void;onReview:()=>void;onUpdated?:()=>void}){
 const command=useDirectSaleCommand(companyId,context.actorId,`stock-sync:${context.productId}`,request,STOCK_SYNC_PATH,false);
 const [direction,setDirection]=useState(context.localQuantity==null?'listing_to_local':'local_to_listings'),[sourceId,setSource]=useState(''),[confirmed,setConfirmed]=useState(false),[zero,setZero]=useState(false),[step,setStep]=useState(false),[saved,setSaved]=useState(false);
 const [sourcePage,setSourcePage]=useState(0);
 const pages=Math.max(1,Math.ceil(context.sources.length/3)),page=Math.min(sourcePage,pages-1);
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const pending=command.pending?.payload;
 const reviewed=(pending?.reviewSnapshot as StockSyncContext|undefined)||context;
 const selectedDirection=String(pending?.direction||direction),selectedSource=String(pending?.sourceId||sourceId);
 const target=syncTarget(reviewed,selectedDirection,selectedSource),locked=command.saving||!!command.pending;
 const unresolved=context.sources.some(s=>['mercado_livre','magalu'].includes(s.provider)&&!s.eligible&&!['closed','deleted'].includes(s.status));
 const valid=context.canManage&&target!=null&&context.sources.some(s=>s.eligible)&&!unresolved;
 const quantity=(n:number|null)=>`${n??0} un.`;
 async function apply(){if(!command.pending&&(!valid||!confirmed||(target===0&&!zero)))return;
  const ok=await command.run({action:'apply',reviewId:context.reviewId,direction,sourceId,confirmation:true,confirmZero:zero,reviewSnapshot:context});
  if(ok&&alive.current){setSaved(true);onUpdated?.();}
 }
 return <><header className={styles.identity}><strong>{context.name}</strong><small>Somente Online · demais estoques preservados</small></header>
  <div className={styles.layout}><section className={styles.balances} aria-label="Conferência dos saldos">
  <div className={styles.local}><span>AvantaLab · Online</span><strong>{quantity(reviewed.localQuantity)}</strong></div>
  {context.localQuantity==null&&<p className={styles.warning}>Saldo local ainda não informado. O zero exibido não significa estoque físico conferido.</p>}
  <section className={styles.sources} aria-label="Saldos dos anúncios"><h3>Anúncios vinculados · {context.sources.length}</h3>{context.sources.length?context.sources.slice(page*3,page*3+3).map(s=><div className={styles.source} key={s.id}><div><strong>{s.account}</strong><small>{s.listingId} · {s.status==='active'?'Ativo':s.status==='paused'?'Pausado':s.status}</small>{s.issue&&<small className={styles.warning}>{s.issue}</small>}{s.pausedBySystem&&<small>Pausado pelo sistema · não será reativado automaticamente</small>}</div><strong>{s.quantity==null?'Indisponível':quantity(s.quantity)}</strong></div>):<p>Nenhum anúncio vinculado a este cadastro.</p>}{pages>1&&<nav className={styles.sourcePages} aria-label="Páginas dos anúncios vinculados"><BotaoAcaoCompacto disabled={page===0} onClick={()=>setSourcePage(page-1)}>Anterior</BotaoAcaoCompacto><small role="status">{page+1} de {pages}</small><BotaoAcaoCompacto disabled={page===pages-1} onClick={()=>setSourcePage(page+1)}>Próxima</BotaoAcaoCompacto></nav>}</section>
  </section><section className={styles.adjustment} aria-label="Ajuste do estoque Online">
  {saved?<div className={styles.result} role="status"><strong>Solicitação registrada</strong><p>O saldo foi confirmado no AvantaLab. Os anúncios aguardam atualização e conferência pelo sincronizador.</p><p>Não considere concluído antes de conferir os retornos de cada conta.</p><BotaoAcaoCompacto onClick={onReview}>Conferir resultado</BotaoAcaoCompacto></div>:<>
   {!step&&!pending&&<><fieldset className={styles.directions} disabled={locked||!context.canManage}><legend>Como deseja corrigir?</legend>
    <label><input type="radio" name={`sync-direction-${context.productId}`} checked={selectedDirection==='local_to_listings'} disabled={context.localQuantity==null} onChange={()=>{setDirection('local_to_listings');setStep(false);setConfirmed(false);setZero(false);}}/><span>Online → anúncios<small>Envia o saldo Online do AvantaLab.</small></span></label>
    <label><input type="radio" name={`sync-direction-${context.productId}`} checked={selectedDirection==='listing_to_local'} onChange={()=>{setDirection('listing_to_local');setStep(false);setConfirmed(false);setZero(false);}}/><span>Anúncio → Online<small>Substitui o saldo local; não soma contas.</small></span></label>
   </fieldset>
   {selectedDirection==='listing_to_local'&&<label className={styles.field}>Anúncio de origem<select disabled={locked||!context.canManage} value={selectedSource} onChange={e=>{setSource(e.target.value);setStep(false);setConfirmed(false);setZero(false);}}><option value="">Selecione uma única origem</option>{context.sources.filter(s=>s.eligible).map(s=><option key={s.id} value={s.id}>{s.account} · {s.listingId}</option>)}</select></label>}</>}
   {unresolved&&<p className={styles.warning} role="status">Há anúncio sem conferência elegível. Resolva a consulta ou o vínculo antes de sincronizar o conjunto.</p>}
   {(step||pending)&&<section className={styles.confirmation} aria-label="Revisar alteração"><strong>{selectedDirection==='listing_to_local'?`Online: ${quantity(reviewed.localQuantity)} → ${target==null?'Consulte novamente':quantity(target)}`:`Anúncios vinculados → ${target==null?'Consulte novamente':quantity(target)}`}</strong>
    <small>{selectedDirection==='listing_to_local'?`Origem: ${reviewed.sources.find(s=>s.id===selectedSource)?.account || 'Indisponível'} · ${reviewed.sources.find(s=>s.id===selectedSource)?.listingId || ''}`:'Origem: estoque Online do AvantaLab'}</small>
    <p>{target===0?'Os anúncios elegíveis terão o saldo zerado e a pausa solicitada. A pausa só será confirmada após releitura.':'A quantidade será enviada aos anúncios elegíveis. Pausas manuais não serão desfeitas.'}</p>
    <label><input type="checkbox" disabled={locked} checked={pending?true:confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Conferi o estoque físico Online e autorizo esta direção e quantidade.</label>
    {target===0&&<label><input type="checkbox" disabled={locked} checked={pending?!!pending.confirmZero:zero} onChange={e=>setZero(e.target.checked)}/>Confirmo zerar o estoque Online e solicitar a pausa dos anúncios vinculados.</label>}
    {!pending&&<BotaoAcaoCompacto onClick={()=>{setStep(false);setConfirmed(false);setZero(false);}}>Alterar direção</BotaoAcaoCompacto>}
   </section>}
   {!context.canManage&&<p role="status">Solicite a permissão Editar estoque para sincronizar. A conferência está disponível para consulta.</p>}
   {pending&&<p className={styles.warning} role="status">Tentativa guardada neste aparelho. Repetir usa a mesma chave, sem duplicar. Não altere o saldo enquanto o resultado estiver incerto.</p>}
   {command.error&&<p role="alert" className={styles.warning}>{command.error}</p>}
  </>}
  </section></div>
  <footer className={styles.footer}><BotaoAcaoCompacto onClick={onClose}>{saved?'Fechar':'Cancelar'}</BotaoAcaoCompacto>{!saved&&<>{step||pending?<BotaoAcaoCompacto variante="primario" disabled={command.saving||(!pending&&(!valid||!confirmed||(target===0&&!zero)))} onClick={()=>void apply()}>{command.saving?'Sincronizando…':pending?'Repetir confirmação':'Confirmar sincronização'}</BotaoAcaoCompacto>:<BotaoAcaoCompacto variante="primario" disabled={!valid} onClick={()=>setStep(true)}>Continuar</BotaoAcaoCompacto>}</>}</footer>
 </>;
}
