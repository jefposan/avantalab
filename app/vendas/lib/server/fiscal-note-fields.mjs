import {newFiscalNoteFields,validateFiscalNoteFields} from '../fiscal-note-editor.mjs';
import {isValidCnpj,isValidCpf} from './commercial-customer-service.mjs';
const date=value=>!value||(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
export function normalizeFiscalNoteFields(input){
 if(input===undefined||input===null)return{valid:true,fields:undefined,errors:[]};
 const defaults=newFiscalNoteFields(),errors=[];
 if(typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!Object.hasOwn(defaults,key)))return{valid:false,errors:['Os dados adicionais da nota contêm campos não permitidos.']};
 const fields={...defaults};
 for(const [key,value]of Object.entries(input)){if(typeof value!=='string'||value.length>(key==='internalNotes'||key==='fiscalNotes'?2000:200)){errors.push(`Revise o campo ${key}.`);continue;}fields[key]=value.trim();}
 if(!['1','2','3','4'].includes(fields.purpose)||!['0','1'].includes(fields.direction)||!['9','0','1','2','3','4'].includes(fields.freightMode)||!['0','1','2','3','4','5','9'].includes(fields.presence)||!['auto','1','2','3'].includes(fields.destination)||!['0','1'].includes(fields.intermediary))errors.push('Selecione uma finalidade, operação, atendimento e transporte válidos.');
 errors.push(...validateFiscalNoteFields(fields));
 for(const key of ['issueDate','exitDate','deliveryForecast'])if(!date(fields[key]))errors.push('Revise as datas da nota.');
 if(fields.intermediary==='1'&&!['2','3','9'].includes(fields.presence))errors.push('Intermediador exige atendimento não presencial. Revise o tipo de atendimento da NF-e.');
 if(fields.presence==='4')errors.push('Entrega em domicílio como indicador de presença é exclusiva da NFC-e. Selecione o atendimento da NF-e.');
 if(fields.rntc&&!fields.vehiclePlate)errors.push('Informe o veículo antes do RNTC / ANTT.');
 if(fields.intermediary==='1'&&fields.intermediaryId.length<2)errors.push('A identificação no intermediador deve ter ao menos dois caracteres.');
 if(fields.exitTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.exitTime))errors.push('Informe uma hora de saída válida.');
 if(fields.exitTime&&!fields.exitDate)errors.push('Informe a data de saída junto da hora.');
 const ufs=new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
 for(const key of ['carrierState','vehicleState'])if(fields[key]&&!ufs.has(fields[key]))errors.push('Revise a UF do transporte.');
 fields.carrierDocument=fields.carrierDocument.replace(/\D/g,'');fields.intermediaryDocument=fields.intermediaryDocument.replace(/\D/g,'');
 if(fields.carrierDocument&&!isValidCnpj(fields.carrierDocument)&&!isValidCpf(fields.carrierDocument))errors.push('Informe CPF ou CNPJ válido do transportador.');
 if(fields.intermediary==='1'&&!isValidCnpj(fields.intermediaryDocument))errors.push('Informe um CNPJ válido do intermediador.');
 for(const key of ['grossWeight','netWeight'])if(fields[key]&&!/^\d{1,12}(?:[,.]\d{1,3})?$/.test(fields[key]))errors.push('Informe pesos positivos com até três casas decimais.');
 if(fields.volumeCount&&!/^\d{1,15}$/.test(fields.volumeCount))errors.push('Informe uma quantidade de volumes válida.');
 if(fields.vehiclePlate&&!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(fields.vehiclePlate.replace('-','')))errors.push('Revise a placa do veículo.');
 if(fields.carrierRegistration&&!/^(?:\d{2,14}|ISENTO)$/i.test(fields.carrierRegistration))errors.push('Revise a inscrição estadual do transportador.');
 for(const key of ['retainedPis','retainedCofins','retainedCsll','incomeTaxBase','incomeTax','socialSecurityBase','socialSecurityTax'])if(!/^(?:\d{1,12}|\d{1,3}(?:\.\d{3})+),\d{2}$/.test(fields[key]))errors.push('Revise os valores das retenções.');
 if([fields.volumeSpecies,fields.volumeBrand,fields.volumeNumber].some(value=>value.length>60)||fields.carrierName.length>60||fields.carrierAddress.length>60||fields.carrierCity.length>60||fields.purchaseOrder.length>15||fields.suframa.length>9||fields.substituteRegistration.length>14||fields.rntc.length>20)errors.push('Um dos campos excede o limite do leiaute fiscal.');
 if(fields.freightMode==='9'&&[fields.carrierName,fields.carrierDocument,fields.vehiclePlate].some(Boolean))errors.push('Selecione a modalidade do transporte ou limpe os dados do transportador.');
 return{valid:errors.length===0,fields,errors:[...new Set(errors)]};
}
export function fiscalFormForXml(fields){if(!fields)return undefined;const xml={...fields};delete xml.internalNotes;delete xml.priceTableId;return xml;}
