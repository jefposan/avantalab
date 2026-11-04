import 'server-only';
import sharp from 'sharp';
import {productPhotoBytes} from '../product-photo-file';

const limit=2_621_440;
/** Identifica o conteúdo, sem depender da extensão ou do Content-Type do site. */
export async function normalizeProductPhoto(bytes:Buffer):Promise<{bytes:Buffer;mime:string}>{
 if(!bytes.length||bytes.length>limit)throw Error('Use uma imagem de até 2,5 MB.');
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(png||jpeg){const mime=png?'image/png':'image/jpeg';return {bytes:productPhotoBytes({mime,base64:bytes.toString('base64')}),mime};}
 const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 const avif=bytes.toString('ascii',4,8)==='ftyp'&&/avif|avis/.test(bytes.toString('ascii',8,32));
 if(!webp&&!avif)throw Error('O endereço não contém uma imagem JPG, PNG, WebP ou AVIF válida.');
 try{
  const image=sharp(bytes,{limitInputPixels:16_000_000,failOn:'warning'}),metadata=await image.metadata();
  if((metadata.pages||1)>1)throw Error('animated');
  const mime=metadata.hasAlpha?'image/png':'image/jpeg';
  const converted=await (metadata.hasAlpha?image.rotate().png():image.rotate().jpeg({quality:90})).timeout({seconds:8}).toBuffer();
  if(converted.length>limit)throw Error('size');
  return {bytes:productPhotoBytes({mime,base64:converted.toString('base64')}),mime};
 }catch(e){
  if((e as Error).message==='animated')throw Error('Use uma foto estática, sem animação.');
  if((e as Error).message==='size')throw Error('A imagem convertida ultrapassou 2,5 MB. Escolha uma imagem menor.');
  throw Error('Não foi possível converter esta imagem. Use uma foto válida com até 16 milhões de pixels.');
 }
}
