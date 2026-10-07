import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const raiz = resolve(import.meta.dirname, '../..');
const aplicativo = readFileSync(resolve(raiz, 'app/avantavendas/sistema/app.js'), 'utf8');
const ponte = ts.transpileModule(readFileSync(resolve(raiz, 'app/avantavendas/NativeShareBridge.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const origem = 'https://qzewxhdkwettnlmkjoqd.supabase.co';
const imagem = { id: 'foto', pasta_id: 'pasta', tipo: 'imagem', titulo: 'Foto divulgação', arquivo_url: `${origem}/storage/v1/object/public/vendas-divulgacao/empresa/foto.jpg` };

function carregarPonte(plataforma = 'android', plugins = ['Browser']) {
  let limpar;
  const aberturas = [];
  const contexto = vm.createContext({
    exports: {}, window: {}, URL,
    require(nome) {
      if (nome === 'react') return { useEffect: (efeito) => { limpar = efeito(); } };
      if (nome === '@capacitor/core') return { Capacitor: {
        isNativePlatform: () => plataforma !== 'web', getPlatform: () => plataforma,
        isPluginAvailable: (plugin) => plugins.includes(plugin),
      } };
      if (nome === '@capacitor/browser') return { Browser: { open: async (opcoes) => aberturas.push(opcoes) } };
      if (nome === '@capacitor/filesystem') return { Directory: { Cache: 'CACHE' }, Filesystem: {} };
      if (nome === '@capacitor/share') return { Share: {} };
      throw new Error(nome);
    },
  });
  vm.runInContext(ponte, contexto);
  contexto.exports.default();
  return { contexto, aberturas, limpar };
}

function carregarFluxo({ plataforma = 'android', nativo = true, compartilharNativo, abrirDownload } = {}) {
  const avisos = [];
  const aberturas = [];
  const telas = [];
  const contexto = vm.createContext({
    URL, Blob, File, Set, Map, AbortController,
    window: {
      Capacitor: { getPlatform: () => plataforma }, VENDAS_MOBILE_CONFIG: { supabaseUrl: origem },
      __avantavendasCompartilharArquivos: compartilharNativo,
      __avantavendasAbrirDownloadAndroid: abrirDownload || (async (url) => aberturas.push(url)),
    },
    navigator: { userAgent: plataforma === 'android' ? 'Android' : 'iPhone' },
    state: { divulgacaoMateriais: [imagem, { ...imagem, id: 'pdf', tipo: 'pdf', titulo: 'Catálogo', arquivo_url: imagem.arquivo_url.replace('.jpg', '.pdf') }] },
    ehAplicativoNativoVendas: () => nativo,
    document: { querySelectorAll: () => [], getElementById: () => null },
    toast: (mensagem, opcoes) => avisos.push({ mensagem, ...opcoes }),
    traduzErroCompartilhamento: () => 'Não foi possível enviar o arquivo. Tente novamente.',
    fetch: () => { throw new Error('Não deve baixar blobs dentro do WebView antigo'); },
    svgIcon: () => '', escapeHtml: (texto) => texto, escapeAttr: (texto) => texto,
    sheet: (html) => telas.push(html),
  });
  vm.runInContext(`let arquivoMaterialDivulgacaoPreparado = null;
    let revisaoPreparacaoArquivoMaterialDivulgacao = 0;
    let downloadMaterialAndroidEmAndamento = false;
    let divulgacaoCompartilhamentoMultiploEmAndamento = false;
    let divulgacaoCompartilhamentoStatus = '';
    const divulgacaoMateriaisSelecionados = new Set(['foto', 'pdf']);
    const divulgacaoSelecaoPastaId = 'pasta';
    const LIMITE_SELECAO_MATERIAIS_DIVULGACAO = 10;
    let divulgacaoMaterialAtualId = 'foto';`, contexto);
  const inicio = aplicativo.indexOf('function tipoMimeMaterialDivulgacao(material, blob)');
  const fim = aplicativo.indexOf('\nconst CONFIGURACOES_CARD_ID_POR_TITULO', inicio);
  assert.ok(inicio > 0 && fim > inicio);
  vm.runInContext(aplicativo.slice(inicio, fim), contexto);
  return { contexto, avisos, aberturas, telas };
}

test('Android antigo registra Browser mesmo sem Share/Filesystem e limpa a ponte', async () => {
  const { contexto, aberturas, limpar } = carregarPonte();
  const abrir = contexto.window.__avantavendasAbrirDownloadAndroid;
  assert.equal(typeof abrir, 'function');
  assert.equal(contexto.window.__avantavendasCompartilharArquivos, undefined);
  await abrir(`${imagem.arquivo_url}?download=foto.jpg`);
  assert.equal(aberturas[0].url, `${imagem.arquivo_url}?download=foto.jpg`);
  for (const invalido of ['blob:arquivo', 'javascript:alert(1)', imagem.arquivo_url, 'https://example.com/arquivo?download=foto']) {
    await assert.rejects(() => abrir(invalido));
  }
  limpar();
  assert.equal(contexto.window.__avantavendasAbrirDownloadAndroid, undefined);
  await assert.rejects(() => abrir(`${imagem.arquivo_url}?download=foto.jpg`));
});

test('ponte de download não é instalada no iOS/web; Share continua prioritário', () => {
  for (const plataforma of ['ios', 'web']) {
    const { contexto } = carregarPonte(plataforma, ['Browser', 'Share', 'Filesystem']);
    assert.equal(contexto.window.__avantavendasAbrirDownloadAndroid, undefined);
    assert.equal(typeof contexto.window.__avantavendasCompartilharArquivos, plataforma === 'ios' ? 'function' : 'undefined');
  }
  assert.equal(carregarFluxo({ compartilharNativo: async () => true }).contexto.usarDownloadProvisorioAndroidDivulgacao(), false);
  assert.equal(carregarFluxo({ plataforma: 'ios' }).contexto.usarDownloadProvisorioAndroidDivulgacao(), false);
  assert.equal(carregarFluxo({ nativo: false }).contexto.usarDownloadProvisorioAndroidDivulgacao(), false);
});

test('download usa URL Storage com attachment, sem fetch/blob e sem falso sucesso', async () => {
  const { contexto, avisos, aberturas } = carregarFluxo();
  await contexto.prepararCompartilhamentoMaterialDivulgacao('foto');
  await contexto.compartilharMaterialDivulgacao('foto');
  assert.equal(new URL(aberturas[0]).searchParams.get('download'), 'Foto-divulgacao.jpg');
  assert.equal(avisos[0].tipo, 'informacao');
  assert.match(avisos[0].mensagem, /Download iniciado.*Após concluir.*galeria.*Downloads/);
  assert.doesNotMatch(avisos[0].mensagem, /foi salvo|foi baixado/);
  await contexto.baixarMaterialDivulgacaoAndroid('pdf');
  assert.match(avisos[1].mensagem, /Downloads/);
  assert.doesNotMatch(avisos[1].mensagem, /galeria/);
});

test('falha é em português e libera nova tentativa, sem afirmar download concluído', async () => {
  const { contexto, avisos } = carregarFluxo({ abrirDownload: async () => { throw new Error('Failed'); } });
  const botao = { disabled: false };
  await contexto.baixarMaterialDivulgacaoAndroid('foto', botao);
  await contexto.baixarMaterialDivulgacaoAndroid('foto', botao);
  assert.equal(botao.disabled, false);
  assert.equal(avisos.length, 2);
  assert.ok(avisos.every((aviso) => aviso.tipo === 'erro' && !aviso.mensagem.includes('Failed')));
});

test('Android com ponte e iPhone continuam compartilhando o arquivo, sem download', async () => {
  for (const plataforma of ['android', 'ios']) {
    const compartilhamentos = [];
    const { contexto, aberturas, avisos } = carregarFluxo({
      plataforma,
      compartilharNativo: async (pedido) => { compartilhamentos.push(pedido); return true; },
    });
    vm.runInContext("arquivoMaterialDivulgacaoPreparado = { materialId: 'foto', arquivo: new File(['foto'], 'foto.jpg', { type: 'image/jpeg' }) };", contexto);
    await contexto.compartilharMaterialDivulgacao('foto');
    assert.equal(compartilhamentos.length, 1);
    assert.equal(compartilhamentos[0].arquivos[0].name, 'foto.jpg');
    assert.equal(aberturas.length, 0);
    assert.equal(avisos.length, 0);
  }
});

test('origem externa nunca é aberta e seleção múltipla oferece downloads individuais', async () => {
  const { contexto, aberturas, avisos, telas } = carregarFluxo();
  contexto.state.divulgacaoMateriais[0] = { ...imagem, arquivo_url: imagem.arquivo_url.replace(origem, 'https://example.com') };
  await contexto.baixarMaterialDivulgacaoAndroid('foto');
  assert.equal(aberturas.length, 0);
  assert.equal(avisos[0].tipo, 'erro');
  contexto.state.divulgacaoMateriais[0] = imagem;
  await contexto.compartilharMateriaisSelecionadosDivulgacao();
  assert.match(telas[0], /Baixar materiais/);
  assert.match(telas[0], /baixarMaterialDivulgacaoAndroid\('foto'/);
  assert.match(telas[0], /baixarMaterialDivulgacaoAndroid\('pdf'/);
  assert.equal(vm.runInContext('divulgacaoMateriaisSelecionados.size', contexto), 2);
});
