import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url);

test('salvar mostra apenas espera, mantém editor e libera troca de usuário sem mensagem ou recarga',async()=>{
  const users=[{id:'a',nome:'Ana',login:'ana',can_edit_stock:false},{id:'b',nome:'Bia',login:'bia',can_edit_stock:false}];
  const writes=[];const states=[];let cursor=0,first=true,reads=0,release,fail=false;const effects=[];
  const hooks={useState(initial){const index=cursor++;if(!(index in states))states[index]=typeof initial==='function'?initial():initial;return[states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];},useCallback(fn){return fn;},useEffect(fn){if(first)effects.push(fn);}};
  const exports={};
  const source=ts.transpileModule(readFileSync('app/marketplaces/PriceUsersPanel.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(source,{exports,Error,window:{requestAnimationFrame(fn){fn();return 1;},cancelAnimationFrame(){}},require(name){
    if(name==='react')return hooks;
    if(name.endsWith('.module.css'))return{default:new Proxy({},{get:(_,key)=>key})};
    if(name.includes('supabase'))return{supabase:{}};
    if(name.includes('cores-avanta'))return{corTextoSobreFundo:()=> '#fff'};
    if(name.includes('BotaoAcaoCompacto'))return{default:'button'};
    if(name.includes('CardExpandidoModal'))return{default:'modal'};
    if(name.includes('PriceCalculationSettings'))return{default:'settings'};
    return require(name);
  }});
  const request=async(path,options)=>{
    if(!options?.method){reads++;return{users:structuredClone(users)};}
    const body=JSON.parse(options.body);writes.push(body);
    assert.equal(options.method,'PATCH');const user=users.find(u=>u.id===body.id);assert.ok(user);
    await new Promise(done=>{release=done;});if(fail)throw Error('Falha simulada ao salvar.');
    Object.assign(user,{nome:body.nome,login:body.login,can_edit_stock:body.can_edit_stock});return{user:structuredClone(user)};
  };
  let tree;
  function render(){cursor=0;tree=exports.default({companyId:'company',request,onClose(){},settings:null,settingsError:'',onSettingsSaved(){},onReloadSettings(){}});first=false;return tree;}
  function all(node){if(Array.isArray(node))return node.flatMap(n=>all(n));if(!node||typeof node!=='object')return[];return[node,...all(node.props?.children)];}
  const find=predicate=>{const result=all(tree).find(predicate);assert.ok(result);return result;};
  const button=label=>find(n=>n.type==='button'&&n.props.children===label);
  const form=()=>find(n=>n.type==='form');
  const checkbox=()=>find(n=>n.type==='input'&&n.props.type==='checkbox');
  render();for(const effect of effects)effect();await new Promise(resolve=>setImmediate(resolve));render();
  button('Editar').props.onClick();render();
  assert.equal(find(n=>n.type==='input'&&n.props.type==='password').props.placeholder,'****');
  assert.match(find(n=>n.props?.id==='price-user-edit-scope').props.children,/Ana/);
  checkbox().props.onChange({target:{checked:true}});render();
  assert.equal(find(n=>n.props?.['aria-label']==='Próximo usuário').props.disabled,true,'rascunho pendente continua protegido');
  const pending=form().props.onSubmit({preventDefault(){}});render();
  assert.equal(button('Salvando…').props.disabled,true);assert.equal(find(n=>n.props?.['aria-label']==='Próximo usuário').props.disabled,true);
  release();await pending;render();
  assert.equal(checkbox().props.checked,true);assert.deepEqual(users.map(u=>u.can_edit_stock),[true,false]);
  assert.equal(reads,1,'não recarrega nem remove a lista após editar');
  assert.equal(all(tree).some(n=>n.props?.className==='userMessage'),false,'não emite mensagem de sucesso');
  assert.match(find(n=>n.props?.id==='price-user-edit-scope').props.children,/Ana/);
  assert.equal(find(n=>n.props?.['aria-label']==='Próximo usuário').props.disabled,false,'troca liberada sem precisar cancelar');
  find(n=>n.props?.['aria-label']==='Próximo usuário').props.onClick();render();button('Editar').props.onClick();render();
  assert.equal(checkbox().props.checked,false);assert.match(find(n=>n.props?.id==='price-user-edit-scope').props.children,/Bia/);
  const saveB=form().props.onSubmit({preventDefault(){}});release();await saveB;render();assert.deepEqual(users.map(u=>u.can_edit_stock),[true,false]);
  assert.deepEqual(writes.map(w=>[w.id,w.can_edit_stock]),[['a',true],['b',false]]);
  assert.equal(find(n=>n.props?.['aria-label']==='Usuário anterior').props.disabled,false);
  checkbox().props.onChange({target:{checked:true}});render();fail=true;
  const failed=form().props.onSubmit({preventDefault(){}});release();await failed;render();
  assert.equal(checkbox().props.checked,true,'falha preserva rascunho');
  assert.equal(find(n=>n.props?.['aria-label']==='Usuário anterior').props.disabled,true);
  assert.equal(find(n=>n.props?.className==='userMessage').props.children,'Falha simulada ao salvar.');
  button('Cancelar').props.onClick();render();assert.equal(find(n=>n.props?.['aria-label']==='Usuário anterior').props.disabled,false);
});
