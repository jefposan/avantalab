'use client';
import {useEffect,useId,useRef,useState} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import ListingQuality from './ListingQuality';
import QualitySummary from './QualitySummary';
import ProductListingReview from './ProductListingReview';
import type {LocalProduct} from '@/app/modules/marketplaces/services/local-product-model';
import type {MarketplaceAccount,marketplaceClientRequest} from './Anunciados';
import {accountDisplayName} from './account-identification';
import {Icon} from '@/app/projetos/components/Icon';
import {productQualityGoals,type ProductQualityRecord} from '@/app/modules/marketplaces/product-quality-goals';
import type {ProductCommonKind} from '@/app/modules/marketplaces/product-common-content';
import styles from './listing-quality.module.css';
const terminal=new Set(['closed','deleted','cancelled','canceled','excluded','unpublished']);
export default function ProductQuality({product,accounts,canManage,busy,dark,brand,request,onBusy}:{product:LocalProduct;accounts:MarketplaceAccount[];canManage:boolean;busy:boolean;dark:boolean;brand:string;request:typeof marketplaceClientRequest;onBusy:(value:boolean)=>void}){
 const links=product.links.filter(l=>!terminal.has(l.status.toLowerCase()));
 const [editing,setEditing]=useState(false),[reviewSection,setReviewSection]=useState<ProductCommonKind|undefined>(),[consultation,setConsultation]=useState(0),[updated,setUpdated]=useState(false);
 const [records,setRecords]=useState<ProductQualityRecord[]>([]),[cacheLoading,setCacheLoading]=useState(true),[cacheError,setCacheError]=useState('');
 const [pendingVisible,setPendingVisible]=useState(false),pendingId=useId();
 const accountsDetails=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
  setRecords([]);setCacheLoading(true);setCacheError('');
  const load=()=>{void request(`anunciados/qualidade/cache?${new URLSearchParams({empresaId:product.empresa_id,productId:product.id})}`,undefined,AbortSignal.any([controller.signal,AbortSignal.timeout(20_000)])).then(r=>{if(!controller.signal.aborted){if(!Array.isArray(r.records))throw Error('Objetivos salvos indisponíveis.');setRecords(r.records);setCacheError('');}}).catch(()=>{if(!controller.signal.aborted)setCacheError('Não foi possível carregar os objetivos salvos. Use Atualizar objetivos para conferir.');}).finally(()=>{if(!controller.signal.aborted)setCacheLoading(false);});};
  const changed=()=>{clearTimeout(timer);timer=setTimeout(load,300);};
  load();window.addEventListener('avanta:quality-updated',changed);return()=>{controller.abort();clearTimeout(timer);window.removeEventListener('avanta:quality-updated',changed);};
 },[product.empresa_id,product.id,request]);
 const source=links.find(l=>l.provider==='mercado_livre'&&accounts.some(a=>a.id===l.connection_id&&a.status==='connected'));
 const unsupported=links.some(l=>l.provider!=='mercado_livre');
 if(!links.length)return null;
 const disabled=busy||!canManage||!source||unsupported;
 const pending=productQualityGoals(records,links.filter(l=>l.provider==='mercado_livre'));
 function open(section?:ProductCommonKind){if(disabled)return;setReviewSection(section);setEditing(true);}
 function openAccountObjectives(){accountsDetails.current?.setAttribute('open','');setConsultation(n=>n+1);}
 return <section className={`${styles.panel} ${styles.productQuality} ${dark?styles.dark:''}`} aria-label="Qualidade dos anúncios do produto">
  <div className={styles.overview}><div className={styles.overviewTitle}><h3>Qualidade do anúncio</h3><p className={styles.help}>{links.length} anúncios vinculados · preço por conta</p></div><QualitySummary gauge links={links.filter(l=>l.provider==='mercado_livre').map(l=>({connectionId:l.connection_id,id:l.provider_listing_id}))}/><div className={`${styles.actions} ${styles.overviewActions}`}><BotaoAcaoCompacto variante="primario" disabled={disabled||editing} onClick={()=>open()}>Revisar anúncio</BotaoAcaoCompacto><BotaoAcaoCompacto className={styles.pendingToggle} disabled={busy||editing} aria-expanded={pendingVisible} aria-controls={pendingId} onClick={()=>setPendingVisible(value=>!value)}>{pendingVisible?'Ocultar objetivos pendentes':'Ver objetivos pendentes'}</BotaoAcaoCompacto></div></div>
  <div id={pendingId} hidden={!pendingVisible} className={styles.pendingArea} aria-label="Objetivos pendentes"><h4>Objetivos pendentes</h4><p className={styles.help}>Abra uma ação para revisar o campo correspondente no AvantaLab. A nota continua sendo recalculada pelo Mercado Livre.</p><ul className={styles.pendingActions}>{pending.goals.map(goal=><li key={goal.key}>{goal.kind?<BotaoAcaoCompacto className={styles.pendingAction} disabled={disabled||editing} onClick={()=>open(goal.kind!)}><Icon name="alert" size={16}/>Melhorar: {goal.title}</BotaoAcaoCompacto>:<BotaoAcaoCompacto className={styles.pendingAction} disabled={busy||editing} onClick={openAccountObjectives}><Icon name="alert" size={16}/>Conferir: {goal.title}</BotaoAcaoCompacto>}</li>)}</ul>{cacheLoading&&<p className={styles.help} role="status">Carregando objetivos salvos…</p>}{cacheError&&<p role="alert" className={styles.help}>{cacheError}</p>}{!cacheLoading&&!cacheError&&!pending.goals.length&&<p className={styles.help}>{pending.unknown?'Objetivos ainda não disponíveis para todos os anúncios. Atualize para conferir.':'Nenhum objetivo pendente na última avaliação disponível.'}</p>}{!cacheLoading&&pending.goals.length>0&&(pending.unknown>0||pending.stale)&&<p className={styles.help}>Avaliação parcial ou antiga. Atualize os objetivos para conferir todas as contas.</p>}</div>
  {unsupported&&<p role="status">A edição conjunta ainda não está homologada para todas as plataformas vinculadas. Nenhum destino será ignorado silenciosamente.</p>}
  {updated&&<p role="status">Dados comuns atualizados; consulte novamente os objetivos após o recálculo da plataforma.</p>}
  <details ref={accountsDetails} className={styles.linkedDetails}><summary>Anúncios vinculados ({links.length}) <small>Detalhes por conta</small></summary><BotaoAcaoCompacto disabled={busy||editing} onClick={()=>setConsultation(n=>n+1)}><Icon name="refresh" size={16}/>Atualizar objetivos</BotaoAcaoCompacto>{links.filter(l=>l.provider==='mercado_livre').map(link=>{const accountName=accountDisplayName(accounts.find(a=>a.id===link.connection_id),'Conta vinculada');return <details key={link.id} open={consultation>0}><summary>{accountName} · {link.provider_listing_id}</summary><ListingQuality companyId={product.empresa_id} accountId={link.connection_id} itemId={link.provider_listing_id} accountName={accountName} request={request} dark={dark} brand={brand} disabled={busy} consultationKey={consultation} hideContentActions canManageContent={false} canEdit={()=>false}/></details>;})}</details>
  <p className={styles.qualityFootnote}>A pontuação é recalculada pelo Mercado Livre. A revisão reúne informações, fotos e ficha técnica.</p>
  {editing&&source&&<ProductListingReview source={{companyId:product.empresa_id,productId:product.id,sourceConnectionId:source.connection_id,sourceId:source.provider_listing_id}} focusSection={reviewSection} accounts={accounts} request={request} dark={dark} brand={brand} onBusy={onBusy} onSaved={()=>setUpdated(true)} onClose={()=>{setEditing(false);setReviewSection(undefined);}}/>}
 </section>;
}
