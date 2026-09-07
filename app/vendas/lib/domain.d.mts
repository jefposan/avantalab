export type DocumentType = 'orcamento' | 'pedido' | 'venda' | 'ordem_servico' | 'nfe' | 'nfce' | 'nfse';

export type FiscalConfig = {
  companyDocument: string;
  taxRegime: string;
  cityCode: string;
  municipalRegistration: string;
  stateRegistration: string;
  providerConnected: boolean;
  certificateValid: boolean;
  environment: 'homologacao' | 'producao';
  fiscalResponsible?: string;
  nfseAuthorityMode?: 'Não definido' | 'Padrão nacional' | 'Prefeitura ou provedor municipal';
  contingencyPlan?: 'Não definido' | 'Plano por documento e autorizador';
  taxReviewConfirmed: boolean;
  taxReformReviewConfirmed?: boolean;
  fiscalMatrixRuleMatched?: boolean;
  fiscalMatrixRuleReviewed?: boolean;
  fiscalMatrixRuleName?: string;
  fiscalMatrixRequirementsMet?: boolean;
  fiscalMatrixRuleDetail?: string;
};

export function money(value: number): string;
export function percent(value: number): string;
export function parseCommercialNumber(value: string): number | null;
export function formatCnpj(value: string): string;
export function formatCpf(value: string): string;
export function formatCep(value: string): string;
export function isValidIsoDate(value: string): boolean;
export function isValidEmail(value: string): boolean;
export function isValidCnpj(value: string): boolean;
export function isValidCpf(value: string): boolean;
export function evaluateCertificateCompanyRegistration(company: Record<string, unknown> | null | undefined): {
  ready: boolean;
  document: string;
  checks: Array<{ id: string; label: string; ready: boolean }>;
  missing: Array<{ id: string; label: string; ready: boolean }>;
};
export function documentLabel(type: DocumentType): string;
export function calculateOrder(
  items: Array<{ quantity: number; unitPrice: number }>,
  discount?: number,
  freight?: number,
): { subtotal: number; discount: number; freight: number; total: number };
export function validateOrder(order: {
  client: string;
  paymentMethod: string;
  reserveStock: boolean;
  fiscalDocument: 'nenhum' | 'nfe' | 'nfce' | 'nfse';
  orderDate?: string;
  deliveryDate?: string;
  installments?: number;
  firstDueDate?: string;
  items: Array<{
    name: string;
    kind: 'produto' | 'servico';
    quantity: number;
    unitPrice: number;
    taxableUnit?: string;
    available: number;
    fiscalStatus: string;
  }>;
}): { ready: boolean; errors: string[]; warnings: string[] };
export function validateServiceOrder(order: {
  client: string;
  scheduledDate: string;
  scheduledTime: string;
  technician: string;
  paymentMethod: string;
  installments: number;
  firstDueDate?: string;
  fiscalDocument: 'nenhum' | 'nfse';
  items: Array<{
    name: string;
    kind: 'produto' | 'servico';
    quantity: number;
    unitPrice: number;
    municipalServiceCode: string;
    fiscalStatus: string;
  }>;
}): { ready: boolean; errors: string[]; warnings: string[] };
export function validateServiceExecution(execution: {
  actualDurationMinutes: number;
  startedAt?: string;
  completedAt?: string;
  completionNotes: string;
  materials: Array<{ name: string; quantity: number; unit: string }>;
  checklist: Array<{ complete: boolean }>;
  acceptanceStatus: 'Pendente' | 'Aceito' | 'Recusado';
  acceptedBy: string;
}): { ready: boolean; errors: string[]; warnings: string[] };
export function fiscalReadiness(
  config: FiscalConfig,
  documentType: 'nfe' | 'nfce' | 'nfse',
): { ready: boolean; errors: string[]; warnings: string[] };
export function normalizeModuleSettings<T>(input: unknown, defaults: T): T;
export function resolveEffectivePermissions(input: {
  rolePermissions: string[];
  overrides?: Record<string, 'permitir' | 'bloquear'>;
  permissionIds: string[];
}): Record<string, boolean>;
export function canAccessPermission(input: { active: boolean; effectivePermissions: Record<string, boolean>; permission: string }): boolean;
export function validateModuleSettings(settings: Record<string, any>): { ready: boolean; errors: string[]; warnings: string[] };
export function validateFiscalDraft(input: {
  documentType: 'nfe' | 'nfce' | 'nfse';
  recipient: { name: string; document: string; city: string };
  items: Array<{
    kind: 'produto' | 'servico';
    quantity: number;
    unitPrice: number;
    ncm: string;
    municipalServiceCode: string;
    nationalServiceCode?: string;
    nbs?: string;
    issRate?: number;
    serviceIncidenceMode?: string;
    fiscalOriginCode?: string;
    cfopInternal?: string;
    cfopInterstate?: string;
    icmsCode?: string;
    pisCst?: string;
    cofinsCst?: string;
    ibsCbsCst?: string;
    ibsCbsClassification?: string;
    ibsCbsOperationIndicator?: string;
    fiscalStatus: string;
  }>;
  config: FiscalConfig;
}): {
  draftReady: boolean;
  transmissionReady: boolean;
  checks: Array<{ key: string; label: string; ready: boolean; detail: string; scope: 'cadastro' | 'transmissao' }>;
  errors: string[];
  warnings: string[];
};
export function stockStatus(current: number, minimum: number): 'sem_estoque' | 'baixo' | 'normal';
export function applyStockMovement(input: {
  current: number;
  reserved: number;
  quantity: number;
  direction: 'entrada' | 'saida';
  allowNegativeStock?: boolean;
  protectReservations?: boolean;
}): { valid: boolean; errors: string[]; delta: number; nextCurrent: number; nextAvailable: number };
export function applyServiceMaterialStockTransition(
  lines: Array<{ sku: string; current: number; reserved: number; quantity: number }>,
  transition: 'consumir' | 'estornar',
): { valid: boolean; errors: string[]; items: Array<{ sku: string; current: number; reserved: number; quantity: number; available: number }> };
export function calculateServiceExecutionCost(input: {
  serviceLines: Array<{ unit: string; quantity: number; cost: number }>;
  materials: Array<{ quantity: number; cost: number; source?: string }>;
  actualDurationMinutes: number;
  total: number;
}): { laborCost: number; materialCost: number; actualCost: number; marginValue: number; marginPercent: number };
export type CommercialReportGroup = { label: string; count: number; quantity: number; revenue: number; cost: number; value: number; received: number; marginValue: number; marginPercent: number };
export type CommercialReportInventoryItem = { label: string; sku: string; count: number; quantity: number; current: number; reserved: number; minimum: number; value: number; status: 'sem_estoque' | 'baixo' | 'normal' };
export function calculateCommercialReport(input?: {
  operations?: Array<Record<string, any>>;
  receivables?: Array<{ value: number; received: number; reversed: number; refunded: number; dueDate: string; createdAt?: string; method?: string }>;
  catalog?: Array<Record<string, any>>;
  movements?: Array<Record<string, any>>;
  fiscalDrafts?: Array<Record<string, any>>;
  todayIso?: string;
}): {
  revenue: number; cost: number; grossProfit: number; marginPercent: number; completedOperations: number; averageTicket: number; serviceHours: number;
  openReceivables: number; receivedNet: number; overdueReceivables: number; averageDueDays: number;
  stockAvailableValue: number; stockCurrentUnits: number; stockReservedUnits: number; stockLowItems: number; stockConsumed: number;
  fiscalDrafts: number; fiscalReady: number; fiscalBlocked: number; fiscalValue: number;
  categories: CommercialReportGroup[]; products: CommercialReportGroup[]; services: CommercialReportGroup[]; clients: CommercialReportGroup[];
  sellers: CommercialReportGroup[]; technicians: CommercialReportGroup[]; payments: CommercialReportGroup[]; fiscal: CommercialReportGroup[];
  inventory: CommercialReportInventoryItem[];
};
export function buildReportCsv(rows: Array<{ label: string; detail: string; primary: string; secondary: string }>): string;
export function calculateInventoryCount(input: {
  current: number;
  reserved: number;
  counted: number;
  protectReservations?: boolean;
}): { valid: boolean; errors: string[]; adjustment: number; nextCurrent: number; nextAvailable: number };
export function applyOrderStockTransition(
  lines: Array<{ sku: string; current: number; reserved: number; quantity: number }>,
  transition: 'reservar' | 'liberar' | 'baixar' | 'baixar_direto' | 'devolver',
  options?: { allowNegativeStock?: boolean },
): {
  valid: boolean;
  errors: string[];
  items: Array<{ sku: string; current: number; reserved: number; quantity: number; available: number }>;
};
export function createReceivableSchedule(input: {
  total: number;
  installments: number;
  firstDueDate: string;
}): {
  valid: boolean;
  errors: string[];
  items: Array<{ installment: string; dueDate: string; value: number }>;
};
export function receivableBalance(record: {
  value: number;
  received: number;
  reversed: number;
  refunded: number;
}): number;
export function receivableStatus(record: {
  value: number;
  received: number;
  reversed: number;
  refunded: number;
  dueDate: string;
}, todayIso: string): 'Em aberto' | 'Vence hoje' | 'Atrasado' | 'Recebido parcial' | 'Recebido' | 'Estorno pendente' | 'Estornado';
export function applyReceivablePayment(record: {
  value: number;
  received: number;
  reversed: number;
  refunded: number;
}, amount: number): { valid: boolean; errors: string[]; received: number };
export function applyReceivableRefund(record: {
  value: number;
  received: number;
  reversed: number;
  refunded: number;
}, amount: number): { valid: boolean; errors: string[]; refunded: number };
export function reverseReceivable(record: {
  value: number;
  received: number;
  reversed: number;
  refunded: number;
}): { reversed: number; refunded: number };
export function normalizeSearch(value: string): string;
export const DOCUMENT_TYPES: readonly DocumentType[];
