import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
import {createHash} from 'node:crypto';
import {getFiscalDownloadRuntime} from './fiscal-download-runtime.mjs';
import {createSupabaseFiscalArtifactStorage} from './supabase-fiscal-artifact-storage.mjs';
import {createPostgresFiscalRepository} from './fiscal-postgres-repository.mjs';
import {resolveFiscalDatabaseConnectionString} from './fiscal-database-connection.mjs';
import {BACKUP_BUCKET,createFiscalNoteBackupService} from './fiscal-note-backup.mjs';
import {createFiscalNoteBackupRepository} from './fiscal-note-backup-repository.mjs';
const {Pool}=pg;
export function createBackupObjects(client){const api=client.storage.from(BACKUP_BUCKET);return{
 async put(key,bytes){const result=await api.upload(key,bytes,{contentType:'application/zip',upsert:true});if(result.error)throw result.error;},
 async read(key){const r=await api.download(key);if(r.error)throw r.error;return Buffer.from(await r.data.arrayBuffer());},
 async removeParts(base,count){for(let start=0;start<count;start+=100){const r=await api.remove(Array.from({length:Math.min(100,count-start)},(_,i)=>`${base}/parts/${start+i}.zip`));if(r.error)throw r.error;}},
 async grant(key,filename){const r=await api.createSignedUrl(key,60,{download:filename});if(r.error||!r.data?.signedUrl)throw Error('Não foi possível preparar o download.');return{url:r.data.signedUrl,filename,expiresAt:new Date(Date.now()+60000).toISOString()};}
};}
let pending;
export function getFiscalNoteBackupRuntime(){return pending??=(async()=>{
 const download=await getFiscalDownloadRuntime();if(!download.configured)return{configured:false};
 const env=process.env,connectionString=resolveFiscalDatabaseConnectionString(env);
 const pool=new Pool({connectionString,max:3,idleTimeoutMillis:30000,connectionTimeoutMillis:5000,ssl:connectionString.includes('localhost')?false:{rejectUnauthorized:true}});
 const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const storage=createSupabaseFiscalArtifactStorage({client,bucket:env.FISCAL_STORAGE_BUCKET});
 const audit=createPostgresFiscalRepository({pool});
 const bucket=await client.storage.getBucket(BACKUP_BUCKET);if(bucket.error||bucket.data?.public!==false){await pool.end();return{configured:false};}
 const objects=createBackupObjects(client);
 const readArtifact=async({access,note,artifact})=>{
  if(['processed_xml','danfe_pdf'].includes(artifact.type)){
   const result=await download.downloadService.authorize({boundary:access.boundary,effectivePermissions:access.effectivePermissions,artifactId:artifact.id,artifactType:artifact.type,ttlSeconds:60});
   if(!result.ok||!result.download)throw Error('Arquivo fiscal indisponível.');
   const url=new URL(result.download.url);if(url.origin!==new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin||!url.pathname.startsWith('/storage/v1/'))throw Error('Referência de arquivo inválida.');
   const response=await fetch(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Arquivo fiscal indisponível.');const bytes=Buffer.from(await response.arrayBuffer());if(!bytes.length||bytes.length>10*1024*1024)throw Error('Tamanho de arquivo inválido.');if(artifact.type==='processed_xml'&&createHash('sha256').update(bytes).digest('hex')!==artifact.checksum)throw Error('Integridade do XML não confirmada.');if(artifact.type==='danfe_pdf'&&bytes.subarray(0,5).toString()!=='%PDF-')throw Error('DANFE inválido.');return bytes;
  }
  if(!['cancellation_event_xml','correction_event_xml'].includes(artifact.type))throw Error('Tipo de evento não suportado.');
  const result=await storage.readByReference({accessKey:note.key,storageReference:artifact.reference,storageVersion:artifact.version,expectedChecksum:artifact.checksum,contentType:'application/xml'});
  await audit.appendArtifactAccessEvent({companyId:access.boundary.companyId,actorId:access.boundary.userId,emissionId:note.id,artifactId:artifact.id,artifactType:artifact.type,permission:'fiscal.documents.xml.download',outcome:'granted',reasonCode:'backup',occurredAt:new Date().toISOString()});return result.content;
 };
 return{configured:true,accessResolver:download.accessResolver,service:createFiscalNoteBackupService({repository:createFiscalNoteBackupRepository(pool),objects,readArtifact})};
})();}
