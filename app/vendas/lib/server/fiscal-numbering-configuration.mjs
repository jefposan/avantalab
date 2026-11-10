import {FISCAL_NFE_NORMAL_SERIES} from '../fiscal-numbering.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=(code,message)=>({ok:false,code,message,field:'numbering'});
const map=row=>row?{exists:true,series:row.series,nextNumber:Number(row.next_number),lastReservedNumber:Number(row.last_reserved_number),version:Number(row.version)}:{exists:false,series:'',nextNumber:null,lastReservedNumber:0,version:0};

/** Configuração explícita; não reserva número, não assina e não transmite. */
export function createFiscalNumberingConfigurationService({pool,issuerResolver,draftRepository}){
 return {async run({context,input}){
  const write=input?.action==='save-numbering';
  const permitted=write?context?.effectivePermissions?.['fiscal.configure']===true:context?.effectivePermissions?.['fiscal.view']===true||context?.effectivePermissions?.['fiscal.configure']===true;
  if(!context?.active||!context.moduleActive||context.moduleId!=='vendas'||!UUID.test(context.companyId||'')||!UUID.test(context.actorId||'')||!permitted)return fail('AV-NUMBERING-PERMISSION','Seu acesso não permite consultar ou configurar a numeração fiscal.');
  if(!['numbering','save-numbering'].includes(input?.action))return fail('AV-NUMBERING-INPUT','Revise a solicitação de numeração.');
  let establishmentId;
  if(input.draftId){
   if(!UUID.test(input.draftId))return fail('AV-NUMBERING-INPUT','Atualize o vínculo da nota.');
   const draft=await draftRepository.get({companyId:context.companyId,draftId:input.draftId});
   if(!draft||draft.companyId!==context.companyId||draft.documentType!=='nfe')return fail('AV-NUMBERING-NOT-FOUND','Nota não localizada neste perfil.');
   establishmentId=draft.issuerSnapshot?.establishmentId;
  }else establishmentId=(await issuerResolver({companyId:context.companyId}))?.establishmentId;
  if(!UUID.test(establishmentId||''))return fail('AV-NUMBERING-ISSUER','Conclua o cadastro do emitente antes de configurar a série.');
  if(write&&(!/^\d{1,3}$/.test(input.series||'')||!Number.isSafeInteger(input.nextNumber)||input.nextNumber<1||input.nextNumber>999999999||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0))return fail('AV-NUMBERING-INPUT','Informe a série e o próximo número livre, usando somente números inteiros.');
  if(write&&!FISCAL_NFE_NORMAL_SERIES.includes(String(Number(input.series))))return fail('AV-NUMBERING-SERIES','Selecione uma série disponível para emissão normal da NF-e.');
  const client=await pool.connect();
  try{
   await client.query('begin');
   if(write)await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`numbering-config:${context.companyId}:${establishmentId}:nfe`]);
   const rows=(await client.query(`select * from fiscal_private.number_sequences where company_id=$1 and establishment_id=$2 and document_type='nfe' and environment='homologacao' order by series${write?' for update':''}`,[context.companyId,establishmentId])).rows;
   const active=rows.find(row=>row.active);
   if(!write){
    const free=active ? (await client.query(`select min(r.number)::int as number from fiscal_private.number_reservations r where r.company_id=$1 and r.establishment_id=$2 and r.document_type='nfe' and r.environment='homologacao' and r.series=$3 and r.status='released' and not exists(select 1 from fiscal_private.number_reservations occupied where occupied.company_id=r.company_id and occupied.establishment_id=r.establishment_id and occupied.document_type=r.document_type and occupied.environment=r.environment and occupied.series=r.series and occupied.number=r.number and occupied.status<>'released') and not exists(select 1 from fiscal_private.number_voids v where v.company_id=r.company_id and v.establishment_id=r.establishment_id and v.document_type=r.document_type and v.environment=r.environment and v.series=r.series and v.status<>'rejected' and r.number between v.start_number and v.end_number)`,[context.companyId,establishmentId,active.series])).rows[0] : null;
    await client.query('commit');return {ok:true,message:'',numbering:map(active && free?.number ? {...active,next_number:free.number}:active)};
   }
   if(Number(active?.version||0)!==input.expectedVersion){await client.query('rollback');return fail('AV-NUMBERING-CONFLICT','A numeração foi alterada em outro acesso. Feche e abra este ajuste para atualizar antes de salvar.');}
   const equivalent=rows.filter(row=>Number(row.series)===Number(input.series));
   if(equivalent.length>1){await client.query('rollback');return fail('AV-NUMBERING-SERIES','Há séries equivalentes neste perfil. Solicite a revisão do cadastro antes de alterar a numeração.');}
   const target=equivalent[0];
   const series=target?.series||String(Number(input.series));
   const occupied=(await client.query(`select greatest(
    coalesce((select max(number) from fiscal_private.number_reservations where company_id=$1 and establishment_id=$2 and document_type='nfe' and environment='homologacao' and series::int=$3::int),0),
    coalesce((select max(end_number) from fiscal_private.number_voids where company_id=$1 and establishment_id=$2 and document_type='nfe' and environment='homologacao' and series::int=$3::int and status<>'rejected'),0)
   ) as maximum`,[context.companyId,establishmentId,series])).rows[0];
   const minimum=Math.max(Number(target?.next_number||1),Number(target?.last_reserved_number||0)+1,Number(occupied?.maximum||0)+1);
   if(input.nextNumber<minimum){await client.query('rollback');return fail('AV-NUMBERING-LOWER',`O próximo número desta série deve ser pelo menos ${minimum}. Números protegidos não podem ser reutilizados.`);}
   await client.query(`update fiscal_private.number_sequences set active=false,version=version+1,updated_at=now() where company_id=$1 and establishment_id=$2 and document_type='nfe' and environment='homologacao' and active and series<>$3`,[context.companyId,establishmentId,series]);
   const saved=(await client.query(`insert into fiscal_private.number_sequences(company_id,establishment_id,document_type,series,next_number) values($1,$2,'nfe',$3,$4)
    on conflict(company_id,establishment_id,document_type,environment,series) do update set next_number=excluded.next_number,active=true,version=fiscal_private.number_sequences.version+1,updated_at=now() returning *`,[context.companyId,establishmentId,series,input.nextNumber])).rows[0];
   await client.query('commit');return {ok:true,message:'Numeração salva no perfil empresarial. Nenhuma nota foi enviada.',numbering:map(saved)};
  }catch{await client.query('rollback').catch(()=>{});return fail('AV-NUMBERING-STORAGE','Não foi possível confirmar o salvamento da numeração. Reabra o ajuste antes de tentar novamente.');}
  finally{client.release();}
 }};
}
