import { createHash, randomUUID } from 'node:crypto';

export const COMMERCIAL_SERVICE_WORKFLOW_REFERENCE = '2026-09-06';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,140}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const RETRYABLE = new Set(['40001', '40P01']);
const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);
const issue = (code, field, message) => ({ code, field, message });
const coded = (code) => Object.assign(new Error(code), { code });

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function validDate(value) {
  const match = DATE.exec(clean(value, 10));
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return year >= 1900 && year <= 2200 && parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function addMonths(date, offset) {
  const [year, month, day] = date.split('-').map(Number);
  const index = month - 1 + offset;
  const targetYear = year + Math.floor(index / 12);
  const targetMonth = ((index % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

function cents(value) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(clean(value));
  if (!match) return null;
  const result = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return Number.isSafeInteger(result) ? result : null;
}

const money = (value) => Number((value / 100).toFixed(2));

function normalizeIssuer(input = {}) {
  const address = input.address && typeof input.address === 'object' ? input.address : input;
  const digits = (value, max) => clean(value).replace(/\D/g, '').slice(0, max);
  const issuer = {
    establishmentId: UUID.test(clean(input.establishmentId)) ? clean(input.establishmentId) : '',
    document: digits(input.document, 14), legalName: clean(input.legalName, 180), tradeName: clean(input.tradeName, 180),
    stateRegistration: clean(input.stateRegistration, 40), municipalRegistration: clean(input.municipalRegistration, 40),
    taxRegime: clean(input.taxRegime, 80), postalCode: digits(address.postalCode || address.cep, 8),
    street: clean(address.street || address.logradouro, 180), number: clean(address.number || address.numero, 30),
    complement: clean(address.complement || address.complemento, 100), district: clean(address.district || address.bairro, 100),
    city: clean(address.city || address.municipio, 100), cityCode: digits(address.cityCode || address.municipioIbge, 7),
    state: clean(address.state || address.uf, 2).toUpperCase(),
  };
  issuer.ready = Boolean(issuer.establishmentId && issuer.document.length === 14 && issuer.legalName
    && issuer.cityCode.length === 7 && issuer.state.length === 2 && issuer.municipalRegistration);
  return issuer;
}

function accessError(context, action) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) return issue('AV-SERVICE-WORKFLOW-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  if (context.moduleId && context.moduleId !== 'vendas') return issue('AV-SERVICE-WORKFLOW-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  const required = action === 'complete' ? ['services.complete', 'stock.exit', 'fiscal.prepare']
    : action === 'reverse' ? ['services.edit', 'stock.adjust', 'receivables.refund', 'fiscal.cancel'] : ['services.edit'];
  if (!context.active || !context.moduleActive || required.some((permission) => context.effectivePermissions?.[permission] !== true)) return issue('AV-SERVICE-WORKFLOW-PERMISSION', 'permission', 'Seu acesso não permite realizar esta ação na ordem de serviço.');
  return null;
}

function publicError(error) {
  const known = {
    'AV-SERVICE-WORKFLOW-NOT-FOUND': ['operation', 'Ordem de serviço não localizada nesta empresa.'],
    'AV-SERVICE-WORKFLOW-CONFLICT': ['version', 'A ordem foi alterada por outra pessoa. Atualize antes de continuar.'],
    'AV-SERVICE-WORKFLOW-STATE': ['status', 'A ordem de serviço não está na etapa correta para esta ação.'],
    'AV-SERVICE-WORKFLOW-STOCK': ['stock', 'O estoque disponível é insuficiente ou a reserva dos materiais está inconsistente.'],
    'AV-SERVICE-WORKFLOW-MATERIALS': ['materials', 'Revise as quantidades utilizadas nos materiais da ordem.'],
    'AV-SERVICE-WORKFLOW-PAYMENT': ['payment', 'Revise as parcelas e o primeiro vencimento antes de concluir.'],
    'AV-SERVICE-WORKFLOW-FISCAL': ['fiscal', 'A NFS-e exige cadastro fiscal completo do perfil empresarial e dos serviços.'],
    'AV-SERVICE-WORKFLOW-RECEIVED': ['receivables', 'Existem valores recebidos. Estorne os recebimentos antes de cancelar a conclusão.'],
    'AV-SERVICE-WORKFLOW-FISCAL-ACTIVE': ['fiscal', 'O documento fiscal já entrou no ciclo de emissão. Cancele-o pela Central Fiscal antes de estornar a conclusão.'],
    'AV-SERVICE-WORKFLOW-IDEMPOTENCY': ['operation', 'Esta solicitação já foi usada para outra ação. Atualize a ordem.'],
  }[error?.code];
  return known ? issue(error.code, known[0], known[1]) : issue('AV-SERVICE-WORKFLOW-STORAGE', 'storage', 'Não foi possível concluir a operação de serviço. Tente novamente.');
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
    } finally { client.release(); }
  }
}

