import {createHash} from 'node:crypto';
import {paymentMethodKey} from '../payment-methods.mjs';

const fail=code=>{throw Object.assign(new Error(code),{code});};
export function paymentSchedule(totalCents,count,firstDueDate){
  if(!Number.isSafeInteger(totalCents)||totalCents<count||!Number.isInteger(count)||count<1||count>120)fail('AV-RECEIVABLE-INPUT');
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(firstDueDate||'');
  if(!match)fail('AV-RECEIVABLE-INPUT');
  const [year,month,day]=match.slice(1).map(Number),first=new Date(Date.UTC(year,month-1,day));
  if(year<2000||year>2200||first.getUTCFullYear()!==year||first.getUTCMonth()!==month-1||first.getUTCDate()!==day)fail('AV-RECEIVABLE-INPUT');
  const base=Math.floor(totalCents/count);
  return Array.from({length:count},(_,index)=>{
    const start=new Date(Date.UTC(year,month-1+index,1)),last=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();
    const due=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),Math.min(day,last)));
    return {number:index+1,amount:(base+(index===count-1?totalCents-base*count:0))/100,dueDate:due.toISOString().slice(0,10)};
  });
}

/** Called inside the same serializable transaction as the existing receipt repository. */
export async function changeReceivableTerms(client,{companyId,actorId,receivableId,idempotencyKey,method,installments,firstDueDate,expectedVersions,allowedTypes,preserveMethod=false}){
  const fingerprint=createHash('sha256').update(JSON.stringify({receivableId,method,installments,firstDueDate,expectedVersions:[...expectedVersions].sort((a,b)=>a.id.localeCompare(b.id))})).digest('hex');
  const replay=await client.query('select recurso_id,metadados from public.vendas_eventos where empresa_id=$1 and chave_idempotencia=$2',[companyId,idempotencyKey]);
  if(replay.rows[0]){
    if(replay.rows[0].metadados?.fingerprint!==fingerprint)fail('AV-RECEIVABLE-IDEMPOTENCY');
    return {receivable:{id:replay.rows[0].recurso_id},reused:true};
  }
  // Lock the operation before installments, matching billing/cancellation order.
  const op=await client.query('select o.* from public.vendas_operacoes o join public.vendas_contas_receber r on r.empresa_id=o.empresa_id and r.operacao_id=o.id where r.empresa_id=$1 and r.id=$2 for update of o',[companyId,receivableId]);
  const operation=op.rows[0];if(!operation)fail('AV-RECEIVABLE-NOT-FOUND');
  if(!allowedTypes.includes(operation.tipo))fail('AV-RECEIVABLE-PERMISSION');
  if(['cancelado','devolvido'].includes(operation.situacao))fail('AV-RECEIVABLE-STATE');
  const loaded=await client.query('select * from public.vendas_contas_receber where empresa_id=$1 and operacao_id=$2 order by parcela for update',[companyId,operation.id]);
  const all=loaded.rows,active=all.filter(r=>!['cancelado','estornado'].includes(r.situacao));
  const versions=new Map(expectedVersions.map(r=>[r.id,r.version]));
  if(versions.size!==all.length||all.some(r=>versions.get(r.id)!==Number(r.versao)))fail('AV-RECEIVABLE-CONFLICT');
  if(!active.some(r=>r.id===receivableId)||!active.some(r=>Number(r.saldo_aberto)>0))fail('AV-RECEIVABLE-STATE');
  if(preserveMethod&&!active.some(row=>row.id===receivableId&&paymentMethodKey(row.meio_pagamento)===paymentMethodKey(method)))fail('AV-RECEIVABLE-PAYMENT-INACTIVE');
  const hasMovements=all.some(r=>Number(r.valor_recebido)>0||Number(r.valor_estornado)>0);
  const consigned=method==='consignado';
  const reschedule=installments!==active.length||firstDueDate!==String(active[0].vencimento instanceof Date?active[0].vencimento.toISOString().slice(0,10):active[0].vencimento).slice(0,10);
  if(hasMovements&&(consigned||reschedule))fail('AV-RECEIVABLE-PAID');
  const before=all.map(r=>({id:r.id,installment:r.parcela,count:r.total_parcelas,amount:Number(r.valor_original),dueDate:r.vencimento,method:r.meio_pagamento,status:r.situacao}));
  let schedule=[];
  if(consigned){
    if(installments!==0||firstDueDate!=='')fail('AV-RECEIVABLE-INPUT');
    await client.query("update public.vendas_contas_receber set situacao='aberto',meio_pagamento='consignado',atualizado_por=$3 where empresa_id=$1 and operacao_id=$2 and situacao not in ('cancelado','estornado')",[companyId,operation.id,actorId]);
  }else if(!reschedule){
    await client.query('update public.vendas_contas_receber set meio_pagamento=$3,atualizado_por=$4 where empresa_id=$1 and operacao_id=$2 and saldo_aberto>0 and situacao not in (\'cancelado\',\'estornado\')',[companyId,operation.id,method,actorId]);
  }else{
    const total=active.reduce((sum,r)=>sum+Math.round(Number(r.valor_original)*100),0);
    schedule=paymentSchedule(total,installments,firstDueDate);
    for(const part of schedule){
      const existing=all.find(r=>Number(r.parcela)===part.number);
      if(existing)await client.query('update public.vendas_contas_receber set total_parcelas=$3,vencimento=$4,valor_original=$5,saldo_aberto=$5,meio_pagamento=$6,situacao=\'aberto\',atualizado_por=$7 where empresa_id=$1 and id=$2',[companyId,existing.id,installments,part.dueDate,part.amount,method,actorId]);
      else await client.query('insert into public.vendas_contas_receber(empresa_id,operacao_id,cliente_id,parcela,total_parcelas,vencimento,valor_original,saldo_aberto,meio_pagamento,chave_idempotencia,criado_por,atualizado_por) values($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$10)',[companyId,operation.id,operation.cliente_id,part.number,installments,part.dueDate,part.amount,method,`${idempotencyKey}:p${part.number}`,actorId]);
    }
    // Keep canceled installments and their history; never delete them.
    await client.query('update public.vendas_contas_receber set situacao=\'cancelado\',atualizado_por=$4 where empresa_id=$1 and operacao_id=$2 and parcela>$3 and situacao<>\'cancelado\'',[companyId,operation.id,installments,actorId]);
  }
  await client.query('update public.vendas_operacoes set pagamento_retrato=pagamento_retrato||$3::jsonb,atualizado_por=$4 where empresa_id=$1 and id=$2',[companyId,operation.id,JSON.stringify({method,...(!hasMovements?{installments,firstDueDate}:{})}),actorId]);
  await client.query('insert into public.vendas_eventos(empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,chave_idempotencia,criado_por) values($1,\'conta_receber\',$2,\'condicoes_pagamento_alteradas\',\'Forma de pagamento e parcelamento revisados\',$3::jsonb,$4,$5)',[companyId,receivableId,JSON.stringify({fingerprint,operationId:operation.id,before,method,installments,firstDueDate,schedule,hasMovements}),idempotencyKey,actorId]);
  return {receivable:{id:receivableId},reused:false};
}
