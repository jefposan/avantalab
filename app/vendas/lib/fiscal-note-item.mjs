import {CSOSN_OPTIONS,ICMS_OPTIONS,CONTRIBUTION_OPTIONS,ORIGIN_OPTIONS} from './fiscal-tax-options.mjs';
import {officialCfop} from './fiscal-cfop.mjs';
export const IPI_NT_OPTIONS=[['01','Entrada tributada com alíquota zero'],['02','Entrada isenta'],['03','Entrada não tributada'],['04','Entrada imune'],['05','Entrada com suspensão'],['51','Saída tributada com alíquota zero'],['52','Saída isenta'],['53','Saída não tributada'],['54','Saída imune'],['55','Saída com suspensão']].map(([value,label])=>({value,label:`${value} — ${label}`}));
export const NOTE_ITEM_KEYS=['name','unit','ncm','cfop','taxableUnit','originCode','icmsCode','pisCst','cofinsCst','ipiCst','ipiLegalCode'];
export function validateNoteItem(input){
 if(input===undefined)return '';
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!NOTE_ITEM_KEYS.includes(key)))return 'Revise os dados do item desta nota.';
 for(const [key,value]of Object.entries(input)){
  if(typeof value!=='string'||value.length>(key==='name'?120:20)||/[\r\n\t]/.test(value))return 'Revise a descrição e os códigos do item.';
  if(!value)continue;
  if(key==='ncm'&&!/^\d{8}$/.test(value))return 'O NCM do item deve ter oito dígitos.';
  if(key==='cfop'&&!officialCfop(value))return 'Selecione um CFOP vigente para o item.';
  if(['unit','taxableUnit'].includes(key)&&value.length>6)return 'A unidade do item deve ter até seis caracteres.';
  const options={originCode:ORIGIN_OPTIONS,icmsCode:[...CSOSN_OPTIONS,...ICMS_OPTIONS],pisCst:CONTRIBUTION_OPTIONS,cofinsCst:CONTRIBUTION_OPTIONS,ipiCst:IPI_NT_OPTIONS};
  if(options[key]&&!options[key].some(option=>option.value===value))return 'Selecione uma classificação disponível para este item. IPI com destaque exige apuração específica e continua protegido.';
  if(key==='ipiLegalCode'&&!/^\d{3}$/.test(value))return 'O enquadramento do IPI deve ter três dígitos.';
 }
 if(input.ipiCst&&!input.ipiLegalCode)return 'Informe o enquadramento do IPI para este item.';
 return '';
}
export function applyNoteItemFiscal(base,override){
 const applied={...base};if(!override)return applied;
 for(const key of ['ncm','cfop','taxableUnit','originCode','icmsCode','pisCst','cofinsCst','ipiCst','ipiLegalCode'])if(Object.hasOwn(override,key))applied[key]=override[key];
 return applied;
}
