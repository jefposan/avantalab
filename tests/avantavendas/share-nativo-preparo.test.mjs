import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('../../app/avantavendas/NativeShareBridge.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function ambiente(){
 const escritos=[],apagados=[],envios=[],timers=[];let limpar;
 const fs={writeFile:async o=>{escritos.push(o);return {uri:'file:///'+o.path}},deleteFile:async o=>apagados.push(o.path)};
 const share={share:async o=>envios.push(o)};
 class Leitor{readAsDataURL(){this.result='data:image/jpeg;base64,YWJj';queueMicrotask(()=>this.onload())}}
 const c=vm.createContext({exports:{},DOMException,FileReader:Leitor,window:{setTimeout:fn=>timers.push(fn)},require:n=>n==='react'?{useEffect:f=>limpar=f()}:n==='@capacitor/core'?{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios',isPluginAvailable:()=>true}}:n==='@capacitor/filesystem'?{Directory:{Cache:'CACHE'},Filesystem:fs}:n==='@capacitor/share'?{Share:share}:{Browser:{}}});
 vm.runInContext(code,c);c.exports.default();return {c,fs,share,escritos,apagados,envios,timers,limpar:()=>limpar()};
}
test('ponte grava primeiro, compartilha URIs no novo toque e preserva arquivos até o destino ler',async()=>{
 const a=ambiente();const preparado=await a.c.window.__avantavendasPrepararCompartilhamentoArquivos({arquivos:[{name:'a.jpg'},{name:'b.jpg'}]});
 assert.equal(a.escritos.length,2);assert.equal(a.envios.length,0);
 const p=preparado.compartilhar();assert.equal(a.envios.length,1);await p;assert.equal(a.envios[0].files.length,2);assert.equal(a.escritos.length,2);
 preparado.descartar();assert.equal(a.apagados.length,0);assert.equal(a.timers.length,1);a.timers[0]();await new Promise(r=>setImmediate(r));assert.equal(a.apagados.length,2);
 await assert.rejects(preparado.compartilhar(),e=>e.name==='AbortError');a.limpar();assert.equal(a.c.window.__avantavendasPrepararCompartilhamentoArquivos,undefined);
});
test('cancelamento durante escrita e desmontagem limpam inclusive arquivo que terminou atrasado',async()=>{
 const a=ambiente(),controle=new AbortController();let liberar;
 a.fs.writeFile=()=>new Promise(r=>liberar=r);
 const p=a.c.window.__avantavendasPrepararCompartilhamentoArquivos({arquivos:[{name:'a.jpg'}],signal:controle.signal});await new Promise(r=>setImmediate(r));
 controle.abort();a.limpar();liberar({uri:'file:///a.jpg'});await assert.rejects(p,e=>e.name==='AbortError');await new Promise(r=>setImmediate(r));assert.equal(a.apagados.length,1);assert.equal(a.envios.length,0);
});
test('contrato antigo continua preparando e compartilhando para PDF e comprovantes',async()=>{
 const a=ambiente();await a.c.window.__avantavendasCompartilharArquivos({arquivos:[{name:'comprovante.pdf'}]});assert.equal(a.escritos.length,1);assert.equal(a.envios.length,1);assert.equal(a.timers.length,1);a.limpar();
});
test('cancelar a janela nativa permite repetir sem gravar os arquivos de novo',async()=>{
 const a=ambiente();const preparado=await a.c.window.__avantavendasPrepararCompartilhamentoArquivos({arquivos:[{name:'a.jpg'}]});
 a.share.share=async()=>{throw new Error('Share canceled')};
 await assert.rejects(preparado.compartilhar(),/Share canceled/);
 a.share.share=async o=>a.envios.push(o);
 await preparado.compartilhar();assert.equal(a.escritos.length,1);assert.equal(a.envios.length,1);assert.equal(a.timers.length,0);
 preparado.descartar();a.limpar();
});
