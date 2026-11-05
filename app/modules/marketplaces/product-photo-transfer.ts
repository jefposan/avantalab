/** O arquivo tem prioridade sobre os textos que o navegador envia no mesmo arraste. */
export function droppedProductPhoto(transfer:{files:ArrayLike<File>;getData:(type:string)=>string}):{file?:File;url?:string}{
 if(transfer.files.length>1)throw Error('Adicione uma imagem por vez.');
 if(transfer.files.length){const file=transfer.files[0];if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)||file.size>2_621_440)throw Error('Use JPG, PNG, WebP ou AVIF de até 2,5 MB.');return {file};}
 const uri=transfer.getData('text/uri-list').split(/\r?\n/).find(line=>line.trim()&&!line.startsWith('#'))?.trim();
 const html=transfer.getData('text/html'),image=html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g,'&');
 const raw=image||uri||transfer.getData('text/plain').trim();
 try{const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||raw.length>2048)throw Error();return {url:url.href};}catch{throw Error('Arraste uma foto JPG, PNG, WebP ou AVIF ou uma imagem pública com endereço HTTPS.');}
}
