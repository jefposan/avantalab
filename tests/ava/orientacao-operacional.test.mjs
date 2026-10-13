import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guiaOperacionalAva } from '../../app/lib/ava-conhecimento.ts';
import { AVA_SYSTEM_PROMPT } from '../../supabase/functions/_shared/ava-system-prompt.ts';

test('Web prioriza a sequência real e separa tipos de despesa do pagamento', () => {
  const guia = guiaOperacionalAva('gestao-web');
  assert.match(guia, /clique no mês desejado → Despesas → preencha dia, tipo de despesa, descrição e valor → OK/);
  assert.ok(guia.indexOf('FLUXOS ESSENCIAIS') < guia.indexOf('Catálogo Magalu'));
  assert.match(guia, /Cadastrar Despesas em Ajustes cadastra tipos e categorias/);
});
test('Ava corrige orientação errada sem defender a resposta nem concordar cegamente', () => {
  assert.match(AVA_SYSTEM_PROMPT, /Nunca defenda uma instrução inventada/);
  assert.match(AVA_SYSTEM_PROMPT, /não concorde sem verificar/);
  for (const ambiente of ['gestao-web', 'gestao-mobile', 'vendas']) {
    assert.match(guiaOperacionalAva(ambiente), /Não defenda o erro como "forma geral"/);
  }
});
test('Mobile e Vendas têm fluxos próprios sem copiar o lançamento da Web', () => {
  assert.match(guiaOperacionalAva('gestao-mobile'), /Lançar na barra inferior → Despesa/);
  assert.match(guiaOperacionalAva('gestao-mobile'), /Salvar despesa/);
  assert.match(guiaOperacionalAva('vendas'), /Pedidos → Novo pedido/);
  assert.match(guiaOperacionalAva('vendas'), /Não ofereça lançamento de despesa da Gestão/);
});
test('contingência recebe o guia e chamada legada identifica Mobile', () => {
  const route = readFileSync(new URL('../../app/api/ava/chat/route.ts', import.meta.url), 'utf8');
  assert.match(route, /const guia = guiaOperacionalAva\(ambiente\)/);
  assert.match(route, /contexto: contextoFallback/);
  const mobile = readFileSync(new URL('../../public/mobile-app.js', import.meta.url), 'utf8');
  assert.match(mobile, /contexto: montarContextoIA\(\),\s+ambiente: 'gestao-mobile'/);
});
