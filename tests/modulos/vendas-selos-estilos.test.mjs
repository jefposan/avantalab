import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import postcss from 'postcss';
const css=await readFile(new URL('../../app/vendas/sistema/vendas.css',import.meta.url),'utf8');
const root=postcss.parse(css);
test('seletores genéricos de span não atingem selos em nenhuma regra ou breakpoint',()=>{
 let total=0;
 root.walkRules(rule=>{
  for(const match of rule.selector.matchAll(/\bspan\b(?=[\s.#:[>,+~]|$)/g)){
   const compound=rule.selector.slice(match.index+4).split(/[\s>,+~]/)[0];
   assert.ok(compound.includes(':not(.badge)'),rule.selector);total++;
  }
 });
 assert.ok(total>100,'A auditoria deve incluir as regras e os breakpoints do módulo inteiro');
});
test('selo cresce com o conteúdo e pode quebrar rótulos longos sem altura fixa',()=>{
 const rule=root.nodes.find(n=>n.type==='rule'&&n.selector==='.badge');
 const d=Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));
 assert.equal(d.display,'inline-flex');assert.equal(d.width,'fit-content');assert.equal(d.height,'auto');assert.equal(d['max-width'],'100%');
 assert.equal(d['white-space'],'normal');assert.equal(d['overflow-wrap'],'anywhere');assert.equal(d['text-align'],'center');
});
test('ícones do certificado mantêm tamanho próprio sem forçar o selo a 42px',()=>{
 let icon;root.walkRules(r=>{if(r.selector==='.certificate-type-summary > span:not(.badge)')icon=r});
 assert.ok(icon);assert.equal(icon.nodes.find(n=>n.prop==='width')?.value,'42px');
 for(const variant of ['success','warning','danger','info','neutral'])assert.ok(css.includes(`.badge-${variant}`));
});
