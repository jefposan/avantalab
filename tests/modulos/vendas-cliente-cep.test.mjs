import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
const start=source.indexOf('  const searchCep =',source.indexOf('function ClientFormDialog('));
const code=source.slice(start,source.indexOf('  const save =',start));
function fixture(payload,{ok=true,cep='28140-000',failure=false}={}){
 let form={cep,street:'',complement:'Sala 1',district:'',cityName:'',cityCode:'',state:'',city:''},lookup,searching;const calls=[];const request={current:0};
 const scope={exports:{},form,searching:null,connected:true,cepLookupRequestRef:request,AbortController,window:{setTimeout:()=>1,clearTimeout:()=>{}},formatCep:x=>x,setForm:fn=>form=fn(form),setLookup:x=>lookup=x,setSearching:x=>searching=x,fetch:async(...args)=>{calls.push(args);if(failure)throw Error('Falha de conexão');return{ok,json:async()=>payload};}};
 vm.runInNewContext(ts.transpileModule(code+'\nexports.search=searchCep;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);
 return{run:scope.exports.search,scope,request,calls,result:()=>({form,lookup,searching})};
}
test('CEP genérico preenche município e avisa explicitamente que não há logradouro',async()=>{
 const f=fixture({ok:true,cep:'28140-000',rua:'',bairro:'Santo Amaro de Campos',cidade:'Campos dos Goytacazes',estado:'RJ',codigoIbge:'3301009'});await f.run();
 const {form,lookup,searching}=f.result();assert.equal(form.cityName,'Campos dos Goytacazes');assert.equal(form.cityCode,'3301009');assert.equal(form.street,'');assert.equal(form.complement,'Sala 1');assert.equal(lookup.tone,'success');assert.match(lookup.message,/não informa logradouro/);assert.match(lookup.message,/manualmente/);assert.equal(searching,null);
});
test('consulta completa confirma sucesso; falha e CEP inválido sempre avisam',async()=>{
 const good=fixture({rua:'Rua de teste',bairro:'Centro',cidade:'Cidade',estado:'SP',codigoIbge:'3550308'});await good.run();assert.equal(good.result().form.street,'Rua de teste');assert.match(good.result().lookup.message,/Endereço localizado/);
 for(const f of [fixture({mensagem:'CEP não encontrado.'},{ok:false}),fixture(null,{failure:true}),fixture({}, {cep:'123'}),fixture({})]){await f.run();assert.equal(f.result().lookup.tone,'error');assert.ok(f.result().lookup.message);}
});
test('retorno antigo não altera formulário nem aviso depois de trocar o CEP',async()=>{
 const f=fixture({cidade:'Anterior',estado:'SP'});let release;
 f.scope.fetch=()=>new Promise(resolve=>release=resolve);const running=f.run();f.request.current++;
 release({ok:true,json:async()=>({cidade:'Anterior',estado:'SP'})});await running;
 assert.equal(f.result().form.cityName,'');assert.equal(f.result().lookup,null);
});
