import { createHash } from 'node:crypto';

export const COMMERCIAL_SERVICE_ORDER_REFERENCE = '2026-09-03';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,160}$/;
const RETRY = new Set(['40001', '40P01']);

const clean = (v, max = 1000) => String(v ?? '').trim().slice(0, max);
const fail = (code, field, message) => ({ code, field, message });
const appError = (code) => Object.assign(new Error(code), { code });

function denied(context, permission) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) return fail('AV-COMMERCIAL-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  if (context.moduleId && context.moduleId !== 'vendas') return fail('AV-COMMERCIAL-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  if (!context.active || !context.moduleActive || context.effectivePermissions?.[permission] !== true) return fail('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite realizar esta ação na ordem de serviço.');
  return null;
}

function publicError(cause) {
  const known = {
    'AV-SERVICE-ORDER-NOT-FOUND': ['operation', 'Ordem de serviço não localizada nesta empresa.'],
    'AV-SERVICE-ORDER-CONFLICT': ['version', 'A ordem foi alterada por outra pessoa. Atualize antes de continuar.'],
    'AV-SERVICE-ORDER-STATE': ['status', 'A ordem de serviço não está na etapa correta para esta ação.'],
    'AV-SERVICE-ORDER-CONVERTED': ['operation', 'Este orçamento de serviço já foi convertido.'],
    'AV-SERVICE-ORDER-IDEMPOTENCY': ['idempotencyKey', 'Esta solicitação já foi usada com outro conteúdo.'],
  }[cause?.code];
  return known ? fail(cause.code, known[0], known[1]) : fail('AV-SERVICE-ORDER-STORAGE', 'storage', 'Não foi possível concluir a operação. Tente novamente.');
}

async function tx(pool, work) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query('begin'); await client.query('set transaction isolation level serializable');
      const result = await work(client); await client.query('commit'); return result;
    } catch (cause) {
      try { await client.query('rollback'); } catch {}
      if (!RETRY.has(cause?.code) || attempt === 2) throw cause;
    } finally { client.release(); }
  }
}

async function event(client, companyId, id, name, summary, actorId, metadata = {}) {
  await client.query("insert into public.vendas_eventos(empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,criado_por) values($1,'ordem_servico',$2,$3,$4,$5::jsonb,$6)", [companyId, id, name, summary, JSON.stringify(metadata), actorId]);
}

async function load(client, companyId, id) {
  const base = await client.query(`select o.*,s.agendado_para,s.duracao_prevista_minutos,s.tecnico_id,s.tecnico_nome,s.local_execucao,s.contato_no_local,s.iniciado_em,s.concluido_em,s.duracao_real_minutos,s.observacoes_execucao,s.aceite_situacao,s.aceite_por,s.aceite_em,s.aceite_observacoes,s.custo_mao_obra,s.custo_materiais,s.custo_real_total from public.vendas_operacoes o join public.vendas_ordens_servico s on s.empresa_id=o.empresa_id and s.operacao_id=o.id where o.empresa_id=$1 and o.id=$2`, [companyId, id]);
  if (!base.rows[0]) return null;
  const [checklist, materials] = await Promise.all([
    client.query('select * from public.vendas_os_checklist where empresa_id=$1 and operacao_id=$2 order by posicao,id', [companyId, id]),
    client.query('select * from public.vendas_os_materiais where empresa_id=$1 and operacao_id=$2 order by criado_em,id', [companyId, id]),
  ]);
  const r = base.rows[0];
  return {
    id: r.id, companyId: r.empresa_id, year: Number(r.ano), number: Number(r.numero), status: r.situacao,
    version: Number(r.versao), convertedFromId: r.convertido_de_id, customerSnapshot: r.cliente_retrato,
    total: Number(r.total), scheduledAt: r.agendado_para?.toISOString?.() || String(r.agendado_para || ''),
    expectedDurationMinutes: r.duracao_prevista_minutos, technicianId: r.tecnico_id || '', technicianName: r.tecnico_nome || '',
    executionLocation: r.local_execucao || '', onSiteContact: r.contato_no_local || '', startedAt: r.iniciado_em,
    completedAt: r.concluido_em, actualDurationMinutes: r.duracao_real_minutos,
    completionNotes: r.observacoes_execucao || '', acceptanceStatus: r.aceite_situacao,
    acceptedBy: r.aceite_por || '', acceptedAt: r.aceite_em, acceptanceNotes: r.aceite_observacoes || '',
    laborCost: Number(r.custo_mao_obra), materialCost: Number(r.custo_materiais), actualCost: Number(r.custo_real_total),
    checklist: checklist.rows.map((x) => ({ id: x.id, position: x.posicao, description: x.descricao, completed: x.concluido, completedAt: x.concluido_em })),
    materials: materials.rows.map((x) => ({ id: x.id, productId: x.produto_id || '', origin: x.origem, name: x.nome, unit: x.unidade, plannedQuantity: Number(x.quantidade_prevista), usedQuantity: Number(x.quantidade_utilizada), costUnitSnapshot: Number(x.custo_unitario_retrato), stockStatus: x.situacao_estoque })),
  };
}

