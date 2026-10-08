import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const raiz = new URL('../../', import.meta.url);

async function ler(caminho) {
  return readFile(new URL(caminho, raiz), 'utf8');
}

const [navegacao, gestao, custos, projetos, recebimentos, marketplaces] = await Promise.all([
  ler('app/lib/navegacao-modulos.ts'),
  ler('app/gestao/page.tsx'),
  ler('app/custos/CustosClient.tsx'),
  ler('app/projetos/ProjetosClient.tsx'),
  ler('app/recebimentos/RecebimentosPaginaClient.tsx'),
  ler('app/marketplaces/MarketplacesClient.tsx'),
]);

test('contexto interno permanece na aba e é apagado no logout', () => {
  assert.match(navegacao, /const DURACAO_CONTEXTO_MS = 30 \* 60 \* 1000/);
  assert.doesNotMatch(navegacao, /getItem\(CHAVE_CONTEXTO_NAVEGACAO\);\s*window\.sessionStorage\.removeItem/);
  assert.match(navegacao, /export function limparNavegacaoModulos\(\)/);
  assert.match(gestao, /const handleLogout = async \(\) => \{\s*logoutManualEmCursoRef\.current = true;\s*limparNavegacaoModulos\(\)/);
});

test('retorno revela o Dashboard antes de sincronizar o histórico', () => {
  const retorno = gestao.match(/const fecharModuloEmbutido = useCallback\(\(\) => \{([\s\S]*?)\n  \}, \[\]\);/)?.[1] || '';
  assert.ok(retorno.indexOf('setModuloEmbutido(null)') >= 0);
  assert.ok(retorno.indexOf('window.history.back()') > retorno.indexOf('setModuloEmbutido(null)'));
});

test('módulos pulam a validação visual redundante quando recebem contexto interno, mas recuperam a marca ausente', () => {
  assert.match(custos, /if \(contextoInicial\) return;\s*const \{ data \} = await supabase\.auth\.getSession\(\)/);
  assert.match(recebimentos, /if \(contextoInicial\?\.podeGerenciarModulo\) return;\s*const \{ data \} = await supabase\.auth\.getSession\(\)/);
  assert.match(projetos, /if \(contextoInicial\) \{[\s\S]*?\/api\/modulos\/projetos\/compartilhados[\s\S]*?return;\s*\}\s*const \[accessResponse/);
  assert.match(marketplaces, /async function loadIdentity\(\) \{[\s\S]*?if \(context\?\.empresa\.logoUrl\) return;/);
  assert.match(marketplaces, /const needsAccessValidation = !context;/);
  assert.match(marketplaces, /if \(!needsAccessValidation\) return;/);

  for (const fonte of [custos, projetos, recebimentos, marketplaces]) {
    assert.match(fonte, /\/api\/modulos\/acesso/);
  }
  assert.match(navegacao, /endpoints protegidos e políticas RLS continuam autorizando cada ação/);
});
