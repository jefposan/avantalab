import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const ler = (arquivo) => readFileSync(resolve(raiz, arquivo), 'utf8');
const aplicativo = ler('app/avantavendas/sistema/app.js');
const clienteVendas = ler('app/avantavendas/sistema/supabase-client.js');
const paginaVendas = ler('app/avantavendas/page.tsx');
const ponteNativa = ler('app/avantavendas/NativeShareBridge.tsx');
const mobile = ler('public/mobile-app.js');
const banco = ler('app/lib/database.ts');

const recorte = (conteudo, inicio, fim) => {
  const indiceInicial = conteudo.indexOf(inicio);
  const indiceFinal = conteudo.indexOf(fim, indiceInicial + inicio.length);
  return conteudo.slice(indiceInicial, indiceFinal < 0 ? undefined : indiceFinal);
};

test('AvantaVendas usa o seletor nativo ao compartilhar materiais no Android e iPhone', () => {
  assert.match(paginaVendas, /import NativeShareBridge from '.\/NativeShareBridge';/);
  assert.match(paginaVendas, /<NativeShareBridge \/>/);
  assert.match(ponteNativa, /Capacitor\.isNativePlatform\(\)/);
  assert.match(ponteNativa, /Capacitor\.isPluginAvailable\('Filesystem'\)/);
  assert.match(ponteNativa, /Capacitor\.isPluginAvailable\('Share'\)/);
  assert.match(ponteNativa, /await Share\.share\(/);
  assert.match(ponteNativa, /files: caminhos/);
  assert.match(aplicativo, /function solicitarCompartilhamentoNativoDivulgacao/);
  assert.match(aplicativo, /solicitarCompartilhamentoNativoDivulgacao\(\[arquivo\]\)/);
});

test('navegador mantém compartilhamento do arquivo e tenta o endereço antes do download', () => {
  const compartilhamentoUnico = recorte(
    aplicativo,
    'async function compartilharMaterialDivulgacao(materialId)',
    '\nconst CONFIGURACOES_CARD_ID_POR_TITULO',
  );
  const compartilhamentoWeb = recorte(
    aplicativo,
    'async function tentarCompartilharArquivosWebDivulgacao(arquivos)',
    '\nfunction solicitarCompartilhamentoNativoDivulgacao',
  );
  assert.match(compartilhamentoUnico, /await tentarCompartilharArquivosWebDivulgacao\(\[arquivo\]\)/);
  assert.match(compartilhamentoWeb, /await navigator\.share\(\{ files: arquivos \}\)/);
  assert.match(compartilhamentoWeb, /!suporteConfirmado && !navegadorAndroidDivulgacao\(\)/);
  assert.match(compartilhamentoUnico, /await navigator\.share\(\{ url: material\.arquivo_url \}\)/);
  assert.match(compartilhamentoUnico, /baixarArquivoGeradoVendas\(arquivo, arquivo\.name\)/);
});

test('arquivo de divulgação recebe MIME e extensão aceitos pelo compartilhamento do Android', () => {
  const preparo = recorte(
    aplicativo,
    'function tipoMimeMaterialDivulgacao(material, blob)',
    '\nfunction atualizarBotoesCompartilharMaterial',
  );
  assert.match(preparo, /material\?\.mime_type/);
  assert.match(preparo, /tiposPorExtensao/);
  assert.match(preparo, /return 'image\/jpeg'/);
  assert.match(preparo, /new Blob\(\[blobRecebido\], \{ type: tipoMime \}\)/);
  assert.match(preparo, /new File\([\s\S]+\{ type: tipoMime \}/);
  assert.doesNotMatch(preparo, /application\/octet-stream/);
});

test('feedback não exige leitura da linha inserida para confirmar o envio', () => {
  const feedbackVendas = recorte(clienteVendas, 'async function saveFeedback(', '\n  window.VendasDb');
  const feedbackMobile = recorte(mobile, 'async function enviarFeedbackMobile()', '\n  function cancelarJanelasMobile');
  const feedbackWeb = recorte(banco, 'export async function salvarFeedback(', '\nexport async function inserirDespesasPadraoPerfil');
  for (const trecho of [feedbackVendas, feedbackMobile, feedbackWeb]) {
    assert.doesNotMatch(trecho, /\.select\(\)\s*\.single\(\)/);
    assert.match(trecho, /\.from\('feedbacks'\)\s*\.insert\(/);
  }
});

test('aviso Tudo certo permanece pela metade do tempo anterior', () => {
  assert.match(aplicativo, /sucesso: \{ titulo: 'Tudo certo', icone: 'check-circle', duracao: 2100 \}/);
  assert.match(aplicativo, /Math\.max\(1800, Number\(configuracao\.duracao \|\| padrao\.duracao\)\)/);
});
