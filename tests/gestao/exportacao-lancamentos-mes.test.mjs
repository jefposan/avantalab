import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const raiz = new URL('../..', import.meta.url);
const ler = (caminho) => readFile(new URL(caminho, raiz), 'utf8');

test('exportação mensal gera os dois formatos com receitas e despesas', async () => {
  const fonte = await ler('app/lib/exportacao-lancamentos-mes.ts');
  assert.match(fonte, /exportarLancamentosMesExcel/);
  assert.match(fonte, /exportarLancamentosMesPdf/);
  assert.match(fonte, /gerarLancamentosMesExcel/);
  assert.match(fonte, /gerarLancamentosMesPdf/);
  assert.match(fonte, /type: 'array'/);
  assert.match(fonte, /await import\('xlsx'\)/);
  assert.match(fonte, /await import\('pdf-lib'\)/);
  assert.match(fonte, /linha\.tipo === 'Receita'/);
  assert.match(fonte, /linha\.tipo === 'Despesa'/);
});

test('Gestão Web oferece exportação na competência selecionada', async () => {
  const pagina = await ler('app/gestao/page.tsx');
  const componente = await ler('app/components/ExportarLancamentosMes.tsx');
  assert.match(pagina, /opcoesExportacaoMensal/);
  assert.match(pagina, /<ExportarLancamentosMes/);
  assert.match(pagina, /mesInicial=\{mesAtivo \|\| ''\}/);
  assert.match(pagina, /faturamentosEntradas/);
  assert.match(pagina, /Exportar relatório/);
  assert.match(pagina, /setExportacaoRelatorioAberta\(true\)/);
  assert.doesNotMatch(componente, /Exportar mês/);
  assert.match(componente, /Incluir no relatório/);
  assert.match(componente, /Previstos/);
  assert.match(componente, /anosComDados/);
  assert.match(componente, /mesesComDados/);
  assert.match(componente, /onAbertoChange/);
});

test('Gestão Mobile usa uma ponte segura para arquivos e não abre-fecha o menu no mesmo toque', async () => {
  const mobile = await ler('public/mobile-app.js');
  const ponte = await ler('app/mobile/ExportarLancamentosMobileBridge.tsx');
  const pacote = await ler('package.json');
  const android = await ler('android/app/capacitor.build.gradle');
  const ios = await ler('ios/App/CapApp-SPM/Package.swift');
  const privacidadeIos = await ler('ios/App/App/PrivacyInfo.xcprivacy');
  assert.match(mobile, /function abrirMenuPelaNavegacao\(\)[\s\S]*?state\.menuAnimacao = 'entrar';[\s\S]*?render\(\);[\s\S]*?state\.menuAnimacao = '';/);
  assert.match(mobile, /botaoAbrirMenu\.addEventListener\('pointerdown'/);
  assert.match(mobile, /if \(event\.detail !== 0\) return;/);
  assert.match(mobile, /_avaMenuAbertoEm/);
  assert.match(mobile, /avantalab:exportar-lancamentos-mes/);
  assert.match(mobile, /menu-exportar-mes/);
  assert.doesNotMatch(mobile, /id="exportar-lancamentos-mes"/);
  assert.match(mobile, /exportacao-mes-previstos/);
  assert.match(mobile, /exportacao-mes-ano/);
  assert.match(mobile, /mesesComDadosExportacaoMobile/);
  assert.match(mobile, /grid-cols-\[minmax\(0,1fr\)_104px\]/);
  assert.match(mobile, /exportar-mes-excel/);
  assert.match(ponte, /gerarLancamentosMesExcel/);
  assert.match(ponte, /gerarLancamentosMesPdf/);
  assert.match(ponte, /Capacitor\.isNativePlatform/);
  assert.match(ponte, /Capacitor\.isPluginAvailable\('Filesystem'\)/);
  assert.match(ponte, /Capacitor\.isPluginAvailable\('Share'\)/);
  assert.match(ponte, /Filesystem\.writeFile/);
  assert.match(ponte, /Share\.share/);
  assert.match(ponte, /navigator\.share/);
  assert.match(ponte, /compartilhamentoCancelado/);
  assert.match(mobile, /Arquivo disponibilizado para salvar ou compartilhar/);
  assert.match(pacote, /@capacitor\/filesystem/);
  assert.match(pacote, /@capacitor\/share/);
  assert.match(android, /project\(':capacitor-filesystem'\)/);
  assert.match(android, /project\(':capacitor-share'\)/);
  assert.match(ios, /CapacitorFilesystem/);
  assert.match(ios, /CapacitorShare/);
  assert.match(privacidadeIos, /NSPrivacyAccessedAPICategoryFileTimestamp/);
});
