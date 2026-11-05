import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {POST_CONDITIONS,POST_VOLTAGES,postSummary,postProductName,postPrimaryColor,productPostDetails,suggestedPostVoltage,validateProductPost,productPostCaption} from '../../app/modules/marketplaces/product-post.ts';
import {compartilharImagem} from '../../app/lib/compartilhar-imagem.ts';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const valid={company:'Perfil',name:'Air Fryer',image:'/foto.png',description:'Air fryer de 5 litros.',voltage:'127 V',condition:'new',damage:'',priceCents:32550,originalPriceCents:46500,primaryColor:'#d60000'};
test('post: detalhes para todas as condições, avaria informada, preço válido e sem fabricar foto',()=>{
 assert.deepEqual(Object.values(POST_CONDITIONS),['Novo','Usado','Recondicionado','Avaria','Com detalhe']);
 assert.ok(POST_VOLTAGES.includes('Não se aplica'));
 assert.equal(validateProductPost(valid),null);
 for(const [change,field] of [[{image:''},'image'],[{description:' '},'description'],[{voltage:''},'voltage'],[{condition:''},'condition'],[{condition:'constructor'},'condition'],[{condition:'damaged',damage:'  '},'details'],[{details:'x'.repeat(161)},'details'],[{priceCents:0},'price'],[{priceCents:1.5},'price']])assert.equal(validateProductPost({...valid,...change}).field,field);
 for(const condition of ['new','used','refurbished','damaged','detailed']) assert.equal(validateProductPost({...valid,condition,details:'Sem caixa. Acompanha os acessórios.'}),null);
 assert.equal(validateProductPost({...valid,condition:'damaged',damage:'Amassado na lateral. Funciona normalmente.'}),null);
 assert.equal(valid.damage,'','rascunho não altera produto/cadastro');
 for(const originalPriceCents of [0,32550,32000,Infinity])assert.equal(validateProductPost({...valid,originalPriceCents}).field,'original-price');
 assert.equal(postPrimaryColor('#d60000'),'#d60000');assert.equal(postPrimaryColor('red;url(x)'),'#003E73');
});
test('post: resume texto sem HTML e não presume voltagem ambígua ou condição de produto',()=>{
 assert.equal(postSummary('<p>Cesto <b>removível</b></p>'),'Cesto removível');
 assert.ok(postSummary('Produto muito bom para uma cozinha de família. '.repeat(10)).length<=180);
 assert.equal(suggestedPostVoltage('Air fryer 127V'),'127 V');
 assert.equal(suggestedPostVoltage('Produto bivolt'),'Bivolt');
 assert.equal(suggestedPostVoltage('Produto 127V / 220V'),'');
 assert.equal(suggestedPostVoltage('Produto'),'');
 assert.equal(suggestedPostVoltage('Produto 127V',[{id:'VOLTAGE',name:'Voltagem',value:'220 V'}]),'220 V');
 assert.equal(suggestedPostVoltage('Produto',[{id:'VOLTAGE',name:'Voltagem',value:'127'}]),'127 V');
 assert.equal(postProductName('Air Fryer 5L Preto 127V'),'Air Fryer 5L Preto');
});
test('compartilhar: arquivo pronto vai ao menu nativo; cancelar não baixa nem declara sucesso',async()=>{
 const before=Object.getOwnPropertyDescriptor(globalThis,'navigator'),calls=[];
 const file=new File(['png'],'post.png',{type:'image/png'});
 try{
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{canShare:()=>true,share:async payload=>{calls.push(payload);}}});
  assert.equal(await compartilharImagem(file,'Produto'),'compartilhado');assert.equal(calls[0].files[0],file);assert.equal(calls[0].title,'Produto');
  assert.equal(await compartilharImagem(file,'Produto','De: ~R$ 465,00~\nPor: *R$ 325,50*'),'compartilhado');assert.equal(calls[1].text,'De: ~R$ 465,00~\nPor: *R$ 325,50*');
  navigator.share=async()=>{throw new DOMException('Cancelado','AbortError');};assert.equal(await compartilharImagem(file,'Produto'),'cancelado');
  navigator.share=async()=>{const error=new Error('Cancelado');error.name='AbortError';throw error;};assert.equal(await compartilharImagem(file,'Produto'),'cancelado');
  navigator.share=async()=>{throw new Error('Falhou');};await assert.rejects(()=>compartilharImagem(file,'Produto'),/Baixar imagem/);
 }finally{if(before)Object.defineProperty(globalThis,'navigator',before);else delete globalThis.navigator;}
});
test('post: botão divide a linha, usa a imagem salva e não cria venda, publicação ou atualização de cadastro',()=>{
 const client=readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx','utf8'),component=readFileSync('app/marketplaces/ProductPost.tsx','utf8'),canvas=readFileSync('app/marketplaces/product-post-image.ts','utf8');
 assert.match(client,/className=\{styles.productResultActions\}/);assert.match(client,/product=\{\{\.\.\.result.product,internalNotes:resultNotes\}\}/);
 assert.match(component,/Compartilhar post/);assert.match(component,/condition==='damaged'/);assert.match(component,/URL.revokeObjectURL/);assert.match(component,/generation.current\?\.abort/);
 assert.doesNotMatch(component,/fetch\(|method:.*POST|notifyDirectSalesChanged|localStorage/);
 assert.match(canvas,/canvas.width=1080;canvas.height=1350/);assert.match(canvas,/crossOrigin='anonymous'/);assert.match(canvas,/productPostDetails\(data\)/);
 assert.doesNotMatch(canvas,/Avaria:|if\(data.condition==='damaged'\)/);
 assert.match(canvas,/ctx.textAlign='right'/);assert.match(canvas,/ctx.fillText\(sale,998,1290\)/);
 assert.match(canvas,/600 44px/);assert.match(canvas,/700 36px/);assert.match(canvas,/400 38px/);
 assert.match(component,/>Detalhes<textarea id="post-details"/);
});
test('post: De inicia pela média pesquisada, não pela sugestão de venda, e continua editável sem ser sobrescrito',()=>{
 const states=[],refs=[];let cursor=0,refCursor=0;
 const hooks={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},useRef(initial){return refs[refCursor++]??={current:initial};},useEffect(){}};
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/ProductPost.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,Intl,Number,require(name){
  if(name==='react')return hooks;
  if(name==='./ProductPostFlow')return{default:()=>null};
  if(name.includes('formatters'))return{formatarMoedaDigitada:v=>(Number(v.replace(/\D/g,''))/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})};
  if(name.includes('product-post')&&!name.includes('image')&&!name.endsWith('.css'))return{postSummary:v=>v,suggestedPostVoltage:()=>'',postPrimaryColor:()=> '#003E73',POST_VOLTAGES:[],POST_CONDITIONS:{}};
  if(name.includes('CampoMoeda')||name.includes('BotaoAcaoCompacto')||name.includes('DirectSaleActions'))return{default:'button',DirectDialog:'dialog'};
  if(name.endsWith('.module.css'))return{default:{}};
  if(name.includes('compartilhar-imagem')||name.includes('product-post-image')||name.includes('product-post-store')||name.includes('product-post-photo'))return{};
  return require(name);
 }});
 const props={product:{id:'p',name:'Produto',description:'Produto',image:'/photo',internalNotes:'Observação cadastrada'},companyName:'Perfil',referencePrice:465,prices:{minimum:232.5,medium:325.5,ideal:418.5},onClose(){}};
 const all=n=>Array.isArray(n)?n.flatMap(all):n&&typeof n==='object'?[n,...all(n.props?.children)]:[];
 function render(extra={}){cursor=refCursor=0;return all(exports.ProductPostImage({...props,...extra}));}
 let nodes=render(),input=nodes.find(n=>n.props?.id==='post-original-price');
 assert.ok(nodes.find(n=>n.props?.id==='post-details'),'Detalhes aparece antes de selecionar a condição');
 assert.equal(nodes.find(n=>n.props?.id==='post-details').props.value,'Observação cadastrada');
 nodes.find(n=>n.props?.id==='post-details').props.onChange({target:{value:'Produto sem caixa, completo.'}});
 for(const value of ['new','used','refurbished','damaged','detailed']){
  nodes.find(n=>n.props?.id==='post-condition').props.onChange({target:{value}});nodes=render();
  assert.equal(nodes.find(n=>n.props?.id==='post-details').props.value,'Produto sem caixa, completo.');
  assert.equal(props.product.internalNotes,'Observação cadastrada','post não altera as notas do cadastro');
 }
 assert.equal(input.props.value,'465,00');
 input.props.onChange('499,99');
 nodes=render({referencePrice:500});assert.equal(nodes.find(n=>n.props?.id==='post-original-price').props.value,'499,99');
 assert.equal(nodes.find(n=>n.props?.id==='post-price').props.value,'325,50');
 nodes.find(n=>n.props?.id==='post-price').props.onChange('299,99');
 nodes=render({prices:{minimum:300,medium:420,ideal:540}});
 assert.equal(nodes.find(n=>n.props?.id==='post-price').props.value,'299,99','preço manual do post não muda com os padrões');
 assert.equal(props.prices.ideal,418.5,'post não escreve o preço Online');
 assert.match(readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx','utf8'),/referencePrice=\{result.prices\?\.market\}/);
});

