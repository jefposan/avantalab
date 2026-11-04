import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../../app/marketplaces/${p}`,import.meta.url),'utf8');
test('os quatro cards usam ações compactas e setas acessíveis sem texto, sem mudar os outros consumidores',()=>{
  for(const [file,id] of [['Vendas','sales'],['Anunciados','announced'],['ProductsStock','products'],['WarehousesPanel','warehouses']]){
    const source=read(file+'.tsx');
    assert.match(source,/import BotaoAcaoCompacto from/);
    const arrows=[...source.matchAll(/<BotaoExpandirCard[^\n]*?\/>/g)].map(m=>m[0]).filter(s=>s.includes(`controlsId="${id}-content"`));
    assert.ok(arrows.length);
    for(const arrow of arrows){assert.match(arrow,/somenteIcone/);assert.match(arrow,/modo="lista"/);assert.match(arrow,/contexto=/);}
  }
  assert.match(read('DateOrderButton.tsx'),/<BotaoAcaoCompacto[^>]*disabled=\{disabled\}[^>]*aria-label=\{description\}/);
  const css=read('marketplaces.module.css');
  assert.match(css,/\.panelHeadingActions button\[data-av-action="compact"\] \{ min-height:44px;height:44px;padding:6px 0;/);
  assert.match(css,/\.panelHeadingActions button\[data-av-action="compact"\] > span \{ min-height:32px;height:32px;/);
  assert.match(css,/\.panelHeadingActions \.announcedAccountFilter \.selectTrigger \{[^}]*min-height:32px;height:32px;/);
  assert.match(css,/\.panelHeadingActions \.announcedAccountFilter \.selectTrigger::after \{ content:'';position:absolute;inset:-6px 0;/);
  const preview=read('validacao-controles/page.tsx');assert.match(preview,/NODE_ENV === 'production'\) notFound\(\)/);
});
