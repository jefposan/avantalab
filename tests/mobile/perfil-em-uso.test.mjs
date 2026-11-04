import assert from 'node:assert/strict';
import test from 'node:test';
import { css, pagina, web, mobile, renderSelo } from './perfil-em-uso-harness.mjs';

test('seletor Web mantém selo fora do botão com opacidade, com reserva e descrição acessível', () => {
  const f = web(), atual = f.elementos[0], botao = atual.props.children[0], selo = atual.props.children[1];
  assert.equal(botao.type, 'button'); assert.equal(botao.props.disabled, true);
  assert.equal(botao.props['aria-current'], 'true'); assert.equal(botao.props['aria-describedby'], selo.props.id);
  assert.match(botao.props.className, /disabled:opacity-55/);
  assert.equal((f.html.match(/class="avanta-perfil-em-uso"/g) || []).length, 1);
  assert.match(f.html, /avanta-perfil-em-uso-reserva/); assert.match(f.html, /aria-hidden="true"/);
  botao.props.onClick(); assert.equal(f.efeitos.length, 0);
  f.elementos[1].props.children[0].props.onClick(); assert.deepEqual(f.efeitos, ['outro']);
});
test('entrada inicial não mostra selo de uso nem bloqueia o perfil antes de confirmar', () => {
  const f = web({ modo: 'login' });
  assert.doesNotMatch(f.html, /class="avanta-perfil-em-uso"/);
  assert.equal(f.elementos[0].props.children[0].props.disabled, false);
  f.elementos[0].props.children[0].props.onClick(); assert.deepEqual(f.efeitos, ['ativo']);
});
test('troca Mobile usa o mesmo selo, mantém atual bloqueado e outros disponíveis', () => {
  const html = mobile();
  assert.equal((html.match(/class="avanta-perfil-em-uso"/g) || []).length, 1);
  assert.match(html, /aria-label="Perfil em uso"/); assert.match(html, /<span>Em uso<\/span>/);
  assert.match(html, /data-empresa-id="ativo"[^>]*aria-current="page"[^>]* disabled/);
  assert.doesNotMatch(html, /data-empresa-id="outro"[^>]* disabled(?:\s|=|>)/);
});
test('carregamento de outro perfil preserva estado de espera e bloqueio de novas trocas', () => {
  const html = mobile({ pendente: 'outro' });
  assert.match(html, /Carregando perfil/); assert.equal((html.match(/ disabled(?=\s|=|>)/g) || []).length, 2);
});
test('selo é informativo, com texto e confirmação decorativa sem ação ou animação', () => {
  const html = renderSelo();
  assert.match(html, /aria-label="Perfil em uso"/); assert.match(html, /svg aria-hidden="true" focusable="false"/);
  assert.match(html, /<span>Em uso<\/span>/); assert.doesNotMatch(html, /<button|tabindex|onclick|animate|transition/);
  assert.match(css, /text-shadow: none/); assert.match(css, /\.avanta-perfil-em-uso\s*\{[^}]*opacity: 1;/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(pagina, /<SeloPerfilEmUso id=/);
});
function luminancia(hex) {
  const rgb = hex.match(/[a-f0-9]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
const razao = (a,b) => (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
test('contraste de texto supera 7:1 e a dupla borda tem ao menos um contraste 3:1 em qualquer luminância de fundo', () => {
  const branco = css.match(/--av-perfil-em-uso-superficie:\s*(#[0-9a-f]+)/i)[1];
  const tinta = css.match(/--av-perfil-em-uso-tinta:\s*(#[0-9a-f]+)/i)[1];
  const a = luminancia(branco), b = luminancia(tinta);
  assert.ok(razao(a,b) >= 7);
  for (let i = 0; i <= 1000; i++) assert.ok(Math.max(razao(a, i / 1000), razao(b, i / 1000)) >= 3);
});