test('imagem real: Detalhes em todas as condições, fonte ampliada e preço à direita sem invadir o conteúdo',async()=>{
 const texts=[],boxes=[];
 const ctx={font:'',textAlign:'left',fillText(value,x,y){texts.push({value,x,y,font:this.font,align:this.textAlign});},measureText(value){return{width:value.length*Number(this.font.match(/(\d+)px/)?.[1]||20)*.52};},roundRect(x,y,w,h){boxes.push({x,y,w,h});},createLinearGradient(){return{addColorStop(){}};}};
 for(const method of ['beginPath','fill','fillRect','arc','stroke','save','restore','drawImage','moveTo','lineTo'])ctx[method]=()=>{};
 class Photo{naturalWidth=400;naturalHeight=400;set src(value){if(value)this.onload?.();}}
 const exported={};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/product-post-image.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
  exports:exported,Image:Photo,Intl,DOMException,Blob,setTimeout,clearTimeout,getComputedStyle:()=>({getPropertyValue:()=> 'Arial'}),document:{documentElement:{},createElement:()=>({getContext:()=>ctx,toBlob:callback=>callback(new Blob(['png'],{type:'image/png'}))})},
  require(name){if(name.includes('/product-post'))return{POST_CONDITIONS,postProductName,postPrimaryColor,productPostDetails,validateProductPost};if(name.includes('cores-avanta'))return{corTextoSobreFundo:()=> '#fff'};return require(name);},
 });
 for(const condition of ['new','used','refurbished','damaged','detailed']){
  texts.length=boxes.length=0;
  await exported.createProductPostImage({...valid,name:'Produto com descrição longa para testar o espaço do título e a organização da arte sem sobrepor os detalhes '.repeat(2),description:'Descrição completa do produto e dos acessórios. '.repeat(3),condition,details:'Sem caixa. Acompanha acessórios. '.repeat(4)},new AbortController().signal);
  const details=texts.find(text=>text.value.startsWith('Detalhes:'));assert.ok(details,condition);assert.match(details.font,/400 38px/);
  const sale=texts.find(text=>text.value.includes('325,50'));assert.equal(sale.align,'right');assert.equal(sale.x,998);
  const original=texts.find(text=>text.value.includes('465,00'));assert.match(original.font,/44px/);
  const pill=texts.find(text=>text.value==='127 V');assert.match(pill.font,/36px/);
  const detailsBox=boxes.find(box=>box.x===64&&box.h===134);assert.ok(detailsBox);assert.ok(detailsBox.y+detailsBox.h<=1102);
  const voltageBox=boxes.find(box=>box.x===80&&box.h===68);assert.equal(detailsBox.y-(voltageBox.y+voltageBox.h),36);
  assert.ok(texts.filter(text=>text.y>=details.y&&text.y<1124).every(text=>text.y<=detailsBox.y+detailsBox.h));
  assert.doesNotMatch(texts.map(text=>text.value).join(' '),/Avaria:/);
 }
 assert.equal(productPostDetails({damage:'Observação anterior'}),'Observação anterior');
});

