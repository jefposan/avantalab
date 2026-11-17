import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {novoProduto} from '../../app/custos/types.ts';

test('produto e serviço novos começam disponíveis sem alterar objetos já cadastrados',()=>{
 for(const type of ['produto','servico'])assert.equal(novoProduto(type,'catalog').disponivel_catalogo,true);
 const existing={...novoProduto('produto','catalog'),id:'existing',disponivel_catalogo:false};novoProduto('produto','catalog');assert.equal(existing.disponivel_catalogo,false);
});

test('SQL real: imports criam disponíveis, preservam indisponibilidade em edição e respeitam Não explícito',async()=>{
 const db=new PGlite(),company='10000000-0000-4000-8000-000000000001',catalog='20000000-0000-4000-8000-000000000001';
 const texts='sku tipo_item nome marca categoria descricao unidade codigo_barras ncm cest origem_mercadoria unidade_tributavel cfop_padrao cst csosn cst_pis cst_cofins cst_ibs_cbs classificacao_ibs_cbs codigo_tributacao_nacional codigo_tributacao_municipal nbs item_lc116 municipio_prestacao imagem_url'.split(' ').map(c=>`${c} text`).join(',');
 try{
  await db.exec(`create schema auth;create function auth.uid() returns uuid language sql as $$select '${company}'::uuid$$;
   create function usuario_area_rpc_restricao(text,jsonb) returns boolean language sql as $$select true$$;
   create function custos_pode_acessar_empresa(uuid,boolean) returns boolean language sql as $$select $1='${company}'::uuid$$;
   create table vendas_mobile_catalogos(id uuid primary key default gen_random_uuid(),empresa_id uuid,nome text,codigo text,ativo boolean default true,publicado_avantavendas boolean default false);
   create table vendas_mobile_catalogo_produtos(id uuid primary key default gen_random_uuid(),catalogo_id uuid,${texts},preco_custo numeric,preco_venda numeric,aliquota_iss numeric,ativo boolean,disponivel_catalogo boolean,habilitado_fiscal boolean,fornecedor_id uuid,atualizado_em timestamptz);
   create table custos_tabelas_preco(id uuid,empresa_id uuid,codigo text,padrao boolean);
   create table custos_importacoes_produtos_precos(empresa_id uuid,arquivo_nome text,exportado_em timestamptz,produtos_criados int,produtos_atualizados int,precos_atualizados int);
   create table vendas_fornecedores(id uuid,empresa_id uuid,codigo int,situacao text);
   create function custos_salvar_catalogo_empresa_rpc(uuid,uuid,text,text) returns vendas_mobile_catalogos language plpgsql as $$declare c vendas_mobile_catalogos;begin insert into vendas_mobile_catalogos(empresa_id,nome,codigo) values($1,$3,$4) returning * into c;return c;end$$;
   insert into vendas_mobile_catalogos(id,empresa_id,nome,codigo) values('${catalog}','${company}','Local','LOCAL');`);
  await db.exec(readFileSync('supabase/migrations/20261117033000_produtos_disponiveis_por_padrao.sql','utf8'));
  const apply=products=>db.query('select custos_importar_produtos_precos_rpc($1,$2,$3,null,$4::jsonb,\'[]\'::jsonb,true)',[company,catalog,'teste.xlsx',JSON.stringify(products)]);
  await apply([{sku:'A',nome:'Novo',preco_venda:0},{sku:'B',nome:'Indisponível',disponivel_catalogo:false}]);
  assert.deepEqual((await db.query('select sku,disponivel_catalogo from vendas_mobile_catalogo_produtos order by sku')).rows,[{sku:'A',disponivel_catalogo:true},{sku:'B',disponivel_catalogo:false}]);
  await apply([{sku:'B',nome:'Editado',preco_venda:10}]);assert.equal((await db.query("select disponivel_catalogo from vendas_mobile_catalogo_produtos where sku='B'")).rows[0].disponivel_catalogo,false);
  await apply([{sku:'A',nome:'Escolha',disponivel_catalogo:false}]);assert.equal((await db.query("select disponivel_catalogo from vendas_mobile_catalogo_produtos where sku='A'")).rows[0].disponivel_catalogo,false);
  await db.query('select custos_criar_catalogo_com_produtos_rpc($1,$2,$3,$4::jsonb)',[company,'Importado','NOVO',JSON.stringify([{sku:'C',nome:'Sem preço'},{sku:'D',nome:'Escolha Não',disponivel_catalogo:false}])]);
  assert.deepEqual((await db.query("select sku,disponivel_catalogo from vendas_mobile_catalogo_produtos where sku in ('C','D') order by sku")).rows,[{sku:'C',disponivel_catalogo:true},{sku:'D',disponivel_catalogo:false}]);
  assert.equal((await db.query('select count(*)::int n from vendas_mobile_catalogos where publicado_avantavendas')).rows[0].n,0);
  await assert.rejects(db.query('select custos_importar_produtos_precos_rpc($1,$2,$3,null,$4::jsonb,\'[]\'::jsonb,true)',['30000000-0000-4000-8000-000000000001',catalog,'t.xlsx','[]']),/permissão/);
 }finally{await db.close();}
});
