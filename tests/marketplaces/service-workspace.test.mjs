import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
import {existsSync,readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {contactOptions,serviceMessages,validServiceMessage,conversationReason} from '../../app/modules/marketplaces/post-sale-workspace.ts';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(specifier,context,next){
 if(specifier==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
 if(specifier==='./management-access')return {url:'data:text/javascript,export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}',shortCircuit:true};
 if(specifier==='./mercadolivre-management')return {url:'data:text/javascript,export async function loadConnection(db,company,id){if(company!==db.company||id!==db.connection.id)throw Error("Conta não encontrada");return db.connection;}export async function mlRequest(db,c,path){return db.read(path)}export async function mlServiceRequest(db,c,path,options={}){if(options.method==="POST")return db.send(path,options);return {status:200,payload:await db.read(path)};}',shortCircuit:true};
 let p;if(specifier.startsWith('@/'))p=resolve(root,specifier.slice(2));else if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))p=resolve(dirname(new URL(context.parentURL).pathname),specifier);
 if(p&&existsSync(p+'.ts'))return next(pathToFileURL(p+'.ts').href,context);return next(specifier,context);
}});
const {serviceWorkspace,sendServiceCommand,uploadServiceAttachment,downloadServiceAttachment}=await import('../../app/modules/marketplaces/services/post-sale-workspace.ts');hooks.deregister();
const company='11111111-1111-4111-8111-111111111111',connectionId='22222222-2222-4222-8222-222222222222',saleId='33333333-3333-4333-8333-333333333333',actor='44444444-4444-4444-8444-444444444444',providerId='2000019176480356';
class Query{
 constructor(db,table){this.db=db;this.table=table;this.filters=[];}select(){return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}in(k,v){this.filters.push(r=>v.includes(r[k]));return this;}order(key,{ascending=true}={}){this.sort={key,ascending};return this;}limit(max){this.max=max;return this;}single(){this.one=true;return this;}maybeSingle(){this.one=true;return this;}insert(v){this.inserted=v;return this;}update(v){this.updated=v;return this;}
 then(ok,fail){return Promise.resolve().then(()=>{if(this.db.databaseFails&&this.table.includes('commands'))return {error:{code:'database'},data:null};const rows=this.db.tables[this.table]||=[];
 if(this.inserted){const v=this.inserted;const duplicate=rows.some(r=>r.id===v.id||this.table.endsWith('commands')&&r.sale_id===v.sale_id&&r.channel===v.channel&&(['sending','uncertain','pending_review'].includes(r.state)&&(r.action==='message')===(v.action==='message')||r.state!=='rejected'&&r.action===v.action&&r.destination===v.destination&&r.basis_hash===v.basis_hash&&r.payload_hash===v.payload_hash));if(duplicate)return {error:{code:'23505'},data:null};rows.push({...structuredClone(v),created_at:new Date().toISOString()});}
 let found=rows.filter(r=>this.filters.every(f=>f(r)));if(this.sort)found.sort((a,b)=>(String(a[this.sort.key]||'').localeCompare(String(b[this.sort.key]||'')))*(this.sort.ascending?1:-1));if(this.max)found=found.slice(0,this.max);if(this.updated)for(const r of found)Object.assign(r,this.updated);return {data:structuredClone(this.one?found[0]||null:found),error:null};}).then(ok,fail);}
}
function fixture(){const db={company,connection:{id:connectionId,empresa_id:company,seller_reference:'123'},tables:{marketplace_sales:[{id:saleId,empresa_id:company,connection_id:connectionId,provider:'mercado_livre',provider_order_id:providerId}]},reads:[],sends:[],messages:[],conversation:{status:'active',substatus:null},claims:[],guide:{},order:{id:providerId,pack_id:'2000000000000001',site_id:'MLB',status:'paid',last_updated:'2026-11-06T00:00:00Z',seller:{id:'123'}},
 from(table){return new Query(this,table)},async read(path){this.reads.push(path);if(path.startsWith('/orders/'))return this.order;if(path.includes('/claims/search?'))return {data:this.claims,paging:{total:this.claims.length}};if(/\/claims\/\d+$/.test(path))return this.claims.find(c=>c.id===path.split('/').at(-1))||{};if(path.endsWith('/messages'))return this.claimMessages||[];if(path.endsWith('/evidences'))return this.evidences||[];if(path.includes('/messages/packs/'))return {messages:this.messages,conversation_status:this.conversation,paging:{total:this.messages.length}};if(path.includes('action_guide'))return this.guide;if(path.includes('available-offers'))return {currency_id:'BRL',available_offers:[{percentage:50,amount:100},{percentage:90,amount:180}]};throw Error('unexpected '+path)},async send(path,options){this.sends.push({path,options});return this.sendResult||{status:201,payload:{id:'outgoing1',status:'available'}}}};return db;}
