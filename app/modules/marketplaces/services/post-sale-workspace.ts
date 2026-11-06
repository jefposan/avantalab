import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { loadConnection, mlRequest, mlServiceRequest, type SellerConnection } from './mercadolivre-management';
import { uuidIsValid } from './listing-model';
import { serviceObject as obj, serviceList as list, serviceText as txt, numericServiceId as num, serviceDate, serviceMessages, conversationReason, contactOptions, validServiceMessage, attachmentId, type ServiceCase, type ServiceAction, type ServiceWorkspace, type ServiceOperation } from '../post-sale-workspace';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const failed = () => new MarketplaceError(503,'service_history_unavailable','O histórico das solicitações não pôde ser conferido. Atualize o atendimento antes de enviar.');
const scoped = (db:SupabaseClient,table:string,s:Scope) => db.from(table).select('*').eq('empresa_id',s.company).eq('connection_id',s.connection.id).eq('sale_id',s.saleId);
const canonical = (text:string,attachments:string[],destination:string) => ({text:text.normalize('NFC').trim(),attachments:[...attachments].sort(),destination});
type Scope = { company:string; saleId:string; connection:SellerConnection; order:Record<string,unknown>; orderId:string; pack:string };
type CaseRead = { raw:Record<string,unknown>; detail:ServiceCase };

export async function loadServiceScope(db:SupabaseClient,company:string,connectionId:unknown,saleId:unknown):Promise<Scope>{
  if(!uuidIsValid(company)||!uuidIsValid(saleId))throw new MarketplaceError(400,'invalid_sale','Pedido inválido.');
  const connection=await loadConnection(db,company,connectionId);
  const saved=await db.from('marketplace_sales').select('id,provider_order_id').eq('empresa_id',company).eq('connection_id',connection.id).eq('provider','mercado_livre').eq('id',saleId).maybeSingle();
  if(saved.error)throw failed();
  if(!saved.data||!num(saved.data.provider_order_id))throw new MarketplaceError(404,'sale_not_found','Pedido não encontrado nesta conta.');
  const order=obj(await mlRequest(db,connection,`/orders/${saved.data.provider_order_id}`));
  if(num(order.id)!==saved.data.provider_order_id||num(obj(order.seller).id)!==connection.seller_reference)throw new MarketplaceError(409,'seller_mismatch','O Mercado Livre não confirmou o pedido desta conta.');
  const pack=num(order.pack_id||order.id);
  if(!pack||order.site_id&&order.site_id!=='MLB')throw new MarketplaceError(409,'unsupported_site','Este atendimento está disponível para pedidos do Mercado Livre Brasil.');
  return {company,saleId:String(saleId),connection,order,orderId:String(order.id),pack};
}
const read = async(db:SupabaseClient,s:Scope,path:string) => (await mlServiceRequest(db,s.connection,path)).payload;
function channelId(value:unknown){const v=String(value||'order');if(v!=='order'&&!/^claim:\d{1,24}$/.test(v))throw new MarketplaceError(400,'invalid_channel','Conversa inválida.');return v;}
async function readCase(db:SupabaseClient,s:Scope,id:string):Promise<CaseRead>{
  const raw=obj(await read(db,s,`/post-purchase/v1/claims/${id}`));
  const seller=list(raw.players).find(p=>p.type==='seller'&&num(p.user_id)===s.connection.seller_reference);
  if(num(raw.id)!==id||raw.resource!=='order'||num(raw.resource_id)!==s.orderId||!seller)throw new MarketplaceError(403,'foreign_claim','Este caso não pertence ao pedido desta conta.');
  const offered=raw.status==='opened'?list(seller.available_actions):[];
  const names=offered.map(a=>txt(a.action,80));
  const actions:ServiceAction[]=[];
  for(const [remote,local] of [['allow_return','allow_return'],['allow_return_label','allow_return'],['refund','refund'],['allow_partial_refund','partial_refund'],['open_dispute','open_dispute'],['return_review_ok','return_review_ok'],['return_review_fail','return_review_fail'],['add_shipping_evidence','shipping_evidence'],['send_shipping_evidence','shipping_evidence'],['send_potential_shipping','shipping_promise']] as const)if(names.includes(remote)&&!actions.includes(local))actions.push(local);
  if(raw.stage==='dispute'){for(const action of ['shipping_evidence','shipping_promise']){const index=actions.indexOf(action as ServiceAction);if(index>=0)actions.splice(index,1);}}
  const destinations:Array<'buyer'|'mediator'>=[];
  if(names.includes('send_message_to_complainant')&&raw.stage!=='dispute')destinations.push('buyer');
  if(names.includes('send_message_to_mediator'))destinations.push('mediator');
  const detail:ServiceCase={id,title:`Reclamação #${id}`,status:raw.status==='closed'?'Encerrada':raw.stage==='dispute'?'Em mediação':'Aberta',dueAt:offered.map(a=>serviceDate(a.due_date)).filter((v):v is string=>!!v).sort()[0]||null,actions,destinations,version:hash({id,status:raw.status,stage:raw.stage,updated:raw.last_updated,offered})};
  return {raw,detail};
}
function operation(row:Record<string,unknown>):ServiceOperation{return {id:String(row.id),channel:String(row.channel),action:String(row.action),state:String(row.state),createdAt:String(row.created_at),confirmationSource:typeof row.confirmation_source==='string'?row.confirmation_source:null,receiptId:typeof row.receipt_id==='string'?row.receipt_id:null};}
function messageState(value:unknown){const o=obj(value),m=obj(o.message_moderation||o.moderation);const state=txt(o.status||m.status,40);return ['pending_review','pending_translation','pending'].includes(state)?'pending_review':['rejected','moderated'].includes(state)?'rejected':'completed';}

