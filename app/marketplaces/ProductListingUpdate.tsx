'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import {formatarMoeda} from '@/app/lib/formatters';
import {proposedListingChanges,productListingUrl,type ListingUpdateRequest} from '@/app/modules/marketplaces/product-listing-update';
import type {LocalProduct,LocalProductLink} from '@/app/modules/marketplaces/services/local-product-model';
import type {ListingSnapshot} from '@/app/modules/marketplaces/services/listing-model';
import type {ListingChanges} from '@/app/modules/marketplaces/listing-editor';
import {accountDisplayName} from './account-identification';
import type {MarketplaceAccount,marketplaceClientRequest} from './Anunciados';
import ListingEditor from './ListingEditor';
import {notifyProductStockChanged} from './product-stock-events';
import styles from './product-listing-update.module.css';
import marketplaceStyles from './marketplaces.module.css';
type Props={companyId:string;change:ListingUpdateRequest;accounts:MarketplaceAccount[];request:typeof marketplaceClientRequest;brand:string;dark:boolean;onClose:()=>void;onBusyChange:(value:boolean)=>void;onUpdated:(pending:boolean)=>void};
/** Leitura tem prazo; PATCH com timeout é incerto, nunca repetido automaticamente. */
async function bounded<T>(run:(signal:AbortSignal)=>Promise<T>,writing=false):Promise<T>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([run(controller.signal),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new Error(writing?'A atualização não foi confirmada. Recarregue o anúncio antes de tentar novamente.':'A consulta demorou. O cadastro local está salvo; tente consultar novamente.'));controller.abort();},writing?70_000:25_000);})]);}finally{clearTimeout(timer);}
}
export default function ProductListingUpdate({companyId,change,accounts,request,brand,dark,onClose,onBusyChange,onUpdated}:Props){
 const [phase,setPhase]=useState<'loading'|'question'|'review'>('loading'),[product,setProduct]=useState<LocalProduct|null>(null),[error,setError]=useState(''),[readKey,setReadKey]=useState(0);
 const [kind]=useState<'price'>('price'),[useReference,setUseReference]=useState(false);
 const [editing,setEditing]=useState<{link:LocalProductLink;snapshot:ListingSnapshot;suggestion:ListingChanges}|null>(null),[busy,setBusy]=useState(false),[outcomes,setOutcomes]=useState<Record<string,string>>({});
 const locked=useRef(false),alive=useRef(true),close=useRef(onClose);
 useEffect(()=>{close.current=onClose;},[onClose]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const controller=new AbortController();
  void bounded(s=>request(`produtos?${new URLSearchParams({empresaId:companyId,productId:change.productId})}`,undefined,AbortSignal.any([controller.signal,s]))).then(body=>{
   if(controller.signal.aborted)return;const next=body.product as LocalProduct;
   if(next?.id!==change.productId||next.empresa_id!==companyId||!Array.isArray(next.links))throw new Error('Não foi possível conferir os anúncios deste produto.');
   const links=next.links.filter(link=>!['closed','deleted','cancelled','canceled','unpublished'].includes(link.status?.toLowerCase()));
   if(!links.length){close.current();return;}setProduct({...next,links});setPhase('question');setError('');
  }).catch(failure=>{if(!controller.signal.aborted)setError(failure instanceof Error?failure.message:'Não foi possível conferir os anúncios. O cadastro local está salvo.');});
  return()=>controller.abort();
 },[companyId,change.productId,request,readKey]);
 useEffect(()=>{if(!busy)return;onBusyChange(true);return()=>onBusyChange(false);},[busy,onBusyChange]);
 const editRequest=useCallback<typeof marketplaceClientRequest>((path,body,signal,method)=>bounded(s=>request(path,body,signal?AbortSignal.any([s,signal]):s,method),method==='PATCH'),[request]);
 async function openEditor(link:LocalProductLink){
  if(locked.current||!product)return;locked.current=true;setBusy(true);setError('');
  try{
   const result=await editRequest(`anunciados/acao?${new URLSearchParams({empresaId:companyId,connectionId:link.connection_id,id:link.provider_listing_id})}`);
   if(result.listing?.id!==link.provider_listing_id)throw new Error('Não foi possível confirmar o anúncio escolhido.');
   if(alive.current)setEditing({link,snapshot:result.listing,suggestion:proposedListingChanges(product,change.fields,kind,useReference)});
  }catch(failure){if(alive.current)setError(failure instanceof Error?failure.message:'Não foi possível abrir o anúncio.');}
  finally{locked.current=false;if(alive.current)setBusy(false);}
 }
 function finish(){if(!busy&&!editing)onClose();}
 const priceChanged=change.fields.includes('price_cents');
 return <>
  {phase==='loading'&&!error&&<p role="status">Cadastro salvo. Conferindo anúncios vinculados…</p>}
  <ModalConfirmacao aberto={phase==='question'} titulo="Atualizar os anúncios também?" mensagem={`O cadastro local de “${product?.name||''}” foi salvo. Deseja revisar e enviar as alterações aos anúncios vinculados? Você escolherá o anúncio e conferirá os valores antes de enviar. Nada foi alterado no marketplace.`} textoCancelar="Somente cadastro" textoConfirmar="Revisar anúncios" variante="primaria" corPrimaria={brand} darkMode={dark} aoCancelar={onClose} aoConfirmar={()=>setPhase('review')}/>
  <CardExpandidoModal aberto={phase==='review'||(phase==='loading'&&!!error)} rotulo="Atualizar anúncios do produto" darkMode={dark} onFechar={finish}>
   <section className={`${styles.dialog} ${dark?`${styles.dark} ${marketplaceStyles.dark}`:''}`} style={{'--brand':brand}as CSSProperties} aria-busy={busy}>
    <header className={styles.header}><div><h2>Atualizar anúncios</h2><p>Cadastro local salvo{product?` · ${product.name}`:''}</p></div><BotaoAcaoCompacto disabled={busy||!!editing} onClick={finish}>Concluir</BotaoAcaoCompacto></header>
    {phase==='loading'&&!error&&<p role="status">Conferindo anúncios vinculados…</p>}
    {error&&<p role="alert">{error}</p>}
    {phase==='loading'&&error&&<BotaoAcaoCompacto onClick={()=>{setError('');setReadKey(v=>v+1);}}>Tentar novamente</BotaoAcaoCompacto>}
    {phase==='review'&&product&&!editing&&<>
     {priceChanged?<><p>Escolha a conta cujo preço deseja atualizar. Os demais dados do produto são únicos e são editados em Qualidade do anúncio na ficha do produto.</p>
     <div className={styles.price}><p>Referência local: <strong>{product.price_cents==null?'Não informada':formatarMoeda(product.price_cents/100)}</strong>. Ela não substitui automaticamente o preço anunciado.</p><label><input type="checkbox" checked={useReference} disabled={busy||!product.price_cents} onChange={e=>setUseReference(e.target.checked)}/>Usar essa referência como sugestão de preço de venda</label><small>Ou mantenha desmarcado e digite o preço no formulário do anúncio.</small></div>
     <ul className={styles.list}>{product.links.map(link=>{const account=accounts.find(a=>a.id===link.connection_id),url=productListingUrl(link);return <li key={link.id}><div><strong>{link.provider==='magalu'?'Magalu':'Mercado Livre'} · {accountDisplayName(account,link.accountName||'Conta vinculada')}</strong><small>{link.provider_listing_id} · {link.title}</small>{outcomes[link.id]&&<p role="status">{outcomes[link.id]}</p>}</div><div className={styles.actions}>{url&&<a href={url} target="_blank" rel="noopener noreferrer">Abrir anúncio ↗</a>}<BotaoAcaoCompacto disabled={busy} onClick={()=>void openEditor(link)}>Revisar preço</BotaoAcaoCompacto></div></li>;})}</ul></>:<p role="status">Os dados do cadastro foram salvos localmente. Para aplicar informações, fotos e ficha técnica a todos os anúncios vinculados, abra Qualidade do anúncio na ficha expandida do produto.</p>}
    </>}
    {editing&&<><p>Revise o anúncio de <strong>{accountDisplayName(accounts.find(a=>a.id===editing.link.connection_id),editing.link.accountName||'Conta vinculada')}</strong>. Salvar alterações envia somente para este anúncio. Para sair sem enviar, use Cancelar no formulário.</p><ListingEditor key={`${editing.link.id}:${kind}`} companyId={companyId} accountId={editing.link.connection_id} itemId={editing.link.provider_listing_id} snapshot={editing.snapshot} permalink={editing.snapshot.permalink} suggestedChanges={editing.suggestion} dark={dark} brand={brand} request={editRequest} onBusy={setBusy} onClose={()=>setEditing(null)} onSaved={(_listing,pending)=>{setOutcomes(rows=>({...rows,[editing.link.id]:pending?'Alteração enviada; aguardando confirmação do marketplace.':'Alterações confirmadas pelo marketplace.'}));if(!pending)setEditing(null);notifyProductStockChanged(companyId);onUpdated(!!pending);}}>{null}</ListingEditor></>}
   </section>
  </CardExpandidoModal>
 </>;
}
