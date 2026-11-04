import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {normalizeEan} from '../../app/modules/marketplaces/services/ean.ts';
const require=createRequire(import.meta.url),exports={};
vm.runInNewContext(ts.transpileModule(readFileSync('app/components/CampoBusca.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require});
const client=readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx','utf8');
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n&&typeof n==='object'?[n,...nodes(n.props?.children)]:[];
for(const [id,clearLabel,numeric]of [['manual-ean','Limpar EAN',true],['scanner-ean','Limpar EAN lido',true],['product-query','Limpar pesquisa por descrição',false]])test(`limpar ${id}: somente com texto, sem submit e sem alterar o outro campo`,()=>{
 const tag=client.match(new RegExp(`<CampoBusca id="${id}"[^\\n]+?/>`))?.[0];assert.ok(tag);assert.ok(tag.includes(`rotuloLimpar="${clearLabel}"`));
 if(numeric){assert.match(tag,/inputMode="numeric"/);assert.match(tag,/setEan\(normalizeEan\(value\)\)/);}
 let value=numeric?'7898649372113':'Air fryer',other='preservado',changes=0;
 const onChange=v=>{value=numeric?normalizeEan(v):v;changes++;};
 const render=()=>nodes(exports.default({id,value,onChange,rotuloLimpar:clearLabel,...(numeric?{inputMode:'numeric'}:{})}));
 const clear=render().find(n=>n.type==='button');assert.equal(clear.props.type,'button');assert.equal(clear.props['aria-label'],clearLabel);
 clear.props.onClick();assert.equal(value,'');assert.equal(other,'preservado');assert.equal(changes,1);assert.equal(render().some(n=>n.type==='button'),false);
});
test('alvo de limpar do AvantaPreços mantém 44px, separado do submit de consulta',()=>{
 const css=readFileSync('app/marketplaces/consulta/marketplaces-mobile.module.css','utf8');assert.match(css,/avanta-campo-busca-limpar[^}]+width:44px;height:44px/);
 assert.match(client,/<button type="submit" aria-label="Consultar EAN"/);
});
