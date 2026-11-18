import {buildPresentedNfeDanfe,loadDanfeLogo} from './nfe-danfe-presentation.mjs';
import {buildNfeDanfeArtifact,nfeDanfeStorageKey} from './nfe-danfe-artifact.mjs';
/** A new content-addressed presentation; no writes to emissions or original artifact rows. */
async function stage(code,run){try{return await run();}catch(cause){throw Object.assign(new Error('Falha ao preparar DANFE.'),{code:`AV-DANFE-${code}`,cause});}}
export function createDanfePresentationRenderer({repository,storageProvider,appearanceReader,supabaseUrl=''}){
 return async({artifact,companyId})=>{
  const xml=await stage('SOURCE',()=>repository.findProcessedXmlForPresentation({companyId,emissionId:artifact.emissionId}));
  if(!xml||xml.companyId!==companyId||xml.emissionId!==artifact.emissionId||xml.accessKey!==artifact.accessKey||xml.artifactType!=='processed_xml'||!['homologacao','producao'].includes(xml.environment))throw Error('XML autorizado não encontrado nesta empresa.');
  const loaded=await stage('XML',()=>storageProvider.readByReference({accessKey:xml.accessKey,storageReference:xml.storageReference,storageVersion:xml.storageVersion,expectedChecksum:xml.checksum,contentType:'application/xml'}));
  const appearance=await stage('APPEARANCE',()=>appearanceReader(companyId));const selected=appearance.logo==='__blank__'?'':appearance.logo||appearance.systemLogo;
  const logoBytes=await stage('LOGO',()=>loadDanfeLogo(selected,{supabaseUrl}));
  const danfe=await stage('RENDER',()=>buildPresentedNfeDanfe({processedXml:new TextDecoder().decode(loaded.content),expectedAccessKey:artifact.accessKey,expectedEnvironment:xml.environment,logoBytes}));
  const built=buildNfeDanfeArtifact({danfe});if(!built.valid)throw Error('Não foi possível validar o DANFE.');
  const versionKey=nfeDanfeStorageKey(artifact.accessKey).replace(`${artifact.accessKey}-danfe.pdf`,`${artifact.accessKey}/versions/${built.checksum}-danfe.pdf`);
  const stored=await stage('STORE',()=>storageProvider.putImmutable({...built,storageKey:versionKey}));
  return {...artifact,storageReference:stored.storageReference,storageVersion:stored.versionId,checksum:built.checksum};
 };
}
