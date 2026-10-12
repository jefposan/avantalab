import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { accountDisplayName, accountReferenceDetail, validateAccountLabel, preserveNewerAccountLabel, connectedAccountForIdentification } from '../../app/marketplaces/account-identification.ts';

test('solicitação após conexão usa apenas o ID confirmado no conjunto autenticado da empresa', () => {
  const account={id:'33333333-3333-4333-8333-333333333333',status:'connected'};
  assert.equal(connectedAccountForIdentification([account],account.id),account);
  assert.equal(connectedAccountForIdentification([account],'22222222-2222-4222-8222-222222222222'),undefined);
  assert.equal(connectedAccountForIdentification([account],'invalid'),undefined);
  assert.equal(connectedAccountForIdentification([account],null),undefined);
  assert.equal(connectedAccountForIdentification([{...account,status:'disconnected'}],account.id),undefined);
});

test('nome no seletor sem campo duplicado; lápis antecede renovar e edição explícita fica dentro da conta', () => {
  const read = path => readFileSync(new URL(`../../${path}`,import.meta.url),'utf8');
  const listing=read('app/marketplaces/NewListing.tsx');
  const client=read('app/marketplaces/MarketplacesClient.tsx');
  const editor=read('app/marketplaces/AccountIdentification.tsx');
  assert.doesNotMatch(listing,/aria-label="Identificação da conta"|styles.accountIdentification/);
  assert.match(listing,/label="Publicar na conta"[^\n]*name: accountDisplayName\(account\), detail: accountReferenceDetail\(account\)/);
  assert.doesNotMatch(listing,/<AccountIdentification|conexoes\/identificacao/);
  assert.ok(client.indexOf('id={`edit-account-${account.id}`}')<client.indexOf('id={`renew-account-${account.id}`}'));
  assert.match(client,/<Icon name="edit" size=\{18\}/);
  assert.match(client,/id=\{`account-identification-\$\{account.id\}`\}><AccountIdentification/);
  assert.match(client,/completeNewConnection\(data.connectionId\)/);
  assert.match(client,/if \(data.renewal\) return/);
  assert.match(editor,/onSubmit=/); assert.match(editor,/Salvar identificação/); assert.match(editor,/>Cancelar</);
  assert.doesNotMatch(editor,/onBlur=/);
  assert.match(editor,/event.key === 'Escape'/);
});

test('identificação aceita texto ou número sem perder zeros, mantém nome oficial e pode ser removida', () => {
  assert.equal(validateAccountLabel('  001  '), '001');
  assert.equal(validateAccountLabel('Loja Centro'), 'Loja Centro');
  assert.equal(validateAccountLabel(''), '');
  assert.throws(() => validateAccountLabel(1));
  assert.throws(() => validateAccountLabel('a'.repeat(81)));
  assert.throws(() => validateAccountLabel('loja\nnorte'));
  const account = { seller_name: 'CONTA_OFICIAL', seller_reference: '123', local_label: 'Loja Centro' };
  assert.equal(accountDisplayName(account), 'Loja Centro');
  assert.equal(accountReferenceDetail(account), 'CONTA_OFICIAL · ID 123');
  assert.equal(accountDisplayName({...account,local_label:''}), 'CONTA_OFICIAL');
  assert.equal(accountDisplayName({seller_reference:'123'}), 'Vendedor 123');
});

test('consulta antiga não substitui nome salvo; consulta nova e limpeza confirmada são aceitas', () => {
  const saved={id:'a',seller_reference:'123',local_label:'001',local_label_updated_at:'2026-10-12T21:00:00Z'};
  assert.equal(preserveNewerAccountLabel(saved,{id:'a',seller_reference:'123'}).local_label,'001');
  assert.equal(preserveNewerAccountLabel(saved,{...saved,local_label:'',local_label_updated_at:'2026-10-12T21:01:00Z'}).local_label,'');
});

test('tabela auxiliar mantém RLS, limita texto e impede vínculo com outra empresa', async () => {
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create table public.empresas(id uuid primary key);
      create table public.marketplace_connections(id uuid primary key,empresa_id uuid not null references empresas(id));
      insert into empresas values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
      insert into marketplace_connections values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111');`);
    const sql=readFileSync(new URL('../../supabase/migrations/20261012190000_marketplace_connection_labels.sql',import.meta.url),'utf8');
    await db.exec(sql);
    await db.query("insert into marketplace_connection_labels(connection_id,empresa_id,local_label) values($1,$2,$3)",['33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','001']);
    await assert.rejects(db.query("update marketplace_connection_labels set empresa_id=$1",['22222222-2222-4222-8222-222222222222']));
    await assert.rejects(db.query("update marketplace_connection_labels set local_label=$1",['a'.repeat(81)]));
    const {rows}=await db.query("select relrowsecurity as rls,has_table_privilege('authenticated','marketplace_connection_labels','SELECT') as public_read,has_table_privilege('service_role','marketplace_connection_labels','UPDATE') as server_write from pg_class where oid='marketplace_connection_labels'::regclass");
    assert.deepEqual(rows[0],{rls:true,public_read:false,server_write:true});
    assert.equal((await db.query('select count(*)::int as total from marketplace_connections')).rows[0].total,1);
  } finally { await db.close(); }
});
