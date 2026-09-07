export const COMMERCIAL_RECEIVABLE_REFERENCE = '2026-09-06';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY=/^[A-Za-z0-9:_-]{8,120}$/;
const DATE=/^(\d{4})-(\d{2})-(\d{2})$/;
const clean=(value,max=1000)=>String(value??'').trim().slice(0,max);
const issue=(code,field,message)=>({code,field,message});
const coded=(code)=>Object.assign(new Error(code),{code});

function currentBusinessDate(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=(type)=>parts.find((part)=>part.type===type)?.value||'';return `${get('year')}-${get('month')}-${get('day')}`;}
function validDate(value){const normalized=clean(value,10);const match=DATE.exec(normalized);if(!match)return false;const [year,month,day]=match.slice(1).map(Number);if(year<2000||year>2200||month<1||month>12||day<1)return false;const date=new Date(Date.UTC(year,month-1,day));return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day&&normalized<=currentBusinessDate();}
function cents(value){const raw=clean(value).replace(/R\$/gi,'').replace(/\s/g,'');const normalized=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;const match=/^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);if(!match)return null;const result=Number(match[1])*100+Number((match[2]||'').padEnd(2,'0'));return Number.isSafeInteger(result)?result:null;}
const money=(value)=>Number((value/100).toFixed(2));

function access(context,permission){
  if(!context||!UUID.test(clean(context.companyId))||!UUID.test(clean(context.actorId)))return issue('AV-RECEIVABLE-SESSION','session','Confirme novamente a sessão e o perfil empresarial.');
  if(context.moduleId&&context.moduleId!=='vendas')return issue('AV-RECEIVABLE-MODULE','module','O acesso não pertence ao módulo Vendas e Serviços.');
  if(!context.active||!context.moduleActive||context.effectivePermissions?.[permission]!==true)return issue('AV-RECEIVABLE-PERMISSION','permission','Seu acesso não permite realizar esta operação financeira.');
  return null;
}

function publicError(error){const known={
  'AV-RECEIVABLE-NOT-FOUND':['receivable','Parcela não localizada neste perfil empresarial.'],
  'AV-RECEIVABLE-CONFLICT':['version','A parcela foi alterada por outra pessoa. Atualize antes de continuar.'],
  'AV-RECEIVABLE-AMOUNT':['amount','O valor precisa ser maior que zero e não pode ultrapassar o saldo permitido.'],
  'AV-RECEIVABLE-STATE':['status','A situação da parcela não permite esta operação.'],
  'AV-RECEIVABLE-IDEMPOTENCY':['idempotencyKey','Esta solicitação já foi utilizada com outros dados. Atualize a página.'],
}[error?.code];return known?issue(error.code,known[0],known[1]):issue('AV-RECEIVABLE-STORAGE','storage','Não foi possível concluir a operação financeira. Tente novamente.');}

function map(row){return {id:row.id,operationId:row.operacao_id,customerId:row.cliente_id||'',clientName:clean(row.client_name),originLabel:clean(row.origin_label),installment:Number(row.parcela),installmentCount:Number(row.total_parcelas),dueDate:clean(row.vencimento),original:Number(row.valor_original),received:Number(row.valor_recebido),refunded:Number(row.valor_estornado),balance:Number(row.saldo_aberto),method:clean(row.meio_pagamento),accountReference:clean(row.conta_destino_referencia),status:clean(row.situacao),version:Number(row.versao),createdAt:clean(row.criado_em),updatedAt:clean(row.atualizado_em),events:Array.isArray(row.eventos)?row.eventos:[]};}

async function transaction(pool,work){for(let attempt=0;attempt<3;attempt+=1){const client=await pool.connect();try{await client.query('begin');await client.query('set transaction isolation level serializable');const result=await work(client);await client.query('commit');return result;}catch(error){try{await client.query('rollback');}catch{}if(!['40001','40P01'].includes(error?.code)||attempt===2)throw error;}finally{client.release();}}}

