const fields=new Set('operationNature customerId items paymentMethod integrationType institutionDocument authorizationCode installments firstDueDate orderDate deliveryDate freight generalDiscount insurance otherExpenses additionalInfo purpose direction series number issueDate exitDate exitTime purchaseOrder presence destination intermediary intermediaryDocument intermediaryId referenceKey substituteRegistration suframa deliveryForecast freightMode carrierName carrierDocument carrierRegistration carrierAddress carrierCity carrierState vehiclePlate vehicleState rntc volumeCount volumeSpecies volumeBrand volumeNumber grossWeight netWeight fiscalNotes internalNotes priceTableId retainedPis retainedCofins retainedCsll incomeTaxBase incomeTax socialSecurityBase socialSecurityTax'.split(' '));
/** Caminhos remotos nunca viram seletores: somente nomes desta lista são aceitos. */
export function fiscalValidationTarget(issue={}){
 if(/^AV-NFE-AUTH-RESPONSE-/.test(String(issue.code||'')))return '';
 if(/^AV-NFE-(?:NOT-RECEIVED|SUBMISSION-(?:PENDING|DUPLICATE(?:-\d{3})?)|SUBMISSION-UNCONFIRMED)$/.test(String(issue.code||'')))return '';
 if(/^AV-NFE-SIGNING-(?:RULES|RULE-CHANGE|PREPARATION|GENERATOR)$/.test(String(issue.code||'')))return 'operationNature';
 const field=String(issue.field||'').replace(/^(?:note\.|fiscalForm\.|totalsSnapshot\.fiscalForm\.)/,'');
 if(fields.has(field))return field;
 const aliases={customer:'customerId',client:'customerId',payment:'paymentMethod','payment.method':'paymentMethod','payment.details.integrationType':'integrationType','payment.details.institutionDocument':'institutionDocument','payment.details.authorizationCode':'authorizationCode','numbering.sequence':'series','numbering':'series',reference:'referenceKey'};
 if(aliases[field])return aliases[field];
 if(/^(?:items|item)(?:\b|\[)/.test(field))return 'items';
 const m=String(issue.message||'').toLocaleLowerCase('pt-BR');
 const rules=[[/natureza|regra fiscal ativa/,'operationNature'],[/cpf.*cnpj.*transport|documento.*transport/,'carrierDocument'],[/cnpj.*intermediador/,'intermediaryDocument'],[/identifica.*intermediador/,'intermediaryId'],[/uf do ve.culo/,'vehicleState'],[/placa|ve.culo antes/,'vehiclePlate'],[/peso l.quido/,'netWeight'],[/pesos|peso bruto/,'grossWeight'],[/volumes/,'volumeCount'],[/inscri.*transport/,'carrierRegistration'],[/modalidade.*transporte/,'freightMode'],[/intermediador.*atendimento|tipo de atendimento/,'presence'],[/hora.*sa.da/,'exitTime'],[/data.*sa.da/,'exitDate'],[/data.*emiss/,'issueDate'],[/chave.*referenc|44 d.gitos/,'referenceKey'],[/s.rie/,'series'],[/n.mero.*nota|numera/,'number'],[/primeiro vencimento/,'firstDueDate'],[/parcelas/,'installments'],[/institui.*pagamento/,'institutionDocument'],[/autoriza.*pagamento|identificador.*pix/,'authorizationCode'],[/integra.*pagamento/,'integrationType'],[/pagamento|meio real/,'paymentMethod'],[/cliente|destinat.rio/,'customerId'],[/quantidade|pre.o unit.rio|produto|ncm|cfop|tributa.*iten/,'items'],[/desconto geral/,'generalDiscount'],[/entrega/,'deliveryDate'],[/data.*pedido/,'orderDate'],[/observa|informa.*adicion/,'additionalInfo']];
 const direct=m.match(/campo ([a-z]+)/i)?.[1];const key=[...fields].find(key=>key.toLowerCase()===direct);if(key)return key;
 return rules.find(([pattern])=>pattern.test(m))?.[1]||'';
}

/** Explica o retorno fiscal pelo campo realmente diferente, sem alterar o histórico da SEFAZ. */
export function fiscalValidationIssue(issue, form={}) {
 if(/^\d{4}-\d{2}-\d{2}$/.test(form.issueDate||'') && form.issueDate===form.exitDate && /data de sa[ií]da menor que a data de emiss[aã]o/i.test(issue?.message||''))return {...issue,field:'exitTime',message:'A hora de saída está anterior à hora de emissão no mesmo dia. Corrija a hora de saída ou deixe-a em branco para usar o horário da emissão.'};
 return issue;
}
