import {sanitizarCnpj} from '../../lib/consultas/validators/cnpj.ts';
import {officialCfop,cfopNature,cfopOperation,configuredNoteCfop,noteItemCfop} from '../../app/vendas/lib/fiscal-cfop.mjs';
import {fiscalValidationIssue} from '../../app/vendas/lib/fiscal-validation.mjs';
import test from 'node:test';
import {newFiscalNoteFields,updateFiscalNoteFields,syncFiscalNoteNumbering} from '../../app/vendas/lib/fiscal-note-editor.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {randomUUID} from 'node:crypto';
import {opcoesClientePedido,clienteDoRegistro} from '../../app/vendas/lib/customer-selection.ts';
import {applyFiscalNoteEdit} from '../../app/vendas/lib/server/fiscal-note-edit.mjs';
import {createFiscalCorrectionRequest} from '../../app/vendas/lib/fiscal-status-bridge.mjs';
const draft={issuerSnapshot:{document:'12345678000195',establishmentId:'issuer'},customerSnapshot:{document:'11144477735',displayName:'Cliente',address:{city:'São Paulo'}},itemsSnapshot:[{sku:'A',quantity:1,unitPrice:10,unitDiscount:0,fiscal:{ncm:'33059000',cfop:'5102',origin:'0',csosn:'102'}}],totalsSnapshot:{total:10,additionalInfo:'Preservar observação'},paymentSnapshot:{method:'PIX',amount:10}};
const note={customerName:'Cliente',customerDocument:'11144477735',paymentMethod:'PIX estático',items:[{sku:'A',quantity:2,unitPrice:10,unitDiscount:1,ncm:'33059000',cfop:'5102'}],freight:2,insurance:0,otherExpenses:0,generalDiscount:1};
test('edição de nota altera retratos fiscais e recalcula totais; não toca origem, emissor nem objetos originais',()=>{
 const before=structuredClone(draft);const result=applyFiscalNoteEdit(draft,note);assert.ok(result.source);assert.equal(result.source.totalsSnapshot.total,19);assert.equal(result.source.paymentSnapshot.amount,19);assert.equal(result.source.paymentSnapshot.method,'PIX estático');assert.equal(result.source.totalsSnapshot.additionalInfo,'Preservar observação');assert.deepEqual(result.source.customerSnapshot.address,draft.customerSnapshot.address);assert.deepEqual(draft,before);assert.deepEqual(result.source.issuerSnapshot,before.issuerSnapshot);
 for(const changes of [{issuerSnapshot:{}},{paymentMethod:'PIX'},{paymentMethod:'PIX dinâmico'},{items:[{...note.items[0],sku:'OUTRO'}]},{items:[{...note.items[0],quantity:-1}]},{generalDiscount:999}])assert.ok(applyFiscalNoteEdit(draft,{...note,...changes}).error);
});
test('bridge conserva a edição explícita, empresa/emissão/versão e não converte PIX ambíguo automaticamente',()=>{
 const request=createFiscalCorrectionRequest({requestId:'correction-00001',emissionId:'10000000-0000-4000-8000-000000000001',expectedVersion:8,rejectedStatusCode:'391',note});assert.ok(request);assert.deepEqual(request.note,note);assert.notStrictEqual(request.note,note);assert.equal(request.expectedVersion,8);assert.equal(request.rejectedStatusCode,'391');assert.equal(createFiscalCorrectionRequest({...request,emissionId:'invalid'}),null);
});
test('correção usa a página real de emissão, sem Dialog e sem gravar pedido; conserva edição após falha',async()=>{
 const {calculateOrder,validateOrder,parseCommercialNumber}=await import('../../app/vendas/lib/domain.mjs');
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');const ast=ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='NewOrderView');assert.ok(fn);assert.equal(ast.statements.some(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='FiscalRejectedCorrectionDialog'),false);
 const slots=[];let cursor=0,saved,commercialWrites=0;const node=(type,props)=>typeof type==='function'?type(props):({type,props});const scope={sanitizarCnpj,officialCfop,cfopNature,cfopOperation,configuredNoteCfop,noteItemCfop,focarCampoComErro:()=>()=>{},fiscalValidationTarget:()=>'',fiscalValidationIssue,newFiscalNoteFields,updateFiscalNoteFields,syncFiscalNoteNumbering,exports:{},require:()=>({jsx:node,jsxs:node}),useContext:()=>({can:()=>true}),PermissionContext:{},useRef:()=>({current:null}),useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useEffect:()=>{},calculateOrder,validateOrder,parseCommercialNumber,formatLineNumber:String,commercialNumber:Number,todayIso:()=> '2026-11-06',isoAfterDays:()=> '2026-11-07',orderLineFromRecord:(line)=>({...line,id:line.sku,catalogItemId:'40000000-0000-4000-8000-000000000001',available:100,fiscalStatus:'Completo'}),validateFiscalIssuerRegistry:()=>({establishments:[]}),resolveFiscalIssuerSelection:()=>({valid:true,warnings:[]}),documentLabel:String,fiscalCheckoutCorrection:()=>'',fiscalOperationContext:()=>({destination:'Dentro da UF'}),resolveFiscalMatrixRule:()=>({rule:{cfopOverride:'5102'}}),usaFiscalEmpresa:()=>true,ModalConfirmacao:'ModalConfirmacao',NoteItemEditor:'NoteItemEditor',ProductRegistration:'ProductRegistration',ClientFormDialog:'ClientFormDialog',Dialog:'Dialog',window:{parent:{postMessage:()=>{}},location:{origin:'https://example.test'}},fittedNumericFontSize:()=>14,money:String,percent:String,Tooltip:'Tooltip',Badge:'Badge',Icon:'Icon',EmptyState:'EmptyState',CatalogSearch:'CatalogSearch',LineNumberEditor:'LineNumberEditor',MoneyInput:'MoneyInput',CampoMoeda:'CampoMoeda',BotaoAcaoCompacto:'Button',paymentMethodLabel:String};
 Object.assign(scope,{crypto:{randomUUID},useMemo:fn=>fn(),opcoesClientePedido,clienteDoRegistro,CampoSelecaoPesquisavel:'CampoSelecaoPesquisavel'});
 const noticeScope={exports:{},require:id=>id.endsWith('.css')?{default:{}}:{jsx:node,jsxs:node}};vm.runInNewContext(ts.transpileModule(readFileSync('app/components/AvisoFormulario.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,noticeScope);scope.AvisoFormulario=noticeScope.exports.default;
 vm.runInNewContext(ts.transpileModule(fn.getText(ast)+'\nexports.render=NewOrderView;',{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
 const nodes=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];
 const props={companyId:'10000000-0000-4000-8000-000000000001',fiscalOnly:true,connected:true,clientRecords:[{id:'client',name:'Cliente',document:'11144477735'}],catalogRecords:[{catalogItemId:'40000000-0000-4000-8000-000000000001',sku:'A',name:'Produto',unit:'UN',ncm:'33059000',cfopInternal:'5102',icmsCode:'102',pisCst:'49',cofinsCst:'49',icmsRate:0}],settings:{company:{taxRegime:'Simples Nacional'},commercial:{defaultSeller:'Vendedor'},payments:{enabledMethods:['pix'],defaultMethod:'pix',defaultInstallments:1,firstDueDays:0},fiscal:{documentScope:['nfe'],matrix:{rules:[]}}},issuerRegistry:{defaultEstablishmentId:'issuer'},initialRecord:{id:'1',client:'Cliente',status:'Rascunho',order:{lines:[{sku:'A',name:'Produto',quantity:1,unitPrice:10,unitDiscount:0,kind:'produto',unit:'UN',cost:0}],commercialTotals:{freight:0,orderDiscount:0,insurance:0,other:0},installments:1,firstDueDate:'2026-11-07',operationNature:'Venda de mercadoria'}},correction:{draft:{paymentMethod:'PIX',clientDocument:'11144477735',items:[{sku:'A',ncm:'33059000',cfopInternal:'5102',noteItemOverrides:{icmsCode:''}}]},status:{state:'rejected',number:1,series:'1',statusCode:'391',statusReason:'Pagamento'},onSave:async(note,issue)=>{saved={note,issue};return {ok:false,message:'Falha sintética de validação'};}},onCancel:()=>{},onCreated:()=>commercialWrites++};
 const render=()=>{cursor=0;return nodes(scope.exports.render(props));};let tree=render();assert.equal(tree.some(n=>n.type==='Dialog'),false);assert.ok(tree.some(n=>n.type==='CatalogSearch'));assert.ok(tree.some(n=>n.type==='CampoMoeda'));assert.ok(!tree.some(n=>n.type==='input'&&n.props?.maxLength===8));assert.ok(tree.some(n=>n.type==='textarea'));assert.ok(tree.some(n=>n.type==='h1'&&String(n.props.children).includes('Corrigir NF-e')));
 tree.find(n=>n.type==='button'&&n.props['aria-label']==='Editar item de Produto nesta nota').props.onClick();tree=render();let itemPopup=tree.find(n=>n.type==='NoteItemEditor');assert.ok(itemPopup);assert.equal(itemPopup.props.initial.icmsCode,'102');itemPopup.props.onCancel();tree=render();assert.equal(tree.some(n=>n.type==='NoteItemEditor'),false);tree.find(n=>n.type==='button'&&n.props['aria-label']==='Editar item de Produto nesta nota').props.onClick();tree=render();itemPopup=tree.find(n=>n.type==='NoteItemEditor');itemPopup.props.onCatalog();tree=render();const popup=tree.find(n=>n.type==='ProductRegistration');assert.ok(popup);assert.equal(popup.props.companyId,props.companyId);assert.equal(popup.props.initialProductId,props.catalogRecords[0].catalogItemId);assert.equal(popup.props.embeddedProduct,true);popup.props.onProductSaved({id:props.catalogRecords[0].catalogItemId,sku:'A',nome:'Produto atualizado',unidade:'UN',ncm:'33051000',usar_fiscal_empresa:true});tree=render();assert.equal(tree.some(n=>n.type==='Dialog'),false);assert.ok(tree.some(n=>n.type==='LineNumberEditor'&&n.props.label==='Quantidade de Produto atualizado'&&n.props.value===1));assert.ok(tree.some(n=>n.type==='CampoMoeda'&&n.props.value==='10'));
 // Cadastro novo só seleciona após confirmação e publicação no catálogo, sem adicionar à nota.
 tree.find(n=>n.type==='CatalogSearch').props.onNewProduct();tree=render();
 let newPopup=tree.find(n=>n.type==='ProductRegistration');assert.equal(newPopup.props.initialNewType,'produto');assert.equal(newPopup.props.initialProductId,undefined);
 newPopup.props.onProductCancel();tree=render();assert.equal(tree.some(n=>n.type==='Dialog'),false);
 tree.find(n=>n.type==='CatalogSearch').props.onNewProduct();tree=render();newPopup=tree.find(n=>n.type==='ProductRegistration');
 newPopup.props.onProductSaved({id:'new-product'});tree=render();assert.equal(tree.some(n=>n.type==='Dialog'),false);
 assert.ok(tree.some(n=>n.type==='LineNumberEditor'&&n.props.label==='Quantidade de Produto atualizado'&&n.props.value===1));
 assert.equal(tree.find(n=>n.type==='CatalogSearch').props.selectionRequest,null);
 const newItem={...props.catalogRecords[0],catalogItemId:'new-product',sku:'B',name:'Produto novo',saleStatus:'Ativo'};
 props.catalogRecords=[...props.catalogRecords,newItem];let pendingEffect;
 scope.useEffect=(fn,deps)=>{if(deps?.[1]===props.catalogRecords)pendingEffect=fn;};tree=render();assert.ok(pendingEffect);pendingEffect();tree=render();
 assert.equal(tree.find(n=>n.type==='CatalogSearch').props.selectionRequest,newItem);
 assert.ok(tree.some(n=>n.props?.name==='customerId'&&n.props.value==='client'));scope.useEffect=()=>{};
 props.onSaveClient=async client=>{props.clientRecords=[client];return {ok:true};};
 tree.find(n=>n.props?.['aria-label']==='Editar cliente selecionado').props.onClick();tree=render();let customerPopup=tree.find(n=>n.type==='ClientFormDialog');assert.ok(customerPopup);assert.equal(customerPopup.props.client.id,'client');
 customerPopup.props.onClose();tree=render();assert.equal(tree.some(n=>n.type==='ClientFormDialog'),false);assert.ok(tree.some(n=>n.props?.name==='customerId'&&n.props.value==='client'));
 tree.find(n=>n.props?.['aria-label']==='Editar cliente selecionado').props.onClick();tree=render();customerPopup=tree.find(n=>n.type==='ClientFormDialog');assert.equal((await customerPopup.props.onSave({...props.clientRecords[0],name:'Cliente atualizado',legalName:'Cliente atualizado',fiscal:'Contribuinte ICMS'})).ok,true);customerPopup.props.onClose();tree=render();assert.ok(tree.some(n=>n.props?.name==='customerId'&&n.props.value==='client'));assert.equal(tree.find(n=>n.props?.name==='customerId').props.options[0].selectedLabel,'Cliente atualizado');assert.ok(tree.some(n=>n.type==='LineNumberEditor'&&n.props.label==='Quantidade de Produto atualizado'&&n.props.value===1));assert.ok(tree.some(n=>n.type==='CampoMoeda'&&n.props.value==='10'));assert.equal(commercialWrites,0);
 tree.find(n=>n.props?.name==='customerId').props.onChange('');tree=render();
 const novo=tree.find(n=>n.props?.['aria-label']==='Cadastrar novo cliente');assert.ok(novo);assert.equal(novo.props.disabled,false);assert.equal(novo.props.variante,'primario');assert.equal(novo.props.somenteIcone,false);
 novo.props.onClick();tree=render();customerPopup=tree.find(n=>n.type==='ClientFormDialog');assert.equal(customerPopup.props.client,null);
 customerPopup.props.onClose();tree=render();assert.ok(tree.some(n=>n.props?.name==='customerId'&&n.props.value===''));
 tree.find(n=>n.props?.['aria-label']==='Cadastrar novo cliente').props.onClick();tree=render();customerPopup=tree.find(n=>n.type==='ClientFormDialog');
 assert.equal((await customerPopup.props.onSave({id:'new-client',name:'Novo cliente sintético',document:'11144477735'})).ok,true);customerPopup.props.onClose();tree=render();
 assert.ok(tree.some(n=>n.props?.name==='customerId'&&n.props.value==='new-client'));assert.equal(tree.find(n=>n.props?.name==='customerId').props.options[0].selectedLabel,'Novo cliente sintético');assert.ok(tree.some(n=>n.props?.['aria-label']==='Editar cliente selecionado'));assert.ok(tree.some(n=>n.type==='LineNumberEditor'&&n.props.label==='Quantidade de Produto atualizado'&&n.props.value===1));assert.equal(commercialWrites,0);
 const payment=tree.find(n=>n.type==='select'&&n.props.value==='');assert.ok(payment);payment.props.onChange({target:{value:'PIX estático'}});tree=render();await tree.find(n=>n.type==='Button'&&n.props.children==='Salvar').props.onClick();await new Promise(resolve=>setImmediate(resolve));tree=render();assert.equal(saved.note.paymentMethod,'PIX estático');assert.equal(saved.issue,false);assert.equal(commercialWrites,0);assert.ok(tree.some(n=>n.type==='p'&&n.props.children==='Falha sintética de validação'));assert.ok(tree.some(n=>n.type==='select'&&n.props.value==='PIX estático'));assert.equal(saved.note.items[0].sku,'A');
 Object.assign(scope,{priceFromTable:item=>item.price||10,validateFiscalNoteFields:()=>[],previewInstallments:()=>[],NoteOperationFields:'NoteOperationFields',NoteDetailsFields:'NoteDetailsFields',NoteTransportFields:'NoteTransportFields',NoteObservationsFields:'NoteObservationsFields',NoteWithholdingFields:'NoteWithholdingFields'});
 props.settings.commercial.sellers=['Vendedor'];props.settings.fiscal.matrix={reviewedBy:'Responsável',reviewedAt:'2026-11-17',rules:['Dentro da UF','Fora da UF'].map((destination,index)=>({id:`regra-${index}`,documentType:'nfe',operation:'Venda',destination,recipientProfile:'Qualquer',consumerFinal:'Qualquer',presence:'Qualquer',issuePurpose:'Normal',active:true,reviewed:true,cfopOverride:index?'6102':'5102'}))};scope.fiscalOperationContext=()=>({operation:'Venda',destination:'Dentro da UF',recipientProfile:'Não contribuinte',consumerFinal:'Sim',presence:'Não presencial',issuePurpose:'Normal'});props.fiscalEditor={priceTables:[],clientPriceTables:{}};props.catalogRecords=props.catalogRecords.map(item=>({...item,cfopInterstate:'6102'}));
 tree=render();let cfop=tree.find(n=>n.props?.name==='itemCfop');assert.ok(cfop);assert.equal(cfop.props.value,'5102');assert.equal(cfop.props.readOnly,undefined);
 tree.find(n=>n.type==='NoteDetailsFields').props.onChange({destination:'2'});tree=render();cfop=tree.find(n=>n.props?.name==='itemCfop');assert.equal(cfop.props.value,'6102');
 cfop.props.onChange({target:{value:'6108'}});tree=render();assert.equal(tree.find(n=>n.props?.name==='itemCfop').props.value,'6108');
 await tree.find(n=>n.type==='Button'&&n.props.children==='Salvar').props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.equal(saved.note.items[0].cfop,'6108');assert.equal(commercialWrites,0);
});

test('adição e remoção usam produtos resolvidos no perfil; troca de destinatário exige cadastro do perfil',()=>{
 const catalogItems=[{id:'product-B',sku:'B',name:'Produto B',type:'produto',unit:'UN',fiscal:{ncm:'33059000'},fiscalReady:true}];const row={...note.items[0],sku:'B',productId:'product-B'};
 assert.ok(applyFiscalNoteEdit(draft,{...note,items:[row]}).error);
 const edited=applyFiscalNoteEdit(draft,{...note,items:[row],operationNature:'Venda de mercadoria',installments:2,firstDueDate:'2026-11-07'},{catalogItems});assert.ok(edited.source);assert.equal(edited.source.itemsSnapshot.length,1);assert.equal(edited.source.itemsSnapshot[0].productId,'product-B');assert.equal(edited.source.itemsSnapshot[0].name,'Produto B');assert.equal(edited.source.paymentSnapshot.installments,2);assert.equal(edited.source.totalsSnapshot.operationNature,'Venda de mercadoria');
 assert.ok(applyFiscalNoteEdit(draft,{...note,customerDocument:'12345678000195'}).error);
 const customer={document:'12345678000195',address:{city:'Campinas',state:'SP'}};assert.equal(applyFiscalNoteEdit(draft,{...note,customerDocument:customer.document},{customer}).source.customerSnapshot.address.city,'Campinas');
 assert.ok(applyFiscalNoteEdit(draft,{...note,firstDueDate:'2026-02-31'}).error);
});

test('CFOP alterado na nota prevalece sobre padrão publicado e continua validado pela UF, sem mudar tributos herdados',async()=>{
 const {createCommercialFiscalRuleResolver}=await import('../../app/vendas/lib/server/commercial-fiscal-rules.mjs');const {createDefaultFiscalMatrix}=await import('../../app/vendas/lib/fiscal-matrix.mjs');
 const matrix=createDefaultFiscalMatrix();matrix.reviewedBy='Responsável sintético';matrix.reviewedAt='2026-11-05';const rule=matrix.rules.find(rule=>rule.id==='nfe-venda-consumidor-final');assert.ok(rule);matrix.rules=[{...rule,active:true,reviewed:true,cfopOverride:'5102'}];
 const profile={state:'SP',taxRegime:'simples_nacional',fiscalConfiguration:{cfopInternal:'5102',cfopInterstate:'6102',originCode:'0',csosn:'102',pisCst:'49',cofinsCst:'49'}};
 const original={...structuredClone(draft),issuerSnapshot:{...draft.issuerSnapshot,...profile},customerSnapshot:{...draft.customerSnapshot,consumerFinal:true,address:{state:'SP',city:'São Paulo'}},itemsSnapshot:[{...draft.itemsSnapshot[0],unit:'UN',fiscal:{...draft.itemsSnapshot[0].fiscal,useCompanyFiscal:true}}]};
 const source=applyFiscalNoteEdit(original,{...note,items:[{...note.items[0],cfop:'5101'}]}).source;
 const resolver=createCommercialFiscalRuleResolver({repository:{getPublished:async()=>({status:'publicada',taxReviewConfirmed:true,taxReformReviewConfirmed:true,matrix})}});
 const resolve=items=>resolver({companyId:'10000000-0000-4000-8000-000000000001',documentType:'nfe',issuer:source.issuerSnapshot,customer:source.customerSnapshot,items});
 const before=await resolve(original.itemsSnapshot);assert.equal(before.valid,true,JSON.stringify(before.errors));assert.equal(before.items.A.cfop,'5102');
 const after=await resolve(source.itemsSnapshot);assert.equal(after.valid,true,JSON.stringify(after.errors));assert.equal(after.items.A.cfop,'5101');assert.equal(after.items.A.icmsCode,before.items.A.icmsCode);assert.equal(after.items.A.pisCst,before.items.A.pisCst);assert.equal(matrix.rules[0].cfopOverride,'5102');assert.equal(original.itemsSnapshot[0].fiscal.noteCfopOverride,undefined);
 assert.equal((await resolve([{...source.itemsSnapshot[0],fiscal:{...source.itemsSnapshot[0].fiscal,noteCfopOverride:'6102'}}])).valid,false);
});

test('busca seleciona o cadastro confirmado, habilita Adicionar e preserva o preço da lista atual',()=>{
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),ast=ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='CatalogSearch');
 const slots=[];let cursor=0,effects=[],added;const node=(type,props)=>({type,props});
 const scope={exports:{},require:()=>({jsx:node,jsxs:node}),useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useRef:()=>({current:null}),useMemo:fn=>fn(),useEffect:(fn,deps)=>{if(deps.length===1)effects.push(fn);},normalizeSearch:value=>value.toLowerCase(),Icon:'Icon',money:String,window:{setTimeout:()=>0,clearTimeout:()=>{}},document:{addEventListener:()=>{},removeEventListener:()=>{}}};
 vm.runInNewContext(ts.transpileModule(fn.getText(ast)+'\nexports.render=CatalogSearch;',{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
 const product={catalogItemId:'id-new',sku:'NEW',name:'Produto novo',saleStatus:'Ativo',category:'Produto acabado',price:25,unit:'UN',available:0};
 const props={id:'search',items:[product],onNewProduct:()=>{},onAdd:item=>added=item,selectionRequest:null};
 const nodes=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];
 const render=()=>{cursor=0;effects=[];return nodes(scope.exports.render(props));};
 let tree=render();assert.equal(tree.find(n=>n.props?.className?.includes('catalog-add-button')).props.disabled,true);
 props.selectionRequest=product;tree=render();effects[0]();tree=render();
 assert.equal(tree.find(n=>n.props?.role==='combobox').props.value,'NEW · Produto novo');
 const add=tree.find(n=>n.props?.className?.includes('catalog-add-button'));assert.equal(add.props.disabled,false);assert.equal(added,undefined);add.props.onClick();assert.equal(added.price,25);assert.equal(added.catalogItemId,'id-new');
 tree=render();assert.equal(tree.find(n=>n.props?.role==='combobox').props.value,'');
});

test('pagamento eletrônico aceita CNPJ com máscara e aponta a pendência no campo correto',()=>{
 const detail={integrationType:'2',institutionDocument:'10.573.521/0001-91',authorizationCode:'ABC123'};
 const electronic={...note,paymentMethod:'Cartão de crédito',paymentDetails:detail};
 const before=structuredClone(electronic);
 const result=applyFiscalNoteEdit(draft,electronic);
 assert.equal(result.source.paymentSnapshot.details.institutionDocument,'10573521000191');
 assert.deepEqual(electronic,before);
 for(const [field,value] of [['integrationType',''],['institutionDocument','1057']]){
  const failure=applyFiscalNoteEdit(draft,{...electronic,paymentDetails:{...detail,[field]:value}});
  assert.equal(failure.error.field,field);
  assert.equal(fiscalValidationIssue(failure.error).field,field);
 }
 assert.ok(applyFiscalNoteEdit(draft,{...electronic,paymentDetails:{...detail,authorizationCode:''}},{allowPending:true}).source);
});

test('correção com cartão externo sem autorização conserva forma, valores e dados do pagamento',()=>{
 const result=applyFiscalNoteEdit(draft,{...note,paymentMethod:'Cartão de crédito',paymentDetails:{integrationType:'2',institutionDocument:'10573521000191',authorizationCode:''}});
 assert.ok(result.source,JSON.stringify(result.error));
 assert.equal(result.source.paymentSnapshot.details.authorizationCode,'');
 assert.equal(result.source.paymentSnapshot.method,'Cartão de crédito');
 assert.equal(result.source.paymentSnapshot.amount,19);
});

test('ajustes do item ficam no retrato da nota e preservam produto, emissor e outras notas',async()=>{
 const {applyNoteItemFiscal,validateNoteItem}=await import('../../app/vendas/lib/fiscal-note-item.mjs');
 const before=structuredClone(draft);const noteItem={name:'Descrição exclusiva',unit:'UN',ncm:'33051000',cfop:'5102',originCode:'0',icmsCode:'102',pisCst:'08',cofinsCst:'08',taxableUnit:'UN',ipiCst:'53',ipiLegalCode:'999'};
 assert.equal(validateNoteItem(noteItem),'');const result=applyFiscalNoteEdit(draft,{...note,items:[{...note.items[0],noteItem,ncm:noteItem.ncm}]});assert.ok(result.source);assert.equal(result.source.itemsSnapshot[0].name,'Descrição exclusiva');assert.deepEqual(result.source.itemsSnapshot[0].fiscal.noteItemOverrides,noteItem);assert.deepEqual(draft,before);assert.deepEqual(result.source.issuerSnapshot,before.issuerSnapshot);
 const catalog={ncm:'33059000',pisCst:'49',cofinsCst:'49'};assert.equal(applyNoteItemFiscal(catalog,noteItem).pisCst,'08');assert.equal(catalog.pisCst,'49');assert.ok(validateNoteItem({...noteItem,catalogItemId:'foreign'}));assert.ok(validateNoteItem({...noteItem,ipiCst:'50'}));
});

test('exceção antiga vazia herda CSOSN da empresa atual, sem alterar exceções preenchidas nem retratos',async()=>{
 const {createCommercialFiscalRuleResolver}=await import('../../app/vendas/lib/server/commercial-fiscal-rules.mjs');const {createDefaultFiscalMatrix}=await import('../../app/vendas/lib/fiscal-matrix.mjs');
 const matrix=createDefaultFiscalMatrix();matrix.reviewedBy='Responsável sintético';matrix.reviewedAt='2026-11-17';matrix.rules=matrix.rules.filter(r=>r.id==='nfe-venda-consumidor-final').map(r=>({...r,active:true,reviewed:true,cfopOverride:'5102'}));
 const issuer={establishmentId:'10000000-0000-4000-8000-000000000001',state:'SP',taxRegime:'simples_nacional',fiscalConfiguration:{originCode:'0',csosn:'102',pisCst:'07',cofinsCst:'07'}};
 const item={sku:'001',name:'Produto sintético',unit:'un',fiscal:{ncm:'84145110',taxableUnit:'un',useCompanyFiscal:true,noteCfopOverride:'6102',noteItemOverrides:{icmsCode:'',pisCst:'08',cofinsCst:'08'}}};const before=structuredClone(item);
 const resolver=createCommercialFiscalRuleResolver({repository:{getPublished:async()=>({status:'publicada',taxReviewConfirmed:true,taxReformReviewConfirmed:true,matrix})},issuerResolver:async()=>issuer});
 const request={companyId:issuer.establishmentId,documentType:'nfe',issuer:{...issuer,fiscalConfiguration:{}},customer:{consumerFinal:true,stateRegistrationIndicator:'9',address:{state:'RJ'}},items:[item]};
 const result=await resolver(request);assert.equal(result.valid,true,JSON.stringify(result.errors));assert.equal(result.items['001'].icmsCode,'102');assert.equal(result.items['001'].pisCst,'08');assert.equal(result.items['001'].cofinsCst,'08');assert.equal(result.items['001'].cfop,'6102');assert.deepEqual(item,before);
 const noDefaults=createCommercialFiscalRuleResolver({repository:{getPublished:async()=>({status:'publicada',taxReviewConfirmed:true,taxReformReviewConfirmed:true,matrix})},issuerResolver:async()=>({...issuer,fiscalConfiguration:{...issuer.fiscalConfiguration,csosn:''}})});const missing=await noDefaults(request);assert.equal(missing.valid,false);assert.match(missing.errors[0].message,/CST\/CSOSN/);
});