async function workspace(db:SupabaseClient,s:Scope,channel:string,canManage:boolean,offset=0,onlySelected=false):Promise<ServiceWorkspace>{
  const warnings:string[]=[];const cases:CaseRead[]=[];let casesComplete=true;
  if(!onlySelected)try{
    const search=obj(await read(db,s,`/post-purchase/v1/claims/search?order_id=${s.orderId}&players.user_id=${s.connection.seller_reference}&players.role=respondent&limit=20&offset=0&sort=date_created:desc`));
    if(!Array.isArray(search.data))throw Error('invalid_search');
    const ids=[...new Set(list(search.data).map(c=>num(c.id)).filter(Boolean))];
    casesComplete=typeof obj(search.paging).total==='number'&&obj(search.paging).total===ids.length&&ids.length<=5;
    const loaded=await Promise.allSettled(ids.slice(0,5).map(id=>readCase(db,s,id)));for(const result of loaded){if(result.status==='fulfilled')cases.push(result.value);else casesComplete=false;}
    if(!casesComplete)warnings.push('O histórico de reclamações está incompleto. Os casos confirmados foram mantidos.');
  }catch{casesComplete=false;warnings.push('Não foi possível consultar todas as reclamações desta conta. Atualize o atendimento; isso não confirma ausência de casos.');}
  const claimId=channel.startsWith('claim:')?channel.slice(6):null;
  let selected=claimId?cases.find(c=>c.detail.id===claimId):null;
  if(claimId&&!selected){selected=await readCase(db,s,claimId);cases.push(selected);}
  const [recent,active]=await Promise.all([scoped(db,'marketplace_post_sale_commands',s).order('created_at',{ascending:false}).limit(30),scoped(db,'marketplace_post_sale_commands',s).eq('channel',channel).in('state',['sending','uncertain','pending_review']).limit(3)]);
  if(recent.error||active.error)throw failed();
  const ops={data:[...new Map([...(recent.data||[]),...(active.data||[])].map(row=>[row.id,row])).values()]};
  const messagePath=claimId?`/post-purchase/v1/claims/${claimId}/messages`:`/messages/packs/${s.pack}/sellers/${s.connection.seller_reference}?tag=post_sale&mark_as_read=false&limit=10&offset=${offset}`;
  const wantsReturn=!!selected&&(selected.detail.actions.some(a=>a.startsWith('return_review_'))||(ops.data||[]).some(r=>r.channel===channel&&String(r.action).startsWith('return_review_')&&['sending','uncertain'].includes(r.state)));
  const reads=await Promise.allSettled([
    read(db,s,messagePath),
    selected?.detail.actions.includes('partial_refund')?read(db,s,`/post-purchase/v1/claims/${claimId}/partial-refund/available-offers`):Promise.resolve(null),
    wantsReturn?read(db,s,`/post-purchase/v2/claims/${claimId}/returns`):Promise.resolve(null),
    selected?.detail.actions.includes('return_review_fail')?read(db,s,`/post-purchase/v1/returns/reasons?flow=seller_return_failed&claim_id=${claimId}`):Promise.resolve(null),
    selected?read(db,s,`/post-purchase/v1/claims/${claimId}/evidences`):Promise.resolve([]),
  ]);
  const received=(index:number)=>{const result=reads[index];if(result.status==='rejected')throw result.reason;return result.value;};
  const data=received(0);
  if(claimId?!Array.isArray(data):!Array.isArray(obj(data).messages))throw new MarketplaceError(503,'invalid_conversation','O Mercado Livre não confirmou o histórico desta conversa.');
  const messages=serviceMessages(data,s.connection.seller_reference,!!claimId).map(m=>({...m,pageOffset:offset}));
  const status=obj(obj(data).conversation_status);let reason=claimId?selected?.detail.destinations.length?null:'O Mercado Livre não liberou resposta neste caso.':conversationReason(status);
  let options:ReturnType<typeof contactOptions>=[];
  if(!claimId&&['blocked_by_conversation_initiated_by_seller_limited','blocked_by_conversation_started_by_seller'].includes(txt(status.substatus))){
    try{options=contactOptions(await read(db,s,`/messages/action_guide/packs/${s.pack}?tag=post_sale`));if(options.length)reason=null;}
    catch(e){if(e instanceof MarketplaceError&&e.code==='service_blocked_by_excepted_case'){reason=null;}}
  }
  const evidenceRecords:Record<string,unknown>[]=[];try{const response=received(4);if(!Array.isArray(response))throw Error('invalid_evidences');evidenceRecords.push(...list(response));}catch{if(selected)warnings.push('As provas de envio não puderam ser confirmadas nesta consulta.');}
  const providerReason=reason;
  for(const row of ops.data||[]){
    if(row.channel!==channel||!['sending','uncertain','pending_review'].includes(row.state))continue;
    let state:string|null=null;let receipt:string|null=null;
    if(row.action==='message'){
      const found=messages.find(m=>m.author==='seller'&&(m.id===row.receipt_id||m.date&&new Date(m.date).getTime()>=new Date(row.created_at).getTime()-5000&&hash(canonical(m.text,m.attachments.map(a=>a.id),row.destination))===row.payload_hash));
      if(found){state=messageState({status:found.status});receipt=found.id;}
    }else if(selected){
      if(row.action==='shipping_evidence'||row.action==='shipping_promise'){for(const evidence of evidenceRecords){const body=row.action==='shipping_promise'?{type:'handling_shipping_evidence',handling_date:txt(evidence.handling_date,10)}:{type:'shipping_evidence',shipping_method:'mail',shipping_company_name:txt(evidence.shipping_company_name),date_shipped:txt(evidence.date_shipped,10),...(txt(evidence.tracking_number)?{tracking_number:txt(evidence.tracking_number)}:{}),...(list(evidence.attachments).length?{attachments:list(evidence.attachments).map(a=>attachmentId(a.filename||a.id))}:{})};const path=`/post-purchase/v1/claims/${claimId}/${row.action==='shipping_promise'?'evidences':'actions/evidences'}`;if(hash({path,body})===row.payload_hash)state='completed';}}
      if(row.action==='open_dispute'&&selected.raw.stage==='dispute'||row.action==='refund'&&obj(selected.raw.resolution).reason==='payment_refunded'||row.action==='partial_refund'&&obj(selected.raw.resolution).reason==='partial_refunded'||row.action==='allow_return'&&Array.isArray(selected.raw.related_entities)&&selected.raw.related_entities.includes('return'))state='completed';
    }
    if(state){const result=await db.from('marketplace_post_sale_commands').update({state,confirmation_source:'observation',...(receipt?{receipt_id:receipt}:{}),updated_at:new Date().toISOString()}).eq('id',row.id).eq('empresa_id',s.company).eq('connection_id',s.connection.id).eq('sale_id',s.saleId).eq('state',row.state);if(result.error)throw failed();row.state=state;row.confirmation_source='observation';if(receipt)row.receipt_id=receipt;}
  }
  const operations=(ops.data||[]).map(operation);
  if(operations.some(o=>o.channel===channel&&o.action==='message'&&['sending','uncertain','pending_review'].includes(o.state)))reason='Há uma mensagem em confirmação ou revisão. Atualize esta conversa antes de enviar novamente.';
  const offers:ServiceWorkspace['offers']=[];
  if(selected?.detail.actions.includes('partial_refund'))try{const response=obj(received(1));for(const offer of list(response.available_offers)){if(typeof offer.percentage==='number'&&offer.percentage>0&&offer.percentage<100&&typeof offer.amount==='number'&&Number.isFinite(offer.amount)&&offer.amount>0&&response.currency_id==='BRL')offers.push({percentage:offer.percentage,amount:offer.amount,currency:'BRL'});}}catch{warnings.push('Não foi possível confirmar as ofertas de reembolso parcial. Nenhum percentual será escolhido automaticamente.');}
  let returnReview:ServiceWorkspace['returnReview'];
  if(selected&&wantsReturn)try{
    const returned=obj(received(2));
    const orderIds=[...new Set(list(returned.orders).map(o=>num(o.order_id)).filter(Boolean))];
    const claimIds=[num(returned.claim_id),...list(returned.resources).map(r=>num(r.id||r.claim_id))];
    if(!num(returned.id)||!claimIds.includes(claimId!)||!orderIds.includes(s.orderId))throw Error('return_scope_unconfirmed');
    const reasons=selected.detail.actions.includes('return_review_fail')?received(3):[];
    returnReview={id:num(returned.id),cart:orderIds.length>1,status:txt(returned.status,80),reasons:list(reasons).filter(r=>/^SRF[0-9]{1,3}$/.test(txt(r.id))&&(!orderIds.length||orderIds.length===1||Array.isArray(r.apply)&&r.apply.includes('order'))).map(r=>({id:txt(r.id,20),label:txt(r.detail,200)||'Motivo informado pelo Mercado Livre',requiresEvidence:['SRF2','SRF4'].includes(txt(r.id))}))};
    const waiting=(ops.data||[]).filter(r=>r.channel===channel&&String(r.action).startsWith('return_review_')&&['sending','uncertain'].includes(r.state));
    if(waiting.length&&!returnReview.cart)try{const reviewed=obj(await read(db,s,`/post-purchase/v1/returns/${returnReview.id}/reviews`));for(const row of waiting){const status=txt(reviewed.seller_status);if(row.action==='return_review_ok'&&status==='success'||row.action==='return_review_fail'&&['claimed','failed'].includes(status)){const result=await db.from('marketplace_post_sale_commands').update({state:'completed',confirmation_source:'observation',updated_at:new Date().toISOString()}).eq('id',row.id).eq('empresa_id',s.company).eq('connection_id',s.connection.id).eq('sale_id',s.saleId).eq('state',row.state);if(result.error)throw failed();row.state='completed';row.confirmation_source='observation';}}}catch{warnings.push('A confirmação da revisão física ainda não chegou. A solicitação registrada não será repetida automaticamente.');}
    if(returnReview.cart){selected.detail.actions=selected.detail.actions.filter(a=>a!=='return_review_ok');warnings.push('Esta devolução reúne vários pedidos. A revisão com problema se limita a este pedido; a aprovação de todo o pacote exige conferir os demais itens no Mercado Livre.');}
  }catch{selected.detail.actions=selected.detail.actions.filter(a=>!a.startsWith('return_review_'));warnings.push('A associação da devolução ou seus motivos não pôde ser confirmada. A revisão física não será enviada sem essa conferência.');}
  const finalOperations=(ops.data||[]).map(operation);if(!finalOperations.some(o=>o.channel===channel&&o.action==='message'&&['sending','uncertain','pending_review'].includes(o.state)))reason=providerReason;
  const evidences=evidenceRecords.map(e=>({type:txt(e.type,40),date:serviceDate(e.handling_date||e.date_shipped),company:txt(e.shipping_company_name,120),tracking:txt(e.tracking_number,120)}));
  const paging=obj(obj(data).paging);
  if(!claimId&&typeof paging.offset==='number'&&paging.offset!==offset)throw new MarketplaceError(503,'invalid_conversation_page','O Mercado Livre não confirmou esta página do histórico. Atualize o atendimento.');
  const total=claimId?messages.length:Math.max(messages.length,Number(paging.total)||0);
  const pageSize=Number.isInteger(paging.limit)&&Number(paging.limit)>0&&Number(paging.limit)<=100?Number(paging.limit):messages.length;
  const nextOffset=!claimId&&pageSize>0&&offset+pageSize<total&&offset+pageSize<=9999?offset+pageSize:null;
  if(!claimId&&offset+pageSize<total&&nextOffset===null)warnings.push('Há mais registros, mas a próxima página não pôde ser confirmada. O histórico completo pode ser conferido no Mercado Livre.');
  const revision=hash({order:s.orderId,updated:s.order.last_updated,status:s.order.status,channel,claim:selected?.detail.version||null,statusConversation:status,messages:messages.map(m=>[m.id,m.date,m.status,hash(m.text)]),total,options,returnReview,offers});
  return {orderId:s.orderId,checkedAt:new Date().toISOString(),channel,revision,canManage,messages,offset,total,nextOffset,hasMore:nextOffset!==null,canReply:canManage&&!reason&&offset===0,reason,contactOptions:options,cases:cases.map(c=>c.detail),casesComplete,warnings,operations:finalOperations,offers,evidences,...(returnReview?{returnReview}:{})};
}
export async function serviceWorkspace(db:SupabaseClient,company:string,connectionId:unknown,saleId:unknown,channel:unknown,canManage:boolean,offsetValue:unknown=0){
  const offset=Number(offsetValue||0);if(!Number.isInteger(offset)||offset<0||offset>10000)throw new MarketplaceError(400,'invalid_page','Página de mensagens inválida.');
  return workspace(db,await loadServiceScope(db,company,connectionId,saleId),channelId(channel),canManage,offset);
}

