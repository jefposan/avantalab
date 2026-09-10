export type CommercialRecord = {
  id: string;
  date: string;
  client: string;
  type: 'Orçamento' | 'Pedido' | 'Venda rápida';
  status: string;
  total: number;
  seller: string;
  fiscal: string;
  stock: string;
};

export type ServiceOrder = {
  id: string;
  client: string;
  service: string;
  scheduled: string;
  technician: string;
  status: string;
  total: number;
  nfse: string;
};

export type ClientRecord = {
  id: string;
  name: string;
  legalName: string;
  tradeName: string;
  document: string;
  profile: 'Pessoa jurídica' | 'Pessoa física';
  stateRegistration: string;
  municipalRegistration: string;
  fiscal: 'Contribuinte ICMS' | 'Contribuinte isento' | 'Não contribuinte';
  consumerFinal: boolean;
  email: string;
  phone: string;
  contactName: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  cityName: string;
  cityCode: string;
  state: string;
  city: string;
  seller: string;
  paymentTerms: string;
  orders: number;
  revenue: number;
  lastPurchase: string;
  status: 'Ativo' | 'Revisar cadastro' | 'Inativo';
  persistence?: { integrated: boolean; version: number };
};

export type CatalogItemRecord = {
  sku: string;
  name: string;
  description: string;
  category: 'Produto acabado' | 'Serviço';
  current: number;
  reserved: number;
  available: number;
  minimum: number;
  unit: string;
  cost: number;
  price: number;
  fiscal: string;
  origin: 'Custos e Precificação';
  syncStatus: 'Sincronizado' | 'Revisar publicação';
  syncedAt: string;
  saleStatus: 'Ativo' | 'Pausado';
  trackStock: boolean;
  ncm: string;
  cest: string;
  gtin: string;
  municipalServiceCode: string;
  nbs: string;
  issRate: number;
} & Partial<CatalogTaxProfile>;

export type StockMovementRecord = {
  id: string;
  date: string;
  createdAt: string;
  origin: string;
  type: string;
  direction: 'entrada' | 'saida' | 'reserva' | 'inventario';
  sku: string;
  item: string;
  quantity: number;
  balance: number;
  user: string;
  location: string;
  partner: string;
  document: string;
  lot: string;
  expiry: string;
  notes: string;
};

export const activeCompany = {
  name: 'Empresa Demonstração',
  legalName: 'Empresa Demonstração Comércio e Serviços Ltda.',
  document: '48.210.380/0001-15',
  city: 'São Paulo/SP',
  logoInitials: 'ED',
};

export const commercialRecords: CommercialRecord[] = [
  { id: 'PED-1048', date: '26/08/2026', client: 'Clínica Essenza Ltda.', type: 'Pedido', status: 'Confirmado', total: 2840, seller: 'Marina', fiscal: 'Pronto para NF-e', stock: 'Reservado' },
  { id: 'ORC-0321', date: '26/08/2026', client: 'Studio Bela Pele', type: 'Orçamento', status: 'Enviado', total: 1780, seller: 'Caio', fiscal: 'Não aplicável', stock: 'Não movimenta' },
  { id: 'PED-1047', date: '25/08/2026', client: 'Farmácia Central', type: 'Pedido', status: 'Separação', total: 4650, seller: 'Marina', fiscal: 'NF-e pendente', stock: 'Reservado' },
  { id: 'VEN-0088', date: '25/08/2026', client: 'Consumidor final', type: 'Venda rápida', status: 'Concluído', total: 289.9, seller: 'Paulo', fiscal: 'NFC-e autorizada', stock: 'Baixado' },
  { id: 'PED-1046', date: '24/08/2026', client: 'Espaço Harmonia', type: 'Pedido', status: 'Faturado', total: 2120, seller: 'Caio', fiscal: 'NF-e autorizada', stock: 'Baixado' },
  { id: 'ORC-0320', date: '23/08/2026', client: 'Hotel Serra Azul', type: 'Orçamento', status: 'Em negociação', total: 7980, seller: 'Marina', fiscal: 'Não aplicável', stock: 'Não movimenta' },
];

