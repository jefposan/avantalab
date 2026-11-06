/** Contratos de pós-venda: conteúdo externo é texto; nunca HTML ou comandos. */
export type ServiceMessage = { pageOffset?: number; id: string; author: 'seller' | 'buyer' | 'mediator' | 'agent' | 'unknown'; text: string; date: string | null; status: string; attachments: Array<{ id: string; name: string }> };
export type ContactOption = { id: string; label: string; templateId?: string; templateText?: string };
export type ServiceAction = 'message' | 'allow_return' | 'refund' | 'partial_refund' | 'open_dispute' | 'return_review_ok' | 'return_review_fail' | 'shipping_evidence' | 'shipping_promise';
export type ServiceCase = { id: string; title: string; status: string; dueAt: string | null; actions: ServiceAction[]; destinations: Array<'buyer' | 'mediator'>; version: string };
export type ServiceOperation = { id: string; channel: string; action: string; state: string; createdAt: string; confirmationSource?: string | null; receiptId: string | null };
export type ServiceWorkspace = {
  orderId: string; checkedAt: string; channel: string; revision: string; canManage: boolean;
  messages: ServiceMessage[]; offset: number; total: number; nextOffset: number | null; hasMore: boolean;
  canReply: boolean; reason: string | null; contactOptions: ContactOption[];
  cases: ServiceCase[]; casesComplete: boolean; warnings: string[]; operations: ServiceOperation[];
  evidences?: Array<{type:string;date:string|null;company:string;tracking:string}>;
  offers: Array<{ percentage: number; amount: number; currency: string }>;
  returnReview?: {id:string;cart:boolean;status:string;reasons:Array<{id:string;label:string;requiresEvidence:boolean}>};
};
export const serviceObject = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const serviceList = (v: unknown) => Array.isArray(v) ? v.map(serviceObject) : [];
export const serviceText = (v: unknown, max = 2000) => typeof v === 'string' ? v.slice(0, max) : '';
export const numericServiceId = (v: unknown) => /^\d{1,24}$/.test(String(v)) ? String(v) : '';
export const serviceDate = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null;
export const attachmentId = (v: unknown) => /^[A-Za-z0-9_.-]{1,125}$/.test(String(v)) ? String(v) : '';
export const contactLabels: Record<string,string> = { OTHER: 'Outros assuntos', REQUEST_VARIANTS: 'Confirmar a variação do produto', REQUEST_BILLING_INFO: 'Solicitar dados de faturamento', SEND_INVOICE_LINK: 'Enviar link de faturamento' };
export const actionLabels: Record<ServiceAction,string> = { message: 'Enviar mensagem', allow_return: 'Autorizar devolução', refund: 'Reembolsar integralmente', partial_refund: 'Oferecer reembolso parcial', open_dispute: 'Solicitar mediação', return_review_ok:'Confirmar produto recebido conforme esperado', return_review_fail:'Informar problema na devolução', shipping_evidence:'Apresentar comprovante de envio', shipping_promise:'Informar previsão de envio' };
const blocks: Record<string,string> = {
  blocked_by_buyer:'O comprador bloqueou esta conversa.', blocked_by_time:'O prazo de resposta terminou. Aguarde um novo contato do comprador.',
  blocked_by_fulfillment:'Conversa disponível após a entrega deste envio Full.', blocked_by_payment:'O pagamento ainda não foi confirmado.',
  blocked_by_mediation:'Há uma mediação. Use a conversa da reclamação para responder ao Mercado Livre.', blocked_by_mediation_fbm:'Há uma mediação desta venda Full. Use o canal da reclamação.',
  blocked_by_cancelled_order:'O Mercado Livre bloqueou mensagens desta venda cancelada.', blocked_by_refund:'O Mercado Livre bloqueou a conversa após o reembolso.',
  blocked_by_message_pending_review:'Há uma mensagem em revisão. Aguarde a análise do Mercado Livre.', blocked_by_ai_assistant:'O assistente do Mercado Livre está conduzindo o atendimento desta venda Full.',
  blocked_by_conversation_expired:'O histórico desta conversa expirou no Mercado Livre.', blocked_by_restrictions:'O Mercado Livre restringiu a comunicação desta conta.',
};
export function conversationReason(value: unknown) { const v=serviceObject(value);return v.status==='active'?null:blocks[serviceText(v.substatus)]||'O Mercado Livre ainda não liberou o envio de mensagens nesta conversa.'; }

/** Apenas opções efetivamente recebidas com cota. Template não é inventado/editado. */
export function contactOptions(value: unknown): ContactOption[] {
  const result:ContactOption[]=[];
  function walk(v:unknown,cap=0,depth=0){
    if(depth>8)return;
    if(Array.isArray(v)){for(const e of v.slice(0,100))walk(e,cap,depth+1);return;}
    const o=serviceObject(v);const available=typeof o.cap_available==='number'?o.cap_available:cap;
    const id=serviceText(o.option_id||o.id,80);
    if(available>0&&Object.hasOwn(contactLabels,id)){
      if(id==='OTHER'||id==='SEND_INVOICE_LINK')result.push({id,label:contactLabels[id]});
      else for(const t of serviceList(o.templates)){const tid=serviceText(t.template_id||t.id,160);if(/^[A-Z0-9_]{1,160}$/.test(tid)&&serviceText(t.text))result.push({id,label:contactLabels[id],templateId:tid,templateText:serviceText(t.text)});}
    }
    for(const key of ['options','categories','reasons','templates','results','data'])if(o[key])walk(o[key],available,depth+1);
  }
  walk(value);return [...new Map(result.map(o=>[`${o.id}:${o.templateId||''}`,o])).values()];
}

export function serviceMessages(value:unknown,sellerId:string,claim=false):ServiceMessage[]{
  const records=claim?value:serviceObject(value).messages;
  return serviceList(records).map((m,index)=>{
    const role=serviceText(m.sender_role),from=String(serviceObject(m.from).user_id||'');
    const author:ServiceMessage['author']=claim?({respondent:'seller',complainant:'buyer',mediator:'mediator'} as const)[role as 'respondent']||'unknown':from===sellerId?'seller':from==='3037675074'?'agent':from?'buyer':'unknown';
    const content=typeof m.text==='string'?m.text:serviceObject(m.text).plain;
    return {id:serviceText(m.hash||m.id||m.message_id,160)||`record-${index}`,author,text:serviceText(claim?m.message:content),date:serviceDate(m.message_date||m.date_created||m.date||m.date_received),status:serviceText(m.status||serviceObject(m.message_moderation).status,40)||'available',attachments:serviceList(m.attachments).flatMap(a=>{const id=attachmentId(a.filename||a.id);return id?[{id,name:serviceText(a.original_filename||a.original_file_name||a.name,160)||'Anexo'}]:[];})};
  }).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.id.localeCompare(b.id));
}
export function validServiceMessage(value:unknown){
  if(typeof value!=='string')return null;
  const text=value.replace(/\r\n/g,'\n').normalize('NFC').trim();
  return text&&Array.from(text).length<=350&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f<>\ufdd0-\ufdef\ufffe\uffff]/u.test(text)?text:null;
}