export async function sendServiceCommand(db:SupabaseClient,company:string,actor:string,input:Record<string,unknown>){
  if(!uuidIsValid(input.requestId)||!uuidIsValid(actor))throw new MarketplaceError(400,'invalid_request','Identificação da solicitação inválida.');
  const s=await loadServiceScope(db,company,input.connectionId,input.saleId),channel=channelId(input.channel);
  const requestHash=hash({channel,action:input.action,revision:input.revision,text:input.text||'',destination:input.destination||'',optionId:input.optionId||'',templateId:input.templateId||'',percentage:input.percentage||null,attachments:input.attachments||[],confirmed:input.confirmed===true,reviewReason:input.reviewReason||'',reviewText:input.reviewText||'',reviewAttachments:input.reviewAttachments||[],shipping:input.shipping||{},shippingAttachments:input.shippingAttachments||[]});
  const previous=await scoped(db,'marketplace_post_sale_commands',s).eq('id',input.requestId).maybeSingle();if(previous.error)throw failed();
  if(previous.data){if(previous.data.channel!==channel||previous.data.action!==input.action||previous.data.request_hash!==requestHash)throw new MarketplaceError(409,'request_changed','Esta identificação já pertence a outra solicitação.');return {operation:operation(previous.data),alreadyRequested:true};}
  const current=await workspace(db,s,channel,true,0,true),selected=current.cases.find(c=>`claim:${c.id}`===channel);
  if(input.revision!==current.revision)throw new MarketplaceError(409,'conversation_changed','Chegou uma atualização nesta conversa. Atualize o atendimento; seu texto será preservado.');
  if(current.operations.some(o=>o.channel===channel&&(o.action==='message')===(input.action==='message')&&['sending','uncertain','pending_review'].includes(o.state)))throw new MarketplaceError(409,'service_in_progress','Há uma solicitação registrada nesta conversa. Atualize para conferir o resultado antes de repetir.');
  const action=input.action as ServiceAction;let path='',body:Record<string,unknown>={},destination='case',payload:unknown={};
  if(action==='message'){
    if(!current.canReply)throw new MarketplaceError(409,'conversation_blocked',current.reason||'A resposta não está liberada neste canal.');
    destination=channel==='order'?'buyer':input.destination==='mediator'?'mediator':'buyer';
    if(selected&&!selected.destinations.includes(destination as 'buyer'|'mediator'))throw new MarketplaceError(409,'destination_unavailable','O Mercado Livre não liberou este destinatário.');
    let text=validServiceMessage(input.text);const providerAttachments:string[]=[];
    const attachments=Array.isArray(input.attachments)?input.attachments:[];
    if(attachments.length>5||attachments.some(id=>!uuidIsValid(id)))throw new MarketplaceError(400,'invalid_attachments','Selecione até cinco anexos válidos.');
    for(const id of attachments){const r=await scoped(db,'marketplace_post_sale_attachments',s).eq('id',id).eq('channel',channel).maybeSingle();if(r.error)throw failed();if(!r.data||new Date(r.data.created_at).getTime()<Date.now()-48*3600000||r.data.purpose!=='message')throw new MarketplaceError(409,'attachment_expired','Este anexo não está disponível para este pedido ou expirou. Adicione o arquivo novamente.');providerAttachments.push(r.data.provider_id);}
    if(channel==='order'&&current.contactOptions.length){
      const option=current.contactOptions.find(o=>o.id===input.optionId&&(o.templateId||'')===(input.templateId||''));
      if(!option||attachments.length)throw new MarketplaceError(409,'contact_option_unavailable','Escolha um motivo disponível; anexos não são permitidos nesta etapa.');
      text=option.templateText||text;
      if(!text)throw new MarketplaceError(400,'invalid_message','Escreva uma mensagem de até 350 caracteres, sem marcação HTML.');
      body={option_id:option.id,...(option.templateId?{template_id:option.templateId}:{text})};path=`/messages/action_guide/packs/${s.pack}/option?tag=post_sale`;
    }else{
      if(!text)throw new MarketplaceError(400,'invalid_message','Escreva uma mensagem de até 350 caracteres, sem marcação HTML.');
      if(selected){path=`/post-purchase/v1/claims/${selected.id}/actions/send-message`;body={receiver_role:destination==='mediator'?'mediator':'complainant',message:text,...(providerAttachments.length?{attachments:providerAttachments}:{})};}
      else {path=`/messages/packs/${s.pack}/sellers/${s.connection.seller_reference}?tag=post_sale`;body={from:{user_id:s.connection.seller_reference},to:{user_id:'3037675074'},text,...(providerAttachments.length?{attachments:providerAttachments}:{})};}
    }
    payload=canonical(text!,providerAttachments,destination);
  }else{
    if(!selected||!selected.actions.includes(action)||input.confirmed!==true)throw new MarketplaceError(409,'solution_unavailable','Confirme uma solução liberada pelo Mercado Livre para este caso.');
    if(action==='return_review_ok'||action==='return_review_fail'){
      if(!current.returnReview)throw new MarketplaceError(409,'return_unconfirmed','A devolução deste pedido não pôde ser confirmada.');
      path=`/post-purchase/v1/returns/${current.returnReview.id}/return-review`;
      if(action==='return_review_fail'){
        const reason=current.returnReview.reasons.find(r=>r.id===input.reviewReason),message=validServiceMessage(input.reviewText);
        if(!reason||!message)throw new MarketplaceError(400,'review_incomplete','Selecione o motivo e descreva o problema da devolução.');
        const ids=Array.isArray(input.reviewAttachments)?input.reviewAttachments:[],attachments:string[]=[];
        if(ids.length>5||ids.some(id=>!uuidIsValid(id)))throw new MarketplaceError(400,'invalid_attachments','Selecione até cinco evidências válidas.');
        for(const id of ids){const r=await scoped(db,'marketplace_post_sale_attachments',s).eq('id',id).eq('channel',channel).eq('purpose','return_review').eq('return_id',current.returnReview.id).maybeSingle();if(r.error)throw failed();if(!r.data||new Date(r.data.created_at).getTime()<Date.now()-48*3600000)throw new MarketplaceError(409,'attachment_expired','A evidência expirou ou não pertence a esta devolução.');attachments.push(r.data.provider_id);}
        if(reason.requiresEvidence&&!attachments.length)throw new MarketplaceError(400,'evidence_required','Este motivo exige foto ou documento de evidência.');
        if(current.returnReview.cart&&!Number.isSafeInteger(Number(s.orderId)))throw new MarketplaceError(409,'cart_order_unconfirmed','O pedido do carrinho não pôde ser confirmado para revisão.');
        body=[{reason:reason.id,message,...(attachments.length?{attachments}:{}),...(current.returnReview.cart?{order_id:Number(s.orderId)}:{})}] as unknown as Record<string,unknown>;
      }
    }else if(action==='shipping_evidence'||action==='shipping_promise'){
      const shipping=obj(input.shipping),date=txt(shipping.date,10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new MarketplaceError(400,'shipping_date_required','Informe uma data válida para o envio.');
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      if(action==='shipping_promise'){
        if(date<today)throw new MarketplaceError(400,'shipping_date_past','A previsão de envio não pode ser anterior a hoje.');
        path=`/post-purchase/v1/claims/${selected.id}/evidences`;body={type:'handling_shipping_evidence',handling_date:date};
      }else{
        const companyName=txt(shipping.company,120).trim(),tracking=txt(shipping.tracking,120).trim();
        if(!companyName||date>today)throw new MarketplaceError(400,'shipping_proof_incomplete','Informe a transportadora e uma data de postagem já realizada.');
        const ids=Array.isArray(input.shippingAttachments)?input.shippingAttachments:[],attachments:string[]=[];
        if(ids.length>5||ids.some(id=>!uuidIsValid(id)))throw new MarketplaceError(400,'invalid_attachments','Selecione até cinco comprovantes válidos.');
        for(const id of ids){const r=await scoped(db,'marketplace_post_sale_attachments',s).eq('id',id).eq('channel',channel).eq('purpose','shipping_evidence').maybeSingle();if(r.error)throw failed();if(!r.data||new Date(r.data.created_at).getTime()<Date.now()-48*3600000)throw new MarketplaceError(409,'attachment_expired','O comprovante expirou ou não pertence a esta reclamação.');attachments.push(r.data.provider_id);}
        path=`/post-purchase/v1/claims/${selected.id}/actions/evidences`;body={type:'shipping_evidence',shipping_method:'mail',shipping_company_name:companyName,date_shipped:date,...(tracking?{tracking_number:tracking}:{}),...(attachments.length?{attachments}:{})};
      }
    }else{
    const routes={allow_return:'expected-resolutions/allow-return',refund:'expected-resolutions/refund',partial_refund:'expected-resolutions/partial-refund',open_dispute:'actions/open-dispute'};
    if(!Object.hasOwn(routes,action))throw new MarketplaceError(400,'invalid_action','Ação de atendimento inválida.');
    path=`/post-purchase/v1/claims/${selected.id}/${routes[action as keyof typeof routes]}`;
    if(action==='partial_refund'){const offer=current.offers.find(o=>o.percentage===input.percentage);if(!offer)throw new MarketplaceError(409,'offer_unavailable','Escolha uma oferta de reembolso confirmada pelo Mercado Livre.');body={percentage:offer.percentage};}
    }
    payload={path,body};
  }
  const command={request_hash:requestHash,id:String(input.requestId),empresa_id:company,connection_id:s.connection.id,sale_id:s.saleId,actor_id:actor,channel,action,destination,basis_hash:current.revision,payload_hash:hash(payload),state:'sending'};
  const reserved=await db.from('marketplace_post_sale_commands').insert(command).select('*').single();
  if(reserved.error||!reserved.data){if(reserved.error?.code==='23505')throw new MarketplaceError(409,'service_in_progress','Esta solicitação já está registrada. Atualize o atendimento antes de repetir.');throw failed();}
  let receipt:Record<string,unknown>={},state='completed',errorCode:string|null=null;
  try{const response=await mlServiceRequest(db,s.connection,path,{method:'POST',body});receipt=obj(response.payload);state=response.status===202?'pending_review':messageState(receipt);}
  catch(e){const uncertain=!(e instanceof MarketplaceError)||e.code==='mutation_uncertain';state=uncertain?'uncertain':'rejected';errorCode=e instanceof MarketplaceError?e.code:'mutation_uncertain';}
  const update={state,confirmation_source:state==='uncertain'||state==='rejected'?null:'receipt',receipt_id:txt(receipt.id||receipt.message_id,160)||null,error_code:errorCode,updated_at:new Date().toISOString()};
  const saved=await db.from('marketplace_post_sale_commands').update(update).eq('id',command.id).eq('empresa_id',company).eq('connection_id',s.connection.id).eq('sale_id',s.saleId).eq('state','sending').select('*').maybeSingle();
  if(!saved.error&&!saved.data){const reconciled=await scoped(db,'marketplace_post_sale_commands',s).eq('id',command.id).maybeSingle();if(!reconciled.error&&reconciled.data&&reconciled.data.state!=='sending')return {operation:operation(reconciled.data),alreadyRequested:false};}
  if(saved.error||!saved.data)throw new MarketplaceError(503,'service_receipt_pending','A solicitação está registrada, mas o retorno não pôde ser salvo. Atualize o atendimento antes de repetir.');
  return {operation:operation(saved.data),alreadyRequested:false};
}

export async function uploadServiceAttachment(db:SupabaseClient,company:string,input:Record<string,unknown>,file:File){
  if(file.size<1||file.size>3*1024*1024)throw new MarketplaceError(400,'attachment_size','Selecione um arquivo de até 3 MB.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const mime=bytes[0]===0xff&&bytes[1]===0xd8?'image/jpeg':bytes[0]===0x89&&String.fromCharCode(...bytes.slice(1,4))==='PNG'?'image/png':String.fromCharCode(...bytes.slice(0,5))==='%PDF-'?'application/pdf':String.fromCharCode(...bytes.slice(0,3))==='GIF'?'image/gif':null;
  if(!mime)throw new MarketplaceError(400,'attachment_format','Use uma imagem JPG, PNG ou GIF, ou um PDF válido.');
  const s=await loadServiceScope(db,company,input.connectionId,input.saleId),channel=channelId(input.channel),current=await workspace(db,s,channel,true,0,true);
  const review=input.purpose==='return_review',proof=input.purpose==='shipping_evidence';const selected=current.cases.find(c=>`claim:${c.id}`===channel);
  if(review?!selected?.actions.includes('return_review_fail')||!current.returnReview:proof?!selected?.actions.includes('shipping_evidence'):!current.canReply||current.contactOptions.length)throw new MarketplaceError(409,'attachment_not_allowed','O Mercado Livre não liberou anexos nesta etapa da conversa.');
  const ext={'image/jpeg':'jpg','image/png':'png','image/gif':'gif','application/pdf':'pdf'}[mime];
  if(channel!=='order'&&mime==='image/gif')throw new MarketplaceError(400,'attachment_format','Para reclamações e revisões, use JPG, PNG ou PDF.');
  const safeFile=new File([bytes],`anexo-${randomUUID()}.${ext}`,{type:mime});
  const path=review?`/post-purchase/v1/claims/${channel.slice(6)}/returns/attachments`:channel==='order'?'/messages/attachments?tag=post_sale&site_id=MLB':`/post-purchase/v1/claims/${channel.slice(6)}/attachments`;
  const result=await mlServiceRequest(db,s.connection,path,{method:'POST',file:safeFile}),data=obj(result.payload);
  const providerId=attachmentId(data.id||data.filename||data.file_name);if(!providerId)throw new MarketplaceError(503,'attachment_uncertain','O upload não retornou um anexo válido. Adicione o arquivo novamente.');
  const id=randomUUID(),name=file.name.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,125)||`Anexo.${ext}`;
  const saved=await db.from('marketplace_post_sale_attachments').insert({id,empresa_id:company,connection_id:s.connection.id,sale_id:s.saleId,channel,purpose:review?'return_review':proof?'shipping_evidence':'message',return_id:review?current.returnReview!.id:null,provider_id:providerId,name}).select('id,name').single();if(saved.error||!saved.data)throw failed();return saved.data;
}
export async function downloadServiceAttachment(db:SupabaseClient,company:string,input:Record<string,unknown>){
  const s=await loadServiceScope(db,company,input.connectionId,input.saleId),channel=channelId(input.channel),id=attachmentId(input.attachmentId);
  if(!id)throw new MarketplaceError(400,'invalid_attachment','Anexo inválido.');
  const selected=await workspace(db,s,channel,false,Number(input.offset||0),true);
  if(!selected.messages.some(m=>m.attachments.some(a=>a.id===id)))throw new MarketplaceError(403,'foreign_attachment','Este anexo não foi confirmado nesta conversa.');
  const path=channel==='order'?`/messages/attachments/${id}?tag=post_sale&site_id=MLB`:`/post-purchase/v1/claims/${channel.slice(6)}/attachments/${id}/download`;
  return mlServiceRequest(db,s.connection,path,{binary:true});
}
