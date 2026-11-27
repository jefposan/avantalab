import { evaluateAccessDecision } from '../access-control.mjs';
import { normalizePaymentSettings, paymentMethodKey } from '../payment-methods.mjs';
const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
export function createCommercialPolicyRepository({pool}) {
  return {
    async load(companyId) {
      const row = (await pool.query('select max_discount_percent,version from fiscal_private.commercial_policies where company_id=$1',[companyId])).rows[0];
      return {maxDiscountPercent:row?Number(row.max_discount_percent):15,version:row?Number(row.version):0};
    },
    async loadPayments(companyId) {
      const row = (await pool.query('select settings,version from fiscal_private.commercial_payment_settings where company_id=$1', [companyId])).rows[0];
      return row ? { payments: normalizePaymentSettings(row.settings), version: Number(row.version) } : { payments: null, version: 0 };
    },
    async savePayments(companyId, actorId, settings, version) {
      const normalized = normalizePaymentSettings(settings);
      const invalid = !Number.isSafeInteger(version) || version < 0 || !Array.isArray(settings?.customMethods) ||
        settings.customMethods.length !== normalized.customMethods.length || !Array.isArray(settings.enabledMethods) ||
        settings.enabledMethods.length !== normalized.enabledMethods.length ||
        !settings.enabledMethods.every(value => normalized.enabledMethods.some(method => paymentMethodKey(method) === paymentMethodKey(value))) ||
        paymentMethodKey(settings.defaultMethod) !== paymentMethodKey(normalized.defaultMethod) ||
        settings.defaultInstallments !== normalized.defaultInstallments || settings.firstDueDays !== normalized.firstDueDays;
      if (invalid) throw Object.assign(Error('Revise as formas de pagamento e mantenha uma forma padrão ativa.'), { public: true, status: 400 });
      const row = (version === 0
        ? await pool.query('insert into fiscal_private.commercial_payment_settings(company_id,settings,updated_by) values($1,$2,$3) on conflict(company_id) do nothing returning version', [companyId, normalized, actorId])
        : await pool.query('update fiscal_private.commercial_payment_settings set settings=$2,updated_by=$3,updated_at=now(),version=version+1 where company_id=$1 and version=$4 returning version', [companyId, normalized, actorId, version])).rows[0];
      if (!row) throw Object.assign(Error('As formas foram alteradas em outra tela. Reabra Pagamentos para conferir antes de salvar.'), { public: true, status: 409 });
      return { payments: normalized, version: Number(row.version) };
    },
    async save(companyId,actorId,value,version) {
      if (!valid(value)||!Number.isSafeInteger(version)||version<0) throw Object.assign(Error('Informe um limite de 0% a 100% e atualize a configuração.'),{public:true});
      const row=(version===0
        ? await pool.query(`insert into fiscal_private.commercial_policies(company_id,max_discount_percent,version,updated_by) values($1,$2,1,$3) on conflict(company_id) do nothing returning max_discount_percent,version`,[companyId,value,actorId])
        : await pool.query(`update fiscal_private.commercial_policies set max_discount_percent=$2,version=version+1,updated_by=$3,updated_at=now() where company_id=$1 and version=$4 returning max_discount_percent,version`,[companyId,value,actorId,version])).rows[0];
      if(!row)throw Object.assign(Error('O limite foi alterado em outra tela. Atualize e confira antes de salvar.'),{public:true,status:409});
      return {maxDiscountPercent:Number(row.max_discount_percent),version:Number(row.version)};
    },
  };
}
export async function handleCommercialPolicy({request,runtime}) {
 const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 const companyId=new URL(request.url).searchParams.get('companyId');
 if(!/^[0-9a-f-]{36}$/i.test(companyId||'')||!['GET','PATCH'].includes(request.method))return reply(400,{ok:false,message:'Selecione novamente o perfil.'});
 if(!runtime?.commercialPolicyRepository)return reply(503,{ok:false,message:'A política comercial está indisponível.'});
 try{
  const access=await runtime.accessResolver.resolve(request,{companyId});
  if(!access?.authenticated)return reply(401,{ok:false,message:'Confirme novamente sua sessão.'});
  const payments = new URL(request.url).searchParams.get('section') === 'payments';
  const permissions = request.method === 'PATCH' ? ['settings.edit'] : payments
    ? ['settings.view', 'sales.view', 'sales.create', 'sales.edit', 'services.view', 'services.create', 'services.edit', 'reports.view', 'receivables.view'] : ['settings.view'];
  const check = permissions.map(permission => evaluateAccessDecision({ boundary: access.boundary, effectivePermissions: access.effectivePermissions, permission }))
    .find(decision => decision.allowed && decision.session.companyId === companyId);
  if (payments) {
    if (!check) return reply(403,{ok:false,message:'Seu acesso não permite consultar ou alterar as formas de pagamento.'});
    if (request.method === 'GET') return reply(200,{ok:true,...await runtime.commercialPolicyRepository.loadPayments(companyId)});
    const raw = await request.text();
    if (raw.length > 6500) return reply(413,{ok:false,message:'Solicitação muito grande.'});
    const body = JSON.parse(raw);
    return reply(200,{ok:true,...await runtime.commercialPolicyRepository.savePayments(companyId,check.session.userId,body?.settings,body?.version)});
  }
  if(!check)return reply(403,{ok:false,message:'Seu acesso não permite consultar ou alterar a política comercial.'});
  if(request.method==='GET')return reply(200,{ok:true,policy:await runtime.commercialPolicyRepository.load(companyId)});
  const raw=await request.text();if(raw.length>2000)return reply(413,{ok:false,message:'Solicitação muito grande.'});
  const body=JSON.parse(raw);if(Object.keys(body).some(key=>!['maxDiscountPercent','version'].includes(key)))return reply(400,{ok:false,message:'Revise a política comercial.'});
  return reply(200,{ok:true,policy:await runtime.commercialPolicyRepository.save(companyId,check.session.userId,body.maxDiscountPercent,body.version)});
 }catch(error){return reply(error.status||503,{ok:false,message:error.public?error.message:'Não foi possível consultar ou salvar os ajustes comerciais. Tente novamente.'});}
}
