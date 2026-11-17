/** Normaliza a máscara visual e identifica a pendência sem culpar o meio selecionado. */
export function normalizeElectronicPayment(method, detail) {
 if (!['PIX dinâmico','Cartão de crédito','Cartão de débito'].includes(method)) return {details:undefined};
 const fail=(field,message)=>({error:{field,message}});
 if (!detail || typeof detail!=='object' || Array.isArray(detail) || Object.keys(detail).some(key=>!['integrationType','institutionDocument','authorizationCode'].includes(key))) return fail('integrationType','Revise os dados de integração do pagamento.');
 if (!['1','2'].includes(detail.integrationType)) return fail('integrationType','Selecione o tipo de integração do pagamento.');
 const document=typeof detail.institutionDocument==='string'?detail.institutionDocument:'';
 const digits=document.replace(/\D/g,'');
 if (!/^[\d.\s/-]*$/.test(document) || !/^\d{14}$/.test(digits)) return fail('institutionDocument','Informe o CNPJ da instituição de pagamento com 14 dígitos.');
 const authorization=detail.authorizationCode??'';
 const label=method==='PIX dinâmico'?'identificador da transação PIX (EndToEndId)':'código de autorização do pagamento';
 if (typeof authorization!=='string') return fail('authorizationCode',`Revise o ${label}.`);
 if (detail.integrationType==='1' && ['Cartão de crédito','Cartão de débito'].includes(method) && !authorization.trim()) return fail('authorizationCode','Informe o código de autorização do pagamento integrado.');
 if (authorization.length>128 || /[\r\n\t]/.test(authorization)) return fail('authorizationCode',`Revise o ${label}: use até 128 caracteres, sem quebras de linha.`);
 return {details:{integrationType:detail.integrationType,institutionDocument:digits,authorizationCode:authorization.trim()}};
}
