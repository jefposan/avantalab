import {sanitizarCnpj} from '../../lib/consultas/validators/cnpj.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {isValidCpf,isValidCnpj} from '../../app/vendas/lib/server/commercial-customer-service.mjs';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
const start=source.indexOf('  const save = async',source.indexOf('function ClientFormDialog('));
const code=source.slice(start,source.indexOf('\n  const isIndividual = form.profile',start));
function run(contact={}){
 let saved,error,closed=false;
 const form={profile:'Pessoa física',document:'52998224725',legalName:'Cliente sintético',tradeName:'',contactName:'',email:'',phone:'',cep:'01001000',street:'Rua de teste',number:'1',district:'Centro',cityName:'São Paulo',state:'SP',cityCode:'3550308',fiscal:'Não contribuinte',...contact};
 const scope={exports:{},saving:false,form,clientRecords:[],sanitizarCnpj,isValidCpf,isValidCnpj,isValidEmail:x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x),resolveMunicipalityCode:()=> '3550308',municipalityIsResolved:()=>true,formatCpf:x=>x,formatCnpj:x=>x,formatCep:x=>x,setError:x=>error=x,setSaving:()=>{},onSave:async x=>{saved=x;return {ok:true};},onClose:()=>closed=true};
 vm.runInNewContext(ts.transpileModule(code+'\nexports.save=save;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);
 return {save:scope.exports.save,result:()=>({saved,error,closed})};
}
test('salva cliente PF e PJ sem telefone nem e-mail pelo handler real',async()=>{
 for(const contact of [{},{profile:'Pessoa jurídica',document:'11222333000181'}]){
  const f=run(contact);await f.save();assert.ok(f.result().saved);assert.equal(f.result().saved.email,'');assert.equal(f.result().saved.phone,'');assert.equal(f.result().closed,true);assert.equal(f.result().error,undefined);
 }
});
test('contato opcional preenchido ainda exige formato válido',async()=>{
 for(const contact of [{email:'invalido'},{phone:'123'}]){const f=run(contact);await f.save();assert.equal(f.result().saved,undefined);assert.ok(f.result().error);assert.equal(f.result().closed,false);}
 const valid=run({email:'cliente@example.test',phone:'11987654321'});await valid.save();assert.ok(valid.result().saved);
});
