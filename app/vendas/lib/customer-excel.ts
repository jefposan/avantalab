import {CUSTOMER_EXCEL_FIELDS,CUSTOMER_EXCEL_FORMAT,CUSTOMER_IMPORT_LIMIT,CUSTOMER_IMPORT_REQUEST,normalizarCabecalhoCliente} from './customer-excel-contract.mjs';
export type CustomerImportRow={line:number;customer:Record<string,unknown>};
export type CustomerImportMode='add'|'replace';
export type CustomerImportPreview={ok:boolean;canImport:boolean;confirmed?:boolean;total:number;created:number;skipped:number;updated?:number;inactivated?:number;duplicates?:number;review:number;previewKey:string;rowErrors:Array<{line:number;field:string;message:string}>;rows?:Array<{line:number;status:string}>};
export class ErroImportacaoClientes extends Error {}
export function mensagemFalhaClientes(cause:unknown,fallback:string){return cause instanceof ErroImportacaoClientes?cause.message:fallback;}
export function mensagemRetornoClientes(message:unknown){
  if(typeof message!=='string'||!message.trim())return 'Não foi possível concluir a solicitação de importação. Tente novamente.';
  if(/failed to fetch|fetch failed|network\s?error|load failed|timeout|timed out/i.test(message))return 'A comunicação com o sistema falhou ou demorou mais que o esperado. Confira a conexão e revalide a planilha antes de confirmar novamente.';
  if(/cannot read|undefined|unexpected token|internal server error|permission denied|invalid input|syntax error|does not exist|not found/i.test(message))return 'O sistema não conseguiu processar a importação. Nenhuma confirmação de conclusão foi recebida. Atualize a lista e revalide a planilha antes de tentar novamente.';
  return message;
}

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
    ['Duplicidades','Adicionar à base: CPF/CNPJ existente é ignorado, sem sobrescrever. Repetidos no arquivo são ignorados após a primeira linha válida. Substituir a base: mantenha uma única linha por CPF/CNPJ.'],
    ['Modo de importação','Adicionar mantém os clientes existentes. Substituir atualiza os presentes e inativa os ausentes, sem apagar pedidos, notas ou históricos. Revise as quantidades antes de confirmar.'],
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
  // SheetJS também interpreta OOXML com prefixos de namespace (ex.: x:workbook),
  // gerado por outros editores. A leitura não regrava nem converte o arquivo.
  const bytes=new Uint8Array(buffer);
  if(bytes[0]===0xd0&&bytes[1]===0xcf)throw new ErroImportacaoClientes('Este arquivo está em formato antigo (.xls) ou protegido por senha. Salve uma cópia como Excel .xlsx, sem senha, e selecione novamente.');
  if(bytes[0]!==0x50||bytes[1]!==0x4b)throw new ErroImportacaoClientes('O arquivo não foi reconhecido como uma planilha Excel .xlsx. Abra-o no Excel e use Salvar como > Pasta de trabalho do Excel (.xlsx). Apenas mudar a extensão não converte o arquivo.');
  const XLSX=await import('xlsx');
  let workbook:ReturnType<typeof XLSX.read>;
  try{workbook=XLSX.read(buffer,{type:'array',cellFormula:true,cellDates:false,sheetRows:10002});}
  catch{throw new ErroImportacaoClientes('Não foi possível ler a estrutura deste arquivo Excel. Ele pode estar incompleto, danificado ou protegido por senha. Abra-o no Excel, salve uma nova cópia .xlsx sem senha e tente novamente. Nenhum cliente foi importado.');}
  const sheet=workbook.Sheets.Clientes,meta=workbook.Sheets._Avanta;
  const cellText=(cell:import('xlsx').CellObject|undefined)=>String(cell?.v??'');
  const invalidCell=(cell:import('xlsx').CellObject|undefined)=>Boolean(cell&&(cell.f!==undefined||cell.F!==undefined||cell.t==='e'));
  if(invalidCell(meta?.A1)||invalidCell(meta?.A2))throw new ErroImportacaoClientes('A identificação interna do modelo foi alterada. Baixe um novo modelo em Exportar Excel e copie somente os dados dos clientes.');
  if(!sheet||cellText(meta?.A1)!==CUSTOMER_EXCEL_FORMAT)throw new ErroImportacaoClientes('Este arquivo não contém o modelo de clientes do AvantaLab. Baixe o arquivo em Exportar Excel e copie os dados para a aba Clientes, mantendo os títulos e as demais abas.');
  const fileCompanyId=cellText(meta?.A2);
  if(fileCompanyId&&fileCompanyId!==companyId)throw new ErroImportacaoClientes('Este modelo pertence a outro perfil. Exporte o modelo no perfil correto.');
  const range=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']||'A1');
  if(range.e.r>=10001||range.e.c>=CUSTOMER_EXCEL_FIELDS.length)throw new ErroImportacaoClientes('A estrutura do arquivo foi alterada. Utilize as colunas do modelo.');
  const indexes=new Map<string,number>();
  for(let col=0;col<=range.e.c;col++){const cell=sheet[XLSX.utils.encode_cell({r:0,c:col})];if(!cell)continue;if(invalidCell(cell))throw new ErroImportacaoClientes('Fórmulas não são permitidas nos cabeçalhos.');const header=normalizarCabecalhoCliente(cellText(cell));if(!header)continue;const field=CUSTOMER_EXCEL_FIELDS.find(field=>normalizarCabecalhoCliente(field.label)===header);if(!field||indexes.has(field.key))throw new ErroImportacaoClientes(`Cabeçalho inválido ou repetido: ${cellText(cell)}.`);indexes.set(field.key,col);}
  for(const field of CUSTOMER_EXCEL_FIELDS.filter(field=>field.label.includes('*')))if(!indexes.has(field.key))throw new ErroImportacaoClientes(`Coluna obrigatória ausente: ${field.label}.`);
  const rows:CustomerImportRow[]=[];
  const escolha=(value:string,options:Record<string,string>,line:number,label:string)=>{const normalized=normalizarCabecalhoCliente(value);if(!options[normalized])throw new ErroImportacaoClientes(`Linha ${line}: ${label} inválido.`);return options[normalized];};
  for(let line=2;line<=range.e.r+1;line++) {
    const values:Record<string,string>={};
    for(const field of CUSTOMER_EXCEL_FIELDS){const index=indexes.get(field.key);const cell=index!==undefined?sheet[XLSX.utils.encode_cell({r:line-1,c:index})]:undefined;
      if(invalidCell(cell))throw new ErroImportacaoClientes(`Linha ${line}: fórmulas e erros de célula não são permitidos.`);
      values[field.key]=cellText(cell).trim();
    }
    if(!Object.values(values).some(Boolean))continue;
    if(rows.length>=CUSTOMER_IMPORT_LIMIT)throw new ErroImportacaoClientes(`O limite é de ${CUSTOMER_IMPORT_LIMIT} clientes por arquivo.`);
    const documentType=escolha(values.documentType,{'pessoa fisica':'cpf','pessoa juridica':'cnpj','pf':'cpf','pj':'cnpj','cpf':'cpf','cnpj':'cnpj'},line,'Tipo de pessoa');
    const final=escolha(values.consumerFinal,{'sim':'true','nao':'false'},line,'Consumidor final');
    if(values.stateRegistration&&documentType==='cnpj'&&!values.stateRegistrationIndicator)throw new ErroImportacaoClientes(`Linha ${line}: informe a situação da inscrição estadual.`);
    const ie=values.stateRegistrationIndicator?escolha(values.stateRegistrationIndicator,{'contribuinte icms':'contribuinte_icms','contribuinte isento':'contribuinte_isento','nao contribuinte':'nao_contribuinte'},line,'Situação da inscrição estadual'):'nao_contribuinte';
    const status=values.status?escolha(values.status,{'ativo':'ativo','inativo':'inativo','revisar cadastro':'revisar_cadastro'},line,'Situação'):'ativo';
    rows.push({line,customer:{...values,documentType,consumerFinal:final==='true',stateRegistrationIndicator:ie,status}});
  }
  if(!rows.length)throw new ErroImportacaoClientes('A aba Clientes está vazia. Preencha pelo menos um cliente.');
  return {rows,fileCompanyId};
}

