export const COMMERCIAL_SERVICE_STOCK_REFERENCE = '2026-09-03';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,100}$/;
const RETRY = new Set(['40001', '40P01']);
const clean = (value) => String(value ?? '').trim();
const issue = (code, field, message) => ({ code, field, message });
const coded = (code) => Object.assign(new Error(code), { code });

function accessError(context, permission) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) return issue('AV-COMMERCIAL-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  if (context.moduleId && context.moduleId !== 'vendas') return issue('AV-COMMERCIAL-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  if (!context.active || !context.moduleActive || context.effectivePermissions?.[permission] !== true) return issue('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite movimentar o estoque.');
  return null;
}

function publicError(error) {
  const known = {
    'AV-SERVICE-STOCK-NOT-FOUND': ['operation', 'Ordem de serviço ou estoque não localizado nesta empresa.'],
    'AV-SERVICE-STOCK-STATE': ['status', 'A ordem de serviço não está na etapa correta para esta movimentação.'],
    'AV-SERVICE-STOCK-BALANCE': ['stock', 'Estoque disponível insuficiente para reservar os materiais da ordem.'],
    'AV-SERVICE-STOCK-RESERVATION': ['stock', 'A reserva dos materiais está incompleta ou já foi movimentada.'],
    'AV-SERVICE-STOCK-USAGE': ['materials', 'A quantidade utilizada ultrapassa a quantidade reservada.'],
    'AV-SERVICE-STOCK-IDEMPOTENCY': ['idempotencyKey', 'Esta solicitação já foi usada para outra movimentação.'],
  }[error?.code];
  return known ? issue(error.code, known[0], known[1]) : issue('AV-SERVICE-STOCK-STORAGE', 'storage', 'Não foi possível movimentar o estoque. Tente novamente.');
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
      if (!RETRY.has(error?.code) || attempt === 2) throw error;
    } finally { client.release(); }
  }
}

async function loadOperation(client, companyId, orderId) {
  const result = await client.query("select id,situacao,situacao_estoque,versao from public.vendas_operacoes where empresa_id=$1 and id=$2 and tipo='ordem_servico' and canal='servicos' for update", [companyId, orderId]);
  return result.rows[0] || null;
}

async function alreadyDone(client, companyId, key, orderId) {
  const result = await client.query("select recurso_id,evento,metadados from public.vendas_eventos where empresa_id=$1 and chave_idempotencia=$2", [companyId, key]);
  if (!result.rows[0]) return null;
  if (result.rows[0].recurso_id !== orderId) throw coded('AV-SERVICE-STOCK-IDEMPOTENCY');
  return { reused: true, event: result.rows[0].evento, ...result.rows[0].metadados };
}

async function recordEvent(client, { companyId, orderId, actorId, key, name, summary, metadata }) {
  await client.query("insert into public.vendas_eventos(empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,chave_idempotencia,criado_por) values($1,'ordem_servico',$2,$3,$4,$5::jsonb,$6,$7)", [companyId, orderId, name, summary, JSON.stringify(metadata), key, actorId]);
}

async function materials(client, companyId, orderId, reservationStatus = '') {
  const result = await client.query(reservationStatus ? `
    select m.*,r.id reserva_id,r.saldo_id,r.quantidade reserva_quantidade,r.situacao reserva_situacao,
      s.saldo_fisico,s.saldo_reservado,s.permite_negativo
    from public.vendas_os_materiais m
    join public.vendas_estoque_reservas r on r.empresa_id=m.empresa_id and r.os_material_id=m.id
    join public.vendas_estoque_saldos s on s.empresa_id=r.empresa_id and s.id=r.saldo_id
    where m.empresa_id=$1 and m.operacao_id=$2 and m.origem='catalogo' and r.situacao=$3
    order by m.id for update of m,r,s
  ` : `select * from public.vendas_os_materiais where empresa_id=$1 and operacao_id=$2 and origem='catalogo' order by id for update`, reservationStatus ? [companyId, orderId, reservationStatus] : [companyId, orderId]);
  return result.rows;
}

