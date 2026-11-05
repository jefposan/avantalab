'use client';
import {useState} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import {commonProductRequest,type CommonEditProgress} from './common-product-request';
import type {marketplaceClientRequest} from './Anunciados';
import type {prepareQualityAI} from '@/app/modules/marketplaces/services/quality-ai';
import type {ProductCommonKind} from '@/app/modules/marketplaces/product-common-content';
import styles from './listing-quality.module.css';
type Proposal=Awaited<ReturnType<typeof prepareQualityAI>>;
type ReviewData={productId:string;suggestions:{field:string;name:string;value:string;source:string;sourceUrl?:string;evidence?:string}[];description:string;descriptionSource:string;pictures:{id:string;url:string}[];sourceConnectionId:string;sourceId:string;revisions:Record<ProductCommonKind,string>;restrictions?:{connectionId:string;id:string;message:string}[];pending:string[];cached:boolean};
export default function QualityAIReview({companyId,productId,request,dark,brand,onBusy,onClose,onManual}:{companyId:string;productId:string;request:typeof marketplaceClientRequest;dark:boolean;brand:string;onBusy:(value:boolean)=>void;onClose:()=>void;onManual?:()=>void}){
 const [data,setData]=useState<ReviewData|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reviewed,setReviewed]=useState(false),[selected,setSelected]=useState<string[]>([]),[results,setResults]=useState<CommonEditProgress[]>([]),[finished,setFinished]=useState(false);
 async function analyze(){if(busy)return;setBusy(true);onBusy(true);setError('');try{const result=await request('produtos/qualidade/ia',{empresaId:companyId,productId,requestKey:crypto.randomUUID()},AbortSignal.timeout(95000)) as Proposal as ReviewData;if(result.productId!==productId||!Array.isArray(result.suggestions))throw Error('Revisão inválida. Nenhum anúncio foi alterado.');setData(result);setSelected([...result.suggestions.map(s=>s.field),...(result.description?['description']:[]),...(result.pictures.length?['pictures']:[])]);}catch(e){setError(e instanceof Error?e.message:'A análise não foi concluída.');}finally{setBusy(false);onBusy(false);}}
 async function apply(){if(!data||!reviewed||busy||finished)return;setBusy(true);onBusy(true);setError('');const all:CommonEditProgress[]=[];
  try{
   const changes:{kind:ProductCommonKind;values:unknown}[]=[];
   const attrs=Object.fromEntries(data.suggestions.filter(s=>selected.includes(s.field)).map(s=>[s.field,s.value]));
   if(Object.keys(attrs).length)changes.push({kind:'attributes',values:attrs});
   if(data.description&&selected.includes('description'))changes.push({kind:'details',values:{DESCRIPTION:data.description}});
   if(data.pictures.length&&selected.includes('pictures'))changes.push({kind:'pictures',values:data.pictures.map(p=>p.id)});
   // Nenhuma gravação antes de conferir se toda a proposta ainda é atual.
   for(const change of changes){const current=await request(`produtos/qualidade?${new URLSearchParams({empresaId:companyId,productId,kind:change.kind,sourceConnectionId:data.sourceConnectionId,sourceId:data.sourceId,localDraft:'true'})}`,undefined,AbortSignal.timeout(55000));if(current.revision!==data.revisions[change.kind])throw Error('Um anúncio mudou desde a análise. Feche e refaça a revisão antes de aplicar.');}
   let partial=false;
   for(const change of changes){
    const prefix=[...all];let latest:CommonEditProgress[]=[];
    const batch=commonProductRequest({companyId,productId,kind:change.kind,sourceConnectionId:data.sourceConnectionId,sourceId:data.sourceId,request,onlyMissing:true,onProgress:r=>{latest=r;setResults([...prefix,...r]);}});
    const editor=await batch(`anunciados/qualidade/conteudo?revisao=1`,undefined,AbortSignal.timeout(55000));
    // Outra seção aplicada nesta revisão pode mudar a revisão global do anúncio.
    // Os destinos são sempre relidos e todas as permissões validadas pelo servidor.
    try{await batch('anunciados/qualidade/conteudo',{revision:editor.revision,values:change.values},undefined,'PATCH');}
    catch(e){if((e as {code?:string})?.code!=='common_partial')throw e;partial=true;}
    all.push(...latest);
   }
   setFinished(true);window.dispatchEvent(new Event('avanta:quality-updated'));
   if(partial)setError('Aplicação parcial. Confira abaixo o motivo de cada anúncio não atualizado.');
  }catch(e){setError(e instanceof Error?e.message:'A aplicação não foi confirmada. Confira os resultados antes de tentar novamente.');setFinished(true);}
  finally{setBusy(false);onBusy(false);}
 }
 function check(id:string){setReviewed(false);setSelected(v=>v.includes(id)?v.filter(p=>p!==id):[...v,id]);}
 return <section className={styles.panel} aria-label="Revisar melhorias com IA" aria-busy={busy}>
  <h4>{data?'Revisar melhorias':'Completar com IA?'}</h4>
  {!data&&<p>Será utilizada uma pequena parte da sua cota mensal. Revise as sugestões e confirme para aplicar.</p>}
  <CarregamentoDadosModulo ativo={busy} variante="local" titulo="Melhorias do anúncio" mensagem={data?'Validando e enviando os ajustes revisados…':'Pesquisando dados do produto e conferindo as fontes…'} temaEscuro={dark} corPrimaria={brand}/>
  {error&&<p role="alert">{error}</p>}
  {data&&<>
   {!!data.restrictions?.length&&<details><summary>Restrições de envio ao Mercado Livre</summary>{data.restrictions.map((r,i)=><p key={i}>{r.id}: {r.message}</p>)}</details>}
   {data.suggestions.map(s=><div key={s.field} className={styles.reviewOption}><label><input type="checkbox" checked={selected.includes(s.field)} disabled={busy||finished} onChange={()=>check(s.field)}/> {s.name}: <strong>{s.value}</strong></label><small> · Fonte: {s.sourceUrl?<a href={s.sourceUrl} target="_blank" rel="noopener noreferrer">{s.source} ↗</a>:s.source}</small>{s.evidence&&<small>Trecho: {s.evidence}</small>}</div>)}
   {!!data.description&&<label className={styles.reviewOption}><input type="checkbox" checked={selected.includes('description')} disabled={busy||finished} onChange={()=>check('description')}/> Completar descrição · {data.descriptionSource}<pre style={{whiteSpace:'pre-wrap'}}>{data.description}</pre></label>}
   {!!data.pictures.length&&<label className={styles.reviewOption}><input type="checkbox" checked={selected.includes('pictures')} disabled={busy||finished} onChange={()=>check('pictures')}/> Recuperar {data.pictures.length} fotos já disponíveis nos anúncios vinculados<div className={styles.actions}>{data.pictures.map(p=><a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">Ver foto {p.id} ↗</a>)}</div></label>}
   {!!data.pending.length&&<><p>Preencha manualmente os dados não comprovados: {data.pending.join(', ')}.</p>{onManual&&<BotaoAcaoCompacto disabled={busy} onClick={onManual}>Preencher ficha técnica</BotaoAcaoCompacto>}</>}
   {!data.suggestions.length&&!data.description&&!data.pictures.length&&<p role="status">Nenhuma sugestão comprovada disponível.</p>}
   {!finished&&(data.suggestions.length>0||!!data.description||data.pictures.length>0)&&<><label className={styles.reviewConfirm}><input type="checkbox" checked={reviewed} disabled={busy||!selected.length} onChange={e=>setReviewed(e.target.checked)}/> Revisei os valores e as fontes. Autorizo aplicar somente as opções selecionadas a todos os anúncios vinculados, preservando os preços por conta.</label><BotaoAcaoCompacto disabled={busy||!reviewed||!selected.length} onClick={()=>void apply()}>Aplicar melhorias revisadas</BotaoAcaoCompacto></>}
   {finished&&!error&&<p role="status">Melhorias confirmadas. O Mercado Livre recalcula a pontuação; consulte os objetivos ou aguarde a atualização diária.</p>}
  </>}
  {!!results.length&&<ul aria-label="Resultado por anúncio">{results.map((r,i)=><li key={i}>{r.id}: {r.message}</li>)}</ul>}
  <div className={styles.actions}><BotaoAcaoCompacto disabled={busy} onClick={onClose}>{finished?'Fechar':'Cancelar'}</BotaoAcaoCompacto>{!data&&<BotaoAcaoCompacto variante="primario" disabled={busy} onClick={()=>void analyze()}>{busy?'Analisando…':'Continuar'}</BotaoAcaoCompacto>}</div>
 </section>;
}
