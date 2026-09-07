import { createHash, randomUUID } from 'node:crypto';

export const COMMERCIAL_SALES_ORDER_BILLING_REFERENCE = '2026-09-03';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,100}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const RETRYABLE = new Set(['40001', '40P01']);
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const digits = (value, max) => clean(value).replace(/\D/g, '').slice(0, max);
const issue = (code, field, message) => ({ code, field, message });
const coded = (code) => Object.assign(new Error(code), { code });

function validDate(value) {
  const match = DATE.exec(clean(value, 10));
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function accessError(context) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) {
    return issue('AV-COMMERCIAL-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  }
  if (context.moduleId && context.moduleId !== 'vendas') {
    return issue('AV-COMMERCIAL-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  }
  const required = ['sales.invoice', 'stock.exit', 'fiscal.prepare'];
  if (!context.active || !context.moduleActive || required.some((permission) => context.effectivePermissions?.[permission] !== true)) {
    return issue('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite faturar este pedido.');
  }
  return null;
}

function publicError(error) {
  const known = {
    'AV-SALES-BILLING-NOT-FOUND': ['order', 'Pedido não localizado nesta empresa.'],
    'AV-SALES-BILLING-CONFLICT': ['version', 'O pedido foi alterado por outra pessoa. Atualize os dados antes de faturar.'],
    'AV-SALES-BILLING-STATE': ['status', 'Conclua a separação antes de faturar o pedido.'],
    'AV-SALES-BILLING-RESERVATION': ['stock', 'A reserva do pedido está incompleta ou inconsistente.'],
    'AV-SALES-BILLING-BALANCE': ['stock', 'O saldo físico é insuficiente para faturar o pedido.'],
    'AV-SALES-BILLING-PAYMENT': ['payment', 'Revise as parcelas e o primeiro vencimento antes de faturar.'],
    'AV-SALES-BILLING-ITEMS': ['items', 'O pedido não possui itens válidos para faturamento.'],
    'AV-SALES-BILLING-IDEMPOTENCY': ['idempotencyKey', 'Esta solicitação já foi usada para outra ação. Atualize o pedido.'],
  }[error?.code];
  return known
    ? issue(error.code, known[0], known[1])
    : issue('AV-SALES-BILLING-STORAGE', 'storage', 'Não foi possível faturar o pedido. Tente novamente.');
}

function normalizeIssuer(input = {}) {
  const address = input.address && typeof input.address === 'object' ? input.address : input;
  const snapshot = {
    establishmentId: UUID.test(clean(input.establishmentId)) ? clean(input.establishmentId) : '',
    document: digits(input.document, 14),
    legalName: clean(input.legalName, 180),
    tradeName: clean(input.tradeName, 180),
    stateRegistration: clean(input.stateRegistration, 40),
    municipalRegistration: clean(input.municipalRegistration, 40),
    taxRegime: clean(input.taxRegime, 80),
    postalCode: digits(address.postalCode || address.cep, 8),
    street: clean(address.street || address.logradouro, 180),
    number: clean(address.number || address.numero, 30),
    complement: clean(address.complement || address.complemento, 100),
    district: clean(address.district || address.bairro, 100),
    city: clean(address.city || address.municipio, 100),
    cityCode: digits(address.cityCode || address.municipioIbge, 7),
    state: clean(address.state || address.uf, 2).toUpperCase(),
  };
  snapshot.ready = Boolean(snapshot.establishmentId && snapshot.document.length === 14
    && snapshot.legalName && snapshot.cityCode.length === 7 && snapshot.state.length === 2);
  return snapshot;
}

function cents(value) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(clean(value));
  if (!match) return null;
  const amount = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? amount : null;
}

function money(value) {
  return Number((value / 100).toFixed(2));
}

function addMonths(date, offset) {
  const [year, month, day] = date.split('-').map(Number);
  const monthIndex = month - 1 + offset;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

async function transaction(pool, work) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('set transaction isolation level serializable');
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (error) {
      try { await client.query('rollback'); } catch {}
      if (!RETRYABLE.has(error?.code) || attempt === 2) throw error;
    } finally {
      client.release();
    }
  }
}

async function alreadyDone(client, companyId, key, orderId) {
  const result = await client.query(`
    select recurso_id,evento,metadados from public.vendas_eventos
    where empresa_id=$1 and chave_idempotencia=$2
  `, [companyId, key]);
  if (!result.rows[0]) return null;
  if (result.rows[0].recurso_id !== orderId || result.rows[0].evento !== 'pedido_faturado') {
    throw coded('AV-SALES-BILLING-IDEMPOTENCY');
  }
  return { reused: true, event: result.rows[0].evento, ...result.rows[0].metadados };
}

async function loadOrder(client, companyId, orderId) {
  const result = await client.query(`
    select * from public.vendas_operacoes
    where empresa_id=$1 and id=$2 and tipo='pedido' and canal='vendas' for update
  `, [companyId, orderId]);
  return result.rows[0] || null;
}

async function loadItems(client, companyId, orderId) {
  const result = await client.query(`
    select * from public.vendas_operacao_itens
    where empresa_id=$1 and operacao_id=$2 order by posicao,id for update
  `, [companyId, orderId]);
  return result.rows;
}

async function activeReservations(client, companyId, orderId) {
  const result = await client.query(`
    select r.id,r.saldo_id,r.operacao_item_id,r.quantidade,
      s.saldo_fisico,s.saldo_reservado,s.permite_negativo
    from public.vendas_estoque_reservas r
    join public.vendas_estoque_saldos s on s.empresa_id=r.empresa_id and s.id=r.saldo_id
    where r.empresa_id=$1 and r.operacao_id=$2 and r.operacao_item_id is not null and r.situacao='ativa'
    order by r.id for update of r,s
  `, [companyId, orderId]);
  return result.rows;
}

export function createPostgresCommercialSalesOrderBillingRepository({ pool } = {}) {
  if (!pool?.connect) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async invoice({ companyId, actorId, orderId, expectedVersion, idempotencyKey, issuerSnapshot }) {
      return transaction(pool, async (client) => {
        const repeated = await alreadyDone(client, companyId, idempotencyKey, orderId);
        if (repeated) return repeated;
        const order = await loadOrder(client, companyId, orderId);
        if (!order) throw coded('AV-SALES-BILLING-NOT-FOUND');
        if (Number(order.versao) !== expectedVersion) throw coded('AV-SALES-BILLING-CONFLICT');
        if (order.situacao !== 'em_separacao' || !['em_separacao', 'sem_movimentacao'].includes(order.situacao_estoque)) {
          throw coded('AV-SALES-BILLING-STATE');
        }

        const items = await loadItems(client, companyId, orderId);
        if (!items.length) throw coded('AV-SALES-BILLING-ITEMS');
        const controlled = items.filter((item) => item.tipo_item === 'produto' && item.controla_estoque);
        const reservations = await activeReservations(client, companyId, orderId);
        const reservationByItem = new Map(reservations.map((reservation) => [reservation.operacao_item_id, reservation]));
        if (controlled.length !== reservations.length || controlled.some((item) => Number(reservationByItem.get(item.id)?.quantidade) !== Number(item.quantidade))) {
          throw coded('AV-SALES-BILLING-RESERVATION');
        }

        let stockConsumed = 0;
        for (const item of controlled) {
          const reservation = reservationByItem.get(item.id);
          const quantity = Number(item.quantidade);
          const physicalBefore = Number(reservation.saldo_fisico);
          const reservedBefore = Number(reservation.saldo_reservado);
          const physicalAfter = physicalBefore - quantity;
          const reservedAfter = reservedBefore - quantity;
          if (reservedAfter < 0 || (!reservation.permite_negativo && physicalAfter < 0)) {
            throw coded('AV-SALES-BILLING-BALANCE');
          }
          await client.query(`
            update public.vendas_estoque_saldos set saldo_fisico=$3,saldo_reservado=$4
            where empresa_id=$1 and id=$2
          `, [companyId, reservation.saldo_id, physicalAfter, reservedAfter]);
          await client.query(`
            update public.vendas_estoque_reservas set situacao='consumida',atualizado_em=now()
            where empresa_id=$1 and id=$2
          `, [companyId, reservation.id]);
          await client.query(`
            insert into public.vendas_estoque_movimentos(
              empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,
              saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,
              saldo_reservado_final,chave_idempotencia,criado_por
            ) values ($1,$2,$3,$4,'saida_venda',$5,$6,$7,$8,$9,$10,$11)
          `, [companyId, reservation.saldo_id, reservation.id, orderId, -quantity,
            physicalBefore, physicalAfter, reservedBefore, reservedAfter,
            `${idempotencyKey}:${item.id}:estoque`, actorId]);
          stockConsumed += quantity;
        }

        const payment = order.pagamento_retrato && typeof order.pagamento_retrato === 'object'
          ? order.pagamento_retrato : {};
        const installmentCount = Number.parseInt(payment.installments, 10);
        const firstDueDate = clean(payment.firstDueDate, 10);
        const totalCents = cents(order.total);
        if (!clean(payment.method, 40) || !Number.isInteger(installmentCount)
          || installmentCount < 1 || installmentCount > 120 || !validDate(firstDueDate)
          || !totalCents || totalCents < installmentCount) {
          throw coded('AV-SALES-BILLING-PAYMENT');
        }
        const baseCents = Math.floor(totalCents / installmentCount);
        const receivableIds = [];
        for (let index = 0; index < installmentCount; index += 1) {
          const amountCents = index === installmentCount - 1
            ? totalCents - baseCents * (installmentCount - 1) : baseCents;
          const amount = money(amountCents);
          const receivable = await client.query(`
            insert into public.vendas_contas_receber(
              empresa_id,operacao_id,cliente_id,parcela,total_parcelas,vencimento,
              valor_original,saldo_aberto,meio_pagamento,chave_idempotencia,criado_por,atualizado_por
            ) values ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$10) returning id
          `, [companyId, orderId, order.cliente_id, index + 1, installmentCount,
            addMonths(firstDueDate, index), amount, clean(payment.method, 40),
            `${idempotencyKey}:parcela:${index + 1}`, actorId]);
          const receivableId = receivable.rows[0].id;
          receivableIds.push(receivableId);
          await client.query(`
            insert into public.vendas_contas_receber_eventos(
              empresa_id,conta_receber_id,tipo,valor,meio_pagamento,descricao,
              chave_idempotencia,criado_por
            ) values ($1,$2,'geracao',$3,$4,$5,$6,$7)
          `, [companyId, receivableId, amount, clean(payment.method, 40),
            `Parcela ${index + 1}/${installmentCount} gerada pelo faturamento do pedido.`,
            `${idempotencyKey}:parcela:${index + 1}:evento`, actorId]);
        }

        const requestedDocument = clean(order.documento_fiscal_solicitado, 10).toLowerCase();
        const issuer = normalizeIssuer(issuerSnapshot);
        let fiscalDraftId = '';
        let fiscalDraftStatus = 'nao_aplicavel';
        if (requestedDocument !== 'nenhum') {
          fiscalDraftId = randomUUID();
          const fiscalItems = items.map((item) => ({
            position: Number(item.posicao), productId: item.produto_id || '', itemType: item.tipo_item,
            sku: item.sku || '', name: item.nome, description: item.descricao || '', unit: item.unidade,
            quantity: Number(item.quantidade), unitPrice: Number(item.preco_unitario),
            unitDiscount: Number(item.desconto_unitario), gross: Number(item.valor_bruto),
            discount: Number(item.valor_desconto), net: Number(item.valor_liquido),
            fiscal: item.fiscal_retrato || {}, fiscalReady: item.fiscal_pronto,
          }));
          const totals = {
            subtotalGross: Number(order.subtotal_bruto), itemDiscount: Number(order.desconto_itens),
            generalDiscount: Number(order.desconto_geral), freight: Number(order.frete),
            insurance: Number(order.seguro), otherExpenses: Number(order.outras_despesas),
            total: Number(order.total), currency: order.moeda,
          };
          fiscalDraftStatus = order.situacao_fiscal === 'pronto' && issuer.ready
            && items.every((item) => item.fiscal_pronto) ? 'pronto' : 'pendencia_cadastral';
          const content = stable({
            companyId, orderId, documentType: requestedDocument, issuer,
            customer: order.cliente_retrato || {}, items: fiscalItems, totals, payment,
          });
          const hash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
          await client.query(`
            insert into public.vendas_fiscal_rascunhos(
              id,empresa_id,operacao_id,origem_tipo,documento_tipo,situacao,
              emitente_retrato,destinatario_retrato,itens_retrato,totais_retrato,
              pagamento_retrato,conteudo_hash,chave_idempotencia,criado_por
            ) values ($1,$2,$3,'pedido',$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,
              $9::jsonb,$10::jsonb,$11,$12,$13)
          `, [fiscalDraftId, companyId, orderId, requestedDocument, fiscalDraftStatus,
            JSON.stringify(issuer), JSON.stringify(order.cliente_retrato || {}),
            JSON.stringify(fiscalItems), JSON.stringify(totals), JSON.stringify(payment),
            hash, `${idempotencyKey}:fiscal`, actorId]);
        }

        const updated = await client.query(`
          update public.vendas_operacoes
          set situacao='faturado',situacao_estoque=$3,situacao_fiscal=$4,
            faturado_em=now(),atualizado_por=$5
          where empresa_id=$1 and id=$2 returning versao
        `, [companyId, orderId, controlled.length ? 'baixado' : 'sem_movimentacao',
          fiscalDraftId ? 'rascunho_criado' : 'nao_aplicavel', actorId]);
        const metadata = {
          stockConsumed: Number(stockConsumed.toFixed(3)),
          receivableCount: receivableIds.length,
          receivableTotal: money(totalCents),
          fiscalDraftId,
          fiscalDraftStatus,
          operationVersion: Number(updated.rows[0].versao),
        };
        await client.query(`
          insert into public.vendas_eventos(
            empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,chave_idempotencia,criado_por
          ) values ($1,'operacao',$2,'pedido_faturado',$3,$4::jsonb,$5,$6)
        `, [companyId, orderId, 'Pedido faturado; estoque e parcelas registrados.',
          JSON.stringify(metadata), idempotencyKey, actorId]);
        return { reused: false, event: 'pedido_faturado', ...metadata };
      });
    },
  });
}

export function createCommercialSalesOrderBillingService({ repository, issuerResolver } = {}) {
  if (!repository?.invoice) throw new TypeError('Informe o repositório de faturamento do pedido.');
  if (typeof issuerResolver !== 'function') throw new TypeError('Informe o resolvedor server-side do emitente.');
  return Object.freeze({
    async invoice({ context, orderId, expectedVersion, idempotencyKey } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      if (!UUID.test(clean(orderId)) || !Number.isInteger(expectedVersion) || expectedVersion < 1
        || !KEY.test(clean(idempotencyKey))) {
        return { ok: false, errors: [issue('AV-SALES-BILLING-INPUT', 'order', 'Atualize o pedido antes de faturar.')] };
      }
      try {
        const issuerSnapshot = await issuerResolver({ companyId: context.companyId });
        const result = await repository.invoice({
          companyId: context.companyId,
          actorId: context.actorId,
          orderId,
          expectedVersion,
          idempotencyKey: clean(idempotencyKey),
          issuerSnapshot: issuerSnapshot || {},
        });
        return { ok: true, result, errors: [] };
      } catch (error) {
        return { ok: false, errors: [publicError(error)] };
      }
    },
  });
}