export function createPostgresCommercialServiceStockRepository({ pool } = {}) {
  if (!pool?.connect) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async reserve({ companyId, actorId, orderId, localId, idempotencyKey }) {
      return transaction(pool, async (client) => {
        const repeated = await alreadyDone(client, companyId, idempotencyKey, orderId); if (repeated) return repeated;
        const operation = await loadOperation(client, companyId, orderId);
        if (!operation) throw coded('AV-SERVICE-STOCK-NOT-FOUND');
        if (!['agendado','em_execucao'].includes(operation.situacao) || !['sem_movimentacao','liberado'].includes(operation.situacao_estoque)) throw coded('AV-SERVICE-STOCK-STATE');
        const local = await client.query('select id from public.vendas_estoque_locais where empresa_id=$1 and id=$2 and ativo for update', [companyId, localId]);
        if (!local.rows[0]) throw coded('AV-SERVICE-STOCK-NOT-FOUND');
        const rows = await materials(client, companyId, orderId);
        if (!rows.length) throw coded('AV-SERVICE-STOCK-NOT-FOUND');
        let reserved = 0;
        for (const material of rows) {
          const balanceResult = await client.query('select * from public.vendas_estoque_saldos where empresa_id=$1 and local_id=$2 and produto_id=$3 for update', [companyId, localId, material.produto_id]);
          const balance = balanceResult.rows[0];
          if (!balance || (!balance.permite_negativo && Number(balance.saldo_fisico) - Number(balance.saldo_reservado) < Number(material.quantidade_prevista))) throw coded('AV-SERVICE-STOCK-BALANCE');
          const before = Number(balance.saldo_reservado), quantity = Number(material.quantidade_prevista), after = before + quantity;
          await client.query('update public.vendas_estoque_saldos set saldo_reservado=$3 where empresa_id=$1 and id=$2', [companyId, balance.id, after]);
          const reservation = await client.query("insert into public.vendas_estoque_reservas(empresa_id,saldo_id,operacao_id,os_material_id,quantidade,chave_idempotencia,criado_por) values($1,$2,$3,$4,$5,$6,$7) returning id", [companyId,balance.id,orderId,material.id,quantity,`${idempotencyKey}:${material.id}`,actorId]);
          await client.query("insert into public.vendas_estoque_movimentos(empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,saldo_reservado_final,chave_idempotencia,criado_por) values($1,$2,$3,$4,'reserva',$5,$6,$6,$7,$8,$9,$10)", [companyId,balance.id,reservation.rows[0].id,orderId,quantity,Number(balance.saldo_fisico),before,after,`${idempotencyKey}:${material.id}:mov`,actorId]);
          await client.query("update public.vendas_os_materiais set situacao_estoque='reservado',atualizado_em=now() where empresa_id=$1 and id=$2",[companyId,material.id]);
          reserved += quantity;
        }
        const updated = await client.query("update public.vendas_operacoes set situacao_estoque='reservado',atualizado_por=$3 where empresa_id=$1 and id=$2 returning versao",[companyId,orderId,actorId]);
        const metadata={quantity:Number(reserved.toFixed(3)),operationVersion:Number(updated.rows[0].versao),localId};
        await recordEvent(client,{companyId,orderId,actorId,key:idempotencyKey,name:'materiais_reservados',summary:'Materiais da ordem de serviço reservados.',metadata});
        return {reused:false,event:'materiais_reservados',...metadata};
      });
    },
    async consume({ companyId, actorId, orderId, idempotencyKey }) {
      return transaction(pool, async (client) => {
        const repeated=await alreadyDone(client,companyId,idempotencyKey,orderId);if(repeated)return repeated;
        const operation=await loadOperation(client,companyId,orderId);
        if(!operation)throw coded('AV-SERVICE-STOCK-NOT-FOUND');
        if(operation.situacao!=='concluido'||operation.situacao_estoque!=='reservado')throw coded('AV-SERVICE-STOCK-STATE');
        const rows=await materials(client,companyId,orderId,'ativa');if(!rows.length)throw coded('AV-SERVICE-STOCK-RESERVATION');
        let consumed=0,released=0;
        for(const row of rows){const used=Number(row.quantidade_utilizada),reserved=Number(row.reserva_quantidade);if(used<0||used>reserved)throw coded('AV-SERVICE-STOCK-USAGE');const physical=Number(row.saldo_fisico),held=Number(row.saldo_reservado);if(!row.permite_negativo&&physical<used)throw coded('AV-SERVICE-STOCK-BALANCE');const remainder=reserved-used,nextPhysical=physical-used,nextHeld=held-reserved;
          await client.query('update public.vendas_estoque_saldos set saldo_fisico=$3,saldo_reservado=$4 where empresa_id=$1 and id=$2',[companyId,row.saldo_id,nextPhysical,nextHeld]);
          await client.query("update public.vendas_estoque_reservas set situacao='consumida',atualizado_em=now() where empresa_id=$1 and id=$2",[companyId,row.reserva_id]);
          if(used>0)await client.query("insert into public.vendas_estoque_movimentos(empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,saldo_reservado_final,chave_idempotencia,criado_por) values($1,$2,$3,$4,'saida_servico',$5,$6,$7,$8,$9,$10,$11)",[companyId,row.saldo_id,row.reserva_id,orderId,-used,physical,nextPhysical,held,held-used,`${idempotencyKey}:${row.id}:saida`,actorId]);
          if(remainder>0)await client.query("insert into public.vendas_estoque_movimentos(empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,saldo_reservado_final,chave_idempotencia,criado_por) values($1,$2,$3,$4,'liberacao',$5,$6,$6,$7,$8,$9,$10)",[companyId,row.saldo_id,row.reserva_id,orderId,-remainder,nextPhysical,held-used,nextHeld,`${idempotencyKey}:${row.id}:sobra`,actorId]);
          await client.query(`update public.vendas_os_materiais set situacao_estoque=$3,atualizado_em=now() where empresa_id=$1 and id=$2`,[companyId,row.id,used>0?'baixado':'liberado']);consumed+=used;released+=remainder;
        }
        const updated=await client.query("update public.vendas_operacoes set situacao_estoque='baixado',atualizado_por=$3 where empresa_id=$1 and id=$2 returning versao",[companyId,orderId,actorId]);const metadata={consumed:Number(consumed.toFixed(3)),released:Number(released.toFixed(3)),operationVersion:Number(updated.rows[0].versao)};await recordEvent(client,{companyId,orderId,actorId,key:idempotencyKey,name:'materiais_baixados',summary:'Materiais utilizados na ordem baixados do estoque.',metadata});return{reused:false,event:'materiais_baixados',...metadata};
      });
    },
    async release({ companyId, actorId, orderId, idempotencyKey }) {
      return transaction(pool, async(client)=>{const repeated=await alreadyDone(client,companyId,idempotencyKey,orderId);if(repeated)return repeated;const operation=await loadOperation(client,companyId,orderId);if(!operation)throw coded('AV-SERVICE-STOCK-NOT-FOUND');if(operation.situacao_estoque!=='reservado')throw coded('AV-SERVICE-STOCK-STATE');const rows=await materials(client,companyId,orderId,'ativa');if(!rows.length)throw coded('AV-SERVICE-STOCK-RESERVATION');let released=0;for(const row of rows){const qty=Number(row.reserva_quantidade),before=Number(row.saldo_reservado),after=before-qty;await client.query('update public.vendas_estoque_saldos set saldo_reservado=$3 where empresa_id=$1 and id=$2',[companyId,row.saldo_id,after]);await client.query("update public.vendas_estoque_reservas set situacao='liberada',atualizado_em=now() where empresa_id=$1 and id=$2",[companyId,row.reserva_id]);await client.query("insert into public.vendas_estoque_movimentos(empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,saldo_reservado_final,chave_idempotencia,criado_por) values($1,$2,$3,$4,'liberacao',$5,$6,$6,$7,$8,$9,$10)",[companyId,row.saldo_id,row.reserva_id,orderId,-qty,Number(row.saldo_fisico),before,after,`${idempotencyKey}:${row.id}`,actorId]);await client.query("update public.vendas_os_materiais set situacao_estoque='liberado',atualizado_em=now() where empresa_id=$1 and id=$2",[companyId,row.id]);released+=qty;}const updated=await client.query("update public.vendas_operacoes set situacao_estoque='liberado',atualizado_por=$3 where empresa_id=$1 and id=$2 returning versao",[companyId,orderId,actorId]);const metadata={released:Number(released.toFixed(3)),operationVersion:Number(updated.rows[0].versao)};await recordEvent(client,{companyId,orderId,actorId,key:idempotencyKey,name:'reserva_liberada',summary:'Reserva de materiais da ordem liberada.',metadata});return{reused:false,event:'reserva_liberada',...metadata};});
    },
    async returnConsumed({ companyId, actorId, orderId, idempotencyKey }) {
      return transaction(pool,async(client)=>{const repeated=await alreadyDone(client,companyId,idempotencyKey,orderId);if(repeated)return repeated;const operation=await loadOperation(client,companyId,orderId);if(!operation)throw coded('AV-SERVICE-STOCK-NOT-FOUND');if(operation.situacao_estoque!=='baixado')throw coded('AV-SERVICE-STOCK-STATE');const rows=await materials(client,companyId,orderId,'consumida');if(!rows.length)throw coded('AV-SERVICE-STOCK-RESERVATION');let returned=0;for(const row of rows){const qty=Number(row.quantidade_utilizada);if(qty>0){const before=Number(row.saldo_fisico),after=before+qty;await client.query('update public.vendas_estoque_saldos set saldo_fisico=$3 where empresa_id=$1 and id=$2',[companyId,row.saldo_id,after]);await client.query("insert into public.vendas_estoque_movimentos(empresa_id,saldo_id,reserva_id,operacao_id,tipo,quantidade,saldo_fisico_anterior,saldo_fisico_final,saldo_reservado_anterior,saldo_reservado_final,chave_idempotencia,criado_por) values($1,$2,$3,$4,'devolucao',$5,$6,$7,$8,$8,$9,$10)",[companyId,row.saldo_id,row.reserva_id,orderId,qty,before,after,Number(row.saldo_reservado),`${idempotencyKey}:${row.id}`,actorId]);returned+=qty;}await client.query("update public.vendas_estoque_reservas set situacao='devolvida',atualizado_em=now() where empresa_id=$1 and id=$2",[companyId,row.reserva_id]);await client.query("update public.vendas_os_materiais set situacao_estoque='estornado',atualizado_em=now() where empresa_id=$1 and id=$2",[companyId,row.id]);}const updated=await client.query("update public.vendas_operacoes set situacao_estoque='devolvido',atualizado_por=$3 where empresa_id=$1 and id=$2 returning versao",[companyId,orderId,actorId]);const metadata={returned:Number(returned.toFixed(3)),operationVersion:Number(updated.rows[0].versao)};await recordEvent(client,{companyId,orderId,actorId,key:idempotencyKey,name:'materiais_devolvidos',summary:'Baixa de materiais da ordem estornada ao estoque.',metadata});return{reused:false,event:'materiais_devolvidos',...metadata};});
    },
  });
}

export function createCommercialServiceStockService({ repository } = {}) {
  if (!repository?.reserve || !repository?.consume || !repository?.release || !repository?.returnConsumed) throw new TypeError('Informe o repositório de estoque da ordem.');
  const run = (method, permission, requiresLocal = false) => async ({ context, orderId, localId, idempotencyKey } = {}) => {
    const no = accessError(context, permission); if (no) return { ok:false,errors:[no] };
    if (!UUID.test(clean(orderId)) || (requiresLocal ? !UUID.test(clean(localId)) : localId !== undefined && !UUID.test(clean(localId))) || !KEY.test(clean(idempotencyKey))) return {ok:false,errors:[issue('AV-SERVICE-STOCK-INPUT','stock','Atualize a ordem e selecione um estoque válido.')]};
    try { return {ok:true,result:await repository[method]({companyId:context.companyId,actorId:context.actorId,orderId,localId,idempotencyKey:clean(idempotencyKey)}),errors:[]}; }
    catch(error){return{ok:false,errors:[publicError(error)]};}
  };
  return Object.freeze({reserve:run('reserve','stock.exit',true),consume:run('consume','stock.exit'),release:run('release','stock.exit'),returnConsumed:run('returnConsumed','stock.adjust')});
}
