import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { CAMPOS_EXCEL, camposPresentesExcel, limitarPatchExcel, agruparColunasRevisao } from '../../app/custos/excel-seletivo.ts';

test('colunas ausentes e campos técnicos nunca entram no patch; texto vazio e zero são preservados',()=>{
  const campos=camposPresentesExcel(['Código','Nome','Marca','Custo'],['marca']);
  assert.deepEqual(campos,['marca']);
  assert.deepEqual(limitarPatchExcel({id:'id',sku:'T001',nome:'identificação',marca:'',preco_custo:0,catalogo_id:'outro'},campos),{id:'id',sku:'T001',marca:''});
  assert.deepEqual(camposPresentesExcel(['Custo','Nome']),['nome','preco_custo']);
  assert.deepEqual(limitarPatchExcel({id:'id',preco_venda:null},['preco_venda']),{id:'id'});
  assert.deepEqual(limitarPatchExcel({id:'id',preco_venda:0},['preco_venda']),{id:'id',preco_venda:0});
  assert.equal(new Set(CAMPOS_EXCEL.map(([campo])=>campo)).size,CAMPOS_EXCEL.length);
});

test('fluxo seletivo conserva cabeçalhos técnicos, compatibilidade v2, prévia e nova tentativa real',()=>{
  const source=readFileSync('app/custos/TabelasPrecosView.tsx','utf8');
  assert.match(source,/Selecionar colunas da importação/);
  assert.match(source,/revisarImportacaoSelecionada/);
  assert.match(source,/Não importar/);
  assert.match(source,/destinosPrecosImportacao/);
  assert.match(source,/Escolher colunas do Excel/);
  assert.match(source,/AVANTALAB-CUSTOS-3/);
  assert.match(source,/AVANTALAB-CUSTOS-2/);
  assert.match(source,/limitarPatchExcel/);
  assert.match(source,/ultimoArquivo.current\) void lerArquivo\(ultimoArquivo.current\)/);
  assert.match(source,/<RevisaoImportacao colunas=\{importacao.colunas\}/);
  assert.match(source,/indiceAliquotaIss >= 0 \? XLSX.utils.encode_col\(indiceAliquotaIss\) : null/);
  assert.match(source,/name === 'Metadados' \? 2 : 0/);
});

test('revisão agrupa colunas sem repetir prefixo de preço e mantém nomes distintos',()=>{
  assert.deepEqual(agruparColunasRevisao(['Nome','Preço padrão','Preço · ATACADO','Custo','Preço · ATACADO','Preço · ATACADO (2)']),{cadastro:['Nome','Custo'],precos:['Preço padrão','ATACADO','ATACADO (2)']});
  const source=readFileSync('app/custos/RevisaoImportacao.tsx','utf8');
  assert.match(source,/grupos.cadastro/); assert.match(source,/grupos.precos/);
  assert.match(source,/resumo.produtos_atualizados.toLocaleString\('pt-BR'\)/);
  assert.match(source,/resumo.precos_atualizados.toLocaleString\('pt-BR'\)/);
  assert.match(source,/dados e preço padrão/); assert.match(source,/tabelas adicionais/);
  assert.match(source,/disabled=\{processando\}/);
  assert.match(source,/<AvisoFormulario/);
  assert.doesNotMatch(source,/novos produtos|colunas.join/);
});

test('seleção em lote tem escopos claros e expansão usa o componente oficial',()=>{
  const source=readFileSync('app/custos/TabelasPrecosView.tsx','utf8');
  assert.match(source,/Selecionar todos os campos do cadastro/);
  assert.match(source,/Selecionar todas as tabelas de preços/);
  assert.match(source,/Exibir mais campos do cadastro para seleção/);
  assert.match(source,/<BotaoExpandirCard variante="painel" modo="lista" somenteIcone/);
  assert.match(source,/hidden=\{!camposExportacaoAbertos\}/);
  assert.match(source,/todosCamposCadastro \? atuais.filter\(\(campo\) => campo === 'preco_venda'\)/);
  assert.match(source,/todasTabelasExportacao \? atuais.filter\(\(campo\) => campo !== 'preco_venda'\)/);
});

