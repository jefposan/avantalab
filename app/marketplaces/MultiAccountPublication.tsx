'use client';
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {listingSaleState} from '@/app/modules/marketplaces/listing-sale-state';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CampoMoeda from '@/app/components/CampoMoeda';
import PublicationShipping from './PublicationShipping';
import {moedaDigitadaParaNumero} from '@/app/lib/formatters';
import {publicationErrors,type PublicationForm} from '@/app/modules/marketplaces/services/catalog-publication';
import {existingDestination,commercialPublicationKey,type PublicationDestination} from '@/app/modules/marketplaces/multi-publication';
import {marketplaceClientRequest,type MarketplaceAccount} from './Anunciados';
import {accountDisplayName} from './account-identification';
import {destinationErrors,destinationFieldId,focusPublicationField,validateDestinations,type DestinationReview} from './multi-publication-validation';
import styles from './marketplaces.module.css';

export type MultiAccountPublicationHandle={publish:()=>Promise<void>};
type Review=DestinationReview;
type Props={companyId:string;form:PublicationForm;productRevision?:number;accounts:MarketplaceAccount[];confirmed:boolean;disabled:boolean;onBusyChange:(busy:boolean)=>void;onCompleted:(summary:string)=>void;sourceConnectionId?:string;sourceListingId?:string;request?:typeof marketplaceClientRequest};
export default forwardRef<MultiAccountPublicationHandle,Props>(function MultiAccountPublication({companyId,form,productRevision,accounts,confirmed,disabled,onBusyChange,onCompleted,sourceConnectionId,sourceListingId,request=marketplaceClientRequest},ref){
 const [links,setLinks]=useState<PublicationDestination[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState<string[]>([]),[reviews,setReviews]=useState<Record<string,Review>>({}),[publicationMode,setPublicationMode]=useState<'same'|'different'|''>(''),[updateChoice,setUpdateChoice]=useState(''),[busy,setBusy]=useState(false),[results,setResults]=useState<Record<string,string>>({}),[refresh,setRefresh]=useState(0);
 const batch=useRef(crypto.randomUUID()),lock=useRef(false),signature=JSON.stringify([form,productRevision]),baseline=useRef(commercialPublicationKey(form));
 const [technical,setTechnical]=useState<Record<string,string>>({});
 const root=useRef<HTMLElement>(null),reviewsRef=useRef(reviews),[validating,setValidating]=useState(false),[validationRetry,setValidationRetry]=useState(0);
 reviewsRef.current=reviews;
 const eligible=accounts.filter(account=>account.provider==='mercado_livre'&&account.status==='connected');
 const lockedLinks=sourceConnectionId&&!links.some(link=>link.connectionId===sourceConnectionId)?[...links,{connectionId:sourceConnectionId,listingId:sourceListingId||'',status:'active',provider:'mercado_livre'}]:links;
 const selectableAccounts=eligible.filter(account=>!existingDestination(lockedLinks,account.id)&&!['published','pending'].includes(reviews[account.id]?.status||''));
 const allSelectableAccountsSelected=selectableAccounts.length>0&&selectableAccounts.every(account=>selected.includes(account.id));
 const someSelectableAccountsSelected=selectableAccounts.some(account=>selected.includes(account.id));
 const selectAllRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(selectAllRef.current)selectAllRef.current.indeterminate=someSelectableAccountsSelected&&!allSelectableAccountsSelected;},[someSelectableAccountsSelected,allSelectableAccountsSelected]);
 useEffect(()=>{const controller=new AbortController();setLoaded(false);setError('');void request('publicacao-multiconta',{action:'context',empresaId:companyId,productId:form.localProductId},controller.signal).then(data=>{if(!controller.signal.aborted){setLinks(data.links.filter((link:PublicationDestination)=>link.provider==='mercado_livre'&&link.status!=='deleted'));setLoaded(true);}}).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Não foi possível conferir anúncios vinculados.');});return()=>controller.abort();},[companyId,form.localProductId,request,refresh]);
 useEffect(()=>{setReviews(current=>Object.fromEntries(Object.entries(current).filter(([,review])=>review.status==='published'||review.status==='pending')));setUpdateChoice('');},[signature]);
 function patch(id:string,change:Partial<PublicationForm>,costUnavailable?:boolean){setError('');setReviews(current=>{const row=current[id];if(!row||row.status==='published'||row.status==='pending')return current;const next={...row.form,...change};const errors={...row.errors};for(const key of Object.keys(change))delete errors[key];if('shippingQuoteToken'in change){delete errors.freeShipping;delete errors.shippingAcknowledgement;}return{...current,[id]:{...row,form:next,costUnavailable:costUnavailable??row.costUnavailable,status:undefined,message:undefined,errors:{...errors,...publicationErrors(next,row.prepared)}}};});}
 function choosePublicationMode(next:'same'|'different'){
  setPublicationMode(next);
  if(next!=='same')return;
  setReviews(current=>Object.fromEntries(Object.entries(current).map(([id,row])=>{
   if(!selected.includes(id)||row.status==='published'||row.status==='pending')return[id,row];
   const sharedForm={...form,shippingQuoteToken:undefined,acknowledgeUnavailableShippingCost:false};
   return[id,{...row,form:sharedForm,errors:publicationErrors(sharedForm,row.prepared),costUnavailable:undefined,sourceKey:undefined,draftKey:undefined,reviewKey:crypto.randomUUID(),status:undefined,message:undefined}];
  })));
  setValidationRetry(value=>value+1);
 }
 const selectionKey=JSON.stringify(selected),linksKey=JSON.stringify(lockedLinks),eligibleKey=eligible.map(a=>a.id).join('|');
 useEffect(()=>{
  if(disabled||!loaded||busy){setValidating(false);return;}
  const controller=new AbortController();
  const targets=selected.filter(id=>eligible.some(a=>a.id===id)&&!existingDestination(lockedLinks,id)&&!['published','pending'].includes(reviewsRef.current[id]?.status||'')&&(reviewsRef.current[id]?.sourceKey!==signature||validationRetry>0));
  if(!targets.length){setValidating(false);return;}
  const drafts=Object.fromEntries(targets.map(id=>[id,reviewsRef.current[id]?.draftKey===signature?reviewsRef.current[id].form:form]));
  setReviews(current=>Object.fromEntries(Object.entries(current).map(([id,row])=>[id,targets.includes(id)?{...row,sourceKey:undefined}:row])));
  setValidating(true);setError('');
  const timer=setTimeout(()=>void validateDestinations<Review>(targets,controller.signal,async(id,signal)=>{
   const draft=drafts[id];
   return await request('publicacao-multiconta',{action:'review',empresaId:companyId,connectionId:id,form:{...draft,shippingQuoteToken:undefined,acknowledgeUnavailableShippingCost:false}},signal) as Review;
  },(id,data,failure)=>{
   if(data){setReviews(current=>({...current,[id]:{...data,costUnavailable:true,sourceKey:signature,draftKey:signature,reviewKey:crypto.randomUUID()}}));setResults(current=>({...current,[id]:''}));setTechnical(current=>({...current,[id]:''}));}
   else {setResults(current=>({...current,[id]:failure instanceof Error?failure.message:'Não foi possível validar esta conta. Clique em Revalidar contas.'}));setTechnical(current=>({...current,[id]:(failure as {details?:string}|undefined)?.details||''}));}
  }).finally(()=>{if(!controller.signal.aborted)setValidating(false);}),650);
  return()=>{clearTimeout(timer);controller.abort();};
  // Somente mudança de rascunho/seleção ou tentativa explícita: nunca polling ou token de frete.
 },[companyId,signature,selectionKey,linksKey,eligibleKey,loaded,disabled,validationRetry,request]);
 function focusField(id:string,field:string){requestAnimationFrame(()=>{const target=destinationFieldId(id,field);focusPublicationField(root.current?.ownerDocument.getElementById(target)?target:`destination-${id}-review`,root.current);});}
 async function publish(){
  if(lock.current||disabled||!loaded)return;
  if(validating){setError('Aguarde a validação automática das contas selecionadas. Nenhum anúncio foi enviado.');return;}
  if(!confirmed){setError('Marque a confirmação do produto e dos dados antes de publicar.');requestAnimationFrame(()=>focusPublicationField('catalog-match',root.current));return;}
  if(selected.length&&!publicationMode){setError('Informe se as publicações serão iguais ou distintas antes de publicar.');requestAnimationFrame(()=>focusPublicationField('publication-mode',root.current));return;}
  const targets=selected.filter(id=>!existingDestination(lockedLinks,id)&&reviews[id]?.status!=='published'&&reviews[id]?.status!=='pending');
  const retryUpdates=updateChoice==='yes'&&selected.some(id=>reviews[id]?.status==='published')&&lockedLinks.some(link=>!results[`${link.connectionId}:${link.listingId}`]?.startsWith('Atualizado'));
  if(!targets.length&&!retryUpdates){setError('Selecione novas contas e valide suas condições antes de publicar.');return;}
  for(const id of targets){const row=reviews[id],name=accountDisplayName(eligible.find(account=>account.id===id));if(!row||row.sourceKey!==signature){if(publicationMode==='same')setPublicationMode('different');setError(`${name}: ${results[id]||'a validação ainda não foi concluída. Clique em Revalidar contas.'}`);focusField(id,'form');return;}const pending=destinationErrors(row),first=Object.keys(pending)[0];if(first){if(publicationMode==='same')setPublicationMode('different');setError(`${name}: ${pending[first]}`);focusField(id,first);return;}}
  if(lockedLinks.length&&!updateChoice){setError('Informe se os anúncios existentes devem receber o novo preço.');return;}
  lock.current=true;setBusy(true);onBusyChange(true);setError('');let failed=false,failedField:{id:string;field:string}|undefined;
  const accountName = (id: string) => accountDisplayName(eligible.find(account=>account.id===id));
  const completed = selected.filter(id=>reviews[id]?.status==='published'&&results[id])
   .map(id=>`${accountName(id)} · ${results[id]}.`);
  try{
   for(const id of targets){try{const row=reviews[id];const response=await request('publicacao-multiconta',{action:'publish',empresaId:companyId,connectionId:id,batchKey:batch.current,form:row.form});if(response.status!=='published')throw Error('A publicação não foi confirmada.');const message = `${response.listing.id} · ${listingSaleState(response.listing)}`;
    completed.push(`${accountName(id)} · ${message}.`);
    setReviews(current=>({...current,[id]:{...current[id],status:'published',message}}));
    setResults(current=>({...current,[id]:message}));}
    catch(reason){failed=true;const detail=reason as Error&{code?:string;fields?:Record<string,string>;details?:string};setTechnical(current=>({...current,[id]:detail.details||''}));const uncertain=['publication_uncertain','publication_partial','duplicate_publish'].includes(detail.code||'');const fields=Object.fromEntries(Object.entries(detail.fields||{}).filter(([,value])=>typeof value==='string'&&value));if(!failedField)failedField={id,field:uncertain?'form':Object.keys(fields)[0]||'form'};setReviews(current=>({...current,[id]:{...current[id],status:uncertain?'pending':'failed',message:detail.message,errors:{...current[id].errors,...fields}}}));setResults(current=>({...current,[id]:detail.message||'Falha nesta conta; as outras continuam.'}));}}
   if(updateChoice==='yes')for(const link of lockedLinks){const key=`${link.connectionId}:${link.listingId}`;if(results[key]?.startsWith('Atualizado')){
    completed.push(`${accountName(link.connectionId)} · ${link.listingId} · ${results[key]}`);
    continue;
   }
    try{const response=await request('publicacao-multiconta',{action:'update',empresaId:companyId,connectionId:link.connectionId,listingId:link.listingId,form,fields:['price'],confirmUpdate:true,batchKey:batch.current});if(response.status!=='updated')throw Error('Atualização pendente de confirmação.');const message = `Atualizado. ${listingSaleState(response.listing)}.`;
    completed.push(`${accountName(link.connectionId)} · ${link.listingId} · ${message}`);
    setResults(current=>({...current,[key]:message}));
    if(response.availabilityChanged === true){
     failed=true;
     setError(`O preço foi confirmado, mas a situação de venda mudou em ${accountName(link.connectionId)}. Confira o resultado antes de continuar.`);
     break;
    }}
    catch(reason){failed=true;setResults(current=>({...current,[key]:reason instanceof Error?reason.message:'Atualização não confirmada.'}));}}
   if(!failed&&!selected.some(id=>reviews[id]?.status==='pending'))onCompleted(completed.join('\n'));
  }finally{lock.current=false;setBusy(false);onBusyChange(false);if(failedField){const target=failedField;setPublicationMode('different');requestAnimationFrame(()=>focusField(target.id,target.field));}}
 }
 useImperativeHandle(ref,()=>({publish}));
 return <section ref={root} className={styles.multiPublication} aria-label="Contas de destino da publicação" aria-busy={busy||validating}>
  <h3>Onde anunciar</h3><p className={styles.help}>Escolha as novas contas. O conteúdo, as fotos, a ficha, o EAN e o saldo Online vêm do mesmo cadastro; somente o preço pode variar por anúncio.</p>
  {!loaded&&<p role="status">Conferindo anúncios vinculados…</p>}
  <div className={styles.multiAccountGrid} role="group" aria-label="Contas disponíveis">
  <label className={styles.multiAccountOption}><input ref={selectAllRef} type="checkbox" checked={allSelectableAccountsSelected} aria-checked={someSelectableAccountsSelected&&!allSelectableAccountsSelected?'mixed':allSelectableAccountsSelected} disabled={disabled||busy||!loaded||!selectableAccounts.length} onChange={event=>setSelected(current=>event.target.checked?[...new Set([...current,...selectableAccounts.map(account=>account.id)])]:current.filter(id=>!selectableAccounts.some(account=>account.id===id)))}/><span>Todos<small>Selecionar todas as novas contas</small></span></label>
  {eligible.map(account=>{const existing=existingDestination(lockedLinks,account.id)||reviews[account.id]?.status==='published';return <label key={account.id} className={styles.multiAccountOption}><input type="checkbox" checked={existing||selected.includes(account.id)} disabled={existing||disabled||busy||!loaded||reviews[account.id]?.status==='pending'} onChange={event=>setSelected(current=>event.target.checked?[...current,account.id]:current.filter(id=>id!==account.id))}/><span>{accountDisplayName(account)}<small>{existing?'Já anunciado · seleção bloqueada':reviews[account.id]?.status==='pending'?'Envio pendente · confira antes de repetir':'Nova publicação'}</small></span></label>;})}
  </div>
  <p role="status">{validating?'Validando automaticamente as contas selecionadas. Depois, o frete será consultado por conta…':selected.length?'As contas selecionadas são validadas automaticamente. Confira abaixo as pendências e o frete de cada destino.':'Selecione as contas para iniciar a validação automática.'}</p>
  <BotaoAcaoCompacto disabled={disabled||busy||validating||!loaded||!selected.length} onClick={()=>setValidationRetry(n=>n+1)}>Revalidar contas</BotaoAcaoCompacto>
  {!loaded&&error&&<BotaoAcaoCompacto onClick={()=>setRefresh(value=>value+1)}>Tentar novamente</BotaoAcaoCompacto>}
  {!!selected.length&&<fieldset id="publication-mode" className={styles.multiPublicationMode}><legend>Como serão as publicações?</legend><p className={styles.help}>O conteúdo, as fotos, a ficha, o EAN e o saldo continuam iguais. Escolha se o preço e a conferência de frete serão coletivos ou ajustados por conta.</p>
   <label className={styles.multiAccountOption}><input type="radio" name={`publication-mode-${form.localProductId}`} checked={publicationMode==='same'} disabled={busy||disabled} onChange={()=>choosePublicationMode('same')}/><span>Publicações iguais<small>Usar o preço e as condições do formulário principal em todas as contas.</small></span></label>
   <label className={styles.multiAccountOption}><input type="radio" name={`publication-mode-${form.localProductId}`} checked={publicationMode==='different'} disabled={busy||disabled} onChange={()=>choosePublicationMode('different')}/><span>Publicações distintas<small>Exibir um card para ajustar o preço e conferir o frete de cada conta.</small></span></label>
  </fieldset>}
  {publicationMode==='same'&&<><section className={styles.multiPublicationSharedReview} aria-label="Revisão coletiva das contas"><h4>Publicações iguais</h4><p role="status">{validating?'Validando as condições de cada conta…':`O preço e os dados do formulário principal serão usados nas ${selected.length} conta${selected.length===1?'':'s'} selecionada${selected.length===1?'':'s'}.`}</p>{selected.flatMap(id=>{const row=reviews[id];return row&&row.sourceKey===signature?Object.entries(destinationErrors(row)).map(([field,message])=>({id,field,message})):[];}).length>0&&<ul className={styles.catalogErrors}>{selected.flatMap(id=>{const row=reviews[id];return row&&row.sourceKey===signature?Object.entries(destinationErrors(row)).map(([field,message])=><li key={`${id}:${field}`}>{accountDisplayName(eligible.find(account=>account.id===id))}: {message}</li>):[];})}</ul>}<BotaoAcaoCompacto variante="discreto" disabled={busy||disabled} onClick={()=>choosePublicationMode('different')}>Ajustar condições por conta</BotaoAcaoCompacto></section><div hidden>{selected.filter(id=>!existingDestination(lockedLinks,id)).map(id=>{const row=reviews[id];return row&&!row.status?.match(/published|pending/)?<PublicationShipping key={id} idPrefix={`destination-${id}`} companyId={companyId} accountId={id} reviewId={`${batch.current}:${row.reviewKey||''}`} form={row.form} disabled={busy||disabled||validating} onReview={(change,costUnavailable)=>patch(id,change,costUnavailable)} request={request}/>:null;})}</div></>}
  {publicationMode==='different'&&selected.filter(id=>!existingDestination(lockedLinks,id)).map(id=>{const row=reviews[id],account=eligible.find(account=>account.id===id);if(!row)return <section key={id} id={`destination-${id}-review`} tabIndex={-1} className={styles.multiAccountReview} aria-label={`Preparação de ${accountDisplayName(account)}`}><h4>{accountDisplayName(account)}</h4><p role="status">{results[id]||'Aguardando validação automática…'}</p></section>;return <section key={id} id={`destination-${id}-review`} tabIndex={-1} className={styles.multiAccountReview} aria-label={`Preparação de ${accountDisplayName(account)}`}><h4>{accountDisplayName(account)}</h4>
   {(results[id]||row?.message)&&<p role="status">{results[id]||row?.message}</p>}
   {row&&!row.status?.match(/published|pending/)&&<><div className={styles.catalogFields}>
    <label className={styles.catalogField}>Preço nesta conta<CampoMoeda id={`destination-${id}-price`} value={row.form.price>0?row.form.price.toFixed(2).replace('.',','):''} aria-invalid={!!row.errors.price} aria-describedby={row.errors.price?`destination-${id}-error-price`:undefined} disabled={busy||disabled||validating} onChange={value=>patch(id,{price:moedaDigitadaParaNumero(value)??0,shippingQuoteToken:undefined,acknowledgeUnavailableShippingCost:false})}/></label>
   </div><p className={styles.help}>Fotos, descrição, ficha, garantia, tipo, envio e condição seguem o cadastro principal e não podem variar por conta.</p>{Object.keys(destinationErrors(row)).length>0&&<ul className={styles.catalogErrors} aria-label={`Pendências de ${accountDisplayName(account)}`}>{Object.entries(destinationErrors(row)).map(([key,message])=><li key={key}><span id={`destination-${id}-error-${key}`}>{message}</span> <BotaoAcaoCompacto variante="discreto" disabled={busy||disabled||validating} onClick={()=>focusField(id,key)}>Conferir cadastro</BotaoAcaoCompacto></li>)}</ul>}</>}
   {technical[id]&&<details><summary>Detalhes técnicos (última tentativa)</summary><p className={styles.publicationDiagnostic}>{technical[id]}</p></details>}
   {!row.status?.match(/published|pending/)&&<PublicationShipping idPrefix={`destination-${id}`} companyId={companyId} accountId={id} reviewId={`${batch.current}:${row.reviewKey||''}`} form={row.form} disabled={busy||disabled||validating} onReview={(change,costUnavailable)=>patch(id,change,costUnavailable)} request={request}/>}
  </section>;})}
  {lockedLinks.length>0&&<fieldset className={styles.multiUpdateChoice}><legend>Preço nos anúncios já publicados</legend><p className={styles.help}>{baseline.current!==commercialPublicationKey(form)?'O preço foi alterado. ':''}O conteúdo existente será preservado. Atualizar o preço é uma decisão separada.</p>
   <label className={styles.multiAccountOption}><input type="radio" name={`existing-${form.localProductId}`} value="no" checked={updateChoice==='no'} disabled={busy||disabled} onChange={()=>setUpdateChoice('no')}/>Somente publicar nas novas contas; manter os existentes</label>
   <label className={styles.multiAccountOption}><input type="radio" name={`existing-${form.localProductId}`} value="yes" checked={updateChoice==='yes'} disabled={busy||disabled} onChange={()=>setUpdateChoice('yes')}/>Também atualizar somente o preço dos anúncios existentes</label>
   {updateChoice==='yes'&&lockedLinks.map(link=><p key={`${link.connectionId}:${link.listingId}`} className={styles.help}>{accountDisplayName(eligible.find(account=>account.id===link.connectionId))} · {link.listingId}{results[`${link.connectionId}:${link.listingId}`]?` — ${results[`${link.connectionId}:${link.listingId}`]}`:''}</p>)}
  </fieldset>}
  {error&&<p className={styles.connectionMessage} role="alert">{error}</p>}
 </section>;
});
