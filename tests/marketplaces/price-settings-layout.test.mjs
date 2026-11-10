import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){
  if(s.endsWith('.module.css'))return{url:'data:text/javascript,export default new Proxy({}, {get:(_,k)=>k})',shortCircuit:true};
  if(s==='@/app/lib/supabase')return{url:'data:text/javascript,export const supabase={auth:{getSession(){throw Error("Sem sessão/rede em teste SSR")}}}',shortCircuit:true};
  if(s==='@/app/components/CardExpandidoModal')return{url:'data:text/javascript,export default function Modal({children}){return children}',shortCircuit:true};
  const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
  if(f)for(const ext of ['.tsx','.ts'])if(existsSync(f+ext))return next(pathToFileURL(f+ext).href,c);
  return next(s,c);
},load(url,c,next){if(url.startsWith('file:')&&url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c);}});
const {default:Settings}=await import('../../app/marketplaces/PriceCalculationSettings.tsx');
const {default:Users}=await import('../../app/marketplaces/PriceUsersPanel.tsx');
hook.deregister();
const settings={percentages:{minimum:50,medium:70,ideal:90},theme:'profile',revision:1,storageReady:true,financeRevenueEnabled:true,financeRevenueBasis:'gross'};
const request=async()=>{throw Error('SSR não deve solicitar dados')};
test('configurações separam preços, aparência e faturamento',()=>{
  const html=renderToStaticMarkup(React.createElement(Settings,{companyId:'company',settings,request,onSaved(){}}));
  assert.equal((html.match(/<fieldset /g)||[]).length,2);
  assert.match(html,/<legend>Preços de venda<\/legend>/);assert.match(html,/<legend>Aparência<\/legend>/);
  assert.equal((html.match(/<input /g)||[]).length,4);assert.equal((html.match(/aria-pressed=/g)||[]).length,6);
  assert.doesNotMatch(html,/margem de lucro|Exemplo:|Percentuais sobre a referência/);
  assert.doesNotMatch(html,/Salvar configurações/);
  assert.match(html,/<h3[^>]*>Faturamento<\/h3>/);
  assert.match(html,/<input type="checkbox" role="switch" checked=""\/>/);
  assert.match(html,/Enviar para receitas/);
  assert.match(html,/<button[^>]*aria-pressed="true"[^>]*><span[^>]*>Bruto<\/span>/);
  assert.match(html,/<button[^>]*aria-pressed="false"[^>]*><span[^>]*>Líquido<\/span>/);
  for (const financeRevenueEnabled of [false, undefined]) {
    const output=renderToStaticMarkup(React.createElement(Settings,{companyId:'company',settings:{...settings,financeRevenueEnabled},request,onSaved(){}}));
    const checkbox=output.match(/<input type="checkbox"[^>]*>/)[0];
    assert.equal(checkbox.includes('checked=""'),financeRevenueEnabled===undefined);
    assert.equal(checkbox.includes('disabled=""'),financeRevenueEnabled===undefined);
  }
});
test('cabeçalho tem somente Configurações e cadastro reúne os três campos e Salvar no mesmo formulário',()=>{
  const html=renderToStaticMarkup(React.createElement(Users,{companyId:'company',settings,settingsError:'',request,onClose(){},onSettingsSaved(){},onReloadSettings(){}}));
  const header=html.match(/<header[^>]*>(.*?)<\/header>/s)?.[1];assert.ok(header);assert.match(header,/>Configurações<\/h2>/);assert.doesNotMatch(header,/AvantaPreços/);
  const form=html.match(/<form[^>]*aria-label="Criar usuário da consulta"[^>]*>(.*?)<\/form>/s)?.[1];assert.ok(form);
  assert.equal((form.match(/<input /g)||[]).length,5);assert.match(form,/>Nome<input/);assert.match(form,/>Login<input/);assert.match(form,/>Senha<input/);assert.match(form,/>Salvar<\/span><\/button>/);
  assert.match(form, /type="password"[^>]*placeholder="\*\*\*\*"/);
  assert.doesNotMatch(form, /Vazia: manter senha|8 ou mais caracteres/);
  assert.match(form,/<input type="checkbox"\/>Editar estoque/);assert.match(form,/<input type="checkbox"\/>Registrar vendas/);assert.doesNotMatch(form,/checked=""/);
  const css=readFileSync(resolve(root,'app/marketplaces/marketplaces.module.css'),'utf8');
  assert.match(css,/\.settingsModalScope \.userForm \{ grid-template-columns:minmax\(0,1\.15fr\) minmax\(0,\.85fr\) minmax\(0,1fr\) auto auto auto;/);
  assert.match(css,/\.settingsModalScope \.userFormActions \{ grid-column:auto;flex-wrap:nowrap;/);
});
test('cabeçalho herda cor do perfil e fechar usa SVG dentro do botão compacto, sem caractere desalinhado',()=>{
  const html=renderToStaticMarkup(React.createElement(Users,{companyId:'company',brand:'#ffff00',settings,settingsError:'',request,onClose(){},onSettingsSaved(){},onReloadSettings(){}}));
  const header=html.match(/<header[^>]*>(.*?)<\/header>/s)?.[1];
  assert.match(header,/data-av-action="compact"/);assert.match(header,/aria-label="Fechar configurações"/);assert.match(header,/<svg[^>]*viewBox="0 0 24 24"/);assert.doesNotMatch(header,/×/);
  assert.match(html,/--av-action-on-brand:#000000/);
  const css=readFileSync(resolve(root,'app/marketplaces/marketplaces.module.css'),'utf8');assert.match(css,/\.settingsModalScope \.userModalHeader \{[^}]*background:var\(--brand\);color:var\(--av-action-on-brand,#fff\)/);
});
