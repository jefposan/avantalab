import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {pathToFileURL} from 'node:url';import {EventEmitter} from 'node:events';import sharp from 'sharp';
const root=process.cwd(),data=s=>({url:'data:text/javascript,'+encodeURIComponent(s),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return data('export {}');
 if(s==='node:dns/promises')return data('export async function lookup(host){globalThis.photoHosts.push(host);return globalThis.photoAddresses;}');
 if(s==='node:https')return data('export function request(url,options,callback){return globalThis.photoRequest(url,options,callback);}');
 const file=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {publicProductPhoto,productPhotoInput}=await import('../../app/modules/marketplaces/services/product-photo-source.ts');hooks.deregister();
const png=Buffer.from([137,80,78,71,13,10,26,10]);
function setup(responses=[]){globalThis.photoHosts=[];globalThis.photoAddresses=[{address:'93.184.216.34',family:4}];const calls=[];
 globalThis.photoRequest=(url,options,callback)=>{calls.push({url:String(url),options});const req=new EventEmitter();req.destroy=()=>{};req.end=()=>queueMicrotask(()=>{const config=responses.shift()||{},res=new EventEmitter();Object.assign(res,{statusCode:200,headers:{'content-type':'image/png'},resume(){},destroy(){},...config});callback(res);if(res.statusCode===200){for(const chunk of config.chunks||[png])res.emit('data',chunk);res.emit('end');}});return req;};return calls;}
test('imagem pública fixa o DNS e não envia cookies/credenciais; bytes e tipo são conferidos',async()=>{
 const calls=setup(),photo=await publicProductPhoto('https://cdn.example/a.png');assert.deepEqual(photo.bytes,png);assert.equal(photo.mime,'image/png');assert.equal(calls[0].options.agent,false);assert.equal(calls[0].options.headers.Authorization,undefined);assert.equal(calls[0].options.headers.Cookie,undefined);
 calls[0].options.lookup('cdn.example',{},(error,address,family)=>{assert.equal(error,null);assert.equal(address,'93.184.216.34');assert.equal(family,4);});
 setup([{headers:{'content-type':'image/png'},chunks:[Buffer.from('<script>bad</script>')]}]);await assert.rejects(publicProductPhoto('https://cdn.example/a.png'),/imagem.*válida/);
 setup([{headers:{'content-type':'text/html'},chunks:[Buffer.from('<html><body>página</body></html>')]}]);await assert.rejects(publicProductPhoto('https://cdn.example/a'),/abre uma página/);
 setup([{headers:{'content-type':'application/octet-stream'}}]);assert.equal((await publicProductPhoto('https://cdn.example/sem-extensao')).mime,'image/png');
 setup([{statusCode:403}]);await assert.rejects(publicProductPhoto('https://cdn.example/a'),/site não liberou/);
 setup([{headers:{'content-type':'image/png','content-length':'3000000'}}]);await assert.rejects(publicProductPhoto('https://cdn.example/a'),/2,5 MB/);
 setup([{chunks:[Buffer.alloc(2_621_441)]}]);await assert.rejects(publicProductPhoto('https://cdn.example/a'),/2,5 MB/);
});
test('URLs privadas, DNS privado/misto e redirecionamentos inseguros são recusados antes de conexão',async()=>{
 for(const url of ['http://cdn.example/a','https://u:p@cdn.example/a','https://127.0.0.1/a','https://[::1]/a','https://localhost/a','https://cdn.internal/a','https://cdn.example:8080/a']){const calls=setup();await assert.rejects(publicProductPhoto(url));assert.equal(calls.length,0);}
 for(const address of ['127.0.0.1','10.1.1.1','169.254.169.254','::1','::ffff:127.0.0.1']){const calls=setup();globalThis.photoAddresses.push({address,family:address.includes(':')?6:4});await assert.rejects(publicProductPhoto('https://cdn.example/a'),/não é público/);assert.equal(calls.length,0);}
 const calls=setup([{statusCode:302,headers:{location:'https://127.0.0.1/secret'}}]);await assert.rejects(publicProductPhoto('https://cdn.example/a'));assert.equal(calls.length,1);
 setup(Array.from({length:4},()=>({statusCode:302,headers:{location:'https://cdn.example/loop'}})));await assert.rejects(publicProductPhoto('https://cdn.example/a'));
});

test('foto WebP/AVIF recebida por URL ou arquivo é convertida sem depender da extensão/MIME',async()=>{
 for(const format of ['webp','avif']){
 const original=await sharp({create:{width:24,height:30,channels:3,background:{r:200,g:70,b:20}}}).toFormat(format).toBuffer();
 setup([{headers:{'content-type':'image/'+format},chunks:[original]}]);const output=await publicProductPhoto('https://cdn.example/foto.'+format);assert.equal(output.mime,'image/jpeg');const info=await sharp(output.bytes).metadata();assert.equal(info.width,24);assert.equal(info.height,30);assert.equal(info.format,'jpeg');
 const uploaded=await productPhotoInput({mime:'image/'+format,base64:original.toString('base64')});assert.equal(uploaded.mime,'image/jpeg');
 }
 const transparent=await sharp({create:{width:20,height:20,channels:4,background:{r:0,g:0,b:0,alpha:.25}}}).webp().toBuffer();setup([{headers:{'content-type':'application/octet-stream'},chunks:[transparent]}]);const photo=await publicProductPhoto('https://cdn.example/download');assert.equal(photo.mime,'image/png');assert.equal((await sharp(photo.bytes).metadata()).hasAlpha,true);
 setup([{chunks:[Buffer.from('RIFF1234WEBPinvalid')]}]);await assert.rejects(publicProductPhoto('https://cdn.example/bad.webp'),/converter/);
 await assert.rejects(productPhotoInput({mime:'image/svg+xml',base64:Buffer.from('<svg/>').toString('base64')}));
});
