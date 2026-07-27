import assert from 'node:assert/strict';
import test from 'node:test';
import { buscarContaAuthPorEmail } from '../../app/lib/usuario-disponibilidade-servidor.ts';

function clienteComPaginas(paginas) {
  const consultadas = [];
  return {
    consultadas,
    auth: {
      admin: {
        async listUsers({ page }) {
          consultadas.push(page);
          return {
            data: { users: paginas[page - 1] || [] },
            error: null,
          };
        },
      },
    },
  };
}

test('consulta todas as páginas do Auth para validar o e-mail', async () => {
  const primeiraPagina = Array.from({ length: 1000 }, (_, indice) => ({
    id: `usuario-${indice}`,
    email: `usuario-${indice}@empresa.com.br`,
  }));
  const cliente = clienteComPaginas([
    primeiraPagina,
    [{ id: 'alvo', email: 'Disponivel@Empresa.com.br' }],
  ]);

  const encontrado = await buscarContaAuthPorEmail(
    cliente,
    ' disponivel@empresa.com.br '
  );

  assert.equal(encontrado?.id, 'alvo');
  assert.deepEqual(cliente.consultadas, [1, 2]);
});

test('ignora a própria conta durante a edição', async () => {
  const cliente = clienteComPaginas([
    [{ id: 'usuario-atual', email: 'usuario@empresa.com.br' }],
  ]);

  const encontrado = await buscarContaAuthPorEmail(
    cliente,
    'usuario@empresa.com.br',
    'usuario-atual'
  );

  assert.equal(encontrado, null);
});

test('interrompe a validação quando o Auth falha', async () => {
  const cliente = {
    auth: {
      admin: {
        async listUsers() {
          return { data: null, error: { message: 'falha de consulta' } };
        },
      },
    },
  };

  await assert.rejects(
    buscarContaAuthPorEmail(cliente, 'usuario@empresa.com.br'),
    /falha de consulta/
  );
});
