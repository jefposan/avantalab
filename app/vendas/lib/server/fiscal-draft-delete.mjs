// Exclusão operacional: conserva auditoria privada e devolve somente numeração comprovadamente livre.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeRejections=new Set(['391','778','588','598']);
const failure=(code,message)=>({ok:false,code,message});
export function createFiscalDraftDeleteService({pool}={}) {
 return {async remove({context,draftId,expectedVersion,confirmation}={}) {
  if(!context?.active || !context.moduleActive || context.moduleId!=='vendas' || !UUID.test(context.companyId||'') || !UUID.test(context.actorId||'') || context.effectivePermissions?.['fiscal.cancel']!==true)return failure('AV-DRAFT-DELETE-PERMISSION','Seu acesso não permite excluir rascunhos fiscais.');
  if(!UUID.test(draftId||'') || !Number.isSafeInteger(expectedVersion) || expectedVersion<0 || confirmation!=='EXCLUIR_RASCUNHO_NFE')return failure('AV-DRAFT-DELETE-CONFIRM','Confirme a exclusão deste rascunho.');
  const c=pool.connect?await pool.connect():pool;
  try {
   await c.query('begin');
   // Mesmo lock do ciclo fiscal: assinatura/envio não pode correr junto com a exclusão.
   const d=(await c.query(`select id from public.vendas_fiscal_rascunhos where empresa_id=$1 and id=$2 and documento_tipo='nfe' for update`,[context.companyId,draftId])).rows[0];
   if(!d){await c.query('rollback');return failure('AV-DRAFT-DELETE-NOT-FOUND','Rascunho não localizado neste perfil.');}
   const prior=(await c.query('select draft_id from fiscal_private.draft_deletions where company_id=$1 and draft_id=$2',[context.companyId,draftId])).rows[0];
   if(prior){await c.query('commit');return {ok:true,deleted:true};}
   const e=(await c.query('select * from fiscal_private.emissions where company_id=$1 and draft_id=$2 for update',[context.companyId,draftId])).rows[0];
   const neverSent=e && ['draft','prepared','number_reserved','signed','failed'].includes(e.state) && !e.submitted_at && !e.receipt_number && !e.batch_id;
   const rejected=e?.state==='rejected' && safeRejections.has(e.status_code);
   if(e && (e.failure_code==='AV-DRAFT-DELETED' || Number(e.version)!==expectedVersion || (!neverSent&&!rejected) || e.authorized_at || e.protocol_number || e.processed_storage_reference)) {await c.query('rollback');return failure('AV-DRAFT-DELETE-STATE','Esta nota possui autorização, envio sem resultado confirmado ou foi alterada. Sua numeração não pode ser liberada por exclusão.');}
   if(e){
    const jobs=(await c.query("select id,state from fiscal_private.recovery_jobs where company_id=$1 and emission_id=$2 and state in ('pending','leased') for update",[context.companyId,e.id])).rows;
    if(jobs.some(job=>job.state==='leased')){await c.query('rollback');return failure('AV-DRAFT-DELETE-BUSY','Há uma operação fiscal em andamento. Aguarde a conclusão.');}
    if(e.reservation_id){
     await c.query("select id from fiscal_private.number_sequences where company_id=$1 and establishment_id=$2 and document_type='nfe' and series=$3 for update",[context.companyId,e.establishment_id,e.series]);
     const r=(await c.query("select * from fiscal_private.number_reservations where company_id=$1 and id=$2 and emission_id=$3 for update",[context.companyId,e.reservation_id,e.id])).rows[0];
     if(!r || r.status!=='reserved'){await c.query('rollback');return failure('AV-DRAFT-DELETE-NUMBER','A reserva não está livre para exclusão.');}
     await c.query("update fiscal_private.number_reservations set status='released',updated_at=now() where company_id=$1 and id=$2",[context.companyId,r.id]);
    }
    await c.query("update fiscal_private.recovery_jobs set state='dead_letter',last_error_code='AV-DRAFT-DELETED',last_error_reason='Rascunho excluído pelo responsável.',updated_at=now() where company_id=$1 and emission_id=$2 and state='pending'",[context.companyId,e.id]);
    await c.query("update fiscal_private.emissions set state='failed',failure_code='AV-DRAFT-DELETED',failure_reason='Rascunho excluído pelo responsável.',series=null,number=null,reservation_id=null,version=version+1,updated_at=now() where company_id=$1 and id=$2",[context.companyId,e.id]);
   }
   await c.query(`insert into fiscal_private.draft_deletions(company_id,draft_id,emission_id,actor_id,previous_state,series,number) values($1,$2,$3,$4,$5,$6,$7)`,[context.companyId,draftId,e?.id||null,context.actorId,e?.state||'draft',e?.series||null,e?.number||null]);
   await c.query('commit');return {ok:true,deleted:true,numberReleased:Boolean(e?.reservation_id)};
  }catch(error){await c.query('rollback');throw error;}finally{if(c!==pool)c.release();}
 }};
}
export async function handleFiscalDraftDelete({request,runtime,companyId,draftId}) {
 const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(!UUID.test(companyId||'')||!UUID.test(draftId||'')||request.method!=='POST')return reply(400,failure('AV-DRAFT-DELETE-REQUEST','Solicitação inválida.'));
 if(!runtime?.configured||!runtime.pendingDraftService)return reply(503,failure('AV-DRAFT-DELETE-PENDING','Exclusão segura indisponível.'));
 try {
  const access=await runtime.accessResolver.resolve(request,{companyId});if(!access?.authenticated)return reply(401,failure('AV-DRAFT-DELETE-SESSION','Confirme sua sessão.'));
  const b=access.boundary||{};if(b.companyId!==companyId)return reply(403,failure('AV-DRAFT-DELETE-PROFILE','O perfil não corresponde ao acesso.'));
  const raw=await request.text();if(new TextEncoder().encode(raw).length>2048)return reply(413,failure('AV-DRAFT-DELETE-SIZE','Solicitação excede o tamanho permitido.'));
  let body;try{body=JSON.parse(raw);}catch{return reply(400,failure('AV-DRAFT-DELETE-BODY','Solicitação inválida.'));}
  const result=await runtime.pendingDraftService.remove({draftId,expectedVersion:body.expectedVersion,confirmation:body.confirmation,context:{companyId,actorId:b.userId,moduleId:b.moduleId,active:b.userActive===true&&b.membershipActive===true&&b.companyActive===true,moduleActive:b.moduleActive===true,effectivePermissions:access.effectivePermissions}});
  return reply(result.ok?200:result.code.includes('PERMISSION')?403:409,result);
 }catch{return reply(503,failure('AV-DRAFT-DELETE-UNAVAILABLE','Não foi possível excluir. O rascunho foi preservado.'));}
}