async function repeated(client, companyId, key, orderId, eventName) {
  const result = await client.query('select recurso_id,evento,metadados from public.vendas_eventos where empresa_id=$1 and chave_idempotencia=$2', [companyId, key]);
  if (!result.rows[0]) return null;
  if (result.rows[0].recurso_id !== orderId || result.rows[0].evento !== eventName) throw coded('AV-SERVICE-WORKFLOW-IDEMPOTENCY');
  return { reused: true, event: eventName, ...result.rows[0].metadados };
}

async function loadOrder(client, companyId, orderId) {
  const result = await client.query("select o.*,s.iniciado_em from public.vendas_operacoes o join public.vendas_ordens_servico s on s.empresa_id=o.empresa_id and s.operacao_id=o.id where o.empresa_id=$1 and o.id=$2 and o.tipo='ordem_servico' and o.canal='servicos' for update of o,s", [companyId, orderId]);
  return result.rows[0] || null;
}

async function recordEvent(client, { companyId, orderId, actorId, key, name, summary, metadata }) {
  await client.query("insert into public.vendas_eventos(empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,chave_idempotencia,criado_por) values($1,'ordem_servico',$2,$3,$4,$5::jsonb,$6,$7)", [companyId, orderId, name, summary, JSON.stringify(metadata), key, actorId]);
}

async function reserveMaterials(client, { companyId, actorId, orderId, localId, key }) {
  const materials = (await client.query("select * from public.vendas_os_materiais where empresa_id=$1 and operacao_id=$2 and origem='catalogo' order by id for update", [companyId, orderId])).rows;
  if (!materials.length) return { quantity: 0, count: 0 };
  if (!UUID.test(localId) || !(await client.query('select 1 from public.vendas_estoque_locais where empresa_id=$1 and id=$2 and ativo for update', [companyId, localId])).rows[0]) throw coded('AV-SERVICE-WORKFLOW-STOCK');
  let quantity = 0;
  for (const material of materials) {
    const balance = (await client.query('select * from public.vendas_estoque_saldos where empresa_id=$1 and local_id=$2 and produto_id=$3 for update', [companyId, localId, material.produto_id])).rows[0];
    const planned = Number(material.quantidade_prevista);
    if (!balance || (!balance.permite_negativo && Number(balance.saldo_fisico) - Number(balance.saldo_reservado) < planned)) throw coded('AV-SERVICE-WORKFLOW-STOCK');
    const before = Number(balance.saldo_reservado); const after = before + planned;
    await client.query('update public.vendas_estoque_saldos set saldo_reservado=$3 where empresa_id=$1 and id=$2', [companyId, balance.id, after]);
    const reservation = await client.query('insert into public.vendas_estoque_reservas(empresa_id,saldo_id,operacao_id,os_material_id,quantidade,chave_idempotencia,criado_por) values($1,$2,$3,$4,$5,$6,$7) returning id', [companyId, balance.id, orderId, material.id, planned, `${key}:${material.id}`, actorId]);
    await client.query("insert into public.vendas_estoque_movimentos(empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,saldo_reservado_final,chave_idempotencia,criado_por) values($1,$2,$3,$4,'reserva',$5,$6,$6,$7,$8,$9,$10)", [companyId, balance.id, reservation.rows[0].id, orderId, planned, Number(balance.saldo_fisico), before, after, `${key}:${material.id}:mov`, actorId]);
    await client.query("update public.vendas_os_materiais set situacao_estoque='reservado',atualizado_em=now() where empresa_id=$1 and id=$2", [companyId, material.id]);
    quantity += planned;
  }
  return { quantity: Number(quantity.toFixed(3)), count: materials.length };
}

function fiscalItems(rows) {
  return rows.map((item) => ({ position: Number(item.posicao), productId: item.produto_id || '', itemType: item.tipo_item,
    sku: item.sku || '', name: item.nome, description: item.descricao || '', unit: item.unidade,
    quantity: Number(item.quantidade), unitPrice: Number(item.preco_unitario), unitDiscount: Number(item.desconto_unitario),
    gross: Number(item.valor_bruto), discount: Number(item.valor_desconto), net: Number(item.valor_liquido),
    fiscal: item.fiscal_retrato || {}, fiscalReady: item.fiscal_pronto }));
}

