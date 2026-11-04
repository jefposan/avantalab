import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {SellerConnection} from './mercadolivre-management';
import {getLocalProduct} from './local-products';
import {prepareLocalProductPublication} from './mercadolivre-publication';
import {objectValue} from './listing-model';
import {safeHttpsImage,safeText} from './catalog-publication';
import {MarketplaceError} from './management-access';
export async function savePreparationContent(db:SupabaseClient,connection:SellerConnection,actor:string,input:Record<string,unknown>){
 const product=await getLocalProduct(db,connection.empresa_id,input.productId);
 if(input.revision!==product.revision)throw new MarketplaceError(409,'product_conflict','O cadastro mudou. Recarregue a preparação antes de salvar.');
 const form=objectValue(input.form);const prepared=(await prepareLocalProductPublication(db,connection,product.id,{categoryId:form.categoryId})).result;
 const name=form.name===undefined?product.name:typeof form.name==='string'?form.name.trim():'';
 if(!name||name.length>220)throw new MarketplaceError(400,'invalid_fields','Informe um nome de produto com até 220 caracteres.',{title:'Confira o nome do produto.'});
 const renamed=name!==product.name;
 if(renamed&&product.catalog_product_id)throw new MarketplaceError(400,'catalog_title','O nome desta ficha é definido pelo catálogo do Mercado Livre.');
 const titleLimit=prepared.constraints?.maxTitleLength;
 if(form.name!==undefined&&titleLimit&&Array.from(name).length>titleLimit)throw new MarketplaceError(400,'invalid_fields',`Esta categoria permite até ${titleLimit} caracteres no nome.`,{title:`Reduza o nome para até ${titleLimit} caracteres.`});
 const fields=[...prepared.requiredAttributes||[],...prepared.optionalAttributes||[]],attributes=[...product.attributes];
 for(const [id,raw]of Object.entries(objectValue(form.attributes))){
  const value=safeText(raw,1000);if(!value)continue;const existing=attributes.find(a=>a.id===id);if(existing&&(existing.valueId||existing.value)===value)continue;
  const field=fields.find(f=>f.id===id);if(!field)throw new MarketplaceError(400,'protected_field','Um campo não está liberado nesta categoria. Recarregue a ficha.');
  const option=field.values.find(o=>o.id===value);if(field.values.length&&!option)throw new MarketplaceError(400,'invalid_fields',`${field.name}: selecione uma opção válida.`);
  const attribute={id,name:field.name,value:option?.name||value,...(option?{valueId:option.id}:{})};const at=attributes.findIndex(a=>a.id===id);if(at<0)attributes.push(attribute);else attributes[at]=attribute;
 }
 if(!Array.isArray(form.additionalPictures)||form.additionalPictures.some(url=>!safeHttpsImage(url)))throw new MarketplaceError(400,'invalid_picture','Confira as novas fotos da preparação.');
 const pictures=[...new Set([...product.pictures,...form.additionalPictures as string[]])];if(pictures.length>12)throw new MarketplaceError(400,'picture_limit','Use até 12 fotos no cadastro.');
 if(typeof form.description!=='string'||form.description.length>50000||/<[^>]*>/.test(form.description))throw new MarketplaceError(400,'description','Use uma descrição em texto de até 50.000 caracteres.');
 const data={description:form.description,pictures,attributes,category_id:prepared.categoryId||product.category_id||''};
 // O editor manual existente grava valores textuais e monta publication_form
 // a partir deles. Usar o mesmo contrato evita deixar valueId no cadastro e
 // value textual no formulário, que seriam recusados na conferência canônica.
 const saved=await db.rpc(renamed?'marketplace_product_editor_save':'marketplace_product_content_save',{p_empresa_id:connection.empresa_id,p_actor_id:actor,p_product_id:product.id,p_revision:product.revision,p_request_key:input.requestKey,p_data:renamed?{...data,name,sku:product.sku,ean:product.ean||'',price_cents:product.price_cents,attributes:attributes.map(({id,name,value})=>({id,name,value}))}:data});
 if(saved.error)throw new MarketplaceError(saved.error.code==='P0001'?409:503,'product_conflict',saved.error.code==='P0001'?saved.error.message:'Não foi possível salvar a ficha. Recarregue para conferir.');
 return prepareLocalProductPublication(db,connection,product.id,{});
}
