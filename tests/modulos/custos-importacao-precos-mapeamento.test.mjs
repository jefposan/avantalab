import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {lerArquivoPrecos,montarPrecos,sugerirOrigem,lerPreco} from '../../app/custos/importacao-precos.ts';
const produtos=[{id:'p1',sku:'C1.0',nome:'Coloração atualizada'},{id:'p2',sku:'T001',nome:'Produto'}];
function arquivo(rows,meta,legacy){const w=XLSX.utils.book_new();XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(rows),'Produtos');if(meta)XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(meta),'Metadados');if(legacy)XLSX.utils.book_append_sheet(w,XLSX.utils.json_to_sheet(legacy),'Tabelas de preços');return XLSX.write(w,{type:'array',bookType:'xlsx'});}
const rows=[['Código','Nome','Preço padrão','Distribuidor','Salão','NCM'],['C1.0','Nome antigo',10,8,12,'12345678'],['T001','Produto',0,'',15,'']];
const aba=()=>lerArquivoPrecos(arquivo(rows),'empresa',produtos).abas[0];
test('arquivo externo identifica pelo código apesar de nome antigo e ignora dados fiscais',()=>{const a=aba();assert.equal(a.linhas.length,2);assert.deepEqual(a.ocorrencias,[]);assert.equal(a.colunas.some(c=>c.nome==='NCM'),false);});
test('somente padrão, adicional isolada e todas as tabelas têm payload exclusivo de preços',()=>{
 for(const maps of [[{destino:'PADRAO',origem:'Preço padrão'}],[{destino:'SALAO',origem:'Salão'}],[{destino:'PADRAO',origem:'Preço padrão'},{destino:'DIST',origem:'Distribuidor'},{destino:'SALAO',origem:'Salão'}]]){
 const p=montarPrecos(aba(),maps);assert.equal(p.length,maps.length*2);for(const row of p)assert.deepEqual(Object.keys(row).sort(),['preco','produto_id','sku','tabela_codigo']);assert.deepEqual([...new Set(p.map(x=>x.tabela_codigo))],maps.map(x=>x.destino));
 }
});
test('mesma coluna atende duas tabelas e associação pode ser alterada',()=>{const p=montarPrecos(aba(),[{destino:'DIST',origem:'Salão'},{destino:'REVENDA',origem:'Salão'}]);assert.deepEqual(p.map(x=>x.preco),[12,15,12,15]);});
test('vazio preservado como null; zero explícito e valores iguais chegam para avaliação no servidor',()=>{assert.equal(montarPrecos(aba(),[{destino:'DIST',origem:'Distribuidor'}])[1].preco,null);assert.equal(montarPrecos(aba(),[{destino:'PADRAO',origem:'Preço padrão'}])[1].preco,0);});
test('normaliza acentos e espaços nas sugestões e não escolhe equivalência ambígua',()=>{assert.equal(sugerirOrigem({nome:'  Distribuídor ',codigo:'DIST',padrao:false},aba().colunas),'Distribuidor');assert.equal(sugerirOrigem({nome:'Salão',codigo:'SALAO',padrao:false},aba().colunas),'Salão');assert.equal(sugerirOrigem({nome:'Padrão',codigo:'PADRAO',padrao:true},aba().colunas),'Preço padrão');});
test('valida somente preços de colunas selecionadas antes de confirmar',()=>{const r=structuredClone(rows);r[1][3]='inválido';const a=lerArquivoPrecos(arquivo(r),'empresa',produtos).abas[0];assert.doesNotThrow(()=>montarPrecos(a,[{destino:'PADRAO',origem:'Preço padrão'}]));assert.throws(()=>montarPrecos(a,[{destino:'DIST',origem:'Distribuidor'}]),/inválido/);for(const v of [-1,NaN,Infinity,true,'x','R$','1,2,3'])assert.throws(()=>lerPreco(v,'teste'));assert.equal(lerPreco('R$ 1.234,56','teste'),1234.56);});
test('IDs, empresa, duplicados e ambiguidades impedem identificação insegura',()=>{
 const duplicate=[...rows,rows[1]];assert.ok(lerArquivoPrecos(arquivo(duplicate),'empresa',produtos).abas[0].ocorrencias.length);
 assert.ok(lerArquivoPrecos(arquivo(rows),'empresa',[...produtos,{id:'p3',sku:'C1.0',nome:'Outro'}]).abas[0].ocorrencias.length);
 assert.throws(()=>lerArquivoPrecos(arquivo(rows,[['formato','AVANTALAB-CUSTOS-3'],['empresa_id','outra']]),'empresa',produtos),/empresa/);
 assert.throws(()=>montarPrecos(aba(),[{destino:'DIST',origem:'Salão'},{destino:'DIST',origem:'Distribuidor'}]),/repetida/);
});
test('exportações AvantaLab v2 e v3 antigas aceitam produtos alterados sem usar datas antigas',()=>{
 for(const formato of ['AVANTALAB-CUSTOS-2','AVANTALAB-CUSTOS-3']){
 const r=[['ID interno (não alterar)',...rows[0],'Atualizado em (não alterar)'],['p1',...rows[1],'2020-01-01'],['p2',...rows[2],'2020-01-01']];
 const a=lerArquivoPrecos(arquivo(r,[['formato',formato],['empresa_id','empresa']]),'empresa',produtos).abas[0];assert.equal(a.linhas.length,2);assert.deepEqual(a.ocorrencias,[]);assert.equal(montarPrecos(a,[{destino:'PADRAO',origem:'Preço padrão'}]).length,2);
 }
});
test('v2 com preços em aba separada preserva colunas e detecta pares duplicados',()=>{
 const r=[['ID interno (não alterar)','Código','Nome'],['p1','C1.0','Antigo']];const meta=[['formato','AVANTALAB-CUSTOS-2'],['empresa_id','empresa']];const leg=[{'Código do produto':'C1.0','Código da tabela':'DIST','Preço':7}];
 const a=lerArquivoPrecos(arquivo(r,meta,leg),'empresa',produtos).abas[0];assert.equal(montarPrecos(a,[{destino:'DIST',origem:'Preço · DIST'}])[0].preco,7);assert.equal(sugerirOrigem({nome:'Distribuidor',codigo:'DIST',padrao:false},a.colunas),'Preço · DIST');
 assert.ok(lerArquivoPrecos(arquivo(r,meta,[...leg,...leg]),'empresa',produtos).abas[0].ocorrencias.length);
});
