import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('falha de cadastro comercial fica no formulário, sem toast oculto pelo modal', async () => {
  const source = await readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
  const customerResponse = source.slice(source.indexOf('const customerSave ='), source.indexOf('const supplierSnapshot ='));
  const supplierResponse = source.slice(source.indexOf('const supplierSave ='), source.indexOf("if (event.data?.type === OPERATION_SAVE_RESPONSE_TYPE"));

  assert.match(source, /onClose\(\);\s*return;\s*}\s*setError\(result\.message \|\| 'Não foi possível salvar o cliente/);
  assert.match(source, /onClose\(\);\s*return;\s*}\s*setError\(result\.message \|\| 'Não foi possível salvar o fornecedor/);
  assert.doesNotMatch(source, /onNotify\(result\.message \|\| '(?:Cliente|Fornecedor) salvo/);
  assert.doesNotMatch(customerResponse, /setToast\(result\.message\)/);
  assert.doesNotMatch(supplierResponse, /setToast\(result\.message\)/);
  assert.doesNotMatch(source.slice(source.indexOf('const saveClient ='), source.indexOf('const saveCatalogItem =')), /Cadastrando (?:fornecedor|cliente)|setToast\(result\.message\)/);
});