const load=(db,channel='order')=>serviceWorkspace(db,company,connectionId,saleId,channel,true);
const command=(view,overrides={})=>({requestId:randomUUID(),connectionId,saleId,channel:view.channel,revision:view.revision,action:'message',text:'Olá, vamos ajudar com seu pedido.',destination:'buyer',...overrides});
const claim=(patch={})=>({id:'987',resource:'order',resource_id:providerId,status:'opened',stage:'claim',last_updated:'2026-11-06T00:00:00Z',players:[{type:'seller',role:'respondent',user_id:'123',available_actions:[{action:'send_message_to_complainant'},{action:'refund'},{action:'allow_return'},{action:'allow_partial_refund'},{action:'open_dispute'}]}],...patch});

test('limite da mensagem preserva acentos, recusa markup/controles e diferencia revisão de disponibilidade',()=>{
 assert.equal(validServiceMessage(' Olá!\r\nTudo bem? '),'Olá!\nTudo bem?');for(const text of ['','a'.repeat(351),'<script>x</script>','x\u0085y'])assert.equal(validServiceMessage(text),null);
 const messages=serviceMessages({messages:[{id:'1',from:{user_id:123},text:{plain:'<img src=x>'},status:'pending_review',attachments:[]}]},'123');assert.equal(messages[0].text,'<img src=x>');assert.equal(messages[0].status,'pending_review');assert.equal(messages[0].author,'seller');
 assert.match(conversationReason({status:'blocked',substatus:'blocked_by_mediation'}),/reclamação/);
});
test('motivos usam somente cota confirmada e template recebido; quota zero e desconhecidos não liberam contato',()=>{
 assert.deepEqual(contactOptions({options:[{id:'OTHER',cap_available:0}]}),[]);
 const result=contactOptions({categories:[{cap_available:1,options:[{option_id:'OTHER'},{option_id:'REQUEST_VARIANTS',templates:[{template_id:'TEMPLATE___VARIANT_1',text:'Confirme a cor.'}]},{option_id:'FUTURE'}]}]});assert.equal(result.length,2);assert.equal(result[1].templateText,'Confirme a cor.');
});
test('consulta mantém mensagens não lidas e deriva pack e seller do pedido relido, nunca do navegador',async()=>{
 const db=fixture();const result=await load(db);assert.equal(result.canReply,true);assert.ok(db.reads.some(p=>p.includes('/packs/2000000000000001/sellers/123?')&&p.includes('mark_as_read=false')));assert.equal(db.sends.length,0);
});
test('empresa, venda e vendedor divergentes são bloqueados antes de acessar a conversa',async()=>{
 for(const mode of ['company','sale','seller']){const db=fixture();if(mode==='sale')db.tables.marketplace_sales[0].empresa_id='other';if(mode==='seller')db.order.seller.id='999';await assert.rejects(serviceWorkspace(db,mode==='company'?'55555555-5555-4555-8555-555555555555':company,connectionId,saleId,'order',true));assert.equal(db.reads.some(p=>p.startsWith('/messages/')),false);assert.equal(db.sends.length,0);}
});
test('envio usa o agente MLB, guarda recibo sem texto/token e repetir o mesmo pedido não envia outra vez',async()=>{
 const db=fixture(),view=await load(db),input=command(view,{packId:'999',sellerId:'999',to:'999'});let result=await sendServiceCommand(db,company,actor,input);assert.equal(result.operation.state,'completed');assert.equal(db.sends[0].options.body.to.user_id,'3037675074');assert.ok(db.sends[0].path.includes('/packs/2000000000000001/sellers/123'));
 result=await sendServiceCommand(db,company,actor,input);assert.equal(result.alreadyRequested,true);assert.equal(db.sends.length,1);const stored=db.tables.marketplace_post_sale_commands[0];assert.ok(!JSON.stringify(stored).includes(input.text));assert.equal(Object.hasOwn(stored,'token'),false);
 await assert.rejects(sendServiceCommand(db,company,actor,{...input,text:'Outro conteúdo.'}),/outra solicitação/);assert.equal(db.sends.length,1);
});
test('timeout é persistido e novo ID não repete a mesma mensagem; releitura confirmada resolve a pendência',async()=>{
 const db=fixture(),view=await load(db),input=command(view);db.send=async(path,options)=>{db.sends.push({path,options});throw Error('network')};
 const result=await sendServiceCommand(db,company,actor,input);assert.equal(result.operation.state,'uncertain');let updated=await load(db);assert.equal(updated.canReply,false);await assert.rejects(sendServiceCommand(db,company,actor,command(updated)),/registrada/);assert.equal(db.sends.length,1);
 db.messages=[{id:'confirmed1',from:{user_id:123},date:new Date().toISOString(),text:input.text,status:'available'}];updated=await load(db);assert.equal(updated.operations[0].state,'completed');assert.equal(updated.canReply,true);
});
test('HTTP 202 e pending_review não são apresentados como mensagem entregue e bloqueiam repetição',async()=>{
 const db=fixture();db.sendResult={status:202,payload:{id:'pending1',status:'pending_review'}};const result=await sendServiceCommand(db,company,actor,command(await load(db)));assert.equal(result.operation.state,'pending_review');assert.equal((await load(db)).canReply,false);
 db.messages=[{id:'pending1',from:{user_id:123},text:'Em análise',status:'pending_review',date:new Date().toISOString()}];assert.equal((await load(db)).operations[0].state,'pending_review');db.messages[0].status='available';assert.equal((await load(db)).operations[0].state,'completed');
});
test('atualização concorrente preserva contexto: texto preparado não é enviado sobre conversa alterada',async()=>{
 const db=fixture(),view=await load(db);db.messages.push({id:'new',text:'Nova pergunta',from:{user_id:456},date:new Date().toISOString()});await assert.rejects(sendServiceCommand(db,company,actor,command(view)),/Chegou uma atualização/);assert.equal(db.sends.length,0);
});
test('bloqueio não é contornado; guia com quota permite só o motivo selecionado e não aceita anexos nesta etapa',async()=>{
 const db=fixture();db.conversation={status:'blocked',substatus:'blocked_by_buyer'};let view=await load(db);assert.equal(view.canReply,false);await assert.rejects(sendServiceCommand(db,company,actor,command(view)),/bloqueou/);
 db.conversation={status:'blocked',substatus:'blocked_by_conversation_initiated_by_seller_limited'};db.guide={options:[{id:'OTHER',cap_available:1}]};view=await load(db);await assert.rejects(sendServiceCommand(db,company,actor,command(view)),/motivo/);await sendServiceCommand(db,company,actor,command(view,{optionId:'OTHER'}));assert.ok(db.sends[0].path.includes('/action_guide/'));assert.equal(db.sends[0].options.body.option_id,'OTHER');
});
test('mediação permite somente o mediador, sem enviar ao comprador ou a reclamação alheia',async()=>{
 const db=fixture();db.claims=[claim({stage:'dispute',players:[{type:'seller',user_id:'123',available_actions:[{action:'send_message_to_mediator'}]}]})];let view=await load(db,'claim:987');assert.deepEqual(view.cases[0].destinations,['mediator']);await assert.rejects(sendServiceCommand(db,company,actor,command(view)),/destinatário/);await sendServiceCommand(db,company,actor,command(view,{destination:'mediator'}));assert.equal(db.sends[0].options.body.receiver_role,'mediator');
 db.claims[0].resource_id='2000000000000002';await assert.rejects(load(db,'claim:987'),/não pertence/);
});
test('soluções exigem confirmação e ação atual; reembolso parcial usa somente oferta atual do ML',async()=>{
 const db=fixture();db.claims=[claim()];const view=await load(db,'claim:987');await assert.rejects(sendServiceCommand(db,company,actor,command(view,{action:'refund'})),/Confirme/);await assert.rejects(sendServiceCommand(db,company,actor,command(view,{action:'partial_refund',confirmed:true,percentage:75})),/oferta/);
 await sendServiceCommand(db,company,actor,command(view,{action:'partial_refund',confirmed:true,percentage:50}));assert.deepEqual(db.sends[0].options.body,{percentage:50});assert.match(db.sends[0].path,/expected-resolutions\/partial-refund/);assert.equal(db.tables.marketplace_sales[0].provider_order_id,providerId);
});
test('sem histórico durável nenhuma mensagem ou solução é enviada',async()=>{const db=fixture(),view=await load(db);db.databaseFails=true;await assert.rejects(sendServiceCommand(db,company,actor,command(view)),/histórico/);assert.equal(db.sends.length,0);});
test('anexos de outra venda/conta ou expirados são recusados e download exige referência na conversa',async()=>{
 const db=fixture(),view=await load(db),id=randomUUID();db.tables.marketplace_post_sale_attachments=[{id,empresa_id:company,connection_id:connectionId,sale_id:'other',channel:'order',provider_id:'123_file.pdf',created_at:new Date().toISOString()}];await assert.rejects(sendServiceCommand(db,company,actor,command(view,{attachments:[id]})),/anexo/);await assert.rejects(downloadServiceAttachment(db,company,{connectionId,saleId,attachmentId:'123_file.pdf'}),/não foi confirmado/);assert.equal(db.sends.length,0);
});
test('upload verifica assinatura e limite antes de consultar o ML',async()=>{const db=fixture();await assert.rejects(uploadServiceAttachment(db,company,{connectionId,saleId},new File(['<html>'], 'imagem.png',{type:'image/png'})),/válido/);assert.equal(db.reads.length,0);});
test('rotas exigem gestão para escrita, corpo limitado e download privado sem executar conteúdo',()=>{
 const route=readFileSync(resolve(root,'app/api/modulos/marketplaces/vendas/atendimento/route.ts'),'utf8');assert.match(route,/authorizeMarketplace\(request,input.empresaId,'manage'\)/);assert.match(route,/await reader.cancel\(\)/);assert.match(route,/'X-Content-Type-Options':'nosniff'/);assert.match(route,/'Cache-Control': 'no-store'/);
});

