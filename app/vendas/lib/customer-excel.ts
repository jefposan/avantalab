import {CUSTOMER_EXCEL_FIELDS,CUSTOMER_EXCEL_FORMAT,CUSTOMER_IMPORT_LIMIT,CUSTOMER_IMPORT_REQUEST,normalizarCabecalhoCliente} from './customer-excel-contract.mjs';
export type CustomerImportRow={line:number;customer:Record<string,unknown>};
export type CustomerImportPreview={ok:boolean;canImport:boolean;confirmed?:boolean;total:number;created:number;skipped:number;review:number;previewKey:string;rowErrors:Array<{line:number;field:string;message:string}>;rows?:Array<{line:number;status:string}>};

export async function criarModeloClientes(companyId='') {
  const ExcelJS=(await import('exceljs')).default;
  const workbook=new ExcelJS.Workbook();
  workbook.creator='AvantaLab'; workbook.subject='Modelo de cadastro de clientes';
  const info=workbook.addWorksheet('Instruções',{views:[{showGridLines:false}]});
  info.columns=[{width:31},{width:104}];
  info.mergeCells('A1:B1');info.getCell('A1').value='Cadastro de clientes — AvantaLab';info.getCell('A1').font={name:'Arial',size:16,bold:true,color:{argb:'FF003E73'}};info.getRow(1).height=32;
  const instrucoes=[
    ['Como preencher','Copie os clientes do sistema anterior para a aba Clientes, sem alterar os títulos das colunas. Uma linha por cliente.'],
    ['Campos obrigatórios','Preencha Tipo de pessoa, CPF/CNPJ, Razão social / Nome e Consumidor final. Campos com * são obrigatórios.'],
    ['Documentos e códigos','CPF/CNPJ, telefone, CEP, número e código IBGE são textos. Preserve zeros à esquerda. CNPJ alfanumérico é aceito conforme o cadastro do sistema.'],
    ['Dados fiscais incompletos','Endereço e inscrições podem ser completados depois. Clientes sem dados fiscais suficientes ficam como Revisar cadastro; não ficam prontos para emissão. Inativos permanecem inativos.'],
    ['Inscrição estadual','Escolha Contribuinte ICMS, Contribuinte isento ou Não contribuinte. Se informar IE, indique sua situação. Para pessoa física, o cadastro utiliza Não contribuinte.'],
    ['Duplicidades','CPF/CNPJ já cadastrado neste perfil será ignorado, sem sobrescrever o cliente existente. Documento repetido no arquivo precisa ser corrigido.'],
    ['Revisão antes de gravar',`Importe até ${CUSTOMER_IMPORT_LIMIT} linhas por arquivo (.xlsx, até 5 MB). Revise novos clientes, ignorados e erros. Nada é gravado antes de Confirmar importação.`],
    ['Tabelas e vendedores','O código interno é gerado pelo AvantaLab. Vendedor e vínculo com tabela de preços podem ser definidos depois no cadastro do cliente.'],
    ['Segurança do arquivo','Não utilize fórmulas, macros ou links como valores. Não inclua vendas, saldos ou históricos: este arquivo cadastra somente clientes.'],
  ];
  info.getRow(3).values=['Orientação','Preenchimento'];
  info.getRow(3).eachCell(cell=>{cell.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF003E73'}};cell.alignment={vertical:'middle'};});info.getRow(3).height=25;
  instrucoes.forEach((values,index)=>{const row=info.getRow(index+4);row.values=values;row.height=42;row.eachCell((cell,column)=>{cell.font={name:'Arial',size:11,bold:column===1,color:{argb:'FF172B3E'}};cell.alignment={vertical:'middle',wrapText:true};if(index%2===0)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF1F6FA'}};});});
  const sheet=workbook.addWorksheet('Clientes',{views:[{state:'frozen',xSplit:2,ySplit:1,showGridLines:false}],properties:{tabColor:{argb:'FF003E73'}}});
  sheet.columns=CUSTOMER_EXCEL_FIELDS.map(field=>({key:field.key,header:field.label,width:field.width,style:{numFmt:'@',font:{name:'Arial',size:11},alignment:{vertical:'middle',horizontal:'left'}}}));
  sheet.getRow(1).height=34;sheet.getRow(1).eachCell((cell,column)=>{cell.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:column<=9?'FF003E73':column<=12?'FF007F7A':column<=20?'FF005A8D':'FF35566C'}};cell.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(let line=2;line<=501;line++) {
    const row=sheet.getRow(line);row.height=21;
    CUSTOMER_EXCEL_FIELDS.forEach((field,index)=>{const cell=row.getCell(index+1);cell.value='';cell.numFmt='@';if(line%2===0)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF5F8FA'}};
      if(field.choices)cell.dataValidation={type:'list',allowBlank:true,formulae:[`"${field.choices.join(',')}"`],showErrorMessage:true,errorTitle:'Valor inválido',error:'Selecione uma opção da lista.'};
    });
  }
  sheet.autoFilter={from:{row:1,column:1},to:{row:501,column:CUSTOMER_EXCEL_FIELDS.length}};
  const metadata=workbook.addWorksheet('_Avanta',{state:'veryHidden'});metadata.getCell('A1').value=CUSTOMER_EXCEL_FORMAT;metadata.getCell('A2').value=companyId;
  return workbook;
}

export async function baixarModeloClientes(companyId:string) {
  const workbook=await criarModeloClientes(companyId);
  const buffer=await workbook.xlsx.writeBuffer();
  const blob=new Blob([new Uint8Array(buffer).slice().buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`avantalab-modelo-clientes-${new Date().toISOString().slice(0,10)}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export async function lerModeloClientes(buffer:ArrayBuffer,companyId:string) {
  const ExcelJS=(await import('exceljs')).default;const workbook=new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet=workbook.getWorksheet('Clientes'),meta=workbook.getWorksheet('_Avanta');
  if(!sheet||meta?.getCell('A1').text!==CUSTOMER_EXCEL_FORMAT)throw Error('Use o modelo baixado em Exportar Excel e mantenha a aba Clientes.');
  const fileCompanyId=meta.getCell('A2').text;
  if(fileCompanyId&&fileCompanyId!==companyId)throw Error('Este modelo pertence a outro perfil. Exporte o modelo no perfil correto.');
  if(sheet.rowCount>10001||sheet.columnCount>CUSTOMER_EXCEL_FIELDS.length)throw Error('A estrutura do arquivo foi alterada. Utilize as colunas do modelo.');
  const indexes=new Map<string,number>();
  sheet.getRow(1).eachCell((cell,index)=>{if(cell.type===ExcelJS.ValueType.Formula||cell.type===ExcelJS.ValueType.Error)throw Error('Fórmulas não são permitidas nos cabeçalhos.');const header=normalizarCabecalhoCliente(cell.text);const field=CUSTOMER_EXCEL_FIELDS.find(field=>normalizarCabecalhoCliente(field.label)===header);if(!field||indexes.has(field.key))throw Error(`Cabeçalho inválido ou repetido: ${cell.text}.`);indexes.set(field.key,index);});
  for(const field of CUSTOMER_EXCEL_FIELDS.filter(field=>field.label.includes('*')))if(!indexes.has(field.key))throw Error(`Coluna obrigatória ausente: ${field.label}.`);
  const rows:CustomerImportRow[]=[];
  const escolha=(value:string,options:Record<string,string>,line:number,label:string)=>{const normalized=normalizarCabecalhoCliente(value);if(!options[normalized])throw Error(`Linha ${line}: ${label} inválido.`);return options[normalized];};
  for(let line=2;line<=sheet.rowCount;line++) {
    const values:Record<string,string>={};
    for(const field of CUSTOMER_EXCEL_FIELDS){const index=indexes.get(field.key);const cell=index?sheet.getRow(line).getCell(index):undefined;
      if(cell?.type===ExcelJS.ValueType.Formula||cell?.type===ExcelJS.ValueType.Error)throw Error(`Linha ${line}: fórmulas e erros de célula não são permitidos.`);
      values[field.key]=cell?.text.trim()||'';
    }
    if(!Object.values(values).some(Boolean))continue;
    if(rows.length>=CUSTOMER_IMPORT_LIMIT)throw Error(`O limite é de ${CUSTOMER_IMPORT_LIMIT} clientes por arquivo.`);
    const documentType=escolha(values.documentType,{'pessoa fisica':'cpf','pessoa juridica':'cnpj','pf':'cpf','pj':'cnpj','cpf':'cpf','cnpj':'cnpj'},line,'Tipo de pessoa');
    const final=escolha(values.consumerFinal,{'sim':'true','nao':'false'},line,'Consumidor final');
    if(values.stateRegistration&&documentType==='cnpj'&&!values.stateRegistrationIndicator)throw Error(`Linha ${line}: informe a situação da inscrição estadual.`);
    const ie=values.stateRegistrationIndicator?escolha(values.stateRegistrationIndicator,{'contribuinte icms':'contribuinte_icms','contribuinte isento':'contribuinte_isento','nao contribuinte':'nao_contribuinte'},line,'Situação da inscrição estadual'):'nao_contribuinte';
    const status=values.status?escolha(values.status,{'ativo':'ativo','inativo':'inativo','revisar cadastro':'revisar_cadastro'},line,'Situação'):'ativo';
    rows.push({line,customer:{...values,documentType,consumerFinal:final==='true',stateRegistrationIndicator:ie,status}});
  }
  if(!rows.length)throw Error('A aba Clientes está vazia. Preencha pelo menos um cliente.');
  return {rows,fileCompanyId};
}

export function solicitarImportacaoClientes({companyId,origin,...body}:{companyId:string;origin:string;rows:CustomerImportRow[];fileName:string;fileCompanyId:string;confirm:boolean;previewKey?:string}):Promise<CustomerImportPreview> {
  return new Promise((resolve,reject)=>{
    if(!companyId||!origin||window.parent===window){reject(Error('Abra Clientes pelo módulo Vendas e Serviços do perfil empresarial.'));return;}
    const requestId=crypto.randomUUID(),channel=new MessageChannel();
    const timer=window.setTimeout(()=>{channel.port1.close();reject(Error(body.confirm?'A confirmação demorou. Atualize a lista antes de tentar novamente; o resultado pode já ter sido gravado.':'A prévia demorou. Tente novamente.'));},110000);
    channel.port1.onmessage=event=>{const result=event.data;if(result?.companyId!==companyId||result?.requestId!==requestId)return;window.clearTimeout(timer);channel.port1.close();if(result.ok)resolve(result);else reject(Error(result.message||'Não foi possível importar os clientes.'));};
    window.parent.postMessage({type:CUSTOMER_IMPORT_REQUEST,companyId,requestId,...body},origin,[channel.port2]);
  });
}
