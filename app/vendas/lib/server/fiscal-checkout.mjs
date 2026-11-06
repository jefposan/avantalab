import { NFE_REJECTION_CORRECTION_CONFIRMATION } from './commercial-nfe-rejection-correction.mjs';
import { createHash } from 'node:crypto';
import { evaluateAccessDecision } from '../access-control.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,120}$/;
const fail = (code, message) => ({ ok: false, code, message });
const stageKey = (stage, key, id) => `${stage}:${createHash('sha256').update(`${key}:${id}`).digest('hex').slice(0,48)}`;
const errorOf = result => ({...fail(result?.errors?.[0]?.code || 'AV-FISCAL-CHECKOUT', result?.errors?.[0]?.message || 'Não foi possível concluir a emissão. Tente novamente nesta mesma nota.'), field:String(result?.errors?.[0]?.field||'').slice(0,160)});
const publicEmission = emission => ({ emissionId: emission.id || emission.emissionId, state: emission.state, version: Number(emission.version), series: emission.series || '', number: Number(emission.number || 0), authorized: ['authorized','artifacts_stored','danfe_ready'].includes(emission.state), processing: ['submitted','processing'].includes(emission.state) });

/** Uma ação do usuário; etapas internas continuam usando todos os serviços protegidos. */
export async function runFiscalCheckout({ runtime, context, input }) {
  const issue = input?.action === 'issue';
  if (!['save','issue'].includes(input?.action) || !KEY.test(input?.idempotencyKey || '') || (input.draftId ? !UUID.test(input.draftId) : !UUID.test(input.originOrderId || ''))) return fail('AV-FISCAL-CHECKOUT-INPUT','Atualize a nota antes de continuar.');
  const permissions = context?.effectivePermissions || {};
  if (!context?.active || !context.moduleActive || context.moduleId !== 'vendas' || !UUID.test(context.companyId || '') || !UUID.test(context.actorId || '') || permissions['fiscal.prepare'] !== true || (issue && permissions['fiscal.issue'] !== true)) return fail('AV-FISCAL-CHECKOUT-PERMISSION','Seu acesso não permite esta ação na nota fiscal.');
  if (issue && (runtime.fiscalExecution?.environment !== 'homologacao' || runtime.fiscalExecution?.transmissionAllowed !== true || runtime.fiscalExecution?.productionTransmissionAllowed !== false)) return fail('AV-FISCAL-CHECKOUT-SERVICE','O serviço de emissão em homologação não está disponível. Consulte Ver serviço.');
  try {
    let draftId = input.draftId;
    if (!draftId) {
      const saved = await runtime.orderFiscalDraftService.create({ context, input: { originOrderId: input.originOrderId, expectedVersion: input.expectedVersion } });
      if (!saved?.ok) return errorOf(saved);
      draftId = saved.document?.draftId;
    }
    if (!UUID.test(draftId || '')) return fail('AV-FISCAL-CHECKOUT-LINK','O vínculo fiscal não foi confirmado. Atualize as notas.');
    const load = () => runtime.fiscalDraftRepository.get({ companyId: context.companyId, draftId });
    let draft = await load();
    if (!draft || draft.companyId !== context.companyId || draft.documentType !== 'nfe') return fail('AV-FISCAL-CHECKOUT-NOT-FOUND','Nota não localizada neste perfil empresarial.');
    let emission = draft.emission;
    if (emission?.state === 'canceled') return fail('AV-FISCAL-CHECKOUT-CANCELED','Esta NF-e foi cancelada fiscalmente e permanece somente para consulta.');
    if (!issue) return { ok: true, draftId, message: 'Rascunho salvo. Nenhuma nota foi enviada.', ...(emission ? { emission: publicEmission(emission) } : {}) };
    if (['submitted','processing'].includes(emission?.state)) {
      await runtime.reconcileFiscalEmission?.({companyId:context.companyId,emissionId:emission.id});
      emission = (await load())?.emission || emission;
      if (!['authorized','artifacts_stored','danfe_ready','rejected'].includes(emission.state) && !(emission.state === 'signed' && emission.statusCode === '217')) return {...fail('AV-NFE-SUBMISSION-UNCONFIRMED','A comunicação não confirmou o resultado da nota. A tentativa foi preservada. Tente novamente nesta mesma nota.'),draftId,emission:publicEmission(emission)};
    }
    if (['authorized','artifacts_stored','danfe_ready'].includes(emission?.state)) return { ok: true, draftId, emission: publicEmission(emission), message: 'Nota já autorizada. Nenhum novo envio foi feito.' };
    if (emission?.state === 'rejected' && emission.statusCode === '588') {
      const repaired = await runtime.nfeRejectionCorrectionService?.prepare({ context, emissionId: emission.id, expectedVersion: emission.version, idempotencyKey: stageKey('repair-format', input.idempotencyKey, `${draftId}:${emission.version}`), rejectedStatusCode: '588', confirmation: NFE_REJECTION_CORRECTION_CONFIRMATION });
      if (!repaired?.ok) return {...errorOf(repaired),draftId};
      draft = await load(); emission = draft?.emission;
    }
    if (emission?.state === 'rejected') return {...fail('AV-FISCAL-CHECKOUT-REJECTED',emission.statusReason || 'A SEFAZ rejeitou a nota. Revise o retorno fiscal.'),draftId,emission:publicEmission(emission)};
    if (['rejected','failed'].includes(emission?.state)) return fail('AV-FISCAL-CHECKOUT-REVIEW','Revise a rejeição ou consulte a situação da nota antes de um novo envio.');
    if (!emission) {
      const opened = await runtime.emissionBridge.createNfeDraft({ context, draftId, idempotencyKey: stageKey('checkout-open',input.idempotencyKey,draftId) });
      if (!opened?.ok) return errorOf(opened);
      draft = await load(); emission = draft?.emission;
    }
    if (emission?.state === 'draft') {
      const prepared = await runtime.nfePreparationService.prepare({ context, draftId, idempotencyKey: stageKey('checkout-validate',input.idempotencyKey,draftId) });
      if (!prepared?.ok) return errorOf(prepared);
      draft = await load(); emission = draft?.emission;
    }
    if (emission?.state === 'prepared') {
      const numbered = await runtime.nfeNumberReservationService.reserve({ context, emissionId: emission.id, expectedVersion: Number(emission.version), idempotencyKey: stageKey('checkout-number',input.idempotencyKey,draftId) });
      if (!numbered?.ok) return { ...errorOf(numbered), draftId };
      draft = await load(); emission = draft?.emission;
    }
    if (!['number_reserved','signed'].includes(emission?.state)) return fail('AV-FISCAL-CHECKOUT-STATE','A nota não chegou à etapa de envio. Abra novamente esta mesma nota para continuar.');
    const sent = await runtime.nfeAutomaticIssuanceService.continue({ context, emissionId: emission.id, expectedVersion: Number(emission.version), idempotencyKey: stageKey('checkout-issue',input.idempotencyKey,emission.statusCode === '217' ? `${draftId}:${emission.version}` : draftId) });
    if (!sent?.ok) {
      const current = (await load())?.emission;
      if (!/^AV-NFE-SUBMISSION-DUPLICATE-(?:204|539)$/.test(sent.errors?.[0]?.code||'') && sent.pendingRecovery === true && current?.state === 'signed' && current.statusCode === '217') return {...fail('AV-NFE-NOT-RECEIVED','A SEFAZ não recebeu esta nota. O mesmo número foi preservado. Tente novamente nesta mesma nota.'),draftId,emission:publicEmission(current)};
      if (['authorized','artifacts_stored','danfe_ready'].includes(current?.state)) return { ok: true, draftId, emission: publicEmission(current), message: 'NF-e autorizada em homologação, sem valor fiscal.' };
      if (current?.state === 'rejected') return {...fail('AV-FISCAL-CHECKOUT-REJECTED',current.statusReason || 'A SEFAZ rejeitou a nota. Revise o retorno fiscal.'),draftId,emission:publicEmission(current)};
      return { ...errorOf(sent), draftId, ...(current ? {emission: publicEmission(current)} : {}) };
    }
    const result = sent.result;
    if (result?.emissionId !== emission.id || !['authorized','processing','rejected'].includes(result.state) || !Number.isSafeInteger(result.version) || result.version < 1 || !String(result.series || '').trim() || !Number.isSafeInteger(result.number) || result.number < 1 || result.transmitted !== true || result.submitted !== true || result.signed !== true || result.persisted !== true) return fail('AV-FISCAL-CHECKOUT-UNCONFIRMED','O envio não pôde ser confirmado. Tente novamente nesta mesma nota.');
    const refreshed = (await load())?.emission;
    const final = refreshed && Number(refreshed.version) >= result.version ? refreshed : result;
    if (final.state === 'rejected') return { ...fail('AV-FISCAL-CHECKOUT-REJECTED',final.statusReason || 'A SEFAZ rejeitou a nota. Revise os dados indicados.'), draftId, emission: publicEmission(final) };
    if (!['authorized','artifacts_stored','danfe_ready'].includes(final.state)) return {...fail('AV-NFE-SUBMISSION-UNCONFIRMED','A comunicação não confirmou a autorização. A tentativa foi preservada. Tente novamente nesta mesma nota.'),draftId,emission:publicEmission(final)};
    return { ok: true, draftId, emission: publicEmission(final), message: 'NF-e autorizada em homologação, sem valor fiscal.' };
  } catch { return fail('AV-FISCAL-CHECKOUT-UNAVAILABLE','Não foi possível confirmar a operação. Tente novamente nesta mesma nota.'); }
}

