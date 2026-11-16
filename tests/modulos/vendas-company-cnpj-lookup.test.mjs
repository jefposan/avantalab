import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupCompanyCnpj } from '../../app/vendas/lib/company-cnpj-lookup.mjs';
const document = '69758267000149';
const data = { documento: document, razaoSocial:'Empresa real', nomeFantasia:'Empresa', endereco:{cidade:'São Paulo',uf:'SP',cep:'01001000',logradouro:'Praça',numero:'1'}, contatos:{emails:[{endereco:'teste@example.com'}],telefones:[{ddd:'11',numero:'12345678'}]}, inscricoesEstaduais:[{uf:'RJ',ativa:true,inscricao:'errada'},{uf:'SP',ativa:false,inscricao:'inativa'},{uf:'SP',ativa:true,inscricao:'123'}] };
test('consulta endpoint real interno e mapeia dados cadastrais/IE ativa da UF', async()=>{
 const result = await lookupCompanyCnpj('69.758.267/0001-49',{fetcher:async(url,options)=>{
 if(url.startsWith('/api/cep?')) return {ok:true,json:async()=>({codigoIbge:'3550308'})};
 assert.equal(url,'/api/consultas/cnpj');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{cnpj:document});assert.equal(options.cache,'no-store');
 return {ok:true,json:async()=>({success:true,data})}; }});
 assert.equal(result.cityCode,'3550308');assert.equal(result.legalName,'Empresa real');assert.equal(result.cityName,'São Paulo');assert.equal(result.stateRegistration,'123');assert.equal(result.phone,'1112345678');assert.equal(result.email,'teste@example.com');
});
test('campos ausentes não apagam dados existentes no consumidor',async()=>{
 const result=await lookupCompanyCnpj(document,{fetcher:async()=>({ok:true,json:async()=>({success:true,data:{documento:document,razaoSocial:''}})})});
 assert.equal(result.legalName,undefined);assert.equal(result.cep,undefined);assert.equal(result.stateRegistration,undefined);
});
for(const message of ['Empresa não encontrada','Limite de consultas','Serviço indisponível']) test(`preserva mensagem do endpoint: ${message}`,async()=>{
 await assert.rejects(lookupCompanyCnpj(document,{fetcher:async()=>({ok:false,json:async()=>({success:false,error:{message}})})}),{message});
});
test('não usa base local em erro, documento divergente ou resposta inválida',async()=>{
 for(const payload of [null,{success:true,data:{documento:'00000000000000'}}]) await assert.rejects(lookupCompanyCnpj(document,{fetcher:async()=>({ok:true,json:async()=>payload})}));
 await assert.rejects(lookupCompanyCnpj(document,{fetcher:async()=>{throw new Error('Falha de rede')}}),/Falha de rede/);
 await assert.rejects(lookupCompanyCnpj('123',{fetcher:async()=>assert.fail('não deve consultar')}),/14 dígitos/);
});
test('cancelamento é encaminhado à requisição',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(lookupCompanyCnpj(document,{signal:controller.signal,fetcher:async(_,options)=>{assert.equal(options.signal.aborted,true);throw new DOMException('Cancelada','AbortError')}}),/interrompida/);
});
test('resposta de outro CNPJ não pode preencher o cadastro', async()=>{
 await assert.rejects(lookupCompanyCnpj(document,{fetcher:async()=>({ok:true,json:async()=>({success:true,data:{...data,documento:'00000000000000'}})})}),/outro CNPJ/);
});
test('CEP indisponível preserva dados retornados pelo CNPJ', async()=>{
 const result=await lookupCompanyCnpj(document,{fetcher:async(url)=>{if(url.startsWith('/api/cep')) throw new Error('offline'); return {ok:true,json:async()=>({success:true,data})};}});
 assert.equal(result.legalName,'Empresa real'); assert.equal(result.cityCode,undefined);
});
test('empresa e estabelecimentos usam consulta real e descartam respostas antigas', async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx',import.meta.url),'utf8');
 for(const [start,end] of [['searchCompanyCnpj','searchCompanyCep'],['searchEstablishmentCnpj','searchEstablishmentCep']]) {
  const handler=source.slice(source.indexOf(`const ${start} =`),source.indexOf(`const ${end} =`));
  assert.match(handler,/await lookupCompanyCnpj\(document\)/);
  assert.match(handler,/request !== cnpjRequest.current/);
  assert.doesNotMatch(handler,/demoCnpjDirectory|clients.find|setTimeout/);
 }
});
