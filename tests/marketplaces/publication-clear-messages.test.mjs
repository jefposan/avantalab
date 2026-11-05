import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function client(fetch) {
  const source=readFileSync('app/marketplaces/Anunciados.tsx','utf8');
  const fn=source.slice(source.indexOf('export async function marketplaceClientRequest'),source.indexOf('export default function Anunciados'));
  const exports={};
  vm.runInNewContext(ts.transpileModule(fn,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,fetch,Error,JSON,supabase:{auth:{getSession:async()=>({data:{session:{access_token:'mock-only'}}})}}});
  return exports.marketplaceClientRequest;
}

test('conexão explica consulta ou resultado não confirmado sem repetir operação',async()=>{
  let calls=0;
  const request=client(async()=>{calls++;throw new TypeError('Failed to fetch');});
  await assert.rejects(request('anunciados'),/tente consultar novamente/);
  await assert.rejects(request('publicar',{product:'mock'}),/Confira o resultado na lista antes de repetir/);
  assert.equal(calls,2);
});

test('cancelar não vira erro de conexão e recusa preserva campos/detalhes',async()=>{
  const aborted=Object.assign(new Error('cancelado'),{name:'AbortError'});
  await assert.rejects(client(async()=>{throw aborted;})('anunciados'),error=>error===aborted);
  const request=client(async()=>Response.json({message:'Prazo da garantia: informe quantidade e unidade.',fields:{warrantyTime:'Use 3 meses.'},details:'Resposta sanitizada — HTTP 400'},{status:400}));
  await assert.rejects(request('publicar',{product:'mock'}),error=>{
    assert.equal(error.fields.warrantyTime,'Use 3 meses.');assert.match(error.details,/HTTP 400/);assert.match(error.message,/quantidade e unidade/);return true;
  });
});

test('fronteira API entrega diagnóstico tipado e não vaza exceção desconhecida',()=>{
  const source=readFileSync('app/modules/marketplaces/services/management-access.ts','utf8');
  const slice=source.slice(source.indexOf('export class MarketplaceError'),source.indexOf('export async function authorizeMarketplace'));
  const exports={};
  vm.runInNewContext(ts.transpileModule(slice,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Error,NextResponse:{json:(body,options)=>({body,options})}});
  const known=exports.managementFailure(new exports.MarketplaceError(400,'invalid_fields','Confira a garantia.',{warrantyTime:'Use 3 meses.'},'Diagnóstico sanitizado'));
  assert.equal(known.body.details,'Diagnóstico sanitizado');assert.equal(known.options.status,400);
  assert.doesNotMatch(JSON.stringify(exports.managementFailure(new Error('SECRET_INTERNAL_ERROR'))),/SECRET_INTERNAL_ERROR/);
});
