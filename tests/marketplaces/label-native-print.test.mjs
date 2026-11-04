import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import {printLabelPdf} from '../../app/modules/marketplaces/label-native-print.ts';
const nativeRequire=createRequire(import.meta.url);
function fixture({blocked=false}={}){
 const calls=[],busy=[],errors=[];let cleanup;let index=0;let sequence=0;const timers=new Map();
 const refs=[{current:{contentWindow:{focus(){calls.push('focus');},print(){calls.push('print');if(blocked)throw new Error('blocked');}}}},{current:false},{current:true},{current:undefined}];
 const exports={};vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/LabelNativePrint.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require(name){if(name==='react')return{useRef:()=>refs[index++],useState:()=>['',v=>errors.push(v)],useEffect:fn=>{cleanup=fn();}};if(name.endsWith('/label-native-print'))return{printLabelPdf};if(name.endsWith('.css'))return{default:{}};return nativeRequire(name);},setTimeout:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)});
 const tree=exports.default({url:'blob:original-pdf',filename:'pedido-123.pdf',orderId:'123',onBusyChange:v=>busy.push(v)});
 return{iframe:tree.props.children[0],calls,busy,errors,timeout:()=>{for(const t of timers.values())if(t.ms===15000)t.fn();},ready:()=>{for(const [id,t] of [...timers])if(t.ms===1000){timers.delete(id);t.fn();}},frame:refs[0],cleanup:()=>cleanup()};
}
test('impressão usa o PDF original e abre somente uma vez, mesmo com onLoad repetido',()=>{const f=fixture();assert.equal(f.iframe.props.src,'blob:original-pdf');assert.equal(f.iframe.props.title,'PDF para impressão do Pedido #123');f.iframe.props.onLoad();f.iframe.props.onLoad();assert.deepEqual(f.calls,[],'aguarda o leitor PDF, não imprime o documento vazio');f.ready();assert.deepEqual(f.calls,['focus','print']);assert.deepEqual(f.busy,[true,false]);assert.deepEqual(f.errors,[]);});
test('falha do navegador informa alternativa e não confirma impressão física',()=>{const f=fixture({blocked:true});f.iframe.props.onLoad();f.ready();assert.equal(f.errors.length,1);assert.match(f.errors[0],/Abra o PDF/);assert.equal(f.busy.at(-1),false);});
test('PDF que não carrega sai da espera; desmontagem não imprime resposta atrasada',()=>{const f=fixture();f.timeout();assert.match(f.errors[0],/Abra o PDF/);assert.equal(f.busy.at(-1),false);f.cleanup();f.iframe.props.onLoad();assert.deepEqual(f.calls,[]);});

test('load inicial em branco é ignorado e desmontagem cancela impressão programada',()=>{const f=fixture();f.frame.current.contentDocument={URL:'about:blank'};f.iframe.props.onLoad();f.ready();assert.deepEqual(f.calls,[]);f.frame.current.contentDocument={URL:'blob:original-pdf'};f.iframe.props.onLoad();f.cleanup();f.ready();assert.deepEqual(f.calls,[]);});
