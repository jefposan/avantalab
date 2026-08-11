import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  initializeAvaKeyboardViewport,
  prepareAvaKeyboardViewportForFocus,
  synchronizeAvaKeyboardViewport,
} from '../../app/mobile/ava/keyboard-viewport.ts';

const baseSample = {
  visualHeight: 844,
  layoutHeight: 844,
  layoutWidth: 390,
  virtualKeyboardHeight: 0,
  textareaFocused: false,
  touchCapable: true,
};

test('iOS mantém o recuo usando a referência anterior ao foco', () => {
  let state = initializeAvaKeyboardViewport(baseSample);
  state = prepareAvaKeyboardViewportForFocus(state, 844, 390);
  state = synchronizeAvaKeyboardViewport(state, {
    ...baseSample,
    visualHeight: 543,
    textareaFocused: true,
  });

  assert.equal(state.keyboardInset, 301);

  state = synchronizeAvaKeyboardViewport(state, {
    ...baseSample,
    visualHeight: 543,
    // Simula o segundo resize do WebKit reportando também o layout reduzido.
    layoutHeight: 543,
    textareaFocused: true,
  });

  assert.equal(state.keyboardInset, 301);
  assert.equal(state.baselineHeight, 844);
});

test('fechamento do teclado zera o recuo sem perder a referência', () => {
  const openState = synchronizeAvaKeyboardViewport(
    initializeAvaKeyboardViewport(baseSample),
    { ...baseSample, visualHeight: 543, textareaFocused: true },
  );
  const closedState = synchronizeAvaKeyboardViewport(openState, {
    ...baseSample,
    textareaFocused: true,
  });

  assert.equal(openState.keyboardInset, 301);
  assert.equal(closedState.keyboardInset, 0);
  assert.equal(closedState.baselineHeight, 844);
});

test('Chrome/Android usa a geometria nativa sem somar o visualViewport', () => {
  const state = synchronizeAvaKeyboardViewport(
    initializeAvaKeyboardViewport(baseSample),
    {
      ...baseSample,
      virtualKeyboardHeight: 312,
      textareaFocused: true,
    },
  );

  assert.equal(state.keyboardInset, 312);
});

test('mudança pequena da barra do navegador não é confundida com teclado', () => {
  const state = synchronizeAvaKeyboardViewport(
    initializeAvaKeyboardViewport(baseSample),
    { ...baseSample, visualHeight: 786, textareaFocused: true },
  );

  assert.equal(state.keyboardInset, 0);
});

test('redimensionamento sem digitação atualiza a referência e não move o chat', () => {
  const state = synchronizeAvaKeyboardViewport(
    initializeAvaKeyboardViewport(baseSample),
    { ...baseSample, visualHeight: 760, layoutHeight: 760 },
  );

  assert.equal(state.keyboardInset, 0);
  assert.equal(state.baselineHeight, 760);
});

test('rotação usa a nova altura de layout como referência', () => {
  const state = synchronizeAvaKeyboardViewport(
    initializeAvaKeyboardViewport(baseSample),
    {
      ...baseSample,
      visualHeight: 210,
      layoutHeight: 390,
      layoutWidth: 844,
      textareaFocused: true,
    },
  );

  assert.equal(state.baselineHeight, 390);
  assert.equal(state.keyboardInset, 180);
});

test('desktop com teclado físico não cria recuo', () => {
  const desktop = {
    ...baseSample,
    visualHeight: 900,
    layoutHeight: 900,
    layoutWidth: 1440,
    textareaFocused: true,
    touchCapable: false,
  };
  const state = synchronizeAvaKeyboardViewport(
    initializeAvaKeyboardViewport(desktop),
    desktop,
  );

  assert.equal(state.keyboardInset, 0);
});

