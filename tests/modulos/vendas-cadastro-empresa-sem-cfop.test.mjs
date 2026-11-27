import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCompanyProfile,validateModuleSettings} from '../../app/vendas/lib/domain.mjs';
import {createDefaultFiscalMatrix} from '../../app/vendas/lib/fiscal-matrix.mjs';
const company={name:'Empresa',legalName:'Empresa LTDA',document:'69758267000149',city:'São Paulo/SP',cityCode:'3550308',cep:'01001000',street:'Praça',number:'1',district:'Centro',taxRegime:'Simples Nacional'};
test('cadastro completo salva sem exigir CFOP ou outros assuntos do módulo',()=>{
 assert.equal(validateCompanyProfile(company).ready,true);
 const settings={company,fiscal:{matrix:createDefaultFiscalMatrix(),documentScope:['nfe']}};
 assert.ok(validateModuleSettings(settings).errors.some(error=>/CFOP/.test(error)));
});
test('cadastro continua exigindo seus campos obrigatórios',()=>{
 for(const key of ['name','legalName','document','city','cityCode','cep','street','number','district','taxRegime']) assert.equal(validateCompanyProfile({...company,[key]:''}).ready,false,key);
});
test('tela de empresa usa validador de cadastro; fiscal e pagamentos têm validação própria e demais áreas preservam validação completa',async()=>{
 const source=await readFile(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx',import.meta.url),'utf8');
 assert.match(source,/section === 'empresa' \? validateCompanyProfile\(normalized.company\) : section === 'fiscal' \? validateFiscalSettingsForm\(normalized\) : section === 'pagamentos' \? \{ ready: Number\.isInteger\(draft\.payments\.firstDueDays\).*?\} : validateModuleSettings\(normalized\)/);
});
