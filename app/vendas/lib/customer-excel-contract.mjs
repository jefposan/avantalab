export const CUSTOMER_EXCEL_FORMAT = 'AVANTALAB-CLIENTES-1';
export const CUSTOMER_IMPORT_REQUEST = 'AVANTALAB_CUSTOMER_IMPORT_V1';
export const CUSTOMER_IMPORT_LIMIT = 1000;
export const CUSTOMER_EXCEL_FIELDS = [
  {key:'documentType',label:'Tipo de pessoa *',width:22,choices:['Pessoa física','Pessoa jurídica']},
  {key:'document',label:'CPF/CNPJ *',width:24,max:32},
  {key:'legalName',label:'Razão social / Nome *',width:38,max:160},
  {key:'tradeName',label:'Nome fantasia',width:30,max:160},
  {key:'displayName',label:'Nome de exibição',width:30,max:160},
  {key:'stateRegistration',label:'Inscrição estadual',width:23,max:40},
  {key:'municipalRegistration',label:'Inscrição municipal',width:23,max:40},
  {key:'stateRegistrationIndicator',label:'Situação da inscrição estadual',width:30,choices:['Contribuinte ICMS','Contribuinte isento','Não contribuinte']},
  {key:'consumerFinal',label:'Consumidor final *',width:22,choices:['Sim','Não']},
  {key:'email',label:'E-mail',width:34,max:254},
  {key:'phone',label:'Telefone',width:23,max:32},
  {key:'primaryContact',label:'Contato principal',width:28,max:120},
  {key:'postalCode',label:'CEP',width:14,max:12},
  {key:'street',label:'Logradouro',width:38,max:180},
  {key:'number',label:'Número',width:15,max:30},
  {key:'complement',label:'Complemento',width:28,max:100},
  {key:'district',label:'Bairro',width:26,max:100},
  {key:'city',label:'Município',width:28,max:100},
  {key:'cityCode',label:'Código IBGE do município',width:25,max:7},
  {key:'state',label:'UF',width:10,max:2},
  {key:'paymentTerms',label:'Condição de pagamento',width:28,max:120},
  {key:'notes',label:'Observações',width:48,max:2000},
  {key:'status',label:'Situação',width:24,choices:['Ativo','Revisar cadastro','Inativo']},
];
export const normalizarCabecalhoCliente = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\*/g,'').replace(/\s+/g,' ').trim().toLowerCase();
