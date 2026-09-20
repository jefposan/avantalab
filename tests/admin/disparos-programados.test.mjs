import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  referenciaDisparo,
  usuarioElegivelParaDisparo,
} from '../../supabase/functions/_shared/disparos.ts';

const atividade = {
  primeiro_acesso_em: '2026-09-01T12:00:00.000Z',
  ultimo_acesso_em: '2026-09-10T12:00:00.000Z',
};

test('data programada só fica elegível depois do instante configurado', () => {
  const regra = { gatilho: 'data_programada', data_programada: '2026-09-20T15:00:00.000Z', intervalo_valor: null, intervalo_unidade: null };
  assert.equal(usuarioElegivelParaDisparo(regra, atividade, new Date('2026-09-20T14:59:59.000Z')), false);
  assert.equal(usuarioElegivelParaDisparo(regra, atividade, new Date('2026-09-20T15:00:00.000Z')), true);
});

test('gatilho após cadastro respeita horas, dias e semanas', () => {
  assert.equal(usuarioElegivelParaDisparo({ gatilho: 'apos_cadastro', data_programada: null, intervalo_valor: 48, intervalo_unidade: 'horas' }, atividade, new Date('2026-09-03T12:00:00.000Z')), true);
  assert.equal(usuarioElegivelParaDisparo({ gatilho: 'apos_cadastro', data_programada: null, intervalo_valor: 3, intervalo_unidade: 'dias' }, atividade, new Date('2026-09-03T23:59:59.000Z')), false);
  assert.equal(usuarioElegivelParaDisparo({ gatilho: 'apos_cadastro', data_programada: null, intervalo_valor: 1, intervalo_unidade: 'semanas' }, atividade, new Date('2026-09-08T12:00:00.000Z')), true);
});

test('inatividade usa o último acesso como referência e permite novo ciclo após retorno', () => {
  const regra = { gatilho: 'sem_acesso', data_programada: null, intervalo_valor: 7, intervalo_unidade: 'dias' };
  assert.equal(usuarioElegivelParaDisparo(regra, atividade, new Date('2026-09-17T12:00:00.000Z')), true);
  assert.equal(referenciaDisparo(regra, atividade), atividade.ultimo_acesso_em);
  const retorno = { ...atividade, ultimo_acesso_em: '2026-09-18T08:00:00.000Z' };
  assert.notEqual(referenciaDisparo(regra, retorno), referenciaDisparo(regra, atividade));
  assert.equal(usuarioElegivelParaDisparo(regra, retorno, new Date('2026-09-20T12:00:00.000Z')), false);
});

test('contrato inclui os dois aplicativos, processamento recorrente e inscrição própria do Vendas', async () => {
  const [migracao, painel, broadcast, vendasDb, push] = await Promise.all([
    readFile(new URL('../../supabase/migrations/20260919193000_disparos_multiplataforma_automaticos.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../app/admin/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../supabase/functions/broadcast/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sistema/supabase-client.js', import.meta.url), 'utf8'),
    readFile(new URL('../../supabase/functions/_shared/push.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(migracao, /'\*\/15 \* \* \* \*'/);
  assert.match(migracao, /'gestao', 'avantavendas'/);
  assert.match(painel, /Após um período sem acesso/);
  assert.match(painel, /Após o cadastro/);
  assert.match(broadcast, /aplicativo === "avantavendas"/);
  assert.match(vendasDb, /app_origem: 'avantavendas'/);
  assert.match(vendasDb, /registroNativo\?\.canal === 'fcm'/);
  assert.match(push, /FIREBASE_SERVICE_ACCOUNT_JSON_AVANTAVENDAS/);
  assert.match(push, /export async function enviarPushDetalhado/);
  assert.match(broadcast, /diagnostico = body\.diagnostico === true/);
  assert.match(broadcast, /idProvedor: resultado\.idProvedor/);
});

test('automações existentes podem ser editadas com validação no painel e na API', async () => {
  const [painel, rota] = await Promise.all([
    readFile(new URL('../../app/admin/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/admin-disparos/programacoes/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(painel, /iniciarEdicaoProgramacaoDisparo/);
  assert.match(painel, /Salvar alterações/);
  assert.match(painel, /dataProgramada: programacaoEditando\.gatilho/);
  assert.match(rota, /export async function PATCH/);
  assert.match(rota, /data_programada: gatilho === 'data_programada'/);
  assert.match(rota, /intervalo_valor: gatilho === 'data_programada'/);
});

test('disparo imediato permite todos ou um único usuário da plataforma', async () => {
  const [painel, rota, broadcast] = await Promise.all([
    readFile(new URL('../../app/admin/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/admin-disparos/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../supabase/functions/broadcast/index.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(painel, /id="disparo-destinatario"/);
  assert.match(painel, /Todos os usuários/);
  assert.match(painel, /usuarioId: broadcastDestinatarioId === 'todos' \? null : broadcastDestinatarioId/);
  assert.match(rota, /\.{3}\(usuarioId \? \{ usuariosIds: \[usuarioId\] \} : \{\}\)/);
  assert.match(rota, /destinatarioEncontrado = !usuarioId \|\| Number\(result\.usuarios \|\| 0\) === 1/);
  assert.match(broadcast, /userIds\.filter\(\(userId\) => usuariosSolicitados\.has\(String\(userId\)\)\)/);
});
