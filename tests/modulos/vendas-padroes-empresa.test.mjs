import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
import {createCompanyFiscalDefaultsRepository,defaultsVersion,saveCompanyFiscalDefaultsWithAdmin,validateCompanyFiscalDefaults} from '../../app/vendas/lib/fiscal-company-defaults.mjs';
import {normalizeCompanyFiscalDefaults} from '../../app/vendas/lib/fiscal-tax-options.mjs';
import {handleFiscalEditorSettings} from '../../app/vendas/lib/server/fiscal-editor-settings.mjs';
import {resolverFiscalProduto} from '../../app/lib/fiscal-produto.mjs';
const company='10000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000001';
const values=normalizeCompanyFiscalDefaults({origem_mercadoria_padrao:'0',csosn:'102',cst_pis:'08',cst_cofins:'08',cfop_venda_interna:'5102',cfop_venda_interestadual:'6102'});
test('PostgreSQL: padrões usam cadastro existente, preservam dados, outras empresas e detectam concorrência',async()=>{
 const db=new PGlite();try{
 await db.exec('create table cadastros_perfil(empresa_id uuid primary key,regime_tributario text,configuracao_fiscal jsonb,atualizado_em timestamptz default now(),documento text);create table vendas_fiscal_configuracoes(empresa_id uuid,matriz jsonb,situacao text)');
 const previous={origem_mercadoria_padrao:'0',cst_ibs_cbs:'000',classificacao_ibs_cbs:'000001'};
 await db.query('insert into cadastros_perfil(empresa_id,regime_tributario,configuracao_fiscal,documento) values($1,$2,$3,$4),($5,$2,$3,$4)',[company,'simples_nacional',JSON.stringify(previous),'não alterar',other]);
 const matrix={reviewedBy:'Responsável',reviewedAt:'2026-11-17',rules:['Dentro da UF','Fora da UF'].map((destination,index)=>({active:true,reviewed:true,documentType:'nfe',operation:'Venda',destination,cfopOverride:index?'6102':'5102'}))};await db.query('insert into vendas_fiscal_configuracoes values($1,$2,$3)',[company,JSON.stringify(matrix),'publicada']);
 const repo=createCompanyFiscalDefaultsRepository(db);const before=await repo.load(company);assert.equal(before.values.csosn,'');assert.equal(before.values.cfop_venda_interestadual,'6102');
 const saved=await repo.save(company,values,before.version);assert.equal(saved.values.csosn,'102');assert.notEqual(saved.version,before.version);assert.deepEqual((await repo.load(company)).values,saved.values);
 const row=(await db.query('select * from cadastros_perfil where empresa_id=$1',[company])).rows[0];assert.equal(row.documento,'não alterar');assert.equal(row.configuracao_fiscal.cst_ibs_cbs,'000');assert.equal((await repo.load(other)).values.csosn,'');await assert.rejects(repo.save(company,values,before.version),/CONFLICT/);
 const inherited=resolverFiscalProduto({useCompanyFiscal:true,ncm:'84145110'},{taxRegime:'simples_nacional',fiscalConfiguration:row.configuracao_fiscal},{destination:'Fora da UF',cfop:'6102'});assert.equal(inherited.icmsCode,'102');assert.equal(inherited.pisCst,'08');assert.equal(inherited.cofinsCst,'08');
 const exception=resolverFiscalProduto({useCompanyFiscal:false,icmsCode:'500',pisCst:'49'},{taxRegime:'simples_nacional',fiscalConfiguration:row.configuracao_fiscal});assert.equal(exception.icmsCode,'500');assert.equal(exception.pisCst,'49');
 }finally{await db.close();}
});
test('API: consulta e escrita respeitam empresa, sessão, permissão, corpo e confirmação',async()=>{
 let writes=0;const access={authenticated:true,boundary:{source:'authenticated',authenticated:true,companyId:company,userId:other,moduleId:'vendas',userActive:true,membershipActive:true,companyActive:true,moduleActive:true},effectivePermissions:{'fiscal.prepare':true,'fiscal.configure':false}};
 const runtime={configured:true,accessResolver:{resolve:async()=>access},fiscalEditorRepository:{loadDefaults:async id=>{assert.equal(id,company);return{values,version:'a'.repeat(64)};}}};
 const write=async()=>{writes++;return{values,version:'b'.repeat(64)};};
 const request=body=>new Request('https://example.test/editor',{method:'PATCH',body:JSON.stringify(body)});
 const call=(body,id=company)=>handleFiscalEditorSettings({request:request(body),runtime,companyId:id,defaultsWriter:write});
 const body={defaults:values,version:'a'.repeat(64)};assert.equal((await call(body)).status,403);assert.equal(writes,0);
 const loaded=await handleFiscalEditorSettings({request:new Request('https://example.test/editor?section=defaults'),runtime,companyId:company});assert.equal(loaded.status,200);assert.equal((await loaded.json()).canManage,false);
 access.effectivePermissions['fiscal.configure']=true;assert.equal((await call(body,other)).status,403);assert.equal((await call({...body,defaults:{...values,csosn:'999'}})).status,400);assert.equal((await call({...body,defaults:{...values,empresa_id:other}})).status,400);assert.equal((await call({...body,version:'bad'})).status,400);assert.equal(writes,0);
 assert.equal((await call(body)).status,200);assert.equal(writes,1);
 const conflict=await handleFiscalEditorSettings({request:request(body),runtime,companyId:company,defaultsWriter:async()=>{throw Error('CONFLICT');}});assert.equal(conflict.status,409);
 access.authenticated=false;assert.equal((await call(body)).status,401);
});
test('gravação pelo perfil autenticado usa CAS e atualiza somente JSON fiscal e data',async()=>{
 let patch,filters=[],isUpdate=false;const row={configuracao_fiscal:{cst_ibs_cbs:'000'},regime_tributario:'simples_nacional',atualizado_em:'2026-11-17'};
 const chain={select(){return this;},eq(key,value){filters.push([key,value]);return this;},is(){return this;},update(value){patch=value;isUpdate=true;return this;},async maybeSingle(){return{data:isUpdate?{...row,...patch}:row,error:null};}};
 const client={from(table){assert.equal(table,'cadastros_perfil');return chain;}};
 const result=await saveCompanyFiscalDefaultsWithAdmin({client,companyId:company,values,version:defaultsVersion(row.configuracao_fiscal)});
 assert.deepEqual(Object.keys(patch).sort(),['atualizado_em','configuracao_fiscal']);assert.equal(patch.configuracao_fiscal.cst_ibs_cbs,'000');assert.equal(result.values.cst_pis,'08');assert.equal(filters.filter(([key,value])=>key==='empresa_id'&&value===company).length,2);assert.ok(filters.some(([key,value])=>key==='configuracao_fiscal'&&value===JSON.stringify(row.configuracao_fiscal)));
});
test('listas aceitam vazio sem escolher códigos e recusam CFOP de destino errado',()=>{
 assert.equal(validateCompanyFiscalDefaults(normalizeCompanyFiscalDefaults()),'');assert.equal(validateCompanyFiscalDefaults(values),'');assert.ok(validateCompanyFiscalDefaults({...values,cfop_venda_interna:'6102'}));assert.ok(validateCompanyFiscalDefaults({...values,cst_pis:'44'}));
});
