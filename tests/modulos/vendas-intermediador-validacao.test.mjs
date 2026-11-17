import test from 'node:test';
import assert from 'node:assert/strict';
import {newFiscalNoteFields,validateFiscalNoteFields} from '../../app/vendas/lib/fiscal-note-editor.mjs';
import {fiscalValidationTarget} from '../../app/vendas/lib/fiscal-validation.mjs';

test('CNPJ completo não recebe erro quando a identificação do intermediador está ausente',()=>{
 const fields={...newFiscalNoteFields(),intermediary:'1',intermediaryDocument:'03.007.331/0001-41'};
 const issues=validateFiscalNoteFields(fields);
 assert.equal(issues.length,1);
 assert.equal(fiscalValidationTarget({message:issues[0]}),'intermediaryId');
 assert.deepEqual(validateFiscalNoteFields({...fields,intermediaryId:'CONTA_VENDEDORA'}),[]);
});

test('CNPJ incompleto e identificação curta apontam separadamente aos campos correspondentes',()=>{
 const fields={...newFiscalNoteFields(),intermediary:'1',intermediaryDocument:'0300',intermediaryId:' '};
 assert.deepEqual(validateFiscalNoteFields(fields).map(message=>fiscalValidationTarget({message})),['intermediaryDocument','intermediaryId']);
 assert.deepEqual(validateFiscalNoteFields({...fields,intermediary:'0'}),[]);
});
