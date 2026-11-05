import type {CatalogPreparation,PublicationForm} from './services/catalog-publication';
import {RECOMMENDED_PRODUCT_PICTURES} from './product-picture-policy';
export function publicationContentReadiness(prepared:CatalogPreparation,form:PublicationForm){
 const photos=new Set([form.pictureUrl,...prepared.product?.pictures||[],...form.additionalPictures||[]].filter(Boolean)).size;
 const fields=[...prepared.requiredAttributes||[],...prepared.optionalAttributes||[]].filter(f=>prepared.requiredAttributes?.some(r=>r.id===f.id)||/^(BRAND|MODEL|COLOR|VOLTAGE|POWER|CAPACITY|MATERIAL)$/.test(f.id));
 const missing=fields.filter(f=>!form.attributes?.[f.id]?.trim()&&!prepared.presetAttributes?.some(p=>p.id===f.id&&p.value));
 return [{field:'pictures',ready:photos>=RECOMMENDED_PRODUCT_PICTURES,title:`Fotos: ${photos} de pelo menos ${RECOMMENDED_PRODUCT_PICTURES} recomendadas`},{field:'description',ready:!!form.description?.trim(),title:form.description?.trim()?'Descrição preenchida':'Adicionar descrição do produto'},{field:'attributes',ready:!missing.length,title:missing.length?'Completar ficha técnica: '+missing.map(f=>f.name).join(', '):'Características essenciais preenchidas'}];
}
