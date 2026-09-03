import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const [aplicacao, estilos] = await Promise.all([
  readFile(resolve(raiz, 'app/avantavendas/sistema/app.js'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/sistema/styles.css'), 'utf8'),
]);

const inicioCompartilhamento = aplicacao.indexOf('async function compartilharMateriaisSelecionadosDivulgacao()');
const fimCompartilhamento = aplicacao.indexOf('\nasync function compartilharMaterialDivulgacao(', inicioCompartilhamento);
const compartilhamentoMultiplo = aplicacao.slice(inicioCompartilhamento, fimCompartilhamento);
const inicioCompartilhamentoUnico = fimCompartilhamento + 1;
const fimCompartilhamentoUnico = aplicacao.indexOf('\nconst CONFIGURACOES_CARD_ID_POR_TITULO', inicioCompartilhamentoUnico);
const compartilhamentoUnico = aplicacao.slice(inicioCompartilhamentoUnico, fimCompartilhamentoUnico);
const inicioPreparoUnico = aplicacao.indexOf('async function prepararCompartilhamentoMaterialDivulgacao(');
const fimPreparoUnico = aplicacao.indexOf('\nfunction podeCompartilharArquivosDivulgacao(', inicioPreparoUnico);
const preparoUnico = aplicacao.slice(inicioPreparoUnico, fimPreparoUnico);
const inicioDivulgacao = aplicacao.indexOf('function renderDivulgacao()');
const fimDivulgacao = aplicacao.indexOf('\nfunction abrirPastaDivulgacao(', inicioDivulgacao);
const renderizacaoDivulgacao = aplicacao.slice(inicioDivulgacao, fimDivulgacao);
const inicioVisualizador = aplicacao.indexOf('function conteudoVisualizadorMaterialDivulgacao(');
const fimVisualizador = aplicacao.indexOf('\nfunction encerrarRenderizacaoPdfMaterial(', inicioVisualizador);
const visualizadorDivulgacao = aplicacao.slice(inicioVisualizador, fimVisualizador);
const inicioPdf = fimVisualizador + 1;
const fimPdf = aplicacao.indexOf('\nfunction abrirMaterialDivulgacao(', inicioPdf);
const visualizadorPdf = aplicacao.slice(inicioPdf, fimPdf);
const inicioAtualizacao = aplicacao.indexOf('async function atualizarDivulgacao(');
const fimAtualizacao = aplicacao.indexOf('\nfunction posicionarIndicadorAtualizacaoDivulgacao(', inicioAtualizacao);
const atualizacaoDivulgacao = aplicacao.slice(inicioAtualizacao, fimAtualizacao);

test('Divulgação permite selecionar até dez arquivos da pasta atual', () => {
  assert.match(aplicacao, /const LIMITE_SELECAO_MATERIAIS_DIVULGACAO = 10;/);
  assert.match(aplicacao, /const divulgacaoMateriaisSelecionados = new Set\(\);/);
  assert.match(aplicacao, /aria-pressed="\$\{selecionado\}"/);
  assert.match(aplicacao, /Selecionar mais/);
  assert.match(estilos, /\.material-thumb\.is-selected/);
  assert.match(estilos, /\.material-selection-bar \{ position: fixed;/);
});

test('Selecionar fica na linha da pasta e somente aparece com mais de um arquivo', () => {
  assert.match(renderizacaoDivulgacao, /const materiaisDaPasta = pastaAtual/);
  assert.match(renderizacaoDivulgacao, /const acaoSelecao = pastaAtual && materiaisDaPasta\.length > 1/);
  assert.match(renderizacaoDivulgacao, /Pasta atual: <b>\$\{escapeHtml\(pastaAtual\.nome\)\}<\/b><\/p>\$\{acaoSelecao\}<\/div>/);
  assert.match(renderizacaoDivulgacao, /renderBarraBusca\('Pesquisar pastas ou materiais', 'Ordem Alfabética', true\)\}\$\{navegacao\}/);
  assert.doesNotMatch(renderizacaoDivulgacao, /renderBarraBusca\([^\n]+acaoSelecao/);
  assert.match(estilos, /\.material-page-location \.material-select-mode \{ display: grid;[^}]+place-items: center;[^}]+background: #1687D9;[^}]+text-align: center;/);
  assert.match(estilos, /\.material-page-location \.material-select-mode \.svg-icon \{ display: none; \}/);
});

test('nome técnico do material fica oculto na listagem e no visualizador', () => {
  assert.match(renderizacaoDivulgacao, /<small>\$\{rotulo\}<\/small>/);
  assert.doesNotMatch(renderizacaoDivulgacao, /<b>\$\{escapeHtml\(item\.titulo\)\}<\/b>/);
  assert.match(renderizacaoDivulgacao, /aria-label="Abrir \$\{rotulo\.toLocaleLowerCase\('pt-BR'\)\} \$\{posicao\}"/);
  assert.match(visualizadorDivulgacao, /<h2>\$\{rotulo\}<\/h2>/);
  assert.match(visualizadorDivulgacao, /alt="\$\{descricaoAcessivel\}"/);
  assert.doesNotMatch(visualizadorDivulgacao, /escapeHtml\(material\.titulo\)|escapeAttr\(material\.titulo\)/);
});

test('PDF possui tela cheia com links externos e navegação interna preservados', () => {
  assert.match(visualizadorDivulgacao, /class="material-pdf-fullscreen-toggle" onclick="alternarPdfTelaCheia\(\)"/);
  assert.match(visualizadorDivulgacao, /id="materialPdfPageStatus"/);
  assert.match(visualizadorDivulgacao, /material-pdf-fullscreen-share/);
  assert.match(visualizadorPdf, /function alternarPdfTelaCheia\(ativar = null\)/);
  assert.match(visualizadorPdf, /function numeroPaginaDestinoPdf\(/);
  assert.match(visualizadorPdf, /\^\(https\?:\|mailto:\|tel:\|sms:\|whatsapp:\)/);
  assert.match(visualizadorPdf, /documento\.getDestination\(destino\)/);
  assert.match(visualizadorPdf, /documento\.getPageIndex\(referencia\)/);
  assert.match(visualizadorPdf, /container\.scrollTo\(\{/);
  assert.match(estilos, /\.material-preview-backdrop\.material-pdf-fullscreen \{/);
  assert.match(estilos, /touch-action: pan-x pan-y pinch-zoom/);
});

test('arquivos são preparados em sequência e compartilhados sem texto automático', () => {
  assert.ok(inicioCompartilhamento >= 0 && fimCompartilhamento > inicioCompartilhamento);
  assert.match(compartilhamentoMultiplo, /for \(let indice = 0; indice < materiais\.length; indice \+= 1\)/);
  assert.match(compartilhamentoMultiplo, /navigator\.share\(\{ files: arquivos \}\)/);
  assert.doesNotMatch(compartilhamentoMultiplo, /navigator\.share\(\{[^}]*\b(?:text|title|url)\s*:/);
  assert.match(compartilhamentoMultiplo, /zip\.generateAsync\(\{ type: 'blob', compression: 'STORE' \}\)/);
  assert.match(compartilhamentoMultiplo, /materiais-avantalab\.zip/);
});

test('vídeo é preparado antes do toque que abre o compartilhamento no iPhone', () => {
  assert.match(aplicacao, /let arquivoMaterialDivulgacaoPreparado = null;/);
  assert.match(aplicacao, /aria-busy="true" disabled>\$\{svgIcon\('save'\)\}<span>Preparando material/);
  assert.match(aplicacao, /void prepararCompartilhamentoMaterialDivulgacao\(materialId\);/);
  assert.match(preparoUnico, /arquivoMaterialDivulgacaoPreparado = \{ materialId, arquivo \};/);
  assert.match(aplicacao, /document\.querySelectorAll\('\.material-share'\)/);
  assert.match(preparoUnico, /atualizarBotoesCompartilharMaterial\(\{ desabilitado: false, ocupado: false, rotulo: 'Compartilhar material' \}\)/);
  assert.match(compartilhamentoUnico, /const preparado = arquivoMaterialDivulgacaoPreparado\?\.materialId === materialId/);
  assert.doesNotMatch(compartilhamentoUnico, /await prepararArquivoMaterialDivulgacao/);
  assert.match(compartilhamentoUnico, /await navigator\.share\(\{ files: \[arquivo\] \}\)/);
});

test('falhas do compartilhamento nunca exibem a mensagem técnica em inglês', () => {
  assert.match(aplicacao, /function traduzErroCompartilhamento\(error\)/);
  assert.match(aplicacao, /request is not allowed\|user denied permission\|permission denied/);
  assert.match(aplicacao, /return 'Tente novamente\.';/);
  assert.match(aplicacao, /titulo: 'Não foi possível enviar o arquivo'/);
  assert.match(aplicacao, /const parecePortugues = \/\[áàâãéêíóôõúç\]/);
  assert.match(aplicacao, /!parecePortugues\) return 'Não foi possível concluir a operação/);
  assert.doesNotMatch(compartilhamentoUnico, /toast\(traduzErro\(error\)\)/);
  assert.doesNotMatch(compartilhamentoMultiplo, /toast\(traduzErro\(error\)\)/);
});

test('botão Atualizar relê somente o conteúdo da Divulgação', () => {
  assert.match(renderizacaoDivulgacao, /id="divulgacaoAtualizar"[^>]+onclick="atualizarDivulgacao\('botao'\)"/);
  assert.match(renderizacaoDivulgacao, /<div class="module-title"><div><h2>Divulgação<\/h2>/);
  assert.match(atualizacaoDivulgacao, /window\.VendasDb\.carregarDivulgacao\(\)/);
  assert.match(atualizacaoDivulgacao, /state\.divulgacaoPastas = dados\.divulgacaoPastas/);
  assert.match(atualizacaoDivulgacao, /state\.divulgacaoMateriais = dados\.divulgacaoMateriais/);
  assert.doesNotMatch(atualizacaoDivulgacao, /loadAll|carregarDadosBackend|location\.reload/);
  assert.match(atualizacaoDivulgacao, /botao\.disabled = divulgacaoAtualizando/);
  assert.match(atualizacaoDivulgacao, /aria-busy/);
  assert.match(estilos, /\.divulgacao-refresh-button \{[^}]+min-height: 44px;[^}]+background: #1687D9;/);
});