export function createPostgresCommercialServiceWorkflowRepository({ pool } = {}) {
  if (!pool?.connect) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async start({ companyId, actorId, orderId, expectedVersion, localId, startedAt, idempotencyKey }) {
      return transaction(pool, async (client) => {
        const replay = await repeated(client, companyId, idempotencyKey, orderId, 'ordem_servico_iniciada'); if (replay) return replay;
        const order = await loadOrder(client, companyId, orderId);
        if (!order) throw coded('AV-SERVICE-WORKFLOW-NOT-FOUND');
        if (Number(order.versao) !== expectedVersion) throw coded('AV-SERVICE-WORKFLOW-CONFLICT');
        if (order.situacao !== 'agendado' || order.situacao_estoque !== 'sem_movimentacao') throw coded('AV-SERVICE-WORKFLOW-STATE');
        const reserved = await reserveMaterials(client, { companyId, actorId, orderId, localId, key: idempotencyKey });
        const updated = await client.query("update public.vendas_operacoes set situacao='em_execucao',situacao_estoque=$3,atualizado_por=$4 where empresa_id=$1 and id=$2 returning versao", [companyId, orderId, reserved.count ? 'reservado' : 'sem_movimentacao', actorId]);
        await client.query('update public.vendas_ordens_servico set iniciado_em=$3,atualizado_por=$4 where empresa_id=$1 and operacao_id=$2', [companyId, orderId, startedAt, actorId]);
        const metadata = { operationVersion: Number(updated.rows[0].versao), reservedQuantity: reserved.quantity, reservationCount: reserved.count };
        await recordEvent(client, { companyId, orderId, actorId, key: idempotencyKey, name: 'ordem_servico_iniciada', summary: 'Ordem iniciada e materiais reservados.', metadata });
        return { reused: false, event: 'ordem_servico_iniciada', ...metadata };
      });
    },

    async complete({ companyId, actorId, orderId, expectedVersion, completion, issuerSnapshot, idempotencyKey }) {
      return transaction(pool, async (client) => {
        const replay = await repeated(client, companyId, idempotencyKey, orderId, 'ordem_servico_concluida'); if (replay) return replay;
        const order = await loadOrder(client, companyId, orderId);
        if (!order) throw coded('AV-SERVICE-WORKFLOW-NOT-FOUND');
        if (Number(order.versao) !== expectedVersion) throw coded('AV-SERVICE-WORKFLOW-CONFLICT');
        if (order.situacao !== 'em_execucao') throw coded('AV-SERVICE-WORKFLOW-STATE');
        const storedMaterials = (await client.query('select * from public.vendas_os_materiais where empresa_id=$1 and operacao_id=$2 order by id for update', [companyId, orderId])).rows;
        const selectedIds = new Set();
        for (const input of completion.materials) {
          const stored = UUID.test(input.id) ? storedMaterials.find((row) => row.id === input.id) : null;
          if (stored) { selectedIds.add(stored.id); continue; }
          const origin = input.source === 'catalogo' ? 'catalogo' : input.source === 'cliente' ? 'cliente' : 'externo';
          let product = null;
          if (origin === 'catalogo') {
            product = (await client.query(`select item.* from public.vendas_mobile_catalogo_produtos item join public.vendas_mobile_catalogos catalog on catalog.id=item.catalogo_id where catalog.empresa_id=$1 and item.id=$2 and item.ativo=true and item.disponivel_catalogo=true and item.tipo_item<>'servico' for update of item`, [companyId, input.catalogItemId])).rows[0];
            if (!product) throw coded('AV-SERVICE-WORKFLOW-MATERIALS');
          }
          const inserted = await client.query("insert into public.vendas_os_materiais(empresa_id,operacao_id,produto_id,origem,sku,nome,unidade,quantidade_prevista,quantidade_utilizada,custo_unitario_retrato,situacao_estoque) values($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10) returning id", [companyId, orderId, product?.id || null, origin, product?.sku || null, product?.nome || input.name, product?.unidade || input.unit, input.quantity, origin === 'cliente' ? 0 : product ? Number(product.preco_custo) : input.cost, origin === 'catalogo' ? 'pendente' : 'nao_aplicavel']);
          selectedIds.add(inserted.rows[0].id);
        }
        if (storedMaterials.some((row) => !selectedIds.has(row.id))) throw coded('AV-SERVICE-WORKFLOW-MATERIALS');
        const materials = (await client.query(`select m.*,r.id reserva_id,r.saldo_id,r.quantidade reserva_quantidade,r.situacao reserva_situacao,s.saldo_fisico,s.saldo_reservado,s.permite_negativo from public.vendas_os_materiais m left join public.vendas_estoque_reservas r on r.empresa_id=m.empresa_id and r.os_material_id=m.id and r.situacao='ativa' left join public.vendas_estoque_saldos s on s.empresa_id=r.empresa_id and s.id=r.saldo_id where m.empresa_id=$1 and m.operacao_id=$2 order by m.id for update of m,r,s`, [companyId, orderId])).rows;
        const inputByStoredId = new Map(materials.map((material) => {
          const direct = completion.materials.find((item) => item.id === material.id);
          const added = direct || completion.materials.find((item) => item.source === material.origem && item.catalogItemId === material.produto_id && Number(item.quantity) === Number(material.quantidade_prevista));
          return [material.id, added];
        }));
        let consumed = 0; let materialCost = 0;
        for (const material of materials) {
          const used = Number(inputByStoredId.get(material.id)?.quantity); const planned = Number(material.quantidade_prevista);
          if (!(used >= 0) || used > planned) throw coded('AV-SERVICE-WORKFLOW-MATERIALS');
          if (material.origem === 'catalogo') {
            let balance = material.reserva_id ? material : (await client.query('select s.*,null::uuid reserva_id,0::numeric reserva_quantidade from public.vendas_estoque_saldos s where s.empresa_id=$1 and s.local_id=$2 and s.produto_id=$3 for update', [companyId, completion.localId, material.produto_id])).rows[0];
            if (!balance) throw coded('AV-SERVICE-WORKFLOW-STOCK');
            const physical = Number(balance.saldo_fisico); const held = Number(balance.saldo_reservado); const reserved = Number(balance.reserva_quantidade || 0);
            if (used > (reserved || used) || held < reserved || (!balance.permite_negativo && physical < used)) throw coded('AV-SERVICE-WORKFLOW-STOCK');
            await client.query('update public.vendas_estoque_saldos set saldo_fisico=$3,saldo_reservado=$4 where empresa_id=$1 and id=$2', [companyId, balance.saldo_id || balance.id, physical - used, held - reserved]);
            if (balance.reserva_id) await client.query("update public.vendas_estoque_reservas set situacao='consumida',atualizado_em=now() where empresa_id=$1 and id=$2", [companyId, balance.reserva_id]);
            if (used > 0) await client.query("insert into public.vendas_estoque_movimentos(empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,saldo_reservado_final,chave_idempotencia,criado_por) values($1,$2,$3,$4,'saida_servico',$5,$6,$7,$8,$9,$10,$11)", [companyId, balance.saldo_id || balance.id, balance.reserva_id, orderId, -used, physical, physical - used, held, held - used, `${idempotencyKey}:${material.id}:saida`, actorId]);
            if (reserved > used) await client.query("insert into public.vendas_estoque_movimentos(empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,saldo_reservado_final,chave_idempotencia,criado_por) values($1,$2,$3,$4,'liberacao',$5,$6,$6,$7,$8,$9,$10)", [companyId, balance.saldo_id || balance.id, balance.reserva_id, orderId, -(reserved - used), physical - used, held - used, held - reserved, `${idempotencyKey}:${material.id}:sobra`, actorId]);
          }
          await client.query('update public.vendas_os_materiais set quantidade_utilizada=$3,situacao_estoque=$4,atualizado_em=now() where empresa_id=$1 and id=$2', [companyId, material.id, used, material.origem === 'catalogo' ? (used ? 'baixado' : 'liberado') : 'nao_aplicavel']);
          consumed += used; materialCost += used * Number(material.custo_unitario_retrato);
        }
        await client.query('delete from public.vendas_os_checklist where empresa_id=$1 and operacao_id=$2', [companyId, orderId]);
        for (let index = 0; index < completion.checklist.length; index += 1) {
          const item = completion.checklist[index];
          await client.query('insert into public.vendas_os_checklist(empresa_id,operacao_id,posicao,descricao,concluido,concluido_por,concluido_em) values($1,$2,$3,$4,$5,$6,$7)', [companyId, orderId, index + 1, item.label, item.complete, item.complete ? actorId : null, item.complete ? completion.completedAt : null]);
        }

        const payment = order.pagamento_retrato && typeof order.pagamento_retrato === 'object' ? order.pagamento_retrato : {};
        const installmentCount = Number.parseInt(payment.installments, 10); const firstDueDate = clean(payment.firstDueDate, 10); const totalCents = cents(order.total);
        if (!clean(payment.method, 40) || !Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 120 || !validDate(firstDueDate) || !totalCents || totalCents < installmentCount) throw coded('AV-SERVICE-WORKFLOW-PAYMENT');
        const baseCents = Math.floor(totalCents / installmentCount); const receivableIds = [];
        for (let index = 0; index < installmentCount; index += 1) {
          const amount = money(index === installmentCount - 1 ? totalCents - baseCents * (installmentCount - 1) : baseCents);
          const receivable = await client.query('insert into public.vendas_contas_receber(empresa_id,operacao_id,cliente_id,parcela,total_parcelas,vencimento,valor_original,saldo_aberto,meio_pagamento,chave_idempotencia,criado_por,atualizado_por) values($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$10) returning id', [companyId, orderId, order.cliente_id, index + 1, installmentCount, addMonths(firstDueDate, index), amount, clean(payment.method, 40), `${idempotencyKey}:parcela:${index + 1}`, actorId]);
          receivableIds.push(receivable.rows[0].id);
          await client.query("insert into public.vendas_contas_receber_eventos(empresa_id,conta_receber_id,tipo,valor,meio_pagamento,descricao,chave_idempotencia,criado_por) values($1,$2,'geracao',$3,$4,$5,$6,$7)", [companyId, receivable.rows[0].id, amount, clean(payment.method, 40), `Parcela ${index + 1}/${installmentCount} gerada pela conclusão da ordem de serviço.`, `${idempotencyKey}:parcela:${index + 1}:evento`, actorId]);
        }

        const items = (await client.query('select * from public.vendas_operacao_itens where empresa_id=$1 and operacao_id=$2 order by posicao,id for update', [companyId, orderId])).rows;
        const documentType = clean(order.documento_fiscal_solicitado, 10).toLowerCase(); const issuer = normalizeIssuer(issuerSnapshot);
        let fiscalDraftId = ''; let fiscalDraftStatus = 'nao_aplicavel';
        if (documentType === 'nfse') {
          if (!issuer.ready) throw coded('AV-SERVICE-WORKFLOW-FISCAL');
          const mappedItems = fiscalItems(items);
          if (!mappedItems.length || items.some((item) => item.tipo_item !== 'servico' || !item.fiscal_pronto)) throw coded('AV-SERVICE-WORKFLOW-FISCAL');
          fiscalDraftId = randomUUID(); fiscalDraftStatus = 'pronto';
          const totals = { subtotalGross: Number(order.subtotal_bruto), itemDiscount: Number(order.desconto_itens), generalDiscount: Number(order.desconto_geral), freight: Number(order.frete), insurance: Number(order.seguro), otherExpenses: Number(order.outras_despesas), total: Number(order.total), currency: order.moeda };
          const content = stable({ companyId, orderId, documentType, issuer, customer: order.cliente_retrato || {}, items: mappedItems, totals, payment });
          const hash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
          await client.query("insert into public.vendas_fiscal_rascunhos(id,empresa_id,operacao_id,origem_tipo,documento_tipo,situacao,emitente_retrato,destinatario_retrato,itens_retrato,totais_retrato,pagamento_retrato,conteudo_hash,chave_idempotencia,criado_por) values($1,$2,$3,'ordem_servico','nfse',$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12)", [fiscalDraftId, companyId, orderId, fiscalDraftStatus, JSON.stringify(issuer), JSON.stringify(order.cliente_retrato || {}), JSON.stringify(mappedItems), JSON.stringify(totals), JSON.stringify(payment), hash, `${idempotencyKey}:fiscal`, actorId]);
        }
        const actualCost = Number((completion.laborCost + materialCost).toFixed(2));
        await client.query('update public.vendas_ordens_servico set concluido_em=$3,duracao_real_minutos=$4,observacoes_execucao=$5,aceite_situacao=$6,aceite_por=$7,aceite_em=$8,aceite_observacoes=$9,custo_mao_obra=$10,custo_materiais=$11,custo_real_total=$12,atualizado_por=$13 where empresa_id=$1 and operacao_id=$2', [companyId, orderId, completion.completedAt, completion.actualDurationMinutes, completion.notes, completion.acceptanceStatus, completion.acceptedBy || null, completion.acceptedAt, completion.acceptanceNotes || null, completion.laborCost, Number(materialCost.toFixed(2)), actualCost, actorId]);
        const updated = await client.query("update public.vendas_operacoes set situacao='concluido',situacao_estoque=$3,situacao_fiscal=$4,concluido_em=$5,atualizado_por=$6 where empresa_id=$1 and id=$2 returning versao", [companyId, orderId, materials.some((item) => item.origem === 'catalogo') ? 'baixado' : 'sem_movimentacao', fiscalDraftId ? 'rascunho_criado' : 'nao_aplicavel', completion.completedAt, actorId]);
        const metadata = { operationVersion: Number(updated.rows[0].versao), consumedQuantity: Number(consumed.toFixed(3)), receivableCount: receivableIds.length, fiscalDraftId, fiscalDraftStatus, actualCost };
        await recordEvent(client, { companyId, orderId, actorId, key: idempotencyKey, name: 'ordem_servico_concluida', summary: 'Ordem concluída; estoque, cobrança e preparação fiscal registrados.', metadata });
        return { reused: false, event: 'ordem_servico_concluida', ...metadata };
      });
    },

    async cancel({ companyId, actorId, orderId, expectedVersion, reason, idempotencyKey }) {
      return transaction(pool, async (client) => {
        const replay = await repeated(client, companyId, idempotencyKey, orderId, 'ordem_servico_cancelada'); if (replay) return replay;
        const order = await loadOrder(client, companyId, orderId);
        if (!order) throw coded('AV-SERVICE-WORKFLOW-NOT-FOUND');
        if (Number(order.versao) !== expectedVersion) throw coded('AV-SERVICE-WORKFLOW-CONFLICT');
        if (order.situacao === 'concluido') {
          const fiscal = await client.query(`select r.id,e.state from public.vendas_fiscal_rascunhos r
            left join fiscal_private.emissions e on e.company_id=r.empresa_id and e.draft_id=r.id::text and e.origin_id=r.operacao_id::text
            where r.empresa_id=$1 and r.operacao_id=$2`, [companyId, orderId]);
          if (fiscal.rows.some((row) => row.state && row.state !== 'canceled')) throw coded('AV-SERVICE-WORKFLOW-FISCAL-ACTIVE');
          const receivables = (await client.query('select * from public.vendas_contas_receber where empresa_id=$1 and operacao_id=$2 for update', [companyId, orderId])).rows;
          if (receivables.some((row) => Number(row.valor_recebido) - Number(row.valor_estornado) > 0.001)) throw coded('AV-SERVICE-WORKFLOW-RECEIVED');
          const consumed = (await client.query(`select r.*,m.quantidade_utilizada,s.saldo_fisico,s.saldo_reservado
            from public.vendas_estoque_reservas r join public.vendas_os_materiais m on m.empresa_id=r.empresa_id and m.id=r.os_material_id
            join public.vendas_estoque_saldos s on s.empresa_id=r.empresa_id and s.id=r.saldo_id
            where r.empresa_id=$1 and r.operacao_id=$2 and r.os_material_id is not null and r.situacao='consumida'
            order by r.id for update of r,m,s`, [companyId, orderId])).rows;
          let returned = 0;
          for (const reservation of consumed) {
            const quantity = Number(reservation.quantidade_utilizada); const before = Number(reservation.saldo_fisico); const after = before + quantity;
            if (quantity > 0) {
              await client.query('update public.vendas_estoque_saldos set saldo_fisico=$3 where empresa_id=$1 and id=$2', [companyId, reservation.saldo_id, after]);
              await client.query("insert into public.vendas_estoque_movimentos(empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,saldo_reservado_final,chave_idempotencia,criado_por) values($1,$2,$3,$4,'devolucao',$5,$6,$7,$8,$8,$9,$10)", [companyId, reservation.saldo_id, reservation.id, orderId, quantity, before, after, Number(reservation.saldo_reservado), `${idempotencyKey}:${reservation.os_material_id}`, actorId]);
            }
            await client.query("update public.vendas_estoque_reservas set situacao='devolvida',atualizado_em=now() where empresa_id=$1 and id=$2", [companyId, reservation.id]);
            await client.query("update public.vendas_os_materiais set situacao_estoque='estornado',atualizado_em=now() where empresa_id=$1 and id=$2", [companyId, reservation.os_material_id]);
            returned += quantity;
          }
          for (const receivable of receivables) {
            if (receivable.situacao === 'cancelado') continue;
            await client.query("update public.vendas_contas_receber set situacao='cancelado',atualizado_por=$3 where empresa_id=$1 and id=$2", [companyId, receivable.id, actorId]);
            await client.query("insert into public.vendas_contas_receber_eventos(empresa_id,conta_receber_id,tipo,valor,meio_pagamento,descricao,chave_idempotencia,criado_por) values($1,$2,'cancelamento',0,$3,$4,$5,$6)", [companyId, receivable.id, receivable.meio_pagamento, 'Parcela cancelada pelo estorno da conclusão da ordem de serviço.', `${idempotencyKey}:parcela:${receivable.parcela}`, actorId]);
          }
          if (fiscal.rows[0]) await client.query(`insert into public.vendas_fiscal_rascunho_cancelamentos(empresa_id,rascunho_id,operacao_id,motivo,chave_idempotencia,criado_por)
            values($1,$2,$3,$4,$5,$6) on conflict (empresa_id,rascunho_id) do nothing`, [companyId, fiscal.rows[0].id, orderId, reason, `${idempotencyKey}:fiscal`, actorId]);
          const updated = await client.query("update public.vendas_operacoes set situacao='cancelado',situacao_estoque=$3,situacao_fiscal=$4,cancelado_em=now(),observacoes_internas=concat_ws(E'\\n',nullif(observacoes_internas,''),$5),atualizado_por=$6 where empresa_id=$1 and id=$2 returning versao", [companyId, orderId, consumed.length ? 'devolvido' : 'sem_movimentacao', fiscal.rows[0] ? 'cancelado' : 'nao_aplicavel', reason, actorId]);
          const metadata = { operationVersion: Number(updated.rows[0].versao), returnedQuantity: Number(returned.toFixed(3)), canceledReceivables: receivables.length, fiscalDraftCanceled: Boolean(fiscal.rows[0]) };
          await recordEvent(client, { companyId, orderId, actorId, key: idempotencyKey, name: 'ordem_servico_cancelada', summary: 'Conclusão estornada; materiais, parcelas e rascunho fiscal revertidos.', metadata });
          return { reused: false, event: 'ordem_servico_cancelada', ...metadata };
        }
        if (!['agendado', 'em_execucao'].includes(order.situacao)) throw coded('AV-SERVICE-WORKFLOW-STATE');
        const reservations = (await client.query(`select r.*,s.saldo_fisico,s.saldo_reservado from public.vendas_estoque_reservas r join public.vendas_estoque_saldos s on s.empresa_id=r.empresa_id and s.id=r.saldo_id where r.empresa_id=$1 and r.operacao_id=$2 and r.os_material_id is not null and r.situacao='ativa' order by r.id for update of r,s`, [companyId, orderId])).rows;
        let released = 0;
        for (const reservation of reservations) {
          const quantity = Number(reservation.quantidade); const before = Number(reservation.saldo_reservado);
          if (before < quantity) throw coded('AV-SERVICE-WORKFLOW-STOCK');
          await client.query('update public.vendas_estoque_saldos set saldo_reservado=$3 where empresa_id=$1 and id=$2', [companyId, reservation.saldo_id, before - quantity]);
          await client.query("update public.vendas_estoque_reservas set situacao='liberada',atualizado_em=now() where empresa_id=$1 and id=$2", [companyId, reservation.id]);
          await client.query("insert into public.vendas_estoque_movimentos(empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,saldo_reservado_final,chave_idempotencia,criado_por) values($1,$2,$3,$4,'liberacao',$5,$6,$6,$7,$8,$9,$10)", [companyId, reservation.saldo_id, reservation.id, orderId, -quantity, Number(reservation.saldo_fisico), before, before - quantity, `${idempotencyKey}:${reservation.id}`, actorId]);
          await client.query("update public.vendas_os_materiais set situacao_estoque='liberado',atualizado_em=now() where empresa_id=$1 and id=$2", [companyId, reservation.os_material_id]);
          released += quantity;
        }
        const updated = await client.query("update public.vendas_operacoes set situacao='cancelado',situacao_estoque=$3,cancelado_em=now(),observacoes_internas=concat_ws(E'\\n',nullif(observacoes_internas,''),$4),atualizado_por=$5 where empresa_id=$1 and id=$2 returning versao", [companyId, orderId, reservations.length ? 'liberado' : 'sem_movimentacao', reason, actorId]);
        const metadata = { operationVersion: Number(updated.rows[0].versao), releasedQuantity: Number(released.toFixed(3)) };
        await recordEvent(client, { companyId, orderId, actorId, key: idempotencyKey, name: 'ordem_servico_cancelada', summary: 'Ordem cancelada e reservas liberadas.', metadata });
        return { reused: false, event: 'ordem_servico_cancelada', ...metadata };
      });
    },
  });
}

