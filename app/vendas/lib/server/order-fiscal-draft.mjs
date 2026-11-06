import { createHash, randomUUID } from 'node:crypto';
import { createStandaloneFiscalService } from './standalone-fiscal.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const failure = message => { throw Object.assign(new Error(message), { publicMessage: message }); };

/** Serializa com o pedido, mas escreve somente o retrato fiscal. */
export function createPostgresOrderFiscalDraftRepository({ pool }) {
  return {
    async createFromOrder({ companyId, actorId, orderId, expectedVersion, build }) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const order = (await client.query(`select * from public.vendas_operacoes
          where empresa_id=$1 and id=$2 and tipo='pedido' and canal='vendas' for update`, [companyId, orderId])).rows[0];
        if (!order) failure('Pedido não localizado neste perfil.');
        if (!['confirmado', 'em_separacao', 'faturado'].includes(order.situacao)) failure('Confirme o pedido antes de preparar sua nota fiscal.');
        const existing = (await client.query(`select r.id from public.vendas_fiscal_rascunhos r
          where r.empresa_id=$1 and r.operacao_id=$2 and r.documento_tipo='nfe'
          and not exists(select 1 from public.vendas_fiscal_rascunho_cancelamentos c where c.empresa_id=r.empresa_id and c.rascunho_id=r.id)
          and not exists(select 1 from fiscal_private.draft_deletions deleted where deleted.company_id=r.empresa_id and deleted.draft_id=r.id)
          order by r.criado_em desc limit 2`, [companyId, orderId])).rows;
        if (existing.length > 1) failure('Há mais de um rascunho fiscal vinculado. Revise as notas antes de continuar.');
        if (existing[0]) { await client.query('commit'); return { draftId: existing[0].id, originId: orderId, reused: true }; }
        if (Number(order.versao) !== expectedVersion) failure('O pedido foi alterado. Atualize-o antes de preparar a nota.');
        if (order.documento_fiscal_solicitado !== 'nfe') failure('Este pedido não está configurado para NF-e.');
        const items = (await client.query(`select * from public.vendas_operacao_itens
          where empresa_id=$1 and operacao_id=$2 order by posicao,id`, [companyId, orderId])).rows;
        if (!items.length) failure('O pedido não possui produtos para a nota fiscal.');
        const document = await build(order, items);
        const totals = { ...document.totals, independentIssuance: true };
        if (Math.round(Number(totals.total) * 100) !== Math.round(Number(order.total) * 100)) failure('Os valores fiscais não correspondem ao pedido. Revise o pedido antes de continuar.');
        const content = { companyId, orderId, documentType: 'nfe', issuer: document.issuer, customer: document.customer, items: document.items, totals, payment: document.payment };
        const hash = createHash('sha256').update(JSON.stringify(stable(content))).digest('hex');
        const id = randomUUID();
        await client.query(`insert into public.vendas_fiscal_rascunhos(
          id,empresa_id,operacao_id,origem_tipo,documento_tipo,situacao,emitente_retrato,destinatario_retrato,
          itens_retrato,totais_retrato,pagamento_retrato,conteudo_hash,chave_idempotencia,criado_por
        ) values($1,$2,$3,'pedido','nfe','pronto',$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11)`,
        [id, companyId, orderId, JSON.stringify(document.issuer), JSON.stringify(document.customer), JSON.stringify(document.items), JSON.stringify(totals), JSON.stringify(document.payment), hash, `pedido-fiscal:${orderId}:${id}`, actorId]);
        await client.query('commit');
        return { draftId: id, originId: orderId, reused: false };
      } catch (error) { await client.query('rollback').catch(() => {}); throw error; }
      finally { client.release(); }
    },
  };
}

export function createOrderFiscalDraftService({ repository, customerResolver, catalogResolver, issuerResolver }) {
  return {
    async create({ context, input }) {
      const permissions = context?.effectivePermissions || {};
      if (!context?.active || !context.moduleActive || context.moduleId !== 'vendas' || !UUID.test(context.companyId || '') || !UUID.test(context.actorId || '') || permissions['fiscal.prepare'] !== true || permissions['sales.view'] !== true) return { ok: false, errors: [{ code: 'AV-FISCAL-ORDER-PERMISSION', field: 'order', message: 'Seu acesso não permite preparar a nota deste pedido.' }] };
      if (!UUID.test(input?.originOrderId || '') || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) return { ok: false, errors: [{ code: 'AV-FISCAL-ORDER-INPUT', field: 'order', message: 'Atualize o vínculo do pedido antes de emitir.' }] };
      try {
        const document = await repository.createFromOrder({ companyId: context.companyId, actorId: context.actorId, orderId: input.originOrderId, expectedVersion: input.expectedVersion,
          build: async (order, items) => {
            let snapshot;
            const builder = createStandaloneFiscalService({ customerResolver, catalogResolver, issuerResolver, repository: { create: async value => { snapshot = value; return {}; } } });
            const prepared = await builder.create({ context, input: {
              draftId: randomUUID(), fiscalDocument: 'nfe', customerId: order.cliente_id, priceTableId: order.tabela_preco_id || '',
              generalDiscount: Number(order.desconto_geral), freight: Number(order.frete), insurance: Number(order.seguro), otherExpenses: Number(order.outras_despesas),
              payment: order.pagamento_retrato || {},
              additionalInfo: order.observacoes_cliente || '',
              items: items.map(item => ({ catalogItemId: item.produto_id, quantity: Number(item.quantidade), unitPrice: Number(item.preco_unitario), discountUnit: Number(item.desconto_unitario) })),
            } });
            if (!prepared.ok || !snapshot) failure(prepared.errors?.[0]?.message || 'Revise os dados fiscais do pedido.');
            snapshot.items = snapshot.items.map((item, index) => ({ ...item, name: items[index].nome, description: items[index].descricao || '', sku: items[index].sku || '', unit: items[index].unidade }));
            return snapshot;
          },
        });
        return { ok: true, document, errors: [] };
      } catch (error) { return { ok: false, errors: [{ code: 'AV-FISCAL-ORDER-PREPARATION', field: 'order', message: error.publicMessage || 'Não foi possível preparar a nota do pedido. Atualize e tente novamente.' }] }; }
    },
  };
}
