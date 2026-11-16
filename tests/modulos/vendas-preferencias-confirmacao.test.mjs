import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createFiscalProfileSaveRequest} from '../../app/vendas/lib/fiscal-profile-bridge.mjs';
const source=readFileSync(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx',import.meta.url),'utf8');
const start=source.indexOf('  const saveModuleSettings =');
const end=source.indexOf('  const saveFiscalMatrix =',start);
test('salvar desativação aguarda confirmação, envia somente NF-e e mantém rascunho em recusa',async()=>{
 for(const ok of [true,false]){
  const sent=[],written=[],states=[];let timer;
  const pending={current:new Map()};
  const next={company:{document:'123'},commercial:{defaultFiscalDocument:'nenhum'},fiscal:{documentScope:['nfe'],environment:'homologacao'}};
  const scope={exports:{},authorize:()=>true,normalizeModuleSettings:x=>structuredClone(x),defaultModuleSettings:{},moduleSettings:next,managementBridgeOrigin:'https://example.test',window:{parent:{postMessage:r=>sent.push(r)},setTimeout:fn=>{timer=fn;return 1;}},crypto:{randomUUID:()=> 'synthetic-request-123'},fiscalProfileBridgeState:{available:true,writable:true,profile:{version:7}},createFiscalProfileSaveRequest,pendingFiscalProfileSaveRef:pending,setToast:()=>{},setFiscalProfileBridgeState:()=>{},setModuleSettings:x=>states.push(x),writeCompanyStorage:(...x)=>written.push(x),SETTINGS_STORAGE_KEY:'test'};
  vm.runInNewContext(ts.transpileModule(source.slice(start,end)+'\nexports.save=saveModuleSettings;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);
  const result=scope.exports.save(next);
  assert.equal(sent.length,1);assert.deepEqual([...sent[0].documentScope],['nfe']);assert.equal(sent[0].defaultDocument,'nfe');assert.equal(sent[0].expectedVersion,7);
  assert.equal(states.length,0);assert.equal(written.length,0);
  const wait=pending.current.get(sent[0].requestId);
  if(ok){wait.resolve(true);assert.equal(await result,true);assert.equal(states.length,1);assert.equal(written.length,1);assert.deepEqual([...states[0].fiscal.documentScope],['nfe']);}
  else{wait.reject(new Error('Conflito de versão'));await assert.rejects(result,/Conflito/);assert.equal(states.length,0);assert.equal(written.length,0);}
  assert.deepEqual(next.fiscal.documentScope,['nfe']);assert.equal(typeof timer,'function');
 }
});
test('o formulário permanece aberto durante envio e na falha, fechando só após sucesso',async()=>{
 const start=source.indexOf('  const save = async () => {',source.indexOf('function SettingsDialog('));const end=source.indexOf('  return <>',start);
 const code=source.slice(start,end).replace(' as ModuleSettings','');
 for(const ok of [true,false]){let closed=0,error='',busy=false,complete;
 const run=new Function('saving','draft','defaultModuleSettings','normalizeModuleSettings','section','validateCompanyProfile','validateFiscalSettingsForm','validateModuleSettings','setError','onSaveCompany','onSave','setSaving','onClose',code+';return save();');
 const promise=run(false,{},{},x=>x,'fiscal',()=>{},()=>({ready:true}),()=>{},x=>error=x,undefined,()=>new Promise(resolve=>complete=resolve),x=>busy=x,()=>closed++);
 assert.equal(busy,true);assert.equal(closed,0);complete(ok);await promise;assert.equal(busy,false);assert.equal(closed,ok?1:0);if(!ok)assert.match(error,/confirmar/);
 }
});

test('popup oficial de progresso mantém o card montado e inativo durante a gravação',()=>{
 const ast=ts.createSourceFile('view.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const component=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='SettingsDialog').getText(ast);
 let index=0;
 const element=(type,props)=>({type,props});
 const scope={exports:{},require:()=>({jsx:element,jsxs:element,Fragment:'fragment'}),useState:initial=>[++index===3?true:initial,()=>{}],useRef:x=>({current:x}),useEffect:()=>{},Dialog:'SettingsDialogCard',ModalConfirmacao:'OfficialProgressPopup',Icon:'Icon',BotaoAcaoCompacto:'Button',CampoMoeda:'CampoMoeda'};
 vm.runInNewContext(ts.transpileModule(component+'\nexports.render=SettingsDialog;',{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
 const settings={company:{},commercial:{},fiscal:{documentScope:['nfe'],fiscalResponsible:'',taxReviewConfirmed:false,taxReformReviewConfirmed:false}};
 const tree=scope.exports.render({section:'fiscal',settings,onClose:()=>{},onSave:async()=>true});
 const [background,popup]=tree.props.children;
 assert.equal(background.props.inert,true);assert.equal(background.props.children.type,'SettingsDialogCard');assert.equal(background.props.children.props.open,true);
 assert.equal(popup.type,'OfficialProgressPopup');assert.equal(popup.props.aberto,true);assert.equal(popup.props.titulo,'Salvando configurações');assert.equal(popup.props.carregando,true);assert.equal(popup.props.mostrarProgresso,true);assert.equal(popup.props.ocultarCancelar,true);
});
