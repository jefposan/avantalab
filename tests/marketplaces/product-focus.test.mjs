import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ativarFocoProduto,recolherProdutoEmFoco} from '../../app/lib/foco-produto.ts';

class Style {
 values=new Map(); priorities=new Map();
 getPropertyValue(k){return this.values.get(k)||'';}
 getPropertyPriority(k){return this.priorities.get(k)||'';}
 setProperty(k,v,p=''){this.values.set(k,v);this.priorities.set(k,p);}
 removeProperty(k){this.values.delete(k);this.priorities.delete(k);}
}
class Node {
 style=new Style();children=[];parentElement=null;inert=false;isConnected=true;tagName='DIV';
 constructor(parent){if(parent){parent.children.push(this);this.parentElement=parent;this.ownerDocument=parent.ownerDocument;}}
 contains(target){return target===this||this.children.some(child=>child.contains(target));}
 hasAttribute(name){return name==='data-product-focus-navigation'&&!!this.navigation;}
 closest(selector){if(selector.includes('role='))return this.dialog?this:this.parentElement?.closest(selector)||null;if(selector.includes('data-product-focus-navigation'))return this.navigation?this:this.parentElement?.closest(selector)||null;return this.scroll?this:this.parentElement?.closest(selector)||null;}
 querySelector(selector){if(selector==='[data-product-focus-navigation]'){for(const child of this.children){if(child.navigation)return child;const found=child.querySelector(selector);if(found)return found;}return null;}return {focus:options=>{this.focusOptions=options;}};}
}
test('menu aninhado mantém clique, teclado e rolagem sem liberar conteúdo externo',()=>{
 const oldElement=globalThis.Element,oldHtml=globalThis.HTMLElement;globalThis.Element=globalThis.HTMLElement=Node;
 try{
  const html=new Node(),body=new Node(html),main=new Node(body),wrapper=new Node(main),menu=new Node(wrapper),button=new Node(menu),other=new Node(wrapper),card=new Node(main),listeners=new Map();menu.navigation=true;
  const doc={documentElement:html,body,addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
  for(const node of[html,body,main,wrapper,menu,button,other,card])node.ownerDocument=doc;
  const restore=ativarFocoProduto(card,()=>true);
  assert.equal(wrapper.inert,false);assert.equal(menu.inert,false);assert.equal(button.inert,false);assert.equal(other.inert,true);
  let prevented=0;for(const type of ['wheel','touchmove'])listeners.get(type)({target:button,preventDefault(){prevented++;}});
  assert.equal(prevented,0,'menu continua rolável por mouse e toque');
  listeners.get('wheel')({target:other,preventDefault(){prevented++;}});assert.equal(prevented,1);
  restore();assert.equal(other.inert,false);assert.equal(menu.inert,false);assert.equal(listeners.size,0);
 }finally{globalThis.Element=oldElement;globalThis.HTMLElement=oldHtml;}
});
function focusFixture(){
 const html=new Node(),body=new Node(html),main=new Node(body),stock=new Node(main),catalog=new Node(main),a=new Node(stock),b=new Node(catalog),other=new Node(main),listeners=new Map();
 const doc={documentElement:html,body,addEventListener(k,v){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(v)},removeEventListener(k,v){listeners.get(k)?.delete(v)}};
 for(const n of[html,body,main,stock,catalog,a,b,other])n.ownerDocument=doc;
 other.inert=true;body.style.setProperty('overflow','auto');return {html,body,stock,catalog,a,b,other,doc,listeners};
}
test('duas fichas em painéis distintos transferem o foco sem locks sobrepostos e limpeza antiga é inofensiva',()=>{
 const oldElement=globalThis.Element,oldHtml=globalThis.HTMLElement;globalThis.Element=globalThis.HTMLElement=Node;
 try{const f=focusFixture();let closedA=0,closedB=0;
  const old=ativarFocoProduto(f.a,()=>{closedA++;return true});assert.equal(f.catalog.inert,true);
  const current=ativarFocoProduto(f.b,()=>{closedB++;return true});assert.equal(closedA,1);assert.equal(f.catalog.inert,false);assert.equal(f.stock.inert,true);assert.equal(f.b.inert,false);assert.equal(f.listeners.get('wheel').size,1);
  old();assert.equal(f.stock.inert,true,'cleanup da ficha anterior não destrava o fundo atual');assert.equal(recolherProdutoEmFoco(f.doc),true);assert.equal(closedB,1);current();assert.equal(f.stock.inert,false);assert.equal(f.catalog.inert,false);assert.equal(f.other.inert,true);assert.equal(f.body.style.getPropertyValue('overflow'),'auto');assert.equal(f.listeners.get('wheel').size,0);
 }finally{globalThis.Element=oldElement;globalThis.HTMLElement=oldHtml;}
});
test('ficha com gravação em andamento recusa outro foco e recolhe somente a tentativa nova',()=>{
 const oldElement=globalThis.Element,oldHtml=globalThis.HTMLElement;globalThis.Element=globalThis.HTMLElement=Node;
 try{const f=focusFixture();let busy=true,refused=0;const old=ativarFocoProduto(f.a,()=>!busy);const denied=ativarFocoProduto(f.b,()=>true,()=>refused++);
  assert.equal(refused,1);assert.equal(f.stock.inert,false);assert.equal(f.catalog.inert,true);assert.equal(f.listeners.get('wheel').size,1);denied();assert.equal(recolherProdutoEmFoco(f.doc),false);busy=false;assert.equal(recolherProdutoEmFoco(f.doc),true);old();assert.equal(f.catalog.inert,false);
 }finally{globalThis.Element=oldElement;globalThis.HTMLElement=oldHtml;}
});
test('remontagem da mesma ficha e remoção do DOM restauram antes de adquirir novo foco',()=>{
 const oldElement=globalThis.Element,oldHtml=globalThis.HTMLElement;globalThis.Element=globalThis.HTMLElement=Node;
 try{const f=focusFixture();let collapsed=0;const first=ativarFocoProduto(f.a,()=>{collapsed++;return true});const second=ativarFocoProduto(f.a,()=>true);first();assert.equal(collapsed,0);assert.equal(f.catalog.inert,true);assert.equal(f.listeners.get('wheel').size,1);f.a.isConnected=false;const third=ativarFocoProduto(f.b,()=>true);second();assert.equal(f.catalog.inert,false);assert.equal(f.stock.inert,true);third();assert.equal(f.stock.inert,false);
 }finally{globalThis.Element=oldElement;globalThis.HTMLElement=oldHtml;}
});
test('ficha mantém espaço, isola irmãos e restaura inert, overflow e foco sem salvar',()=>{
 const oldElement=globalThis.Element,oldHtml=globalThis.HTMLElement;
 globalThis.Element=globalThis.HTMLElement=Node;
 try{
  const html=new Node(),body=new Node(html),main=new Node(body),outside=new Node(main),card=new Node(main),other=new Node(main),details=new Node(card),input=new Node(details),head=new Node(card),navigation=new Node(main);
  navigation.navigation=true;
  details.scroll=true;other.inert=true;outside.style.setProperty('overflow','auto','important');
  html.style.setProperty('scrollbar-gutter','both-edges');main.style.setProperty('overflow','scroll','important');
  const listeners=new Map(),doc={documentElement:html,addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:(k,v)=>{assert.equal(listeners.get(k),v);listeners.delete(k);}};
  for(const node of[html,body,main,outside,card,other,details,input,head,navigation])node.ownerDocument=doc;
  let busy=true,collapsed=0;
  const restore=ativarFocoProduto(card,()=>{if(busy)return false;collapsed++;return true;});
  assert.equal(outside.inert,true);assert.equal(other.inert,true);assert.equal(card.inert,false);assert.equal(details.inert,false);
  assert.equal(navigation.inert,false,'atalhos permanecem acionáveis durante foco');
  assert.equal(recolherProdutoEmFoco(doc),false,'escrita em andamento não pode ser descartada');assert.equal(collapsed,0);assert.equal(outside.inert,true);
  assert.equal(main.style.getPropertyValue('overflow'),'hidden');assert.equal(html.style.getPropertyValue('scrollbar-gutter'),'stable');
  let prevented=0;const fire=target=>listeners.get('wheel')({target,preventDefault(){prevented++;}});
  fire(input);assert.equal(prevented,0);fire(head);fire(outside);assert.equal(prevented,2);
  const dialog=new Node(body);dialog.dialog=true;fire(dialog);assert.equal(prevented,2,'confirmação do produto permanece utilizável');
  busy=false;assert.equal(recolherProdutoEmFoco(doc),true);assert.equal(collapsed,1);restore();assert.equal(recolherProdutoEmFoco(doc),true);assert.equal(collapsed,1,'limpeza repetida não afeta outra navegação');assert.equal(outside.inert,false);assert.equal(other.inert,true);assert.equal(main.style.getPropertyValue('overflow'),'scroll');assert.equal(main.style.getPropertyPriority('overflow'),'important');assert.equal(body.style.getPropertyValue('overflow'),'');assert.equal(html.style.getPropertyValue('scrollbar-gutter'),'both-edges');assert.equal(listeners.size,0);assert.deepEqual(card.focusOptions,{preventScroll:true});
 }finally{globalThis.Element=oldElement;globalThis.HTMLElement=oldHtml;}
});
test('somente fichas com rótulo recebem destaque e foco; recolher desmonta o rascunho',()=>{
 const stock=readFileSync('app/marketplaces/ProductsStock.tsx','utf8'),button=readFileSync('app/components/BotaoExpandirCard.tsx','utf8');
 assert.match(stock,/<BotaoExpandirCard variante="painel" destaque modo="lista"/);
 assert.match(stock,/if \(!detailId\) return;[\s\S]*?const restore=ativarFocoProduto\(ficha,/);
 assert.match(stock,/const stopAlignment=keepExpandedProductHeaderVisible\(ficha\)/);
 assert.match(stock,/return\(\)=>\{stopAlignment\(\);restore\(\);\}/);
 assert.match(stock,/detailId === product.id && <DetalhesRolaveis[\s\S]*?<ProductDetail/);
 assert.match(stock,/setDetailId\(value => value === product.id \? '' : product.id\)/);
 assert.match(stock,/<ReferencePriceEditor key=\{`\$\{product.revision\}:\$\{expanded\}`\}/,'rascunho da referência no cabeçalho também é descartado ao recolher');
 assert.match(button,/const painelDestaque = variante === 'painel' && !somenteIcone && destaque/);
 assert.match(button,/destaque = false/);
 assert.doesNotMatch(stock,/Produto em foco|Descarta alterações não salvas/);
});