test('revisão física: exige vínculo de devolução, motivo atual e evidência; não repõe saldo',async()=>{
 const db=fixture();db.claims=[claim({players:[{type:'seller',user_id:'123',available_actions:[{action:'return_review_ok'},{action:'return_review_fail'}]}]})];const read=db.read;
 db.read=async function(path){if(path.includes('/v2/claims/987/returns'))return {id:'567',claim_id:'987',status:'delivered',orders:[{order_id:providerId}]};if(path.includes('/returns/reasons?'))return [{id:'SRF2',detail:'Produto danificado',apply:['order']}];return read.call(this,path)};
 let view=await load(db,'claim:987');assert.equal(view.returnReview.id,'567');await assert.rejects(sendServiceCommand(db,company,actor,command(view,{action:'return_review_fail',confirmed:true,reviewReason:'SRF2',reviewText:'A tela chegou quebrada.'})),/exige foto/);
 const file=randomUUID();db.tables.marketplace_post_sale_attachments=[{id:file,empresa_id:company,connection_id:connectionId,sale_id:saleId,channel:'claim:987',purpose:'return_review',return_id:'567',provider_id:'123_evidence.png',created_at:new Date().toISOString()}];
 await sendServiceCommand(db,company,actor,command(view,{action:'return_review_fail',confirmed:true,reviewReason:'SRF2',reviewText:'A tela chegou quebrada.',reviewAttachments:[file]}));assert.match(db.sends[0].path,/returns\/567\/return-review/);assert.deepEqual(db.sends[0].options.body,[{reason:'SRF2',message:'A tela chegou quebrada.',attachments:['123_evidence.png']}]);assert.equal(db.tables.marketplace_sales[0].provider_order_id,providerId);
});
test('carrinho: não aprova outros pedidos; relato de problema fica limitado ao pedido atual',async()=>{
 const db=fixture();db.claims=[claim({players:[{type:'seller',user_id:'123',available_actions:[{action:'return_review_ok'},{action:'return_review_fail'}]}]})];const read=db.read;
 db.read=async function(path){if(path.includes('/v2/claims/987/returns'))return {id:'567',claim_id:'987',status:'delivered',orders:[{order_id:providerId},{order_id:'2000019176480357'}]};if(path.includes('/returns/reasons?'))return [{id:'SRF3',detail:'Produto incompleto',apply:['order']},{id:'SRF7',detail:'Pacote não chegou',apply:['package']}];return read.call(this,path)};
 const view=await load(db,'claim:987');assert.equal(view.cases[0].actions.includes('return_review_ok'),false);assert.deepEqual(view.returnReview.reasons.map(r=>r.id),['SRF3']);await sendServiceCommand(db,company,actor,command(view,{action:'return_review_fail',confirmed:true,reviewReason:'SRF3',reviewText:'Falta o acessório.'}));assert.equal(db.sends[0].options.body[0].order_id,Number(providerId));
});

