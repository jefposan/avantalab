import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {corTextoSobreFundo} from '../../app/lib/cores-avanta.ts';

const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){
  const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
  if(f)for(const ext of ['.tsx','.ts'])if(existsSync(f+ext))return next(pathToFileURL(f+ext).href,c);
  return next(s,c);
},load(url,c,next){if(url.startsWith('file:')&&url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c);}});
const {default:Modal}=await import('../../app/components/ModalConfirmacao.tsx');
hook.deregister();
const props={aberto:true,titulo:'Confirmar estoque físico?',mensagem:'Confirmar 30 unidades de teste.',textoConfirmar:'Confirmar',variante:'primaria',aoCancelar(){},aoConfirmar(){}};
const render=extra=>renderToStaticMarkup(React.createElement(Modal,{...props,...extra}));
const confirmButton=html=>[...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/g)].at(-1);

test('texto do Confirmar tem cor explícita contrastante em perfis claros e escuros, nos dois temas',()=>{
  for(const darkMode of [false,true])for(const corPrimaria of ['#d00000','#003E73','#ffe600','#ffffff','#000000']){
    const html=render({corPrimaria,darkMode});const button=confirmButton(html);
    assert.equal(button[2],'Confirmar');
    assert.ok(button[1].includes(`style="background-color:${corPrimaria};color:${corTextoSobreFundo(corPrimaria)}"`));
    assert.doesNotMatch(button[1],/disabled=""/);
    assert.match(html,/role="alertdialog"/);
  }
});
test('espera mantém o rótulo e bloqueio; variantes e cor explícita do consumidor permanecem',()=>{
  const busy=confirmButton(render({carregando:true,corPrimaria:'#d00000'}));
  assert.equal(busy[2],'Aguarde...');assert.match(busy[1],/disabled=""/);assert.match(busy[1],/color:#ffffff/);
  const danger=confirmButton(render({variante:'destrutiva',corPrimaria:'#ffe600',textoSobreCorPrimaria:'#000000'}));
  assert.match(danger[1],/background-color:#dc2626;color:#ffffff/);
  assert.match(confirmButton(render({corPrimaria:'#000000',textoSobreCorPrimaria:'#eeeeee'}))[1],/color:#eeeeee/);
  assert.equal(render({aberto:false}),'');
});

test('acompanhamento optativo mantém progresso central e resultado com somente Fechar',()=>{
 const pending=render({mostrarProgresso:true,carregando:true,titulo:'Enviando alterações…'});assert.match(pending,/role="status"/);assert.match(pending,/avanta-loading-pontos/);assert.equal([...pending.matchAll(/<button[^>]*disabled=""/g)].length,2);
 const done=render({ocultarCancelar:true,textoConfirmar:'Fechar'});assert.equal([...done.matchAll(/<button\b/g)].length,1);assert.equal(confirmButton(done)[2],'Fechar');assert.doesNotMatch(done,/avanta-loading-pontos/);
});

test('ação adicional é optativa, acessível e bloqueada junto das demais durante gravação',()=>{
 const extra={acaoAdicional:{texto:'Fechar todos',aoClicar(){}}};
 assert.equal([...render({}).matchAll(/<button\b/g)].length,2);
 for(const darkMode of [false,true]){
  const html=render({...extra,darkMode});assert.equal([...html.matchAll(/<button\b/g)].length,3);assert.match(html,/>Fechar todos<\/button>/);
  assert.equal([...render({...extra,darkMode,carregando:true}).matchAll(/<button[^>]*disabled=""/g)].length,3);
 }
});