test('legenda usa descrição salva, De tachado e Por negrito com marcadores nativos do WhatsApp',()=>{
 assert.equal(productPostCaption(valid).replaceAll('\u00a0',' '),'Air fryer de 5 litros.\n\nCondição: Novo\n\nDe: ~R$ 465,00~\nPor: *R$ 325,50*');
 assert.doesNotMatch(productPostCaption(valid),/\*\*|~~/);
});

test('legenda básica traz nome, detalhe opcional e preços, sem rótulo vazio',()=>{
 const product={...valid,name:'Fogão Elétrico Mondial Fast Cook FE-04',description:'Fogão Elétrico Mondial Fast Cook FE-04',details:'Caixa danificada.'};
 assert.equal(productPostCaption(product).replaceAll('\u00a0',' '),'Fogão Elétrico Mondial Fast Cook FE-04\n\nCondição: Novo\n\nDetalhe: Caixa danificada.\n\nDe: ~R$ 465,00~\nPor: *R$ 325,50*');
 const simple=productPostCaption({...product,details:'  '});assert.doesNotMatch(simple,/Detalhe:/);assert.match(simple,/Condição: Novo\n\nDe:/);
 const component=readFileSync('app/marketplaces/ProductPost.tsx','utf8');assert.match(component,/useState\(\(\)=>postSummary\(product.name\)\)/);assert.doesNotMatch(component,/postSummary\(product.description/);
});

test('Saldão Aline compartilha dois contatos e grupo após a legenda, sem alterar outras empresas',()=>{
 const caption=productPostCaption({...valid,description:'Fogão & café? #1'},'baa8c115-634a-41d3-9e2a-8666dce11454');
 const urls=caption.match(/https:\/\/\S+/g);assert.equal(urls.length,3);
 assert.equal(new URL(urls[0]).pathname,'/5511983044391');
 assert.equal(new URL(urls[1]).pathname,'/5511987885611');
 assert.equal(new URL(urls[0]).search,'');assert.equal(new URL(urls[1]).search,'');
 assert.equal(urls[2],'https://chat.whatsapp.com/HMoUgB9TLWvIm2kDWhiKjJ');
 assert.ok(caption.indexOf('POR APENAS')<caption.indexOf('https://wa.me/'));
 assert.doesNotMatch(productPostCaption(valid,'outra-empresa'),/wa.me|chat.whatsapp/);
 assert.equal(productPostCaption(valid,'outra-empresa'),productPostCaption(valid));
});

test('legenda Saldão segue o texto aprovado com negrito e links curtos',()=>{
 const text=productPostCaption({...valid,description:'Fogão Elétrico Mondial Fast Cook',condition:'detailed',details:'Sem caixa',originalPriceCents:33030,priceCents:32900},'baa8c115-634a-41d3-9e2a-8666dce11454').replaceAll('\u00a0',' ');
 assert.equal(text,`Fogão Elétrico Mondial Fast Cook

De: ~R$ 330,30~
💰 *POR APENAS R$ 329,00*

*Condição:* Com detalhe
*Detalhe:* Sem caixa

👉 *Faça sua oferta pelo WhatsApp:*

*Contato 1:*
https://wa.me/5511983044391

*Contato 2:*
https://wa.me/5511987885611

🛍️ *Entre no nosso grupo de ofertas:*
https://chat.whatsapp.com/HMoUgB9TLWvIm2kDWhiKjJ`);
});
