'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import MarketplaceSelect from './MarketplaceSelect';
import {DirectDialog} from './DirectSaleActions';
import {productPostDestinations,productShoppingCaption,shoppingLinkPriceIssue,type ProductShoppingContext} from '@/app/modules/marketplaces/product-shopping-link';
import {postPrimaryColor,postSummary,POST_CONDITIONS,productPostConditionIssue} from '@/app/modules/marketplaces/product-post';
import type {ProductPostProps} from './ProductPost';
import styles from './product-post.module.css';
import marketplaceStyles from './marketplaces.module.css';
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
export default function ProductPostFlow({product,storageScope,request,onClose,onBusyChange,dark,primaryColor,renderImage}:ProductPostProps&{renderImage:(back?:()=>void)=>ReactNode}){
 const [context,setContext]=useState<ProductShoppingContext|null>(null),[mode,setMode]=useState<'choose'|'online'|'image'>('choose'),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [condition,setCondition]=useState('');
 const [selected,setSelected]=useState(''),[description,setDescription]=useState(()=>postSummary(product.name)),[details,setDetails]=useState(product.internalNotes||''),[caption,setCaption]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const alive=useRef(true),operation=useRef<AbortController|null>(null),locked=useRef(false);
 const destinations=context?productPostDestinations(context.stock):{online:false,image:false};
 const both=destinations.online&&destinations.image;
 const link=context?.links.find(l=>l.id===selected);
 async function read(signal:AbortSignal){
  if(!storageScope||!request)throw Error('Reabra o produto para consultar os anúncios.');
  return await request(`/api/modulos/marketplaces/precos/post/links?${new URLSearchParams({empresaId:storageScope.companyId,...(storageScope.productId?{productId:storageScope.productId}:{historyId:storageScope.historyId||''})})}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(20_000)])}) as ProductShoppingContext;
 }
 useEffect(()=>{alive.current=true;onBusyChange?.(true);return()=>{alive.current=false;operation.current?.abort();onBusyChange?.(false);};},[onBusyChange]);
 useEffect(()=>{
  if(!storageScope||!request){setMode('image');setLoading(false);return;}
  const controller=new AbortController();operation.current=controller;setLoading(true);setError('');
  void read(controller.signal).then(data=>{
   if(controller.signal.aborted||!alive.current)return;
   if(!data.stock?.warehousesReady)throw Error(data.stock?.warehouseError||'Não foi possível confirmar os estoques. Reabra o produto.');
   setContext(data);if(data.caption){setDescription(data.caption.description);setDetails(data.caption.details);}const d=productPostDestinations(data.stock);
   setMode(d.online&&d.image?'choose':d.online?'online':'image');
  }).catch(reason=>{if(!controller.signal.aborted&&alive.current)setError(reason instanceof Error?reason.message:'Não foi possível consultar os estoques.');}).finally(()=>{if(!controller.signal.aborted&&alive.current)setLoading(false);});
  return()=>controller.abort();
 },[storageScope?.companyId,storageScope?.productId,storageScope?.historyId,request]);
 const back=()=>{setMode('choose');setCaption('');setError('');setNotice('');};
 async function generate(){
  if(locked.current)return;
  if(!selected){setError('Escolha a conta e o anúncio para gerar o link.');return;}
  if(!description.trim()||description.length>180||details.length>160){setError('Informe a descrição em até 180 caracteres e os detalhes em até 160.');return;}
  const conditionIssue=productPostConditionIssue(condition,details);if(conditionIssue){setError(conditionIssue.message);return;}
  locked.current=true;setBusy(true);setError('');setNotice('');
  const controller=new AbortController();operation.current=controller;
  try{
   const current=await read(controller.signal);if(!alive.current||controller.signal.aborted)return;
   setContext(current);const chosen=current.links.find(l=>l.id===selected);
   if(!productPostDestinations(current.stock).online||!chosen)throw Error('Este anúncio não está disponível para compra. Atualize ou selecione outra conta.');
   const priceIssue=shoppingLinkPriceIssue(current.referencePriceCents,chosen);if(priceIssue)throw Error(priceIssue);
   setCaption(productShoppingCaption({description,details,condition,priceCents:chosen.priceCents,referencePriceCents:current.referencePriceCents!,url:chosen.url}));
  }catch(reason){if(alive.current&&!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Não foi possível gerar o link.');}
  finally{locked.current=false;if(alive.current)setBusy(false);}
 }
 async function copy(){try{await navigator.clipboard.writeText(caption);setNotice('Link e descrição copiados.');}catch{setError('Não foi possível copiar. Selecione e copie o texto da prévia.');}}
 async function share(){
  if(locked.current||!caption)return;locked.current=true;setBusy(true);setError('');setNotice('');
  try{if(navigator.share){await navigator.share({title:product.name,text:caption});if(alive.current)setNotice('Compartilhamento concluído.');}else await copy();}
  catch(reason){if(alive.current&&!(reason instanceof Error&&reason.name==='AbortError'))setError('Não foi possível compartilhar. Use Copiar link e descrição.');}
  finally{locked.current=false;if(alive.current)setBusy(false);}
 }
 if(!loading&&mode==='image'&&!error)return renderImage(both?back:undefined);
 return <DirectDialog title={mode==='online'?'Link de compra':'Criar post'} onClose={onClose} dark={dark} brand={postPrimaryColor(primaryColor)} className={styles.shoppingDialog}>
  <div className={`${styles.body} ${styles.shoppingBody} ${dark?marketplaceStyles.dark:''}`} data-dark={dark||undefined}>
   {(mode!=='online'||Boolean(caption))&&<strong>{product.name}</strong>}
   {loading?<p role="status">Consultando estoques e anúncios…</p>:mode==='choose'&&!error?<div className={styles.actions}>
    <BotaoAcaoCompacto variante="primario" onClick={()=>setMode('online')}>Online · Link de compra</BotaoAcaoCompacto>
    <BotaoAcaoCompacto onClick={()=>setMode('image')}>{context?.stock.warehouses.filter(w=>!w.is_online&&w.quantity!==null&&w.quantity>0).map(w=>w.name).join(' / ')||'Saldão'} · Imagem</BotaoAcaoCompacto>
   </div>:mode==='online'?<>
    {both&&(Boolean(caption)||!context?.links.length)&&<BotaoAcaoCompacto disabled={busy} onClick={back}>Escolher outro estoque</BotaoAcaoCompacto>}
    {!context?.links.length?<p role="status">Não há anúncio ativo com link de compra disponível. Confira a publicação do produto no módulo Anúncios.</p>:caption?<>
     <label className={styles.form}>Link e descrição<textarea aria-label="Link e descrição" readOnly value={caption} rows={9}/></label>
     <div className={styles.actions}><BotaoAcaoCompacto disabled={busy} onClick={()=>{setCaption('');setNotice('');}}>Alterar conta ou descrição</BotaoAcaoCompacto><BotaoAcaoCompacto disabled={busy} onClick={()=>void copy()}>Copiar link e descrição</BotaoAcaoCompacto><BotaoAcaoCompacto variante="primario" disabled={busy} onClick={()=>void share()}>Compartilhar link</BotaoAcaoCompacto></div>
    </>:<div className={styles.form}>
     <MarketplaceSelect id="post-shopping-account" label="Conta e anúncio" value={selected} options={context.links.map(l=>({value:l.id,label:`${l.accountName} · ${l.marketplace}`,detail:`${l.listingId} · ${money.format(l.priceCents/100)}`}))} placeholder="Escolha a conta" disabled={busy} onChange={setSelected}/>
     <label>Descrição<textarea rows={2} value={description} maxLength={180} disabled={busy} onChange={e=>setDescription(e.target.value)}/></label>
     <MarketplaceSelect id="post-shopping-condition" className={styles.shoppingCondition} label="Condição do produto" value={condition} options={Object.entries(POST_CONDITIONS).map(([value,label])=>({value,label}))} placeholder="Escolha a condição" disabled={busy} onChange={setCondition}/>
     <label>Detalhes<textarea rows={1} value={details} maxLength={160} required={condition==='damaged'||condition==='detailed'} disabled={busy} onChange={e=>setDetails(e.target.value)}/></label>
     <div className={styles.shoppingPrices}>
      {context.referencePriceCents!=null&&<p>De: <strong>{money.format(context.referencePriceCents/100)}</strong></p>}
      {link&&<p>Por: <strong>{money.format(link.priceCents/100)}</strong></p>}
     </div>
     <div className={`${styles.actions} ${both?styles.shoppingActions:''}`}><BotaoAcaoCompacto onClick={onClose} disabled={busy}>Cancelar</BotaoAcaoCompacto>{both&&<BotaoAcaoCompacto disabled={busy} onClick={back}>Estoque</BotaoAcaoCompacto>}<BotaoAcaoCompacto variante="primario" disabled={busy||!selected||!condition} onClick={()=>void generate()}>{busy?'Conferindo…':'Gerar link'}</BotaoAcaoCompacto></div>
    </div>}
   </>:null}
   {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
   {!loading&&error&&mode==='choose'&&<BotaoAcaoCompacto onClick={onClose}>Fechar</BotaoAcaoCompacto>}
  </div>
 </DirectDialog>;
}
