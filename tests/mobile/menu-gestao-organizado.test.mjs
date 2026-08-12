import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const mobile = readFileSync('public/mobile-app.js', 'utf8');
const mobilePage = readFileSync('app/mobile/page.tsx', 'utf8');

test('menu mobile começa pelos botões diários sem título redundante', () => {
  const inicio = mobile.indexOf("'<div class=\"grid gap-1.5\">'");
  const fim = mobile.indexOf("'<button id=\"menu-organizacao-toggle\"", inicio);
  const usoDiario = mobile.slice(inicio, fim);
  const itens = [
    'menu-assinatura',
    'menu-agenda',
    'menu-avisos',
    'menu-categorias',
    'menu-despesas-fixas',
    'menu-tutorial',
  ];

  itens.reduce((anterior, item) => {
    const posicao = usoDiario.indexOf(item);
    assert.ok(posicao > anterior, `${item} deve respeitar a ordem do uso diário`);
    return posicao;
  }, -1);
  assert.match(usoDiario, /Assinatura e plano/);
  assert.match(usoDiario, /Central de avisos/);
  assert.doesNotMatch(usoDiario, /Uso diário/);
});

test('organização, sistemas e configurações são grupos expansíveis', () => {
  assert.match(mobile, /id="menu-organizacao-toggle"[^>]+aria-expanded=/);
  assert.match(mobile, /id="menu-sistemas-toggle"[^>]+aria-expanded=/);
  assert.match(mobile, /id="menu-config-toggle"[^>]+aria-expanded=/);
  assert.equal((mobile.match(/chevronExpansaoMenuSvg\(/g) || []).length, 4);
  assert.match(mobile, /var caminho = aberto \? 'm5 15 7-7 7 7' : 'm5 9 7 7 7-7'/);
  assert.doesNotMatch(mobile, /chevronMenuSvg/);
  assert.match(mobile, /Mostrar ou ocultar cards/);
  assert.match(mobile, /Alterar a ordem dos cards/);
  assert.match(mobile, /Organizar atalhos inferiores/);
  assert.match(mobile, /menuBotaoHtml\(\s*'menu-vendas-mobile',\s*'Conteúdo do Vendas'/);
  assert.doesNotMatch(mobile, /\? menuBotaoHtml\('menu-vendas-mobile'/);
  assert.match(mobile, /Ative o Vendas Mobile para acessar/);
  assert.match(mobile, /Preferências/);
  assert.match(mobile, /Conta e equipe/);
  assert.match(mobile, /Dados e segurança/);
  assert.match(mobile, /Avisar sobre lançamentos duplicados/);
  assert.match(mobile, /id="menu-tema"[\s\S]*?style="order:2;/);
  assert.match(mobile, /id="menu-inicio-valores-ocultos"[\s\S]*?style="order:3;/);
  assert.match(mobile, /id="menu-duplicados"[\s\S]*?style="order:4;/);
  assert.match(mobile, /id="menu-gerenciar"[\s\S]*?style="order:8;/);
  assert.match(mobile, /id="menu-cadastro-perfil"[\s\S]*?style="order:9;/);
  assert.match(mobile, /id="menu-usuario"[\s\S]*?style="order:10;/);
  assert.match(mobile, /Receber notificações neste aparelho/);
  assert.match(mobile, /Restaurar backup/);
});

test('exclusão fica após pontos de restauração em dados e segurança', () => {
  const dados = mobile.indexOf('Dados e segurança');
  const pontos = mobile.indexOf('menu-pontos-restauracao', dados);
  const exclusao = mobile.indexOf('menu-excluir-conta', dados);
  assert.ok(dados >= 0);
  assert.ok(pontos > dados);
  assert.ok(exclusao > pontos);
});

test('ajuda de categorias é contextual e rodapé encaixa sugestões e sair', () => {
  assert.doesNotMatch(mobile, /menuBotaoHtml\('menu-ajuda-categorias'/);
  assert.match(mobile, /aria-label="Abrir instruções sobre categorias"/);
  assert.match(mobile, /state\.modalMenuRetorno = 'categorias'/);
  assert.match(mobile, /id="menu-feedback"[\s\S]*flex-\[3\][\s\S]*id="sair"[\s\S]*flex-\[2\]/);
  assert.match(mobile, /rounded-l-2xl rounded-r-none/);
  assert.match(mobile, /rounded-l-none rounded-r-2xl/);
  assert.match(mobile, /id="menu-overlay" class="fixed inset-0 z-\[100\]/);
  assert.match(mobile, /id="menu-acoes-fixas"/);
  assert.match(mobile, /function overflowSubgrupoMenu\(valor\)/);
  assert.match(mobile, /valor \? 'overflow-hidden' : 'overflow-visible'/);
  assert.doesNotMatch(mobilePage, /\.cfg-sub-group > button::before/);
  assert.doesNotMatch(mobile, /cfg-sub-group[^\n]+pl-3/);
});
