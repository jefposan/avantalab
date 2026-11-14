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
    && attr(n, 'aria-label') === 'Baixar AvantaLab Gestão no Google Play (abre em nova aba)');
  assert.ok(link, 'O Gestão deve oferecer download, não a indicação Em breve');
  assert.equal(attr(link, 'href'), 'https://play.google.com/store/apps/details?id=br.com.avantalab.app');
  assert.equal(attr(link, 'class'), 'googlePlayButton');
  assert.equal(attr(link, 'target'), '_blank');
  assert.equal(attr(link, 'rel'), 'noopener noreferrer');
  assert.doesNotMatch(html, /Em breve na/);
  assert.ok(nodes.some(n => n.tagName === 'a' && attr(n, 'href') === 'https://apps.apple.com/br/app/avantalab/id6793744930'));
  assert.ok(nodes.some(n => n.tagName === 'a' && attr(n, 'aria-label') === 'Baixar AvantaVendas no Google Play (abre em nova aba)'));
  for (const path of ['app/page.tsx', 'app/gestao-financeira/page.tsx']) {
    assert.match(readPublicSource(path), /AvantaLandingPage/);
  }
  assert.match(readPublicSource('app/components/AvantaLandingPage.tsx'), /<LandingAppsSection\s*\/>/);
});

test('os dois cards usam a maçã e o Play colorido, com chamadas Baixar e destinos seguros', () => {
  const Section = loadPublicLanding(readPublicSource('app/components/LandingAppsSection.tsx')).default;
  const nodes = elements(parseFragment(renderToStaticMarkup(React.createElement(Section))));
  const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
  const content = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(content).join('');
  const links = nodes.filter(n => n.tagName === 'a' && ['appStoreButton', 'googlePlayButton'].includes(attr(n, 'class')));
  assert.equal(links.length, 4);
  for (const link of links) {
    const apple = attr(link, 'class') === 'appStoreButton';
    const logo = elements(link).find(n => n.tagName === 'svg');
    assert.equal(attr(logo, 'data-store-logo'), apple ? 'apple' : 'google-play');
    assert.equal(attr(logo, 'aria-hidden'), 'true');
    assert.equal(attr(logo, 'focusable'), 'false');
    assert.equal(content(link), apple ? 'Baixar naApp Store' : 'Baixar noGoogle Play');
    assert.equal(attr(link, 'target'), '_blank');
    assert.equal(attr(link, 'rel'), 'noopener noreferrer');
    if (!apple) {
      assert.deepEqual(elements(logo).filter(n => n.tagName === 'path').map(n => attr(n, 'fill')),
        ['#4285F4', '#34A853', '#FBBC04', '#EA4335']);
    }
  }
  const css = readPublicSource('app/styles/landing/landing-apps.module.css');
  assert.match(css, /\.appStoreButton\s*\{[^}]*background:\s*#000;/);
  assert.match(css, /\.googlePlayButton\s*\{[^}]*background:\s*#fff;[^}]*color:\s*#202124;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.appStoreButton,\s*\.googlePlayButton\s*\{\s*transition: none;/);
});
