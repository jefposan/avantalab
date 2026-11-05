import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const read=f=>readFileSync('app/marketplaces/'+f,'utf8');
test('ação navega com ID persistido e empresa atual, sem pesquisar ou escrever no marketplace',()=>{
 const source=read('MarketplacesClient.tsx');
 const fn=stripTypeScriptTypes(source.slice(source.indexOf('  function viewProductInStock('),source.indexOf('  function scrollToSales()')));
 const opening=[],calls=[],events=[],context={lastAdjustedNotice:{current:null},lastViewedStockProduct:{current:''},setNoticeOpening:v=>opening.push(v),publicationBusy:false,companyId:'empresa-A',marketplace:'magalu',setConnectionNotice:v=>calls.push(v),setNoticeNavigationError(){},setNoticeNavigation:v=>calls.push(v),window:{dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(name,args){this.name=name;this.detail=args.detail;}},MARKETPLACE_DETAIL_NAVIGATION:'navigate',crypto:{randomUUID:()=> 'new-navigation'}};
 vm.runInNewContext(fn+'viewProductInStock("product-linked");',context);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{companyId:'empresa-A',target:{key:'new-navigation',panel:'stock',provider:'magalu',productId:'product-linked',origin:'announced'}});
 assert.equal(events[0].detail.companyId,'empresa-A');
 assert.deepEqual(opening,[true]);assert.equal(context.lastViewedStockProduct.current,'product-linked');
 assert.doesNotMatch(fn,/fetch\(|marketplaceClientRequest|ean|title/);
 context.publicationBusy=true;calls.length=0;events.length=0;vm.runInNewContext(fn+'viewProductInStock("other");',context);assert.equal(typeof calls[0],'string');assert.equal(events.length,0);
});
test('botões adjacentes, sem vínculo não navega; estoque recebe ID exato sem expandir',()=>{
 const header=read('ListingGroupHeader.tsx'),ads=read('Anunciados.tsx'),stock=read('ProductsStock.tsx'),warehouses=read('WarehousesPanel.tsx');
 assert.match(header,/announcedGroupActions[\s\S]*?Ver no estoque[\s\S]*?Ver anúncios/);
 assert.match(header,/disabled=\{disabled\|\|!group.productId\|\|!onViewStock\}/);
 assert.match(ads,/onViewProductInStock\(group.productId!\)/);
 assert.match(stock,/setDetailId\(props.noticeTarget\?\.origin==='announced'\?'':noticeProduct\)/);
 assert.match(stock,/result.product\?\.id !== noticeProduct \|\| result.product\?\.empresa_id !== companyId/);
 assert.match(stock,/scrollMarketplaceRow\(row\)/);assert.match(stock,/localProductLocated/);
 assert.match(warehouses,/setPublicationFilter\('all'\);setAccountSelection\(\{companyId,value:''\}\);setOpen\(true\)/);
});
