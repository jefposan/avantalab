import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request } from 'node:https';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import { isProductOfferUrl } from '../price-offer-identity';

const MAX_BYTES = 2_000_000;
export function publicPriceAddress(address: string) {
  if(isIP(address)===4){
    const [a,b,c]=address.split('.').map(Number);
    return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
  }
  // Apenas unicast global IPv6; excluir documentação, tunelamento e endereços mapeados.
  if(isIP(address)!==6)return false;
  const canonical=new URL(`https://[${address}]/`).hostname.slice(1,-1).toLowerCase(),parts=canonical.split(':');
  return /^[23][0-9a-f]{3}:/.test(canonical) && parts[0]!=='2002' && !(parts[0]==='2001'&&(parseInt(parts[1]||'0',16)<=0x1ff||parseInt(parts[1],16)===0xdb8));
}

/** Leitura sem cookies, credenciais, JS ou bypass de bloqueios. DNS fixado no socket evita rebinding. */
export async function readPublicPricePage(raw: string, signal?: AbortSignal, redirects=0): Promise<{url:string;html:string}|null> {
  signal?.throwIfAborted();
  if(!isProductOfferUrl(raw)||raw.length>2048||redirects>2)return null;
  const url=new URL(raw),host=url.hostname.replace(/^\[|\]$/g,'');
  if(url.port&&url.port!=='443'||isIP(host)||!host.includes('.')||host.endsWith('.local')||host.endsWith('.internal'))return null;
  const deadline=signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000);
  const addresses=await new Promise<{address:string;family:number}[]>(resolve=>{
    const abort=()=>{deadline.removeEventListener('abort',abort);resolve([]);};
    deadline.addEventListener('abort',abort,{once:true});
    if(deadline.aborted){abort();return;}
    void lookup(host,{all:true}).then(value=>{deadline.removeEventListener('abort',abort);resolve(value);},()=>{deadline.removeEventListener('abort',abort);resolve([]);});
  });
  signal?.throwIfAborted();
  if(!addresses.length||addresses.some(a=>!publicPriceAddress(a.address)))return null;
  const selected=addresses[0];
  return new Promise((resolve)=>{
    let settled=false;
    const finish=(value:{url:string;html:string}|null)=>{if(!settled){settled=true;resolve(value);}};
    const req=request(url,{
      method:'GET',agent:false,signal:deadline,timeout:6000,family:selected.family,
      headers:{Accept:'text/html,application/ld+json;q=0.9','Accept-Encoding':'gzip, br, deflate','Cache-Control':'no-cache','User-Agent':'AvantaPrecos/1.0 (+https://avantalab.com.br)'},
      lookup:(_hostname,_options,callback)=>callback(null,selected.address,selected.family),
    },res=>{
      if([301,302,303,307,308].includes(res.statusCode||0)&&res.headers.location){
        let next:URL;try{next=new URL(res.headers.location,url);}catch{res.resume();finish(null);return;}
        res.resume();
        // Não seguir encurtador/redirecionamento para outro comerciante.
        const sameShop=next.hostname.replace(/^www\./,'')===url.hostname.replace(/^www\./,'');
        if(!sameShop){finish(null);return;}
        void readPublicPricePage(next.href,signal,redirects+1).then(finish,()=>finish(null));return;
      }
      if(res.statusCode!==200||!/(text\/html|application\/(?:ld\+)?json)/i.test(String(res.headers['content-type']||''))){res.resume();finish(null);return;}
      const encoding=String(res.headers['content-encoding']||'identity');
      const decoder=encoding==='gzip'?createGunzip():encoding==='br'?createBrotliDecompress():encoding==='deflate'?createInflate():null;
      if(encoding!=='identity'&&!decoder){res.resume();finish(null);return;}
      let rawBytes=0,bytes=0;const chunks:Buffer[]=[];
      res.on('data',chunk=>{rawBytes+=chunk.length;if(rawBytes>MAX_BYTES){req.destroy();finish(null);}});
      const stream=decoder?res.pipe(decoder):res;
      stream.on('data',chunk=>{bytes+=chunk.length;if(bytes>MAX_BYTES){req.destroy();stream.destroy();finish(null);}else chunks.push(Buffer.from(chunk));});
      stream.on('error',()=>finish(null));res.on('error',()=>finish(null));
      stream.on('end',()=>{
        const buffer=Buffer.concat(chunks);
        const declared=(String(res.headers['content-type']||'')+' '+buffer.subarray(0,4096).toString('ascii')).match(/charset\s*=\s*["']?([a-z0-9_-]+)/i)?.[1]||'utf-8';
        try{finish({url:url.href,html:new TextDecoder(declared).decode(buffer)});}catch{finish(null);}
      });
    });
    req.on('timeout',()=>{req.destroy();finish(null);});req.on('error',()=>finish(null));req.end();
  });
}
