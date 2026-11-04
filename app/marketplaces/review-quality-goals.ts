import type {ListingQuality} from '@/app/modules/marketplaces/listing-quality';
import type {ProductCommonKind} from '@/app/modules/marketplaces/product-common-content';
import type {ReviewEditors} from './product-listing-review';
import {pictureAccountPermissions} from '../modules/marketplaces/picture-account-permissions.ts';

export type ReviewQualityRecord={connectionId:string;id:string;quality:ListingQuality[];issue?:string};
export type ReviewGoalCard={key:string;title:string;instruction:string;kind:ProductCommonKind|null;action:string|null;reason:string;targets:{connectionId:string;id:string}[]};

export function reviewPhotoAccess(editors:ReviewEditors,targets:{connectionId:string;id:string}[]){
 return pictureAccountPermissions(editors.pictures).filter(row=>targets.some(t=>t.connectionId===row.target.connectionId&&t.id===row.target.id)).map(row=>({...row,
  state:row.allowed?'available':/catálogo confirmado|controlad[oa].*catálogo|definid[oa].*catálogo|conteúdo de catálogo/i.test(row.reason)?'catalog':/espaço disponível/i.test(row.reason)?'limit':'verification',
  count:row.target.content?.pictures.length??null,
 }));
}

export function reviewSectionBlock(editors:ReviewEditors,kind:ProductCommonKind):string{
 const editor=editors[kind];
 if(kind==='pictures'&&editor.pictureAppendTargets)return editor.pictureAppendTargets.length?'':editor.reason||'Nenhuma conta está liberada para adicionar fotos.';
 const reach=editor.restrictions?.find(r=>/fora deste produto|alcance não confirmado/i.test(r.message));
 const reason=editor.reason||reach?.message||'';
 if(reason){
  if(/catálogo/i.test(reason))return 'O Mercado Livre controla este conteúdo pelo catálogo em uma ou mais contas vinculadas.';
  if(/fora deste produto/i.test(reason))return 'Este conteúdo também afeta outro anúncio ainda fora deste cadastro. Confira o vínculo antes de enviar.';
  if(/Limites ou identificação das fotos/i.test(reason))return 'Não foi possível confirmar o limite ou as fotos da categoria. Recarregue os dados.';
  return reason;
 }
 if(kind==='pictures'&&editor.maxPictures<1)return 'O Mercado Livre ainda não confirmou o limite de fotos.';
 return '';
}

/** As sugestões vêm do ML. Agrupa a mesma meta sem repetir o formulário por conta. */
export function reviewGoalCards(records:ReviewQualityRecord[],editors:ReviewEditors):ReviewGoalCard[]{
 const cards=new Map<string,ReviewGoalCard>();
 for(const row of records)for(const quality of row.quality)for(const goal of quality.goals){
  if(goal.completed)continue;
  // IDs das campanhas/logística mudam por conta; a mesma instrução é uma única tarefa.
  const wording=goal.title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').replace(/[.!]+$/,'').trim();
  const key=`${goal.field||''}:${wording}`;
  const existing=cards.get(key);
  if(existing){if(!existing.targets.some(t=>t.id===row.id&&t.connectionId===row.connectionId))existing.targets.push({connectionId:row.connectionId,id:row.id});continue;}
  const id=goal.id.toUpperCase();
  let kind:ProductCommonKind|null=null,action:string|null=null,reason='',title=goal.group||goal.title;
  if(/PICTURE/.test(id)){kind='pictures';title='Fotos do produto';action='Adicionar fotos';}
  else if(/TECHNICAL|ATTRIBUTE|UNIVERSAL_CODE|GTIN/.test(id)){kind='attributes';title='Ficha técnica';action='Completar ficha técnica';}
  else if(['title','description','listingType'].includes(goal.field||'')){kind='details';title=goal.field==='title'?'Título do anúncio':goal.field==='description'?'Descrição':'Tipo de anúncio';action='Editar';}
  if(kind){
   reason=reviewSectionBlock(editors,kind);
   if(kind==='details'){const field=({title:'TITLE',description:'DESCRIPTION',listingType:'LISTING_TYPE'} as Record<string,string>)[goal.field||''];const rule=editors.details.attributes.find(a=>a.id===field);if(!rule?.editable)reason=rule?.reason||'Este campo não está liberado para edição neste anúncio.';}
   if(kind==='attributes'&&!editors.attributes.attributes.some(a=>a.editable))reason||='A ficha técnica não tem campos liberados para edição neste anúncio.';
   if(reason)action=null;
  }else if(/STOCK/.test(id)){title='Disponibilidade';reason='Confira o saldo físico em Estoques. A quantidade anunciada só pode aumentar se houver produto disponível.';}
  else if(/VIDEO|CLIP/.test(id)||/video/.test(wording)){title='Vídeo do produto';reason='Esta revisão ainda não envia vídeos. O responsável pela conta pode atender a esta sugestão no Mercado Livre.';}
  else if(/PROMOTION|PROMO|CAMPAIGN/.test(id)){title='Promoção';reason='A participação depende das campanhas disponíveis para cada conta no Mercado Livre.';}
  else if(/SHIPPING|FLEX|DELIVERY/.test(id)){title='Entrega';reason='Esta sugestão depende das opções logísticas disponíveis para cada conta no Mercado Livre.';}
  else if(/CATALOG/.test(id)){title='Catálogo';reason='O responsável pela conta precisa conferir a sugestão de catálogo no Mercado Livre.';}
  else reason='Esta sugestão ainda não possui edição disponível nesta revisão.';
  cards.set(key,{key,title,instruction:goal.title,kind,action,reason,targets:[{connectionId:row.connectionId,id:row.id}]});
 }
 for(const card of cards.values())if(card.kind==='pictures'&&editors.pictures.reviewTargets?.length){
  const access=reviewPhotoAccess(editors,card.targets);
  const allowed=access.filter(row=>row.allowed);
  if(allowed.length){card.action='Adicionar fotos';card.reason='';}
  else{
   card.action=null;
   card.reason=access.length&&access.every(row=>row.state==='catalog')?'As fotos destes anúncios são definidas pelo catálogo do Mercado Livre. A correção da ficha depende da análise do ML; esta revisão não envia sugestões ao catálogo.':'Não há permissão confirmada para adicionar fotos aos anúncios desta recomendação. Confira a situação de cada anúncio abaixo.';
  }
 }
 return [...cards.values()].sort((a,b)=>Number(!!b.action)-Number(!!a.action)||Number(b.kind==='pictures')-Number(a.kind==='pictures'));
}
