import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {criarModeloClientes,lerModeloClientes} from '../../app/vendas/lib/customer-excel.ts';
import {createCommercialCustomerImportService} from '../../app/vendas/lib/server/commercial-customer-import.mjs';
import {validateCommercialCustomerInput} from '../../app/vendas/lib/server/commercial-customer-service.mjs';
import {createPostgresCommercialCustomerRepository} from '../../app/vendas/lib/server/commercial-customer-repository.mjs';
import {PGlite} from '@electric-sql/pglite';
import {handleCustomerImport} from '../../app/vendas/lib/server/commercial-customer-import-http.mjs';
const companyId='10000000-0000-4000-8000-000000000001',actorId='20000000-0000-4000-8000-000000000001';
const context={companyId,actorId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'clients.create':true,'clients.view':true}};
const customer={documentType:'cpf',document:'52998224725',legalName:'Cliente de teste',consumerFinal:true};
const rows=[{line:2,customer}];
const buffer=async workbook=>new Uint8Array(await workbook.xlsx.writeBuffer()).buffer;
test('modelo de clientes é vazio, possui instruções, textos, filtros e listas',async()=>{
 const workbook=await criarModeloClientes(companyId),sheet=workbook.getWorksheet('Clientes');
 assert.equal(workbook.worksheets.length,3);assert.equal(sheet.columnCount,23);assert.equal(sheet.getCell('B2').numFmt,'@');assert.equal(sheet.getCell('B2').text,'');
 assert.equal(sheet.views[0].xSplit,2);assert.equal(sheet.views[0].ySplit,1);assert.equal(sheet.getRow(1).height,34);assert.equal(sheet.getCell('A2').dataValidation.type,'list');
 assert.equal(workbook.getWorksheet('_Avanta').state,'veryHidden');assert.match(workbook.getWorksheet('Instruções').getCell('B9').text,/não sobrescrever|sem sobrescrever/);
 await assert.rejects(()=>buffer(workbook).then(b=>lerModeloClientes(b,companyId)),/vazia/);
});
test('modelo preenchido preserva zeros e normaliza escolhas',async()=>{
 const workbook=await criarModeloClientes(companyId),sheet=workbook.getWorksheet('Clientes');
 sheet.getRow(2).values=['Pessoa física','52998224725','Cliente teste','','','','','','Sim','','011999999999','','01234000'];
 const parsed=await lerModeloClientes(await buffer(workbook),companyId);assert.equal(parsed.rows.length,1);assert.equal(parsed.rows[0].customer.postalCode,'01234000');assert.equal(parsed.rows[0].customer.consumerFinal,true);assert.equal(parsed.rows[0].customer.documentType,'cpf');
 await assert.rejects(()=>buffer(workbook).then(b=>lerModeloClientes(b,'30000000-0000-4000-8000-000000000001')),/outro perfil/);
 sheet.getCell('C2').value={formula:'1+1',result:2};await assert.rejects(()=>buffer(workbook).then(b=>lerModeloClientes(b,companyId)),/fórmulas/);
});
test('cabeçalhos alterados e consumidor final ausente bloqueiam importação',async()=>{
 const workbook=await criarModeloClientes(companyId),sheet=workbook.getWorksheet('Clientes');sheet.getCell('A1').value='Outra coluna';
 await assert.rejects(()=>buffer(workbook).then(b=>lerModeloClientes(b,companyId)),/Cabeçalho/);
 sheet.getCell('A1').value='Tipo de pessoa *';sheet.getRow(2).values=['Pessoa física','52998224725','Cliente teste'];
 await assert.rejects(()=>buffer(workbook).then(b=>lerModeloClientes(b,companyId)),/Consumidor final/);
});
test('prévia não grava, confirmação é vinculada ao usuário e arquivo',async()=>{
 let writes=0,saved;const service=createCommercialCustomerImportService({repository:{findExistingDocuments:async()=>[],importMany:async input=>{writes++;saved=input;return{created:1,skipped:0};}}});
 const preview=await service.run({context,rows});assert.equal(preview.created,1);assert.equal(preview.review,1);assert.equal(writes,0);
 assert.equal((await service.run({context,rows,confirm:true,previewKey:'alterada'})).ok,false);assert.equal(writes,0);
 const result=await service.run({context,rows,confirm:true,previewKey:preview.previewKey});assert.equal(result.confirmed,true);assert.equal(writes,1);assert.equal(saved.companyId,companyId);assert.equal(saved.customers[0].status,'revisar_cadastro');
});
test('adicionar ignora CPF existente e repetições no arquivo sem sobrescrever',async()=>{
 const service=createCommercialCustomerImportService({repository:{findExistingDocuments:async()=>[customer.document],importMany:async()=>assert.fail('não gravar')}});
 const preview=await service.run({context,rows});assert.equal(preview.created,0);assert.equal(preview.skipped,1);
 const duplicate=await service.run({context,rows:[...rows,{line:3,customer}]});assert.equal(duplicate.canImport,true);assert.equal(duplicate.skipped,2);assert.equal(duplicate.duplicates,1);
});
test('acesso, limite e dados inválidos são rejeitados antes de consultar o banco',async()=>{
 const service=createCommercialCustomerImportService({repository:{findExistingDocuments:()=>assert.fail('sem consulta')}});
 assert.equal((await service.run({context:{...context,effectivePermissions:{}},rows})).ok,false);
 assert.equal((await service.run({context,rows:Array(1001).fill(rows[0])})).ok,false);
 for(const invalid of [{document:'11111111111'},{email:'invalido'},{consumerFinal:'sim'},{postalCode:'123456789'},{legalName:{formula:'x'}}]){const result=await service.run({context,rows:[{line:2,customer:{...customer,...invalid}}]});assert.equal(result.canImport,false);assert.ok(result.rowErrors.length);}
});
test('cliente inativo permanece inativo mesmo sem dados fiscais',()=>{const result=validateCommercialCustomerInput({...customer,status:'inativo'});assert.equal(result.normalized.status,'inativo');assert.equal(result.warnings.length,0);});
test('SQL de importação gera códigos, preserva existentes, isola empresas e desfaz lote em falha',async()=>{
 const db=new PGlite();try{
 await db.exec(`create table vendas_clientes(id uuid default gen_random_uuid() primary key,empresa_id uuid,codigo bigint,tipo_pessoa text,documento_tipo text,documento text,razao_social text,nome_fantasia text,nome_exibicao text,inscricao_estadual text,inscricao_municipal text,indicador_ie text,consumidor_final boolean,email text,telefone text,contato_principal text,cep text,logradouro text,numero text,complemento text,bairro text,municipio text,municipio_ibge text,uf text,condicao_pagamento text,observacoes text,situacao text,criado_por uuid,atualizado_por uuid,unique(empresa_id,documento),unique(empresa_id,codigo));create table vendas_sequencias(empresa_id uuid,tipo text,ano int,proximo_numero bigint,atualizado_em timestamptz,primary key(empresa_id,tipo,ano));create table vendas_eventos(empresa_id uuid,recurso_tipo text,recurso_id uuid,evento text,resumo text,metadados jsonb,criado_por uuid);`);
 const pool={query:async(sql,params)=>db.query(sql,params)};const repo=createPostgresCommercialCustomerRepository({pool});
 const normalized=validateCommercialCustomerInput(customer).normalized;
 const input={companyId,actorId,customers:[normalized],expectedExisting:[],fileName:'teste.xlsx'};
 assert.deepEqual(await repo.importMany(input),{created:1,skipped:0});
 assert.equal((await db.query('select codigo from vendas_clientes')).rows[0].codigo,1);assert.equal((await db.query('select * from vendas_eventos')).rows.length,1);
 assert.deepEqual(await repo.importMany({...input,expectedExisting:[customer.document]}),{created:0,skipped:1});
 await assert.rejects(()=>repo.importMany(input),/Prévia alterada/);
 assert.deepEqual(await repo.findExistingDocuments({companyId:actorId,documents:[customer.document]}),[]);
 const other={...normalized,document:'12345678909'};
 await db.exec('alter table vendas_eventos add constraint teste_rollback check(false) not valid');
 await assert.rejects(()=>repo.importMany({...input,customers:[other]}));
 assert.equal((await db.query('select count(*)::int n from vendas_clientes')).rows[0].n,1);assert.equal(Number((await db.query('select proximo_numero from vendas_sequencias')).rows[0].proximo_numero),2);
 }finally{await db.close();}
});
test('ações oficiais ficam ao lado de Novo cliente e confirmação com erro exige revalidar',async()=>{
 const ui=await readFile('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),actions=await readFile('app/vendas/components/CustomerExcelActions.tsx','utf8');
 assert.match(ui,/<CustomerExcelActions/);assert.match(actions,/Revalidar planilha/);assert.match(actions,/Boolean\(error\)/);assert.match(actions,/BotaoAcaoCompacto/);
 assert.match(ui,/className="client-heading-actions"/);assert.match(ui,/BotaoAcaoCompacto variante="primario" disabled=\{!can\('clients.create'\)\}/);
});
test('rota exige sessão, perfil e permissões autoritativas, nunca os dados do cliente',async()=>{
 const request=body=>new Request('http://localhost/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const boundary={companyId,userId:actorId,moduleId:'vendas',userActive:true,membershipActive:true,companyActive:true,moduleActive:true};
 const runtime={configured:true,customerService:{},accessResolver:{resolve:async()=>({authenticated:true,boundary,effectivePermissions:context.effectivePermissions})},customerImportService:createCommercialCustomerImportService({repository:{findExistingDocuments:async()=>[]}})};
 const result=await handleCustomerImport({request:request({rows,confirm:false}),runtime,companyId});assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');
 assert.equal((await handleCustomerImport({request:request(null),runtime,companyId})).status,400);
 assert.equal((await handleCustomerImport({request:request({rows,confirm:false,fileCompanyId:actorId}),runtime,companyId})).status,403);
 runtime.accessResolver.resolve=async()=>({authenticated:false});assert.equal((await handleCustomerImport({request:request({rows,confirm:false}),runtime,companyId})).status,401);
 runtime.accessResolver.resolve=async()=>({authenticated:true,boundary:{...boundary,companyId:actorId}});assert.equal((await handleCustomerImport({request:request({rows,confirm:false}),runtime,companyId})).status,403);
 runtime.accessResolver.resolve=async()=>({authenticated:true,boundary,effectivePermissions:{}});assert.equal((await handleCustomerImport({request:request({rows,confirm:false}),runtime,companyId})).status,403);
});
