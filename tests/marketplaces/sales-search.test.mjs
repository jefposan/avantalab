import test from 'node:test';
import assert from 'node:assert/strict';
import {saleMatchesSearch} from '../../app/modules/marketplaces/sales-search.ts';
const sale={orderId:'2000019284716164',buyer:'João',total:1234.56,items:[{title:'Máscara capilar'},{title:'Ventilador Mondial'}]};
test('busca da venda encontra produto, destinatário, pedido e valores nas duas notações',()=>{
 for(const term of ['', 'mascara','  MÁSCARA  ','ventilador','joao','2000019284','Pedido #2000019284716164','1.234,56','1234.56','R$ 1.234,56'])assert.equal(saleMatchesSearch(sale,term),true,term);
 for(const term of ['geladeira','1234.57','R$ 0,00'])assert.equal(saleMatchesSearch(sale,term),false,term);
 assert.equal(saleMatchesSearch({...sale,total:null},'0,00'),false);assert.equal(saleMatchesSearch({...sale,total:0},'0,00'),true);
});
