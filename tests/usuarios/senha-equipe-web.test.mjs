import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.createSourceFile('hook.ts',readFileSync('app/hooks/useEmpresas.ts','utf8'),ts.ScriptTarget.Latest,true);
let handler;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='redefinirSenhaUsuario')handler=node.initializer.getText(source);ts.forEachChild(node,visit);}
visit(source);assert.ok(handler);
function ambiente(){
 const calls=[],avisos=[],changes=[];
 const ctx={usuarioEditandoId:'alvo',acessoUsuarioAtualId:'ator',empresaId:'empresa',usuarioSalvando:false,senhaRedefinindoRef:{current:false},contextoSenhaUsuarioRef:{current:{empresaId:'empresa',usuarioEditandoId:'alvo'}},usuariosEmpresa:[{id:'alvo',nome:'Pessoa Fictícia',pode_redefinir_senha:true}],editUsuarioNovaSenha:'SenhaFicticia123',editUsuarioConfirmarSenha:'SenhaFicticia123',abrirAviso:(...args)=>avisos.push(args),avisarCampoUsuario:(...args)=>avisos.push(args),abrirConfirmacao:config=>{ctx.confirmacao=config;},redefinirSenhaUsuarioEmpresa:async body=>{calls.push(body);return{erro:false};},setUsuarioSalvando:v=>{ctx.usuarioSalvando=v;},setEditUsuarioNovaSenha:v=>changes.push(['senha',v]),setEditUsuarioConfirmarSenha:v=>changes.push(['confirmacao',v]),setMostrarEditUsuarioNovaSenha:v=>changes.push(['visivel',v])};
 vm.createContext(ctx);vm.runInContext(`var executar=${handler};`,ctx);return{ctx,calls,avisos,changes};
}
test('Web confirma antes de redefinir e limpa segredo após sucesso, sem retornar senha em aviso',async()=>{
 const e=ambiente();await e.ctx.executar();assert.equal(e.calls.length,0);assert.ok(e.ctx.confirmacao);
 assert.doesNotMatch(e.ctx.confirmacao.mensagem,/SenhaFicticia123/);
 await e.ctx.confirmacao.acao();assert.equal(e.calls.length,1);
 assert.equal(e.calls[0].acessoId,'alvo');assert.equal(e.calls[0].novaSenha,'SenhaFicticia123');
 assert.deepEqual(e.changes,[['senha',''],['confirmacao',''],['visivel',false]]);
 assert.doesNotMatch(JSON.stringify(e.avisos),/SenhaFicticia123/);
});
test('Web rejeita ausência de concessão e confirmação divergente antes de abrir confirmação',async()=>{
 for(const tipo of ['sem-acesso','divergente']){
  const e=ambiente();if(tipo==='sem-acesso')e.ctx.usuariosEmpresa[0].pode_redefinir_senha=false;else e.ctx.editUsuarioConfirmarSenha='OutraSenha123';
  await e.ctx.executar();assert.equal(e.ctx.confirmacao,undefined);assert.equal(e.calls.length,0);assert.equal(e.avisos.length,1);
 }
});
test('Web impede repetição e descarta resposta de outro contexto',async()=>{
 const e=ambiente();let concluir;e.ctx.redefinirSenhaUsuarioEmpresa=body=>{e.calls.push(body);return new Promise(resolve=>{concluir=resolve;});};
 await e.ctx.executar();const primeira=e.ctx.confirmacao.acao();await e.ctx.confirmacao.acao();assert.equal(e.calls.length,1);
 e.ctx.contextoSenhaUsuarioRef.current={empresaId:'outra',usuarioEditandoId:'outro'};concluir({erro:false});await primeira;
 assert.equal(e.changes.length,0);assert.equal(e.avisos.length,0);assert.equal(e.ctx.senhaRedefinindoRef.current,false);
});
test('Web mantém o rascunho em falha, restaura estado e não anuncia sucesso',async()=>{
 for(const falha of ['retorno','rede']){
  const e=ambiente();e.ctx.redefinirSenhaUsuarioEmpresa=async()=>{if(falha==='rede')throw Error('rede');return{erro:true,mensagem:'Falha controlada'};};
  await e.ctx.executar();await e.ctx.confirmacao.acao();assert.equal(e.changes.length,0);assert.equal(e.ctx.usuarioSalvando,false);
  assert.equal(e.avisos.length,1);assert.doesNotMatch(e.avisos[0][0],/^Senha redefinida$/);
 }
});
