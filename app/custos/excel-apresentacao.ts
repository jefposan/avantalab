// Apresentação apenas: conserva valores, IDs, cabeçalhos e metadados de importação.
export async function formatarLivroPrecos(buffer:ArrayBuffer,cabecalhos:string[]) {
 const ExcelJS=(await import('exceljs')).default;
 const livro=new ExcelJS.Workbook();await livro.xlsx.load(buffer);
 livro.creator='AvantaLab';
 const produtos=livro.getWorksheet('Produtos');
 if(!produtos)throw Error('A aba Produtos não foi gerada.');
 produtos.views=[{state:'frozen',xSplit:2,ySplit:1,showGridLines:false}];
 produtos.properties.tabColor={argb:'FF003E73'};
 produtos.getRow(1).height=34;
 cabecalhos.forEach((titulo,index)=>{
  const coluna=produtos.getColumn(index+1);const moeda=titulo==='Custo'||titulo==='Preço padrão'||titulo.startsWith('Preço ·');
  coluna.width=titulo==='Nome'?38:titulo==='Descrição'?48:moeda?Math.min(32,Math.max(21,titulo.length+2)):Math.min(34,Math.max(14,titulo.length+2));
  coluna.hidden=titulo==='ID interno (não alterar)'||titulo==='Atualizado em (não alterar)';
  const cell=produtos.getRow(1).getCell(index+1);
  cell.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};
  cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:moeda?'FF007F7A':'FF003E73'}};
  cell.alignment={vertical:'middle',horizontal:'center',wrapText:true};
  for(let line=2;line<=produtos.rowCount;line++){
   const row=produtos.getRow(line),value=row.getCell(index+1);row.height=21;
   value.font={name:'Arial',size:11,color:{argb:'FF172B3E'}};
   value.alignment={vertical:'middle',horizontal:typeof value.value==='number'?'right':'left'};
   if(line%2===0)value.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF5F8FA'}};
   if(moeda)value.numFmt='"R$" #,##0.00';
   else if(typeof value.value==='string')value.numFmt='@';
  }
 });
 produtos.autoFilter={from:{row:1,column:1},to:{row:Math.max(2,produtos.rowCount),column:cabecalhos.length}};
 const instrucoes=livro.getWorksheet('Instruções');
 if(instrucoes){
  const titulo=instrucoes.getCell('A1').text;
  const textos=Array.from({length:Math.max(0,instrucoes.rowCount-2)},(_,i)=>instrucoes.getCell(i+3,1).text);
  instrucoes.eachRow(row=>{row.values=[];});
  instrucoes.columns=[{width:31},{width:104}];instrucoes.views=[{showGridLines:false}];
  instrucoes.mergeCells('A1:B1');instrucoes.getCell('A1').value=titulo;
  instrucoes.getCell('A1').font={name:'Arial',size:16,bold:true,color:{argb:'FF003E73'}};instrucoes.getRow(1).height=32;
  instrucoes.getRow(3).values=['Como usar','Preenchimento'];instrucoes.getRow(3).height=25;
  instrucoes.getRow(3).eachCell(cell=>{cell.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF003E73'}};cell.alignment={vertical:'middle'};});
  textos.forEach((texto,index)=>{const row=instrucoes.getRow(index+4);row.values=[`Orientação ${index+1}`,texto];row.height=42;row.eachCell((cell,column)=>{cell.font={name:'Arial',size:11,bold:column===1,color:{argb:'FF172B3E'}};cell.alignment={vertical:'middle',wrapText:true};if(index%2===0)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF1F6FA'}};});});
 }
 const metadados=livro.getWorksheet('Metadados');if(metadados)metadados.state='veryHidden';
 return livro;
}

export async function baixarLivroPrecos(buffer:ArrayBuffer,cabecalhos:string[],nome:string){
 const livro=await formatarLivroPrecos(buffer,cabecalhos);
 const bytes=await livro.xlsx.writeBuffer();
 const url=URL.createObjectURL(new Blob([new Uint8Array(bytes).slice().buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const link=document.createElement('a');link.href=url;link.download=nome;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
