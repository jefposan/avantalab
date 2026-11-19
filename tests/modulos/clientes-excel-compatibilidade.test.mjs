import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import {criarModeloClientes,lerModeloClientes,ErroImportacaoClientes,mensagemFalhaClientes,mensagemRetornoClientes} from '../../app/vendas/lib/customer-excel.ts';
const companyId='10000000-0000-4000-8000-000000000001';
const bytes=async workbook=>new Uint8Array(await workbook.xlsx.writeBuffer()).buffer;
test('OOXML com prefixo x:workbook reproduz falha antiga e importa sem mudar os dados',async()=>{
 const w=await criarModeloClientes(companyId),s=w.getWorksheet('Clientes');
 s.getRow(2).values=['Pessoa física','52998224725','Nome de teste','','','','','','Sim','','011999999999','','01234000'];
 const original=await bytes(w),expected=await lerModeloClientes(original,companyId),zip=await JSZip.loadAsync(original);
 const xml=await zip.file('xl/workbook.xml').async('string');
 zip.file('xl/workbook.xml',xml.replace('xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"','xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"').replace(/<(\/?)([A-Za-z][\w-]*)(?=[\s/>])/g,'<$1x:$2'));
 const prefixed=await zip.generateAsync({type:'arraybuffer'});
 await assert.rejects(()=>new ExcelJS.Workbook().xlsx.load(prefixed),/sheets/);
 assert.deepEqual(await lerModeloClientes(prefixed,companyId),expected);
});
test('falhas de formato, senha e estrutura recebem motivo e orientação em português',async()=>{
 await assert.rejects(()=>lerModeloClientes(new TextEncoder().encode('nome,documento').buffer,companyId),e=>e instanceof ErroImportacaoClientes&&/não foi reconhecido.*xlsx/.test(e.message)&&/Salvar como/.test(e.message));
 await assert.rejects(()=>lerModeloClientes(new Uint8Array([0xd0,0xcf,0x11,0xe0]).buffer,companyId),/formato antigo.*protegido por senha/);
 await assert.rejects(()=>lerModeloClientes(new Uint8Array([0x50,0x4b,0,0]).buffer,companyId),e=>e instanceof ErroImportacaoClientes&&/estrutura.*incompleto.*Nenhum cliente/.test(e.message));
 const w=await criarModeloClientes(companyId);w.removeWorksheet('_Avanta');
 await assert.rejects(()=>bytes(w).then(b=>lerModeloClientes(b,companyId)),/modelo de clientes.*Exportar Excel/);
});
test('fórmulas em metadados e cabeçalhos continuam bloqueadas',async()=>{
 const w=await criarModeloClientes(companyId);w.getWorksheet('_Avanta').getCell('A1').value={formula:'1',result:'AVANTALAB-CLIENTES-1'};
 await assert.rejects(()=>bytes(w).then(b=>lerModeloClientes(b,companyId)),/identificação interna/);
 w.getWorksheet('_Avanta').getCell('A1').value='AVANTALAB-CLIENTES-1';
 w.getWorksheet('Clientes').getCell('A1').value={formula:'1',result:'Tipo de pessoa *'};
 await assert.rejects(()=>bytes(w).then(b=>lerModeloClientes(b,companyId)),/Fórmulas.*cabeçalhos/);
});
test('interface não expõe exceções técnicas em inglês, mas mantém orientação validada',()=>{
 const fallback='Não foi possível abrir a planilha. Selecione uma nova cópia .xlsx.';
 assert.equal(mensagemFalhaClientes(new TypeError("Cannot read properties of undefined (reading 'sheets')"),fallback),fallback);
 assert.equal(mensagemFalhaClientes(new Error('Failed to fetch'),fallback),fallback);
 assert.equal(mensagemFalhaClientes(new ErroImportacaoClientes('Linha 3: CPF inválido.'),fallback),'Linha 3: CPF inválido.');
 assert.match(mensagemRetornoClientes('Failed to fetch'),/comunicação.*revalide/);
 assert.match(mensagemRetornoClientes("Cannot read properties of undefined (reading 'sheets')"),/sistema não conseguiu.*Atualize/);
 assert.equal(mensagemRetornoClientes('Os cadastros mudaram. Gere uma nova prévia.'),'Os cadastros mudaram. Gere uma nova prévia.');
});
