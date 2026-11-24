import type {ReportDocument} from './report-builder.mjs';
export type ReportIdentity={name:string;document?:string;color?:string;logo?:{bytes:Uint8Array;format:'png'|'jpg';darkBackground?:boolean}};
export const formatReportCell=(value:string|number,format:string)=>format==='currency'?Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):format==='number'?Number(value||0).toLocaleString('pt-BR',{maximumFractionDigits:3}):format==='date'?(/^\d{4}-\d{2}-\d{2}/.test(String(value))?String(value).slice(0,10).split('-').reverse().join('/'):'—'):String(value??'');
const colorHex=(v?:string)=>/^#[0-9a-f]{6}$/i.test(v||'')?v!.slice(1).toUpperCase():'003E73';
const safe=(v:unknown)=>String(v??'').normalize('NFC').replace(/[^\x20-\x7e\xa0-\xff]/g,' ');

/** Mesma identidade das planilhas de Clientes: Arial, cabeçalho da empresa,
 * títulos coloridos, linhas alternadas, filtro, congelamento e valores numéricos. */
export async function buildReportExcel(report:ReportDocument,company:ReportIdentity,filters:string[]){
 const ExcelJS=(await import('exceljs')).default;const workbook=new ExcelJS.Workbook();
 workbook.creator='AvantaLab';workbook.subject=report.title;workbook.created=new Date(report.generatedAt);
 const sheet=workbook.addWorksheet('Relatório',{views:[{state:'frozen',ySplit:6,showGridLines:false}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:6'}});
 const count=report.columns.length;
 const merge=(row:number)=>{if(count>1)sheet.mergeCells(row,1,row,count);};
 merge(1);sheet.getCell(1,1).value=company.name;sheet.getCell(1,1).font={name:'Arial',size:16,bold:true,color:{argb:'FF'+colorHex(company.color)}};sheet.getRow(1).height=30;
 merge(2);sheet.getCell(2,1).value=report.title;sheet.getCell(2,1).font={name:'Arial',size:13,bold:true};sheet.getRow(2).height=25;
 merge(3);sheet.getCell(3,1).value=filters.join(' · ');sheet.getCell(3,1).alignment={wrapText:true,vertical:'middle'};sheet.getRow(3).height=Math.min(150,30+Math.floor(filters.join(' ').length/120)*14);
 merge(4);sheet.getCell(4,1).value=`${company.document||''} · Gerado em ${new Date(report.generatedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}`;
 merge(5);sheet.getCell(5,1).value=report.notes.join(' ');sheet.getCell(5,1).alignment={wrapText:true};sheet.getRow(5).height=28;
 report.columns.forEach((c,i)=>{sheet.getColumn(i+1).width=Math.min(48,Math.max(16,c.label.length+4,...report.rows.slice(0,100).map(r=>String(r[c.id]).length+2)));sheet.getColumn(i+1).font={name:'Arial',size:11};});
 sheet.getCell(1,1).font={name:'Arial',size:16,bold:true,color:{argb:'FF'+colorHex(company.color)}};sheet.getCell(2,1).font={name:'Arial',size:13,bold:true};
 const header=sheet.getRow(6);header.values=report.columns.map(c=>c.label);header.height=30;
 header.eachCell(cell=>{cell.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+colorHex(company.color)}};cell.alignment={vertical:'middle',wrapText:true};});
 report.rows.forEach((data,index)=>{const row=sheet.addRow(report.columns.map(c=>{
  if(['number','currency'].includes(c.format))return Number(data[c.id]||0);
  if(c.format==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(String(data[c.id])))return new Date(String(data[c.id])+'T12:00:00Z');
  // ExcelJS strings are literal values, never executable formulas.
  return String(data[c.id]??'');
 }));row.height=30;row.eachCell((cell,j)=>{cell.alignment={vertical:'middle',wrapText:true,horizontal:['number','currency'].includes(report.columns[j-1].format)?'right':'left'};if(index%2===0)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF1F6FA'}};cell.numFmt=report.columns[j-1].format==='currency'?'"R$" #,##0.00':report.columns[j-1].format==='date'?'dd/mm/yyyy':report.columns[j-1].format==='number'?'#,##0.###':'@';});});
 sheet.autoFilter={from:{row:6,column:1},to:{row:Math.max(6,report.rows.length+6),column:count}};
 const footer=sheet.addRow(report.columns.map(c=>c.id==='value'&&report.totals.value!==undefined?report.totals.value:c.id==='balance'&&report.totals.balance!==undefined?report.totals.balance:''));
 if(footer.getCell(1).value==='')footer.getCell(1).value=`${report.totals.records} registros`;
 footer.eachCell((cell,j)=>{cell.font={name:'Arial',size:11,bold:true};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE8F0F5'}};if(report.columns[j-1].format==='currency')cell.numFmt='"R$" #,##0.00';});
 sheet.headerFooter={oddFooter:'AvantaLab | Página &P de &N'};
 return workbook;
}

/** Padrão tabular da exportação mensal: A4 paisagem, identidade institucional,
 * cabeçalho repetido, linhas claras, valores à direita e página no rodapé. */
export async function buildReportPdf(report:ReportDocument,company:ReportIdentity,filters:string[]){
 const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');const pdf=await PDFDocument.create();
 const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const hex=colorHex(company.color),brand=rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4,6),16)/255);
 const ink=rgb(.12,.16,.21),muted=rgb(.36,.42,.47),tint=rgb(.94,.96,.98),rule=rgb(.80,.84,.88);
 const W=841.89,H=595.28,M=34,usable=W-2*M,size=9,lineHeight=12;
 const weights=report.columns.map(c=>['client','product','label'].includes(c.id)?2.5:['number','currency','date'].includes(c.format)?1.25:1.4);const weightSum=weights.reduce((n,v)=>n+v,0);const widths=weights.map(v=>v/weightSum*usable);
 const wrap=(value:unknown,width:number,f=font,fs=size)=>{
  const result:string[]=[];let line='';
  for(let word of safe(value).split(/\s+/).filter(Boolean)){
   const candidate=line?line+' '+word:word;
   if(f.widthOfTextAtSize(candidate,fs)<=width){line=candidate;continue;}
   if(line){result.push(line);line='';}
   while(f.widthOfTextAtSize(word,fs)>width){let part='';for(const ch of word){if(part&&f.widthOfTextAtSize(part+ch,fs)>width)break;part+=ch;}result.push(part);word=word.slice(part.length);}
   line=word;
  }
  if(line)result.push(line);return result.length?result:[''];
 };

 let page=pdf.addPage([W,H]),y=0;
 const draw=(text:unknown,x:number,top:number,strong=false,fs=size)=>page.drawText(safe(text),{x,y:top-fs,size:fs,font:strong?bold:font,color:ink});
 let logo:Awaited<ReturnType<typeof pdf.embedPng>>|undefined;
 if(company.logo)logo=company.logo.format==='jpg'?await pdf.embedJpg(company.logo.bytes):await pdf.embedPng(company.logo.bytes);
 const header=()=>{
  let top=H-M;
  if(logo){const scale=Math.min(100/logo.width,34/logo.height);page.drawImage(logo,{x:M,y:top-34,width:logo.width*scale,height:logo.height*scale});}
  const nameX=M+(logo?112:0);const companyLines=wrap(company.name,usable-(logo?112:0),bold,12);companyLines.forEach((v,i)=>draw(v,nameX,top-i*15,true,12));top-=Math.max(logo?40:0,companyLines.length*15+6);
  if(company.document){draw(company.document,M,top,false,8);top-=15;}
  const titleLines=wrap(report.title,usable,bold,17);titleLines.forEach((v,i)=>draw(v,M,top-i*21,true,17));top-=titleLines.length*21+7;
  const filterLines=wrap(filters.join(' · '),usable,font,8);filterLines.forEach((v,i)=>draw(v,M,top-i*11,false,8));top-=filterLines.length*11+8;
  if(top<150)throw Error('Os filtros são muito extensos para o cabeçalho do PDF. Reduza as seleções ou exporte em Excel.');
  page.drawLine({start:{x:M,y:top},end:{x:W-M,y:top},color:brand,thickness:1});top-=10;
  const headers=report.columns.map((c,i)=>wrap(c.label,widths[i]-10,bold,8));const hh=Math.max(...headers.map(v=>v.length))*11+12;page.drawRectangle({x:M,y:top-hh,width:usable,height:hh,color:tint});let x=M;
  headers.forEach((lines,i)=>{lines.forEach((v,j)=>draw(v,x+5,top-6-j*11,true,8));x+=widths[i];});y=top-hh;
 };
 const next=()=>{page=pdf.addPage([W,H]);header();};header();
 report.rows.forEach((row,index)=>{
  const cells=report.columns.map((c,i)=>wrap(formatReportCell(row[c.id],c.format),widths[i]-10));let offset=0;const max=Math.max(...cells.map(v=>v.length));
  while(offset<max){if(y<65)next();const capacity=Math.max(1,Math.floor((y-48-10)/lineHeight));const n=Math.min(capacity,max-offset);const h=n*lineHeight+10;if(index%2===0)page.drawRectangle({x:M,y:y-h,width:usable,height:h,color:tint});let x=M;
   cells.forEach((lines,i)=>{lines.slice(offset,offset+n).forEach((v,j)=>{const numeric=['number','currency'].includes(report.columns[i].format);draw(v,numeric?x+widths[i]-5-font.widthOfTextAtSize(v,size):x+5,y-5-j*lineHeight);});x+=widths[i];});y-=h;offset+=n;
  }
 });
 if(y<90)next();y-=18;draw(`${report.totals.records} registros${report.totals.value!==undefined?' · Total: '+formatReportCell(report.totals.value,'currency'):''}`,M,y,true);y-=20;
 for(const note of report.notes){for(const v of wrap(note,usable,font,8)){if(y<45)next();draw(v,M,y,false,8);y-=11;}}
 const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawLine({start:{x:M,y:30},end:{x:W-M,y:30},color:rule,thickness:.5});p.drawText(safe(`AvantaLab · ${new Date(report.generatedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · Página ${i+1}/${pages.length}`),{x:M,y:17,size:7,font,color:muted});});
 pdf.setTitle(report.title);pdf.setAuthor(company.name);return pdf.save();
}

export function downloadReport(bytes:Uint8Array,name:string,mime:string){const url=URL.createObjectURL(new Blob([bytes.slice().buffer as ArrayBuffer],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