export async function handleFiscalCheckoutRequest({ request, runtime }) {
  const reply = (status, body) => Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  const companyId = new URL(request.url).searchParams.get('companyId') || '';
  if (request.method !== 'POST' || !UUID.test(companyId)) return reply(400,fail('AV-FISCAL-CHECKOUT-INPUT','Selecione o perfil empresarial.'));
  if (!runtime?.configured || !runtime.accessResolver || !runtime.fiscalDraftRepository) return reply(503,fail('AV-FISCAL-CHECKOUT-UNAVAILABLE','O serviço fiscal está indisponível.'));
  if (Number(request.headers.get('content-length') || 0) > 8000) return reply(413,fail('AV-FISCAL-CHECKOUT-SIZE','A solicitação ultrapassa o limite permitido.'));
  try {
    const access = await runtime.accessResolver.resolve(request,{companyId});
    if (!access?.authenticated) return reply(401,fail('AV-FISCAL-CHECKOUT-SESSION','Confirme novamente a sessão.'));
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 8000) return reply(413,fail('AV-FISCAL-CHECKOUT-SIZE','A solicitação ultrapassa o limite permitido.'));
    let input;try { input=JSON.parse(raw); } catch { return reply(400,fail('AV-FISCAL-CHECKOUT-INPUT','Revise os dados da solicitação.')); }
    const numbering=['numbering','save-numbering'].includes(input?.action);
    const permission=numbering?(input.action==='save-numbering'||access.effectivePermissions?.['fiscal.view']!==true?'fiscal.configure':'fiscal.view'):'fiscal.prepare';
    const decision = evaluateAccessDecision({boundary:access.boundary,effectivePermissions:access.effectivePermissions,permission});
    if (!decision.allowed || !decision.session.authenticated || decision.session.companyId !== companyId || decision.session.moduleId !== 'vendas') return reply(403,fail('AV-FISCAL-CHECKOUT-PERMISSION','Acesso fiscal não autorizado neste perfil.'));
    const context={companyId,actorId:decision.session.userId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:access.effectivePermissions};
    const result=numbering&&runtime.fiscalNumberingConfiguration?await runtime.fiscalNumberingConfiguration.run({context,input}):await runFiscalCheckout({runtime,context,input});
    if (result.emission?.emissionId && runtime.statusService) {
      try {
        const saved = await runtime.statusService.get({ boundary: access.boundary, effectivePermissions: access.effectivePermissions, emissionId: result.emission.emissionId });
        if (saved.ok) result.status = saved.emission;
      } catch { /* o resultado de emissão já registrado permanece válido */ }
    }
    return reply(result.ok?200:result.code?.includes('PERMISSION')?403:result.code?.includes('NOT-FOUND')?404:409,result);
  } catch { return reply(503,fail('AV-FISCAL-CHECKOUT-UNAVAILABLE','Não foi possível confirmar a operação. Tente novamente nesta mesma nota.')); }
}
