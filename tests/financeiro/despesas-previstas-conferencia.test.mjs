import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { despesasComMesmoValor, mensagemDespesasMesmoValor } from '../../app/lib/despesas-conferencia.ts';

const mobile = readFileSync('public/mobile-app.js', 'utf8');
const web = readFileSync('app/gestao/page.tsx', 'utf8');
const meses = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
const trecho = (inicio, fim) => mobile.slice(mobile.indexOf(inicio), mobile.indexOf(fim, mobile.indexOf(inicio)));
const conferencia = trecho('function despesasComMesmoValorMobile(', 'function solicitarDialogoSistemaMobile(');
const salvar = trecho('async function salvarEdicaoLancamentoSelecionado(', 'function periodoFinanceiroHojeMobile()');
const datas = trecho('function dataFutura(', 'function lerParcelamentoEditavelMobile(');

class DataFixa extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-10-07T12:00:00-03:00'])); }
}

function contextoEditor({ tipo = null, status = 'confirmada', dia = '8', erro = false, confirmarDuplicado = true } = {}) {
  const item = { id: 'editado', mes: 'OUTUBRO', dia: 6, despesa: 'Fornecedor', descricao: tipo === 'parcela' ? 'Caixas (2/3)' : 'Caixas', valor: 90, status, tipo, revisao: 7, recorrenciaId: tipo === 'fixa' ? 'recorrencia' : null };
  const state = { empresa: { id: 'empresa' }, ano: '2026', mes: 'OUTUBRO', modalAcao: { tipo: 'despesa', item }, faturamentos: {} };
  const campos = { 'editar-dia': dia, 'editar-despesa': 'Fornecedor', 'editar-descricao': 'Caixas', 'editar-valor': '90,00', 'editar-parcela-atual': '2', 'editar-total-parcelas': '3' };
  const eventos = [];
  let dados;
  let resolverBanco;
  const pendente = new Promise((resolve) => { resolverBanco = resolve; });
  const consulta = {
    update(value) { dados = value; eventos.push('update'); return this; },
    eq(chave, valor) { eventos.push([chave, valor]); return this; },
    select() { return this; },
    async single() { await pendente; return erro ? { error: { code: 'PGRST116' }, data: null } : { data: { ...dados, id: item.id }, error: null }; },
  };
  const ctx = {
    state, Date: DataFixa, maxDias: () => 31, campo: (id) => campos[id] || '',
    normalizarValor: (valor) => Number(valor.replace(',', '.')), formatarDescricao: (v) => v,
    indiceMes: (mes) => meses.indexOf(mes),
    lerParcelamentoEditavelMobile: () => ({ parcelaAtual: 2, totalParcelas: 3 }),
    descricaoComParcelamentoMobile: (base, atual, total) => `${base} (${atual}/${total})`,
    confirmarDespesasMesmoValorMobile: async () => confirmarDuplicado,
    periodoFinanceiroHojeMobile: () => ({ ano: 2026, mes: 'OUTUBRO', dia: 7 }),
    setErro: (e) => eventos.push(e),
    iniciarAplicacaoLancamentoMobile: () => eventos.push('inicio'),
    falharAplicacaoLancamentoMobile: () => eventos.push('erro'),
    aplicarDespesaPrevistaSalvaMobile: () => eventos.push('aplicou'),
    concluirAplicacaoLancamentoMobile: () => eventos.push('sucesso'),
    render: () => {}, carregarDados: async () => {},
    db: { from: (tabela) => { assert.equal(tabela, 'lancamentos'); return consulta; } },
  };
  vm.runInNewContext(`${datas}\n${salvar}\nthis.salvar = salvarEdicaoLancamentoSelecionado;`, ctx);
  return { ctx, state, campos, eventos, resolverBanco, dados: () => dados };
}

for (const tipo of [null, 'fixa', 'parcela']) {
  test(`mobile: adiar um dia torna ${tipo || 'despesa comum'} prevista, sem mudar valor ou sequência`, async () => {
    const c = contextoEditor({ tipo });
    const promessa = c.ctx.salvar(false);
    await new Promise(setImmediate);
    assert.equal(c.dados().status, 'prevista');
    assert.equal(c.dados().tipo_obs, tipo || 'previsto');
    assert.equal(c.dados().valor, 90);
    assert.equal(c.dados().descricao, tipo === 'parcela' ? 'Caixas (2/3)' : 'Caixas');
    assert.ok(c.state.modalAcao, 'o editor não pode fechar antes do banco');
    assert.ok(c.eventos.some((e) => Array.isArray(e) && e[0] === 'revisao' && e[1] === 7));
    c.resolverBanco(); await promessa;
    assert.equal(c.state.modalAcao, null);
    assert.ok(c.eventos.includes('aplicou'));
  });
}

