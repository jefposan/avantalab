import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {pictureId,pictureUrl} from '../listing-content';
type Scope={company:string;actor:string;product:string};
function signature(value:string){const key=process.env.MARKETPLACE_SECRETS_KEY;if(!key)throw Error('A integração não está configurada.');return createHmac('sha256',key).update('avanta-catalog-photo-v1\0'+value).digest('base64url');}
export function signCatalogPhoto(scope:Scope,photo:{id:string;url:string},now=Date.now()){
 const payload=Buffer.from(JSON.stringify({...scope,...photo,expires:now+2*60*60_000})).toString('base64url');return payload+'.'+signature(payload);
}
export function verifyCatalogPhoto(scope:Scope,token:unknown,now=Date.now()){
 if(typeof token!=='string'||token.length>6000)throw Error('Foto adicionada sem confirmação. Adicione novamente.');
 const [payload,mac,...extra]=token.split('.'),expected=signature(payload||'');
 if(extra.length||!mac||mac.length!==expected.length||!timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))throw Error('A confirmação da foto é inválida.');
 const data=JSON.parse(Buffer.from(payload,'base64url').toString());
 if(data.company!==scope.company||data.actor!==scope.actor||data.product!==scope.product||!Number.isSafeInteger(data.expires)||data.expires<=now||!pictureId(data.id)||pictureUrl(data.url)!==data.url)throw Error('A foto expirou ou pertence a outro cadastro. Adicione novamente.');
 return {id:data.id as string,url:data.url as string};
}
