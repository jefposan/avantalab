import assert from 'node:assert/strict';
import test from 'node:test';
import { renderFiscal } from './fiscal-view-harness.mjs';
test('documentos fiscais oferecem NF-e somente na pendência, com confirmação, sem afetar impressão',()=>{
 const pending=renderFiscal();assert.match(pending,/Emitir NF-e pelo Faturador/);assert.match(pending,/Importar XML da NF-e/);assert.match(pending,/Consultar documentos e etiqueta/);
 for(const sale of [{shipmentSubstatus:'buffered'},{shipmentSubstatus:'printed'},{status:'cancelled'}])assert.doesNotMatch(renderFiscal(sale),/Emitir NF-e pelo Faturador|Importar XML da NF-e/);
 assert.doesNotMatch(renderFiscal({},false),/Emitir NF-e pelo Faturador|Importar XML da NF-e/);
});
test('protocolo aceito é mostrado mesmo se a consulta falhar; autorizado oferece arquivos; rejeitado sem download ativo',()=>{
 const fiscal={dce:{status:'requested',receiptId:'receipt',documents:[],query:{checkedAt:'2026-10-26T14:00:00Z',ok:false,httpStatus:404}},nfe:{status:'completed',documents:[{id:'123',type:'NF-e',status:'authorized',formats:['pdf','xml']}]}};
 const html=renderFiscal({dceRequested:true,fiscal});assert.match(html,/solicitação aceita/);assert.match(html,/não comprova ausência/);assert.match(html,/Baixar DANFE/);assert.match(html,/Baixar XML/);assert.doesNotMatch(html,/Emitir NF-e pelo Faturador/);
 fiscal.nfe.documents[0].status='rejected';assert.match(renderFiscal({fiscal}),/disabled=""[^>]*><span[^>]*>Baixar DANFE/);
});

test('faixa compacta recolhe estados informativos, mas mantém falhas fiscais visíveis',()=>{
 const fiscal={dce:{status:'requested',receiptId:'receipt',documents:[]},nfe:{status:'unknown',documents:[]}};
 const ok=renderFiscal({dceRequested:true,fiscal});assert.ok(ok.indexOf('DC-e: solicitação aceita')>ok.indexOf('<summary>Documentos fiscais'));
 const issue=renderFiscal({fiscal:{...fiscal,dce:{...fiscal.dce,status:'uncertain'}}});assert.ok(issue.indexOf('aguardando confirmação')<issue.indexOf('<summary>Documentos fiscais'));
});
