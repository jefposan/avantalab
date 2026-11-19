import {createHash} from 'node:crypto';
import {validateCommercialCustomerInput} from './commercial-customer-service.mjs';
import {CUSTOMER_IMPORT_LIMIT,CUSTOMER_EXCEL_FIELDS} from '../customer-excel-contract.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=(code,message,field='file')=>({ok:false,errors:[{code,message,field}]});
export function createCommercialCustomerImportService({repository}) {
  return {async run({context,rows,confirm=false,previewKey='',fileName=''}={}) {
    if(!context||!UUID.test(context.companyId||'')||!UUID.test(context.actorId||''))return fail('AV-COMMERCIAL-SESSION','Confirme novamente a sessão.');
    if(context.moduleId!=='vendas'||!context.active||!context.moduleActive||context.effectivePermissions?.['clients.create']!==true||context.effectivePermissions?.['clients.view']!==true)return fail('AV-COMMERCIAL-PERMISSION','Seu acesso não permite importar clientes.');
    if(!Array.isArray(rows)||!rows.length||rows.length>CUSTOMER_IMPORT_LIMIT)return fail('AV-COMMERCIAL-IMPORT-SIZE',`Importe de 1 a ${CUSTOMER_IMPORT_LIMIT} clientes por arquivo.`);
    const errors=[],normalized=[],seen=new Map();
    for(const row of rows) {
      const line=Number(row?.line); const customer=row?.customer;
      if(!Number.isSafeInteger(line)||line<2||!customer||typeof customer!=='object'||Array.isArray(customer))return fail('AV-COMMERCIAL-IMPORT-ROW','Uma linha da planilha é inválida.');
      const input=Object.fromEntries(CUSTOMER_EXCEL_FIELDS.map(({key})=>[key,customer[key]]));
      for(const field of CUSTOMER_EXCEL_FIELDS)if(field.key!=='consumerFinal'&&input[field.key]!=null&&typeof input[field.key]!=='string')errors.push({line,field:field.key,message:`${field.label}: use um texto, não um objeto ou fórmula.`});
      if(input.documentType==='cnpj'&&input.stateRegistration&&!input.stateRegistrationIndicator)errors.push({line,field:'stateRegistrationIndicator',message:'Informe a situação da inscrição estadual.'});
      for(const [key,length] of [['postalCode',8],['cityCode',7]])if(String(input[key]??'').replace(/\D/g,'').length>length)errors.push({line,field:key,message:`${key==='postalCode'?'CEP':'Código IBGE'} possui dígitos a mais.`});
      for(const field of CUSTOMER_EXCEL_FIELDS)if(field.max&&String(input[field.key]??'').trim().length>field.max)errors.push({line,field:field.key,message:`${field.label}: máximo de ${field.max} caracteres.`});
      if(String(input.phone??'').replace(/\D/g,'').length>15)errors.push({line,field:'phone',message:'Informe somente um telefone, com até 15 dígitos.'});
      if(input.status&&!['ativo','inativo','revisar_cadastro'].includes(input.status))errors.push({line,field:'status',message:'Situação inválida.'});
      const validation=validateCommercialCustomerInput(input);
      for(const error of validation.errors)errors.push({line,field:error.field,message:error.message});
      const document=validation.normalized.document;
      if(document&&seen.has(document))errors.push({line,field:'document',message:`CPF/CNPJ repetido na planilha (também na linha ${seen.get(document)}).`});
      if(document)seen.set(document,line);
      normalized.push({line,customer:validation.normalized,review:!validation.fiscalReady&&validation.normalized.status!=='inativo'});
    }
    if(errors.length)return {ok:true,canImport:false,total:rows.length,created:0,skipped:0,review:0,rowErrors:errors};
    try {
      const documents=normalized.map(row=>row.customer.document);
      const existing=(await repository.findExistingDocuments({companyId:context.companyId,documents})).sort();
      const existingSet=new Set(existing);
      const preview=normalized.map(row=>({line:row.line,status:existingSet.has(row.customer.document)?'existing':row.review?'review':'new'}));
      const hash=createHash('sha256').update(JSON.stringify([context.companyId,context.actorId,normalized,existing])).digest('hex');
      const summary={ok:true,canImport:true,total:rows.length,created:preview.filter(r=>r.status!=='existing').length,skipped:preview.filter(r=>r.status==='existing').length,review:preview.filter(r=>r.status==='review').length,rowErrors:[],rows:preview,previewKey:hash};
      if(!confirm)return summary;
      if(previewKey!==hash)return fail('AV-COMMERCIAL-IMPORT-CONFLICT','A prévia mudou. Revise novamente antes de importar.');
      const result=await repository.importMany({companyId:context.companyId,actorId:context.actorId,customers:normalized.map(row=>row.customer),expectedExisting:existing,fileName:String(fileName).replace(/[\u0000-\u001f]/g,'').slice(0,160)});
      return {...summary,created:result.created,skipped:result.skipped,confirmed:true};
    }catch(cause){return fail(cause?.code==='AV-COMMERCIAL-IMPORT-CONFLICT'?'AV-COMMERCIAL-IMPORT-CONFLICT':'AV-COMMERCIAL-CUSTOMER-STORAGE',cause?.code==='AV-COMMERCIAL-IMPORT-CONFLICT'?'Os cadastros mudaram. Gere uma nova prévia.':'Não foi possível concluir a importação. Nenhum cliente deste lote foi gravado.');}
  }};
}
