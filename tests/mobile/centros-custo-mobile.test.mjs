import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const mobile = readFileSync('public/mobile-app.js', 'utf8');

test('a configuração de centros de custo é compartilhada com a Gestão Web', () => {
  assert.match(mobile, /select\('duplicados_ativo, centros_custo_ativo'\)/);
  assert.match(mobile, /fetch\('\/api\/centros-custo\/configurar'/);
  assert.match(mobile, /body: JSON\.stringify\(\{ empresaId: empresaId, ativo: proximo \}\)/);
  assert.match(mobile, /function sincronizarCentrosCustoMobile\(\)/);
  assert.match(mobile, /function centrosCustoPermitidosPeloPlanoMobile\(\)/);
  assert.match(mobile, /table: 'configuracoes', filter: 'empresa_id=eq.' \+ empresaId/);
  assert.match(mobile, /table: 'centros_custo', filter: 'empresa_id=eq.' \+ empresaId/);
  assert.match(mobile, /function \(\) \{ sincronizarCentrosCustoMobile\(\); \}/);
});

test('o menu e a gestão de centros só aparecem quando o recurso está ativo', () => {
  assert.match(mobile, /state\.centrosCustoAtivo && podeGerenciarUsuarios\(\)/);
  assert.match(mobile, /menu-centros-custo/);
  assert.match(mobile, /function centrosCustoMenuHtml\(\)/);
  assert.match(mobile, /centroCustoExclusao/);
  assert.match(mobile, /excluir_centro_custo_com_lancamentos_rpc/);
});

test('novos lançamentos usam o centro ativo escolhido no cabeçalho', () => {
  assert.match(mobile, /Centro de custo<\/span><select id="lancamento-centro-custo"/);
  assert.match(mobile, /bindChange\('lancamento-centro-custo'/);
  assert.match(mobile, /centro_custo_id: centroCustoId/);
  assert.match(mobile, /!ehFutura && !state\.centrosCustoAtivo/);
});

test('o centro escolhido na pílula de perfil define o contexto financeiro mobile', () => {
  assert.match(mobile, /id="perfil-centro-custo"/);
  assert.match(mobile, /<option value="".*>Todos<\/option>/);
  assert.match(mobile, /centroCustoTodosSelecionado/);
  assert.match(mobile, /function trocarCentroCustoGlobalMobile\(id\)/);
  assert.match(mobile, /bindChange\('perfil-centro-custo'/);
  assert.match(mobile, /trocarCentroCustoGlobalMobile\(this\.value \|\| ''\)/);
  assert.match(mobile, /function lancamentosDoCentroCustoAtualMobile\(\)/);
  assert.match(mobile, /function entradasDoCentroCustoAtualMobile\(\)/);
  assert.match(mobile, /centroCustoId: item\.centro_custo_id/);
  assert.match(mobile, /state\.centrosCustoAtivo \? receitasNaoPrevistas/);
});

test('Todos exibe o consolidado e novos registros continuam exigindo um centro específico', () => {
  assert.match(mobile, /if \(!state\.centrosCustoAtivo \|\| state\.centroCustoTodosSelecionado\) return true;/);
  assert.match(mobile, /if \(state\.centrosCustoAtivo && state\.centroCustoTodosSelecionado\)/);
  assert.match(mobile, /Selecione um centro de custo específico para cadastrar a despesa fixa/);
});

test('o rótulo de centro acompanha a largura da escolha ativa na pílula', () => {
  assert.match(mobile, /var larguraSeletor = Math\.max\(58, Math\.min\(104, 24 \+ Array\.from\(centroSelecionado\)\.length \* 8\)\);/);
  assert.match(mobile, /style="width:' \+ larguraSeletor \+ 'px"/);
});

test('despesas fixas seguem o centro de custo ativo', () => {
  assert.match(mobile, /consultaRecorrencias = consultaRecorrencias\.eq\('centro_custo_id', state\.centroCustoSelecionadoId\)/);
  assert.match(mobile, /centro_custo_id: state\.centrosCustoAtivo \? state\.centroCustoSelecionadoId : null/);
});

test('edição de centro mantém ações alinhadas e os seletores compactos', () => {
  assert.match(mobile, /flex items-start gap-2 rounded-xl border/);
  assert.match(mobile, /mt-2 text-\[10px\] font-bold uppercase leading-none/);
  assert.match(mobile, /var seletorMesLancamento/);
  assert.match(mobile, /id="lancamento-centro-custo" aria-label="Centro de custo do lançamento" style="font-size:11px !important;line-height:1 !important"/);
  assert.match(mobile, /Mês<\/span>' \+\n\s*'<div class="flex h-8 w-full items-center rounded-lg border border-white\/30 bg-white/);
  assert.match(mobile, /truncate px-0\.5 text-center text-\[11px\] font-black leading-none tracking-wide/);
  assert.match(mobile, /var controlesCabecalhoLancamento = mostrarCentroCusto/);
  assert.match(mobile, /flex min-w-0 flex-1 justify-center gap-6 pr-10/);
  assert.match(mobile, /grid-cols-\[auto_minmax\(0,1fr\)_36px\] items-center gap-2/);
  assert.match(mobile, /min-w-0 justify-self-center.*seletorMesLancamento/);
  assert.match(mobile, /absolute right-3 top-1\/2 flex h-9 w-9 -translate-y-1\/2/);
});

test('o card de centros consolida os centros do perfil sem trocar o contexto global', () => {
  assert.match(mobile, /function temCardCentrosCustoMobile\(\)/);
  assert.match(mobile, /state\.centrosCustoAtivo\s*&& \(state\.centrosCusto \|\| \[\]\)\.some\(function \(centro\) \{ return !centro\.is_principal; \}\)/);
  assert.match(mobile, /function resumoCentrosCustoMobile\(mes\)/);
  assert.match(mobile, /Este resumo não segue o seletor global do cabeçalho/);
  assert.match(mobile, /function centrosCustoCardHtml\(\)/);
  assert.match(mobile, /var mes = state\.mes;/);
  assert.match(mobile, /O resumo acompanha diretamente o período ativo no cabeçalho da Gestão/);
  assert.doesNotMatch(mobile, /mesCentrosCusto/);
  assert.doesNotMatch(mobile, /mes-centros-custo-mobile/);
  assert.match(mobile, /centrosCusto: centrosCustoCardHtml\(\)/);
  assert.match(mobile, /if \(id === 'centrosCusto'\) return temCardCentrosCustoMobile\(\);/);
});

test('tocar um centro revela somente os seus valores sem alterar o centro operacional', () => {
  assert.match(mobile, /centroCustoResumoExibidoId/);
  assert.match(mobile, /data-centro-custo-resumo-id/);
  assert.match(mobile, /valorCentroHtml\(centro\.resultado, centro\.id\)/);
  assert.match(mobile, /state\.centroCustoResumoExibidoId = id;/);
  assert.match(mobile, /function centralizarCentroCustoResumoNoCard\(id\)/);
  assert.doesNotMatch(mobile, /data-centro-custo-resumo-id[\s\S]{0,500}trocarCentroCustoGlobalMobile/);
});

test('linhas de centros permanecem contidas no card, inclusive quando destacadas', () => {
  assert.match(mobile, /id="centros-custo-lista-mobile" class="box-border grid w-full min-w-0 max-w-full/);
  assert.match(mobile, /overflow-x-hidden overflow-y-auto overscroll-contain p-1/);
  assert.match(mobile, /class="box-border w-full min-w-0 max-w-full rounded-xl border-2/);
  assert.match(mobile, /flex min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-hidden rounded-2xl border-2/);
});