test('mobile: hoje/passado preservam pagamento e previsão não se efetiva sozinha', async () => {
  for (const status of ['confirmada', 'prevista']) {
    for (const dia of ['6', '7']) {
      const c = contextoEditor({ status, dia });
      const p = c.ctx.salvar(false); await new Promise(setImmediate);
      assert.equal(c.dados().status, status);
      c.resolverBanco(); await p;
    }
  }
});

test('mobile: Salvar previsto não interpreta evento de clique como Confirmar hoje', async () => {
  const c = contextoEditor({ status: 'prevista', dia: '8' });
  const p = c.ctx.salvar({ type: 'click' }); await new Promise(setImmediate);
  assert.equal(c.dados().status, 'prevista'); assert.equal(c.dados().dia, 8);
  c.resolverBanco(); await p;
  assert.match(mobile, /bind\('salvar-edicao-lancamento', function \(\) \{ salvarEdicaoLancamentoSelecionado\(false\); \}\)/);
});

test('mobile: erro de banco ou conflito mantém editor e não emite sucesso', async () => {
  const c = contextoEditor({ tipo: 'parcela', erro: true });
  const p = c.ctx.salvar(false); await new Promise(setImmediate);
  c.resolverBanco(); await p;
  assert.ok(c.state.modalAcao); assert.ok(c.eventos.includes('erro'));
  assert.ok(!c.eventos.includes('sucesso')); assert.ok(!c.eventos.includes('aplicou'));
});

test('mobile: cancelar aviso de mesmo valor não grava nem fecha a edição', async () => {
  const c = contextoEditor({ confirmarDuplicado: false });
  await c.ctx.salvar(false);
  assert.ok(c.state.modalAcao); assert.equal(c.dados(), undefined);
});

test('datas: amanhã, mês e ano seguintes são futuros; hoje e passado não', () => {
  const ctx = { Date: DataFixa };
  vm.runInNewContext(`${datas}\nthis.futura = dataFutura;`, ctx);
  for (const [ano, mes, dia, esperado] of [[2026,9,8,true],[2026,10,1,true],[2027,0,1,true],[2026,9,7,false],[2026,9,6,false],[2025,11,31,false]]) {
    assert.equal(ctx.futura(ano, mes, dia), esperado);
  }
});

test('conferência web/mobile: nomes diferentes, centavos, canceladas, mês e próprio registro', () => {
  const lista = [
    { id:'1',mes:'OUTUBRO',dia:4,despesa:'Aluguel',descricao:'Sede (1/3)',valor:90,status:'prevista' },
    { id:'2',mes:'OUTUBRO',dia:3,despesa:'Outro nome',descricao:'Caixas',valor:90.0000000001,status:'confirmada' },
    { id:'3',mes:'SETEMBRO',dia:4,despesa:'Outro mês',valor:90 },
    { id:'4',mes:'OUTUBRO',dia:4,despesa:'Cancelada',valor:90,status:'cancelada' },
    { id:'5',mes:'OUTUBRO',dia:4,despesa:'Outro valor',valor:90.01 },
  ];
  const ctx = { state: { duplicadosAtivo: true }, lancamentosDoCentroCustoAtualMobile: () => lista, indiceMes: (mes) => meses.indexOf(mes) };
  vm.runInNewContext(`${conferencia}\nthis.iguais = despesasComMesmoValorMobile; this.mensagem = mensagemDespesasMesmoValorMobile;`, ctx);
  assert.deepEqual(despesasComMesmoValor(lista,90,'OUTUBRO').map((i) => i.id),['2','1']);
  assert.deepEqual(Array.from(ctx.iguais(90,'OUTUBRO'),(i) => i.id),['2','1']);
  assert.deepEqual(despesasComMesmoValor(lista,90,'OUTUBRO',1).map((i) => i.id),['2']);
  assert.deepEqual(Array.from(ctx.iguais(90,'OUTUBRO',1),(i) => i.id),['2']);
  assert.equal(despesasComMesmoValor(lista,NaN,'OUTUBRO').length,0);
  const encontrados = despesasComMesmoValor(lista,90,'OUTUBRO');
  const mensagem = mensagemDespesasMesmoValor(encontrados,2026);
  assert.equal(ctx.mensagem(encontrados,2026),mensagem);
  for(const texto of ['03/10/2026','04/10/2026','Aluguel','Outro nome','Sede (1/3)','Caixas','90,00','Prevista','Confirmada']) assert.ok(mensagem.includes(texto));
});

