import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {droppedProductPhoto} from '../../app/modules/marketplaces/product-photo-transfer.ts';
const drop=(texts={},files=[])=>({files,getData:type=>texts[type]||''});
test('arraste de arquivo tem prioridade; URL da imagem é extraída sem executar HTML',()=>{
 const file={type:'image/png',size:120};assert.equal(droppedProductPhoto(drop({'text/plain':'https://site.example/page'},[file])).file,file);
 assert.equal(droppedProductPhoto(drop({'text/uri-list':'# imagem\r\nhttps://cdn.example/photo.png'})).url,'https://cdn.example/photo.png');
 assert.equal(droppedProductPhoto(drop({'text/uri-list':'https://site.example/page','text/html':'<a href="https://site.example/page"><img src="https://cdn.example/photo.png?a=1&amp;b=2"></a><script>throw Error()</script>'})).url,'https://cdn.example/photo.png?a=1&b=2');
 for(const value of ['http://site.example/a.jpg','https://user:secret@site.example/a','javascript:alert(1)','file:///etc/passwd','data:image/png,AAAA','sem foto'])assert.throws(()=>droppedProductPhoto(drop({'text/plain':value})));
 assert.equal(droppedProductPhoto(drop({},[{type:'image/webp',size:100}])).file.type,'image/webp');
 assert.throws(()=>droppedProductPhoto(drop({},[{type:'image/svg+xml',size:20}])));assert.throws(()=>droppedProductPhoto(drop({},[file,file])));assert.throws(()=>droppedProductPhoto(drop({},[{type:'image/jpeg',size:3_000_000}])));
});
function component(disabled=false,{onFile,onUrl}={}){
 const exports={},states=[],refs=[],files=[],urls=[];let stateIndex=0,refIndex=0;
 const jsx=(type,props)=>({type,props});
 const require=id=>id==='react'?{useEffect:()=>{},useId:()=>':help:',useRef:initial=>{const i=refIndex++;return refs[i]??=( {current:initial});},useState:initial=>{const i=stateIndex++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];}}:id==='react/jsx-runtime'?{jsx,jsxs:jsx}:id.endsWith('product-photo-transfer')?{droppedProductPhoto}:id.endsWith('.module.css')?{default:{dropArea:'drop',dragging:'drag',help:'help'}}:{default:id};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/ProductPhotoInput.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require,Error});
 return {render(){stateIndex=0;refIndex=0;return exports.default({disabled,onFile:onFile||((f)=>{files.push(f);}),onUrl:onUrl||((u)=>{urls.push(u);})});},files,urls};
}
const event=dataTransfer=>({preventDefault(){},dataTransfer});
const children=tree=>tree.props.children.filter(Boolean);
test('área compartilhada trata drop, bloqueio e erro sem navegar nem iniciar envio duplicado',async()=>{
 const c=component(),file={type:'image/jpeg',size:100};let prevented=0;
 await c.render().props.onDrop({preventDefault(){prevented++;},dataTransfer:drop({},[file])});assert.equal(c.files.length,1);assert.equal(prevented,1);
 await c.render().props.onDrop(event(drop({'text/plain':'https://cdn.example/a.jpg'})));assert.deepEqual(c.urls,['https://cdn.example/a.jpg']);
 await c.render().props.onDrop(event(drop({'text/plain':'javascript:bad'})));assert.match(children(c.render()).find(x=>x.props.role==='alert').props.children,/HTTPS/);assert.equal(c.urls.length,1);
 const blocked=component(true);await blocked.render().props.onDrop(event(drop({},[file])));assert.equal(blocked.files.length,0);
 const action=children(c.render()).find(child=>child?.props?.['aria-describedby']);assert.equal(action.props.disabled,false);assert.equal(action.props['aria-describedby'],':help:');
});
test('envio pendente mostra Carregando na área, bloqueia duplicidade e substitui por erro ou sucesso local',async()=>{
 let reject,resolve,calls=0;
 const c=component(false,{onUrl:()=>{calls++;return new Promise((yes,no)=>{resolve=yes;reject=no;});}}),transfer=drop({'text/plain':'https://cdn.example/foto.webp'});
 const first=c.render().props.onDrop(event(transfer));let view=c.render();assert.equal(view.props['aria-busy'],true);assert.equal(view.props['aria-disabled'],true);assert.equal(children(view).find(x=>x.props.role==='status').props.children[1].props.children,'Carregando…');
 await view.props.onDrop(event(transfer));assert.equal(calls,1);reject(Error('O site não liberou esta foto.'));await first;view=c.render();assert.equal(view.props['aria-busy'],false);assert.equal(children(view).find(x=>x.props.role==='alert').props.children,'O site não liberou esta foto.');assert.equal(children(view).some(x=>x.props.role==='status'),false);
 const second=view.props.onDrop(event(transfer));view=c.render();assert.equal(children(view).some(x=>x.props.role==='alert'),false);resolve('Foto adicionada ao rascunho.');await second;view=c.render();assert.equal(children(view).find(x=>x.props.role==='status').props.children,'Foto adicionada ao rascunho.');assert.equal(children(view).some(x=>x.props.role==='alert'),false);
});

test('preparação e revisão entregam erro de upload à área de fotos sem mensagem global',async()=>{
 for(const [file,name] of [['NewListing.tsx','uploadPreparationPhoto'],['ProductListingReview.tsx','upload']]){
  const ast=ts.createSourceFile(file,readFileSync('app/marketplaces/'+file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let fn;function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)fn=node;ts.forEachChild(node,visit);}visit(ast);assert.ok(fn);
  const globals=[],ref={current:false},preparing=[],context={exports:{},Error,AbortSignal,prepared:{product:{pictures:['cover']}},form:{additionalPictures:[]},accountId:'account',preparing:false,publishing:false,companyId:'company',activeRef:{current:true},setPhotoUploading:v=>{ref.current=v;},setPreparing:v=>preparing.push(v),setMessage:v=>globals.push(v),change(){},editors:{pictures:{maxPictures:12}},draft:{pictures:[{id:'cover'}]},reviewSectionBlock:()=>'',stale:false,lock:{current:false},alive:{current:true},begin:()=>true,finish(){},source:{companyId:'company'},request:async()=>{throw Error('Falha ao importar a foto.');}};
  vm.runInNewContext(ts.transpileModule(fn.getText(ast)+'\nexports.upload='+name,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  const c=component(false,{onUrl:context.exports.upload});await c.render().props.onDrop(event(drop({'text/plain':'https://cdn.example/foto.webp'})));assert.equal(children(c.render()).find(x=>x.props.role==='alert').props.children,'Falha ao importar a foto.');assert.ok(globals.every(v=>v===''));if(name==='uploadPreparationPhoto'){assert.deepEqual(preparing,[true,false]);assert.equal(ref.current,false);}
 }
});
