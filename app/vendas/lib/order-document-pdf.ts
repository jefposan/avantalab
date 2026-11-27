import type {OrderCompany,OrderContact,OrderDocument} from './order-tools';
export type OrderPaper = 'A4'|'A5';

/** Documento comercial somente de leitura; não inclui custos nem observações internas. */
export async function buildOrderPdf(record:OrderDocument,company:OrderCompany,contact:OrderContact={},options:{paperSize?:OrderPaper}={}) {
 const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');
 const pdf=await PDFDocument.create();const normal=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const compact=options.paperSize==='A5',width=compact?419.53:595.28,height=compact?595.28:841.89,m=compact?23:28,w=width-2*m;
 const fs=compact?8:8.5,small=compact?6.8:8,lh=fs+2;
 const ink=rgb(.08,.13,.18),muted=rgb(.33,.39,.44),rule=rgb(.8,.83,.85),tint=rgb(.94,.96,.96),accent=rgb(0,.43,.40);
 const safe=(v:unknown)=>String(v??'').replace(/[^\x20-\x7e\xa0-\xff]/g,' ');
 const amount=(v:number)=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
 const currency=(v:number)=>'R$ '+amount(v);
 const date=(v:string)=>/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10).split('-').reverse().join('/'):'-';
 const wrap=(v:unknown,size:number,maxWidth:number,font=normal)=>{
  const lines:string[]=[];let line='';
  for(let word of safe(v).split(/\s+/).filter(Boolean)){
   const candidate=line?line+' '+word:word;
   if(font.widthOfTextAtSize(candidate,size)<=maxWidth){line=candidate;continue;}
   if(line){lines.push(line);line='';}
   while(font.widthOfTextAtSize(word,size)>maxWidth){let part='';for(const char of word){if(part&&font.widthOfTextAtSize(part+char,size)>maxWidth)break;part+=char;}lines.push(part);word=word.slice(part.length);}
   line=word;
  }
  if(line)lines.push(line);return lines.length?lines:[''];
 };
 let page=pdf.addPage([width,height]),y=height-m;
 const text=(v:unknown,x:number,top:number,size=fs,strong=false,color=ink)=>page.drawText(safe(v),{x,y:top-size,size,font:strong?bold:normal,color});
 const paragraph=(v:unknown,x:number,top:number,maxWidth:number,size=fs,strong=false)=>{const lines=wrap(v,size,maxWidth,strong?bold:normal);lines.forEach((line,i)=>text(line,x,top-i*(size+3),size,strong));return lines.length*(size+3);};
 const line=(top:number)=>page.drawLine({start:{x:m,y:top},end:{x:width-m,y:top},thickness:.6,color:rule});
 let logo:Awaited<ReturnType<typeof pdf.embedPng>>|undefined;
 if(company.logo){try{logo=company.logo.format==='jpg'?await pdf.embedJpg(company.logo.bytes):await pdf.embedPng(company.logo.bytes);}catch{throw Error('O logo não pôde ser incluído no PDF. Confira a imagem cadastrada na empresa.');}}
 const header=(continuation=false)=>{
  y=height-m;
  const identityW=w*.60,titleW=w*.38,titleX=width-m-titleW;
  let leftY=y;
  if(logo){const maxW=compact?105:123,maxH=compact?29:36,scale=Math.min(maxW/logo.width,maxH/logo.height);
   const logoW=logo.width*scale,logoH=logo.height*scale;
   if(company.logo?.darkBackground)page.drawRectangle({x:m-3,y:leftY-logoH-3,width:logoW+6,height:logoH+6,color:ink});
   page.drawImage(logo,{x:m,y:leftY-logoH,width:logoW,height:logoH});leftY-=logoH+6;
  }
  if(!logo)leftY-=paragraph(company.name,m,leftY,identityW,compact?11:13,true)+2;
  if(company.legalName&&(logo||company.legalName!==company.name))leftY-=paragraph(company.legalName,m,leftY,identityW,small);
  const identity=[company.document,company.city].filter(Boolean).join(' · ');
  if(identity)leftY-=paragraph(identity,m,leftY,identityW,small);
  let rightY=y;
  rightY-=paragraph(`PEDIDO ${record.id}`,titleX,rightY,titleW,compact?12:16,true)+4;
  rightY-=paragraph(`${date(record.createdAt)} · ${safe(continuation?'CONTINUAÇÃO':record.status||'Rascunho').toLocaleUpperCase('pt-BR')}`,titleX,rightY,titleW,small,true);
  y=Math.min(leftY,rightY)-8;line(y);y-=9;
 };
 const col=[m,m+w*.112,m+w*(compact?.64:.66),m+w*(compact?.74:.73),m+w*.855,width-m];
 const tableHeader=()=>{
  const h=21;page.drawRectangle({x:m,y:y-h,width:w,height:h,color:tint});
  ['CÓDIGO','DESCRIÇÃO','QTD.','UNIT. (R$)','TOTAL (R$)'].forEach((label,i)=>{
   const size=compact?6.2:7;
   text(label,i<2?col[i]+5:col[i+1]-5-bold.widthOfTextAtSize(label,size),y-7,size,true);
  });y-=h;
 };
 const continuation=()=>{page=pdf.addPage([width,height]);header(true);tableHeader();};
 header();
 text('CLIENTE',m,y,small,true,muted);y-=small+4;
 y-=paragraph(contact.legalName||record.client,m,y,w,fs+.5,true);
 if(contact.document)y-=paragraph(contact.document,m,y,w,small);
 const address=[contact.street,contact.number,contact.complement,contact.district,contact.city,contact.cep].filter(Boolean).join(' · ');
 if(address)y-=paragraph(address,m,y,w,small);
 y-=5;line(y);y-=8;
 const metadata=[['Vendedor',record.order?.seller||'-'],['Pagamento',record.order?.paymentMethod||'-'],['Vencimento',date(record.order?.firstDueDate||'')]];
 let metaH=0;metadata.forEach(([label,value],i)=>{const x=m+i*w/3;const h=paragraph(`${label}: ${value}`,x,y,w/3-8,small);metaH=Math.max(metaH,h);});
 y-=metaH+8;tableHeader();
 const items=record.order?.lines||[];
 const rowHeight=22;
 const bottom=m+28;
 for(const [index,item] of items.entries()) {
  const detail=[...wrap(item.name,fs,col[2]-col[1]-10)];
  if(item.unitDiscount)detail.push(...wrap(`Desc. unit.: ${currency(item.unitDiscount)}`,small,col[2]-col[1]-10));
  const code=wrap(item.sku,small,col[1]-col[0]-10);
  const numbers=[`${item.quantity.toLocaleString('pt-BR')} ${item.unit}`,amount(item.unitPrice),amount(item.quantity*(item.unitPrice-item.unitDiscount))];
  const numericLines=numbers.map((v,i)=>wrap(v,small,col[i+3]-col[i+2]-10));
  let offset=0;const count=Math.max(detail.length,code.length,...numericLines.map(rows=>rows.length));
  // Keep ordinary items together; only exceptionally long descriptions span pages.
  const completeHeight=Math.max(rowHeight,count*lh+8);
  if(y<bottom+completeHeight&&completeHeight<height-m-180)continuation();
  while(offset<count){
   const minimum=rowHeight;
   if(y<bottom+minimum)continuation();
   const capacity=Math.max(1,Math.floor((y-bottom-8)/lh)),take=Math.min(count-offset,capacity);
   const h=Math.max(minimum,take*lh+8);
   if(index%2)page.drawRectangle({x:m,y:y-h,width:w,height:h,color:rgb(.975,.98,.985)});
   const contentTop=y-(h-take*lh)/2;
   code.slice(offset,offset+take).forEach((v,i)=>text(v,col[0]+5,contentTop-i*lh,small));
   detail.slice(offset,offset+take).forEach((v,i)=>text(v,col[1]+5,contentTop-i*lh,fs));
   numericLines.forEach((rows,j)=>rows.slice(offset,offset+take).forEach((v,i)=>text(v,col[j+3]-5-normal.widthOfTextAtSize(safe(v),small),contentTop-i*lh,small)));
   y-=h;offset+=take;
  }
 }
 const totals=record.order?.commercialTotals;
 const gross=items.reduce((sum,i)=>sum+i.quantity*i.unitPrice,0),itemDiscount=items.reduce((sum,i)=>sum+i.quantity*i.unitDiscount,0);
 const summary:Array<[string,string]>=[['Subtotal',currency(gross)]];
 if(itemDiscount)summary.push(['Desconto nos itens','- '+currency(itemDiscount)]);
 summary.push([itemDiscount?'Desconto geral':'Desconto','- '+currency(totals?.orderDiscount||0)],['Frete',currency(totals?.freight||0)]);
 if(totals?.insurance)summary.push(['Seguro',currency(totals.insurance)]);
 if(totals?.other)summary.push(['Outras despesas',currency(totals.other)]);
 const sx=m+w*.58,sw=w*.42,totalSize=compact?11:12;
 const totalLines=wrap(currency(record.total),totalSize,sw-12,bold);
 const inline=totalLines.length===1&&bold.widthOfTextAtSize('TOTAL DO PEDIDO',small)+bold.widthOfTextAtSize(totalLines[0],totalSize)+14<sw;
 const totalBoxH=inline?29:totalLines.length*(totalSize+3)+22;
 const delivery=[record.order?.fulfillment||'A combinar',record.order?.deliveryDate?`Previsão: ${date(record.order.deliveryDate)}`:''].filter(Boolean).join(' · ');
 const deliveryH=small+6+wrap(delivery,fs,w*.53).length*(fs+3);
 const summaryH=Math.max(summary.length*(small+6)+totalBoxH,deliveryH);
 if(y<summaryH+52+bottom){page=pdf.addPage([width,height]);header(true);}
 const top=y-14;
 line(top+6);text('ENTREGA',m,top,small,true,muted);
 paragraph(delivery,m,top-small-6,w*.53,fs);
 let sy=top;summary.forEach(([label,value])=>{text(label,sx,sy,small);text(value,width-m-normal.widthOfTextAtSize(value,small),sy,small);sy-=small+6;});
 page.drawRectangle({x:sx-5,y:sy-totalBoxH+3,width:sw+5,height:totalBoxH,color:rgb(.91,.96,.95)});
 text('TOTAL DO PEDIDO',sx,inline?sy-20+small:sy-4,small,true);
 totalLines.forEach((v,i)=>text(v,width-m-bold.widthOfTextAtSize(v,totalSize),inline?sy-20+totalSize:sy-small-10-i*(totalSize+3),totalSize,true,accent));
 const receiptTop=top-summaryH-15;
 text('Recebido por: ____________________',m,receiptTop-10,small);text('Data: ____/____/______',width-m-(compact?99:128),receiptTop-10,small);
 const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:m,y:m},end:{x:width-m,y:m},thickness:.5,color:rule});p.drawText('Documento comercial. Não substitui nota fiscal.',{x:m,y:m-14,size:compact?6:8,font:normal,color:muted});p.drawText(`${i+1}/${pages.length}`,{x:width-m-20,y:m-14,size:small,font:normal,color:muted});});
 return pdf.save();
}
