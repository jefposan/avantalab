import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseFragment } from 'parse5';
import { loadPublicLanding, readPublicSource } from './public-landing-harness.mjs';

function elements(node) {
  return [node, ...(node.childNodes || []).flatMap(elements)];
}

test('Nossos apps oferece o Gestão na Google Play com o link oficial e o botão compartilhado', () => {
  const Section = loadPublicLanding(readPublicSource('app/components/LandingAppsSection.tsx')).default;
  const html = renderToStaticMarkup(React.createElement(Section));
  const nodes = elements(parseFragment(html));
  const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
  const link = nodes.find(n => n.tagName === 'a'
    && attr(n, 'aria-label') === 'Baixar AvantaLab Gestão na Google Play (abre em nova aba)');
  assert.ok(link, 'O Gestão deve oferecer download, não a indicação Em breve');
  assert.equal(attr(link, 'href'), 'https://play.google.com/store/apps/details?id=br.com.avantalab.app');
  assert.equal(attr(link, 'class'), 'googlePlayButton');
  assert.equal(attr(link, 'target'), '_blank');
  assert.equal(attr(link, 'rel'), 'noopener noreferrer');
  assert.doesNotMatch(html, /Em breve na/);
  assert.ok(nodes.some(n => n.tagName === 'a' && attr(n, 'href') === 'https://apps.apple.com/br/app/avantalab/id6793744930'));
  assert.ok(nodes.some(n => n.tagName === 'a' && attr(n, 'aria-label') === 'Baixar AvantaVendas na Google Play (abre em nova aba)'));
  for (const path of ['app/page.tsx', 'app/gestao-financeira/page.tsx']) {
    assert.match(readPublicSource(path), /AvantaLandingPage/);
  }
  assert.match(readPublicSource('app/components/AvantaLandingPage.tsx'), /<LandingAppsSection\s*\/>/);
});