test('mobile: diálogo preserva o rascunho ao cancelar e usa dados já restritos ao centro', async () => {
  const valores = { 'editar-dia': { value:'8' }, 'editar-descricao': { value:'alteração' }, 'editar-valor': { value:'90,00' } };
  const state = { empresa:{id:'empresa'}, ano:'2026', modalAcao:{tipo:'despesa'}, duplicadosAtivo:true };
  const ctx = { state,
    lancamentosDoCentroCustoAtualMobile: () => [{id:'outra',mes:'OUTUBRO',dia:1,despesa:'Sede',valor:90}],
    indiceMes:(mes) => meses.indexOf(mes), campo:(id) => valores[id]?.value || '',
    document:{getElementById:(id) => valores[id]}, atualizarAvisoDataFuturaDespesaMobile:()=>{},
    solicitarDialogoSistemaMobile:async (config) => { assert.match(config.mensagem,/Sede/); for(const campo of Object.values(valores)) campo.value=''; return 'revisar'; },
  };
  vm.runInNewContext(`${conferencia}\nthis.confirmar = confirmarDespesasMesmoValorMobile;`,ctx);
  assert.equal(await ctx.confirmar(90,'OUTUBRO',2026,'editado'),false);
  assert.equal(valores['editar-dia'].value,'8'); assert.equal(valores['editar-descricao'].value,'alteração'); assert.equal(valores['editar-valor'].value,'90,00');
});

test('web: status futuro tem precedência sobre parcela e aviso ignora próprio registro', () => {
  const codigo = web.slice(web.indexOf('const salvarEdicaoLancamento ='),web.indexOf('const dataFinanceiraDeHoje ='));
  assert.match(codigo,/const statusEditado = confirmarAgora\s*\? 'confirmada'\s*: ehFuturaEditada \|\| continuavaPrevista\s*\? 'prevista'/);
  assert.match(codigo,/despesasComMesmoValor\(lancamentos, editValorNumerico, mesAtivo, lancamentoEditandoId\)/);
  assert.match(web,/despesasComMesmoValor\(lancamentos, valorNumericoRaw, mesAtivo\)/);
  assert.doesNotMatch(web,/l\.despesa === formDespesa && l\.valor === valorNumericoRaw/);
  assert.match(codigo,/if \(!salvo\.erro && salvo\.data\) \{[\s\S]*cancelarEdicaoLancamento\(\)/);
});

test('mobile: novo lançamento em outro ano consulta só o perfil e centro corretos', async () => {
  const filtros = [];
  const consulta = {
    select() { return this; },
    eq(chave,valor) { filtros.push([chave,valor]); return this; },
    then(resolver) { return Promise.resolve({data:[{id:'futuro',mes:'JANEIRO',dia:2,despesa_nome:'Fornecedor 2027',valor:90,status:'prevista'}]}).then(resolver); },
  };
  const ctx = {
    state:{empresa:{id:'perfil'},ano:'2026',duplicadosAtivo:true,centrosCustoAtivo:true,centroCustoSelecionadoId:'centro',modalAcao:null},
    lancamentosDoCentroCustoAtualMobile:()=>[], indiceMes:(mes)=>meses.indexOf(mes), campo:()=>'',
    document:{getElementById:()=>null}, atualizarAvisoDataFuturaDespesaMobile:()=>{},
    db:{from:(tabela)=>{assert.equal(tabela,'lancamentos');return consulta;}},
    solicitarDialogoSistemaMobile:async(config)=>{assert.match(config.mensagem,/02\/01\/2027 · Fornecedor 2027/);return 'salvar';},
  };
  vm.runInNewContext(`${conferencia}\nthis.confirmar = confirmarDespesasMesmoValorMobile;`,ctx);
  assert.equal(await ctx.confirmar(90,'JANEIRO',2027),true);
  assert.deepEqual(filtros,[['empresa_id','perfil'],['ano',2027],['mes','JANEIRO'],['valor',90],['centro_custo_id','centro']]);
});

test('mobile: aviso desativado não abre diálogo nem consulta', async () => {
  const ctx={state:{duplicadosAtivo:false}};
  vm.runInNewContext(`${conferencia}\nthis.confirmar = confirmarDespesasMesmoValorMobile;`,ctx);
  assert.equal(await ctx.confirmar(90,'OUTUBRO',2026),true);
});
