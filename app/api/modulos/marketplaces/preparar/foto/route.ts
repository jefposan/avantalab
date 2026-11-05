import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure,MarketplaceError} from '@/app/modules/marketplaces/services/management-access';
import {loadConnection,uploadMercadoLivrePicture} from '@/app/modules/marketplaces/services/mercadolivre-management';
import {productPhotoInput} from '@/app/modules/marketplaces/services/product-photo-source';
import {object,pictureId,pictureUrl,rows} from '@/app/modules/marketplaces/listing-content';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(request:Request){try{
 if(Number(request.headers.get('content-length')||0)>3_600_000)throw new MarketplaceError(413,'file_size','Use JPG/PNG de até 2,5 MB.');
 const body=await request.json(),{db,empresaId}=await authorizeMarketplace(request,body.empresaId,'manage');
 const connection=await loadConnection(db,empresaId,body.connectionId);let photo:{bytes:Buffer;mime:string};try{photo=await productPhotoInput(body);}catch(e){throw new MarketplaceError(400,'invalid_picture',(e as Error).message);}
 const result=object(await uploadMercadoLivrePicture(db,connection,photo.bytes,photo.mime));
 const url=rows(result.variations).map(p=>pictureUrl(p.secure_url||p.url)).find(Boolean)||pictureUrl(result.secure_url||result.url);
 if(!pictureId(result.id)||!url)throw new MarketplaceError(503,'invalid_picture_response','O ML não confirmou a foto. Nenhum anúncio foi criado.');
 return NextResponse.json({id:result.id,url},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return managementFailure(e);}}
