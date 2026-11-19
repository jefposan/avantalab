export type OrderDocument = {
  id: string; status?: string; client: string; total: number; createdAt: string;
  customerId?: string; persistence?: {customerId?:string};
  order?: {lines:Array<{sku:string;name:string;unit:string;quantity:number;unitPrice:number;unitDiscount:number}>;
    commercialTotals:{products:number;orderDiscount:number;freight:number;insurance:number;other:number};
    paymentMethod:string;installments:number;firstDueDate:string;notes?:string};
};
export type OrderContact = {legalName?:string; name?:string; document?:string;email?:string;phone?:string;street?:string;number?:string;complement?:string;district?:string;city?:string;cep?:string};
export type OrderCompany = {name:string;legalName?:string;document?:string;city?:string};

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

// No HTML or executable markup is accepted; all PDF content is plain text.
export async function buildOrderPdf(record:OrderDocument, company:OrderCompany, contact:OrderContact={}) {
  const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');
  const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);const bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const safe=(value:unknown)=>String(value??'').replace(/[^\x20-\x7e\xa0-\xff]/g,' ');
  const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  let page=doc.addPage([595,842]),y=792;
  const newPage=()=>{page=doc.addPage([595,842]);y=792;};
  const write=(value:unknown,size=10,strong=false,x=40,width=515)=>{
    const face=strong?bold:font;let line='';
    const flush=()=>{if(y<50)newPage();page.drawText(line,{x,y,size,font:face,color:rgb(.09,.16,.22)});y-=size+6;line='';};
    for(const char of safe(value)){if(face.widthOfTextAtSize(line+char,size)>width&&line)flush();line+=char;}flush();
  };
  const address=[contact.street,contact.number,contact.complement,contact.district,contact.city,contact.cep].filter(Boolean).join(' · ');
  {
    write(company.name,18,true);write([company.legalName,company.document,company.city].filter(Boolean).join(' · '),9);
    y-=10;write(`PEDIDO ${record.id}`,15,true);write(`Situação: ${record.status||'Rascunho'} · Data: ${new Date(record.createdAt).toLocaleDateString('pt-BR')}`,9);
    write(`Cliente: ${contact.legalName||record.client}`,11,true);if(contact.document)write(contact.document,9);if(address)write(address,9);y-=10;
    for(const [index,line] of (record.order?.lines||[]).entries()){
      if(y<115)newPage();write(`${index+1}. ${line.sku} · ${line.name}`,10,true);
      write(`${line.quantity.toLocaleString('pt-BR')} ${line.unit} × ${money(line.unitPrice)} · Desc. unit.: ${money(line.unitDiscount)} · Total: ${money(line.quantity*(line.unitPrice-line.unitDiscount))}`,9);y-=5;
    }
    y-=10;const totals=record.order?.commercialTotals;
    if(totals){write(`Desconto geral: ${money(totals.orderDiscount)} · Frete: ${money(totals.freight)}`,10);write(`Seguro: ${money(totals.insurance)} · Outras despesas: ${money(totals.other)}`,10);}
    write(`TOTAL: ${money(record.total)}`,15,true);
    if(record.order)write(`Pagamento: ${record.order.paymentMethod} · Parcelas: ${record.order.installments}`,10);
  }
  for(const [i,p] of doc.getPages().entries())p.drawText(`Documento comercial · não substitui nota fiscal · ${i+1}/${doc.getPageCount()}`,{x:40,y:24,size:8,font,color:rgb(.36,.43,.5)});
  return doc.save();
}

export async function copyOrderPdf(blob:Blob, environment:{clipboard?:Pick<Clipboard,'write'>;Item?:typeof ClipboardItem}={clipboard:globalThis.navigator?.clipboard,Item:globalThis.ClipboardItem}) {
  const {clipboard,Item}=environment;
  if(!clipboard?.write||!Item||(typeof Item.supports==='function'&&!Item.supports('application/pdf')))
    throw Error('Este navegador não permite copiar arquivos PDF. Use Baixar PDF e anexe ou arraste o arquivo para o e-mail ou WhatsApp no navegador.');
  try { await clipboard.write([new Item({'application/pdf':blob})]); }
  catch { throw Error('O navegador não autorizou copiar o PDF. Use Baixar PDF para anexar ou arrastar o arquivo; nenhum PDF foi copiado.'); }
}
