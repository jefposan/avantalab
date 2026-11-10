import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');

test('AvantaVendas reserva o rodapé para falhas e mantém validação no formulário', () => {
  const rodape = [], formulario = [];
  const container = (items) => ({
    appendChild: el => items.push(el),
    prepend: el => items.unshift(el),
    querySelector: selector => items.find(el => el.className.includes(selector.slice(1))),
  });
  const body = container(rodape), sheet = container(formulario);
  const ctx = vm.createContext({
    document: {
      body, querySelector: selector => selector === '#sheetBackdrop .sheet' ? sheet : null,
      createElement: () => ({
        style: { setProperty() {} }, setAttribute() {}, querySelector() { return null; },
        scrollIntoView() {}, remove() {
          for (const items of [rodape, formulario]) if (items.includes(this)) items.splice(items.indexOf(this), 1);
        },
      }),
    },
    window: { setTimeout() {} },
    escapeHtml: x => x, svgIcon: () => '', svgIconEstavel: () => '',
  });
  vm.runInContext(source.slice(source.indexOf('function normalizar(texto)'), source.indexOf('function chaveMetaCelebrada')), ctx);
  ctx.toast('Produto salvo.');
  ctx.toast('Materiais atualizados.');
  ctx.toast('Pedido salvo neste aparelho. Ele será enviado automaticamente quando a conexão voltar.');
  ctx.toast('Sem confirmação do servidor. A alteração ficou protegida neste aparelho.', { tipo: 'erro' });
  assert.equal(rodape.length, 0);
  assert.equal(formulario.length, 0);
  ctx.toast('Informe uma data inválida.');
  assert.equal(rodape.length, 0);
  assert.equal(formulario[0].className, 'vendas-aviso-contextual');
  assert.match(formulario[0].innerHTML, /Informe uma data inválida/);
  ctx.toast('Não foi possível atualizar os materiais.');
  assert.equal(rodape[0].className, 'toast toast-erro');
  ctx.toast('Cliente salvo.');
  assert.equal(rodape.length, 1);
  ctx.toast('Seu navegador não abriu o compartilhamento. O arquivo foi salvo para envio manual.', { tipo: 'erro' });
  assert.match(rodape[0].innerHTML, /envio manual/);
});
