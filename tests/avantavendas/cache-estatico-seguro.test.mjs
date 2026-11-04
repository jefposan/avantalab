import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const rota = readFileSync(new URL('../../app/avantavendas/sw.js/route.ts', import.meta.url), 'utf8');
const raiz = 'https://vendas.test';
const atual = 'avantalab-avantavendas-teste-av189';
const url = (arquivo, versao = 'teste-av189') => `${raiz}/avantavendas/recursos/${arquivo}?v=${versao}`;
const chave = (requisicao) => typeof requisicao === 'string' ? requisicao : requisicao.url;

async function worker() {
  const gerador = vm.createContext({ Response, AVANTAVENDAS_VERSION: 'teste-av189' });
  vm.runInContext(rota.replace(/^import .*$/m, '').replaceAll('export ', ''), gerador);
  const codigo = await (await gerador.GET()).text();
  const listeners = {};
  const arquivos = new Map([[atual, new Map()]]);
  const contagem = { rede: 0, controle: 0 };
  const caches = {
    keys: async () => [...arquivos.keys()],
    delete: async (nome) => arquivos.delete(nome),
    open: async (nome) => {
      if (!arquivos.has(nome)) arquivos.set(nome, new Map());
      return { put: async (req, res) => arquivos.get(nome).set(chave(req), res) };
    },
    match: async (req) => {
      for (const valores of arquivos.values()) if (valores.has(chave(req))) return valores.get(chave(req)).clone();
    },
  };
  const contexto = vm.createContext({
    Response, Request, URL, Promise, caches,
    fetch: async () => { contagem.rede++; return new Response('rede-nova'); },
    self: { addEventListener: (nome, callback) => { listeners[nome] = callback; }, location: { origin: raiz }, clients: { claim: async () => { contagem.controle++; } } },
  });
  vm.runInContext(codigo, contexto);
  return {
    arquivos, caches, contexto, contagem, listeners,
    buscar: (endereco, mode = 'cors') => {
      let resultado;
      listeners.fetch({ request: { method: 'GET', url: endereco, mode }, respondWith: (resposta) => { resultado = resposta; } });
      return resultado;
    },
    ativar: () => { let promessa; listeners.activate({ waitUntil: (tarefa) => { promessa = tarefa; } }); return promessa; },
  };
}

test('CSS/JS versionado já disponível abre sem rede e sem misturar versão anterior', async () => {
  const f = await worker();
  f.arquivos.get(atual).set(url('app.js'), new Response('app-atual'));
  const resposta = await f.buscar(url('app.js'));
  assert.equal(await resposta.text(), 'app-atual');
  assert.equal(f.contagem.rede, 0);
  assert.equal(await (await f.buscar(url('app.js', 'publicacao-nova'))).text(), 'rede-nova');
  assert.equal(f.contagem.rede, 1);
});

test('HTML sempre consulta rede, mantendo atualização de publicação', async () => {
  const f = await worker();
  f.arquivos.get(atual).set(`${raiz}/avantavendas`, new Response('html-antigo'));
  assert.equal(await (await f.buscar(`${raiz}/avantavendas`, 'navigate')).text(), 'rede-nova');
  assert.equal(f.contagem.rede, 1);
});

test('API, autenticação, versão, recursos externos e Gestão não são interceptados pelo cache estático', async () => {
  const f = await worker();
  for (const endereco of [`${raiz}/api/cobranca/estado?v=1`, 'https://supabase.test/auth/v1/user', `${raiz}/avantavendas/versao?v=1`, `${raiz}/avantavendas/gestao`]) assert.equal(f.buscar(endereco), undefined);
  assert.equal(f.contagem.rede, 0);
});

test('falha/quota de cache não impede recurso entregue pela rede', async () => {
  const f = await worker();
  f.caches.match = async () => { throw new Error('Quota/cache indisponível'); };
  f.caches.open = async () => { throw new Error('Quota/cache indisponível'); };
  assert.equal(await (await f.buscar(url('app.js'))).text(), 'rede-nova');
});

test('erro HTTP não é armazenado como recurso válido', async () => {
  const f = await worker();
  f.contexto.fetch = async () => new Response('indisponível', { status: 503 });
  assert.equal((await f.buscar(url('app.js'))).status, 503);
  assert.equal(f.arquivos.get(atual).has(url('app.js')), false);
});

test('ativação preserva publicação anterior e caches de outros sistemas', async () => {
  const f = await worker();
  f.arquivos.set('avantalab-avantavendas-antiquissimo', new Map());
  f.arquivos.set('gestao-cache-nao-tocar', new Map());
  f.arquivos.set('avantalab-avantavendas-anterior', new Map([[url('app.js', 'anterior'), new Response('app-anterior')]]));
  await f.ativar();
  assert.equal(f.arquivos.has('avantalab-avantavendas-antiquissimo'), false);
  assert.equal(f.arquivos.has('gestao-cache-nao-tocar'), true);
  assert.equal(f.arquivos.has(atual), true);
  assert.equal(await (await f.buscar(url('app.js', 'anterior'))).text(), 'app-anterior');
  assert.equal(f.contagem.rede, 0);
});