test('resize vertical do desktop com campo focado não simula teclado', () => {
  const desktop = {
    ...baseSample,
    visualHeight: 900,
    layoutHeight: 900,
    layoutWidth: 1440,
    textareaFocused: true,
    touchCapable: false,
  };
  const state = synchronizeAvaKeyboardViewport(
    initializeAvaKeyboardViewport(desktop),
    { ...desktop, visualHeight: 600, layoutHeight: 600 },
  );

  assert.equal(state.keyboardInset, 0);
});

test('integração preserva shell e foco protegido enquanto usa o cálculo testado', async () => {
  const [component, styles, vendas] = await Promise.all([
    readFile(new URL('../../app/mobile/ava/AvaChatClient.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/mobile/ava/ava-chat.module.css', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8'),
  ]);

  assert.match(component, /synchronizeAvaKeyboardViewport\(/);
  assert.match(component, /prepareAvaKeyboardViewportForFocus\(/);
  assert.match(component, /event\.preventDefault\(\)/);
  assert.match(component, /textarea\.focus\(\{ preventScroll: true \}\)/);
  assert.match(component, /data-ava-chat-input="true"/);
  assert.match(vendas, /elemento\.hasAttribute\('data-ava-chat-input'\)/);
  assert.match(styles, /height:\s*100dvh/);
  assert.match(styles, /padding-bottom:\s*var\(--ava-keyboard-inset\)/);
});

test('Ava conclui o toque antes de abrir o teclado e isola o gesto do AvantaVendas', async () => {
  const component = await readFile(
    new URL('../../app/mobile/ava/AvaChatClient.tsx', import.meta.url),
    'utf8',
  );
  const pointerDown = component.match(/onPointerDown=\{\(event\) => \{([\s\S]*?)\n\s*\}\}\n\s*onPointerUp=/)?.[1] || '';
  const pointerUp = component.match(/onPointerUp=\{\(event\) => \{([\s\S]*?)\n\s*\}\}\n\s*onClick=/)?.[1] || '';

  assert.match(pointerDown, /initialEnvironment === 'vendas'/);
  assert.match(pointerDown, /event\.stopPropagation\(\)/);
  assert.match(pointerDown, /prepareAvaKeyboardViewportForFocus\(/);
  assert.match(pointerDown, /event\.preventDefault\(\)/);
  assert.match(pointerDown, /if \(isSalesChat\) return;[\s\S]*textarea\.focus\(/);

  assert.match(pointerUp, /initialEnvironment !== 'vendas'/);
  assert.match(pointerUp, /event\.stopPropagation\(\)/);
  assert.match(pointerUp, /event\.preventDefault\(\)/);
  assert.match(pointerUp, /textarea\.focus\(\{ preventScroll: true \}\)/);
  assert.match(component, /onClick=\{\(event\) => \{[\s\S]*initialEnvironment === 'vendas'[\s\S]*event\.stopPropagation\(\)/);
});

test('Ava do Vendas usa a conta ativa sem exigir perfil financeiro do Gestão', async () => {
  const [component, bridge, vendas, route] = await Promise.all([
    readFile(new URL('../../app/mobile/ava/AvaChatClient.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/mobile/AvaMobileBridge.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/ava/chat/route.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(vendas, /profileId: state\.contaVendasAtiva\?\.id \|\| state\.acessoVendas\?\.empresa_id \|\| ''/);
  assert.match(vendas, /Perfil de vendas: \$\{state\.contaVendasAtiva\?\.nome/);
  assert.match(bridge, /initialProfileId=\{request\.profileId\}/);
  assert.match(component, /const initialContextId = initialProfileId \|\| initialCompanyId \|\| ''/);
  assert.match(component, /setCompanyId\(initialCompanyId \|\| ''\)/);
  assert.match(component, /profileId: initialProfileId \|\| undefined/);
  assert.match(route, /usuarioPodeUsarContaVendas\(userId, profileId\)/);
  assert.match(route, /from\('vendas_mobile_contas_usuarios'\)/);
  assert.match(route, /eq\('status', 'ativo'\)/);
});