export function solicitarImportacaoClientes({companyId,origin,...body}:{companyId:string;origin:string;mode?:CustomerImportMode;rows:CustomerImportRow[];fileName:string;fileCompanyId:string;confirm:boolean;previewKey?:string}):Promise<CustomerImportPreview> {
  return new Promise((resolve,reject)=>{
    if(!companyId||!origin||window.parent===window){reject(new ErroImportacaoClientes('Abra Clientes pelo módulo Vendas e Serviços do perfil empresarial.'));return;}
    const requestId=crypto.randomUUID(),channel=new MessageChannel();
    const timer=window.setTimeout(()=>{channel.port1.close();reject(new ErroImportacaoClientes(body.confirm?'A confirmação demorou. Atualize a lista antes de tentar novamente; o resultado pode já ter sido gravado.':'A prévia demorou. Tente novamente.'));},110000);
    channel.port1.onmessage=event=>{const result=event.data;if(result?.companyId!==companyId||result?.requestId!==requestId)return;window.clearTimeout(timer);channel.port1.close();if(result.ok)resolve(result);else reject(new ErroImportacaoClientes(mensagemRetornoClientes(result.message)));};
    window.parent.postMessage({type:CUSTOMER_IMPORT_REQUEST,companyId,requestId,...body},origin,[channel.port2]);
  });
}
