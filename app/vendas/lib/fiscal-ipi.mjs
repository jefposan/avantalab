/** MOC NF-e O09-10: compatibilidade, não escolha do benefício fiscal. */
export const IPI_RULE_SOURCE='https://moc.sped.fazenda.pr.gov.br/NFe_NFCe/RegrasValidacao.html';
export const IPI_NT_OPTIONS=[['01','Entrada tributada com alíquota zero'],['02','Entrada isenta'],['03','Entrada não tributada'],['04','Entrada imune'],['05','Entrada com suspensão'],['51','Saída tributada com alíquota zero'],['52','Saída isenta'],['53','Saída não tributada'],['54','Saída imune'],['55','Saída com suspensão']].map(([value,label])=>({value,label:`${value} — ${label}`}));
export function validateIpiClassification(cst='',enquadramento=''){
 if(!cst&&!enquadramento)return '';
 if(!cst)return 'Selecione o CST do IPI ou deixe os dois campos de IPI vazios quando não se aplicar.';
 if(!IPI_NT_OPTIONS.some(item=>item.value===cst))return 'Selecione uma classificação de IPI sem destaque disponível. IPI com destaque exige apuração específica.';
 if(!/^\d{3}$/.test(enquadramento))return 'Informe os três dígitos do enquadramento legal do IPI.';
 const range=['02','52'].includes(cst)?[301,399]:['04','54'].includes(cst)?[1,99]:['05','55'].includes(cst)?[101,199]:null;
 if(range&&(Number(enquadramento)<range[0]||Number(enquadramento)>range[1]))return `CST do IPI ${cst}: o enquadramento legal deve estar entre ${String(range[0]).padStart(3,'0')} e ${range[1]}. Revise os campos IPI; nenhum código será alterado automaticamente.`;
 return '';
}
