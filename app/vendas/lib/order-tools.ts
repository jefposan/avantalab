export type OrderDocument = {
  id: string; status?: string; client: string; total: number; createdAt: string;
  customerId?: string; persistence?: {customerId?:string};
  order?: {lines:Array<{sku:string;name:string;unit:string;quantity:number;unitPrice:number;unitDiscount:number}>;
    commercialTotals:{products:number;orderDiscount:number;freight:number;insurance:number;other:number};
    paymentMethod:string;installments:number;firstDueDate:string;notes?:string;seller?:string;fulfillment?:string;deliveryDate?:string};
};
export type OrderContact = {legalName?:string; name?:string; document?:string;email?:string;phone?:string;street?:string;number?:string;complement?:string;district?:string;city?:string;cep?:string};
export type OrderCompany = {name:string;legalName?:string;document?:string;city?:string;logo?:{bytes:Uint8Array;format:'png'|'jpg';darkBackground?:boolean}};

export function orderMessage(record:OrderDocument, company:OrderCompany) {
  const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  return [`${company.name} — Pedido ${record.id}`,`Cliente: ${record.client}`,`Situação: ${record.status||'Rascunho'}`,
    ...(record.order?.lines||[]).slice(0,8).map(line=>`${line.sku} · ${line.name.slice(0,100)} · ${line.quantity.toLocaleString('pt-BR')} ${line.unit} · ${money(line.quantity*(line.unitPrice-line.unitDiscount))}`),
    ...((record.order?.lines.length||0)>8?[`Mais ${(record.order?.lines.length||0)-8} itens no PDF do pedido.`]:[]),
    `Total: ${money(record.total)}`,'Documento comercial. Não substitui nota fiscal.'].join('\n');
}

export function orderContactLink(channel:'email'|'whatsapp', contact:OrderContact, record:OrderDocument, company:OrderCompany) {
  const message=orderMessage(record,company);
  if(channel==='email') {
    const email=(contact.email||'').trim();
    if(!/^[^\s@<>?&#\r\n]+@[^\s@<>?&#\r\n]+\.[^\s@<>?&#\r\n]+$/.test(email))throw Error('Cadastre um e-mail válido no cliente antes de enviar.');
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Pedido ${record.id} — ${company.name}`.replace(/[\r\n]/g,' '))}&body=${encodeURIComponent(message)}`;
  }
  let phone=(contact.phone||'').replace(/\D/g,'');
  if(phone.length===10||phone.length===11)phone='55'+phone;
  if(!/^55\d{10,11}$/.test(phone))throw Error('Cadastre um telefone brasileiro com DDD no cliente antes de enviar pelo WhatsApp.');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function orderStatusActions(status:string) {
  const choices:Record<string,Array<{action:'editar'|'separar'|'faturar'|'cancelar'|'devolver'|'continuar';label:string;permissions:string[]}>>={
    Rascunho:[{action:'continuar',label:'Continuar e confirmar no formulário',permissions:['sales.edit']}],
    Confirmado:[{action:'separar',label:'Iniciar separação',permissions:['sales.edit','stock.exit']},{action:'faturar',label:'Faturar pedido',permissions:['sales.invoice','stock.exit']},{action:'editar',label:'Voltar ao rascunho para editar',permissions:['sales.edit','stock.exit']}],
    'Em separação':[{action:'faturar',label:'Faturar pedido',permissions:['sales.invoice','stock.exit']},{action:'editar',label:'Voltar ao rascunho para editar',permissions:['sales.edit','stock.exit']}],
    Faturado:[{action:'devolver',label:'Registrar devolução total',permissions:['sales.cancel','stock.adjust','receivables.refund','fiscal.cancel']}],
  };
  const result=choices[status]||[];
  return ['Rascunho','Confirmado','Em separação','Faturado'].includes(status)?[...result,{action:'cancelar' as const,label:'Cancelar pedido',permissions:status==='Faturado'?['sales.cancel','stock.adjust']:['sales.cancel','stock.exit']}]:result;
}

export {buildOrderPdf} from './order-document-pdf.ts';

export async function copyOrderPdf(blob:Blob, environment:{clipboard?:Pick<Clipboard,'write'>;Item?:typeof ClipboardItem}={clipboard:globalThis.navigator?.clipboard,Item:globalThis.ClipboardItem}) {
  const {clipboard,Item}=environment;
  if(!clipboard?.write||!Item||(typeof Item.supports==='function'&&!Item.supports('application/pdf')))
    throw Error('Este navegador não permite copiar arquivos PDF. Use Baixar PDF e anexe ou arraste o arquivo para o e-mail ou WhatsApp no navegador.');
  try { await clipboard.write([new Item({'application/pdf':blob})]); }
  catch { throw Error('O navegador não autorizou copiar o PDF. Use Baixar PDF para anexar ou arrastar o arquivo; nenhum PDF foi copiado.'); }
}
