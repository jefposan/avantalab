import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommercialUiAccessBoundary, evaluateAccessDecision } from '../../app/vendas/lib/access-control.mjs';
test('perfil autenticado sem CNPJ acessa ações permitidas e mantém restrições',()=>{
 const entrada={integrated:true,companyId:'baa8c115-634a-41d3-9e2a-8666dce11454',companyDocument:'',user:{id:'usuario',active:true},accessReady:true};
 const boundary=createCommercialUiAccessBoundary(entrada);const decidir=(b,p='settings.view')=>evaluateAccessDecision({boundary:b,effectivePermissions:{'settings.view':true},permission:p});
 assert.equal(boundary.companyId,entrada.companyId);assert.equal(boundary.source,'authenticated');assert.equal(decidir(boundary).allowed,true);
 assert.equal(decidir(boundary,'fiscal.issue').allowed,false);assert.equal(decidir(createCommercialUiAccessBoundary({...entrada,accessReady:false})).allowed,false);
 assert.equal(decidir(createCommercialUiAccessBoundary({...entrada,user:null})).allowed,false);assert.equal(decidir(createCommercialUiAccessBoundary({...entrada,user:{id:'usuario',active:false}})).allowed,false);
 assert.equal(decidir(createCommercialUiAccessBoundary({...entrada,companyId:'',companyDocument:'12345678000199'})).allowed,false);
});
