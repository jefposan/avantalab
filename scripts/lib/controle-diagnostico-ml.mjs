export function priceAccessPlan(manifest,version,environment){
 const plan=manifest.mlPriceAccessCheck;
 if(!plan||plan.version!==version)return null;
 if(plan.type!=='marketplace-price-access-jeff'||plan.accountLabel!=='JEFF'||plan.mode!=='production-read-only'||plan.sellerReference!=='230210240')throw Error('Plano de diagnóstico ML inválido.');
 for(const key of ['companyId','connectionId'])if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(plan[key]||''))throw Error('Identificação de diagnóstico inválida.');
 if(environment&&environment!=='production')throw Error('O diagnóstico real só pode usar o ambiente de produção.');
 return plan;
}
/** Só campos públicos/sanitizados; cada evento fica abaixo do limite de linha do provedor. */
export function priceAccessEvents(version,report,stats){
 if(report.accessAudit?.identityVerified!==true||report.accessAudit.sellerReference!=='230210240'||stats.blockedWrites!==0)throw Error('Identidade ou leitura controlada não confirmada.');
 return [
  ['AVANTA_ML_ACCESS_CHECK',{version,account:'JEFF',origin:'vercel-production-build',identityVerified:true,readOnly:true,advertisementsChanged:false,stockChanged:false,referenceSaved:false,distinctReads:report.accessAudit.distinctReads,stats}],
  ['AVANTA_ML_ACCESS_APP',{version,application:report.accessAudit.application,authorization:report.accessAudit.authorization}],
  ...report.probes.map(probe=>['AVANTA_ML_ACCESS_PROBE',{version,...probe}]),
  ...report.accessAudit.checks.map(probe=>['AVANTA_ML_ACCESS_PROBE',{version,...probe}]),
  ...report.accessAudit.providerResponses.map(evidence=>['AVANTA_ML_ACCESS_RESPONSE',{version,...evidence}]),
 ];
}
