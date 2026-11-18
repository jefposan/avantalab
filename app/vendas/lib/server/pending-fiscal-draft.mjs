const conflict=()=>Object.assign(new Error('Rascunho alterado em outro acesso.'),{code:'FISCAL-CONFLICT'});
export function createPendingFiscalDraftRepository({pool}){
 return {
  async save({id,companyId,actorId,expectedVersion=0,snapshot,hash}){
   if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0)throw conflict();
   const client=pool.connect?await pool.connect():pool;
   try{
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`fiscal-editable:${companyId}:${id}`]);
    if((await client.query('select id from public.vendas_fiscal_rascunhos where empresa_id=$1 and id=$2',[companyId,id])).rows[0])throw conflict();
    const r=await client.query(`insert into public.vendas_fiscal_preenchimentos(id,empresa_id,conteudo,conteudo_hash,versao,criado_por)
     select $1,$2,$3::jsonb,$4,1,$5 where $6=0
     on conflict(empresa_id,id) do nothing returning versao`,[id,companyId,JSON.stringify(snapshot),hash,actorId,expectedVersion]);
    if(r.rows[0]){await client.query('commit');return {draftId:id,version:Number(r.rows[0].versao),pending:true};}
    const current=(await client.query('select * from public.vendas_fiscal_preenchimentos where empresa_id=$1 and id=$2',[companyId,id])).rows[0];
    if(current&&!current.concluido&&current.conteudo_hash===hash){await client.query('commit');return {draftId:id,version:Number(current.versao),pending:true,reused:true};}
    const saved=await client.query(`update public.vendas_fiscal_preenchimentos set conteudo=$3::jsonb,conteudo_hash=$4,versao=versao+1,atualizado_em=now() where empresa_id=$1 and id=$2 and versao=$5 and not concluido returning versao`,[companyId,id,JSON.stringify(snapshot),hash,expectedVersion]);
    if(!saved.rows[0])throw conflict();await client.query('commit');return {draftId:id,version:Number(saved.rows[0].versao),pending:true};
   }catch(error){await client.query('rollback');throw error;}finally{if(client!==pool)client.release();}
  },
  async list({companyId,limit=200}){
   return (await pool.query('select * from public.vendas_fiscal_preenchimentos where empresa_id=$1 and not concluido order by criado_em desc,id desc limit $2',[companyId,limit])).rows.map(row=>{
    const s=row.conteudo;return {...s,draftId:row.id,originId:row.id,originType:'avulsa',documentType:'nfe',draftStatus:'pendencia_cadastral',emissionId:'',emission:null,pendingVersion:Number(row.versao),createdAt:new Date(row.criado_em).toISOString()};
   });
  },
 };
}
