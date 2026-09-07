import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../../app/api/modulos/vendas/fiscal/rules/route.ts', import.meta.url);
const labUrl = new URL('../../app/vendas/VendasIntegrado.tsx', import.meta.url);

test('rota de regras fiscais delega ao handler autenticado e validado', async () => {
  const [source, handler] = await Promise.all([
    readFile(routeUrl, 'utf8'),
    readFile('app/vendas/lib/server/commercial-fiscal-rules-http.mjs', 'utf8'),
  ]);
  assert.match(source, /handleCommercialFiscalRulesRequest/);
  assert.match(handler, /expectedVersion/);
  assert.match(handler, /taxReformReviewConfirmed/);
  assert.doesNotMatch(source, /service_role|FISCAL_DATABASE_URL|SUPABASE_SERVICE_ROLE/);
});

test('laboratório encaminha publicação pelo pai sem entregar token ao iframe', async () => {
  const source = await readFile(labUrl, 'utf8');
  assert.match(source, /AVANTALAB_VENDAS_FISCAL_RULES_SAVE_REQUEST_V1/);
  assert.match(source, /\/api\/modulos\/vendas\/fiscal\/rules/);
  assert.doesNotMatch(source, /postMessage\([^\n]*access_token/);
});

test('falha do catálogo não esconde os ajustes fiscais do módulo', async () => {
  const source = await readFile(labUrl, 'utf8');
  assert.match(source, /if \(!perfilId\) return;/);
  assert.match(source, /carregarDocumentosFiscais\(perfilId, token\)/);
  assert.match(source, /carregarPermissoes\(perfilId\)/);
  assert.match(source, /carregarRegrasFiscais\(perfilId\)/);
  assert.match(source, /!perfilPronto \?[^]*: <iframe/);
  assert.match(source, /setPerfilCadastro\(perfil\.cadastro\)[^]*fetch\(`\/api\/modulos\/vendas\/catalogo/);
  assert.doesNotMatch(source, /!catalogo \?[^]*: <iframe/);
});
