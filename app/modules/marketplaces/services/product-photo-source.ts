import 'server-only';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {request} from 'node:https';
import {publicPriceAddress} from './public-price-page';
import {normalizeProductPhoto} from './product-photo-normalize';

const limit=2_621_440;
/** Imagens públicas: sem cookies/autorização, DNS fixo e validação em cada redirecionamento. */
export async function publicProductPhoto(raw:unknown,signal=AbortSignal.timeout(15_000),redirects=0):Promise<{bytes:Buffer;mime:string}>{
 if(typeof raw!=='string'||raw.length>2048||redirects>2)throw Error('Use o endereço HTTPS de uma imagem pública.');
 const url=new URL(raw),host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||isIP(host.replace(/^\[|\]$/g,''))||!host.includes('.')||host.endsWith('.local')||host.endsWith('.internal'))throw Error('Use o endereço HTTPS de uma imagem pública.');
 signal.throwIfAborted();
 const addresses=await new Promise<{address:string;family:number}[]>((resolve,reject)=>{
  const abort=()=>{signal.removeEventListener('abort',abort);reject(Error('A imagem demorou para responder.'));};signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){abort();return;}
  void lookup(host,{all:true}).then(value=>{signal.removeEventListener('abort',abort);resolve(value);},()=>{signal.removeEventListener('abort',abort);reject(Error('Não foi possível acessar a imagem pública.'));});
 });
 signal.throwIfAborted();
 if(!addresses.length||addresses.some(a=>!publicPriceAddress(a.address)))throw Error('O endereço da imagem não é público.');
 const selected=addresses[0];
 return new Promise((resolve,reject)=>{
  const req=request(url,{method:'GET',agent:false,signal,timeout:8000,family:selected.family,
   headers:{Accept:'image/jpeg,image/png,image/webp,image/avif','Accept-Encoding':'identity','User-Agent':'AvantaLab/1.0 (+https://avantalab.com.br)'},
   lookup:(_host,_options,callback)=>callback(null,selected.address,selected.family)},res=>{
   if([301,302,303,307,308].includes(res.statusCode||0)&&res.headers.location){res.resume();try{void publicProductPhoto(new URL(res.headers.location,url).href,signal,redirects+1).then(resolve,reject);}catch{reject(Error('O redirecionamento da imagem é inválido.'));}return;}
   if(res.statusCode!==200){res.resume();reject(Error('O site não liberou o download desta imagem. Tente outra imagem pública.'));return;}
   if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){res.resume();reject(Error('O site retornou a imagem em uma transferência não suportada. Tente outra imagem pública.'));return;}
   if(Number(res.headers['content-length']||0)>limit){res.destroy();reject(Error('Use uma imagem de até 2,5 MB.'));return;}
   let size=0;const chunks:Buffer[]=[];
   res.on('data',chunk=>{size+=chunk.length;if(size>limit){res.destroy();reject(Error('Use uma imagem de até 2,5 MB.'));}else chunks.push(Buffer.from(chunk));});
   res.on('error',()=>reject(Error('Não foi possível baixar a imagem. Tente um arquivo do computador.')));
   res.on('aborted',()=>reject(Error('O envio da imagem foi interrompido.')));
   res.on('end',()=>{const bytes=Buffer.concat(chunks);if(/^\s*(?:<!doctype\s+html|<html|<head|<body)/i.test(bytes.subarray(0,512).toString('utf8'))){reject(Error('Este link abre uma página. Arraste a foto exibida nela para importar a imagem.'));return;}void normalizeProductPhoto(bytes).then(resolve,reject);});
  });
  req.on('timeout',()=>req.destroy(Error('A imagem demorou para responder.')));req.on('error',()=>reject(Error('Não foi possível baixar a imagem pública. Tente um arquivo do computador.')));req.end();
 });
}
export async function productPhotoInput(body:{url?:unknown;mime?:unknown;base64?:unknown}){
 if(body.url!==undefined)return publicProductPhoto(body.url);
 if(!['image/jpeg','image/png','image/webp','image/avif'].includes(String(body.mime))||typeof body.base64!=='string'||body.base64.length>3_500_000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.base64))throw Error('Envie JPG, PNG, WebP ou AVIF de até 2,5 MB.');
 const bytes=Buffer.from(body.base64,'base64');if(bytes.toString('base64')!==body.base64)throw Error('O conteúdo da imagem é inválido.');
 return normalizeProductPhoto(bytes);
}
