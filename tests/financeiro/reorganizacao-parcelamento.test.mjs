import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const tabelaDespesas = readFileSync('app/components/TabelaLancamentosDespesa.tsx', 'utf8');
const mobile = readFileSync('public/mobile-app.js', 'utf8');
const migration = readFileSync('supabase/migrations/20260921090000_reorganizar_parcelamento_despesa.sql', 'utf8');

test('Gestão Web separa a descrição da identificação da parcela e pede confirmação antes de reorganizar', () => {
  assert.match(gestao, /function lerParcelamentoEditavel\(descricao: string \| null \| undefined\)/);
  assert.match(gestao, /function descricaoComParcelamento\(descricaoBase: string, parcelaAtual: number, totalParcelas: number\)/);
  assert.match(gestao, /setEditDescricao\(parcelamento\?\.descricaoBase \|\| lanc\.descricao \|\| ''\)/);
  assert.match(gestao, /reorganizar_parcelamento_despesa_rpc/);
  assert.match(gestao, /titulo: 'Reorganizar parcelamento\?'/);
  assert.match(gestao, /As parcelas seguintes serão reprogramadas a partir desta data; as anteriores permanecerão como estão\./);
  assert.match(gestao, /const parcelamento = lerParcelamentoEditavel\(lanc\.descricao\)/);
  assert.match(gestao, /const ehParcelaEditada = lancamentoAtual\?\.tipo === 'parcela' \|\| Boolean\(parcelamentoOriginal\)/);
});

test('linha editada de parcela mostra posição, total e explicação do alcance', () => {
  assert.match(tabelaDespesas, /editParcelaAtual: number/);
  assert.match(tabelaDespesas, /editTotalParcelas: number/);
  assert.match(tabelaDespesas, /Número da parcela atual/);
  assert.match(tabelaDespesas, /Quantidade total de parcelas/);
  assert.match(tabelaDespesas, /temParcelamento = lanc\.tipo === 'parcela'/);
  assert.match(tabelaDespesas, /Altere a contagem e salve para reorganizar apenas as parcelas seguintes\./);
});

test('Gestão Mobile oferece a mesma edição e confirma a reorganização', () => {
  assert.match(mobile, /function lerParcelamentoEditavelMobile\(descricao\)/);
  assert.match(mobile, /function descricaoComParcelamentoMobile\(descricaoBase, parcelaAtual, totalParcelas\)/);
  assert.match(mobile, /id="editar-parcela-atual"/);
  assert.match(mobile, /id="editar-total-parcelas"/);
  assert.match(mobile, /titulo: 'Reorganizar parcelamento\?'/);
  assert.match(mobile, /db\.rpc\('reorganizar_parcelamento_despesa_rpc'/);
  assert.match(mobile, /Parcelamento reorganizado a partir da parcela/);
});

test('RPC reorganiza somente a sequência atual e futura sob autorização', () => {
  assert.match(migration, /security definer/);
  assert.match(migration, /auth\.uid\(\) is null or not exists/);
  assert.match(migration, /and tipo_obs = 'parcela'/);
  assert.match(migration, /\) >= v_data_original/);
  assert.match(migration, /for v_indice in 0\.\.v_restantes - 1 loop/);
  assert.match(migration, /insert into public\.lancamentos/);
  assert.match(migration, /if v_existentes > v_restantes then[\s\S]*?delete from public\.lancamentos/);
  assert.match(migration, /grant execute on function public\.reorganizar_parcelamento_despesa_rpc/);
});
