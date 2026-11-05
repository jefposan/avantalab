'use client';
import {useEffect,useState} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import type {ListingQuality} from '@/app/modules/marketplaces/listing-quality';
import type {ProductCommonKind} from '@/app/modules/marketplaces/product-common-content';
import type {marketplaceClientRequest} from './Anunciados';
import type {ReviewEditors} from './product-listing-review';
import {reviewGoalCards,reviewPhotoAccess,type ReviewQualityRecord} from './review-quality-goals';
import {marketplaceDateTimeLabel} from '@/app/modules/marketplaces/date-format';
import styles from './product-listing-review.module.css';

export default function ReviewQualityObjectives({companyId,editors,refreshKey,request,dark,brand,disabled,onLoading,onEdit,accountName}:{companyId:string;editors:ReviewEditors;refreshKey:number;request:typeof marketplaceClientRequest;dark:boolean;brand:string;disabled:boolean;onLoading:(loading:boolean)=>void;onEdit:(kind:ProductCommonKind)=>void;accountName:(id:string)=>string}){
 const [records,setRecords]=useState<ReviewQualityRecord[]>([]),[loading,setLoading]=useState(true),[issue,setIssue]=useState('');
 const targetsKey=JSON.stringify((editors.attributes.reviewTargets||[]).map(t=>({connectionId:t.connectionId,id:t.id})));
 useEffect(()=>{
  const controller=new AbortController();
  const targets=JSON.parse(targetsKey) as {connectionId:string;id:string}[];
  async function consult(){
   setLoading(true);onLoading(true);setIssue('');
   const next:ReviewQualityRecord[]=[];let failed=0;
   for(let i=0;i<targets.length&&!controller.signal.aborted;i+=2){
    const results=await Promise.allSettled(targets.slice(i,i+2).map(async target=>{
     const result=await request('anunciados/qualidade?'+new URLSearchParams({empresaId:companyId,connectionId:target.connectionId,id:target.id}),undefined,AbortSignal.any([controller.signal,AbortSignal.timeout(40_000)]));
     if(result.connectionId!==target.connectionId||result.listingId!==target.id||!Array.isArray(result.quality))throw Error('Avaliação de outra conta.');
     const quality=result.quality as ListingQuality[];
     return {...target,quality,issue:quality.length?'':'O ML não retornou a avaliação desta conta.'};
    }));
    for(const result of results){if(result.status==='fulfilled'){next.push(result.value);if(result.value.issue)failed++;}else failed++;}
   }
   if(controller.signal.aborted)return;
   setRecords(previous=>[...next,...previous.filter(old=>!next.some(row=>row.connectionId===old.connectionId&&row.id===old.id))]);
   setIssue(failed?failed+' conta(s) sem avaliação atual. Use Atualizar objetivos para tentar novamente.':'');
   setLoading(false);onLoading(false);window.dispatchEvent(new Event('avanta:quality-updated'));
  }
  void consult();
  return()=>{controller.abort();onLoading(false);};
 },[companyId,targetsKey,refreshKey,request,onLoading]);
 const cards=reviewGoalCards(records,editors);
 const accountQuality=records.map(record=>({record,quality:record.quality.find(q=>q.entityType==='ITEM')||record.quality[0]}));
 const groups=[{title:'Pode ajustar no AvantaLab',cards:cards.filter(card=>card.action)},{title:'Restrições e ajustes externos',cards:cards.filter(card=>!card.action)}];
 return <section className={styles.objectives} aria-label="Sugestões do Mercado Livre" aria-busy={loading}>
  <h3>O que o Mercado Livre recomenda</h3>
  <p className={styles.objectivesHelp}>A nota e as recomendações vêm do ML. As permissões abaixo indicam o que pode ser alterado em cada anúncio.</p>
  <CarregamentoDadosModulo ativo={loading} variante="indicador" titulo="Consultando sugestões do Mercado Livre" mensagem="Consultando sugestões…" temaEscuro={dark} corPrimaria={brand}/>
  {!!accountQuality.length&&<section className={styles.goalGroup} aria-label="Qualidade por conta"><h4>Qualidade por conta</h4><p className={styles.objectivesHelp}>O Mercado Livre avalia cada anúncio e suas condições de venda. O resumo do produto usa a menor nota; as recomendações aplicáveis podem variar entre contas.</p><ul className={styles.goalTargets}>{accountQuality.map(({record,quality})=><li key={`${record.connectionId}:${record.id}`} className={styles.goalTarget}><div><strong>{accountName(record.connectionId)}</strong><span>{record.id}</span></div><span>{quality?.score==null?'Sem nota informada':`${quality.score}/100 · ${quality.level}`}</span>{quality?.calculatedAt&&<small>Calculada em {marketplaceDateTimeLabel(quality.calculatedAt)} (Brasília)</small>}</li>)}</ul></section>}
  {issue&&<p role="status" className={styles.consultIssue}>{issue}</p>}
  {!loading&&!cards.length&&<p role="status">{records.some(r=>r.quality.length)?'O ML não informou sugestões pendentes nesta consulta.':'As sugestões ainda não estão disponíveis. Tente Atualizar objetivos.'}</p>}
  {groups.filter(group=>group.cards.length).map(group=><section key={group.title} className={styles.goalGroup} aria-label={group.title}><h4>{group.title}</h4><ul className={styles.goalList}>{group.cards.map(card=>{const access=card.kind==='pictures'?reviewPhotoAccess(editors,card.targets):[];const catalog=access.length>0&&access.every(row=>row.state==='catalog');return <li key={card.key} className={styles.goalCard}>
   <div className={styles.goalHeading}><strong>{card.title}</strong><span className={card.action?styles.goalAvailable:styles.goalRestricted}>{card.action?(access.some(row=>!row.allowed)?'Disponível em parte dos anúncios':'Edição disponível'):catalog?'Controlado pelo catálogo ML':'Conferência necessária'}</span></div>
   <p>{card.instruction}</p>
   {card.reason&&<p className={styles.goalExplanation}>{card.reason}</p>}
   {access.length>0?<ul className={styles.goalTargets} aria-label="Permissão de fotos por anúncio">{access.map(row=><li key={row.key} className={styles.goalTarget}>
    <div><strong>{accountName(row.target.connectionId)}</strong><span>{row.target.id}</span></div>
    <span className={styles.goalPhotoCount}>{row.count==null?'Fotos não confirmadas':`${row.count} foto${row.count===1?'':'s'} no anúncio`}</span>
    <p>{row.allowed?'Pode adicionar fotos pelo AvantaLab.':row.state==='catalog'?'Galeria do catálogo ML. Alteração sujeita à análise do Mercado Livre.':row.state==='limit'?'Limite de fotos atingido neste anúncio.':row.reason}</p>
   </li>)}</ul>:<ul className={styles.goalTargets} aria-label="Anúncios desta recomendação">{card.targets.map(target=><li key={`${target.connectionId}:${target.id}`} className={styles.goalTarget}><div><strong>{accountName(target.connectionId)}</strong><span>{target.id}</span></div></li>)}</ul>}
   {card.action&&card.kind&&<BotaoAcaoCompacto variante="primario" disabled={disabled} onClick={()=>onEdit(card.kind!)}>{card.action}</BotaoAcaoCompacto>}
  </li>;})}</ul></section>)}
 </section>;
}
