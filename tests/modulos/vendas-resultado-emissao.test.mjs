import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {fiscalNoteResult,nfeStandardCancellationAvailability,nfePublicConsultationUrl} from '../../app/vendas/lib/fiscal-note-result.mjs';
import {handleFiscalEmissionStatusRequest} from '../../app/vendas/lib/server/fiscal-emission-status-http.mjs';
import {createFiscalEmissionStatusService} from '../../app/vendas/lib/server/fiscal-emission-status-service.mjs';
import {createNfeAuthorizationAdapter,parseNfeAuthorizationSoapResponse} from '../../app/vendas/lib/server/nfe-authorization-service.mjs';
import {fiscalCheckoutCorrection} from '../../app/vendas/lib/fiscal-correction.mjs';
import {createCommercialNfeCancellationService,NFE_CANCELLATION_CONFIRMATION} from '../../app/vendas/lib/server/commercial-nfe-cancellation.mjs';

const companyId='10000000-0000-4000-8000-000000000001',emissionId='20000000-0000-4000-8000-000000000001';
const authorizedAt='2026-11-05T15:00:00.000Z',key='35'+'1'.repeat(42);
const status={id:emissionId,companyId,state:'danfe_ready',authorized:true,environment:'homologacao',protocolNumber:'1'.repeat(15),accessKey:key,authorizedAt,artifacts:[{id:'xml',artifactType:'processed_xml',available:true},{id:'pdf',artifactType:'danfe_pdf',available:true}]};
const boundary={source:'authenticated',authenticated:true,userId:'30000000-0000-4000-8000-000000000001',companyId,moduleId:'vendas',userActive:true,membershipActive:true,companyActive:true,moduleActive:true};

test('resultado não confunde envio, rejeição e autorização; documentos exigem autorização confirmada',()=>{
 const success=fiscalNoteResult(status);assert.equal(success.authorized,true);assert.equal(success.danfe.id,'pdf');assert.match(success.description,/sem valor fiscal/);
 for(const state of ['submitted','processing','signed','rejected']){const result=fiscalNoteResult({...status,state});assert.equal(result.authorized,false);assert.equal(result.xml,undefined);assert.equal(result.danfe,undefined);}
 assert.equal(fiscalNoteResult({...status,protocolNumber:''}).authorized,false);
 assert.equal(fiscalNoteResult({...status,state:'canceled'}).canceled,true);
 assert.equal(fiscalCheckoutCorrection({code:'AV-NFE-SUBMISSION-CERTIFICATE'}),'certificado');
});

test('cancelamento ordinário verifica autorização, UF, horário e limite de 24 horas',()=>{
 const at=Date.parse(authorizedAt);assert.equal(nfeStandardCancellationAvailability(status,at+24*3600000).allowed,true);
 assert.equal(nfeStandardCancellationAvailability(status,at+24*3600000+1).allowed,false);
 for(const change of [{authorizedAt:''},{authorizedAt:'invalid'},{accessKey:'33'+'1'.repeat(42)},{state:'canceled'},{state:'submitted'}])assert.equal(nfeStandardCancellationAvailability({...status,...change},at+1000).allowed,false);
});

test('servidor recusa cancelamento vencido antes de carregar certificado ou transmitir evento',async()=>{
 let network=0,certificate=0;
 const service=createCommercialNfeCancellationService({repository:{load:async()=>({issuerDocument:'1'.repeat(14),emission:{...status,version:1,documentType:'nfe',model:'55',statusCode:'100'}})},certificateBindingResolver:async()=>{certificate++;},cancellationAdapter:{configured:true,cancelProtected:async()=>{network++;}},artifactStorage:{putImmutable(){}},lifecycle:{commitCancellation(){}},clock:()=>new Date(Date.parse(authorizedAt)+25*3600000).toISOString()});
 const result=await service.cancel({context:{companyId,actorId:boundary.userId,moduleId:'vendas',active:true,moduleActive:true,effectivePermissions:{'fiscal.cancel':true}},emissionId,expectedVersion:1,idempotencyKey:'cancel-expired-test',confirmation:NFE_CANCELLATION_CONFIRMATION,justification:'Cancelamento solicitado para teste de prazo.'});
 assert.equal(result.ok,false);assert.equal(result.errors[0].code,'AV-NFE-CANCEL-DEADLINE');assert.equal(certificate,0);assert.equal(network,0);
});