test('prova e previsão de envio exigem ação explícita atual, data e transportadora; mediação bloqueia a postagem de prova',async(t)=>{
 // Já é dia 11 em UTC, mas a postagem ainda está no dia 10 em São Paulo.
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-11T01:00:00Z')});
 const db=fixture();db.claims=[claim({players:[{type:'seller',user_id:'123',available_actions:[{action:'add_shipping_evidence'},{action:'send_potential_shipping'}]}]})];let view=await load(db,'claim:987');const today='2026-11-10';
 await assert.rejects(sendServiceCommand(db,company,actor,command(view,{action:'shipping_evidence',confirmed:true,shipping:{date:today}})),/transportadora/);
 await assert.rejects(sendServiceCommand(db,company,actor,command(view,{action:'shipping_evidence',confirmed:true,shipping:{date:'2026-11-11',company:'Correios'}})),/data de postagem já realizada/);
 await sendServiceCommand(db,company,actor,command(view,{action:'shipping_evidence',confirmed:true,shipping:{date:today,company:'Correios',tracking:'BR123456789'}}));assert.match(db.sends[0].path,/actions\/evidences/);assert.equal(db.sends[0].options.body.shipping_method,'mail');assert.equal(db.sends[0].options.body.tracking_number,'BR123456789');
 db.claims[0].stage='dispute';view=await load(db,'claim:987');assert.equal(view.cases[0].actions.includes('shipping_evidence'),false);assert.equal(view.cases[0].actions.includes('shipping_promise'),false);
});
test('recibo pode ser reconciliado por outra consulta durante o POST sem virar erro ou provocar reenvio',async()=>{
 const db=fixture(),view=await load(db),input=command(view);db.send=async(path,options)=>{db.sends.push({path,options});db.messages=[{id:'race1',from:{user_id:'123'},text:input.text,date:new Date().toISOString(),status:'available'}];assert.equal((await load(db)).operations[0].state,'completed');return {status:201,payload:{id:'race1'}};};const result=await sendServiceCommand(db,company,actor,input);assert.equal(result.operation.state,'completed');assert.equal(result.operation.confirmationSource,'observation');assert.equal(db.sends.length,1);
});
test('pendência antiga continua visível e bloqueada mesmo com mais de 30 operações em outros canais',async()=>{
 const db=fixture();const rows=Array.from({length:35},(_,i)=>({id:randomUUID(),empresa_id:company,connection_id:connectionId,sale_id:saleId,channel:'claim:987',action:'message',state:'completed',created_at:new Date(Date.now()+i*1000).toISOString()}));rows.push({id:randomUUID(),empresa_id:company,connection_id:connectionId,sale_id:saleId,channel:'order',action:'message',state:'uncertain',created_at:'2020-01-01T00:00:00Z'});db.tables.marketplace_post_sale_commands=rows;const view=await load(db);assert.equal(view.canReply,false);assert.ok(view.operations.some(o=>o.channel==='order'&&o.state==='uncertain'));assert.equal(db.sends.length,0);
});

