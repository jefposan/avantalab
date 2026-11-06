import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { corEhClara } from '../../app/lib/formatters.ts';

const source = readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
const ast = ts.createSourceFile('view.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let styleExpression;
function findStyle(node) {
  if (ts.isJsxOpeningElement(node) && node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'className' && attr.initializer?.getText(ast) === '"commercial-app"')) {
    styleExpression = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'style').initializer.expression.getText(ast);
  }
  ts.forEachChild(node, findStyle);
}
findStyle(ast);
const expression = ts.transpileModule(`module.exports = (${styleExpression});`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const styleFor = profileColor => { const module = { exports: {} }; new Function('module', 'profileColor', 'corEhClara', expression)(module, profileColor, corEhClara); return module.exports; };

test('Vendas acompanha o texto da Gestão para verde, tons escuros e cores claras sem trocar o fundo', () => {
  for (const [background, foreground] of [['#00aaa7', '#ffffff'], ['#003e73', '#ffffff'], ['#111827', '#ffffff'], ['#ffffff', '#0f172a'], ['#ffff00', '#0f172a'], ['#e7f5ef', '#0f172a']]) {
    const style = styleFor(background);
    assert.equal(style['--av-profile-primary'], background);
    assert.equal(style['--av-profile-on-primary'], foreground);
  }
});
