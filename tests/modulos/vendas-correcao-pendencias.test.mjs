import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {FISCAL_NFE_NORMAL_SERIES} from '../../app/vendas/lib/fiscal-numbering.mjs';
import {canResumeFiscalDraft} from '../../app/vendas/lib/fiscal-checkout.mjs';
import {fiscalCheckoutCorrection,fiscalCorrectionAction,fiscalItemsForReview,fiscalProductIssues} from '../../app/vendas/lib/fiscal-correction.mjs';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
const product={catalogItemId:'product-1',sku:'T016',name:'Produto',kind:'produto',quantity:12,unitPrice:99,unitDiscount:1,unit:'UN',ncm:'33059000',taxableUnit:'UN',cfopInternal:'5102',fiscalOriginCode:'0',icmsCode:'102',pisCst:'99',cofinsCst:'49',fiscalStatus:'Completo'};
function compile(names,extra={}){const ast=ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let code='';for(const n of ast.statements)if(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))code+=n.getText(ast)+'\n';const node=(type,props)=>({type,props});const scope={exports:{},require:()=>({jsx:node,jsxs:node,Fragment:'fragment'}),...extra};vm.runInNewContext(ts.transpileModule(code+'\n'+names.map(n=>'exports.'+n+'='+n+';').join('\n'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);return scope.exports;}
const nodes=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];

test('executor atual substitui indicador legado; falha atual não fica pronta pelo cache',()=>{
 const f=compile(['fiscalConfigFromSettings']);const settings={company:{},fiscal:{}};
 assert.equal(f.fiscalConfigFromSettings(settings,{certificateActive:true,fiscalConnectionAvailable:false},{transmissionAllowed:true}).providerConnected,true);
 assert.equal(f.fiscalConfigFromSettings(settings,{certificateActive:true,fiscalConnectionAvailable:true},{transmissionAllowed:false}).providerConnected,false);
 assert.equal(f.fiscalConfigFromSettings(settings,null,null).providerConnected,false);
});

test('prévia usa padrões atuais sem trocar quantidades, preços, descontos, nome ou identidade',()=>{
 const items=[product];const catalog=[{...product,quantity:999,unitPrice:1,unitDiscount:0,name:'Nome atualizado',cofinsCst:'04',useCompanyFiscal:true,fiscal:'Completo'}];
 const result=fiscalItemsForReview(items,catalog);
 assert.equal(result[0].cofinsCst,'04');assert.equal(result[0].quantity,12);assert.equal(result[0].unitPrice,99);assert.equal(result[0].unitDiscount,1);assert.equal(result[0].name,'Produto');assert.equal(result[0].catalogItemId,'product-1');assert.equal(product.cofinsCst,'49');
 assert.strictEqual(fiscalItemsForReview(items,catalog,true),items);
 assert.deepEqual(fiscalItemsForReview([{...product,catalogItemId:undefined}],[catalog[0],{...catalog[0],catalogItemId:'other'}]),[{...product,catalogItemId:undefined}]);
});

test('problema identifica produto/campo; regra pronta não ganha ação de correção na tela',()=>{
 assert.deepEqual(fiscalProductIssues([{...product,ncm:''}],'classificacao','Dentro da UF'),[{target:'product-1',name:'Produto',fields:['NCM']}]);
 assert.deepEqual(fiscalProductIssues([product],'classificacao','Dentro da UF'),[]);
 assert.equal(fiscalCorrectionAction('matriz').target,'rules');assert.equal(fiscalCorrectionAction('provedor').target,'service');assert.equal(fiscalCorrectionAction('classificacao').permission,'catalog.edit');
 const fn=compile(['fiscalIssueReviewChecks','FiscalIssueReviewDialog'],{useState:value=>[value,()=>{}],useEffect:()=>{},canResumeFiscalDraft,paymentMethodLabel:()=> 'À vista',useContext:()=>({can:()=>true}),PermissionContext:{},Dialog:'Dialog',Icon:'Icon',Badge:'Badge',Table:'Table',BotaoAcaoCompacto:'Button',fiscalCheckoutCorrection,fiscalCorrectionAction,fiscalProductIssues,fiscalDraftUserStatus:()=>({label:'A revisar'}),documentLabel:()=> 'NF-e',money:String,fiscalActiveSequence:()=>({series:'1'})});
 let call;const draft={id:'note',sourceLabel:'Pedido',originId:'2026/1',client:'Cliente',documentType:'nfe',status:'Com pendências',commercialTotals:{orderDiscount:0,freight:0,insurance:0,other:0},items:[{...product,ncm:''}],operationContext:{destination:'Dentro da UF'},checks:[{key:'matriz',label:'Regra fiscal da operação',ready:true,detail:'Regra revisada e correspondente'},{key:'classificacao',label:'Classificação das mercadorias',ready:false,detail:'Revisar'}]};
 const tree=fn.FiscalIssueReviewDialog({draft,company:{},numberingLedger:{reservations:[]},onResolveIssue:(...args)=>call=args});const all=nodes(tree);
 assert.ok(!all.some(n=>n.props?.children==='Regra fiscal da operação'));
 assert.ok(all.some(n=>n.type==='Table'));
 assert.deepEqual(all.filter(n=>n.type==='Button').slice(-3).map(n=>n.props.children),['Salvar','Salvar e emitir','Cancelar']);
 const action=all.find(n=>n.type==='Button'&&n.props.children==='Editar produto');assert.ok(action);action.props.onClick();assert.equal(call[1],'classificacao');assert.equal(call[2],'product-1');
 assert.ok(all.some(n=>n.props?.children==='NCM'));
});