export const serviceOrders: ServiceOrder[] = [
  { id: 'OS-0184', client: 'Clínica Essenza Ltda.', service: 'Treinamento técnico presencial', scheduled: '27/08 · 09:00', technician: 'Rafael', status: 'Agendado', total: 950, nfse: 'Após conclusão' },
  { id: 'OS-0183', client: 'Espaço Harmonia', service: 'Consultoria de implantação', scheduled: '26/08 · 14:00', technician: 'Lívia', status: 'Em execução', total: 1450, nfse: 'Rascunho' },
  { id: 'OS-0182', client: 'Studio Bela Pele', service: 'Manutenção preventiva', scheduled: '25/08 · 10:30', technician: 'Rafael', status: 'Concluído', total: 480, nfse: 'Pronta para emitir' },
  { id: 'OS-0181', client: 'Hotel Serra Azul', service: 'Treinamento de equipe', scheduled: '22/08 · 08:30', technician: 'Lívia', status: 'Concluído', total: 1780, nfse: 'Autorizada' },
];

export const clients: ClientRecord[] = [
  { id: 'CLI-0001', name: 'Clínica Essenza Ltda.', legalName: 'Clínica Essenza Saúde e Bem-estar Ltda.', tradeName: 'Clínica Essenza', document: '48.210.380/0001-15', profile: 'Pessoa jurídica', stateRegistration: '110.042.490.114', municipalRegistration: '8.765.432-1', fiscal: 'Contribuinte ICMS', consumerFinal: false, email: 'financeiro@essenza.demo', phone: '(11) 3456-7890', contactName: 'Ana Essenza', cep: '01310-100', street: 'Avenida Paulista', number: '1000', complement: 'Conjunto 42', district: 'Bela Vista', cityName: 'São Paulo', cityCode: '3550308', state: 'SP', city: 'São Paulo/SP', seller: 'Marina', paymentTerms: '14 dias', orders: 18, revenue: 28450, lastPurchase: '26/08/2026', status: 'Ativo' },
  { id: 'CLI-0002', name: 'Studio Bela Pele', legalName: 'Bela Pele Estética Profissional Ltda.', tradeName: 'Studio Bela Pele', document: '11.222.333/0001-81', profile: 'Pessoa jurídica', stateRegistration: 'Isento', municipalRegistration: '456.778-2', fiscal: 'Contribuinte isento', consumerFinal: true, email: 'contato@belapele.demo', phone: '(19) 3344-2211', contactName: 'Beatriz Lima', cep: '13010-111', street: 'Rua Barão de Jaguara', number: '620', complement: 'Sala 8', district: 'Centro', cityName: 'Campinas', cityCode: '3509502', state: 'SP', city: 'Campinas/SP', seller: 'Caio', paymentTerms: 'À vista', orders: 11, revenue: 16220, lastPurchase: '25/08/2026', status: 'Ativo' },
  { id: 'CLI-0003', name: 'Farmácia Central', legalName: 'Farmácia Central de Sorocaba Ltda.', tradeName: 'Farmácia Central', document: '17.552.694/0001-72', profile: 'Pessoa jurídica', stateRegistration: '669.327.441.110', municipalRegistration: '091.228-7', fiscal: 'Contribuinte ICMS', consumerFinal: false, email: 'compras@farmaciacentral.demo', phone: '(15) 3211-9080', contactName: 'Carlos Nogueira', cep: '18010-160', street: 'Rua da Penha', number: '388', complement: '', district: 'Centro', cityName: 'Sorocaba', cityCode: '3552205', state: 'SP', city: 'Sorocaba/SP', seller: 'Marina', paymentTerms: '28 dias', orders: 23, revenue: 41280, lastPurchase: '25/08/2026', status: 'Ativo' },
  { id: 'CLI-0004', name: 'Espaço Harmonia', legalName: 'Espaço Harmonia Terapias Integradas Ltda.', tradeName: 'Espaço Harmonia', document: '52.803.176/0001-85', profile: 'Pessoa jurídica', stateRegistration: 'Isento', municipalRegistration: '778.201-9', fiscal: 'Contribuinte isento', consumerFinal: true, email: 'administrativo@harmonia.demo', phone: '(11) 4587-4400', contactName: 'Helena Martins', cep: '13201-000', street: 'Rua do Rosário', number: '144', complement: '', district: 'Centro', cityName: 'Jundiaí', cityCode: '3525904', state: 'SP', city: 'Jundiaí/SP', seller: 'Caio', paymentTerms: '14 dias', orders: 9, revenue: 13810, lastPurchase: '24/08/2026', status: 'Ativo' },
  { id: 'CLI-0005', name: 'Hotel Serra Azul', legalName: 'Serra Azul Hotelaria e Turismo Ltda.', tradeName: 'Hotel Serra Azul', document: '06.184.529/0001-99', profile: 'Pessoa jurídica', stateRegistration: '', municipalRegistration: '102.447-0', fiscal: 'Não contribuinte', consumerFinal: true, email: 'compras@serraazul.demo', phone: '(12) 3663-1150', contactName: 'Eduardo Campos', cep: '12460-000', street: 'Avenida Macedo Soares', number: '510', complement: '', district: 'Capivari', cityName: 'Campos do Jordão', cityCode: '3509700', state: 'SP', city: 'Campos do Jordão/SP', seller: 'Marina', paymentTerms: '30 dias', orders: 7, revenue: 22150, lastPurchase: '22/08/2026', status: 'Revisar cadastro' },
];

