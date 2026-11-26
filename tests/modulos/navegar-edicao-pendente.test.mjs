import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const source=readFileSync('app/components/SeletorModulos.tsx','utf8');
function fixture(save=async()=>true,{allowed=true,busy=false}={}) {
 const states=[],refs=[],calls=[],locations=[];let stateIndex=0,refIndex=0;
 const hooks={useState(initial){const i=stateIndex++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useRef(initial){const i=refIndex++;return refs[i]||= {current:initial};},useEffect(){},useId:()=> 'nav-test'};
 const win={location:{assign:href=>locations.push(href)}};win.top=win;
 const imports={react:hooks,'react/jsx-runtime':require('react/jsx-runtime'),'react-dom':{createPortal:node=>node},'@/app/hooks/useAcessosNavegacao':{useAcessosNavegacao:()=>({perfil:{},usuarioId:'user',atualizar(){}})},'@/app/lib/navegacao-acessos-cliente':{atualizarAcessosNavegacao:async()=>{calls.push('access');return allowed?[{}]:[];}},'@/app/lib/sessao-acesso-cliente':{validarSessaoDoDispositivo:async()=>{calls.push('session');return {ok:true,ativa:true};}},'@/app/lib/seletor-modulos':{opcoesNavegacao:perfis=>perfis.length?[{id:'custos',href:'/custos?empresaId=empresa',nome:'Custos'}]:[]},'@/app/projetos/components/Icon':{Icon:()=>null},'./ModalConfirmacao':{default:()=>null},'./SeletorModulos.module.css':{default:{}}};
 const module={exports:{}};
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports','document','window',code)(id=>imports[id],module,module.exports,{body:{}},win);
 const props={empresaId:'empresa',moduloAtual:'vendas',alteracoesPendentes:true,ocupado:busy,salvarAntesDeSair:async()=>{calls.push('save');return save();}};
 function render(){stateIndex=0;refIndex=0;return module.exports.default(props).props.children;}
 function open(){render()[0].props.onClick();const tree=render();const list=tree[1].props.children.at(-1);list.props.onSelecionar('custos');return render().at(-1).props;}
 return {render,open,calls,locations};
}
test('Navegar permanece ativo com edição e oferece três ações explícitas',()=>{
 const f=fixture();assert.equal(f.render()[0].props.disabled,false);
 const modal=f.open();assert.equal(modal.aberto,true);assert.equal(modal.textoCancelar,'Cancelar');assert.equal(modal.textoConfirmar,'Salvar e sair');assert.equal(modal.acaoAdicional.texto,'Sair sem salvar');assert.deepEqual(f.calls,[]);
 modal.aoCancelar();assert.equal(f.render().at(-1),'');assert.deepEqual(f.locations,[]);
});
test('sair sem salvar não grava e revalida destino/sessão',async()=>{
 const f=fixture();f.open().acaoAdicional.aoClicar();await new Promise(setImmediate);
 assert.deepEqual(f.calls,['access','session']);assert.deepEqual(f.locations,['/custos?empresaId=empresa']);
});
test('salvar e sair aguarda gravação e bloqueia clique repetido e descarte concorrente',async()=>{
 let reply;const f=fixture(()=>new Promise(resolve=>{reply=resolve;}));const modal=f.open();
 const pending=modal.aoConfirmar();void modal.aoConfirmar();modal.acaoAdicional.aoClicar();modal.aoCancelar();
 assert.deepEqual(f.calls,['save']);assert.equal(f.render().at(-1).props.carregando,true);assert.deepEqual(f.locations,[]);
 reply(true);await pending;assert.deepEqual(f.calls,['save','access','session']);assert.equal(f.locations.length,1);
});
test('falha/validação mantém formulário e não tenta navegar',async()=>{
 const f=fixture(async()=>false);await f.open().aoConfirmar();assert.deepEqual(f.calls,['save']);assert.deepEqual(f.locations,[]);assert.equal(f.render().at(-1),'');
 const broken=fixture(async()=>{throw Error('rede');});await broken.open().aoConfirmar();assert.deepEqual(broken.locations,[]);assert.deepEqual(broken.calls,['save']);
});
test('perda de acesso após salvar nunca autoriza troca e ocupado real continua protegido',async()=>{
 const f=fixture(async()=>true,{allowed:false});await f.open().aoConfirmar();assert.deepEqual(f.calls,['save','access']);assert.deepEqual(f.locations,[]);
 const busy=fixture(async()=>true,{busy:true});assert.equal(busy.render()[0].props.disabled,true);
});
test('consumidor conecta gravação real de rascunho, não confirmação nem emissão',()=>{
 const file=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
 assert.match(file,/ocupado=\{editorSaving\} alteracoesPendentes=\{view === 'novo_pedido'\}/);
 assert.match(file,/finish\(fiscalOnly \? 'Confirmado' : 'Rascunho', false, true\)/);
 assert.match(file,/onFiscalCreated\?\.\(record, issue, keepOpen\)/);
 assert.match(file,/saveOnly:!issue/);
 assert.match(file,/if \(result.ok && !keepOpen\)/);
 assert.match(file,/syncSavedOperation\(record,previous,resolve\)/);
 assert.match(file,/pending.resolve\?\.\(persisted\?\.id/);
 assert.match(file,/if\(options\?\.keepOpen\)return savedResult/);
});
