import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync('app/custos/CustosWorkspace.tsx','utf8');
test('menu dos produtos tem largura explícita e limitada à janela',()=>{
  const css=readFileSync('app/custos/custos.module.css','utf8');
  assert.match(css,/\.contextMenuFloating\{[^}]*width:212px;min-width:0;max-width:calc\(100vw - 16px\);box-sizing:border-box/);
  assert.match(css,/\.contextMenuFloating button\{[^}]*max-width:100%;box-sizing:border-box;white-space:normal;overflow-wrap:anywhere/);
});
const row=source.split('<div className={styles.catalogActionRow}')[1]?.split('</div>')[0] || '';
test('todos os cards exibem as mesmas três ações em uma linha com o componente oficial',()=>{
  assert.equal((row.match(/<BotaoAcaoCompacto /g)||[]).length,3);
  assert.match(row,/>Gerenciar produtos<\/BotaoAcaoCompacto>/);
  assert.match(row,/>Editar<\/BotaoAcaoCompacto>/);
  assert.match(row,/>Excluir<\/BotaoAcaoCompacto>/);
  assert.doesNotMatch(row,/&&\s*<BotaoAcaoCompacto/);
  assert.match(readFileSync('app/custos/custos.module.css','utf8'),/\.catalogActionRow\{[^}]*flex-wrap:nowrap/);
});
test('Excluir é desabilitado para protegidos, consulta e gravação; manual autorizado mantém confirmação',()=>{
  const expression=row.match(/variante="destrutivo" disabled=\{([^}]+)\}/)?.[1];
  assert.ok(expression);
  const disabled=new Function('catalogo','podeEditar','salvando',`return ${expression}`);
  assert.equal(disabled({origem:'manual',codigo:'TESTE'},true,false),false);
  for(const catalogo of [{origem:'externa',codigo:'PRINCIPAL'},{origem:'custos_local',codigo:'CUSTOS_LOCAL'},{origem:'manual',codigo:'PRINCIPAL'},{origem:'manual',codigo:'CUSTOS_LOCAL'}]) assert.equal(disabled(catalogo,true,false),true);
  assert.equal(disabled({origem:'manual',codigo:'TESTE'},false,false),true);
  assert.equal(disabled({origem:'manual',codigo:'TESTE'},true,true),true);
  assert.match(row,/setCatalogoExcluir\(catalogo\)/);
  assert.match(source,/ModalConfirmacao aberto=\{Boolean\(catalogoExcluir\)\}/);
});
