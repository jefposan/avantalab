import assert from 'node:assert/strict';
import { test } from 'node:test';

import { criarHrefModuloEmbutido } from '../../app/lib/navegacao-modulos.ts';

test('navegação embutida não transporta logotipo em data URI pela URL', () => {
  const windowAnterior = globalThis.window;
  globalThis.window = { location: { origin: 'https://avantalab.com.br' } };

  try {
    const href = criarHrefModuloEmbutido('/marketplaces', {
      destino: 'marketplaces',
      empresaId: 'baa8c115-634a-41d3-9e2a-8666dce11454',
      empresa: {
        nome: 'Empresa de teste',
        corPrimaria: '#003E73',
        temaEscuro: false,
        logoUrl: `data:image/png;base64,${'A'.repeat(100_000)}`,
      },
      perfil: 'gestor_master',
      podeEditar: true,
      podeGerenciarModulo: true,
    });
    const url = new URL(href, 'https://avantalab.com.br');
    const contexto = JSON.parse(url.searchParams.get('__avctx'));

    assert.equal(url.pathname, '/marketplaces');
    assert.equal(url.searchParams.get('empresaId'), 'baa8c115-634a-41d3-9e2a-8666dce11454');
    assert.equal(contexto.empresa.nome, 'Empresa de teste');
    assert.equal(contexto.empresa.logoUrl, undefined);
    assert.ok(href.length < 1_000, `URL inesperadamente longa: ${href.length}`);
  } finally {
    globalThis.window = windowAnterior;
  }
});
