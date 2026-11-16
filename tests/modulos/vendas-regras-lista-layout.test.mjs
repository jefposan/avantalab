import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import postcss from 'postcss';
const css=await readFile(new URL('../../app/vendas/sistema/vendas.css',import.meta.url),'utf8');const source=await readFile(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx',import.meta.url),'utf8');
test('lista fiscal ganha largura sem alterar a grade das outras áreas',()=>{
 assert.match(css,/\.fiscal-matrix-workspace \{ grid-template-columns: minmax\(280px,36%\) minmax\(0,1fr\)/);
 assert.match(css,/\.access-workspace \{ display: grid; grid-template-columns: minmax\(190px,220px\)/);
 assert.match(css,/\.fiscal-matrix-workspace \{ grid-template-columns: 1fr; \}/);
});
test('títulos fiscais exibem texto completo e o botão conserva estilo dentro do tooltip',()=>{
 const root=postcss.parse(css);const title=root.nodes.find(r=>r.selector==='.fiscal-matrix-sidebar .access-option-list strong');
 const styles=Object.fromEntries(title.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));assert.equal(styles['white-space'],'normal');assert.equal(styles['text-overflow'],'clip');assert.equal(styles['overflow-wrap'],'anywhere');
 assert.match(css,/\.access-option-list > \.fiscal-rule-tooltip > button:hover/);
 assert.match(css,/\.access-option-list > \.fiscal-rule-tooltip > button.active/);
});
test('cada opção fiscal reutiliza Tooltip oficial e mantém seleção acessível por botão nativo',()=>{
 const rules=source.slice(source.indexOf('<aside className="fiscal-matrix-sidebar">'),source.indexOf('</aside>',source.indexOf('<aside className="fiscal-matrix-sidebar">')));
 assert.match(rules,/<Tooltip key=\{rule.id\}/);assert.match(rules,/texto=\{`\$\{rule.name\}/);assert.match(rules,/posicao="bottom" wrapperClassName="fiscal-rule-tooltip"/);assert.match(rules,/aria-pressed=\{rule.id === selected.id\}/);assert.match(rules,/onClick=\{\(\) => setSelectedId\(rule.id\)\}/);
 assert.doesNotMatch(rules,/title=/);
});
