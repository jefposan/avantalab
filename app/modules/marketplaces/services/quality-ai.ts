import 'server-only';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getLocalProduct} from './local-products';
import {readCommonProductEditor} from './product-common-content';
import {object,pictureId,pictureUrl} from '../listing-content';
import {groundedQualitySuggestions,type QualityFact} from '../quality-ai';
import {MarketplaceError} from './management-access';
import {uuidIsValid} from './listing-model';
import {researchQualityFacts,type QualityResearchUsage} from './quality-web-research';
import {priceSearchDetails} from '../price-offer-identity';
import {RECOMMENDED_PRODUCT_PICTURES,proposedProductPictures} from '../product-picture-policy';
import {perAccountPictureEditor} from '../picture-account-permissions';

export async function prepareQualityAI(db:SupabaseClient,company:string,actor:string,input:Record<string,unknown>){
 if(!uuidIsValid(input.requestKey))throw new MarketplaceError(400,'invalid_request','Reabra a revisão para iniciar uma tentativa válida.');
 const product=await getLocalProduct(db,company,input.productId);
 const attributes=await readCommonProductEditor(db,company,product.id,'attributes',input.sourceConnectionId,input.sourceId,true);
 const details=await readCommonProductEditor(db,company,product.id,'details',attributes.editor.connectionId,attributes.editor.id,true);
 const pictures=await readCommonProductEditor(db,company,product.id,'pictures',attributes.editor.connectionId,attributes.editor.id,true);
 if(input.perAccountPictures===true)pictures.editor=perAccountPictureEditor({...pictures.editor,reviewTargets:pictures.targets});
 const restrictions=[...attributes.editor.restrictions||[],...details.editor.restrictions||[],...pictures.editor.restrictions||[]].filter((r,i,a)=>a.findIndex(p=>p.connectionId===r.connectionId&&p.id===r.id&&p.message===r.message)===i);
 const facts:QualityFact[]=[];
 function fact(field:string,name:string,value:string,valueId:string|null|undefined,source:string){if(value.trim())facts.push({key:`f${facts.length}`,field,name,value:value.slice(0,1000),valueId,source});}
 for(const a of product.attributes)fact(a.id,a.name,a.value,a.valueId,'Cadastro local confirmado pelo usuário');
 for(const target of attributes.targets)for(const a of target.content!.attributes)fact(a.id,a.name,a.value,a.valueId,`Mercado Livre · ${target.id}`);
 // Não substituir um valor existente, inclusive quando só outra conta o possui.
 const missing=attributes.editor.attributes.filter(a=>a.editable&&!a.value&&!a.valueId&&attributes.targets.every(t=>{const p=t.content?.attributes.find(r=>r.id===a.id);return p&&!p.value&&!p.valueId;}));
 const descriptionRule=details.editor.attributes.find(a=>a.id==='DESCRIPTION');
 const descriptions=[product.description,...details.targets.map(t=>t.details!.values.description)].filter(v=>typeof v==='string'&&v.trim());
 const canDescribe=!!descriptionRule?.editable&&details.targets.every(t=>!t.details!.values.description.trim());
 const photos=[...new Map(pictures.targets.flatMap(t=>t.content!.pictures).filter(p=>pictureId(p.id)&&pictureUrl(p.url)).map(p=>[p.id,p])).values()];
 const existing=pictures.editor.pictures.map(p=>p.id),proposed=photos.slice(0,pictures.editor.maxPictures);
 // Todos os IDs existentes precisam ser preservados; nenhuma foto de variação é removida.
 let pictureProposal=photos.length<=pictures.editor.maxPictures&&existing.every(id=>proposed.some(p=>p.id===id))&&proposed.length>existing.length?proposed:[];
 const usable=facts.filter(f=>missing.some(r=>r.id===f.field));
 const payload={name:product.name,ean:product.ean,fields:missing.map(r=>({id:r.id,name:r.name})),facts:usable};
 const fingerprint=createHash('sha256').update(JSON.stringify({policy:'per-account-gallery-v3',pictureTargets:pictures.editor.pictureAppendTargets,payload,descriptions,photos,revisions:[attributes.editor.revision,details.editor.revision,pictures.editor.revision]})).digest('hex');
 const apiKey=process.env.OPENAI_API_KEY||process.env.OPENAI_API_KEY_AVA;
 if(!apiKey)throw new MarketplaceError(503,'ai_configuration','A IA ainda não está configurada. Nenhum orçamento foi consumido.');
 const serialized=JSON.stringify(payload);
 if(Buffer.byteLength(serialized)>48000)throw new MarketplaceError(400,'ai_size','Há muitos dados para uma consulta econômica. Complete os campos pelo editor manual.');
 const claim=await db.rpc('marketplace_quality_ai_research_claim',{p_company:company,p_actor:actor,p_product:product.id,p_hash:fingerprint,p_key:input.requestKey});
 if(claim.error)throw new MarketplaceError(503,'ai_budget','Não foi possível confirmar o orçamento. Nenhuma consulta à IA foi enviada.');
 const job=object(claim.data);
 if(job.researchPricingVersion!==1)throw new MarketplaceError(503,'ai_budget_version','A pesquisa está aguardando atualização do controle de uso. Nenhuma consulta foi enviada.');
 if(job.status==='cached')return {...object(job.result),restrictions,cached:true};
 if(job.status==='limited')throw new MarketplaceError(429,'ai_monthly_limit','A cota mensal de melhorias com IA foi atingida. Os editores manuais continuam disponíveis.');
 if(job.status!=='claimed')throw new MarketplaceError(409,'ai_busy','Já existe uma análise em andamento. Aguarde e tente novamente.');
 let usage:QualityResearchUsage|null=missing.length?null:{inputTokens:0,outputTokens:0,webCalls:0};
 try{
  const mayAddPictures=(input.perAccountPictures===true?!!pictures.editor.pictureAppendTargets?.length:pictures.targets.every(t=>!t.content?.reason)&&!pictures.editor.restrictions?.length)&&pictures.editor.maxPictures>existing.length;
  if(mayAddPictures&&photos.length<RECOMMENDED_PRODUCT_PICTURES&&process.env.MARKETPLACE_SECRETS_KEY){
   try{const {qualityCatalogPictures}=await import('./quality-catalog-pictures');const catalog=await qualityCatalogPictures(db,company,pictures.editor.pictureSource?.connectionId||attributes.editor.connectionId,product.ean);pictureProposal=proposedProductPictures(pictures.editor.pictures,[...photos,...catalog],pictures.editor.maxPictures);}catch{/* A consulta de ficha continua disponível se o catálogo não responder. */}
  }
  const discovered=await researchQualityFacts(apiKey,{name:product.name,ean:product.ean,...priceSearchDetails(product.attributes)},missing,value=>{usage=value;});
  const evidence=[...usable,...discovered];
  const suggestions=groundedQualitySuggestions({...attributes.editor,attributes:missing},evidence,evidence.map(f=>f.key));
  // Descrição composta apenas de texto já registrado ou fatos confirmados; sem afirmação criada pela IA.
  const description=canDescribe?(descriptions[0]||[product.name,...facts.filter(f=>!['GTIN','EAN','SELLER_SKU'].includes(f.field)).filter((f,i,a)=>a.findIndex(p=>p.field===f.field)===i&&new Set(a.filter(p=>p.field===f.field).map(p=>p.value.toLowerCase())).size===1).map(f=>`${f.name}: ${f.value}`),...suggestions.filter(s=>!facts.some(f=>f.field===s.field)).map(s=>`${s.name}: ${s.value}`)].join('\n')).slice(0,descriptionRule!.maxLength):'';
  const result={productId:product.id,suggestions,description,descriptionSource:descriptions.length?'Descrição já registrada deste produto':'Título e características já registradas deste produto',pictures:pictureProposal,sourceConnectionId:attributes.editor.connectionId,sourceId:attributes.editor.id,revisions:{attributes:attributes.editor.revision,details:details.editor.revision,pictures:pictures.editor.revision},restrictions,pending:missing.filter(r=>!suggestions.some(s=>s.field===r.id)).map(r=>r.name),cached:false,...(mayAddPictures&&Math.max(existing.length,pictureProposal.length)<RECOMMENDED_PRODUCT_PICTURES?{warning:'Não foram localizadas fotos reais suficientes pelo EAN. Adicione imagens do seu produto pelo computador.'}:{})};
  const finished=await db.rpc('marketplace_quality_ai_finish',{p_company:company,p_actor:actor,p_id:job.id,p_status:'completed',p_result:result,p_usage:usage});
  if(finished.error)throw Error('receipt');
  return result;
 }catch{
  await db.rpc('marketplace_quality_ai_finish',{p_company:company,p_actor:actor,p_id:job.id,p_status:'failed',p_result:null,p_usage:usage});
  throw new MarketplaceError(503,'ai_unavailable','Não foi possível concluir a análise. Tente novamente mais tarde.');
 }
}
