import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const despesas = readFileSync('app/components/TabelaLancamentosDespesa.tsx', 'utf8');
const receitas = readFileSync('app/components/TabelaEntradasFaturamento.tsx', 'utf8');
const database = readFileSync('app/lib/database.ts', 'utf8');
const mobile = readFileSync('public/mobile-app.js', 'utf8');

test('previsões da Gestão Web podem ser aceitas com a data de hoje', () => {
  assert.match(gestao, /const dataFinanceiraDeHoje = \(\) =>/);
  assert.match(gestao, /const aceitarDespesaPrevistaHoje = async/);
  assert.match(gestao, /const aceitarReceitaPrevistaHoje = async/);
  assert.match(gestao, /ano: hoje\.ano,[\s\S]*mes: hoje\.mes,[\s\S]*dia: hoje\.dia,[\s\S]*status: 'confirmada'/);
  assert.match(gestao, /anoDestino: hoje\.ano,[\s\S]*mesDestino: hoje\.mes/);
  assert.match(gestao, /if \(lancamento\) await aceitarDespesaPrevistaHoje\(lancamento\)/);
  assert.match(gestao, /if \(entrada\) await aceitarReceitaPrevistaHoje\(entrada\)/);
});

test('linhas da Gestão Web abrem para edição e mostram aceitar hoje somente em previsões', () => {
  assert.match(despesas, /onAceitarPrevistaHoje: \(lancamento: LancamentoDespesa\)/);
  assert.match(despesas, /Aceitar hoje/);
  assert.match(despesas, /onClick=\{\(event\) => \{[\s\S]*?iniciarEdicaoLancamento\(lanc\)/);
  assert.match(receitas, /onAceitarPrevistaHoje: \(entrada: EntradaFaturamento\)/);
  assert.match(receitas, /Aceitar hoje/);
  assert.match(receitas, /onClick=\{\(event\) => \{[\s\S]*?onIniciarEdicaoEntrada\(entrada\)/);
});

test('atualização de receita permite mover a previsão para o mês e ano efetivos', () => {
  assert.match(database, /anoDestino\?: number;/);
  assert.match(database, /mesDestino\?: string;/);
  assert.match(database, /ano: anoDestino \?\? ano,[\s\S]*mes: mesDestino \?\? mes/);
});

test('Gestão Mobile oferece aceitar hoje para previsão e abre confirmados em edição', () => {
  assert.match(mobile, /function periodoFinanceiroHojeMobile\(\)/);
  assert.match(mobile, /async function aceitarPrevistaHojeMobile\(tipo, id\)/);
  assert.match(mobile, /ano: periodo\.ano, mes: periodo\.mes, dia: periodo\.dia, status: 'confirmada'/);
  assert.match(mobile, /modo: !caixinha && item\.status !== 'prevista' \? 'editar' : 'opcoes'/);
  assert.match(mobile, /id="aceitar-prevista-hoje"/);
  assert.match(mobile, /bind\('aceitar-prevista-hoje'/);
  assert.match(mobile, /var periodoConfirmacao = confirmarAgora \? periodoFinanceiroHojeMobile\(\) : null;/);
  assert.match(mobile, /var anoDestino = confirmarAgora \? periodoConfirmacao\.ano : Number\(state\.ano\);/);
  assert.match(mobile, /var mesDestino = confirmarAgora \? periodoConfirmacao\.mes : mesItem;/);
  assert.match(mobile, /var dia = confirmarAgora \? periodoConfirmacao\.dia : diaInformado;/);
  assert.match(mobile, /id="confirmar-edicao-prevista"[\s\S]*?Confirmar hoje/);
  assert.match(mobile, /id="confirmar-prevista-na-data"[\s\S]*?Confirmar na data/);
});


test('confirmar despesa na data preserva a competência, o dia e a recorrência na Web e no Mobile', async () => {
  const item = { id: 'f', mes: 'OUTUBRO', dia: 5, despesa: 'Contabilidade', descricao: 'Mensalidade', valor: 200, tipo: 'fixa', status: 'prevista', revisao: 4 };
  const hoje = { ano: 2026, mes: 'NOVEMBRO', dia: 9 };
  const webHandler = gestao.slice(gestao.indexOf('const confirmarPagamentoDespesaPrevista ='), gestao.indexOf('const aceitarDespesaPrevistaHoje ='));
  const mobileHandler = mobile.slice(mobile.indexOf('async function aceitarPrevistaMobile('), mobile.indexOf('async function aceitarPrevistaHojeMobile('));

  for (const manterData of [true, false]) {
    const webWrites = [], mobileWrites = [];
    const lancamento = { ...item };
    const webContext = {
      empresaId: 'empresa', podeEditarLancamentos: true, anoSelecionado: '2026', mesAtivo: 'OUTUBRO',
      meses: ['OUTUBRO', 'NOVEMBRO'], lancamentos: [lancamento], dataFinanceiraDeHoje: () => hoje,
      getMaxDias: () => 31, dataFutura: (_ano, _mes, dia) => dia > 9,
      abrirAviso: () => {}, iniciarProcessamentoLancamento: () => true, finalizarProcessamentoLancamento: () => {},
      atualizarLancamento: async (payload) => { webWrites.push(payload); return { data: { revisao: 5 } }; },
      setLancamentos: (atualizar) => atualizar([lancamento]), formatarDescricao: (value) => value,
      cancelarEdicaoLancamento: () => {}, notificarFinanceiroAtualizado: () => {},
    };
    vm.runInNewContext(ts.transpile(`${webHandler}
this.confirmar = confirmarPagamentoDespesaPrevista;`), webContext);
    await webContext.confirmar(lancamento, manterData);

    const mobileContext = {
      state: { empresa: { id: 'empresa' }, ano: '2026', mes: 'OUTUBRO', lancamentos: [lancamento] },
      edicaoPendenteBloqueiaAcaoMobile: () => false, periodoFinanceiroHojeMobile: () => hoje,
      indiceMes: () => 0, maxDias: () => 31, dataFutura: (_ano, _mes, dia) => dia > 9, setErro: () => {},
      enfileirarEdicaoFinanceiraMobile: async (_tipo, _item, payload) => mobileWrites.push(payload),
    };
    vm.runInNewContext(`${mobileHandler}
this.confirmar = aceitarPrevistaMobile;`, mobileContext);
    await mobileContext.confirmar('despesa', lancamento.id, manterData);
    for (const payload of [webWrites[0], mobileWrites[0]]) {
      assert.equal(payload.ano, 2026);
      assert.equal(payload.mes, manterData ? 'OUTUBRO' : 'NOVEMBRO');
      assert.equal(payload.dia, manterData ? 5 : 9);
      assert.equal(payload.status, 'confirmada');
      assert.equal(payload.valor, 200);
      assert.equal(payload.tipoObs ?? payload.tipo_obs, 'fixa');
    }
    lancamento.dia = 12;
    await webContext.confirmar(lancamento, true);
    await mobileContext.confirmar('despesa', lancamento.id, true);
    assert.equal(webWrites.length, 1, 'a data futura não gera gravação Web');
    assert.equal(mobileWrites.length, 1, 'a data futura não gera gravação Mobile');
  }
});
