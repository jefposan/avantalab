import {normalizeElectronicPayment} from './fiscal-payment.mjs';
import {normalizeFiscalNoteFields} from './fiscal-note-fields.mjs';
import { createHash } from 'node:crypto';
import { prepareOperation } from './commercial-operation-service.mjs';
import { normalizeIssuer } from './commercial-sales-order-billing.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const issue = (code, message) => ({ code, field: 'document', message });

export function createPostgresStandaloneFiscalRepository({ pool }) {
  return Object.freeze({
    async create({ id, companyId, actorId, issuer, customer, items, totals, payment, hash, key, expectedVersion=0 }) {
      const client=pool.connect?await pool.connect():pool;
      try{
      await client.query('begin');
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`fiscal-editable:${companyId}:${id}`]);
      const pending=(await client.query('select versao,concluido from public.vendas_fiscal_preenchimentos where empresa_id=$1 and id=$2 for update',[companyId,id])).rows[0];
      if(pending&&!pending.concluido&&Number(pending.versao)!==expectedVersion)throw Object.assign(new Error('Conflito'),{code:'FISCAL-CONFLICT'});
      // Finaliza o preenchimento na mesma transação do retrato fiscal imutável.
      const inserted = await client.query(`insert into public.vendas_fiscal_rascunhos(
        id,empresa_id,operacao_id,origem_tipo,documento_tipo,situacao,emitente_retrato,destinatario_retrato,
        itens_retrato,totais_retrato,pagamento_retrato,conteudo_hash,chave_idempotencia,criado_por
      ) values($1,$2,null,'avulsa','nfe','pronto',$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10)
        on conflict(empresa_id,chave_idempotencia) do nothing returning id`,
      [id, companyId, JSON.stringify(issuer), JSON.stringify(customer), JSON.stringify(items), JSON.stringify(totals), JSON.stringify(payment), hash, key, actorId]);
      if (inserted.rows[0]) { await client.query('update public.vendas_fiscal_preenchimentos set concluido=true,versao=versao+1,atualizado_em=now() where empresa_id=$1 and id=$2',[companyId,id]); await client.query('commit');return { draftId: id, originId: id, reused: false }; }
      const existing = (await client.query('select id,conteudo_hash from public.vendas_fiscal_rascunhos where empresa_id=$1 and chave_idempotencia=$2', [companyId, key])).rows[0];
      if (!existing || existing.id !== id || existing.conteudo_hash !== hash) throw Object.assign(new Error('Conflito de conteúdo fiscal.'), { code: 'FISCAL-CONFLICT' });
      await client.query('commit');return { draftId: existing.id, originId: existing.id, reused: true };
      }catch(error){await client.query('rollback');throw error;}finally{if(client!==pool)client.release();}
    },
  });
}

