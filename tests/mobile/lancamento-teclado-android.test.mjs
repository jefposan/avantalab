import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const raiz = new URL('../../', import.meta.url);

function criarCenarioControlador(fonte, alturaTeclado = 320) {
  const inicio = fonte.indexOf('  var ALTURA_MINIMA_TECLADO_LANCAMENTO');
  const fim = fonte.indexOf('  function podeAtualizarDadosAoRetornar()', inicio);
  assert.ok(inicio >= 0 && fim > inicio, 'controlador do teclado deve ser extraível para o teste');

  const propriedades = {};
  const estilo = {
    top: '',
    bottom: '',
    height: '',
    setProperty(chave, valor) { propriedades[chave] = valor; },
    removeProperty(chave) { delete propriedades[chave]; },
  };
  const overlay = { style: estilo };
  const painel = {};
  const rotulo = { getBoundingClientRect: () => ({ top: 650, bottom: 700 }) };
  const campo = {
    isConnected: true,
    matches: (seletor) => seletor === 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea',
    closest: (seletor) => seletor === '#modal-lancamento-overlay' ? overlay : seletor === 'label' ? rotulo : null,
  };
  const rolagem = {
    scrollTop: 0,
    contains: (elemento) => elemento === campo,
  };
  const tecladoVirtual = {
    overlaysContent: false,
    boundingRect: { height: alturaTeclado },
  };
  const contexto = {
    console,
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 15)', virtualKeyboard: tecladoVirtual },
    state: { isIos: false },
    document: {
      activeElement: campo,
      documentElement: { clientHeight: 800, clientWidth: 400 },
      getElementById(id) {
        if (id === 'modal-lancamento-overlay') return overlay;
        if (id === 'modal-lancamento-painel') return painel;
        if (id === 'modal-lancamento-scroll') return rolagem;
        return null;
      },
    },
    window: {
      innerHeight: 800,
      innerWidth: 400,
      visualViewport: { height: 800, offsetTop: 0 },
      requestAnimationFrame(funcao) { funcao(); return 1; },
      cancelAnimationFrame() {},
      setTimeout,
      clearTimeout,
    },
  };
  vm.createContext(contexto);
  vm.runInContext(fonte.slice(inicio, fim), contexto);
  return { contexto, propriedades, estilo, rolagem, campo, tecladoVirtual };
}

test('modal de lançamento acompanha a geometria do teclado Android', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');

  assert.match(mobile, /function sincronizarViewportLancamentoMobile\(\)/);
  assert.match(mobile, /navigator\.virtualKeyboard/);
  assert.match(mobile, /addEventListener\('geometrychange', acompanharViewportLancamento\)/);
  assert.match(mobile, /window\.visualViewport\.addEventListener\('resize', acompanharViewportLancamento\)/);
  assert.match(mobile, /window\.visualViewport\.addEventListener\('scroll', acompanharViewportLancamento\)/);
  assert.match(mobile, /temporizadoresLancamentoMobile = \[0, 120, 280, 480\]/);
  assert.match(mobile, /alturaTeclado = Math\.round\(alturaBaseLancamentoMobile \* 0\.44\)/);
  assert.match(mobile, /elemento\.matches\('input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\[type="button"\]\):not\(\[type="submit"\]\), textarea'\)/);
});

test('geometria nativa reduz o card e rola o campo acima do teclado', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');
  const cenario = criarCenarioControlador(mobile, 320);

  cenario.contexto.sincronizarViewportLancamentoMobile();

  assert.equal(cenario.estilo.height, '480px');
  assert.equal(cenario.propriedades['--avanta-lancamento-card-max-height'], '452px');
  assert.equal(cenario.propriedades['--avanta-lancamento-padding-bottom'], '12px');
  assert.ok(cenario.rolagem.scrollTop > 0);
  assert.equal(cenario.tecladoVirtual.overlaysContent, true);

  cenario.contexto.document.activeElement = null;
  cenario.contexto.sincronizarViewportLancamentoMobile();
  assert.equal(cenario.estilo.height, '');
  assert.equal(cenario.tecladoVirtual.overlaysContent, false);
});

test('WebView Android sem geometria usa a reserva segura após a animação', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');
  const cenario = criarCenarioControlador(mobile, 0);
  cenario.contexto.alturaBaseLancamentoMobile = 800;
  cenario.contexto.focoLancamentoMobileEm = Date.now() - 500;

  cenario.contexto.sincronizarViewportLancamentoMobile();

  assert.equal(cenario.estilo.height, '448px');
  assert.equal(cenario.propriedades['--avanta-lancamento-card-max-height'], '420px');
  assert.ok(cenario.rolagem.scrollTop > 0);
});

test('card reduz a altura útil e mantém o campo focado dentro da rolagem', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');

  assert.match(mobile, /id="modal-lancamento-painel"/);
  assert.match(mobile, /id="modal-lancamento-scroll"/);
  assert.match(mobile, /--avanta-lancamento-card-max-height/);
  assert.match(mobile, /--avanta-lancamento-padding-bottom/);
  assert.match(mobile, /elementos\.rolagem\.scrollTop \+= Math\.round\(deslocamento\)/);
  assert.match(mobile, /campo\.closest\('label'\) \|\| campo/);
  assert.match(mobile, /sincronizarViewportLancamentoMobile\(\);\n\s*\/\/ Restaura o scrollTop/);
});

test('correção fica isolada do ajuste simples e do viewport da Ava', async () => {
  const [mobile, pagina, ava] = await Promise.all([
    readFile(new URL('public/mobile-app.js', raiz), 'utf8'),
    readFile(new URL('app/mobile/page.tsx', raiz), 'utf8'),
    readFile(new URL('app/mobile/ava/AvaChatClient.tsx', raiz), 'utf8'),
  ]);

  const inicioEspecifico = mobile.indexOf('if (campoEditavelLancamentoMobile(el)) {');
  const inicioGenerico = mobile.indexOf('if (!(deveBloquearScroll() || state.agendaFormAberto)) return;', inicioEspecifico);
  assert.ok(inicioEspecifico >= 0 && inicioGenerico > inicioEspecifico);
  assert.match(mobile.slice(inicioEspecifico, inicioGenerico), /agendarViewportLancamentoMobile\(el\);[\s\S]*return;/);
  assert.match(mobile, /if \(!campoAtivo \|\| state\.isIos\)/);
  assert.match(pagina, /interactiveWidget: 'overlays-content'/);
  assert.match(ava, /synchronizeAvaKeyboardViewport\(/);
});
