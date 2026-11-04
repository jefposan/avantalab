/** Mesmo fluxo do comprovante AvantaVendas: arquivo pronto, gesto e menu nativo. */
export async function compartilharImagem(file:File,title:string,text?:string):Promise<'compartilhado'|'cancelado'|'baixado'> {
 let compatible=false;
 try{compatible=!!navigator.share&&(!navigator.canShare||navigator.canShare({files:[file],...(text?{text}:{})}));}catch{/* Navegador sem compartilhamento de arquivos. */}
 if(compatible){
  try{await navigator.share({files:[file],title,...(text?{text}:{})});return 'compartilhado';}
  catch(error){if(error&&typeof error==='object'&&'name' in error&&error.name==='AbortError')return 'cancelado';throw new Error('Não foi possível abrir o compartilhamento. Tente novamente ou use Baixar imagem.');}
 }
 baixarImagem(file);return 'baixado';
}
export function baixarImagem(file:File){
 const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