export function createPostgresCommercialReceivableRepository({pool}={}){
  if(!pool?.connect||!pool?.query)throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async list({companyId,query='',status='',limit=100,offset=0}){const result=await pool.query(`select conta.*,coalesce(operacao.cliente_retrato->>'displayName',operacao.cliente_retrato->>'legalName','Cliente') client_name,concat(case operacao.tipo when 'ordem_servico' then 'OS' when 'pedido' then 'Pedido' else initcap(operacao.tipo) end,' ',coalesce(operacao.ano::text||'/'||operacao.numero::text,operacao.id::text)) origin_label,coalesce((select jsonb_agg(jsonb_build_object('date',evento.data_movimentacao,'createdAt',evento.criado_em,'type',evento.tipo,'amount',evento.valor,'method',evento.meio_pagamento,'account',evento.conta_destino_referencia,'description',evento.descricao) order by evento.criado_em,evento.id) from public.vendas_contas_receber_eventos evento where evento.empresa_id=conta.empresa_id and evento.conta_receber_id=conta.id),'[]'::jsonb) eventos from public.vendas_contas_receber conta join public.vendas_operacoes operacao on operacao.empresa_id=conta.empresa_id and operacao.id=conta.operacao_id where conta.empresa_id=$1 and ($2='' or conta.situacao=$2) and ($3='' or conta.id::text ilike '%'||$3||'%' or coalesce(operacao.cliente_retrato->>'displayName','') ilike '%'||$3||'%' or coalesce(operacao.numero::text,'') ilike '%'||$3||'%') order by conta.vencimento,conta.parcela limit $4 offset $5`,[companyId,status,query,limit,offset]);return result.rows.map(map);},
    async move({companyId,actorId,receivableId,expectedVersion,idempotencyKey,type,amount,date,method,account,description}){return transaction(pool,async(client)=>{
      const repeated=await client.query('select conta_receber_id,tipo,valor from public.vendas_contas_receber_eventos where empresa_id=$1 and chave_idempotencia=$2',[companyId,idempotencyKey]);
      if(repeated.rows[0]){const row=repeated.rows[0];if(row.conta_receber_id!==receivableId||row.tipo!==type||Number(row.valor)!==amount)throw coded('AV-RECEIVABLE-IDEMPOTENCY');const current=await client.query('select * from public.vendas_contas_receber where empresa_id=$1 and id=$2',[companyId,receivableId]);return {receivable:map(current.rows[0]),reused:true};}
      const loaded=await client.query('select * from public.vendas_contas_receber where empresa_id=$1 and id=$2 for update',[companyId,receivableId]);const row=loaded.rows[0];if(!row)throw coded('AV-RECEIVABLE-NOT-FOUND');if(Number(row.versao)!==expectedVersion)throw coded('AV-RECEIVABLE-CONFLICT');if(['cancelado'].includes(row.situacao))throw coded('AV-RECEIVABLE-STATE');
      const received=Number(row.valor_recebido),refunded=Number(row.valor_estornado),open=Number(row.saldo_aberto);if(type==='recebimento'&&amount>open+0.001)throw coded('AV-RECEIVABLE-AMOUNT');if(type==='estorno_recebimento'&&amount>received-refunded+0.001)throw coded('AV-RECEIVABLE-AMOUNT');
      const nextReceived=type==='recebimento'?received+amount:received;const nextRefunded=type==='estorno_recebimento'?refunded+amount:refunded;const nextOpen=Number((Number(row.valor_original)-nextReceived+nextRefunded).toFixed(2));const nextStatus=nextOpen<=0?'recebido':nextReceived-nextRefunded>0?'parcial':'aberto';
      const updated=await client.query('update public.vendas_contas_receber set valor_recebido=$3,valor_estornado=$4,saldo_aberto=$5,situacao=$6,conta_destino_referencia=$7,atualizado_por=$8 where empresa_id=$1 and id=$2 returning *',[companyId,receivableId,nextReceived,nextRefunded,nextOpen,nextStatus,account||null,actorId]);
      await client.query('insert into public.vendas_contas_receber_eventos(empresa_id,conta_receber_id,tipo,valor,meio_pagamento,conta_destino_referencia,descricao,chave_idempotencia,criado_por,data_movimentacao) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[companyId,receivableId,type,amount,method||row.meio_pagamento,account||null,description||null,idempotencyKey,actorId,date]);
      return {receivable:map(updated.rows[0]),reused:false};
    });},
  });
}

export function createCommercialReceivableService({repository}={}){
  if(!repository?.list||!repository?.move)throw new TypeError('Informe o repositório server-side de recebimentos.');
  return Object.freeze({
    async list({context,query='',status='',limit=100,offset=0}={}){const denied=access(context,'receivables.view');if(denied)return {ok:false,receivables:[],errors:[denied]};try{return {ok:true,receivables:await repository.list({companyId:context.companyId,query:clean(query,120),status:clean(status,30),limit:Math.min(200,Math.max(1,Number(limit)||100)),offset:Math.max(0,Number(offset)||0)}),errors:[]};}catch(error){return {ok:false,receivables:[],errors:[publicError(error)]};}},
    async move({context,receivableId,expectedVersion,idempotencyKey,type,amount,date,method='',account='',description=''}={}){const permission=type==='estorno_recebimento'?'receivables.refund':'receivables.receive';const denied=access(context,permission);if(denied)return {ok:false,errors:[denied]};const amountCents=cents(amount);if(!UUID.test(clean(receivableId))||!Number.isInteger(expectedVersion)||expectedVersion<1||!KEY.test(clean(idempotencyKey))||!['recebimento','estorno_recebimento'].includes(type)||!amountCents||amountCents<1||!validDate(date))return {ok:false,errors:[issue('AV-RECEIVABLE-INPUT','receivable','Revise parcela, valor, data e tente novamente.')]};try{const result=await repository.move({companyId:context.companyId,actorId:context.actorId,receivableId,expectedVersion,idempotencyKey:clean(idempotencyKey),type,amount:money(amountCents),date:clean(date,10),method:clean(method,40),account:clean(account,160),description:clean(description,500)});return {ok:true,...result,errors:[]};}catch(error){return {ok:false,errors:[publicError(error)]};}},
  });
}
