import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ler = path => readFileSync(`app/${path}`, 'utf8');

test('acesso direto e preparação dos dados reutilizam o mesmo card de módulos', () => {
  const transicao = ler('components/TransicaoNavegacaoInterna.tsx');
  assert.match(transicao, /<CarregamentoDadosModulo ativo/);
  assert.doesNotMatch(transicao, /animate-pulse|TelaCarregandoAcesso/);
  for (const path of ['custos/CustosClient.tsx', 'projetos/ProjetosClient.tsx', 'recebimentos/RecebimentosPaginaClient.tsx', 'marketplaces/MarketplacesClient.tsx']) {
    const fonte = ler(path);
    assert.match(fonte, /<TransicaoNavegacaoInterna destino=/);
    assert.doesNotMatch(fonte, /TelaCarregandoAcesso/);
  }
  const card = ler('components/CarregamentoDadosModulo.tsx');
  assert.match(card, /role="status"/);
  assert.match(card, /aria-busy="true"/);
  assert.match(card, /<LoadingPontos/);
  assert.match(card, /temaEscuro/);
  assert.match(card, /bg-white\/35/);
  assert.doesNotMatch(card, /bg-slate-50\/95|bg-slate-950\/90/);
  assert.doesNotMatch(ler('recebimentos/RecebimentosClient.tsx'), /carregando \? <section className=\{styles\.esqueletoPainel\}/);
  assert.doesNotMatch(ler('projetos/ProjetosClient.tsx'), /!loaded \? <section/);
});

test('confirmar acesso em Operações de Campo não recria repositório da mesma empresa', () => {
  const fonte = ler('recebimentos/RecebimentosPaginaClient.tsx');
  assert.match(fonte, /const empresaDoRepo = acesso\?\.empresa\.id/);
  assert.match(fonte, /criarRepoSupabase\(empresaDoRepo\) : null, \[empresaDoRepo\]/);
  assert.doesNotMatch(fonte, /criarRepoSupabase\(acesso\.empresa\.id\) : null, \[acesso\]/);
});

test('Custos mantém atualização de permissões silenciosa apenas para a empresa já preparada', () => {
  const fonte = ler('custos/CustosWorkspace.tsx');
  assert.match(fonte, /recarregar\(empresaProntaRef\.current === companyId\)/);
  assert.match(fonte, /empresaProntaRef\.current = companyId; setCarregando\(false\)/);
  assert.match(fonte, /if \(!silencioso\) setCarregando\(true\)/);
});
