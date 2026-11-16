import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {saveCompanyProfile,companyProfilePatch} from '../../app/vendas/lib/company-profile-save.mjs';
const companyId='baa8c115-634a-41d3-9e2a-8666dce11454';
const company={name:'Empresa',legalName:'Empresa LTDA',document:'69.758.267/0001-49',cep:'01001-000',street:'Praça',number:'10',complement:'Sala 2',district:'Centro',city:'São Paulo/SP',phone:'(11) 1234-5678',email:'TESTE@EXAMPLE.COM',stateRegistration:'ISENTO',municipalRegistration:'123',taxRegime:'Simples Nacional'};
function server({denied=false,reject=false,lose=false,other=false}={}) {
 let saved={empresa_id:companyId,nome_responsavel:'Responsável',whatsapp:'11999999999',site:'https://example.com',configuracao_fiscal:{csosn:'102'},documento:'69758267000149'};
 const calls=[];
 return {calls,get saved(){return saved},fetcher:async(url,options)=>{
  calls.push({url,options});assert.equal(options.headers.Authorization,'Bearer session');
  if(options.method==='PUT') {
   const body=JSON.parse(options.body);assert.equal(body.empresaId,companyId);assert.equal(body.concluir,false);
   if(reject)return {ok:false,json:async()=>({mensagem:'Falha na gravação'})};
   if(!lose)saved={...saved,...body.dados};
   return {ok:true,json:async()=>({ok:true,cadastro:saved})};
  }
  return {ok:true,json:async()=>({ok:true,podeEditar:!denied,tipoPerfil:'empresa',cadastro:{...saved,empresa_id:other?'outra-empresa':companyId}})};
 }};
}
test('grava no cadastro central, relê confirmação e mantém dados fora do formulário',async()=>{
 const db=server();const result=await saveCompanyProfile({companyId,company,token:'session',fetcher:db.fetcher});
 assert.equal(db.calls.length,3);assert.equal(result.company.street,'Praça');assert.equal(result.company.number,'10');assert.equal(result.company.complement,'Sala 2');
 assert.equal(db.saved.whatsapp,'11999999999');assert.equal(db.saved.nome_responsavel,'Responsável');assert.deepEqual(db.saved.configuracao_fiscal,{csosn:'102'});
 assert.equal(db.saved.regime_tributario,'simples_nacional');assert.equal(db.saved.documento,'69758267000149');
 // A reabertura usa a mesma fonte central, sem depender de storage local.
 const reopened=await db.fetcher('/api/perfil-cadastro',{headers:{Authorization:'Bearer session'}});assert.equal((await reopened.json()).cadastro.numero,'10');
});
test('sem permissão não escreve; empresa de retorno divergente não escreve',async()=>{
 for(const config of [{denied:true},{other:true}]){
  const db=server(config);await assert.rejects(saveCompanyProfile({companyId,company,token:'session',fetcher:db.fetcher}));assert.equal(db.calls.length,1);
 }
});
test('falha de gravação e confirmação divergente não retornam sucesso',async()=>{
 for(const config of [{reject:true},{lose:true}]){
  const db=server(config);await assert.rejects(saveCompanyProfile({companyId,company,token:'session',fetcher:db.fetcher}));
 }
 await assert.rejects(saveCompanyProfile({companyId,company,token:'',fetcher:()=>assert.fail()}));
});
test('mapeamento exige município/UF e normaliza campos sem inventar CFOP',()=>{
 assert.throws(()=>companyProfilePatch({...company,city:'São Paulo'}),/município/);
 assert.equal(companyProfilePatch(company).inscricao_estadual_isento,true);
 assert.equal('cfop' in companyProfilePatch(company),false);
});
test('ponte usa origem e iframe verificados, sessão só no hospedeiro e confirmação antes de fechar',async()=>{
 const parent=await readFile(new URL('../../app/vendas/VendasIntegrado.tsx',import.meta.url),'utf8');
 const ui=await readFile(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx',import.meta.url),'utf8');
 assert.match(parent,/event.origin !== origemPrototipo \|\| event.source !== iframeRef.current\?\.contentWindow/);
 assert.match(parent,/saveCompanyProfile\(\{companyId:empresaId,company,token\}\)/);
 assert.match(ui,/const result = await onSaveCompany\(normalized.company\)/);
 assert.match(ui,/if \(!result.ok\) \{ setError\(result.message\); return; \}/);
 assert.match(ui,/disabled=\{saving\}>\{saving \? 'Salvando…'/);
});
