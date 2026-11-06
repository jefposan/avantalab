import {normalizeFiscalNoteFields} from './fiscal-note-fields.mjs';
const fail = message => ({ error: {code:'AV-NFE-CORRECTION-NOTE',field:'note',message} });
const methods = new Set(['PIX estático','PIX dinâmico','Dinheiro','Boleto','Transferência bancária','Cartão de crédito','Cartão de débito','Sem pagamento']);
export function applyFiscalNoteEdit(draft, note, {catalogItems = [], customer,allowPending=false} = {}) {
 if (!note || typeof note !== 'object' || Array.isArray(note) || Object.keys(note).some(k=>!['customerName','customerDocument','paymentMethod','items','freight','insurance','otherExpenses','generalDiscount','additionalInfo','paymentDetails','operationNature','installments','firstDueDate','fiscalForm'].includes(k))) return fail('Revise os dados da nota.');
 if ((!allowPending||note.paymentMethod!=='')&&!methods.has(note.paymentMethod)) return fail('Selecione a forma de pagamento desta nota.');
 let paymentDetails;
 if(allowPending&&note.paymentDetails!==undefined){const detail=note.paymentDetails;if(!detail||typeof detail!=='object'||Array.isArray(detail)||Object.keys(detail).some(key=>!['integrationType','institutionDocument','authorizationCode'].includes(key))||Object.values(detail).some(value=>typeof value!=='string'||value.length>128))return fail('Revise os dados do pagamento.');paymentDetails={...detail};}
 if (!allowPending&&['PIX dinâmico','Cartão de crédito','Cartão de débito'].includes(note.paymentMethod)) {
  const detail=note.paymentDetails;
  if(!detail || typeof detail!=='object' || Object.keys(detail).some(k=>!['integrationType','institutionDocument','authorizationCode'].includes(k)) || !['1','2'].includes(detail.integrationType) || !/^\d{14}$/.test(detail.institutionDocument||'') || typeof detail.authorizationCode!=='string' || !detail.authorizationCode.trim() || detail.authorizationCode.length>128 || /[\r\n\t]/.test(detail.authorizationCode)) return fail('Informe o tipo de integração, CNPJ da instituição e identificador ou autorização do pagamento eletrônico.');
  paymentDetails={integrationType:detail.integrationType,institutionDocument:detail.institutionDocument,authorizationCode:detail.authorizationCode.trim()};
 }

 if (typeof note.customerName !== 'string' || !note.customerName.trim() || note.customerName.length>180 || !/^\d{11}(?:\d{3})?$/.test(note.customerDocument || '')) return fail('Revise o nome e o CPF/CNPJ do destinatário.');
 const form=normalizeFiscalNoteFields(note.fiscalForm);if(!form.valid&&!allowPending)return fail(form.errors[0]);if(allowPending&&note.fiscalForm&&(typeof note.fiscalForm!=='object'||Array.isArray(note.fiscalForm)||Object.keys(note.fiscalForm).some(key=>!Object.hasOwn(form.fields||{},key))||Object.values(note.fiscalForm).some(value=>typeof value!=='string'||value.length>2000)))return fail('Os dados do rascunho são inválidos.');
 const originals=structuredClone(draft.itemsSnapshot || []);
 const items=[];
 if (!Array.isArray(note.items) || !note.items.length || note.items.length>200) return fail('Revise os itens da nota.');
 const seen=new Set();
 for(const row of note.items){
  if(!row || Object.keys(row).some(k=>!['sku','productId','quantity','unitPrice','unitDiscount','ncm','cfop'].includes(k)))return fail('A revisão contém dados de item não permitidos.');
  const original=originals.find(item=>item.sku===row.sku);
  const added=!original && catalogItems.find(item=>item.id===row.productId && item.sku===row.sku && item.type==='produto');
  const source=original || (added ? {productId:added.id,itemType:added.type,sku:added.sku,name:added.name,description:added.description,unit:added.unit,fiscal:added.fiscal,fiscalReady:added.fiscalReady}:null);
  if(!source||seen.has(row.sku)||!(allowPending?/^\d{0,8}$/:/^\d{8}$/).test(row.ncm||'')||!(allowPending?/^\d{0,4}$/:/^(?:\d{4})?$/).test(row.cfop||''))return fail('Revise a identificação, NCM e CFOP dos itens.');
  seen.add(row.sku);
  if(![row.quantity,row.unitPrice,row.unitDiscount].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9)||row.quantity<=0||row.unitDiscount>row.unitPrice)return fail('Revise quantidade, valor e desconto dos itens.');
  const priorFiscal=source.fiscal || {};const priorCfop=priorFiscal.cfopInternal || priorFiscal.cfopInterstate || priorFiscal.cfop || '';
  const noteCfopOverride=row.cfop && row.cfop!==priorCfop ? row.cfop : priorFiscal.noteCfopOverride;
  items.push({...source,quantity:row.quantity,unitPrice:row.unitPrice,unitDiscount:row.unitDiscount,fiscal:{...source.fiscal,ncm:row.ncm,cfop:row.cfop||source.fiscal?.cfop,...(noteCfopOverride?{noteCfopOverride}:{})}});
 }
 if(!['freight','insurance','otherExpenses','generalDiscount'].every(k=>typeof note[k]==='number'&&Number.isFinite(note[k])&&note[k]>=0&&note[k]<=1e9)||(note.additionalInfo!==undefined&&(typeof note.additionalInfo!=='string'||note.additionalInfo.length>5000)))return fail('Revise os totais e as informações adicionais.');
 if(note.operationNature!==undefined && (typeof note.operationNature!=='string'||(!allowPending&&!note.operationNature.trim())||note.operationNature.length>60||/[\r\n\t]/.test(note.operationNature)))return fail('Revise a natureza da operação.');
 if(note.installments!==undefined && (!Number.isInteger(note.installments)||note.installments<1||note.installments>120))return fail('Informe de 1 a 120 parcelas.');
 if(note.firstDueDate!==undefined && !(allowPending&&note.firstDueDate==='') && (!/^\d{4}-\d{2}-\d{2}$/.test(note.firstDueDate)||Number.isNaN(Date.parse(note.firstDueDate))||new Date(note.firstDueDate).toISOString().slice(0,10)!==note.firstDueDate))return fail('Revise o primeiro vencimento.');
 if(customer && customer.document!==note.customerDocument)return fail('O destinatário não corresponde ao cadastro selecionado.');
 if(note.customerDocument!==draft.customerSnapshot.document && !customer)return fail('Selecione um cliente cadastrado neste perfil.');
 const subtotalGross=items.reduce((s,i)=>s+i.quantity*i.unitPrice,0),itemDiscount=items.reduce((s,i)=>s+i.quantity*i.unitDiscount,0);
 if(note.generalDiscount>subtotalGross-itemDiscount)return fail('O desconto geral excede o valor dos itens.');
 const total=Math.round((subtotalGross-itemDiscount-note.generalDiscount+note.freight+note.insurance+note.otherExpenses)*100)/100;
 if(!Number.isFinite(total)||total>1e12)return fail('O total da nota excede o limite permitido.');
 return {source:{issuerSnapshot:structuredClone(draft.issuerSnapshot),customerSnapshot:{...structuredClone(customer || draft.customerSnapshot),displayName:note.customerName.trim(),legalName:note.customerName.trim(),document:note.customerDocument},itemsSnapshot:items,totalsSnapshot:{...structuredClone(draft.totalsSnapshot),...(form.fields?{fiscalForm:form.fields}:{}),...(note.operationNature!==undefined?{operationNature:note.operationNature}:{}),subtotalGross,itemDiscount,generalDiscount:note.generalDiscount,freight:note.freight,insurance:note.insurance,otherExpenses:note.otherExpenses,additionalInfo:note.additionalInfo===undefined?draft.totalsSnapshot?.additionalInfo:note.additionalInfo,total},paymentSnapshot:{...structuredClone(draft.paymentSnapshot),method:note.paymentMethod,...(note.installments?{installments:note.installments}:{}),...(note.firstDueDate!==undefined?{firstDueDate:note.firstDueDate}:{}),details:paymentDetails,amount:total}}};
}
