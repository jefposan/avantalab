export const COMMERCIAL_SALES_ORDER_LIFECYCLE_REFERENCE = '2026-09-03';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,100}$/;
const RETRYABLE = new Set(['40001', '40P01']);
const clean = (value) => String(value ?? '').trim();
const issue = (code, field, message) => ({ code, field, message });
const coded = (code) => Object.assign(new Error(code), { code });

function accessError(context, permissions) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) {
    return issue('AV-COMMERCIAL-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  }
  if (context.moduleId && context.moduleId !== 'vendas') {
    return issue('AV-COMMERCIAL-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  }
  if (!context.active || !context.moduleActive || permissions.some((permission) => context.effectivePermissions?.[permission] !== true)) {
    return issue('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite avançar este pedido.');
  }
  return null;
}

function publicError(error) {
  const known = {
    'AV-SALES-ORDER-NOT-FOUND': ['order', 'Pedido não localizado nesta empresa.'],
    'AV-SALES-ORDER-CONFLICT': ['version', 'O pedido foi alterado por outra pessoa. Atualize os dados antes de continuar.'],
    'AV-SALES-ORDER-STATE': ['status', 'O pedido não está na etapa correta para esta ação.'],
    'AV-SALES-ORDER-CUSTOMER': ['customer', 'O cliente do pedido não está disponível para confirmação.'],
    'AV-SALES-ORDER-PAYMENT': ['payment', 'Defina a forma de pagamento antes de confirmar o pedido.'],
    'AV-SALES-ORDER-ITEMS': ['items', 'O pedido não possui itens válidos para confirmação.'],
    'AV-SALES-ORDER-LOCATION': ['stock', 'Selecione um local de estoque ativo para reservar os produtos.'],
    'AV-SALES-ORDER-BALANCE': ['stock', 'O estoque disponível é insuficiente para confirmar o pedido.'],
    'AV-SALES-ORDER-RESERVATION': ['stock', 'A reserva do pedido está incompleta ou inconsistente.'],
    'AV-SALES-ORDER-RECEIVED': ['receivables', 'Existem valores recebidos. Estorne os recebimentos antes de registrar a devolução.'],
    'AV-SALES-ORDER-FISCAL': ['fiscal', 'O documento fiscal já entrou no ciclo de emissão. Cancele-o pela Central Fiscal antes da devolução.'],
    'AV-SALES-ORDER-IDEMPOTENCY': ['idempotencyKey', 'Esta solicitação já foi usada para outra ação. Atualize o pedido.'],
  }[error?.code];
  return known
    ? issue(error.code, known[0], known[1])
    : issue('AV-SALES-ORDER-STORAGE', 'storage', 'Não foi possível avançar o pedido. Tente novamente.');
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

async function loadOrder(client, companyId, orderId) {
  const result = await client.query(`
    select id,situacao,situacao_estoque,versao,cliente_id,pagamento_retrato,total
    from public.vendas_operacoes
    where empresa_id=$1 and id=$2 and tipo='pedido' and canal='vendas'
    for update
  `, [companyId, orderId]);
  return result.rows[0] || null;
}

async function alreadyDone(client, companyId, key, orderId, expectedEvent) {
  const result = await client.query(`
    select recurso_id,evento,metadados
    from public.vendas_eventos
    where empresa_id=$1 and chave_idempotencia=$2
  `, [companyId, key]);
  if (!result.rows[0]) return null;
  if (result.rows[0].recurso_id !== orderId || result.rows[0].evento !== expectedEvent) {
    throw coded('AV-SALES-ORDER-IDEMPOTENCY');
  }
  return { reused: true, event: result.rows[0].evento, ...result.rows[0].metadados };
}

async function recordEvent(client, { companyId, orderId, actorId, key, name, summary, metadata }) {
  await client.query(`
    insert into public.vendas_eventos(
      empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,chave_idempotencia,criado_por
    ) values ($1,'operacao',$2,$3,$4,$5::jsonb,$6,$7)
  `, [companyId, orderId, name, summary, JSON.stringify(metadata), key, actorId]);
}

async function controlledItems(client, companyId, orderId) {
  const result = await client.query(`
    select id,produto_id,sku,nome,quantidade
    from public.vendas_operacao_itens
    where empresa_id=$1 and operacao_id=$2 and tipo_item='produto' and controla_estoque
    order by id for update
  `, [companyId, orderId]);
  return result.rows;
}

async function activeReservations(client, companyId, orderId) {
  const result = await client.query(`
    select r.id,r.saldo_id,r.operacao_item_id,r.quantidade,i.quantidade as item_quantidade,
      s.saldo_fisico,s.saldo_reservado,s.permite_negativo
    from public.vendas_estoque_reservas r
    join public.vendas_operacao_itens i
      on i.empresa_id=r.empresa_id and i.operacao_id=r.operacao_id and i.id=r.operacao_item_id
    join public.vendas_estoque_saldos s on s.empresa_id=r.empresa_id and s.id=r.saldo_id
    where r.empresa_id=$1 and r.operacao_id=$2 and r.operacao_item_id is not null and r.situacao='ativa'
    order by r.id for update of r,s
  `, [companyId, orderId]);
  return result.rows;
}

export function createPostgresCommercialSalesOrderLifecycleRepository({ pool } = {}) {
  if (!pool?.connect) throw new TypeError('Informe o pool PostgreSQL server-side.');

  return Object.freeze({
    async confirm({ companyId, actorId, orderId, localId, expectedVersion, idempotencyKey }) {
      return transaction(pool, async (client) => {
        const repeated = await alreadyDone(client, companyId, idempotencyKey, orderId, 'pedido_confirmado');
        if (repeated) return repeated;
        const order = await loadOrder(client, companyId, orderId);
        if (!order) throw coded('AV-SALES-ORDER-NOT-FOUND');
        if (Number(order.versao) !== expectedVersion) throw coded('AV-SALES-ORDER-CONFLICT');
        if (order.situacao !== 'salvo' || order.situacao_estoque !== 'sem_movimentacao') throw coded('AV-SALES-ORDER-STATE');
        if (!(Number(order.total) > 0)) throw coded('AV-SALES-ORDER-ITEMS');
        if (!clean(order.pagamento_retrato?.method)) throw coded('AV-SALES-ORDER-PAYMENT');
        const customer = await client.query(`
          select id from public.vendas_clientes
          where empresa_id=$1 and id=$2 and situacao<>'inativo' for update
        `, [companyId, order.cliente_id]);
        if (!customer.rows[0]) throw coded('AV-SALES-ORDER-CUSTOMER');

        const items = await controlledItems(client, companyId, orderId);
        if (!(await client.query('select 1 from public.vendas_operacao_itens where empresa_id=$1 and operacao_id=$2 limit 1', [companyId, orderId])).rows[0]) {
          throw coded('AV-SALES-ORDER-ITEMS');
        }
        if (items.length) {
          const local = await client.query(`
            select id from public.vendas_estoque_locais
            where empresa_id=$1 and id=$2 and ativo for update
          `, [companyId, localId]);
          if (!local.rows[0]) throw coded('AV-SALES-ORDER-LOCATION');
        }

        let reserved = 0;
        for (const item of items) {
          const balanceResult = await client.query(`
            select * from public.vendas_estoque_saldos
            where empresa_id=$1 and local_id=$2 and produto_id=$3 for update
          `, [companyId, localId, item.produto_id]);
          const balance = balanceResult.rows[0];
          const quantity = Number(item.quantidade);
          if (!balance || (!balance.permite_negativo && Number(balance.saldo_fisico) - Number(balance.saldo_reservado) < quantity)) {
            throw coded('AV-SALES-ORDER-BALANCE');
          }
          const before = Number(balance.saldo_reservado);
          const after = before + quantity;
          await client.query(`
            update public.vendas_estoque_saldos set saldo_reservado=$3
            where empresa_id=$1 and id=$2
          `, [companyId, balance.id, after]);
          const reservation = await client.query(`
            insert into public.vendas_estoque_reservas(
              empresa_id,saldo_id,operacao_id,operacao_item_id,quantidade,chave_idempotencia,criado_por
            ) values ($1,$2,$3,$4,$5,$6,$7) returning id
          `, [companyId, balance.id, orderId, item.id, quantity, `${idempotencyKey}:${item.id}`, actorId]);
          await client.query(`
            insert into public.vendas_estoque_movimentos(
              empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,
              saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,
              saldo_reservado_final,chave_idempotencia,criado_por
            ) values ($1,$2,$3,$4,'reserva',$5,$6,$6,$7,$8,$9,$10)
          `, [companyId, balance.id, reservation.rows[0].id, orderId, quantity,
            Number(balance.saldo_fisico), before, after, `${idempotencyKey}:${item.id}:mov`, actorId]);
          reserved += quantity;
        }

        const stockStatus = items.length ? 'reservado' : 'sem_movimentacao';
        const updated = await client.query(`
          update public.vendas_operacoes
          set situacao='confirmado',situacao_estoque=$3,confirmado_em=now(),atualizado_por=$4
          where empresa_id=$1 and id=$2 returning versao
        `, [companyId, orderId, stockStatus, actorId]);
        const metadata = {
          reserved: Number(reserved.toFixed(3)),
          reservationCount: items.length,
          localId: items.length ? localId : '',
          operationVersion: Number(updated.rows[0].versao),
        };
        await recordEvent(client, {
          companyId, orderId, actorId, key: idempotencyKey, name: 'pedido_confirmado',
          summary: 'Pedido confirmado e estoque reservado.', metadata,
        });
        return { reused: false, event: 'pedido_confirmado', ...metadata };
      });
    },

    async startSeparation({ companyId, actorId, orderId, expectedVersion, idempotencyKey }) {
      return transaction(pool, async (client) => {
        const repeated = await alreadyDone(client, companyId, idempotencyKey, orderId, 'separacao_iniciada');
        if (repeated) return repeated;
        const order = await loadOrder(client, companyId, orderId);
        if (!order) throw coded('AV-SALES-ORDER-NOT-FOUND');
        if (Number(order.versao) !== expectedVersion) throw coded('AV-SALES-ORDER-CONFLICT');
        if (order.situacao !== 'confirmado' || !['reservado', 'sem_movimentacao'].includes(order.situacao_estoque)) {
          throw coded('AV-SALES-ORDER-STATE');
        }
        const items = await controlledItems(client, companyId, orderId);
        const reservations = await activeReservations(client, companyId, orderId);
        if (items.length !== reservations.length || reservations.some((reservation) => Number(reservation.quantidade) !== Number(reservation.item_quantidade))) {
          throw coded('AV-SALES-ORDER-RESERVATION');
        }
        const stockStatus = items.length ? 'em_separacao' : 'sem_movimentacao';
        const updated = await client.query(`
          update public.vendas_operacoes
          set situacao='em_separacao',situacao_estoque=$3,atualizado_por=$4
          where empresa_id=$1 and id=$2 returning versao
        `, [companyId, orderId, stockStatus, actorId]);
        const metadata = {
          reservationCount: reservations.length,
          operationVersion: Number(updated.rows[0].versao),
        };
        await recordEvent(client, {
          companyId, orderId, actorId, key: idempotencyKey, name: 'separacao_iniciada',
          summary: 'Separação do pedido iniciada.', metadata,
        });
        return { reused: false, event: 'separacao_iniciada', ...metadata };
      });
    },

    async cancel({ companyId, actorId, orderId, expectedVersion, idempotencyKey }) {
      return transaction(pool, async (client) => {
        const repeated = await alreadyDone(client, companyId, idempotencyKey, orderId, 'pedido_cancelado');
        if (repeated) return repeated;
        const order = await loadOrder(client, companyId, orderId);
        if (!order) throw coded('AV-SALES-ORDER-NOT-FOUND');
        if (Number(order.versao) !== expectedVersion) throw coded('AV-SALES-ORDER-CONFLICT');
        if (!['salvo', 'confirmado', 'em_separacao'].includes(order.situacao)) throw coded('AV-SALES-ORDER-STATE');
        const reservations = await activeReservations(client, companyId, orderId);
        if (['reservado', 'em_separacao'].includes(order.situacao_estoque) && !reservations.length) {
          throw coded('AV-SALES-ORDER-RESERVATION');
        }

        let released = 0;
        for (const reservation of reservations) {
          const quantity = Number(reservation.quantidade);
          const before = Number(reservation.saldo_reservado);
          const after = before - quantity;
          if (after < 0) throw coded('AV-SALES-ORDER-RESERVATION');
          await client.query(`
            update public.vendas_estoque_saldos set saldo_reservado=$3
            where empresa_id=$1 and id=$2
          `, [companyId, reservation.saldo_id, after]);
          await client.query(`
            update public.vendas_estoque_reservas set situacao='liberada',atualizado_em=now()
            where empresa_id=$1 and id=$2
          `, [companyId, reservation.id]);
          await client.query(`
            insert into public.vendas_estoque_movimentos(
              empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,
              saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,
              saldo_reservado_final,chave_idempotencia,criado_por
            ) values ($1,$2,$3,$4,'liberacao',$5,$6,$6,$7,$8,$9,$10)
          `, [companyId, reservation.saldo_id, reservation.id, orderId, -quantity,
            Number(reservation.saldo_fisico), before, after,
            `${idempotencyKey}:${reservation.operacao_item_id}`, actorId]);
          released += quantity;
        }

        const updated = await client.query(`
          update public.vendas_operacoes
          set situacao='cancelado',situacao_estoque=$3,cancelado_em=now(),atualizado_por=$4
          where empresa_id=$1 and id=$2 returning versao
        `, [companyId, orderId, reservations.length ? 'liberado' : 'sem_movimentacao', actorId]);
        const metadata = {
          released: Number(released.toFixed(3)),
          operationVersion: Number(updated.rows[0].versao),
        };
        await recordEvent(client, {
          companyId, orderId, actorId, key: idempotencyKey, name: 'pedido_cancelado',
          summary: reservations.length ? 'Pedido cancelado e reserva liberada.' : 'Pedido cancelado.', metadata,
        });
        return { reused: false, event: 'pedido_cancelado', ...metadata };
      });
    },

    async returnInvoiced({ companyId, actorId, orderId, expectedVersion, idempotencyKey }) {
      return transaction(pool, async (client) => {
        const repeated = await alreadyDone(client, companyId, idempotencyKey, orderId, 'pedido_devolvido');
        if (repeated) return repeated;
        const order = await loadOrder(client, companyId, orderId);
        if (!order) throw coded('AV-SALES-ORDER-NOT-FOUND');
        if (Number(order.versao) !== expectedVersion) throw coded('AV-SALES-ORDER-CONFLICT');
        if (order.situacao !== 'faturado') throw coded('AV-SALES-ORDER-STATE');

        const fiscal = await client.query(`
          select r.id,e.state
          from public.vendas_fiscal_rascunhos r
          left join fiscal_private.emissions e
            on e.company_id=r.empresa_id and e.draft_id=r.id::text
              and e.origin_id=r.operacao_id::text
          where r.empresa_id=$1 and r.operacao_id=$2
        `, [companyId, orderId]);
        if (fiscal.rows.some((row) => row.state && row.state !== 'canceled')) throw coded('AV-SALES-ORDER-FISCAL');

        const receivables = (await client.query('select * from public.vendas_contas_receber where empresa_id=$1 and operacao_id=$2 for update', [companyId, orderId])).rows;
        if (receivables.some((row) => Number(row.valor_recebido) - Number(row.valor_estornado) > 0.001)) throw coded('AV-SALES-ORDER-RECEIVED');

        const controlled = await controlledItems(client, companyId, orderId);
        const reservations = (await client.query(`
          select r.id,r.saldo_id,r.operacao_item_id,r.quantidade,s.saldo_fisico,s.saldo_reservado
          from public.vendas_estoque_reservas r
          join public.vendas_estoque_saldos s on s.empresa_id=r.empresa_id and s.id=r.saldo_id
          where r.empresa_id=$1 and r.operacao_id=$2 and r.operacao_item_id is not null
            and r.situacao='consumida'
          order by r.id for update of r,s
        `, [companyId, orderId])).rows;
        if (controlled.length !== reservations.length) throw coded('AV-SALES-ORDER-RESERVATION');
        let returned = 0;
        for (const reservation of reservations) {
          const quantity = Number(reservation.quantidade); const before = Number(reservation.saldo_fisico); const after = before + quantity;
          await client.query('update public.vendas_estoque_saldos set saldo_fisico=$3 where empresa_id=$1 and id=$2', [companyId, reservation.saldo_id, after]);
          await client.query("update public.vendas_estoque_reservas set situacao='devolvida',atualizado_em=now() where empresa_id=$1 and id=$2", [companyId, reservation.id]);
          await client.query(`insert into public.vendas_estoque_movimentos(
            empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,
            saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,
            saldo_reservado_final,chave_idempotencia,criado_por
          ) values($1,$2,$3,$4,'devolucao',$5,$6,$7,$8,$8,$9,$10)`,
          [companyId, reservation.saldo_id, reservation.id, orderId, quantity, before, after,
            Number(reservation.saldo_reservado), `${idempotencyKey}:${reservation.operacao_item_id}:estoque`, actorId]);
          returned += quantity;
        }

        for (const receivable of receivables) {
          if (receivable.situacao === 'cancelado') continue;
          await client.query("update public.vendas_contas_receber set situacao='cancelado',atualizado_por=$3 where empresa_id=$1 and id=$2", [companyId, receivable.id, actorId]);
          await client.query(`insert into public.vendas_contas_receber_eventos(
            empresa_id,conta_receber_id,tipo,valor,meio_pagamento,descricao,chave_idempotencia,criado_por
          ) values($1,$2,'cancelamento',0,$3,$4,$5,$6)`, [companyId, receivable.id,
            receivable.meio_pagamento, 'Parcela cancelada pela devolução total do pedido.',
            `${idempotencyKey}:parcela:${receivable.parcela}`, actorId]);
        }
        if (fiscal.rows[0]) await client.query(`insert into public.vendas_fiscal_rascunho_cancelamentos(
          empresa_id,rascunho_id,operacao_id,motivo,chave_idempotencia,criado_por
        ) values($1,$2,$3,$4,$5,$6) on conflict (empresa_id,rascunho_id) do nothing`, [companyId,
          fiscal.rows[0].id, orderId, 'Rascunho encerrado pela devolução total do pedido.', `${idempotencyKey}:fiscal`, actorId]);

        const updated = await client.query(`update public.vendas_operacoes
          set situacao='devolvido',situacao_estoque=$3,situacao_fiscal=$4,atualizado_por=$5
          where empresa_id=$1 and id=$2 returning versao`, [companyId, orderId,
          controlled.length ? 'devolvido' : 'sem_movimentacao', fiscal.rows[0] ? 'cancelado' : 'nao_aplicavel', actorId]);
        const metadata = { returned: Number(returned.toFixed(3)), canceledReceivables: receivables.length,
          fiscalDraftCanceled: Boolean(fiscal.rows[0]), operationVersion: Number(updated.rows[0].versao) };
        await recordEvent(client, { companyId, orderId, actorId, key: idempotencyKey,
          name: 'pedido_devolvido', summary: 'Devolução total registrada; estoque, parcelas e rascunho fiscal estornados.', metadata });
        return { reused: false, event: 'pedido_devolvido', ...metadata };
      });
    },
  });
}

export function createCommercialSalesOrderLifecycleService({ repository } = {}) {
  if (!repository?.confirm || !repository?.startSeparation || !repository?.cancel || !repository?.returnInvoiced) {
    throw new TypeError('Informe o repositório do ciclo do pedido.');
  }
  const run = (method, permissions) => async ({ context, orderId, localId, expectedVersion, idempotencyKey } = {}) => {
    const denied = accessError(context, permissions);
    if (denied) return { ok: false, errors: [denied] };
    if (!UUID.test(clean(orderId))
      || (localId !== undefined && localId !== '' && !UUID.test(clean(localId)))
      || !Number.isInteger(expectedVersion) || expectedVersion < 1
      || !KEY.test(clean(idempotencyKey))) {
      return { ok: false, errors: [issue('AV-SALES-ORDER-INPUT', 'order', 'Atualize o pedido e confira os dados da operação.')] };
    }
    try {
      const result = await repository[method]({
        companyId: context.companyId,
        actorId: context.actorId,
        orderId,
        localId: localId || undefined,
        expectedVersion,
        idempotencyKey: clean(idempotencyKey),
      });
      return { ok: true, result, errors: [] };
    } catch (error) {
      return { ok: false, errors: [publicError(error)] };
    }
  };
  return Object.freeze({
    confirm: run('confirm', ['sales.edit', 'stock.exit']),
    startSeparation: run('startSeparation', ['sales.edit', 'stock.exit']),
    cancel: run('cancel', ['sales.cancel', 'stock.exit']),
    returnInvoiced: run('returnInvoiced', ['sales.cancel', 'stock.adjust', 'receivables.refund', 'fiscal.cancel']),
  });
}