export function createPostgresCommercialServiceOrderRepository({ pool } = {}) {
  if (!pool?.connect) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async convert({ companyId, actorId, quoteId, expectedVersion, idempotencyKey, schedule, checklist, materials }) {
      return tx(pool, async (client) => {
        await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [`vendas:os:${companyId}:${idempotencyKey}`]);
        const repeat = await client.query("select id,convertido_de_id from public.vendas_operacoes where empresa_id=$1 and chave_idempotencia=$2 and tipo='ordem_servico'", [companyId, idempotencyKey]);
        if (repeat.rows[0]) {
          if (repeat.rows[0].convertido_de_id !== quoteId) throw appError('AV-SERVICE-ORDER-IDEMPOTENCY');
          return { order: await load(client, companyId, repeat.rows[0].id), reused: true };
        }
        const source = await client.query('select * from public.vendas_operacoes where empresa_id=$1 and id=$2 for update', [companyId, quoteId]);
        const q = source.rows[0];
        if (!q) throw appError('AV-SERVICE-ORDER-NOT-FOUND');
        if (Number(q.versao) !== expectedVersion) throw appError('AV-SERVICE-ORDER-CONFLICT');
        if (q.tipo !== 'orcamento' || q.canal !== 'servicos' || !['salvo','enviado','em_negociacao','aprovado'].includes(q.situacao)) throw appError('AV-SERVICE-ORDER-STATE');
        if ((await client.query('select 1 from public.vendas_operacoes where empresa_id=$1 and convertido_de_id=$2', [companyId, quoteId])).rows[0]) throw appError('AV-SERVICE-ORDER-CONVERTED');
        const hash = createHash('sha256').update(`${q.conteudo_hash}:ordem_servico:${idempotencyKey}`).digest('hex');
        const target = await client.query(`insert into public.vendas_operacoes(empresa_id,tipo,canal,cliente_id,cliente_retrato,tabela_preco_id,tabela_preco_retrato,vendedor_id,vendedor_nome,situacao,convertido_de_id,subtotal_bruto,desconto_itens,desconto_geral,frete,seguro,outras_despesas,total,pagamento_retrato,entrega_retrato,documento_fiscal_solicitado,situacao_fiscal,situacao_estoque,observacoes_cliente,observacoes_internas,chave_idempotencia,conteudo_hash,criado_por,atualizado_por) select empresa_id,'ordem_servico','servicos',cliente_id,cliente_retrato,tabela_preco_id,tabela_preco_retrato,vendedor_id,vendedor_nome,'salvo',$3,subtotal_bruto,desconto_itens,desconto_geral,frete,seguro,outras_despesas,total,pagamento_retrato,entrega_retrato,documento_fiscal_solicitado,situacao_fiscal,'sem_movimentacao',observacoes_cliente,observacoes_internas,$4,$5,$6,$6 from public.vendas_operacoes where empresa_id=$1 and id=$2 returning id`, [companyId, quoteId, quoteId, idempotencyKey, hash, actorId]);
        const id = target.rows[0].id;
        await client.query(`insert into public.vendas_operacao_itens(empresa_id,operacao_id,posicao,produto_id,tipo_item,sku,nome,descricao,unidade,quantidade,preco_unitario,desconto_unitario,valor_bruto,valor_desconto,valor_liquido,custo_unitario_retrato,fiscal_retrato,fiscal_pronto,controla_estoque) select empresa_id,$3,posicao,produto_id,tipo_item,sku,nome,descricao,unidade,quantidade,preco_unitario,desconto_unitario,valor_bruto,valor_desconto,valor_liquido,custo_unitario_retrato,fiscal_retrato,fiscal_pronto,controla_estoque from public.vendas_operacao_itens where empresa_id=$1 and operacao_id=$2`, [companyId, quoteId, id]);
        await client.query(`insert into public.vendas_ordens_servico(operacao_id,empresa_id,agendado_para,duracao_prevista_minutos,tecnico_id,tecnico_nome,local_execucao,contato_no_local,atualizado_por) values($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, companyId, schedule.scheduledAt, schedule.expectedDurationMinutes, schedule.technicianId, schedule.technicianName, schedule.executionLocation, schedule.onSiteContact, actorId]);
        for (let i=0;i<checklist.length;i+=1) await client.query('insert into public.vendas_os_checklist(empresa_id,operacao_id,posicao,descricao) values($1,$2,$3,$4)', [companyId,id,i+1,checklist[i]]);
        for (const m of materials) await client.query(`insert into public.vendas_os_materiais(empresa_id,operacao_id,produto_id,origem,sku,nome,unidade,quantidade_prevista,custo_unitario_retrato,situacao_estoque) values($1,$2,$3,'catalogo',$4,$5,$6,$7,$8,'pendente')`, [companyId,id,m.productId,m.sku||null,m.name,m.unit,m.plannedQuantity,m.costUnitSnapshot]);
        await client.query('select * from public.vendas_reservar_numero_operacao($1,$2)', [companyId,id]);
        await client.query("update public.vendas_operacoes set situacao='agendado',atualizado_por=$3 where empresa_id=$1 and id=$2",[companyId,id,actorId]);
        if(q.situacao!=='aprovado') await client.query("update public.vendas_operacoes set situacao='aprovado',atualizado_por=$3 where empresa_id=$1 and id=$2",[companyId,quoteId,actorId]);
        const order=await load(client,companyId,id);
        await event(client,companyId,id,'ordem_servico_criada',`Ordem de serviço ${order.year}/${order.number} agendada.`,actorId,{quoteId,version:order.version});
        return { order, reused:false };
      });
    },
    async start({ companyId, actorId, orderId, expectedVersion, startedAt }) {
      return tx(pool, async (client) => {
        const op=await client.query("update public.vendas_operacoes set situacao='em_execucao',atualizado_por=$4 where empresa_id=$1 and id=$2 and versao=$3 and tipo='ordem_servico' and situacao='agendado' returning *",[companyId,orderId,expectedVersion,actorId]);
        if(!op.rows[0]) throw appError((await client.query('select 1 from public.vendas_operacoes where empresa_id=$1 and id=$2',[companyId,orderId])).rows[0]?'AV-SERVICE-ORDER-CONFLICT':'AV-SERVICE-ORDER-NOT-FOUND');
        await client.query('update public.vendas_ordens_servico set iniciado_em=$3,atualizado_por=$4 where empresa_id=$1 and operacao_id=$2',[companyId,orderId,startedAt,actorId]);
        await event(client,companyId,orderId,'ordem_servico_iniciada','Execução da ordem de serviço iniciada.',actorId);
        return load(client,companyId,orderId);
      });
    },
    async complete({ companyId, actorId, orderId, expectedVersion, completion }) {
      return tx(pool, async (client) => {
        const op=await client.query("update public.vendas_operacoes set situacao='concluido',concluido_em=$4,atualizado_por=$5 where empresa_id=$1 and id=$2 and versao=$3 and tipo='ordem_servico' and situacao='em_execucao' returning *",[companyId,orderId,expectedVersion,completion.completedAt,actorId]);
        if(!op.rows[0]) throw appError((await client.query('select 1 from public.vendas_operacoes where empresa_id=$1 and id=$2',[companyId,orderId])).rows[0]?'AV-SERVICE-ORDER-CONFLICT':'AV-SERVICE-ORDER-NOT-FOUND');
        for(const usage of completion.materialUsage) await client.query('update public.vendas_os_materiais set quantidade_utilizada=$3,atualizado_em=now() where empresa_id=$1 and operacao_id=$2 and id=$4',[companyId,orderId,usage.quantity,usage.id]);
        const costs=await client.query('select coalesce(sum(quantidade_utilizada*custo_unitario_retrato),0)::numeric(14,2) total from public.vendas_os_materiais where empresa_id=$1 and operacao_id=$2',[companyId,orderId]);
        const materialCost=Number(costs.rows[0].total), actualCost=Number((completion.laborCost+materialCost).toFixed(2));
        await client.query(`update public.vendas_ordens_servico set concluido_em=$3,duracao_real_minutos=$4,observacoes_execucao=$5,aceite_situacao=$6,aceite_por=$7,aceite_em=$8,aceite_observacoes=$9,custo_mao_obra=$10,custo_materiais=$11,custo_real_total=$12,atualizado_por=$13 where empresa_id=$1 and operacao_id=$2`,[companyId,orderId,completion.completedAt,completion.actualDurationMinutes,completion.notes,completion.acceptanceStatus,completion.acceptedBy||null,completion.acceptedAt,completion.acceptanceNotes||null,completion.laborCost,materialCost,actualCost,actorId]);
        for(const id of completion.completedChecklistIds) await client.query('update public.vendas_os_checklist set concluido=true,concluido_por=$3,concluido_em=$4 where empresa_id=$1 and operacao_id=$2 and id=$5',[companyId,orderId,actorId,completion.completedAt,id]);
        await event(client,companyId,orderId,'ordem_servico_concluida','Ordem de serviço concluída.',actorId,{actualDurationMinutes:completion.actualDurationMinutes,acceptanceStatus:completion.acceptanceStatus,actualCost});
        return load(client,companyId,orderId);
      });
    },
    async get({companyId,orderId}) { const client=await pool.connect(); try{return await load(client,companyId,orderId);}finally{client.release();} },
  });
}

export function createCommercialServiceOrderService({ repository, materialResolver } = {}) {
  if(!repository?.convert||!repository?.start||!repository?.complete) throw new TypeError('Informe o repositório de ordens de serviço.');
  if(typeof materialResolver!=='function') throw new TypeError('Informe o resolvedor server-side de materiais.');
  return Object.freeze({
    async get({context,orderId}={}){const no=denied(context,'services.view');if(no)return{ok:false,errors:[no]};if(!UUID.test(clean(orderId)))return{ok:false,errors:[fail('AV-SERVICE-ORDER-INPUT','operation','Selecione uma ordem de serviço válida.')]};try{const order=await repository.get({companyId:context.companyId,orderId});return order?{ok:true,order,errors:[]}:{ok:false,errors:[publicError(appError('AV-SERVICE-ORDER-NOT-FOUND'))]};}catch(cause){return{ok:false,errors:[publicError(cause)]};}},
    async convert({context,quoteId,expectedVersion,idempotencyKey,input={}}={}) {
      const no=denied(context,'services.create')||denied(context,'services.edit'); if(no)return{ok:false,errors:[no]};
      const scheduledAt=new Date(input.scheduledAt); const duration=Number(input.expectedDurationMinutes); const technicianName=clean(input.technicianName,120);
      if(!UUID.test(clean(quoteId))||!Number.isInteger(expectedVersion)||expectedVersion<1||!KEY.test(clean(idempotencyKey))||Number.isNaN(scheduledAt.getTime())||duration<1||duration>10080||!technicianName)return{ok:false,errors:[fail('AV-SERVICE-ORDER-INPUT','schedule','Informe orçamento, agenda, duração e responsável válidos.')]};
      const rawMaterials=Array.isArray(input.materials)?input.materials:[]; const ids=rawMaterials.map(x=>clean(x.catalogItemId,36));
      const resolved=await materialResolver({companyId:context.companyId,itemIds:ids}); const map=new Map((resolved||[]).map(x=>[x.id,x])); const materials=[];
      for(let i=0;i<rawMaterials.length;i+=1){const source=map.get(ids[i]),qty=Number(rawMaterials[i].plannedQuantity);if(!source||source.type!=='produto'||!source.active||!source.published||!(qty>0)){return{ok:false,errors:[fail('AV-SERVICE-ORDER-MATERIAL',`materials.${i}`,'Selecione materiais ativos e informe quantidades válidas.')]};}materials.push({productId:source.id,sku:clean(source.sku,80),name:clean(source.name,180),unit:clean(source.unit||'un',20),plannedQuantity:Number(qty.toFixed(3)),costUnitSnapshot:Number(Number(source.costPrice||0).toFixed(2))});}
      const checklist=(Array.isArray(input.checklist)?input.checklist:[]).map(x=>clean(x,240)).filter(Boolean).slice(0,100);
      try{const result=await repository.convert({companyId:context.companyId,actorId:context.actorId,quoteId,expectedVersion,idempotencyKey:clean(idempotencyKey),schedule:{scheduledAt:scheduledAt.toISOString(),expectedDurationMinutes:duration,technicianId:UUID.test(clean(input.technicianId))?clean(input.technicianId):null,technicianName,executionLocation:clean(input.executionLocation,240),onSiteContact:clean(input.onSiteContact,120)},checklist,materials});return{ok:true,...result,errors:[]};}catch(cause){return{ok:false,errors:[publicError(cause)]};}
    },
    async start({context,orderId,expectedVersion,startedAt=new Date().toISOString()}={}){const no=denied(context,'services.edit');if(no)return{ok:false,errors:[no]};try{return{ok:true,order:await repository.start({companyId:context.companyId,actorId:context.actorId,orderId,expectedVersion,startedAt:new Date(startedAt).toISOString()}),errors:[]};}catch(cause){return{ok:false,errors:[publicError(cause)]};}},
    async complete({context,orderId,expectedVersion,input={}}={}){const no=denied(context,'services.complete');if(no)return{ok:false,errors:[no]};const duration=Number(input.actualDurationMinutes),notes=clean(input.notes,2000),labor=Number(input.laborCost||0),status=clean(input.acceptanceStatus||'pendente').toLowerCase(),acceptedBy=clean(input.acceptedBy,160);if(!UUID.test(clean(orderId))||!Number.isInteger(expectedVersion)||expectedVersion<1||!(duration>0)||!notes||labor<0||labor>9999999.99||!['pendente','aceito','recusado'].includes(status)||(status!=='pendente'&&!acceptedBy))return{ok:false,errors:[fail('AV-SERVICE-ORDER-COMPLETION','completion','Revise duração, relato, custo e aceite da conclusão.')]};const completedAt=new Date(input.completedAt||Date.now()).toISOString();const materialUsage=(Array.isArray(input.materialUsage)?input.materialUsage:[]).filter(x=>UUID.test(clean(x.id))&&Number(x.quantity)>=0).map(x=>({id:clean(x.id),quantity:Number(Number(x.quantity).toFixed(3))}));try{return{ok:true,order:await repository.complete({companyId:context.companyId,actorId:context.actorId,orderId,expectedVersion,completion:{completedAt,actualDurationMinutes:duration,notes,laborCost:Number(labor.toFixed(2)),acceptanceStatus:status,acceptedBy,acceptedAt:status==='pendente'?null:completedAt,acceptanceNotes:clean(input.acceptanceNotes,1000),materialUsage,completedChecklistIds:(Array.isArray(input.completedChecklistIds)?input.completedChecklistIds:[]).filter(x=>UUID.test(clean(x)))} }),errors:[]};}catch(cause){return{ok:false,errors:[publicError(cause)]};}},
  });
}
