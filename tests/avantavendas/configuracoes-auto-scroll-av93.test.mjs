import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../../', import.meta.url);

test('rolagem automática reage somente às bordas visíveis do Kanban', async () => {
  const app = await readFile(new URL('app/avantavendas/sistema/app.js', raiz), 'utf8');
  const inicio = app.indexOf('function limitesRolagemAutomaticaCardsConfiguracoes');
  const fim = app.indexOf('function atualizarPosicaoArrasteCardsConfiguracoes', inicio);
  assert.ok(inicio >= 0 && fim > inicio, 'funções de rolagem automática não encontradas');

  const contexto = {
    FAIXA_ROLAGEM_AUTOMATICA_CONFIGURACOES: 96,
    VELOCIDADE_MAXIMA_ROLAGEM_CONFIGURACOES: 1200,
    window: { innerHeight: 800 },
    document: { documentElement: { clientHeight: 800 }, body: {} },
  };
  vm.createContext(contexto);
  vm.runInContext(`${app.slice(inicio, fim)}\nthis.calcularVelocidade = velocidadeRolagemAutomaticaCardsConfiguracoes;`, contexto);

  const rolagemElemento = { getBoundingClientRect: () => ({ top: 100, bottom: 700 }) };
  assert.equal(contexto.calcularVelocidade({ rolagemElemento, ponteiroY: 400 }), 0);
  assert.ok(contexto.calcularVelocidade({ rolagemElemento, ponteiroY: 100 }) < 0);
  assert.ok(contexto.calcularVelocidade({ rolagemElemento, ponteiroY: 700 }) > 0);
});

test('compensa a distância rolada sem recalcular os encaixes fotografados', async () => {
  const app = await readFile(new URL('app/avantavendas/sistema/app.js', raiz), 'utf8');
  const trecho = app.slice(
    app.indexOf('function deslocamentoRolagemCardsConfiguracoes'),
    app.indexOf('function limitesRolagemAutomaticaCardsConfiguracoes'),
  );
  const contexto = { posicaoRolagemPrincipalVendas: () => 460 };
  vm.createContext(contexto);
  vm.runInContext(`${trecho}\nthis.deslocamento = deslocamentoRolagemCardsConfiguracoes;`, contexto);

  assert.equal(contexto.deslocamento({ rolagemElemento: {}, rolagemInicial: 120 }), 340);
  assert.match(app, /centroY = topo \+ arraste\.altura \/ 2 \+ deslocamentoRolagemCardsConfiguracoes\(arraste\)/);
  assert.doesNotMatch(app, /function avancarRolagemAutomaticaCardsConfiguracoes[\s\S]*getBoundingClientRect\(\)[\s\S]*arraste\.posicoes\s*=/);
});
