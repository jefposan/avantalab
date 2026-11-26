import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
const s=readFileSync(new URL('../../app/avantavendas/sistema/app.js',import.meta.url),'utf8');
function fluxo(){
 let resolver;const promessa=new Promise(r=>resolver=r);const botao={disabled:false,textContent:'',isConnected:true};
 let painel={contains:b=>b===botao};let aberturas=0;
 const registro={id:'pedido',cliente_id:'cliente',conta_id:'a',total:50};
 const ctx=vm.createContext({
  backendAtivo:true,state:{usuario:{id:'usuario'},contaVendasAtiva:{id:'a'},vendas:[registro],pagamentos:[]},
  window:{VendasDb:{loadClientFinancial:()=>promessa}},
  document:{getElementById:()=>painel,querySelector:()=>botao},
  toast(){throw Error('não esperado');},
  abrirPedidoCliente(){aberturas++;},abrirPagamentoClienteDetalhe(){aberturas++;},
 });
 vm.runInContext(`let revisaoContaVendasAtiva=0;let revisaoDadosOperacionais=0;let contextoHistoricoComprovantesConferido='';const clientesHistoricoComprovantesConferidos=new Set();
  function contaVendasDoContextoAtual(){return state.contaVendasAtiva.id;}
  function contextoContaVendasPermaneceAtual(revisao,conta){return revisao===revisaoContaVendasAtiva&&conta===contaVendasDoContextoAtual();}`,ctx);
 vm.runInContext(s.slice(s.indexOf('function chaveContextoHistoricoComprovante('),s.indexOf('function retratoOriginalPedido(')),ctx);
 vm.runInContext(s.slice(s.indexOf('async function reconciliarFinanceiroCliente('),s.indexOf('function valoresMonetariosConferem(')),ctx);
 return {ctx,resolver,registro,botao,aberturas:()=>aberturas,trocarPainel:()=>{painel={contains:()=>false};botao.isConnected=false;}};
}
test('resposta da conta anterior nunca modifica o estado nem reabre o comprovante',async()=>{
 const f=fluxo(),p=f.ctx.conferirHistoricoDoComprovante('pedido','pedido');
 vm.runInContext("revisaoContaVendasAtiva++;state.contaVendasAtiva={id:'b'};state.vendas=[{id:'outra'}]",f.ctx);
 f.resolver({vendas:[{id:'antiga'}],pagamentos:[]});assert.equal(await p,false);
 assert.equal(f.ctx.state.vendas[0].id,'outra');assert.equal(f.aberturas(),0);
});
test('gravação que ocorre durante a leitura não é sobrescrita por uma resposta atrasada',async()=>{
 const f=fluxo(),p=f.ctx.conferirHistoricoDoComprovante('pedido','pedido');
 vm.runInContext('revisaoDadosOperacionais++;state.vendas[0].total=75',f.ctx);
 f.resolver({vendas:[{...f.registro,total:50}],pagamentos:[]});assert.equal(await p,false);
 assert.equal(f.ctx.state.vendas[0].total,75);assert.equal(f.aberturas(),0);
});
test('fechar/trocar o popup durante a consulta não o ressuscita',async()=>{
 const f=fluxo(),p=f.ctx.conferirHistoricoDoComprovante('pedido','pedido');f.trocarPainel();
 f.resolver({vendas:[{...f.registro}],pagamentos:[]});assert.equal(await p,true);assert.equal(f.aberturas(),0);
 assert.equal(f.ctx.historicoComprovanteConferido('cliente'),true);
});
test('consulta concluída reabre o mesmo comprovante e preserva a outbox local',async()=>{
 const f=fluxo();f.ctx.state.vendas.push({id:'pendente',cliente_id:'cliente',__avantaPendenteOffline:true});
 const p=f.ctx.conferirHistoricoDoComprovante('pedido','pedido');
 assert.equal(f.botao.disabled,true);f.resolver({vendas:[{...f.registro}],pagamentos:[]});assert.equal(await p,true);
 assert.equal(f.aberturas(),1);assert.equal(f.ctx.state.vendas.find(r=>r.id==='pendente').__avantaPendenteOffline,true);
});
