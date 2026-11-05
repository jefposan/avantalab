import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
 const f=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);
}});
const {readOriginPriceEvidence}=await import('../../app/modules/marketplaces/price-origin-evidence.ts');
const {publicPriceAddress,readPublicPricePage}=await import('../../app/modules/marketplaces/services/public-price-page.ts');
const {selectOriginCandidates}=await import('../../app/modules/marketplaces/services/verify-price-origins.ts');hooks.deregister();
const url='https://loja.example/calculadora-elgin-mb7142',input={productName:'Calculadora Elgin MB7142',ean:null};
const product=()=>({'@type':'Product',name:'Calculadora Elgin MB7142',url,offers:{'@type':'Offer',url,price:'759.81',priceCurrency:'BRL',availability:'https://schema.org/InStock',itemCondition:'https://schema.org/NewCondition'}});
const json=value=>`<h1>Calculadora Elgin MB7142</h1><script type="application/ld+json">${JSON.stringify(value)}</script>`;
const amazonUrl='https://www.amazon.com.br/produto/dp/B0BLD3YF51';
const amazonInput={productName:'Escova Rotativa Er-10 Mondial Preto',ean:'7899882311471'};
const amazon=()=>`<input id="ASIN" value="B0BLD3YF51"><h1 id="productTitle">Escova Rotativa Mondial ER-10 1200W Rose/Preto 127V</h1><div id="corePrice_feature_div" data-csa-c-asin="B0BLD3YF51"><span class="a-price apex-pricetopay-value"><span class="a-offscreen">R$265,90</span><span>R$ 265 , 90</span></span><s>R$399,90</s><p>10x R$27,99</p></div><div id="availability">Somente 6 em estoque.</div><input id="add-to-cart-button" type="submit"><aside>Outro produto R$1,00</aside>`;
test('oito leituras priorizam modelo e lojas distintas, não vitrines, manuais ou espelhos',()=>{
 const candidates=[
  ...Array.from({length:12},(_,i)=>({url:`https://market.example/produtos/elgin-mb7142-${i}`})),
  {url:'https://loja.example/products/elgin-mb7142?utm_source=origem'},
  {url:'https://loja.example/products/elgin-mb7142?utm_source=espelho'},
  {url:'https://fabricante.example/downloads/elgin-mb7142.pdf'},
  {url:'https://busca.example/busca/elgin-mb7142'},
  {url:'https://outra.example/elgin-mb7142.html'},
 ];
 const selected=selectOriginCandidates(candidates,input);
 assert.equal(selected.length,8);
 assert.equal(selected.filter(x=>new URL(x.url).hostname==='loja.example').length,1);
 assert.ok(selected.some(x=>x.url==='https://outra.example/elgin-mb7142.html'));
 assert.ok(selected.every(x=>!x.url.includes('utm_')&&!x.url.includes('/busca/')&&!x.url.endsWith('.pdf')));
 assert.doesNotThrow(()=>selectOriginCandidates([{url:'https://loja.example/elgin-%EE-mb7142'}],input));
});
test('Amazon sem schema: lê oferta principal, não parcela, preço anterior ou recomendação',()=>{
 const found=readOriginPriceEvidence(amazon(),amazonUrl,amazonInput);
 assert.equal(found?.price,265.9);assert.equal(found?.method,'primary_dom');
});
test('Amazon exige identidade, variante, estoque, compra habilitada e preço único',()=>{
 for(const html of [amazon().replace('Somente 6 em estoque.','Sem estoque'),amazon().replace('Somente 6 em estoque.','Consulte disponibilidade'),amazon().replace('type="submit"','disabled type="submit"'),amazon().replace('value="B0BLD3YF51"','value="B0BLD3YF52"'),amazon().replace('data-csa-c-asin="B0BLD3YF51"','data-csa-c-asin="B0BLD3YF52"'),amazon().replace('ER-10 1200W','ER-11 1200W'),amazon().replace('R$265,90','12x R$22,15'),amazon().replace('</s>','</s><span class="apex-pricetopay-value">R$300,00</span>')])assert.equal(readOriginPriceEvidence(html,amazonUrl,amazonInput),null);
 assert.equal(readOriginPriceEvidence(amazon(),amazonUrl.replace('www.amazon.com.br','loja.example'),amazonInput),null);
 assert.equal(readOriginPriceEvidence(amazon(),amazonUrl,{...amazonInput,productName:amazonInput.productName+' 220V'}),null);
});
test('usa o preço atual da origem, nunca o preço sugerido pela IA ou parcela',()=>{
 const evidence=readOriginPriceEvidence(json(product())+'<aside>12x R$ 63,32</aside>',url,input);
 assert.equal(evidence.price,759.81);assert.equal(evidence.availability,'in_stock');assert.equal(evidence.method,'json_ld');
});
test('moeda pt-BR e suboferta de agregado exigem preço e estoque reais; não usam lowPrice',()=>{
 for(const [price,expected] of [['76,99',76.99],['1.099,90',1099.9]]){const p=product();p.offers.price=price;assert.equal(readOriginPriceEvidence(json(p),url,input)?.price,expected);}
 const p=product(),child=p.offers;p.offers={'@type':'AggregateOffer',lowPrice:1,priceCurrency:'BRL',offers:[child]};
 assert.equal(readOriginPriceEvidence(json(p),url,input)?.price,759.81);
 child.availability='https://schema.org/OutOfStock';assert.equal(readOriginPriceEvidence(json(p),url,input),null);
});
test('sinônimos não bloqueiam modelo exato; cor, GTIN numérico e variante conflitantes bloqueiam',()=>{
 const p=product();p.name='Calculadora de Mesa Elgin Visor 14 Dígitos Bivolt MB7142';
 assert.equal(readOriginPriceEvidence(json(p),url,{ean:null,productName:'Calculadora de Impressão Elgin MB7142 Branca'})?.price,759.81);
 p.name='Aquecedor Elétrico Kian AQ100 1500W 127V Preto';
 assert.equal(readOriginPriceEvidence(json(p),url,{ean:null,productName:'Aquecedor Elétrico Kian AQ100 1500W 127V Branco'}),null);
 p.name='Calculadora Elgin MB7142';p.offers.gtin13=7891129598607;
 assert.equal(readOriginPriceEvidence(json(p),url,{...input,ean:'7908103790527'}),null);
 p.offers={...p.offers,url:url+'?variant=wrong'};
 assert.equal(readOriginPriceEvidence(json(p),url+'?variant=selected',input),null);
});
test('pausados, sem estoque, vencidos, usados e preços condicionais não entram',()=>{
 for(const change of [{availability:'https://schema.org/OutOfStock'},{availability:'https://schema.org/PreOrder'},{inventoryLevel:{value:0}},{status:'paused'},{priceValidUntil:'2000-01-01'},{priceCurrency:'USD'},{itemCondition:'https://schema.org/UsedCondition'},{eligibleMembershipTier:'Clube'},{price:'12x 63.32'},{'@type':'AggregateOffer',lowPrice:1}]){
  const p=product();p.offers={...p.offers,...change};assert.equal(readOriginPriceEvidence(json(p),url,input),null,JSON.stringify(change));
 }
 for(const notice of ['Anúncio pausado','Anúncio em pausa','Produto indisponível','Sem estoque'])assert.equal(readOriginPriceEvidence(json(product())+`<p>${notice}</p>`,url,input),null);
 const p=product();p.status='paused';assert.equal(readOriginPriceEvidence(json(p),url,input),null);
});
test('microdados primários isolam marca, oferta e produto recomendado',()=>{
 const html=`<main itemscope itemtype="http://schema.org/Product"><h1 itemprop="name">Calculadora Elgin MB-7142</h1><span itemprop="brand" itemscope itemtype="http://schema.org/Brand"><meta itemprop="name" content="Elgin"></span><div itemprop="offers" itemscope itemtype="http://schema.org/Offer"><meta itemprop="price" content="759.81"><meta itemprop="priceCurrency" content="BRL"><link itemprop="availability" href="http://schema.org/InStock"></div><aside itemprop="isRelatedTo" itemscope itemtype="http://schema.org/Product"><a itemprop="name">Calculadora Elgin MR6124</a><div itemprop="offers" itemscope itemtype="http://schema.org/Offer"><meta itemprop="price" content="1"><meta itemprop="priceCurrency" content="BRL"><meta itemprop="availability" content="http://schema.org/InStock"></div></aside></main>`;
 const found=readOriginPriceEvidence(html,url,input);assert.equal(found.price,759.81);assert.equal(found.method,'microdata');
 assert.equal(readOriginPriceEvidence(html.replace('http://schema.org/InStock','http://schema.org/OutOfStock'),url,input),null);
});
test('identidade, EAN, variante e ofertas contraditórias falham sem adivinhação',()=>{
 const p=product();p.gtin13='7891129598607';
 assert.equal(readOriginPriceEvidence(json(p),url,{...input,ean:'7908103790527'}),null);
 assert.equal(readOriginPriceEvidence(json(p),url,{...input,productName:'Calculadora Elgin MB7143'}),null);
 assert.equal(readOriginPriceEvidence(json(p),url,{...input,productName:'Calculadora Elgin MB7142 999V'}),null);
 const other=product();other.offers.price='100';assert.equal(readOriginPriceEvidence(json([p,other]),url,input),null);
 assert.equal(readOriginPriceEvidence('<h1>Calculadora Elgin MB7142</h1><p>R$ 1,00</p>',url,input),null);
});
test('validade aceita data e instante ISO, rejeitando vencimento e calendário inválido',()=>{
 for(const expiry of ['2099-10-26','2099-10-26T19:00:13Z','2099-10-26T16:00:13-03:00']){
  const p=product();p.offers.priceValidUntil=expiry;assert.equal(readOriginPriceEvidence(json(p),url,input)?.price,759.81,expiry);
 }
 for(const expiry of ['2000-10-26T19:00:13Z','2099-02-30','2099-02-30T19:00:13Z','2099-10-26T19:00:13','inválido']){
  const p=product();p.offers.priceValidUntil=expiry;assert.equal(readOriginPriceEvidence(json(p),url,input),null,expiry);
 }
});
test('GTIN exato admite título abreviado sem dispensar identidade e variante',()=>{
 const p=product();p.gtin13='7896006214007';p.name='Andriodermol 50ml';
 const query={ean:p.gtin13,productName:'Andriodermol Solucao Topica 50ml'};
 assert.equal(readOriginPriceEvidence(json(p),url,query)?.price,759.81);
 for(const name of ['Andriodermol 100ml','Outro medicamento 50ml','Andriodermol 50mg']){p.name=name;assert.equal(readOriginPriceEvidence(json(p),url,query),null,name);}
 p.name='Andriodermol 50ml';p.gtin13='7908103790527';assert.equal(readOriginPriceEvidence(json(p),url,query),null);
 delete p.gtin13;assert.equal(readOriginPriceEvidence(json(p),url,query),null,'sem GTIN não relaxa título');
});
test('SSRF bloqueia endereços privados/reservados, protocolos e portas',async()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','172.16.0.1','100.64.1.1','0.0.0.0','224.0.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1','2001:0db8::1','2002:7f00:1::'])assert.equal(publicPriceAddress(ip),false,ip);
 for(const ip of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111','2001:4860:4860::8888'])assert.equal(publicPriceAddress(ip),true,ip);
 for(const page of ['http://loja.example/produto','https://user:secret@loja.example/produto','https://loja.example:444/produto','file:///etc/passwd'])assert.equal(await readPublicPricePage(page),null);
 const abort=new AbortController();abort.abort();await assert.rejects(()=>readPublicPricePage(url,abort.signal));
});
