import {PDFDocument} from 'pdf-lib';
import sharp from 'sharp';
import {buildNfeDanfe} from './nfe-danfe.mjs';
export const DANFE_LAYOUT_VERSION='2026-11-18.2';
export async function buildPresentedNfeDanfe({logoBytes,...source}={}){
 const result=buildNfeDanfe(source);if(!result.valid)return result;
 const pdf=await PDFDocument.load(result.pdf);pdf.setCreationDate(new Date(0));pdf.setModificationDate(new Date(0));pdf.setSubject(`DANFE AvantaLab ${DANFE_LAYOUT_VERSION}`);
 if(logoBytes?.length){
  if(logoBytes.length>2*1024*1024)throw Error('O logo excede 2 MB.');
  const pipeline=sharp(logoBytes,{limitInputPixels:16_000_000});const meta=await pipeline.metadata();if(!['png','jpeg','webp'].includes(meta.format))throw Error('Formato de logo inválido.');
  const image=await pdf.embedPng(await pipeline.resize({width:900,height:600,fit:'inside',withoutEnlargement:true}).png().toBuffer());const mm=72/25.4;
  const scale=Math.min(23*mm/image.width,17*mm/image.height);const w=image.width*scale,h=image.height*scale;
  pdf.getPages().forEach((page,index)=>page.drawImage(image,{x:9*mm+(23*mm-w)/2,y:841.89-(46-(index?17:0))*mm+(17*mm-h)/2,width:w,height:h}));
 }
 return {...result,pdf:await pdf.save({useObjectStreams:false}),layoutVersion:DANFE_LAYOUT_VERSION};
}
/** Resolve only the company-provided image; never an arbitrary server-side URL. */
export async function loadDanfeLogo(value,{supabaseUrl='',fetcher=fetch}={}){
 const source=String(value||'').trim();if(!source||source==='__blank__')return null;
 if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(source)){const bytes=Buffer.from(source.split(',')[1],'base64');if(bytes.length>2*1024*1024)throw Error('Logo muito grande.');return bytes;}
 let url;try{url=new URL(source.startsWith('/')?`https://avantalab.com.br${source}`:source);}catch{throw Error('Logo inválido.');}
 const trusted=new URL(supabaseUrl||'https://invalid.example');
 const allowed=url.protocol==='https:'&&!url.username&&!url.password&&((url.origin===trusted.origin&&url.pathname.startsWith('/storage/v1/object/'))||(url.origin==='https://avantalab.com.br'&&url.pathname.startsWith('/ofertas/')));
 if(!allowed)throw Error('Use uma imagem enviada ao sistema.');
 const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok||!/^image\/(png|jpeg|webp)(;|$)/i.test(response.headers.get('content-type')||'')||Number(response.headers.get('content-length'))>2*1024*1024)throw Error('Não foi possível carregar o logo.');
 const reader=response.body.getReader();const parts=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)throw Error('Logo muito grande.');parts.push(value);}}finally{await reader.cancel().catch(()=>{});}return Buffer.concat(parts.map(p=>Buffer.from(p)));
}
