import {buildPresentedNfeDanfe,loadDanfeLogo} from './nfe-danfe-presentation.mjs';
import {buildNfeDanfeArtifact,nfeDanfeStorageKey} from './nfe-danfe-artifact.mjs';
/** A new content-addressed presentation; no writes to emissions or original artifact rows. */
export function createDanfePresentationRenderer({repository,storageProvider,appearanceReader,supabaseUrl=''}){
 return async({artifact,companyId})=>{
  const xml=await repository.findProcessedXmlForPresentation({companyId,emissionId:artifact.emissionId});
  if(!xml||xml.companyId!==companyId||xml.emissionId!==artifact.emissionId||xml.accessKey!==artifact.accessKey||xml.artifactType!=='processed_xml')throw Error('XML autorizado não encontrado nesta empresa.');
  const loaded=await storageProvider.readByReference({accessKey:xml.accessKey,storageReference:xml.storageReference,storageVersion:xml.storageVersion,expectedChecksum:xml.checksum,contentType:'application/xml'});
  const appearance=await appearanceReader(companyId);const selected=appearance.logo==='__blank__'?'':appearance.logo||appearance.systemLogo;
  const danfe=await buildPresentedNfeDanfe({processedXml:new TextDecoder().decode(loaded.content),expectedAccessKey:artifact.accessKey,expectedEnvironment:storageProvider.environment==='production'?'producao':'homologacao',logoBytes:await loadDanfeLogo(selected,{supabaseUrl})});
  const built=buildNfeDanfeArtifact({danfe});if(!built.valid)throw Error('Não foi possível validar o DANFE.');
  const versionKey=nfeDanfeStorageKey(artifact.accessKey).replace(`${artifact.accessKey}-danfe.pdf`,`${artifact.accessKey}/versions/${built.checksum}-danfe.pdf`);
  const stored=await storageProvider.putImmutable({...built,storageKey:versionKey});
  return {...artifact,storageReference:stored.storageReference,storageVersion:stored.versionId,checksum:built.checksum};
 };
}
