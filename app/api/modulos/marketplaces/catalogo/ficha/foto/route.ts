import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure,MarketplaceError} from '@/app/modules/marketplaces/services/management-access';
import {getLocalProduct} from '@/app/modules/marketplaces/services/local-products';
import {loadConnection,uploadMercadoLivrePicture} from '@/app/modules/marketplaces/services/mercadolivre-management';
import {productPhotoInput} from '@/app/modules/marketplaces/services/product-photo-source';
import {object,pictureId,pictureUrl,rows} from '@/app/modules/marketplaces/listing-content';
import {signCatalogPhoto} from '@/app/modules/marketplaces/services/catalog-photo-receipt';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){try{
 if(Number(request.headers.get('content-length')||0)>3_600_000)throw new MarketplaceError(413,'file_size','Use fotos de até 2,5 MB.');
 const body=await request.json(),{db,empresaId,usuario}=await authorizeMarketplace(request,body.empresaId,'manage');
 const product=await getLocalProduct(db,empresaId,body.productId),connection=await loadConnection(db,empresaId,body.connectionId);
 let photo;try{photo=await productPhotoInput(body);}catch(e){throw new MarketplaceError(400,'invalid_picture',(e as Error).message);}
 const result=object(await uploadMercadoLivrePicture(db,connection,photo.bytes,photo.mime));
 const url=rows(result.variations).map(p=>pictureUrl(p.secure_url||p.url)).find(Boolean)||pictureUrl(result.secure_url||result.url);
 if(!pictureId(result.id)||!url)throw new MarketplaceError(503,'picture_response','Não foi possível confirmar a foto.');
 const saved={id:result.id,url};return NextResponse.json({...saved,receipt:signCatalogPhoto({company:empresaId,actor:usuario.id,product:product.id},saved)},{headers:{'Cache-Control':'no-store'}});
}catch(e){return managementFailure(e);}}
