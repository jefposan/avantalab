/** Apresentação apenas: nunca substitui o identificador usado nos vínculos fiscais. */
export function fiscalOriginLabel({sourceLabel,originId}={}) {
 if(sourceLabel==='Nota avulsa')return 'Nota avulsa';
 if(sourceLabel==='Venda rápida')return 'Venda rápida';
 const label=sourceLabel==='Ordem de serviço'?'OS':sourceLabel==='Pedido'?'Pedido':String(sourceLabel||'Origem não informada');
 const reference=String(originId||'').trim().replace(/^(?:PED(?:IDO)?|OS|ORDEM DE SERVIÇO)\s*(?:N[º°O.]*)?\s*[-:#]?\s*/iu,'');
 // Sem número comercial conhecido, mostra somente o tipo em vez de um UUID técnico.
 return /^\d+(?:[/-]\d+)*$/.test(reference)?`${label} nº ${reference}`:label;
}
