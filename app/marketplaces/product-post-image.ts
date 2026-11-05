import {POST_CONDITIONS,postProductName,postPrimaryColor,productPostDetails,validateProductPost,type ProductPostDraft} from '@/app/modules/marketplaces/product-post';
import {corTextoSobreFundo} from '@/app/lib/cores-avanta';

function loadPhoto(src:string,signal:AbortSignal):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{
  const image=new Image();image.crossOrigin='anonymous';
  const finish=(error?:Error)=>{clearTimeout(timer);signal.removeEventListener('abort',abort);image.onload=null;image.onerror=null;if(error){image.src='';reject(error);}else resolve(image);};
  const abort=()=>finish(new DOMException('Geração cancelada.','AbortError'));
  const timer=setTimeout(()=>finish(new Error('A foto demorou para carregar. Tente gerar o post novamente.')),15000);
  image.onload=()=>image.naturalWidth&&image.naturalHeight?finish():finish(new Error('A foto salva não pôde ser lida.'));
  image.onerror=()=>finish(new Error('Não foi possível carregar a foto salva para o post. Confira a foto no cadastro e tente novamente.'));
  signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){abort();return;}
  image.src=src;
 });
}
function lines(ctx:CanvasRenderingContext2D,text:string,width:number,max:number){
 const words=text.replace(/\s+/g,' ').trim().split(' '),out:string[]=[];let row='';
 for(const word of words){const next=row?`${row} ${word}`:word;if(ctx.measureText(next).width>width&&row){out.push(row);row=word;}else row=next;}
 if(row)out.push(row);
 const clipped=out.slice(0,max);
 for(let i=0;i<clipped.length;i++){
  if(ctx.measureText(clipped[i]).width>width||(i===max-1&&out.length>max)){
   let short=clipped[i];while(short.length&&ctx.measureText(short+'…').width>width)short=short.slice(0,-1);
   clipped[i]=short.trimEnd()+'…';
  }
 }
 return clipped;
}
/** Rasteriza somente a foto e o texto selecionados; não altera o cadastro. */
export async function createProductPostImage(data:ProductPostDraft,signal:AbortSignal):Promise<Blob>{
 const invalid=validateProductPost(data);if(invalid)throw new Error(invalid.message);
 const photo=await loadPhoto(data.image,signal);signal.throwIfAborted();
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Este navegador não conseguiu gerar a imagem.');
 const font=getComputedStyle(document.documentElement).getPropertyValue('--av-font-family').trim()||'Inter, Arial, sans-serif';
 const box=(x:number,y:number,w:number,h:number,r:number,fill:string)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();};
 const primary=postPrimaryColor(data.primaryColor),onPrimary=corTextoSobreFundo(primary);
 ctx.fillStyle=primary;ctx.fillRect(0,0,1080,1350);
 const shade=ctx.createLinearGradient(0,0,1080,1350);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(0,0,0,.28)');ctx.fillStyle=shade;ctx.fillRect(0,0,1080,1350);
 // Volume e movimento vêm da própria cor do perfil; a foto permanece intacta.
 ctx.fillStyle='rgba(255,255,255,.10)';ctx.beginPath();ctx.arc(1030,130,380,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(-100,1120,450,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(1030,130,300,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle=onPrimary;ctx.font=`800 48px ${font}`;ctx.fillText(lines(ctx,data.company.toLocaleUpperCase('pt-BR'),952,1)[0]||'PRODUTO',64,86);
 ctx.globalAlpha=.85;ctx.font=`600 24px ${font}`;ctx.fillText('PRODUTO EM DESTAQUE',66,136);ctx.globalAlpha=1;
 ctx.save();ctx.shadowColor='rgba(0,0,0,.16)';ctx.shadowBlur=35;ctx.shadowOffsetY=14;box(48,186,984,916,38,'#fff');ctx.restore();
 const scale=Math.min(872/photo.naturalWidth,372/photo.naturalHeight);
 ctx.drawImage(photo,(1080-photo.naturalWidth*scale)/2,210+(380-photo.naturalHeight*scale)/2,photo.naturalWidth*scale,photo.naturalHeight*scale);
 ctx.fillStyle='#142538';ctx.font=`800 44px ${font}`;
 const titleLines=lines(ctx,postProductName(data.name),920,3);
 titleLines.forEach((line,i)=>ctx.fillText(line,80,634+i*46));
 const descriptionY=634+titleLines.length*46+12;
 ctx.fillStyle='#506174';ctx.font=`400 29px ${font}`;
 const sameDescription=postProductName(data.description).toLocaleLowerCase('pt-BR')===postProductName(data.name).toLocaleLowerCase('pt-BR');
 const descriptionLines=sameDescription?[]:lines(ctx,data.description,920,2);
 descriptionLines.forEach((line,i)=>ctx.fillText(line,80,descriptionY+i*34));
 const condition=POST_CONDITIONS[data.condition as keyof typeof POST_CONDITIONS],pillY=descriptionY+descriptionLines.length*34+12;
 ctx.font=`700 36px ${font}`;let x=80;
 for(const label of [data.voltage,condition]){const width=Math.min(440,ctx.measureText(label).width+48);box(x,pillY,width,68,34,primary);ctx.fillStyle=onPrimary;ctx.fillText(label,x+24,pillY+46);x+=width+18;}
 const details=productPostDetails(data);
 if(details){
  const detailsY=pillY+104;box(64,detailsY,952,134,18,'#f1f5f9');ctx.fillStyle='#334155';ctx.font=`400 38px ${font}`;
  lines(ctx,`Detalhes: ${details}`,904,3).forEach((line,i)=>ctx.fillText(line,88,detailsY+40+i*42));
 }
 // “De” é editável; “Por” permanece em destaque e alinhado à direita.
 const priceBackground='#'+[1,3,5].map(i=>Math.round(parseInt(primary.slice(i,i+2),16)*.72).toString(16).padStart(2,'0')).join('');
 const priceInk=corTextoSobreFundo(priceBackground),money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
 box(48,1124,984,190,34,priceBackground);
 ctx.fillStyle=priceInk;ctx.globalAlpha=.9;ctx.font=`600 30px ${font}`;ctx.fillText('DE',82,1174);
 const previous=money.format(data.originalPriceCents/100),previousX=146;
 ctx.font=`600 44px ${font}`;ctx.fillText(previous,previousX,1178);ctx.strokeStyle=priceInk;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(previousX-4,1163);ctx.lineTo(previousX+ctx.measureText(previous).width+4,1163);ctx.stroke();ctx.globalAlpha=1;
 ctx.fillStyle=priceInk;ctx.textAlign='right';ctx.font=`800 26px ${font}`;ctx.fillText('POR',998,1210);
 const sale=money.format(data.priceCents/100);let saleSize=108;
 do{ctx.font=`900 ${saleSize}px ${font}`;if(ctx.measureText(sale).width<=916)break;saleSize-=2;}while(saleSize>60);
 ctx.fillText(sale,998,1290);ctx.textAlign='left';
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const abort=()=>finish(null,new DOMException('Geração cancelada.','AbortError'));
  const timer=setTimeout(()=>finish(null,new Error('Não foi possível finalizar a imagem. Tente novamente.')),10000);
  const finish=(blob:Blob|null,error?:Error)=>{clearTimeout(timer);signal.removeEventListener('abort',abort);if(error)reject(error);else if(blob)resolve(blob);else reject(new Error('Não foi possível exportar a foto. Confira a imagem salva no cadastro.'));};
  signal.addEventListener('abort',abort,{once:true});
  try{canvas.toBlob(blob=>finish(blob),'image/png');}catch{finish(null,new Error('A origem da foto não permite exportação. Confira a imagem salva no cadastro e tente novamente.'));}
 });
}

/** Cópia editável da foto escolhida, separada da arte e sem URL temporária persistida. */
export async function createProductPostSource(src:string,signal:AbortSignal):Promise<Blob>{
 const photo=await loadPhoto(src,signal),ratio=Math.min(1,1600/Math.max(photo.naturalWidth,photo.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(photo.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(photo.naturalHeight*ratio));
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar a foto para salvar.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(photo,0,0,canvas.width,canvas.height);
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível salvar a foto escolhida.')),'image/jpeg',.85);});
}
