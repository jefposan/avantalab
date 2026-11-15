import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

const transpilar=(arquivo)=>ts.transpileModule(readFileSync(arquivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
function carregarBiblioteca(arquivo){const m={exports:{}};vm.runInNewContext(transpilar(arquivo),{exports:m.exports,module:m,require:()=>carregarBiblioteca('app/lib/nome-pessoa.ts')});return m.exports;}
const cadastro=carregarBiblioteca('app/lib/cadastro-perfil.ts');
function montar(){
 let cursor=0;const estado=[];const react={useId:()=> 'documento-teste',useEffect(){},useRef:v=>({current:v}),useState(v){const i=cursor++;if(!(i in estado))estado[i]=v;return[estado[i],valor=>{estado[i]=typeof valor==='function'?valor(estado[i]):valor;}];}};
 const m={exports:{}};vm.runInNewContext(transpilar('app/components/CadastroPerfilModal.tsx'),{exports:m.exports,module:m,require:n=>n==='react'?{...react,default:react}:n==='react/jsx-runtime'?jsx:n.endsWith('/cadastro-perfil')&&!n.includes('mappers')?cadastro:{},console});
 const render=()=>{cursor=0;return m.exports.default({aberto:true,empresaId:'empresa',contexto:'edicao',statusInicial:{tipoPerfil:'pessoal',podeEditar:true,cadastro:{nome_fantasia:'Perfil',nome_responsavel:'Nome Completo',documento:'',tipo_empresa:'',regime_tributario:''}},onCancelar(){},onConcluido(){}});};
 const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
 const cpf=()=>nodes(render()).find(n=>n.type==='input'&&n.props.placeholder==='000.000.000-00');
 return{cpf,render,nodes};
}
test('perfil pessoal exibe CPF após os dois nomes, mascara onze dígitos e sinaliza inválido',()=>{
 const c=montar();const inputs=c.nodes(c.render()).filter(n=>n.type==='input');assert.equal(inputs[0].props.value,'Perfil');assert.equal(inputs[1].props.value,'Nome Completo');assert.equal(inputs[2],inputs.find(n=>n.props.placeholder==='000.000.000-00'));
 c.cpf().props.onChange({target:{value:'529.982.247-25999'}});assert.equal(c.cpf().props.value,'529.982.247-25');c.cpf().props.onBlur();assert.equal(c.cpf().props['aria-invalid'],false);
 c.cpf().props.onChange({target:{value:'11111111111'}});assert.equal(c.cpf().props['aria-invalid'],true);assert.equal(c.cpf().props['aria-describedby'],'cadastro-perfil-documento-erro');
 c.cpf().props.onChange({target:{value:'52998224725'}});assert.equal(c.cpf().props['aria-invalid'],false);
});