export const demoCnpjDirectory: Record<string, Partial<ClientRecord>> = {
  '74283915000198': {
    name: 'Aurora Gestão Empresarial Ltda.',
    legalName: 'Aurora Gestão Empresarial Ltda.',
    tradeName: 'Aurora Gestão',
    document: '74.283.915/0001-98',
    stateRegistration: 'Isento',
    municipalRegistration: '6.501.287-4',
    fiscal: 'Não contribuinte',
    email: 'contato@auroragestao.com.br',
    phone: '(11) 3090-1188',
  },
};

export const demoCepDirectory: Record<string, Pick<ClientRecord, 'cep' | 'street' | 'district' | 'cityName' | 'cityCode' | 'state' | 'city'>> = {
  '04538000': { cep: '04538-000', street: 'Rua Doutor Renato Paes de Barros', district: 'Itaim Bibi', cityName: 'São Paulo', cityCode: '3550308', state: 'SP', city: 'São Paulo/SP' },
};

export const inventory: CatalogItemRecord[] = [
  { sku: 'PRD-001', name: 'Creme Hidratante Corporal 150 ml', description: 'Produto acabado para venda unitária.', category: 'Produto acabado', current: 86, reserved: 24, available: 62, minimum: 30, unit: 'un', cost: 12.48, price: 34.9, fiscal: 'Completo', origin: 'Custos e Precificação', syncStatus: 'Sincronizado', syncedAt: '26/08/2026 · 08:42', saleStatus: 'Ativo', trackStock: true, ncm: '3304.99.90', cest: '20.013.00', gtin: '7891234567001', municipalServiceCode: '', nbs: '', issRate: 0, fiscalOriginCode: '0', cfopInternal: '5102', cfopInterstate: '6102', icmsCode: '102', pisCst: '49', cofinsCst: '49', cestRequired: true, fiscalReviewedAt: '', fiscalReviewedBy: '' },
  { sku: 'PRD-002', name: 'Sérum Facial Vitamina C 30 ml', description: 'Sérum facial em embalagem de 30 ml.', category: 'Produto acabado', current: 21, reserved: 18, available: 3, minimum: 20, unit: 'un', cost: 18.72, price: 59.9, fiscal: 'Revisar NCM', origin: 'Custos e Precificação', syncStatus: 'Sincronizado', syncedAt: '26/08/2026 · 08:42', saleStatus: 'Ativo', trackStock: true, ncm: '', cest: '20.013.00', gtin: '7891234567002', municipalServiceCode: '', nbs: '', issRate: 0, fiscalOriginCode: '0', cfopInternal: '5102', cfopInterstate: '6102', icmsCode: '102', pisCst: '49', cofinsCst: '49', cestRequired: true },
  { sku: 'PRD-003', name: 'Sabonete Líquido Lavanda 250 ml', description: 'Sabonete líquido pronto para venda.', category: 'Produto acabado', current: 145, reserved: 30, available: 115, minimum: 40, unit: 'un', cost: 9.36, price: 27.5, fiscal: 'Completo', origin: 'Custos e Precificação', syncStatus: 'Sincronizado', syncedAt: '26/08/2026 · 08:42', saleStatus: 'Ativo', trackStock: true, ncm: '3401.30.00', cest: '20.034.00', gtin: '7891234567003', municipalServiceCode: '', nbs: '', issRate: 0, fiscalOriginCode: '0', cfopInternal: '5102', cfopInterstate: '6102', icmsCode: '102', pisCst: '49', cofinsCst: '49', cestRequired: true },
  { sku: 'PRD-004', name: 'Home Spray Cítrico 200 ml', description: 'Aromatizador de ambientes em frasco de 200 ml.', category: 'Produto acabado', current: 12, reserved: 8, available: 4, minimum: 18, unit: 'un', cost: 16.15, price: 46.9, fiscal: 'Revisar CEST', origin: 'Custos e Precificação', syncStatus: 'Revisar publicação', syncedAt: '25/08/2026 · 17:10', saleStatus: 'Ativo', trackStock: true, ncm: '3307.49.00', cest: '', gtin: '7891234567004', municipalServiceCode: '', nbs: '', issRate: 0, fiscalOriginCode: '0', cfopInternal: '5102', cfopInterstate: '6102', icmsCode: '102', pisCst: '49', cofinsCst: '49', cestRequired: true },
  { sku: 'SRV-001', name: 'Consultoria de implantação', description: 'Consultoria técnica por hora para implantação e acompanhamento.', category: 'Serviço', current: 0, reserved: 0, available: 0, minimum: 0, unit: 'h', cost: 78, price: 145, fiscal: 'Revisar código municipal', origin: 'Custos e Precificação', syncStatus: 'Sincronizado', syncedAt: '26/08/2026 · 08:42', saleStatus: 'Ativo', trackStock: false, ncm: '', cest: '', gtin: '', municipalServiceCode: '', nationalServiceCode: '17.01', nbs: '1.1801.10.00', issRate: 2, pisCst: '49', cofinsCst: '49', serviceIncidenceMode: 'Município do prestador', issWithheldDefault: false },
];

