import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicLandingProtection} from '../../scripts/lib/protecao-landing.mjs';
const read=file=>readFileSync(new URL('../../'+file,import.meta.url),'utf8');
const input={home:read('app/page.tsx'),finance:read('app/gestao-financeira/page.tsx'),component:read('app/components/AvantaLandingPage.tsx')};
const component=body=>`import RedirecionamentoPosOAuth from './RedirecionamentoPosOAuth';export function AvantaLandingPage(){return (${body});}`;
test('verificador acompanha as duas rotas reais e sua proteção compartilhada',()=>{assert.equal(publicLandingProtection(input),true);});
test('proteção ausente, dentro do conteúdo, posterior ou condicional bloqueia o gate',()=>{
 for(const markup of ['<><main /></>','<><main><RedirecionamentoPosOAuth /></main></>','<><main /><RedirecionamentoPosOAuth /></>','<>{false && <RedirecionamentoPosOAuth />}<main /></>'])assert.equal(publicLandingProtection({...input,component:component(markup)}),false);
 assert.equal(publicLandingProtection({...input,component:input.component.replace('<RedirecionamentoPosOAuth />','')}),false);
});
test('importar um componente sem usá-lo, mostrar conteúdo antes dele ou trocar sua origem não satisfaz a proteção',()=>{
 assert.equal(publicLandingProtection({...input,home:input.home.replace('return <AvantaLandingPage />;','return <main />;')}),false);
 assert.equal(publicLandingProtection({...input,home:input.home.replace('return <AvantaLandingPage />;','return <div><AvantaLandingPage /></div>;')}),false);
 assert.equal(publicLandingProtection({...input,finance:input.finance.replace('../components/AvantaLandingPage','../page')}),false);
 assert.equal(publicLandingProtection({...input,component:input.component.replace("from './RedirecionamentoPosOAuth'","from './OutroComponente'")}),false);
});
