import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createCommercialCustomerImportService} from '../../app/vendas/lib/server/commercial-customer-import.mjs';
import {createPostgresCommercialCustomerRepository} from '../../app/vendas/lib/server/commercial-customer-repository.mjs';
import {validateCommercialCustomerInput} from '../../app/vendas/lib/server/commercial-customer-service.mjs';
const companyId='10000000-0000-4000-8000-000000000001',actorId='20000000-0000-4000-8000-000000000001';
const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'clients.create':true,'clients.view':true,'clients.edit':true}};
const customer={documentType:'cpf',document:'52998224725',legalName:'Cliente inicial',consumerFinal:true};
const rows=[{line:2,customer}];
test('substituir exige editar, rejeita modo inválido e documentos ambíguos',async()=>{
 const service=createCommercialCustomerImportService({repository:{findExistingDocuments:()=>assert.fail('sem consulta')}});
 assert.equal((await service.run({context:{...context,effectivePermissions:{'clients.create':true,'clients.view':true}},rows,mode:'replace'})).errors[0].code,'AV-COMMERCIAL-PERMISSION');
 assert.equal((await service.run({context,rows,mode:'delete'})).ok,false);
 const duplicate=await service.run({context,rows:[...rows,{line:3,customer}],mode:'replace'});assert.equal(duplicate.canImport,false);assert.match(duplicate.rowErrors[0].message,/única linha/);
});
test('prévia de substituição está vinculada ao modo e à versão de toda a base',async()=>{
 let version=1,writes=0;
 const service=createCommercialCustomerImportService({repository:{findExistingDocuments:async()=>[customer.document],findImportSnapshot:async()=>[{documento:customer.document,versao:version,situacao:'ativo'},{documento:'ausente',versao:1,situacao:'ativo'}],importMany:async()=>{writes++;return{created:0,skipped:0,updated:1,inactivated:1};}}});
 const p=await service.run({context,rows,mode:'replace'});assert.equal(p.updated,1);assert.equal(p.inactivated,1);assert.equal(writes,0);
 assert.equal((await service.run({context,rows,mode:'add',confirm:true,previewKey:p.previewKey})).ok,false);
 version++;assert.equal((await service.run({context,rows,mode:'replace',confirm:true,previewKey:p.previewKey})).ok,false);assert.equal(writes,0);
 const fresh=await service.run({context,rows,mode:'replace'});assert.equal((await service.run({context,rows,mode:'replace',confirm:true,previewKey:fresh.previewKey})).confirmed,true);assert.equal(writes,1);
});
test('substituição SQL mantém IDs/códigos/vínculos, preserva outras empresas e reverte todo lote',async()=>{
 const db=new PGlite();try{
 await db.exec(`create table vendas_clientes(id uuid default gen_random_uuid() primary key,empresa_id uuid,codigo bigint,tipo_pessoa text,documento_tipo text,documento text,razao_social text,nome_fantasia text,nome_exibicao text,inscricao_estadual text,inscricao_municipal text,indicador_ie text,consumidor_final boolean,email text,telefone text,contato_principal text,cep text,logradouro text,numero text,complemento text,bairro text,municipio text,municipio_ibge text,uf text,condicao_pagamento text,observacoes text,situacao text,criado_por uuid,atualizado_por uuid,versao int default 1,atualizado_em timestamptz default now(),vendedor_id uuid,tabela_preco_id uuid,unique(empresa_id,documento),unique(empresa_id,codigo));create table vendas_sequencias(empresa_id uuid,tipo text,ano int,proximo_numero bigint,atualizado_em timestamptz,primary key(empresa_id,tipo,ano));create table vendas_eventos(empresa_id uuid,recurso_tipo text,recurso_id uuid,evento text,resumo text,metadados jsonb,criado_por uuid);create table pedidos(id int primary key,cliente_id uuid references vendas_clientes(id),total numeric);`);
 const repo=createPostgresCommercialCustomerRepository({pool:{query:(sql,params)=>db.query(sql,params)}});
 const normalized=validateCommercialCustomerInput(customer).normalized;
 await repo.importMany({companyId,actorId,customers:[normalized,{...normalized,document:'12345678909'}],expectedExisting:[],fileName:'inicial.xlsx'});
 const before=(await db.query('select * from vendas_clientes order by codigo')).rows;
 await db.query('insert into pedidos values(1,$1,99)',[before[1].id]);
 await db.query('update vendas_clientes set vendedor_id=$1,tabela_preco_id=$1 where id=$2',[actorId,before[0].id]);
 await repo.importMany({companyId:actorId,actorId,customers:[normalized],expectedExisting:[],fileName:'outra.xlsx'});
 const snapshot=await repo.findImportSnapshot({companyId});
 const input={companyId,actorId,mode:'replace',expectedSnapshot:snapshot,expectedExisting:[customer.document],customers:[{...normalized,legalName:'Atualizado',displayName:'Atualizado'}],fileName:'troca.xlsx'};
 assert.deepEqual(await repo.importMany(input),{created:0,skipped:0,updated:1,inactivated:1});
 const after=(await db.query('select * from vendas_clientes where empresa_id=$1 order by codigo',[companyId])).rows;
 assert.equal(after[0].id,before[0].id);assert.equal(after[0].codigo,before[0].codigo);assert.equal(after[0].razao_social,'Atualizado');assert.equal(after[0].vendedor_id,actorId);assert.equal(after[0].tabela_preco_id,actorId);
 assert.equal(after[1].situacao,'inativo');assert.equal((await db.query('select * from pedidos')).rows[0].cliente_id,before[1].id);
 assert.equal((await db.query('select razao_social from vendas_clientes where empresa_id=$1',[actorId])).rows[0].razao_social,'Cliente inicial');
 await assert.rejects(()=>repo.importMany(input),/Prévia alterada/);
 const fresh=await repo.findImportSnapshot({companyId});
 await db.exec('alter table vendas_eventos add constraint rollback_teste check(false) not valid');
 await assert.rejects(()=>repo.importMany({...input,expectedSnapshot:fresh,customers:[{...normalized,legalName:'Não gravar'}]}));
 assert.equal((await db.query('select razao_social from vendas_clientes where id=$1',[before[0].id])).rows[0].razao_social,'Atualizado');
 assert.equal((await db.query('select count(*)::int n from pedidos')).rows[0].n,1);
 }finally{await db.close();}
});
