import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as formatters from '../../app/lib/formatters.ts';
import {opcoesClientePedido,clienteDoRegistro} from '../../app/vendas/lib/customer-selection.ts';

function load(file,deps){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,document:{body:{}},require:id=>{if(!(id in deps))throw Error('Dependência ausente: '+id);return deps[id];}});return exports;}
const search=load('app/lib/selecao-pesquisavel.ts',{'./formatters':formatters});
const clientes=[
 {id:'cliente-1',name:'Fantasia oculta',legalName:'Sérgio Exemplo Comércio LTDA',document:'11222333000181',status:'Ativo'},
 {id:'cliente-2',name:'Fantasia oculta',legalName:'Outro Exemplo LTDA',document:'12345678901',status:'Revisar cadastro'},
 {id:'cliente-3',name:'Fantasia inativa',legalName:'Cadastro Inativo LTDA',document:'AB123C45000199',status:'Inativo'},
];
test('pedido apresenta razão social e identifica por ID, sem nome fantasia no campo',()=>{
 const options=opcoesClientePedido(clientes);
 assert.equal(options.find(o=>o.value==='cliente-1').selectedLabel,clientes[0].legalName);
 for(const option of options)assert.doesNotMatch(option.label,/Fantasia/);
 assert.equal(options.find(o=>o.value==='cliente-3').disabled,true);
 assert.equal(options.find(o=>o.value==='cliente-2').disabled,false);
 assert.equal(clienteDoRegistro(clientes,{customerId:'cliente-2',client:'Fantasia oculta'}).document,'12345678901');
 assert.equal(clienteDoRegistro(clientes,{customerId:'ausente',client:'Fantasia oculta'}),undefined);
 assert.equal(clienteDoRegistro(clientes,{client:'Fantasia oculta'}),undefined);
});
test('busca aceita razão social sem acentos e CPF/CNPJ com ou sem pontuação',()=>{
 const options=opcoesClientePedido(clientes);
 for(const term of ['sergio','SÉRGIO EXEMPLO','11222333000181','11.222.333/0001-81'])assert.equal(search.filtrarOpcoesPesquisaveis(options,term,true)[0]?.value,'cliente-1',term);
 for(const term of ['12345678901','123.456.789-01'])assert.equal(search.filtrarOpcoesPesquisaveis(options,term,true)[0]?.value,'cliente-2',term);
 assert.equal(search.filtrarOpcoesPesquisaveis(options,'AB.123.C45/0001-99',true)[0]?.value,'cliente-3');
 assert.equal(search.filtrarOpcoesPesquisaveis(options,'',true).length,0);
 assert.equal(search.filtrarOpcoesPesquisaveis(options,'',false).length,3);
});

function component(options=opcoesClientePedido(clientes),extra={}){
 let cursor=0,input;
 const states=[{left:0,top:0,width:300},false,'',-1],chosen=[];
 const props={value:'',onChange:id=>{props.value=id;chosen.push(id);},options,label:'Cliente',searchOnTypeOnly:true,maxResults:20,...extra};
 const hooks={useId:()=>':cliente:',useRef:()=>({current:null}),useEffect(){},useLayoutEffect(){},useState:init=>{const index=cursor++;if(!(index in states))states[index]=typeof init==='function'?init():init;return[states[index],next=>{states[index]=typeof next==='function'?next(states[index]):next;}];}};
 const CampoBusca=p=>{input=p;const{inputRef,...rest}=p;return createElement('input',rest);};
 const C=load('app/components/CampoSelecaoPesquisavel.tsx',{'react':hooks,'react/jsx-runtime':jsx,'react-dom':{createPortal:node=>node},'./CampoBusca':{default:CampoBusca},'../lib/selecao-pesquisavel':search,'./CampoSelecaoPesquisavel.module.css':{default:{root:'root',list:'list'}}}).default;
 const render=()=>{cursor=0;return renderToStaticMarkup(C(props));};
 return{render,chosen,update:next=>Object.assign(props,next),get input(){return input;}};
}
test('componente real não abre lista ao focar; digitar encontra e selecionar exibe apenas razão social',()=>{
 const c=component();c.render();c.input.onFocus();assert.doesNotMatch(c.render(),/role="listbox"/);
 c.input.onChange('11.222.333/0001-81');const html=c.render();assert.match(html,/role="listbox"/);assert.match(html,/Sérgio Exemplo/);assert.doesNotMatch(html,/Fantasia/);
 c.input.onKeyDown({key:'Enter',preventDefault(){}});const selected=c.render();
 assert.deepEqual(c.chosen,['cliente-1']);assert.equal(c.input.value,clientes[0].legalName);assert.doesNotMatch(selected,/role="listbox"/);
});
test('resultado é limitado a 20 e consumidores anteriores continuam abrindo ao focar',()=>{
 const options=Array.from({length:1000},(_,i)=>({value:String(i),label:`Cliente ${i}`}));
 const c=component(options);c.render();c.input.onChange('Cliente');const html=c.render();assert.equal((html.match(/role="option"/g)||[]).length,20);assert.match(html,/refinar a busca/);
 const old=component(options.slice(0,2),{searchOnTypeOnly:false});old.render();old.input.onFocus();assert.match(old.render(),/role="listbox"/);
});

test('busca iniciada antes da carga mantém o termo e exibe os clientes quando chegam', () => {
 const c=component([],{estadoOpcoes:{tipo:'carregando',mensagem:'Carregando clientes…'}});
 c.render();
 c.input.onFocus();
 assert.doesNotMatch(c.render(),/Carregando clientes/);
 c.input.onChange('ser');
 const loading=c.render();
 assert.match(loading,/aria-busy="true"/);
 assert.match(loading,/Carregando clientes/);
 assert.doesNotMatch(loading,/Nenhuma opção encontrada/);

 c.update({options:opcoesClientePedido(clientes),estadoOpcoes:undefined});
 const ready=c.render();
 assert.equal(c.input.value,'ser');
 assert.match(ready,/Sérgio Exemplo/);
 assert.doesNotMatch(ready,/Carregando clientes/);
 c.input.onChange('sem resultado');
 assert.match(c.render(),/Nenhuma opção encontrada/);
});

test('falha da lista permite tentar novamente sem apagar o início do nome', () => {
 let tentativas=0;
 const c=component([],{estadoOpcoes:{tipo:'erro',mensagem:'Não foi possível carregar os clientes.',aoTentarNovamente:()=>{tentativas++;}}});
 c.render();
 c.input.onChange('ser');
 const erro=c.render();
 assert.match(erro,/Não foi possível carregar os clientes/);
 assert.match(erro,/Tentar novamente/);
 c.input.onKeyDown({key:'Enter',preventDefault(){}});
 assert.equal(tentativas,1);
 assert.equal(c.input.value,'ser');
});
