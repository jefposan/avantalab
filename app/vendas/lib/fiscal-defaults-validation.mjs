import {IPI_NT_OPTIONS,validateIpiClassification} from './fiscal-ipi.mjs';
import {CSOSN_OPTIONS,ICMS_OPTIONS,CONTRIBUTION_OPTIONS,ORIGIN_OPTIONS} from './fiscal-tax-options.mjs';
import {officialCfop} from './fiscal-cfop.mjs';
export const DEFAULT_KEYS=['origem_mercadoria_padrao','csosn','cst_icms','cst_pis','cst_cofins','cst_ipi','enquadramento_ipi','cst_ibs_cbs','classificacao_ibs_cbs','cfop_venda_interna','cfop_venda_interestadual'];
export function validateCompanyFiscalDefaults(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!DEFAULT_KEYS.includes(key)))return 'Revise os padrões fiscais da empresa.';
 const options={origem_mercadoria_padrao:ORIGIN_OPTIONS,csosn:CSOSN_OPTIONS,cst_icms:ICMS_OPTIONS,cst_pis:CONTRIBUTION_OPTIONS,cst_cofins:CONTRIBUTION_OPTIONS,cst_ipi:IPI_NT_OPTIONS};
 for(const [key,value]of Object.entries(input)){
  if(typeof value!=='string'||value.length>6)return 'Selecione os códigos nas listas de padrões fiscais.';
  if(!value)continue;
  if(options[key]&&!options[key].some(option=>option.value===value))return 'Um dos códigos tributários não existe na lista oficial.';
  if(key==='cst_ibs_cbs'&&!/^\d{3}$/.test(value))return 'O CST de IBS/CBS deve ter três dígitos.';
  if(key==='classificacao_ibs_cbs'&&!/^\d{6}$/.test(value))return 'A classificação tributária de IBS/CBS deve ter seis dígitos.';
  if(key.startsWith('cfop_')&&(!officialCfop(value)||!value.startsWith(key==='cfop_venda_interna'?'5':'6')))return 'Selecione CFOP de saída 5xxx dentro da UF e 6xxx fora da UF.';
 }
 return validateIpiClassification(input.cst_ipi,input.enquadramento_ipi);
}