test('consulta autentica e confere perfil antes de reconciliar somente a nota pedida; recarrega o resultado final',async()=>{
 let calls=0,record={...status,state:'submitted',artifacts:[],recoveryJobs:[{state:'pending'}]};
 const repository={configured:true,findEmissionStatus:async scope=>{assert.equal(scope.companyId,companyId);assert.equal(scope.emissionId,emissionId);return record;}};
 const service=createFiscalEmissionStatusService({repository,reconcile:async scope=>{calls++;assert.deepEqual(scope,{companyId,emissionId});record={...status,recoveryJobs:[]};}});
 const input={boundary,effectivePermissions:{'fiscal.view':true},emissionId};
 const persisted=await service.get(input);assert.equal(calls,0);assert.equal(persisted.emission.state,'submitted');
 const result=await service.consult(input);assert.equal(calls,1);assert.equal(result.emission.state,'danfe_ready');assert.equal(result.emission.artifacts.length,2);
 await service.get(input);assert.equal(calls,1);
 record={...record,companyId:'other'};assert.equal((await service.consult(input)).ok,false);assert.equal(calls,1);
 assert.equal((await service.consult({...input,effectivePermissions:{}})).ok,false);assert.equal(calls,1);
});

test('falha de conferência bloqueia a fronteira de transmissão antes de registrar tentativa ou chamar o transporte',async()=>{
 let transmitted=0,registered=0;
 const adapter=createNfeAuthorizationAdapter({certificateAdapter:{inspectBinding:async()=>({valid:false})},statusAdapter:{checkAvailability:async()=>({valid:true,serviceOperational:true})},transport:{configured:true,postSoap:async()=>{transmitted++;}}});
 const result=await adapter.authorizeProtected({signedXml:'invalid',beforeTransmission:async()=>{registered++;return{ok:true};}});
 assert.equal(result.transmissionAttempted,false);assert.equal(transmitted,0);assert.equal(registered,0);assert.ok(result.errors.length);
});

test('rejeição do lote volta com motivo definido; duplicidade exige consulta e nunca é tratada como rejeição segura para reenviar',()=>{
 const response=code=>parseNfeAuthorizationSoapResponse(`<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>35</cUF><cStat>${code}</cStat><xMotivo>Rejeição de teste</xMotivo></retEnviNFe></soap:Body></soap:Envelope>`);
 assert.equal(response('225').valid,true);assert.equal(response('225').batchRejected,true);assert.equal(response('225').batchReason,'Rejeição de teste');
 for(const code of ['204','539','104','108'])assert.equal(response(code).batchRejected,false);
});