export function createCommercialServiceWorkflow({ repository, issuerResolver } = {}) {
  if (!repository?.start || !repository?.complete || !repository?.cancel || typeof issuerResolver !== 'function') throw new TypeError('Informe o repositório e o resolvedor do fluxo de serviços.');
  return Object.freeze({
    async advance({ context, action, orderId, expectedVersion, idempotencyKey, localId = '', input = {} } = {}) {
      const normalized = clean(action, 20).toLowerCase(); const no = accessError(context, normalized);
      if (no) return { ok: false, errors: [no] };
      if (!['start', 'complete', 'cancel', 'reverse'].includes(normalized) || !UUID.test(clean(orderId)) || !Number.isInteger(expectedVersion) || expectedVersion < 1 || !KEY.test(clean(idempotencyKey))) return { ok: false, errors: [issue('AV-SERVICE-WORKFLOW-INPUT', 'operation', 'Atualize a ordem de serviço antes de continuar.')] };
      try {
        if (normalized === 'start') {
          const started = new Date(input.startedAt || Date.now()); if (Number.isNaN(started.getTime())) throw coded('AV-SERVICE-WORKFLOW-STATE');
          return { ok: true, result: await repository.start({ companyId: context.companyId, actorId: context.actorId, orderId, expectedVersion, localId: clean(localId, 36), startedAt: started.toISOString(), idempotencyKey }), errors: [] };
        }
        if (normalized === 'cancel' || normalized === 'reverse') {
          const reason = clean(input.reason, 1000); if (!reason) return { ok: false, errors: [issue('AV-SERVICE-WORKFLOW-REASON', 'reason', 'Informe o motivo do cancelamento.')] };
          return { ok: true, result: await repository.cancel({ companyId: context.companyId, actorId: context.actorId, orderId, expectedVersion, reason, idempotencyKey }), errors: [] };
        }
        const duration = Number(input.actualDurationMinutes); const notes = clean(input.notes, 2000); const laborCost = Number(input.laborCost || 0); const acceptanceStatus = clean(input.acceptanceStatus || 'pendente').toLowerCase(); const acceptedBy = clean(input.acceptedBy, 160);
        if (!(duration > 0) || !notes || !(laborCost >= 0) || laborCost > 9999999.99 || !['pendente', 'aceito', 'recusado'].includes(acceptanceStatus) || (acceptanceStatus !== 'pendente' && !acceptedBy)) return { ok: false, errors: [issue('AV-SERVICE-WORKFLOW-COMPLETION', 'completion', 'Revise duração, relato, custo e aceite da conclusão.')] };
        const completedAt = new Date(input.completedAt || Date.now()); if (Number.isNaN(completedAt.getTime())) throw coded('AV-SERVICE-WORKFLOW-STATE');
        const materials = (Array.isArray(input.materials) ? input.materials : []).slice(0, 100).map((item) => ({
          id: clean(item.id, 80), catalogItemId: UUID.test(clean(item.catalogItemId)) ? clean(item.catalogItemId) : '',
          source: item.source === 'Catálogo' ? 'catalogo' : item.source === 'Cliente' ? 'cliente' : 'externo',
          name: clean(item.name, 180), unit: clean(item.unit, 20) || 'un', quantity: Number(Number(item.quantity).toFixed(3)), cost: Number(Number(item.cost || 0).toFixed(2)),
        }));
        if (materials.some((item) => !(item.quantity >= 0) || !item.name || (item.source === 'catalogo' && !item.catalogItemId) || item.cost < 0)) return { ok: false, errors: [issue('AV-SERVICE-WORKFLOW-MATERIALS', 'materials', 'Revise os materiais e as quantidades utilizadas.')] };
        const checklist = (Array.isArray(input.checklist) ? input.checklist : []).slice(0, 100).map((item) => ({ label: clean(item.label, 240), complete: item.complete === true })).filter((item) => item.label);
        const issuerSnapshot = await issuerResolver({ companyId: context.companyId });
        const completion = { completedAt: completedAt.toISOString(), actualDurationMinutes: Math.round(duration), notes, laborCost: Number(laborCost.toFixed(2)), acceptanceStatus, acceptedBy, acceptedAt: acceptanceStatus === 'pendente' ? null : completedAt.toISOString(), acceptanceNotes: clean(input.acceptanceNotes, 1000), materials, checklist, localId: clean(localId, 36) };
        return { ok: true, result: await repository.complete({ companyId: context.companyId, actorId: context.actorId, orderId, expectedVersion, completion, issuerSnapshot, idempotencyKey }), errors: [] };
      } catch (error) { return { ok: false, errors: [publicError(error)] }; }
    },
  });
}
