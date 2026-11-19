import type {OrderCompany,OrderContact,OrderDocument} from './order-tools';
export type OrderPaper = 'A4'|'A5';

/** Documento comercial somente de leitura; não inclui custos nem observações internas. */
export async function buildOrderPdf(record:OrderDocument,company:OrderCompany,contact:OrderContact={},options:{paperSize?:OrderPaper}={}) {
 const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');
 const pdf=await PDFDocument.create();const normal=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const compact=options.paperSize==='A5',width=compact?419.53:595.28,height=compact?595.28:841.89,m=compact?23:34,w=width-2*m;
 const fs=compact?8.2:10.5,small=compact?6.8:8.5,lh=fs+4;
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
  const identityW=w*.62,titleW=w*.32,titleX=width-m-titleW;
  let leftY=y;
  if(logo){const maxW=compact?110:155,maxH=compact?34:48,scale=Math.min(maxW/logo.width,maxH/logo.height);
   if(company.logo?.darkBackground)page.drawRectangle({x:m-3,y:leftY-maxH-3,width:maxW+6,height:maxH+6,color:ink});
   page.drawImage(logo,{x:m,y:leftY-maxH,width:logo.width*scale,height:logo.height*scale});leftY-=maxH+9;
  }
  leftY-=paragraph(company.name,m,leftY,identityW,compact?12:16,true)+3;
  if(company.legalName&&company.legalName!==company.name)leftY-=paragraph(company.legalName,m,leftY,identityW,small);
  if(company.document)leftY-=paragraph(company.document,m,leftY,identityW,small);
  if(company.city)leftY-=paragraph(company.city,m,leftY,identityW,small);
  let rightY=y;rightY-=paragraph('PEDIDO',titleX,rightY,titleW,compact?17:23,true);
  rightY-=paragraph(record.id,titleX,rightY,titleW,compact?12:16,true)+4;
  rightY-=paragraph(date(record.createdAt),titleX,rightY,titleW,small)+4;
  const status=safe(continuation?'CONTINUAÇÃO':record.status||'Rascunho').toLocaleUpperCase('pt-BR');
  const statusLines=wrap(status,small,titleW-10,bold),statusH=statusLines.length*(small+3)+8;
  page.drawRectangle({x:titleX-4,y:rightY-statusH+3,width:Math.min(titleW,bold.widthOfTextAtSize(statusLines[0],small)+12),height:statusH,borderColor:accent,borderWidth:.6});
  statusLines.forEach((v,i)=>text(v,titleX,rightY-2-i*(small+3),small,true,accent));rightY-=statusH;
  y=Math.min(leftY,rightY)-12;line(y);y-=13;
 };
 const col=[m,m+w*.145,m+w*.57,m+w*.68,m+w*.84,width-m];
 const tableHeader=()=>{
  const h=compact?22:28;page.drawRectangle({x:m,y:y-h,width:w,height:h,color:tint});
  ['CÓDIGO','DESCRIÇÃO','QTD.','UNIT. (R$)','TOTAL (R$)'].forEach((label,i)=>text(label,col[i]+5,y-7,small,true));y-=h;
 };
 const continuation=()=>{page=pdf.addPage([width,height]);header(true);tableHeader();};
 header();
 page.drawLine({start:{x:m,y},end:{x:m,y:y-(compact?27:34)},color:accent,thickness:2});
 text('CLIENTE',m+8,y,small,true,muted);y-=small+6;
 y-=paragraph(contact.legalName||record.client,m+8,y,w-16,fs+1,true);
 if(contact.document)y-=paragraph(contact.document,m+8,y,w-16,small);
 const address=[contact.street,contact.number,contact.complement,contact.district,contact.city,contact.cep].filter(Boolean).join(' · ');
 if(address)y-=paragraph(address,m+8,y,w-16,small);
 y-=10;line(y);y-=12;
 const metadata=[['Vendedor',record.order?.seller||'-'],['Pagamento',record.order?.paymentMethod||'-'],['Vencimento',date(record.order?.firstDueDate||'')]];
 let metaH=0;metadata.forEach(([label,value],i)=>{const x=m+i*w/3;text(label,x,y,small,false,muted);const h=paragraph(value,x,y-small-4,w/3-8,fs);metaH=Math.max(metaH,h);});
 y-=small+4+metaH+16;tableHeader();
 const items=record.order?.lines||[];
 const extraSummary=(items.some(i=>i.unitDiscount)?1:0)+(record.order?.commercialTotals.insurance?1:0)+(record.order?.commercialTotals.other?1:0);
 const reserve=(3+extraSummary)*(small+8)+(compact?54+55:70+70)+m+40;
 const rowHeight=items.length&&items.length<=8?Math.max(compact?28:38,Math.min(compact?40:64,(y-reserve)/items.length)):compact?28:38;
 for(const [index,item] of items.entries()) {
  const detail=[...wrap(item.name,fs,col[2]-col[1]-10)];
  if(item.unitDiscount)detail.push(...wrap(`Desc. unit.: ${currency(item.unitDiscount)}`,small,col[2]-col[1]-10));
  const code=wrap(item.sku,small,col[1]-col[0]-10);
  const numbers=[`${item.quantity.toLocaleString('pt-BR')} ${item.unit}`,amount(item.unitPrice),amount(item.quantity*(item.unitPrice-item.unitDiscount))];
  const numericLines=numbers.map((v,i)=>wrap(v,small,col[i+3]-col[i+2]-10));
  let offset=0;const count=Math.max(detail.length,code.length,...numericLines.map(rows=>rows.length));
  // Keep ordinary items together; only exceptionally long descriptions span pages.
  const completeHeight=Math.max(rowHeight,count*lh+12);
  if(y<100+completeHeight&&completeHeight<height-m-280)continuation();
  while(offset<count){
   const minimum=rowHeight;
   if(y<100+minimum)continuation();
   const capacity=Math.max(1,Math.floor((y-100-12)/lh)),take=Math.min(count-offset,capacity);
   const h=Math.max(minimum,take*lh+12);
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
 const summaryH=summary.length*(small+8)+(compact?54:70),receiptH=compact?55:70;
 if(y<summaryH+receiptH+m+20){page=pdf.addPage([width,height]);header(true);}
 const top=Math.min(y-18,m+summaryH+receiptH+20),sx=m+w*.46,sw=w*.54;
 line(top+8);text('ENTREGA',m,top,small,true,muted);
 paragraph([record.order?.fulfillment||'A combinar',record.order?.deliveryDate?`Previsão: ${date(record.order.deliveryDate)}`:''].filter(Boolean).join(' · '),m,top-small-7,w*.42,fs);
 let sy=top;summary.forEach(([label,value])=>{text(label,sx,sy,small);text(value,width-m-normal.widthOfTextAtSize(value,small),sy,small);sy-=small+8;});
 const totalSize=compact?11:15;const totalLines=wrap(currency(record.total),totalSize,sw-12,bold),inline=totalLines.length===1&&bold.widthOfTextAtSize('TOTAL DO PEDIDO',small)+bold.widthOfTextAtSize(totalLines[0],totalSize)+14<sw;
 const totalBoxH=inline?(compact?30:34):totalLines.length*(totalSize+4)+24;
 page.drawRectangle({x:sx-5,y:sy-totalBoxH+3,width:sw+5,height:totalBoxH,color:rgb(.91,.96,.95)});
 text('TOTAL DO PEDIDO',sx,inline?sy-22+small:sy-4,small,true);
 totalLines.forEach((v,i)=>text(v,width-m-bold.widthOfTextAtSize(v,totalSize),inline?sy-22+totalSize:sy-small-12-i*(totalSize+4),totalSize,true,accent));
 const receiptTop=Math.min(sy-totalBoxH-15,m+receiptH);
 line(receiptTop);text('Recebido por: ____________________',m,receiptTop-12,small);text('Data: ____/____/______',width-m-(compact?99:128),receiptTop-12,small);
 const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:m,y:m},end:{x:width-m,y:m},thickness:.5,color:rule});p.drawText('Documento comercial. Não substitui nota fiscal.',{x:m,y:m-14,size:compact?6:8,font:normal,color:muted});p.drawText(`${i+1}/${pages.length}`,{x:width-m-20,y:m-14,size:small,font:normal,color:muted});});
 return pdf.save();
}
