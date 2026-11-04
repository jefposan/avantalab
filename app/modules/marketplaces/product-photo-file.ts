/** Validação compartilhada entre preparação e melhoria de anúncios. */
export function productPhotoBytes(body:{mime?:unknown;base64?:unknown}){
 if(!['image/jpeg','image/png'].includes(String(body.mime))||typeof body.base64!=='string'||body.base64.length>3_500_000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.base64))throw Error('Envie JPG ou PNG de até 2,5 MB.');
 const bytes=Buffer.from(body.base64,'base64'),valid=body.mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!valid||bytes.length>2_621_440||bytes.toString('base64')!==body.base64)throw Error('O conteúdo não corresponde a JPG/PNG válido de até 2,5 MB.');
 return bytes;
}
