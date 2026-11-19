import test from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import {formatarLivroPrecos} from '../../app/custos/excel-apresentacao.ts';
const headers=['ID interno (não alterar)','Código','Nome','Preço padrão','Preço · Revenda','Atualizado em (não alterar)'];
const data=[headers,['id-a','0001','Produto teste',28.5,0,'2026-11-19T00:00:00Z'],['id-b','0002','Outro produto',19.99,16.5,'2026-11-19T00:00:00Z']];
const meta=[['chave','valor','nome','cabecalho'],['formato','AVANTALAB-CUSTOS-3','',''],['empresa_id','empresa-teste','',''],['tabela_preco','REVENDA','Revenda','Preço · Revenda']];
function fixture(){const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Cadastro de produtos e tabelas de preços — AvantaLab'],['Como usar'],['1. Edite somente os campos escolhidos.'],['2. Não altere IDs internos.']]),'Instruções');XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(data),'Produtos');XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(meta),'Metadados');return XLSX.write(book,{type:'array',bookType:'xlsx'});}
test('Excel de preços segue as cores, fontes e linhas do modelo de clientes',async()=>{
 const book=await formatarLivroPrecos(fixture(),headers),sheet=book.getWorksheet('Produtos');
 assert.equal(sheet.getCell('C1').fill.fgColor.argb,'FF003E73');assert.equal(sheet.getCell('D1').fill.fgColor.argb,'FF007F7A');assert.equal(sheet.getCell('D1').font.color.argb,'FFFFFFFF');assert.equal(sheet.getCell('A2').fill.fgColor.argb,'FFF5F8FA');
 assert.equal(sheet.getRow(1).height,34);assert.equal(sheet.views[0].ySplit,1);assert.equal(sheet.views[0].showGridLines,false);assert.equal(sheet.getColumn(1).hidden,true);assert.equal(sheet.getColumn(6).hidden,true);
 assert.equal(sheet.getCell('D2').numFmt,'"R$" #,##0.00');assert.equal(sheet.getCell('D2').alignment.horizontal,'right');
 const info=book.getWorksheet('Instruções');assert.equal(info.getCell('A1').font.size,16);assert.equal(info.getCell('A2').text,'');assert.equal(info.getCell('A3').fill.fgColor.argb,'FF003E73');assert.equal(info.getCell('B4').text,'1. Edite somente os campos escolhidos.');
});
test('salvar e reler conserva dados, cabeçalhos seletivos, zeros, códigos e contrato de importação',async()=>{
 const book=await formatarLivroPrecos(fixture(),headers),saved=await book.xlsx.writeBuffer();
 const reread=XLSX.read(saved,{type:'buffer'});
 assert.deepEqual(XLSX.utils.sheet_to_json(reread.Sheets.Produtos,{header:1,defval:''}),data);
 assert.deepEqual(XLSX.utils.sheet_to_json(reread.Sheets.Metadados,{header:1,defval:''}),meta);
 assert.equal(reread.Workbook.Sheets.find(s=>s.name==='Metadados').Hidden,2);
 assert.equal(reread.Sheets.Produtos['!autofilter'].ref,'A1:F3');
});
