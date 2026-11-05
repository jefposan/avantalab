'use client';
import {useEffect,useRef,useState} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import {providerName} from '@/app/modules/marketplaces/live-feed';
import {productListingActions,productListingActionNames} from '@/app/modules/marketplaces/product-listing-actions';
import type {LocalProduct,LocalProductLink} from '@/app/modules/marketplaces/services/local-product-model';
import type {ListingAction,ListingSnapshot} from '@/app/modules/marketplaces/services/listing-model';
import ListingQuality from './ListingQuality';
import ListingEditor from './ListingEditor';
import type {EditField} from '@/app/modules/marketplaces/listing-editor';
import {marketplaceCapabilities} from '@/app/modules/marketplaces/integration-contract';
import {accountDisplayName} from './account-identification';
import {notifyProductStockChanged} from './product-stock-events';
import type {MarketplaceAccount,marketplaceClientRequest} from './Anunciados';
import styles from './marketplaces.module.css';
import {productListingUrl} from '@/app/modules/marketplaces/product-listing-update';
import {loadProductListingLink} from './product-link-request';
const statusName=(status:string)=>({active:'Ativo',published:'Publicado',paused:'Pausado',inactive:'Inativo',closed:'Encerrado',deleted:'Excluído',cancelled:'Cancelado'})[status.toLowerCase()]||status||'Não confirmado';
export default function ProductLinkedListings({product,accounts,canManage,busy,dark,brand,request,onBusy,onUpdated,removalReview=false,showQuality=true}:{product:LocalProduct;accounts:MarketplaceAccount[];canManage:boolean;busy:boolean;dark:boolean;brand:string;request:typeof marketplaceClientRequest;onBusy:(busy:boolean)=>void;onUpdated:()=>void;removalReview?:boolean;showQuality?:boolean}){
 const [confirmation,setConfirmation]=useState<{link:LocalProductLink;action:ListingAction;key:string}|null>(null),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[uncertain,setUncertain]=useState<Set<string>>(()=>new Set());
 const lock=useRef(false),alive=useRef(true);
 const [permalinks,setPermalinks]=useState<Record<string,string>>({});
 const [loadingLink,setLoadingLink]=useState(''),linkLock=useRef(false),linkController=useRef<AbortController|null>(null);
 const [editing,setEditing]=useState<{link:LocalProductLink;snapshot:ListingSnapshot;field:EditField}|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;linkController.current?.abort();};},[]);
 async function loadLink(link:LocalProductLink){
  if(linkLock.current||lock.current||busy||!canManage)return;
  linkLock.current=true;setLoadingLink(link.id);setError('');setMessage('');
  const controller=new AbortController();linkController.current=controller;
  try{const url=await loadProductListingLink(request,product.empresa_id,link,controller.signal);if(alive.current&&!controller.signal.aborted){setPermalinks(previous=>({...previous,[link.id]:url}));setMessage('Link carregado. Use Abrir anúncio no marketplace.');}}
  catch(e){if(alive.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'Não foi possível carregar o link. Tente novamente.');}
  finally{linkLock.current=false;if(alive.current)setLoadingLink('');}
 }
 async function execute(link:LocalProductLink,action?:ListingAction,key?:string){
  if(lock.current||linkLock.current||busy||!canManage||(action&&uncertain.has(link.id)))return;lock.current=true;setSaving(true);onBusy(true);setError('');setMessage('');
  try{
   const result=action?await request('anunciados/acao',{empresaId:product.empresa_id,connectionId:link.connection_id,id:link.provider_listing_id,action,confirmation:link.provider_listing_id,requestKey:key},AbortSignal.timeout(55_000)):await request(`anunciados/acao?${new URLSearchParams({empresaId:product.empresa_id,connectionId:link.connection_id,id:link.provider_listing_id})}`,undefined,AbortSignal.timeout(50_000));
   if(action&&result.success!==true&&result.pending!==true)throw new Error('O marketplace não confirmou a alteração. Confira a situação antes de repetir.');
   if(alive.current){const url=productListingUrl({provider:link.provider,source_snapshot:result.listing||{}});if(url)setPermalinks(previous=>({...previous,[link.id]:url}));setConfirmation(null);setUncertain(previous=>{const next=new Set(previous);if(result.pending)next.add(link.id);else next.delete(link.id);return next;});setMessage(result.pending?'Solicitação enviada. Aguardando confirmação do marketplace; confira a situação antes de repetir.':action?'Situação confirmada pelo marketplace.':'Situação do anúncio atualizada.');notifyProductStockChanged(product.empresa_id);onUpdated();}
  }catch(e){if(alive.current){setConfirmation(null);setUncertain(previous=>new Set(previous).add(link.id));setError(`${e instanceof Error?e.message:'Não foi possível conferir a operação.'} Confira a situação antes de tentar novamente.`);if(action)notifyProductStockChanged(product.empresa_id);}}
  finally{lock.current=false;if(alive.current)setSaving(false);onBusy(false);}
 }
 return <section aria-label="Gerenciar anúncios vinculados"><h4>Anúncios vinculados</h4><p className={styles.help}>As ações afetam somente o anúncio escolhido. Cadastro, saldo e histórico do Saldão são preservados.</p>
  {product.links.length?<ul className={styles.linkedListingList}>{product.links.map(link=>{
   const account=accounts.find(a=>a.id===link.connection_id),connected=account?.status==='connected';
   const permalink=permalinks[link.id]||productListingUrl(link);
   const actions=productListingActions(link,product.listing_stock_review_at ? null : product.stock_quantity).filter(action=>!removalReview||['close','delete'].includes(action));
   return <li key={link.id} className={styles.linkedListingRow}><div><strong>{providerName(link.provider)} · {accountDisplayName(account,link.accountName||'Conta vinculada')}</strong><small>{link.provider_listing_id} · {statusName(link.status)} · {link.reported_stock??'—'} un.</small></div>
    {product.listing_stock_review_at&&link.source_snapshot?.local_registration_preserved===true&&<small>Cadastro local preservado. Confira o produto e a quantidade física Online antes de liberar a sincronização.</small>}
    {canManage&&<div className={styles.productDetailActions}>{marketplaceCapabilities(link.provider).listingRead==='api'&&<BotaoAcaoCompacto disabled={busy||saving||!!loadingLink||!connected} onClick={()=>void execute(link)}>Conferir situação</BotaoAcaoCompacto>}{actions.map(action=><BotaoAcaoCompacto key={action} variante={action==='delete'?'destrutivo':'secundario'} disabled={busy||saving||!!loadingLink||!connected||uncertain.has(link.id)} onClick={()=>setConfirmation({link,action,key:crypto.randomUUID()})}>{productListingActionNames[action]}</BotaoAcaoCompacto>)}</div>}
    <div className={styles.productDetailActions}>{permalink?<a href={permalink} target="_blank" rel="noopener noreferrer">Abrir anúncio no marketplace ↗</a>:canManage&&connected&&<BotaoAcaoCompacto aria-busy={loadingLink===link.id} disabled={busy||saving||!!loadingLink} onClick={()=>void loadLink(link)}>{loadingLink===link.id?'Carregando link…':'Carregar link do anúncio'}</BotaoAcaoCompacto>}</div>
    {canManage&&!connected&&<small>Reconecte esta conta para gerenciar o anúncio.</small>}
    {showQuality&&!removalReview&&link.provider==='mercado_livre'&&connected&&<ListingQuality key={`${link.connection_id}:${link.provider_listing_id}`} companyId={product.empresa_id} accountId={link.connection_id} itemId={link.provider_listing_id} accountName={accountDisplayName(account,link.accountName||'Conta vinculada')} request={request} dark={dark} brand={brand} disabled={busy||saving||!!editing} canManageContent={canManage} onContentBusy={onBusy} canEdit={()=>canManage} onEdit={(field,snapshot)=>setEditing({link,snapshot,field})}/>}
    {removalReview&&link.provider==='magalu'&&!['closed','deleted','cancelled','canceled','unpublished'].includes(link.status.toLowerCase())&&<small>Conclua a remoção no <a href="https://seller.magalu.com" target="_blank" rel="noopener noreferrer">portal Magalu</a> e clique em Conferir situação. Não será mostrada uma exclusão que a plataforma não confirmou.</small>}
   </li>;
  })}</ul>:<p className={styles.help}>Nenhum anúncio vinculado.</p>}
  {message&&<p role="status">{message}</p>}{error&&<p role="alert" className={styles.productStockWarning}>{error}</p>}
  {editing&&<ListingEditor key={editing.link.id} initialFocus={editing.field} companyId={product.empresa_id} accountId={editing.link.connection_id} itemId={editing.link.provider_listing_id} snapshot={editing.snapshot} permalink={editing.snapshot.permalink} dark={dark} brand={brand} request={request} onBusy={onBusy} onClose={()=>setEditing(null)} onSaved={(_listing,pending)=>{setMessage(pending?'Alteração enviada; aguarde a confirmação do Mercado Livre.':'Alterações confirmadas. Consulte novamente os objetivos para acompanhar a nova avaliação.');if(!pending)setEditing(null);notifyProductStockChanged(product.empresa_id);onUpdated();}}>{null}</ListingEditor>}
  <ModalConfirmacao aberto={!!confirmation} titulo={confirmation?`${productListingActionNames[confirmation.action]}?`:''} mensagem={confirmation?`${product.name} · ${providerName(confirmation.link.provider)} · ${confirmation.link.provider_listing_id}. ${confirmation.action==='close'?'Encerra definitivamente este anúncio. Para excluir, encerre primeiro.':confirmation.action==='delete'?'Exclui o anúncio no marketplace, sem apagar o produto ou o histórico local.':confirmation.action==='pause'?'O anúncio deixará de vender até ser reativado.':'O anúncio voltará a vender usando seu saldo Online; confira o estoque antes de confirmar.'} Outros anúncios e estoques não serão alterados.`:''} textoConfirmar={confirmation?productListingActionNames[confirmation.action]:'Confirmar'} carregando={saving} corPrimaria={brand} darkMode={dark} variante={confirmation?.action==='resume'?'primaria':'destrutiva'} aoCancelar={()=>{if(!lock.current)setConfirmation(null);}} aoConfirmar={()=>{if(confirmation)void execute(confirmation.link,confirmation.action,confirmation.key);}}/>
 </section>;
}
