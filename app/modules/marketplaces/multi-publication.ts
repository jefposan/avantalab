import type {PublicationForm} from './services/catalog-publication';
export type PublicationDestination={connectionId:string;listingId:string;status:string;provider:string};
export type DestinationReview={form:PublicationForm;errors:Record<string,string>};
export function existingDestination(links:PublicationDestination[],id:string){return links.some(link=>link.connectionId===id&&link.status!=='deleted');}
/**
 * A publicação adicional nasce do cadastro local, não de outra ficha da conta.
 * Preço pode variar por destino; identificação, fotos e conteúdo são canônicos.
 */
export function sharedPublicationIdentity(form:Pick<PublicationForm,'ean'|'stock'>&{attributes?:Record<string,string>},product:{ean:string|null;stock_quantity:number|null;listing_stock_review_at?:string|null}){
 if(product.stock_quantity==null||product.listing_stock_review_at)throw Error('Confirme o estoque físico Online no cadastro antes de publicar.');
 if(form.ean!==(product.ean||''))throw Error('O EAN deve ser o mesmo do cadastro. Corrija o cadastro e prepare novamente.');
 if(Object.entries(form.attributes||{}).some(([id,value])=>/^(GTIN|EAN|GTIN14|PRODUCT_GTIN)$/.test(id)&&value!==form.ean))throw Error('O identificador nas características deve ser o mesmo EAN do cadastro.');
 if(form.stock!==product.stock_quantity)throw Error('O saldo Online mudou. Prepare novamente; cada conta deve usar o mesmo estoque atual.');
 if(product.stock_quantity<1)throw Error('Sem estoque Online disponível para novos anúncios.');
}
export function sharedPublicationContent(form:Pick<PublicationForm,'description'|'pictureUrl'|'additionalPictures'|'categoryId'|'listingType'|'shippingMode'|'condition'|'warrantyType'|'warrantyTime'>&{attributes?:Record<string,string>},product:{description?:string;pictures?:string[];category_id?:string;publication_form?:Partial<PublicationForm>;attributes?:Array<{id:string;value:string;valueId?:string}>}){
 const pictures=product.pictures||[];
 if(form.additionalPictures?.some(url=>!pictures.includes(url)))throw Error('Salve a ficha no cadastro antes de publicar as novas fotos nas contas.');
 if(!pictures.length)throw Error('O cadastro não tem fotos canônicas. Cadastre as fotos do produto antes de publicar em outra conta.');
 if(form.pictureUrl&&form.pictureUrl!==pictures[0])throw Error('A foto principal deve ser a primeira foto cadastrada no produto. Reabra a preparação.');
 if(product.description!=null&&form.description!==product.description)throw Error('A descrição deve ser a mesma do cadastro. Altere o cadastro antes de publicar em outra conta.');
 if(product.category_id&&form.categoryId!==product.category_id)throw Error('A categoria deve ser a mesma do cadastro. Corrija o cadastro antes de publicar em outra conta.');
 const saved=product.publication_form||{};
 for(const field of ['listingType','shippingMode','condition','warrantyType','warrantyTime'] as const){
  if(saved[field]&&form[field]!==saved[field])throw Error('Os dados de publicação devem ser os mesmos do cadastro. Somente o preço pode variar por conta.');
 }
 for(const attribute of product.attributes||[]){
  const expected=attribute.valueId||attribute.value;
  if(expected&&form.attributes?.[attribute.id]&&form.attributes[attribute.id]!==expected)throw Error(`A característica “${attribute.id}” deve ser a mesma do cadastro.`);
 }
}
export const commercialPublicationKey=(form:PublicationForm)=>JSON.stringify([form.price]);