export const stockMoves: StockMovementRecord[] = [
  { id: 'MOV-0104', date: '26/08/2026 10:42', createdAt: '2026-08-26T10:42:00-03:00', origin: 'PED-1048', type: 'Reserva de pedido', direction: 'reserva', sku: 'PRD-001', item: 'Creme Hidratante Corporal 150 ml', quantity: -24, balance: 86, user: 'Marina', location: 'Estoque principal', partner: 'Clínica Essenza Ltda.', document: 'PED-1048', lot: '', expiry: '', notes: 'Reserva aguardando separação.' },
  { id: 'MOV-0103', date: '25/08/2026 16:18', createdAt: '2026-08-25T16:18:00-03:00', origin: 'VEN-0088', type: 'Saída por venda', direction: 'saida', sku: 'PRD-003', item: 'Sabonete Líquido Lavanda 250 ml', quantity: -3, balance: 145, user: 'Paulo', location: 'Estoque principal', partner: 'Consumidor final', document: 'NFC-e 000.000.088', lot: 'SL-2508', expiry: '2027-08-31', notes: '' },
  { id: 'MOV-0102', date: '25/08/2026 11:03', createdAt: '2026-08-25T11:03:00-03:00', origin: 'PROD-0071', type: 'Entrada de produção', direction: 'entrada', sku: 'PRD-001', item: 'Creme Hidratante Corporal 150 ml', quantity: 60, balance: 110, user: 'Lívia', location: 'Estoque principal', partner: 'Produção interna', document: 'PROD-0071', lot: 'CH-2508', expiry: '2027-08-31', notes: 'Lote liberado pela produção.' },
  { id: 'MOV-0101', date: '24/08/2026 09:20', createdAt: '2026-08-24T09:20:00-03:00', origin: 'AJU-0014', type: 'Ajuste de inventário', direction: 'inventario', sku: 'PRD-004', item: 'Home Spray Cítrico 200 ml', quantity: -2, balance: 12, user: 'Rafael', location: 'Estoque principal', partner: '', document: 'INV-0014', lot: '', expiry: '', notes: 'Divergência confirmada na contagem mensal.' },
];

