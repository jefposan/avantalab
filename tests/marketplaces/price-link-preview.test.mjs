import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url);
test('prévia do WhatsApp usa arte aprovada específica do AvantaPreços sem trocar ícones do PWA',()=>{
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/consulta/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require(name){if(name.includes('MarketplaceMobileApp')||name.endsWith('.css'))return{};return require(name);}});
 const m=exports.metadata,image=m.openGraph.images[0],data=readFileSync('public/images/avantaprecos-link-v1.jpg');
 assert.equal(m.openGraph.title,'AvantaPreços');assert.equal(m.openGraph.siteName,'AvantaPreços');assert.equal(m.openGraph.type,'website');
 assert.equal(m.openGraph.url,'https://avantalab.com.br/marketplaces/consulta');assert.equal(m.alternates.canonical,m.openGraph.url);
 assert.equal(image.url,'https://avantalab.com.br/images/avantaprecos-link-v1.jpg');assert.equal(image.type,'image/jpeg');
 assert.equal(data.readUInt16BE(0),0xffd8);assert.ok(data.length<300*1024,'exportação leve para prévia de compartilhamento');
 let size;for(let p=2;p<data.length-10;){const marker=data[p+1],length=data.readUInt16BE(p+2);if([0xc0,0xc1,0xc2].includes(marker)){size={width:data.readUInt16BE(p+7),height:data.readUInt16BE(p+5)};break;}p+=length+2;}
 assert.equal(image.width,size.width);assert.equal(image.height,size.height);assert.ok(image.width/image.height>1.8);
 assert.equal(m.twitter.card,'summary_large_image');assert.equal(m.twitter.images[0],image.url);
 assert.equal(m.manifest,'/marketplaces/consulta/manifest.webmanifest');
 assert.equal(m.icons.apple[0].url,'/images/marketplaces-mobile-icon-180.png');assert.equal(m.icons.icon[0].url,'/images/marketplaces-mobile-icon-192.png');
 assert.equal(createHash('sha256').update(data).digest('hex'),'0e73a0da398dee34298405d1bea83d99c1ba30fad056ece405b95c1639ee48eb');
});
