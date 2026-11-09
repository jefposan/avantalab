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
 type BulkAction = 'resume' | 'pause';
 const [bulk, setBulk] = useState<{ action: BulkAction; companyId: string; productId: string; links: LocalProductLink[] } | null>(null);
 const [bulkResults, setBulkResults] = useState<{ id: string; label: string; message: string; confirmed: boolean }[]>([]);
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
 const onlineQuantity = product.listing_stock_review_at ? null : product.stock_quantity;
 const targetsFor = (action: BulkAction) => product.links.filter(link =>
  accounts.some(account => account.id === link.connection_id && account.status === 'connected') &&
  !uncertain.has(link.id) && productListingActions(link, onlineQuantity).includes(action),
 );
 const activateTargets = targetsFor('resume');
 const pauseTargets = targetsFor('pause');
 const bulkLabel = bulk?.action === 'resume' ? 'Ativar todos' : 'Pausar todos';
 const targetLabel = (link: LocalProductLink) =>
  `${accountDisplayName(accounts.find(account => account.id === link.connection_id), link.accountName || 'Conta vinculada')} · ${link.provider_listing_id}`;
 const sendAction = (link: LocalProductLink, action: ListingAction, requestKey: string | undefined, source: string) =>
  request('anunciados/acao', {
   empresaId: product.empresa_id, connectionId: link.connection_id, id: link.provider_listing_id,
   action, confirmation: link.provider_listing_id, requestKey, source,
  }, AbortSignal.timeout(55_000));
 function openBulk(action: BulkAction, links: LocalProductLink[]) {
  if (lock.current || linkLock.current || busy || !canManage || removalReview || !links.length) return;
  setBulk({ action, companyId: product.empresa_id, productId: product.id, links });
 }
 async function executeBulk() {
  if (!bulk || lock.current || linkLock.current || busy || !canManage || removalReview) return;
  const currentTargets = targetsFor(bulk.action);
  if (bulk.companyId !== product.empresa_id || bulk.productId !== product.id || bulk.links.length !== currentTargets.length ||
      bulk.links.some(link => !currentTargets.some(current => current.id === link.id && current.connection_id === link.connection_id && current.provider_listing_id === link.provider_listing_id))) {
   setBulk(null);
   setError('As contas, o saldo ou a situação dos anúncios mudaram. Revise a seleção antes de confirmar.');
   return;
  }
  lock.current = true;
  setSaving(true);
  onBusy(true);
  setError('');
  setMessage('');
  setBulkResults([]);
  const outcomes: typeof bulkResults = [];
  const toCheck = new Set<string>();
  try {
   for (const link of bulk.links) {
    if (!alive.current) break;
    const label = targetLabel(link);
    try {
     const result = await sendAction(link, bulk.action, crypto.randomUUID(), 'produto_lote');
     const confirmed = result.success === true && result.pending !== true;
     if (!confirmed) toCheck.add(link.id);
     outcomes.push({ id: link.id, label, confirmed, message: confirmed
      ? bulk.action === 'resume' ? 'Ativo confirmado.' : 'Pausa confirmada.'
      : 'Situação ainda sem confirmação. Use Conferir situação antes de repetir.' });
    } catch (failure) {
     toCheck.add(link.id);
     outcomes.push({ id: link.id, label, confirmed: false, message: failure instanceof Error ? failure.message : 'Falha na operação. Confira a situação.' });
    }
   }
  } finally {
   lock.current = false;
   if (alive.current) {
    setUncertain(previous => new Set([...previous, ...toCheck]));
    setBulkResults(outcomes);
    setBulk(null);
    setSaving(false);
    notifyProductStockChanged(bulk.companyId);
    onUpdated();
   }
   onBusy(false);
  }
 }
 async function execute(link:LocalProductLink,action?:ListingAction,key?:string){
  if(lock.current||linkLock.current||busy||!canManage||(action&&uncertain.has(link.id)))return;lock.current=true;setSaving(true);onBusy(true);setError('');setMessage('');
  try{
   const result=action?await sendAction(link, action, key, 'produto_individual'):await request(`anunciados/acao?${new URLSearchParams({empresaId:product.empresa_id,connectionId:link.connection_id,id:link.provider_listing_id})}`,undefined,AbortSignal.timeout(50_000));
   if(action&&result.success!==true&&result.pending!==true)throw new Error('O marketplace não confirmou a alteração. Confira a situação antes de repetir.');
   if(alive.current){const url=productListingUrl({provider:link.provider,source_snapshot:result.listing||{}});if(url)setPermalinks(previous=>({...previous,[link.id]:url}));setConfirmation(null);setUncertain(previous=>{const next=new Set(previous);if(result.pending)next.add(link.id);else next.delete(link.id);return next;});setMessage(result.pending?'Solicitação enviada. Aguardando confirmação do marketplace; confira a situação antes de repetir.':action?'Situação confirmada pelo marketplace.':'Situação do anúncio atualizada.');notifyProductStockChanged(product.empresa_id);onUpdated();}
  }catch(e){if(alive.current){setConfirmation(null);setUncertain(previous=>new Set(previous).add(link.id));setError(`${e instanceof Error?e.message:'Não foi possível conferir a operação.'} Confira a situação antes de tentar novamente.`);if(action)notifyProductStockChanged(product.empresa_id);}}
  finally{lock.current=false;if(alive.current)setSaving(false);onBusy(false);}
 }
 return <section aria-label="Gerenciar anúncios vinculados"><h4>Anúncios vinculados</h4>{canManage && !removalReview && product.links.length > 1 && <>
   <p className={styles.help}>As ações em lote se aplicam aos anúncios elegíveis deste produto nas contas conectadas.</p>
   <div className={styles.productDetailActions}>
    <BotaoAcaoCompacto disabled={busy || saving || !!loadingLink || !!editing || !activateTargets.length} onClick={() => openBulk('resume', activateTargets)}>Ativar todos</BotaoAcaoCompacto>
    <BotaoAcaoCompacto disabled={busy || saving || !!loadingLink || !!editing || !pauseTargets.length} onClick={() => openBulk('pause', pauseTargets)}>Pausar todos</BotaoAcaoCompacto>
   </div>
  </>}
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
  {bulkResults.length > 0 && <section aria-label="Resultado das ações em lote" role="status">
   <p>{bulkResults.filter(row => row.confirmed).length} de {bulkResults.length} anúncios com situação confirmada.</p>
   <ul>{bulkResults.map(row => <li key={row.id}>{row.label} · {row.message}</li>)}</ul>
  </section>}
  {bulk && <ModalConfirmacao aberto titulo={`${bulkLabel}?`}
   mensagem={bulk ? [product.name, ...bulk.links.map(targetLabel), bulk.action === 'resume'
    ? `Saldo Online compartilhado entre as contas: ${onlineQuantity ?? 'a confirmar'} un. A ativação depende da conferência de saldo e da situação em cada marketplace.`
    : 'Os anúncios listados sairão de venda após a confirmação do marketplace.'].join('\n') : ''}
   textoConfirmar={bulkLabel} carregando={saving} mostrarProgresso corPrimaria={brand} darkMode={dark}
   variante={bulk?.action === 'resume' ? 'primaria' : 'alerta'}
   aoCancelar={() => { if (!lock.current) setBulk(null); }} aoConfirmar={executeBulk}/>}
  {message&&<p role="status">{message}</p>}{error&&<p role="alert" className={styles.productStockWarning}>{error}</p>}
  {editing&&<ListingEditor key={editing.link.id} initialFocus={editing.field} companyId={product.empresa_id} accountId={editing.link.connection_id} itemId={editing.link.provider_listing_id} snapshot={editing.snapshot} permalink={editing.snapshot.permalink} dark={dark} brand={brand} request={request} onBusy={onBusy} onClose={()=>setEditing(null)} onSaved={(_listing,pending,message)=>{setMessage(message||(pending?'Alteração enviada; aguarde a confirmação do Mercado Livre.':'Alterações confirmadas. Consulte novamente os objetivos para acompanhar a nova avaliação.'));if(!pending)setEditing(null);notifyProductStockChanged(product.empresa_id);onUpdated();}}>{null}</ListingEditor>}
  <ModalConfirmacao aberto={!!confirmation} titulo={confirmation?`${productListingActionNames[confirmation.action]}?`:''} mensagem={confirmation?`${product.name} · ${providerName(confirmation.link.provider)} · ${confirmation.link.provider_listing_id}. ${confirmation.action==='close'?'Encerra definitivamente este anúncio. Para excluir, encerre primeiro.':confirmation.action==='delete'?'Exclui o anúncio no marketplace, sem apagar o produto ou o histórico local.':confirmation.action==='pause'?'O anúncio deixará de vender até ser reativado.':'O anúncio voltará a vender usando seu saldo Online; confira o estoque antes de confirmar.'} Outros anúncios e estoques não serão alterados.`:''} textoConfirmar={confirmation?productListingActionNames[confirmation.action]:'Confirmar'} carregando={saving} corPrimaria={brand} darkMode={dark} variante={confirmation?.action==='resume'?'primaria':'destrutiva'} aoCancelar={()=>{if(!lock.current)setConfirmation(null);}} aoConfirmar={()=>{if(confirmation)void execute(confirmation.link,confirmation.action,confirmation.key);}}/>
 </section>;
}
