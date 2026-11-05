import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
const fonte=readFileSync('app/api/lancamentos/operacao-anexos/route.ts','utf8');
const codigo=ts.transpileModule(fonte,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const empresa='00000000-0000-4000-8000-000000000010',usuario='00000000-0000-4000-8000-000000000001',op='10000000-0000-4000-8000-000000000001';
function ambiente({acao='incluir',autenticado=true,permitido=true,sessao=true,dono=true,funcionario=false,corrida=false}={}){
  const row={id:1850,empresa_id:empresa,revisao:1,nota_arquivo_path:null};
  const uploads=[],remocoes=[],atualizacoes=[],consultas=[];
  const recibo={pedido:{acao,tipo:'despesa'},resultado:{acao,tipo:'despesa',registros:[{...row}],originais:[{...row,nota_arquivo_path:`${empresa}/1850.png`}]}};
  let emUso=false;
  function from(tabela){
    const filtros=[],q={dados:null,select(){return this;},eq(k,v){filtros.push([k,v]);return this;},is(k,v){filtros.push([k,v]);return this;},limit(){return this;},update(d){this.dados=d;return this;},
      async executar(){
        consultas.push({tabela,filtros,dados:this.dados});
        if(tabela==='usuarios_empresa')return {data:{perfil:funcionario?'funcionario_ponto':'administrador'}};
        if(tabela==='edicoes_financeiras_mobile')return {data:dono&&filtros.some(([k,v])=>k==='user_id'&&v===usuario)&&filtros.some(([k,v])=>k==='empresa_id'&&v===empresa)?recibo:null};
        if(tabela==='lancamentos'){
          if(filtros.some(([k])=>k==='nota_arquivo_path')&&!this.dados)return {data:emUso?[{id:2000}]:[]};
          const valido=filtros.every(([k,v])=>String(row[k])===String(v));
          if(this.dados){if(!valido)return {data:null};Object.assign(row,this.dados);row.revisao++;atualizacoes.push(this.dados);}
          return {data:valido?{...row}:null};
        }
        throw Error(tabela);
      },maybeSingle(){return this.executar();},then(ok,erro){return this.executar().then(ok,erro);}};return q;
  }
  const admin={from,storage:{from:()=>({upload:async(p,arquivo)=>{uploads.push({p,arquivo});if(corrida){row.revisao++;row.nota_arquivo_path=`${empresa}/nota-outra.png`;}return {};},remove:async(p)=>{remocoes.push(...p);return {};}})}};
  const cliente={auth:{getUser:async()=>({data:{user:autenticado?{id:usuario}:null},error:null})},rpc:async()=>({data:sessao})};
  const exports={},ctx={exports,URL,Request,File,FormData,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://ficticio.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'anon-ficticio',SUPABASE_SERVICE_ROLE_KEY:'service-ficticio'}},
    require(n){if(n==='next/server')return {NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),{...init,headers:{'Content-Type':'application/json'}})}};
      if(n==='@supabase/supabase-js')return {createClient:(url,key)=>key==='anon-ficticio'?cliente:admin};
      if(n.includes('acessos-usuario-servidor'))return {conferirLiberacao:async()=>permitido};throw Error(n);}};
  vm.runInNewContext(codigo,ctx);
  const url=`https://local.invalid/api/lancamentos/operacao-anexos?empresaId=${empresa}`;
  return {row,recibo,uploads,remocoes,atualizacoes,consultas,emUso:v=>emUso=v,
    post:()=>{const form=new FormData();form.append('operacaoId',op);form.append('arquivo',new File(['ficticio'],'nota.png',{type:'image/png'}));return exports.POST(new Request(url,{method:'POST',headers:{Authorization:'Bearer ficticio'},body:form}));},
    del:(extra={})=>exports.DELETE(new Request(url,{method:'DELETE',headers:{Authorization:'Bearer ficticio','Content-Type':'application/json'},body:JSON.stringify({operacaoId:op,...extra})})),
  };
}
test('anexo exige usuário, perfil, Financeiro, sessão e recibo privado do próprio dono',async()=>{
  for(const opcoes of [{autenticado:false},{permitido:false},{sessao:false},{dono:false},{funcionario:true}]){
    const a=ambiente(opcoes);assert.equal((await a.post()).status,403);assert.equal(a.uploads.length,0);assert.equal(a.atualizacoes.length,0);
  }
});
test('anexar é idempotente e condicionado à revisão; não substitui nota de outro aparelho',async()=>{
  const a=ambiente();assert.equal((await a.post()).status,200);assert.equal(a.uploads.length,1);assert.equal(a.atualizacoes.length,1);
  assert.equal((await a.post()).status,200);assert.equal(a.uploads.length,1);assert.equal(a.row.revisao,2);
  const b=ambiente();b.row.revisao=2;assert.equal((await b.post()).status,409);assert.equal(b.uploads.length,0);
  const c=ambiente({corrida:true});assert.equal((await c.post()).status,409);assert.match(c.row.nota_arquivo_path,/nota-outra/);assert.equal(c.remocoes.length,0);
});
test('limpeza usa somente caminhos do recibo de exclusão e nunca apaga nota ainda referenciada',async()=>{
  const a=ambiente({acao:'excluir'});assert.equal((await a.del({caminho:'outra-empresa/arquivo.png',lancamentoId:999})).status,200);
  assert.deepEqual(a.remocoes,[`${empresa}/1850.png`]);
  assert.equal(a.atualizacoes.length,0,'não atualiza registro já excluído nem muda revisão de parcela fixa');
  const b=ambiente({acao:'excluir'});b.emUso(true);assert.equal((await b.del()).status,200);assert.equal(b.remocoes.length,0);
  const c=ambiente();assert.equal((await c.del()).status,403);assert.equal(c.remocoes.length,0);
});
