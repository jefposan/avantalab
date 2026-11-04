import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { personalizarModeloImportacaoDespesas, baixarModeloImportacaoDespesas } from '../../app/modules/importador-despesas/lib/modelo-excel.ts';
import { reconhecerTipoPlanilha } from '../../app/modules/importador-despesas/lib/tipos-planilha.ts';
import JSZip from 'jszip';

test('cada Excel contém os nomes completos atuais e nenhuma lista padrão de outro perfil', async () => {
 const base=readFileSync('public/modelos/modelo-importacao-despesas-avantalab.xlsx');
 for (const tipos of [['Água / Energia', 'Internet'], ['Água / Energia', 'Internet', 'Manutenção nova']]) {
  const bytes=await personalizarModeloImportacaoDespesas(base.buffer.slice(base.byteOffset,base.byteOffset+base.byteLength),tipos);
  const zip=await JSZip.loadAsync(bytes);
  const workbook=await zip.file('xl/workbook.xml').async('string');
  const nomes=await zip.file('xl/worksheets/sheet3.xml').async('string');
  assert.ok(nomes.includes('Água / Energia'));
  assert.equal(nomes.includes('Manutenção nova'), tipos.length===3);
  assert.ok(!nomes.includes('<t>Água</t>'));
  assert.ok(workbook.includes(`$A$${tipos.length}`));
  assert.equal(reconhecerTipoPlanilha('Água / Energia',tipos),'Água / Energia');
  assert.equal(reconhecerTipoPlanilha('Água',tipos),'');
 }
});
test('falha ao consultar cadastro impede baixar modelo antigo ou padrão', async () => {
 await assert.rejects(baixarModeloImportacaoDespesas(async()=>{throw new Error('Consulta indisponível');}),/Consulta indisponível/);
});
test('download atualiza o perfil e não filtra por centro de custo',()=>{
 const source=readFileSync('app/gestao/page.tsx','utf8');
 const callback=source.split('atualizarTiposModelo={async () => {')[1].split('bgCard={bgCard}')[0];
 assert.ok(callback.includes(".eq('empresa_id', empresaId)"));
 assert.ok(callback.includes('setDespesasCadastradas(atuais)'));
 assert.ok(callback.includes('if (error || carga !== cargaPerfilRef.current) throw'));
 assert.ok(!callback.includes(".eq('centro_custo_id'"));
});
