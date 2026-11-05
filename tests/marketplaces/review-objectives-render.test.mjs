import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {reviewGoalCards,reviewPhotoAccess} from '../../app/marketplaces/review-quality-goals.ts';
import {marketplaceDateTimeLabel} from '../../app/modules/marketplaces/date-format.ts';

test('revisão separa ações de catálogo, identifica anúncio e não repete motivos extensos nem inclui conta alheia à meta',()=>{
 const target=(id,reason,count)=>({connectionId:'a',id,affectedIds:[id],content:{reason,maxPictures:12,pictures:Array.from({length:count},(_,i)=>({id:`photo-${id}-${i}`}))}});
 const editors={pictures:{reason:'',maxPictures:12,reviewTargets:[target('MLB-OWN','',1),target('MLB-CATALOG','Anúncio de catálogo confirmado pelo ML (MLB-CATALOG). Fotos e ficha pertencem ao catálogo; a correção exige análise do Mercado Livre.',5),target('MLB-OTHER','',6)]},details:{attributes:[]},attributes:{attributes:[]}};
 const records=[{connectionId:'a',id:'MLB-OWN',quality:[{entityType:'USER_PRODUCT',score:75,level:'Profissional',calculatedAt:'2026-10-27T20:51:37Z',goals:[{id:'PICTURES',title:'Adicione pelo menos 3 fotos.',completed:false}]}]},{connectionId:'a',id:'MLB-CATALOG',quality:[{entityType:'USER_PRODUCT',score:57,level:'Satisfatória',calculatedAt:'2026-10-27T20:41:12Z',goals:[{id:'PICTURES',title:'Adicione pelo menos 4 fotos.',completed:false}]}]}];
 const file=readFileSync('app/marketplaces/ReviewQualityObjectives.tsx','utf8'),ast=ts.createSourceFile('Review.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='ReviewQualityObjectives');
 const exports={},queue=[records,false,''];let index=0;
 vm.runInNewContext(ts.transpileModule(fn.getText(ast).replace('export default','export'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:createRequire(import.meta.url),useState:()=>[queue[index++],()=>{}],useEffect:()=>{},reviewGoalCards,reviewPhotoAccess,marketplaceDateTimeLabel,styles:new Proxy({},{get:(_,key)=>String(key)}),BotaoAcaoCompacto:({children,...props})=>React.createElement('button',{disabled:props.disabled},children),CarregamentoDadosModulo:()=>null});
 const html=renderToStaticMarkup(React.createElement(exports.ReviewQualityObjectives,{companyId:'company',editors,refreshKey:0,request(){throw Error('Não deve consultar durante render');},dark:false,brand:'#003e73',disabled:false,onLoading(){},onEdit(){},accountName:()=> 'ADRIANO'}));
 assert.match(html,/Pode ajustar no AvantaLab/);assert.match(html,/Restrições e ajustes externos/);assert.match(html,/Controlado pelo catálogo ML/);assert.match(html,/1 foto no anúncio/);assert.match(html,/5 fotos no anúncio/);
 assert.equal((html.match(/Adicionar fotos<\/button>/g)||[]).length,1);assert.match(html,/MLB-OWN/);assert.match(html,/MLB-CATALOG/);assert.doesNotMatch(html,/MLB-OTHER|Fotos e ficha pertencem|Nenhuma conta vinculada/);
 assert.match(html,/esta revisão não envia sugestões ao catálogo/);
 assert.match(html,/Qualidade por conta/);assert.match(html,/75\/100 · Profissional/);assert.match(html,/57\/100 · Satisfatória/);assert.match(html,/27\/10\/26, 17:51/);assert.match(html,/resumo do produto usa a menor nota/);
});
