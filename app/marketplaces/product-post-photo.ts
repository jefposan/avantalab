/** Foto escolhida só para o post: limita memória, remove metadados e salva uma cópia compacta. */
export async function preparePostPhoto(file:File,signal:AbortSignal):Promise<string>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>12*1024*1024)throw new Error('Escolha uma foto JPG, PNG ou WebP de até 12 MB.');
 const source=URL.createObjectURL(file);
 try{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{
   const photo=new Image();
   const finish=(error?:Error)=>{clearTimeout(timer);signal.removeEventListener('abort',abort);photo.onload=photo.onerror=null;if(error){photo.src='';reject(error);}else resolve(photo);};
   const abort=()=>finish(new DOMException('Foto cancelada.','AbortError'));
   const timer=setTimeout(()=>finish(new Error('Não foi possível ler esta foto. Escolha outra.')),10000);
   photo.onload=()=>photo.naturalWidth&&photo.naturalHeight&&photo.naturalWidth*photo.naturalHeight<=50_000_000?finish():finish(new Error('A foto é grande demais. Escolha uma imagem menor.'));
   photo.onerror=()=>finish(new Error('Não foi possível ler esta foto. Use JPG, PNG ou WebP.'));
   signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}photo.src=source;
  });
  signal.throwIfAborted();
  const ratio=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar esta foto.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',.85);
 }finally{URL.revokeObjectURL(source);}
}
