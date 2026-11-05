import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const code = source.slice(source.indexOf('function aguardarImagemSalaNoDom('), source.indexOf('function itensSalaBotoesOrdenados('));
const tick = () => new Promise(resolve => setImmediate(resolve));

test('verificador exige apresentação conjunta, timeout e proteção de renderização antiga', () => {
  const validator = readFileSync(new URL('../../scripts/verificar-interface-vendas.mjs', import.meta.url), 'utf8');
  const start = validator.indexOf("exigir(\n  aplicacao.includes('function prepararExibicaoSalaBotoesNoDom()')");
  assert.ok(start >= 0);
  const check = validator.slice(start, validator.indexOf('\n);', start) + 3);
  const estilos = readFileSync(new URL('../../app/avantavendas/sistema/styles.css', import.meta.url), 'utf8');
  const approved = aplicacao => {
    let result;
    vm.runInNewContext(check, { aplicacao, estilos, exigir: condition => { result = condition; } });
    return result;
  };
  assert.equal(approved(source), true);
  for (const required of ["sala.classList.add('is-loading-images')", "sala.classList.remove('images-ready')", 'Promise.all(imagens.map(aguardarImagemSalaNoDom))', 'window.setTimeout(concluir, 7000)', 'if (revisao !== revisaoPreloaderSalaBotoes || !sala.isConnected) return;']) {
    assert.equal(approved(source.replaceAll(required, 'REMOVIDO_PARA_TESTE')), false, required);
  }
});
function fixture(cached = false) {
  const frames = [], timers = [], classes = new Set(['images-ready']);
  const images = Array.from({ length: 3 }, () => {
    const listeners = new Map();
    return { complete: cached, decode: () => Promise.resolve(), addEventListener: (name, cb) => listeners.set(name, cb), removeEventListener: name => listeners.delete(name), emit: name => listeners.get(name)?.() };
  });
  const attrs = {};
  const sala = { isConnected: true, classList: { add: c => classes.add(c), remove: c => classes.delete(c) }, setAttribute: (k, v) => { attrs[k] = v; }, querySelectorAll: () => images };
  const app = { querySelector: () => sala };
  const context = vm.createContext({ app, window: { setTimeout: (cb, ms) => { timers.push({ cb, ms }); } }, requestAnimationFrame: cb => frames.push(cb) });
  vm.runInContext('let revisaoPreloaderSalaBotoes = 0;\n' + code, context);
  return { context, images, attrs, sala, app, classes, timers, frames, reveal: () => frames.splice(0).forEach(cb => cb()) };
}

test('botões permanecem juntos no preloader até a última imagem e revelam no mesmo quadro', async () => {
  const f = fixture();
  f.context.prepararExibicaoSalaBotoesNoDom();
  assert.ok(f.classes.has('is-loading-images'));
  assert.ok(!f.classes.has('images-ready'));
  assert.equal(f.attrs['aria-busy'], 'true');
  for (const image of f.images.slice(0, 2)) image.emit('load');
  await tick();
  assert.equal(f.frames.length, 0);
  assert.ok(f.classes.has('is-loading-images'));
  f.images[2].emit('load');
  await tick();
  assert.equal(f.frames.length, 1);
  assert.ok(!f.classes.has('images-ready'));
  f.reveal();
  assert.ok(f.classes.has('images-ready'));
  assert.ok(!f.classes.has('is-loading-images'));
  assert.equal(f.attrs['aria-busy'], 'false');
});

test('imagens em cache conservam apresentação conjunta sem redesenhar o menu', async () => {
  const f = fixture(true);
  f.context.prepararExibicaoSalaBotoesNoDom();
  await tick(); f.reveal();
  assert.ok(f.classes.has('images-ready'));
  assert.equal(f.attrs['aria-busy'], 'false');
});

test('erro ou timeout de imagem não deixam a Sala bloqueada indefinidamente', async () => {
  const f = fixture();
  f.context.prepararExibicaoSalaBotoesNoDom();
  f.images[0].emit('load');
  f.images[1].emit('error');
  assert.equal(f.timers.length, 3);
  assert.ok(f.timers.every(t => t.ms === 7000));
  f.timers[2].cb();
  await tick(); f.reveal();
  assert.ok(f.classes.has('images-ready'));
  assert.equal(f.attrs['aria-busy'], 'false');
});

test('conclusão antiga não libera outra renderização e Sala removida não é alterada', async () => {
  for (const disconnected of [false, true]) {
    const f = fixture();
    f.context.prepararExibicaoSalaBotoesNoDom();
    if (disconnected) f.sala.isConnected = false;
    else vm.runInContext('revisaoPreloaderSalaBotoes += 1', f.context);
    f.images.forEach(image => image.emit('load'));
    await tick(); f.reveal();
    assert.equal(f.attrs['aria-busy'], 'true');
    assert.ok(!f.classes.has('images-ready'));
  }
});

test('ausência da Sala é segura e apresentação não cria rótulos provisórios por imagem', () => {
  const f = fixture(); f.app.querySelector = () => null;
  assert.doesNotThrow(() => f.context.prepararExibicaoSalaBotoesNoDom());
  assert.doesNotMatch(code, /image-pending|appendChild|createElement/);
});