test('atalho de produto atravessa a autorização existente e só abre o cadastro solicitado no perfil',()=>{
 const page=readFileSync('app/custos/page.tsx','utf8'),client=readFileSync('app/custos/CustosClient.tsx','utf8'),workspace=readFileSync('app/custos/CustosWorkspace.tsx','utf8');
 assert.match(page,/initialProductId=/);assert.match(client,/moduloId=custos/);assert.match(client,/initialProductId=\{initialProductId\}/);assert.match(workspace,/produtoSelecionado\?\.id === initialProductId/);assert.match(workspace,/O produto solicitado não está disponível neste perfil/);
 assert.match(source,/readCompanyStorage\('avanta-fiscal-retorno'\)/);assert.match(source,/writeCompanyStorage\('avanta-fiscal-retorno', draft.id\)/);
 assert.match(source,/\['prepared', 'number_reserved', 'signed', 'submitted', 'processing', 'authorized', 'artifacts_stored', 'danfe_ready', 'canceled'\]\.includes\(draft.remoteState/);
});


test('atalho aguarda o produto carregar, abre uma vez e não substitui edição posterior',()=>{
 const source=readFileSync('app/custos/CustosWorkspace.tsx','utf8');const start=source.indexOf('  const initialProductAppliedRef =');const end=source.indexOf('  useEffect(() => {\n    if (modo',start);assert.ok(start>0&&end>start);
 let callback;const writes=[];const ref={current:''};const sandbox={useRef:()=>ref,useEffect:fn=>{callback=fn;},initialProductId:'wanted',produtoSelecionado:undefined,documento:{composicoes:{}},composicaoVazia:()=>({itens:[]}),setRascunho:x=>writes.push(x.id),setComposicao(){},registrarReferenciaEdicao(){},setModo:mode=>writes.push(mode)};
 vm.createContext(sandbox);const code=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;vm.runInContext(code,sandbox);callback();assert.equal(writes.length,0);
 sandbox.produtoSelecionado={id:'wanted'};callback();assert.deepEqual(writes,['wanted','cadastro']);callback();assert.equal(writes.length,2);
 sandbox.initialProductId='foreign';callback();assert.equal(writes.length,2);
});


test('credenciamento conserva sua causa e não vira pendência do executor ou do certificado',()=>{
 const fn=compile(['fiscalIssueReviewChecks']);
 const checks=fn.fiscalIssueReviewChecks({checks:[{key:'provedor',label:'Provedor',ready:true,detail:'Disponível'},{key:'issuer-route',label:'Rota',ready:false,detail:'SEFAZ-SP · O credenciamento ainda não foi confirmado para homologação ou produção.'}]});
 assert.equal(checks.length,2);
 assert.equal(checks.find(check=>check.key==='provedor').ready,true);
 assert.match(checks.find(check=>check.key==='issuer-route').detail,/credenciamento ainda não foi confirmado/);
 assert.equal(fiscalCorrectionAction('issuer-route').target,'issuer');
 assert.equal(fiscalCorrectionAction('certificado').target,'certificate');
 assert.equal(fiscalCorrectionAction('provedor').target,'service');
});

test('conferência envia uma ação por botão; Cancelar somente fecha e preserva o rascunho',async()=>{
 const events=[];
 const fn=compile(['fiscalIssueReviewChecks','FiscalIssueReviewDialog'],{useState:value=>[value,()=>{}],useEffect:()=>{},canResumeFiscalDraft,paymentMethodLabel:()=> 'À vista',useContext:()=>({can:()=>true}),PermissionContext:{},Dialog:'Dialog',Icon:'Icon',Table:'Table',BotaoAcaoCompacto:'Button',fiscalCheckoutCorrection,fiscalCorrectionAction,fiscalProductIssues,documentLabel:()=> 'NF-e',money:String});
 const draft={id:'note',documentType:'nfe',items:[product],commercialTotals:{orderDiscount:0,freight:0,insurance:0,other:0},checks:[],status:'Pronto para homologação'};
 const props={draft,company:{},onClose:()=>events.push('close'),onCheckout:async(_draft,action)=>{events.push(action);return{ok:true};}};
 const tree=fn.FiscalIssueReviewDialog(props);const buttons=nodes(tree).filter(n=>n.type==='Button');
 assert.deepEqual(buttons.map(n=>n.props.children),['Salvar','Salvar e emitir','Cancelar']);assert.ok(buttons.every(n=>!n.props.disabled));
 for(const state of ['submitted','processing','rejected']) { const pendingNote=nodes(fn.FiscalIssueReviewDialog({...props,draft:{...draft,remoteState:state},remoteStatus:{state,statusCode:state==='rejected'?'588':''}})).filter(n=>n.type==='Button'); assert.deepEqual(pendingNote.map(n=>n.props.children),['Salvar','Salvar e emitir','Cancelar']);assert.equal(pendingNote.find(n=>n.props.children==='Salvar e emitir').props.disabled,false); }
 buttons[0].props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(events,['save','close']);events.length=0;
 buttons[1].props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(events,['issue','close']);events.length=0;
 buttons[2].props.onClick();assert.deepEqual(events,['close']);
 const pending=nodes(fn.FiscalIssueReviewDialog({...props,draft:{...draft,checks:[{key:'certificado',ready:false,label:'Certificado',detail:'Pendente'}]}})).filter(n=>n.type==='Button');
 assert.equal(pending.find(n=>n.props.children==='Salvar').props.disabled,false);assert.equal(pending.find(n=>n.props.children==='Salvar e emitir').props.disabled,true);
 const failed=[];const failureTree=fn.FiscalIssueReviewDialog({...props,onClose:()=>failed.push('closed'),onCheckout:async()=>({ok:false,message:'Falha'})});nodes(failureTree).find(n=>n.type==='Button'&&n.props.children==='Salvar e emitir').props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(failed,[]);
});

test('falha de série mostra a correção no mesmo card e abre exatamente a numeração da nota',async()=>{
 const values=[];let cursor=0,selected;
 const useState=initial=>{const i=cursor++;if(!(i in values))values[i]=initial;return[values[i],value=>{values[i]=value;}];};
 const fn=compile(['fiscalIssueReviewChecks','FiscalIssueReviewDialog'],{useState,useEffect:()=>{},canResumeFiscalDraft,fiscalCheckoutCorrection,paymentMethodLabel:()=> 'À vista',useContext:()=>({can:()=>true}),PermissionContext:{},Dialog:'Dialog',Icon:'Icon',Table:'Table',BotaoAcaoCompacto:'Button',fiscalCorrectionAction,fiscalProductIssues,documentLabel:()=> 'NF-e',money:String});
 const draft={id:'note',documentType:'nfe',items:[product],commercialTotals:{orderDiscount:0,freight:0,insurance:0,other:0},checks:[],status:'Pronto para homologação'};
 const props={draft,company:{},onClose:()=>{throw Error('Não pode fechar na falha');},onCheckout:async()=>({ok:false,code:'AV-FISCAL-NUMBER-SEQUENCE',field:'numbering',message:'Configure uma série ativa antes de confirmar a emissão.'}),onResolveIssue:(...args)=>{selected=args;}};
 const render=()=>{cursor=0;return nodes(fn.FiscalIssueReviewDialog(props));};
 render().find(n=>n.type==='Button'&&n.props.children==='Salvar e emitir').props.onClick();await new Promise(resolve=>setImmediate(resolve));
 const correction=render().find(n=>n.type==='Button'&&n.props.children==='Configurar série e numeração');assert.ok(correction);assert.equal(correction.props.disabled,false);correction.props.onClick();assert.equal(selected[0],draft);assert.equal(selected[1],'numbering');
});

test('editor remoto carrega o servidor, exige preenchimento explícito e só fecha após confirmar o salvamento',async()=>{
 const slots=[];let cursor=0,effects=[],closed=0;const writes=[];
 const useState=initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];};
 const useRef=initial=>{const i=cursor++;return slots[i]??(slots[i]={current:initial});};
 const fn=compile(['FiscalNumberingDialog'],{FISCAL_NFE_NORMAL_SERIES,useState,useRef,useEffect:fn=>effects.push(fn),Dialog:'Dialog',BotaoAcaoCompacto:'Button'});
 const props={open:true,ledger:{},documentScope:['nfe'],onClose:()=>closed++,onLoadRemote:async()=>({ok:true,numbering:{exists:false,series:'',nextNumber:null,lastReservedNumber:0,version:0}}),onSaveRemote:async input=>{writes.push(input);return{ok:true};}};
 const render=()=>{cursor=0;effects=[];return nodes(fn.FiscalNumberingDialog(props));};
 render();effects.forEach(effect=>effect());await new Promise(resolve=>setImmediate(resolve));let all=render();
 assert.equal(all.find(n=>n.type==='input'&&n.props['aria-label']==='Próximo número da NF-e').props.value,'');
 all.find(n=>n.type==='Button'&&n.props.children==='Salvar numeração').props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.equal(writes.length,0);
 all.find(n=>n.type==='input'&&n.props['aria-label']==='Série da NF-e').props.onChange({target:{value:'1'}});all.find(n=>n.type==='input'&&n.props['aria-label']==='Próximo número da NF-e').props.onChange({target:{value:'17'}});all=render();
 assert.equal(all.find(n=>n.type==='input'&&n.props['aria-label']==='Próximo número da NF-e').props.value,'17');
 all.find(n=>n.type==='input'&&n.props['aria-label']==='Série da NF-e').props.onChange({target:{value:'2'}});all=render();assert.equal(all.find(n=>n.type==='input'&&n.props['aria-label']==='Próximo número da NF-e').props.value,'');
 all.find(n=>n.type==='input'&&n.props['aria-label']==='Próximo número da NF-e').props.onChange({target:{value:'17'}});all=render();
 all.find(n=>n.type==='Button'&&n.props.children==='Salvar numeração').props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(JSON.parse(JSON.stringify(writes)),[{series:'2',nextNumber:17,expectedVersion:0}]);assert.equal(closed,1);
});