export const fiscalDocuments = [
  { number: 'NF-e 000.001.286', date: '25/08/2026', client: 'Espaço Harmonia', model: '55', total: 2120, status: 'Autorizada', key: '3526…8741', environment: 'Demonstração', event: 'Autorização registrada' },
  { number: 'NFC-e 000.000.088', date: '25/08/2026', client: 'Consumidor final', model: '65', total: 289.9, status: 'Autorizada', key: '3526…9032', environment: 'Demonstração', event: 'Autorização registrada' },
  { number: 'NFS-e 000.000.411', date: '22/08/2026', client: 'Hotel Serra Azul', model: 'Nacional', total: 1780, status: 'Autorizada', key: '3550…1180', environment: 'Demonstração', event: 'NFS-e gerada' },
  { number: 'Rascunho NF-e', date: '26/08/2026', client: 'Clínica Essenza Ltda.', model: '55', total: 2840, status: 'Pronta para validar', key: '—', environment: 'Homologação', event: 'Aguardando configuração' },
  { number: 'Rascunho NFS-e', date: '26/08/2026', client: 'Espaço Harmonia', model: 'Nacional', total: 1450, status: 'Rascunho', key: '—', environment: 'Homologação', event: 'Serviço em execução' },
];

export const receivables = [
  { id: 'REC-1904', due: '26/08/2026', client: 'Clínica Essenza Ltda.', origin: 'PED-1048', method: 'Boleto', installment: '1/2', value: 1420, received: 0, status: 'Vence hoje' },
  { id: 'REC-1903', due: '28/08/2026', client: 'Farmácia Central', origin: 'PED-1047', method: 'PIX', installment: '1/1', value: 4650, received: 0, status: 'Em aberto' },
  { id: 'REC-1902', due: '10/09/2026', client: 'Clínica Essenza Ltda.', origin: 'PED-1048', method: 'Boleto', installment: '2/2', value: 1420, received: 0, status: 'Em aberto' },
  { id: 'REC-1901', due: '25/08/2026', client: 'Espaço Harmonia', origin: 'PED-1046', method: 'Cartão', installment: '1/1', value: 2120, received: 2120, status: 'Recebido' },
  { id: 'REC-1900', due: '24/08/2026', client: 'Studio Bela Pele', origin: 'OS-0182', method: 'Boleto', installment: '1/1', value: 480, received: 0, status: 'Atrasado' },
];

export const monthlyRevenue = [
  ['Mar', 38200], ['Abr', 41900], ['Mai', 44700], ['Jun', 49300], ['Jul', 52200], ['Ago', 48640],
] as const;

export const categoryRevenue = [
  ['Produtos', 39280], ['Serviços', 9360], ['Fretes e adicionais', 1240],
] as const;
import type { CatalogTaxProfile } from './tax-profile.mjs';
