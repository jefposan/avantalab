import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const ler = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const fonte = ler('app/avantavendas/sistema/app.js');
const inicio = fonte.indexOf('const preferenciasToqueTatilMenuVendas =');
const fim = fonte.indexOf('function fecharCamadasAgenda()', inicio);
assert.ok(inicio > 0 && fim > inicio);
function ambiente({ nativo, vibrar, falhaStorage = false, armazenamento = new Map() } = {}) {
  const acoes = []; let agora = 1000;
  const ctx = vm.createContext({
    state: { usuario: { id: 'jeff' }, temaEscuro: false, contaVendasAtiva: { id: 'bora' } },
    navegacaoInferiorBloqueadaAte: 0, Date: { now: () => agora }, Promise,
    acaoNavegacaoInferiorEmCurso: '', atualizarIndicadorNavegacaoInferior() {},
    window: nativo ? { __avantavendasToqueTatil: nativo } : {}, navigator: vibrar ? { vibrate: vibrar } : {},
    localStorage: {
      getItem: k => { if (falhaStorage) throw new Error('bloqueado'); return armazenamento.get(k) ?? null; },
      setItem: (k, v) => { if (falhaStorage) throw new Error('bloqueado'); armazenamento.set(k, v); },
    },
    document: { createElement: () => assert.fail('não criar elementos de animação') },
    fecharCamadasNavegacao: () => acoes.push('fechar'), setAba: aba => acoes.push(aba),
    alternarTema: ativo => acoes.push(`tema:${ativo}`), render: () => acoes.push('render'),
    abrirAcoesRapidas: () => acoes.push('novo'), abrirSalaBotoes: () => acoes.push('inicio'),
  });
  vm.runInContext(fonte.slice(inicio, fim), ctx);
  return { ctx, acoes, armazenamento, avancar: ms => { agora += ms; }, clicar(destino) {
    ctx.acionarNavegacaoInferior({ currentTarget: {}, preventDefault() {}, stopPropagation() {} }, destino);
  } };
}
test('todos os destinos navegam imediatamente sem esperar a resposta tátil', () => {
  for (const destino of ['configuracoes', 'tema', 'novo', 'inicio', 'dashboard', 'clientes', 'produtos', 'vendas', 'vender', 'agenda', 'divulgacao']) {
    let toques = 0;
    const a = ambiente({ nativo: () => { toques++; return new Promise(() => {}); } });
    a.clicar(destino); assert.equal(toques, 1);
    assert.deepEqual(a.acoes, destino === 'novo' ? ['fechar', 'render', 'novo'] : ['fechar', destino === 'tema' ? 'tema:true' : destino]);
  }
});
test('web compatível usa um pulso curto e não duplica a ponte nativa', () => {
  const pulsos = []; ambiente({ vibrar: ms => pulsos.push(ms) }).clicar('inicio');
  assert.deepEqual(pulsos, [12]);
  ambiente({ nativo: async () => {}, vibrar: () => assert.fail('não duplicar') }).clicar('inicio');
});
test('sem suporte, bloqueio ou falha do feedback não impede a ação', async () => {
  for (const config of [{}, { vibrar: () => { throw new Error('bloqueado'); } }, { nativo: () => { throw new Error('ponte'); } }, { nativo: () => Promise.reject(new Error('falha')) }]) {
    const a = ambiente(config); assert.doesNotThrow(() => a.clicar('clientes'));
    assert.deepEqual(a.acoes, ['fechar', 'clientes']);
  }
  await new Promise(r => setImmediate(r));
});
test('clique duplicado permanece protegido, sem toques extras', () => {
  let toques = 0; const a = ambiente({ vibrar: () => toques++ });
  a.clicar('clientes'); a.clicar('clientes');
  assert.equal(toques, 1); assert.equal(a.acoes.length, 2);
  a.avancar(420); a.clicar('clientes'); assert.equal(toques, 2);
});
test('opt-out persiste por usuário/aparelho, não por perfil ou conta compartilhada', () => {
  let toques = 0; const a = ambiente({ vibrar: () => toques++ });
  assert.equal(a.ctx.vibracaoMenuVendasAtiva(), true);
  a.ctx.alternarVibracaoMenuVendas(false); a.clicar('clientes'); assert.equal(toques, 0);
  a.ctx.state.contaVendasAtiva.id = 'pessoal'; assert.equal(a.ctx.vibracaoMenuVendasAtiva(), false);
  a.ctx.state.usuario.id = 'outro'; assert.equal(a.ctx.vibracaoMenuVendasAtiva(), true);
  assert.equal(ambiente({ armazenamento: a.armazenamento }).ctx.vibracaoMenuVendasAtiva(), false);
  assert.deepEqual([...a.armazenamento.keys()], ['avantalab.avantavendas.toque-tatil.v1.jeff']);
  assert.doesNotMatch(fonte.slice(inicio, fim), /salvarEstado|VendasDb|salvarPreferencias/);
});
test('armazenamento bloqueado mantém opt-out em memória sem falhar', () => {
  const a = ambiente({ falhaStorage: true, vibrar: () => assert.fail('desligado') });
  a.ctx.alternarVibracaoMenuVendas(false); a.clicar('clientes'); assert.deepEqual(a.acoes, ['fechar', 'clientes']);
});
test('círculo e timer eliminados; controle acessível e preferência disponíveis', () => {
  assert.doesNotMatch(fonte, /vendas-nav-ripple/);
  assert.doesNotMatch(ler('app/avantavendas/sistema/styles.css'), /vendas-nav-ripple/);
  assert.doesNotMatch(fonte.slice(inicio, fim), /setTimeout|animationend|createElement/);
  assert.match(fonte, /switch-line settings-haptics-toggle/);
  assert.match(fonte, /onchange="alternarVibracaoMenuVendas\(this.checked\)"/);
  assert.match(fonte, /window.alternarVibracaoMenuVendas = alternarVibracaoMenuVendas/);
});
function ponte({ plataforma = 'ios', disponivel = true } = {}) {
  const chamadas = []; let limpar; const janela = {};
  const codigo = ts.transpileModule(ler('app/avantavendas/NativeHapticsBridge.tsx'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const ctx = vm.createContext({ window: janela, exports: {}, require: nome => {
    if (nome === 'react') return { useEffect: efeito => { limpar = efeito(); } };
    if (nome === '@capacitor/core') return {
      Capacitor: { isNativePlatform: () => plataforma !== 'web', getPlatform: () => plataforma,
        isPluginAvailable: nome => disponivel && nome === (plataforma === 'android' ? 'AvantaMenuHaptics' : 'Haptics') },
      registerPlugin: nome => ({ impact: async opcoes => chamadas.push({ nome, opcoes }) }),
    };
    throw new Error(nome);
  } });
  vm.runInContext(codigo, ctx); ctx.exports.default();
  return { janela, chamadas, limpar: () => limpar?.() };
}
test('ponte usa impacto leve iOS e feedback do sistema Android', async () => {
  for (const plataforma of ['ios', 'android']) {
    const a = ponte({ plataforma }); await a.janela.__avantavendasToqueTatil();
    assert.equal(a.chamadas[0].nome, plataforma === 'android' ? 'AvantaMenuHaptics' : 'Haptics');
    if (plataforma === 'ios') assert.equal(a.chamadas[0].opcoes.style, 'LIGHT');
    a.limpar(); assert.equal(a.janela.__avantavendasToqueTatil, undefined);
  }
});
test('PWA e pacotes antigos não anunciam plugin inexistente; cleanup preserva nova ponte', () => {
  assert.equal(ponte({ plataforma: 'web' }).janela.__avantavendasToqueTatil, undefined);
  assert.equal(ponte({ disponivel: false }).janela.__avantavendasToqueTatil, undefined);
  const a = ponte(); const substituto = async () => {};
  a.janela.__avantavendasToqueTatil = substituto; a.limpar(); assert.equal(a.janela.__avantavendasToqueTatil, substituto);
});
test('nativo isolado: registro Android antes da ponte, preferências respeitadas e iOS configurado', {
  skip: !existsSync(new URL('../../native/avantavendas/package.json', import.meta.url)),
}, () => {
  const java = ler('native/avantavendas/android/app/src/main/java/br/com/avantalab/vendas/MenuHapticsPlugin.java');
  const activity = ler('native/avantavendas/android/app/src/main/java/br/com/avantalab/vendas/MainActivity.java');
  assert.match(java, /performHapticFeedback\(HapticFeedbackConstants.VIRTUAL_KEY\)/);
  assert.doesNotMatch(java, /FLAG_IGNORE|Vibrator|createWaveform|createOneShot/);
  assert.ok(activity.indexOf('registerPlugin(MenuHapticsPlugin.class)') < activity.indexOf('super.onCreate'));
  assert.match(ler('native/avantavendas/ios/App/CapApp-SPM/Package.swift'), /CapacitorHaptics/);
  assert.match(ler('native/avantavendas/ios/App/App/capacitor.config.json'), /HapticsPlugin/);
  assert.equal(JSON.parse(ler('native/avantavendas/package.json')).dependencies['@capacitor/haptics'], '8.0.2');
  assert.ok(!JSON.parse(ler('package.json')).dependencies['@capacitor/haptics']);
});