test('nota persistida inicial ou rejeitada preserva a conferência do servidor, sem credenciamento local de demonstração',()=>{
 const start=source.indexOf('  const previewFiscalDraft = '),end=source.indexOf('  const revalidateFiscalDraft = ',start);assert.ok(start>0&&end>start);
 let evaluations=0;const scope={exports:{},created:[],catalogRecords:[],fiscalItemsForReview:items=>items,issuerSelectionForOrigin:()=>({}),evaluateFiscalDraft:()=>{evaluations++;return{items:[],validation:{checks:[{key:'issuer-route',ready:false,detail:'Pendente local'}],warnings:[],transmissionReady:false,draftReady:true},matrixResolution:{context:{},matched:true,reviewed:true,rule:{}}};}};
 vm.runInNewContext(ts.transpileModule(source.slice(start,end)+'\nexports.preview=previewFiscalDraft;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);
 const draft={persistenceSource:'server',remoteState:'rejected',status:'Bloqueado para transmissão',originId:'2026/1',documentType:'nfe',sourceLabel:'Pedido',items:[product],checks:[{key:'persisted-draft',ready:true},{key:'persisted-emission',ready:true}],series:'1',number:'1'};
 assert.strictEqual(scope.exports.preview(draft),draft);assert.equal(evaluations,0);assert.ok(draft.checks.every(check=>check.ready));
 const local={...draft,persistenceSource:undefined};assert.notStrictEqual(scope.exports.preview(local),local);assert.equal(evaluations,1);
 for(const remoteState of [undefined,'draft','rejected']){const initial={...draft,remoteState};assert.strictEqual(scope.exports.preview(initial),initial);assert.equal(evaluations,1);}
 const pending={...draft,remoteState:'draft',checks:[{key:'persisted-draft',ready:false,detail:'Cadastro incompleto'}]};assert.strictEqual(scope.exports.preview(pending),pending);assert.equal(scope.exports.preview(pending).checks[0].ready,false);
});
