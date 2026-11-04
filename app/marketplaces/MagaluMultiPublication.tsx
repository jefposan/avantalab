'use client';
import {useEffect,useRef,useState} from 'react';
import type {MagaluPublicationForm} from '@/app/modules/marketplaces/magalu-publication-model';
import type {PublicationDestination} from '@/app/modules/marketplaces/multi-publication';
import {existingDestination} from '@/app/modules/marketplaces/multi-publication';
import {marketplaceClientRequest,type MarketplaceAccount} from './Anunciados';
import {accountDisplayName} from './account-identification';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import styles from './marketplaces.module.css';
type Props={companyId:string;accounts:MarketplaceAccount[];form:MagaluPublicationForm;confirmed:boolean;disabled:boolean;onBusyChange:(busy:boolean)=>void;onCompleted:()=>void};
type Review={form:MagaluPublicationForm;errors:Record<string,string>;status?:'pending'|'published'|'failed';message?:string};
export default function MagaluMultiPublication({companyId,accounts,form,confirmed,disabled,onBusyChange,onCompleted}:Props){
 const [links,setLinks]=useState<PublicationDestination[]>([]),[loaded,setLoaded]=useState(false),[selected,setSelected]=useState<string[]>([]),[rows,setRows]=useState<Record<string,Review>>({}),[error,setError]=useState(''),[choice,setChoice]=useState(''),[busy,setBusy]=useState(false),[updates,setUpdates]=useState<Record<string,string>>({}),[refresh,setRefresh]=useState(0);
 const lock=useRef(false),batch=useRef(crypto.randomUUID()),signature=JSON.stringify(form);
 const eligible=accounts.filter(account=>account.provider==='magalu'&&account.status==='connected'&&account.magalu_catalog_authorized);
 useEffect(()=>{const controller=new AbortController();setLoaded(false);void marketplaceClientRequest('publicacao-multiconta',{action:'context',empresaId:companyId,productId:form.productId},controller.signal).then(data=>{if(!controller.signal.aborted){setLinks(data.links.filter((link:PublicationDestination)=>link.provider==='magalu'&&link.status!=='deleted'));setLoaded(true);setError('');}}).catch(reason=>{if(!controller.signal.aborted)setError(reason.message);});return()=>controller.abort();},[companyId,form.productId,refresh]);
 useEffect(()=>{setRows(current=>Object.fromEntries(Object.entries(current).filter(([,row])=>row.status==='published'||row.status==='pending')));setChoice('');},[signature]);
 async function run(action:'review_magalu'|'publish_magalu'|'advance_magalu'){
  if(lock.current||disabled||!loaded)return;
  if(!selected.length){setError('Selecione uma ou mais novas contas.');return;}
  if(action==='publish_magalu'&&(!confirmed||links.length&&!choice)){setError('Confirme a ficha e informe se os anúncios existentes devem ser atualizados.');return;}
  if(action==='publish_magalu'&&selected.some(id=>!rows[id]||Object.keys(rows[id].errors).length)){setError('Valide as contas e corrija as pendências antes de publicar.');return;}
  lock.current=true;setBusy(true);onBusyChange(true);setError('');let failed=false;const published=new Set<string>();
  try{
   for(const id of selected){const row=rows[id];if(existingDestination(links,id)||row?.status==='published'){published.add(id);continue;}if((action==='publish_magalu'||action==='review_magalu')&&row?.status==='pending')continue;if(action==='advance_magalu'&&row?.status!=='pending')continue;
    try{const response=await marketplaceClientRequest('publicacao-multiconta',{action,empresaId:companyId,connectionId:id,form:row?.form||form,batchKey:batch.current});
     if(action==='review_magalu')setRows(current=>({...current,[id]:{form:row?.form||{...form},errors:response.errors}}));
     else{const done=response.status==='published'||response.publication?.status==='published';if(done)published.add(id);setRows(current=>({...current,[id]:{...current[id],status:done?'published':'pending',message:done?'Publicado e confirmado no Magalu':`Em processamento no Magalu · ${response.publication?.stage||'aguardando confirmação'}`}}));}
    }catch(reason){failed=true;setRows(current=>({...current,[id]:{form:current[id]?.form||form,errors:current[id]?.errors||{},status:'failed',message:reason instanceof Error?reason.message:'Resposta não confirmada.'}}));}}
   if(action==='publish_magalu'&&choice==='yes')for(const link of links){const key=link.listingId+link.connectionId;if(updates[key]==='Atualizado')continue;try{const response=await marketplaceClientRequest('publicacao-multiconta',{action:'update_magalu',empresaId:companyId,connectionId:link.connectionId,listingId:link.listingId,form,confirmUpdate:true,fields:['price','description'],batchKey:batch.current});if(response.status!=='updated')throw Error('Atualização pendente de confirmação.');setUpdates(current=>({...current,[key]:'Atualizado'}));}catch(reason){failed=true;setUpdates(current=>({...current,[key]:reason instanceof Error?reason.message:'Pendente'}));}}
   if(action!=='review_magalu'&&!failed&&selected.every(id=>published.has(id)||rows[id]?.status==='published'))onCompleted();
  }finally{lock.current=false;setBusy(false);onBusyChange(false);}
 }
 return <section className={styles.multiPublication} aria-label="Contas Magalu de destino" aria-busy={busy}><h3>Onde anunciar</h3>
  <p className={styles.help}>Selecione as novas lojas ao final. O cadastro, o EAN e o saldo Online são os mesmos; preço e descrição podem variar por loja.</p>
  <div className={styles.multiAccountGrid} role="group" aria-label="Contas disponíveis">
  {eligible.map(account=>{const existing=existingDestination(links,account.id)||rows[account.id]?.status==='published';return<label key={account.id} className={styles.multiAccountOption}><input type="checkbox" checked={existing||selected.includes(account.id)} disabled={existing||busy||disabled||!loaded||rows[account.id]?.status==='pending'} onChange={event=>setSelected(current=>event.target.checked?[...current,account.id]:current.filter(id=>id!==account.id))}/><span>{accountDisplayName(account)}<small>{existing?'Já anunciado · seleção bloqueada':'Nova publicação'}</small></span></label>;})}
  </div>
  <BotaoAcaoCompacto disabled={!loaded||busy||disabled||!selected.length} onClick={()=>void run('review_magalu')}>Validar contas selecionadas</BotaoAcaoCompacto>
  {!loaded&&error&&<BotaoAcaoCompacto onClick={()=>setRefresh(value=>value+1)}>Tentar novamente</BotaoAcaoCompacto>}
  {selected.map(id=>{const row=rows[id];if(!row)return null;return <section key={id} className={styles.multiAccountReview}><h4>{accountDisplayName(eligible.find(account=>account.id===id))}</h4>{row.message&&<p role="status">{row.message}</p>}{!['published','pending'].includes(row.status||'')&&<><label className={styles.catalogField}>Preço nesta loja (R$)<input type="number" min="0.01" step="0.01" disabled={busy||disabled} value={row.form.priceCents/100} onChange={event=>setRows(current=>({...current,[id]:{...row,form:{...row.form,priceCents:Math.round(Number(event.target.value)*100)},errors:{form:'Valide novamente após alterar os dados.'}}}))}/></label><label className={styles.catalogField}>Descrição nesta loja<textarea value={row.form.description} disabled={busy||disabled} onChange={event=>setRows(current=>({...current,[id]:{...row,form:{...row.form,description:event.target.value},errors:{form:'Valide novamente após alterar os dados.'}}}))}/></label></>}{Object.values(row.errors).map((message,index)=><p role="status" key={index}>{message}</p>)}</section>;})}
  {links.length>0&&<fieldset className={styles.multiUpdateChoice}><legend>Atualizar os anúncios já publicados?</legend><label className={styles.multiAccountOption}><input type="radio" name="magalu-update-existing" checked={choice==='no'} disabled={busy||disabled} onChange={()=>setChoice('no')}/>Não, somente os novos anúncios</label><label className={styles.multiAccountOption}><input type="radio" name="magalu-update-existing" checked={choice==='yes'} disabled={busy||disabled} onChange={()=>setChoice('yes')}/>Sim, atualizar preço e descrição dos existentes com o formulário principal</label>{links.map(link=><p key={link.listingId+link.connectionId} className={styles.help}>{link.listingId} · {updates[link.listingId+link.connectionId]||'Conta já anunciada, marcada e bloqueada'}</p>)}</fieldset>}
  <div className={styles.preparationActions}><BotaoAcaoCompacto className={styles.preparationPublish} disabled={busy||disabled||!loaded} onClick={()=>void run('publish_magalu')}>Publicar nas contas selecionadas</BotaoAcaoCompacto>{Object.values(rows).some(row=>row.status==='pending')&&<BotaoAcaoCompacto disabled={busy||disabled} onClick={()=>void run('advance_magalu')}>Conferir andamento no Magalu</BotaoAcaoCompacto>}</div>
  {error&&<p className={styles.connectionMessage} role="alert">{error}</p>}
 </section>;
}
