import JSZip from 'jszip';
import {createHash,randomUUID} from 'node:crypto';
import {evaluateAccessDecision} from '../access-control.mjs';

export const BACKUP_BUCKET='vendas-notas-backups';
export const MAX_BACKUP_BYTES=200*1024*1024;
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export function validateBackupFilters(input={}){
 const start=String(input.start||''),end=String(input.end||''),client=String(input.client||'');
 const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 if(!valid(start)||!valid(end)||start>end)throw fail('Informe um período de emissão válido.');
 if(client&&!/^\d{11}(?:\d{3})?$/.test(client))throw fail('Selecione um cliente válido.');
 return{start,end,client};
}
export function backupFilename(legalName,start,end){
 const company=String(legalName||'EMPRESA').trim().split(/\s+/)[0].normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]/gi,'').toUpperCase().slice(0,50)||'EMPRESA';
 const month=value=>`${value.slice(5,7)}-${value.slice(0,4)}`;
 return `${company}_${month(start)}${month(start)===month(end)?'':`_a_${month(end)}`}.zip`;
}
export function backupAccess(access){
 if(!access?.authenticated||access.boundary?.source!=='authenticated')throw fail('Confirme novamente sua sessão.',401);
 for(const permission of ['fiscal.view','fiscal.documents.xml.download','fiscal.documents.danfe.download']){
  if(!evaluateAccessDecision({...access,permission}).allowed)throw fail('Seu acesso não permite gerar ou baixar backups fiscais.',403);
 }
 return{companyId:access.boundary.companyId,actorId:access.boundary.userId};
}
export function presentBackup(row){return{id:row.id,filename:row.filename,start:row.start_date instanceof Date?row.start_date.toISOString().slice(0,10):String(row.start_date).slice(0,10),end:row.end_date instanceof Date?row.end_date.toISOString().slice(0,10):String(row.end_date).slice(0,10),client:row.client_label,state:row.state,count:row.note_count,completed:row.completed,bytes:Number(row.byte_length),createdAt:new Date(row.created_at).toISOString(),error:row.failure_message||''};}
export function createFiscalNoteBackupService({repository,objects,readArtifact,randomId=randomUUID}){
 return {
  async list(access,input={}){const context=backupAccess(access);const offset=Number(input.offset||0);if(!Number.isSafeInteger(offset)||offset<0||offset>100000)throw fail('Página de backups inválida.');const rows=await repository.list({...context,offset});return{backups:rows.slice(0,50).map(presentBackup),hasMore:rows.length>50,clients:await repository.clients(context)};},
  async preview(access,input){const context=backupAccess(access),filters=validateBackupFilters(input);const notes=await repository.selectNotes({...context,...filters});return{count:notes.length,filename:backupFilename(notes[0]?.legalName,filters.start,filters.end),tooMany:notes.length>500};},
  async create(access,input){const context=backupAccess(access),filters=validateBackupFilters(input);if(!UUID.test(input.requestId||''))throw fail('A identificação do backup é inválida.');const prior=await repository.byRequest({...context,requestId:input.requestId});if(prior)return{backup:presentBackup(prior)};const notes=await repository.selectNotes({...context,...filters});if(!notes.length)throw fail('Nenhuma nota autorizada ou cancelada foi encontrada neste período.');if(notes.length>500)throw fail('O período contém mais de 500 notas. Gere o backup em períodos menores.');for(const note of notes){if(!note.artifacts.some(a=>a.type==='processed_xml')||!note.artifacts.some(a=>a.type==='danfe_pdf')||(note.canceled&&!note.artifacts.some(a=>a.type==='cancellation_event_xml')))throw fail(`A nota ${note.series}/${note.number} está com arquivos pendentes. Consulte sua situação antes de gerar o backup.`,409);}
   const row=await repository.create({...context,...filters,id:randomId(),requestId:input.requestId,filename:backupFilename(notes[0].legalName,filters.start,filters.end),clientLabel:filters.client?notes[0].clientLabel:'Todos os clientes',notes});return{backup:presentBackup(row)};
  },
  async step(access,input){const context=backupAccess(access);if(!UUID.test(input.id||''))throw fail('Backup inválido.');const lease=randomId();const job=await repository.claim({...context,id:input.id,lease});if(!job){const current=await repository.find({...context,id:input.id});if(!current)throw fail('Backup não encontrado nesta empresa.',404);return{backup:presentBackup(current)};}
   try{
    const base=`${context.companyId}/${job.id}`,root=job.filename.replace(/\.zip$/,'');
    if(job.completed<job.note_count){const note=job.notes[job.completed],zip=new JSZip();let rawBytes=0;for(const artifact of note.artifacts){if(['signed_xml','protocol_xml'].includes(artifact.type))continue;let bytes;try{bytes=await readArtifact({access,note,artifact});}catch{throw fail(`Não foi possível obter os arquivos da nota ${note.series}/${note.number}. Consulte a situação da nota e gere o backup novamente.`,503);}rawBytes+=bytes.length;const canceled=note.canceled?'-CANCELADA':'';const suffix=artifact.type==='processed_xml'?'procNFe.xml':artifact.type==='danfe_pdf'?'DANFE.pdf':`${artifact.type}.xml`;zip.file(`${root}/${artifact.type==='danfe_pdf'?'PDF':'XML'}/NFe-${note.key}${canceled}-${suffix}`,bytes);}const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});if(Number(job.byte_length)+rawBytes>MAX_BACKUP_BYTES)throw fail('O backup excede 200 MB. Selecione um período menor.');await objects.put(`${base}/parts/${job.completed}.zip`,bytes);return{backup:presentBackup(await repository.advance({...context,id:job.id,lease,completed:job.completed+1,bytes:Number(job.byte_length)+rawBytes}))};}
    const zip=new JSZip();let loaded=0;for(let i=0;i<job.note_count;i++){const bytes=await objects.read(`${base}/parts/${i}.zip`);loaded+=bytes.length;if(loaded>MAX_BACKUP_BYTES)throw fail('O backup excede 200 MB. Selecione um período menor.');const part=await JSZip.loadAsync(bytes);for(const entry of Object.values(part.files)){if(!entry.dir)zip.file(entry.name,await entry.async('nodebuffer'));}}
    const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});if(bytes.length>MAX_BACKUP_BYTES)throw fail('O backup excede 200 MB. Selecione um período menor.');await objects.put(`${base}/backup.zip`,bytes);const row=await repository.finish({...context,id:job.id,lease,bytes:bytes.length,checksum:sha(bytes)});await objects.removeParts(base,job.note_count).catch(()=>{});return{backup:presentBackup(row)};
   }catch(error){const message=error?.status?error.message:'Não foi possível concluir os arquivos do backup. Tente gerar novamente; as notas originais permanecem preservadas.';await repository.failed({...context,id:job.id,lease,message});throw fail(message,503);}
  },
  async download(access,input){const context=backupAccess(access);if(!UUID.test(input.id||''))throw fail('Backup inválido.');const row=await repository.find({...context,id:input.id});if(!row||row.state!=='ready')throw fail('O backup não está pronto ou não pertence a esta empresa.',404);await repository.audit({...context,id:row.id});return{download:await objects.grant(`${context.companyId}/${row.id}/backup.zip`,row.filename)};}
 };
}