export function createStandaloneFiscalService({ repository, customerResolver, catalogResolver, issuerResolver, pendingRepository }) {
  return Object.freeze({
    async create({ context, input }) {
      if (!context?.active || !context.moduleActive || context.moduleId !== 'vendas' || !UUID.test(context.companyId || '') || !UUID.test(context.actorId || '') || context.effectivePermissions?.['fiscal.prepare'] !== true) {
        return { ok: false, errors: [issue('AV-FISCAL-STANDALONE-PERMISSION', 'Seu acesso não permite preparar notas fiscais.')] };
      }
      if (!UUID.test(input?.draftId || '') || (input?.fiscalDocument && input.fiscalDocument !== 'nfe')) return { ok: false, errors: [issue('AV-FISCAL-STANDALONE-INPUT', 'Revise os dados da NF-e avulsa.')] };
      const saveOnly=input.saveOnly===true;
      const form=normalizeFiscalNoteFields(input.fiscalForm);
      if(!form.valid&&(!saveOnly||!form.fields||Object.values(input.fiscalForm||{}).some(v=>typeof v!=='string'||v.length>2000)))return{ok:false,errors:form.errors.map(message=>issue('AV-FISCAL-FORM',message))};
      if(input.operationNature!==undefined&&(typeof input.operationNature!=='string'||(!saveOnly&&!input.operationNature.trim())||input.operationNature.length>60))return{ok:false,errors:[issue('AV-FISCAL-NATURE','Selecione uma natureza de operação válida.')]};
      if(input.additionalInfo!==undefined&&(typeof input.additionalInfo!=='string'||input.additionalInfo.length>5000))return{ok:false,errors:[issue('AV-FISCAL-NOTES','As observações da nota devem ter até 5000 caracteres.')]};
      try {
        const key = `fiscal-avulsa:${input.draftId}`;
        const prepared = await prepareOperation({ context, customerResolver, catalogResolver, allowIncompleteDraft:saveOnly,
          input: { ...input, type: 'pedido', channel: 'vendas', fiscalDocument: 'nfe', reserveStock: false, idempotencyKey: key } });
        if (prepared.errors.length) return { ok: false, errors: prepared.errors, warnings: prepared.warnings };
        const op = prepared.operation;
        const issuer = normalizeIssuer(await issuerResolver({ companyId: context.companyId }) || {});
        if (!saveOnly && (!issuer.ready || op.fiscalStatus !== 'pronto' || op.items.some(item => !item.fiscalReady || item.itemType !== 'produto'))) return { ok: false, errors: [issue('AV-FISCAL-STANDALONE-REGISTRATION', 'Revise o cadastro fiscal da empresa, do cliente e dos produtos antes de preparar a NF-e.')] };
        const items = op.items.map((item, index) => ({ position: index + 1, productId: item.productId, itemType: item.itemType,
          sku: item.sku, name: item.name, description: item.description, unit: item.unit, quantity: item.quantity,
          unitPrice: item.unitPrice, unitDiscount: item.discountUnit, gross: item.gross, discount: item.discount, net: item.net,
          fiscal: item.fiscalSnapshot, fiscalReady: item.fiscalReady }));
        const totals = { subtotalGross: op.subtotalGross, itemDiscount: op.itemDiscount, generalDiscount: op.generalDiscount,
          freight: op.freight, insurance: op.insurance, otherExpenses: op.otherExpenses, total: op.total, currency: 'BRL',
          additionalInfo: String(input.additionalInfo || '').trim(),...(input.operationNature?{operationNature:input.operationNature}:{}),...(form.fields?{fiscalForm:form.fields}:{}) };
        if(!saveOnly&&form.fields){const method=String(input.payment?.method||'');const electronic=['PIX dinâmico','Cartão de crédito','Cartão de débito'].includes(method);if(!['PIX estático','PIX dinâmico','Dinheiro','Boleto','Transferência bancária','Cartão de crédito','Cartão de débito','Sem pagamento'].includes(method))return{ok:false,errors:[issue('AV-FISCAL-PAYMENT','Selecione o meio real de pagamento.') ]};if(electronic){const payment=normalizeElectronicPayment(method,input.payment?.details);if(payment.error)return{ok:false,errors:[{code:'AV-FISCAL-PAYMENT',...payment.error}]};op.paymentSnapshot.details=payment.details;}op.paymentSnapshot.method=method;}
        const content = { companyId: context.companyId, orderId: input.draftId, documentType: 'nfe', issuer, customer: op.customerSnapshot, items, totals, payment: op.paymentSnapshot };
        const hash = createHash('sha256').update(JSON.stringify(stable(content))).digest('hex');
        if(saveOnly){
          if(input.payment?.details!==undefined&&(!input.payment.details||typeof input.payment.details!=='object'||Array.isArray(input.payment.details)||Object.keys(input.payment.details).some(k=>!['integrationType','institutionDocument','authorizationCode'].includes(k))||Object.values(input.payment.details).some(v=>typeof v!=='string'||v.length>128)))return {ok:false,errors:[issue('AV-FISCAL-DRAFT-PAYMENT','Revise os dados de pagamento do rascunho.')]};
          if(!pendingRepository)return {ok:false,errors:[issue('AV-FISCAL-DRAFT-UNAVAILABLE','O salvamento de rascunhos ainda não está disponível.')]};
          const snapshot={client:op.customerSnapshot.displayName||op.customerSnapshot.legalName||'',clientDocument:op.customerSnapshot.document||'',clientCity:op.customerSnapshot.address?.city||'',total:op.total,items,totals,paymentMethod:String(input.payment?.method||''),paymentDetails:input.payment?.details,paymentInstallments:op.paymentSnapshot.installments,paymentFirstDueDate:op.paymentSnapshot.firstDueDate,issuer};
          if(JSON.stringify(snapshot).length>128000)return {ok:false,errors:[issue('AV-FISCAL-DRAFT-SIZE','O rascunho excede o limite permitido.')]};
          const document=await pendingRepository.save({id:input.draftId,companyId:context.companyId,actorId:context.actorId,expectedVersion:Number(input.expectedVersion)||0,snapshot,hash:createHash('sha256').update(JSON.stringify(stable(snapshot))).digest('hex')});return {ok:true,document,errors:[]};
        }
        const document = await repository.create({expectedVersion:Number(input.expectedVersion)||0, id: input.draftId, companyId: context.companyId, actorId: context.actorId,
          issuer, customer: op.customerSnapshot, items, totals, payment: op.paymentSnapshot, hash, key });
        return { ok: true, document, errors: [] };
      } catch (error) {
        return { ok: false, errors: [issue(error.code === 'FISCAL-CONFLICT' ? 'AV-FISCAL-STANDALONE-CONFLICT' : 'AV-FISCAL-STANDALONE-STORAGE', error.code === 'FISCAL-CONFLICT' ? 'Esta solicitação já foi salva com outro conteúdo. Reabra a criação da nota.' : 'Não foi possível salvar a nota avulsa. Seus dados continuam no formulário.')] };
      }
    },
  });
}
