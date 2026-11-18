const source=`select e.id,e.access_key,e.series,e.number,e.state,
 coalesce(c.recipient_snapshot,r.destinatario_retrato) as recipient,
 coalesce(c.issuer_snapshot,r.emitente_retrato) as issuer,
 coalesce(nullif(coalesce(c.preparation_payload,p.public_payload)->>'issuedAt','')::timestamptz,e.authorized_at) at time zone 'America/Sao_Paulo' as issued_at,
 (select jsonb_agg(jsonb_build_object('id',a.id,'type',a.artifact_type,'reference',a.storage_reference,'version',a.storage_version,'checksum',a.checksum_sha256)) from fiscal_private.artifacts a where a.company_id=e.company_id and a.emission_id=e.id) as artifacts
 from fiscal_private.emissions e
 join public.vendas_fiscal_rascunhos r on r.empresa_id=e.company_id and r.id::text=e.draft_id
 left join lateral(select x.* from fiscal_private.emission_corrections x where x.company_id=e.company_id and x.emission_id=e.id order by x.revision desc limit 1)c on true
 left join lateral(select v.public_payload from fiscal_private.events v where v.company_id=e.company_id and v.emission_id=e.id and v.event_type='emission.prepared' order by v.sequence desc limit 1)p on true
 where e.company_id=$1 and e.state in ('authorized','artifacts_stored','danfe_ready','canceled')`;
const doc=`regexp_replace(coalesce(recipient->>'document',''),'[^0-9]','','g')`;
const map=r=>({id:r.id,key:r.access_key,series:r.series,number:r.number,canceled:r.state==='canceled',legalName:r.issuer?.legalName||'EMPRESA',clientLabel:r.recipient?.displayName||r.recipient?.name||r.recipient?.legalName||'Cliente',artifacts:r.artifacts||[]});
export function createFiscalNoteBackupRepository(pool){
 const one=async(sql,params)=>(await pool.query(sql,params)).rows[0];
 return {
  async clients({companyId}){const result=await pool.query(`with notes as (${source}) select value,label from (select distinct on (${doc}) ${doc} as value,coalesce(recipient->>'displayName',recipient->>'name',recipient->>'legalName','Cliente') as label from notes where ${doc}<>'' order by ${doc},label) clients order by label,value`,[companyId]);return result.rows;},
  async selectNotes({companyId,start,end,client}){const result=await pool.query(`with notes as (${source}) select * from notes where issued_at::date between $2::date and $3::date and ($4='' or ${doc}=$4) order by issued_at,id limit 501`,[companyId,start,end,client]);return result.rows.map(map);},
  async list({companyId,offset=0}){return(await pool.query('select * from fiscal_private.note_backups where company_id=$1 order by created_at desc,id desc limit 51 offset $2',[companyId,offset])).rows;},
  async byRequest({companyId,requestId}){return one('select * from fiscal_private.note_backups where company_id=$1 and request_id=$2',[companyId,requestId]);},
  async find({companyId,id}){return one('select * from fiscal_private.note_backups where company_id=$1 and id=$2',[companyId,id]);},
  async create(v){try{return await one(`insert into fiscal_private.note_backups(id,company_id,actor_id,request_id,start_date,end_date,client_document,client_label,filename,notes,note_count) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) returning *`,[v.id,v.companyId,v.actorId,v.requestId,v.start,v.end,v.client,v.clientLabel,v.filename,JSON.stringify(v.notes),v.notes.length]);}catch(e){if(e.code==='23505'){const running=await one("select * from fiscal_private.note_backups where company_id=$1 and (request_id=$2 or state='generating') order by created_at desc limit 1",[v.companyId,v.requestId]);if(running)return running;}throw e;}},
  async claim({companyId,id,lease}){return one("update fiscal_private.note_backups set lease_id=$3,lease_until=now()+interval '180 seconds',updated_at=now() where company_id=$1 and id=$2 and state='generating' and (lease_until is null or lease_until<now()) returning *",[companyId,id,lease]);},
  async advance({companyId,id,lease,completed,bytes}){return one("update fiscal_private.note_backups set completed=$4,byte_length=$5,lease_id=null,lease_until=null,updated_at=now() where company_id=$1 and id=$2 and lease_id=$3 and state='generating' returning *",[companyId,id,lease,completed,bytes]);},
  async finish({companyId,id,lease,bytes,checksum}){return one("update fiscal_private.note_backups set state='ready',byte_length=$4,checksum=$5,lease_id=null,lease_until=null,updated_at=now() where company_id=$1 and id=$2 and lease_id=$3 and state='generating' and completed=note_count returning *",[companyId,id,lease,bytes,checksum]);},
  async failed({companyId,id,lease,message}){await pool.query("update fiscal_private.note_backups set state='failed',failure_message=$4,lease_id=null,lease_until=null,updated_at=now() where company_id=$1 and id=$2 and lease_id=$3 and state='generating'",[companyId,id,lease,message]);},
  async audit({companyId,actorId,id}){await pool.query("insert into public.vendas_eventos(empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,criado_por) values($1,'configuracao_fiscal',$2,'backup_notas_download','Download de backup de notas fiscais.','{}'::jsonb,$3)",[companyId,id,actorId]);}
 };
}
