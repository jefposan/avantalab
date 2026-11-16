// Valida preferências cadastrais, sem publicar a matriz nem autorizar emissão.
export function validateFiscalSettingsForm(settings) {
  const errors=[];
  const scope=settings?.fiscal?.documentScope;
  if (!Array.isArray(scope)||!scope.length) errors.push('Selecione ao menos um tipo de nota fiscal utilizado pela empresa.');
  else if(scope.some(type=>!['nfe','nfce','nfse'].includes(type))) errors.push('Selecione somente tipos de nota fiscal válidos.');
  const defaultDocument=settings?.commercial?.defaultFiscalDocument;
  if(defaultDocument&&defaultDocument!=='nenhum'&&!(Array.isArray(scope) ? scope : []).includes(defaultDocument)) errors.push('O documento fiscal padrão precisa estar entre as notas utilizadas pela empresa.');
  return {ready:errors.length===0,errors,warnings:[]};
}
// Ao retornar da numeração, preserva os campos ainda não salvos do card pai.
export function mergeSettingsNumbering(draft,settings) {
  return {...draft,fiscal:{...draft.fiscal,nfeSeries:settings.fiscal.nfeSeries,nfceSeries:settings.fiscal.nfceSeries,nfseSeries:settings.fiscal.nfseSeries}};
}
