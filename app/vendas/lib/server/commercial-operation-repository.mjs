import { createHash } from 'node:crypto';

export const COMMERCIAL_OPERATION_REPOSITORY_REFERENCE = '2026-09-03';
const RETRYABLE_TRANSACTION_CODES = new Set(['40001', '40P01']);

function assertPool(pool) {
  if (!pool || (typeof pool.connect !== 'function' && typeof pool.query !== 'function')) throw new TypeError('Informe um pool PostgreSQL disponível somente no servidor.');
}

function text(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function digits(value) {
  return text(value).replace(/\D/g, '');
}

function nullable(value) {
  return text(value) || null;
}

function mapItem(row) {
  return {
    id: row.id, companyId: row.empresa_id, operationId: row.operacao_id,
    position: Number(row.posicao), productId: row.produto_id || '', itemType: row.tipo_item,
    sku: row.sku || '', name: row.nome, description: row.descricao || '', unit: row.unidade,
    quantity: Number(row.quantidade), unitPrice: Number(row.preco_unitario),
    discountUnit: Number(row.desconto_unitario), gross: Number(row.valor_bruto),
    discount: Number(row.valor_desconto), net: Number(row.valor_liquido),
    costUnitSnapshot: row.custo_unitario_retrato === null ? null : Number(row.custo_unitario_retrato),
    fiscalSnapshot: row.fiscal_retrato || {}, fiscalReady: row.fiscal_pronto,
    controlsStock: row.controla_estoque, createdAt: text(row.criado_em), updatedAt: text(row.atualizado_em),
  };
}

function mapOperation(row, items = []) {
  if (!row) return null;
  return {
    id: row.id, companyId: row.empresa_id, type: row.tipo, channel: row.canal,
    year: row.ano === null ? null : Number(row.ano), number: row.numero === null ? null : Number(row.numero),
    customerId: row.cliente_id || '', customerSnapshot: row.cliente_retrato || {},
    priceTableId: row.tabela_preco_id || '', priceTableSnapshot: row.tabela_preco_retrato || {},
    sellerId: row.vendedor_id || '', sellerName: row.vendedor_nome || '', status: row.situacao,
    validityDate: row.validade_em ? text(row.validade_em).slice(0, 10) : '',
    convertedFromId: row.convertido_de_id || '', subtotalGross: Number(row.subtotal_bruto),
    itemDiscount: Number(row.desconto_itens), generalDiscount: Number(row.desconto_geral),
    freight: Number(row.frete), insurance: Number(row.seguro), otherExpenses: Number(row.outras_despesas),
    total: Number(row.total), currency: row.moeda, paymentSnapshot: row.pagamento_retrato || {},
    deliverySnapshot: row.entrega_retrato || {}, fiscalDocument: row.documento_fiscal_solicitado,
    fiscalStatus: row.situacao_fiscal, stockStatus: row.situacao_estoque,
    customerNotes: row.observacoes_cliente || '', internalNotes: row.observacoes_internas || '',
    contentHash: row.conteudo_hash, version: Number(row.versao), createdBy: row.criado_por || '',
    updatedBy: row.atualizado_por || '', createdAt: text(row.criado_em), updatedAt: text(row.atualizado_em), items,
  };
}

function mapServiceOrder(row, checklist = [], materials = [], attachments = []) {
  if (!row) return null;
  return {
    scheduledAt: text(row.agendado_para), expectedDurationMinutes: Number(row.duracao_prevista_minutos),
    technicianId: row.tecnico_id || '', technicianName: row.tecnico_nome || '',
    executionLocation: row.local_execucao || '', onSiteContact: row.contato_no_local || '',
    startedAt: text(row.iniciado_em), completedAt: text(row.concluido_em),
    actualDurationMinutes: row.duracao_real_minutos === null ? null : Number(row.duracao_real_minutos),
    completionNotes: row.observacoes_execucao || '', acceptanceStatus: row.aceite_situacao,
    acceptedBy: row.aceite_por || '', acceptedAt: text(row.aceite_em), acceptanceNotes: row.aceite_observacoes || '',
    laborCost: Number(row.custo_mao_obra), materialCost: Number(row.custo_materiais), actualCost: Number(row.custo_real_total),
    checklist: checklist.map((item) => ({ id: item.id, position: Number(item.posicao), description: item.descricao, completed: item.concluido, completedAt: text(item.concluido_em) })),
    materials: materials.map((item) => ({ id: item.id, productId: item.produto_id || '', origin: item.origem, sku: item.sku || '', name: item.nome, unit: item.unidade, plannedQuantity: Number(item.quantidade_prevista), usedQuantity: Number(item.quantidade_utilizada), costUnitSnapshot: Number(item.custo_unitario_retrato), stockStatus: item.situacao_estoque })),
    attachments: attachments.map((item) => ({ id: item.id, name: item.nome, type: item.tipo_mime, size: Number(item.tamanho_bytes), checksum: item.checksum_sha256, addedAt: text(item.criado_em) })),
  };
}

async function withClient(pool, work) {
  const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
  try { return await work(client); }
  finally { if (client !== pool && typeof client.release === 'function') client.release(); }
}

async function runSerializable(pool, work, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
    try {
      await client.query('begin');
      await client.query('set transaction isolation level serializable');
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (cause) {
      try { await client.query('rollback'); } catch {}
      if (!RETRYABLE_TRANSACTION_CODES.has(cause?.code) || attempt === maxRetries) throw cause;
    } finally {
      if (client !== pool && typeof client.release === 'function') client.release();
    }
  }
  throw new Error('A transação comercial não pôde ser concluída.');
}

function operationError(code, message) {
  const cause = new Error(message);
  cause.code = code;
  return cause;
}

async function loadOperation(client, companyId, operationId) {
  const operation = await client.query('select * from public.vendas_operacoes where empresa_id=$1 and id=$2', [companyId, operationId]);
  if (!operation.rows?.[0]) return null;
  const items = await client.query('select * from public.vendas_operacao_itens where empresa_id=$1 and operacao_id=$2 order by posicao,id', [companyId, operationId]);
  const mapped = mapOperation(operation.rows[0], (items.rows || []).map(mapItem));
  if (mapped.type !== 'ordem_servico') return mapped;
  const [service, checklist, materials, attachments] = await Promise.all([
    client.query('select * from public.vendas_ordens_servico where empresa_id=$1 and operacao_id=$2', [companyId, operationId]),
    client.query('select * from public.vendas_os_checklist where empresa_id=$1 and operacao_id=$2 order by posicao,id', [companyId, operationId]),
    client.query('select * from public.vendas_os_materiais where empresa_id=$1 and operacao_id=$2 order by criado_em,id', [companyId, operationId]),
    client.query('select * from public.vendas_os_anexos where empresa_id=$1 and operacao_id=$2 order by criado_em,id', [companyId, operationId]),
  ]);
  return { ...mapped, serviceOrder: mapServiceOrder(service.rows?.[0], checklist.rows || [], materials.rows || [], attachments.rows || []) };
}

async function appendEvent(client, { companyId, operationId, event, summary, actorId, metadata = {} }) {
  await client.query(`
    insert into public.vendas_eventos(empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,criado_por)
    values ($1,'operacao',$2,$3,$4,$5::jsonb,$6)
  `, [companyId, operationId, event, summary, JSON.stringify(metadata), actorId]);
}

async function insertItems(client, companyId, operationId, items) {
  for (const item of items) {
    await client.query(`
      insert into public.vendas_operacao_itens(
        empresa_id,operacao_id,posicao,produto_id,tipo_item,sku,nome,descricao,unidade,quantidade,
        preco_unitario,desconto_unitario,valor_bruto,valor_desconto,valor_liquido,
        custo_unitario_retrato,fiscal_retrato,fiscal_pronto,controla_estoque
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19)
    `, [
      companyId, operationId, item.position, item.productId, item.itemType, nullable(item.sku),
      item.name, nullable(item.description), item.unit, item.quantity, item.unitPrice, item.discountUnit,
      item.gross, item.discount, item.net, item.costUnitSnapshot, JSON.stringify(item.fiscalSnapshot),
      item.fiscalReady, item.controlsStock,
    ]);
  }
}

async function insertOperation(client, operation, convertedFromId = null) {
  const result = await client.query(`
    insert into public.vendas_operacoes(
      empresa_id,tipo,canal,cliente_id,cliente_retrato,tabela_preco_id,tabela_preco_retrato,
      vendedor_id,vendedor_nome,situacao,validade_em,convertido_de_id,subtotal_bruto,desconto_itens,
      desconto_geral,frete,seguro,outras_despesas,total,pagamento_retrato,entrega_retrato,
      documento_fiscal_solicitado,situacao_fiscal,situacao_estoque,observacoes_cliente,
      observacoes_internas,chave_idempotencia,conteudo_hash,criado_por,atualizado_por
    ) values (
      $1,$2,$3,$4,$5::jsonb,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
      $20::jsonb,$21::jsonb,$22,$23,$24,$25,$26,$27,$28,$29,$29
    ) returning id
  `, [
    operation.companyId, operation.type, operation.channel, operation.customerId,
    JSON.stringify(operation.customerSnapshot), operation.priceTableId,
    JSON.stringify(operation.priceTableSnapshot), operation.sellerId, nullable(operation.sellerName),
    operation.status, operation.validityDate, convertedFromId, operation.subtotalGross,
    operation.itemDiscount, operation.generalDiscount, operation.freight, operation.insurance,
    operation.otherExpenses, operation.total, JSON.stringify(operation.paymentSnapshot),
    JSON.stringify(operation.deliverySnapshot), operation.fiscalDocument, operation.fiscalStatus,
    operation.stockStatus, nullable(operation.customerNotes), nullable(operation.internalNotes),
    operation.idempotencyKey, operation.contentHash, operation.actorId,
  ]);
  const operationId = result.rows[0].id;
  await insertItems(client, operation.companyId, operationId, operation.items);
  await client.query('select * from public.vendas_reservar_numero_operacao($1,$2)', [operation.companyId, operationId]);
  return operationId;
}

export function createPostgresCommercialOperationRepository({ pool } = {}) {
  assertPool(pool);
  return Object.freeze({
    id: 'avantalab-commercial-operation-postgres-v1',
    configured: true,

    async create(operation) {
      return runSerializable(pool, async (client) => {
        await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [`vendas:operacao:idempotencia:${operation.companyId}:${operation.idempotencyKey}`]);
        const existing = await client.query('select id,conteudo_hash from public.vendas_operacoes where empresa_id=$1 and chave_idempotencia=$2', [operation.companyId, operation.idempotencyKey]);
        if (existing.rows?.[0]) {
          if (existing.rows[0].conteudo_hash !== operation.contentHash) throw operationError('AV-COMMERCIAL-OPERATION-IDEMPOTENCY', 'Chave reutilizada com conteúdo diferente.');
          return { operation: await loadOperation(client, operation.companyId, existing.rows[0].id), reused: true };
        }
        const operationId = await insertOperation(client, operation);
        const created = await loadOperation(client, operation.companyId, operationId);
        await appendEvent(client, {
          companyId: operation.companyId, operationId, event: `${operation.type}_criado`,
          summary: `${operation.type === 'orcamento' ? 'Orçamento' : 'Pedido'} ${created.year}/${created.number} salvo.`,
          actorId: operation.actorId,
          metadata: { type: created.type, channel: created.channel, year: created.year, number: created.number, total: created.total, version: created.version },
        });
        return { operation: created, reused: false };
      });
    },

    async update({ operationId, expectedVersion, operation }) {
      return runSerializable(pool, async (client) => {
        const currentResult = await client.query('select * from public.vendas_operacoes where empresa_id=$1 and id=$2 for update', [operation.companyId, operationId]);
        const current = currentResult.rows?.[0];
        if (!current) throw operationError('AV-COMMERCIAL-OPERATION-NOT-FOUND', 'Operação não localizada.');
        if (Number(current.versao) !== expectedVersion) throw operationError('AV-COMMERCIAL-OPERATION-CONFLICT', 'Versão desatualizada.');
        if (!['rascunho', 'salvo'].includes(current.situacao) || current.tipo !== operation.type || current.canal !== operation.channel) throw operationError('AV-COMMERCIAL-OPERATION-NOT-EDITABLE', 'Operação não editável.');
        const updated = await client.query(`
          update public.vendas_operacoes set
            cliente_id=$3,cliente_retrato=$4::jsonb,tabela_preco_id=$5,tabela_preco_retrato=$6::jsonb,
            vendedor_id=$7,vendedor_nome=$8,validade_em=$9,subtotal_bruto=$10,desconto_itens=$11,
            desconto_geral=$12,frete=$13,seguro=$14,outras_despesas=$15,total=$16,
            pagamento_retrato=$17::jsonb,entrega_retrato=$18::jsonb,documento_fiscal_solicitado=$19,
            situacao_fiscal=$20,situacao_estoque=$21,observacoes_cliente=$22,observacoes_internas=$23,
            conteudo_hash=$24,atualizado_por=$25
          where empresa_id=$1 and id=$2 and versao=$26 returning id
        `, [
          operation.companyId, operationId, operation.customerId, JSON.stringify(operation.customerSnapshot),
          operation.priceTableId, JSON.stringify(operation.priceTableSnapshot), operation.sellerId,
          nullable(operation.sellerName), operation.validityDate, operation.subtotalGross,
          operation.itemDiscount, operation.generalDiscount, operation.freight, operation.insurance,
          operation.otherExpenses, operation.total, JSON.stringify(operation.paymentSnapshot),
          JSON.stringify(operation.deliverySnapshot), operation.fiscalDocument, operation.fiscalStatus,
          operation.stockStatus, nullable(operation.customerNotes), nullable(operation.internalNotes),
          operation.contentHash, operation.actorId, expectedVersion,
        ]);
        if (!updated.rows?.[0]) throw operationError('AV-COMMERCIAL-OPERATION-CONFLICT', 'Versão desatualizada.');
        await client.query('delete from public.vendas_operacao_itens where empresa_id=$1 and operacao_id=$2', [operation.companyId, operationId]);
        await insertItems(client, operation.companyId, operationId, operation.items);
        const saved = await loadOperation(client, operation.companyId, operationId);
        await appendEvent(client, {
          companyId: operation.companyId, operationId, event: `${operation.type}_atualizado`,
          summary: `${operation.type === 'orcamento' ? 'Orçamento' : 'Pedido'} ${saved.year}/${saved.number} atualizado.`,
          actorId: operation.actorId,
          metadata: { previousVersion: expectedVersion, version: saved.version, total: saved.total },
        });
        return saved;
      });
    },

    async convertQuoteToOrder({ companyId, actorId, quoteId, expectedVersion, idempotencyKey }) {
      return runSerializable(pool, async (client) => {
        await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [`vendas:operacao:idempotencia:${companyId}:${idempotencyKey}`]);
        const sameRequest = await client.query('select id,convertido_de_id,tipo from public.vendas_operacoes where empresa_id=$1 and chave_idempotencia=$2', [companyId, idempotencyKey]);
        if (sameRequest.rows?.[0]) {
          if (sameRequest.rows[0].convertido_de_id !== quoteId || sameRequest.rows[0].tipo !== 'pedido') throw operationError('AV-COMMERCIAL-OPERATION-IDEMPOTENCY', 'Chave reutilizada com outra operação.');
          return { operation: await loadOperation(client, companyId, sameRequest.rows[0].id), reused: true };
        }
        const quoteResult = await client.query('select * from public.vendas_operacoes where empresa_id=$1 and id=$2 for update', [companyId, quoteId]);
        const quote = quoteResult.rows?.[0];
        if (!quote) throw operationError('AV-COMMERCIAL-OPERATION-NOT-FOUND', 'Orçamento não localizado.');
        if (Number(quote.versao) !== expectedVersion) throw operationError('AV-COMMERCIAL-OPERATION-CONFLICT', 'Versão desatualizada.');
        if (quote.tipo !== 'orcamento' || quote.canal !== 'vendas' || !['salvo', 'enviado', 'em_negociacao', 'aprovado'].includes(quote.situacao)) throw operationError('AV-COMMERCIAL-OPERATION-NOT-EDITABLE', 'O orçamento não pode ser convertido.');
        const previousConversion = await client.query('select id from public.vendas_operacoes where empresa_id=$1 and convertido_de_id=$2', [companyId, quoteId]);
        if (previousConversion.rows?.[0]) throw operationError('AV-COMMERCIAL-OPERATION-ALREADY-CONVERTED', 'Orçamento já convertido.');
        const targetHash = createHash('sha256').update(`${quote.conteudo_hash}:pedido:${idempotencyKey}`).digest('hex');
        const target = await client.query(`
          insert into public.vendas_operacoes(
            empresa_id,tipo,canal,cliente_id,cliente_retrato,tabela_preco_id,tabela_preco_retrato,
            vendedor_id,vendedor_nome,situacao,convertido_de_id,subtotal_bruto,desconto_itens,
            desconto_geral,frete,seguro,outras_despesas,total,pagamento_retrato,entrega_retrato,
            documento_fiscal_solicitado,situacao_fiscal,situacao_estoque,observacoes_cliente,
            observacoes_internas,chave_idempotencia,conteudo_hash,criado_por,atualizado_por
          ) select empresa_id,'pedido',canal,cliente_id,cliente_retrato,tabela_preco_id,tabela_preco_retrato,
            vendedor_id,vendedor_nome,'salvo',$3,subtotal_bruto,desconto_itens,desconto_geral,frete,seguro,
            outras_despesas,total,pagamento_retrato,entrega_retrato,documento_fiscal_solicitado,
            situacao_fiscal,'sem_movimentacao',observacoes_cliente,observacoes_internas,$4,$5,$6,$6
          from public.vendas_operacoes where empresa_id=$1 and id=$2 returning id
        `, [companyId, quoteId, quoteId, idempotencyKey, targetHash, actorId]);
        const orderId = target.rows[0].id;
        await client.query(`
          insert into public.vendas_operacao_itens(
            empresa_id,operacao_id,posicao,produto_id,tipo_item,sku,nome,descricao,unidade,quantidade,
            preco_unitario,desconto_unitario,valor_bruto,valor_desconto,valor_liquido,
            custo_unitario_retrato,fiscal_retrato,fiscal_pronto,controla_estoque
          ) select empresa_id,$3,posicao,produto_id,tipo_item,sku,nome,descricao,unidade,quantidade,
            preco_unitario,desconto_unitario,valor_bruto,valor_desconto,valor_liquido,
            custo_unitario_retrato,fiscal_retrato,fiscal_pronto,controla_estoque
          from public.vendas_operacao_itens where empresa_id=$1 and operacao_id=$2 order by posicao
        `, [companyId, quoteId, orderId]);
        await client.query('select * from public.vendas_reservar_numero_operacao($1,$2)', [companyId, orderId]);
        if (quote.situacao !== 'aprovado') await client.query("update public.vendas_operacoes set situacao='aprovado',atualizado_por=$3 where empresa_id=$1 and id=$2", [companyId, quoteId, actorId]);
        const order = await loadOperation(client, companyId, orderId);
        await appendEvent(client, {
          companyId, operationId: quoteId, event: 'orcamento_convertido',
          summary: `Orçamento ${quote.ano}/${quote.numero} convertido no pedido ${order.year}/${order.number}.`, actorId,
          metadata: { orderId, orderYear: order.year, orderNumber: order.number },
        });
        await appendEvent(client, {
          companyId, operationId: orderId, event: 'pedido_criado_por_conversao',
          summary: `Pedido ${order.year}/${order.number} criado a partir de orçamento.`, actorId,
          metadata: { quoteId, total: order.total, version: order.version },
        });
        return { operation: order, reused: false };
      });
    },

    async get({ companyId, operationId, channel = '' }) {
      return withClient(pool, async (client) => {
        const operation = await loadOperation(client, companyId, operationId);
        return operation && (!channel || operation.channel === channel) ? operation : null;
      });
    },

    async list({ companyId, channel = '', type = '', status = '', query = '', limit = 50, offset = 0 }) {
      return withClient(pool, async (client) => {
        const search = text(query);
        const result = await client.query(`
          select * from public.vendas_operacoes
          where empresa_id=$1 and ($2='' or canal=$2) and ($3='' or tipo=$3) and ($4='' or situacao=$4)
            and ($5='' or coalesce(cliente_retrato->>'displayName','') ilike '%' || $5 || '%'
              or ($6<>'' and coalesce(cliente_retrato->>'document','') like '%' || $6 || '%')
              or coalesce(numero::text,'')=$5)
          order by criado_em desc,id desc limit $7 offset $8
        `, [companyId, text(channel), text(type), text(status), search, digits(search), limit, offset]);
        return Promise.all((result.rows || []).map((row) => loadOperation(client, companyId, row.id)));
      });
    },
  });
}
