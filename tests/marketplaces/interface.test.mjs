import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const client = read('app/marketplaces/MarketplacesClient.tsx');
const listings = read('app/marketplaces/Anunciados.tsx');
const css = read('app/marketplaces/marketplaces.module.css');

test('marketplaces and costs reuse the same company header and return action', () => {
  assert.match(client, /<ModuloHeader empresa=\{empresa\} onBack=\{voltar\}/);
  assert.match(read('app/custos/CustosClient.tsx'), /<ModuloHeader empresa=\{access.empresa\}/);
  assert.match(client, /solicitarRetornoAoModuloHospedeiro/);
  assert.match(client, /moduloId=marketplaces/);
  assert.match(read('app/components/ModuloHeader.tsx'), /app\/custos\/custos.module.css/);
});

test('grid panels fill their track without auto margins, sharing the content wrapper', () => {
  assert.match(client, /<div className=\{styles.content\}>/);
  assert.match(css, /\.grid > \.panel \{ margin: 0; width: 100%; min-width: 0;/);
  assert.doesNotMatch(css, /margin-inline: auto/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.grid \{ grid-template-columns: 1fr;/);
});

test('static notices are removed without disguising validation or hiding important errors', () => {
  assert.doesNotMatch(client, /OAuth|PKCE|styles.webOnly|styles.security|styles.flow|Nesta etapa/);
  assert.doesNotMatch(listings, /Para adicionar ou reconectar|Atualização automática enquanto|Anúncios da conta selecionada, inclusive/);
  assert.match(client, /'Validar e preparar'/);
  assert.match(client, /Nenhum anúncio foi publicado/);
  assert.match(listings, /role="alert"/);
  assert.match(listings, /ModalConfirmacao/);
  assert.match(listings, /Esta ação encerra definitivamente/);
  assert.match(listings, /Frete vendedor estimado/);
});
