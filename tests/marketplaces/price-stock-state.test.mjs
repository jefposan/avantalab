import test from 'node:test';
import assert from 'node:assert/strict';
import { priceStockState } from '../../app/modules/marketplaces/price-stock-state.ts';

test('sem quantidade: exige conferência e permite confirmar inclusive zero', () => {
  assert.deepEqual(priceStockState({confirmed:false,quantity:null}), {
    available:false,title:'Estoque não informado',detail:'0 unidades',action:'Ajustar estoque',minimum:0,
  });
});
test('saldo positivo confirmado: Já em estoque, quantidade e Editar, inclusive para zerar', () => {
  assert.deepEqual(priceStockState({confirmed:true,quantity:1}), {
    available:true,title:'Já em estoque',detail:'1 unidade',action:'Editar',minimum:0,
  });
  assert.equal(priceStockState({confirmed:true,quantity:1200}).detail,'1.200 unidades');
});
test('saldo zero confirmado é Sem estoque e permite ajustar ou reconfirmar zero', () => {
  assert.deepEqual(priceStockState({confirmed:true,quantity:0}), {
    available:false,title:'Sem estoque',detail:'0 unidades',action:'Ajustar estoque',minimum:0,
  });
  assert.equal(priceStockState({confirmed:false,quantity:10}).available,true);
});