test('PostgreSQL: atualização parcial multicatálogo, preço isolado, empresa, concorrência e atomicidade',async()=>{
  const db=new PGlite();
  const empresa='10000000-0000-4000-8000-000000000001';
  const outro='10000000-0000-4000-8000-000000000002';
  const c1='20000000-0000-4000-8000-000000000001',c2='20000000-0000-4000-8000-000000000002',c3='20000000-0000-4000-8000-000000000003';
  const p1='30000000-0000-4000-8000-000000000001',p2='30000000-0000-4000-8000-000000000002',p3='30000000-0000-4000-8000-000000000003';
  const tabela='40000000-0000-4000-8000-000000000001',padrao='40000000-0000-4000-8000-000000000002';
  const data='2026-11-01T00:00:00Z',exportado='2026-11-18T00:00:00Z';
  const row=(id,patch={})=>({id,sku:'T001',atualizado_em:data,...patch});
  const preco=(id,valor)=>({produto_id:id,sku:'T001',tabela_codigo:'ATACADO',preco:valor});
  const rpc=(produtos,precos=[],aplicar=false)=>db.query('select custos_importar_produtos_precos_seletivo_rpc($1,$2,$3,$4,$5,$6,$7) resultado',[empresa,c1,'teste.xlsx',exportado,JSON.stringify(produtos),JSON.stringify(precos),aplicar]);
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create function auth.uid() returns uuid language sql as 'select null::uuid';
      create function custos_pode_acessar_empresa(uuid,boolean) returns boolean language sql as 'select true';
      create function usuario_area_rpc_restricao(text,jsonb) returns boolean language sql as 'select true';
      create table vendas_mobile_catalogos(id uuid primary key,empresa_id uuid,excluido_em timestamptz);
      create table vendas_mobile_catalogo_produtos(id uuid primary key,catalogo_id uuid,sku text,nome text,tipo_item text,marca text,descricao text,preco_custo numeric,preco_venda numeric,aliquota_iss numeric,ativo boolean,disponivel_catalogo boolean,excluido_em timestamptz,atualizado_em timestamptz);
      create table custos_tabelas_preco(id uuid primary key,empresa_id uuid,codigo text,nome text,padrao boolean);
      create table custos_tabela_preco_itens(tabela_preco_id uuid,produto_id uuid,preco numeric,atualizado_em timestamptz default now(),unique(tabela_preco_id,produto_id));
      create table custos_tabela_preco_historico(empresa_id uuid,tabela_preco_id uuid,produto_id uuid,preco_anterior numeric,preco_novo numeric,origem text);
      create table custos_importacoes_produtos_precos(empresa_id uuid,arquivo_nome text,exportado_em timestamptz,produtos_criados int,produtos_atualizados int,precos_atualizados int);
      insert into vendas_mobile_catalogos values('${c1}','${empresa}',null),('${c2}','${empresa}',null),('${c3}','${outro}',null);
      insert into vendas_mobile_catalogo_produtos values
      ('${p1}','${c1}','T001','Primeiro','produto','Marca','Descrição',5,10,0,true,true,null,'${data}'),
      ('${p2}','${c2}','T001','Segundo',null,'Marca','Descrição',null,20,null,true,true,null,'${data}'),
      ('${p3}','${c3}','T001','Outro','produto','Marca','Descrição',7,20,0,true,true,null,'${data}');
      insert into custos_tabelas_preco values('${tabela}','${empresa}','ATACADO','Atacado',false),('${padrao}','${empresa}','PADRAO','Padrão',true);`);
    await db.exec(readFileSync('supabase/migrations/20261119010000_custos_excel_seletivo_multicatalogo.sql','utf8'));
    const antes=(await db.query('select * from vendas_mobile_catalogo_produtos order by id')).rows;
    assert.equal((await rpc([row(p1),row(p2)],[preco(p1,0),preco(p2,15)])).rows[0].resultado.precos_atualizados,2);
    assert.deepEqual((await db.query('select * from vendas_mobile_catalogo_produtos order by id')).rows,antes);
    assert.equal((await db.query('select count(*)::int n from custos_tabela_preco_itens')).rows[0].n,0);
    await rpc([row(p1),row(p2)],[preco(p1,0),preco(p2,15)],true);
    assert.deepEqual((await db.query('select * from vendas_mobile_catalogo_produtos order by id')).rows,antes);
    assert.deepEqual((await db.query('select preco::float from custos_tabela_preco_itens order by produto_id')).rows.map(r=>r.preco),[0,15]);
    await rpc([row(p1)],[preco(p1,9)],true);
    assert.equal(Number((await db.query('select preco from custos_tabela_preco_itens where produto_id=$1',[p1])).rows[0].preco),9);
    await assert.rejects(rpc([row(p3)],[],true),/não localizado/);
    await assert.rejects(rpc([row(p1,{catalogo_id:c2})]),/não permitidos/);
    await assert.rejects(rpc([row(p1),row(p1)]),/IDs de produto repetidos/);
    await assert.rejects(rpc([row(p1,{sku:'ALTERADO'})]),/código.*alterado/);
    await assert.rejects(rpc([row(p1,{preco_custo:-1})]),/Confira valores/);
    await assert.rejects(rpc([row(p1,{marca:'Não salvar'})],[{...preco(p1,9),tabela_codigo:'INEXISTENTE'}],true),/não localizada/);
    assert.equal((await db.query('select marca from vendas_mobile_catalogo_produtos where id=$1',[p1])).rows[0].marca,'Marca');
    await rpc([row(p1,{marca:'',preco_venda:12}),row(p2,{descricao:'Nova'})],[],true);
    const depois=(await db.query('select * from vendas_mobile_catalogo_produtos order by id')).rows;
    assert.equal(depois[0].marca,''); assert.equal(Number(depois[0].preco_venda),12);
    assert.equal(Number(depois[0].preco_custo),5); assert.equal(depois[0].catalogo_id,c1);
    assert.equal(depois[1].descricao,'Nova'); assert.equal(depois[1].catalogo_id,c2);
    assert.equal((await db.query('select count(*)::int n from custos_tabela_preco_historico')).rows[0].n,4);
    await rpc([row(p1,{preco_venda:14})],[],true);
    assert.equal(Number((await db.query('select preco_venda from vendas_mobile_catalogo_produtos where id=$1',[p1])).rows[0].preco_venda),14);
    assert.equal((await db.query('select marca from vendas_mobile_catalogo_produtos where id=$1',[p1])).rows[0].marca,'');
    await db.exec(`create or replace function custos_pode_acessar_empresa(uuid,boolean) returns boolean language sql as 'select false';`);
    await assert.rejects(rpc([row(p1)]),/Sem permissão/);
  } finally { await db.close(); }
});