test('previsão de postagem incerta pode ser conferida por leitura sem reenviar a promessa',async()=>{
 const db=fixture();db.claims=[claim({players:[{type:'seller',user_id:'123',available_actions:[{action:'send_potential_shipping'}]}]})];const view=await load(db,'claim:987'),date=new Date(Date.now()+3*86400000).toISOString().slice(0,10);db.send=async(path,options)=>{db.sends.push({path,options});throw Error('timeout')};const result=await sendServiceCommand(db,company,actor,command(view,{action:'shipping_promise',confirmed:true,shipping:{date}}));assert.equal(result.operation.state,'uncertain');db.evidences=[{type:'handling_shipping_evidence',handling_date:date+'T00:00:00-03:00'}];const updated=await load(db,'claim:987');assert.equal(updated.operations[0].state,'completed');assert.equal(updated.operations[0].confirmationSource,'observation');assert.equal(db.sends.length,1);
});
test('template disponibilizado pelo Mercado Livre não é alterado pelo texto enviado pelo navegador',async()=>{
 const db=fixture();db.conversation={status:'blocked',substatus:'blocked_by_conversation_initiated_by_seller_limited'};db.guide={options:[{id:'REQUEST_VARIANTS',cap_available:1,templates:[{id:'TEMPLATE___VARIANT_1',text:'Confirme a variação.'}]}]};const view=await load(db);await sendServiceCommand(db,company,actor,command(view,{optionId:'REQUEST_VARIANTS',templateId:'TEMPLATE___VARIANT_1',text:'Texto adulterado'}));assert.deepEqual(db.sends[0].options.body,{option_id:'REQUEST_VARIANTS',template_id:'TEMPLATE___VARIANT_1'});
});

