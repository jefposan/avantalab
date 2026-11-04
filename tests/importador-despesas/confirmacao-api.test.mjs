import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url),source=readFileSync('app/api/importador-despesas/confirmar/route.ts','utf8');
function harness({expired=false,rpcError=null}={}){
 const calls=[],exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Request,Response,Date,Number,Error,console:{error(){}},process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://test.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-test'}},require(id){if(id==='@supabase/supabase-js')return{createClient:()=>({auth:{getUser:async()=>({data:{user:expired?null:{id:'actor'}},error:expired?Error('Sessão expirada'):null})},rpc:async(name,body)=>{calls.push({name,body});return {data:rpcError?null:{total:body.p_lancamentos.length,inseridos:body.p_lancamentos.length,ignorados:0,lote_chave:body.p_lote_chave},error:rpcError};}})};return require(id);}});
 return {calls,run:(body,token='valid')=>exports.POST(new Request('https://local/api/importador-despesas/confirmar',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}))};
}
const body={empresaId:'empresa',loteChave:'arquivo',lancamentos:[{data:'2026-10-10',tipo_despesa:'Alimentação',descricao:'Mercado',valor:35.5,item_chave:'linha'}]};
test('confirmação autentica e envia lote completo ao RPC, preservando recibo',async()=>{const h=harness();const response=await h.run(body);assert.equal(response.status,200);assert.equal(h.calls.length,1);assert.equal(h.calls[0].name,'importar_lancamentos_despesas_contexto_rpc');assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].body.p_lancamentos)),body.lancamentos);assert.equal((await response.json()).resultado.inseridos,1);});
test('sessão expirada, lote vazio e campos inválidos não chamam gravação',async()=>{for(const [options,payload,token,status] of [[{expired:true},body,'valid',401],[{},body,'',401],[{},{...body,lancamentos:[]},'valid',400],[{},{...body,lancamentos:[{...body.lancamentos[0],data:'2026-02-30'}]},'valid',400]]){const h=harness(options);assert.equal((await h.run(payload,token)).status,status);assert.equal(h.calls.length,0);}});
test('falha do banco retorna erro legível e não informa sucesso',async()=>{const h=harness({rpcError:{message:'Sem permissão no perfil'}});const r=await h.run(body);assert.equal(r.status,400);assert.equal((await r.json()).mensagem,'Sem permissão no perfil');});

test('API encaminha centro explícito e rejeita identificador inválido antes da gravação',async()=>{
 const h=harness(),center='5a1035ad-997f-4849-b047-903f4ee3402f';
 assert.equal((await h.run({...body,centroCustoId:center})).status,200);
 assert.equal(h.calls[0].body.p_centro_custo_id,center);
 const invalid=harness();assert.equal((await invalid.run({...body,centroCustoId:'outro'})).status,400);assert.equal(invalid.calls.length,0);
});
