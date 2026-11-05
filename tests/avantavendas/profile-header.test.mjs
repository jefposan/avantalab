import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const fonte = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const estilos = readFileSync(new URL('../../app/avantavendas/sistema/styles.css', import.meta.url), 'utf8');
const inicio = fonte.indexOf('function botaoTrocaPerfilVendas()');
const fim = fonte.indexOf('function elementoRolagemPrincipalVendas(', inicio);
assert.ok(inicio >= 0 && fim > inicio);
function ambiente() {
  const elementos = new Map();
  const escapar = texto => String(texto).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const ctx = vm.createContext({
    state: { contaVendasAtiva: { id: 'bora', nome: 'Bóra Bebidas' } },
    escapeHtml: escapar, escapeAttr: escapar, svgIcon: nome => `<svg data-icon="${nome}"></svg>`,
    avisoRedeOfflineVendas: () => '<span class="offline">Offline</span>',
    botaoPendenciasSincronizacaoVendas: () => '<button class="pendencias">Pendências</button>',
    botaoAgendamentosHojeVendas: () => '<button class="agenda">Agenda</button>',
    botaoAniversariosHojeVendas: () => '<button class="aniversarios">Aniversários</button>',
    aniversariosHojeVendas: () => [], agendamentosHojeVendas: () => [],
    logoVendas: () => '<span>AvantaLab</span>',
    app: { querySelector: seletor => elementos.get(seletor) || null },
  });
  vm.runInContext(fonte.slice(inicio, fim), ctx);
  return { ctx, elementos };
}
const quantidade = html => (html.match(/class="sales-profile-header-button"/g) || []).length;

test('cabeçalho padrão mostra exatamente um seletor em qualquer página autenticada', () => {
  const { ctx } = ambiente();
  for (const aba of ['dashboard', 'clientes', 'produtos', 'vendas', 'pagamentos', 'agenda', 'novidades', 'divulgacao', 'informacoes', 'configuracoes']) {
    ctx.state.aba = aba;
    ctx.state.menuAberto = false;
    const html = ctx.acoesCabecalhoSistema([], []);
    assert.equal(quantidade(html), 1, aba);
    assert.match(html, /Bóra Bebidas/);
    assert.match(html, /onclick="abrirContasVendas\(\)"/);
    assert.match(html, /Perfil atual: Bóra Bebidas/);
    for (const acao of ['offline', 'pendencias', 'agenda', 'aniversarios']) assert.match(html, new RegExp(`class="${acao}"`));
  }
});

test('primeiro cabeçalho inclui o seletor sem depender da Sala de Botões', () => {
  const { ctx, elementos } = ambiente();
  const slot = { outerHTML: '' };
  elementos.set('[data-system-header-slot]', slot);
  ctx.preservarCabecalhoSistema(null, [], []);
  assert.match(slot.outerHTML, /class="system-header"/);
  assert.equal(quantidade(slot.outerHTML), 1);
});

test('cabeçalho reaproveitado mantém sua identidade e atualiza o nome do perfil', () => {
  const { ctx, elementos } = ambiente();
  const acoes = { innerHTML: ctx.acoesCabecalhoSistema([], []) };
  const header = { querySelector: () => acoes };
  let recolocado;
  elementos.set('[data-system-header-slot]', { replaceWith: elemento => { recolocado = elemento; } });
  ctx.state.contaVendasAtiva = { id: 'jeff', nome: 'Jeff - pessoal' };
  ctx.preservarCabecalhoSistema(header, [], []);
  assert.equal(recolocado, header);
  assert.equal(quantidade(acoes.innerHTML), 1);
  assert.match(acoes.innerHTML, /Jeff - pessoal/);
  assert.doesNotMatch(acoes.innerHTML, /Bóra Bebidas/);
});

test('atualização de avisos não remove nem duplica o seletor dos cabeçalhos', () => {
  const { ctx, elementos } = ambiente();
  const header = { innerHTML: '' }, sala = { innerHTML: '' };
  elementos.set('.system-header .system-header-actions', header);
  elementos.set('.mobile-menu-header .system-header-actions', sala);
  ctx.atualizarAcoesCabecalhoSistemaVendas();
  ctx.atualizarAcoesCabecalhoSistemaVendas();
  assert.equal(quantidade(header.innerHTML), 1);
  assert.equal(quantidade(sala.innerHTML), 1);
});

test('nomes de perfil continuam escapados em texto e atributos', () => {
  const { ctx } = ambiente();
  ctx.state.contaVendasAtiva.nome = '<Bóra "Gin">';
  assert.match(ctx.botaoTrocaPerfilVendas(), /&lt;Bóra &quot;Gin&quot;&gt;/);
  assert.doesNotMatch(ctx.botaoTrocaPerfilVendas(), /<Bóra/);
  ctx.state.contaVendasAtiva = null;
  assert.match(ctx.botaoTrocaPerfilVendas(), /Perfil de vendas/);
});

test('Sala de Botões reutiliza as mesmas ações universais do cabeçalho', () => {
  const menu = fonte.slice(fonte.indexOf('function renderMenuMobile()'), fonte.indexOf('function renderMenuMobile()') + 1200);
  assert.match(menu, /acoesCabecalhoSistema\(aniversariantesHoje, agendamentosHoje\)/);
  assert.doesNotMatch(fonte.slice(inicio, fim), /mostrarTrocaPerfil/);
});

test('cabeçalho mantém espaço responsivo, nome legível, foco e tema escuro', () => {
  assert.match(estilos, /\.system-header \.system-brand\s*\{[^}]*min-width: 0;[^}]*flex: 1 1 0;/);
  assert.match(estilos, /\.system-header \.system-brand \.vendas-brand-logo\s*\{[^}]*max-width: 100%;/);
  assert.match(estilos, /\.sales-profile-header-button span\s*\{[^}]*text-overflow: ellipsis/);
  assert.match(estilos, /\.sales-profile-header-button:focus-visible/);
  assert.match(estilos, /\.dark-theme \.sales-profile-header-button/);
});
