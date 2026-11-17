import table from './data/cfop-oficial.json' with {type:'json'};
import {resolveFiscalMatrixRule} from './fiscal-matrix.mjs';
export const CFOP_SOURCE=Object.freeze({url:table.source,reference:table.reference,sha256:table.sha256});
export const CFOP_TABLE=table.entries;
const byCode=new Map(CFOP_TABLE.map(entry=>[entry.code,entry]));
const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
export function officialCfop(value,date=new Date().toISOString().slice(0,10)){
 const code=String(value||'').match(/^(\d{4})(?:\s*[-–—]|$)/)?.[1];const entry=byCode.get(code);
 return entry&&entry.nfe&&entry.start<=date&&(!entry.end||entry.end>=date)?entry:null;
}
export function cfopNature(entry){return `${entry.code} - ${entry.title}`.slice(0,60);}
export function searchCfop(query='',date=new Date().toISOString().slice(0,10)){
 const term=normalized(query);return CFOP_TABLE.filter(entry=>entry.nfe&&entry.start<=date&&(!entry.end||entry.end>=date)&&normalized(`${entry.code} ${entry.title}`).includes(term));
}
export function cfopOperation(entry){
 if(!entry)return '';
 if(entry.devolution)return 'Devolução';if(entry.return)return 'Retorno';if(entry.remittance)return 'Remessa';
 const title=normalized(entry.title);
 if(title.startsWith('venda'))return 'Venda';
 if(title.startsWith('prestacao'))return 'Prestação de serviço';
 // Do not apply a sale rule to a purchase, transfer or other unconfigured operation.
 return entry.title.split(' ')[0];
}
export function cfopPrefix(destination,direction='1'){
 return destination==='Dentro da UF'?(direction==='0'?'1':'5'):destination==='Fora da UF'?(direction==='0'?'2':'6'):destination==='Exterior'?(direction==='0'?'3':'7'):'';
}
/** Only published company values; no hardcoded 5102/6102 or mutation of the matrix. */
export function configuredNoteCfop({matrix,context,nature='',direction='1',date,defaults}={}){
 const official=officialCfop(nature,date);if(official)return official.code;
 const named=matrix.rules.filter(rule=>rule.active&&rule.operationNature===nature);
 const resolution=resolveFiscalMatrixRule({matrix:{...matrix,rules:named.length?named:matrix.rules},documentType:'nfe',...context});
 const prefix=cfopPrefix(context.destination,direction);
 if(!prefix)return '';
 const baseline=['nfe-venda-interna-contribuinte','nfe-venda-interestadual-contribuinte','nfe-venda-consumidor-final'];
 if(resolution.reviewed&&resolution.rule?.cfopOverride?.startsWith(prefix)&&!baseline.includes(resolution.rule.id))return resolution.rule.cfopOverride;
 const companyCode=context.destination==='Dentro da UF'?defaults?.internal:context.destination==='Fora da UF'?defaults?.interstate:'';
 if(context.operation==='Venda'&&officialCfop(companyCode,date)&&companyCode.startsWith(prefix))return companyCode;
 if(resolution.reviewed&&resolution.rule?.cfopOverride?.startsWith(prefix))return resolution.rule.cfopOverride;
 if(!matrix.reviewedBy||!matrix.reviewedAt)return '';
 const values=[...new Set(matrix.rules.filter(rule=>rule.active&&rule.reviewed&&rule.documentType==='nfe'&&rule.operation===context.operation&&rule.destination===context.destination&&rule.cfopOverride?.startsWith(prefix)).map(rule=>rule.cfopOverride))];
 return values.length===1?values[0]:'';
}
/** Manual values remain visible for validation, including invalid/incomplete input. */
export function noteItemCfop({manual,product,operationCfop,destination}){
 if(manual!==undefined)return manual;
 if(product?.useCompanyFiscal===false){const exception=destination==='Fora da UF'?product.cfopInterstate:product.cfopInternal;if(exception)return exception;}
 return operationCfop||(destination==='Fora da UF'?product?.cfopInterstate:product?.cfopInternal)||'';
}
