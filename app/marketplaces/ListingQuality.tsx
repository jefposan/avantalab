'use client';
import {useEffect,useRef,useState} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import type {EditField} from '@/app/modules/marketplaces/listing-editor';
import type {ListingQuality as Quality} from '@/app/modules/marketplaces/listing-quality';
import type {ListingSnapshot} from '@/app/modules/marketplaces/services/listing-model';
import type {marketplaceClientRequest} from './Anunciados';
import QualityGauge from './QualityGauge';
import ListingContentEditor from './ListingContentEditor';
import type {ContentKind} from '@/app/modules/marketplaces/listing-content';
import styles from './listing-quality.module.css';
import {marketplaceDateTimeLabel} from '@/app/modules/marketplaces/date-format';

type Result={listingId:string;connectionId:string;snapshot:ListingSnapshot;quality:Quality[];notices:string[];checkedAt:string};
export default function ListingQuality({companyId,accountId,itemId,accountName='Conta conectada',request,dark,brand,disabled=false,canEdit,onEdit,canManageContent=false,onContentBusy,onContentSaved,onContentRequest,hideContentActions=false,consultationKey=0,embedded=false}:{companyId:string;accountId:string;itemId:string;accountName?:string;request:typeof marketplaceClientRequest;dark:boolean;brand:string;disabled?:boolean;canEdit?:(field:EditField)=>boolean;onEdit?:(field:EditField,snapshot:ListingSnapshot)=>void;canManageContent?:boolean;onContentBusy?:(busy:boolean)=>void;onContentSaved?:()=>void;onContentRequest?:(kind:ContentKind)=>void;hideContentActions?:boolean;consultationKey?:number;embedded?:boolean}){
 const [data,setData]=useState<Result|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [content,setContent]=useState<ContentKind|null>(null),[contentUpdated,setContentUpdated]=useState(false);
 const controller=useRef<AbortController|null>(null),lock=useRef(false);
 useEffect(()=>{setData(null);setError('');setLoading(false);lock.current=false;return()=>{controller.current?.abort();};},[companyId,accountId,itemId]);
 async function load(){
  if(lock.current||disabled)return;
  lock.current=true;setLoading(true);setError('');const current=new AbortController();controller.current=current;
  try{
   const params=new URLSearchParams({empresaId:companyId,connectionId:accountId,id:itemId});
   const result=await request(`anunciados/qualidade?${params}`,undefined,AbortSignal.any([current.signal,AbortSignal.timeout(55_000)])) as Result;
   if(result.listingId!==itemId||result.connectionId!==accountId||!Array.isArray(result.quality)||!Array.isArray(result.notices))throw new Error('Não foi possível conferir os objetivos deste anúncio.');
   if(!current.signal.aborted){setData(result);setContentUpdated(false);window.dispatchEvent(new Event('avanta:quality-updated'));}
  }catch(failure){if(!current.signal.aborted)setError(failure instanceof Error?failure.message:'Não foi possível consultar os objetivos. Tente novamente.');}
  finally{if(controller.current===current){lock.current=false;if(!current.signal.aborted)setLoading(false);}}
 }
 const primary=data?.quality.find(q=>q.entityType==='ITEM')||data?.quality[0];
 const contentKind=(id:string):ContentKind|null=>/PICTURE/.test(id)?'pictures':/TECHNICAL|ATTRIBUTE|UNIVERSAL_CODE|GTIN/.test(id)?'attributes':null;
 const canAdjustHere=(goal:Quality['goals'][number])=>!!goal.field&&!!onEdit&&!!canEdit?.(goal.field);
 useEffect(()=>{if(consultationKey)void load();},[consultationKey]);
 function openContent(kind:ContentKind){if(onContentRequest)onContentRequest(kind);else setContent(kind);}
 return <section className={`${styles.panel} ${dark?styles.dark:''}`} aria-label={`Qualidade do anúncio ${itemId}`} aria-busy={loading}>
  {!embedded&&<div className={styles.heading}><div><h3>Qualidade do anúncio</h3><p className={styles.help}>Objetivos e correções em um só lugar.</p></div><QualityGauge score={primary?.score??null} level={primary?.level||''}/><BotaoAcaoCompacto disabled={disabled||loading} onClick={()=>void load()}>{loading?'Consultando…':data?'Atualizar objetivos':'Consultar objetivos'}</BotaoAcaoCompacto></div>}
  {!data&&!loading&&!error&&<p className={styles.help}>{embedded?'Aguardando a consulta dos objetivos desta conta.':'Consulte a avaliação do Mercado Livre e os objetivos pendentes desta conta.'}</p>}
  <CarregamentoDadosModulo ativo={loading} variante="local" titulo="Qualidade do anúncio" mensagem="Consultando os objetivos no Mercado Livre…" temaEscuro={dark} corPrimaria={brand}/>
  {error&&<p role="alert">{error} {data?'A avaliação anterior foi preservada.':''}</p>}
  {data&&<>
   <div className={styles.account}><strong>Mercado Livre · {accountName}</strong><span>{itemId}</span><small>Consulta em {marketplaceDateTimeLabel(data.checkedAt)}</small></div>
   {canManageContent&&!hideContentActions&&<div className={styles.actions}><BotaoAcaoCompacto disabled={disabled||loading} onClick={()=>openContent('pictures')}>Gerenciar fotos</BotaoAcaoCompacto><BotaoAcaoCompacto disabled={disabled||loading} onClick={()=>openContent('attributes')}>Editar ficha técnica</BotaoAcaoCompacto></div>}
   {contentUpdated&&<p className={styles.help} role="status">Conteúdo alterado. Atualize os objetivos para consultar a avaliação após o recálculo do ML.</p>}
   {data.notices.map(notice=><p key={notice} role="status">{notice}</p>)}
   {data.quality.map(quality=>{
    const pending=quality.goals.filter(goal=>!goal.completed),completed=quality.goals.filter(goal=>goal.completed);
    return <div className={styles.entity} key={quality.entityId}>
     <div className={styles.entityHeading}><h4>{quality.entityType==='USER_PRODUCT'?'Objetivos dos dados compartilhados do produto':'Objetivos pendentes do anúncio'}</h4>{quality!==primary&&<QualityGauge score={quality.score} level={quality.level}/>}</div>
     {quality.calculatedAt&&<p className={styles.help}>Calculado pelo ML em {marketplaceDateTimeLabel(quality.calculatedAt)}</p>}
     <p>{pending.length} objetivo(s) pendente(s) · {completed.length} cumprido(s)</p>
     {!quality.goals.length&&<p>O ML não retornou objetivos detalhados para esta avaliação.</p>}
     <ul className={styles.goals}>{pending.map(goal=>{const kind=contentKind(goal.id),adjustable=canAdjustHere(goal),external=!!goal.link&&!kind&&!adjustable;return <li className={styles.goal} key={goal.id}><div><span className={`${styles.tag} ${goal.warning?styles.warning:''}`}>{goal.warning?'ATENÇÃO':'OPORTUNIDADE DE MELHORIA'}</span><strong>{goal.title}</strong><small className={styles.help}>{goal.group}</small></div>
      <div className={styles.actions}>{kind&&canManageContent?<BotaoAcaoCompacto variante="primario" disabled={disabled||loading} onClick={()=>openContent(kind)}>{kind==='pictures'?'Gerenciar fotos':'Completar ficha técnica'}</BotaoAcaoCompacto>:adjustable?<BotaoAcaoCompacto disabled={disabled||loading} onClick={()=>onEdit!(goal.field!,data.snapshot)}>Ajustar no AvantaLab</BotaoAcaoCompacto>:null}
      </div>
      {kind&&!canManageContent&&<p className={styles.help}>Abra Revisar anúncio para editar este dado comum no AvantaLab e aplicar somente nos vínculos elegíveis.</p>}
      {!goal.field&&!kind&&!external&&<p className={styles.help}>{goal.id.includes('STOCK')?'Confira a quantidade física em Estoques e movimentações. Não aumente o saldo apenas para cumprir esta meta.':'Este recurso depende das permissões e da disponibilidade de API do Mercado Livre.'}</p>}
      {external&&<p className={styles.externalPending} role="status"><strong>Ação exclusiva do Mercado Livre · {accountName}</strong><span>O AvantaLab não abre esta meta em uma sessão externa, não armazena senha e não solicita código ou reconhecimento facial. Quando for necessário, o responsável por esta conta conclui o ajuste no Mercado Livre e você retorna aqui para Atualizar objetivos.</span></p>}
     </li>;})}</ul>
     {!!completed.length&&<details className={styles.completed}><summary>✓ Objetivos cumpridos ({completed.length})</summary><ul>{completed.map(goal=><li key={goal.id}>{goal.title}</li>)}</ul></details>}
    </div>;
   })}
  </>}
  <p className={styles.help}>Revise e confirme antes de enviar. A nota é calculada pelo ML e pode levar tempo para refletir as correções.</p>
  {content&&<ListingContentEditor companyId={companyId} accountId={accountId} itemId={itemId} kind={content} request={request} dark={dark} brand={brand} onClose={()=>setContent(null)} onBusy={onContentBusy} onSaved={()=>{setContentUpdated(true);onContentSaved?.();}}/>}
 </section>;
}
