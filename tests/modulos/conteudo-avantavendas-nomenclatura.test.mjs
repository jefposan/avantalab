import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Conteúdo AvantaVendas não se confunde com Vendas e Serviços', async () => {
  const [registro, gestao, modal, mobile, migracao] = await Promise.all([
    readFile('app/lib/modulos-registro.ts', 'utf8'),
    readFile('app/gestao/page.tsx', 'utf8'),
    readFile('app/components/NovidadesVendasModal.tsx', 'utf8'),
    readFile('app/mobile/conteudo-vendas/VendasMobileConteudoClient.tsx', 'utf8'),
    readFile('supabase/migrations/20260906203000_renomear_conteudo_avantavendas.sql', 'utf8'),
  ]);

  assert.match(registro, /id: 'vendas_mobile'[\s\S]*nome: 'Conteúdo AvantaVendas'/);
  assert.match(registro, /id: 'vendas'[\s\S]*nome: 'Vendas e Serviços'/);
  assert.match(gestao, />\s*Conteúdo AvantaVendas\s*<\/button>/);
  assert.match(modal, />Conteúdo AvantaVendas<\/p>/);
  assert.match(mobile, />Conteúdo AvantaVendas<\/p>/);
  assert.match(migracao, /where id = 'vendas_mobile'/);
  assert.match(migracao, /nome = 'Conteúdo AvantaVendas'/);
});