test('mensagem em revisão não congela soluções do caso; solução incerta bloqueia apenas outra solução',async()=>{
 const db=fixture();db.claims=[claim()];let view=await load(db,'claim:987');db.sendResult={status:202,payload:{id:'moderation',status:'pending_review'}};await sendServiceCommand(db,company,actor,command(view));view=await load(db,'claim:987');assert.equal(view.canReply,false);db.sendResult={status:200,payload:{}};await sendServiceCommand(db,company,actor,command(view,{action:'allow_return',confirmed:true}));assert.equal(db.sends.length,2);assert.match(db.sends[1].path,/allow-return/);
});

test('paginação usa o limite efetivamente devolvido pelo ML, não um salto fixo; páginas ignoradas são recusadas',async()=>{
 const db=fixture(),read=db.read;db.read=async function(path){if(path.includes('/messages/packs/'))return {messages:[{id:'page-message',from:{user_id:456},text:'Histórico'}],conversation_status:this.conversation,paging:{total:100,limit:10,offset:0}};return read.call(this,path)};
 const first=await load(db);assert.equal(first.nextOffset,10);assert.equal(first.hasMore,true);await assert.rejects(serviceWorkspace(db,company,connectionId,saleId,'order',true,10),/não confirmou esta página/);assert.equal(db.sends.length,0);
});