test('card de resultado mantém ações funcionais no mesmo card, permissões, rejeição e prazo de cancelamento',()=>{
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),ast=ts.createSourceFile('test.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const code=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='FiscalNoteResultDialog').getText(ast);
 const jsx=(type,props)=>({type,props}),scope={exports:{},require:()=>({jsx,jsxs:jsx}),useContext:()=>({can:()=>true}),useState:value=>[value,()=>{}],window:{open:(...args)=>{scope.publicTarget=args;}},PermissionContext:{},fiscalNoteResult,nfePublicConsultationUrl,nfeStandardCancellationAvailability:()=>({allowed:false,reason:'Prazo encerrado'}),Dialog:'Dialog',Icon:'Icon',BotaoAcaoCompacto:'Button'};
 vm.runInNewContext(ts.transpileModule(code+'\nexports.render=FiscalNoteResultDialog;',{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,scope);
 const nodes=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];
 let selected;const props={draft:{client:'Cliente',sourceLabel:'Pedido',originId:'1',number:'1',series:'1'},status,onDownload:(...args)=>selected=args,onShare:(...args)=>selected=['share',...args]};
 const all=nodes(scope.exports.render(props));const button=label=>all.find(n=>n.type==='Button'&&[n.props.children].flat().join('')===label);
 button('Baixar DANFE').props.onClick();assert.deepEqual(selected,['pdf','danfe_pdf']);button('Compartilhar XML').props.onClick();assert.deepEqual(selected,['share','xml','processed_xml']);assert.equal(button('Cancelar nota').props.disabled,true);assert.equal(button('Verificar envio'),undefined);button('Situação da nota').props.onClick();assert.equal(scope.publicTarget[0],nfePublicConsultationUrl('homologacao'));assert.equal(scope.publicTarget[1],'_blank');
 const fetching=nodes(scope.exports.render({...props,loading:true}));assert.equal(fetching.find(n=>n.type==='Button'&&[n.props.children].flat().join('')==='Baixar DANFE').props.disabled,false);
 const pending=nodes(scope.exports.render({...props,status:{...status,state:'submitted'}}));assert.ok(!pending.some(n=>n.type==='Button'&&[n.props.children].flat().join('')==='Baixar DANFE'));
});

test('concluir emissão abre a nota certa; pendência de cadastro continua na conferência e Salvar não vira emissão',async()=>{
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),ast=ts.createSourceFile('test.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='FiscalView');
 const declaration=fn.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.text==='checkoutAndShowResult'));
 let response,opened=[];const scope={exports:{},onCheckout:async()=>response,openFiscalResult:draft=>opened.push(draft),setRemoteStatuses:()=>{}};
 vm.runInNewContext(ts.transpileModule(declaration.getText(ast)+'\nexports.run=checkoutAndShowResult;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
 const draft={id:'draft',number:'1',series:'1'};
 response={ok:false,code:'AV-NFE-AUTH-CERTIFICATE',emission:{emissionId,state:'signed',version:4}};await scope.exports.run(draft,'issue');assert.equal(opened.length,0);
 response={ok:true,draftId:'saved-draft',emission:{emissionId,state:'authorized',version:6}};await scope.exports.run(draft,'issue');assert.equal(opened[0].id,'saved-draft');assert.equal(opened[0].emissionId,emissionId);
 opened=[];await scope.exports.run(draft,'save');assert.equal(opened.length,0);
 response={ok:false,emission:{emissionId,state:'submitted',version:5}};await scope.exports.run(draft,'issue');assert.equal(opened.length,0);
 response={ok:false,code:'AV-FISCAL-CHECKOUT-REJECTED',emission:{emissionId,state:'rejected',version:6}};await scope.exports.run(draft,'issue');assert.equal(opened.length,0);
});


test('GET nunca consulta SEFAZ; POST explícito consulta e conserva os controles de sessão e perfil',async()=>{
 let reads=0,queries=0,authenticated=true;
 const repository={configured:true,findEmissionStatus:async()=>{reads++;return{...status,state:'submitted',recoveryJobs:[{state:'pending'}]};}};
 const service=createFiscalEmissionStatusService({repository,reconcile:async()=>{queries++;}});
 const runtime={configured:true,accessResolver:{resolve:async()=>({authenticated,boundary,effectivePermissions:{'fiscal.view':true}})},statusService:service};
 const request=method=>new Request(`https://example.com/api/status/${emissionId}?companyId=${companyId}`,{method});
 assert.equal((await handleFiscalEmissionStatusRequest({request:request('GET'),emissionId,runtime})).status,200);assert.equal(queries,0);assert.equal(reads,1);
 assert.equal((await handleFiscalEmissionStatusRequest({request:request('POST'),emissionId,runtime})).status,200);assert.equal(queries,1);
 authenticated=false;const before=reads;
 assert.equal((await handleFiscalEmissionStatusRequest({request:request('POST'),emissionId,runtime})).status,401);assert.equal(queries,1);assert.equal(reads,before);
});

test('reabrir nota carregada conserva documentos e não dispara leitura ou consulta externa',()=>{
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),ast=ts.createSourceFile('test.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='FiscalView');
 const declaration=fn.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.text==='openFiscalResult'));
 let calls=0,opened,cache={[emissionId]:status};
 const scope={exports:{},resultGenerationRef:{current:0},setIssueDraft(){},setDetailDraft(){},setSharingFile(){},setFiscalBridgeMessage(){},setResultDraft:value=>opened=value,remoteStatuses:cache,requestFiscalStatus:()=>calls++,requestedEmissionsRef:{current:new Set()},setRemoteStatuses:update=>{cache=update(cache);}};
 vm.runInNewContext(ts.transpileModule(declaration.getText(ast)+'\nexports.open=openFiscalResult;',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
 scope.exports.open({id:'draft',emissionId});assert.equal(calls,0);assert.equal(opened.emissionId,emissionId);assert.equal(cache[emissionId].artifacts.length,2);
 scope.exports.open({id:'draft',emissionId},status);assert.equal(calls,0);assert.equal(cache[emissionId].state,'danfe_ready');
});


test('consulta pública usa ambiente oficial e não transfere a chave em URL nem aciona serviços internos',()=>{
 for(const [environment,hostname]of [['homologacao','hom.nfe.fazenda.gov.br'],['producao','www.nfe.fazenda.gov.br']]){
  const url=new URL(nfePublicConsultationUrl(environment));assert.equal(url.hostname,hostname);assert.equal(url.protocol,'https:');assert.equal(url.pathname,'/portal/consultaRecaptcha.aspx');assert.equal(url.searchParams.get('tipoConsulta'),'resumo');assert.ok(!url.searchParams.has('nfe'));
 }
 assert.equal(nfePublicConsultationUrl('outro'), '');
});
