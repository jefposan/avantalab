import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {captureMarketplaceDetailNavigation,MARKETPLACE_DETAIL_NAVIGATION,shouldDismissMarketplaceDetail} from '../../app/marketplaces/product-stock-events.ts';

test('ação externa recolhe antes da função clicada, sem consumir o clique; ações internas, portais e disabled são preservados',()=>{
 const previous={window:globalThis.window,Element:globalThis.Element};
 const events=new EventTarget(),sequence=[];
 class ElementMock {
  constructor({action=true,disabled=false,keep='',portal=false,modal=false}={}){Object.assign(this,{action,disabled,keep,portal,modal});}
  closest(selector){if(selector==='[role="dialog"],[role="alertdialog"]')return this.modal?this:null;return selector==='[data-marketplace-detail]' ? (this.keep?{getAttribute:()=>this.keep}:null) : (this.action?this:null);}
  matches(){return this.disabled;}
 }
 globalThis.Element=ElementMock;globalThis.window=events;
 try{
  let open='announced:one';
  events.addEventListener(MARKETPLACE_DETAIL_NAVIGATION,event=>{if(shouldDismissMarketplaceDetail(event,'company',open,false)){sequence.push('recolheu');open='';}});
  const click=options=>captureMarketplaceDetailNavigation('company',{target:new ElementMock(options),currentTarget:{contains:target=>!target.portal}});
  click({keep:open});assert.equal(open,'announced:one');
  click({portal:true});click({modal:true});click({disabled:true});click({action:false});assert.equal(open,'announced:one');
  click({});sequence.push('executou');assert.deepEqual(sequence,['recolheu','executou']);assert.equal(open,'');
  open='announced:one';click({keep:'product:stock:two'});assert.equal(open,'','outro item recolhe o anterior');
 }finally{for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});

test('callbacks reais de anúncio/produto recolhem por navegação, mas não durante operação nem em outra empresa',()=>{
 for(const file of ['Anunciados.tsx','ProductsStock.tsx']){
  const source=readFileSync('app/marketplaces/'+file,'utf8');
  const body=source.match(/const dismiss = \(event: Event\) => \{([\s\S]*?)\n    \};/)[1];
  let open='one',copies='copy';
  const context={shouldDismissMarketplaceDetail,companyId:'company',accountId:'account',expanded:'one',acting:false,detailId:'one',detailPrefix:'local',busy:false,mutationInFlight:{current:false},setExpandedState:v=>{open=v.id;},setDetailId:v=>{open=v;},setCopyingListing:v=>{copies=v;},setCopyTargetId(){}};
  context.listingGroups=[];context.openGroup='';context.setOpenGroup=()=>{};
  const dismiss=runInNewContext(stripTypeScriptTypes(`event=>{${body}}`),context);
  const event=(companyId,keepDetail='')=>new CustomEvent(MARKETPLACE_DETAIL_NAVIGATION,{detail:{companyId,keepDetail}});
  dismiss(event('other'));assert.equal(open,'one');
  dismiss(event('company',file==='Anunciados.tsx'?'announced:one':'product:local:one'));assert.equal(open,'one');
  context.acting=true;context.busy=true;dismiss(event('company'));assert.equal(open,'one');
  context.acting=false;context.busy=false;dismiss(event('company'));assert.equal(open,'');
  if(file==='Anunciados.tsx')assert.equal(copies,null);
 }
 const products=readFileSync('app/marketplaces/ProductsStock.tsx','utf8');
 assert.match(products,/onInteractionLockChange\?\.\(busy \|\| creating\)/);
 assert.doesNotMatch(products,/researchDisabled=\{expanded\}|disabled=\{busy \|\| loading \|\| !!detailId/);
 const client=readFileSync('app/marketplaces/MarketplacesClient.tsx','utf8');assert.match(client,/onClickCapture=\{event => \{ captureMarketplaceDetailNavigation\(companyId, event\); captureMarketplacePanelExpansion\(event\); \}\}/);
});
