import test from 'node:test';
import assert from 'node:assert/strict';
import {consultarPrecosCustos} from '../../app/custos/consulta-precos.ts';
function mock(rows,failAt=-1){
 const chamadas=[];
 return {chamadas,from(tabela){assert.equal(tabela,'custos_tabela_preco_itens');let ids,ordens=[];return {select(){return this},in(chave,valores){assert.equal(chave,'tabela_preco_id');ids=valores;return this},order(chave){ordens.push(chave);return this},async range(inicio,fim){chamadas.push({inicio,fim,ids,ordens});return inicio===failAt?{data:null,error:{message:'falha'}}:{data:rows.filter(r=>ids.includes(r.tabela_preco_id)).slice(inicio,fim+1),error:null};}}}};
}
test('carrega mais de mil preços e preserva T016 específico, inclusive zero e isolamento por tabela',async()=>{
 const rows=Array.from({length:2430},(_,i)=>({tabela_preco_id:'neilton',produto_id:`p${i}`,preco:String(i)}));
 rows[2001]={tabela_preco_id:'neilton',produto_id:'T016',preco:'80.00'};rows.push({tabela_preco_id:'outra',produto_id:'T016',preco:'999'});
 const db=mock(rows),result=await consultarPrecosCustos(db,['neilton']);
 assert.equal(result.length,2430);assert.equal(result.find(r=>r.produto_id==='T016').preco,80);assert.equal(result[0].preco,0);
 assert.deepEqual(db.chamadas.map(c=>c.inicio),[0,500,1000,1500,2000]);
 assert.ok(db.chamadas.every(c=>c.ordens.join(',')==='tabela_preco_id,produto_id'));
});
test('falha na segunda página rejeita o conjunto completo em vez de entregar preços parciais',async()=>{
 const rows=Array.from({length:600},(_,i)=>({tabela_preco_id:'neilton',produto_id:String(i),preco:80}));
 await assert.rejects(consultarPrecosCustos(mock(rows,500),['neilton']),/todos os preços/);
});
test('sem tabelas não consulta preços de outras empresas',async()=>{const db=mock([]);assert.deepEqual(await consultarPrecosCustos(db,[]),[]);assert.equal(db.chamadas.length,0);});
