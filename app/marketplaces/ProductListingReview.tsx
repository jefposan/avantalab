'use client';
import {useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CampoMoeda from '@/app/components/CampoMoeda';
import {formatarMoeda,moedaDigitadaParaNumero} from '@/app/lib/formatters';
import {priceReviewErrors,type PriceReview} from '@/app/modules/marketplaces/listing-price-batch';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import MarketplaceSelect from './MarketplaceSelect';
import ProductThumbnail from './ProductThumbnail';
import QualityGauge from './QualityGauge';
import ProductPhotoInput from './ProductPhotoInput';
import QualitySummary from './QualitySummary';
import ReviewQualityObjectives from './ReviewQualityObjectives';
import {reviewSectionBlock,reviewPhotoAccess} from './review-quality-goals';
import {RECOMMENDED_PRODUCT_PICTURES} from '@/app/modules/marketplaces/product-picture-policy';
import {pictureAccountPermissions} from '@/app/modules/marketplaces/picture-account-permissions';
import {accountDisplayName} from './account-identification';
import {pictureId,pictureUrl,type ContentAttribute} from '@/app/modules/marketplaces/listing-content';
import type {MarketplaceAccount,marketplaceClientRequest} from './Anunciados';
import {draftCoverage,initialReviewDraft,mergeAIReview,publishListingReview,readReviewEditors,readReviewPrices,recoverReviewDraft,ReviewPreflightConflict,reviewChanges,validateReviewDraft,type AIReviewProposal,type ListingReviewDraft,type ReviewEditors,type ReviewResult,type ReviewSource} from './product-listing-review';
import market from './marketplaces.module.css';
import quality from './listing-quality.module.css';
import styles from './product-listing-review.module.css';

export default function ProductListingReview({source,focusSection,accounts,dark,brand,request,onClose,onBusy,onSaved,allListings=false}:{source:ReviewSource;focusSection?:'details'|'pictures'|'attributes';accounts:MarketplaceAccount[];dark:boolean;brand:string;request:typeof marketplaceClientRequest;onClose:()=>void;onBusy:(value:boolean)=>void;onSaved:()=>void;allListings?:boolean}){
 const prefix=useId(),[editors,setEditors]=useState<ReviewEditors|null>(null),[draft,setDraft]=useState<ListingReviewDraft|null>(null);
 const [loading,setLoading]=useState(true),[operation,setOperation]=useState<''|'ai'|'upload'|'publish'|'recover'>(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[errors,setErrors]=useState<Record<string,string>>({});
 const [stale,setStale]=useState(false),[confirm,setConfirm]=useState<'ai'|'publish'|'sent'|'publish-error'|null>(null),[discard,setDiscard]=useState<'close'|'reload'|null>(null),[proposal,setProposal]=useState<AIReviewProposal|null>(null),[accepted,setAccepted]=useState<string[]>([]),[results,setResults]=useState<ReviewResult[]>([]),[qualityLoading,setQualityLoading]=useState(false),[qualityConsultation,setQualityConsultation]=useState(0);
 const [activeSection,setActiveSection]=useState<'details'|'pictures'|'attributes'|null>(focusSection||null);
 const [photoFeedbackVersion,setPhotoFeedbackVersion]=useState(0),[publicationError,setPublicationError]=useState('');
 const [recoveryNotes,setRecoveryNotes]=useState<string[]>([]);
 const [prices,setPrices]=useState<PriceReview[]>([]),[priceText,setPriceText]=useState(''),[priceTouched,setPriceTouched]=useState(false);
 const lock=useRef(false),alive=useRef(true),controller=useRef<AbortController|null>(null),errorRef=useRef<HTMLDivElement>(null),headingRef=useRef<HTMLHeadingElement>(null),sectionRefs=useRef<Record<'details'|'pictures'|'attributes',HTMLElement|null>>({details:null,pictures:null,attributes:null});
 const price=moedaDigitadaParaNumero(priceText),priceChanged=allListings&&priceTouched&&(price==null||prices.some(row=>row.editor?.values.price!==price));
 const priceErrors=priceReviewErrors(prices,price),priceBlocked=prices.some(row=>row.error||!row.editor?.fields.price.editable);
 const busy=!!operation,dirty=!!editors&&!!draft&&(reviewChanges(editors,draft).length>0||priceChanged);
 async function load(){
  if(lock.current)return;setLoading(true);setEditors(null);setDraft(null);setError('');setPublicationError('');controller.current?.abort();const next=new AbortController();controller.current=next;
   try{const data=await readReviewEditors(source,request,next.signal);const currentPrices=allListings?await readReviewPrices(source,data,request,AbortSignal.any([next.signal,AbortSignal.timeout(65_000)])):[];if(!next.signal.aborted&&alive.current){setEditors(data);setDraft(initialReviewDraft(data));setPrices(currentPrices);const values=[...new Set(currentPrices.map(row=>row.editor?.values.price))];setPriceText(values.length===1&&values[0]!=null?values[0].toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'');setPriceTouched(false);setErrors({});setStale(false);setProposal(null);setAccepted([]);setMessage('');setResults([]);setRecoveryNotes([]);}}
  catch(e){if(!next.signal.aborted&&alive.current)setError(e instanceof Error?e.message:'Não foi possível carregar o anúncio completo.');}
  finally{if(!next.signal.aborted&&alive.current)setLoading(false);}
 }
 useEffect(()=>{alive.current=true;let cancelled=false;queueMicrotask(()=>{if(!cancelled)void load();});headingRef.current?.focus();return()=>{cancelled=true;alive.current=false;controller.current?.abort();};},[source.companyId,source.productId,source.sourceConnectionId,source.sourceId,request,allListings]);
 useEffect(()=>{if(!dirty&&!busy)return;const protect=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);},[dirty,busy]);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 useEffect(()=>{if(!focusSection||!editors||!draft)return;const frame=requestAnimationFrame(()=>{const target=sectionRefs.current[focusSection];target?.scrollIntoView({block:'center',behavior:'smooth'});target?.focus({preventScroll:true});});return()=>cancelAnimationFrame(frame);},[focusSection,editors,draft]);
 function focusReviewArea(section:'details'|'pictures'|'attributes'){setActiveSection(section);requestAnimationFrame(()=>{const target=sectionRefs.current[section];target?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});target?.focus({preventScroll:true});});}
 function updateObjectives(){if(loading||busy||qualityLoading)return;setQualityConsultation(value=>value+1);}
 function close(){if(lock.current)return;if(confirm){setConfirm(null);return;}if(dirty)setDiscard('close');else onClose();}
 function begin(value:'ai'|'upload'|'publish'|'recover'){if(lock.current)return false;lock.current=true;setOperation(value);onBusy(true);setError('');setMessage('');if(value!=='publish')setConfirm(null);return true;}
 function finish(){lock.current=false;if(alive.current)setOperation('');onBusy(false);}
 async function refreshDraft(before:ReviewEditors,previous:ListingReviewDraft){
  const current=await readReviewEditors(source,request,AbortSignal.timeout(165_000));
  const currentPrices=allListings?await readReviewPrices(source,current,request,AbortSignal.timeout(65_000)):[];
  if(!alive.current)return;
  const recovered=recoverReviewDraft(before,previous,current);
  setEditors(current);setDraft(recovered.draft);setPrices(currentPrices);setProposal(null);setAccepted([]);
  setErrors(validateReviewDraft(current,recovered.draft));setRecoveryNotes(recovered.notes);
  setStale(recovered.blocked.length>0);setError(recovered.blocked.join(' '));
  setMessage('Dados reconferidos. Suas escolhas foram mantidas no rascunho. Confira os valores e confirme o envio novamente.');
 }
 async function recover(){
  if(!editors||!draft||!begin('recover'))return;
  try{await refreshDraft(editors,draft);}catch(e){if(alive.current){setStale(true);setError(e instanceof Error?e.message:'Não foi possível conferir os dados. Seu rascunho foi mantido.');}}finally{finish();}
 }
 function change(kind:'details'|'attributes',id:string,value:string){if(lock.current)return;setDraft(old=>old?{...old,[kind]:{...old[kind],[id]:value}}:old);setErrors(old=>({...old,[`${kind}:${id}`]:''}));}
 async function analyze(){
  if(!editors||!draft||stale||!canComplete||!begin('ai'))return;
  try{const data=await request('produtos/qualidade/ia',{empresaId:source.companyId,productId:source.productId,sourceConnectionId:source.sourceConnectionId,sourceId:source.sourceId,perAccountPictures:true,requestKey:crypto.randomUUID()},AbortSignal.timeout(95_000)) as AIReviewProposal;
   if(data.productId!==source.productId||data.sourceId!==source.sourceId||data.sourceConnectionId!==source.sourceConnectionId||!Array.isArray(data.suggestions)||!Array.isArray(data.pictures)||!Array.isArray(data.pending))throw Error('A IA não confirmou o contexto deste anúncio. Nenhum campo foi alterado.');
   if((['details','attributes','pictures'] as const).some(k=>data.revisions?.[k]!==editors[k].revision)){setStale(true);throw Error('Um anúncio mudou durante a pesquisa. Recarregue para revisar os dados atuais.');}
   const merged=mergeAIReview(editors,draft,data);
   if(alive.current){setDraft(merged.draft);setProposal(data);setAccepted(merged.accepted);setMessage(merged.accepted.length?`${merged.accepted.length} campo(s)/grupo(s) completado(s) no rascunho. Confira os valores e as fontes antes de publicar.`:'Nenhum dado ou foto adicional foi confirmado.');if(merged.accepted.length)focusReviewArea(merged.accepted.includes('pictures')?'pictures':merged.accepted.includes('DESCRIPTION')?'details':'attributes');}
  }catch(e){if(alive.current)setError(e instanceof Error?e.message:'A pesquisa não foi concluída. Continue manualmente.');}finally{finish();}
 }
 async function upload(file:File|string){
  if(!editors||!draft||reviewSectionBlock(editors,'pictures')||stale||lock.current)return;
  if(typeof file!=='string'&&(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)||file.size>2_621_440))throw Error('Use JPG, PNG, WebP ou AVIF de até 2,5 MB.');
  if(draft.pictures.length>=editors.pictures.maxPictures)throw Error(`Limite de ${editors.pictures.maxPictures} fotos.`);
  if(!begin('upload'))return;
  try{const payload=typeof file==='string'?{url:file}:{mime:file.type,base64:await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('Não foi possível ler a foto.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.readAsDataURL(file);})};
   const destination=editors.pictures.pictureSource||{connectionId:source.sourceConnectionId,id:source.sourceId};
   const photo=await request('anunciados/qualidade/foto',{empresaId:source.companyId,...destination,...payload},AbortSignal.timeout(55_000));
   if(!pictureId(photo.id)||!pictureUrl(photo.url))throw Error('O Mercado Livre não confirmou a foto.');
   if(alive.current){setDraft(old=>old?{...old,pictures:old.pictures.some(p=>p.id===photo.id)?old.pictures:[...old.pictures,{id:photo.id,url:pictureUrl(photo.url)}]}:old);setErrors(old=>({...old,pictures:''}));return 'Foto adicionada ao rascunho. Confira antes de publicar alterações.';}
  }finally{finish();}
 }
 function review(){if(!editors||!draft||lock.current)return;const invalid=validateReviewDraft(editors,draft);if(priceChanged&&(!prices.length||priceErrors.some(Boolean)))invalid.price=priceErrors.filter(Boolean).join(' ')||'Confira o preço e as permissões de todas as contas.';setErrors(invalid);if(Object.keys(invalid).length){setError('Revise os campos destacados antes de publicar.');return;}setConfirm('publish');}
 async function publish(){
  if(!editors||!draft||stale||!begin('publish'))return;
  setPublicationError('');setResults([]);
  try{await publishListingReview(source,editors,draft,request,value=>{if(alive.current)setResults(value);},priceChanged&&price!=null?{reviews:prices,price}:undefined);
   if(alive.current&&reviewChanges(editors,draft).some(change=>change.kind==='pictures'))setPhotoFeedbackVersion(value=>value+1);
   onSaved();window.dispatchEvent(new Event('avanta:quality-updated'));
   // Releitura não repete escrita; falha aqui exige conferência, nunca reenvio.
   const current=await readReviewEditors(source,request,AbortSignal.timeout(165_000));
   const currentPrices=allListings?await readReviewPrices(source,current,request,AbortSignal.timeout(65_000)):[];
   if(alive.current){setEditors(current);setDraft(initialReviewDraft(current));setPrices(currentPrices);setPriceTouched(false);setProposal(null);setAccepted([]);setMessage('');setConfirm('sent');}
  }catch(e){if(alive.current){
   if(e instanceof ReviewPreflightConflict){
    try{await refreshDraft(editors,draft);setPublicationError('');setConfirm(null);}
    catch(recoveryError){setStale(true);setError('Não foi possível reconferir os anúncios. Seu rascunho foi mantido.');setPublicationError(recoveryError instanceof Error?recoveryError.message:'Conferência indisponível.');setConfirm('publish-error');}
   }else{setStale(true);setError('O envio foi interrompido. Confira o resultado e use “Conferir mantendo rascunho” para consultar a situação atual sem repetir o envio.');setPublicationError(e instanceof Error?e.message:'Não foi possível confirmar o envio.');setConfirm('publish-error');}
  }}finally{finish();}
 }
 const disabled=loading||busy,coverage=editors&&draft?draftCoverage(editors,draft):null;
 const pictureBlock=editors?reviewSectionBlock(editors,'pictures'):'';
 const photosDisabled=disabled||stale||!!pictureBlock;
 const canComplete=!!editors&&!!draft&&((['details','attributes'] as const).some(k=>editors[k].attributes.some(a=>a.editable&&a.id!=='TITLE'&&a.id!=='LISTING_TYPE'&&!draft[k][a.id]?.trim()))||!pictureBlock&&draft.pictures.length<Math.min(RECOMMENDED_PRODUCT_PICTURES,editors.pictures.maxPictures));
 const label=(id:string)=>accountDisplayName(accounts.find(a=>a.id===id),'Conta vinculada');
 const targets=editors?.attributes.reviewTargets||[];
 const photoPermissions=editors?pictureAccountPermissions(editors.pictures):[];
 const photoDestinations=photoPermissions.filter(row=>editors?.pictures.pictureAppendTargets?.includes(row.key)).map(row=>`${label(row.target.connectionId)} · ${row.target.id}`);
 const changeSummary=editors&&draft?reviewChanges(editors,draft).map(change=>{
  const destinations=change.kind==='pictures'?photoPermissions.filter(row=>editors.pictures.pictureAppendTargets?.includes(row.key)).map(row=>row.target):editors[change.kind].reviewTargets||[];
  const names=[...new Set(destinations.map(target=>label(target.connectionId)))].join(', ');
  return `${change.kind==='pictures'?'Adicionar novas fotos':change.kind==='details'?'Atualizar informações':'Atualizar ficha técnica'} em ${names||'nenhuma conta liberada'}.`;
 }).concat(priceChanged?[`Atualizar o preço para ${price==null?'valor a conferir':formatarMoeda(price)} em todos os ${prices.length} anúncios vinculados.`]:[]).join('\n'):'';
 const restrictions=editors?[...new Set((['details','pictures','attributes'] as const).flatMap(kind=>editors[kind].restrictions||[]).map(r=>r.message))]:[];
 const differences=editors?(['details','attributes'] as const).flatMap(kind=>editors[kind].attributes.flatMap(a=>{
  const values=editors[kind].reviewTargets!.map(t=>({id:t.id,connectionId:t.connectionId,value:kind==='details'?String(t.details?.values[({TITLE:'title',DESCRIPTION:'description',LISTING_TYPE:'listingType'} as const)[a.id as 'TITLE'|'DESCRIPTION'|'LISTING_TYPE']]||''):t.content?.attributes.find(v=>v.id===a.id)?.value||''}));
  return new Set(values.map(v=>v.value)).size>1?[{kind,id:a.id,name:a.name,values}]:[];
 })):[];
 function field(a:ContentAttribute,kind:'details'|'attributes'){
  if(!draft)return null;const id=`${prefix}-${kind}-${a.id}`,value=draft[kind][a.id]||'',issue=errors[`${kind}:${a.id}`];
  const evidence=kind==='attributes'&&accepted.includes(a.id)?proposal?.suggestions.find(s=>s.field===a.id):null;
  const options=a.options.map(o=>({value:o.id,label:o.name}));if(value&&!options.some(o=>o.value===value))options.unshift({value,label:a.value||value});
  return <div className={`${quality.field} ${a.type==='text'?styles.wide:''}`} key={id} data-validation-error={!!issue}>
   {a.editable&&['list','boolean'].includes(a.type)?<MarketplaceSelect id={id} label={`${a.name}${a.required?' *':''}`} value={value} placeholder="Não preenchido" disabled={disabled} error={issue} options={options} onChange={v=>change(kind,a.id,v)}/>:<><label htmlFor={id}>{a.name}{a.required?' *':''}{!a.editable?' · preservado':''}</label>{a.type==='text'?<textarea id={id} rows={7} value={value} readOnly={!a.editable} disabled={disabled} maxLength={a.maxLength} aria-invalid={!!issue} aria-describedby={!a.editable||issue?`${id}-help`:undefined} onChange={e=>change(kind,a.id,e.target.value)}/>:<input id={id} value={!a.editable?a.value||value:value} readOnly={!a.editable} disabled={disabled} maxLength={a.maxLength} placeholder="Não preenchido" aria-invalid={!!issue} aria-describedby={!a.editable||issue?`${id}-help`:undefined} onChange={e=>change(kind,a.id,e.target.value)}/>}</>}
   {(!a.editable||issue)&&<small id={`${id}-help`} role={issue?'alert':undefined}>{issue||a.reason}</small>}
   {a.editable&&a.type==='number_unit'&&<small>Unidades: {a.units.join(', ')}.</small>}
   {evidence&&<small className={styles.evidence}>Fonte: {evidence.sourceUrl&&/^https:\/\//.test(evidence.sourceUrl)?<a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer">{evidence.source} ↗</a>:evidence.source}{evidence.evidence&&<span>“{evidence.evidence}”</span>}</small>}
   {a.id==='DESCRIPTION'&&accepted.includes('DESCRIPTION')&&<small>Fonte: {proposal?.descriptionSource}</small>}
  </div>;
 }
 return <><CardExpandidoModal aberto rotulo={allListings?'Editar todos os anúncios':'Revisão geral do anúncio'} darkMode={dark} onFechar={close}>
  <section className={`${styles.review} ${dark?`${market.dark} ${quality.dark} ${styles.dark}`:''}`} style={{'--brand':brand} as CSSProperties} aria-busy={loading||busy}>
   <header className={styles.header}><div><h2 ref={headingRef} tabIndex={-1}>{allListings?'Editar todos os anúncios':'Revisar anúncio'}</h2><p>{editors?.details.title||'Consultando o produto'} · {allListings?`${targets.length} anúncio(s) vinculado(s)`:source.sourceId}</p></div><div className={quality.actions}>{!allListings&&<BotaoAcaoCompacto disabled={loading||busy||qualityLoading} onClick={updateObjectives}>{qualityLoading?'Consultando…':'Atualizar objetivos'}</BotaoAcaoCompacto>}{canComplete&&<BotaoAcaoCompacto variante="primario" disabled={disabled||stale} onClick={()=>setConfirm('ai')}>Completar com IA</BotaoAcaoCompacto>}<BotaoAcaoCompacto disabled={busy} onClick={close}>Fechar</BotaoAcaoCompacto></div></header>
   <CarregamentoDadosModulo ativo={loading||operation==='ai'} variante="local" titulo="Revisão do anúncio" mensagem={operation==='ai'?'Pesquisando e conferindo fontes do produto…':operation==='upload'?'Preparando a foto no Mercado Livre…':operation==='publish'?'Validando e enviando alterações. Aguarde a confirmação…':'Consultando campos, fotos e permissões das contas…'} temaEscuro={dark} corPrimaria={brand}/>
   {error&&<div ref={errorRef} tabIndex={-1} role="alert" className={quality.error}>{error}</div>}{message&&<p role="status" className={quality.affected}>{message}</p>}
   {!!recoveryNotes.length&&<ul className={quality.affected} aria-label="Alterações encontradas na conferência">{recoveryNotes.map(note=><li key={note}>{note}</li>)}</ul>}
   {editors&&draft&&<div className={`${market.catalogResult} ${market.preparationLayout} ${styles.layout}`}>
    <div className={market.preparationMain}>
     {!allListings&&<><ReviewQualityObjectives companyId={source.companyId} editors={editors} refreshKey={qualityConsultation} request={request} dark={dark} brand={brand} disabled={disabled} onLoading={setQualityLoading} onEdit={focusReviewArea} accountName={label}/>
     <details className={styles.secondary}><summary>Editar outros campos</summary><div className={quality.actions}>{editors.details.attributes.some(a=>a.editable)&&<BotaoAcaoCompacto disabled={disabled} onClick={()=>focusReviewArea('details')}>Informações</BotaoAcaoCompacto>}{!pictureBlock&&<BotaoAcaoCompacto disabled={disabled} onClick={()=>focusReviewArea('pictures')}>Fotos</BotaoAcaoCompacto>}{editors.attributes.attributes.some(a=>a.editable)&&<BotaoAcaoCompacto disabled={disabled} onClick={()=>focusReviewArea('attributes')}>Ficha técnica</BotaoAcaoCompacto>}</div></details></>}
     {allListings&&<section className={styles.editSection} aria-label="Preço dos anúncios"><h3>Preço de venda</h3><div className={quality.fields}><div className={`${quality.field} ${styles.sharedPrice}`} data-validation-error={!!errors.price}><label htmlFor={`${prefix}-price`}>Mesmo preço em todas as contas (R$)</label><CampoMoeda id={`${prefix}-price`} value={priceText} disabled={disabled||stale||priceBlocked||!prices.length} placeholder="Valores diferentes por conta" aria-invalid={!!errors.price} aria-describedby={`${prefix}-price-help`} onChange={value=>{setPriceText(value);setPriceTouched(true);setErrors(old=>({...old,price:''}));}}/><small id={`${prefix}-price-help`} role={errors.price?'alert':undefined}>{errors.price||'Somente os campos alterados serão enviados. O preço de referência do cadastro será mantido.'}</small></div></div><ul className={styles.priceAccounts}>{prices.map(row=><li key={`${row.target.connection_id}:${row.target.provider_listing_id}`}><strong>{label(row.target.connection_id)}</strong><span>{row.target.provider_listing_id} · {row.editor?.values.price==null?'Preço não confirmado':formatarMoeda(row.editor.values.price)}</span>{row.error&&<small>{row.error}</small>}</li>)}</ul></section>}
     <section hidden={!allListings&&activeSection!=='details'} className={styles.editSection} ref={node=>{sectionRefs.current.details=node;}} tabIndex={-1} aria-label="Informações do anúncio"><h3>Informações editáveis</h3><div className={quality.fields}>{editors.details.attributes.filter(a=>a.editable).map(a=>field(a,'details'))}</div></section>
     <section hidden={!allListings&&activeSection!=='pictures'} className={styles.editSection} ref={node=>{sectionRefs.current.pictures=node;}} tabIndex={-1} aria-label="Fotos do anúncio"><h3>Fotos do produto · {draft.pictures.length}</h3>{pictureBlock?<p className={styles.goalReason}>{pictureBlock}</p>:<><ProductPhotoInput key={`${editors.pictures.revision}:${photoFeedbackVersion}`} disabled={photosDisabled||draft.pictures.length>=editors.pictures.maxPictures} error={errors.pictures} onFile={upload} onUrl={upload}/><small className={styles.uploadHelp}>JPG/PNG/WebP/AVIF até 2,5 MB · limite de {editors.pictures.maxPictures} fotos. A primeira é a capa.</small></>}
      {!!editors.pictures.pictureAppendTargets?.length&&<p role="status">Novas fotos serão adicionadas a: {photoDestinations.join('; ')}. A capa e as fotos atuais de cada conta serão mantidas.</p>}
      <ol className={quality.photos}>{draft.pictures.map((p,index)=>{const existing=editors.pictures.pictures.some(old=>old.id===p.id);return <li key={p.id} className={quality.photo}>{p.url?<img src={p.url} alt={`Foto ${index+1} do produto`}/>:<span>Prévia indisponível</span>}<small>{index===0?'Capa':`Foto ${index+1}`}{editors.pictures.pictureAppendTargets&&existing?' · mantida':''}</small>{!pictureBlock&&(!editors.pictures.pictureAppendTargets||!existing)&&<div className={quality.actions}>{!editors.pictures.pictureAppendTargets&&<><BotaoAcaoCompacto aria-label={`Mover foto ${index+1} para antes`} disabled={photosDisabled||index===0} onClick={()=>setDraft(old=>{if(!old)return old;const pictures=[...old.pictures];[pictures[index-1],pictures[index]]=[pictures[index],pictures[index-1]];return {...old,pictures};})}>←</BotaoAcaoCompacto><BotaoAcaoCompacto aria-label={`Mover foto ${index+1} para depois`} disabled={photosDisabled||index===draft.pictures.length-1} onClick={()=>setDraft(old=>{if(!old)return old;const pictures=[...old.pictures];[pictures[index+1],pictures[index]]=[pictures[index],pictures[index+1]];return {...old,pictures};})}>→</BotaoAcaoCompacto></>}<BotaoAcaoCompacto variante="destrutivo" disabled={photosDisabled||draft.pictures.length<2} onClick={()=>setDraft(old=>old?{...old,pictures:old.pictures.filter(v=>v.id!==p.id)}:old)}>Remover</BotaoAcaoCompacto></div>}</li>})}</ol>
     </section>
     {editors.pictures.different&&<details className={styles.secondary}><summary>Conferir galerias por anúncio</summary><p>Anúncios próprios e de catálogo podem ter galerias diferentes. Esta revisão preserva as fotos atuais de cada anúncio.</p>{reviewPhotoAccess(editors,editors.pictures.reviewTargets||[]).map(row=><article key={row.key} className={styles.account}><h4>{label(row.target.connectionId)} · {row.target.id}</h4><p>{row.count} foto(s) · {row.allowed?'Permite adicionar fotos':row.state==='catalog'?'Galeria controlada pelo catálogo ML':'Adição de fotos indisponível'}</p>{!row.allowed&&row.state!=='catalog'&&<p>{row.reason}</p>}<ol className={`${quality.photos} ${styles.accountGallery}`}>{row.target.content?.pictures.map((p,i)=><li key={p.id} className={quality.photo}>{p.url?<img src={p.url} alt={`Foto atual ${i+1} de ${label(row.target.connectionId)}`}/>:<span>Prévia indisponível</span>}</li>)}</ol></article>)}</details>}
     <section hidden={!allListings&&activeSection!=='attributes'} className={styles.editSection} ref={node=>{sectionRefs.current.attributes=node;}} tabIndex={-1} aria-label="Ficha técnica completa"><h3>Ficha técnica editável</h3>{editors.attributes.attributes.some(a=>a.editable)?<div className={quality.fields}>{editors.attributes.attributes.filter(a=>a.editable).map(a=>field(a,'attributes'))}</div>:<p className={quality.help}>{reviewSectionBlock(editors,'attributes')||'Nenhum campo da ficha está liberado para edição neste anúncio.'}</p>}</section>
     <details className={styles.secondary}><summary>Dados preservados e detalhes por conta</summary>
      {(['details','attributes'] as const).map(kind=><div key={kind}><h4>{kind==='details'?'Informações preservadas':'Ficha técnica preservada'}</h4><dl className={styles.context}>{editors[kind].attributes.filter(a=>!a.editable).map(a=><div key={a.id}><dt>{a.name}</dt><dd>{a.value||'Não preenchido'}</dd></div>)}</dl></div>)}
      {!!differences.length&&<section aria-label="Valores diferentes por conta"><h4>Valores diferentes por conta</h4>{differences.map(d=><div key={`${d.kind}:${d.id}`} className={styles.account}><h4>{d.name}</h4>{d.values.map(v=><p key={`${v.connectionId}:${v.id}`}><strong>{label(v.connectionId)}</strong>: {v.value||'Não preenchido'}</p>)}</div>)}</section>}
      {targets.map(t=><article key={`${t.connectionId}:${t.id}`} className={styles.account}><h4>{label(t.connectionId)} · {t.id}</h4><dl className={styles.context}>{(t.content?.contextFields||[]).map(f=><div key={f.id}><dt>{f.name}</dt><dd>{f.value||'Não preenchido'}</dd></div>)}</dl></article>)}
      {!!restrictions.length&&<section aria-label="Restrições de envio"><h4>Restrições de envio</h4><ul>{restrictions.map(reason=><li key={reason}>{reason}</li>)}</ul></section>}
     </details>
     {!!proposal?.pending.length&&<p className={quality.help}>Sem comprovação na pesquisa: {proposal.pending.join(', ')}. Preencha somente o que puder confirmar.</p>}{proposal?.warning&&<p role="status" className={quality.affected}>{proposal.warning}</p>}
     {(results.length>0||publicationError)&&<details className={styles.secondary}><summary>Resultado do envio</summary>{publicationError&&<p>{publicationError}</p>}<ul className={quality.results}>{results.map((r,i)=><li key={i}>{label(r.connectionId)} · {r.id}: {r.status==='confirmed'?'Confirmado':r.status==='failed'?'Sem confirmação':'Não enviado'} — {r.message}</li>)}</ul></details>}
     <div className={market.preparationActions}><BotaoAcaoCompacto className={market.preparationCancel} disabled={busy} onClick={close}>Cancelar revisão</BotaoAcaoCompacto><BotaoAcaoCompacto className={market.preparationReview} disabled={busy||loading} onClick={()=>void recover()}>{operation==='recover'?'Conferindo…':'Conferir mantendo rascunho'}</BotaoAcaoCompacto><BotaoAcaoCompacto className={market.preparationReview} disabled={busy||loading} onClick={()=>dirty?setDiscard('reload'):void load()}>Recarregar dados</BotaoAcaoCompacto><BotaoAcaoCompacto className={market.preparationPublish} disabled={disabled||stale||!dirty} onClick={review}>Publicar alterações</BotaoAcaoCompacto></div>
    </div>
    <div className={market.preparationSummaryRail}><div className={`${market.preparationSummaryFloat} ${styles.summaryFloat}`}><aside className={market.preparationSummary} aria-labelledby={`${prefix}-summary`} tabIndex={0}>
     <h3 id={`${prefix}-summary`}>Prévia do anúncio</h3><div className={market.preparationPreviewPhoto}><ProductThumbnail url={draft.pictures[0]?.url} name={draft.details.TITLE||editors.details.title}/></div><p className={market.preparationSummaryProduct}>{draft.details.TITLE||'Título não preenchido'}</p>
     <h4>Preenchimento do rascunho</h4>{coverage&&<><QualityGauge label="Preenchimento do rascunho" score={coverage.score} level={`${coverage.filled} de ${coverage.total} campos editáveis/grupos preenchidos`}/><p className={quality.help}>{coverage.total===0?'Nenhum campo liberado para edição conjunta. ':''}Indicador local de preenchimento válido; não é a nota do ML nem previsão dela.</p></>}
     <h4>Última nota real do Mercado Livre</h4><QualitySummary gauge links={targets.map(t=>({connectionId:t.connectionId,id:t.id}))}/>
     <dl><div><dt>Destinos</dt><dd>{targets.length} anúncio(s) existente(s)</dd></div><div><dt>Fotos do anúncio-base</dt><dd>{draft.pictures.length}</dd></div><div><dt>Tipo</dt><dd>{editors.details.attributes.find(a=>a.id==='LISTING_TYPE')?.options.find(o=>o.id===draft.details.LISTING_TYPE)?.name||draft.details.LISTING_TYPE||'Não preenchido'}</dd></div><div><dt>Alterações</dt><dd>{dirty?'No rascunho':'Sem alterações pendentes'}</dd></div></dl>
     <details className={styles.secondary}><summary>Ver prévia completa</summary><div className={market.preparationPreviewDetails}><h4>Descrição</h4><p>{draft.details.DESCRIPTION||'Não preenchida'}</p><h4>Características preenchidas</h4><dl>{editors.attributes.attributes.filter(a=>!!draft.attributes[a.id]?.trim()||!!a.value).map(a=><div key={a.id}><dt>{a.name}</dt><dd>{a.options.find(o=>o.id===draft.attributes[a.id])?.name||draft.attributes[a.id]||a.value}</dd></div>)}</dl></div></details>
     <div className={market.preparationSummaryNotice}><strong>{busy?'Operação em andamento':stale?'Conferência necessária':'Rascunho em revisão'}</strong><p>A nota será recalculada pelo Mercado Livre após a publicação.</p></div>
    </aside></div></div>
   </div>}
   {!loading&&!editors&&<BotaoAcaoCompacto onClick={()=>void load()}>Tentar carregar novamente</BotaoAcaoCompacto>}
  </section>
 </CardExpandidoModal>
 <ModalConfirmacao aberto={confirm==='ai'} variante="primaria" titulo="Completar os campos vazios com IA?" mensagem="Usará uma pequena parte da cota mensal para conferir o cadastro, anúncios vinculados e fontes públicas do produto/fabricante. Só dados comprovados entram no rascunho; seus valores preenchidos serão preservados. Nada será publicado agora." textoConfirmar="Pesquisar e completar rascunho" textoCancelar="Continuar manualmente" darkMode={dark} corPrimaria={brand} aoCancelar={()=>setConfirm(null)} aoConfirmar={()=>void analyze()}/>
 <ModalConfirmacao aberto={confirm==='publish'||confirm==='sent'||confirm==='publish-error'} variante={confirm==='publish-error'?'alerta':'primaria'} rotuloCabecalho={operation==='publish'?'Enviando':confirm==='sent'||confirm==='publish-error'?'Resultado':undefined} titulo={operation==='publish'?'Enviando alterações…':confirm==='sent'?'Alterações confirmadas':confirm==='publish-error'?'Confira o resultado':'Publicar alterações?'} mensagem={confirm==='publish'&&operation!=='publish'?changeSummary:[publicationError,results.map(r=>`${label(r.connectionId)} · ${r.kind==='price'?'Preço':r.kind==='pictures'?'Fotos':r.kind==='details'?'Informações':'Ficha técnica'}: ${r.message}`).join('\n'),operation==='publish'?'Aguarde a confirmação do Mercado Livre.':''].filter(Boolean).join('\n\n')} textoConfirmar={confirm==='sent'||confirm==='publish-error'?'Fechar':'Publicar'} textoCancelar="Voltar" carregando={operation==='publish'} mostrarProgresso ocultarCancelar={confirm==='sent'||confirm==='publish-error'} darkMode={dark} corPrimaria={brand} aoCancelar={()=>setConfirm(null)} aoConfirmar={()=>{if(confirm==='sent'||confirm==='publish-error')setConfirm(null);else void publish();}}/>
 <ModalConfirmacao aberto={!!discard} variante="alerta" titulo="Descartar o rascunho desta revisão?" mensagem="Os campos não publicados serão descartados. Fotos apenas preparadas não serão associadas ao anúncio. Alterações já confirmadas pelo marketplace não são desfeitas." textoConfirmar="Descartar rascunho" textoCancelar="Continuar revisando" darkMode={dark} corPrimaria={brand} aoCancelar={()=>setDiscard(null)} aoConfirmar={()=>{const action=discard;setDiscard(null);if(action==='reload')void load();else onClose();}}/>
 </>;
}
