import type {OrderCompany} from './order-tools';

/** Only the already configured company logo; no credentials or referrer sent. */
export async function prepareOrderLogo(source:string):Promise<OrderCompany['logo']> {
 if(!source)return undefined;
 if(!/^data:image\/(png|jpeg|webp);base64,/i.test(source)){
  let url:URL;try{url=new URL(source,window.location.origin);}catch{throw Error('O endereço do logo é inválido.');}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('O formato do logo não é permitido.');
 }
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try {
  if(source.length>12_000_000)throw Error('Logo muito grande para impressão.');
  const response=await fetch(source,{credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:controller.signal});
  if(!response.ok)throw Error('Não foi possível carregar o logo da empresa.');
  if(Number(response.headers.get('content-length')||0)>8_000_000)throw Error('Logo muito grande para impressão.');
  const reader=response.body?.getReader();if(!reader)throw Error('Não foi possível ler o logo.');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>8_000_000){await reader.cancel();throw Error('Logo muito grande para impressão.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,jpeg=bytes[0]===255&&bytes[1]===216;
  const blob=new Blob([bytes],{type:png?'image/png':jpeg?'image/jpeg':'image/webp'});
  const bitmap=await createImageBitmap(blob);
  try{
   if(bitmap.width*bitmap.height>16_000_000)throw Error('As dimensões do logo são muito grandes.');
   const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('O navegador não conseguiu preparar o logo.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let visible=0,white=0;
   for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>60){visible++;if(pixels[i]>225&&pixels[i+1]>225&&pixels[i+2]>225)white++;}
   const darkBackground=visible>0&&white/visible>.95;
   if((png||jpeg)&&scale===1)return {bytes,format:png?'png':'jpg',darkBackground};
   const normalized=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Não foi possível preparar o logo.')),'image/png'));
   return {bytes:new Uint8Array(await normalized.arrayBuffer()),format:'png',darkBackground};
  }finally{bitmap.close();}
 }catch(error){throw Error(error instanceof Error&&error.name!=='AbortError'?error.message:'O carregamento do logo demorou. Tente imprimir novamente.');}
 finally{clearTimeout(timer);}
}

/** Native print dialog from an already generated PDF; never claims physical printing. */
export function printOrderPdf(bytes:Uint8Array,environment:{document:Document;createUrl:(blob:Blob)=>string;revokeUrl:(url:string)=>void;timeout:typeof setTimeout;cancel:typeof clearTimeout}={document,createUrl:blob=>URL.createObjectURL(blob),revokeUrl:url=>URL.revokeObjectURL(url),timeout:setTimeout,cancel:clearTimeout}) {
 return new Promise<void>((resolve,reject)=>{
  const {document:doc,createUrl,revokeUrl,timeout,cancel}=environment;
  const url=createUrl(new Blob([new Uint8Array(bytes)],{type:'application/pdf'})),frame=doc.createElement('iframe');
  frame.title='Impressão do pedido';frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
  Object.assign(frame.style,{position:'fixed',left:'-10000px',top:'0',width:'800px',height:'1100px',border:'0'});
  let requested=false,disposed=false;
  let loadTimer:ReturnType<typeof setTimeout>,expiry:ReturnType<typeof setTimeout>;
  const dispose=()=>{if(disposed)return;disposed=true;cancel(loadTimer);cancel(expiry);frame.remove();revokeUrl(url);};
  frame.onload=()=>{
   if(requested||disposed)return;requested=true;cancel(loadTimer);
   // The iframe load event precedes Chrome's PDF plugin readiness.
   timeout(()=>{if(disposed)return;try{
    const target=frame.contentWindow;if(!target)throw Error('Impressão indisponível.');
    target.addEventListener('afterprint',()=>{timeout(dispose,1000);},{once:true});
    target.focus();target.print();resolve();
   }catch{dispose();reject(Error('O navegador bloqueou a impressão. Permita a impressão neste site e tente novamente.'));}},1000);
  };
  frame.onerror=()=>{dispose();reject(Error('Não foi possível abrir o PDF para impressão. Tente novamente.'));};
  loadTimer=timeout(()=>{dispose();reject(Error('A abertura da impressão demorou. Tente novamente.'));},20000);
  expiry=timeout(dispose,300000);
  frame.src=url;doc.body.appendChild(frame);
 });
}
