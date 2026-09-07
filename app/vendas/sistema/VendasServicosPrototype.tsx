'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  activeCompany,
  clients,
  commercialRecords,
  demoCepDirectory,
  demoCnpjDirectory,
  fiscalDocuments,
  inventory,
  monthlyRevenue,
  receivables,
  serviceOrders,
  stockMoves,
  type CatalogItemRecord,
  type ClientRecord,
  type CommercialRecord,
  type ServiceOrder,
  type StockMovementRecord,
} from '../lib/demo-data';
import {
  applyOrderStockTransition,
  applyReceivablePayment,
  applyReceivableRefund,
  applyServiceMaterialStockTransition,
  applyStockMovement,
  buildReportCsv,
  calculateCommercialReport,
  calculateInventoryCount,
  calculateOrder,
  calculateServiceExecutionCost,
  createReceivableSchedule,
  documentLabel,
  evaluateCertificateCompanyRegistration,
  fiscalReadiness,
  formatCep,
  formatCnpj,
  formatCpf,
  isValidCnpj,
  isValidCpf,
  isValidEmail,
  isValidIsoDate,
  money,
  normalizeModuleSettings,
  normalizeSearch,
  parseCommercialNumber,
  percent,
  receivableBalance,
  receivableStatus,
  resolveEffectivePermissions,
  reverseReceivable,
  stockStatus,
  validateFiscalDraft,
  validateModuleSettings,
  validateOrder,
  validateServiceExecution,
  validateServiceOrder,
  type DocumentType,
  type FiscalConfig,
} from '../lib/domain.mjs';
import {
  SALES_MODULE_ID,
  accessDecisionMessage,
  coreProfileByModuleRole,
  evaluateAccessDecision,
  normalizeAccessBoundary,
} from '../lib/access-control.mjs';
import { brandLogoDataUri } from '../lib/brand-logo';
import { buildQuotePdf, quotePdfFileName, type QuotePdfInput } from '../lib/quote-pdf.mjs';
import { buildServiceOrderPdf, serviceOrderPdfFileName, type ServiceOrderPdfInput } from '../lib/service-order-pdf.mjs';
import { FISCAL_REFERENCE_DATE, buildFiscalWorkflow, getFiscalDocumentProfile } from '../lib/fiscal-flow.mjs';
import { municipalityIsResolved, resolveMunicipalityCode } from '../lib/municipality.mjs';
import { TAX_PROFILE_REFERENCE, evaluateCatalogTaxProfile, normalizeCatalogTaxProfile, type CatalogTaxProfile } from '../lib/tax-profile.mjs';
import { createDefaultFiscalMatrix, normalizeFiscalMatrix, resolveFiscalMatrixRule, validateFiscalMatrix, type FiscalMatrix, type FiscalMatrixRule } from '../lib/fiscal-matrix.mjs';
import { FISCAL_HOMOLOGATION_REFERENCE, FISCAL_HOMOLOGATION_STATUSES, createDefaultFiscalHomologationPlan, normalizeFiscalHomologationPlan, validateFiscalHomologationPlan, type FiscalHomologationDocument, type FiscalHomologationPlan, type FiscalHomologationScenario, type FiscalHomologationStatus } from '../lib/fiscal-homologation.mjs';
import { FISCAL_INTEGRATION_DECISION_STATUSES, FISCAL_INTEGRATION_MODES, createDefaultFiscalIntegrationEvaluation, normalizeFiscalIntegrationEvaluation, validateFiscalIntegrationEvaluation, type FiscalIntegrationCandidate, type FiscalIntegrationDocument, type FiscalIntegrationEvaluation, type FiscalIntegrationMode } from '../lib/fiscal-integration-evaluation.mjs';
import { FISCAL_CSC_STATUSES, FISCAL_NFSE_ROUTE_MODES, FISCAL_REGISTRATION_STATUSES, createFiscalEstablishmentFromCompany, createFiscalIssuerRegistry, normalizeFiscalIssuerRegistry, resolveFiscalIssuerSelection, validateFiscalIssuerRegistry, type FiscalCscStatus, type FiscalDocumentType, type FiscalEstablishment, type FiscalIssuerRegistry, type FiscalIssuerSelectionSnapshot, type FiscalNfseRouteMode, type FiscalRegistrationStatus } from '../lib/fiscal-issuer-routing.mjs';
import { NFE_SP_HOMOLOGATION_REFERENCE, buildNfeSpHomologationExecutionPlan, createDefaultNfeSpHomologationConfig, evaluateNfeSpHomologationConfig, normalizeNfeSpHomologationConfig, type NfeSpCertificateMode, type NfeSpHomologationConfig } from '../lib/nfe-sp-homologation.mjs';
import { evaluateNfeCertificateInstallationReadiness } from '../lib/nfe-certificate-installation.mjs';
import { configureFiscalSequence, createFiscalNumberingLedger, normalizeFiscalNumberingLedger, requestFiscalNumberVoid, validateFiscalNumberingLedger, type FiscalNumberingLedger, type FiscalNumberingSequence } from '../lib/fiscal-numbering.mjs';
import { isAllowedLocalManagementOrigin, MANAGEMENT_CATALOG_READY_TYPE, parseManagementCatalogMessage, type ManagementCatalogBridge } from '../lib/management-catalog-bridge.mjs';
import { createFiscalCancellationRequest, createFiscalCertificateActivateRequest, createFiscalCertificateInstallRequest, createFiscalCertificateStatusRequest, createFiscalCorrectionRequest, createFiscalDownloadRequest, createFiscalIssueRequest, createFiscalNumberRequest, createFiscalPrepareRequest, createFiscalStatusRequest, createFiscalValidateRequest, fiscalStatusPresentation, parseFiscalCancellationResponse, parseFiscalCertificateActivateResponse, parseFiscalCertificateInstallResponse, parseFiscalCertificateStatusResponse, parseFiscalCorrectionResponse, parseFiscalDownloadResponse, parseFiscalIssueResponse, parseFiscalNumberResponse, parseFiscalPrepareResponse, parseFiscalStatusResponse, parseFiscalValidateResponse, type FiscalArtifactType, type FiscalCertificateStatus, type FiscalEmissionStatus, type FiscalPreparedEmission } from '../lib/fiscal-status-bridge.mjs';
import { parseFiscalDocumentsMessage, type PersistedFiscalDocument } from '../lib/fiscal-documents-bridge.mjs';
import { createCommercialOrderWorkflowRequest, parseCommercialOrderWorkflowResponse } from '../lib/commercial-order-bridge.mjs';
import { createCommercialServiceWorkflowRequest, parseCommercialServiceWorkflowResponse } from '../lib/commercial-service-workflow-bridge.mjs';
import { createServiceAttachmentOpenRequest, createServiceAttachmentUploadRequest, parseServiceAttachmentResponse } from '../lib/commercial-service-attachment-bridge.mjs';
import { RECEIVABLE_READY_TYPE, createReceivableMoveRequest, parseReceivableMoveResponse, parseReceivableSnapshot } from '../lib/commercial-receivable-bridge.mjs';
import { STOCK_READY_TYPE, createStockMoveRequest, parseStockMoveResponse, parseStockSnapshot } from '../lib/commercial-stock-bridge.mjs';
import { CUSTOMER_READY_TYPE, CUSTOMER_SAVE_REQUEST_TYPE, CUSTOMER_SAVE_RESPONSE_TYPE, CUSTOMER_SNAPSHOT_TYPE, OPERATION_READY_TYPE, OPERATION_SAVE_REQUEST_TYPE, OPERATION_SAVE_RESPONSE_TYPE, OPERATION_SNAPSHOT_TYPE, SUPPLIER_READY_TYPE, SUPPLIER_SAVE_REQUEST_TYPE, SUPPLIER_SAVE_RESPONSE_TYPE, SUPPLIER_SNAPSHOT_TYPE, parsePartySaveResponse, parsePartySnapshot } from '../lib/commercial-party-bridge.mjs';
import { COMMERCIAL_PROFILE_PERMISSIONS } from '../lib/commercial-permissions.mjs';
import { ACCESS_READY_MESSAGE_TYPE, createAccessSaveRequest, parseAccessSaveResponse, parseAccessSnapshotMessage, type AccessBridgeSnapshot } from '../lib/access-settings-bridge.mjs';
import { FISCAL_RULES_READY_TYPE, createFiscalRulesSaveRequest, parseFiscalRulesSaveResponse, parseFiscalRulesSnapshot, type FiscalRulesBridgeSnapshot } from '../lib/fiscal-rules-bridge.mjs';

type View = 'painel' | 'vendas' | 'novo_pedido' | 'novo_orcamento' | 'nova_ordem_servico' | 'servicos' | 'clientes' | 'catalogo' | 'estoque' | 'fiscal' | 'recebimentos' | 'relatorios' | 'configuracoes';
type IconName = 'home' | 'sale' | 'service' | 'users' | 'box' | 'stock' | 'fiscal' | 'money' | 'chart' | 'settings' | 'plus' | 'search' | 'menu' | 'close' | 'chevron' | 'warning' | 'check' | 'clock' | 'document' | 'calendar' | 'arrow' | 'back' | 'copy' | 'print' | 'mail' | 'whatsapp' | 'tag' | 'edit' | 'image';
type NewActionType = DocumentType | 'cliente' | 'fornecedor' | 'produto';
type SupplierRecord = { id: string; name: string; document: string; contactName: string; email: string; phone: string; active: boolean; persistence?: { integrated: boolean; version: number } };
type ConfirmedSave = { ok: boolean; message: string };
type PendingConfirmedSave = { timer: number; resolve: (result: ConfirmedSave) => void };

type ServiceMaterial = { id: string; catalogItemId?: string; sku: string; name: string; quantity: number; unit: string; source: 'Catálogo' | 'Externo' | 'Cliente'; cost: number };
type ServiceChecklistItem = { id: string; label: string; complete: boolean };
type ServiceAttachment = { id: string; name: string; type: string; size: number; addedAt: string; checksum?: string; file?: File };
type ServiceAcceptance = { status: 'Pendente' | 'Aceito' | 'Recusado'; acceptedBy: string; acceptedAt: string; notes: string };
type ServiceExecutionInput = {
  actualDurationMinutes: number;
  startedAt: string;
  completedAt: string;
  completionNotes: string;
  materials: ServiceMaterial[];
  checklist: ServiceChecklistItem[];
  attachments: ServiceAttachment[];
  acceptance: ServiceAcceptance;
};

type CommercialTotals = {
  products: number;
  lineDiscount: number;
  orderDiscount: number;
  discount: number;
  freight: number;
  insurance: number;
  other: number;
  invoice: number;
};

type CreatedRecord = {
  id: string;
  type: DocumentType;
  client: string;
  total: number;
  createdAt: string;
  status?: 'Rascunho' | 'Confirmado' | 'Em separação' | 'Faturado' | 'Cancelado' | 'Devolvido' | 'Salvo' | 'Agendado' | 'Em execução' | 'Concluído';
  persistenceKey?: string;
  persistence?: { operationId: string; customerId: string; version: number; status: string; fiscalDraftId?: string };
  quote?: QuotePdfInput & { source: 'vendas' | 'servicos' };
  fiscalOriginId?: string;
  order?: {
    lines: Array<{ catalogItemId?: string; sku: string; name: string; kind: 'produto' | 'servico'; unit: string; quantity: number; unitPrice: number; unitDiscount: number; cost: number }>;
    commercialTotals: CommercialTotals;
    reserveStock: boolean;
    stockState: 'Sem movimentação' | 'Reservado' | 'Em separação' | 'Baixado' | 'Liberado' | 'Devolvido';
    seller: string;
    fiscalDocument: 'nenhum' | 'nfe' | 'nfce' | 'nfse';
    fiscalIssuer?: FiscalIssuerSelectionSnapshot;
    paymentMethod: string;
    installments: number;
    firstDueDate: string;
  };
  serviceOrder?: {
    lines: Array<{ sku: string; name: string; kind: 'servico'; unit: string; quantity: number; unitPrice: number; cost: number; municipalServiceCode: string; fiscalStatus: string }>;
    scheduledDate: string;
    scheduledTime: string;
    durationMinutes: number;
    technician: string;
    location: string;
    contactName: string;
    paymentMethod: string;
    installments: number;
    firstDueDate: string;
    fiscalDocument: 'nenhum' | 'nfse';
    fiscalIssuer?: FiscalIssuerSelectionSnapshot;
    internalNotes: string;
    customerNotes: string;
    completionNotes: string;
    startedAt?: string;
    completedAt?: string;
    actualDurationMinutes?: number;
    materials?: ServiceMaterial[];
    checklist?: ServiceChecklistItem[];
    attachments?: ServiceAttachment[];
    acceptance?: ServiceAcceptance;
    materialStockState?: 'Não aplicável' | 'Pendente' | 'Baixado' | 'Estornado';
    laborCostTotal?: number;
    materialCostTotal?: number;
    actualCostTotal?: number;
    actualMarginPercent?: number;
  };
  events?: Array<{ date: string; label: string; description: string }>;
};

type OrderLifecycleAction = 'separar' | 'faturar' | 'cancelar' | 'devolver';
type ServiceLifecycleAction = 'agendar' | 'iniciar' | 'cancelar';
type CommercialOperationRecord = CommercialRecord & { localRecord?: CreatedRecord; fiscalDraft?: FiscalDraftRecord };
type ServiceOperationRecord = ServiceOrder & { localRecord?: CreatedRecord; fiscalDraft?: FiscalDraftRecord };

type ReceivableEvent = {
  date: string;
  type: 'Geração' | 'Recebimento' | 'Estorno de recebimento' | 'Estorno da parcela';
  amount: number;
  method: string;
  account: string;
  user: string;
  description: string;
};

type ReceivableRecord = {
  id: string;
  dueDate: string;
  client: string;
  origin: string;
  method: string;
  installment: string;
  value: number;
  received: number;
  reversed: number;
  refunded: number;
  createdAt: string;
  status?: string;
  events: ReceivableEvent[];
  persistence?: { operationId: string; version: number };
};

type FiscalOrigin = {
  id: string;
  client: string;
  item: string;
  total: number;
  documentType: 'nfe' | 'nfce' | 'nfse';
  sourceLabel: 'Pedido' | 'Venda rápida' | 'Ordem de serviço';
};

type FiscalDraftItem = {
  sku: string;
  name: string;
  kind: 'produto' | 'servico';
  unit: string;
  quantity: number;
  unitPrice: number;
  unitDiscount: number;
  taxableUnit: string;
  fiscalBenefitCode: string;
  ncm: string;
  cest: string;
  municipalServiceCode: string;
  nationalServiceCode: string;
  nbs: string;
  issRate: number;
  serviceIncidenceMode: string;
  fiscalOriginCode: string;
  cfopInternal: string;
  cfopInterstate: string;
  icmsCode: string;
  pisCst: string;
  cofinsCst: string;
  ipiCst: string;
  ipiLegalCode: string;
  stBaseMode: string;
  stIcmsRate: number;
  ibsCbsCst: string;
  ibsCbsClassification: string;
  ibsCbsOperationIndicator: string;
  fiscalStatus: string;
};

type FiscalDraftCheck = { key: string; label: string; ready: boolean; detail: string; scope: 'cadastro' | 'transmissao' };

type FiscalDraftEvent = {
  date: string;
  label: string;
  description: string;
  user: string;
};

type FiscalDraftRecord = {
  id: string;
  emissionId?: string;
  remoteState?: string;
  remoteVersion?: number;
  persistenceSource?: 'browser' | 'server';
  demoScenario?: boolean;
  remoteStatusCode?: string;
  remoteStatusReason?: string;
  originId: string;
  sourceLabel: FiscalOrigin['sourceLabel'];
  documentType: 'nfe' | 'nfce' | 'nfse';
  client: string;
  clientDocument: string;
  clientCity: string;
  total: number;
  commercialTotals: CommercialTotals;
  paymentMethod: string;
  environment: 'Homologação local';
  series: string;
  number: string;
  key: string;
  issuer?: FiscalIssuerSelectionSnapshot;
  schemaReference?: string;
  authorityRoute?: string;
  fiscalResponsible?: string;
  taxReformStatus?: 'Pendente' | 'Revisado';
  contingencyPlan?: string;
  matrixReference?: string;
  fiscalRuleId?: string;
  fiscalRuleName?: string;
  fiscalRuleStatus?: 'Revisada' | 'Pendente' | 'Sem correspondência';
  operationNature?: string;
  operationContext?: { operation: string; destination: string; recipientProfile: string; presence: string };
  status: 'Com pendências' | 'Bloqueado para transmissão' | 'Pronto para homologação' | 'Cancelado';
  createdAt: string;
  updatedAt: string;
  items: FiscalDraftItem[];
  checks: FiscalDraftCheck[];
  warnings: string[];
  events: FiscalDraftEvent[];
};

function persistedFiscalItem(item: Record<string, any>): FiscalDraftItem {
  const fiscal = item.fiscal && typeof item.fiscal === 'object' ? item.fiscal : {};
  return {
    sku: String(item.sku || ''), name: String(item.name || ''),
    kind: item.itemType === 'servico' ? 'servico' : 'produto', unit: String(item.unit || ''),
    quantity: Number(item.quantity || 0), unitPrice: Number(item.unitPrice || 0), unitDiscount: Number(item.unitDiscount || 0),
    taxableUnit: String(fiscal.taxableUnit || fiscal.unidadeTributavel || item.unit || ''),
    fiscalBenefitCode: String(fiscal.fiscalBenefitCode || fiscal.codigoBeneficioFiscal || ''),
    ncm: String(fiscal.ncm || ''), cest: String(fiscal.cest || ''),
    municipalServiceCode: String(fiscal.municipalServiceCode || fiscal.codigoTributacaoMunicipal || ''),
    nationalServiceCode: String(fiscal.nationalServiceCode || fiscal.codigoTributacaoNacional || ''),
    nbs: String(fiscal.nbs || ''), issRate: Number(fiscal.issRate || fiscal.aliquotaIss || 0),
    serviceIncidenceMode: String(fiscal.serviceIncidenceMode || fiscal.municipioPrestacao || ''),
    fiscalOriginCode: String(fiscal.fiscalOriginCode || fiscal.origemMercadoria || ''),
    cfopInternal: String(fiscal.cfopInternal || fiscal.cfop || fiscal.cfopPadrao || ''),
    cfopInterstate: String(fiscal.cfopInterstate || ''),
    icmsCode: String(fiscal.icmsCode || fiscal.csosn || fiscal.cst || ''),
    pisCst: String(fiscal.pisCst || fiscal.cstPis || ''), cofinsCst: String(fiscal.cofinsCst || fiscal.cstCofins || ''),
    ipiCst: String(fiscal.ipiCst || fiscal.cstIpi || ''), ipiLegalCode: String(fiscal.ipiLegalCode || fiscal.enquadramentoIpi || ''),
    stBaseMode: String(fiscal.stBaseMode || ''), stIcmsRate: Number(fiscal.stIcmsRate || 0),
    ibsCbsCst: String(fiscal.ibsCbsCst || fiscal.cstIbsCbs || ''),
    ibsCbsClassification: String(fiscal.ibsCbsClassification || fiscal.classificacaoIbsCbs || ''),
    ibsCbsOperationIndicator: String(fiscal.ibsCbsOperationIndicator || ''),
    fiscalStatus: item.fiscalReady === true ? 'Completo' : 'Revisar cadastro fiscal',
  };
}

function createRejectedNcmDemoDraft(): FiscalDraftRecord {
  const createdAt = '2026-08-26T14:35:00-03:00';
  return {
    id: 'd1000000-0000-4000-8000-000000000001',
    emissionId: 'd1000000-0000-4000-8000-000000000001',
    remoteState: 'rejected',
    remoteVersion: 7,
    remoteStatusCode: '778',
    remoteStatusReason: 'Informado NCM inexistente',
    persistenceSource: 'browser',
    demoScenario: true,
    originId: 'PED-DEMO-778',
    sourceLabel: 'Pedido',
    documentType: 'nfe',
    client: 'Clínica Essenza Ltda.',
    clientDocument: '48.210.380/0001-15',
    clientCity: 'São Paulo/SP',
    total: 69.8,
    commercialTotals: { products: 69.8, lineDiscount: 0, orderDiscount: 0, discount: 0, freight: 0, insurance: 0, other: 0, invoice: 69.8 },
    paymentMethod: 'pix',
    environment: 'Homologação local',
    series: '1',
    number: '1287',
    key: 'Não exibida em demonstração',
    fiscalResponsible: 'Responsável fiscal da demonstração',
    taxReformStatus: 'Revisado',
    matrixReference: 'Demonstração segura',
    fiscalRuleId: 'demo-venda-sp',
    fiscalRuleName: 'Venda interna em demonstração',
    fiscalRuleStatus: 'Revisada',
    operationNature: 'Venda de mercadoria',
    operationContext: { operation: 'venda', destination: 'interna', recipientProfile: 'contribuinte', presence: 'não presencial' },
    status: 'Bloqueado para transmissão',
    createdAt,
    updatedAt: createdAt,
    items: [persistedFiscalItem({
      sku: 'PRD-001', name: 'Creme Hidratante Corporal 150 ml', itemType: 'produto',
      unit: 'un', quantity: 2, unitPrice: 34.9, unitDiscount: 0, fiscalReady: true,
      fiscal: { taxableUnit: 'un', ncm: '00000000', cest: '20.013.00', fiscalOriginCode: '0', cfopInternal: '5102', cfopInterstate: '6102', icmsCode: '102', pisCst: '49', cofinsCst: '49' },
    })],
    checks: [
      { key: 'demo-snapshot', label: 'Retrato fiscal da demonstração', ready: true, detail: 'Dados fictícios preparados somente para testar a revisão.', scope: 'cadastro' },
      { key: 'demo-rejection', label: 'Retorno da demonstração', ready: false, detail: 'Rejeição 778: corrija o NCM antes de continuar.', scope: 'transmissao' },
    ],
    warnings: ['Cenário fictício: nenhuma nota foi enviada à SEFAZ.'],
    events: [
      { date: createdAt, label: 'Rejeição simulada', description: 'Cenário local criado para testar a revisão do NCM sem certificado ou transmissão.', user: 'Sistema' },
    ],
  };
}

function rejectedNcmDemoStatus(draft: FiscalDraftRecord): FiscalEmissionStatus {
  return {
    id: draft.emissionId || draft.id,
    version: draft.remoteVersion || 1,
    documentType: 'nfe',
    model: '55',
    environment: 'homologacao',
    state: 'rejected',
    stateLabel: 'Rejeitada · demonstração',
    series: draft.series,
    number: Number(draft.number) || 0,
    accessKey: '',
    statusCode: draft.remoteStatusCode || '778',
    statusReason: draft.remoteStatusReason || 'Informado NCM inexistente',
    protocolNumber: '',
    updatedAt: draft.updatedAt,
    authorized: false,
    finalDocumentReady: false,
    recoveryPending: false,
    needsTechnicalAttention: false,
    actionRequired: true,
    recommendedAction: 'review_fiscal_data',
    recommendedActionLabel: 'Revisar dados fiscais',
    recommendedActionMessage: 'Demonstração: corrija o NCM indicado sem transmitir uma nota real.',
    artifacts: [],
  };
}

function createAuthorizedCancellationDemoDraft(): FiscalDraftRecord {
  const createdAt = '2026-09-04T10:20:00-03:00';
  return {
    id: 'd2000000-0000-4000-8000-000000000002', emissionId: 'd2000000-0000-4000-8000-000000000002',
    remoteState: 'danfe_ready', remoteVersion: 8, persistenceSource: 'browser', demoScenario: true,
    originId: 'PED-DEMO-CANCEL', sourceLabel: 'Pedido', documentType: 'nfe', client: 'Espaço Harmonia Ltda.',
    clientDocument: '45.723.174/0001-10', clientCity: 'São Paulo/SP', total: 1250,
    commercialTotals: { products: 1250, lineDiscount: 0, orderDiscount: 0, discount: 0, freight: 0, insurance: 0, other: 0, invoice: 1250 },
    paymentMethod: 'pix', environment: 'Homologação local', series: '1', number: '1288', key: 'Chave fictícia não exibida',
    fiscalResponsible: 'Responsável fiscal da demonstração', taxReformStatus: 'Revisado', matrixReference: 'Demonstração segura',
    fiscalRuleId: 'demo-venda-sp', fiscalRuleName: 'Venda interna em demonstração', fiscalRuleStatus: 'Revisada',
    operationNature: 'Venda de mercadoria', operationContext: { operation: 'venda', destination: 'interna', recipientProfile: 'contribuinte', presence: 'não presencial' },
    status: 'Pronto para homologação', createdAt, updatedAt: createdAt,
    items: [persistedFiscalItem({ sku: 'PRD-002', name: 'Kit de cuidados corporais', itemType: 'produto', unit: 'un', quantity: 10, unitPrice: 125, unitDiscount: 0, fiscalReady: true, fiscal: { taxableUnit: 'un', ncm: '33049990', fiscalOriginCode: '0', cfopInternal: '5102', icmsCode: '102', pisCst: '49', cofinsCst: '49' } })],
    checks: [{ key: 'demo-authorized', label: 'Autorização fictícia', ready: true, detail: 'Cenário local preparado somente para testar o cancelamento.', scope: 'transmissao' }],
    warnings: ['Demonstração sem valor fiscal: nenhuma nota foi autorizada ou transmitida à SEFAZ.'],
    events: [{ date: createdAt, label: 'Autorização simulada', description: 'Cenário local criado para testar a solicitação de cancelamento sem transmissão.', user: 'Sistema' }],
  };
}

function authorizedCancellationDemoStatus(draft: FiscalDraftRecord): FiscalEmissionStatus {
  return {
    id: draft.emissionId || draft.id, version: draft.remoteVersion || 8, documentType: 'nfe', model: '55', environment: 'homologacao',
    state: 'danfe_ready', stateLabel: 'Nota autorizada · demonstração', series: draft.series, number: Number(draft.number) || 1288,
    accessKey: '35260945723174000110550010000012881000012880', statusCode: '100', statusReason: 'Autorização fictícia para demonstração local.',
    protocolNumber: '135260000000001', updatedAt: draft.updatedAt, authorized: true, finalDocumentReady: true,
    recoveryPending: false, needsTechnicalAttention: false, actionRequired: false, recommendedAction: '', recommendedActionLabel: '', recommendedActionMessage: '', artifacts: [],
  };
}

function mapPersistedFiscalDocument(document: PersistedFiscalDocument): FiscalDraftRecord {
  const totals = document.totals || {};
  const items = (document.items || []).map((item: Record<string, any>) => persistedFiscalItem(item));
  const ready = document.draftStatus === 'pronto';
  const canceled = document.emission?.state === 'canceled';
  const blocked = ['rejected', 'failed'].includes(document.emission?.state || '');
  const createdAt = document.createdAt || new Date().toISOString();
  const updatedAt = document.emission?.updatedAt || createdAt;
  const sourceLabel: FiscalOrigin['sourceLabel'] = document.originType === 'ordem_servico' ? 'Ordem de serviço' : 'Pedido';
  const originDisplay = document.originNumber ? `${sourceLabel === 'Pedido' ? 'PED' : 'OS'}-${document.originNumber}` : document.originId;
  const draftReadyDetail = ready ? 'Retrato comercial pronto e íntegro no servidor.' : 'O cadastro fiscal possui pendências.';
  const emissionReady = Boolean(document.emissionId);
  return {
    id: document.draftId,
    emissionId: document.emissionId || undefined,
    remoteState: document.emission?.state || undefined,
    remoteVersion: document.emission?.version || undefined,
    persistenceSource: 'server',
    originId: originDisplay,
    sourceLabel,
    documentType: document.documentType,
    client: document.client || 'Cliente não identificado',
    clientDocument: document.clientDocument || '',
    clientCity: document.clientCity || '',
    total: Number(document.total || totals.total || 0),
    commercialTotals: {
      products: Number(totals.subtotalGross || 0), lineDiscount: Number(totals.itemDiscount || 0),
      orderDiscount: Number(totals.generalDiscount || 0),
      discount: Number(totals.itemDiscount || 0) + Number(totals.generalDiscount || 0),
      freight: Number(totals.freight || 0), insurance: Number(totals.insurance || 0),
      other: Number(totals.otherExpenses || 0), invoice: Number(totals.total || document.total || 0),
    },
    paymentMethod: document.paymentMethod || 'Não informado',
    environment: 'Homologação local',
    series: document.emission?.series || 'Não atribuída',
    number: document.emission?.number ? String(document.emission.number) : 'Não atribuído',
    key: document.emission?.accessKey || 'Não gerada',
    status: canceled ? 'Cancelado' : blocked ? 'Bloqueado para transmissão' : ready ? 'Pronto para homologação' : 'Com pendências',
    createdAt,
    updatedAt,
    items,
    checks: [
      { key: 'persisted-draft', label: 'Retrato fiscal persistido', ready, detail: draftReadyDetail, scope: 'cadastro' },
      { key: 'persisted-emission', label: 'Ciclo fiscal vinculado', ready: emissionReady, detail: emissionReady ? `Emissão ${document.emissionId} vinculada sem duplicidade.` : 'A emissão ainda não foi aberta.', scope: 'transmissao' },
    ],
    warnings: ready ? [] : ['Conclua as pendências cadastrais antes de preparar a emissão.'],
    events: [{ date: createdAt, label: 'Documento comercial faturado', description: emissionReady ? 'Rascunho e emissão fiscal reencontrados no servidor pelo mesmo vínculo.' : 'Rascunho fiscal persistido; a emissão ainda não foi aberta.', user: 'Sistema' }],
  };
}

type NfeSpPreXmlDiagnostic = {
  ok: boolean;
  valid: boolean;
  mode: 'pre-xml-sem-assinatura';
  environment: 'homologacao';
  transmissionAttempted: false;
  schemaValidationExecuted: boolean;
  schemaValid: boolean;
  schemaPackage: string;
  schemaRoot: string;
  accessKey: string;
  errors: Array<{ code: string; field: string; message: string }>;
  warnings: string[];
  xml: string;
  error?: string;
};

type NfeSpSignatureLabDiagnostic = {
  ok: boolean;
  valid: boolean;
  mode: 'assinatura-efemera-laboratorio';
  environment: 'homologacao';
  signatureExecuted: boolean;
  signatureVerified: boolean;
  digestVerified: boolean;
  referenceVerified: boolean;
  certificateSelfSignatureVerified: boolean;
  issuerDocumentBoundToReference: boolean;
  signedXsdValid: boolean;
  preXmlXsdValid: boolean;
  schemaValidationExecuted: boolean;
  schemaPackage: string;
  accessKey: string;
  keyBits: number;
  certificateFingerprint: string;
  certificateProfile: 'autoassinado-efemero-nao-icp-brasil';
  realCertificateOwnerValidated: false;
  icpBrasilChainValidated: false;
  signedXmlReturned: false;
  transmissionAttempted: false;
  canonicalizationMethod: string;
  signatureMethod: string;
  digestMethod: string;
  errors: Array<{ code: string; field: string; message: string }>;
  warnings: string[];
  error?: string;
};

type NfeCertificateReadinessDiagnostic = {
  ok: boolean;
  valid: boolean;
  mode: 'diagnostico-certificado-digital';
  environment: 'homologacao';
  reference: string;
  referenceValid: boolean;
  adapterConfigured: boolean;
  realCertificateInspected: boolean;
  subjectDocumentSource: string;
  ownerVerified: boolean;
  validityVerified: boolean;
  keyUsageVerified: boolean;
  chainVerified: boolean;
  rootPinned: boolean;
  revocationVerified: boolean;
  signingAvailable: boolean;
  mutualTlsAvailable: boolean;
  readyForXmlSignature: boolean;
  readyForMutualTls: boolean;
  readyForExternalHomologation: false;
  certificateFingerprint: string;
  certificateValidFrom: string;
  certificateValidTo: string;
  keyType: string;
  keyBits: number;
  sensitiveMaterialReturned: false;
  signingAttempted: false;
  transmissionAttempted: false;
  errors: Array<{ code: string; field: string; message: string }>;
  warnings: string[];
  error?: string;
};

type NfeA1ValidationDiagnostic = {
  ok: boolean;
  valid: boolean;
  readyForServerInstallation: boolean;
  certificateFingerprint: string;
  certificateValidFrom: string;
  certificateValidTo: string;
  ownerVerified: boolean;
  validityVerified: boolean;
  keyUsageVerified: boolean;
  clientAuthenticationVerified: boolean;
  errors: Array<{ code: string; field: string; message: string }>;
  error?: string;
};

type NfeStatusServiceDiagnostic = {
  ok: boolean;
  valid: boolean;
  mode: 'diagnostico-status-sefaz';
  environment: 'homologacao';
  authority: 'SEFAZ/SP';
  endpoint: string;
  endpointValidated: boolean;
  requestBuilt: boolean;
  certificateActive: boolean;
  mutualTlsReady: boolean;
  transportConfigured: boolean;
  networkAttempted: boolean;
  responseReceived: boolean;
  serviceOperational: boolean;
  cStat: string;
  xMotivo: string;
  receivedAt: string;
  latencyMs: number;
  sensitiveMaterialReturned: false;
  transmissionAttempted: false;
  errors: Array<{ code: string; field: string; message: string }>;
  warnings: string[];
  error?: string;
};

type OrderLine = {
  id: string;
  catalogItemId?: string;
  sku: string;
  name: string;
  kind: 'produto' | 'servico';
  unit: string;
  quantity: number;
  unitPrice: number;
  unitDiscount: number;
  available: number;
  cost: number;
  fiscalStatus: string;
};

type CatalogItem = CatalogItemRecord & CatalogTaxProfile & { catalogItemId?: string; stockLocationId?: string; allowNegativeStock?: boolean };
type PaymentMethod = 'pix' | 'boleto' | 'cartao' | 'prazo';
type CompanyProfile = typeof activeCompany & {
  stateRegistration: string; municipalRegistration: string; taxRegime: string; cityCode: string; cep: string; street: string; number: string; complement: string; district: string; email: string; phone: string;
};
type AccessRoleId = 'gestor' | 'administrador' | 'operador_completo' | 'operador_simples';
type AccessOverride = 'permitir' | 'bloquear';
type AccessRole = { id: AccessRoleId; name: string; description: string; permissions: string[] };
type AccessUser = { id: string; name: string; email: string; roleId: AccessRoleId; sector: string; active: boolean; overrides: Record<string, AccessOverride> };
type AccessAuditEntry = { id: string; at: string; actor: string; summary: string };
type AccessBridgeState = Pick<AccessBridgeSnapshot, 'available' | 'writable' | 'message'> & { integrated: boolean; loading: boolean };
type FiscalRulesBridgeState = FiscalRulesBridgeSnapshot & { integrated: boolean; loading: boolean };
type FiscalCertificateBridgeState = { integrated: boolean; available: boolean; writable: boolean; loading: boolean; message: string; certificate: FiscalCertificateStatus | null };
type FiscalMatrixSaveInput = {
  matrix: FiscalMatrix;
  taxReviewConfirmed: boolean;
  taxReformReviewConfirmed: boolean;
};
type PermissionContextValue = { can: (permission: string) => boolean; user: AccessUser | null; role: AccessRole | null };
const PermissionContext = createContext<PermissionContextValue>({ can: () => true, user: null, role: null });
type ModuleSettings = {
  version: 8;
  company: CompanyProfile;
  commercial: { sellers: string[]; defaultSeller: string; quoteValidityDays: number; reserveStockDefault: boolean; defaultFiscalDocument: 'nenhum' | 'nfe' | 'nfce' | 'nfse'; maxDiscountPercent: number };
  payments: { enabledMethods: PaymentMethod[]; defaultMethod: PaymentMethod; defaultInstallments: number; firstDueDays: number };
  services: { technicians: string[]; defaultTechnician: string; defaultDurationMinutes: number };
  fiscal: {
    environment: 'homologacao';
    documentScope: FiscalDocumentType[];
    fiscalResponsible: string;
    taxReviewConfirmed: boolean;
    taxReformReviewConfirmed: boolean;
    providerMode: 'Não definido' | 'Provedor fiscal' | 'Integração direta';
    certificateMode: 'Não definido' | 'Certificado A1' | 'Certificado em nuvem';
    nfseAuthorityMode: 'Não definido' | 'Padrão nacional' | 'Prefeitura ou provedor municipal';
    contingencyPlan: 'Não definido' | 'Plano por documento e autorizador';
    nfeSeries: string;
    nfceSeries: string;
    nfseSeries: string;
    matrix: FiscalMatrix;
  };
  stock: {
    locations: string[]; defaultLocation: string; allowNegativeStock: boolean; protectReservations: boolean; requireMovementReference: boolean; trackLot: boolean; trackExpiry: boolean;
    entryReasons: string[]; exitReasons: string[]; inventoryReasons: string[]; defaultEntryReason: string; defaultExitReason: string; defaultInventoryReason: string;
  };
  access: { permissionSchemaVersion: 3; roles: AccessRole[]; users: AccessUser[]; auditTrail: AccessAuditEntry[] };
};

const permissionGroups = [
  { id: 'painel', label: 'Visão geral', description: 'Indicadores e alertas comerciais', permissions: [['dashboard.view', 'Visualizar painel']] },
  { id: 'vendas', label: 'Vendas', description: 'Orçamentos, pedidos e vendas', permissions: [['sales.view', 'Visualizar'], ['sales.create', 'Criar'], ['sales.edit', 'Editar'], ['sales.invoice', 'Faturar'], ['sales.approve_discount', 'Aprovar desconto'], ['sales.cancel', 'Cancelar'], ['sales.share', 'Compartilhar e imprimir']] },
  { id: 'servicos', label: 'Serviços', description: 'Orçamentos e ordens de serviço', permissions: [['services.view', 'Visualizar'], ['services.create', 'Criar'], ['services.edit', 'Editar'], ['services.complete', 'Concluir execução']] },
  { id: 'clientes', label: 'Clientes', description: 'Cadastro e histórico comercial', permissions: [['clients.view', 'Visualizar'], ['clients.create', 'Criar'], ['clients.edit', 'Editar'], ['clients.reports', 'Consultar relatórios']] },
  { id: 'catalogo', label: 'Produtos e serviços', description: 'Catálogo, preço e custo', permissions: [['catalog.view', 'Visualizar'], ['catalog.create', 'Criar'], ['catalog.edit', 'Editar'], ['catalog.view_cost', 'Visualizar custos']] },
  { id: 'estoque', label: 'Estoque', description: 'Saldos e movimentações', permissions: [['stock.view', 'Visualizar'], ['stock.entry', 'Registrar entrada'], ['stock.exit', 'Registrar saída'], ['stock.inventory', 'Realizar inventário'], ['stock.adjust', 'Autorizar ajustes']] },
  { id: 'fiscal', label: 'Fiscal', description: 'Preparação e documentos fiscais', permissions: [['fiscal.view', 'Visualizar'], ['fiscal.prepare', 'Preparar documento'], ['fiscal.documents.danfe.download', 'Baixar DANFE'], ['fiscal.documents.xml.download', 'Baixar XML autorizado'], ['fiscal.configure', 'Configurar matriz fiscal'], ['fiscal.homologate', 'Gerenciar homologação'], ['fiscal.issue', 'Emitir nota'], ['fiscal.cancel', 'Cancelar nota']] },
  { id: 'recebimentos', label: 'Recebimentos', description: 'Parcelas e movimentações financeiras', permissions: [['receivables.view', 'Visualizar'], ['receivables.receive', 'Registrar recebimento'], ['receivables.refund', 'Estornar recebimento'], ['receivables.export', 'Exportar']] },
  { id: 'relatorios', label: 'Relatórios', description: 'Indicadores e exportações', permissions: [['reports.view', 'Visualizar'], ['reports.export', 'Exportar'], ['reports.view_financial', 'Visualizar valores financeiros']] },
  { id: 'sistema', label: 'Sistema e acessos', description: 'Configurações, permissões e auditoria', permissions: [['settings.view', 'Visualizar configurações'], ['settings.edit', 'Editar configurações'], ['access.view', 'Visualizar acessos'], ['access.manage', 'Gerenciar acessos'], ['access.audit', 'Consultar auditoria']] },
] as const;
const allPermissionIds = permissionGroups.flatMap((group) => group.permissions.map(([id]) => id));
const protectedAccessPermissions = ['settings.view', 'access.view', 'access.manage', 'access.audit', 'fiscal.configure', 'fiscal.homologate'];
const viewPermission: Partial<Record<View, string>> = {
  painel: 'dashboard.view', vendas: 'sales.view', novo_pedido: 'sales.create', novo_orcamento: 'sales.create', nova_ordem_servico: 'services.create', servicos: 'services.view', clientes: 'clients.view', catalogo: 'catalog.view', estoque: 'stock.view', fiscal: 'fiscal.view', recebimentos: 'receivables.view', relatorios: 'reports.view', configuracoes: 'settings.view',
};
const newPermission: Partial<Record<NewActionType, string>> = { pedido: 'sales.create', orcamento: 'sales.create', venda: 'sales.create', ordem_servico: 'services.create', nfe: 'fiscal.prepare', nfce: 'fiscal.prepare', nfse: 'fiscal.prepare', cliente: 'clients.create', fornecedor: 'stock.entry', produto: 'catalog.create' };

const defaultAccessRoles: AccessRole[] = [
  { id: 'gestor', name: 'Gestor', description: 'Visão total da operação, aprovações, configurações e gestão de acessos.', permissions: [...COMMERCIAL_PROFILE_PERMISSIONS.gestor_master] },
  { id: 'administrador', name: 'Administrador', description: 'Administração completa do sistema, usuários, auditoria e integrações.', permissions: [...COMMERCIAL_PROFILE_PERMISSIONS.administrador] },
  { id: 'operador_completo', name: 'Operador completo', description: 'Executa toda a rotina operacional, sem administrar acessos ou ações críticas.', permissions: [...COMMERCIAL_PROFILE_PERMISSIONS.operador_completo] },
  { id: 'operador_simples', name: 'Operador simples', description: 'Acesso inicial restrito para atendimento e consulta básica.', permissions: [...COMMERCIAL_PROFILE_PERMISSIONS.operador_simples] },
];

function orderLineFromCatalog(item: CatalogItem): OrderLine {
  return {
    id: `${item.sku}-${Date.now()}`,
    catalogItemId: item.catalogItemId,
    sku: item.sku,
    name: item.name,
    kind: item.category === 'Serviço' ? 'servico' : 'produto',
    unit: item.unit,
    quantity: 1,
    unitPrice: item.price,
    unitDiscount: 0,
    available: item.available,
    cost: item.cost,
    fiscalStatus: item.fiscal,
  };
}

const STORAGE_KEY = 'avantalab:prototipo-vendas-servicos:v1';
const CLIENT_STORAGE_KEY = 'avantalab:prototipo-vendas-clientes:v2';
const CLIENT_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-clientes:v1'];
const SUPPLIER_STORAGE_KEY = 'avantalab:prototipo-vendas-fornecedores:v1';
const CATALOG_STORAGE_KEY = 'avantalab:prototipo-vendas-catalogo:v3';
const CATALOG_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-catalogo:v2', 'avantalab:prototipo-vendas-catalogo:v1'];
const STOCK_STORAGE_KEY = 'avantalab:prototipo-vendas-estoque:v1';
const RECEIVABLE_STORAGE_KEY = 'avantalab:prototipo-vendas-recebimentos:v1';
const FISCAL_DRAFT_STORAGE_KEY = 'avantalab:prototipo-vendas-fiscal:v4';
const FISCAL_DRAFT_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-fiscal:v3', 'avantalab:prototipo-vendas-fiscal:v2', 'avantalab:prototipo-vendas-fiscal:v1'];
const FISCAL_HOMOLOGATION_STORAGE_KEY = 'avantalab:prototipo-vendas-homologacao-fiscal:v1';
const FISCAL_INTEGRATION_EVALUATION_STORAGE_KEY = 'avantalab:prototipo-vendas-avaliacao-integracao-fiscal:v1';
const FISCAL_ISSUER_REGISTRY_STORAGE_KEY = 'avantalab:prototipo-vendas-estabelecimentos-fiscais:v2';
const FISCAL_ISSUER_REGISTRY_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-estabelecimentos-fiscais:v1'];
const NFE_SP_HOMOLOGATION_STORAGE_KEY = 'avantalab:prototipo-vendas-nfe-sp-homologacao:v2';
const NFE_SP_HOMOLOGATION_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-nfe-sp-homologacao:v1'];
const FISCAL_NUMBERING_STORAGE_KEY = 'avantalab:prototipo-vendas-numeracao-fiscal:v1';
const SETTINGS_STORAGE_KEY = 'avantalab:prototipo-vendas-configuracoes:v8';
const SETTINGS_LEGACY_STORAGE_KEYS = ['avantalab:prototipo-vendas-configuracoes:v7', 'avantalab:prototipo-vendas-configuracoes:v6', 'avantalab:prototipo-vendas-configuracoes:v5', 'avantalab:prototipo-vendas-configuracoes:v4', 'avantalab:prototipo-vendas-configuracoes:v3', 'avantalab:prototipo-vendas-configuracoes:v2', 'avantalab:prototipo-vendas-configuracoes:v1'];
const ACTIVE_USER_STORAGE_KEY = 'avantalab:prototipo-vendas-sessao:v1';
function companyStorageKey(key: string) {
  const companyId = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('companyId') || '';
  return companyId ? `${key}:empresa:${companyId}` : `${key}:demonstracao`;
}

function isIntegratedManagementRuntime() {
  if (typeof window === 'undefined') return false;
  const bridge = new URLSearchParams(window.location.search).get('bridge') || '';
  return ['gestao', 'gestao-local'].includes(bridge) && window.parent !== window;
}
function readCompanyStorage(key: string) { return window.localStorage.getItem(companyStorageKey(key)); }
function writeCompanyStorage(key: string, value: string) { window.localStorage.setItem(companyStorageKey(key), value); }
function removeCompanyStorage(key: string) { window.localStorage.removeItem(companyStorageKey(key)); }
const brazilStateCodes = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const;

const defaultModuleSettings: ModuleSettings = {
  version: 8,
  company: { ...activeCompany, stateRegistration: '110.042.490.114', municipalRegistration: '', taxRegime: 'Simples Nacional', cityCode: '3550308', cep: '01001-000', street: 'Praça da Sé', number: '100', complement: '', district: 'Sé', email: 'contato@empresa.com.br', phone: '(11) 4000-0000' },
  commercial: { sellers: ['Marina', 'Caio', 'Paulo'], defaultSeller: 'Marina', quoteValidityDays: 10, reserveStockDefault: true, defaultFiscalDocument: 'nfe', maxDiscountPercent: 15 },
  payments: { enabledMethods: ['pix', 'boleto', 'cartao', 'prazo'], defaultMethod: 'pix', defaultInstallments: 1, firstDueDays: 0 },
  services: { technicians: ['Rafael', 'Marina', 'Caio', 'Paulo'], defaultTechnician: 'Rafael', defaultDurationMinutes: 60 },
  fiscal: { environment: 'homologacao', documentScope: ['nfe', 'nfce', 'nfse'], fiscalResponsible: '', taxReviewConfirmed: false, taxReformReviewConfirmed: false, providerMode: 'Não definido', certificateMode: 'Não definido', nfseAuthorityMode: 'Não definido', contingencyPlan: 'Não definido', nfeSeries: '1', nfceSeries: '1', nfseSeries: '90001', matrix: createDefaultFiscalMatrix() },
  stock: {
    locations: ['Estoque principal', 'Loja física', 'Produção', 'Quarentena'], defaultLocation: 'Estoque principal', allowNegativeStock: false, protectReservations: true, requireMovementReference: true, trackLot: true, trackExpiry: true,
    entryReasons: ['Entrada por compra', 'Entrada de produção', 'Devolução de cliente', 'Ajuste positivo'], exitReasons: ['Consumo interno', 'Perda ou avaria', 'Devolução ao fornecedor', 'Ajuste negativo'], inventoryReasons: ['Contagem periódica', 'Conferência de recebimento', 'Apuração de avaria', 'Implantação de saldo'], defaultEntryReason: 'Entrada por compra', defaultExitReason: 'Consumo interno', defaultInventoryReason: 'Contagem periódica',
  },
  access: {
    permissionSchemaVersion: 3,
    roles: defaultAccessRoles,
    users: [
      { id: 'usr-marina', name: 'Marina', email: 'marina@empresa.com.br', roleId: 'gestor', sector: 'Gestão', active: true, overrides: {} },
      { id: 'usr-caio', name: 'Caio', email: 'caio@empresa.com.br', roleId: 'administrador', sector: 'Administração', active: true, overrides: {} },
      { id: 'usr-paulo', name: 'Paulo', email: 'paulo@empresa.com.br', roleId: 'operador_completo', sector: 'Comercial', active: true, overrides: {} },
      { id: 'usr-rafael', name: 'Rafael', email: 'rafael@empresa.com.br', roleId: 'operador_simples', sector: 'Serviços', active: true, overrides: {} },
    ],
    auditTrail: [{ id: 'audit-inicial', at: '2026-08-28T09:00:00-03:00', actor: 'Sistema', summary: 'Perfis padrão de acesso carregados.' }],
  },
};

function applyAccessBridgeSnapshot(settings: ModuleSettings, snapshot: AccessBridgeSnapshot): ModuleSettings {
  if (!snapshot.available) return settings;
  const roles = defaultAccessRoles.map((baseline) => {
    const received = snapshot.roles.find((role) => role.id === baseline.id);
    return { ...baseline, permissions: received ? [...received.permissions] : [...baseline.permissions] };
  });
  const activeTeam = snapshot.users.filter((user) => user.active).map((user) => user.name).filter(Boolean);
  const authenticatedName = snapshot.users.find((user) => user.id === snapshot.activeUserId && user.active)?.name || activeTeam[0] || '';
  return normalizeModuleSettings({
    ...settings,
    commercial: {
      ...settings.commercial,
      sellers: activeTeam.length ? activeTeam : settings.commercial.sellers,
      defaultSeller: authenticatedName || settings.commercial.defaultSeller,
    },
    services: {
      ...settings.services,
      technicians: activeTeam.length ? activeTeam : settings.services.technicians,
      defaultTechnician: authenticatedName || settings.services.defaultTechnician,
    },
    access: {
      permissionSchemaVersion: 3,
      roles,
      users: snapshot.users.map((user) => ({ ...user, overrides: { ...user.overrides } })),
      auditTrail: snapshot.audit.map((entry) => ({ ...entry })),
    },
  }, defaultModuleSettings) as ModuleSettings;
}

function fiscalConfigFromSettings(settings: ModuleSettings, certificate: FiscalCertificateStatus | null = null): FiscalConfig {
  return { companyDocument: settings.company.document, taxRegime: settings.company.taxRegime, cityCode: settings.company.cityCode, municipalRegistration: settings.company.municipalRegistration, stateRegistration: settings.company.stateRegistration, providerConnected: certificate?.fiscalConnectionAvailable === true, certificateValid: certificate?.certificateActive === true, environment: 'homologacao', fiscalResponsible: settings.fiscal.fiscalResponsible, nfseAuthorityMode: settings.fiscal.nfseAuthorityMode, contingencyPlan: settings.fiscal.contingencyPlan, taxReviewConfirmed: settings.fiscal.taxReviewConfirmed, taxReformReviewConfirmed: settings.fiscal.taxReformReviewConfirmed };
}

function fiscalOperationContext(origin: FiscalOrigin, client: ClientRecord | undefined, company: CompanyProfile, issuer?: FiscalIssuerSelectionSnapshot) {
  const issuerState = issuer?.uf || company.city.match(/\/([A-Z]{2})$/)?.[1] || '';
  const destination = origin.documentType === 'nfse' ? 'Não aplicável' : !client?.state || !issuerState ? 'Qualquer' : client.state === issuerState ? 'Dentro da UF' : 'Fora da UF';
  return {
    operation: origin.documentType === 'nfse' ? 'Prestação de serviço' : 'Venda',
    destination,
    recipientProfile: client?.fiscal ?? 'Qualquer',
    presence: origin.sourceLabel === 'Venda rápida' ? 'Presencial' : origin.sourceLabel === 'Ordem de serviço' ? 'Não aplicável' : 'Não presencial',
  };
}

function fiscalConfigForIssuer(settings: ModuleSettings, issuer?: FiscalIssuerSelectionSnapshot, certificate: FiscalCertificateStatus | null = null): FiscalConfig {
  const base = fiscalConfigFromSettings(settings, certificate);
  if (!issuer) return base;
  return {
    ...base,
    companyDocument: issuer.document,
    taxRegime: issuer.taxRegime,
    cityCode: issuer.cityCode,
    municipalRegistration: issuer.municipalRegistration,
    stateRegistration: issuer.stateRegistration,
  };
}

function ptBrDateToIso(value: string) {
  const [day, month, year] = value.split('/');
  return year && month && day ? `${year}-${month}-${day}` : value;
}

function displayIsoDate(value: string) {
  const [year, month, day] = String(value || '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function displayDateTime(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function localDateTimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDuration(minutes: number) {
  const safe = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safe / 60);
  const remaining = safe % 60;
  if (!hours) return `${remaining} min`;
  return remaining ? `${hours}h${String(remaining).padStart(2, '0')}` : `${hours}h`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isoAfterDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function paymentMethodLabel(value: string) {
  return ({ pix: 'PIX', boleto: 'Boleto', cartao: 'Cartão', prazo: 'A prazo' } as Record<string, string>)[value] ?? value;
}

const initialReceivables: ReceivableRecord[] = receivables.map((record) => ({
  id: record.id,
  dueDate: ptBrDateToIso(record.due),
  client: record.client,
  origin: record.origin,
  method: record.method,
  installment: record.installment,
  value: record.value,
  received: record.received,
  reversed: 0,
  refunded: 0,
  createdAt: `${ptBrDateToIso(record.due)}T09:00:00-03:00`,
  events: [{
    date: `${ptBrDateToIso(record.due)}T09:00:00-03:00`,
    type: record.received > 0 ? 'Recebimento' : 'Geração',
    amount: record.received > 0 ? record.received : record.value,
    method: record.method,
    account: record.received > 0 ? 'Conta demonstração' : 'Não aplicável',
    user: 'Demonstração',
    description: record.received > 0 ? 'Recebimento demonstrativo já conciliado.' : 'Parcela demonstrativa vinculada à operação comercial.',
  }],
}));

const viewInfo: Record<View, { title: string; subtitle: string; eyebrow: string }> = {
  painel: { title: 'Visão geral comercial', subtitle: 'Vendas, serviços, recebimentos e estoque em um único panorama.', eyebrow: 'Operação de hoje' },
  vendas: { title: 'Vendas', subtitle: 'Do orçamento ao faturamento, com estoque e fiscal rastreáveis.', eyebrow: 'Ciclo comercial' },
  novo_pedido: { title: 'Novo pedido', subtitle: 'Registre cliente, itens, condições comerciais, estoque e preparação fiscal.', eyebrow: 'Pedido comercial' },
  novo_orcamento: { title: 'Novo orçamento', subtitle: 'Monte, salve, compartilhe e exporte a proposta comercial.', eyebrow: 'Proposta comercial' },
  nova_ordem_servico: { title: 'Nova ordem de serviço', subtitle: 'Organize agenda, execução, recebimento e preparação da NFS-e.', eyebrow: 'Prestação de serviços' },
  servicos: { title: 'Serviços', subtitle: 'Agenda, ordens de serviço, execução e emissão de NFS-e.', eyebrow: 'Prestação de serviços' },
  clientes: { title: 'Clientes', subtitle: 'Cadastro comercial, fiscal, entrega, cobrança e relacionamento.', eyebrow: 'Cadastros' },
  catalogo: { title: 'Produtos e serviços', subtitle: 'Catálogo publicado por Custos e Precificação com complementos fiscais.', eyebrow: 'Catálogo comercial' },
  estoque: { title: 'Estoque', subtitle: 'Saldos, reservas, entradas, saídas, produção e inventário.', eyebrow: 'Movimentações' },
  fiscal: { title: 'Central fiscal', subtitle: 'Rascunhos, validações, autorizações, rejeições e eventos.', eyebrow: 'NF-e · NFC-e · NFS-e' },
  recebimentos: { title: 'Recebimentos', subtitle: 'Parcelas geradas por vendas e serviços, com sincronização futura com a Gestão Financeira.', eyebrow: 'Contas a receber' },
  relatorios: { title: 'Relatórios', subtitle: 'Indicadores comerciais, operacionais, fiscais e de estoque.', eyebrow: 'Análises' },
  configuracoes: { title: 'Ajustes', subtitle: 'Configure a empresa, as notas, a operação e os acessos por assunto.', eyebrow: 'Vendas e serviços' },
};

const navGroups: Array<{ label: string; items: Array<[View, string, IconName, string?]> }> = [
  { label: 'Resumo', items: [['painel', 'Visão geral', 'home']] },
  { label: 'Operação', items: [['vendas', 'Vendas', 'sale', '6'], ['servicos', 'Serviços', 'service', '4'], ['clientes', 'Clientes', 'users'], ['catalogo', 'Produtos e serviços', 'box']] },
  { label: 'Controle', items: [['estoque', 'Estoque', 'stock', '2'], ['fiscal', 'Central fiscal', 'fiscal', '2'], ['recebimentos', 'Recebimentos', 'money', '3']] },
  { label: 'Gestão', items: [['relatorios', 'Relatórios', 'chart'], ['configuracoes', 'Ajustes', 'settings']] },
];

const newOptions: Array<{ type: NewActionType; title: string; description: string; icon: IconName }> = [
  { type: 'cliente', title: 'Cliente', description: 'Cadastro comercial e fiscal.', icon: 'users' },
  { type: 'fornecedor', title: 'Fornecedor', description: 'Cadastro para compras e estoque.', icon: 'stock' },
  { type: 'produto', title: 'Produto', description: 'Cadastro mestre em Custos e Precificação.', icon: 'box' },
  { type: 'pedido', title: 'Pedido', description: 'Confirma itens, pagamento e reserva.', icon: 'sale' },
  { type: 'orcamento', title: 'Orçamento', description: 'Proposta sem movimentar estoque.', icon: 'document' },
  { type: 'venda', title: 'Venda rápida', description: 'Atendimento simples de balcão.', icon: 'money' },
  { type: 'ordem_servico', title: 'Ordem de serviço', description: 'Agenda, execução e conclusão.', icon: 'service' },
  { type: 'nfe', title: 'NF-e', description: 'Nota fiscal de produtos e mercadorias.', icon: 'fiscal' },
  { type: 'nfce', title: 'NFC-e', description: 'Nota fiscal para venda ao consumidor.', icon: 'fiscal' },
  { type: 'nfse', title: 'NFS-e', description: 'Prestação de serviços.', icon: 'fiscal' },
];
const dashboardNewOptions = newOptions.filter((option) => ['pedido', 'orcamento', 'venda', 'ordem_servico'].includes(option.type));

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/></>,
    sale: <><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5M8 17h3"/></>,
    service: <><path d="m14.7 6.3 3-3a4 4 0 0 1-5 5l-7.4 7.4a2.1 2.1 0 1 0 3 3l7.4-7.4a4 4 0 0 0 5-5l-3 3"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.2a4 4 0 0 1 0 7.6"/></>,
    box: <><path d="m3 7 9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></>,
    stock: <><path d="M4 4h16v5H4zM4 9h16v11H4z"/><path d="M9 13h6"/></>,
    fiscal: <><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></>,
    money: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M7 10h.01M17 15h.01"/><circle cx="12" cy="12.5" r="2.5"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l-2.8 2.8a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-2.8-2.8a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3.1 14H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l2.8-2.8a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3.1V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l2.8 2.8a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    warning: <><path d="M12 3 2.5 20h19z"/><path d="M12 9v4M12 17h.01"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    document: <><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    back: <><path d="m15 18-6-6 6-6"/><path d="M9 12h11"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    print: <><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    whatsapp: <><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.6a8.5 8.5 0 1 1 16.3-3.9Z"/><path d="M8.2 8.1c.5 3 2.3 4.8 5.4 5.7l1.4-1.4 2.2 1c-.3 1.5-1.2 2.3-2.7 2.4-4.3-.7-7.1-3.3-8.1-7.5.1-1.5.9-2.4 2.3-2.8l1.1 2.1Z"/></>,
    tag: <><path d="M20 13 11 22l-9-9V2h11z"/><circle cx="7" cy="7" r="1.5"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Badge({ children, tone }: { children: ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  const inferred = tone ?? (/Autoriz|Recebido|Concluído|Completo|Confirmado|Ativo|Baixado|normal/i.test(String(children)) ? 'success' : /Atras|Rejeit|Sem estoque|cancel|Bloqueado/i.test(String(children)) ? 'danger' : /Pendente|Revisar|Vence|Baixo|Rascunho|Separação|negociação/i.test(String(children)) ? 'warning' : /Pronto|Agendado|Enviado|Reservado|execução/i.test(String(children)) ? 'info' : 'neutral');
  return <span className={`badge badge-${inferred}`}>{children}</span>;
}

function Metric({ label, value, note, tone = 'brand' }: { label: string; value: string; note: string; tone?: 'brand' | 'cyan' | 'success' | 'warning' }) {
  return <article className={`metric metric-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><header className="panel-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header><div className="panel-body">{children}</div></section>;
}

function PageHeading({ view, action }: { view: View; action?: ReactNode }) {
  const info = viewInfo[view];
  return <div className="page-heading"><div><span>{info.eyebrow}</span><h1>{info.title}</h1><p>{info.subtitle}</p></div>{action}</div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state" role="status"><span><Icon name="document" size={25}/></span><h3>{title}</h3><p>{description}</p></div>;
}

function Table({ headers, children, minWidth = 960, className = '' }: { headers: string[]; children: ReactNode; minWidth?: number; className?: string }) {
  return <div className={`table-scroll ${className}`}><table style={{ minWidth }}><thead><tr>{headers.map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function SearchToolbar({ value, onChange, children, placeholder = 'Buscar por cliente, número ou situação' }: { value: string; onChange: (value: string) => void; children?: ReactNode; placeholder?: string }) {
  return <div className="toolbar"><label className="search-field"><span className="sr-only">Buscar</span><Icon name="search" size={18}/><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}/></label>{children}</div>;
}

function Dialog({ open, title, description, onClose, children, eyebrow = 'Vendas e serviços' }: { open: boolean; title: string; description: string; onClose: () => void; children: ReactNode; eyebrow?: string }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus(), 0);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])') ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><div><span>{eyebrow}</span><h2 id="dialog-title">{title}</h2><p>{description}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><Icon name="close"/></button></header>{children}</div></div>;
}

function NewRecordDialog({ type, fiscalOrigin, fiscalConfig, settings, onClose, onCreated }: { type: DocumentType | null; fiscalOrigin?: FiscalOrigin | null; fiscalConfig: FiscalConfig; settings: ModuleSettings; onClose: () => void; onCreated: (record: CreatedRecord) => void }) {
  const [client, setClient] = useState('');
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [validated, setValidated] = useState(false);
  const isFiscal = type === 'nfe' || type === 'nfce' || type === 'nfse';
  const fiscal = isFiscal ? fiscalReadiness(fiscalConfig, type) : null;
  const totals = calculateOrder([{ quantity: Number(quantity), unitPrice: commercialNumber(price) }]);

  useEffect(() => {
    const useOrigin = isFiscal && fiscalOrigin?.documentType === type;
    setClient(useOrigin ? fiscalOrigin.client : '');
    setItem(useOrigin ? fiscalOrigin.item : '');
    setQuantity('1');
    setPrice(useOrigin ? String(fiscalOrigin.total).replace('.', ',') : '');
    setError('');
    setValidated(false);
  }, [fiscalOrigin, isFiscal, type]);

  if (!type) return null;
  const submit = () => {
    if (!client.trim()) { setError('Selecione ou informe o cliente.'); return; }
    if (!item.trim()) { setError('Informe ao menos um produto ou serviço.'); return; }
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) { setError('A quantidade deve ser maior que zero.'); return; }
    if (commercialNumber(price) <= 0) { setError('Informe um valor unitário válido.'); return; }
    if (isFiscal && !validated) { setValidated(true); setError(''); return; }
    onCreated({ id: `DEMO-${Date.now().toString().slice(-6)}`, type, client: client.trim(), total: totals.total, createdAt: new Date().toISOString(), fiscalOriginId: isFiscal ? fiscalOrigin?.id : undefined });
  };

  return <Dialog open title={`Novo ${documentLabel(type)}`} description={isFiscal ? 'A nota será salva apenas como rascunho demonstrativo. Nenhum dado será transmitido.' : 'Valide o fluxo e a organização das informações sem gravar no sistema oficial.'} onClose={onClose}>
    <div className="dialog-body">
      {isFiscal && <div className="safety-banner"><Icon name="warning"/><div><strong>Emissão real bloqueada</strong><p>A configuração fiscal ainda não foi concluída. Nenhuma nota será emitida neste protótipo.</p></div></div>}
      {isFiscal && fiscalOrigin && <div className="client-snapshot fiscal-origin-context"><div><span>Origem</span><strong>{fiscalOrigin.id}</strong></div><div><span>Operação</span><strong>{fiscalOrigin.sourceLabel}</strong></div><div><span>Valor de origem</span><strong>{money(fiscalOrigin.total)}</strong></div><Badge tone="info">Dados pré-preenchidos</Badge></div>}
      <div className="form-grid">
        <label className="field field-wide"><span>Cliente</span><input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Ex.: Clínica Essenza Ltda." aria-describedby={error ? 'new-record-error' : undefined}/></label>
        <label className="field field-wide"><span>{type === 'ordem_servico' || type === 'nfse' ? 'Serviço' : 'Produto ou serviço'}</span><input value={item} onChange={(event) => setItem(event.target.value)} placeholder="Digite para localizar no catálogo"/></label>
        <label className="field"><span>Quantidade</span><input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)}/></label>
        <label className="field"><span>Valor unitário</span><MoneyInput value={price} onChange={setPrice} ariaLabel="Valor unitário" placeholder="0,00"/></label>
        <label className="field"><span>Condição de pagamento</span><select defaultValue={settings.payments.defaultMethod}>{settings.payments.enabledMethods.map((method) => <option value={method} key={method}>{paymentMethodLabel(method)}</option>)}</select></label>
        <label className="field"><span>{isFiscal ? 'Natureza da operação' : 'Responsável'}</span><select key={type} defaultValue={isFiscal ? (type === 'nfse' ? 'servico' : 'venda') : ''}><option value="" disabled>Selecione</option>{isFiscal ? <><option value="venda">Venda de mercadoria</option><option value="servico">Prestação de serviço</option></> : <><option value="marina">Marina</option><option value="caio">Caio</option></>}</select></label>
      </div>
      <div className="form-summary"><span>Total demonstrativo</span><strong>{money(totals.total)}</strong></div>
      {validated && fiscal && <div className="validation-result" role="status"><div className="validation-title"><Icon name={fiscal.ready ? 'check' : 'warning'}/><strong>{fiscal.ready ? 'Pré-requisitos atendidos' : `${fiscal.errors.length} bloqueios encontrados`}</strong></div>{fiscal.errors.map((message) => <p key={message}>• {message}</p>)}{fiscal.warnings.map((message) => <p key={message}>• {message}</p>)}</div>}
      {error && <p className="form-error" id="new-record-error" role="alert">{error}</p>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="button" className="button primary" onClick={submit}>{isFiscal ? (validated ? 'Salvar rascunho' : 'Validar pré-requisitos') : 'Criar demonstração'}</button></footer>
  </Dialog>;
}

function CatalogSearch({ id, items, onAdd, kind = 'todos' }: { id: string; items: CatalogItem[]; onAdd: (item: CatalogItem) => void; kind?: 'todos' | 'servico' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const optionsId = `${id}-options`;
  const availableItems = useMemo(() => items.filter((item) => item.saleStatus === 'Ativo' && (kind === 'todos' || item.category === 'Serviço')), [items, kind]);
  const results = useMemo(() => {
    const normalized = normalizeSearch(query);
    if (!normalized) return availableItems;
    return availableItems.filter((item) => normalizeSearch(`${item.sku} ${item.name} ${item.category}`).includes(normalized));
  }, [availableItems, query]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const select = (item: CatalogItem) => {
    setSelectedSku(item.sku);
    setQuery(`${item.sku} · ${item.name}`);
    setOpen(false);
  };
  const add = () => {
    const selected = availableItems.find((item) => item.sku === selectedSku);
    if (!selected) return;
    onAdd(selected);
    setQuery('');
    setSelectedSku('');
    setOpen(false);
  };

  return <div className="catalog-picker" ref={rootRef}>
    <label className="catalog-picker-field" htmlFor={id}>
      <span>{kind === 'servico' ? 'Serviço' : 'Produto ou serviço'}</span>
      <div className="catalog-search-control">
        <Icon name="search" size={18}/>
        <input
          id={id}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={optionsId}
          value={query}
          placeholder={kind === 'servico' ? 'Busque por código ou nome do serviço' : 'Busque por código, nome ou categoria'}
          onFocus={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setSelectedSku(''); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'Enter' && results[0]) { event.preventDefault(); select(results[0]); }
          }}
        />
        <button type="button" className="catalog-list-toggle" aria-label={open ? 'Fechar lista do catálogo' : 'Exibir lista completa do catálogo'} aria-expanded={open} onClick={() => { setQuery(''); setSelectedSku(''); setOpen((value) => !value); }}><Icon name="menu" size={18}/></button>
      </div>
    </label>
    <button type="button" className="button secondary catalog-add-button" onClick={add} disabled={!selectedSku}><Icon name="plus" size={17}/> Adicionar item</button>
    {open && <div className="catalog-options" id={optionsId} role="listbox" aria-label="Itens disponíveis">
      <div className="catalog-options-head"><strong>{query ? 'Resultados da busca' : 'Lista completa'}</strong><span>{results.length} {results.length === 1 ? 'item' : 'itens'}</span></div>
      {results.map((item) => <button type="button" role="option" aria-selected={selectedSku === item.sku} key={item.sku} onClick={() => select(item)}>
        <span><strong>{item.name}</strong><small>{item.sku} · {item.category} · {item.unit}</small></span>
        <span><strong>{money(item.price)}</strong><small>{item.category === 'Serviço' ? 'Sem estoque físico' : `${item.available} ${item.unit} disponíveis`}</small></span>
      </button>)}
      {results.length === 0 && <p className="catalog-empty">Nenhum item encontrado. Tente outro nome, código ou categoria.</p>}
    </div>}
  </div>;
}

function formatLineNumber(value: number, moneyValue: boolean) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: moneyValue ? 2 : 0,
    maximumFractionDigits: moneyValue ? 2 : 3,
  }).format(Number.isFinite(value) ? value : 0);
}

function fittedNumericFontSize(text: string, usableWidth: number, maximumSize: number, minimumSize = 8) {
  const estimatedSize = usableWidth / (Math.max(1, Array.from(text).length) * 0.62);
  return Math.round(Math.max(minimumSize, Math.min(maximumSize, estimatedSize)) * 10) / 10;
}

function commercialNumber(value: string) {
  return Math.max(0, parseCommercialNumber(value) ?? 0);
}

function MoneyInput({ value, onChange, ariaLabel, placeholder }: { value: string; onChange: (value: string) => void; ariaLabel: string; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const parsed = parseCommercialNumber(value);
  const displayValue = editing || value === '' || parsed === null ? value : formatLineNumber(parsed, true);
  const inputFontSize = fittedNumericFontSize(displayValue || placeholder || '0,00', 150, 14, 10);
  return <div className="input-prefix money-input">
    <i aria-hidden="true">R$</i>
    <input
      aria-label={ariaLabel}
      inputMode="decimal"
      value={displayValue}
      placeholder={placeholder}
      style={{ fontSize: `${inputFontSize}px` }}
      onFocus={(event) => { setEditing(true); event.currentTarget.select(); }}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        setEditing(false);
        if (value.trim() === '') return;
        onChange(formatLineNumber(commercialNumber(value), true));
      }}
    />
  </div>;
}

function LineNumberEditor({ label, value, onChange, step = 1, moneyValue = false, unit, showSteppers = false, disabled = false }: { label: string; value: number; onChange: (value: number) => void; step?: number; moneyValue?: boolean; unit?: string; showSteppers?: boolean; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => formatLineNumber(value, moneyValue));
  useEffect(() => { if (!editing) setDraft(formatLineNumber(value, moneyValue)); }, [editing, moneyValue, value]);
  const changeBy = (direction: 1 | -1) => {
    const next = Math.max(0, Math.round((value + step * direction) * 1000) / 1000);
    onChange(next);
    setDraft(formatLineNumber(next, moneyValue));
  };
  const usableInputWidth = moneyValue ? 98 : showSteppers ? 58 : 112;
  const inputFontSize = fittedNumericFontSize(draft, usableInputWidth, 13);
  return <div className="line-editor-wrap">
    <span className="line-editor-caption">{label.split(' de ')[0]}</span>
    <div className={`line-number-editor ${moneyValue ? 'money-editor' : ''} ${showSteppers ? 'with-steppers' : ''}`}>
      {moneyValue && <span aria-hidden="true">R$</span>}
      <input
        aria-label={label}
        inputMode="decimal"
        value={draft}
        disabled={disabled}
        style={{ fontSize: `${inputFontSize}px` }}
        onFocus={(event) => { if (!disabled) { setEditing(true); event.currentTarget.select(); } }}
        onChange={(event) => { const nextDraft = event.target.value; setDraft(nextDraft); const parsed = parseCommercialNumber(nextDraft); if (parsed !== null) onChange(Math.max(0, parsed)); }}
        onBlur={() => { setEditing(false); setDraft(formatLineNumber(value, moneyValue)); }}
      />
      {showSteppers && <div className="line-step-buttons">
        <button type="button" onClick={() => changeBy(1)} aria-label={`Aumentar ${label.toLocaleLowerCase('pt-BR')}`} disabled={disabled}><Icon name="chevron" size={18}/></button>
        <button type="button" onClick={() => changeBy(-1)} aria-label={`Diminuir ${label.toLocaleLowerCase('pt-BR')}`} disabled={disabled || value <= 0}><Icon name="chevron" size={18}/></button>
      </div>}
    </div>
    <small aria-hidden={!unit}>{unit || '\u00a0'}</small>
  </div>;
}

function NewOrderView({ clientRecords, catalogRecords, settings, issuerRegistry, connected, initialClient = '', initialSku = '', onCancel, onCreated }: { clientRecords: ClientRecord[]; catalogRecords: CatalogItem[]; settings: ModuleSettings; issuerRegistry: FiscalIssuerRegistry; connected: boolean; initialClient?: string; initialSku?: string; onCancel: () => void; onCreated: (record: CreatedRecord) => void }) {
  const { can } = useContext(PermissionContext);
  const clientRef = useRef<HTMLSelectElement>(null);
  const [clientName, setClientName] = useState(initialClient);
  const [seller, setSeller] = useState(settings.commercial.defaultSeller);
  const [channel, setChannel] = useState('Atendimento direto');
  const [orderDate, setOrderDate] = useState(() => todayIso());
  const [deliveryDate, setDeliveryDate] = useState(() => isoAfterDays(3));
  const [lines, setLines] = useState<OrderLine[]>(() => {
    const initialItem = catalogRecords.find((item) => item.sku === initialSku);
    return initialItem ? [orderLineFromCatalog(initialItem)] : [];
  });
  const [paymentMethod, setPaymentMethod] = useState(settings.payments.defaultMethod);
  const [installments, setInstallments] = useState(String(settings.payments.defaultInstallments));
  const [firstDueDate, setFirstDueDate] = useState(() => isoAfterDays(settings.payments.firstDueDays));
  const [freight, setFreight] = useState('0');
  const [globalDiscount, setGlobalDiscount] = useState('0');
  const [fulfillment, setFulfillment] = useState('Entrega');
  const [reserveStock, setReserveStock] = useState(settings.commercial.reserveStockDefault);
  const enabledFiscalDocuments = settings.fiscal.documentScope;
  const initialFiscalDocument = settings.commercial.defaultFiscalDocument !== 'nenhum' && enabledFiscalDocuments.includes(settings.commercial.defaultFiscalDocument) ? settings.commercial.defaultFiscalDocument : 'nenhum';
  const [fiscalDocument, setFiscalDocument] = useState<'nenhum' | 'nfe' | 'nfce' | 'nfse'>(initialFiscalDocument);
  const [fiscalIssuerId, setFiscalIssuerId] = useState(issuerRegistry.defaultEstablishmentId);
  const [operationNature, setOperationNature] = useState('Venda de mercadoria');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const selectedClient = clientRecords.find((client) => client.name === clientName);
  const totals = calculateOrder(lines.map((line) => ({ quantity: line.quantity, unitPrice: Math.max(0, line.unitPrice - line.unitDiscount) })), commercialNumber(globalDiscount), commercialNumber(freight));
  const productsTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const lineDiscountTotal = lines.reduce((sum, line) => sum + line.quantity * Math.min(line.unitPrice, Math.max(0, line.unitDiscount)), 0);
  const commercialTotals: CommercialTotals = { products: productsTotal, lineDiscount: lineDiscountTotal, orderDiscount: totals.discount, discount: lineDiscountTotal + totals.discount, freight: totals.freight, insurance: 0, other: 0, invoice: totals.total };
  const totalCost = lines.reduce((sum, line) => sum + line.quantity * line.cost, 0);
  const physicalProductCount = lines.filter((line) => line.kind === 'produto').length;
  const estimatedMargin = totals.total > 0 ? ((totals.total - totalCost) / totals.total) * 100 : 0;
  const validation = validateOrder({
    client: clientName,
    paymentMethod,
    orderDate,
    deliveryDate,
    installments: Number(installments),
    firstDueDate,
    reserveStock,
    fiscalDocument,
    items: lines.map((line) => ({ name: line.name, kind: line.kind, quantity: line.quantity, unitPrice: line.unitPrice, available: line.available, fiscalStatus: line.fiscalStatus })),
  });
  const issuerEvaluation = validateFiscalIssuerRegistry(issuerRegistry, settings.company);
  const availableIssuers = fiscalDocument === 'nenhum' ? [] : issuerEvaluation.establishments.filter((issuer) => issuer.active && issuer.documents[fiscalDocument].enabled);
  const issuerSelection = fiscalDocument === 'nenhum' ? undefined : resolveFiscalIssuerSelection(issuerRegistry, fiscalDocument, fiscalIssuerId, settings.company);
  const issuerError = fiscalDocument !== 'nenhum' && !issuerSelection?.valid ? `Revise os dados fiscais da empresa ativa para usar ${documentLabel(fiscalDocument)}.` : '';
  const issuerRouteNotice = issuerSelection?.warnings[0] || '';
  const orderReady = validation.ready && !issuerError;

  useEffect(() => setClientName(initialClient), [initialClient]);
  useEffect(() => {
    if (fiscalDocument === 'nenhum') return;
    const selectedIsAvailable = availableIssuers.some((issuer) => issuer.id === fiscalIssuerId);
    if (!selectedIsAvailable) setFiscalIssuerId(availableIssuers.find((issuer) => issuer.id === issuerRegistry.defaultEstablishmentId)?.id ?? availableIssuers[0]?.id ?? '');
  }, [availableIssuers, fiscalDocument, fiscalIssuerId, issuerRegistry.defaultEstablishmentId]);

  const addItem = (item: CatalogItem) => {
    setLines((current) => {
      const existing = current.find((line) => line.sku === item.sku);
      if (existing) return current.map((line) => line.sku === item.sku ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, orderLineFromCatalog(item)];
    });
    setSubmitted(false);
  };
  const updateLine = (id: string, patch: Partial<OrderLine>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  const removeLine = (id: string) => setLines((current) => current.filter((line) => line.id !== id));
  const finish = (status: 'Rascunho' | 'Confirmado') => {
    if (status === 'Confirmado' && !orderReady) {
      setSubmitted(true);
      window.setTimeout(() => (!clientName ? clientRef.current : document.getElementById('order-catalog-search'))?.focus(), 0);
      return;
    }
    onCreated({
      id: `PED-${Date.now().toString().slice(-6)}`,
      type: 'pedido',
      client: clientName || 'Cliente não definido',
      total: totals.total,
      createdAt: new Date().toISOString(),
      status,
      order: {
        lines: lines.map((line) => ({ catalogItemId: line.catalogItemId, sku: line.sku, name: line.name, kind: line.kind, unit: line.unit, quantity: line.quantity, unitPrice: line.unitPrice, unitDiscount: Math.min(line.unitPrice, Math.max(0, line.unitDiscount)), cost: line.cost })),
        commercialTotals,
        reserveStock,
        stockState: status === 'Confirmado' && reserveStock && lines.some((line) => line.kind === 'produto') ? 'Reservado' : 'Sem movimentação',
        seller,
        fiscalDocument,
        fiscalIssuer: fiscalDocument !== 'nenhum' ? issuerSelection?.snapshot : undefined,
        paymentMethod,
        installments: Number(installments),
        firstDueDate,
      },
      events: [{ date: new Date().toISOString(), label: status === 'Confirmado' ? 'Pedido confirmado' : 'Rascunho salvo', description: status === 'Confirmado' && reserveStock ? connected ? 'Reserva enviada ao estoque do perfil empresarial.' : 'Saldo dos produtos reservado localmente.' : 'Nenhum efeito de estoque executado.' }],
    });
  };

  return <>
    <div className="order-page-heading">
      <div><span>Pedido comercial</span><h1>Novo pedido</h1><p>O pedido concentra condições comerciais, reserva de estoque, recebimento e preparação fiscal.</p></div>
      <Badge tone={connected ? 'info' : 'warning'}>{connected ? 'Perfil empresarial' : 'Rascunho local'}</Badge>
    </div>
    <div className="order-safety"><Icon name={connected ? 'check' : 'warning'} size={18}/><p><strong>{connected ? 'Operação vinculada ao perfil.' : 'Ambiente de demonstração.'}</strong> {connected ? 'Ao confirmar, o pedido e a reserva de estoque serão gravados para a empresa ativa. A nota fiscal continuará condicionada às validações da Central Fiscal.' : 'Confirmar pode reservar o estoque local deste protótipo; nenhuma cobrança ou nota fiscal será transmitida.'}</p></div>
    <div className="order-layout">
      <div className="order-main">
        <section className="order-card" aria-labelledby="order-identification-title">
          <header><div><h2 id="order-identification-title">Identificação</h2><p>Cliente, responsável e datas da operação.</p></div><Badge>Pedido novo</Badge></header>
          <div className="order-card-body">
            <div className="order-form-grid">
              <label className="field field-wide"><span>Cliente *</span><select ref={clientRef} value={clientName} onChange={(event) => { setClientName(event.target.value); setSubmitted(false); }} aria-invalid={submitted && !clientName}><option value="">Selecione um cliente</option>{clientRecords.map((client) => <option key={client.id} value={client.name}>{client.name} · {client.document}</option>)}</select>{submitted && !clientName && <small className="field-message error">Selecione o cliente para confirmar o pedido.</small>}</label>
              {selectedClient && <div className="client-snapshot field-wide"><div><span>Documento</span><strong>{selectedClient.document}</strong></div><div><span>Município</span><strong>{selectedClient.city}</strong></div><div><span>Perfil fiscal</span><strong>{selectedClient.fiscal}</strong></div><Badge tone={selectedClient.status === 'Ativo' ? 'success' : 'warning'}>{selectedClient.status}</Badge></div>}
              <label className="field"><span>Vendedor</span><select value={seller} onChange={(event) => setSeller(event.target.value)}>{settings.commercial.sellers.map((name) => <option key={name}>{name}</option>)}</select></label>
              <label className="field"><span>Canal</span><select value={channel} onChange={(event) => setChannel(event.target.value)}><option>Atendimento direto</option><option>WhatsApp</option><option>Loja física</option><option>Indicação</option></select></label>
              <label className="field"><span>Data do pedido</span><input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)}/></label>
              <label className="field"><span>Previsão de entrega</span><input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)}/></label>
            </div>
          </div>
        </section>

        <section className="order-card" aria-labelledby="order-items-title">
          <header><div><h2 id="order-items-title">Itens do pedido</h2><p>Preços e custos são retratos do catálogo no momento da inclusão.</p></div><Badge tone="info">{lines.length} {lines.length === 1 ? 'item' : 'itens'}</Badge></header>
          <div className="order-card-body">
            <CatalogSearch id="order-catalog-search" items={catalogRecords} onAdd={addItem}/>
            {lines.length === 0 ? <EmptyState title="Nenhum item adicionado" description="Selecione um produto ou serviço do catálogo para começar o pedido."/> : <div className="order-items">
              {lines.map((line) => {
                const lineTotal = line.quantity * Math.max(0, line.unitPrice - line.unitDiscount);
                const insufficient = line.kind === 'produto' && line.quantity > line.available;
                return <div className="order-item" key={line.id}>
                  <div className="order-item-name"><strong>{line.name}</strong><small>{line.sku} · {line.kind === 'produto' ? `Disponível: ${line.available} ${line.unit}` : 'Serviço sem controle físico'}</small><Badge tone={insufficient ? 'danger' : line.fiscalStatus === 'Completo' ? 'success' : 'warning'}>{insufficient ? 'Saldo insuficiente' : line.fiscalStatus}</Badge></div>
                  <div className="order-item-controls">
                    <LineNumberEditor label={`Quantidade de ${line.name}`} value={line.quantity} onChange={(value) => updateLine(line.id, { quantity: value })} step={line.kind === 'servico' ? 0.5 : 1} unit={line.unit} showSteppers/>
                    <LineNumberEditor label={`Preço de ${line.name}`} value={line.unitPrice} onChange={(value) => updateLine(line.id, { unitPrice: value })} moneyValue/>
                    <LineNumberEditor label={`Desconto de ${line.name}`} value={line.unitDiscount} onChange={(value) => updateLine(line.id, { unitDiscount: value })} moneyValue/>
                  </div>
                  <div className="order-item-result"><span>Subtotal</span><strong style={{ fontSize: `${fittedNumericFontSize(money(lineTotal), 174, 15, 7)}px` }}>{money(lineTotal)}</strong></div>
                  <button type="button" className="icon-button" onClick={() => removeLine(line.id)} aria-label={`Remover ${line.name}`} title="Remover item"><Icon name="close" size={17}/></button>
                </div>;
              })}
            </div>}
          </div>
        </section>

        <section className="order-card" aria-labelledby="order-conditions-title">
          <header><div><h2 id="order-conditions-title">Condições comerciais</h2><p>Pagamento, descontos, entrega e observações do pedido.</p></div></header>
          <div className="order-card-body order-form-grid">
            <label className="field"><span>Forma de pagamento *</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>{settings.payments.enabledMethods.map((method) => <option value={method} key={method}>{paymentMethodLabel(method)}</option>)}</select></label>
            <label className="field"><span>Parcelas</span><select value={installments} onChange={(event) => setInstallments(event.target.value)}><option value="1">1 parcela</option><option value="2">2 parcelas</option><option value="3">3 parcelas</option><option value="6">6 parcelas</option></select></label>
            <label className="field"><span>Primeiro vencimento</span><input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)}/></label>
            <label className="field"><span>Entrega ou retirada</span><select value={fulfillment} onChange={(event) => setFulfillment(event.target.value)}><option>Entrega</option><option>Retirada</option><option>Serviço no local</option></select></label>
            <label className="field"><span>Frete</span><MoneyInput value={freight} onChange={setFreight} ariaLabel="Valor do frete"/></label>
            <label className="field"><span>Desconto geral</span><MoneyInput value={globalDiscount} onChange={setGlobalDiscount} ariaLabel="Desconto geral"/></label>
            <label className="field field-wide"><span>Observações internas</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Informações para separação, entrega ou atendimento"/></label>
          </div>
        </section>

        <section className="order-card" aria-labelledby="order-stock-fiscal-title">
          <header><div><h2 id="order-stock-fiscal-title">Estoque e preparação fiscal</h2><p>Defina a reserva e o documento fiscal previsto para a operação.</p></div></header>
          <div className="order-card-body order-form-grid">
            <label className="order-check field-wide"><input type="checkbox" checked={reserveStock} onChange={(event) => setReserveStock(event.target.checked)}/><span><strong>Reservar estoque ao confirmar</strong><small>A reserva atualizará o saldo vinculado ao pedido.</small></span></label>
            <label className="field"><span>Documento fiscal previsto</span><select value={fiscalDocument} onChange={(event) => setFiscalDocument(event.target.value as typeof fiscalDocument)}>{enabledFiscalDocuments.includes('nfe') && <option value="nfe">NF-e</option>}{enabledFiscalDocuments.includes('nfce') && <option value="nfce">NFC-e</option>}{enabledFiscalDocuments.includes('nfse') && <option value="nfse">NFS-e</option>}<option value="nenhum">Não definido</option></select></label>
            <label className="field"><span>Natureza da operação</span><select value={operationNature} onChange={(event) => setOperationNature(event.target.value)}><option>Venda de mercadoria</option><option>Venda para consumidor final</option><option>Prestação de serviço</option><option>Remessa futura</option></select></label>
            <div className="order-fiscal-note field-wide"><Icon name="fiscal" size={18}/><p><strong>Documento apenas previsto.</strong> A empresa ativa e a rota fiscal serão aplicadas automaticamente quando a nota for preparada. {issuerError || issuerRouteNotice || 'Nenhuma configuração técnica é necessária neste pedido.'}</p></div>
          </div>
        </section>
      </div>

      <aside className="order-summary" aria-label="Resumo do pedido">
        <section>
          <header><span>Resumo do pedido</span><Badge tone={orderReady ? 'success' : 'warning'}>{orderReady ? 'Pronto para confirmar' : 'Revisar pedido'}</Badge></header>
          <dl><div><dt>Itens</dt><dd>{money(totals.subtotal)}</dd></div><div><dt>Desconto</dt><dd>− {money(totals.discount)}</dd></div><div><dt>Frete</dt><dd>{money(totals.freight)}</dd></div><div className="order-total"><dt>Total</dt><dd>{money(totals.total)}</dd></div></dl>
          <div className="order-margin"><span>Margem bruta estimada</span><strong>{percent(estimatedMargin)}</strong><small>Custo publicado: {money(totalCost)}</small></div>
          <div className="order-effects"><div><Icon name="stock" size={16}/><span><strong>{reserveStock ? 'Reserva prevista' : 'Sem reserva'}</strong><small>{physicalProductCount} {physicalProductCount === 1 ? 'produto físico' : 'produtos físicos'}</small></span></div><div><Icon name="money" size={16}/><span><strong>{installments} {installments === '1' ? 'parcela' : 'parcelas'}</strong><small>{paymentMethod.toLocaleUpperCase('pt-BR')}</small></span></div><div><Icon name="fiscal" size={16}/><span><strong>{fiscalDocument === 'nenhum' ? 'Fiscal não definido' : fiscalDocument.toLocaleUpperCase('pt-BR')}</strong><small>{fiscalDocument === 'nenhum' ? operationNature : issuerError || 'Empresa ativa aplicada automaticamente'}</small></span></div></div>
        </section>
        {(submitted || validation.warnings.length > 0) && <section className="order-validation" aria-live="polite"><h3>Validação</h3>{submitted && [...validation.errors, ...(issuerError ? [issuerError] : [])].map((message) => <p className="error" key={message}><Icon name="warning" size={15}/>{message}</p>)}{validation.warnings.map((message) => <p className="warning" key={message}><Icon name="warning" size={15}/>{message}</p>)}</section>}
        <div className="order-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancelar</button><button type="button" className="button secondary" onClick={() => finish('Rascunho')}>Salvar rascunho</button><button type="button" className="button primary" disabled={!can('sales.edit') || !can('stock.exit')} title={!can('sales.edit') || !can('stock.exit') ? 'Seu acesso permite salvar o rascunho, mas não confirmar o pedido.' : undefined} onClick={() => finish('Confirmado')}><Icon name="check" size={17}/> Confirmar pedido</button></div>
      </aside>
    </div>
  </>;
}

function quotePdfBlob(quote: QuotePdfInput) {
  const bytes = buildQuotePdf({ ...quote, company: quote.company ?? activeCompany });
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/pdf' });
}

function downloadQuote(record: CreatedRecord, onNotify: (message: string) => void) {
  if (!record.quote) return;
  const url = URL.createObjectURL(quotePdfBlob(record.quote));
  const link = document.createElement('a');
  link.href = url;
  link.download = quotePdfFileName(record.quote.number);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  onNotify(`PDF do orçamento ${record.id} salvo no dispositivo.`);
}

async function shareQuote(record: CreatedRecord, onNotify: (message: string) => void) {
  if (!record.quote) return;
  const file = new File([quotePdfBlob(record.quote)], quotePdfFileName(record.quote.number), { type: 'application/pdf' });
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: `Orçamento ${record.id}`, text: `Orçamento comercial para ${record.client}.`, files: [file] });
      onNotify(`Orçamento ${record.id} compartilhado.`);
      return;
    }
    downloadQuote(record, onNotify);
    onNotify('O compartilhamento direto não está disponível neste navegador. O PDF foi salvo para você enviar.');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    downloadQuote(record, onNotify);
    onNotify('Não foi possível abrir o compartilhamento. O PDF foi salvo para envio manual.');
  }
}

function QuoteActions({ record, onNotify }: { record: CreatedRecord; onNotify: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className="button secondary quote-options-button" onClick={() => setOpen(true)}><Icon name="document" size={16}/> Compartilhar ou salvar</button><Dialog open={open} title={`Enviar ${record.id}`} description="Escolha como deseja disponibilizar o orçamento em PDF." onClose={() => setOpen(false)}><div className="dialog-body quote-file-options"><button type="button" onClick={() => { setOpen(false); void shareQuote(record, onNotify); }}><Icon name="arrow" size={19}/><span><strong>Compartilhar orçamento</strong><small>Abre as opções disponíveis no dispositivo</small></span><Icon name="chevron" size={17}/></button><button type="button" onClick={() => { setOpen(false); downloadQuote(record, onNotify); }}><Icon name="document" size={19}/><span><strong>Salvar arquivo PDF</strong><small>Baixa uma cópia pronta para envio</small></span><Icon name="chevron" size={17}/></button></div><footer className="dialog-footer"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Cancelar</button></footer></Dialog></>;
}

function servicePdfInput(record: CreatedRecord, client: ClientRecord | undefined, company: CompanyProfile): ServiceOrderPdfInput | null {
  const order = record.serviceOrder;
  if (!order) return null;
  return {
    number: record.id,
    status: record.status ?? 'Rascunho',
    company,
    client: record.client,
    clientDocument: client?.document,
    scheduled: `${displayIsoDate(order.scheduledDate)} · ${order.scheduledTime}`,
    technician: order.technician,
    location: order.location,
    services: order.lines.map((line) => ({ sku: line.sku, name: line.name, quantity: line.quantity, unit: line.unit, unitPrice: line.unitPrice })),
    actualDuration: order.actualDurationMinutes ? formatDuration(order.actualDurationMinutes) : 'Não apontado',
    startedAt: order.startedAt ? displayDateTime(order.startedAt) : undefined,
    completionNotes: order.completionNotes,
    materials: order.materials ?? [],
    checklist: order.checklist ?? [],
    attachments: order.attachments ?? [],
    acceptanceStatus: order.acceptance?.status ?? 'Pendente',
    acceptedBy: order.acceptance?.acceptedBy,
    acceptedAt: order.acceptance?.acceptedAt ? displayDateTime(order.acceptance.acceptedAt) : undefined,
    acceptanceNotes: order.acceptance?.notes,
  };
}

function servicePdfBlob(record: CreatedRecord, client: ClientRecord | undefined, company: CompanyProfile) {
  const input = servicePdfInput(record, client, company);
  if (!input) return null;
  const bytes = buildServiceOrderPdf(input);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/pdf' });
}

function downloadServiceOrder(record: CreatedRecord, client: ClientRecord | undefined, company: CompanyProfile, onNotify: (message: string) => void) {
  const blob = servicePdfBlob(record, client, company);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = serviceOrderPdfFileName(record.id);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  onNotify(`PDF operacional de ${record.id} salvo no dispositivo.`);
}

async function shareServiceOrder(record: CreatedRecord, client: ClientRecord | undefined, company: CompanyProfile, onNotify: (message: string) => void) {
  const blob = servicePdfBlob(record, client, company);
  if (!blob) return;
  const file = new File([blob], serviceOrderPdfFileName(record.id), { type: 'application/pdf' });
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: `Ordem de serviço ${record.id}`, text: `Ordem de serviço de ${record.client}.`, files: [file] });
      onNotify(`${record.id} compartilhada.`);
      return;
    }
    downloadServiceOrder(record, client, company, onNotify);
    onNotify('O compartilhamento direto não está disponível. O PDF da OS foi salvo para envio manual.');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    downloadServiceOrder(record, client, company, onNotify);
    onNotify('Não foi possível abrir o compartilhamento. O PDF da OS foi salvo para envio manual.');
  }
}

function ServicePdfDialog({ record, client, company, onNotify, onClose }: { record: CreatedRecord | null; client?: ClientRecord; company: CompanyProfile; onNotify: (message: string) => void; onClose: () => void }) {
  if (!record) return null;
  return <Dialog open title={`Documento operacional · ${record.id}`} description="O PDF usa a identificação da empresa ativa e os apontamentos preservados nesta ordem." onClose={onClose}><div className="dialog-body quote-file-options"><button type="button" onClick={() => { onClose(); void shareServiceOrder(record, client, company, onNotify); }}><Icon name="arrow" size={19}/><span><strong>Compartilhar ordem de serviço</strong><small>Abre as opções disponíveis no dispositivo</small></span><Icon name="chevron" size={17}/></button><button type="button" onClick={() => { onClose(); downloadServiceOrder(record, client, company, onNotify); }}><Icon name="document" size={19}/><span><strong>Salvar arquivo PDF</strong><small>Baixa o documento operacional com execução e aceite</small></span><Icon name="chevron" size={17}/></button></div><footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button></footer></Dialog>;
}

function ServicePdfActions({ record, client, company, onNotify, compact = false }: { record: CreatedRecord; client?: ClientRecord; company: CompanyProfile; onNotify: (message: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className={`button secondary ${compact ? 'service-pdf-compact' : ''}`} onClick={() => setOpen(true)}><Icon name="document" size={16}/> {compact ? 'PDF da OS' : 'Compartilhar ou salvar PDF'}</button><ServicePdfDialog record={open ? record : null} client={client} company={company} onNotify={onNotify} onClose={() => setOpen(false)}/></>;
}

type RecordAction = {
  label: string;
  description: string;
  icon: IconName;
  onSelect?: () => void;
  planned?: boolean;
  disabled?: boolean;
  disabledLabel?: string;
  permission?: string;
  permissions?: string[];
};

function RecordActionsDialog({ title, description, actions, triggerLabel }: { title: string; description: string; actions: RecordAction[]; triggerLabel: string }) {
  const [open, setOpen] = useState(false);
  const { can } = useContext(PermissionContext);
  return <>
    <button type="button" className="row-action" aria-label={triggerLabel} onClick={() => setOpen(true)}><Icon name="chevron" size={18}/></button>
    <Dialog open={open} title={title} description={description} onClose={() => setOpen(false)}>
      <div className="dialog-body record-action-options">
        {actions.map((action) => { const denied = Boolean((action.permission && !can(action.permission)) || action.permissions?.some((permission) => !can(permission))); const disabled = Boolean(action.planned || action.disabled || denied); return <button type="button" key={action.label} disabled={disabled} onClick={() => { setOpen(false); action.onSelect?.(); }}>
          <span className="record-action-icon"><Icon name={action.icon} size={19}/></span>
          <span><strong>{action.label}</strong><small>{action.description}</small></span>
          {disabled
            ? <Badge tone="neutral">{denied ? 'Sem acesso' : action.disabledLabel || (action.planned ? 'Planejada' : 'Indisponível')}</Badge>
            : <Icon name="chevron" size={17}/>
          }
        </button>; })}
      </div>
      <footer className="dialog-footer"><button type="button" className="button secondary" onClick={() => setOpen(false)}>Fechar</button></footer>
    </Dialog>
  </>;
}

function CommercialRecordActions({ record, fiscalPrepareLoading, onNavigate, onFiscalStart, onFiscalPrepare, onReceivables, onOpenLocal, onLifecycleRequest }: { record: CommercialOperationRecord; fiscalPrepareLoading?: boolean; onNavigate: (view: View) => void; onFiscalStart: (origin: FiscalOrigin) => void; onFiscalPrepare: (draft: FiscalDraftRecord) => void; onReceivables: (origin: string) => void; onOpenLocal: (record: CreatedRecord) => void; onLifecycleRequest: (record: CreatedRecord, action: OrderLifecycleAction) => void }) {
  const local = record.localRecord;
  const openDetails: RecordAction = local?.order
    ? { label: `Abrir ${record.type.toLocaleLowerCase('pt-BR')}`, description: 'Itens, valores, estoque e histórico do registro', icon: 'document', onSelect: () => onOpenLocal(local), permission: 'sales.view' }
    : { label: `Abrir ${record.type.toLocaleLowerCase('pt-BR')}`, description: 'Detalhes, histórico e auditoria do registro', icon: 'document', planned: true };
  const communication: RecordAction[] = [
    { label: 'Enviar por e-mail', description: 'Usará o contato do cliente e o documento da operação', icon: 'mail', planned: true },
    { label: 'Enviar pelo WhatsApp', description: 'Abrirá uma mensagem com o arquivo correspondente', icon: 'whatsapp', planned: true },
    { label: 'Alterar status', description: 'Mudará a etapa com registro no histórico', icon: 'edit', planned: true },
  ];
  let actions: RecordAction[];
  if (record.type === 'Orçamento') {
    actions = [
      openDetails,
      { label: 'Converter em pedido', description: 'Levará cliente, itens e condições para um novo pedido', icon: 'sale', planned: true },
      { label: 'Copiar orçamento', description: 'Criará uma nova proposta sem alterar a original', icon: 'copy', planned: true },
      { label: 'Imprimir ou salvar PDF', description: 'Gerará a proposta com a identidade da empresa ativa', icon: 'print', planned: true },
      ...communication,
    ];
  } else if (record.type === 'Venda rápida') {
    actions = [
      openDetails,
      { label: 'Abrir recebimento', description: 'Parcelas e comprovantes originados pela venda', icon: 'money', onSelect: () => onReceivables(record.id), permission: 'receivables.view' },
      { label: 'Abrir documento fiscal', description: 'NFC-e e eventos vinculados à venda', icon: 'fiscal', onSelect: () => onNavigate('fiscal'), permission: 'fiscal.view' },
      { label: 'Ver movimentação de estoque', description: 'Baixas e eventuais estornos desta venda', icon: 'stock', onSelect: () => onNavigate('estoque'), permission: 'stock.view' },
      { label: 'Imprimir recibo', description: 'Documento comercial para o cliente', icon: 'print', planned: true },
      ...communication,
    ];
  } else {
    const fiscalAuthorized = record.fiscal.includes('autorizada');
    const fiscalDraft = record.fiscalDraft;
    const localOperational = !local || ['Confirmado', 'Em separação', 'Faturado'].includes(local.status ?? '');
    const financialAvailable = !local || ['Faturado', 'Devolvido'].includes(local.status ?? '');
    const lifecycleActions: RecordAction[] = local?.type === 'pedido' && local.order ? [
      ...(local.status === 'Confirmado' ? [{ label: 'Iniciar separação', description: 'Mantém a reserva e registra o pedido em preparação', icon: 'stock' as IconName, onSelect: () => onLifecycleRequest(local, 'separar' as OrderLifecycleAction), permissions: ['sales.edit', 'stock.exit'] }] : []),
      ...(['Confirmado', 'Em separação'].includes(local.status ?? '') ? [{ label: 'Faturar e baixar estoque', description: 'Converte a reserva em saída física vinculada ao pedido', icon: 'check' as IconName, onSelect: () => onLifecycleRequest(local, 'faturar' as OrderLifecycleAction), permissions: ['sales.invoice', 'stock.exit', ...(local.order.fiscalDocument !== 'nenhum' ? ['fiscal.prepare'] : [])] }, { label: 'Cancelar e liberar reserva', description: 'Cancela o pedido e devolve o saldo reservado ao disponível', icon: 'close' as IconName, onSelect: () => onLifecycleRequest(local, 'cancelar' as OrderLifecycleAction), permissions: ['sales.cancel', 'stock.exit'] }] : []),
      ...(local.status === 'Rascunho' ? [{ label: 'Cancelar rascunho', description: 'Cancela o registro sem efeito sobre o estoque', icon: 'close' as IconName, onSelect: () => onLifecycleRequest(local, 'cancelar' as OrderLifecycleAction), permission: 'sales.cancel' }] : []),
      ...(local.status === 'Faturado' ? [{ label: 'Registrar devolução total', description: 'Recoloca os produtos no saldo físico e disponível', icon: 'back' as IconName, onSelect: () => onLifecycleRequest(local, 'devolver' as OrderLifecycleAction), permissions: ['sales.cancel', 'stock.exit'] }] : []),
    ] : [];
    actions = [
      openDetails,
      ...lifecycleActions,
      { label: 'Copiar pedido', description: 'Criará um novo pedido com base neste registro', icon: 'copy', planned: true },
      financialAvailable
        ? { label: 'Contas do pedido', description: 'Parcelas, recebimentos e possíveis estornos', icon: 'money', onSelect: () => onReceivables(record.id), permission: 'receivables.view' }
        : { label: 'Contas ainda não geradas', description: local?.status === 'Confirmado' || local?.status === 'Em separação' ? 'As parcelas serão criadas quando o pedido for faturado' : 'A situação atual não possui lançamento financeiro', icon: 'money', planned: true },
      { label: 'Estoque e reserva', description: 'Reserva, separação, baixa e estorno do estoque', icon: 'stock', onSelect: () => onNavigate('estoque'), permission: 'stock.view' },
      ...(fiscalDraft?.persistenceSource === 'server' && fiscalDraft.documentType === 'nfe' && !fiscalDraft.emissionId
        ? [{ label: fiscalPrepareLoading ? 'Abrindo emissão…' : 'Abrir emissão fiscal', description: 'Cria o vínculo privado da NF-e em homologação, sem validar XML, reservar número ou transmitir', icon: 'fiscal' as IconName, onSelect: () => onFiscalPrepare(fiscalDraft), disabled: fiscalPrepareLoading, disabledLabel: 'Abrindo', permission: 'fiscal.prepare' }]
        : []),
      fiscalDraft
        ? { label: fiscalDraft.status === 'Cancelado' ? 'Abrir histórico fiscal' : 'Abrir rascunho fiscal', description: fiscalDraft.status === 'Cancelado' ? 'Consulta a conferência e o motivo do cancelamento' : 'Consulta os dados, as pendências e os eventos vinculados', icon: 'fiscal', onSelect: () => onFiscalStart({ id: record.id, client: record.client, item: `Pedido ${record.id}`, total: record.total, documentType: fiscalDraft.documentType, sourceLabel: 'Pedido' }) }
        : fiscalAuthorized
        ? { label: 'Abrir NF-e autorizada', description: 'Consulta o documento e seus eventos na Central Fiscal', icon: 'fiscal', onSelect: () => onNavigate('fiscal') }
        : local?.order?.fiscalDocument === 'nenhum'
          ? { label: 'Documento fiscal não definido', description: 'Edite a configuração fiscal do pedido antes de preparar um rascunho', icon: 'fiscal', planned: true }
        : localOperational
          ? { label: `Preparar ${documentLabel(local?.order?.fiscalDocument ?? 'nfe')}`, description: 'Cria um rascunho local vinculado ao pedido, sem transmitir ao governo', icon: 'fiscal', onSelect: () => onFiscalStart({ id: record.id, client: record.client, item: `Pedido ${record.id}`, total: record.total, documentType: local?.order?.fiscalDocument === 'nfce' || local?.order?.fiscalDocument === 'nfse' ? local.order.fiscalDocument : 'nfe', sourceLabel: 'Pedido' }), permission: 'fiscal.prepare' }
          : { label: 'Emissão fiscal indisponível', description: 'A situação atual do pedido não permite iniciar uma nova nota', icon: 'fiscal', planned: true },
      { label: 'Imprimir pedido', description: 'Versão comercial com identidade da empresa', icon: 'print', planned: true },
      { label: 'Etiquetas', description: 'Separação, expedição e identificação dos volumes', icon: 'tag', planned: true },
      ...communication,
    ];
  }
  return <RecordActionsDialog title={`Ações de ${record.id}`} description={`${record.type} de ${record.client}. As ações integradas já levam à área correspondente; as demais estão identificadas como planejadas.`} actions={actions} triggerLabel={`Ações de ${record.id}`}/>;
}

function NewServiceOrderView({ clientRecords, catalogRecords, settings, issuerRegistry, connected, initialClient = '', initialSku = '', onCancel, onCreated }: { clientRecords: ClientRecord[]; catalogRecords: CatalogItem[]; settings: ModuleSettings; issuerRegistry: FiscalIssuerRegistry; connected: boolean; initialClient?: string; initialSku?: string; onCancel: () => void; onCreated: (record: CreatedRecord) => void }) {
  const clientRef = useRef<HTMLSelectElement>(null);
  const [clientName, setClientName] = useState(initialClient);
  const [contactName, setContactName] = useState('');
  const [technician, setTechnician] = useState(settings.services.defaultTechnician);
  const [scheduledDate, setScheduledDate] = useState(() => isoAfterDays(1));
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(String(settings.services.defaultDurationMinutes));
  const [location, setLocation] = useState('No endereço do cliente');
  const [lines, setLines] = useState<OrderLine[]>(() => {
    const initialItem = catalogRecords.find((item) => item.sku === initialSku && item.category === 'Serviço');
    return initialItem ? [orderLineFromCatalog(initialItem)] : [];
  });
  const [paymentMethod, setPaymentMethod] = useState(settings.payments.defaultMethod);
  const [installments, setInstallments] = useState(String(settings.payments.defaultInstallments));
  const [firstDueDate, setFirstDueDate] = useState(() => isoAfterDays(settings.payments.firstDueDays));
  const nfseEnabled = settings.fiscal.documentScope.includes('nfse');
  const [fiscalDocument, setFiscalDocument] = useState<'nenhum' | 'nfse'>(nfseEnabled ? 'nfse' : 'nenhum');
  const [fiscalIssuerId, setFiscalIssuerId] = useState(issuerRegistry.defaultEstablishmentId);
  const [internalNotes, setInternalNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const selectedClient = clientRecords.find((client) => client.name === clientName);
  const totals = calculateOrder(lines.map((line) => ({ quantity: line.quantity, unitPrice: Math.max(0, line.unitPrice - line.unitDiscount) })));
  const validation = validateServiceOrder({
    client: clientName,
    scheduledDate,
    scheduledTime,
    technician,
    paymentMethod,
    installments: Number(installments),
    firstDueDate,
    fiscalDocument,
    items: lines.map((line) => {
      const item = catalogRecords.find((catalogItem) => catalogItem.sku === line.sku);
      return { name: line.name, kind: line.kind, quantity: line.quantity, unitPrice: line.unitPrice, municipalServiceCode: item?.municipalServiceCode ?? '', fiscalStatus: item?.fiscal ?? line.fiscalStatus };
    }),
  });
  const issuerEvaluation = validateFiscalIssuerRegistry(issuerRegistry, settings.company);
  const availableIssuers = fiscalDocument === 'nenhum' ? [] : issuerEvaluation.establishments.filter((issuer) => issuer.active && issuer.documents.nfse.enabled);
  const issuerSelection = fiscalDocument === 'nenhum' ? undefined : resolveFiscalIssuerSelection(issuerRegistry, 'nfse', fiscalIssuerId, settings.company);
  const issuerError = fiscalDocument === 'nfse' && !issuerSelection?.valid ? 'Revise os dados fiscais da empresa ativa para usar NFS-e.' : '';
  const issuerRouteNotice = issuerSelection?.warnings[0] || '';
  const serviceReady = validation.ready && !issuerError;

  useEffect(() => setClientName(initialClient), [initialClient]);
  useEffect(() => {
    if (fiscalDocument === 'nenhum') return;
    const selectedIsAvailable = availableIssuers.some((issuer) => issuer.id === fiscalIssuerId);
    if (!selectedIsAvailable) setFiscalIssuerId(availableIssuers.find((issuer) => issuer.id === issuerRegistry.defaultEstablishmentId)?.id ?? availableIssuers[0]?.id ?? '');
  }, [availableIssuers, fiscalDocument, fiscalIssuerId, issuerRegistry.defaultEstablishmentId]);
  useEffect(() => {
    if (!selectedClient) return;
    setContactName((current) => current || selectedClient.contactName);
  }, [selectedClient]);

  const addItem = (item: CatalogItem) => {
    setLines((current) => {
      const existing = current.find((line) => line.sku === item.sku);
      if (existing) return current.map((line) => line.sku === item.sku ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, orderLineFromCatalog(item)];
    });
    setSubmitted(false);
  };
  const updateLine = (id: string, patch: Partial<OrderLine>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  const removeLine = (id: string) => setLines((current) => current.filter((line) => line.id !== id));
  const finish = (status: 'Rascunho' | 'Agendado') => {
    if (status === 'Agendado' && !serviceReady) {
      setSubmitted(true);
      window.setTimeout(() => (!clientName ? clientRef.current : document.getElementById('service-catalog-search'))?.focus(), 0);
      return;
    }
    if (status === 'Rascunho' && (!clientName || lines.length === 0)) {
      setSubmitted(true);
      window.setTimeout(() => (!clientName ? clientRef.current : document.getElementById('service-catalog-search'))?.focus(), 0);
      return;
    }
    const now = new Date().toISOString();
    onCreated({
      id: `OS-${Date.now().toString().slice(-6)}`,
      type: 'ordem_servico',
      client: clientName,
      total: totals.total,
      createdAt: now,
      status,
      serviceOrder: {
        lines: lines.map((line) => {
          const item = catalogRecords.find((catalogItem) => catalogItem.sku === line.sku);
          return { sku: line.sku, name: line.name, kind: 'servico' as const, unit: line.unit, quantity: line.quantity, unitPrice: line.unitPrice, cost: line.cost, municipalServiceCode: item?.municipalServiceCode ?? '', fiscalStatus: item?.fiscal ?? line.fiscalStatus };
        }),
        scheduledDate,
        scheduledTime,
        durationMinutes: Math.max(1, Number(durationMinutes) || 60),
        technician,
        location,
        contactName,
        paymentMethod,
        installments: Math.max(1, Number(installments) || 1),
        firstDueDate,
        fiscalDocument,
        fiscalIssuer: fiscalDocument === 'nfse' ? issuerSelection?.snapshot : undefined,
        internalNotes,
        customerNotes,
        completionNotes: '',
      },
      events: [{ date: now, label: status === 'Agendado' ? 'Ordem agendada' : 'Rascunho salvo', description: status === 'Agendado' ? `Atendimento marcado para ${displayIsoDate(scheduledDate)} às ${scheduledTime}, com ${technician}.` : 'Ordem salva sem gerar recebimento ou documento fiscal.' }],
    });
  };

  return <>
    <div className="order-page-heading"><div><span>Ordem de serviço</span><h1>Nova ordem de serviço</h1><p>Organize o atendimento da agenda à conclusão, mantendo cobrança e NFS-e vinculadas à mesma origem.</p></div><Badge tone={connected ? 'info' : 'warning'}>{connected ? 'Perfil empresarial' : 'Rascunho local'}</Badge></div>
    <div className="order-safety"><Icon name={connected ? 'check' : 'warning'} size={18}/><p><strong>{connected ? 'Operação vinculada ao perfil.' : 'Fluxo seguro de demonstração.'}</strong> {connected ? 'Agendar grava a ordem para a empresa ativa. Recebimentos e o rascunho de NFS-e surgem somente após a conclusão.' : 'Agendar salva a ordem neste navegador. Recebimentos e rascunho de NFS-e surgem somente após a conclusão.'}</p></div>
    <div className="order-layout service-order-layout">
      <div className="order-main">
        <section className="order-card"><header><div><h2>Cliente e responsável</h2><p>Dados usados no atendimento, cobrança e preparação fiscal.</p></div><Badge>Nova OS</Badge></header><div className="order-card-body"><div className="order-form-grid">
          <label className="field field-wide"><span>Cliente *</span><select ref={clientRef} value={clientName} onChange={(event) => { setClientName(event.target.value); setContactName(clientRecords.find((client) => client.name === event.target.value)?.contactName ?? ''); setSubmitted(false); }} aria-invalid={submitted && !clientName}><option value="">Selecione um cliente</option>{clientRecords.map((client) => <option key={client.id} value={client.name}>{client.name} · {client.document}</option>)}</select>{submitted && !clientName && <small className="field-message error">Selecione o cliente da ordem.</small>}</label>
          {selectedClient && <div className="client-snapshot field-wide"><div><span>Documento</span><strong>{selectedClient.document}</strong></div><div><span>Município</span><strong>{selectedClient.city}</strong></div><div><span>Perfil fiscal</span><strong>{selectedClient.fiscal}</strong></div><Badge tone={selectedClient.status === 'Ativo' ? 'success' : 'warning'}>{selectedClient.status}</Badge></div>}
          <label className="field"><span>Contato no cliente</span><input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Responsável pelo aceite"/></label>
          <label className="field"><span>Responsável técnico *</span><select value={technician} onChange={(event) => setTechnician(event.target.value)}>{settings.services.technicians.map((name) => <option key={name}>{name}</option>)}</select></label>
        </div></div></section>
        <section className="order-card"><header><div><h2>Agenda do atendimento</h2><p>Quando, onde e por quanto tempo a equipe estará alocada.</p></div></header><div className="order-card-body order-form-grid">
          <label className="field"><span>Data *</span><input type="date" value={scheduledDate} onChange={(event) => { setScheduledDate(event.target.value); setFirstDueDate(event.target.value); }}/></label>
          <label className="field"><span>Horário *</span><input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)}/></label>
          <label className="field"><span>Duração prevista</span><select value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)}><option value="30">30 minutos</option><option value="60">1 hora</option><option value="90">1h30</option><option value="120">2 horas</option><option value="240">4 horas</option><option value="480">8 horas</option></select></label>
          <label className="field"><span>Local</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option>No endereço do cliente</option><option>Na empresa</option><option>Atendimento remoto</option><option>Local a combinar</option></select></label>
        </div></section>
        <section className="order-card"><header><div><h2>Serviços da ordem</h2><p>Somente serviços publicados por Custos e Precificação podem ser incluídos.</p></div><Badge tone="info">{lines.length} {lines.length === 1 ? 'serviço' : 'serviços'}</Badge></header><div className="order-card-body">
          <CatalogSearch id="service-catalog-search" items={catalogRecords} onAdd={addItem} kind="servico"/>
          {lines.length === 0 ? <EmptyState title="Nenhum serviço adicionado" description="Busque um serviço pelo código ou nome e adicione-o à ordem."/> : <div className="order-items">{lines.map((line) => {
            const lineTotal = line.quantity * Math.max(0, line.unitPrice - line.unitDiscount);
            return <div className="order-item" key={line.id}><div className="order-item-name"><strong>{line.name}</strong><small>{line.sku} · {line.unit} · Serviço sem estoque físico</small><Badge tone={line.fiscalStatus === 'Completo' ? 'success' : 'warning'}>{line.fiscalStatus}</Badge></div><div className="order-item-controls"><LineNumberEditor label={`Quantidade de ${line.name}`} value={line.quantity} onChange={(value) => updateLine(line.id, { quantity: value })} step={0.5} unit={line.unit} showSteppers/><LineNumberEditor label={`Preço de ${line.name}`} value={line.unitPrice} onChange={(value) => updateLine(line.id, { unitPrice: value })} moneyValue/><LineNumberEditor label={`Desconto de ${line.name}`} value={line.unitDiscount} onChange={(value) => updateLine(line.id, { unitDiscount: value })} moneyValue/></div><div className="order-item-result"><span>Subtotal</span><strong style={{ fontSize: `${fittedNumericFontSize(money(lineTotal), 174, 15, 7)}px` }}>{money(lineTotal)}</strong></div><button type="button" className="icon-button" onClick={() => removeLine(line.id)} aria-label={`Remover ${line.name}`}><Icon name="close" size={17}/></button></div>;
          })}</div>}
        </div></section>
        <section className="order-card"><header><div><h2>Condições e preparação fiscal</h2><p>Defina cobrança, documento previsto e instruções da equipe.</p></div></header><div className="order-card-body order-form-grid">
          <label className="field"><span>Forma de pagamento *</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>{settings.payments.enabledMethods.map((method) => <option value={method} key={method}>{paymentMethodLabel(method)}</option>)}</select></label>
          <label className="field"><span>Parcelas</span><select value={installments} onChange={(event) => setInstallments(event.target.value)}><option value="1">1 parcela</option><option value="2">2 parcelas</option><option value="3">3 parcelas</option><option value="6">6 parcelas</option></select></label>
          <label className="field"><span>Primeiro vencimento</span><input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)}/></label>
          <label className="field"><span>Documento fiscal previsto</span><select value={fiscalDocument} onChange={(event) => setFiscalDocument(event.target.value as typeof fiscalDocument)}>{nfseEnabled && <option value="nfse">NFS-e após conclusão</option>}<option value="nenhum">Não definido</option></select>{!nfseEnabled && <small className="field-message">A NFS-e pode ser ativada em Ajustes → Empresa e notas → Dados para emissão.</small>}</label>
          {fiscalDocument === 'nfse' && <div className="order-fiscal-note field-wide"><Icon name="fiscal" size={18}/><p><strong>Configuração automática.</strong> A empresa ativa e a rota fiscal serão aplicadas internamente quando a NFS-e for preparada. {issuerError || issuerRouteNotice || 'Nenhuma configuração técnica é necessária nesta ordem.'}</p></div>}
          <label className="field field-wide"><span>Instruções internas</span><textarea rows={3} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Materiais, acesso ao local e orientações para execução"/></label>
          <label className="field field-wide"><span>Observações para o cliente</span><textarea rows={3} value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} placeholder="Informações que poderão constar na ordem impressa"/></label>
        </div></section>
      </div>
      <aside className="order-aside"><section className="order-summary-card"><header><h2>Resumo da ordem</h2><Badge>{serviceReady ? 'Pronta para agendar' : 'Em preenchimento'}</Badge></header><div className="order-summary-values"><div><span>Serviços</span><strong>{lines.length}</strong></div><div><span>Duração</span><strong>{Number(durationMinutes) >= 60 ? `${Number(durationMinutes) / 60} h` : `${durationMinutes} min`}</strong></div><div><span>Responsável</span><strong>{technician}</strong></div><div className="grand-total"><span>Total</span><strong>{money(totals.total)}</strong></div></div><div className="order-validation"><strong>Prontidão da agenda</strong>{validation.errors.length === 0 && !issuerError ? <p className="ready"><Icon name="check" size={15}/> Dados operacionais completos</p> : [...validation.errors, ...(issuerError ? [issuerError] : [])].map((message) => <p key={message}><Icon name="warning" size={15}/>{message}</p>)}{validation.warnings.map((message) => <p key={message}><Icon name="warning" size={15}/>{message}</p>)}</div></section><div className="order-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancelar</button><button type="button" className="button secondary" onClick={() => finish('Rascunho')}>Salvar rascunho</button><button type="button" className="button primary" onClick={() => finish('Agendado')}><Icon name="calendar" size={17}/> Agendar OS</button></div></aside>
    </div>
  </>;
}

function OrderDetailsDialog({ record, onClose }: { record: CreatedRecord | null; onClose: () => void }) {
  if (!record?.order) return null;
  const productCount = record.order.lines.filter((line) => line.kind === 'produto').length;
  return <Dialog open title={record.id} description={`Pedido de ${record.client} · criado em ${new Date(record.createdAt).toLocaleString('pt-BR')}`} onClose={onClose}>
    <div className="dialog-body order-record-details">
      <div className="order-record-head"><div><span>Situação comercial</span><Badge>{record.status ?? 'Rascunho'}</Badge></div><div><span>Estoque</span><Badge tone={record.order.stockState === 'Baixado' || record.order.stockState === 'Devolvido' ? 'success' : record.order.stockState === 'Liberado' ? 'neutral' : 'info'}>{record.order.stockState}</Badge></div><div><span>Total</span><strong>{money(record.total)}</strong></div><div><span>Produtos físicos</span><strong>{productCount}</strong></div></div>
      <section><div className="client-section-heading"><h3>Condições e preparação fiscal</h3><p>Condições preservadas na criação do pedido.</p></div><dl className="receivable-definition-list"><div><dt>Vendedor</dt><dd>{record.order.seller}</dd></div><div><dt>Pagamento</dt><dd>{paymentMethodLabel(record.order.paymentMethod)} · {record.order.installments}x</dd></div><div><dt>Documento previsto</dt><dd>{record.order.fiscalDocument === 'nenhum' ? 'Não definido' : documentLabel(record.order.fiscalDocument)}</dd></div><div><dt>Empresa</dt><dd>Perfil ativo aplicado automaticamente</dd></div></dl></section>
      <section><div className="client-section-heading"><h3>Itens do pedido</h3><p>Retrato de quantidade, preço e custo usado na confirmação.</p></div><Table headers={['Produto ou serviço', 'Quantidade', 'Preço', 'Subtotal']} minWidth={0} className="order-detail-table"><>{record.order.lines.map((line) => <tr key={line.sku}><td data-label="Item"><strong>{line.name}</strong><small>{line.sku}</small></td><td data-label="Quantidade" className="numeric">{line.quantity} {line.unit}</td><td data-label="Preço" className="numeric">{money(line.unitPrice)}</td><td data-label="Subtotal" className="numeric"><strong>{money(line.quantity * line.unitPrice)}</strong></td></tr>)}</></Table></section>
      <section><div className="client-section-heading"><h3>Histórico</h3><p>Transições comerciais e seus efeitos operacionais.</p></div><div className="order-event-list">{(record.events ?? []).map((event, index) => <div key={`${event.date}-${index}`}><span><Icon name="check" size={15}/></span><div><strong>{event.label}</strong><small>{new Date(event.date).toLocaleString('pt-BR')} · {event.description}</small></div></div>)}</div></section>
    </div>
    <footer className="dialog-footer"><button type="button" className="button primary" onClick={onClose}>Fechar</button></footer>
  </Dialog>;
}

function OrderLifecycleDialog({ request, onClose, onConfirm }: { request: { record: CreatedRecord; action: OrderLifecycleAction } | null; onClose: () => void; onConfirm: (record: CreatedRecord, action: OrderLifecycleAction) => void }) {
  if (!request) return null;
  const { record, action } = request;
  const order = record.order;
  if (!order) return null;
  const info = {
    separar: { title: 'Iniciar separação', description: 'O saldo continuará reservado enquanto o pedido é preparado.', button: 'Confirmar separação' },
    faturar: { title: 'Faturar e baixar estoque', description: `${order.stockState === 'Reservado' || order.stockState === 'Em separação' ? 'A reserva será convertida em saída física.' : 'O saldo disponível será baixado diretamente.'} As parcelas serão geradas em Recebimentos${order.fiscalDocument !== 'nenhum' ? ` e um rascunho de ${documentLabel(order.fiscalDocument)} será preparado automaticamente na Central Fiscal` : ''}; nenhuma nota será transmitida.`, button: 'Confirmar faturamento' },
    cancelar: { title: 'Cancelar pedido', description: order.stockState === 'Reservado' || order.stockState === 'Em separação' ? 'A reserva será liberada e o saldo voltará ao disponível.' : 'O rascunho será cancelado sem movimentar estoque.', button: 'Cancelar pedido' },
    devolver: { title: 'Registrar devolução total', description: 'Os produtos retornarão ao saldo disponível e as parcelas e recebimentos vinculados serão estornados.', button: 'Confirmar devolução' },
  }[action];
  const productLines = order.lines.filter((line) => line.kind === 'produto');
  return <Dialog open title={`${info.title} · ${record.id}`} description={info.description} onClose={onClose}>
    <div className="dialog-body lifecycle-confirmation">
      <div className="lifecycle-summary"><div><span>Cliente</span><strong>{record.client}</strong></div><div><span>Situação atual</span><Badge>{record.status}</Badge></div><div><span>Estoque atual</span><Badge tone="info">{order.stockState}</Badge></div><div><span>Total</span><strong>{money(record.total)}</strong></div></div>
      <div className="lifecycle-effect"><Icon name={action === 'cancelar' ? 'warning' : 'stock'} size={19}/><div><strong>Efeito previsto no estoque local</strong><p>{productLines.length ? productLines.map((line) => `${line.name}: ${line.quantity} ${line.unit}`).join(' · ') : 'Este pedido não possui produto com controle físico.'}</p></div></div>
      <p className="lifecycle-safety">{record.persistence?.operationId ? 'A operação será registrada no perfil empresarial e refletida em estoque, recebimentos e Central Fiscal. A transmissão fiscal real permanece condicionada à homologação.' : 'A operação será registrada somente neste navegador e poderá ser conferida no histórico local.'}</p>
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Voltar</button><button type="button" className={`button ${action === 'cancelar' ? 'danger' : 'primary'}`} onClick={() => { onConfirm(record, action); onClose(); }}>{info.button}</button></footer>
  </Dialog>;
}

function ServiceOrderDetailsDialog({ record, client, company, onClose, onNotify, onOpenAttachment }: { record: CreatedRecord | null; client?: ClientRecord; company: CompanyProfile; onClose: () => void; onNotify: (message: string) => void; onOpenAttachment: (attachment: ServiceAttachment) => void }) {
  if (!record?.serviceOrder) return null;
  const order = record.serviceOrder;
  const executionCosts = calculateServiceExecutionCost({ serviceLines: order.lines, materials: order.materials ?? [], actualDurationMinutes: order.actualDurationMinutes ?? order.durationMinutes, total: record.total });
  const actualCost = order.actualCostTotal ?? executionCosts.actualCost;
  const actualMargin = order.actualMarginPercent ?? executionCosts.marginPercent;
  return <Dialog open title={record.id} description={`${record.client} · agenda, execução, cobrança e fiscal vinculados`} onClose={onClose}>
    <div className="dialog-body service-order-details">
      <div className="lifecycle-summary"><div><span>Situação</span><Badge>{record.status}</Badge></div><div><span>Agenda</span><strong>{displayIsoDate(order.scheduledDate)} · {order.scheduledTime}</strong></div><div><span>Responsável</span><strong>{order.technician}</strong></div><div><span>Total</span><strong>{money(record.total)}</strong></div></div>
      <section><div className="client-section-heading"><h3>Atendimento</h3><p>Dados operacionais preservados desde a criação da ordem.</p></div><dl className="receivable-definition-list"><div><dt>Cliente</dt><dd>{record.client}</dd></div><div><dt>Contato</dt><dd>{order.contactName || 'Não informado'}</dd></div><div><dt>Local</dt><dd>{order.location}</dd></div><div><dt>Duração prevista</dt><dd>{formatDuration(order.durationMinutes)}</dd></div><div><dt>Tempo realizado</dt><dd>{order.actualDurationMinutes ? formatDuration(order.actualDurationMinutes) : 'Não apontado'}</dd></div><div><dt>Pagamento</dt><dd>{paymentMethodLabel(order.paymentMethod)} · {order.installments}x</dd></div><div><dt>Documento previsto</dt><dd>{order.fiscalDocument === 'nfse' ? 'NFS-e após conclusão' : 'Não definido'}</dd></div><div><dt>Empresa</dt><dd>Perfil ativo aplicado automaticamente</dd></div><div><dt>Aceite</dt><dd><Badge tone={order.acceptance?.status === 'Aceito' ? 'success' : order.acceptance?.status === 'Recusado' ? 'danger' : 'warning'}>{order.acceptance?.status ?? 'Pendente'}</Badge></dd></div></dl></section>
      <section><div className="client-section-heading"><h3>Serviços</h3><p>Retrato comercial e fiscal usado pela ordem.</p></div><Table headers={['Serviço', 'Quantidade', 'Valor unitário', 'Subtotal', 'Fiscal']} minWidth={0} className="service-detail-table"><>{order.lines.map((line) => <tr key={line.sku}><td data-label="Serviço"><strong>{line.name}</strong><small>{line.sku}</small></td><td data-label="Quantidade">{formatLineNumber(line.quantity, false)} {line.unit}</td><td data-label="Valor unitário" className="numeric">{money(line.unitPrice)}</td><td data-label="Subtotal" className="numeric"><strong>{money(line.quantity * line.unitPrice)}</strong></td><td data-label="Fiscal"><Badge tone={line.fiscalStatus === 'Completo' ? 'success' : 'warning'}>{line.fiscalStatus}</Badge></td></tr>)}</></Table></section>
      {(order.internalNotes || order.customerNotes || order.completionNotes) && <section><div className="client-section-heading"><h3>Apontamentos</h3><p>Orientações e conclusão registradas na ordem.</p></div><dl className="service-note-list">{order.internalNotes && <div><dt>Interno</dt><dd>{order.internalNotes}</dd></div>}{order.customerNotes && <div><dt>Cliente</dt><dd>{order.customerNotes}</dd></div>}{order.completionNotes && <div><dt>Conclusão</dt><dd>{order.completionNotes}</dd></div>}</dl></section>}
      {(order.materials?.length || order.checklist?.length || order.attachments?.length) ? <section><div className="client-section-heading"><h3>Execução documentada</h3><p>Materiais, checklist e evidências vinculados ao atendimento.</p></div><div className="service-execution-details">{order.materials?.length ? <div><h4>Materiais</h4>{order.materials.map((item) => <p key={item.id}><strong>{item.name}</strong><span>{formatLineNumber(item.quantity, false)} {item.unit} · {item.source} · {item.source === 'Cliente' ? 'Sem custo' : money(item.quantity * item.cost)}</span></p>)}</div> : null}{order.checklist?.length ? <div><h4>Checklist</h4>{order.checklist.map((item) => <p key={item.id}><Icon name={item.complete ? 'check' : 'clock'} size={15}/><span>{item.label}</span></p>)}</div> : null}{order.attachments?.length ? <div><h4>Anexos registrados</h4>{order.attachments.map((item) => <p key={item.id}><Icon name={item.type.startsWith('image/') ? 'image' : 'document'} size={15}/><button type="button" className="row-link" onClick={() => onOpenAttachment(item)}>{item.name}</button></p>)}</div> : null}</div></section> : null}
      {order.actualDurationMinutes && <section><div className="client-section-heading"><h3>Custo real da execução</h3><p>Horas efetivas e materiais pelo custo preservado no momento da conclusão.</p></div><div className="service-cost-summary"><div><span>Mão de obra</span><strong>{money(order.laborCostTotal ?? executionCosts.laborCost)}</strong></div><div><span>Materiais</span><strong>{money(order.materialCostTotal ?? executionCosts.materialCost)}</strong></div><div><span>Custo total</span><strong>{money(actualCost)}</strong></div><div><span>Margem real</span><strong>{percent(actualMargin)}</strong><small>{money(record.total - actualCost)}</small></div><div><span>Estoque</span><Badge tone={order.materialStockState === 'Baixado' ? 'success' : order.materialStockState === 'Estornado' ? 'warning' : 'neutral'}>{order.materialStockState ?? 'Não aplicável'}</Badge></div></div></section>}
      {order.acceptance && <section><div className="client-section-heading"><h3>Aceite do cliente</h3><p>Registro declaratório vinculado à conclusão; não equivale a assinatura eletrônica certificada.</p></div><dl className="receivable-definition-list"><div><dt>Situação</dt><dd>{order.acceptance.status}</dd></div><div><dt>Responsável</dt><dd>{order.acceptance.acceptedBy || 'Não informado'}</dd></div><div><dt>Data e hora</dt><dd>{order.acceptance.acceptedAt ? displayDateTime(order.acceptance.acceptedAt) : 'Não registrada'}</dd></div><div><dt>Observação</dt><dd>{order.acceptance.notes || 'Sem observações'}</dd></div></dl></section>}
      <section><div className="client-section-heading"><h3>Histórico</h3><p>Eventos registrados sem apagar as etapas anteriores.</p></div><div className="receivable-event-list">{(record.events ?? []).map((event, index) => <div key={`${event.date}-${index}`}><span><Icon name="clock" size={15}/></span><div><strong>{event.label}</strong><small>{new Date(event.date).toLocaleString('pt-BR')}</small><p>{event.description}</p></div></div>)}</div></section>
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Fechar</button><ServicePdfActions record={record} client={client} company={company} onNotify={onNotify}/></footer>
  </Dialog>;
}

function ServiceLifecycleDialog({ request, onClose, onConfirm }: { request: { record: CreatedRecord; action: ServiceLifecycleAction } | null; onClose: () => void; onConfirm: (record: CreatedRecord, action: ServiceLifecycleAction, notes: string) => void }) {
  const [notes, setNotes] = useState('');
  useEffect(() => setNotes(''), [request]);
  if (!request?.record.serviceOrder) return null;
  const { record, action } = request;
  const serviceOrder = record.serviceOrder!;
  const reversesConclusion = action === 'cancelar' && record.status === 'Concluído';
  const info = {
    agendar: { title: 'Agendar ordem de serviço', description: 'A agenda será confirmada com o responsável e horário definidos.', button: 'Confirmar agenda' },
    iniciar: { title: 'Iniciar atendimento', description: 'A ordem passará para execução e registrará o horário de início.', button: 'Iniciar atendimento' },
    cancelar: reversesConclusion
      ? { title: 'Estornar conclusão da ordem', description: 'Materiais consumidos retornarão ao estoque e os efeitos financeiros e fiscais locais serão estornados, preservando todo o histórico.', button: 'Estornar conclusão' }
      : { title: 'Cancelar ordem de serviço', description: 'A agenda será cancelada, mantendo o histórico e estornando efeitos financeiros ou fiscais existentes.', button: 'Cancelar ordem' },
  }[action];
  return <Dialog open title={`${info.title} · ${record.id}`} description={info.description} onClose={onClose}><div className="dialog-body lifecycle-confirmation"><div className="lifecycle-summary"><div><span>Cliente</span><strong>{record.client}</strong></div><div><span>Situação atual</span><Badge>{record.status}</Badge></div><div><span>Agenda</span><strong>{displayIsoDate(serviceOrder.scheduledDate)} · {serviceOrder.scheduledTime}</strong></div><div><span>Total</span><strong>{money(record.total)}</strong></div></div><label className="field"><span>{action === 'cancelar' ? 'Motivo do cancelamento ou estorno' : 'Observação da etapa'}</span><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Registre informações úteis para o histórico da ordem"/></label><p className="lifecycle-safety">{record.persistence?.operationId ? 'A operação ficará vinculada ao perfil empresarial. Emissão e transmissão fiscal reais permanecem condicionadas à homologação.' : 'A operação ficará registrada somente neste navegador.'}</p></div><footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Voltar</button><button type="button" className={`button ${action === 'cancelar' ? 'danger' : 'primary'}`} onClick={() => { onConfirm(record, action, notes); onClose(); }}>{info.button}</button></footer></Dialog>;
}

function ServiceExecutionDialog({ record, catalogRecords, onClose, onSave }: { record: CreatedRecord | null; catalogRecords: CatalogItem[]; onClose: () => void; onSave: (record: CreatedRecord, execution: ServiceExecutionInput, conclude: boolean) => boolean }) {
  const order = record?.serviceOrder;
  const productOptions = catalogRecords.filter((item) => item.category !== 'Serviço' && item.saleStatus === 'Ativo');
  const nowForInput = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };
  const initialChecklist: ServiceChecklistItem[] = [
    { id: 'escopo', label: 'Escopo contratado executado', complete: false },
    { id: 'ambiente', label: 'Ambiente ou entrega validada', complete: false },
    { id: 'orientacoes', label: 'Orientações repassadas ao cliente', complete: false },
    { id: 'pendencias', label: 'Pendências e próximos passos registrados', complete: false },
  ];
  const [actualHours, setActualHours] = useState('1,00');
  const [startedAt, setStartedAt] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [materials, setMaterials] = useState<ServiceMaterial[]>([]);
  const [checklist, setChecklist] = useState<ServiceChecklistItem[]>(initialChecklist);
  const [attachments, setAttachments] = useState<ServiceAttachment[]>([]);
  const [acceptance, setAcceptance] = useState<ServiceAcceptance>({ status: 'Pendente', acceptedBy: '', acceptedAt: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!record?.serviceOrder) return;
    const current = record.serviceOrder;
    setActualHours(formatLineNumber((current.actualDurationMinutes ?? current.durationMinutes) / 60, false));
    setStartedAt(current.startedAt ? localDateTimeInput(current.startedAt) : `${current.scheduledDate}T${current.scheduledTime}`);
    setCompletedAt(current.completedAt ? localDateTimeInput(current.completedAt) : nowForInput());
    setCompletionNotes(current.completionNotes ?? '');
    setMaterials(current.materials ?? []);
    setChecklist(current.checklist?.length ? current.checklist : initialChecklist);
    setAttachments(current.attachments ?? []);
    setAcceptance(current.acceptance ?? { status: 'Pendente', acceptedBy: '', acceptedAt: '', notes: '' });
    setSubmitted(false);
  }, [record]);

  if (!record || !order) return null;
  const actualDurationMinutes = Math.round(commercialNumber(actualHours) * 60);
  const validation = validateServiceExecution({
    actualDurationMinutes,
    startedAt,
    completedAt,
    completionNotes,
    materials,
    checklist,
    acceptanceStatus: acceptance.status,
    acceptedBy: acceptance.acceptedBy,
  });
  const execution: ServiceExecutionInput = { actualDurationMinutes, startedAt, completedAt, completionNotes, materials, checklist, attachments, acceptance };
  const materialsLocked = record.status === 'Concluído' && order.materialStockState === 'Baixado';
  const executionCosts = calculateServiceExecutionCost({ serviceLines: order.lines, materials, actualDurationMinutes, total: record.total });
  const stockPreview = [...materials.filter((material) => material.source === 'Catálogo' && material.sku).reduce((grouped, material) => {
    const current = grouped.get(material.sku);
    grouped.set(material.sku, { material, quantity: (current?.quantity ?? 0) + material.quantity });
    return grouped;
  }, new Map<string, { material: ServiceMaterial; quantity: number }>()).values()].map(({ material, quantity }) => {
    const catalog = catalogRecords.find((item) => item.sku === material.sku);
    const available = catalog?.available ?? 0;
    return { sku: material.sku, name: material.name, unit: material.unit, quantity, available: materialsLocked ? available + quantity : available, after: materialsLocked ? available : available - quantity, valid: Boolean(catalog?.trackStock) && (materialsLocked || available >= quantity) };
  });
  const addMaterial = () => setMaterials((current) => [...current, { id: `MAT-${Date.now()}`, sku: '', name: '', quantity: 1, unit: 'un', source: 'Catálogo', cost: 0 }]);
  const updateMaterial = (id: string, patch: Partial<ServiceMaterial>) => setMaterials((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const selectMaterial = (id: string, sku: string) => {
    if (sku === 'externo') { updateMaterial(id, { catalogItemId: '', sku: '', name: '', unit: 'un', source: 'Externo', cost: 0 }); return; }
    const item = productOptions.find((product) => product.sku === sku);
    if (item) updateMaterial(id, { catalogItemId: item.catalogItemId, sku: item.sku, name: item.name, unit: item.unit, source: 'Catálogo', cost: item.cost });
  };
  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    const now = new Date().toISOString();
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    const next = Array.from(files).filter((file) => allowed.has(file.type) && file.size > 0 && file.size <= 10 * 1024 * 1024).slice(0, Math.max(0, 5 - attachments.length)).map((file, index) => ({ id: `ANX-${Date.now()}-${index}`, name: file.name, type: file.type, size: file.size, addedAt: now, file }));
    setAttachments((current) => [...current, ...next].slice(0, 5));
  };
  const submit = (conclude: boolean) => {
    if (conclude && !validation.ready) { setSubmitted(true); return; }
    if (onSave(record, execution, conclude)) onClose();
  };
  const canConclude = !['Concluído', 'Cancelado'].includes(record.status ?? '');

  return <Dialog open title={`Execução operacional · ${record.id}`} description="Registre o que foi realizado, materiais, evidências e aceite antes de concluir a ordem." onClose={onClose}>
    <div className="dialog-body service-execution-form">
      <div className="service-execution-summary"><div><span>Cliente</span><strong>{record.client}</strong></div><div><span>Responsável</span><strong>{order.technician}</strong></div><div><span>Previsto</span><strong>{formatDuration(order.durationMinutes)}</strong></div><div><span>Situação</span><Badge>{record.status}</Badge></div></div>
      <section className="client-form-section"><div className="client-section-heading"><h3>Apontamento do atendimento</h3><p>Tempo efetivo e relato que acompanharão o documento operacional.</p></div><div className="form-grid">
        <label className="field"><span>Início realizado</span><input type="datetime-local" value={startedAt} onChange={(event) => setStartedAt(event.target.value)}/></label>
        <label className="field"><span>Conclusão realizada</span><input type="datetime-local" value={completedAt} onChange={(event) => setCompletedAt(event.target.value)}/></label>
        <label className="field"><span>Horas realizadas *</span><div className="input-prefix suffix"><input inputMode="decimal" value={actualHours} onChange={(event) => { setActualHours(event.target.value); setSubmitted(false); }} aria-invalid={submitted && !(actualDurationMinutes > 0)}/><i>h</i></div><small className="field-message">Ex.: 1,5 para uma hora e trinta minutos.</small></label>
        <label className="field field-wide"><span>Relato da execução *</span><textarea rows={4} value={completionNotes} onChange={(event) => { setCompletionNotes(event.target.value); setSubmitted(false); }} aria-invalid={submitted && !completionNotes.trim()} placeholder="Descreva o serviço realizado, resultado, ajustes e pendências"/></label>
      </div></section>
      <section className="client-form-section"><div className="client-section-heading service-section-action"><div><h3>Materiais utilizados</h3><p>Itens do catálogo baixam o saldo disponível na conclusão; externos entram apenas no custo real e itens do cliente não geram custo ou estoque.</p></div><button type="button" className="button secondary" onClick={addMaterial} disabled={materialsLocked}><Icon name="plus" size={16}/> Adicionar material</button></div>{materialsLocked && <div className="service-stock-lock"><Icon name="stock" size={18}/><p><strong>Consumo já baixado.</strong> Os materiais ficam bloqueados para preservar o histórico. Use o estorno da conclusão antes de corrigir o consumo.</p></div>}{materials.length ? <div className="service-material-list">{materials.map((material) => <div key={material.id}>
        <label className="field"><span>Material</span><select value={material.sku || (material.source === 'Externo' || material.source === 'Cliente' ? 'externo' : '')} onChange={(event) => selectMaterial(material.id, event.target.value)} disabled={materialsLocked}><option value="">Selecione</option>{productOptions.map((item) => <option key={item.sku} value={item.sku}>{item.sku} · {item.name}</option>)}<option value="externo">Outro material</option></select></label>
        <label className="field"><span>Descrição</span><input value={material.name} onChange={(event) => updateMaterial(material.id, { name: event.target.value })} placeholder="Descrição do material" disabled={materialsLocked || Boolean(material.sku)}/></label>
        <div className="service-material-quantity"><LineNumberEditor label={`Quantidade de ${material.name || 'material'}`} value={material.quantity} onChange={(value) => updateMaterial(material.id, { quantity: value })} step={1} unit={material.unit} showSteppers disabled={materialsLocked}/></div>
        <label className="field"><span>Origem</span><select value={material.source} onChange={(event) => { const source = event.target.value as ServiceMaterial['source']; updateMaterial(material.id, { source, cost: source === 'Cliente' ? 0 : material.cost }); }} disabled={materialsLocked || Boolean(material.sku)}><option>Catálogo</option><option>Externo</option><option>Cliente</option></select></label>
        <div className="service-material-cost"><LineNumberEditor label={`Custo unitário de ${material.name || 'material'}`} value={material.cost} onChange={(value) => updateMaterial(material.id, { cost: value })} moneyValue disabled={materialsLocked || material.source !== 'Externo'}/></div>
        <button type="button" className="icon-button" onClick={() => setMaterials((current) => current.filter((item) => item.id !== material.id))} aria-label={`Remover ${material.name || 'material'}`} disabled={materialsLocked}><Icon name="close" size={17}/></button>
      </div>)}</div> : <div className="service-section-empty"><Icon name="box" size={20}/><p>Nenhum material informado. A OS pode ser concluída somente com serviços.</p></div>}{stockPreview.length > 0 && <div className="service-stock-preview"><div><strong>Impacto no estoque</strong><span>{materialsLocked ? 'Baixa já registrada' : 'Será aplicado ao concluir'}</span></div>{stockPreview.map((item) => <p key={item.sku}><span><strong>{item.name}</strong><small>{formatLineNumber(item.quantity, false)} {item.unit} de consumo</small></span><span><small>Disponível</small><strong>{formatLineNumber(item.available, false)} → {formatLineNumber(Math.max(0, item.after), false)} {item.unit}</strong></span><Badge tone={materialsLocked || item.valid ? 'success' : 'danger'}>{materialsLocked ? 'Baixado' : item.valid ? 'Disponível' : 'Saldo insuficiente'}</Badge></p>)}</div>}</section>
      <section className="client-form-section"><div className="client-section-heading"><h3>Custo real previsto</h3><p>Calculado pelas horas realizadas e pelo custo unitário dos materiais informados.</p></div><div className="service-cost-preview"><div><span>Mão de obra</span><strong>{money(executionCosts.laborCost)}</strong></div><div><span>Materiais</span><strong>{money(executionCosts.materialCost)}</strong></div><div><span>Custo total</span><strong>{money(executionCosts.actualCost)}</strong></div><div><span>Margem real</span><strong>{percent(executionCosts.marginPercent)}</strong><small>{money(executionCosts.marginValue)}</small></div></div></section>
      <section className="client-form-section"><div className="client-section-heading"><h3>Checklist operacional</h3><p>Confirme as etapas executadas; pendências serão registradas como aviso.</p></div><div className="service-checklist">{checklist.map((item) => <label key={item.id}><input type="checkbox" checked={item.complete} onChange={(event) => setChecklist((current) => current.map((entry) => entry.id === item.id ? { ...entry, complete: event.target.checked } : entry))}/><span>{item.label}</span></label>)}</div></section>
      <section className="client-form-section"><div className="client-section-heading"><h3>Evidências e anexos</h3><p>{record.persistence?.operationId ? 'JPG, PNG, WEBP ou PDF são guardados de forma privada no perfil empresarial.' : 'No modo demonstrativo, apenas nome, formato e tamanho permanecem neste navegador.'}</p></div><label className="service-upload"><input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { addAttachments(event.target.files); event.currentTarget.value = ''; }} disabled={attachments.length >= 5}/><Icon name="image" size={20}/><span><strong>Selecionar fotos ou PDF</strong><small>Até 5 arquivos de 10 MB por ordem</small></span></label>{attachments.length > 0 && <div className="service-attachment-list">{attachments.map((item) => <div key={item.id}><span><Icon name={item.type.startsWith('image/') ? 'image' : 'document'} size={16}/></span><p><strong>{item.name}</strong><small>{(item.size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB</small></p>{item.file && <button type="button" className="icon-button" onClick={() => setAttachments((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Remover anexo ${item.name}`}><Icon name="close" size={16}/></button>}</div>)}</div>}</section>
      <section className="client-form-section"><div className="client-section-heading"><h3>Aceite do cliente</h3><p>Registro declaratório local; não representa assinatura eletrônica certificada.</p></div><div className="form-grid">
        <label className="field"><span>Situação do aceite</span><select value={acceptance.status} onChange={(event) => setAcceptance((current) => ({ ...current, status: event.target.value as ServiceAcceptance['status'], acceptedAt: event.target.value === 'Aceito' && !current.acceptedAt ? nowForInput() : current.acceptedAt }))}><option>Pendente</option><option>Aceito</option><option>Recusado</option></select></label>
        <label className="field"><span>Responsável pelo aceite</span><input value={acceptance.acceptedBy} onChange={(event) => setAcceptance((current) => ({ ...current, acceptedBy: event.target.value }))} disabled={acceptance.status === 'Pendente'} placeholder="Nome do responsável"/></label>
        <label className="field"><span>Data e hora do aceite</span><input type="datetime-local" value={acceptance.acceptedAt} onChange={(event) => setAcceptance((current) => ({ ...current, acceptedAt: event.target.value }))} disabled={acceptance.status === 'Pendente'}/></label>
        <label className="field field-wide"><span>Observação do aceite</span><textarea rows={3} value={acceptance.notes} onChange={(event) => setAcceptance((current) => ({ ...current, notes: event.target.value }))} placeholder="Considerações, ressalvas ou motivo da recusa"/></label>
      </div></section>
      {(submitted || validation.warnings.length > 0) && <div className="service-execution-validation" aria-live="polite">{submitted && validation.errors.map((message) => <p className="error" key={message}><Icon name="warning" size={15}/>{message}</p>)}{validation.warnings.map((message) => <p className="warning" key={message}><Icon name="warning" size={15}/>{message}</p>)}</div>}
    </div>
    <footer className="dialog-footer service-execution-footer"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="button" className="button secondary" onClick={() => submit(false)}>Salvar apontamentos</button>{canConclude && <button type="button" className="button primary" onClick={() => submit(true)}><Icon name="check" size={17}/> Concluir serviço</button>}</footer>
  </Dialog>;
}

function ServiceRecordActions({ record, onNavigate, onFiscalStart, onDetails, onReceivables, onStock, onLifecycleRequest, onExecutionRequest, onPdf }: { record: ServiceOperationRecord; onNavigate: (view: View) => void; onFiscalStart: (origin: FiscalOrigin) => void; onDetails: () => void; onReceivables: (origin: string) => void; onStock: (origin: string) => void; onLifecycleRequest: (record: CreatedRecord, action: ServiceLifecycleAction) => void; onExecutionRequest: (record: CreatedRecord) => void; onPdf: (record: CreatedRecord) => void }) {
  const local = record.localRecord;
  const draft = record.fiscalDraft;
  const fiscalAuthorized = record.nfse === 'Autorizada';
  const fiscalLabel = draft ? 'Abrir rascunho de NFS-e' : fiscalAuthorized ? 'Abrir NFS-e autorizada' : record.nfse === 'Rascunho' ? 'Abrir rascunho de NFS-e' : record.nfse === 'Pronta para emitir' ? 'Revisar NFS-e na Central Fiscal' : 'Preparar rascunho de NFS-e';
  const actions: RecordAction[] = [
    { label: 'Abrir ordem de serviço', description: 'Dados, agenda, execução e histórico da ordem', icon: 'service', onSelect: local ? onDetails : undefined, planned: !local, permission: 'services.view' },
    ...(local?.status === 'Rascunho' ? [{ label: 'Agendar atendimento', description: 'Confirma responsável, data e horário da ordem', icon: 'calendar' as IconName, onSelect: () => onLifecycleRequest(local, 'agendar'), permission: 'services.edit' }] : []),
    ...(local?.status === 'Agendado' ? [{ label: 'Iniciar atendimento', description: 'Registra o início da execução da ordem', icon: 'arrow' as IconName, onSelect: () => onLifecycleRequest(local, 'iniciar'), permission: 'services.edit' }] : []),
    ...(local?.status === 'Em execução' ? [{ label: 'Registrar execução e concluir', description: 'Horas, materiais, evidências, aceite e conclusão', icon: 'check' as IconName, onSelect: () => onExecutionRequest(local), permission: 'services.complete' }] : []),
    ...(local?.status === 'Concluído' ? [{ label: 'Abrir apontamentos e aceite', description: 'Consulta ou complementa o documento operacional', icon: 'edit' as IconName, onSelect: () => onExecutionRequest(local), permission: 'services.edit' }] : []),
    fiscalAuthorized
      ? { label: fiscalLabel, description: 'Consulta o documento e seus eventos na Central Fiscal', icon: 'fiscal', onSelect: () => onNavigate('fiscal') }
      : local && local.status !== 'Concluído' && !draft
        ? { label: 'NFS-e após conclusão', description: 'O rascunho fiscal será preparado quando o serviço for concluído', icon: 'fiscal', planned: true }
        : { label: fiscalLabel, description: 'Abre a preparação local com ordem, tomador, serviço e valor vinculados, sem transmitir', icon: 'fiscal', onSelect: () => onFiscalStart({ id: record.id, client: record.client, item: record.service, total: record.total, documentType: 'nfse', sourceLabel: 'Ordem de serviço' }), permission: 'fiscal.prepare' },
    { label: 'Abrir recebimentos', description: 'Parcelas e recebimentos vinculados ao serviço', icon: 'money', onSelect: local ? () => onReceivables(record.id) : () => onNavigate('recebimentos'), permission: 'receivables.view' },
    ...(local?.serviceOrder?.materials?.some((material) => material.source === 'Catálogo' && material.sku) ? [{ label: 'Ver consumo no estoque', description: 'Movimentações de materiais vinculadas a esta ordem', icon: 'stock' as IconName, onSelect: () => onStock(record.id), permission: 'stock.view' }] : []),
    { label: 'Compartilhar ou salvar PDF', description: 'Documento operacional com empresa ativa, execução e aceite', icon: 'print', onSelect: local ? () => onPdf(local) : undefined, planned: !local },
    { label: 'Enviar por e-mail', description: 'Usará o contato do cliente e o documento da operação', icon: 'mail', planned: true },
    { label: 'Enviar pelo WhatsApp', description: 'Abrirá a mensagem com o documento correspondente', icon: 'whatsapp', planned: true },
    ...(local && !['Concluído', 'Cancelado'].includes(local.status ?? '') ? [{ label: 'Cancelar ordem', description: 'Cancela a agenda sem apagar o histórico', icon: 'warning' as IconName, onSelect: () => onLifecycleRequest(local, 'cancelar'), permission: 'services.edit' }] : []),
    ...(local?.status === 'Concluído' ? [{ label: 'Estornar conclusão', description: 'Devolve materiais ao estoque e estorna efeitos financeiros e fiscais locais', icon: 'warning' as IconName, onSelect: () => onLifecycleRequest(local, 'cancelar'), permission: 'services.edit' }] : []),
  ];
  return <RecordActionsDialog title={`Ações de ${record.id}`} description={`${record.service} para ${record.client}. A emissão contextual permanece controlada pela Central Fiscal.`} actions={actions} triggerLabel={`Ações de ${record.id}`}/>;
}

function CatalogItemDialog({ item, onClose, onSave }: { item: CatalogItem | null; onClose: () => void; onSave: (item: CatalogItem) => void }) {
  const [draft, setDraft] = useState<CatalogItem | null>(item ? normalizeCatalogTaxProfile(item) as CatalogItem : null);
  useEffect(() => setDraft(item ? normalizeCatalogTaxProfile(item) as CatalogItem : null), [item]);
  if (!item || !draft) return null;
  const isService = draft.category === 'Serviço';
  const margin = draft.price > 0 ? (draft.price - draft.cost) / draft.price * 100 : 0;
  const taxEvaluation = evaluateCatalogTaxProfile(draft);
  const update = <K extends keyof CatalogItem>(key: K, value: CatalogItem[K]) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const save = () => {
    const normalized = normalizeCatalogTaxProfile(draft) as CatalogItem;
    const fiscal = evaluateCatalogTaxProfile(normalized).status;
    onSave({ ...normalized, fiscal });
    onClose();
  };
  return <Dialog open title={`Complementos de ${item.name}`} description="Dados comerciais, operacionais e fiscais mantidos por Vendas sem alterar a composição de Custos e Precificação." onClose={onClose}>
    <div className="dialog-body catalog-item-form">
      <div className="catalog-origin-lock"><span><Icon name="chart" size={19}/></span><div><strong>Dados controlados por Custos e Precificação</strong><p>Código, nome, tipo, unidade, custo e preço publicado são somente leitura neste módulo.</p></div><Badge tone="info">Origem protegida</Badge></div>
      <section className="catalog-origin-summary" aria-label="Dados publicados por Custos e Precificação">
        <div><span>Código</span><strong>{draft.sku}</strong></div>
        <div><span>Tipo e unidade</span><strong>{draft.category} · {draft.unit}</strong></div>
        <div><span>Custo publicado</span><strong>{money(draft.cost)}</strong></div>
        <div><span>Preço publicado</span><strong>{money(draft.price)}</strong><small>Margem {percent(margin)}</small></div>
      </section>
      <section className="client-form-section" aria-labelledby="catalog-commercial-title">
        <div className="client-section-heading"><h3 id="catalog-commercial-title">Uso comercial</h3><p>Disponibilidade do item para pedidos, orçamentos e serviços.</p></div>
        <div className="form-grid">
          <label className="field"><span>Situação de venda</span><select value={draft.saleStatus} onChange={(event) => update('saleStatus', event.target.value as CatalogItem['saleStatus'])}><option>Ativo</option><option>Pausado</option></select></label>
          <label className="field"><span>Controle operacional</span><select value={draft.trackStock ? 'estoque' : 'sem_estoque'} disabled={isService} onChange={(event) => update('trackStock', event.target.value === 'estoque')}><option value="estoque">Controlar estoque</option><option value="sem_estoque">Sem estoque físico</option></select>{isService && <small className="field-message">Serviços não movimentam saldo físico.</small>}</label>
          <label className="field field-wide"><span>Descrição comercial</span><textarea value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="Descrição usada em propostas e documentos comerciais"/></label>
        </div>
      </section>
      <section className="client-form-section" aria-labelledby="catalog-fiscal-title">
        <div className="client-section-heading"><h3 id="catalog-fiscal-title">Identificação fiscal</h3><p>{isService ? 'Classificações que identificam o serviço na preparação da DPS/NFS-e.' : 'Classificações cadastrais da mercadoria usadas na preparação de NF-e e NFC-e.'}</p></div>
        <div className="form-grid">
          {isService ? <>
            <label className="field"><span>Código municipal do serviço *</span><input value={draft.municipalServiceCode} onChange={(event) => update('municipalServiceCode', event.target.value)} placeholder="Código da lista municipal"/></label>
            <label className="field"><span>Item da lista nacional *</span><input value={draft.nationalServiceCode} onChange={(event) => update('nationalServiceCode', event.target.value)} placeholder="Ex.: 17.01"/></label>
            <label className="field"><span>NBS *</span><input value={draft.nbs} onChange={(event) => update('nbs', event.target.value)} placeholder="0.0000.00.00"/></label>
            <label className="field"><span>Alíquota padrão de ISS</span><div className="input-prefix suffix"><input inputMode="decimal" value={String(draft.issRate).replace('.', ',')} onChange={(event) => update('issRate', Math.max(0, commercialNumber(event.target.value)))} aria-label="Alíquota padrão de ISS"/><i>%</i></div></label>
          </> : <>
            <label className="field"><span>NCM *</span><input inputMode="numeric" value={draft.ncm} onChange={(event) => update('ncm', event.target.value)} placeholder="0000.00.00"/></label>
            <label className="field"><span>CEST</span><input inputMode="numeric" value={draft.cest} onChange={(event) => update('cest', event.target.value)} placeholder={draft.cestRequired ? 'Obrigatório neste perfil' : 'Quando aplicável'}/></label>
            <label className="field"><span>GTIN/EAN</span><input inputMode="numeric" value={draft.gtin} onChange={(event) => update('gtin', event.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="Código de barras"/></label>
            <label className="field"><span>Unidade tributável *</span><input value={draft.taxableUnit} onChange={(event) => update('taxableUnit', event.target.value.toUpperCase().slice(0, 6))} placeholder={draft.unit.toUpperCase()} maxLength={6}/><small className="field-message">Pode coincidir com a unidade comercial.</small></label>
            <label className="field"><span>Código de benefício fiscal</span><input value={draft.fiscalBenefitCode} onChange={(event) => update('fiscalBenefitCode', event.target.value.toUpperCase().slice(0, 12))} placeholder="Quando aplicável" maxLength={12}/></label>
            <label className="check-field field-wide"><input type="checkbox" checked={draft.cestRequired} onChange={(event) => update('cestRequired', event.target.checked)}/><span><strong>CEST obrigatório para este perfil</strong><small>Marque somente quando a classificação e a operação estiverem sujeitas ao código.</small></span></label>
          </>}
        </div>
      </section>
      <section className="client-form-section" aria-labelledby="catalog-tax-defaults-title">
        <div className="client-section-heading"><h3 id="catalog-tax-defaults-title">Padrões tributários</h3><p>São sugestões cadastrais. A operação, o cliente, a UF, o município e o regime ainda podem alterar o resultado final.</p></div>
        <div className="catalog-tax-boundary"><Icon name="warning" size={18}/><p><strong>Não é uma calculadora de impostos.</strong> Estes padrões alimentam a pré-validação, mas a futura emissão deverá recalcular e validar cada operação no servidor.</p></div>
        <div className="form-grid">
          {isService ? <>
            <label className="field"><span>Regra padrão de incidência *</span><select value={draft.serviceIncidenceMode} onChange={(event) => update('serviceIncidenceMode', event.target.value)}><option>Definir por operação</option><option>Município do prestador</option><option>Município do tomador</option><option>Local da execução</option></select></label>
            <label className="field"><span>CST do PIS *</span><input inputMode="numeric" value={draft.pisCst} onChange={(event) => update('pisCst', event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="00" maxLength={2}/></label>
            <label className="field"><span>CST da COFINS *</span><input inputMode="numeric" value={draft.cofinsCst} onChange={(event) => update('cofinsCst', event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="00" maxLength={2}/></label>
            <label className="check-field field-wide"><input type="checkbox" checked={draft.issWithheldDefault} onChange={(event) => update('issWithheldDefault', event.target.checked)}/><span><strong>ISS retido como padrão</strong><small>A retenção definitiva continuará sujeita ao tomador, município e natureza da operação.</small></span></label>
          </> : <>
            <label className="field"><span>Origem da mercadoria *</span><select value={draft.fiscalOriginCode} onChange={(event) => update('fiscalOriginCode', event.target.value)}><option value="">Selecionar</option><option value="0">0 · Nacional</option><option value="1">1 · Estrangeira, importação direta</option><option value="2">2 · Estrangeira, mercado interno</option><option value="3">3 · Nacional, conteúdo importado acima de 40%</option><option value="4">4 · Nacional, processo produtivo básico</option><option value="5">5 · Nacional, conteúdo importado até 40%</option><option value="6">6 · Estrangeira, sem similar nacional</option><option value="7">7 · Estrangeira, mercado interno, sem similar</option><option value="8">8 · Nacional, conteúdo importado acima de 70%</option></select></label>
            <label className="field"><span>CFOP interno padrão *</span><input inputMode="numeric" value={draft.cfopInternal} onChange={(event) => update('cfopInternal', event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" maxLength={4}/></label>
            <label className="field"><span>CFOP interestadual padrão *</span><input inputMode="numeric" value={draft.cfopInterstate} onChange={(event) => update('cfopInterstate', event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" maxLength={4}/></label>
            <label className="field"><span>CST/CSOSN do ICMS *</span><input inputMode="numeric" value={draft.icmsCode} onChange={(event) => update('icmsCode', event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="000" maxLength={3}/></label>
            <label className="field"><span>Alíquota padrão de ICMS</span><div className="input-prefix suffix"><input inputMode="decimal" value={String(draft.icmsRate || '').replace('.', ',')} onChange={(event) => update('icmsRate', Math.max(0, commercialNumber(event.target.value)))} placeholder="0,00"/><i>%</i></div></label>
            <label className="field"><span>CST do PIS *</span><input inputMode="numeric" value={draft.pisCst} onChange={(event) => update('pisCst', event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="00" maxLength={2}/></label>
            <label className="field"><span>Alíquota padrão de PIS</span><div className="input-prefix suffix"><input inputMode="decimal" value={String(draft.pisRate || '').replace('.', ',')} onChange={(event) => update('pisRate', Math.max(0, commercialNumber(event.target.value)))} placeholder="0,00"/><i>%</i></div></label>
            <label className="field"><span>CST da COFINS *</span><input inputMode="numeric" value={draft.cofinsCst} onChange={(event) => update('cofinsCst', event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="00" maxLength={2}/></label>
            <label className="field"><span>Alíquota padrão de COFINS</span><div className="input-prefix suffix"><input inputMode="decimal" value={String(draft.cofinsRate || '').replace('.', ',')} onChange={(event) => update('cofinsRate', Math.max(0, commercialNumber(event.target.value)))} placeholder="0,00"/><i>%</i></div></label>
            <label className="field"><span>Tributos aproximados federais</span><div className="input-prefix suffix"><input inputMode="decimal" value={String(draft.approximateFederalTaxRate || '').replace('.', ',')} onChange={(event) => update('approximateFederalTaxRate', Math.max(0, commercialNumber(event.target.value)))} placeholder="0,00"/><i>%</i></div><small className="field-message">Referência informativa da Lei 12.741/2012.</small></label>
            <label className="field"><span>Tributos aproximados estaduais</span><div className="input-prefix suffix"><input inputMode="decimal" value={String(draft.approximateStateTaxRate || '').replace('.', ',')} onChange={(event) => update('approximateStateTaxRate', Math.max(0, commercialNumber(event.target.value)))} placeholder="0,00"/><i>%</i></div></label>
            <label className="check-field field-wide"><input type="checkbox" checked={draft.ipiApplicable} onChange={(event) => update('ipiApplicable', event.target.checked)}/><span><strong>IPI aplicável a este perfil</strong><small>Quando marcado, CST e enquadramento passam a compor a prontidão do cadastro.</small></span></label>
            {draft.ipiApplicable && <><label className="field"><span>CST do IPI *</span><input inputMode="numeric" value={draft.ipiCst} onChange={(event) => update('ipiCst', event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="00" maxLength={2}/></label><label className="field"><span>Enquadramento legal do IPI *</span><input inputMode="numeric" value={draft.ipiLegalCode} onChange={(event) => update('ipiLegalCode', event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="301 a 399" maxLength={3}/></label><label className="field"><span>Alíquota padrão de IPI</span><div className="input-prefix suffix"><input inputMode="decimal" value={String(draft.ipiRate || '').replace('.', ',')} onChange={(event) => update('ipiRate', Math.max(0, commercialNumber(event.target.value)))} placeholder="0,00"/><i>%</i></div></label></>}
            <label className="check-field field-wide"><input type="checkbox" checked={draft.stApplicable} onChange={(event) => update('stApplicable', event.target.checked)}/><span><strong>Substituição tributária aplicável</strong><small>Ativa os padrões de ICMS-ST; a operação final continuará sujeita à UF e à legislação vigente.</small></span></label>
            {draft.stApplicable && <><label className="field"><span>Modalidade da base do ICMS-ST *</span><select value={draft.stBaseMode} onChange={(event) => update('stBaseMode', event.target.value)}><option value="">Selecionar</option><option>Preço tabelado ou máximo</option><option>Lista negativa</option><option>Lista positiva</option><option>Lista neutra</option><option>Margem de valor agregado</option><option>Pauta</option><option>Valor da operação</option></select></label><label className="field"><span>MVA do ICMS-ST</span><div className="input-prefix suffix"><input inputMode="decimal" value={String(draft.stMvaRate || '').replace('.', ',')} onChange={(event) => update('stMvaRate', Math.max(0, commercialNumber(event.target.value)))} placeholder="0,00"/><i>%</i></div></label><label className="field"><span>Alíquota do ICMS-ST *</span><div className="input-prefix suffix"><input inputMode="decimal" value={String(draft.stIcmsRate || '').replace('.', ',')} onChange={(event) => update('stIcmsRate', Math.max(0, commercialNumber(event.target.value)))} placeholder="0,00"/><i>%</i></div></label><label className="field"><span>Redução da base do ICMS-ST</span><div className="input-prefix suffix"><input inputMode="decimal" value={String(draft.stBaseReductionRate || '').replace('.', ',')} onChange={(event) => update('stBaseReductionRate', Math.max(0, commercialNumber(event.target.value)))} placeholder="0,00"/><i>%</i></div></label></>}
          </>}
        </div>
      </section>
      {!isService && <section className="client-form-section" aria-labelledby="catalog-document-overrides-title">
        <div className="client-section-heading"><h3 id="catalog-document-overrides-title">Exceções por documento</h3><p>O padrão geral é usado por segurança. Habilite uma exceção somente quando NF-e ou NFC-e exigir códigos próprios para este item.</p></div>
        <div className="catalog-tax-boundary"><Icon name="document" size={18}/><p><strong>Referência estrutural validada no VHSys.</strong> A exceção não substitui a regra calculada da operação; apenas preserva parâmetros específicos do cadastro.</p></div>
        <div className="form-grid">
          <label className="check-field field-wide"><input type="checkbox" checked={draft.nfeOverrideEnabled} onChange={(event) => update('nfeOverrideEnabled', event.target.checked)}/><span><strong>Usar parâmetros específicos na NF-e</strong><small>Quando desligado, a NF-e usa os padrões tributários acima.</small></span></label>
          {draft.nfeOverrideEnabled && <><label className="field"><span>CFOP interno da NF-e *</span><input inputMode="numeric" value={draft.nfeCfopInternal} onChange={(event) => update('nfeCfopInternal', event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" maxLength={4}/></label><label className="field"><span>CFOP interestadual da NF-e *</span><input inputMode="numeric" value={draft.nfeCfopInterstate} onChange={(event) => update('nfeCfopInterstate', event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" maxLength={4}/></label><label className="field"><span>CST/CSOSN do ICMS na NF-e *</span><input inputMode="numeric" value={draft.nfeIcmsCode} onChange={(event) => update('nfeIcmsCode', event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="000" maxLength={3}/></label><label className="field"><span>CST do PIS na NF-e</span><input inputMode="numeric" value={draft.nfePisCst} onChange={(event) => update('nfePisCst', event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder={draft.pisCst || '00'} maxLength={2}/></label><label className="field"><span>CST da COFINS na NF-e</span><input inputMode="numeric" value={draft.nfeCofinsCst} onChange={(event) => update('nfeCofinsCst', event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder={draft.cofinsCst || '00'} maxLength={2}/></label></>}
          <label className="check-field field-wide"><input type="checkbox" checked={draft.nfceOverrideEnabled} onChange={(event) => update('nfceOverrideEnabled', event.target.checked)}/><span><strong>Usar parâmetros específicos na NFC-e</strong><small>Quando desligado, a venda ao consumidor usa os padrões tributários gerais.</small></span></label>
          {draft.nfceOverrideEnabled && <><label className="field"><span>CFOP da NFC-e *</span><input inputMode="numeric" value={draft.nfceCfop} onChange={(event) => update('nfceCfop', event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" maxLength={4}/></label><label className="field"><span>CST/CSOSN do ICMS na NFC-e *</span><input inputMode="numeric" value={draft.nfceIcmsCode} onChange={(event) => update('nfceIcmsCode', event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="000" maxLength={3}/></label><label className="field"><span>CST do PIS na NFC-e</span><input inputMode="numeric" value={draft.nfcePisCst} onChange={(event) => update('nfcePisCst', event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder={draft.pisCst || '00'} maxLength={2}/></label><label className="field"><span>CST da COFINS na NFC-e</span><input inputMode="numeric" value={draft.nfceCofinsCst} onChange={(event) => update('nfceCofinsCst', event.target.value.replace(/\D/g, '').slice(0, 2))} placeholder={draft.cofinsCst || '00'} maxLength={2}/></label></>}
        </div>
      </section>}
      <section className="client-form-section" aria-labelledby="catalog-reform-title">
        <div className="client-section-heading"><h3 id="catalog-reform-title">Reforma tributária</h3><p>Campos versionados conforme a referência {TAX_PROFILE_REFERENCE}; não preencher com códigos presumidos.</p></div>
        <div className="form-grid">
          <label className="field"><span>CST IBS/CBS</span><input value={draft.ibsCbsCst} onChange={(event) => update('ibsCbsCst', event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Consultar tabela vigente"/></label>
          <label className="field"><span>Classificação tributária IBS/CBS</span><input value={draft.ibsCbsClassification} onChange={(event) => update('ibsCbsClassification', event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="cClassTrib"/></label>
          {isService && <label className="field"><span>Indicador da operação IBS/CBS</span><input value={draft.ibsCbsOperationIndicator} onChange={(event) => update('ibsCbsOperationIndicator', event.target.value)} placeholder="Consultar anexo vigente"/></label>}
          {!isService && <label className="field"><span>Classificação do Imposto Seletivo</span><input value={draft.selectiveTaxCode} onChange={(event) => update('selectiveTaxCode', event.target.value)} placeholder="Somente quando aplicável"/></label>}
          <label className="field"><span>Revisado por</span><input value={draft.fiscalReviewedBy} onChange={(event) => update('fiscalReviewedBy', event.target.value)} placeholder="Responsável fiscal ou escritório" maxLength={100}/></label>
          <label className="field"><span>Data da revisão</span><input type="date" value={draft.fiscalReviewedAt} onChange={(event) => update('fiscalReviewedAt', event.target.value)}/></label>
        </div>
      </section>
      <section className="catalog-tax-readiness" aria-labelledby="catalog-readiness-title"><div className="client-section-heading"><h3 id="catalog-readiness-title">Prontidão do perfil</h3><p>Campos ausentes ficam registrados; o item pode ser salvo para revisão posterior.</p></div><div className="catalog-tax-readiness-summary"><div><span>Cadastro-base</span><Badge tone={taxEvaluation.coreReady ? 'success' : 'warning'}>{taxEvaluation.coreReady ? 'Pronto' : 'Pendente'}</Badge></div><div><span>IBS/CBS</span><Badge tone={taxEvaluation.reformReady ? 'success' : 'warning'}>{taxEvaluation.reformReady ? 'Revisado' : 'Pendente'}</Badge></div><div><span>Preenchimento</span><strong>{taxEvaluation.completion}%</strong></div></div><div className="catalog-tax-checks">{taxEvaluation.checks.map((check) => <div key={check.key}><span className={check.ready ? 'ready' : 'pending'}><Icon name={check.ready ? 'check' : 'clock'} size={14}/></span><p><strong>{check.label}</strong><small>{check.detail}</small></p><Badge tone={check.ready ? 'success' : 'warning'}>{check.ready ? 'Informado' : 'Pendente'}</Badge></div>)}</div></section>
      <div className="catalog-sync-foot"><span>Última publicação</span><strong>{draft.syncedAt}</strong><Badge tone={draft.syncStatus === 'Sincronizado' ? 'success' : 'warning'}>{draft.syncStatus}</Badge></div>
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="button" className="button primary" onClick={save}>Salvar complementos</button></footer>
  </Dialog>;
}

function CatalogRecordActions({ item, onNavigate, onEdit, onNewOrder, onNewService, onNewQuote }: { item: CatalogItem; onNavigate: (view: View) => void; onEdit: () => void; onNewOrder: () => void; onNewService: () => void; onNewQuote: () => void }) {
  const isService = item.category === 'Serviço';
  const actions: RecordAction[] = isService ? [
    { label: 'Novo orçamento', description: 'Inicia uma proposta com este serviço já incluído', icon: 'document', onSelect: onNewQuote, permission: 'services.create' },
    { label: 'Nova ordem de serviço', description: 'Inicia a agenda com este serviço já incluído', icon: 'service', onSelect: onNewService, permission: 'services.create' },
    { label: 'Editar complementos', description: 'Disponibilidade, descrição e operação comercial', icon: 'edit', onSelect: onEdit, permission: 'catalog.edit' },
    { label: 'Agenda e ordens de serviço', description: 'Atendimentos vinculados a este serviço', icon: 'calendar', onSelect: () => onNavigate('servicos'), permission: 'services.view' },
    { label: 'Custos e precificação', description: 'Composição e preço publicados pelo módulo de Custos', icon: 'chart', planned: true },
    { label: 'Abrir perfil fiscal para NFS-e', description: 'DPS, serviço, ISS, PIS/COFINS, IBS/CBS e revisão', icon: 'fiscal', onSelect: onEdit, permission: 'catalog.edit' },
  ] : [
    { label: 'Novo pedido', description: 'Inicia um pedido com este produto já incluído', icon: 'sale', onSelect: onNewOrder, permission: 'sales.create' },
    { label: 'Novo orçamento', description: 'Inicia uma proposta com este produto já incluído', icon: 'document', onSelect: onNewQuote, permission: 'sales.create' },
    { label: 'Editar complementos', description: 'Disponibilidade, descrição, estoque e dados fiscais', icon: 'edit', onSelect: onEdit, permission: 'catalog.edit' },
    { label: 'Ver estoque', description: 'Saldo, reserva, mínimo e valor disponível', icon: 'stock', onSelect: () => onNavigate('estoque'), permission: 'stock.view' },
    { label: 'Movimentações', description: 'Entradas, saídas, ajustes e inventários', icon: 'arrow', onSelect: () => onNavigate('estoque'), permission: 'stock.view' },
    { label: 'Custos e precificação', description: 'Composição e preço publicados pelo módulo de Custos', icon: 'chart', planned: true },
    { label: 'Abrir perfil fiscal', description: 'NCM, CEST, CFOP, ICMS, PIS/COFINS, IBS/CBS e revisão', icon: 'fiscal', onSelect: onEdit, permission: 'catalog.edit' },
  ];
  return <RecordActionsDialog title={`Ações de ${item.sku}`} description={`${item.name}. O catálogo comercial preserva a origem em Custos e separa estoque e fiscal.`} actions={actions} triggerLabel={`Ações de ${item.name}`}/>;
}

function QuoteView({ source, clientRecords, catalogRecords, settings, connected, initialClient = '', initialSku = '', onCancel, onCreated }: { source: 'vendas' | 'servicos'; clientRecords: ClientRecord[]; catalogRecords: CatalogItem[]; settings: ModuleSettings; connected: boolean; initialClient?: string; initialSku?: string; onCancel: () => void; onCreated: (record: CreatedRecord) => void }) {
  const clientRef = useRef<HTMLSelectElement>(null);
  const [clientName, setClientName] = useState(initialClient);
  const [seller, setSeller] = useState(settings.commercial.defaultSeller);
  const [validUntil, setValidUntil] = useState(() => isoAfterDays(settings.commercial.quoteValidityDays));
  const [lines, setLines] = useState<OrderLine[]>(() => {
    const initialItem = catalogRecords.find((item) => item.sku === initialSku);
    return initialItem ? [orderLineFromCatalog(initialItem)] : [];
  });
  const [discount, setDiscount] = useState('0');
  const [freight, setFreight] = useState('0');
  const [notes, setNotes] = useState('Valores e disponibilidade sujeitos à confirmação durante a validade desta proposta.');
  const [submitted, setSubmitted] = useState(false);
  const selectedClient = clientRecords.find((client) => client.name === clientName);
  const totals = calculateOrder(lines.map((line) => ({ quantity: line.quantity, unitPrice: Math.max(0, line.unitPrice - line.unitDiscount) })), commercialNumber(discount), commercialNumber(freight));

  useEffect(() => setClientName(initialClient), [initialClient]);

  const addItem = (item: CatalogItem) => {
    setLines((current) => {
      const existing = current.find((line) => line.sku === item.sku);
      if (existing) return current.map((line) => line.sku === item.sku ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, orderLineFromCatalog(item)];
    });
    setSubmitted(false);
  };
  const updateLine = (id: string, patch: Partial<OrderLine>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  const save = () => {
    if (!clientName || lines.length === 0) {
      setSubmitted(true);
      window.setTimeout(() => (!clientName ? clientRef.current : document.getElementById('quote-catalog-search'))?.focus(), 0);
      return;
    }
    const id = `ORC-${Date.now().toString().slice(-6)}`;
    const quote: QuotePdfInput & { source: 'vendas' | 'servicos' } = {
      number: id,
      validUntil: validUntil.split('-').reverse().join('/'),
      company: settings.company,
      client: clientName,
      clientDocument: selectedClient?.document,
      clientCity: selectedClient?.city,
      items: lines.map((line) => ({ sku: line.sku, name: line.name, quantity: line.quantity, unitPrice: Math.max(0, line.unitPrice - line.unitDiscount) })),
      subtotal: totals.subtotal,
      discount: totals.discount,
      freight: totals.freight,
      total: totals.total,
      notes,
      source,
    };
    onCreated({ id, type: 'orcamento', client: clientName, total: totals.total, createdAt: new Date().toISOString(), status: 'Salvo', quote });
  };

  return <>
    <div className="order-page-heading"><div><span>{source === 'servicos' ? 'Proposta de serviço' : 'Proposta comercial'}</span><h1>Novo orçamento</h1><p>Monte uma proposta, salve o registro e gere o PDF que será compartilhado com o cliente.</p></div><Badge tone="info">{connected ? 'Perfil empresarial' : 'Proposta local'}</Badge></div>
    <div className="order-safety"><Icon name="document" size={18}/><p><strong>Orçamento sem efeitos operacionais.</strong> Salvar não reserva estoque, não cria cobrança e não emite nota fiscal.</p></div>
    <div className="order-layout">
      <div className="order-main">
        <section className="order-card" aria-labelledby="quote-identification-title"><header><div><h2 id="quote-identification-title">Identificação</h2><p>Destinatário, responsável comercial e validade.</p></div><Badge>Orçamento novo</Badge></header><div className="order-card-body"><div className="order-form-grid">
          <label className="field field-wide"><span>Cliente *</span><select ref={clientRef} value={clientName} onChange={(event) => { setClientName(event.target.value); setSubmitted(false); }} aria-invalid={submitted && !clientName}><option value="">Selecione um cliente</option>{clientRecords.map((client) => <option key={client.id} value={client.name}>{client.name} · {client.document}</option>)}</select>{submitted && !clientName && <small className="field-message error">Selecione o cliente para salvar o orçamento.</small>}</label>
          {selectedClient && <div className="client-snapshot field-wide"><div><span>Documento</span><strong>{selectedClient.document}</strong></div><div><span>Município</span><strong>{selectedClient.city}</strong></div><div><span>Perfil fiscal</span><strong>{selectedClient.fiscal}</strong></div><Badge tone="success">Cadastro localizado</Badge></div>}
          <label className="field"><span>Responsável</span><select value={seller} onChange={(event) => setSeller(event.target.value)}>{settings.commercial.sellers.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label className="field"><span>Validade da proposta</span><input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)}/></label>
        </div></div></section>
        <section className="order-card" aria-labelledby="quote-items-title"><header><div><h2 id="quote-items-title">Itens do orçamento</h2><p>{source === 'servicos' ? 'A busca está limitada aos serviços publicados no catálogo.' : 'Pesquise ou abra a lista completa do catálogo comercial.'}</p></div><Badge tone="info">{lines.length} {lines.length === 1 ? 'item' : 'itens'}</Badge></header><div className="order-card-body">
          <CatalogSearch id="quote-catalog-search" items={catalogRecords} kind={source === 'servicos' ? 'servico' : 'todos'} onAdd={addItem}/>
          {submitted && lines.length === 0 && <p className="form-error" role="alert">Adicione ao menos um item para salvar o orçamento.</p>}
          {lines.length === 0 ? <EmptyState title="Nenhum item adicionado" description={source === 'servicos' ? 'Selecione um serviço cadastrado para começar a proposta.' : 'Selecione um produto ou serviço para começar a proposta.'}/> : <div className="order-items">{lines.map((line) => {
            const lineTotal = line.quantity * Math.max(0, line.unitPrice - line.unitDiscount);
            return <div className="order-item" key={line.id}>
              <div className="order-item-name"><strong>{line.name}</strong><small>{line.sku} · {line.kind === 'servico' ? 'Serviço' : `Disponível: ${line.available} ${line.unit}`}</small><Badge tone={line.fiscalStatus === 'Completo' ? 'success' : 'warning'}>{line.fiscalStatus}</Badge></div>
              <div className="order-item-controls">
                <LineNumberEditor label={`Quantidade de ${line.name}`} value={line.quantity} onChange={(value) => updateLine(line.id, { quantity: value })} step={line.kind === 'servico' ? 0.5 : 1} unit={line.unit} showSteppers/>
                <LineNumberEditor label={`Preço de ${line.name}`} value={line.unitPrice} onChange={(value) => updateLine(line.id, { unitPrice: value })} moneyValue/>
                <LineNumberEditor label={`Desconto de ${line.name}`} value={line.unitDiscount} onChange={(value) => updateLine(line.id, { unitDiscount: value })} moneyValue/>
              </div>
              <div className="order-item-result"><span>Subtotal</span><strong style={{ fontSize: `${fittedNumericFontSize(money(lineTotal), 174, 15, 7)}px` }}>{money(lineTotal)}</strong></div>
              <button type="button" className="icon-button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} aria-label={`Remover ${line.name}`}><Icon name="close" size={17}/></button>
            </div>;
          })}</div>}
        </div></section>
        <section className="order-card" aria-labelledby="quote-conditions-title"><header><div><h2 id="quote-conditions-title">Condições da proposta</h2><p>Ajustes que também aparecem no PDF enviado ao cliente.</p></div></header><div className="order-card-body order-form-grid"><label className="field"><span>Desconto geral</span><MoneyInput value={discount} onChange={setDiscount} ariaLabel="Desconto geral do orçamento"/></label><label className="field"><span>Frete ou deslocamento</span><MoneyInput value={freight} onChange={setFreight} ariaLabel="Frete ou deslocamento"/></label><label className="field field-wide"><span>Observações ao cliente</span><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={100} /></label></div></section>
      </div>
      <aside className="order-summary" aria-label="Resumo do orçamento"><section><header><span>Resumo do orçamento</span><Badge tone={clientName && lines.length ? 'success' : 'warning'}>{clientName && lines.length ? 'Pronto para salvar' : 'Preencha a proposta'}</Badge></header><dl><div><dt>Itens</dt><dd>{money(totals.subtotal)}</dd></div><div><dt>Desconto</dt><dd>− {money(totals.discount)}</dd></div><div><dt>Frete</dt><dd>{money(totals.freight)}</dd></div><div className="order-total"><dt>Total</dt><dd>{money(totals.total)}</dd></div></dl><div className="order-effects"><div><Icon name="calendar" size={16}/><span><strong>Válido até {validUntil.split('-').reverse().join('/')}</strong><small>Prazo informado no PDF</small></span></div><div><Icon name="document" size={16}/><span><strong>PDF pronto após salvar</strong><small>Compartilhar ou baixar</small></span></div></div></section><div className="order-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancelar</button><button type="button" className="button primary" onClick={save}><Icon name="check" size={17}/> Salvar orçamento</button></div></aside>
    </div>
  </>;
}

function Dashboard({ onNew, onNavigate, connected, created, receivableRecords, catalogRecords }: { onNew: (type: NewActionType) => void; onNavigate: (view: View) => void; connected: boolean; created: CreatedRecord[]; receivableRecords: ReceivableRecord[]; catalogRecords: CatalogItem[] }) {
  if (connected) {
    const snapshot = calculateCommercialReport({ operations: created, receivables: receivableRecords, catalog: catalogRecords, movements: [], fiscalDrafts: [], todayIso: new Date().toISOString().slice(0, 10) });
    const integratedQuickActions = dashboardNewOptions.filter((option) => option.type !== 'venda');
    return <>
      <PageHeading view="painel" action={<button type="button" className="button primary" onClick={() => onNew('pedido')}><Icon name="plus" size={18}/> Novo pedido</button>}/>
      <div className="demo-banner"><span>Perfil conectado</span><p>Os indicadores abaixo usam somente os registros do perfil empresarial acessado.</p></div>
      <div className="metric-grid"><Metric label="Receita recebida" value={money(snapshot.receivedNet)} note="Recebimentos líquidos"/><Metric label="A receber" value={money(snapshot.openReceivables)} note={`${snapshot.overdueReceivables ? money(snapshot.overdueReceivables) : 'Sem valores'} em atraso`} tone="cyan"/><Metric label="Margem estimada" value={percent(snapshot.marginPercent)} note="Custos publicados no catálogo" tone="success"/><Metric label="Atenções de estoque" value={String(snapshot.stockLowItems)} note="Itens abaixo do mínimo" tone="warning"/></div>
      <section className="quick-actions" aria-label="Ações rápidas">{integratedQuickActions.map((option) => <button type="button" key={option.type} onClick={() => onNew(option.type)}><span><Icon name={option.icon}/></span><div><strong>Novo {option.title.toLocaleLowerCase('pt-BR')}</strong><small>{option.description}</small></div><Icon name="chevron" size={17}/></button>)}</section>
      <div className="dashboard-grid"><Panel title="Operação comercial" subtitle="Registros persistidos no perfil"><div className="pipeline">{[['Orçamentos', created.filter((item) => item.type === 'orcamento').length], ['Pedidos', created.filter((item) => item.type === 'pedido').length], ['Serviços', created.filter((item) => item.type === 'ordem_servico').length], ['Faturados', created.filter((item) => item.status === 'Faturado').length]].map(([label, count], index) => <div key={String(label)}><span className={`pipeline-icon pipeline-${index}`}><Icon name={index === 0 ? 'document' : index === 2 ? 'service' : 'sale'} size={18}/></span><div><strong>{label}</strong><small>Perfil empresarial</small></div><b>{count}</b></div>)}</div></Panel><Panel title="Atenção necessária" subtitle="Prioridades atuais"><div className="attention-list"><button type="button" onClick={() => onNavigate('estoque')}><i className="dot warning"/><span><strong>{snapshot.stockLowItems} itens com atenção</strong><small>Saldo disponível e estoque mínimo</small></span><Badge tone="warning">Estoque</Badge></button><button type="button" onClick={() => onNavigate('recebimentos')}><i className="dot warning"/><span><strong>{money(snapshot.overdueReceivables)} em atraso</strong><small>Parcelas vencidas do perfil</small></span><Badge tone="warning">Cobrança</Badge></button></div></Panel></div>
    </>;
  }
  const maxRevenue = Math.max(...monthlyRevenue.map(([, value]) => value));
  return <>
    <PageHeading view="painel" action={<button type="button" className="button primary" onClick={() => onNew('pedido')}><Icon name="plus" size={18}/> Novo pedido</button>}/>
    <div className="demo-banner"><span>Demonstração</span><p>Dados fictícios. Emissão fiscal, estoque e financeiro não estão conectados.</p></div>
    <div className="metric-grid"><Metric label="Faturamento no mês" value={money(48640)} note="+8,4% sobre julho"/><Metric label="A receber" value={money(7970)} note="3 parcelas em aberto" tone="cyan"/><Metric label="Margem estimada" value={percent(34.8)} note="Baseada no custo publicado" tone="success"/><Metric label="Atenções" value="7" note="Fiscal, estoque e cobrança" tone="warning"/></div>
    <section className="quick-actions" aria-label="Ações rápidas">{dashboardNewOptions.map((option) => <button type="button" key={option.type} onClick={() => onNew(option.type)}><span><Icon name={option.icon}/></span><div><strong>Novo {option.title.toLocaleLowerCase('pt-BR')}</strong><small>{option.description}</small></div><Icon name="chevron" size={17}/></button>)}</section>
    <div className="dashboard-grid">
      <Panel title="Ciclo das vendas" subtitle="6 operações recentes" action={<button className="text-button" type="button" onClick={() => onNavigate('vendas')}>Ver vendas <Icon name="arrow" size={15}/></button>}>
        <div className="pipeline">{[['Orçamentos', 7, money(14200)], ['Pedidos', 12, money(28640)], ['Separação', 4, money(9450)], ['Faturados', 9, money(21380)]].map(([label, count, total], index) => <div key={String(label)}><span className={`pipeline-icon pipeline-${index}`}><Icon name={index === 0 ? 'document' : index === 3 ? 'check' : 'sale'} size={18}/></span><div><strong>{label}</strong><small>{total}</small></div><b>{count}</b></div>)}</div>
      </Panel>
      <Panel title="Atenção necessária" subtitle="Prioridades da operação">
        <div className="attention-list"><button type="button" onClick={() => onNavigate('fiscal')}><i className="dot danger"/><span><strong>2 documentos fiscais bloqueados</strong><small>Configuração fiscal pendente</small></span><Badge tone="danger">Fiscal</Badge></button><button type="button" onClick={() => onNavigate('estoque')}><i className="dot warning"/><span><strong>2 itens abaixo do estoque mínimo</strong><small>Sérum Vitamina C e Home Spray</small></span><Badge tone="warning">Estoque</Badge></button><button type="button" onClick={() => onNavigate('recebimentos')}><i className="dot warning"/><span><strong>1 parcela vencida</strong><small>Studio Bela Pele · {money(480)}</small></span><Badge tone="warning">Cobrança</Badge></button></div>
      </Panel>
      <Panel title="Faturamento comercial" subtitle="Últimos seis meses" className="span-two">
        <div className="bar-chart" role="img" aria-label="Faturamento comercial de março a agosto">{monthlyRevenue.map(([month, value]) => <div key={month}><span style={{ height: `${Math.max(14, value / maxRevenue * 100)}%` }} title={`${month}: ${money(value)}`}/><b>{month}</b><small>{Math.round(value / 1000)}k</small></div>)}</div>
      </Panel>
      <Panel title="Agenda de serviços" subtitle="Próximos atendimentos" action={<button className="text-button" type="button" onClick={() => onNavigate('servicos')}>Abrir agenda</button>}>
        <div className="schedule-list">{serviceOrders.slice(0, 3).map((service) => <div key={service.id}><span><b>{service.scheduled.split(' · ')[0]}</b><small>{service.scheduled.split(' · ')[1]}</small></span><div><strong>{service.service}</strong><small>{service.client} · {service.technician}</small></div></div>)}</div>
      </Panel>
    </div>
  </>;
}

function SalesView({ created, connected, fiscalDrafts, fiscalPrepareState, onNew, onNotify, onNavigate, onFiscalStart, onFiscalPrepare, onReceivables, onLifecycle }: { created: CreatedRecord[]; connected: boolean; fiscalDrafts: FiscalDraftRecord[]; fiscalPrepareState: Record<string, { loading: boolean; message: string }>; onNew: (type: DocumentType) => void; onNotify: (message: string) => void; onNavigate: (view: View) => void; onFiscalStart: (origin: FiscalOrigin) => void; onFiscalPrepare: (draft: FiscalDraftRecord) => void; onReceivables: (origin: string) => void; onLifecycle: (record: CreatedRecord, action: OrderLifecycleAction) => void }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas as situações');
  const [detailRecord, setDetailRecord] = useState<CreatedRecord | null>(null);
  const [lifecycleRequest, setLifecycleRequest] = useState<{ record: CreatedRecord; action: OrderLifecycleAction } | null>(null);
  const localQuotes = created.filter((item) => item.type === 'orcamento' && item.quote);
  const localOperations = created.filter((item) => ['pedido', 'venda'].includes(item.type));
  const records = useMemo<CommercialOperationRecord[]>(() => {
    const localRows: CommercialOperationRecord[] = localOperations.map((record) => {
      const fiscalDraft = fiscalDrafts.find((draft) => draft.originId === record.id);
      return {
        id: record.id,
        date: new Date(record.createdAt).toLocaleDateString('pt-BR'),
        client: record.client,
        type: record.type === 'venda' ? 'Venda rápida' : 'Pedido',
        status: record.status ?? 'Rascunho',
        total: record.total,
        seller: record.order?.seller ?? 'Usuário local',
        fiscal: fiscalDraft?.status ?? (record.order?.fiscalDocument && record.order.fiscalDocument !== 'nenhum' ? `${documentLabel(record.order.fiscalDocument)} prevista` : 'Não definida'),
        stock: record.order?.stockState ?? 'Sem movimentação',
        localRecord: record,
        fiscalDraft,
      };
    });
    return [...localRows, ...(connected ? [] : commercialRecords)].filter((record) => {
      const matchesQuery = normalizeSearch(`${record.id} ${record.client} ${record.status} ${record.type}`).includes(normalizeSearch(query));
      const matchesStatus = statusFilter === 'Todas as situações' || record.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [connected, localOperations, fiscalDrafts, query, statusFilter]);
  const awaitingBilling = localOperations.filter((record) => ['Confirmado', 'Em separação'].includes(record.status ?? '')).reduce((sum, record) => sum + record.total, 0);
  return <>
    <PageHeading view="vendas" action={<div className="heading-actions"><button type="button" className="button secondary" onClick={() => onNew('orcamento')}>Novo orçamento</button><button type="button" className="button primary" onClick={() => onNew('pedido')}><Icon name="plus" size={18}/> Novo pedido</button></div>}/>
    <div className="metric-grid compact"><Metric label="Pedidos" value={String(localOperations.length)} note="Registros do perfil"/><Metric label="Ticket médio" value={money(localOperations.length ? localOperations.reduce((sum, item) => sum + item.total, 0) / localOperations.length : 0)} note="Pedidos registrados" tone="cyan"/><Metric label="Orçamentos" value={String(localQuotes.length)} note="Propostas salvas" tone="success"/><Metric label="Aguardando faturar" value={money(awaitingBilling)} note="Pedidos confirmados" tone="warning"/></div>
    <Panel title="Orçamentos salvos" subtitle="Propostas prontas para compartilhar ou salvar em PDF" action={<Badge tone={localQuotes.length ? 'success' : 'neutral'}>{localQuotes.length} {localQuotes.length === 1 ? 'orçamento' : 'orçamentos'}</Badge>}>
      {localQuotes.length > 0 ? <Table headers={['Número', 'Criado em', 'Cliente', 'Origem', 'Situação', 'Total', 'Arquivo']} minWidth={840}><>{localQuotes.map((record) => <tr key={record.id}><td><strong>{record.id}</strong></td><td>{new Date(record.createdAt).toLocaleDateString('pt-BR')}</td><td><strong>{record.client}</strong></td><td>{record.quote?.source === 'servicos' ? 'Serviços' : 'Vendas'}</td><td><Badge tone="success">Salvo</Badge></td><td className="numeric"><strong>{money(record.total)}</strong></td><td><QuoteActions record={record} onNotify={onNotify}/></td></tr>)}</></Table> : <div className="quote-empty-state"><EmptyState title="Nenhum orçamento salvo" description="Os orçamentos criados em Vendas ou Serviços aparecerão aqui para compartilhar ou baixar em PDF."/><button type="button" className="button primary" onClick={() => onNew('orcamento')}><Icon name="plus" size={17}/> Criar primeiro orçamento</button><small>{connected ? 'Os novos registros serão vinculados ao perfil empresarial.' : 'Os registros deste laboratório ficam neste navegador.'}</small></div>}
    </Panel>
    <Panel title="Operações comerciais" subtitle="Pedidos locais aparecem aqui com reserva, separação, baixa e devolução rastreáveis">
      <SearchToolbar value={query} onChange={setQuery}><select aria-label="Situação" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todas as situações</option><option>Rascunho</option><option>Confirmado</option><option>Em separação</option><option>Faturado</option><option>Cancelado</option><option>Devolvido</option><option>Enviado</option></select><select aria-label="Período"><option>Últimos 30 dias</option><option>Este mês</option><option>Este ano</option></select></SearchToolbar>
      <Table headers={['Número', 'Data', 'Cliente', 'Tipo', 'Situação', 'Fiscal', 'Estoque', 'Total', 'Vendedor', 'Ações']} minWidth={0} className="commercial-operations-table"><>{records.map((record) => <tr key={record.id}><td data-label="Número"><button type="button" className="row-link" onClick={() => record.localRecord && setDetailRecord(record.localRecord)}>{record.id}</button></td><td data-label="Data">{record.date}</td><td data-label="Cliente"><strong>{record.client}</strong></td><td data-label="Tipo">{record.type}</td><td data-label="Situação"><Badge>{record.status}</Badge></td><td data-label="Fiscal"><Badge>{record.fiscal}</Badge></td><td data-label="Estoque"><Badge tone={record.stock === 'Baixado' || record.stock === 'Devolvido' ? 'success' : record.stock === 'Liberado' || record.stock === 'Sem movimentação' ? 'neutral' : 'info'}>{record.stock}</Badge></td><td data-label="Total" className="numeric"><strong>{money(record.total)}</strong></td><td data-label="Vendedor">{record.seller}</td><td data-label="Ações" className="commercial-actions-cell"><CommercialRecordActions record={record} fiscalPrepareLoading={record.fiscalDraft ? fiscalPrepareState[record.fiscalDraft.id]?.loading : false} onNavigate={onNavigate} onFiscalStart={onFiscalStart} onFiscalPrepare={onFiscalPrepare} onReceivables={onReceivables} onOpenLocal={setDetailRecord} onLifecycleRequest={(localRecord, action) => setLifecycleRequest({ record: localRecord, action })}/></td></tr>)}</></Table>
      {records.length === 0 && <EmptyState title="Nenhuma operação encontrada" description="Ajuste a busca ou limpe os filtros para ver as vendas."/>}
    </Panel>
    <OrderDetailsDialog record={detailRecord} onClose={() => setDetailRecord(null)}/>
    <OrderLifecycleDialog request={lifecycleRequest} onClose={() => setLifecycleRequest(null)} onConfirm={onLifecycle}/>
  </>;
}

function ServicesView({ created, connected, clients: clientRecords, catalogRecords, fiscalDrafts, company, onNew, onQuote, onNavigate, onFiscalStart, onReceivables, onStock, onLifecycle, onExecutionSave, onOpenAttachment, onNotify }: { created: CreatedRecord[]; connected: boolean; clients: ClientRecord[]; catalogRecords: CatalogItem[]; fiscalDrafts: FiscalDraftRecord[]; company: CompanyProfile; onNew: (type: DocumentType) => void; onQuote: () => void; onNavigate: (view: View) => void; onFiscalStart: (origin: FiscalOrigin) => void; onReceivables: (origin: string) => void; onStock: (origin: string) => void; onLifecycle: (record: CreatedRecord, action: ServiceLifecycleAction, notes: string) => void; onExecutionSave: (record: CreatedRecord, execution: ServiceExecutionInput, conclude: boolean) => boolean; onOpenAttachment: (attachment: ServiceAttachment) => void; onNotify: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas as situações');
  const [detailRecord, setDetailRecord] = useState<CreatedRecord | null>(null);
  const [lifecycleRequest, setLifecycleRequest] = useState<{ record: CreatedRecord; action: ServiceLifecycleAction } | null>(null);
  const [executionRecord, setExecutionRecord] = useState<CreatedRecord | null>(null);
  const [pdfRecord, setPdfRecord] = useState<CreatedRecord | null>(null);
  const localRecords = created.filter((record) => record.type === 'ordem_servico' && record.serviceOrder);
  const records = useMemo<ServiceOperationRecord[]>(() => {
    const localRows: ServiceOperationRecord[] = localRecords.map((record) => {
      const order = record.serviceOrder!;
      const draft = fiscalDrafts.find((item) => item.originId === record.id);
      return {
        id: record.id,
        client: record.client,
        service: order.lines.map((line) => line.name).join(', '),
        scheduled: `${displayIsoDate(order.scheduledDate)} · ${order.scheduledTime}`,
        technician: order.technician,
        status: record.status ?? 'Rascunho',
        nfse: draft?.status ?? (order.fiscalDocument === 'nfse' ? 'Após conclusão' : 'Não definida'),
        total: record.total,
        localRecord: record,
        fiscalDraft: draft,
      } as ServiceOperationRecord;
    });
    return [...localRows, ...(connected ? [] : serviceOrders)].filter((record) => normalizeSearch(`${record.id} ${record.client} ${record.service} ${record.status}`).includes(normalizeSearch(query)) && (statusFilter === 'Todas as situações' || record.status === statusFilter));
  }, [connected, fiscalDrafts, localRecords, query, statusFilter]);
  const inProgress = localRecords.filter((record) => ['Agendado', 'Em execução'].includes(record.status ?? '')).length;
  const concluded = localRecords.filter((record) => record.status === 'Concluído').length;
  const readyForFiscal = localRecords.filter((record) => record.status === 'Concluído' && record.serviceOrder?.fiscalDocument === 'nfse').reduce((sum, record) => sum + record.total, 0);
  const upcoming = records.filter((record) => !['Concluído', 'Cancelado'].includes(record.status)).slice(0, 5);
  return <>
    <PageHeading view="servicos" action={<div className="heading-actions"><button type="button" className="button secondary" onClick={onQuote}>Novo orçamento</button><button type="button" className="button primary" onClick={() => onNew('ordem_servico')}><Icon name="plus" size={18}/> Nova ordem de serviço</button></div>}/>
    <div className="metric-grid compact"><Metric label="Em atendimento" value={String(inProgress || (connected ? 0 : 4))} note={inProgress || connected ? 'Ordens ativas' : '2 hoje'}/><Metric label="Agenda visível" value={String(upcoming.length)} note="Próximas ordens" tone="cyan"/><Metric label="Serviços concluídos" value={String(concluded || (connected ? 0 : 18))} note={concluded || connected ? 'Ordens do perfil' : 'No mês'} tone="success"/><Metric label="Prontos para NFS-e" value={money(readyForFiscal || (connected ? 0 : 2260))} note="Após conclusão" tone="warning"/></div>
    <div className="content-grid"><Panel title="Agenda dos próximos atendimentos" subtitle="Ordens, horários e responsáveis"><div className="service-agenda-list">{upcoming.length ? upcoming.map((record) => <button type="button" key={record.id} onClick={() => record.localRecord && setDetailRecord(record.localRecord)}><span><strong>{record.scheduled}</strong><small>{record.id}</small></span><span><strong>{record.client}</strong><small>{record.technician}</small></span><Badge>{record.status}</Badge></button>) : <EmptyState title="Agenda sem atendimentos" description="Crie uma ordem de serviço para iniciar a agenda."/>}</div></Panel><Panel title="Receita de serviços" subtitle={connected ? 'Ordens concluídas do perfil' : 'Ordens concluídas e demonstrativas'}><div className="service-summary"><strong>{money(localRecords.filter((record) => record.status === 'Concluído').reduce((sum, record) => sum + record.total, 0) || (connected ? 0 : 9360))}</strong><span>Receita operacional vinculada às ordens</span><div><i style={{ width: '19.2%' }}/></div></div></Panel></div>
    <Panel title="Ordens de serviço" subtitle="Da agenda ao documento operacional, recebimento e preparação da NFS-e"><SearchToolbar value={query} onChange={setQuery}><select aria-label="Situação da ordem" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todas as situações</option><option>Rascunho</option><option>Agendado</option><option>Em execução</option><option>Concluído</option><option>Cancelado</option></select></SearchToolbar><Table headers={['OS', 'Cliente', 'Serviço', 'Agendamento', 'Responsável', 'Situação', 'NFS-e', 'Valor', 'Ações']} minWidth={0} className="service-orders-table"><>{records.map((record) => <tr key={record.id}><td data-label="OS"><button type="button" className="row-link" onClick={() => record.localRecord && setDetailRecord(record.localRecord)}>{record.id}</button></td><td data-label="Cliente"><strong>{record.client}</strong></td><td data-label="Serviço">{record.service}</td><td data-label="Agendamento">{record.scheduled}</td><td data-label="Responsável">{record.technician}</td><td data-label="Situação"><Badge>{record.status}</Badge></td><td data-label="NFS-e"><Badge>{record.nfse}</Badge></td><td data-label="Valor" className="numeric"><strong>{money(record.total)}</strong></td><td data-label="Ações" className="service-actions-cell"><ServiceRecordActions record={record} onNavigate={onNavigate} onFiscalStart={onFiscalStart} onDetails={() => record.localRecord && setDetailRecord(record.localRecord)} onReceivables={onReceivables} onStock={onStock} onLifecycleRequest={(localRecord, action) => setLifecycleRequest({ record: localRecord, action })} onExecutionRequest={setExecutionRecord} onPdf={setPdfRecord}/></td></tr>)}</></Table>{records.length === 0 && <EmptyState title="Nenhuma ordem encontrada" description="Ajuste a busca ou o filtro para consultar os serviços."/>}</Panel>
    <ServiceOrderDetailsDialog record={detailRecord} client={clientRecords.find((client) => client.name === detailRecord?.client)} company={company} onClose={() => setDetailRecord(null)} onNotify={onNotify} onOpenAttachment={onOpenAttachment}/>
    <ServiceLifecycleDialog request={lifecycleRequest} onClose={() => setLifecycleRequest(null)} onConfirm={onLifecycle}/>
    <ServiceExecutionDialog record={executionRecord} catalogRecords={catalogRecords} onClose={() => setExecutionRecord(null)} onSave={onExecutionSave}/>
    <ServicePdfDialog record={pdfRecord} client={clientRecords.find((client) => client.name === pdfRecord?.client)} company={company} onNotify={onNotify} onClose={() => setPdfRecord(null)}/>
  </>;
}

function emptyClient(defaultSeller = 'Marina'): ClientRecord {
  return {
    id: '', name: '', legalName: '', tradeName: '', document: '', profile: 'Pessoa jurídica',
    stateRegistration: '', municipalRegistration: '', fiscal: 'Não contribuinte', email: '', phone: '', contactName: '',
    cep: '', street: '', number: '', complement: '', district: '', cityName: '', cityCode: '', state: '', city: '',
    seller: defaultSeller, paymentTerms: 'À vista', orders: 0, revenue: 0, lastPurchase: 'Sem compras', status: 'Ativo',
  };
}

function normalizeClientRecord(client: ClientRecord): ClientRecord {
  return {
    ...client,
    cityCode: resolveMunicipalityCode({
      city: client.cityName || client.city,
      uf: client.state,
      cep: client.cep,
      currentCode: client.cityCode,
    }),
  };
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function ClientFormDialog({ open, client, clientRecords, sellers, defaultSeller, connected, onClose, onSave }: { open: boolean; client: ClientRecord | null; clientRecords: ClientRecord[]; sellers: string[]; defaultSeller: string; connected: boolean; onClose: () => void; onSave: (client: ClientRecord) => Promise<ConfirmedSave> }) {
  const [form, setForm] = useState<ClientRecord>(() => client ? { ...client } : emptyClient(defaultSeller));
  const [error, setError] = useState('');
  const [lookup, setLookup] = useState<{ kind: 'cnpj' | 'cep'; message: string; tone: 'success' | 'error' } | null>(null);
  const [searching, setSearching] = useState<'cnpj' | 'cep' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(client ? { ...client } : emptyClient(defaultSeller));
    setError('');
    setLookup(null);
    setSearching(null);
    setSaving(false);
  }, [client, defaultSeller, open]);

  const update = <K extends keyof ClientRecord>(key: K, value: ClientRecord[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateMunicipality = (patch: Partial<Pick<ClientRecord, 'cityName' | 'state' | 'cep'>>) => {
    setForm((current) => {
      const next = { ...current, ...patch };
      return {
        ...next,
        cityCode: resolveMunicipalityCode({ city: next.cityName, uf: next.state, cep: next.cep }),
      };
    });
    setLookup(null);
  };
  const searchCnpj = async () => {
    const digits = form.document.replace(/\D/g, '');
    if (!isValidCnpj(digits)) { setLookup({ kind: 'cnpj', message: 'Informe um CNPJ válido para consultar.', tone: 'error' }); return; }
    setSearching('cnpj');
    setLookup(null);
    if (!connected) {
      const found = demoCnpjDirectory[digits] ?? clientRecords.find((item) => item.document.replace(/\D/g, '') === digits);
      setSearching(null);
      if (!found) { setLookup({ kind: 'cnpj', message: 'CNPJ não encontrado nos dados locais da demonstração.', tone: 'error' }); return; }
      setForm((current) => ({
        ...current,
        document: formatCnpj(found.document ?? current.document),
        name: found.name ?? current.name,
        legalName: found.legalName ?? current.legalName,
        tradeName: found.tradeName ?? current.tradeName,
        stateRegistration: found.stateRegistration ?? current.stateRegistration,
        municipalRegistration: found.municipalRegistration ?? current.municipalRegistration,
        fiscal: found.fiscal ?? current.fiscal,
        email: found.email ?? current.email,
        phone: found.phone ?? current.phone,
        cep: found.cep ?? current.cep,
        street: found.street ?? current.street,
        number: found.number ?? current.number,
        complement: found.complement ?? current.complement,
        district: found.district ?? current.district,
        cityName: found.cityName ?? current.cityName,
        cityCode: found.cityCode ?? current.cityCode,
        state: found.state ?? current.state,
        city: found.city ?? current.city,
      }));
      setLookup({ kind: 'cnpj', message: 'Dados da empresa preenchidos. Revise antes de salvar.', tone: 'success' });
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch('/api/consultas/cnpj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: digits }),
        cache: 'no-store',
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null) as null | {
        success?: boolean;
        error?: { message?: string };
        data?: {
          razaoSocial?: string | null;
          nomeFantasia?: string | null;
          situacaoCadastral?: string | null;
          endereco?: { logradouro?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null; cep?: string | null; cidade?: string | null; uf?: string | null };
          contatos?: { telefones?: Array<{ ddd?: string | null; numero?: string | null }>; emails?: Array<{ endereco?: string | null }> };
          inscricoesEstaduais?: Array<{ inscricao?: string | null; uf?: string | null; ativa?: boolean | null }>;
        };
      };
      if (!response.ok || !payload?.success || !payload.data) throw new Error(payload?.error?.message || 'Não foi possível consultar o CNPJ.');
      const company = payload.data;
      const address = company.endereco ?? {};
      const cep = formatCep(address.cep ?? '');
      let cityCode = resolveMunicipalityCode({ city: address.cidade ?? '', uf: address.uf ?? '', cep });
      if (cep.replace(/\D/g, '').length === 8) {
        const cepResponse = await fetch(`/api/cep?cep=${cep.replace(/\D/g, '')}`, { cache: 'no-store', signal: controller.signal });
        const cepPayload = await cepResponse.json().catch(() => null) as null | { codigoIbge?: string };
        if (cepResponse.ok && cepPayload?.codigoIbge) cityCode = cepPayload.codigoIbge;
      }
      const state = String(address.uf ?? '').toLocaleUpperCase('pt-BR');
      const stateRegistration = company.inscricoesEstaduais?.find((entry) => entry.ativa !== false && String(entry.uf ?? '').toLocaleUpperCase('pt-BR') === state)?.inscricao ?? '';
      const phone = company.contatos?.telefones?.[0];
      setForm((current) => ({
        ...current,
        document: formatCnpj(digits),
        name: company.nomeFantasia?.trim() || company.razaoSocial?.trim() || current.name,
        legalName: company.razaoSocial?.trim() || current.legalName,
        tradeName: company.nomeFantasia?.trim() || company.razaoSocial?.trim() || current.tradeName,
        stateRegistration: stateRegistration || current.stateRegistration,
        email: company.contatos?.emails?.[0]?.endereco?.trim() || current.email,
        phone: phone ? formatPhone(`${phone.ddd ?? ''}${phone.numero ?? ''}`) : current.phone,
        cep: cep || current.cep,
        street: address.logradouro?.trim() || current.street,
        number: address.numero?.trim() || current.number,
        complement: address.complemento?.trim() || current.complement,
        district: address.bairro?.trim() || current.district,
        cityName: address.cidade?.trim() || current.cityName,
        cityCode: cityCode || current.cityCode,
        state: state || current.state,
        city: address.cidade && state ? `${address.cidade}/${state}` : current.city,
        status: company.situacaoCadastral?.toLocaleUpperCase('pt-BR') === 'ATIVA' ? current.status : 'Revisar cadastro',
      }));
      setLookup({ kind: 'cnpj', message: 'Dados públicos inseridos. Revise contatos, inscrições e endereço antes de salvar.', tone: 'success' });
    } catch (cause) {
      setLookup({ kind: 'cnpj', message: controller.signal.aborted ? 'A consulta demorou mais que o esperado. Tente novamente.' : cause instanceof Error ? cause.message : 'O serviço de consulta está indisponível.', tone: 'error' });
    } finally {
      window.clearTimeout(timeout);
      setSearching(null);
    }
  };
  const searchCep = async () => {
    const digits = form.cep.replace(/\D/g, '');
    if (digits.length !== 8) { setLookup({ kind: 'cep', message: 'Informe os 8 dígitos do CEP.', tone: 'error' }); return; }
    setSearching('cep');
    setLookup(null);
    if (!connected) {
      const found = demoCepDirectory[digits] ?? clientRecords.find((item) => item.cep.replace(/\D/g, '') === digits);
      setSearching(null);
      if (!found) { setLookup({ kind: 'cep', message: 'CEP não encontrado nos dados locais da demonstração.', tone: 'error' }); return; }
      setForm((current) => ({ ...current, cep: formatCep(found.cep), street: found.street, district: found.district, cityName: found.cityName, cityCode: found.cityCode, state: found.state, city: found.city }));
      setLookup({ kind: 'cep', message: 'Endereço preenchido. Informe número e complemento.', tone: 'success' });
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(`/api/cep?cep=${digits}`, { cache: 'no-store', signal: controller.signal });
      const payload = await response.json().catch(() => null) as null | { mensagem?: string; cep?: string; rua?: string; complemento?: string; bairro?: string; cidade?: string; estado?: string; codigoIbge?: string };
      if (!response.ok || !payload) throw new Error(payload?.mensagem || 'CEP não encontrado.');
      const state = String(payload.estado ?? '').toLocaleUpperCase('pt-BR');
      const cityName = String(payload.cidade ?? '').trim();
      setForm((current) => ({ ...current, cep: formatCep(payload.cep || digits), street: payload.rua?.trim() || current.street, complement: current.complement || payload.complemento?.trim() || '', district: payload.bairro?.trim() || current.district, cityName: cityName || current.cityName, cityCode: String(payload.codigoIbge ?? '').replace(/\D/g, '').slice(0, 7), state: state || current.state, city: cityName && state ? `${cityName}/${state}` : current.city }));
      setLookup({ kind: 'cep', message: 'Endereço e município fiscal identificados. Informe o número e revise os dados.', tone: 'success' });
    } catch (cause) {
      setLookup({ kind: 'cep', message: controller.signal.aborted ? 'A consulta demorou mais que o esperado. Tente novamente.' : cause instanceof Error ? cause.message : 'Não foi possível consultar o CEP.', tone: 'error' });
    } finally {
      window.clearTimeout(timeout);
      setSearching(null);
    }
  };
  const save = async () => {
    if (saving) return;
    const documentDigits = form.document.replace(/\D/g, '');
    const isIndividual = form.profile === 'Pessoa física';
    const cepDigits = form.cep.replace(/\D/g, '');
    const cityCode = resolveMunicipalityCode({ city: form.cityName, uf: form.state, cep: form.cep, currentCode: form.cityCode });
    if (isIndividual ? !isValidCpf(documentDigits) : !isValidCnpj(documentDigits)) { setError(`Informe um ${isIndividual ? 'CPF' : 'CNPJ'} válido.`); return; }
    if (!form.legalName.trim() || (!isIndividual && !form.tradeName.trim())) { setError(isIndividual ? 'Informe o nome completo.' : 'Informe a razão social e o nome fantasia.'); return; }
    if (!isValidEmail(form.email)) { setError('Informe um e-mail válido para o contato comercial.'); return; }
    if (![10, 11].includes(form.phone.replace(/\D/g, '').length)) { setError('Informe um telefone com DDD válido.'); return; }
    if (form.fiscal === 'Contribuinte ICMS' && !form.stateRegistration.trim()) { setError('Informe a inscrição estadual do contribuinte de ICMS.'); return; }
    if (cepDigits.length !== 8 || !form.street.trim() || !form.number.trim() || !form.district.trim() || !form.cityName.trim() || form.state.trim().length !== 2) { setError('Complete o CEP, logradouro, número, bairro, cidade e UF.'); return; }
    if (!municipalityIsResolved(cityCode)) { setError('Não foi possível identificar o município fiscal. Use Buscar CEP ou revise cidade e UF.'); return; }
    const duplicate = clientRecords.some((item) => item.id !== form.id && item.document.replace(/\D/g, '') === documentDigits);
    if (duplicate) { setError('Já existe um cliente cadastrado com este CNPJ.'); return; }
    const saved: ClientRecord = {
      ...form,
      id: form.id || `CLI-${Date.now().toString().slice(-6)}`,
      name: form.tradeName.trim() || form.legalName.trim(),
      tradeName: isIndividual ? form.legalName.trim() : form.tradeName.trim(),
      document: isIndividual ? formatCpf(form.document) : formatCnpj(form.document),
      cep: formatCep(form.cep),
      cityCode,
      state: form.state.trim().toLocaleUpperCase('pt-BR').slice(0, 2),
      city: `${form.cityName.trim()}/${form.state.trim().toLocaleUpperCase('pt-BR').slice(0, 2)}`,
    };
    setSaving(true);
    const result = await onSave(saved);
    setSaving(false);
    if (result.ok) {
      onClose();
      return;
    }
    setError(result.message || 'Não foi possível salvar o cliente. Os dados foram mantidos para uma nova tentativa.');
  };

  return <Dialog open={open} title={client ? `Editar ${client.tradeName}` : 'Novo cliente'} description="Cadastro comercial, fiscal, de cobrança e entrega usado em pedidos, orçamentos e notas fiscais." onClose={saving ? () => undefined : onClose}>
    <div className="dialog-body client-form">
      <div className="lookup-notice"><Icon name="search" size={18}/><div><strong>{connected ? 'Consulta cadastral integrada' : 'Busca assistida em demonstração'}</strong><p>{connected ? 'CNPJ e CEP consultam fontes públicas; confirme inscrições, contatos e endereço antes de gravar no perfil.' : 'CNPJ e CEP usam dados locais para validar o fluxo. Teste com CNPJ 74.283.915/0001-98 e CEP 04538-000.'}</p></div></div>
      <section className="client-form-section" aria-labelledby="client-identification-title">
        <div className="client-section-heading"><h3 id="client-identification-title">Identificação fiscal</h3><p>Dados que identificam o destinatário nos documentos fiscais.</p></div>
        <div className="form-grid">
          <label className="field"><span>{form.profile === 'Pessoa física' ? 'CPF' : 'CNPJ'} *</span><div className="lookup-control"><input inputMode="numeric" maxLength={form.profile === 'Pessoa física' ? 14 : 18} value={form.document} onChange={(event) => { update('document', form.profile === 'Pessoa física' ? formatCpf(event.target.value) : formatCnpj(event.target.value)); setLookup(null); }} placeholder={form.profile === 'Pessoa física' ? '000.000.000-00' : '00.000.000/0000-00'}/>{form.profile === 'Pessoa jurídica' && <button type="button" onClick={searchCnpj} disabled={searching === 'cnpj'}>{searching === 'cnpj' ? 'Buscando…' : 'Buscar'}</button>}</div>{lookup?.kind === 'cnpj' && <small className={`lookup-message ${lookup.tone}`} role="status">{lookup.message}</small>}</label>
          <label className="field"><span>Tipo de pessoa *</span><select value={form.profile} onChange={(event) => { const profile = event.target.value as ClientRecord['profile']; setForm((current) => ({ ...current, profile, document: '', tradeName: profile === 'Pessoa física' ? current.legalName : current.tradeName, fiscal: profile === 'Pessoa física' ? 'Consumidor final' : current.fiscal })); setLookup(null); setError(''); }}><option>Pessoa jurídica</option><option>Pessoa física</option></select><small className="field-message">CPF e CNPJ são validados antes da gravação.</small></label>
          <label className="field field-wide"><span>{form.profile === 'Pessoa física' ? 'Nome completo' : 'Razão social'} *</span><input value={form.legalName} onChange={(event) => update('legalName', event.target.value)} placeholder={form.profile === 'Pessoa física' ? 'Nome civil completo' : 'Nome empresarial registrado'}/></label>
          {form.profile === 'Pessoa jurídica' && <label className="field"><span>Nome fantasia *</span><input value={form.tradeName} onChange={(event) => update('tradeName', event.target.value)} placeholder="Nome usado comercialmente"/></label>}
          <label className="field"><span>Indicador fiscal *</span><select value={form.fiscal} onChange={(event) => update('fiscal', event.target.value as ClientRecord['fiscal'])}><option>Contribuinte ICMS</option><option>Consumidor final</option><option>Não contribuinte</option></select></label>
          <label className="field"><span>Inscrição estadual</span><input value={form.stateRegistration} onChange={(event) => update('stateRegistration', event.target.value)} placeholder="Número ou Isento"/></label>
          <label className="field"><span>Inscrição municipal</span><input value={form.municipalRegistration} onChange={(event) => update('municipalRegistration', event.target.value)} placeholder="Quando aplicável"/></label>
        </div>
      </section>
      <section className="client-form-section" aria-labelledby="client-contact-title">
        <div className="client-section-heading"><h3 id="client-contact-title">Contato e relacionamento</h3><p>Informações usadas em propostas, cobranças e acompanhamento.</p></div>
        <div className="form-grid">
          <label className="field"><span>Contato principal</span><input value={form.contactName} onChange={(event) => update('contactName', event.target.value)} placeholder="Nome do contato"/></label>
          <label className="field"><span>Telefone *</span><input inputMode="tel" value={form.phone} onChange={(event) => update('phone', formatPhone(event.target.value))} placeholder="(00) 00000-0000"/></label>
          <label className="field field-wide"><span>E-mail *</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="financeiro@empresa.com.br"/></label>
        </div>
      </section>
      <section className="client-form-section" aria-labelledby="client-address-title">
        <div className="client-section-heading"><h3 id="client-address-title">Endereço de faturamento e entrega</h3><p>O primeiro endereço será usado como padrão nas operações.</p></div>
        <div className="form-grid">
          <label className="field"><span>CEP *</span><div className="lookup-control"><input inputMode="numeric" maxLength={9} value={form.cep} onChange={(event) => updateMunicipality({ cep: formatCep(event.target.value) })} placeholder="00000-000"/><button type="button" onClick={searchCep} disabled={searching === 'cep'}>{searching === 'cep' ? 'Buscando…' : 'Buscar'}</button></div>{lookup?.kind === 'cep' && <small className={`lookup-message ${lookup.tone}`} role="status">{lookup.message}</small>}</label>
          <label className="field"><span>Logradouro *</span><input value={form.street} onChange={(event) => update('street', event.target.value)} placeholder="Rua, avenida ou estrada"/></label>
          <label className="field"><span>Número *</span><input value={form.number} onChange={(event) => update('number', event.target.value)} placeholder="Número ou S/N"/></label>
          <label className="field"><span>Complemento</span><input value={form.complement} onChange={(event) => update('complement', event.target.value)} placeholder="Sala, bloco, conjunto"/></label>
          <label className="field"><span>Bairro *</span><input value={form.district} onChange={(event) => update('district', event.target.value)} placeholder="Bairro"/></label>
          <label className="field"><span>Cidade *</span><input value={form.cityName} onChange={(event) => updateMunicipality({ cityName: event.target.value })} placeholder="Município"/></label>
          <label className="field"><span>UF *</span><input maxLength={2} value={form.state} onChange={(event) => updateMunicipality({ state: event.target.value.toLocaleUpperCase('pt-BR') })} placeholder="SP"/><small className={`field-message${municipalityIsResolved(form.cityCode) ? '' : ' error'}`} role="status">{municipalityIsResolved(form.cityCode) ? 'Município fiscal identificado automaticamente.' : 'Busque o CEP ou revise cidade e UF para identificar o município fiscal.'}</small></label>
        </div>
      </section>
      <section className="client-form-section" aria-labelledby="client-commercial-title">
        <div className="client-section-heading"><h3 id="client-commercial-title">Preferências comerciais</h3><p>Responsável, prazo padrão e situação do relacionamento.</p></div>
        <div className="form-grid">
          <label className="field"><span>Vendedor responsável</span><select value={form.seller} onChange={(event) => update('seller', event.target.value)}>{sellers.map((seller) => <option key={seller}>{seller}</option>)}</select></label>
          <label className="field"><span>Condição padrão</span><select value={form.paymentTerms} onChange={(event) => update('paymentTerms', event.target.value)}><option>À vista</option><option>7 dias</option><option>14 dias</option><option>28 dias</option><option>30 dias</option></select></label>
          <label className="field"><span>Status</span><select value={form.status} onChange={(event) => update('status', event.target.value as ClientRecord['status'])}><option>Ativo</option><option>Revisar cadastro</option><option>Inativo</option></select></label>
        </div>
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="button primary" onClick={() => void save()} disabled={saving}>{saving ? 'Salvando…' : client ? 'Salvar alterações' : 'Cadastrar cliente'}</button></footer>
  </Dialog>;
}

function SupplierFormDialog({ open, suppliers, onClose, onSave }: { open: boolean; suppliers: SupplierRecord[]; onClose: () => void; onSave: (supplier: SupplierRecord) => Promise<ConfirmedSave> }) {
  const [form, setForm] = useState({ name: '', document: '', contactName: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setForm({ name: '', document: '', contactName: '', email: '', phone: '' });
    setError('');
    setSaving(false);
  }, [open]);
  if (!open) return null;
  const update = (field: keyof typeof form, value: string) => { setForm((current) => ({ ...current, [field]: value })); setError(''); };
  const save = async () => {
    if (saving) return;
    const documentDigits = form.document.replace(/\D/g, '');
    if (!form.name.trim()) { setError('Informe a razão social ou o nome do fornecedor.'); return; }
    if (documentDigits && !isValidCnpj(documentDigits)) { setError('Informe um CNPJ válido ou deixe o campo em branco.'); return; }
    if (documentDigits && suppliers.some((supplier) => supplier.document.replace(/\D/g, '') === documentDigits)) { setError('Já existe um fornecedor cadastrado com este CNPJ.'); return; }
    if (form.email.trim() && !isValidEmail(form.email)) { setError('Informe um e-mail válido ou deixe o campo em branco.'); return; }
    if (form.phone.trim() && ![10, 11].includes(form.phone.replace(/\D/g, '').length)) { setError('Informe um telefone com DDD válido ou deixe o campo em branco.'); return; }
    setSaving(true);
    const result = await onSave({ id: `FOR-${Date.now().toString().slice(-6)}`, name: form.name.trim(), document: documentDigits ? formatCnpj(documentDigits) : '', contactName: form.contactName.trim(), email: form.email.trim(), phone: formatPhone(form.phone), active: true });
    setSaving(false);
    if (result.ok) {
      onClose();
      return;
    }
    setError(result.message || 'Não foi possível salvar o fornecedor. Os dados foram mantidos para uma nova tentativa.');
  };
  return <Dialog open title="Novo fornecedor" description="Cadastre o parceiro que poderá ser identificado nas compras e entradas de estoque deste perfil." onClose={saving ? () => undefined : onClose}>
    <div className="dialog-body client-form">
      <section className="client-form-section" aria-labelledby="supplier-identification-title">
        <div className="client-section-heading"><h3 id="supplier-identification-title">Identificação e contato</h3><p>O cadastro fica vinculado exclusivamente ao perfil empresarial acessado.</p></div>
        <div className="form-grid">
          <label className="field field-wide"><span>Razão social ou nome *</span><input autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Nome usado para identificar o fornecedor"/></label>
          <label className="field"><span>CNPJ</span><input inputMode="numeric" maxLength={18} value={form.document} onChange={(event) => update('document', formatCnpj(event.target.value))} placeholder="00.000.000/0000-00"/></label>
          <label className="field"><span>Contato principal</span><input value={form.contactName} onChange={(event) => update('contactName', event.target.value)} placeholder="Nome do contato"/></label>
          <label className="field"><span>Telefone</span><input inputMode="tel" value={form.phone} onChange={(event) => update('phone', formatPhone(event.target.value))} placeholder="(00) 00000-0000"/></label>
          <label className="field"><span>E-mail</span><input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="compras@fornecedor.com.br"/></label>
        </div>
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="button primary" onClick={() => void save()} disabled={saving}>{saving ? 'Salvando…' : 'Cadastrar fornecedor'}</button></footer>
  </Dialog>;
}

function operationBelongsToClient(record: CreatedRecord, client: ClientRecord) {
  if (record.persistence?.customerId && client.id) return record.persistence.customerId === client.id;
  return normalizeSearch(record.client) === normalizeSearch(client.name);
}

function clientOperationSnapshot(client: ClientRecord, records: CreatedRecord[], financialRecords: ReceivableRecord[]) {
  const operations = records.filter((record) => operationBelongsToClient(record, client));
  const completed = operations.filter((record) => record.status === 'Faturado' || record.status === 'Concluído');
  const receivableRows = financialRecords.filter((record) => normalizeSearch(record.client) === normalizeSearch(client.name));
  const lastOperation = [...operations].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return {
    operations,
    operationCount: operations.length,
    revenue: completed.reduce((sum, record) => sum + record.total, 0),
    openReceivables: receivableRows.reduce((sum, record) => sum + receivableBalance(record), 0),
    receivableCount: receivableRows.length,
    lastOperationAt: lastOperation?.createdAt || '',
  };
}

function ClientReportDialog({ client, createdRecords, receivableRecords, onClose, onNewOrder, onNewService, onNewQuote }: { client: ClientRecord | null; createdRecords: CreatedRecord[]; receivableRecords: ReceivableRecord[]; onClose: () => void; onNewOrder: (client: ClientRecord) => void; onNewService: (client: ClientRecord) => void; onNewQuote: (client: ClientRecord) => void }) {
  if (!client) return null;
  const snapshot = clientOperationSnapshot(client, createdRecords, receivableRecords);
  const averageTicket = snapshot.operationCount ? snapshot.revenue / snapshot.operationCount : 0;
  return <Dialog open title={`Relatório de ${client.tradeName}`} description="Visão consolidada do relacionamento comercial, operacional e financeiro deste cliente." onClose={onClose}>
    <div className="dialog-body client-report">
      <div className="client-profile-head"><div><span>{client.id}</span><h3>{client.legalName}</h3><p>{client.document} · {client.city}</p></div><Badge tone={client.status === 'Ativo' ? 'success' : 'warning'}>{client.status}</Badge></div>
      <div className="client-report-metrics">
        <div><span>Faturamento</span><strong>{money(snapshot.revenue)}</strong><small>Pedidos faturados e serviços concluídos</small></div>
        <div><span>Operações</span><strong>{snapshot.operationCount}</strong><small>Ticket médio {money(averageTicket)}</small></div>
        <div><span>Em aberto</span><strong>{money(snapshot.openReceivables)}</strong><small>{snapshot.receivableCount} lançamentos</small></div>
        <div><span>Última operação</span><strong>{snapshot.lastOperationAt ? new Date(snapshot.lastOperationAt).toLocaleDateString('pt-BR') : 'Sem operações'}</strong><small>Responsável: {client.seller || 'Não definido'}</small></div>
      </div>
      <div className="client-report-grid">
        <section><h4>Contato e faturamento</h4><dl><div><dt>Contato</dt><dd>{client.contactName || 'Não informado'}</dd></div><div><dt>E-mail</dt><dd>{client.email}</dd></div><div><dt>Telefone</dt><dd>{client.phone}</dd></div><div><dt>Endereço</dt><dd>{client.street}, {client.number}{client.complement ? ` · ${client.complement}` : ''}<br/>{client.district} · {client.city} · {client.cep}</dd></div></dl></section>
        <section><h4>Perfil comercial e fiscal</h4><dl><div><dt>Indicador fiscal</dt><dd>{client.fiscal}</dd></div><div><dt>Inscrição estadual</dt><dd>{client.stateRegistration || 'Não informada'}</dd></div><div><dt>Prazo padrão</dt><dd>{client.paymentTerms}</dd></div><div><dt>Vendedor</dt><dd>{client.seller}</dd></div></dl></section>
      </div>
      <section className="client-history"><div className="client-section-heading"><h3>Histórico recente</h3><p>Pedidos, orçamentos e serviços vinculados ao cadastro deste perfil.</p></div>{snapshot.operations.length > 0 ? <Table headers={['Registro', 'Data ou agenda', 'Tipo', 'Situação', 'Valor']} minWidth={0} className="client-history-table"><>{snapshot.operations.map((record) => <tr key={record.id}><td data-label="Registro"><strong>{record.id}</strong></td><td data-label="Data ou agenda">{record.serviceOrder?.scheduledDate ? displayIsoDate(record.serviceOrder.scheduledDate) : new Date(record.createdAt).toLocaleDateString('pt-BR')}</td><td data-label="Tipo">{documentLabel(record.type)}</td><td data-label="Situação"><Badge>{record.status || 'Salvo'}</Badge></td><td data-label="Valor" className="numeric"><strong>{money(record.total)}</strong></td></tr>)}</></Table> : <EmptyState title="Cliente sem operações" description="O primeiro pedido, orçamento ou serviço passará a compor este histórico."/>}</section>
    </div>
    <footer className="dialog-footer client-report-footer"><button type="button" className="button secondary" onClick={onClose}>Fechar</button><button type="button" className="button secondary" onClick={() => { onClose(); onNewQuote(client); }}>Novo orçamento</button><button type="button" className="button secondary" onClick={() => { onClose(); onNewService(client); }}>Nova OS</button><button type="button" className="button primary" onClick={() => { onClose(); onNewOrder(client); }}>Novo pedido</button></footer>
  </Dialog>;
}

function ClientRecordActions({ client, onEdit, onReport, onNewOrder, onNewService, onNewQuote, onNotify }: { client: ClientRecord; onEdit: () => void; onReport: () => void; onNewOrder: () => void; onNewService: () => void; onNewQuote: () => void; onNotify: (message: string) => void }) {
  const copyData = () => {
    const content = `${client.legalName}\nCNPJ: ${client.document}\n${client.street}, ${client.number}${client.complement ? `, ${client.complement}` : ''}\n${client.city} · CEP ${client.cep}\n${client.email} · ${client.phone}`;
    if (!navigator.clipboard) { onNotify('A cópia não está disponível neste navegador.'); return; }
    void navigator.clipboard.writeText(content).then(() => onNotify('Dados cadastrais copiados.')).catch(() => onNotify('Não foi possível copiar os dados cadastrais.'));
  };
  const actions: RecordAction[] = [
    { label: 'Novo pedido', description: 'Inicia um pedido com o cliente já selecionado', icon: 'sale', onSelect: onNewOrder, permission: 'sales.create' },
    { label: 'Novo orçamento', description: 'Abre uma proposta comercial para este cliente', icon: 'document', onSelect: onNewQuote, permission: 'sales.create' },
    { label: 'Nova ordem de serviço', description: 'Abre a agenda com o cliente já selecionado', icon: 'service', onSelect: onNewService, permission: 'services.create' },
    { label: 'Editar cadastro', description: 'Atualiza dados fiscais, contato, endereço e preferências', icon: 'edit', onSelect: onEdit, permission: 'clients.edit' },
    { label: 'Relatório do cliente', description: 'Faturamento, ticket, pendências e histórico consolidado', icon: 'chart', onSelect: onReport, permission: 'clients.reports' },
    { label: 'Histórico comercial', description: 'Pedidos, orçamentos e serviços vinculados ao cadastro', icon: 'clock', onSelect: onReport, permission: 'clients.reports' },
    { label: 'Copiar dados cadastrais', description: 'CNPJ, endereço e contatos prontos para uso', icon: 'copy', onSelect: copyData },
  ];
  return <RecordActionsDialog title={`Ações de ${client.tradeName}`} description="Crie novas operações ou consulte tudo o que já está relacionado a este cliente." actions={actions} triggerLabel={`Ações de ${client.tradeName}`}/>;
}

function ClientsView({ clientRecords, createdRecords, receivableRecords, settings, connected, onSave, onNewOrder, onNewService, onNewQuote, onNotify }: { clientRecords: ClientRecord[]; createdRecords: CreatedRecord[]; receivableRecords: ReceivableRecord[]; settings: ModuleSettings; connected: boolean; onSave: (client: ClientRecord) => Promise<ConfirmedSave>; onNewOrder: (client: ClientRecord) => void; onNewService: (client: ClientRecord) => void; onNewQuote: (client: ClientRecord) => void; onNotify: (message: string) => void }) {
  const { can } = useContext(PermissionContext);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [reportClient, setReportClient] = useState<ClientRecord | null>(null);
  const normalizedQuery = normalizeSearch(query);
  const records = clientRecords.filter((client) => normalizeSearch(`${client.id} ${client.name} ${client.legalName} ${client.document} ${client.city} ${client.email}`).includes(normalizedQuery) && (status === 'Todos' || client.status === status));
  const active = clientRecords.filter((client) => client.status === 'Ativo').length;
  const reviewed = clientRecords.filter((client) => client.status === 'Revisar cadastro').length;
  const clientSnapshots = useMemo(() => new Map(clientRecords.map((client) => [client.id, clientOperationSnapshot(client, createdRecords, receivableRecords)])), [clientRecords, createdRecords, receivableRecords]);
  const totalRevenue = [...clientSnapshots.values()].reduce((sum, snapshot) => sum + snapshot.revenue, 0);
  const totalOrders = [...clientSnapshots.values()].reduce((sum, snapshot) => sum + snapshot.operationCount, 0);
  return <>
    <PageHeading view="clientes" action={<button type="button" className="button primary" disabled={!can('clients.create')} title={!can('clients.create') ? 'Usuário sem permissão para cadastrar clientes' : undefined} onClick={() => { setEditingClient(null); setFormOpen(true); }}><Icon name="plus" size={18}/> Novo cliente</button>}/>
    <div className="metric-grid compact">
      <Metric label="Clientes cadastrados" value={String(clientRecords.length)} note={`${active} ativos`}/>
      <Metric label="Pedidos vinculados" value={String(totalOrders)} note="Histórico da carteira" tone="cyan"/>
      <Metric label="Faturamento da carteira" value={money(totalRevenue)} note="Operações cadastradas" tone="success"/>
      <Metric label="Cadastros a revisar" value={String(reviewed)} note="Dados fiscais incompletos" tone="warning"/>
    </div>
    <div className="client-module-note"><Icon name="users" size={19}/><p><strong>Cadastro único para toda a operação.</strong> Os dados salvos aqui abastecem pedidos, orçamentos, serviços, cobrança e emissão fiscal.</p><Badge tone="info">CNPJ + CEP</Badge></div>
    <Panel title="Carteira de clientes" subtitle="Dados comerciais, fiscais, de cobrança e entrega">
      <SearchToolbar value={query} onChange={setQuery}><select aria-label="Status do cliente" value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos</option><option>Ativo</option><option>Revisar cadastro</option><option>Inativo</option></select></SearchToolbar>
      <Table headers={['Cliente', 'CNPJ', 'Contato e cidade', 'Perfil fiscal', 'Histórico', 'Status', 'Ações']} minWidth={0} className="client-table">
        <>{records.map((client) => { const snapshot = clientSnapshots.get(client.id); return <tr key={client.id}>
          <td data-label="Cliente"><div className="client-name-cell"><strong>{client.tradeName}</strong><small>{client.id} · {client.legalName}</small></div></td>
          <td data-label="CNPJ" className="client-document-cell">{client.document}</td>
          <td data-label="Contato e cidade"><div className="client-contact-cell"><strong>{client.contactName || 'Não informado'}</strong><small>{client.email}</small><small>{client.city}</small></div></td>
          <td data-label="Perfil fiscal" className="client-fiscal-cell">{client.fiscal}</td>
          <td data-label="Histórico"><div className="client-history-cell"><strong>{snapshot?.operationCount ?? 0} {(snapshot?.operationCount ?? 0) === 1 ? 'operação' : 'operações'}</strong><small>{money(snapshot?.revenue ?? 0)}</small></div></td>
          <td data-label="Status"><Badge>{client.status}</Badge></td>
          <td data-label="Ações" className="client-actions-cell"><ClientRecordActions client={client} onEdit={() => { setEditingClient(client); setFormOpen(true); }} onReport={() => setReportClient(client)} onNewOrder={() => onNewOrder(client)} onNewService={() => onNewService(client)} onNewQuote={() => onNewQuote(client)} onNotify={onNotify}/></td>
        </tr>; })}</>
      </Table>
      {records.length === 0 && <EmptyState title="Nenhum cliente encontrado" description="Ajuste a busca ou o filtro para consultar a carteira."/>}
    </Panel>
    <ClientFormDialog open={formOpen} client={editingClient} clientRecords={clientRecords} sellers={settings.commercial.sellers} defaultSeller={settings.commercial.defaultSeller} connected={connected} onClose={() => setFormOpen(false)} onSave={onSave}/>
    <ClientReportDialog client={reportClient} createdRecords={createdRecords} receivableRecords={receivableRecords} onClose={() => setReportClient(null)} onNewOrder={onNewOrder} onNewService={onNewService} onNewQuote={onNewQuote}/>
  </>;
}

function CatalogView({ catalogRecords, onSave, onNavigate, onOpenCosts, onNewOrder, onNewService, onNewQuote }: { catalogRecords: CatalogItem[]; onSave: (item: CatalogItem) => void; onNavigate: (view: View) => void; onOpenCosts: () => void; onNewOrder: (item: CatalogItem) => void; onNewService: (item: CatalogItem) => void; onNewQuote: (item: CatalogItem) => void }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [fiscalFilter, setFiscalFilter] = useState('Todos');
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const normalizedQuery = normalizeSearch(query);
  const records = catalogRecords.filter((item) => {
    const evaluation = evaluateCatalogTaxProfile(item);
    const matchesQuery = normalizeSearch(`${item.sku} ${item.name} ${item.category} ${item.description} ${item.ncm} ${item.cest} ${item.municipalServiceCode} ${item.nationalServiceCode} ${item.nbs} ${item.cfopInternal} ${item.cfopInterstate} ${item.icmsCode} ${item.ibsCbsClassification}`).includes(normalizedQuery);
    const matchesType = typeFilter === 'Todos' || (typeFilter === 'Produtos' ? item.category !== 'Serviço' : item.category === 'Serviço');
    const matchesStatus = statusFilter === 'Todos' || item.saleStatus === statusFilter;
    const matchesFiscal = fiscalFilter === 'Todos' || (fiscalFilter === 'Base pronta' ? evaluation.coreReady : fiscalFilter === 'IBS/CBS pendente' ? !evaluation.reformReady : !evaluation.coreReady);
    return matchesQuery && matchesType && matchesStatus && matchesFiscal;
  });
  const products = catalogRecords.filter((item) => item.category !== 'Serviço');
  const services = catalogRecords.filter((item) => item.category === 'Serviço');
  const averageMargin = catalogRecords.length ? catalogRecords.reduce((sum, item) => sum + (item.price ? (item.price - item.cost) / item.price * 100 : 0), 0) / catalogRecords.length : 0;
  const taxEvaluations = catalogRecords.map((item) => evaluateCatalogTaxProfile(item));
  const fiscalReview = taxEvaluations.filter((evaluation) => !evaluation.coreReady).length;
  const reformReview = taxEvaluations.filter((evaluation) => !evaluation.reformReady).length;
  return <>
    <PageHeading view="catalogo" action={<button type="button" className="button secondary" onClick={onOpenCosts}><Icon name="chart" size={18}/> Abrir origem em Custos</button>}/>
    <div className="integration-banner"><span><Icon name="box"/></span><div><strong>Custos e Precificação é a fonte oficial do catálogo</strong><p>Código, nome, unidade, custo e preço são publicados por Custos. Vendas mantém somente disponibilidade comercial, operação e complemento fiscal.</p></div><Badge tone="info">Sem cadastro duplicado</Badge></div>
    <div className="metric-grid compact"><Metric label="Produtos publicados" value={String(products.length)} note={`${products.filter((item) => item.saleStatus === 'Ativo').length} ativos`}/><Metric label="Serviços publicados" value={String(services.length)} note={`${services.filter((item) => item.saleStatus === 'Ativo').length} ${services.filter((item) => item.saleStatus === 'Ativo').length === 1 ? 'ativo' : 'ativos'}`} tone="cyan"/><Metric label="Margem média publicada" value={percent(averageMargin)} note="Calculada sobre o preço atual" tone="success"/><Metric label="Perfis a revisar" value={String(fiscalReview)} note={`${reformReview} com IBS/CBS pendente`} tone="warning"/></div>
    <Panel title="Catálogo comercial" subtitle="Itens publicados por Custos e complementados para venda, estoque e fiscal">
      <SearchToolbar value={query} onChange={setQuery} placeholder="Buscar por código, produto, serviço ou dado fiscal">
        <select aria-label="Tipo de item" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option>Todos</option><option>Produtos</option><option>Serviços</option></select>
        <select aria-label="Situação comercial" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos</option><option>Ativo</option><option>Pausado</option></select>
        <select aria-label="Situação fiscal" value={fiscalFilter} onChange={(event) => setFiscalFilter(event.target.value)}><option>Todos</option><option>Base pronta</option><option>A revisar</option><option>IBS/CBS pendente</option></select>
      </SearchToolbar>
      <Table headers={['Produto ou serviço', 'Valores publicados', 'Operação', 'Fiscal', 'Sincronização', 'Status', 'Ações']} minWidth={0} className="catalog-table">
        <>{records.map((item) => {
          const margin = item.price ? (item.price - item.cost) / item.price * 100 : 0;
          const isService = item.category === 'Serviço';
          const taxEvaluation = evaluateCatalogTaxProfile(item);
          return <tr key={item.sku}>
            <td data-label="Item"><div className="catalog-item-cell"><strong>{item.name}</strong><small>{item.sku} · {item.category} · {item.unit}</small></div></td>
            <td data-label="Valores"><div className="catalog-values-cell"><span><small>Custo</small><strong>{money(item.cost)}</strong></span><span><small>Venda</small><strong>{money(item.price)}</strong></span><Badge tone="success">{percent(margin)}</Badge></div></td>
            <td data-label="Operação"><div className="catalog-operation-cell"><strong>{isService ? 'Sem estoque físico' : `${item.available} ${item.unit} disponíveis`}</strong><small>{isService ? 'Usado em orçamento, pedido e OS' : `${item.reserved} ${item.unit} reservados · mínimo ${item.minimum}`}</small></div></td>
            <td data-label="Fiscal"><div className="catalog-fiscal-cell"><Badge tone={taxEvaluation.coreReady ? 'success' : 'warning'}>{taxEvaluation.coreReady ? 'Base pronta' : taxEvaluation.status}</Badge><small>IBS/CBS {taxEvaluation.reformReady ? 'revisado' : 'pendente'} · {taxEvaluation.completion}%</small></div></td>
            <td data-label="Sincronização"><div className="catalog-sync-cell"><Badge tone={item.syncStatus === 'Sincronizado' ? 'success' : 'warning'}>{item.syncStatus}</Badge><small>{item.syncedAt}</small></div></td>
            <td data-label="Status"><Badge tone={item.saleStatus === 'Ativo' ? 'success' : 'neutral'}>{item.saleStatus}</Badge></td>
            <td data-label="Ações" className="catalog-actions-cell"><CatalogRecordActions item={item} onNavigate={onNavigate} onEdit={() => setEditingItem(item)} onNewOrder={() => onNewOrder(item)} onNewService={() => onNewService(item)} onNewQuote={() => onNewQuote(item)}/></td>
          </tr>;
        })}</>
      </Table>
      {records.length === 0 && <EmptyState title="Nenhum item encontrado" description="Ajuste a busca ou os filtros para consultar o catálogo comercial."/>}
    </Panel>
    <CatalogItemDialog item={editingItem} onClose={() => setEditingItem(null)} onSave={onSave}/>
  </>;
}

type StockMovementMode = 'entrada' | 'saida';

function stockDateLabel(date: string) {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year} ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
}

function StockMovementForm({ mode, products, suppliers, initialItem, settings, onClose, onSave }: { mode: StockMovementMode; products: CatalogItem[]; suppliers: SupplierRecord[]; initialItem: CatalogItem | null; settings: ModuleSettings; onClose: () => void; onSave: (item: CatalogItem, movement: StockMovementRecord) => Promise<ConfirmedSave> }) {
  const [sku, setSku] = useState(initialItem?.sku ?? products[0]?.sku ?? '');
  const [nature, setNature] = useState(mode === 'entrada' ? settings.stock.defaultEntryReason : settings.stock.defaultExitReason);
  const [quantity, setQuantity] = useState('1');
  const [date, setDate] = useState(() => todayIso());
  const [reference, setReference] = useState('');
  const [partner, setPartner] = useState('');
  const [location, setLocation] = useState(settings.stock.defaultLocation);
  const [lot, setLot] = useState('');
  const [expiry, setExpiry] = useState('');
  const availableUsers = [...new Set([...settings.commercial.sellers, ...settings.services.technicians])];
  const [user, setUser] = useState(settings.commercial.defaultSeller);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const selected = products.find((item) => item.sku === sku);
  const result = selected ? applyStockMovement({ current: selected.current, reserved: selected.reserved, quantity: commercialNumber(quantity), direction: mode, allowNegativeStock: settings.stock.allowNegativeStock, protectReservations: settings.stock.protectReservations }) : null;
  const errors = [...(!selected ? ['Selecione um produto.'] : []), ...(!date ? ['Informe a data da movimentação.'] : []), ...(settings.stock.requireMovementReference && !reference.trim() ? ['Informe o documento ou referência da movimentação.'] : []), ...(result?.errors ?? [])];
  if (date && (!isValidIsoDate(date) || date > todayIso())) errors.push('A data da movimentação deve ser válida e não pode estar no futuro.');
  if (!location.trim()) errors.push('Selecione um local de estoque.');
  if (!user.trim()) errors.push('Selecione o responsável pela movimentação.');
  if (!nature.trim()) errors.push('Selecione o tipo de movimentação.');
  if (mode === 'entrada' && /compra/i.test(nature) && !partner.trim()) errors.push('Informe o fornecedor da entrada de compra.');
  if (expiry && (!isValidIsoDate(expiry) || expiry < date)) errors.push('A validade do lote não pode ser anterior à entrada.');
  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    setSaveError('');
    if (!selected || !result?.valid || errors.length || !date || (settings.stock.requireMovementReference && !reference.trim())) return;
    const now = new Date();
    const movement: StockMovementRecord = {
      id: `MOV-${now.getTime().toString().slice(-7)}`,
      date: stockDateLabel(date),
      createdAt: now.toISOString(),
      origin: reference.trim() || `${mode === 'entrada' ? 'ENT' : 'SAI'}-${now.getTime().toString().slice(-6)}`,
      type: nature,
      direction: mode,
      sku: selected.sku,
      item: selected.name,
      quantity: result.delta,
      balance: result.nextCurrent,
      user,
      location,
      partner: partner.trim(),
      document: reference.trim(),
      lot: settings.stock.trackLot ? lot.trim() : '',
      expiry: settings.stock.trackExpiry ? expiry : '',
      notes: notes.trim(),
    };
    setSaving(true);
    const saved = await onSave({ ...selected, current: result.nextCurrent, available: result.nextAvailable }, movement);
    setSaving(false);
    if (saved.ok) {
      onClose();
      return;
    }
    setSaveError(saved.message);
    setSubmitted(true);
  };
  const entryTypes = settings.stock.entryReasons;
  const exitTypes = settings.stock.exitReasons;
  return <Dialog open title={mode === 'entrada' ? 'Registrar entrada de estoque' : 'Registrar saída manual'} description={mode === 'entrada' ? 'Informe a origem da entrada para atualizar o saldo com rastreabilidade.' : 'Saídas manuais são bloqueadas quando comprometem unidades reservadas.'} onClose={saving ? () => undefined : onClose}>
    <div className="dialog-body stock-form">
      <div className="stock-form-notice"><Icon name={mode === 'entrada' ? 'plus' : 'warning'} size={19}/><div><strong>{mode === 'entrada' ? 'Entrada sem vínculo financeiro automático' : 'Saída operacional excepcional'}</strong><p>{mode === 'entrada' ? 'Compras futuras poderão originar esta movimentação. Nesta etapa, documento, fornecedor e lote são informados manualmente.' : 'Vendas confirmadas usarão baixa automática. Utilize esta opção para consumo, perda, devolução ou ajuste.'}</p></div></div>
      <div className="form-grid">
        <label className="field field-wide"><span>Produto *</span><select value={sku} onChange={(event) => { setSku(event.target.value); setSubmitted(false); }}>{products.map((item) => <option key={item.sku} value={item.sku}>{item.sku} · {item.name} · disponível {item.available} {item.unit}</option>)}</select></label>
        <label className="field"><span>Tipo de movimentação</span><select value={nature} onChange={(event) => setNature(event.target.value)}>{(mode === 'entrada' ? entryTypes : exitTypes).map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="field"><span>Quantidade *</span><input inputMode="decimal" value={quantity} onChange={(event) => { setQuantity(event.target.value); setSubmitted(false); }} aria-invalid={submitted && !(commercialNumber(quantity) > 0)}/></label>
        <label className="field"><span>Data da movimentação *</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setSubmitted(false); }} aria-invalid={submitted && !date}/></label>
        <label className="field"><span>Local de estoque</span><select value={location} onChange={(event) => setLocation(event.target.value)}>{settings.stock.locations.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Documento ou referência{settings.stock.requireMovementReference ? ' *' : ''}</span><input value={reference} onChange={(event) => { setReference(event.target.value); setSubmitted(false); }} placeholder={mode === 'entrada' ? 'NF, pedido de compra ou produção' : 'Requisição, ocorrência ou devolução'} aria-invalid={submitted && settings.stock.requireMovementReference && !reference.trim()}/></label>
        <label className="field"><span>{mode === 'entrada' ? 'Fornecedor ou origem' : 'Destino ou responsável'}</span><input list={mode === 'entrada' ? 'stock-suppliers' : undefined} value={partner} onChange={(event) => setPartner(event.target.value)} placeholder={mode === 'entrada' ? 'Nome do fornecedor ou produção interna' : 'Setor, fornecedor ou responsável'}/>{mode === 'entrada' && <datalist id="stock-suppliers">{suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.name}>{supplier.document}</option>)}</datalist>}</label>
        {settings.stock.trackLot && <label className="field"><span>Lote</span><input value={lot} onChange={(event) => setLot(event.target.value)} placeholder="Identificação do lote"/></label>}
        {settings.stock.trackExpiry && <label className="field"><span>Validade</span><input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)}/></label>}
        <label className="field"><span>Responsável</span><select value={user} onChange={(event) => setUser(event.target.value)}>{availableUsers.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className="field field-wide"><span>Observações</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Conferência, avaria, recebimento parcial ou outra informação operacional"/></label>
      </div>
      {selected && result && <div className="stock-balance-preview" role="status"><div><span>Saldo físico</span><strong>{selected.current} {selected.unit}</strong></div><div><span>Reservado</span><strong>{selected.reserved} {selected.unit}</strong></div><div><span>{mode === 'entrada' ? 'Entrada' : 'Saída'}</span><strong className={mode === 'entrada' ? 'positive' : 'negative'}>{mode === 'entrada' ? '+' : '−'}{commercialNumber(quantity)} {selected.unit}</strong></div><div><span>Novo disponível</span><strong>{result.nextAvailable} {selected.unit}</strong></div></div>}
      {submitted && errors.length > 0 && <div className="validation-result" role="alert"><div className="validation-title"><Icon name="warning" size={17}/><strong>Revise a movimentação</strong></div>{errors.map((error) => <p key={error}>{error}</p>)}</div>}
      {saveError && <p className="form-error" role="alert">{saveError}</p>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="button primary" onClick={() => void save()} disabled={saving}>{saving ? 'Confirmando…' : mode === 'entrada' ? 'Confirmar entrada' : 'Confirmar saída'}</button></footer>
  </Dialog>;
}

function StockInventoryForm({ products, initialItem, settings, onClose, onSave }: { products: CatalogItem[]; initialItem: CatalogItem | null; settings: ModuleSettings; onClose: () => void; onSave: (item: CatalogItem, movement: StockMovementRecord) => Promise<ConfirmedSave> }) {
  const [sku, setSku] = useState(initialItem?.sku ?? products[0]?.sku ?? '');
  const selected = products.find((item) => item.sku === sku);
  const [counted, setCounted] = useState(String(initialItem?.current ?? products[0]?.current ?? 0));
  const [date, setDate] = useState(() => todayIso());
  const [location, setLocation] = useState(settings.stock.defaultLocation);
  const [reason, setReason] = useState(settings.stock.defaultInventoryReason);
  const availableUsers = [...new Set([...settings.commercial.sellers, ...settings.services.technicians])];
  const [user, setUser] = useState(settings.services.defaultTechnician);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const result = selected ? calculateInventoryCount({ current: selected.current, reserved: selected.reserved, counted: parseCommercialNumber(counted) ?? Number.NaN, protectReservations: settings.stock.protectReservations }) : null;
  const errors = [...(!selected ? ['Selecione um produto.'] : []), ...(!date ? ['Informe a data da contagem.'] : []), ...(result?.errors ?? [])];
  if (date && (!isValidIsoDate(date) || date > todayIso())) errors.push('A data da contagem deve ser válida e não pode estar no futuro.');
  if (!location.trim()) errors.push('Selecione um local de estoque.');
  if (!reason.trim()) errors.push('Selecione o motivo do inventário.');
  if (!user.trim()) errors.push('Selecione o responsável pela contagem.');
  const selectItem = (nextSku: string) => {
    const next = products.find((item) => item.sku === nextSku);
    setSku(nextSku);
    setCounted(String(next?.current ?? 0));
    setSubmitted(false);
  };
  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    setSaveError('');
    if (!selected || !result?.valid || errors.length || !date) return;
    const now = new Date();
    const reference = `INV-${now.getTime().toString().slice(-6)}`;
    const movement: StockMovementRecord = {
      id: `MOV-${now.getTime().toString().slice(-7)}`,
      date: stockDateLabel(date),
      createdAt: now.toISOString(),
      origin: reference,
      type: result.adjustment === 0 ? 'Inventário sem divergência' : 'Ajuste de inventário',
      direction: 'inventario',
      sku: selected.sku,
      item: selected.name,
      quantity: result.adjustment,
      balance: result.nextCurrent,
      user,
      location,
      partner: '',
      document: reference,
      lot: '',
      expiry: '',
      notes: [reason, notes.trim()].filter(Boolean).join(' · '),
    };
    setSaving(true);
    const saved = await onSave({ ...selected, current: result.nextCurrent, available: result.nextAvailable }, movement);
    setSaving(false);
    if (saved.ok) onClose();
    else setSaveError(saved.message);
  };
  return <Dialog open title="Novo inventário" description="Registre a contagem física e preserve a divergência como movimento auditável." onClose={saving ? () => undefined : onClose}>
    <div className="dialog-body stock-form">
      <div className="stock-form-notice"><Icon name="stock" size={19}/><div><strong>Reservas não são apagadas pelo inventário</strong><p>Quando a contagem ficar abaixo do reservado, o ajuste será bloqueado para que os pedidos comprometidos sejam revisados primeiro.</p></div></div>
      <div className="form-grid">
        <label className="field field-wide"><span>Produto contado *</span><select value={sku} onChange={(event) => selectItem(event.target.value)}>{products.map((item) => <option key={item.sku} value={item.sku}>{item.sku} · {item.name}</option>)}</select></label>
        <label className="field"><span>Quantidade física contada *</span><input inputMode="decimal" value={counted} onChange={(event) => { setCounted(event.target.value); setSubmitted(false); }} aria-invalid={submitted && !result?.valid}/></label>
        <label className="field"><span>Data da contagem *</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setSubmitted(false); }} aria-invalid={submitted && !date}/></label>
        <label className="field"><span>Local de estoque</span><select value={location} onChange={(event) => setLocation(event.target.value)}>{settings.stock.locations.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Motivo</span><select value={reason} onChange={(event) => setReason(event.target.value)}>{settings.stock.inventoryReasons.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Responsável</span><select value={user} onChange={(event) => setUser(event.target.value)}>{availableUsers.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label className="field field-wide"><span>Observações</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Método de contagem, conferentes e justificativa da diferença"/></label>
      </div>
      {selected && result && <div className="stock-balance-preview" role="status"><div><span>Saldo no sistema</span><strong>{selected.current} {selected.unit}</strong></div><div><span>Reservado</span><strong>{selected.reserved} {selected.unit}</strong></div><div><span>Divergência</span><strong className={result.adjustment < 0 ? 'negative' : result.adjustment > 0 ? 'positive' : ''}>{result.adjustment > 0 ? '+' : ''}{result.adjustment} {selected.unit}</strong></div><div><span>Novo disponível</span><strong>{result.nextAvailable} {selected.unit}</strong></div></div>}
      {submitted && errors.length > 0 && <div className="validation-result" role="alert"><div className="validation-title"><Icon name="warning" size={17}/><strong>Revise o inventário</strong></div>{errors.map((error) => <p key={error}>{error}</p>)}</div>}
      {saveError && <p className="form-error" role="alert">{saveError}</p>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="button primary" onClick={() => void save()} disabled={saving}>{saving ? 'Confirmando…' : 'Concluir inventário'}</button></footer>
  </Dialog>;
}

function StockMovementDetails({ movement, onClose }: { movement: StockMovementRecord | null; onClose: () => void }) {
  if (!movement) return null;
  return <Dialog open title={movement.origin} description={`${movement.type} · ${movement.item}`} onClose={onClose}>
    <div className="dialog-body stock-movement-details">
      <div className="stock-detail-head"><span><Icon name="stock" size={20}/></span><div><strong>{movement.item}</strong><p>{movement.sku} · {movement.date}</p></div><Badge tone={movement.quantity < 0 ? 'warning' : 'success'}>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</Badge></div>
      <dl><div><dt>Documento</dt><dd>{movement.document || 'Não informado'}</dd></div><div><dt>Saldo resultante</dt><dd>{movement.balance}</dd></div><div><dt>Local</dt><dd>{movement.location}</dd></div><div><dt>Responsável</dt><dd>{movement.user}</dd></div><div><dt>Parceiro/origem</dt><dd>{movement.partner || 'Não informado'}</dd></div><div><dt>Lote</dt><dd>{movement.lot || 'Não informado'}</dd></div><div><dt>Validade</dt><dd>{movement.expiry ? movement.expiry.split('-').reverse().join('/') : 'Não informada'}</dd></div><div><dt>Registro</dt><dd>{movement.id}</dd></div></dl>
      <section><h3>Observações</h3><p>{movement.notes || 'Nenhuma observação registrada.'}</p></section>
    </div>
    <footer className="dialog-footer"><button type="button" className="button primary" onClick={onClose}>Fechar</button></footer>
  </Dialog>;
}

function StockItemActions({ item, onEntry, onExit, onInventory, onHistory }: { item: CatalogItem; onEntry: () => void; onExit: () => void; onInventory: () => void; onHistory: () => void }) {
  const actions: RecordAction[] = [
    { label: 'Registrar entrada', description: 'Compra, produção, devolução ou ajuste positivo', icon: 'plus', onSelect: onEntry, permission: 'stock.entry' },
    { label: 'Registrar saída manual', description: 'Consumo, perda, devolução ou ajuste negativo', icon: 'arrow', onSelect: onExit, permission: 'stock.exit' },
    { label: 'Contar estoque', description: 'Inventário com divergência e saldo resultante', icon: 'stock', onSelect: onInventory, permission: 'stock.inventory' },
    { label: 'Ver movimentações', description: 'Filtra o histórico deste produto', icon: 'clock', onSelect: onHistory },
  ];
  return <RecordActionsDialog title={`Estoque de ${item.sku}`} description={`${item.name}. Saldo físico ${item.current} ${item.unit}, reservado ${item.reserved} ${item.unit} e disponível ${item.available} ${item.unit}.`} actions={actions} triggerLabel={`Ações de estoque de ${item.name}`}/>;
}

function InventoryView({ catalogRecords, movementRecords, suppliers, settings, initialOrigin = '', onClearOrigin, onSave, onNotify }: { catalogRecords: CatalogItem[]; movementRecords: StockMovementRecord[]; suppliers: SupplierRecord[]; settings: ModuleSettings; initialOrigin?: string; onClearOrigin: () => void; onSave: (item: CatalogItem, movement: StockMovementRecord) => Promise<ConfirmedSave>; onNotify: (message: string) => void }) {
  const { can } = useContext(PermissionContext);
  const products = catalogRecords.filter((item) => item.category !== 'Serviço' && item.trackStock);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [movementQuery, setMovementQuery] = useState(initialOrigin);
  const [movementFilter, setMovementFilter] = useState('Todos');
  const [locationFilter, setLocationFilter] = useState('Todos os locais');
  const [movementMode, setMovementMode] = useState<StockMovementMode | null>(null);
  const [movementItem, setMovementItem] = useState<CatalogItem | null>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryItem, setInventoryItem] = useState<CatalogItem | null>(null);
  const [detailMovement, setDetailMovement] = useState<StockMovementRecord | null>(null);
  const normalizedQuery = normalizeSearch(query);
  const positionRecords = products.filter((item) => {
    const status = stockStatus(item.available, item.minimum);
    const matchesQuery = normalizeSearch(`${item.sku} ${item.name}`).includes(normalizedQuery);
    const matchesStatus = statusFilter === 'Todos' || (statusFilter === 'Normal' ? status === 'normal' : statusFilter === 'Baixo' ? status === 'baixo' : status === 'sem_estoque');
    return matchesQuery && matchesStatus;
  });
  const normalizedMovementQuery = normalizeSearch(movementQuery);
  const filteredMovements = movementRecords.filter((movement) => {
    const matchesQuery = normalizeSearch(`${movement.origin} ${movement.type} ${movement.sku} ${movement.item} ${movement.partner} ${movement.document} ${movement.location}`).includes(normalizedMovementQuery);
    const matchesType = movementFilter === 'Todos' || movement.direction === movementFilter;
    const matchesLocation = locationFilter === 'Todos os locais' || movement.location === locationFilter;
    return matchesQuery && matchesType && matchesLocation;
  });
  const locationOptions = [...new Set([...settings.stock.locations, ...movementRecords.map((movement) => movement.location).filter(Boolean)])];
  const low = products.filter((item) => stockStatus(item.available, item.minimum) !== 'normal');
  const openMovement = (mode: StockMovementMode, item: CatalogItem | null = null) => { setMovementItem(item); setMovementMode(mode); };
  const openInventory = (item: CatalogItem | null = null) => { setInventoryItem(item); setInventoryOpen(true); };
  const filterHistory = (item: CatalogItem) => { setMovementQuery(item.sku); onNotify(`Movimentações de ${item.name} filtradas abaixo.`); window.setTimeout(() => document.getElementById('stock-movements')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); };
  return <>
    <PageHeading view="estoque" action={<div className="heading-actions"><button type="button" className="button secondary" disabled={!can('stock.inventory')} onClick={() => openInventory()}>Novo inventário</button><button type="button" className="button primary" disabled={!can('stock.entry')} onClick={() => openMovement('entrada')}><Icon name="plus" size={18}/> Registrar entrada</button></div>}/>
    <div className="scope-note"><Icon name="warning" size={18}/><p><strong>Controle operacional:</strong> pedidos reservam e vendas baixam estoque; entradas e ajustes exigem documento, usuário e saldo resultante. Compras e Financeiro serão origens integradas futuras, sem duplicação nesta tela.</p></div>
    <div className="stock-policy-summary"><span><Icon name="settings" size={17}/><p><strong>Política ativa</strong><small>Saldo consolidado · local padrão {settings.stock.defaultLocation}</small></p></span><Badge tone={settings.stock.allowNegativeStock ? 'warning' : 'success'}>{settings.stock.allowNegativeStock ? 'Negativo permitido' : 'Saldo protegido'}</Badge><Badge tone={settings.stock.protectReservations ? 'success' : 'warning'}>{settings.stock.protectReservations ? 'Reservas protegidas' : 'Reservas flexíveis'}</Badge></div>
    {initialOrigin && <div className="stock-origin-filter" role="status"><span><Icon name="service" size={17}/><span><strong>Consumo vinculado a {initialOrigin}</strong><small>A relação de movimentações foi filtrada a partir da ordem de serviço.</small></span></span><button type="button" className="button secondary" onClick={() => { setMovementQuery(''); onClearOrigin(); }}>Mostrar todas</button></div>}
    <div className="metric-grid compact"><Metric label="Itens controlados" value={String(products.length)} note={`${settings.stock.locations.length} locais configurados`}/><Metric label="Valor disponível" value={money(products.reduce((sum, item) => sum + Math.max(0, item.available) * item.cost, 0))} note="Pelo custo publicado" tone="cyan"/><Metric label="Reservado em pedidos" value={`${products.reduce((sum, item) => sum + item.reserved, 0)} un`} note="Saldo comprometido" tone="success"/><Metric label="Abaixo do mínimo" value={String(low.length)} note="Reposição necessária" tone="warning"/></div>
    {low.length > 0 && <Panel title="Reposição necessária" subtitle="Produtos abaixo do mínimo ou sem disponibilidade" className="stock-attention-panel"><div className="stock-attention-list">{low.map((item) => <div key={item.sku}><span className="dot warning"/><div><strong>{item.name}</strong><small>{item.available} {item.unit} disponíveis · mínimo {item.minimum} {item.unit}</small></div><Badge tone="warning">Faltam {Math.max(0, item.minimum - item.available)} {item.unit}</Badge><button type="button" className="button secondary" onClick={() => openMovement('entrada', item)}>Registrar entrada</button></div>)}</div></Panel>}
    <Panel title="Posição de estoque" subtitle="Saldo físico, reserva, disponibilidade e valor pelo custo publicado" action={<Badge tone="info">{positionRecords.length} {positionRecords.length === 1 ? 'produto' : 'produtos'}</Badge>}>
      <SearchToolbar value={query} onChange={setQuery} placeholder="Buscar por código ou produto"><select aria-label="Situação do estoque" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos</option><option>Normal</option><option>Baixo</option><option>Sem estoque</option></select></SearchToolbar>
      <Table headers={['Produto', 'Saldo físico', 'Reservado', 'Disponível', 'Mínimo e situação', 'Valor disponível', 'Ações']} minWidth={0} className="stock-position-table"><>{positionRecords.map((item) => { const status = stockStatus(item.available, item.minimum); return <tr key={item.sku}>
        <td data-label="Produto"><div className="stock-product-cell"><strong>{item.name}</strong><small>{item.sku} · {item.unit} · saldo consolidado</small></div></td>
        <td data-label="Saldo físico" className="numeric"><strong>{item.current} {item.unit}</strong></td>
        <td data-label="Reservado" className="numeric">{item.reserved} {item.unit}</td>
        <td data-label="Disponível" className="numeric"><strong>{item.available} {item.unit}</strong></td>
        <td data-label="Mínimo e situação"><div className="stock-status-cell"><span>Mínimo {item.minimum} {item.unit}</span><Badge tone={status === 'normal' ? 'success' : status === 'baixo' ? 'warning' : 'danger'}>{status === 'normal' ? 'Normal' : status === 'baixo' ? 'Baixo' : 'Sem estoque'}</Badge></div></td>
        <td data-label="Valor disponível" className="numeric"><strong>{money(Math.max(0, item.available) * item.cost)}</strong><small>{money(item.cost)} / {item.unit}</small></td>
        <td data-label="Ações" className="stock-actions-cell"><StockItemActions item={item} onEntry={() => openMovement('entrada', item)} onExit={() => openMovement('saida', item)} onInventory={() => openInventory(item)} onHistory={() => filterHistory(item)}/></td>
      </tr>; })}</></Table>
      {positionRecords.length === 0 && <EmptyState title="Nenhum produto encontrado" description="Ajuste a busca ou a situação para consultar a posição de estoque."/>}
    </Panel>
    <Panel title="Movimentações" subtitle="Histórico com origem, documento, local, usuário e saldo resultante" action={<button type="button" className="button secondary" disabled={!can('stock.exit')} onClick={() => openMovement('saida')}>Registrar saída manual</button>}>
      <div id="stock-movements" className="stock-scroll-anchor"/>
      <SearchToolbar value={movementQuery} onChange={setMovementQuery} placeholder="Buscar por origem, produto, documento, local ou parceiro"><select aria-label="Tipo de movimentação" value={movementFilter} onChange={(event) => setMovementFilter(event.target.value)}><option value="Todos">Todos os tipos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option><option value="reserva">Reservas</option><option value="inventario">Inventários</option></select><select aria-label="Local de estoque" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option>Todos os locais</option>{locationOptions.map((location) => <option key={location}>{location}</option>)}</select></SearchToolbar>
      <Table headers={['Data e origem', 'Movimentação', 'Produto', 'Quantidade e saldo', 'Local e responsável', 'Documento/parceiro', 'Ações']} minWidth={0} className="stock-movement-table"><>{filteredMovements.map((movement) => <tr key={movement.id}>
        <td data-label="Data e origem"><div className="stock-move-cell"><strong>{movement.origin}</strong><small>{movement.date}</small></div></td>
        <td data-label="Movimentação"><Badge tone={movement.direction === 'entrada' ? 'success' : movement.direction === 'saida' ? 'warning' : 'info'}>{movement.type}</Badge></td>
        <td data-label="Produto"><div className="stock-move-cell"><strong>{movement.item}</strong><small>{movement.sku}</small></div></td>
        <td data-label="Quantidade e saldo"><div className="stock-quantity-cell"><strong className={movement.quantity < 0 ? 'negative' : movement.quantity > 0 ? 'positive' : ''}>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</strong><small>Saldo {movement.balance}</small></div></td>
        <td data-label="Local e responsável"><div className="stock-move-cell"><strong>{movement.location}</strong><small>{movement.user}</small></div></td>
        <td data-label="Documento e parceiro"><div className="stock-move-cell"><strong>{movement.document || 'Sem documento'}</strong><small>{movement.partner || 'Sem parceiro informado'}</small></div></td>
        <td data-label="Ações" className="stock-actions-cell"><button type="button" className="row-action" onClick={() => setDetailMovement(movement)} aria-label={`Abrir movimentação ${movement.origin}`}>›</button></td>
      </tr>)}</></Table>
      {filteredMovements.length === 0 && <EmptyState title="Nenhuma movimentação encontrada" description="Ajuste a busca ou o tipo para consultar o histórico de estoque."/>}
    </Panel>
    {movementMode && (
      <StockMovementForm
        key={`${movementMode}-${movementItem?.sku ?? 'novo'}`}
        mode={movementMode}
        products={products}
        suppliers={suppliers}
        initialItem={movementItem}
        settings={settings}
        onClose={() => setMovementMode(null)}
        onSave={onSave}
      />
    )}
    {inventoryOpen && (
      <StockInventoryForm
        key={inventoryItem?.sku ?? 'novo'}
        products={products}
        initialItem={inventoryItem}
        settings={settings}
        onClose={() => setInventoryOpen(false)}
        onSave={onSave}
      />
    )}
    <StockMovementDetails movement={detailMovement} onClose={() => setDetailMovement(null)}/>
  </>;
}

function fiscalDraftTone(status: FiscalDraftRecord['status']): 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'Cancelado') return 'danger';
  if (status === 'Com pendências') return 'warning';
  if (status === 'Bloqueado para transmissão') return 'danger';
  return 'info';
}

function fiscalDraftUserStatus(draft: FiscalDraftRecord): { label: string; tone: 'success' | 'warning' | 'danger' | 'info' } {
  if (draft.status === 'Cancelado') return { label: 'Cancelado', tone: 'danger' };
  if (draft.status === 'Com pendências') return { label: 'Para revisar', tone: 'warning' };
  if (draft.status === 'Pronto para homologação') return { label: 'Preparação concluída', tone: 'success' };
  return { label: 'Aguardando emissão', tone: 'info' };
}

function FiscalDraftDetailsDialog({ draft, remoteStatus, company, onClose, onRevalidate }: { draft: FiscalDraftRecord | null; remoteStatus?: FiscalEmissionStatus; company: CompanyProfile; onClose: () => void; onRevalidate: (draft: FiscalDraftRecord) => void }) {
  const { can } = useContext(PermissionContext);
  if (!draft) return null;
  const registrationChecks = draft.checks.filter((check) => check.scope === 'cadastro');
  const transmissionChecks = draft.checks.filter((check) => check.scope === 'transmissao');
  const userStatus = fiscalDraftUserStatus(draft);
  const remotePresentation = remoteStatus ? fiscalStatusPresentation(remoteStatus) : null;
  return <Dialog open title={`${draft.id} · ${documentLabel(draft.documentType)}`} description={`${draft.sourceLabel} ${draft.originId} · atualizado em ${new Date(draft.updatedAt).toLocaleString('pt-BR')}`} onClose={onClose}>
    <div className="dialog-body fiscal-draft-details">
      <div className={`fiscal-draft-safety ${remoteStatus?.authorized ? 'authorized' : ''}`}><Icon name={remoteStatus?.authorized ? 'check' : 'warning'} size={19}/><p><strong>{remoteStatus?.authorized ? 'Autorização fiscal confirmada.' : 'Rascunho sem validade fiscal.'}</strong> {remoteStatus?.authorized ? 'Número, chave, protocolo e arquivos são apresentados somente após confirmação do serviço fiscal.' : 'A nota ainda não foi emitida e não possui número ou chave fiscal.'}</p></div>
      <div className="fiscal-draft-summary"><div><span>Situação</span><Badge tone={remotePresentation?.tone ?? userStatus.tone}>{remotePresentation?.label ?? userStatus.label}</Badge></div><div><span>Origem</span><strong>{draft.originId}</strong></div><div><span>Documento</span><strong>{documentLabel(draft.documentType)}</strong></div><div><span>Valor</span><strong>{money(draft.total)}</strong></div></div>
      {remoteStatus && <section><div className="client-section-heading"><h3>Retorno da emissão</h3><p>Situação confirmada pela consulta autenticada da empresa.</p></div><dl className="fiscal-draft-definition-list"><div><dt>Número</dt><dd>{remoteStatus.number ? `${remoteStatus.series}/${remoteStatus.number.toLocaleString('pt-BR')}` : 'Aguardando autorização'}</dd></div><div><dt>Chave de acesso</dt><dd>{remoteStatus.accessKey || 'Ainda não disponível'}</dd></div><div><dt>Protocolo</dt><dd>{remoteStatus.protocolNumber || 'Ainda não disponível'}</dd></div><div><dt>Arquivos</dt><dd>{remoteStatus.finalDocumentReady ? 'XML e DANFE disponíveis nas ações' : remoteStatus.recoveryPending ? 'Em preparação' : 'Ainda não disponíveis'}</dd></div></dl></section>}
      <section><div className="client-section-heading"><h3>Composição comercial preservada</h3><p>Valores congelados na origem para conferir o fechamento do documento fiscal.</p></div><dl className="fiscal-draft-definition-list"><div><dt>Produtos</dt><dd>{money(draft.commercialTotals.products)}</dd></div><div><dt>Desconto nos itens</dt><dd>− {money(draft.commercialTotals.lineDiscount)}</dd></div><div><dt>Desconto geral</dt><dd>− {money(draft.commercialTotals.orderDiscount)}</dd></div><div><dt>Frete</dt><dd>{money(draft.commercialTotals.freight)}</dd></div><div><dt>Total</dt><dd>{money(draft.commercialTotals.invoice)}</dd></div><div><dt>Pagamento</dt><dd>{paymentMethodLabel(draft.paymentMethod)}</dd></div></dl></section>
      <section><div className="client-section-heading"><h3>Destinatário ou tomador</h3><p>Dados recuperados do cadastro vinculado à operação.</p></div><dl className="fiscal-draft-definition-list"><div><dt>Nome</dt><dd>{draft.client}</dd></div><div><dt>CNPJ/CPF</dt><dd>{draft.clientDocument || 'Não informado'}</dd></div><div><dt>Município</dt><dd>{draft.clientCity || 'Não informado'}</dd></div><div><dt>Emitente</dt><dd>{company.name}</dd></div></dl></section>
      <section><div className="client-section-heading"><h3>Informações da nota</h3><p>Dados comerciais que acompanharão a emissão quando ela for liberada.</p></div><dl className="fiscal-draft-definition-list"><div><dt>Empresa</dt><dd>{company.name}</dd></div><div><dt>Documento</dt><dd>{documentLabel(draft.documentType)}</dd></div><div><dt>Natureza da operação</dt><dd>{draft.operationNature || 'Não definida'}</dd></div><div><dt>Série</dt><dd>{draft.series || 'Será definida automaticamente'}</dd></div><div><dt>Responsável fiscal</dt><dd>{draft.fiscalResponsible || 'Não informado'}</dd></div><div><dt>Revisão fiscal</dt><dd>{draft.fiscalRuleStatus === 'Revisada' ? 'Concluída' : 'Pendente'}</dd></div></dl></section>
      <section><div className="client-section-heading"><h3>Conferência</h3><p>Resumo dos dados necessários antes da emissão.</p></div><div className="fiscal-simple-readiness"><div><span className={registrationChecks.every((check) => check.ready) ? 'ready' : 'blocked'}><Icon name={registrationChecks.every((check) => check.ready) ? 'check' : 'warning'} size={17}/></span><p><strong>Dados da nota</strong><small>{registrationChecks.filter((check) => check.ready).length} de {registrationChecks.length} verificações concluídas</small></p><Badge tone={registrationChecks.every((check) => check.ready) ? 'success' : 'warning'}>{registrationChecks.every((check) => check.ready) ? 'Pronto' : 'Revisar'}</Badge></div><div><span className={transmissionChecks.every((check) => check.ready) ? 'ready' : 'blocked'}><Icon name={transmissionChecks.every((check) => check.ready) ? 'check' : 'warning'} size={17}/></span><p><strong>Emissão fiscal</strong><small>{transmissionChecks.every((check) => check.ready) ? 'Disponível para emissão' : 'Aguardando configuração interna'}</small></p><Badge tone={transmissionChecks.every((check) => check.ready) ? 'success' : 'warning'}>{transmissionChecks.every((check) => check.ready) ? 'Disponível' : 'Indisponível'}</Badge></div></div></section>
      <section><div className="client-section-heading"><h3>Itens do documento</h3><p>Classificação fiscal e desconto unitário recuperados da operação e do catálogo.</p></div><Table headers={['Item', 'Qtd.', 'Valor unit.', 'Desconto unit.', 'Classificação', 'Subtotal bruto']} minWidth={0} className="fiscal-draft-items-table"><>{draft.items.map((item) => <tr key={`${draft.id}-${item.sku}`}><td data-label="Item"><strong>{item.name}</strong><small>{item.sku} · {item.kind === 'servico' ? 'Serviço' : 'Produto'}</small></td><td data-label="Quantidade">{item.quantity} {item.unit}</td><td data-label="Valor unit." className="numeric">{money(item.unitPrice)}</td><td data-label="Desconto unit." className="numeric">{money(item.unitDiscount)}</td><td data-label="Classificação"><strong>{item.kind === 'servico' ? item.municipalServiceCode || 'Código pendente' : item.ncm || 'NCM pendente'}</strong><small>{item.kind === 'servico' ? `Lista ${item.nationalServiceCode || 'pendente'} · NBS ${item.nbs || 'pendente'} · ISS ${percent(item.issRate || 0)}` : `Origem ${item.fiscalOriginCode || 'pendente'} · uTrib ${item.taxableUnit || 'pendente'} · CFOP ${item.cfopInternal || 'pendente'}${draft.documentType === 'nfe' ? `/${item.cfopInterstate || 'pendente'}` : ''} · ICMS ${item.icmsCode || 'pendente'}`}</small>{item.kind === 'produto' && (item.ipiCst || item.stBaseMode || item.fiscalBenefitCode) && <small>{item.ipiCst ? `IPI ${item.ipiCst}/${item.ipiLegalCode || 'enquadramento pendente'}` : 'IPI não aplicável'} · {item.stBaseMode ? `ICMS-ST ${item.stBaseMode} · ${percent(item.stIcmsRate)}` : 'ST não aplicável'}{item.fiscalBenefitCode ? ` · Benefício ${item.fiscalBenefitCode}` : ''}</small>}<small>IBS/CBS {item.ibsCbsCst && item.ibsCbsClassification ? `${item.ibsCbsCst}/${item.ibsCbsClassification}` : 'pendente'} · {item.fiscalStatus}</small></td><td data-label="Subtotal bruto" className="numeric"><strong>{money(item.quantity * item.unitPrice)}</strong></td></tr>)}</></Table></section>
      {draft.warnings.length > 0 && <section><div className="client-section-heading"><h3>Pontos para revisar</h3><p>Informações que precisam ser conferidas antes da emissão.</p></div><ul className="fiscal-warning-list">{draft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}
      <section><div className="client-section-heading"><h3>Histórico fiscal</h3><p>Eventos locais preservados sem apagar registros anteriores.</p></div><div className="fiscal-event-list">{draft.events.map((event, index) => <div key={`${event.date}-${index}`}><span><Icon name={event.label.includes('cancelado') ? 'close' : 'document'} size={15}/></span><div><strong>{event.label}</strong><small>{new Date(event.date).toLocaleString('pt-BR')} · {event.user}</small><p>{event.description}</p></div></div>)}</div></section>
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Fechar</button>{!remoteStatus?.authorized && <button type="button" className="button primary" onClick={() => onRevalidate(draft)} disabled={draft.status === 'Cancelado' || !can('fiscal.prepare')}>Atualizar conferência</button>}</footer>
  </Dialog>;
}

function fiscalIssueReviewChecks(draft: FiscalDraftRecord) {
  const displayCopy: Record<string, { label: string; readyDetail: string; pendingDetail: string }> = {
    'issuer-selection': { label: 'Empresa emissora', readyDetail: 'Empresa ativa identificada automaticamente', pendingDetail: 'Revise os dados fiscais da empresa ativa' },
    'issuer-route': { label: 'Serviço de emissão', readyDetail: 'Conexão disponível para este documento', pendingDetail: 'Liberação interna do serviço de emissão pendente' },
    provedor: { label: 'Serviço de emissão', readyDetail: 'Conexão disponível para este documento', pendingDetail: 'Liberação interna do serviço de emissão pendente' },
    'rota-nfse': { label: 'Serviço de emissão', readyDetail: 'Conexão disponível para a NFS-e', pendingDetail: 'Liberação interna do serviço de emissão da NFS-e pendente' },
    certificado: { label: 'Certificado digital', readyDetail: 'Certificado ativo para a empresa', pendingDetail: 'Adicione e valide o certificado digital da empresa' },
    reforma: { label: 'Regras tributárias atuais', readyDetail: 'Revisão fiscal registrada', pendingDetail: 'Solicite a revisão das regras tributárias atuais' },
    'reforma-itens': { label: 'Tributação dos itens', readyDetail: 'Classificações tributárias conferidas', pendingDetail: 'Revise a classificação tributária dos itens' },
  };
  const grouped = new Map<string, { label: string; ready: boolean; detail: string }>();
  draft.checks.forEach((check) => {
    const copy = displayCopy[check.key];
    const label = copy?.label ?? check.label;
    const detail = check.ready ? copy?.readyDetail ?? check.detail : copy?.pendingDetail ?? check.detail;
    const current = grouped.get(label);
    grouped.set(label, current ? { label, ready: current.ready && check.ready, detail: current.ready && !check.ready ? detail : current.detail } : { label, ready: check.ready, detail });
  });
  return [...grouped.values()];
}

function FiscalRejectedCorrectionDialog({ draft, remoteStatus, loading, onClose, onSubmit, onNavigate }: { draft: FiscalDraftRecord; remoteStatus: FiscalEmissionStatus; loading?: boolean; onClose: () => void; onSubmit: (items: Array<{ sku: string; ncm: string }>) => void; onNavigate: (view: View) => void }) {
  const products = useMemo(() => draft.items.filter((item) => item.kind === 'produto'), [draft.items]);
  const [ncms, setNcms] = useState<Record<string, string>>(() => Object.fromEntries(products.map((item) => [item.sku, item.ncm.replace(/\D/g, '').slice(0, 8)])));
  useEffect(() => setNcms(Object.fromEntries(products.map((item) => [item.sku, item.ncm.replace(/\D/g, '').slice(0, 8)]))), [draft.id, remoteStatus.version, products]);
  const ncmCorrection = remoteStatus.statusCode === '778';
  const valid = ncmCorrection && products.length > 0 && products.every((item) => /^\d{8}$/.test(ncms[item.sku] || '') && !/^0{8}$/.test(ncms[item.sku] || ''));
  const changed = products.some((item) => (ncms[item.sku] || '') !== item.ncm.replace(/\D/g, '').slice(0, 8));
  return <Dialog open title="Revisar dados fiscais" description={`${draft.sourceLabel} ${draft.originId} · NF-e ${remoteStatus.series}/${remoteStatus.number.toLocaleString('pt-BR')}`} onClose={onClose}>
    <div className="dialog-body fiscal-rejection-correction">
      <div className="fiscal-draft-safety"><Icon name="warning" size={19}/><p><strong>Rejeição {remoteStatus.statusCode || 'registrada'}.</strong> {remoteStatus.statusReason || 'Revise os dados indicados antes de uma nova tentativa.'}</p></div>
      <div className="fiscal-rejection-preservation" role="status"><Icon name="check" size={18}/><p><strong>Número e histórico preservados</strong><small>A série {remoteStatus.series} e o número {remoteStatus.number.toLocaleString('pt-BR')} serão mantidos. Esta revisão não assina nem envia a nota.</small></p></div>
      {ncmCorrection ? <section>
        <div className="client-section-heading"><h3>Corrigir NCM dos produtos</h3><p>Informe somente os 8 dígitos da classificação fiscal indicada na rejeição.</p></div>
        <div className="fiscal-rejection-items">{products.map((item) => <label className="field" key={item.sku}><span>{item.name}</span><input value={ncms[item.sku] || ''} onChange={(event) => setNcms((current) => ({ ...current, [item.sku]: event.target.value.replace(/\D/g, '').slice(0, 8) }))} inputMode="numeric" autoComplete="off" maxLength={8} placeholder="8 dígitos" aria-describedby={`ncm-${item.sku}`}/><small id={`ncm-${item.sku}`} className="field-message">{item.sku} · NCM atual: {item.ncm || 'não informado'}</small></label>)}</div>
        {!products.length && <p className="field-message error">A nota não possui produtos disponíveis para esta correção.</p>}
      </section> : <section>
        <div className="client-section-heading"><h3>Cadastro a revisar</h3><p>Esta rejeição ainda não possui correção direta nesta tela. Abra o cadastro indicado e atualize a Central Fiscal depois.</p></div>
        <button type="button" className="button secondary" onClick={() => onNavigate('catalogo')}>Revisar produtos e serviços</button>
      </section>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose} disabled={loading}>Fechar</button>{ncmCorrection && <button type="button" className="button primary" onClick={() => onSubmit(products.map((item) => ({ sku: item.sku, ncm: ncms[item.sku] || '' })))} disabled={loading || !valid || !changed}>{loading ? 'Salvando revisão…' : 'Salvar revisão fiscal'}</button>}</footer>
  </Dialog>;
}

function FiscalIssueReviewDialog({ draft, remoteStatus, loading, company, numberingLedger, onClose, onReserveNumber, onContinueIssuance, onRevalidate, onCorrect }: { draft: FiscalDraftRecord | null; remoteStatus?: FiscalEmissionStatus; loading?: boolean; company: CompanyProfile; numberingLedger: FiscalNumberingLedger; onClose: () => void; onReserveNumber: (draft: FiscalDraftRecord, expectedVersion: number) => void; onContinueIssuance: (draft: FiscalDraftRecord, expectedVersion: number) => void; onRevalidate: (draft: FiscalDraftRecord) => void; onCorrect: (view: View) => void }) {
  const { can } = useContext(PermissionContext);
  if (!draft) return null;
  const checks = fiscalIssueReviewChecks(draft);
  const pendingChecks = checks.filter((check) => !check.ready);
  const reviewReady = draft.status !== 'Cancelado' && pendingChecks.length === 0;
  const canConfirmEmission = reviewReady && draft.persistenceSource === 'server' && draft.documentType === 'nfe' && remoteStatus?.state === 'prepared' && remoteStatus.version > 0;
  const numberAlreadyReserved = ['number_reserved', 'signed'].includes(remoteStatus?.state ?? '');
  const canContinueIssuance = reviewReady && draft.persistenceSource === 'server' && draft.documentType === 'nfe' && numberAlreadyReserved && (remoteStatus?.version ?? 0) > 0;
  const userStatus = fiscalDraftUserStatus(draft);
  const numberReservation = numberingLedger.reservations.find((entry) => entry.draftId === draft.id);
  const activeNumbering = fiscalActiveSequence(numberingLedger, draft.documentType);
  const classificationLabel = draft.documentType === 'nfse' ? 'Serviço' : 'Mercadoria';
  const firstPendingKey = draft.checks.find((check) => !check.ready)?.key ?? '';
  const correction = firstPendingKey === 'destinatario'
    ? { label: 'Revisar cliente', view: 'clientes' as View }
    : ['itens', 'classificacao', 'reforma-itens'].includes(firstPendingKey)
      ? { label: 'Revisar produtos e serviços', view: 'catalogo' as View }
      : { label: 'Revisar ajustes', view: 'configuracoes' as View };
  return <Dialog open title={`Revisar emissão de ${documentLabel(draft.documentType)}`} description={`${draft.sourceLabel} ${draft.originId} · confira todos os dados antes de emitir`} onClose={onClose}>
    <div className="dialog-body fiscal-issue-review">
      <div className="fiscal-draft-safety"><Icon name="warning" size={19}/><p><strong>Conferência anterior à emissão.</strong> {numberAlreadyReserved ? 'Ao continuar, o sistema confere o documento, usa automaticamente o certificado ativo da empresa, assina e transmite a NF-e. Se o certificado não estiver válido, nada será enviado.' : 'Ao confirmar esta etapa em homologação, o sistema vincula a próxima série e o número. A assinatura e a transmissão acontecem automaticamente na continuação.'}</p></div>
      <div className="fiscal-draft-summary"><div><span>Documento</span><strong>{documentLabel(draft.documentType)}</strong></div><div><span>Origem</span><strong>{draft.originId}</strong></div><div><span>Situação</span><Badge tone={userStatus.tone}>{userStatus.label}</Badge></div><div><span>Total</span><strong>{money(draft.total)}</strong></div></div>
      <div className="fiscal-issue-grid">
        <section><div className="client-section-heading"><h3>Empresa e destinatário</h3><p>Identificação das partes que constará na nota.</p></div><dl className="fiscal-draft-definition-list"><div><dt>Empresa</dt><dd>{company.legalName || company.name}</dd></div><div><dt>CNPJ da empresa</dt><dd>{company.document || 'Pendente'}</dd></div><div><dt>{draft.documentType === 'nfse' ? 'Tomador' : 'Destinatário'}</dt><dd>{draft.client}</dd></div><div><dt>CNPJ/CPF</dt><dd>{draft.clientDocument || 'Pendente'}</dd></div><div><dt>Município</dt><dd>{draft.clientCity || 'Pendente'}</dd></div><div><dt>Documento de origem</dt><dd>{draft.sourceLabel} {draft.originId}</dd></div></dl></section>
        <section><div className="client-section-heading"><h3>Dados fiscais</h3><p>Informações aplicadas automaticamente conforme a operação.</p></div><dl className="fiscal-draft-definition-list"><div><dt>Tipo de nota</dt><dd>{documentLabel(draft.documentType)}</dd></div><div><dt>Natureza da operação</dt><dd>{draft.operationNature || 'Pendente'}</dd></div><div><dt>Série</dt><dd>{remoteStatus?.series || numberReservation?.series || activeNumbering?.series || draft.series || 'Definição automática pendente'}</dd></div><div><dt>Número</dt><dd>{remoteStatus?.number ? remoteStatus.number.toLocaleString('pt-BR') : numberReservation ? numberReservation.number.toLocaleString('pt-BR') : `Será reservado na emissão${activeNumbering ? ` · próximo ${activeNumbering.nextNumber.toLocaleString('pt-BR')}` : ''}`}</dd></div><div><dt>Regra fiscal</dt><dd>{draft.fiscalRuleStatus === 'Revisada' ? 'Revisada' : 'Pendente'}</dd></div><div><dt>Responsável fiscal</dt><dd>{draft.fiscalResponsible || 'Pendente'}</dd></div><div><dt>Pagamento</dt><dd>{paymentMethodLabel(draft.paymentMethod)}</dd></div></dl></section>
      </div>
      <section className="fiscal-issue-values"><div className="client-section-heading"><h3>Valores da nota</h3><p>Composição preservada do pedido ou serviço de origem.</p></div><dl className="fiscal-draft-definition-list"><div><dt>Itens</dt><dd>{money(draft.commercialTotals.products)}</dd></div><div><dt>Desconto nos itens</dt><dd>− {money(draft.commercialTotals.lineDiscount)}</dd></div><div><dt>Desconto geral</dt><dd>− {money(draft.commercialTotals.orderDiscount)}</dd></div><div><dt>Frete</dt><dd>{money(draft.commercialTotals.freight)}</dd></div><div><dt>Total da nota</dt><dd><strong>{money(draft.commercialTotals.invoice)}</strong></dd></div></dl></section>
      <section><div className="client-section-heading"><h3>Itens da nota</h3><p>Quantidade, valor e classificação usados na preparação fiscal.</p></div><Table headers={['Item', 'Qtd.', 'Valor unit.', 'Desconto unit.', classificationLabel, 'Subtotal']} minWidth={0} className="fiscal-draft-items-table"><>{draft.items.map((item) => {
        const classification = item.kind === 'servico' ? item.municipalServiceCode || item.nationalServiceCode : item.ncm;
        const fiscalCode = item.kind === 'servico' ? item.nbs : draft.documentType === 'nfe' ? item.cfopInternal || item.cfopInterstate : item.cfopInternal;
        return <tr key={`review-${draft.id}-${item.sku}`}><td data-label="Item"><strong>{item.name}</strong><small>{item.sku} · {item.kind === 'servico' ? 'Serviço' : 'Produto'}</small></td><td data-label="Quantidade">{item.quantity} {item.unit}</td><td data-label="Valor unit." className="numeric">{money(item.unitPrice)}</td><td data-label="Desconto unit." className="numeric">{money(item.unitDiscount)}</td><td data-label={classificationLabel}><strong>{classification || 'Pendente'}</strong><small>{fiscalCode ? `${item.kind === 'servico' ? 'NBS' : 'CFOP'} ${fiscalCode}` : 'Classificação complementar pendente'}</small></td><td data-label="Subtotal" className="numeric"><strong>{money(item.quantity * Math.max(0, item.unitPrice - item.unitDiscount))}</strong></td></tr>;
      })}</></Table></section>
      <section><div className="client-section-heading"><h3>Conferência final</h3><p>{pendingChecks.length ? `${pendingChecks.length} ${pendingChecks.length === 1 ? 'ponto precisa' : 'pontos precisam'} ser resolvido${pendingChecks.length === 1 ? '' : 's'} antes da emissão.` : 'Todos os dados necessários desta etapa foram conferidos.'}</p></div><div className="fiscal-issue-checks">{checks.map((check) => <div key={check.label}><span className={check.ready ? 'ready' : 'blocked'}><Icon name={check.ready ? 'check' : 'warning'} size={16}/></span><p><strong>{check.label}</strong><small>{check.detail}</small></p><Badge tone={check.ready ? 'success' : 'warning'}>{check.ready ? 'Pronto' : 'Pendente'}</Badge></div>)}</div></section>
      <div className={`fiscal-issue-result ${reviewReady ? 'ready' : ''}`} role="status"><span><Icon name={reviewReady ? 'check' : 'warning'} size={20}/></span><p><strong>{draft.status === 'Cancelado' ? 'Documento cancelado' : numberAlreadyReserved ? 'Pronta para continuar' : canConfirmEmission ? 'Pronta para confirmar' : reviewReady ? 'Conferência concluída' : 'Emissão bloqueada por pendências'}</strong><small>{draft.status === 'Cancelado' ? 'Este rascunho permanece disponível somente para consulta.' : numberAlreadyReserved ? 'O certificado ativo será utilizado automaticamente, sem novo preenchimento.' : canConfirmEmission ? 'A confirmação reserva a numeração com segurança.' : reviewReady ? 'Abra e valide a emissão fiscal antes de confirmar.' : 'Atualize a conferência após corrigir os pontos indicados.'}</small></p></div>
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Fechar</button>{draft.status !== 'Cancelado' && <><button type="button" className="button secondary" onClick={pendingChecks.length ? () => onCorrect(correction.view) : () => onRevalidate(draft)} disabled={loading || !can(pendingChecks.length ? correction.view === 'configuracoes' ? 'settings.view' : correction.view === 'clientes' ? 'clients.view' : 'catalog.view' : 'fiscal.prepare')}>{pendingChecks.length ? correction.label : 'Atualizar conferência'}</button>{numberAlreadyReserved ? <button type="button" className="button primary" onClick={() => canContinueIssuance && onContinueIssuance(draft, remoteStatus?.version ?? 0)} disabled={loading || !canContinueIssuance || !can('fiscal.issue')}>{loading ? 'Emitindo…' : 'Continuar emissão'}</button> : <button type="button" className="button primary" onClick={() => canConfirmEmission && onReserveNumber(draft, remoteStatus?.version ?? 0)} disabled={loading || !canConfirmEmission || !can('fiscal.issue')} title={!reviewReady ? 'Resolva todas as pendências antes de emitir' : !canConfirmEmission ? 'Abra e valide a emissão fiscal antes de confirmar' : undefined}>{loading ? 'Confirmando…' : 'Confirmar emissão'}</button>}</>}</footer>
  </Dialog>;
}

function FiscalCancellationDialog({ draft, remoteStatus, loading, onClose, onSubmit }: { draft: FiscalDraftRecord; remoteStatus: FiscalEmissionStatus; loading?: boolean; onClose: () => void; onSubmit: (justification: string) => void }) {
  const { can } = useContext(PermissionContext);
  const [justification, setJustification] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const normalized = justification.trim().replace(/\s+/g, ' ');
  const valid = normalized.length >= 15 && normalized.length <= 255;
  return <Dialog open title={`Cancelar NF-e ${remoteStatus.series}/${remoteStatus.number.toLocaleString('pt-BR')}`} description={`Documento autorizado vinculado a ${draft.originId}`} onClose={onClose}>
    <div className="dialog-body fiscal-cancellation-body">
      <div className="lifecycle-effect"><Icon name="warning" size={19}/><div><strong>Esta ação envia um evento fiscal</strong><p>A autorização, o protocolo e os documentos originais continuarão preservados no histórico.</p></div></div>
      <dl className="fiscal-cancellation-summary"><div><dt>Documento</dt><dd>NF-e série {remoteStatus.series}, número {remoteStatus.number.toLocaleString('pt-BR')}</dd></div><div><dt>Autorização original</dt><dd>Protocolo {remoteStatus.protocolNumber || 'registrado'}</dd></div></dl>
      <label className={`field ${justification.length > 0 && !valid ? 'invalid' : ''}`}><span>Justificativa do cancelamento</span><textarea value={justification} maxLength={255} rows={4} placeholder="Explique o motivo do cancelamento" onChange={(event) => setJustification(event.target.value)}/><small className="field-message">{justification.length > 0 && normalized.length < 15 ? 'Informe pelo menos 15 caracteres.' : 'A justificativa será registrada no evento e no histórico fiscal.'} <b>{normalized.length}/255</b></small></label>
      <label className="fiscal-cancellation-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/><span>Confirmo que desejo solicitar o cancelamento desta NF-e autorizada.</span></label>
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose} disabled={loading}>Manter NF-e</button><button type="button" className="button danger" onClick={() => onSubmit(normalized)} disabled={loading || !valid || !confirmed || !can('fiscal.cancel')}>{loading ? 'Solicitando…' : 'Solicitar cancelamento'}</button></footer>
  </Dialog>;
}

function FiscalDraftRecordActions({ draft, remoteStatus, statusLoading, prepareLoading, onDetails, onReview, onPrepare, onValidate, onRevalidate, onRefreshStatus, onDownload, onCancel }: { draft: FiscalDraftRecord; remoteStatus?: FiscalEmissionStatus; statusLoading?: boolean; prepareLoading?: boolean; onDetails: () => void; onReview?: () => void; onPrepare?: () => void; onValidate?: () => void; onRevalidate: () => void; onRefreshStatus?: () => void; onDownload?: (artifactId: string, artifactType: FiscalArtifactType) => void; onCancel: () => void }) {
  const xml = remoteStatus?.artifacts.find((artifact) => artifact.artifactType === 'processed_xml');
  const danfe = remoteStatus?.artifacts.find((artifact) => artifact.artifactType === 'danfe_pdf');
  const actions: RecordAction[] = [
    { label: 'Abrir detalhes', description: 'Dados, itens, pendências e histórico do rascunho', icon: 'document', onSelect: onDetails },
    ...(onPrepare ? [{ label: prepareLoading ? 'Abrindo emissão…' : 'Abrir emissão fiscal', description: 'Cria o vínculo privado da NF-e em homologação, sem validar XML, reservar número ou transmitir', icon: 'fiscal' as IconName, onSelect: onPrepare, disabled: prepareLoading, disabledLabel: 'Abrindo', permission: 'fiscal.prepare' }] : []),
    ...(onValidate ? [{ label: prepareLoading ? 'Validando dados fiscais…' : 'Validar dados fiscais', description: 'Aplica a regra revisada e valida o pré-XML no XSD, sem consumir número, certificado ou transmitir', icon: 'check' as IconName, onSelect: onValidate, disabled: prepareLoading, disabledLabel: 'Validando', permission: 'fiscal.prepare' }] : []),
    ...(draft.emissionId && onRefreshStatus ? [{ label: statusLoading ? 'Atualizando situação…' : 'Atualizar situação fiscal', description: 'Consulta a situação mais recente sem reenviar a nota', icon: 'clock' as IconName, onSelect: onRefreshStatus, disabled: statusLoading, disabledLabel: 'Atualizando', permission: 'fiscal.view' }] : []),
    ...(onReview && draft.status !== 'Cancelado' && !remoteStatus?.authorized ? [{ label: remoteStatus?.state === 'rejected' ? 'Revisar dados fiscais' : remoteStatus?.state === 'prepared' ? 'Emitir NF-e' : ['number_reserved', 'signed'].includes(remoteStatus?.state ?? '') ? 'Continuar emissão' : 'Revisar para emissão', description: remoteStatus?.state === 'rejected' ? 'Corrige somente os dados indicados pela rejeição, sem reenviar automaticamente' : remoteStatus?.state === 'prepared' ? 'Confere os dados e confirma a série e o número da nota' : ['number_reserved', 'signed'].includes(remoteStatus?.state ?? '') ? 'Usa automaticamente o certificado ativo e segue com a emissão' : 'Confere destinatário, itens, valores, tributação e pendências', icon: 'fiscal' as IconName, onSelect: onReview, permission: ['prepared', 'number_reserved', 'signed'].includes(remoteStatus?.state ?? '') ? 'fiscal.issue' : 'fiscal.prepare' }] : []),
    ...(draft.status !== 'Cancelado' && !remoteStatus?.authorized ? [{ label: 'Atualizar conferência', description: 'Verifica novamente os dados da empresa, cliente e itens', icon: 'check' as IconName, onSelect: onRevalidate, permission: 'fiscal.prepare' }, { label: 'Cancelar rascunho', description: 'Encerra a preparação e preserva o histórico', icon: 'close' as IconName, onSelect: onCancel, permission: 'fiscal.cancel' }] : []),
    ...(remoteStatus?.authorized && remoteStatus.state !== 'canceled' ? [{ label: 'Cancelar NF-e', description: 'Solicita o evento fiscal e preserva a autorização original no histórico', icon: 'warning' as IconName, onSelect: onCancel, permission: 'fiscal.cancel' }] : []),
    ...(xml && onDownload ? [{ label: 'Baixar XML autorizado', description: 'Arquivo fiscal processado e vinculado à autorização', icon: 'document' as IconName, onSelect: () => onDownload(xml.id, xml.artifactType), permission: 'fiscal.documents.xml.download' }] : []),
    ...(danfe && onDownload ? [{ label: 'Baixar DANFE', description: 'Representação em PDF da nota autorizada', icon: 'print' as IconName, onSelect: () => onDownload(danfe.id, danfe.artifactType), permission: 'fiscal.documents.danfe.download' }] : []),
    ...(!xml && !danfe ? [{ label: 'XML e DANFE indisponíveis', description: 'Os arquivos aparecem aqui após a autorização e preparação final', icon: 'print' as IconName, planned: true }] : []),
  ];
  return <RecordActionsDialog title={`Ações de ${draft.id}`} description={`${documentLabel(draft.documentType)} vinculada a ${draft.originId}. A emissão será liberada quando todas as pendências forem concluídas.`} actions={actions} triggerLabel={`Ações fiscais de ${draft.originId}`}/>;
}

function homologationTone(status: FiscalHomologationStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'Validado externamente') return 'success';
  if (status === 'Reprovado') return 'danger';
  if (status === 'Pronto para teste externo') return 'info';
  if (status === 'Em preparação' || status === 'Aguardando evidência') return 'warning';
  return 'neutral';
}

function FiscalHomologationDialog({ open, plan, company, settings, readOnly, onClose, onSave }: { open: boolean; plan: FiscalHomologationPlan; company: CompanyProfile; settings: ModuleSettings; readOnly: boolean; onClose: () => void; onSave: (plan: FiscalHomologationPlan) => void }) {
  const [draft, setDraft] = useState(plan);
  const [documentTab, setDocumentTab] = useState<FiscalHomologationDocument>('nfe');
  const [selectedScenarioId, setSelectedScenarioId] = useState(plan.scenarios[0]?.id ?? '');
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (!open) return;
    setDraft(normalizeFiscalHomologationPlan(plan, company));
    setDocumentTab('nfe');
    setSelectedScenarioId(plan.scenarios.find((scenario) => scenario.documentType === 'nfe')?.id ?? plan.scenarios[0]?.id ?? '');
    setSubmitted(false);
  }, [open, plan, company]);
  const validation = useMemo(() => validateFiscalHomologationPlan(draft), [draft]);
  if (!open) return null;
  const documentScenarios = draft.scenarios.filter((scenario) => scenario.documentType === documentTab);
  const selectedScenario = draft.scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? documentScenarios[0] ?? draft.scenarios[0];
  const updatePlan = (patch: Partial<FiscalHomologationPlan>) => { setDraft((current) => ({ ...current, ...patch })); setSubmitted(false); };
  const updateScenario = (patch: Partial<FiscalHomologationScenario>) => { if (!selectedScenario) return; setDraft((current) => ({ ...current, scenarios: current.scenarios.map((scenario) => scenario.id === selectedScenario.id ? { ...scenario, ...patch } : scenario) })); setSubmitted(false); };
  const selectDocument = (documentType: FiscalHomologationDocument) => { setDocumentTab(documentType); setSelectedScenarioId(draft.scenarios.find((scenario) => scenario.documentType === documentType)?.id ?? ''); };
  const issuerUf = company.city.match(/\/([A-Z]{2})$/)?.[1] ?? '';
  const issuerCity = company.city.replace(/\/[A-Z]{2}$/, '');
  const syncCompany = () => updatePlan({
    company: { name: company.name, document: company.document, uf: issuerUf, city: issuerCity, cityCode: company.cityCode, taxRegime: company.taxRegime },
    coordinator: draft.coordinator || settings.fiscal.fiscalResponsible,
    providerMode: draft.providerMode === 'Não definido' ? settings.fiscal.providerMode : draft.providerMode,
    nfseAuthorityMode: draft.nfseAuthorityMode === 'Não definido' ? settings.fiscal.nfseAuthorityMode : draft.nfseAuthorityMode,
  });
  const save = () => {
    const normalized = normalizeFiscalHomologationPlan(draft, company);
    const result = validateFiscalHomologationPlan(normalized);
    setDraft(normalized);
    setSubmitted(true);
    if (!result.valid) return;
    onSave(normalized);
  };
  return <Dialog open title="Plano de homologação fiscal" description="Cenários, evidências e aprovações da empresa piloto. Nenhuma transmissão é executada por esta tela." onClose={onClose}>
    <div className="dialog-body fiscal-homologation-body">
      <div className="fiscal-draft-safety"><Icon name="warning" size={19}/><p><strong>Registro local sem efeito fiscal.</strong> “Validado externamente” é uma declaração auditável baseada em evidências; não cria chave, protocolo nem autorização no sistema.</p></div>
      <div className="homologation-metrics" aria-label="Resumo do plano de homologação">
        <div><span>Progresso</span><strong>{validation.progress}%</strong><small>{validation.validated} de {validation.required} obrigatórios</small></div>
        <div><span>Evidências</span><strong>{validation.evidenceCount}</strong><small>com retorno identificado</small></div>
        <div><span>Documentos</span><strong>{draft.documentScope.length}/3</strong><small>incluídos no piloto</small></div>
        <div><span>Referência</span><strong>{FISCAL_HOMOLOGATION_REFERENCE}</strong><small>revisar antes de transmitir</small></div>
      </div>

      <section className="homologation-section">
        <div className="client-section-heading"><h3>Empresa piloto e coordenação</h3><p>O plano pertence ao perfil ativo. Atualize o retrato cadastral sempre que os dados da empresa mudarem.</p></div>
        <div className="homologation-company-head"><div><span>Perfil ativo</span><strong>{company.name}</strong><small>{company.document} · {company.city}</small></div><button type="button" className="button secondary" onClick={syncCompany} disabled={readOnly}><Icon name="arrow" size={16}/> Usar dados atuais</button></div>
        <div className="form-grid">
          <label className="field"><span>Empresa do plano</span><input value={draft.company.name} readOnly/></label>
          <label className="field"><span>CNPJ</span><input value={draft.company.document} readOnly/></label>
          <label className="field"><span>Município/UF</span><input value={`${draft.company.city}/${draft.company.uf}`} readOnly/></label>
          <label className="field"><span>Identificador IBGE automático</span><input value={draft.company.cityCode} readOnly/><small className="field-message">Referência técnica somente para homologação.</small></label>
          <label className="field"><span>Regime tributário</span><input value={draft.company.taxRegime} readOnly/></label>
          <label className="field"><span>Coordenador dos testes</span><input value={draft.coordinator} onChange={(event) => updatePlan({ coordinator: event.target.value })} disabled={readOnly} placeholder="Responsável interno ou fiscal"/></label>
          <label className="field"><span>Data-alvo</span><input type="date" value={draft.targetDate} onChange={(event) => updatePlan({ targetDate: event.target.value })} disabled={readOnly}/></label>
          <label className="field"><span>Estratégia de integração</span><select value={draft.providerMode} onChange={(event) => updatePlan({ providerMode: event.target.value })} disabled={readOnly}><option>Não definido</option><option>Provedor fiscal</option><option>Integração direta</option></select></label>
          <label className="field"><span>Rota da NFS-e</span><select value={draft.nfseAuthorityMode} onChange={(event) => updatePlan({ nfseAuthorityMode: event.target.value })} disabled={readOnly}><option>Não definido</option><option>Padrão nacional</option><option>Prefeitura ou provedor municipal</option></select></label>
          <label className="field field-wide"><span>Notas do ciclo</span><textarea rows={3} value={draft.notes} onChange={(event) => updatePlan({ notes: event.target.value })} disabled={readOnly} placeholder="Dependências, responsáveis externos e decisões do piloto"/></label>
        </div>
      </section>

      <section className="homologation-section">
        <div className="client-section-heading"><h3>Documentos incluídos</h3><p>Desmarque somente documentos que comprovadamente não façam parte da operação desta empresa.</p></div>
        <div className="homologation-document-scope">{(['nfe', 'nfce', 'nfse'] as FiscalHomologationDocument[]).map((documentType) => <label key={documentType}><input type="checkbox" checked={draft.documentScope.includes(documentType)} onChange={(event) => updatePlan({ documentScope: event.target.checked ? [...new Set([...draft.documentScope, documentType])] : draft.documentScope.filter((item) => item !== documentType) })} disabled={readOnly}/><span><strong>{documentLabel(documentType)}</strong><small>{draft.scenarios.filter((scenario) => scenario.documentType === documentType && scenario.required).length} cenários obrigatórios</small></span></label>)}</div>
      </section>

      <section className="homologation-section">
        <div className="client-section-heading"><h3>Cenários e evidências</h3><p>A validação externa só é aceita com data, responsável, evidência e referência do retorno do autorizador.</p></div>
        <div className="segmented homologation-document-tabs" role="group" aria-label="Cenários por documento">{(['nfe', 'nfce', 'nfse'] as FiscalHomologationDocument[]).map((documentType) => <button type="button" key={documentType} className={documentTab === documentType ? 'active' : ''} aria-pressed={documentTab === documentType} onClick={() => selectDocument(documentType)}>{documentLabel(documentType)}</button>)}</div>
        <div className="homologation-workspace">
          <aside aria-label={`Cenários de ${documentLabel(documentTab)}`}>{documentScenarios.map((scenario) => <button type="button" key={scenario.id} className={scenario.id === selectedScenario?.id ? 'active' : ''} onClick={() => setSelectedScenarioId(scenario.id)}><span><strong>{scenario.title}</strong><small>{scenario.required ? 'Obrigatório' : 'Opcional'}</small></span><Badge tone={homologationTone(scenario.status)}>{scenario.status}</Badge></button>)}</aside>
          {selectedScenario && <div className="homologation-scenario-editor">
            <div className="homologation-scenario-heading"><div><span>Cenário selecionado</span><h4>{selectedScenario.title}</h4><p>{documentLabel(selectedScenario.documentType)} · {selectedScenario.id}</p></div><Badge tone={homologationTone(selectedScenario.status)}>{selectedScenario.status}</Badge></div>
            <div className="form-grid">
              <label className="field"><span>Situação do cenário</span><select value={selectedScenario.status} onChange={(event) => updateScenario({ status: event.target.value as FiscalHomologationStatus })} disabled={readOnly}>{FISCAL_HOMOLOGATION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="check-field"><input type="checkbox" checked={selectedScenario.required} onChange={(event) => updateScenario({ required: event.target.checked })} disabled={readOnly}/><span><strong>Cenário obrigatório</strong><small>Precisa ser validado para concluir o ciclo.</small></span></label>
              <label className="field field-wide"><span>Objetivo do teste</span><textarea rows={3} value={selectedScenario.purpose} onChange={(event) => updateScenario({ purpose: event.target.value })} disabled={readOnly}/></label>
              <label className="field field-wide"><span>Resultado esperado</span><textarea rows={3} value={selectedScenario.expectedResult} onChange={(event) => updateScenario({ expectedResult: event.target.value })} disabled={readOnly}/></label>
              <label className="field"><span>Testado por</span><input value={selectedScenario.testedBy} onChange={(event) => updateScenario({ testedBy: event.target.value })} disabled={readOnly} placeholder="Responsável pelo teste"/></label>
              <label className="field"><span>Data do teste</span><input type="date" value={selectedScenario.testedAt} onChange={(event) => updateScenario({ testedAt: event.target.value })} disabled={readOnly}/></label>
              <label className="field"><span>Referência da evidência</span><input value={selectedScenario.evidenceReference} onChange={(event) => updateScenario({ evidenceReference: event.target.value })} disabled={readOnly} placeholder="Ex.: EVID-NFE-001"/></label>
              <label className="field"><span>Protocolo ou retorno externo</span><input value={selectedScenario.externalReference} onChange={(event) => updateScenario({ externalReference: event.target.value })} disabled={readOnly} placeholder="Protocolo, cStat ou ID do provedor"/></label>
              <label className="field field-wide"><span>Observações do teste</span><textarea rows={3} value={selectedScenario.notes} onChange={(event) => updateScenario({ notes: event.target.value })} disabled={readOnly} placeholder="Rejeições, correções e conferências realizadas"/></label>
            </div>
          </div>}
        </div>
      </section>

      <div className={`homologation-validation ${submitted && validation.errors.length ? 'error' : validation.readyForExternalCycle ? 'ready' : ''}`} role="status">
        <span><Icon name={validation.errors.length ? 'warning' : validation.readyForExternalCycle ? 'check' : 'clock'} size={18}/></span>
        <div><strong>{validation.errors.length ? `${validation.errors.length} bloqueios no plano` : validation.externallyValidated ? 'Ciclo externo registrado como concluído' : validation.readyForExternalCycle ? 'Plano pronto para iniciar testes externos' : 'Planejamento ainda incompleto'}</strong><small>{validation.errors[0] ?? validation.warnings[0] ?? 'Todas as evidências obrigatórias foram registradas.'}</small></div>
      </div>
      {submitted && validation.errors.length > 1 && <ul className="fiscal-warning-list">{validation.errors.slice(1).map((error) => <li key={error}>{error}</li>)}</ul>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</button><button type="button" className="button primary" onClick={save} disabled={readOnly}>Salvar plano de homologação</button></footer>
  </Dialog>;
}

function FiscalIntegrationEvaluationDialog({ open, evaluation, readOnly, onClose, onSave }: { open: boolean; evaluation: FiscalIntegrationEvaluation; readOnly: boolean; onClose: () => void; onSave: (evaluation: FiscalIntegrationEvaluation) => void }) {
  const [draft, setDraft] = useState(evaluation);
  const [selectedCandidateId, setSelectedCandidateId] = useState(evaluation.candidates[0]?.id ?? '');
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (!open) return;
    const normalized = normalizeFiscalIntegrationEvaluation(evaluation);
    setDraft(normalized);
    setSelectedCandidateId(normalized.candidates[0]?.id ?? '');
    setSubmitted(false);
  }, [open, evaluation]);
  const result = useMemo(() => validateFiscalIntegrationEvaluation(draft), [draft]);
  if (!open) return null;
  const selected = draft.candidates.find((candidate) => candidate.id === selectedCandidateId) ?? draft.candidates[0];
  const selectedResult = result.candidates.find((candidate) => candidate.id === selected?.id);
  const recommended = result.candidates.find((candidate) => candidate.id === result.recommendedCandidateId);
  const update = (patch: Partial<FiscalIntegrationEvaluation>) => { setDraft((current) => ({ ...current, ...patch })); setSubmitted(false); };
  const updateCandidate = (patch: Partial<FiscalIntegrationCandidate>) => { if (!selected) return; setDraft((current) => ({ ...current, candidates: current.candidates.map((candidate) => candidate.id === selected.id ? { ...candidate, ...patch } : candidate) })); setSubmitted(false); };
  const addCandidate = () => {
    const base = createDefaultFiscalIntegrationEvaluation().candidates[0];
    const next = { ...base, id: `candidate-${Date.now()}`, name: `Novo candidato ${draft.candidates.length + 1}` };
    update({ candidates: [...draft.candidates, next] });
    setSelectedCandidateId(next.id);
  };
  const removeCandidate = () => {
    if (!selected || draft.candidates.length <= 1) return;
    const nextCandidates = draft.candidates.filter((candidate) => candidate.id !== selected.id);
    const nextDecision = draft.decision.candidateId === selected.id ? { ...draft.decision, status: 'Sem decisão' as const, candidateId: '' } : draft.decision;
    update({ candidates: nextCandidates, decision: nextDecision });
    setSelectedCandidateId(nextCandidates[0]?.id ?? '');
  };
  const save = () => {
    const normalized = normalizeFiscalIntegrationEvaluation(draft);
    const validation = validateFiscalIntegrationEvaluation(normalized);
    setDraft(normalized);
    setSubmitted(true);
    if (!validation.valid) return;
    onSave(normalized);
  };
  return <Dialog open title="Avaliação da integração fiscal" description="Compare alternativas por cobertura, risco, custo total e capacidade de homologação. Esta tela não contrata nem conecta serviços." onClose={onClose}>
    <div className="dialog-body fiscal-integration-evaluation-body">
      <div className="fiscal-draft-safety"><Icon name="warning" size={19}/><p><strong>Decisão preparatória, sem contratação.</strong> Pontuações e valores são estimativas da empresa. Nenhuma credencial, certificado ou aceite comercial deve ser registrado aqui.</p></div>
      <div className="integration-evaluation-metrics" aria-label="Resumo da avaliação de integração fiscal">
        <div><span>Alternativas</span><strong>{draft.candidates.length}</strong><small>{result.candidates.filter((candidate) => candidate.complete).length} completas</small></div>
        <div><span>Pesos</span><strong>{result.criteriaWeight}%</strong><small>{result.criteriaWeight === 100 ? 'matriz equilibrada' : 'revisão obrigatória'}</small></div>
        <div><span>Melhor pontuação válida</span><strong>{recommended ? `${recommended.weightedScore.toLocaleString('pt-BR')}%` : '—'}</strong><small>{recommended?.name ?? 'nenhuma alternativa completa'}</small></div>
        <div><span>Decisão</span><strong>{draft.decision.status}</strong><small>produção não liberada</small></div>
      </div>

      <section className="integration-evaluation-section">
        <div className="client-section-heading"><h3>Escopo e volume</h3><p>O custo mensal estimado usa a mensalidade, o volume, o valor por documento e 1/12 da implantação.</p></div>
        <div className="form-grid">
          <label className="field"><span>Documentos estimados por mês</span><input inputMode="numeric" value={draft.monthlyDocumentVolume} onChange={(event) => update({ monthlyDocumentVolume: Math.max(1, Number(event.target.value.replace(/\D/g, '')) || 1) })} disabled={readOnly}/></label>
          <div className="field field-wide"><span>Documentos obrigatórios</span><div className="integration-document-checks">{(['nfe', 'nfce', 'nfse'] as FiscalIntegrationDocument[]).map((documentType) => <label key={documentType}><input type="checkbox" checked={draft.requiredDocuments.includes(documentType)} onChange={(event) => update({ requiredDocuments: event.target.checked ? [...new Set([...draft.requiredDocuments, documentType])] : draft.requiredDocuments.filter((item) => item !== documentType) })} disabled={readOnly}/><span>{documentLabel(documentType)}</span></label>)}</div></div>
        </div>
      </section>

      <section className="integration-evaluation-section">
        <div className="integration-evaluation-heading"><div className="client-section-heading"><h3>Alternativas avaliadas</h3><p>Cadastre fornecedores diferentes como candidatos separados. “Integração direta” representa desenvolvimento e operação próprios.</p></div><button type="button" className="button secondary" onClick={addCandidate} disabled={readOnly}><Icon name="plus" size={16}/> Adicionar candidato</button></div>
        <div className="integration-evaluation-workspace">
          <aside aria-label="Alternativas de integração fiscal">{result.candidates.map((candidate) => <button type="button" key={candidate.id} className={candidate.id === selected?.id ? 'active' : ''} onClick={() => setSelectedCandidateId(candidate.id)}><span><strong>{candidate.name}</strong><small>{candidate.mode} · {candidate.weightedScore.toLocaleString('pt-BR')}%</small></span><Badge tone={candidate.complete ? 'success' : 'warning'}>{candidate.complete ? 'Completa' : `${candidate.mandatoryGaps.length} pendências`}</Badge></button>)}</aside>
          {selected && selectedResult && <div className="integration-candidate-editor">
            <div className="integration-candidate-heading"><div><span>Alternativa selecionada</span><h4>{selected.name}</h4><p>{selected.mode} · custo mensal estimado {money(selectedResult.monthlyCost)}</p></div><button type="button" className="button secondary" onClick={removeCandidate} disabled={readOnly || draft.candidates.length <= 1}><Icon name="close" size={15}/> Excluir</button></div>
            <div className="form-grid">
              <label className="field"><span>Nome do candidato</span><input value={selected.name} onChange={(event) => updateCandidate({ name: event.target.value })} disabled={readOnly}/></label>
              <label className="field"><span>Modelo de integração</span><select value={selected.mode} onChange={(event) => updateCandidate({ mode: event.target.value as FiscalIntegrationMode })} disabled={readOnly}>{FISCAL_INTEGRATION_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></label>
              <div className="field field-wide"><span>Documentos com cobertura confirmada</span><div className="integration-document-checks">{(['nfe', 'nfce', 'nfse'] as FiscalIntegrationDocument[]).map((documentType) => <label key={documentType}><input type="checkbox" checked={selected.documents.includes(documentType)} onChange={(event) => updateCandidate({ documents: event.target.checked ? [...new Set([...selected.documents, documentType])] : selected.documents.filter((item) => item !== documentType) })} disabled={readOnly}/><span>{documentLabel(documentType)}</span></label>)}</div></div>
              <label className="field field-wide"><span>Cobertura municipal da NFS-e</span><input value={selected.municipalityCoverage} onChange={(event) => updateCandidate({ municipalityCoverage: event.target.value })} disabled={readOnly} placeholder="Municípios, padrão nacional ou limitações declaradas"/></label>
              <label className="check-field"><input type="checkbox" checked={selected.testEnvironment} onChange={(event) => updateCandidate({ testEnvironment: event.target.checked })} disabled={readOnly}/><span><strong>Ambiente de testes confirmado</strong><small>Sandbox ou produção restrita acessível ao piloto.</small></span></label>
              <label className="check-field"><input type="checkbox" checked={selected.apiDocumentationReviewed} onChange={(event) => updateCandidate({ apiDocumentationReviewed: event.target.checked })} disabled={readOnly}/><span><strong>Documentação técnica revisada</strong><small>Endpoints, eventos, limites e versionamento conferidos.</small></span></label>
              <label className="field"><span>Modelo de certificado</span><select value={selected.certificateModel} onChange={(event) => updateCandidate({ certificateModel: event.target.value })} disabled={readOnly}><option>Não definido</option><option>Certificado A1</option><option>Certificado em nuvem</option><option>Modelo PAA habilitado</option><option>Responsabilidade do fornecedor</option></select></label>
              <label className="field"><span>Suporte</span><select value={selected.supportModel} onChange={(event) => updateCandidate({ supportModel: event.target.value })} disabled={readOnly}><option>Não definido</option><option>Horário comercial</option><option>Plantão fiscal</option><option>24x7</option><option>Equipe interna</option></select></label>
              <label className="field"><span>Contingência</span><select value={selected.contingencyModel} onChange={(event) => updateCandidate({ contingencyModel: event.target.value })} disabled={readOnly}><option>Não definido</option><option>Retentativa e reconciliação</option><option>Plano por autorizador</option><option>Operação interna</option></select></label>
              <label className="field"><span>Guarda dos artefatos</span><div className="input-prefix suffix"><input inputMode="numeric" value={selected.storageYears || ''} onChange={(event) => updateCandidate({ storageYears: Math.max(0, Number(event.target.value.replace(/\D/g, '')) || 0) })} disabled={readOnly}/><i>anos</i></div></label>
            </div>
            <div className="integration-cost-grid">
              <LineNumberEditor label="Implantação" value={selected.setupFee} onChange={(value) => updateCandidate({ setupFee: value })} moneyValue disabled={readOnly}/>
              <LineNumberEditor label="Mensalidade" value={selected.monthlyFee} onChange={(value) => updateCandidate({ monthlyFee: value })} moneyValue disabled={readOnly}/>
              <LineNumberEditor label="Por documento" value={selected.perDocumentFee} onChange={(value) => updateCandidate({ perDocumentFee: value })} step={0.01} moneyValue disabled={readOnly}/>
              <label className="field"><span>Implantação estimada</span><div className="input-prefix suffix"><input inputMode="numeric" value={selected.implementationDays || ''} onChange={(event) => updateCandidate({ implementationDays: Math.max(0, Number(event.target.value.replace(/\D/g, '')) || 0) })} disabled={readOnly}/><i>dias</i></div></label>
              <label className="field"><span>SLA informado</span><div className="input-prefix suffix"><input inputMode="decimal" value={String(selected.slaPercent || '').replace('.', ',')} onChange={(event) => updateCandidate({ slaPercent: Math.min(100, commercialNumber(event.target.value)) })} disabled={readOnly}/><i>%</i></div></label>
              <label className="field"><span>Prazo contratual</span><div className="input-prefix suffix"><input inputMode="numeric" value={selected.contractTermMonths || ''} onChange={(event) => updateCandidate({ contractTermMonths: Math.max(0, Number(event.target.value.replace(/\D/g, '')) || 0) })} disabled={readOnly}/><i>meses</i></div></label>
            </div>
            <div className="integration-score-list"><div className="client-section-heading"><h3>Pontuação ponderada</h3><p>Notas de 0 a 5. Critérios obrigatórios com nota zero impedem a aprovação.</p></div>{draft.criteria.map((criterion) => <div key={criterion.id}><span><strong>{criterion.name}</strong><small>{criterion.description}</small></span><label><span>Peso</span><input inputMode="numeric" value={criterion.weight} onChange={(event) => update({ criteria: draft.criteria.map((item) => item.id === criterion.id ? { ...item, weight: Math.min(100, Math.max(0, Number(event.target.value.replace(/\D/g, '')) || 0)) } : item) })} disabled={readOnly} aria-label={`Peso de ${criterion.name}`}/></label><label><span>Nota</span><select value={selected.ratings[criterion.id] ?? 0} onChange={(event) => updateCandidate({ ratings: { ...selected.ratings, [criterion.id]: Number(event.target.value) } })} disabled={readOnly} aria-label={`Nota de ${criterion.name}`}><option value="0">0 · Não avaliado</option><option value="1">1 · Insuficiente</option><option value="2">2 · Fraco</option><option value="3">3 · Adequado</option><option value="4">4 · Bom</option><option value="5">5 · Excelente</option></select></label></div>)}</div>
            <div className="form-grid"><label className="field field-wide"><span>Plano de saída e portabilidade</span><textarea rows={3} value={selected.exitPlan} onChange={(event) => updateCandidate({ exitPlan: event.target.value })} disabled={readOnly} placeholder="Exportação de XML, protocolos, eventos, logs e prazo de transição"/></label><label className="field field-wide"><span>Observações da avaliação</span><textarea rows={3} value={selected.notes} onChange={(event) => updateCandidate({ notes: event.target.value })} disabled={readOnly} placeholder="Riscos, ressalvas comerciais e dúvidas pendentes"/></label></div>
            {selectedResult.mandatoryGaps.length > 0 && <div className="integration-gap-list"><strong>Requisitos pendentes</strong><ul>{selectedResult.mandatoryGaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></div>}
          </div>}
        </div>
      </section>

      <section className="integration-evaluation-section">
        <div className="client-section-heading"><h3>Decisão assistida</h3><p>A aprovação libera somente a próxima fase de homologação. Não autoriza contrato, produção ou transmissão.</p></div>
        <div className="form-grid">
          <label className="field"><span>Situação da decisão</span><select value={draft.decision.status} onChange={(event) => update({ decision: { ...draft.decision, status: event.target.value as FiscalIntegrationEvaluation['decision']['status'] } })} disabled={readOnly}>{FISCAL_INTEGRATION_DECISION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label className="field"><span>Alternativa selecionada</span><select value={draft.decision.candidateId} onChange={(event) => update({ decision: { ...draft.decision, candidateId: event.target.value } })} disabled={readOnly}><option value="">Selecionar</option>{draft.candidates.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name}</option>)}</select></label>
          <label className="field"><span>Decidido por</span><input value={draft.decision.decidedBy} onChange={(event) => update({ decision: { ...draft.decision, decidedBy: event.target.value } })} disabled={readOnly}/></label>
          <label className="field"><span>Data da decisão</span><input type="date" value={draft.decision.decidedAt} onChange={(event) => update({ decision: { ...draft.decision, decidedAt: event.target.value } })} disabled={readOnly}/></label>
          <label className="field field-wide"><span>Justificativa</span><textarea rows={3} value={draft.decision.justification} onChange={(event) => update({ decision: { ...draft.decision, justification: event.target.value } })} disabled={readOnly} placeholder="Cobertura, riscos, custo total e motivos da escolha"/></label>
        </div>
      </section>

      <div className={`homologation-validation ${submitted && result.errors.length ? 'error' : result.approvedForHomologation ? 'ready' : ''}`} role="status"><span><Icon name={result.errors.length ? 'warning' : result.approvedForHomologation ? 'check' : 'clock'} size={18}/></span><div><strong>{result.errors.length ? `${result.errors.length} bloqueios na avaliação` : result.approvedForHomologation ? 'Alternativa aprovada para homologação' : recommended ? `Melhor alternativa completa: ${recommended.name}` : 'Comparação ainda incompleta'}</strong><small>{result.errors[0] ?? result.warnings[0] ?? 'A decisão foi documentada sem liberar produção.'}</small></div></div>
      {submitted && result.errors.length > 1 && <ul className="fiscal-warning-list">{result.errors.slice(1).map((error) => <li key={error}>{error}</li>)}</ul>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</button><button type="button" className="button primary" onClick={save} disabled={readOnly}>Salvar avaliação</button></footer>
  </Dialog>;
}

function FiscalIssuerRegistryDialog({ open, registry, company, readOnly, onClose, onSave }: { open: boolean; registry: FiscalIssuerRegistry; company: CompanyProfile; readOnly: boolean; onClose: () => void; onSave: (registry: FiscalIssuerRegistry) => void }) {
  const [draft, setDraft] = useState(registry);
  const [selectedId, setSelectedId] = useState(registry.defaultEstablishmentId || registry.establishments[0]?.id || '');
  const [submitted, setSubmitted] = useState(false);
  const [lookup, setLookup] = useState<{ kind: 'cnpj' | 'cep'; message: string; tone: 'success' | 'error' } | null>(null);
  const [searching, setSearching] = useState<'cnpj' | 'cep' | null>(null);
  useEffect(() => {
    if (!open) return;
    const normalized = normalizeFiscalIssuerRegistry(registry, company);
    setDraft(normalized);
    setSelectedId(normalized.defaultEstablishmentId || normalized.establishments[0]?.id || '');
    setSubmitted(false);
    setLookup(null);
    setSearching(null);
  }, [open, registry, company]);
  const validation = useMemo(() => validateFiscalIssuerRegistry(draft, company), [draft, company]);
  if (!open) return null;
  const selected = draft.establishments.find((item) => item.id === selectedId) ?? draft.establishments[0];
  const selectedResult = validation.establishments.find((item) => item.id === selected?.id);
  const updateRegistry = (patch: Partial<FiscalIssuerRegistry>) => { setDraft((current) => ({ ...current, ...patch })); setSubmitted(false); };
  const updateEstablishment = (patch: Partial<FiscalEstablishment>) => {
    if (!selected) return;
    setDraft((current) => ({
      ...current,
      establishments: current.establishments.map((item) => {
        if (item.id !== selected.id) return item;
        const next = { ...item, ...patch };
        if ('city' in patch || 'uf' in patch || 'cep' in patch) {
          next.cityCode = resolveMunicipalityCode({ city: next.city, uf: next.uf, cep: next.cep });
        }
        return next;
      }),
    }));
    setSubmitted(false);
  };
  const updateDocument = (documentType: FiscalDocumentType, patch: Record<string, unknown>) => {
    if (!selected) return;
    updateEstablishment({ documents: { ...selected.documents, [documentType]: { ...selected.documents[documentType], ...patch } } });
  };
  const addEstablishment = () => {
    const base = createFiscalEstablishmentFromCompany({}, draft.establishments.length);
    const next = { ...base, id: `establishment-${Date.now()}`, label: `Filial ${draft.establishments.length + 1}`, kind: 'Filial' as const, legalName: '', document: '', uf: '', city: '', cityCode: '', cep: '', street: '', number: '', complement: '', district: '', phone: '', taxRegime: company.taxRegime || 'Não definido', stateRegistration: '', municipalRegistration: '' };
    updateRegistry({ establishments: [...draft.establishments, next] });
    setSelectedId(next.id);
  };
  const syncCompany = () => {
    if (!selected) return;
    const synced = createFiscalEstablishmentFromCompany(company);
    updateEstablishment({ legalName: synced.legalName, document: synced.document, uf: synced.uf, city: synced.city, cityCode: synced.cityCode, cep: synced.cep, street: synced.street, number: synced.number, complement: synced.complement, district: synced.district, phone: synced.phone, taxRegime: synced.taxRegime, stateRegistration: synced.stateRegistration, municipalRegistration: synced.municipalRegistration });
  };
  const searchEstablishmentCnpj = () => {
    if (!selected) return;
    const document = selected.document.replace(/\D/g, '');
    if (document.length !== 14) { setLookup({ kind: 'cnpj', message: 'Informe os 14 dígitos do CNPJ.', tone: 'error' }); return; }
    setSearching('cnpj');
    setLookup(null);
    window.setTimeout(() => {
      const found = demoCnpjDirectory[document] ?? clients.find((item) => item.document.replace(/\D/g, '') === document);
      setSearching(null);
      if (!found) { setLookup({ kind: 'cnpj', message: 'CNPJ não encontrado na base local. Você pode preencher os dados manualmente.', tone: 'error' }); return; }
      updateEstablishment({
        document,
        legalName: found.legalName ?? selected.legalName,
        stateRegistration: found.stateRegistration ?? selected.stateRegistration,
        municipalRegistration: found.municipalRegistration ?? selected.municipalRegistration,
        cep: found.cep?.replace(/\D/g, '') ?? selected.cep,
        street: found.street ?? selected.street,
        number: found.number ?? selected.number,
        complement: found.complement ?? selected.complement,
        district: found.district ?? selected.district,
        city: found.cityName ?? selected.city,
        cityCode: found.cityCode ?? selected.cityCode,
        uf: found.state ?? selected.uf,
        phone: found.phone?.replace(/\D/g, '') ?? selected.phone,
      });
      setLookup({ kind: 'cnpj', message: 'Dados cadastrais preenchidos. Revise as informações antes de salvar.', tone: 'success' });
    }, 320);
  };
  const searchEstablishmentCep = () => {
    if (!selected) return;
    const cep = selected.cep.replace(/\D/g, '');
    if (cep.length !== 8) { setLookup({ kind: 'cep', message: 'Informe os 8 dígitos do CEP.', tone: 'error' }); return; }
    setSearching('cep');
    setLookup(null);
    window.setTimeout(() => {
      const found = demoCepDirectory[cep] ?? clients.find((item) => item.cep.replace(/\D/g, '') === cep);
      setSearching(null);
      if (!found) { setLookup({ kind: 'cep', message: 'CEP não encontrado na base local. Você pode preencher o endereço manualmente.', tone: 'error' }); return; }
      updateEstablishment({ cep, street: found.street, district: found.district, city: found.cityName, cityCode: found.cityCode, uf: found.state });
      setLookup({ kind: 'cep', message: 'Endereço preenchido. Revise e complete número e complemento.', tone: 'success' });
    }, 320);
  };
  const removeEstablishment = () => {
    if (!selected || draft.establishments.length <= 1) return;
    const establishments = draft.establishments.filter((item) => item.id !== selected.id);
    const nextDefault = draft.defaultEstablishmentId === selected.id ? establishments.find((item) => item.active)?.id || establishments[0]?.id || '' : draft.defaultEstablishmentId;
    updateRegistry({ establishments, defaultEstablishmentId: nextDefault });
    setSelectedId(nextDefault || establishments[0]?.id || '');
  };
  const save = () => {
    const normalized = normalizeFiscalIssuerRegistry(draft, company);
    const result = validateFiscalIssuerRegistry(normalized, company);
    setDraft(normalized);
    setSubmitted(true);
    if (!result.valid) return;
    onSave(normalized);
  };
  return <Dialog open title="Estabelecimentos emissores" description="Cada matriz ou filial usa o credenciamento da própria jurisdição. O estado do comprador não cria outro cadastro." onClose={onClose}>
    <div className="dialog-body fiscal-issuer-registry-body">
      <div className="fiscal-draft-safety"><Icon name="warning" size={19}/><p><strong>Roteamento demonstrativo, sem conexão.</strong> Nenhuma inscrição, CSC, certificado ou credencial é validada ou transmitida nesta tela.</p></div>
      <div className="integration-evaluation-metrics" aria-label="Resumo dos estabelecimentos emissores">
        <div><span>Estabelecimentos</span><strong>{validation.establishments.length}</strong><small>{validation.activeCount} ativos</small></div>
        <div><span>Rotas habilitadas</span><strong>{validation.enabledRouteCount}</strong><small>NF-e, NFC-e e NFS-e</small></div>
        <div><span>Prontas para homologação</span><strong>{validation.readyRouteCount}</strong><small>credenciamento declarado</small></div>
        <div><span>Emissor padrão</span><strong>{validation.defaultEstablishment?.label ?? 'Não definido'}</strong><small>{validation.defaultEstablishment ? `${validation.defaultEstablishment.city}/${validation.defaultEstablishment.uf}` : 'selecione um estabelecimento'}</small></div>
      </div>
      <section className="integration-evaluation-section">
        <div className="integration-evaluation-heading"><div className="client-section-heading"><h3>Cadastro por estabelecimento</h3><p>Cadastre somente locais que efetivamente emitem. Vender para outra UF não cria uma filial nem um novo credenciamento.</p></div><button type="button" className="button secondary" onClick={addEstablishment} disabled={readOnly}><Icon name="plus" size={16}/> Adicionar filial</button></div>
        <div className="integration-evaluation-workspace">
          <aside aria-label="Estabelecimentos emissores">{validation.establishments.map((item) => <button type="button" key={item.id} className={item.id === selected?.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}><span><strong>{item.label}</strong><small>{formatCnpj(item.document) || 'CNPJ pendente'} · {item.city || 'Município pendente'}/{item.uf || 'UF'}</small></span><Badge tone={!item.active ? 'neutral' : item.readyDocuments.length === item.enabledDocuments.length && item.enabledDocuments.length ? 'success' : 'warning'}>{!item.active ? 'Inativo' : `${item.readyDocuments.length}/${item.enabledDocuments.length} prontas`}</Badge></button>)}</aside>
          {selected && selectedResult && <div className="integration-candidate-editor">
            <div className="integration-candidate-heading"><div><span>Estabelecimento selecionado</span><h4>{selected.label}</h4><p>{selected.kind} · {formatCnpj(selected.document) || 'CNPJ pendente'}</p></div><button type="button" className="button secondary" onClick={removeEstablishment} disabled={readOnly || draft.establishments.length <= 1}><Icon name="close" size={15}/> Excluir</button></div>
            <div className="issuer-editor-actions"><button type="button" className="button secondary" onClick={syncCompany} disabled={readOnly}><Icon name="copy" size={15}/> Sincronizar empresa ativa</button><label className="check-field"><input type="checkbox" checked={draft.defaultEstablishmentId === selected.id} onChange={(event) => event.target.checked && updateRegistry({ defaultEstablishmentId: selected.id })} disabled={readOnly}/><span><strong>Emissor padrão</strong><small>Usado quando a operação não indicar outra filial.</small></span></label></div>
            <div className="form-grid">
              <label className="field"><span>CNPJ *</span><div className="lookup-control"><input inputMode="numeric" value={formatCnpj(selected.document)} onChange={(event) => { updateEstablishment({ document: event.target.value.replace(/\D/g, '').slice(0, 14) }); setLookup(null); }} disabled={readOnly} maxLength={18} placeholder="00.000.000/0000-00"/><button type="button" onClick={searchEstablishmentCnpj} disabled={readOnly || searching === 'cnpj'} aria-label="Buscar dados do estabelecimento pelo CNPJ">{searching === 'cnpj' ? 'Buscando…' : 'Buscar'}</button></div>{lookup?.kind === 'cnpj' && <small className={`lookup-message ${lookup.tone}`} role="status">{lookup.message}</small>}</label>
              <label className="field"><span>Identificação *</span><input value={selected.label} onChange={(event) => updateEstablishment({ label: event.target.value })} disabled={readOnly} maxLength={80}/></label>
              <label className="field"><span>Tipo</span><select value={selected.kind} onChange={(event) => updateEstablishment({ kind: event.target.value as FiscalEstablishment['kind'] })} disabled={readOnly}><option>Matriz</option><option>Filial</option></select></label>
              <label className="field field-wide"><span>Razão social *</span><input value={selected.legalName} onChange={(event) => updateEstablishment({ legalName: event.target.value })} disabled={readOnly} maxLength={120}/></label>
              <label className="field"><span>Regime tributário *</span><select value={selected.taxRegime} onChange={(event) => updateEstablishment({ taxRegime: event.target.value })} disabled={readOnly}><option>Não definido</option><option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option></select></label>
              <label className="field"><span>CEP *</span><div className="lookup-control"><input inputMode="numeric" value={formatCep(selected.cep)} onChange={(event) => { updateEstablishment({ cep: event.target.value.replace(/\D/g, '').slice(0, 8) }); setLookup(null); }} disabled={readOnly} maxLength={9} placeholder="00000-000"/><button type="button" onClick={searchEstablishmentCep} disabled={readOnly || searching === 'cep'} aria-label="Buscar endereço do estabelecimento pelo CEP">{searching === 'cep' ? 'Buscando…' : 'Buscar'}</button></div>{lookup?.kind === 'cep' && <small className={`lookup-message ${lookup.tone}`} role="status">{lookup.message}</small>}</label>
              <label className="field"><span>Logradouro fiscal *</span><input value={selected.street} onChange={(event) => updateEstablishment({ street: event.target.value })} disabled={readOnly} maxLength={60}/></label>
              <label className="field"><span>Número *</span><input value={selected.number} onChange={(event) => updateEstablishment({ number: event.target.value })} disabled={readOnly} maxLength={60}/></label>
              <label className="field"><span>Complemento</span><input value={selected.complement} onChange={(event) => updateEstablishment({ complement: event.target.value })} disabled={readOnly} maxLength={60}/></label>
              <label className="field"><span>Bairro fiscal *</span><input value={selected.district} onChange={(event) => updateEstablishment({ district: event.target.value })} disabled={readOnly} maxLength={60}/></label>
              <label className="field"><span>Município *</span><input value={selected.city} onChange={(event) => updateEstablishment({ city: event.target.value })} disabled={readOnly} maxLength={80}/><small className={`field-message${municipalityIsResolved(selected.cityCode) ? '' : ' error'}`} role="status">{municipalityIsResolved(selected.cityCode) ? 'Município fiscal identificado automaticamente.' : 'Use Buscar CEP ou revise município e UF para concluir a identificação fiscal.'}</small></label>
              <label className="field"><span>UF *</span><select value={selected.uf} onChange={(event) => updateEstablishment({ uf: event.target.value })} disabled={readOnly}><option value="">Selecionar</option>{brazilStateCodes.map((uf) => <option key={uf}>{uf}</option>)}</select></label>
              <label className="field"><span>Telefone fiscal</span><input inputMode="tel" value={selected.phone} onChange={(event) => updateEstablishment({ phone: event.target.value.replace(/\D/g, '').slice(0, 14) })} disabled={readOnly} maxLength={14}/></label>
              <label className="field"><span>Inscrição estadual</span><input value={selected.stateRegistration} onChange={(event) => updateEstablishment({ stateRegistration: event.target.value })} disabled={readOnly} maxLength={30}/></label>
              <label className="field"><span>Inscrição municipal</span><input value={selected.municipalRegistration} onChange={(event) => updateEstablishment({ municipalRegistration: event.target.value })} disabled={readOnly} maxLength={30}/></label>
              <label className="check-field"><input type="checkbox" checked={selected.active} onChange={(event) => updateEstablishment({ active: event.target.checked })} disabled={readOnly || (selected.id === draft.defaultEstablishmentId && selected.active)}/><span><strong>Estabelecimento ativo</strong><small>Pode ser escolhido em novas operações.</small></span></label>
            </div>
            <div className="issuer-document-grid">{(['nfe', 'nfce', 'nfse'] as FiscalDocumentType[]).map((documentType) => {
              const registration = selected.documents[documentType];
              const route = selectedResult.routes[documentType];
              return <section key={documentType} className="issuer-document-section"><header><div><strong>{documentLabel(documentType)}</strong><small>{documentType === 'nfe' ? 'Venda de produtos' : documentType === 'nfce' ? 'Venda ao consumidor' : 'Prestação de serviços'}</small></div><label><input type="checkbox" checked={registration.enabled} onChange={(event) => updateDocument(documentType, { enabled: event.target.checked })} disabled={readOnly}/><span>Habilitar</span></label></header><div className="form-grid">
                <label className="field"><span>Credenciamento</span><select value={registration.registrationStatus} onChange={(event) => updateDocument(documentType, { registrationStatus: event.target.value as FiscalRegistrationStatus })} disabled={readOnly || !registration.enabled}>{FISCAL_REGISTRATION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label className="field"><span>Série</span><input inputMode="numeric" value={registration.series} onChange={(event) => updateDocument(documentType, { series: event.target.value.replace(/\D/g, '').slice(0, documentType === 'nfse' ? 5 : 3) })} disabled={readOnly || !registration.enabled}/></label>
                {documentType === 'nfce' && <label className="field field-wide"><span>Situação do CSC</span><select value={selected.documents.nfce.cscStatus} onChange={(event) => updateDocument('nfce', { cscStatus: event.target.value as FiscalCscStatus })} disabled={readOnly || !registration.enabled}>{FISCAL_CSC_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>}
                {documentType === 'nfse' && <label className="field field-wide"><span>Rota da NFS-e</span><select value={selected.documents.nfse.routeMode} onChange={(event) => updateDocument('nfse', { routeMode: event.target.value as FiscalNfseRouteMode })} disabled={readOnly || !registration.enabled}>{FISCAL_NFSE_ROUTE_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></label>}
              </div><div className={`issuer-route-preview ${route.readyForHomologation ? 'ready' : ''}`}><span><Icon name={route.readyForHomologation ? 'check' : 'arrow'} size={16}/></span><div><strong>{route.authority}</strong><small>{route.explanation}</small><p>{route.contingency}</p></div><Badge tone={route.readyForHomologation ? 'success' : registration.enabled ? 'warning' : 'neutral'}>{route.readyForHomologation ? 'Rota pronta' : registration.enabled ? 'Pendente' : 'Desabilitada'}</Badge></div>{registration.enabled && route.blockers.length > 0 && <ul className="issuer-route-blockers">{route.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}</section>;
            })}</div>
          </div>}
        </div>
      </section>
      <div className={`homologation-validation ${submitted && validation.errors.length ? 'error' : validation.valid ? 'ready' : ''}`} role="status"><span><Icon name={validation.errors.length ? 'warning' : 'check'} size={18}/></span><div><strong>{validation.errors.length ? `${validation.errors.length} bloqueios no cadastro` : 'Estrutura de emissores consistente'}</strong><small>{validation.errors[0] ?? validation.warnings[0] ?? 'As rotas foram calculadas sem liberar qualquer conexão externa.'}</small></div></div>
      {submitted && validation.errors.length > 1 && <ul className="fiscal-warning-list">{validation.errors.slice(1).map((error) => <li key={error}>{error}</li>)}</ul>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</button><button type="button" className="button primary" onClick={save} disabled={readOnly}>Salvar estabelecimentos</button></footer>
  </Dialog>;
}

function NfeSpHomologationDialog({ open, config, issuerRegistry, drafts, clients, company, settings, readOnly, onClose, onSave }: { open: boolean; config: NfeSpHomologationConfig; issuerRegistry: FiscalIssuerRegistry; drafts: FiscalDraftRecord[]; clients: ClientRecord[]; company: CompanyProfile; settings: ModuleSettings; readOnly: boolean; onClose: () => void; onSave: (config: NfeSpHomologationConfig) => void }) {
  const [draft, setDraft] = useState(config);
  const [diagnosticRun, setDiagnosticRun] = useState(false);
  const [preXmlLoading, setPreXmlLoading] = useState(false);
  const [preXmlDiagnostic, setPreXmlDiagnostic] = useState<NfeSpPreXmlDiagnostic | null>(null);
  const [signatureLabLoading, setSignatureLabLoading] = useState(false);
  const [signatureLabDiagnostic, setSignatureLabDiagnostic] = useState<NfeSpSignatureLabDiagnostic | null>(null);
  const [certificateReadinessLoading, setCertificateReadinessLoading] = useState(false);
  const [certificateReadinessDiagnostic, setCertificateReadinessDiagnostic] = useState<NfeCertificateReadinessDiagnostic | null>(null);
  const [certificateInstallOpen, setCertificateInstallOpen] = useState(false);
  const [certificateInstallMode, setCertificateInstallMode] = useState<'a1' | 'cloud'>('a1');
  const [statusServiceLoading, setStatusServiceLoading] = useState(false);
  const [statusServiceDiagnostic, setStatusServiceDiagnostic] = useState<NfeStatusServiceDiagnostic | null>(null);
  useEffect(() => {
    if (!open) return;
    setDraft(normalizeNfeSpHomologationConfig(config));
    setDiagnosticRun(false);
    setPreXmlLoading(false);
    setPreXmlDiagnostic(null);
    setSignatureLabLoading(false);
    setSignatureLabDiagnostic(null);
    setCertificateReadinessLoading(false);
    setCertificateReadinessDiagnostic(null);
    setCertificateInstallOpen(false);
    setCertificateInstallMode('a1');
    setStatusServiceLoading(false);
    setStatusServiceDiagnostic(null);
  }, [open, config]);
  const activeNfeRules = settings.fiscal.matrix.rules.filter((rule) => rule.active && rule.documentType === 'nfe');
  const matrixReady = Boolean(settings.fiscal.matrix.reviewedBy && settings.fiscal.matrix.reviewedAt && activeNfeRules.length && activeNfeRules.every((rule) => rule.reviewed));
  const evaluation = useMemo(() => evaluateNfeSpHomologationConfig(draft, { issuerRegistry, company, drafts, fiscalResponsible: settings.fiscal.fiscalResponsible, taxReviewConfirmed: settings.fiscal.taxReviewConfirmed, taxReformReviewConfirmed: settings.fiscal.taxReformReviewConfirmed, matrixReady }), [company, draft, drafts, issuerRegistry, matrixReady, settings.fiscal.fiscalResponsible, settings.fiscal.taxReformReviewConfirmed, settings.fiscal.taxReviewConfirmed]);
  const executionPlan = useMemo(() => buildNfeSpHomologationExecutionPlan(draft, { issuerRegistry, company, drafts, fiscalResponsible: settings.fiscal.fiscalResponsible, taxReviewConfirmed: settings.fiscal.taxReviewConfirmed, taxReformReviewConfirmed: settings.fiscal.taxReformReviewConfirmed, matrixReady }), [company, draft, drafts, issuerRegistry, matrixReady, settings.fiscal.fiscalResponsible, settings.fiscal.taxReformReviewConfirmed, settings.fiscal.taxReviewConfirmed]);
  if (!open) return null;
  const availableIssuers = issuerRegistry.establishments.filter((item) => item.active && item.uf === 'SP' && item.documents.nfe.enabled);
  const availableDrafts = drafts.filter((item) => item.documentType === 'nfe' && item.status !== 'Cancelado' && (!draft.selectedEstablishmentId || item.issuer?.establishmentId === draft.selectedEstablishmentId));
  const localChecks = evaluation.checks.filter((item) => item.id !== 'server-connector');
  const readyLocalChecks = localChecks.filter((item) => item.ready).length;
  const pendingLocalChecks = localChecks.length - readyLocalChecks;
  const certificateExpiresAt = draft.certificate.expiresAt ? new Date(`${draft.certificate.expiresAt}T23:59:59-03:00`) : null;
  const certificateExpired = Boolean(certificateExpiresAt && Number.isFinite(certificateExpiresAt.getTime()) && certificateExpiresAt.getTime() <= Date.now());
  const certificateStatus = certificateReadinessLoading ? 'Certificado em verificação' : certificateReadinessDiagnostic?.valid ? 'Certificado ativo' : certificateExpired ? 'Certificado vencido' : certificateReadinessDiagnostic?.adapterConfigured ? 'Certificado bloqueado' : 'Certificado não configurado';
  const certificateStatusTone = certificateStatus === 'Certificado ativo' ? 'success' : certificateStatus === 'Certificado em verificação' ? 'info' : certificateStatus === 'Certificado não configurado' ? 'neutral' : 'danger';
  const certificateInstallationReadiness = evaluateNfeCertificateInstallationReadiness();
  const statusServiceStatus = statusServiceLoading ? 'Em verificação' : statusServiceDiagnostic?.valid ? 'Serviço disponível' : statusServiceDiagnostic?.responseReceived ? 'Serviço indisponível' : statusServiceDiagnostic ? 'Conexão bloqueada' : 'Não verificada';
  const statusServiceTone = statusServiceStatus === 'Serviço disponível' ? 'success' : statusServiceStatus === 'Em verificação' ? 'info' : statusServiceStatus === 'Não verificada' ? 'neutral' : 'danger';
  const update = (patch: Partial<NfeSpHomologationConfig>) => { setDraft((current) => ({ ...current, ...patch })); setDiagnosticRun(false); setPreXmlDiagnostic(null); setSignatureLabDiagnostic(null); setCertificateReadinessDiagnostic(null); setStatusServiceDiagnostic(null); };
  const updateCertificate = (patch: Partial<NfeSpHomologationConfig['certificate']>) => { setDraft((current) => ({ ...current, certificate: { ...current.certificate, ...patch } })); setDiagnosticRun(false); setPreXmlDiagnostic(null); setSignatureLabDiagnostic(null); setCertificateReadinessDiagnostic(null); setStatusServiceDiagnostic(null); };
  const runDiagnostic = () => {
    setDraft((current) => ({ ...current, lastLocalDiagnosticAt: new Date().toISOString() }));
    setDiagnosticRun(true);
  };
  const runPreXmlDiagnostic = async () => {
    const selectedDraft = drafts.find((item) => item.id === draft.selectedDraftId);
    const selectedClient = clients.find((item) => item.document.replace(/\D/g, '') === selectedDraft?.clientDocument.replace(/\D/g, '')) ?? clients.find((item) => item.name === selectedDraft?.client);
    if (!selectedDraft || !selectedClient) {
      setPreXmlDiagnostic({ ok: false, valid: false, mode: 'pre-xml-sem-assinatura', environment: 'homologacao', transmissionAttempted: false, schemaValidationExecuted: false, schemaValid: false, schemaPackage: '', schemaRoot: '', accessKey: '', errors: [{ code: 'AV-NFE-ORIGIN', field: 'draft', message: !selectedDraft ? 'Selecione um rascunho NF-e ativo.' : 'O cadastro completo do destinatário não foi localizado.' }], warnings: [], xml: '' });
      return;
    }
    setPreXmlLoading(true);
    setPreXmlDiagnostic(null);
    setSignatureLabDiagnostic(null);
    try {
      const response = await fetch('/api/fiscal/nfe-sp/pre-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Avanta-Fiscal-Mode': 'pre-xml-local' },
        cache: 'no-store',
        body: JSON.stringify({ draft: selectedDraft, client: selectedClient, config: { ...draft, matrixReviewConfirmed: matrixReady, taxReviewConfirmed: settings.fiscal.taxReviewConfirmed, taxReformReviewConfirmed: settings.fiscal.taxReformReviewConfirmed } }),
      });
      const result = await response.json() as NfeSpPreXmlDiagnostic;
      if (!response.ok && response.status !== 422) throw new Error(result.error || 'O backend não concluiu o diagnóstico.');
      setPreXmlDiagnostic(result);
    } catch (error) {
      setPreXmlDiagnostic({ ok: false, valid: false, mode: 'pre-xml-sem-assinatura', environment: 'homologacao', transmissionAttempted: false, schemaValidationExecuted: false, schemaValid: false, schemaPackage: '', schemaRoot: '', accessKey: '', errors: [{ code: 'AV-NFE-BACKEND', field: 'backend', message: error instanceof Error ? error.message : 'O backend não concluiu o diagnóstico.' }], warnings: [], xml: '' });
    } finally {
      setPreXmlLoading(false);
    }
  };
  const signatureLabFailure = (code: string, field: string, message: string): NfeSpSignatureLabDiagnostic => ({ ok: false, valid: false, mode: 'assinatura-efemera-laboratorio', environment: 'homologacao', signatureExecuted: false, signatureVerified: false, digestVerified: false, referenceVerified: false, certificateSelfSignatureVerified: false, issuerDocumentBoundToReference: false, signedXsdValid: false, preXmlXsdValid: false, schemaValidationExecuted: false, schemaPackage: '', accessKey: '', keyBits: 0, certificateFingerprint: '', certificateProfile: 'autoassinado-efemero-nao-icp-brasil', realCertificateOwnerValidated: false, icpBrasilChainValidated: false, signedXmlReturned: false, transmissionAttempted: false, canonicalizationMethod: '', signatureMethod: '', digestMethod: '', errors: [{ code, field, message }], warnings: [] });
  const certificateReadinessFailure = (code: string, field: string, message: string): NfeCertificateReadinessDiagnostic => ({ ok: false, valid: false, mode: 'diagnostico-certificado-digital', environment: 'homologacao', reference: '', referenceValid: false, adapterConfigured: false, realCertificateInspected: false, subjectDocumentSource: '2.16.76.1.3.3', ownerVerified: false, validityVerified: false, keyUsageVerified: false, chainVerified: false, rootPinned: false, revocationVerified: false, signingAvailable: false, mutualTlsAvailable: false, readyForXmlSignature: false, readyForMutualTls: false, readyForExternalHomologation: false, certificateFingerprint: '', certificateValidFrom: '', certificateValidTo: '', keyType: '', keyBits: 0, sensitiveMaterialReturned: false, signingAttempted: false, transmissionAttempted: false, errors: [{ code, field, message }], warnings: [] });
  const runCertificateReadiness = async () => {
    const issuerDocument = evaluation.issuerSnapshot?.document || '';
    if (!issuerDocument) {
      setCertificateReadinessDiagnostic(certificateReadinessFailure('AV-NFE-CERT-ISSUER', 'issuer.document', 'Selecione primeiro o estabelecimento emissor paulista.'));
      return;
    }
    setCertificateReadinessLoading(true);
    setCertificateReadinessDiagnostic(null);
    setStatusServiceDiagnostic(null);
    try {
      const response = await fetch('/api/fiscal/nfe-sp/certificate-readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Avanta-Fiscal-Mode': 'certificate-readiness-local' },
        cache: 'no-store',
        body: JSON.stringify({ secureReference: draft.certificate.secureReference, expectedDocument: issuerDocument, declaredSubjectDocument: draft.certificate.subjectDocument, expectedMode: draft.certificate.mode }),
      });
      const result = await response.json() as NfeCertificateReadinessDiagnostic;
      if (!response.ok && response.status !== 422) throw new Error(result.error || 'O servidor não concluiu a verificação do certificado digital.');
      setCertificateReadinessDiagnostic(result);
    } catch (error) {
      setCertificateReadinessDiagnostic(certificateReadinessFailure('AV-NFE-CERT-BACKEND', 'certificate.installation', error instanceof Error ? error.message : 'O servidor não concluiu a verificação do certificado digital.'));
    } finally {
      setCertificateReadinessLoading(false);
    }
  };
  const statusServiceFailure = (code: string, field: string, message: string): NfeStatusServiceDiagnostic => ({ ok: false, valid: false, mode: 'diagnostico-status-sefaz', environment: 'homologacao', authority: 'SEFAZ/SP', endpoint: '', endpointValidated: false, requestBuilt: false, certificateActive: false, mutualTlsReady: false, transportConfigured: false, networkAttempted: false, responseReceived: false, serviceOperational: false, cStat: '', xMotivo: '', receivedAt: '', latencyMs: 0, sensitiveMaterialReturned: false, transmissionAttempted: false, errors: [{ code, field, message }], warnings: [] });
  const runStatusServiceDiagnostic = async () => {
    const issuerDocument = evaluation.issuerSnapshot?.document || '';
    if (!issuerDocument) {
      setStatusServiceDiagnostic(statusServiceFailure('AV-NFE-STATUS-ISSUER', 'issuer.document', 'Selecione primeiro o estabelecimento emissor paulista.'));
      return;
    }
    setStatusServiceLoading(true);
    setStatusServiceDiagnostic(null);
    try {
      const response = await fetch('/api/fiscal/nfe-sp/status-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Avanta-Fiscal-Mode': 'status-service-local' },
        cache: 'no-store',
        body: JSON.stringify({ secureReference: draft.certificate.secureReference, expectedDocument: issuerDocument, declaredSubjectDocument: draft.certificate.subjectDocument, expectedMode: draft.certificate.mode }),
      });
      const result = await response.json() as NfeStatusServiceDiagnostic;
      if (!response.ok && response.status !== 422) throw new Error(result.error || 'O servidor não concluiu a verificação da conexão.');
      setStatusServiceDiagnostic(result);
    } catch (error) {
      setStatusServiceDiagnostic(statusServiceFailure('AV-NFE-STATUS-BACKEND', 'transport', error instanceof Error ? error.message : 'O servidor não concluiu a verificação da conexão.'));
    } finally {
      setStatusServiceLoading(false);
    }
  };
  const runSignatureLab = async () => {
    const selectedDraft = drafts.find((item) => item.id === draft.selectedDraftId);
    const selectedClient = clients.find((item) => item.document.replace(/\D/g, '') === selectedDraft?.clientDocument.replace(/\D/g, '')) ?? clients.find((item) => item.name === selectedDraft?.client);
    if (!preXmlDiagnostic?.valid || !selectedDraft || !selectedClient) {
      setSignatureLabDiagnostic(signatureLabFailure('AV-NFE-SIG-ORIGIN', 'draft', 'Valide primeiro o pré-XML e mantenha o rascunho e o destinatário selecionados.'));
      return;
    }
    setSignatureLabLoading(true);
    setSignatureLabDiagnostic(null);
    try {
      const response = await fetch('/api/fiscal/nfe-sp/signature-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Avanta-Fiscal-Mode': 'signature-lab-local' },
        cache: 'no-store',
        body: JSON.stringify({ draft: selectedDraft, client: selectedClient, config: { ...draft, matrixReviewConfirmed: matrixReady, taxReviewConfirmed: settings.fiscal.taxReviewConfirmed, taxReformReviewConfirmed: settings.fiscal.taxReformReviewConfirmed } }),
      });
      const result = await response.json() as NfeSpSignatureLabDiagnostic;
      if (!response.ok && response.status !== 422) throw new Error(result.error || 'O backend não concluiu a assinatura de laboratório.');
      setSignatureLabDiagnostic(result);
    } catch (error) {
      setSignatureLabDiagnostic(signatureLabFailure('AV-NFE-SIG-BACKEND', 'backend', error instanceof Error ? error.message : 'O backend não concluiu a assinatura de laboratório.'));
    } finally {
      setSignatureLabLoading(false);
    }
  };
  const downloadPreXml = () => {
    if (!preXmlDiagnostic?.xml) return;
    const blob = new Blob([preXmlDiagnostic.xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `PRE-NFE-HOMOLOGACAO-SEM-ASSINATURA-${preXmlDiagnostic.accessKey || 'diagnostico'}.xml`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return <Dialog open title="Bancada direta NF-e · São Paulo" description="Contrato técnico do piloto com a SEFAZ-SP. O diagnóstico é local; somente a bancada efêmera assina em memória, sem conexão externa ou transmissão." onClose={onClose}>
    <div className="dialog-body nfe-sp-homologation-body">
      <div className="fiscal-draft-safety"><Icon name="warning" size={19}/><p><strong>Homologação sem transporte externo.</strong> O protótipo não aceita PFX, senha ou chave privada. A produção não possui endpoint cadastrado e a autorização permanece bloqueada no plano.</p></div>
      <div className="nfe-sp-metrics" aria-label="Resumo da bancada NF-e de São Paulo">
        <div><span>Ambiente</span><strong>Homologação</strong><small>sem URL de produção</small></div>
        <div><span>Autorizador</span><strong>SEFAZ/SP</strong><small>NF-e · XML fiscal</small></div>
        <div><span>Pré-requisitos</span><strong>{readyLocalChecks}/{localChecks.length}</strong><small>validações locais concluídas</small></div>
        <div><span>Transmissão</span><Badge tone="danger">Bloqueada</Badge><small>transporte externo ausente</small></div>
      </div>

      <section className="nfe-sp-section">
        <div className="client-section-heading"><h3>Emissor e documento de teste</h3><p>O rascunho precisa pertencer ao mesmo CNPJ paulista selecionado para o piloto.</p></div>
        <div className="form-grid">
          <label className="field"><span>Estabelecimento emissor *</span><select value={draft.selectedEstablishmentId} onChange={(event) => update({ selectedEstablishmentId: event.target.value, selectedDraftId: '' })} disabled={readOnly}><option value="">Selecionar emissor de SP</option>{availableIssuers.map((item) => <option value={item.id} key={item.id}>{item.label} · {formatCnpj(item.document)} · {item.city}/SP</option>)}</select><small className="field-message">Configure matriz ou filial na Central Fiscal se a lista estiver vazia.</small></label>
          <label className="field"><span>Rascunho NF-e *</span><select value={draft.selectedDraftId} onChange={(event) => update({ selectedDraftId: event.target.value })} disabled={readOnly || !draft.selectedEstablishmentId}><option value="">Selecionar rascunho</option>{availableDrafts.map((item) => <option value={item.id} key={item.id}>{item.id} · {item.originId} · {money(item.total)}</option>)}</select><small className="field-message">Somente documentos ativos do emissor escolhido.</small></label>
          <label className="field"><span>Número isolado de teste *</span><input inputMode="numeric" value={draft.testDocumentNumber} onChange={(event) => update({ testDocumentNumber: event.target.value.replace(/\D/g, '').slice(0, 9) })} disabled={readOnly} maxLength={9} placeholder="1"/><small className="field-message">Não reserva nem movimenta a numeração fiscal real.</small></label>
          <label className="field"><span>Código numérico cNF *</span><input inputMode="numeric" value={draft.testNumericCode} onChange={(event) => update({ testNumericCode: event.target.value.replace(/\D/g, '').slice(0, 8) })} disabled={readOnly} maxLength={8} placeholder="8 dígitos"/><small className="field-message">Usado apenas para calcular a chave técnica do pré-XML.</small></label>
          <label className="field"><span>Responsável pelo piloto *</span><input value={draft.responsible} onChange={(event) => update({ responsible: event.target.value })} disabled={readOnly} maxLength={100} placeholder={settings.fiscal.fiscalResponsible || 'Responsável fiscal ou técnico'}/></label>
          <label className="check-field"><input type="checkbox" checked={draft.accreditationConfirmed} onChange={(event) => update({ accreditationConfirmed: event.target.checked })} disabled={readOnly}/><span><strong>Credenciamento de homologação conferido</strong><small>Confirmação administrativa do estabelecimento na SEFAZ-SP; não é validada automaticamente nesta tela.</small></span></label>
          <label className="check-field field-wide"><input type="checkbox" checked={draft.contingencyReviewed} onChange={(event) => update({ contingencyReviewed: event.target.checked })} disabled={readOnly}/><span><strong>Plano de contingência SVC-AN revisado</strong><small>Registre responsáveis, acionamento, retorno à operação normal e reconciliação dos documentos.</small></span></label>
        </div>
      </section>

      <section className="nfe-sp-section">
        <div className="nfe-sp-section-action"><div className="client-section-heading"><h3>Certificado digital</h3><p>Dados de identificação e validade do certificado que será utilizado na emissão fiscal.</p></div><div className="nfe-certificate-actions"><Badge tone={certificateStatusTone}>{certificateStatus}</Badge><button type="button" className="button secondary" onClick={() => setCertificateInstallOpen((current) => !current)} disabled={readOnly} aria-expanded={certificateInstallOpen}><Icon name="plus" size={16}/> {certificateInstallOpen ? 'Fechar instalação' : 'Adicionar certificado'}</button><button type="button" className="button secondary" onClick={runCertificateReadiness} disabled={readOnly || certificateReadinessLoading}><Icon name={certificateReadinessLoading ? 'clock' : 'check'} size={16}/> {certificateReadinessLoading ? 'Verificando…' : 'Verificar certificado'}</button></div></div>
        <div className="form-grid">
          <label className="field"><span>Tipo do certificado *</span><select value={draft.certificate.mode} onChange={(event) => updateCertificate({ mode: event.target.value as NfeSpCertificateMode })} disabled={readOnly}><option>Não definido</option><option>Certificado A1</option><option>Certificado em nuvem</option></select></label>
          <label className="field"><span>Identificação do certificado *</span><input value={draft.certificate.secureReference} onChange={(event) => updateCertificate({ secureReference: event.target.value })} disabled={readOnly} maxLength={120} autoCapitalize="none" autoCorrect="off" placeholder="Ex.: certificado fiscal da matriz"/><small className="field-message">Nome usado pelo sistema para localizar o certificado instalado. Não informe senha ou caminho de arquivo.</small></label>
          <label className="field"><span>CNPJ do titular *</span><input inputMode="numeric" value={formatCnpj(draft.certificate.subjectDocument)} onChange={(event) => updateCertificate({ subjectDocument: event.target.value.replace(/\D/g, '').slice(0, 14) })} disabled={readOnly} maxLength={18}/></label>
          <label className="field"><span>Validade *</span><input type="date" value={draft.certificate.expiresAt} onChange={(event) => updateCertificate({ expiresAt: event.target.value })} disabled={readOnly}/></label>
          <label className="check-field field-wide"><input type="checkbox" checked={draft.certificate.chainValidated} onChange={(event) => updateCertificate({ chainValidated: event.target.checked })} disabled={readOnly}/><span><strong>Conferência documental registrada</strong><small>Declaração administrativa do piloto. Não substitui CNPJ no otherName, raiz ICP-Brasil fixada e revogação verificadas no backend.</small></span></label>
          <label className="field field-wide"><span>Observações</span><textarea rows={3} value={draft.notes} onChange={(event) => update({ notes: event.target.value })} disabled={readOnly} maxLength={500} placeholder="Pendências, responsáveis e decisões do piloto"/></label>
        </div>
        {certificateInstallOpen && <div className="nfe-certificate-installation" role="region" aria-label="Preparação da instalação do certificado digital">
          <div className="nfe-certificate-installation-heading"><div><span>Fluxo definitivo</span><h4>Adicionar ou substituir certificado</h4><p>O arquivo e a senha serão enviados uma única vez ao backend autenticado. O protótipo não renderiza esses campos enquanto a infraestrutura protegida não estiver pronta.</p></div><Badge tone="warning">{certificateInstallationReadiness.currentStatus}</Badge></div>
          <div className="nfe-certificate-mode-picker" role="group" aria-label="Tipo de certificado a preparar"><button type="button" className={certificateInstallMode === 'a1' ? 'active' : ''} aria-pressed={certificateInstallMode === 'a1'} onClick={() => { setCertificateInstallMode('a1'); updateCertificate({ mode: 'Certificado A1' }); }}><Icon name="document" size={18}/><span><strong>Certificado A1</strong><small>Arquivo .pfx ou .p12 e senha de importação</small></span></button><button type="button" className={certificateInstallMode === 'cloud' ? 'active' : ''} aria-pressed={certificateInstallMode === 'cloud'} onClick={() => { setCertificateInstallMode('cloud'); updateCertificate({ mode: 'Certificado em nuvem' }); }}><Icon name="fiscal" size={18}/><span><strong>Certificado em nuvem</strong><small>Vínculo com o provedor e autorização do titular</small></span></button></div>
          <ol className="nfe-certificate-installation-flow"><li><span>1</span><p><strong>Identificar o estabelecimento</strong><small>O CNPJ emissor e a permissão do usuário serão conferidos novamente no servidor.</small></p></li><li><span>2</span><p><strong>{certificateInstallMode === 'a1' ? 'Selecionar arquivo e informar senha' : 'Autorizar o provedor em nuvem'}</strong><small>{certificateInstallMode === 'a1' ? 'A senha será usada somente durante a importação e nunca será armazenada.' : 'A autorização ficará vinculada ao estabelecimento sem expor credenciais na página.'}</small></p></li><li><span>3</span><p><strong>Validar e ativar</strong><small>Titularidade, validade, cadeia ICP-Brasil, revogação, assinatura e conexão segura precisam ser aprovadas.</small></p></li></ol>
          <div className="nfe-certificate-requirements" aria-label="Proteções exigidas para receber o certificado">{certificateInstallationReadiness.checks.map((item) => <div key={item.id}><span className={item.ready ? 'ready' : 'blocked'}><Icon name={item.ready ? 'check' : 'warning'} size={15}/></span><p><strong>{item.label}</strong><small>{item.detail}</small></p><Badge tone={item.ready ? 'success' : 'warning'}>{item.ready ? 'Pronto' : 'Pendente'}</Badge></div>)}</div>
          <div className="nfe-certificate-installation-footer"><p><strong>{certificateInstallationReadiness.readyCount}/{certificateInstallationReadiness.totalCount} proteções disponíveis</strong><small>Arquivo e senha não são solicitados neste protótipo para impedir armazenamento ou envio inseguro.</small></p><button type="button" className="button primary" disabled><Icon name="fiscal" size={16}/> Instalar certificado</button></div>
        </div>}
        <div className="nfe-certificate-readiness">
          {!certificateReadinessDiagnostic && !certificateReadinessLoading && <div className="nfe-sp-prexml-empty"><Icon name="fiscal" size={18}/><p><strong>{certificateStatus}</strong><small>Depois da instalação, o servidor verificará CNPJ do titular, validade, cadeia ICP-Brasil, revogação, assinatura e conexão segura.</small></p></div>}
          {certificateReadinessDiagnostic && <div className="nfe-sp-prexml-result" role="status">
            <div className={`nfe-sp-prexml-summary ${certificateReadinessDiagnostic.valid ? 'ready' : ''}`}><span><Icon name={certificateReadinessDiagnostic.valid ? 'check' : 'warning'} size={18}/></span><p><strong>{certificateStatus}</strong><small>{certificateReadinessDiagnostic.valid ? `RSA ${certificateReadinessDiagnostic.keyBits} bits · titularidade, cadeia e revogação verificadas` : certificateReadinessDiagnostic.errors[0]?.message}</small></p><Badge tone={certificateStatusTone}>{certificateStatus.replace('Certificado ', '')}</Badge></div>
            <div className="nfe-sp-signature-checks" aria-label="Situação do certificado digital"><div><span>Identificação</span><strong>{certificateReadinessDiagnostic.referenceValid ? 'Válida' : 'Pendente'}</strong></div><div><span>Certificado instalado</span><strong>{certificateReadinessDiagnostic.realCertificateInspected ? 'Localizado' : 'Não localizado'}</strong></div><div><span>Titular e validade</span><strong>{certificateReadinessDiagnostic.ownerVerified && certificateReadinessDiagnostic.validityVerified ? 'Verificados' : 'Pendentes'}</strong></div><div><span>Segurança e uso</span><strong>{certificateReadinessDiagnostic.chainVerified && certificateReadinessDiagnostic.rootPinned && certificateReadinessDiagnostic.revocationVerified && certificateReadinessDiagnostic.readyForMutualTls ? 'Verificados' : 'Pendentes'}</strong></div></div>
            {certificateReadinessDiagnostic.certificateFingerprint && <p className="nfe-sp-signature-fingerprint"><strong>Impressão digital pública</strong><code>{certificateReadinessDiagnostic.certificateFingerprint}</code></p>}
            {certificateReadinessDiagnostic.errors.length > 0 && <ul className="nfe-sp-prexml-errors">{certificateReadinessDiagnostic.errors.map((error) => <li key={`${error.code}-${error.field}`}><strong>{error.code}</strong><span>{error.message}</span><small>{error.field}</small></li>)}</ul>}
          </div>}
        </div>
      </section>

      <section className="nfe-sp-section">
        <div className="client-section-heading"><h3>Diagnóstico de pré-requisitos</h3><p>Uma aprovação local significa somente que o contrato pode seguir para implementação segura no servidor.</p></div>
        <div className="nfe-sp-checks">{evaluation.checks.map((item) => <div key={item.id}><span className={item.ready ? 'ready' : 'blocked'}><Icon name={item.ready ? 'check' : 'warning'} size={16}/></span><p><strong>{item.label}</strong><small>{item.detail}</small></p><Badge tone={item.ready ? 'success' : item.id === 'server-connector' ? 'danger' : 'warning'}>{item.ready ? 'Pronto' : item.id === 'server-connector' ? 'Não implementado' : 'Pendente'}</Badge></div>)}</div>
        {diagnosticRun && <div className={`nfe-sp-diagnostic-result ${evaluation.localDiagnosticPassed ? 'ready' : ''}`} role="status"><Icon name={evaluation.localDiagnosticPassed ? 'check' : 'warning'} size={18}/><p><strong>{evaluation.localDiagnosticPassed ? 'Pré-requisitos locais completos' : `${pendingLocalChecks} pendências no diagnóstico local`}</strong><small>{evaluation.localDiagnosticPassed ? 'O próximo passo será desenvolver e auditar o conector no backend. Nenhum dado foi enviado.' : evaluation.checks.find((item) => item.id !== 'server-connector' && !item.ready)?.detail}</small></p></div>}
      </section>

      <section className="nfe-sp-section">
        <div className="nfe-sp-section-action"><div className="client-section-heading"><h3>Conexão com a SEFAZ-SP</h3><p>Consulta somente a disponibilidade do ambiente de homologação. Não envia, autoriza ou cancela nota fiscal.</p></div><div className="nfe-certificate-actions"><Badge tone={statusServiceTone}>{statusServiceStatus}</Badge><button type="button" className="button secondary" onClick={runStatusServiceDiagnostic} disabled={readOnly || statusServiceLoading}><Icon name={statusServiceLoading ? 'clock' : 'fiscal'} size={16}/> {statusServiceLoading ? 'Verificando…' : 'Verificar conexão'}</button></div></div>
        <div className="nfe-status-readiness">
          <div className="nfe-sp-signature-checks" aria-label="Situação da conexão com a SEFAZ-SP"><div><span>Ambiente</span><strong>Homologação</strong></div><div><span>Certificado</span><strong>{statusServiceDiagnostic?.certificateActive ? 'Ativo' : 'Pendente'}</strong></div><div><span>Conexão segura</span><strong>{statusServiceDiagnostic?.mutualTlsReady && statusServiceDiagnostic.transportConfigured ? 'Pronta' : 'Pendente'}</strong></div><div><span>Serviço SEFAZ</span><strong>{statusServiceDiagnostic?.serviceOperational ? 'Disponível' : statusServiceDiagnostic?.responseReceived ? 'Indisponível' : 'Não verificado'}</strong></div></div>
          {!statusServiceDiagnostic && !statusServiceLoading && <div className="nfe-sp-prexml-empty"><Icon name="fiscal" size={18}/><p><strong>Contrato SOAP 1.2 preparado</strong><small>O envelope e a resposta do NfeStatusServico 4.00 já são validados localmente. A rede permanecerá bloqueada até existir certificado ativo e transporte seguro instalado.</small></p></div>}
          {statusServiceDiagnostic && <div className="nfe-sp-prexml-result" role="status">
            <div className={`nfe-sp-prexml-summary ${statusServiceDiagnostic.valid ? 'ready' : ''}`}><span><Icon name={statusServiceDiagnostic.valid ? 'check' : 'warning'} size={18}/></span><p><strong>{statusServiceStatus}</strong><small>{statusServiceDiagnostic.valid ? `${statusServiceDiagnostic.cStat} · ${statusServiceDiagnostic.xMotivo} · ${statusServiceDiagnostic.latencyMs} ms` : statusServiceDiagnostic.errors[0]?.message}</small></p><Badge tone={statusServiceTone}>{statusServiceDiagnostic.networkAttempted ? 'Consultada' : 'Sem conexão'}</Badge></div>
            {statusServiceDiagnostic.errors.length > 0 && <ul className="nfe-sp-prexml-errors">{statusServiceDiagnostic.errors.map((error) => <li key={`${error.code}-${error.field}`}><strong>{error.code}</strong><span>{error.message}</span><small>{error.field}</small></li>)}</ul>}
            {statusServiceDiagnostic.warnings.length > 0 && <ul className="fiscal-warning-list">{statusServiceDiagnostic.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
          </div>}
        </div>
      </section>

      <section className="nfe-sp-section">
        <div className="nfe-sp-section-action"><div className="client-section-heading"><h3>Pré-XML NF-e 4.00 no backend</h3><p>O servidor local monta e valida apenas os campos permitidos. Não acessa certificado, banco, SEFAZ ou qualquer endereço externo.</p></div><button type="button" className="button secondary" onClick={runPreXmlDiagnostic} disabled={readOnly || preXmlLoading}><Icon name={preXmlLoading ? 'clock' : 'document'} size={16}/> {preXmlLoading ? 'Validando…' : 'Validar e montar pré-XML'}</button></div>
        {!preXmlDiagnostic && !preXmlLoading && <div className="nfe-sp-prexml-empty"><Icon name="document" size={18}/><p><strong>Nenhum diagnóstico executado</strong><small>Selecione emissor, rascunho, número e cNF para localizar os campos que ainda faltam no cadastro.</small></p></div>}
        {preXmlDiagnostic && <div className="nfe-sp-prexml-result" role="status">
          <div className={`nfe-sp-prexml-summary ${preXmlDiagnostic.valid ? 'ready' : ''}`}><span><Icon name={preXmlDiagnostic.valid ? 'check' : 'warning'} size={18}/></span><p><strong>{preXmlDiagnostic.valid ? 'Pré-XML aprovado no XSD oficial' : `${preXmlDiagnostic.errors.length} bloqueios impedem a liberação`}</strong><small>{preXmlDiagnostic.valid ? `${preXmlDiagnostic.schemaPackage} · chave técnica ${preXmlDiagnostic.accessKey}` : preXmlDiagnostic.errors[0]?.message}</small></p><Badge tone={preXmlDiagnostic.valid ? 'success' : 'warning'}>{preXmlDiagnostic.valid ? 'XSD aprovado' : 'Recusado'}</Badge></div>
          {preXmlDiagnostic.errors.length > 0 && <ul className="nfe-sp-prexml-errors">{preXmlDiagnostic.errors.map((error) => <li key={`${error.code}-${error.field}`}><strong>{error.code}</strong><span>{error.message}</span><small>{error.field}</small></li>)}</ul>}
          {preXmlDiagnostic.warnings.length > 0 && <ul className="fiscal-warning-list">{preXmlDiagnostic.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
          {preXmlDiagnostic.xml && <div className="nfe-sp-xml-preview"><div><p><strong>XML temporário</strong><small>{preXmlDiagnostic.schemaRoot} validado · não assinado · sem protocolo</small></p><button type="button" className="button secondary" onClick={downloadPreXml}><Icon name="document" size={15}/> Baixar pré-XML</button></div><pre>{preXmlDiagnostic.xml}</pre></div>}
        </div>}
        {preXmlDiagnostic?.valid && <div className="nfe-sp-signature-lab">
          <div className="nfe-sp-section-action"><div className="client-section-heading"><h3>Assinatura XMLDSig de laboratório</h3><p>Gera chave RSA e certificado autoassinado somente em memória, verifica digest, referência, assinatura e XSD e descarta tudo sem devolver o XML assinado.</p></div><button type="button" className="button secondary" onClick={runSignatureLab} disabled={readOnly || signatureLabLoading}><Icon name={signatureLabLoading ? 'clock' : 'check'} size={16}/> {signatureLabLoading ? 'Assinando…' : 'Executar assinatura de laboratório'}</button></div>
          {!signatureLabDiagnostic && !signatureLabLoading && <div className="nfe-sp-prexml-empty"><Icon name="fiscal" size={18}/><p><strong>Teste criptográfico ainda não executado</strong><small>Esta etapa não usa o certificado da empresa e não habilita homologação externa.</small></p></div>}
          {signatureLabDiagnostic && <div className="nfe-sp-prexml-result" role="status">
            <div className={`nfe-sp-prexml-summary ${signatureLabDiagnostic.valid ? 'ready' : ''}`}><span><Icon name={signatureLabDiagnostic.valid ? 'check' : 'warning'} size={18}/></span><p><strong>{signatureLabDiagnostic.valid ? 'Assinatura efêmera verificada em memória' : `${signatureLabDiagnostic.errors.length} bloqueios no laboratório XMLDSig`}</strong><small>{signatureLabDiagnostic.valid ? `RSA ${signatureLabDiagnostic.keyBits} bits · ${signatureLabDiagnostic.schemaPackage} · nenhum artefato devolvido` : signatureLabDiagnostic.errors[0]?.message}</small></p><Badge tone={signatureLabDiagnostic.valid ? 'success' : 'warning'}>{signatureLabDiagnostic.valid ? 'Laboratório aprovado' : 'Recusado'}</Badge></div>
            <div className="nfe-sp-signature-checks" aria-label="Resultado criptográfico do laboratório"><div><span>Digest SHA-1</span><strong>{signatureLabDiagnostic.digestVerified ? 'Verificado' : 'Pendente'}</strong></div><div><span>Assinatura RSA</span><strong>{signatureLabDiagnostic.signatureVerified ? 'Verificada' : 'Pendente'}</strong></div><div><span>Referência e XSD</span><strong>{signatureLabDiagnostic.referenceVerified && signatureLabDiagnostic.signedXsdValid ? 'Aprovados' : 'Pendentes'}</strong></div><div><span>ICP-Brasil real</span><strong>Não validada</strong></div></div>
            {signatureLabDiagnostic.certificateFingerprint && <p className="nfe-sp-signature-fingerprint"><strong>Impressão digital efêmera</strong><code>{signatureLabDiagnostic.certificateFingerprint}</code></p>}
            {signatureLabDiagnostic.errors.length > 0 && <ul className="nfe-sp-prexml-errors">{signatureLabDiagnostic.errors.map((error) => <li key={`${error.code}-${error.field}`}><strong>{error.code}</strong><span>{error.message}</span><small>{error.field}</small></li>)}</ul>}
            {signatureLabDiagnostic.warnings.length > 0 && <ul className="fiscal-warning-list">{signatureLabDiagnostic.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
          </div>}
        </div>}
      </section>

      <section className="nfe-sp-section">
        <div className="client-section-heading"><h3>Serviços oficiais mapeados</h3><p>Somente os endereços de homologação publicados para a NF-e de São Paulo.</p></div>
        <div className="nfe-sp-endpoints">{evaluation.endpoints.map((endpoint) => <div key={endpoint.id}><span><Icon name="fiscal" size={15}/></span><p><strong>{endpoint.service} · v{endpoint.version}</strong><small>{endpoint.purpose}</small><code>{endpoint.url}</code></p></div>)}</div>
      </section>

      <section className="nfe-sp-section">
        <div className="client-section-heading"><h3>Plano do futuro conector</h3><p>Mesmo com os pré-requisitos completos, autorização, protocolo e armazenamento continuam bloqueados.</p></div>
        <ol className="fiscal-workflow nfe-sp-plan">{executionPlan.steps.map((step, index) => <li key={step.id}><span className={step.state}><b>{index + 1}</b></span><div><strong>{step.label}</strong><small>{step.service}</small></div><Badge tone={step.state === 'implemented' ? 'success' : step.state === 'contract' || step.state === 'lab' || step.state === 'planned' ? 'info' : 'danger'}>{step.state === 'implemented' ? 'Implementado' : step.state === 'contract' ? 'Contrato' : step.state === 'lab' ? 'Laboratório' : step.state === 'planned' ? 'Planejado' : 'Bloqueado'}</Badge></li>)}</ol>
      </section>
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</button><button type="button" className="button secondary" onClick={runDiagnostic}><Icon name="check" size={16}/> Executar diagnóstico local</button><button type="button" className="button primary" onClick={() => onSave(normalizeNfeSpHomologationConfig(draft))} disabled={readOnly}>Salvar bancada</button></footer>
  </Dialog>;
}

function FiscalDeveloperView({ origin, drafts, clients, config, company, settings, homologationPlan, integrationEvaluation, issuerRegistry, nfeSpConfig, onClearOrigin, onRevalidate, onCancel, onSaveHomologation, onSaveIntegrationEvaluation, onSaveIssuerRegistry, onSaveNfeSpConfig }: { origin: FiscalOrigin | null; drafts: FiscalDraftRecord[]; clients: ClientRecord[]; config: FiscalConfig; company: CompanyProfile; settings: ModuleSettings; homologationPlan: FiscalHomologationPlan; integrationEvaluation: FiscalIntegrationEvaluation; issuerRegistry: FiscalIssuerRegistry; nfeSpConfig: NfeSpHomologationConfig; onClearOrigin: () => void; onRevalidate: (draft: FiscalDraftRecord) => void; onCancel: (draft: FiscalDraftRecord) => void; onSaveHomologation: (plan: FiscalHomologationPlan) => void; onSaveIntegrationEvaluation: (evaluation: FiscalIntegrationEvaluation) => void; onSaveIssuerRegistry: (registry: FiscalIssuerRegistry) => void; onSaveNfeSpConfig: (config: NfeSpHomologationConfig) => void }) {
  const { can } = useContext(PermissionContext);
  const [documentType, setDocumentType] = useState<'nfe' | 'nfce' | 'nfse'>('nfe');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas as situações');
  const [detailDraft, setDetailDraft] = useState<FiscalDraftRecord | null>(null);
  const [cancelDraft, setCancelDraft] = useState<FiscalDraftRecord | null>(null);
  const [homologationOpen, setHomologationOpen] = useState(false);
  const [integrationEvaluationOpen, setIntegrationEvaluationOpen] = useState(false);
  const [issuerRegistryOpen, setIssuerRegistryOpen] = useState(false);
  const [nfeSpOpen, setNfeSpOpen] = useState(false);
  useEffect(() => {
    if (!origin) return;
    setDocumentType(origin.documentType);
    const selected = drafts.find((draft) => draft.originId === origin.id);
    if (selected) setDetailDraft(selected);
  }, [origin, drafts]);
  const readiness = fiscalReadiness(config, documentType);
  const filteredDrafts = drafts.filter((draft) => {
    const matchesQuery = normalizeSearch(`${draft.id} ${draft.originId} ${draft.client} ${draft.status} ${draft.documentType}`).includes(normalizeSearch(query));
    return matchesQuery && (statusFilter === 'Todas as situações' || draft.status === statusFilter);
  });
  const pendingCount = drafts.filter((draft) => draft.status === 'Com pendências').length;
  const blockedCount = drafts.filter((draft) => draft.status === 'Bloqueado para transmissão').length;
  const canceledCount = drafts.filter((draft) => draft.status === 'Cancelado').length;
  const homologationValidation = validateFiscalHomologationPlan(homologationPlan);
  const integrationEvaluationResult = validateFiscalIntegrationEvaluation(integrationEvaluation);
  const integrationDecisionCandidate = integrationEvaluationResult.candidates.find((candidate) => candidate.id === integrationEvaluation.decision.candidateId);
  const integrationRecommendedCandidate = integrationEvaluationResult.candidates.find((candidate) => candidate.id === integrationEvaluationResult.recommendedCandidateId);
  const issuerRegistryValidation = validateFiscalIssuerRegistry(issuerRegistry, company);
  const defaultIssuer = issuerRegistryValidation.defaultEstablishment;
  const nfeSpRules = settings.fiscal.matrix.rules.filter((rule) => rule.active && rule.documentType === 'nfe');
  const nfeSpMatrixReady = Boolean(settings.fiscal.matrix.reviewedBy && settings.fiscal.matrix.reviewedAt && nfeSpRules.length && nfeSpRules.every((rule) => rule.reviewed));
  const nfeSpEvaluation = evaluateNfeSpHomologationConfig(nfeSpConfig, { issuerRegistry, company, drafts, fiscalResponsible: settings.fiscal.fiscalResponsible, taxReviewConfirmed: settings.fiscal.taxReviewConfirmed, taxReformReviewConfirmed: settings.fiscal.taxReformReviewConfirmed, matrixReady: nfeSpMatrixReady });
  const selectedOriginDraft = origin ? drafts.find((draft) => draft.originId === origin.id) : null;
  const workflowDraft = selectedOriginDraft?.documentType === documentType ? selectedOriginDraft : drafts.find((draft) => draft.documentType === documentType && draft.status !== 'Cancelado');
  const workflowDraftReady = Boolean(workflowDraft?.checks.filter((check) => check.scope === 'cadastro').every((check) => check.ready));
  const authorityDefined = documentType !== 'nfse' || settings.fiscal.nfseAuthorityMode !== 'Não definido';
  const matrixRulesForDocument = settings.fiscal.matrix.rules.filter((rule) => rule.documentType === documentType && rule.active);
  const matrixDocumentReady = Boolean(settings.fiscal.matrix.reviewedBy && settings.fiscal.matrix.reviewedAt && matrixRulesForDocument.length && matrixRulesForDocument.every((rule) => rule.reviewed));
  const workflow = buildFiscalWorkflow({ documentType, draftReady: workflowDraftReady, taxReviewConfirmed: settings.fiscal.taxReviewConfirmed, taxReformReviewConfirmed: settings.fiscal.taxReformReviewConfirmed, authorityDefined, certificateReady: config.certificateValid, providerReady: config.providerConnected });
  const profile = workflow.profile;
  return <>
    <PageHeading view="fiscal" action={<button type="button" className="button primary" disabled title="Será habilitado junto com a configuração do provedor fiscal"><Icon name="plus" size={18}/> Rascunho avulso</button>}/>
    {origin && <div className="fiscal-origin-banner" role="status"><span><Icon name="fiscal" size={20}/></span><div><strong>{selectedOriginDraft ? `Rascunho de ${origin.id} localizado` : `Preparação iniciada a partir de ${origin.id}`}</strong><p>{origin.sourceLabel} de {origin.client} · {money(origin.total)}. A origem permanece vinculada e uma nova seleção não cria duplicidade.</p></div><Badge tone={selectedOriginDraft ? fiscalDraftTone(selectedOriginDraft.status) : 'info'}>{selectedOriginDraft?.status ?? documentLabel(origin.documentType)}</Badge><button type="button" className="button secondary" onClick={onClearOrigin}>Limpar seleção</button></div>}
    <div className="fiscal-warning"><div><Icon name="warning" size={22}/></div><span><strong>Emissão real permanece bloqueada</strong><p>A Central Fiscal prepara e valida rascunhos locais, mas não possui certificado, provedor ou credenciamento. Nenhum dado é transmitido.</p></span><Badge tone="warning">Homologação estrutural</Badge></div>
    <div className="metric-grid compact"><Metric label="Rascunhos locais" value={String(drafts.length)} note="Sem numeração fiscal"/><Metric label="Com pendências" value={String(pendingCount)} note="Cadastro deve ser completado" tone="warning"/><Metric label="Transmissão bloqueada" value={String(blockedCount)} note="Provedor e certificado ausentes" tone="cyan"/><Metric label="Cancelados" value={String(canceledCount)} note="Histórico preservado" tone="success"/></div>
    <Panel title="Estabelecimento emissor e roteamento" subtitle={`Cadastro por matriz ou filial · referência ${issuerRegistry.reference}`} action={<button type="button" className="button secondary" onClick={() => setIssuerRegistryOpen(true)}><Icon name="settings" size={17}/> {can('fiscal.configure') ? 'Configurar emissores' : 'Consultar emissores'}</button>} className="issuer-routing-overview">
      <div className="issuer-routing-summary"><div><span>Emissor padrão</span><strong>{defaultIssuer?.label ?? 'Não definido'}</strong><small>{defaultIssuer ? `${formatCnpj(defaultIssuer.document)} · ${defaultIssuer.city}/${defaultIssuer.uf}` : 'cadastro pendente'}</small></div>{(['nfe', 'nfce', 'nfse'] as FiscalDocumentType[]).map((documentType) => { const route = defaultIssuer?.routes[documentType]; const enabled = defaultIssuer?.documents[documentType].enabled; return <div key={documentType}><span>{documentLabel(documentType)}</span><strong>{enabled ? route?.authority ?? 'Rota pendente' : 'Não habilitada'}</strong><small>{enabled ? route?.explanation ?? 'Revise o estabelecimento' : 'Documento desativado para o emissor padrão'}</small><Badge tone={!enabled ? 'neutral' : route?.readyForHomologation ? 'success' : 'warning'}>{!enabled ? 'Desabilitada' : route?.readyForHomologation ? 'Pronta para homologação' : 'Credenciamento pendente'}</Badge></div>; })}</div>
      <div className="issuer-routing-rule"><Icon name="arrow" size={18}/><p><strong>O destino da venda não troca o credenciamento.</strong><small>NF-e e NFC-e usam a jurisdição do estabelecimento emissor; NFS-e usa o município fiscal identificado para o prestador.</small></p></div>
    </Panel>
    <Panel title="Bancada direta NF-e · São Paulo" subtitle={`Piloto de integração própria · referência ${NFE_SP_HOMOLOGATION_REFERENCE}`} action={<button type="button" className="button secondary" onClick={() => setNfeSpOpen(true)}><Icon name="fiscal" size={17}/> {can('fiscal.homologate') ? 'Preparar bancada' : 'Consultar bancada'}</button>} className="nfe-sp-overview">
      <div className="nfe-sp-overview-grid"><div><span>Emissor piloto</span><strong>{nfeSpEvaluation.issuerSnapshot?.label ?? 'Não selecionado'}</strong><small>{nfeSpEvaluation.issuerSnapshot ? `${formatCnpj(nfeSpEvaluation.issuerSnapshot.document)} · ${nfeSpEvaluation.issuerSnapshot.city}/SP` : 'selecione um estabelecimento paulista'}</small></div><div><span>Rascunho de teste</span><strong>{nfeSpEvaluation.draft?.id ?? 'Não selecionado'}</strong><small>{nfeSpEvaluation.draft ? `origem ${nfeSpEvaluation.draft.originId}` : 'nenhuma NF-e vinculada'}</small></div><div><span>Diagnóstico local</span><Badge tone={nfeSpEvaluation.localDiagnosticPassed ? 'success' : 'warning'}>{nfeSpEvaluation.localDiagnosticPassed ? 'Pré-requisitos completos' : 'Com pendências'}</Badge><small>{nfeSpEvaluation.checks.filter((item) => item.id !== 'server-connector' && item.ready).length} de {nfeSpEvaluation.checks.length - 1} verificações locais</small></div><div><span>Transmissão externa</span><Badge tone="danger">Bloqueada</Badge><small>sem certificado, SOAP ou endpoint de produção no cliente</small></div></div>
      <div className="nfe-sp-overview-note"><Icon name="warning" size={17}/><p><strong>Esta bancada não testa a SEFAZ.</strong><small>Ela organiza o que o futuro backend deverá validar antes do primeiro envio real ao ambiente de homologação.</small></p></div>
    </Panel>
    <Panel title="Plano de homologação fiscal" subtitle={`Empresa piloto · referência ${homologationPlan.reference}`} action={<button type="button" className="button secondary" onClick={() => setHomologationOpen(true)}><Icon name="check" size={17}/> {can('fiscal.homologate') ? 'Gerenciar plano' : 'Consultar plano'}</button>} className="homologation-overview">
      <div className="homologation-overview-grid"><div><span>Empresa</span><strong>{homologationPlan.company.name || company.name}</strong><small>{homologationPlan.company.city ? `${homologationPlan.company.city}/${homologationPlan.company.uf}` : company.city} · {homologationPlan.company.taxRegime || company.taxRegime}</small></div><div><span>Progresso comprovado</span><strong>{homologationValidation.progress}%</strong><small>{homologationValidation.validated} de {homologationValidation.required} cenários obrigatórios</small></div><div><span>Evidências</span><strong>{homologationValidation.evidenceCount}</strong><small>com retorno externo identificado</small></div><div><span>Situação</span><Badge tone={homologationValidation.externallyValidated ? 'success' : homologationValidation.readyForExternalCycle ? 'info' : 'warning'}>{homologationValidation.externallyValidated ? 'Validado externamente' : homologationValidation.readyForExternalCycle ? 'Pronto para testes' : 'Planejamento'}</Badge><small>Produção permanece bloqueada</small></div></div>
    </Panel>
    <Panel title="Estratégia de integração fiscal" subtitle={`Comparativo de provedor, conexão direta e PAA · referência ${integrationEvaluation.reference}`} action={<button type="button" className="button secondary" onClick={() => setIntegrationEvaluationOpen(true)}><Icon name="chart" size={17}/> {can('fiscal.homologate') ? 'Avaliar alternativas' : 'Consultar avaliação'}</button>} className="integration-evaluation-overview">
      <div className="homologation-overview-grid"><div><span>Alternativas</span><strong>{integrationEvaluation.candidates.length}</strong><small>{integrationEvaluationResult.candidates.filter((candidate) => candidate.complete).length} avaliações completas</small></div><div><span>Melhor alternativa válida</span><strong>{integrationRecommendedCandidate?.name ?? 'Não definida'}</strong><small>{integrationRecommendedCandidate ? `${integrationRecommendedCandidate.weightedScore.toLocaleString('pt-BR')}% · ${money(integrationRecommendedCandidate.monthlyCost)}/mês estimado` : 'preencha requisitos e pontuações'}</small></div><div><span>Decisão registrada</span><strong>{integrationDecisionCandidate?.name ?? 'Nenhuma'}</strong><small>{integrationEvaluation.decision.status}</small></div><div><span>Liberação</span><Badge tone={integrationEvaluationResult.approvedForHomologation ? 'success' : 'warning'}>{integrationEvaluationResult.approvedForHomologation ? 'Somente homologação' : 'Sem aprovação'}</Badge><small>produção e contratação bloqueadas</small></div></div>
    </Panel>
    <Panel title="Fila fiscal local" subtitle="Rascunhos vinculados a pedidos, sem número, chave ou protocolo fiscal">
      <SearchToolbar value={query} onChange={setQuery} placeholder="Buscar por rascunho, origem, cliente ou situação"><select aria-label="Situação fiscal" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todas as situações</option><option>Com pendências</option><option>Bloqueado para transmissão</option><option>Pronto para homologação</option><option>Cancelado</option></select></SearchToolbar>
      {filteredDrafts.length > 0 ? <Table headers={['Rascunho', 'Origem', 'Cliente', 'Tipo', 'Criado em', 'Cadastro', 'Transmissão', 'Valor', 'Situação', 'Ações']} minWidth={0} className="fiscal-drafts-table"><>{filteredDrafts.map((draft) => { const registrationReady = draft.checks.filter((check) => check.scope === 'cadastro').every((check) => check.ready); const transmissionReady = draft.checks.filter((check) => check.scope === 'transmissao').every((check) => check.ready); return <tr key={draft.id}><td data-label="Rascunho"><button type="button" className="row-link" onClick={() => setDetailDraft(draft)}>{draft.id}</button></td><td data-label="Origem"><strong>{draft.originId}</strong><small>{draft.sourceLabel}</small></td><td data-label="Cliente"><strong>{draft.client}</strong><small>{draft.clientDocument || 'Documento pendente'}</small></td><td data-label="Tipo">{documentLabel(draft.documentType)}</td><td data-label="Criado em">{new Date(draft.createdAt).toLocaleDateString('pt-BR')}</td><td data-label="Cadastro"><Badge tone={registrationReady ? 'success' : 'warning'}>{registrationReady ? 'Pronto' : 'Pendente'}</Badge></td><td data-label="Transmissão"><Badge tone={transmissionReady ? 'success' : 'danger'}>{transmissionReady ? 'Pronta' : 'Bloqueada'}</Badge></td><td data-label="Valor" className="numeric"><strong>{money(draft.total)}</strong></td><td data-label="Situação"><Badge tone={fiscalDraftTone(draft.status)}>{draft.status}</Badge></td><td data-label="Ações" className="fiscal-actions-cell"><FiscalDraftRecordActions draft={draft} onDetails={() => setDetailDraft(draft)} onRevalidate={() => onRevalidate(draft)} onCancel={() => setCancelDraft(draft)}/></td></tr>; })}</></Table> : <EmptyState title="Nenhum rascunho fiscal encontrado" description="Fature um pedido configurado para NF-e, NFC-e ou NFS-e para criar o primeiro rascunho vinculado."/>}
    </Panel>
    <div className="fiscal-layout"><Panel title="Prontidão para emissão" subtitle="Selecione o documento para conferir os requisitos"><div className="segmented" role="group" aria-label="Tipo de documento fiscal">{(['nfe', 'nfce', 'nfse'] as const).map((type) => <button key={type} type="button" className={documentType === type ? 'active' : ''} aria-pressed={documentType === type} onClick={() => setDocumentType(type)}>{documentLabel(type)}</button>)}</div><div className="checklist">{[
      ['Dados do emitente', Boolean(config.companyDocument && config.taxRegime && config.cityCode), 'CNPJ, regime, endereço e município fiscal identificado'],
      [documentType === 'nfse' ? 'Inscrição municipal' : 'Inscrição estadual', Boolean(documentType === 'nfse' ? config.municipalRegistration : config.stateRegistration), 'Cadastro exigido para o documento'],
      ['Certificado ou assinatura', config.certificateValid, 'Chave protegida e dentro da validade'],
      ['Provedor/autorizador', config.providerConnected, 'Conector e credenciais de homologação'],
      ['Responsável fiscal', Boolean(config.fiscalResponsible), 'Pessoa responsável identificada'],
      ['Revisão fiscal', config.taxReviewConfirmed, 'Responsável fiscal aprovou as regras'],
      ['Matriz fiscal da empresa', matrixDocumentReady, `${matrixRulesForDocument.filter((rule) => rule.reviewed).length} de ${matrixRulesForDocument.length} regras ativas revisadas para ${documentLabel(documentType)}`],
      ['IBS/CBS e CNPJ alfanumérico', Boolean(config.taxReformReviewConfirmed), 'Leiautes e regras vigentes revisados'],
    ].map(([label, ready, detail]) => <div key={String(label)}><span className={ready ? 'ready' : 'blocked'}><Icon name={ready ? 'check' : 'warning'} size={16}/></span><div><strong>{label}</strong><small>{detail}</small></div><Badge tone={ready ? 'success' : 'warning'}>{ready ? 'Pronto' : 'Pendente'}</Badge></div>)}</div><div className="readiness-result"><strong>{readiness.ready ? 'Estrutura pronta para homologar' : `${readiness.errors.length} bloqueios impedem a emissão`}</strong><p>{readiness.ready ? 'Ainda será necessário validar casos reais no ambiente de testes.' : 'Complete as configurações antes de habilitar qualquer transmissão.'}</p></div></Panel><Panel title="Ambientes e séries" subtitle="Separação obrigatória entre teste e produção"><div className="environment-card active"><span><i/> Homologação</span><strong>Ambiente selecionado</strong><small>Sem validade fiscal · transmissão desativada</small></div><div className="environment-card"><span><i/> Produção</span><strong>Bloqueada</strong><small>Exige homologação, revisão e liberação explícita</small></div><div className="series-grid"><div><span>NF-e</span><strong>Série {settings.fiscal.nfeSeries || 'não definida'}</strong><small>Próximo: não definido</small></div><div><span>NFC-e</span><strong>Série {settings.fiscal.nfceSeries || 'não definida'}</strong><small>CSC pendente</small></div><div><span>NFS-e</span><strong>DPS {settings.fiscal.nfseSeries || 'não definida'}</strong><small>IM {settings.company.municipalRegistration ? 'informada' : 'pendente'}</small></div></div></Panel></div>
    <Panel title="Mapa operacional de emissão" subtitle={`Referência técnica revisada em ${displayIsoDate(FISCAL_REFERENCE_DATE)} · sem transmissão externa`} action={<Badge tone="info">{profile.label} · {profile.model}</Badge>}>
      <div className="fiscal-workflow-summary"><div><span>Autorizador</span><strong>{profile.authority}</strong></div><div><span>Documento técnico</span><strong>{profile.payload}</strong></div><div><span>Representação auxiliar</span><strong>{profile.auxiliaryDocument}</strong></div></div>
      <ol className="fiscal-workflow" aria-label={`Fluxo previsto para ${profile.label}`}>{workflow.steps.map((step, index) => <li key={step.id}><span className={step.state}><b>{index + 1}</b></span><div><strong>{step.label}</strong><small>{step.detail}</small></div><Badge tone={step.state === 'ready' ? 'success' : step.state === 'planned' ? 'info' : step.state === 'pending' ? 'warning' : 'danger'}>{step.state === 'ready' ? 'Pronto' : step.state === 'planned' ? 'Planejado' : step.state === 'pending' ? 'Pendente' : 'Bloqueado'}</Badge></li>)}</ol>
      <div className="fiscal-profile-grid"><section><h3>Cadastro exigido no catálogo</h3><ul>{profile.requiredCatalogFields.map((field) => <li key={field}><Icon name="check" size={14}/><span>{field}</span></li>)}</ul></section><section><h3>Eventos previstos</h3><ul>{profile.events.map((event) => <li key={event}><Icon name="document" size={14}/><span>{event}</span></li>)}</ul></section><section><h3>Referências acompanhadas</h3><ul>{profile.technicalReferences.map((reference) => <li key={reference}><Icon name="fiscal" size={14}/><span>{reference}</span></li>)}</ul></section></div>
    </Panel>
    <Panel title="Exemplos visuais de documentos" subtitle="Referência de interface: estes registros não pertencem à fila local e não foram emitidos por este navegador"><Table headers={['Documento', 'Emissão', 'Destinatário/tomador', 'Modelo', 'Ambiente', 'Situação', 'Chave', 'Valor', 'Último evento', '']} minWidth={0} className="fiscal-examples-table"><>{fiscalDocuments.map((document) => <tr key={`${document.number}-${document.client}`}><td data-label="Documento"><button type="button" className="row-link">{document.number}</button></td><td data-label="Emissão">{document.date}</td><td data-label="Destinatário/tomador"><strong>{document.client}</strong></td><td data-label="Modelo">{document.model}</td><td data-label="Ambiente">{document.environment}</td><td data-label="Situação"><Badge>{document.status}</Badge></td><td data-label="Chave">{document.key}</td><td data-label="Valor" className="numeric"><strong>{money(document.total)}</strong></td><td data-label="Último evento">{document.event}</td><td data-label="Ações"><button type="button" className="row-action" aria-label={`Abrir ${document.number}`}>›</button></td></tr>)}</></Table></Panel>
    <FiscalDraftDetailsDialog draft={detailDraft ? drafts.find((draft) => draft.id === detailDraft.id) ?? detailDraft : null} company={company} onClose={() => setDetailDraft(null)} onRevalidate={onRevalidate}/>
    <FiscalIssuerRegistryDialog open={issuerRegistryOpen} registry={issuerRegistry} company={company} readOnly={!can('fiscal.configure')} onClose={() => setIssuerRegistryOpen(false)} onSave={(next) => { onSaveIssuerRegistry(next); setIssuerRegistryOpen(false); }}/>
    <NfeSpHomologationDialog open={nfeSpOpen} config={nfeSpConfig} issuerRegistry={issuerRegistry} drafts={drafts} clients={clients} company={company} settings={settings} readOnly={!can('fiscal.homologate')} onClose={() => setNfeSpOpen(false)} onSave={(next) => { onSaveNfeSpConfig(next); setNfeSpOpen(false); }}/>
    <FiscalHomologationDialog open={homologationOpen} plan={homologationPlan} company={company} settings={settings} readOnly={!can('fiscal.homologate')} onClose={() => setHomologationOpen(false)} onSave={(next) => { onSaveHomologation(next); setHomologationOpen(false); }}/>
    <FiscalIntegrationEvaluationDialog open={integrationEvaluationOpen} evaluation={integrationEvaluation} readOnly={!can('fiscal.homologate')} onClose={() => setIntegrationEvaluationOpen(false)} onSave={(next) => { onSaveIntegrationEvaluation(next); setIntegrationEvaluationOpen(false); }}/>
    {cancelDraft && <Dialog open title={`Cancelar rascunho de ${cancelDraft.originId}`} description="O histórico será preservado e nenhuma transmissão será realizada." onClose={() => setCancelDraft(null)}><div className="dialog-body lifecycle-confirmation"><div className="lifecycle-effect"><Icon name="warning" size={19}/><div><strong>Encerrar preparação fiscal local</strong><p>O rascunho ficará como cancelado. Como não existe documento autorizado, não haverá cancelamento junto ao governo.</p></div></div></div><footer className="dialog-footer"><button type="button" className="button secondary" onClick={() => setCancelDraft(null)}>Manter rascunho</button><button type="button" className="button danger" disabled={!can('fiscal.cancel')} onClick={() => { onCancel(cancelDraft); setCancelDraft(null); }}>Cancelar rascunho</button></footer></Dialog>}
  </>;
}

function fiscalActiveSequence(ledger: FiscalNumberingLedger, documentType: FiscalDocumentType) {
  return ledger.sequences.find((sequence) => sequence.documentType === documentType && sequence.active)
    ?? ledger.sequences.find((sequence) => sequence.documentType === documentType);
}

function FiscalNumberingDialog({ open, ledger, documentScope, actor, readOnly, onClose, onSave }: { open: boolean; ledger: FiscalNumberingLedger; documentScope: FiscalDocumentType[]; actor: string; readOnly: boolean; onClose: () => void; onSave: (ledger: FiscalNumberingLedger, message: string) => boolean }) {
  const [draft, setDraft] = useState(ledger);
  const [error, setError] = useState('');
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidDocument, setVoidDocument] = useState<FiscalDocumentType>(documentScope[0] ?? 'nfe');
  const [voidStart, setVoidStart] = useState('');
  const [voidEnd, setVoidEnd] = useState('');
  const [voidReason, setVoidReason] = useState('');
  useEffect(() => {
    if (!open) return;
    setDraft(normalizeFiscalNumberingLedger(ledger));
    setError('');
    setVoidOpen(false);
    setVoidDocument(documentScope[0] ?? 'nfe');
    setVoidStart('');
    setVoidEnd('');
    setVoidReason('');
  }, [open, ledger, documentScope]);
  if (!open) return null;
  const updateSequence = (documentType: FiscalDocumentType, patch: Partial<FiscalNumberingSequence>) => setDraft((current) => ({ ...current, sequences: current.sequences.map((sequence) => sequence.documentType === documentType && sequence.active ? { ...sequence, ...patch } : sequence) }));
  const saveConfiguration = () => {
    let next = normalizeFiscalNumberingLedger(draft);
    for (const documentType of documentScope) {
      const sequence = fiscalActiveSequence(draft, documentType);
      if (!sequence) continue;
      const configured = configureFiscalSequence(next, { documentType, series: sequence.series, nextNumber: sequence.nextNumber, actor });
      if (!configured.ok) { setError(configured.error ?? 'Revise a numeração fiscal.'); return; }
      next = configured.ledger;
    }
    const validation = validateFiscalNumberingLedger(next);
    if (!validation.valid) { setError(validation.errors[0] ?? 'Revise a numeração fiscal.'); return; }
    if (onSave(next, 'Séries e próximos números fiscais salvos.')) onClose();
  };
  const registerVoidRequest = () => {
    const sequence = fiscalActiveSequence(draft, voidDocument);
    const result = requestFiscalNumberVoid(draft, { documentType: voidDocument, series: sequence?.series, startNumber: Number(voidStart), endNumber: Number(voidEnd), reason: voidReason, actor });
    if (!result.ok) { setError(result.error ?? 'Revise o intervalo informado.'); return; }
    if (!onSave(result.ledger, 'Solicitação de inutilização registrada. O envio ao órgão autorizador ainda está pendente.')) return;
    setDraft(result.ledger);
    setVoidStart('');
    setVoidEnd('');
    setVoidReason('');
    setVoidOpen(false);
    setError('');
  };
  const visibleHistory = [
    ...draft.voidRequests.map((entry) => ({ id: entry.id, date: entry.requestedAt, title: `Inutilização · ${documentLabel(entry.documentType)} série ${entry.series}`, detail: `${entry.startNumber.toLocaleString('pt-BR')} a ${entry.endNumber.toLocaleString('pt-BR')} · ${entry.status === 'confirmed' ? `Confirmada · protocolo ${entry.protocol}` : entry.status === 'rejected' ? 'Rejeitada' : 'Aguardando envio e protocolo'}`, tone: entry.status === 'confirmed' ? 'success' as const : entry.status === 'rejected' ? 'danger' as const : 'warning' as const })),
    ...draft.reservations.map((entry) => ({ id: entry.id, date: entry.reservedAt, title: `${documentLabel(entry.documentType)} ${entry.series}/${entry.number}`, detail: `${entry.originId || entry.draftId} · ${entry.status === 'authorized' ? 'Autorizada' : entry.status === 'voided' ? 'Inutilizada' : entry.status === 'void_pending' ? 'Inutilização pendente' : 'Número reservado'}`, tone: entry.status === 'authorized' ? 'success' as const : entry.status === 'void_pending' ? 'warning' as const : 'info' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  return <Dialog open title="Séries e numeração fiscal" description="Controle o próximo número de cada documento sem expor configurações técnicas de integração." onClose={onClose}>
    <div className="dialog-body fiscal-numbering-body">
      <div className="fiscal-draft-safety"><Icon name="warning" size={19}/><p><strong>Numeração protegida.</strong> Abrir ou revisar uma nota não consome número. A reserva ocorrerá somente na futura confirmação de emissão e nunca será repetida para o mesmo documento.</p></div>
      <section><div className="client-section-heading"><h3>Séries em uso</h3><p>Informe o próximo número livre. O sistema não permite voltar para um número já reservado ou inutilizado.</p></div><div className="fiscal-numbering-grid">{documentScope.map((documentType) => { const sequence = fiscalActiveSequence(draft, documentType); return <div key={documentType} className="fiscal-numbering-item"><div><span>{documentLabel(documentType)}</span><Badge tone="info">Ativa</Badge></div><label className="field"><span>Série</span><input inputMode="numeric" maxLength={documentType === 'nfse' ? 5 : 3} value={sequence?.series ?? ''} onChange={(event) => updateSequence(documentType, { series: event.target.value.replace(/\D/g, '').slice(0, documentType === 'nfse' ? 5 : 3) })} disabled={readOnly}/></label><label className="field"><span>Próximo número</span><input type="number" min="1" max="999999999" step="1" value={sequence?.nextNumber ?? 1} onChange={(event) => updateSequence(documentType, { nextNumber: Math.max(1, Math.min(999999999, Number(event.target.value) || 1)) })} disabled={readOnly}/></label><small>{sequence?.lastReservedNumber ? `Último número protegido: ${sequence.lastReservedNumber.toLocaleString('pt-BR')}` : 'Nenhum número reservado nesta série'}</small></div>; })}</div></section>
      <section><div className="client-section-heading fiscal-numbering-heading"><div><h3>Inutilização de numeração</h3><p>Registre um intervalo que não será usado. A inutilização só será concluída após envio e protocolo do órgão autorizador.</p></div>{!readOnly && <button type="button" className="button secondary" onClick={() => { setVoidOpen((current) => !current); setError(''); }}>{voidOpen ? 'Fechar formulário' : 'Registrar intervalo'}</button>}</div>{voidOpen && <div className="fiscal-numbering-void-form"><label className="field"><span>Documento</span><select value={voidDocument} onChange={(event) => setVoidDocument(event.target.value as FiscalDocumentType)}>{documentScope.map((type) => <option key={type} value={type}>{documentLabel(type)}</option>)}</select></label><label className="field"><span>Número inicial</span><input type="number" min="1" max="999999999" value={voidStart} onChange={(event) => setVoidStart(event.target.value)}/></label><label className="field"><span>Número final</span><input type="number" min="1" max="999999999" value={voidEnd} onChange={(event) => setVoidEnd(event.target.value)}/></label><label className="field field-wide"><span>Justificativa</span><textarea rows={3} value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Explique por que esta numeração não será utilizada"/></label><div className="fiscal-numbering-void-action"><button type="button" className="button primary" onClick={registerVoidRequest}>Registrar solicitação</button></div></div>}
        {visibleHistory.length ? <div className="fiscal-numbering-history">{visibleHistory.map((entry) => <div key={entry.id}><span><Icon name={entry.tone === 'success' ? 'check' : entry.tone === 'warning' ? 'warning' : 'document'} size={16}/></span><p><strong>{entry.title}</strong><small>{entry.detail}{entry.date ? ` · ${new Date(entry.date).toLocaleString('pt-BR')}` : ''}</small></p><Badge tone={entry.tone}>{entry.tone === 'success' ? 'Concluído' : entry.tone === 'warning' ? 'Pendente' : 'Registrado'}</Badge></div>)}</div> : <div className="fiscal-numbering-empty"><Icon name="document" size={20}/><p><strong>Nenhum evento de numeração</strong><small>Reservas e solicitações de inutilização aparecerão aqui sem apagar o histórico.</small></p></div>}
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Fechar</button>{!readOnly && <button type="button" className="button primary" onClick={saveConfiguration}>Salvar numeração</button>}</footer>
  </Dialog>;
}

function FiscalView({ origin, drafts, fiscalPrepareState, config, company, settings, numberingLedger, activeUserName, onClearOrigin, onPrepare, onValidate, onReserveNumber, onContinueIssuance, onRevalidate, onCancel, onOpenCertificate, onNavigate, onSaveNumbering }: { origin: FiscalOrigin | null; drafts: FiscalDraftRecord[]; fiscalPrepareState: Record<string, { loading: boolean; message: string }>; config: FiscalConfig; company: CompanyProfile; settings: ModuleSettings; numberingLedger: FiscalNumberingLedger; activeUserName: string; onClearOrigin: () => void; onPrepare: (draft: FiscalDraftRecord) => void; onValidate: (draft: FiscalDraftRecord) => void; onReserveNumber: (draft: FiscalDraftRecord, expectedVersion: number) => void; onContinueIssuance: (draft: FiscalDraftRecord, expectedVersion: number) => void; onRevalidate: (draft: FiscalDraftRecord) => void; onCancel: (draft: FiscalDraftRecord) => void; onOpenCertificate: () => void; onNavigate: (view: View) => void; onSaveNumbering: (ledger: FiscalNumberingLedger, message: string) => boolean }) {
  const { can } = useContext(PermissionContext);
  const [documentType, setDocumentType] = useState<FiscalDocumentType>(() => settings.fiscal.documentScope[0] ?? 'nfe');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'revisar' | 'aguardando' | 'preparados' | 'processando' | 'autorizados' | 'rejeitados' | 'cancelados'>('todos');
  const [detailDraft, setDetailDraft] = useState<FiscalDraftRecord | null>(null);
  const [issueDraft, setIssueDraft] = useState<FiscalDraftRecord | null>(null);
  const [cancelDraft, setCancelDraft] = useState<FiscalDraftRecord | null>(null);
  const [numberingOpen, setNumberingOpen] = useState(false);
  const [fiscalBridgeOrigin, setFiscalBridgeOrigin] = useState('');
  const [remoteStatuses, setRemoteStatuses] = useState<Record<string, FiscalEmissionStatus>>({});
  const [statusSync, setStatusSync] = useState<Record<string, { loading: boolean; message: string }>>({});
  const [fiscalBridgeMessage, setFiscalBridgeMessage] = useState('');
  const requestedEmissionsRef = useRef(new Set<string>());
  const pendingFiscalRequestsRef = useRef(new Map<string, { kind: 'status' | 'download' | 'correction' | 'cancellation'; targetId: string; timer: number }>());

  useEffect(() => {
    setRemoteStatuses((current) => {
      let changed = false;
      const next = { ...current };
      for (const draft of drafts) {
        if (!draft.emissionId || !draft.remoteState) continue;
        if (!current[draft.emissionId] && draft.demoScenario && draft.remoteState === 'rejected') {
          changed = true;
          next[draft.emissionId] = rejectedNcmDemoStatus(draft);
          continue;
        }
        if (!current[draft.emissionId] && draft.demoScenario && draft.remoteState === 'danfe_ready') {
          changed = true;
          next[draft.emissionId] = authorizedCancellationDemoStatus(draft);
          continue;
        }
        if (!current[draft.emissionId]
          || (current[draft.emissionId].state === draft.remoteState
            && current[draft.emissionId].version === (draft.remoteVersion ?? current[draft.emissionId].version)
            && current[draft.emissionId].series === (draft.series === 'Não atribuída' ? current[draft.emissionId].series : draft.series)
            && current[draft.emissionId].number === (Number(draft.number) || current[draft.emissionId].number))) continue;
        changed = true;
        next[draft.emissionId] = {
          ...current[draft.emissionId],
          state: draft.remoteState,
          version: draft.remoteVersion ?? current[draft.emissionId].version,
          series: draft.series === 'Não atribuída' ? current[draft.emissionId].series : draft.series,
          number: Number(draft.number) || current[draft.emissionId].number,
          stateLabel: draft.remoteState === 'prepared' ? 'Preparação concluída' : draft.remoteState === 'number_reserved' ? 'Número reservado' : draft.remoteState === 'signed' ? 'Documento assinado' : draft.remoteState === 'processing' ? 'Processando' : draft.remoteState === 'authorized' ? 'Autorizada' : draft.remoteState === 'rejected' ? 'Rejeitada' : draft.remoteState === 'canceled' ? 'Cancelada' : current[draft.emissionId].stateLabel,
          authorized: ['authorized', 'artifacts_stored', 'danfe_ready', 'canceled'].includes(draft.remoteState),
        };
      }
      return changed ? next : current;
    });
  }, [drafts]);

  const nextFiscalRequestId = (prefix: string) => `${prefix}:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  const requestFiscalStatus = useCallback((draft: FiscalDraftRecord) => {
    if (!fiscalBridgeOrigin || !draft.emissionId) return;
    const requestId = nextFiscalRequestId('status');
    const message = createFiscalStatusRequest({ requestId, emissionId: draft.emissionId });
    if (!message) return;
    setStatusSync((current) => ({ ...current, [draft.emissionId as string]: { loading: true, message: 'Atualizando situação…' } }));
    const timer = window.setTimeout(() => {
      pendingFiscalRequestsRef.current.delete(requestId);
      setStatusSync((current) => ({ ...current, [draft.emissionId as string]: { loading: false, message: 'A atualização demorou mais que o esperado. Tente novamente.' } }));
    }, 12_000);
    pendingFiscalRequestsRef.current.set(requestId, { kind: 'status', targetId: draft.emissionId, timer });
    window.parent.postMessage(message, fiscalBridgeOrigin);
  }, [fiscalBridgeOrigin]);

  const requestFiscalDownload = useCallback((artifactId: string, artifactType: FiscalArtifactType) => {
    if (!fiscalBridgeOrigin) return;
    const requestId = nextFiscalRequestId('download');
    const message = createFiscalDownloadRequest({ requestId, artifactId, artifactType });
    if (!message) return;
    setFiscalBridgeMessage(artifactType === 'danfe_pdf' ? 'Preparando o DANFE…' : 'Preparando o XML autorizado…');
    const timer = window.setTimeout(() => {
      pendingFiscalRequestsRef.current.delete(requestId);
      setFiscalBridgeMessage('A preparação do arquivo demorou mais que o esperado. Tente novamente.');
    }, 12_000);
    pendingFiscalRequestsRef.current.set(requestId, { kind: 'download', targetId: artifactId, timer });
    window.parent.postMessage(message, fiscalBridgeOrigin);
  }, [fiscalBridgeOrigin]);

  const requestFiscalCorrection = useCallback((draft: FiscalDraftRecord, remoteStatus: FiscalEmissionStatus, items: Array<{ sku: string; ncm: string }>) => {
    if (!draft.emissionId) return;
    const requestId = nextFiscalRequestId('correction');
    const message = createFiscalCorrectionRequest({ requestId, emissionId: draft.emissionId, expectedVersion: remoteStatus.version, rejectedStatusCode: remoteStatus.statusCode, items });
    if (!message) { setFiscalBridgeMessage('Revise o NCM dos produtos e tente novamente.'); return; }
    if (!fiscalBridgeOrigin) {
      if (!draft.demoScenario) { setFiscalBridgeMessage('Abra o módulo pela Gestão para salvar uma revisão fiscal real.'); return; }
      setRemoteStatuses((current) => ({ ...current, [draft.emissionId as string]: { ...current[draft.emissionId as string], state: 'number_reserved', stateLabel: 'Revisão concluída · demonstração', version: remoteStatus.version + 2, statusCode: '', statusReason: 'NCM revisado no cenário fictício. Nenhuma nota foi assinada ou transmitida.', actionRequired: false, recommendedAction: '', recommendedActionLabel: '', recommendedActionMessage: '' } }));
      setStatusSync((current) => ({ ...current, [draft.emissionId as string]: { loading: false, message: 'Revisão demonstrada sem certificado ou transmissão.' } }));
      setFiscalBridgeMessage('Demonstração concluída: o NCM foi revisado e nenhuma nota real foi transmitida. Recarregue a página para repetir.');
      setIssueDraft(null);
      return;
    }
    setStatusSync((current) => ({ ...current, [draft.emissionId as string]: { loading: true, message: 'Salvando revisão fiscal…' } }));
    const timer = window.setTimeout(() => {
      pendingFiscalRequestsRef.current.delete(requestId);
      setStatusSync((current) => ({ ...current, [draft.emissionId as string]: { loading: false, message: 'A revisão demorou mais que o esperado. Atualize e tente novamente.' } }));
    }, 20_000);
    pendingFiscalRequestsRef.current.set(requestId, { kind: 'correction', targetId: draft.emissionId, timer });
    window.parent.postMessage(message, fiscalBridgeOrigin);
  }, [fiscalBridgeOrigin]);

  const requestFiscalCancellation = useCallback((draft: FiscalDraftRecord, remoteStatus: FiscalEmissionStatus, justification: string) => {
    if (!draft.emissionId) return;
    const requestId = nextFiscalRequestId('cancellation');
    const message = createFiscalCancellationRequest({ requestId, emissionId: draft.emissionId, expectedVersion: remoteStatus.version, justification });
    if (!message) { setFiscalBridgeMessage('Informe uma justificativa de 15 a 255 caracteres.'); return; }
    if (!fiscalBridgeOrigin) {
      if (!draft.demoScenario) { setFiscalBridgeMessage('Abra o módulo pela Gestão para solicitar o cancelamento fiscal.'); return; }
      const canceledAt = new Date().toISOString();
      setRemoteStatuses((current) => ({ ...current, [draft.emissionId as string]: { ...current[draft.emissionId as string], state: 'canceled', stateLabel: 'Cancelada · demonstração', version: remoteStatus.version + 1, cancellationStatusCode: '135', cancellationProtocol: '135260000000099', canceledAt, authorized: true, finalDocumentReady: false, statusReason: 'Cancelamento fictício concluído somente no navegador.' } }));
      setStatusSync((current) => ({ ...current, [draft.emissionId as string]: { loading: false, message: 'Cancelamento demonstrado sem transmissão governamental.' } }));
      setFiscalBridgeMessage('Demonstração concluída: o evento não foi transmitido e não possui valor fiscal.');
      setCancelDraft(null);
      return;
    }
    setStatusSync((current) => ({ ...current, [draft.emissionId as string]: { loading: true, message: 'Solicitando cancelamento fiscal…' } }));
    const timer = window.setTimeout(() => {
      pendingFiscalRequestsRef.current.delete(requestId);
      setStatusSync((current) => ({ ...current, [draft.emissionId as string]: { loading: false, message: 'A solicitação demorou mais que o esperado. Atualize a situação antes de tentar novamente.' } }));
    }, 20_000);
    pendingFiscalRequestsRef.current.set(requestId, { kind: 'cancellation', targetId: draft.emissionId, timer });
    window.parent.postMessage(message, fiscalBridgeOrigin);
  }, [fiscalBridgeOrigin]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!['gestao', 'gestao-local'].includes(params.get('bridge') || '') || window.parent === window) return;
    try {
      const parentOrigin = new URL(document.referrer).origin;
      if (isAllowedLocalManagementOrigin(parentOrigin, window.location.origin)) setFiscalBridgeOrigin(parentOrigin);
    } catch { /* o modo demonstrativo local continua disponível sem a ponte autenticada */ }
  }, []);

  useEffect(() => {
    if (!fiscalBridgeOrigin) return;
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== fiscalBridgeOrigin) return;
      const statusResponse = parseFiscalStatusResponse(event.data);
      if (statusResponse) {
        const pending = pendingFiscalRequestsRef.current.get(statusResponse.requestId);
        if (!pending || pending.kind !== 'status') return;
        window.clearTimeout(pending.timer);
        pendingFiscalRequestsRef.current.delete(statusResponse.requestId);
        if (statusResponse.ok && statusResponse.emission.id === pending.targetId) {
          setRemoteStatuses((current) => ({ ...current, [statusResponse.emission.id]: statusResponse.emission }));
          setStatusSync((current) => ({ ...current, [statusResponse.emission.id]: { loading: false, message: `Atualizado em ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` } }));
        } else {
          const message = statusResponse.ok ? 'A resposta fiscal não corresponde ao documento consultado.' : statusResponse.message;
          setStatusSync((current) => ({ ...current, [pending.targetId]: { loading: false, message } }));
        }
        return;
      }
      const correctionResponse = parseFiscalCorrectionResponse(event.data);
      if (correctionResponse) {
        const pending = pendingFiscalRequestsRef.current.get(correctionResponse.requestId);
        if (!pending || pending.kind !== 'correction') return;
        window.clearTimeout(pending.timer);
        pendingFiscalRequestsRef.current.delete(correctionResponse.requestId);
        if (!correctionResponse.ok) {
          setStatusSync((current) => ({ ...current, [pending.targetId]: { loading: false, message: correctionResponse.message } }));
          setFiscalBridgeMessage(correctionResponse.message);
          return;
        }
        const emission = correctionResponse.emission;
        setRemoteStatuses((current) => ({ ...current, [emission.emissionId]: { ...current[emission.emissionId], state: 'number_reserved', stateLabel: 'Dados fiscais revisados', version: emission.version, series: emission.series, number: emission.number, statusCode: '', statusReason: '', actionRequired: false, recommendedAction: '', recommendedActionLabel: '', recommendedActionMessage: '' } }));
        setStatusSync((current) => ({ ...current, [emission.emissionId]: { loading: false, message: 'Revisão salva. A nota está pronta para uma nova assinatura.' } }));
        setFiscalBridgeMessage('Dados fiscais revisados. Nenhuma transmissão foi realizada.');
        setIssueDraft(null);
        return;
      }
      const cancellationResponse = parseFiscalCancellationResponse(event.data);
      if (cancellationResponse) {
        const pending = pendingFiscalRequestsRef.current.get(cancellationResponse.requestId);
        if (!pending || pending.kind !== 'cancellation') return;
        window.clearTimeout(pending.timer);
        pendingFiscalRequestsRef.current.delete(cancellationResponse.requestId);
        if (!cancellationResponse.ok) {
          setStatusSync((current) => ({ ...current, [pending.targetId]: { loading: false, message: cancellationResponse.message } }));
          setFiscalBridgeMessage(cancellationResponse.message);
          return;
        }
        const emission = cancellationResponse.emission;
        setRemoteStatuses((current) => ({ ...current, [emission.emissionId]: { ...current[emission.emissionId], state: 'canceled', stateLabel: 'Cancelada', version: emission.version, cancellationStatusCode: emission.cancellationStatusCode, cancellationProtocol: emission.cancellationProtocol, canceledAt: emission.canceledAt, authorized: true, finalDocumentReady: false, statusReason: 'Cancelamento fiscal confirmado e autorização original preservada.' } }));
        setStatusSync((current) => ({ ...current, [emission.emissionId]: { loading: false, message: `Cancelamento confirmado · protocolo ${emission.cancellationProtocol}` } }));
        setFiscalBridgeMessage('Cancelamento fiscal confirmado. A autorização e os documentos originais permanecem no histórico.');
        setCancelDraft(null);
        return;
      }
      const downloadResponse = parseFiscalDownloadResponse(event.data);
      if (!downloadResponse) return;
      const pending = pendingFiscalRequestsRef.current.get(downloadResponse.requestId);
      if (!pending || pending.kind !== 'download') return;
      window.clearTimeout(pending.timer);
      pendingFiscalRequestsRef.current.delete(downloadResponse.requestId);
      if (!downloadResponse.ok) { setFiscalBridgeMessage(downloadResponse.message); return; }
      const link = document.createElement('a');
      link.href = downloadResponse.download.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = downloadResponse.download.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setFiscalBridgeMessage(`${downloadResponse.download.filename} preparado para download.`);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [fiscalBridgeOrigin]);

  useEffect(() => {
    if (!fiscalBridgeOrigin) return;
    drafts.forEach((draft) => {
      if (!draft.emissionId || requestedEmissionsRef.current.has(draft.emissionId)) return;
      requestedEmissionsRef.current.add(draft.emissionId);
      requestFiscalStatus(draft);
    });
  }, [drafts, fiscalBridgeOrigin, requestFiscalStatus]);

  useEffect(() => () => {
    pendingFiscalRequestsRef.current.forEach((request) => window.clearTimeout(request.timer));
    pendingFiscalRequestsRef.current.clear();
  }, []);
  useEffect(() => {
    if (!origin) return;
    setDocumentType(origin.documentType);
    const selected = drafts.find((draft) => draft.originId === origin.id);
    if (selected) setDetailDraft(selected);
  }, [origin, drafts]);
  useEffect(() => {
    if (origin || settings.fiscal.documentScope.includes(documentType)) return;
    setDocumentType(settings.fiscal.documentScope[0] ?? 'nfe');
  }, [documentType, origin, settings.fiscal.documentScope]);

  const filteredDrafts = drafts.filter((draft) => {
    const remoteStatus = draft.emissionId ? remoteStatuses[draft.emissionId] : undefined;
    const matchesQuery = normalizeSearch(`${draft.id} ${draft.originId} ${draft.client} ${draft.status} ${draft.documentType} ${remoteStatus?.stateLabel ?? ''} ${remoteStatus?.number ?? ''} ${remoteStatus?.accessKey ?? ''}`).includes(normalizeSearch(query));
    const matchesStatus = statusFilter === 'todos'
      || (statusFilter === 'revisar' && draft.status === 'Com pendências')
      || (statusFilter === 'aguardando' && draft.status === 'Bloqueado para transmissão')
      || (statusFilter === 'preparados' && draft.status === 'Pronto para homologação')
      || (statusFilter === 'processando' && Boolean(remoteStatus && ['number_reserved', 'signed', 'submitted', 'processing', 'artifacts_stored'].includes(remoteStatus.state)))
      || (statusFilter === 'autorizados' && Boolean(remoteStatus?.authorized && remoteStatus.state !== 'canceled'))
      || (statusFilter === 'rejeitados' && Boolean(remoteStatus && ['rejected', 'failed'].includes(remoteStatus.state)))
      || (statusFilter === 'cancelados' && (draft.status === 'Cancelado' || remoteStatus?.state === 'canceled'));
    return matchesQuery && matchesStatus;
  });
  const selectedOriginDraft = origin ? drafts.find((draft) => draft.originId === origin.id) : null;
  const pendingCount = drafts.filter((draft) => draft.status === 'Com pendências' || (draft.emissionId && ['rejected', 'failed'].includes(remoteStatuses[draft.emissionId]?.state || ''))).length;
  const readyCount = drafts.filter((draft) => draft.status === 'Pronto para homologação' || (draft.emissionId && ['prepared', 'number_reserved', 'signed'].includes(remoteStatuses[draft.emissionId]?.state || ''))).length;
  const canceledCount = drafts.filter((draft) => draft.status === 'Cancelado' || (draft.emissionId && remoteStatuses[draft.emissionId]?.state === 'canceled')).length;
  const companyReady = Boolean(config.companyDocument && config.taxRegime && config.cityCode);
  const registrationReady = Boolean(documentType === 'nfse' ? config.municipalRegistration : config.stateRegistration);
  const certificateReady = config.certificateValid;
  const rulesForDocument = settings.fiscal.matrix.rules.filter((rule) => rule.active && rule.documentType === documentType);
  const fiscalRulesReady = Boolean(settings.fiscal.taxReviewConfirmed && settings.fiscal.matrix.reviewedBy && rulesForDocument.length && rulesForDocument.every((rule) => rule.reviewed));
  const readyForIssue = companyReady && registrationReady && certificateReady && fiscalRulesReady && config.providerConnected;
  const readinessGuidance = certificateReady
    ? config.providerConnected
      ? 'O certificado e a conexão fiscal estão ativos. Conclua os dados e a revisão fiscal que ainda aparecem como pendentes.'
      : 'O certificado digital está ativo. Conclua os dados e a revisão fiscal; a conexão segura com o autorizador ainda precisa ser confirmada.'
    : 'Conclua os dados da empresa, a revisão fiscal e a instalação do certificado digital. A conexão segura será verificada antes da emissão.';
  const readinessItems = [
    ['Dados da empresa', companyReady, 'CNPJ, regime tributário e endereço fiscal'],
    [documentType === 'nfse' ? 'Inscrição municipal' : 'Inscrição estadual', registrationReady, 'Cadastro necessário para este documento'],
    ['Certificado digital', certificateReady, certificateReady ? 'Certificado ativo' : 'Adicione o certificado nas configurações'],
    ['Configuração fiscal', fiscalRulesReady, fiscalRulesReady ? 'Revisão concluída' : 'Revisão fiscal pendente'],
    ['Serviço de emissão', config.providerConnected, config.providerConnected ? 'Emissão disponível' : 'Conexão segura ainda não confirmada'],
  ] as const;

  return <>
    <PageHeading view="fiscal" action={<button type="button" className="button primary" disabled={!readyForIssue} title={!readyForIssue ? 'Conclua as pendências de emissão' : undefined}><Icon name="plus" size={18}/> Emitir nova nota</button>}/>
    {origin && (() => { const originStatus = selectedOriginDraft ? fiscalDraftUserStatus(selectedOriginDraft) : null; return <div className="fiscal-origin-banner" role="status"><span><Icon name="fiscal" size={20}/></span><div><strong>{selectedOriginDraft ? `Documento de ${origin.id} localizado` : `Preparação iniciada a partir de ${origin.id}`}</strong><p>{origin.sourceLabel} de {origin.client} · {money(origin.total)}. A origem permanece vinculada e uma nova seleção não cria duplicidade.</p></div><Badge tone={originStatus?.tone ?? 'info'}>{originStatus?.label ?? documentLabel(origin.documentType)}</Badge><button type="button" className="button secondary" onClick={onClearOrigin}>Limpar seleção</button></div>; })()}
    {!readyForIssue && <div className="fiscal-warning fiscal-operational-warning"><div><Icon name="warning" size={22}/></div><span><strong>Emissão fiscal ainda não liberada</strong><p>{readinessGuidance}</p></span><button type="button" className="button secondary" onClick={() => onNavigate('configuracoes')} disabled={!can('settings.view')}>Revisar ajustes</button></div>}
    <div className="metric-grid compact"><Metric label="Documentos" value={String(Math.max(0, drafts.length - canceledCount))} note="Originados nas operações"/><Metric label="Para revisar" value={String(pendingCount)} note="Dados ou rejeições" tone="warning"/><Metric label="Preparados" value={String(readyCount)} note="Aguardando emissão" tone="cyan"/><Metric label="Cancelados" value={String(canceledCount)} note="Histórico preservado"/></div>
    <div className="fiscal-layout fiscal-user-overview">
      <Panel title="Situação para emissão" subtitle="Confira somente o que exige ação da empresa"><div className="segmented" role="group" aria-label="Tipo de documento fiscal">{settings.fiscal.documentScope.map((type) => <button key={type} type="button" className={documentType === type ? 'active' : ''} aria-pressed={documentType === type} onClick={() => setDocumentType(type)}>{documentLabel(type)}</button>)}</div><div className="checklist">{readinessItems.map(([label, ready, detail]) => <div key={label}><span className={ready ? 'ready' : 'blocked'}><Icon name={ready ? 'check' : 'warning'} size={16}/></span><div><strong>{label}</strong><small>{detail}</small></div><Badge tone={ready ? 'success' : 'warning'}>{ready ? 'Pronto' : 'Pendente'}</Badge></div>)}</div></Panel>
      <Panel title="Certificado digital" subtitle="Assinatura da empresa ativa"><div className="fiscal-certificate-summary"><span className={certificateReady ? 'active' : ''}><Icon name={certificateReady ? 'check' : 'document'} size={24}/></span><div><Badge tone={certificateReady ? 'success' : 'warning'}>{certificateReady ? 'Certificado ativo' : 'Não configurado'}</Badge><h3>{certificateReady ? 'Certificado pronto para uso' : 'Adicione o certificado A1'}</h3><p>O vínculo com a empresa e as validações fiscais acontecem automaticamente.</p></div><button type="button" className="button primary" onClick={onOpenCertificate} disabled={!can('fiscal.configure')} title={!can('fiscal.configure') ? 'Somente Gestor ou Administrador pode configurar o certificado' : undefined}>{certificateReady ? 'Ver certificado' : 'Adicionar certificado'}</button></div></Panel>
    </div>
    <Panel title="Séries e numeração" subtitle="Próximo número protegido para cada tipo de nota" action={<button type="button" className="button secondary" onClick={() => setNumberingOpen(true)}><Icon name="settings" size={17}/> Configurar</button>}><div className="fiscal-numbering-summary">{settings.fiscal.documentScope.map((type) => { const sequence = fiscalActiveSequence(numberingLedger, type); return <div key={type}><span>{documentLabel(type)}</span><strong>Série {sequence?.series || 'não definida'}</strong><small>Próximo número: {sequence?.nextNumber?.toLocaleString('pt-BR') ?? 'não definido'}</small></div>; })}<div className="fiscal-numbering-summary-note"><Icon name="check" size={18}/><p><strong>Reserva automática e sem duplicidade</strong><small>O número só será reservado na confirmação da emissão. Consultas e revisões não alteram a sequência.</small></p></div></div></Panel>
    <Panel title="Documentos fiscais" subtitle="Notas preparadas a partir de pedidos e serviços">
      {fiscalBridgeMessage && <div className="fiscal-status-message" role="status"><Icon name="document" size={17}/><span>{fiscalBridgeMessage}</span></div>}
      <SearchToolbar value={query} onChange={setQuery} placeholder="Buscar por documento, origem, cliente ou situação"><select aria-label="Situação fiscal" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="todos">Todas as situações</option><option value="revisar">Para revisar</option><option value="aguardando">Aguardando emissão</option><option value="preparados">Preparação concluída</option><option value="processando">Em processamento</option><option value="autorizados">Autorizados</option><option value="rejeitados">Rejeitados ou com falha</option><option value="cancelados">Cancelados</option></select></SearchToolbar>
      {filteredDrafts.length > 0 ? <Table headers={['Documento', 'Origem', 'Cliente', 'Tipo', 'Situação fiscal', 'Valor', 'Ações']} minWidth={0} className="fiscal-drafts-table"><>{filteredDrafts.map((draft) => { const userStatus = fiscalDraftUserStatus(draft); const unresolvedChecks = draft.checks.filter((check) => !check.ready).length; const remoteStatus = draft.emissionId ? remoteStatuses[draft.emissionId] : undefined; const remotePresentation = remoteStatus ? fiscalStatusPresentation(remoteStatus) : null; const sync = draft.emissionId ? statusSync[draft.emissionId] : undefined; const prepare = fiscalPrepareState[draft.id]; return <tr key={draft.id}><td data-label="Documento"><button type="button" className="row-link" onClick={() => setDetailDraft(draft)}>{remoteStatus?.number ? `${remoteStatus.series}/${remoteStatus.number.toLocaleString('pt-BR')}` : draft.id}</button><small>{new Date(draft.createdAt).toLocaleDateString('pt-BR')}{draft.demoScenario ? ' · Demonstração' : ''}</small></td><td data-label="Origem"><strong>{draft.originId}</strong><small>{draft.sourceLabel}</small></td><td data-label="Cliente"><strong>{draft.client}</strong><small>{draft.clientDocument || 'Documento pendente'}</small></td><td data-label="Tipo">{documentLabel(draft.documentType)}</td><td data-label="Situação fiscal"><Badge tone={remotePresentation?.tone ?? userStatus.tone}>{prepare?.loading ? 'Validando…' : sync?.loading ? 'Atualizando…' : remotePresentation?.label ?? userStatus.label}</Badge><small>{prepare?.message || (sync?.loading ? 'Consultando situação mais recente' : remotePresentation?.detail ?? sync?.message ?? (draft.status !== 'Cancelado' ? unresolvedChecks ? `${unresolvedChecks} ${unresolvedChecks === 1 ? 'item pendente' : 'itens pendentes'}` : 'Conferência completa' : 'Histórico preservado'))}</small></td><td data-label="Valor" className="numeric"><strong>{money(draft.total)}</strong></td><td data-label="Ações" className="fiscal-actions-cell"><FiscalDraftRecordActions draft={draft} remoteStatus={remoteStatus} statusLoading={sync?.loading} prepareLoading={prepare?.loading} onDetails={() => setDetailDraft(draft)} onReview={remoteStatus?.authorized || (draft.demoScenario && remoteStatus?.state !== 'rejected') ? undefined : () => setIssueDraft(draft)} onPrepare={draft.persistenceSource === 'server' && draft.documentType === 'nfe' && !draft.emissionId ? () => onPrepare(draft) : undefined} onValidate={draft.persistenceSource === 'server' && draft.documentType === 'nfe' && remoteStatus?.state === 'draft' ? () => onValidate(draft) : undefined} onRevalidate={() => onRevalidate(draft)} onRefreshStatus={draft.emissionId && fiscalBridgeOrigin ? () => requestFiscalStatus(draft) : undefined} onDownload={fiscalBridgeOrigin ? requestFiscalDownload : undefined} onCancel={() => setCancelDraft(draft)}/></td></tr>; })}</></Table> : <EmptyState title="Nenhum documento fiscal encontrado" description="Fature um pedido ou conclua uma ordem de serviço para preparar o primeiro documento."/>}
    </Panel>
    <FiscalDraftDetailsDialog draft={detailDraft ? drafts.find((draft) => draft.id === detailDraft.id) ?? detailDraft : null} remoteStatus={detailDraft?.emissionId ? remoteStatuses[detailDraft.emissionId] : undefined} company={company} onClose={() => setDetailDraft(null)} onRevalidate={onRevalidate}/>
    {issueDraft?.emissionId && remoteStatuses[issueDraft.emissionId]?.state === 'rejected' ? <FiscalRejectedCorrectionDialog draft={drafts.find((draft) => draft.id === issueDraft.id) ?? issueDraft} remoteStatus={remoteStatuses[issueDraft.emissionId]} loading={statusSync[issueDraft.emissionId]?.loading} onClose={() => setIssueDraft(null)} onSubmit={(items) => requestFiscalCorrection(issueDraft, remoteStatuses[issueDraft.emissionId as string], items)} onNavigate={(target) => { setIssueDraft(null); onNavigate(target); }}/> : <FiscalIssueReviewDialog draft={issueDraft ? drafts.find((draft) => draft.id === issueDraft.id) ?? issueDraft : null} remoteStatus={issueDraft?.emissionId ? remoteStatuses[issueDraft.emissionId] : undefined} loading={issueDraft ? fiscalPrepareState[issueDraft.id]?.loading : false} company={company} numberingLedger={numberingLedger} onClose={() => setIssueDraft(null)} onReserveNumber={(draft, expectedVersion) => { onReserveNumber(draft, expectedVersion); setIssueDraft(null); }} onContinueIssuance={(draft, expectedVersion) => { onContinueIssuance(draft, expectedVersion); setIssueDraft(null); }} onRevalidate={onRevalidate} onCorrect={(target) => { setIssueDraft(null); onNavigate(target); }}/>}
    <FiscalNumberingDialog open={numberingOpen} ledger={numberingLedger} documentScope={settings.fiscal.documentScope} actor={activeUserName} readOnly={!can('fiscal.configure')} onClose={() => setNumberingOpen(false)} onSave={onSaveNumbering}/>
    {cancelDraft && cancelDraft.emissionId && remoteStatuses[cancelDraft.emissionId]?.authorized && remoteStatuses[cancelDraft.emissionId]?.state !== 'canceled'
      ? <FiscalCancellationDialog draft={cancelDraft} remoteStatus={remoteStatuses[cancelDraft.emissionId]} loading={statusSync[cancelDraft.emissionId]?.loading} onClose={() => setCancelDraft(null)} onSubmit={(justification) => requestFiscalCancellation(cancelDraft, remoteStatuses[cancelDraft.emissionId as string], justification)}/>
      : cancelDraft && <Dialog open title={`Cancelar rascunho de ${cancelDraft.originId}`} description="O histórico será preservado e nenhuma nota será emitida." onClose={() => setCancelDraft(null)}><div className="dialog-body lifecycle-confirmation"><div className="lifecycle-effect"><Icon name="warning" size={19}/><div><strong>Cancelar preparação da nota</strong><p>O rascunho ficará cancelado e poderá ser consultado no histórico.</p></div></div></div><footer className="dialog-footer"><button type="button" className="button secondary" onClick={() => setCancelDraft(null)}>Manter rascunho</button><button type="button" className="button danger" disabled={!can('fiscal.cancel')} onClick={() => { onCancel(cancelDraft); setCancelDraft(null); }}>Cancelar rascunho</button></footer></Dialog>}
  </>;
}

type ReceivableOperation = 'receber' | 'estornar_recebimento';
type ReceivableOperationInput = { id: string; amount: number; date: string; method: string; account: string; description: string };

function financialTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'Recebido') return 'success';
  if (status === 'Atrasado') return 'danger';
  if (status === 'Vence hoje' || status === 'Recebido parcial' || status === 'Estorno pendente') return 'warning';
  if (status === 'Em aberto') return 'info';
  return 'neutral';
}

function ReceivableDetailsDialog({ record, onClose }: { record: ReceivableRecord | null; onClose: () => void }) {
  if (!record) return null;
  const status = receivableStatus(record, todayIso());
  const netReceived = Math.max(0, record.received - record.refunded);
  return <Dialog open title={record.id} description={`Parcela ${record.installment} de ${record.origin} · ${record.client}`} onClose={onClose}>
    <div className="dialog-body receivable-details">
      <div className="receivable-detail-summary"><div><span>Valor original</span><strong>{money(record.value)}</strong></div><div><span>Recebido líquido</span><strong>{money(netReceived)}</strong></div><div><span>Saldo atual</span><strong>{money(receivableBalance(record))}</strong></div><div><span>Situação</span><Badge tone={financialTone(status)}>{status}</Badge></div></div>
      <section><div className="client-section-heading"><h3>Dados da parcela</h3><p>Origem comercial e condição preservadas para auditoria.</p></div><dl className="receivable-definition-list"><div><dt>Cliente</dt><dd>{record.client}</dd></div><div><dt>Operação de origem</dt><dd>{record.origin}</dd></div><div><dt>Vencimento</dt><dd>{displayIsoDate(record.dueDate)}</dd></div><div><dt>Forma prevista</dt><dd>{record.method}</dd></div><div><dt>Valor estornado</dt><dd>{money(record.reversed)}</dd></div><div><dt>Recebimentos estornados</dt><dd>{money(record.refunded)}</dd></div></dl></section>
      <section><div className="client-section-heading"><h3>Histórico financeiro</h3><p>Geração, recebimentos e estornos desta parcela.</p></div><div className="receivable-event-list">{record.events.map((event, index) => <div key={`${event.date}-${index}`}><span className={event.type.includes('Estorno') ? 'reversal' : ''}><Icon name={event.type === 'Recebimento' ? 'money' : event.type.includes('Estorno') ? 'back' : 'document'} size={15}/></span><div><strong>{event.type} · {money(event.amount)}</strong><small>{new Date(event.date).toLocaleString('pt-BR')} · {event.user}</small><p>{event.description}{event.account && event.account !== 'Não aplicável' ? ` · ${event.account}` : ''}</p></div></div>)}</div></section>
    </div>
    <footer className="dialog-footer"><button type="button" className="button primary" onClick={onClose}>Fechar</button></footer>
  </Dialog>;
}

function ReceivableOperationDialog({ mode, records, initialId, connected, onClose, onSave }: { mode: ReceivableOperation; records: ReceivableRecord[]; initialId: string; connected: boolean; onClose: () => void; onSave: (mode: ReceivableOperation, input: ReceivableOperationInput) => Promise<ConfirmedSave> }) {
  const eligible = records.filter((record) => mode === 'receber' ? receivableBalance(record) > 0 : record.received - record.refunded > 0);
  const [id, setId] = useState(initialId || eligible[0]?.id || '');
  const selected = records.find((record) => record.id === id) ?? eligible[0];
  const available = selected ? mode === 'receber' ? receivableBalance(selected) : Math.max(0, selected.received - selected.refunded) : 0;
  const [amount, setAmount] = useState(() => available ? money(available).replace('R$', '').trim() : '0,00');
  const [date, setDate] = useState(todayIso());
  const [method, setMethod] = useState(selected?.method ?? 'PIX');
  const [account, setAccount] = useState(connected ? '' : 'Conta demonstração');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const selectRecord = (nextId: string) => {
    const next = records.find((record) => record.id === nextId);
    const nextAvailable = next ? mode === 'receber' ? receivableBalance(next) : Math.max(0, next.received - next.refunded) : 0;
    setId(nextId);
    setAmount(money(nextAvailable).replace('R$', '').trim());
    setMethod(next?.method ?? 'PIX');
    setError('');
  };
  const submit = async () => {
    if (saving) return;
    setSaving(true);
    const result = await onSave(mode, { id: selected?.id ?? '', amount: commercialNumber(amount), date, method, account, description });
    setSaving(false);
    if (!result.ok) { setError(result.message); return; }
    onClose();
  };
  const isRefund = mode === 'estornar_recebimento';
  return <Dialog open title={isRefund ? 'Estornar recebimento' : 'Registrar recebimento'} description={isRefund ? 'O valor líquido recebido será reduzido e o saldo da parcela será reaberto.' : connected ? 'Registre um recebimento parcial ou total vinculado ao perfil empresarial.' : 'Registre um recebimento parcial ou total sem criar movimentação bancária real.'} onClose={saving ? () => undefined : onClose}>
    <div className="dialog-body receivable-operation-form">
      <div className={`financial-operation-safety ${isRefund ? 'reversal' : ''}`}><Icon name={isRefund ? 'warning' : 'money'} size={19}/><p><strong>{connected ? 'Movimentação vinculada ao perfil.' : isRefund ? 'Estorno local e rastreável.' : 'Registro comercial local.'}</strong> {connected ? 'O histórico comercial e a entrada mensal serão atualizados; a conciliação bancária continua na Gestão Financeira.' : isRefund ? 'Nenhum valor será movimentado em conta bancária.' : 'A conciliação bancária continuará pendente na Gestão Financeira.'}</p></div>
      <div className="form-grid">
        <label className="field field-wide"><span>Parcela *</span><select value={selected?.id ?? ''} onChange={(event) => selectRecord(event.target.value)}>{eligible.map((record) => <option key={record.id} value={record.id}>{record.id} · {record.client} · {record.origin} · saldo {money(mode === 'receber' ? receivableBalance(record) : record.received - record.refunded)}</option>)}</select></label>
        <label className="field"><span>{isRefund ? 'Valor a estornar *' : 'Valor recebido *'}</span><div className="input-prefix"><i>R$</i><input inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'receivable-operation-error' : undefined}/></div></label>
        <label className="field"><span>{isRefund ? 'Data do estorno *' : 'Data do recebimento *'}</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></label>
        <label className="field"><span>Forma</span><select value={method} onChange={(event) => setMethod(event.target.value)}><option>PIX</option><option>Boleto</option><option>Cartão</option><option>Transferência</option><option>Dinheiro</option><option>Outro</option></select></label>
        <label className="field"><span>Conta de referência</span>{connected ? <input value={account} onChange={(event) => setAccount(event.target.value.slice(0, 160))} placeholder="Banco, caixa ou conta de recebimento"/> : <select value={account} onChange={(event) => setAccount(event.target.value)}><option>Conta demonstração</option><option>Caixa demonstração</option><option>A definir na Gestão</option></select>}</label>
        <label className="field field-wide"><span>Observação</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={isRefund ? 'Motivo do estorno do recebimento' : 'Comprovante, referência ou observação comercial'}/></label>
      </div>
      {selected && <div className="receivable-operation-balance"><div><span>Valor da parcela</span><strong>{money(selected.value)}</strong></div><div><span>{isRefund ? 'Disponível para estorno' : 'Saldo antes do recebimento'}</span><strong>{money(available)}</strong></div><div><span>Saldo após operação</span><strong>{money(Math.max(0, available - commercialNumber(amount)))}</strong></div></div>}
      {error && <p id="receivable-operation-error" className="form-error" role="alert">{error}</p>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className={`button ${isRefund ? 'danger' : 'primary'}`} onClick={() => void submit()} disabled={!selected || saving}>{saving ? 'Confirmando…' : isRefund ? 'Confirmar estorno' : 'Registrar recebimento'}</button></footer>
  </Dialog>;
}

function ReceivableRecordActions({ record, onDetails, onOperation }: { record: ReceivableRecord; onDetails: () => void; onOperation: (mode: ReceivableOperation) => void }) {
  const actions: RecordAction[] = [
    { label: 'Abrir detalhes', description: 'Origem, valores e histórico financeiro da parcela', icon: 'document', onSelect: onDetails },
    ...(receivableBalance(record) > 0 ? [{ label: 'Registrar recebimento', description: 'Baixa parcial ou total vinculada à parcela', icon: 'money' as IconName, onSelect: () => onOperation('receber'), permission: 'receivables.receive' }] : []),
    ...(record.received - record.refunded > 0 ? [{ label: 'Estornar recebimento', description: 'Reabre o saldo sem apagar o histórico original', icon: 'back' as IconName, onSelect: () => onOperation('estornar_recebimento'), permission: 'receivables.refund' }] : []),
    { label: 'Enviar cobrança', description: 'E-mail ou WhatsApp com link e documento da parcela', icon: 'mail', planned: true },
    { label: 'Gerar comprovante', description: 'Documento da empresa após integração financeira', icon: 'print', planned: true },
  ];
  return <RecordActionsDialog title={`Ações de ${record.id}`} description={`${record.client} · ${record.origin}. O histórico financeiro nunca é apagado.`} actions={actions} triggerLabel={`Ações de ${record.id}`}/>;
}

function ReceivablesView({ records, initialOrigin, connected, onReceive, onRefund }: { records: ReceivableRecord[]; initialOrigin: string; connected: boolean; onReceive: (input: ReceivableOperationInput) => Promise<ConfirmedSave>; onRefund: (input: ReceivableOperationInput) => Promise<ConfirmedSave> }) {
  const { can } = useContext(PermissionContext);
  const [query, setQuery] = useState(initialOrigin);
  const [statusFilter, setStatusFilter] = useState('Todas as situações');
  const [detailRecord, setDetailRecord] = useState<ReceivableRecord | null>(null);
  const [operation, setOperation] = useState<{ mode: ReceivableOperation; id: string } | null>(null);
  useEffect(() => { if (initialOrigin) setQuery(initialOrigin); }, [initialOrigin]);
  const today = todayIso();
  const normalizedQuery = normalizeSearch(query);
  const rows = records.map((record) => ({ record, status: receivableStatus(record, today), balance: receivableBalance(record), netReceived: Math.max(0, record.received - record.refunded) }));
  const filtered = rows.filter(({ record, status }) => (!normalizedQuery || normalizeSearch(`${record.id} ${record.client} ${record.origin} ${record.method} ${status}`).includes(normalizedQuery)) && (statusFilter === 'Todas as situações' || status === statusFilter));
  const openRows = rows.filter(({ balance }) => balance > 0);
  const openTotal = openRows.reduce((sum, row) => sum + row.balance, 0);
  const netReceivedTotal = rows.reduce((sum, row) => sum + row.netReceived, 0);
  const dueTodayRows = openRows.filter(({ record }) => record.dueDate === today);
  const overdueRows = openRows.filter(({ record }) => record.dueDate < today);
  const saveOperation = (mode: ReceivableOperation, input: ReceivableOperationInput) => mode === 'receber' ? onReceive(input) : onRefund(input);
  return <>
    <PageHeading view="recebimentos" action={<button type="button" className="button primary" onClick={() => openRows[0] && setOperation({ mode: 'receber', id: openRows[0].record.id })} disabled={!openRows.length || !can('receivables.receive')}><Icon name="plus" size={17}/> Registrar recebimento</button>}/>
    <div className="finance-boundary"><span><Icon name="money"/></span><div><strong>Resumo comercial, não um segundo financeiro</strong><p>Esta área acompanha parcelas originadas por vendas e serviços. Bancos, conciliação, caixa, DRE e relatórios contábeis continuam na Gestão Financeira.</p></div><button type="button" className="button secondary" disabled title="Disponível após integração com a Gestão">Abrir Gestão Financeira</button></div>
    {initialOrigin && <div className="receivable-origin-banner" role="status"><span><Icon name="sale" size={19}/></span><div><strong>Contas vinculadas a {initialOrigin}</strong><p>A busca foi aplicada a partir das ações da operação comercial.</p></div><button type="button" className="button secondary" onClick={() => setQuery('')}>Mostrar todas</button></div>}
    <div className="metric-grid compact"><Metric label="A receber" value={money(openTotal)} note={`${openRows.length} ${openRows.length === 1 ? 'parcela' : 'parcelas'}`}/><Metric label="Recebido líquido" value={money(netReceivedTotal)} note={connected ? 'No perfil empresarial' : 'Nos registros locais'} tone="cyan"/><Metric label="Vence hoje" value={money(dueTodayRows.reduce((sum, row) => sum + row.balance, 0))} note={`${dueTodayRows.length} ${dueTodayRows.length === 1 ? 'parcela' : 'parcelas'}`} tone="warning"/><Metric label="Em atraso" value={money(overdueRows.reduce((sum, row) => sum + row.balance, 0))} note={`${overdueRows.length} ${overdueRows.length === 1 ? 'parcela' : 'parcelas'}`} tone="warning"/></div>
    <Panel title="Parcelas comerciais" subtitle={`${filtered.length} de ${records.length} registros · a origem comercial nunca é perdida`}><SearchToolbar value={query} onChange={setQuery} placeholder="Buscar por parcela, cliente, operação ou situação"><select aria-label="Situação financeira" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todas as situações</option><option>Em aberto</option><option>Vence hoje</option><option>Atrasado</option><option>Recebido parcial</option><option>Recebido</option><option>Estornado</option></select></SearchToolbar><Table headers={['Parcela', 'Cliente e origem', 'Vencimento', 'Condição', 'Valor', 'Recebido', 'Saldo', 'Situação', 'Ações']} minWidth={0} className="receivables-table"><>{filtered.map(({ record, status, balance, netReceived }) => <tr key={record.id}><td data-label="Parcela"><button className="row-link" type="button" onClick={() => setDetailRecord(record)}>{record.id}</button></td><td data-label="Cliente e origem"><div className="receivable-party"><strong>{record.client}</strong><small>{record.origin}</small></div></td><td data-label="Vencimento">{displayIsoDate(record.dueDate)}</td><td data-label="Condição"><div className="receivable-condition"><strong>{record.method}</strong><small>{record.installment}</small></div></td><td data-label="Valor" className="numeric"><strong>{money(record.value)}</strong></td><td data-label="Recebido" className="numeric">{money(netReceived)}</td><td data-label="Saldo" className="numeric"><strong>{money(balance)}</strong></td><td data-label="Situação"><Badge tone={financialTone(status)}>{status}</Badge></td><td data-label="Ações" className="receivable-actions-cell"><ReceivableRecordActions record={record} onDetails={() => setDetailRecord(record)} onOperation={(mode) => setOperation({ mode, id: record.id })}/></td></tr>)}</></Table>{!filtered.length && <EmptyState title="Nenhuma parcela encontrada" description="Ajuste a busca ou a situação para consultar outros recebimentos."/>}</Panel>
    <ReceivableDetailsDialog record={detailRecord} onClose={() => setDetailRecord(null)}/>
    {operation && <ReceivableOperationDialog key={`${operation.mode}-${operation.id}`} mode={operation.mode} records={records} initialId={operation.id} connected={connected} onClose={() => setOperation(null)} onSave={saveOperation}/>}
  </>;
}

type ReportId = 'comercial' | 'produtos' | 'servicos' | 'estoque' | 'fiscal' | 'financeiro';
type ReportPeriod = 'all' | '2026-08' | '2026-07';
type ReportVisualRow = { label: string; detail: string; primary: string; secondary: string; value: number; badge?: string; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' };

function ReportsView({ created, catalogRecords, movementRecords, receivableRecords, fiscalDrafts, onNotify }: { created: CreatedRecord[]; catalogRecords: CatalogItem[]; movementRecords: StockMovementRecord[]; receivableRecords: ReceivableRecord[]; fiscalDrafts: FiscalDraftRecord[]; onNotify: (message: string) => void }) {
  const { can } = useContext(PermissionContext);
  const [report, setReport] = useState<ReportId>('comercial');
  const [period, setPeriod] = useState<ReportPeriod>('all');
  const reports = [
    ['comercial', 'Desempenho comercial', 'Receita, custos, clientes e ticket', 'chart'], ['produtos', 'Produtos e margem', 'Volume, receita e rentabilidade', 'box'],
    ['servicos', 'Serviços', 'Execução, horas, custo real e margem', 'service'], ['estoque', 'Estoque', 'Valor, reservas, consumo e rupturas', 'stock'],
    ['fiscal', 'Fiscal', 'Rascunhos, prontidão e pendências', 'fiscal'], ['financeiro', 'Recebimentos', 'Abertos, atrasos e formas', 'money'],
  ] as const;
  const periodLabel = ({ all: 'Todo o histórico disponível', '2026-08': 'Agosto de 2026', '2026-07': 'Julho de 2026' } as const)[period];
  const matchesPeriod = (value?: string) => period === 'all' || String(value || '').slice(0, 7) === period;
  const operations = created.filter((record) => matchesPeriod(record.createdAt));
  const financialRecords = receivableRecords.filter((record) => matchesPeriod(record.createdAt));
  const stockRecords = movementRecords.filter((record) => matchesPeriod(record.createdAt));
  const fiscalRecords = fiscalDrafts.filter((record) => matchesPeriod(record.createdAt));
  const snapshot = calculateCommercialReport({ operations, receivables: financialRecords, catalog: catalogRecords, movements: stockRecords, fiscalDrafts: fiscalRecords, todayIso: todayIso() });
  const sum = <T extends Record<string, unknown>>(rows: T[], field: keyof T) => rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
  const productRevenue = sum(snapshot.products, 'revenue');
  const productCost = sum(snapshot.products, 'cost');
  const serviceRevenue = sum(snapshot.services, 'revenue');
  const serviceCost = sum(snapshot.services, 'cost');
  const productQuantity = sum(snapshot.products, 'quantity');
  const serviceQuantity = sum(snapshot.services, 'quantity');
  const marginOf = (revenue: number, cost: number) => revenue > 0 ? (revenue - cost) / revenue * 100 : 0;
  const rowsByReport: Record<ReportId, ReportVisualRow[]> = {
    comercial: snapshot.clients.map((item) => ({ label: item.label, detail: `${item.count} ${item.count === 1 ? 'operação concluída' : 'operações concluídas'}`, primary: money(item.revenue), secondary: `Custo ${money(item.cost)} · margem ${percent(item.marginPercent)}`, value: item.revenue })),
    produtos: snapshot.products.map((item) => ({ label: item.label, detail: `${formatLineNumber(item.quantity, false)} unidades faturadas`, primary: money(item.revenue), secondary: `Custo ${money(item.cost)} · margem ${percent(item.marginPercent)}`, value: item.revenue })),
    servicos: snapshot.services.map((item) => ({ label: item.label, detail: `${formatLineNumber(item.quantity, false)} unidades de serviço concluídas`, primary: money(item.revenue), secondary: `Custo real ${money(item.cost)} · margem ${percent(item.marginPercent)}`, value: item.revenue })),
    estoque: snapshot.inventory.map((item) => ({ label: item.label, detail: `${item.sku} · físico ${formatLineNumber(item.current, false)} · reservado ${formatLineNumber(item.reserved, false)}`, primary: money(item.value), secondary: `${formatLineNumber(item.quantity, false)} disponíveis · mínimo ${formatLineNumber(item.minimum, false)}`, value: item.value, badge: item.status === 'normal' ? 'Normal' : item.status === 'baixo' ? 'Baixo' : 'Sem estoque', tone: item.status === 'normal' ? 'success' : item.status === 'baixo' ? 'warning' : 'danger' })),
    fiscal: snapshot.fiscal.map((item) => ({ label: item.label, detail: `${item.count} ${item.count === 1 ? 'rascunho' : 'rascunhos'} no período`, primary: money(item.value), secondary: 'Valor das operações vinculadas', value: item.value, badge: item.label, tone: item.label === 'Pronto para homologação' ? 'success' : item.label === 'Cancelado' ? 'neutral' : 'warning' })),
    financeiro: snapshot.payments.map((item) => ({ label: item.label, detail: `${item.count} ${item.count === 1 ? 'parcela' : 'parcelas'} originadas no período`, primary: money(item.value), secondary: `${money(item.received)} recebido líquido`, value: item.value + item.received })),
  };
  const metricsByReport: Record<ReportId, Array<{ label: string; value: string; note: string; tone?: 'brand' | 'cyan' | 'success' | 'warning' }>> = {
    comercial: [{ label: 'Receita concluída', value: money(snapshot.revenue), note: `${snapshot.completedOperations} ${snapshot.completedOperations === 1 ? 'operação' : 'operações'}` }, { label: 'Resultado bruto', value: money(snapshot.grossProfit), note: `Custo ${money(snapshot.cost)}`, tone: 'cyan' }, { label: 'Margem apurada', value: percent(snapshot.marginPercent), note: 'Sobre operações concluídas', tone: 'success' }, { label: 'Ticket médio', value: money(snapshot.averageTicket), note: 'Por operação concluída', tone: 'warning' }],
    produtos: [{ label: 'Receita de produtos', value: money(productRevenue), note: `${formatLineNumber(productQuantity, false)} unidades` }, { label: 'Custo publicado', value: money(productCost), note: 'Retrato preservado na venda', tone: 'cyan' }, { label: 'Resultado bruto', value: money(productRevenue - productCost), note: percent(marginOf(productRevenue, productCost)), tone: 'success' }, { label: 'Produtos vendidos', value: String(snapshot.products.length), note: 'SKUs com faturamento', tone: 'warning' }],
    servicos: [{ label: 'Receita de serviços', value: money(serviceRevenue), note: `${formatLineNumber(serviceQuantity, false)} unidades concluídas` }, { label: 'Custo real', value: money(serviceCost), note: 'Mão de obra e materiais', tone: 'cyan' }, { label: 'Margem real', value: percent(marginOf(serviceRevenue, serviceCost)), note: money(serviceRevenue - serviceCost), tone: 'success' }, { label: 'Horas realizadas', value: `${formatLineNumber(snapshot.serviceHours, false)} h`, note: 'Apontamento das OS', tone: 'warning' }],
    estoque: [{ label: 'Valor disponível', value: money(snapshot.stockAvailableValue), note: 'Pelo custo publicado' }, { label: 'Saldo físico', value: formatLineNumber(snapshot.stockCurrentUnits, false), note: 'Unidades controladas', tone: 'cyan' }, { label: 'Reservado', value: formatLineNumber(snapshot.stockReservedUnits, false), note: 'Comprometido por pedidos', tone: 'success' }, { label: 'Abaixo do mínimo', value: String(snapshot.stockLowItems), note: `${formatLineNumber(snapshot.stockConsumed, false)} unidades saíram no período`, tone: 'warning' }],
    fiscal: [{ label: 'Rascunhos', value: String(snapshot.fiscalDrafts), note: periodLabel }, { label: 'Prontos', value: String(snapshot.fiscalReady), note: 'Para homologação local', tone: 'cyan' }, { label: 'Com pendências', value: String(snapshot.fiscalBlocked), note: 'Cadastro ou transmissão', tone: 'warning' }, { label: 'Valor vinculado', value: money(snapshot.fiscalValue), note: 'Sem valor fiscal autorizado', tone: 'success' }],
    financeiro: [{ label: 'A receber', value: money(snapshot.openReceivables), note: `${financialRecords.length} ${financialRecords.length === 1 ? 'parcela' : 'parcelas'}` }, { label: 'Recebido líquido', value: money(snapshot.receivedNet), note: 'Registros comerciais locais', tone: 'cyan' }, { label: 'Em atraso', value: money(snapshot.overdueReceivables), note: 'Saldo vencido em aberto', tone: 'warning' }, { label: 'Prazo médio', value: snapshot.averageDueDays > 0 ? `${snapshot.averageDueDays} dias` : 'Não apurado', note: 'Da geração ao vencimento', tone: 'success' }],
  };
  const topRow = rowsByReport[report][0];
  const insightsByReport: Record<ReportId, Array<{ tone: 'success' | 'warning' | 'info'; icon: IconName; title: string; description: string }>> = {
    comercial: [{ tone: 'success', icon: 'chart', title: topRow ? `${topRow.label} lidera a receita concluída` : 'Ainda não há operação concluída', description: topRow ? `${topRow.primary} no período selecionado.` : 'Fature um pedido ou conclua uma OS para iniciar a análise.' }, { tone: 'info', icon: 'money', title: `Ticket médio de ${money(snapshot.averageTicket)}`, description: 'Calculado somente sobre pedidos faturados e ordens concluídas.' }, { tone: snapshot.marginPercent >= 0 ? 'success' : 'warning', icon: snapshot.marginPercent >= 0 ? 'arrow' : 'warning', title: `Margem consolidada de ${percent(snapshot.marginPercent)}`, description: 'Custos publicados e custos reais das ordens compõem o resultado.' }],
    produtos: [{ tone: 'success', icon: 'box', title: topRow ? `${topRow.label} tem a maior receita` : 'Nenhum produto faturado', description: topRow?.secondary ?? 'Os produtos surgirão após o faturamento dos pedidos.' }, { tone: snapshot.stockLowItems ? 'warning' : 'success', icon: snapshot.stockLowItems ? 'warning' : 'check', title: `${snapshot.stockLowItems} itens abaixo do mínimo`, description: 'A posição atual do estoque ajuda a antecipar restrições comerciais.' }, { tone: 'info', icon: 'chart', title: `${percent(marginOf(productRevenue, productCost))} de margem nos produtos`, description: `Resultado bruto de ${money(productRevenue - productCost)}.` }],
    servicos: [{ tone: 'success', icon: 'service', title: topRow ? `${topRow.label} lidera os serviços` : 'Nenhum serviço concluído', description: topRow?.secondary ?? 'Conclua uma ordem para apurar custo real e margem.' }, { tone: 'info', icon: 'clock', title: `${formatLineNumber(snapshot.serviceHours, false)} horas realizadas`, description: 'Soma dos apontamentos das ordens concluídas no período.' }, { tone: 'success', icon: 'chart', title: `${percent(marginOf(serviceRevenue, serviceCost))} de margem real`, description: 'Inclui mão de obra e materiais próprios ou externos.' }],
    estoque: [{ tone: snapshot.stockLowItems ? 'warning' : 'success', icon: snapshot.stockLowItems ? 'warning' : 'check', title: `${snapshot.stockLowItems} itens exigem atenção`, description: 'Comparação entre disponível e mínimo configurado.' }, { tone: 'info', icon: 'stock', title: `${formatLineNumber(snapshot.stockReservedUnits, false)} unidades reservadas`, description: 'O saldo comprometido permanece protegido de saídas manuais e OS.' }, { tone: 'success', icon: 'arrow', title: `${formatLineNumber(snapshot.stockConsumed, false)} unidades consumidas`, description: `Saídas registradas em ${periodLabel.toLocaleLowerCase('pt-BR')}.` }],
    fiscal: [{ tone: snapshot.fiscalBlocked ? 'warning' : 'success', icon: snapshot.fiscalBlocked ? 'warning' : 'check', title: `${snapshot.fiscalBlocked} rascunhos com pendências`, description: 'A transmissão continua bloqueada até cadastro e conector estarem prontos.' }, { tone: 'info', icon: 'fiscal', title: `${snapshot.fiscalReady} prontos para homologação`, description: 'Pronto local não significa documento autorizado pelo fisco.' }, { tone: 'success', icon: 'money', title: `${money(snapshot.fiscalValue)} vinculados`, description: 'Valor comercial relacionado aos rascunhos do período.' }],
    financeiro: [{ tone: snapshot.overdueReceivables ? 'warning' : 'success', icon: snapshot.overdueReceivables ? 'warning' : 'check', title: `${money(snapshot.overdueReceivables)} em atraso`, description: 'Saldo vencido e ainda aberto nos registros comerciais.' }, { tone: 'info', icon: 'clock', title: snapshot.averageDueDays > 0 ? `Prazo médio de ${snapshot.averageDueDays} dias` : 'Prazo médio ainda não apurado', description: snapshot.averageDueDays > 0 ? 'Intervalo médio entre geração da parcela e vencimento.' : 'Os registros demonstrativos não preservam a data original de geração.' }, { tone: 'success', icon: 'money', title: `${money(snapshot.receivedNet)} recebidos`, description: 'Valor líquido após estornos, ainda sem conciliação bancária.' }],
  };
  const activeRows = rowsByReport[report];
  const maxValue = Math.max(0, ...activeRows.map((row) => row.value));
  const exportCsv = () => {
    if (!activeRows.length) return;
    const content = buildReportCsv(activeRows);
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${report}-${period === 'all' ? 'historico' : period}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    onNotify(`Relatório ${reports.find(([id]) => id === report)?.[1]} exportado em CSV.`);
  };
  return <>
    <PageHeading view="relatorios" action={<div className="period-control"><label>Período<select value={period} onChange={(event) => setPeriod(event.target.value as ReportPeriod)}><option value="all">Todo o histórico</option><option value="2026-08">Agosto de 2026</option><option value="2026-07">Julho de 2026</option></select></label><button type="button" className="button secondary" onClick={exportCsv} disabled={!activeRows.length || !can('reports.export')}><Icon name="document" size={16}/> Exportar CSV</button></div>}/>
    <div className="report-data-source"><span><Icon name="chart" size={18}/></span><p><strong>Indicadores calculados com os registros disponíveis neste navegador.</strong><small>O período filtra operações, parcelas, movimentações e rascunhos; a posição de estoque sempre representa o saldo atual.</small></p><Badge tone="info">{periodLabel}</Badge></div>
    <div className="report-selector" role="group" aria-label="Tipo de relatório">{reports.map(([id, title, description, icon]) => <button key={id} type="button" className={report === id ? 'active' : ''} aria-pressed={report === id} onClick={() => setReport(id)}><span><Icon name={icon}/></span><div><strong>{title}</strong><small>{description}</small></div></button>)}</div>
    <div className="metric-grid compact">{metricsByReport[report].map((metric) => <Metric key={metric.label} {...metric}/>)}</div>
    <div className="content-grid reports">
      <Panel title={reports.find(([id]) => id === report)?.[1] ?? 'Relatório'} subtitle={`${activeRows.length} indicadores · ${periodLabel.toLocaleLowerCase('pt-BR')}`} action={activeRows.length ? <Badge tone="info">Atualizado</Badge> : undefined}>{activeRows.length ? <div className="report-data-list">{activeRows.map((row) => <article key={row.label}><div><strong>{row.label}</strong><small>{row.detail}</small></div><div className="report-row-values"><strong>{row.primary}</strong><small>{row.secondary}</small></div>{row.badge && <Badge tone={row.tone}>{row.badge}</Badge>}<span aria-hidden="true"><i style={{ width: `${maxValue > 0 ? Math.max(3, row.value / maxValue * 100) : 0}%` }}/></span></article>)}</div> : <EmptyState title="Sem dados para este relatório" description="Selecione outro período ou conclua operações do módulo para formar os indicadores."/>}</Panel>
      <Panel title="Leitura do período" subtitle="Sinais calculados, sem comparação fictícia"><div className="insight-list">{insightsByReport[report].map((insight) => <div key={insight.title}><span className={insight.tone}><Icon name={insight.icon} size={17}/></span><p><strong>{insight.title}</strong><small>{insight.description}</small></p></div>)}</div></Panel>
    </div>
    <div className="report-boundary"><Icon name="chart"/><p><strong>Relatórios financeiros completos permanecem na Gestão.</strong> Este módulo mostra somente indicadores com origem comercial; caixa realizado, bancos, conciliação, impostos efetivos e DRE usam o livro financeiro central.</p></div>
  </>;
}

type SettingsSection = 'empresa' | 'comercial' | 'pagamentos' | 'equipe' | 'estoque' | 'fiscal';

function splitTeam(value: string) {
  return [...new Set(value.split(/[\n,;]/).map((item) => item.trim()).filter(Boolean))];
}

function SettingsDialog({ section, settings, onClose, onSave }: { section: SettingsSection | null; settings: ModuleSettings; onClose: () => void; onSave: (settings: ModuleSettings) => void }) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState('');
  const [lookup, setLookup] = useState<{ kind: 'cnpj' | 'cep'; message: string; tone: 'success' | 'error' } | null>(null);
  const [searching, setSearching] = useState<'cnpj' | 'cep' | null>(null);
  useEffect(() => { setDraft(settings); setError(''); setLookup(null); setSearching(null); }, [section, settings]);
  if (!section) return null;
  const titles: Record<SettingsSection, [string, string]> = {
    empresa: ['Dados da empresa ativa', 'Estas informações identificam o emitente e aparecem nos novos PDFs do módulo.'],
    comercial: ['Regras comerciais', 'Defina os padrões usados na abertura de pedidos e orçamentos.'],
    pagamentos: ['Pagamentos', 'Escolha as condições apresentadas por padrão nos novos lançamentos.'],
    equipe: ['Equipe comercial e de serviços', 'Organize vendedores e responsáveis disponíveis nos formulários.'],
    estoque: ['Estoque e movimentações', 'Defina locais, bloqueios operacionais e motivos usados nos registros de estoque.'],
    fiscal: ['Configurações fiscais', 'Informe o responsável, as séries e as revisões aplicadas à empresa ativa.'],
  };
  const updateCompany = (key: keyof CompanyProfile, value: string) => setDraft((current) => {
    const company = { ...current.company, [key]: value };
    if (key === 'city' || key === 'cep') {
      company.cityCode = resolveMunicipalityCode({ city: company.city, cep: company.cep });
    }
    return { ...current, company };
  });
  const searchCompanyCnpj = () => {
    const document = draft.company.document.replace(/\D/g, '');
    if (document.length !== 14) { setLookup({ kind: 'cnpj', message: 'Informe os 14 dígitos do CNPJ.', tone: 'error' }); return; }
    setSearching('cnpj');
    setLookup(null);
    window.setTimeout(() => {
      const found = demoCnpjDirectory[document] ?? clients.find((item) => item.document.replace(/\D/g, '') === document);
      setSearching(null);
      if (!found) { setLookup({ kind: 'cnpj', message: 'CNPJ não encontrado na base local. Você pode preencher os dados manualmente.', tone: 'error' }); return; }
      setDraft((current) => {
        const cityName = found.cityName ?? current.company.city.replace(/\/[A-Z]{2}$/, '');
        const state = found.state ?? current.company.city.match(/\/([A-Z]{2})$/)?.[1] ?? '';
        const cep = found.cep ?? current.company.cep;
        return { ...current, company: {
          ...current.company,
          document: formatCnpj(found.document ?? current.company.document),
          legalName: found.legalName ?? current.company.legalName,
          name: found.tradeName ?? found.name ?? current.company.name,
          stateRegistration: found.stateRegistration ?? current.company.stateRegistration,
          municipalRegistration: found.municipalRegistration ?? current.company.municipalRegistration,
          email: found.email ?? current.company.email,
          phone: found.phone ?? current.company.phone,
          cep: formatCep(cep),
          street: found.street ?? current.company.street,
          number: found.number ?? current.company.number,
          complement: found.complement ?? current.company.complement,
          district: found.district ?? current.company.district,
          city: cityName && state ? `${cityName}/${state}` : current.company.city,
          cityCode: found.cityCode ?? resolveMunicipalityCode({ city: cityName, uf: state, cep, currentCode: current.company.cityCode }),
        } };
      });
      setLookup({ kind: 'cnpj', message: 'Dados cadastrais preenchidos. Revise as informações antes de salvar.', tone: 'success' });
    }, 320);
  };
  const searchCompanyCep = () => {
    const cep = draft.company.cep.replace(/\D/g, '');
    if (cep.length !== 8) { setLookup({ kind: 'cep', message: 'Informe os 8 dígitos do CEP.', tone: 'error' }); return; }
    setSearching('cep');
    setLookup(null);
    window.setTimeout(() => {
      const found = demoCepDirectory[cep] ?? clients.find((item) => item.cep.replace(/\D/g, '') === cep);
      setSearching(null);
      if (!found) { setLookup({ kind: 'cep', message: 'CEP não encontrado na base local. Você pode preencher o endereço manualmente.', tone: 'error' }); return; }
      setDraft((current) => ({ ...current, company: { ...current.company, cep: formatCep(found.cep), street: found.street, district: found.district, city: found.city, cityCode: found.cityCode } }));
      setLookup({ kind: 'cep', message: 'Endereço preenchido. Revise e complete número e complemento.', tone: 'success' });
    }, 320);
  };
  const updateCommercial = (patch: Partial<ModuleSettings['commercial']>) => setDraft((current) => ({ ...current, commercial: { ...current.commercial, ...patch } }));
  const updatePayments = (patch: Partial<ModuleSettings['payments']>) => setDraft((current) => ({ ...current, payments: { ...current.payments, ...patch } }));
  const updateServices = (patch: Partial<ModuleSettings['services']>) => setDraft((current) => ({ ...current, services: { ...current.services, ...patch } }));
  const updateStock = (patch: Partial<ModuleSettings['stock']>) => setDraft((current) => ({ ...current, stock: { ...current.stock, ...patch } }));
  const updateFiscal = (patch: Partial<ModuleSettings['fiscal']>) => setDraft((current) => ({ ...current, fiscal: { ...current.fiscal, ...patch } }));
  const fiscalDocumentOptions: Array<{ type: FiscalDocumentType; title: string; description: string }> = [
    { type: 'nfe', title: 'NF-e', description: 'Venda de produtos e mercadorias.' },
    { type: 'nfce', title: 'NFC-e', description: 'Venda presencial ao consumidor.' },
    { type: 'nfse', title: 'NFS-e', description: 'Prestação de serviços.' },
  ];
  const toggleFiscalDocument = (documentType: FiscalDocumentType, enabled: boolean) => setDraft((current) => {
    if (!enabled && current.fiscal.documentScope.length === 1 && current.fiscal.documentScope.includes(documentType)) return current;
    const documentScope = enabled
      ? [...new Set([...current.fiscal.documentScope, documentType])]
      : current.fiscal.documentScope.filter((item) => item !== documentType);
    const defaultFiscalDocument = current.commercial.defaultFiscalDocument !== 'nenhum' && !documentScope.includes(current.commercial.defaultFiscalDocument)
      ? 'nenhum'
      : current.commercial.defaultFiscalDocument;
    return { ...current, commercial: { ...current.commercial, defaultFiscalDocument }, fiscal: { ...current.fiscal, documentScope } };
  });
  const save = () => {
    const normalized = normalizeModuleSettings(draft, defaultModuleSettings) as ModuleSettings;
    const validation = validateModuleSettings(normalized);
    if (!validation.ready) { setError(validation.errors[0]); return; }
    onSave(normalized);
  };
  return <Dialog open title={titles[section][0]} description={titles[section][1]} onClose={onClose}>
    <div className="dialog-body settings-dialog-body">
      {section === 'empresa' && <div className="settings-form-stack">
        <section className="settings-form-section"><div className="client-section-heading"><h3>Identificação da empresa</h3><p>O CNPJ inicia o cadastro e pode preencher os demais dados disponíveis.</p></div><div className="form-grid">
          <label className="field"><span>CNPJ *</span><div className="lookup-control"><input inputMode="numeric" value={draft.company.document} onChange={(event) => { updateCompany('document', formatCnpj(event.target.value)); setLookup(null); }} maxLength={18} placeholder="00.000.000/0000-00"/><button type="button" onClick={searchCompanyCnpj} disabled={searching === 'cnpj'} aria-label="Buscar dados da empresa pelo CNPJ">{searching === 'cnpj' ? 'Buscando…' : 'Buscar'}</button></div>{lookup?.kind === 'cnpj' && <small className={`lookup-message ${lookup.tone}`} role="status">{lookup.message}</small>}</label>
          <label className="field field-wide"><span>Razão social *</span><input value={draft.company.legalName} onChange={(event) => updateCompany('legalName', event.target.value)} maxLength={120}/></label>
          <label className="field"><span>Nome de exibição *</span><input value={draft.company.name} onChange={(event) => updateCompany('name', event.target.value)} maxLength={80}/></label>
          <label className="field"><span>Iniciais do perfil</span><input value={draft.company.logoInitials} onChange={(event) => updateCompany('logoInitials', event.target.value.toLocaleUpperCase('pt-BR').slice(0, 4))} maxLength={4}/></label>
          <label className="field"><span>Regime tributário *</span><select value={draft.company.taxRegime} onChange={(event) => updateCompany('taxRegime', event.target.value)}><option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option></select></label>
          <label className="field"><span>Inscrição estadual</span><input value={draft.company.stateRegistration} onChange={(event) => updateCompany('stateRegistration', event.target.value)} maxLength={30}/></label>
          <label className="field"><span>Inscrição municipal</span><input value={draft.company.municipalRegistration} onChange={(event) => updateCompany('municipalRegistration', event.target.value)} maxLength={30}/></label>
          <label className="field"><span>E-mail comercial</span><input type="email" value={draft.company.email} onChange={(event) => updateCompany('email', event.target.value)} maxLength={120}/></label>
          <label className="field"><span>Telefone</span><input value={draft.company.phone} onChange={(event) => updateCompany('phone', formatPhone(event.target.value))} maxLength={24}/></label>
        </div></section>
        <section className="settings-form-section"><div className="client-section-heading"><h3>Endereço fiscal</h3><p>Use o CEP quando o CNPJ não retornar o endereço ou quando precisar atualizá-lo.</p></div><div className="form-grid">
          <label className="field"><span>CEP *</span><div className="lookup-control"><input inputMode="numeric" value={draft.company.cep} onChange={(event) => { updateCompany('cep', formatCep(event.target.value)); setLookup(null); }} maxLength={9} placeholder="00000-000"/><button type="button" onClick={searchCompanyCep} disabled={searching === 'cep'} aria-label="Buscar endereço pelo CEP">{searching === 'cep' ? 'Buscando…' : 'Buscar'}</button></div>{lookup?.kind === 'cep' && <small className={`lookup-message ${lookup.tone}`} role="status">{lookup.message}</small>}</label>
          <label className="field"><span>Logradouro *</span><input value={draft.company.street} onChange={(event) => updateCompany('street', event.target.value)} maxLength={60}/></label>
          <label className="field"><span>Número *</span><input value={draft.company.number} onChange={(event) => updateCompany('number', event.target.value)} maxLength={60}/></label>
          <label className="field"><span>Complemento</span><input value={draft.company.complement} onChange={(event) => updateCompany('complement', event.target.value)} maxLength={60}/></label>
          <label className="field"><span>Bairro *</span><input value={draft.company.district} onChange={(event) => updateCompany('district', event.target.value)} maxLength={60}/></label>
          <label className="field"><span>Município/UF *</span><input value={draft.company.city} onChange={(event) => updateCompany('city', event.target.value)} maxLength={80} placeholder="São Paulo/SP"/><small className={`field-message${municipalityIsResolved(draft.company.cityCode) ? '' : ' error'}`} role="status">{municipalityIsResolved(draft.company.cityCode) ? 'Município fiscal identificado automaticamente.' : 'Use Buscar CEP ou revise município e UF para concluir a identificação fiscal.'}</small></label>
        </div></section>
      </div>}
      {section === 'comercial' && <div className="form-grid">
        <label className="field"><span>Vendedor padrão</span><select value={draft.commercial.defaultSeller} onChange={(event) => updateCommercial({ defaultSeller: event.target.value })}>{draft.commercial.sellers.map((seller) => <option key={seller}>{seller}</option>)}</select></label>
        <label className="field"><span>Validade do orçamento (dias)</span><input type="number" min="1" max="365" value={draft.commercial.quoteValidityDays} onChange={(event) => updateCommercial({ quoteValidityDays: Number(event.target.value) })}/></label>
        <label className="field"><span>Documento fiscal padrão</span><select value={draft.commercial.defaultFiscalDocument} onChange={(event) => updateCommercial({ defaultFiscalDocument: event.target.value as ModuleSettings['commercial']['defaultFiscalDocument'] })}><option value="nenhum">Não definido</option>{draft.fiscal.documentScope.includes('nfe') && <option value="nfe">NF-e</option>}{draft.fiscal.documentScope.includes('nfce') && <option value="nfce">NFC-e</option>}{draft.fiscal.documentScope.includes('nfse') && <option value="nfse">NFS-e</option>}</select></label>
        <label className="field"><span>Limite de desconto (%)</span><input type="number" min="0" max="100" value={draft.commercial.maxDiscountPercent} onChange={(event) => updateCommercial({ maxDiscountPercent: Number(event.target.value) })}/></label>
        <label className="check-field field-wide"><input type="checkbox" checked={draft.commercial.reserveStockDefault} onChange={(event) => updateCommercial({ reserveStockDefault: event.target.checked })}/><span><strong>Reservar estoque ao confirmar o pedido</strong><small>Este será o comportamento inicial; o usuário poderá alterar em cada pedido.</small></span></label>
      </div>}
      {section === 'pagamentos' && <div className="settings-form-stack"><fieldset className="settings-checkset"><legend>Formas disponíveis</legend>{(['pix', 'boleto', 'cartao', 'prazo'] as PaymentMethod[]).map((method) => <label key={method}><input type="checkbox" checked={draft.payments.enabledMethods.includes(method)} onChange={(event) => updatePayments({ enabledMethods: event.target.checked ? [...draft.payments.enabledMethods, method] : draft.payments.enabledMethods.filter((item) => item !== method) })}/><span>{paymentMethodLabel(method)}</span></label>)}</fieldset><div className="form-grid">
        <label className="field"><span>Forma padrão</span><select value={draft.payments.defaultMethod} onChange={(event) => updatePayments({ defaultMethod: event.target.value as PaymentMethod })}>{draft.payments.enabledMethods.map((method) => <option value={method} key={method}>{paymentMethodLabel(method)}</option>)}</select></label>
        <label className="field"><span>Parcelas padrão</span><select value={draft.payments.defaultInstallments} onChange={(event) => updatePayments({ defaultInstallments: Number(event.target.value) })}><option value={1}>1 parcela</option><option value={2}>2 parcelas</option><option value={3}>3 parcelas</option><option value={6}>6 parcelas</option></select></label>
        <label className="field"><span>Primeiro vencimento (dias)</span><input type="number" min="0" max="365" value={draft.payments.firstDueDays} onChange={(event) => updatePayments({ firstDueDays: Number(event.target.value) })}/></label>
      </div></div>}
      {section === 'equipe' && <div className="form-grid">
        <label className="field field-wide"><span>Vendedores (um por linha)</span><textarea rows={5} value={draft.commercial.sellers.join('\n')} onChange={(event) => updateCommercial({ sellers: splitTeam(event.target.value) })}/></label>
        <label className="field"><span>Vendedor padrão</span><select value={draft.commercial.defaultSeller} onChange={(event) => updateCommercial({ defaultSeller: event.target.value })}>{draft.commercial.sellers.map((seller) => <option key={seller}>{seller}</option>)}</select></label>
        <label className="field field-wide"><span>Responsáveis por serviços (um por linha)</span><textarea rows={5} value={draft.services.technicians.join('\n')} onChange={(event) => updateServices({ technicians: splitTeam(event.target.value) })}/></label>
        <label className="field"><span>Responsável padrão</span><select value={draft.services.defaultTechnician} onChange={(event) => updateServices({ defaultTechnician: event.target.value })}>{draft.services.technicians.map((technician) => <option key={technician}>{technician}</option>)}</select></label>
        <label className="field"><span>Duração padrão</span><select value={draft.services.defaultDurationMinutes} onChange={(event) => updateServices({ defaultDurationMinutes: Number(event.target.value) })}><option value={30}>30 minutos</option><option value={60}>1 hora</option><option value={90}>1h30</option><option value={120}>2 horas</option><option value={240}>4 horas</option><option value={480}>8 horas</option></select></label>
      </div>}
      {section === 'estoque' && <div className="settings-form-stack">
        <div className="stock-settings-note"><Icon name="stock" size={19}/><p><strong>Saldos permanecem consolidados nesta etapa.</strong><small>O local escolhido será gravado nas novas movimentações. O controle de saldo separado por depósito será a evolução futura.</small></p></div>
        <section className="settings-form-section"><div className="client-section-heading"><h3>Locais e rastreabilidade</h3><p>Cadastros disponíveis nas entradas, saídas, inventários e movimentos automáticos.</p></div><div className="form-grid">
          <label className="field field-wide"><span>Locais de estoque (um por linha)</span><textarea rows={5} value={draft.stock.locations.join('\n')} onChange={(event) => updateStock({ locations: splitTeam(event.target.value) })}/></label>
          <label className="field"><span>Local padrão</span><select value={draft.stock.defaultLocation} onChange={(event) => updateStock({ defaultLocation: event.target.value })}>{draft.stock.locations.map((location) => <option key={location}>{location}</option>)}</select></label>
          <label className="check-field"><input type="checkbox" checked={draft.stock.requireMovementReference} onChange={(event) => updateStock({ requireMovementReference: event.target.checked })}/><span><strong>Exigir documento ou referência</strong><small>Bloqueia movimentações manuais sem uma origem rastreável.</small></span></label>
          <label className="check-field"><input type="checkbox" checked={draft.stock.trackLot} onChange={(event) => updateStock({ trackLot: event.target.checked })}/><span><strong>Exibir controle de lote</strong><small>Disponibiliza o lote nas entradas e saídas manuais.</small></span></label>
          <label className="check-field"><input type="checkbox" checked={draft.stock.trackExpiry} onChange={(event) => updateStock({ trackExpiry: event.target.checked })}/><span><strong>Exibir validade</strong><small>Disponibiliza a data de validade junto ao lote.</small></span></label>
        </div></section>
        <section className="settings-form-section"><div className="client-section-heading"><h3>Políticas de saldo</h3><p>Regras aplicadas antes de confirmar saídas, inventários e pedidos.</p></div><div className="form-grid">
          <label className="check-field field-wide"><input type="checkbox" checked={draft.stock.protectReservations} onChange={(event) => updateStock({ protectReservations: event.target.checked })}/><span><strong>Proteger quantidades reservadas</strong><small>Impede saídas manuais e inventários que deixem saldo físico abaixo do reservado.</small></span></label>
          <label className="check-field field-wide"><input type="checkbox" checked={draft.stock.allowNegativeStock} onChange={(event) => updateStock({ allowNegativeStock: event.target.checked })}/><span><strong>Permitir saldo negativo</strong><small>Libera reserva e faturamento mesmo sem disponibilidade. O sistema continuará destacando a ruptura.</small></span></label>
        </div></section>
        <section className="settings-form-section"><div className="client-section-heading"><h3>Motivos padronizados</h3><p>As listas alimentam os formulários e preservam a descrição no histórico.</p></div><div className="form-grid">
          <label className="field field-wide"><span>Motivos de entrada (um por linha)</span><textarea rows={4} value={draft.stock.entryReasons.join('\n')} onChange={(event) => updateStock({ entryReasons: splitTeam(event.target.value) })}/></label>
          <label className="field"><span>Entrada padrão</span><select value={draft.stock.defaultEntryReason} onChange={(event) => updateStock({ defaultEntryReason: event.target.value })}>{draft.stock.entryReasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
          <label className="field field-wide"><span>Motivos de saída (um por linha)</span><textarea rows={4} value={draft.stock.exitReasons.join('\n')} onChange={(event) => updateStock({ exitReasons: splitTeam(event.target.value) })}/></label>
          <label className="field"><span>Saída padrão</span><select value={draft.stock.defaultExitReason} onChange={(event) => updateStock({ defaultExitReason: event.target.value })}>{draft.stock.exitReasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
          <label className="field field-wide"><span>Motivos de inventário (um por linha)</span><textarea rows={4} value={draft.stock.inventoryReasons.join('\n')} onChange={(event) => updateStock({ inventoryReasons: splitTeam(event.target.value) })}/></label>
          <label className="field"><span>Inventário padrão</span><select value={draft.stock.defaultInventoryReason} onChange={(event) => updateStock({ defaultInventoryReason: event.target.value })}>{draft.stock.inventoryReasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
        </div></section>
      </div>}
      {section === 'fiscal' && <div className="settings-form-stack">
        <div className="stock-settings-note"><Icon name="fiscal" size={19}/><p><strong>Informe somente o que a empresa utiliza.</strong><small>Conexões com governo, autorizadores e demais parâmetros técnicos são administrados internamente pelo sistema.</small></p></div>
        <section className="settings-form-section"><div className="client-section-heading"><h3>Notas utilizadas pela empresa</h3><p>As opções escolhidas aparecem nos pedidos, serviços, no menu Novo e na Central Fiscal.</p></div><div className="fiscal-document-picker">{fiscalDocumentOptions.map((option) => {
          const checked = draft.fiscal.documentScope.includes(option.type);
          const lastSelected = checked && draft.fiscal.documentScope.length === 1;
          return <label className="check-field" key={option.type}><input type="checkbox" checked={checked} disabled={lastSelected} onChange={(event) => toggleFiscalDocument(option.type, event.target.checked)}/><span><strong>{option.title}</strong><small>{option.description}{lastSelected ? ' Ao menos um tipo deve permanecer selecionado.' : ''}</small></span></label>;
        })}</div></section>
        <section className="settings-form-section"><div className="client-section-heading"><h3>Responsável fiscal</h3><p>Identifique quem confere as informações tributárias da empresa.</p></div><div className="form-grid"><label className="field field-wide"><span>Responsável ou escritório contábil</span><input value={draft.fiscal.fiscalResponsible} onChange={(event) => updateFiscal({ fiscalResponsible: event.target.value })} maxLength={100} placeholder="Nome do responsável ou escritório contábil"/></label></div></section>
        <section className="settings-form-section"><div className="client-section-heading"><h3>Séries cadastradas</h3><p>A série e o próximo número são administrados em Central Fiscal &gt; Séries e numeração, com proteção contra duplicidade.</p></div><div className="series-grid">
          {draft.fiscal.documentScope.includes('nfe') && <div><span>NF-e</span><strong>Série {draft.fiscal.nfeSeries || 'não definida'}</strong><small>Gerenciada na Central Fiscal</small></div>}
          {draft.fiscal.documentScope.includes('nfce') && <div><span>NFC-e</span><strong>Série {draft.fiscal.nfceSeries || 'não definida'}</strong><small>Gerenciada na Central Fiscal</small></div>}
          {draft.fiscal.documentScope.includes('nfse') && <div><span>NFS-e</span><strong>Série {draft.fiscal.nfseSeries || 'não definida'}</strong><small>Gerenciada na Central Fiscal</small></div>}
        </div></section>
        <section className="settings-form-section"><div className="client-section-heading"><h3>Conferência contábil</h3><p>Estas confirmações registram a revisão; não conectam o governo nem emitem notas.</p></div><div className="form-grid">
          <label className="check-field field-wide"><input type="checkbox" checked={draft.fiscal.taxReviewConfirmed} onChange={(event) => updateFiscal({ taxReviewConfirmed: event.target.checked })}/><span><strong>Cadastro fiscal conferido</strong><small>O responsável fiscal confirmou os dados da empresa e as regras utilizadas nas operações.</small></span></label>
          <label className="check-field field-wide"><input type="checkbox" checked={draft.fiscal.taxReformReviewConfirmed} onChange={(event) => updateFiscal({ taxReformReviewConfirmed: event.target.checked })}/><span><strong>Regras tributárias atuais conferidas</strong><small>O contador confirmou que as configurações acompanham as obrigações vigentes da empresa.</small></span></label>
        </div></section>
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="button" className="button primary" onClick={save}>Salvar configurações</button></footer>
  </Dialog>;
}

const fiscalDocumentLabels: Record<FiscalMatrixRule['documentType'], string> = { nfe: 'NF-e', nfce: 'NFC-e', nfse: 'NFS-e' };

function newFiscalMatrixRule(documentType: FiscalMatrixRule['documentType'], index: number): FiscalMatrixRule {
  const isService = documentType === 'nfse';
  return {
    id: `${documentType}-regra-${Date.now()}-${index}`,
    name: `Nova regra ${fiscalDocumentLabels[documentType]}`,
    documentType,
    priority: 100,
    operation: isService ? 'Prestação de serviço' : 'Venda',
    destination: isService ? 'Não aplicável' : 'Qualquer',
    recipientProfile: 'Qualquer',
    presence: isService ? 'Não aplicável' : 'Qualquer',
    issuePurpose: 'Normal',
    operationNature: isService ? 'Prestação de serviço a revisar' : 'Operação de saída a revisar',
    cfopOverride: '',
    serviceIncidenceMode: isService ? 'Herdar do serviço' : 'Não aplicável',
    requiresStateRegistration: false,
    requiresMunicipalIncidence: isService,
    active: true,
    reviewed: false,
  };
}

function FiscalMatrixDialog({ open, matrix, documentScope, taxReviewConfirmed, taxReformReviewConfirmed, readOnly, bridge, onClose, onSave }: { open: boolean; matrix: FiscalMatrix; documentScope: FiscalDocumentType[]; taxReviewConfirmed: boolean; taxReformReviewConfirmed: boolean; readOnly: boolean; bridge: FiscalRulesBridgeState; onClose: () => void; onSave: (input: FiscalMatrixSaveInput) => void }) {
  const [draft, setDraft] = useState(() => normalizeFiscalMatrix(matrix));
  const [taxReviewConfirmedDraft, setTaxReviewConfirmedDraft] = useState(taxReviewConfirmed);
  const [taxReformReviewConfirmedDraft, setTaxReformReviewConfirmedDraft] = useState(taxReformReviewConfirmed);
  const [selectedId, setSelectedId] = useState(matrix.rules.find((rule) => documentScope.includes(rule.documentType))?.id ?? '');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const normalized = normalizeFiscalMatrix(matrix);
    setDraft(normalized);
    setSelectedId(normalized.rules.find((rule) => documentScope.includes(rule.documentType))?.id ?? '');
    setTaxReviewConfirmedDraft(taxReviewConfirmed);
    setTaxReformReviewConfirmedDraft(taxReformReviewConfirmed);
    setEditing(false);
    setError('');
  }, [documentScope, matrix, open, taxReformReviewConfirmed, taxReviewConfirmed]);
  if (!open) return null;
  const visibleRules = draft.rules.filter((rule) => documentScope.includes(rule.documentType));
  const selected = visibleRules.find((rule) => rule.id === selectedId) ?? visibleRules[0];
  const validation = validateFiscalMatrix(draft, documentScope);
  const activeRules = visibleRules.filter((rule) => rule.active);
  const reviewedRules = activeRules.filter((rule) => rule.reviewed);
  const coveredDocuments = new Set(activeRules.map((rule) => rule.documentType)).size;
  const updateRule = (patch: Partial<FiscalMatrixRule>) => {
    if (!selected) return;
    setDraft((current) => ({ ...current, rules: current.rules.map((rule) => rule.id === selected.id ? { ...rule, ...patch } : rule) }));
  };
  const addRule = () => {
    if (readOnly) return;
    const rule = newFiscalMatrixRule(selected?.documentType ?? documentScope[0] ?? 'nfe', draft.rules.length + 1);
    setDraft((current) => ({ ...current, rules: [...current.rules, rule] }));
    setSelectedId(rule.id);
  };
  const duplicateRule = () => {
    if (readOnly || !selected) return;
    const clone = { ...selected, id: `${selected.documentType}-regra-${Date.now()}`, name: `${selected.name} · cópia`, priority: Math.min(999, selected.priority + 1), reviewed: false };
    setDraft((current) => ({ ...current, rules: [...current.rules, clone] }));
    setSelectedId(clone.id);
  };
  const removeRule = () => {
    if (readOnly || !selected || draft.rules.filter((rule) => rule.documentType === selected.documentType).length <= 1) return;
    const remaining = draft.rules.filter((rule) => rule.id !== selected.id);
    setDraft((current) => ({ ...current, rules: remaining }));
    setSelectedId(remaining.find((rule) => documentScope.includes(rule.documentType))?.id ?? '');
  };
  const changeDocument = (documentType: FiscalMatrixRule['documentType']) => {
    if (!selected) return;
    updateRule({ documentType, destination: documentType === 'nfse' ? 'Não aplicável' : 'Qualquer', presence: documentType === 'nfse' ? 'Não aplicável' : 'Qualquer', operation: documentType === 'nfse' ? 'Prestação de serviço' : 'Venda', serviceIncidenceMode: documentType === 'nfse' ? 'Herdar do serviço' : 'Não aplicável', requiresMunicipalIncidence: documentType === 'nfse', cfopOverride: documentType === 'nfse' ? '' : selected.cfopOverride, reviewed: false });
  };
  const save = () => {
    if (readOnly) return;
    const result = validateFiscalMatrix(draft, documentScope);
    if (!result.ready) { setError(result.errors[0]); return; }
    if (!taxReviewConfirmedDraft) { setError('Confirme a revisão do cadastro fiscal da empresa.'); return; }
    if (!taxReformReviewConfirmedDraft) { setError('Confirme que as regras tributárias atuais foram conferidas.'); return; }
    onSave({ matrix: result.matrix, taxReviewConfirmed: taxReviewConfirmedDraft, taxReformReviewConfirmed: taxReformReviewConfirmedDraft });
  };
  return <Dialog open title={editing ? 'Revisar regras fiscais' : 'Regras fiscais'} description={editing ? 'Ajuste os critérios com o contador ou responsável fiscal da empresa.' : 'Acompanhe a revisão das regras usadas nos tipos de nota ativados para a empresa.'} onClose={onClose}>
    <div className="dialog-body access-settings-body fiscal-matrix-body">
      {bridge.integrated && <div className="access-safety-note" role="status" aria-live="polite"><Icon name={bridge.loading ? 'clock' : bridge.available && bridge.configuration ? 'check' : 'warning'} size={19}/><p><strong>{bridge.loading ? 'Consultando publicação fiscal' : bridge.configuration ? `Versão ${bridge.configuration.version} publicada` : bridge.available ? 'Regras ainda não publicadas' : 'Publicação protegida indisponível'}</strong><small>{bridge.message || (bridge.configuration ? 'Esta é a versão utilizada pelo servidor para preparar novas NF-e.' : 'A emissão permanece bloqueada até existir uma versão revisada e publicada.')}</small></p></div>}
      <div className="access-safety-note"><Icon name="warning" size={19}/><p><strong>Revisão do responsável fiscal</strong><small>O sistema considera somente os tipos de nota ativados. Antes da emissão real, as regras devem ser conferidas pelo contador ou responsável fiscal da empresa.</small></p></div>
      <div className="access-metrics fiscal-matrix-metrics" aria-label="Resumo das regras fiscais"><div><span>Tipos de nota</span><strong>{documentScope.length}</strong><small>{coveredDocuments} com regra ativa</small></div><div><span>Regras ativas</span><strong>{activeRules.length}</strong><small>nos tipos utilizados</small></div><div><span>Revisadas</span><strong>{reviewedRules.length}</strong><small>de {activeRules.length} regras ativas</small></div><div><span>Última revisão</span><strong>{draft.reviewedAt ? new Date(draft.reviewedAt + 'T12:00:00').toLocaleDateString('pt-BR') : 'Pendente'}</strong><small>{draft.reviewedBy || 'Responsável não informado'}</small></div></div>
      {readOnly && <p className="access-readonly-note"><Icon name="warning" size={16}/> Consulta liberada. A permissão Configurar matriz fiscal é necessária para alterar regras.</p>}
      {!editing ? <>
        <section className="fiscal-matrix-overview" aria-label="Situação por tipo de nota">{documentScope.map((documentType) => {
          const documentRules = visibleRules.filter((rule) => rule.documentType === documentType && rule.active);
          const documentReviewed = documentRules.filter((rule) => rule.reviewed).length;
          const ready = documentRules.length > 0 && documentReviewed === documentRules.length;
          return <article key={documentType}><div className="fiscal-matrix-overview-head"><span className="fiscal-matrix-document-icon"><Icon name="document" size={20}/></span><Badge tone={ready ? 'success' : 'warning'}>{ready ? 'Revisado' : 'Revisão pendente'}</Badge></div><div><h3>{fiscalDocumentLabels[documentType]}</h3><p>{documentType === 'nfe' ? 'Vendas de produtos e outras operações comerciais.' : documentType === 'nfce' ? 'Vendas presenciais ao consumidor final.' : 'Prestação de serviços e incidência municipal.'}</p></div><dl><div><dt>Regras ativas</dt><dd>{documentRules.length}</dd></div><div><dt>Revisadas</dt><dd>{documentReviewed}</dd></div></dl><button type="button" className="button secondary" onClick={() => { const firstRule = visibleRules.find((rule) => rule.documentType === documentType); if (firstRule) setSelectedId(firstRule.id); setEditing(true); }}>{readOnly ? 'Consultar regras' : 'Revisar regras'}</button></article>;
        })}</section>
        <section className="fiscal-matrix-review-summary"><div><span className="fiscal-matrix-document-icon"><Icon name="users" size={20}/></span><p><strong>Conferência registrada</strong><small>{draft.reviewedBy && draft.reviewedAt ? draft.reviewedBy + ' · ' + new Date(draft.reviewedAt + 'T12:00:00').toLocaleDateString('pt-BR') : 'Ainda não há responsável e data de revisão registrados.'}</small></p></div><Badge tone={validation.ready && reviewedRules.length === activeRules.length ? 'success' : 'warning'}>{validation.ready && reviewedRules.length === activeRules.length ? 'Concluída' : 'Pendente'}</Badge></section>
      </> : <>
      <section className="settings-form-section fiscal-matrix-review"><div className="client-section-heading"><h3>Responsável pela revisão</h3><p>Identifica quem aprovou as regras marcadas como revisadas.</p></div><div className="form-grid"><label className="field"><span>Revisado por</span><input value={draft.reviewedBy} disabled={readOnly} onChange={(event) => setDraft((current) => ({ ...current, reviewedBy: event.target.value }))} maxLength={100} placeholder="Responsável fiscal ou escritório"/></label><label className="field"><span>Data da revisão</span><input type="date" value={draft.reviewedAt} disabled={readOnly} onChange={(event) => setDraft((current) => ({ ...current, reviewedAt: event.target.value }))}/></label><label className="check-field field-wide"><input type="checkbox" checked={taxReviewConfirmedDraft} disabled={readOnly} onChange={(event) => { setTaxReviewConfirmedDraft(event.target.checked); setError(''); }}/><span><strong>Cadastro fiscal conferido</strong><small>O responsável confirmou os dados da empresa e as regras usadas nas operações.</small></span></label><label className="check-field field-wide"><input type="checkbox" checked={taxReformReviewConfirmedDraft} disabled={readOnly} onChange={(event) => { setTaxReformReviewConfirmedDraft(event.target.checked); setError(''); }}/><span><strong>Regras tributárias atuais conferidas</strong><small>O contador confirmou que a configuração acompanha as obrigações vigentes da empresa.</small></span></label></div></section>
      {selected && <div className="access-workspace fiscal-matrix-workspace">
        <aside className="fiscal-matrix-sidebar"><button type="button" className="button secondary" onClick={addRule} disabled={readOnly}><Icon name="plus" size={16}/> Adicionar regra</button><div className="access-option-list" aria-label="Regras fiscais">{visibleRules.map((rule) => <button type="button" key={rule.id} className={rule.id === selected.id ? 'active' : ''} onClick={() => setSelectedId(rule.id)}><span><strong>{rule.name}</strong><small>{fiscalDocumentLabels[rule.documentType]} · prioridade {rule.priority}</small></span><Badge tone={!rule.active ? 'neutral' : rule.reviewed ? 'success' : 'warning'}>{!rule.active ? 'Inativa' : rule.reviewed ? 'Revisada' : 'Pendente'}</Badge></button>)}</div></aside>
        <section className="access-editor"><div className="access-editor-heading"><div><span>Regra selecionada</span><h3>{selected.name}</h3><p>{fiscalDocumentLabels[selected.documentType]} · prioridade {selected.priority} · {selected.active ? 'ativa' : 'inativa'}</p></div><div className="fiscal-matrix-actions"><button type="button" className="button secondary" onClick={duplicateRule} disabled={readOnly}><Icon name="copy" size={15}/> Duplicar</button><button type="button" className="button danger" onClick={removeRule} disabled={readOnly || draft.rules.filter((rule) => rule.documentType === selected.documentType).length <= 1}><Icon name="close" size={15}/> Excluir</button></div></div>
          <section className="settings-form-section"><div className="client-section-heading"><h3>Identificação e controle</h3><p>Prioridades menores vencem quando duas regras possuem a mesma especificidade.</p></div><div className="form-grid"><label className="field field-wide"><span>Nome da regra *</span><input value={selected.name} disabled={readOnly} onChange={(event) => updateRule({ name: event.target.value, reviewed: false })} maxLength={100}/></label><label className="field"><span>Documento *</span><select value={selected.documentType} disabled={readOnly} onChange={(event) => changeDocument(event.target.value as FiscalMatrixRule['documentType'])}>{documentScope.map((documentType) => <option value={documentType} key={documentType}>{fiscalDocumentLabels[documentType]}</option>)}</select></label><label className="field"><span>Prioridade *</span><input type="number" min="1" max="999" value={selected.priority} disabled={readOnly} onChange={(event) => updateRule({ priority: Math.max(1, Math.min(999, Number(event.target.value) || 1)), reviewed: false })}/></label><label className="check-field"><input type="checkbox" checked={selected.active} disabled={readOnly} onChange={(event) => updateRule({ active: event.target.checked })}/><span><strong>Regra ativa</strong><small>Regras inativas permanecem no histórico, mas não participam do enquadramento.</small></span></label><label className="check-field"><input type="checkbox" checked={selected.reviewed} disabled={readOnly} onChange={(event) => updateRule({ reviewed: event.target.checked })}/><span><strong>Regra revisada</strong><small>Exige responsável e data da revisão antes de salvar.</small></span></label></div></section>
          <section className="settings-form-section"><div className="client-section-heading"><h3>Condições de correspondência</h3><p>Use “Qualquer” como fallback. A regra mais específica é escolhida antes da prioridade.</p></div><div className="form-grid"><label className="field"><span>Operação</span><select value={selected.operation} disabled={readOnly} onChange={(event) => updateRule({ operation: event.target.value, reviewed: false })}><option>Qualquer</option><option>Venda</option><option>Prestação de serviço</option><option>Devolução</option><option>Remessa</option><option>Retorno</option></select></label><label className="field"><span>Destino</span><select value={selected.destination} disabled={readOnly || selected.documentType === 'nfse'} onChange={(event) => updateRule({ destination: event.target.value, reviewed: false })}><option>Qualquer</option><option>Dentro da UF</option><option>Fora da UF</option><option>Exterior</option><option>Não aplicável</option></select></label><label className="field"><span>Perfil do destinatário</span><select value={selected.recipientProfile} disabled={readOnly} onChange={(event) => updateRule({ recipientProfile: event.target.value, reviewed: false })}><option>Qualquer</option><option>Contribuinte ICMS</option><option>Consumidor final</option><option>Não contribuinte</option><option>Não aplicável</option></select></label><label className="field"><span>Presença</span><select value={selected.presence} disabled={readOnly || selected.documentType === 'nfse'} onChange={(event) => updateRule({ presence: event.target.value, reviewed: false })}><option>Qualquer</option><option>Presencial</option><option>Internet</option><option>Não presencial</option><option>Não aplicável</option></select></label><label className="field"><span>Finalidade fiscal</span><select value={selected.issuePurpose} disabled={readOnly} onChange={(event) => updateRule({ issuePurpose: event.target.value, reviewed: false })}><option>Normal</option><option>Devolução</option><option>Ajuste</option></select></label></div></section>
          <section className="settings-form-section"><div className="client-section-heading"><h3>Resultado cadastral</h3><p>O cálculo definitivo continuará dependente da operação, do destinatário e do autorizador.</p></div><div className="form-grid"><label className="field field-wide"><span>Natureza da operação *</span><input value={selected.operationNature} disabled={readOnly} onChange={(event) => updateRule({ operationNature: event.target.value, reviewed: false })} maxLength={120} placeholder="Descrição que identifica a natureza da operação"/></label>{selected.documentType !== 'nfse' && <label className="field"><span>CFOP específico</span><input inputMode="numeric" value={selected.cfopOverride} disabled={readOnly} onChange={(event) => updateRule({ cfopOverride: event.target.value.replace(/\D/g, '').slice(0, 4), reviewed: false })} placeholder="Herdar do produto" maxLength={4}/><small className="field-message">Vazio mantém o CFOP definido no perfil do item.</small></label>}{selected.documentType === 'nfse' && <label className="field"><span>Incidência do ISS</span><select value={selected.serviceIncidenceMode} disabled={readOnly} onChange={(event) => updateRule({ serviceIncidenceMode: event.target.value, reviewed: false })}><option>Herdar do serviço</option><option>Município do prestador</option><option>Município do tomador</option><option>Local da execução</option><option>Definir por operação</option></select></label>}<label className="check-field"><input type="checkbox" checked={selected.requiresStateRegistration} disabled={readOnly || selected.documentType === 'nfse'} onChange={(event) => updateRule({ requiresStateRegistration: event.target.checked, reviewed: false })}/><span><strong>Exigir inscrição estadual</strong><small>Adiciona a conferência do destinatário para esta regra.</small></span></label><label className="check-field"><input type="checkbox" checked={selected.requiresMunicipalIncidence} disabled={readOnly || selected.documentType !== 'nfse'} onChange={(event) => updateRule({ requiresMunicipalIncidence: event.target.checked, reviewed: false })}/><span><strong>Exigir município de incidência</strong><small>Usado na preparação da DPS/NFS-e.</small></span></label></div></section>
        </section>
      </div>}
      <div className={`fiscal-matrix-validation ${validation.errors.length ? 'invalid' : ''}`} role="status"><div><Icon name={validation.errors.length ? 'warning' : validation.warnings.length ? 'clock' : 'check'} size={18}/><p><strong>{validation.errors.length ? `${validation.errors.length} bloqueios nas regras` : validation.warnings.length ? 'Estrutura válida, revisão pendente' : 'Regras estruturadas e revisadas'}</strong><small>{validation.errors[0] || validation.warnings[0] || 'Todos os tipos de nota ativados possuem cobertura.'}</small></p></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      </>}
    </div>
    <footer className="dialog-footer">{editing ? <><button type="button" className="button secondary" onClick={() => { setEditing(false); setError(''); }} disabled={bridge.loading}>Voltar ao resumo</button><button type="button" className="button primary" onClick={save} disabled={readOnly || bridge.loading}>{bridge.loading ? 'Publicando…' : bridge.integrated ? 'Publicar regras fiscais' : 'Salvar regras fiscais'}</button></> : <><button type="button" className="button secondary" onClick={onClose}>Fechar</button>{!readOnly && <button type="button" className="button primary" onClick={() => setEditing(true)}>Revisar regras fiscais</button>}</>}</footer>
  </Dialog>;
}

type AccessTab = 'perfis' | 'usuarios' | 'auditoria' | 'integracao';

function AccessSettingsDialog({ open, settings, readOnly, bridge, onClose, onSave }: { open: boolean; settings: ModuleSettings; readOnly: boolean; bridge: AccessBridgeState; onClose: () => void; onSave: (settings: ModuleSettings) => void }) {
  const [draft, setDraft] = useState(settings);
  const [tab, setTab] = useState<AccessTab>('perfis');
  const [roleId, setRoleId] = useState<AccessRoleId>('operador_simples');
  const [userId, setUserId] = useState(settings.access.users[0]?.id ?? '');
  const [error, setError] = useState('');
  useEffect(() => {
    setDraft(settings);
    setUserId(settings.access.users[0]?.id ?? '');
    setError('');
  }, [open, settings]);
  if (!open) return null;
  const activeRole = draft.access.roles.find((role) => role.id === roleId) ?? draft.access.roles[0];
  const activeUser = draft.access.users.find((user) => user.id === userId) ?? draft.access.users[0];
  const userRole = draft.access.roles.find((role) => role.id === activeUser?.roleId) ?? draft.access.roles[0];
  const effectivePermissions = resolveEffectivePermissions({ rolePermissions: userRole?.permissions ?? [], overrides: activeUser?.overrides ?? {}, permissionIds: allPermissionIds });
  const effectiveCount = Object.values(effectivePermissions).filter(Boolean).length;
  const operatorCount = draft.access.users.filter((user) => user.roleId.startsWith('operador_')).length;
  const overrideCount = draft.access.users.reduce((total, user) => total + Object.keys(user.overrides).length, 0);
  const isProtectedRole = activeRole?.id === 'gestor' || activeRole?.id === 'administrador';
  const updateRolePermission = (permission: string, allowed: boolean) => {
    if (readOnly) return;
    if (isProtectedRole && protectedAccessPermissions.includes(permission) && !allowed) return;
    setDraft((current) => ({ ...current, access: { ...current.access, roles: current.access.roles.map((role) => role.id !== activeRole.id ? role : { ...role, permissions: allowed ? [...new Set([...role.permissions, permission])] : role.permissions.filter((item) => item !== permission) }) } }));
  };
  const resetRole = () => {
    if (readOnly) return;
    const baseline = defaultAccessRoles.find((role) => role.id === activeRole.id);
    if (!baseline) return;
    setDraft((current) => ({ ...current, access: { ...current.access, roles: current.access.roles.map((role) => role.id === baseline.id ? { ...role, permissions: [...baseline.permissions] } : role) } }));
  };
  const updateUser = (patch: Partial<AccessUser>) => { if (!readOnly) setDraft((current) => ({ ...current, access: { ...current.access, users: current.access.users.map((user) => user.id === activeUser.id ? { ...user, ...patch } : user) } })); };
  const updateOverride = (permission: string, value: '' | AccessOverride) => {
    if (readOnly) return;
    if ((activeUser.roleId === 'gestor' || activeUser.roleId === 'administrador') && protectedAccessPermissions.includes(permission)) return;
    const overrides = { ...activeUser.overrides };
    if (value) overrides[permission] = value;
    else delete overrides[permission];
    updateUser({ overrides });
  };
  const save = () => {
    if (readOnly) return;
    const audit: AccessAuditEntry = { id: `audit-${Date.now()}`, at: new Date().toISOString(), actor: 'Administrador local', summary: `Matriz de permissões atualizada: ${draft.access.users.length} usuários e ${overrideCount} exceções individuais.` };
    const withAudit = { ...draft, access: { ...draft.access, auditTrail: [audit, ...draft.access.auditTrail].slice(0, 50) } };
    const normalized = normalizeModuleSettings(withAudit, defaultModuleSettings) as ModuleSettings;
    const validation = validateModuleSettings(normalized);
    if (!validation.ready) { setError(validation.errors[0]); return; }
    onSave(normalized);
  };
  return <Dialog open title="Permissões e auditoria" description="Controle o padrão de cada perfil e as exceções individuais aplicadas em todo o sistema." onClose={onClose}>
    <div className="dialog-body access-settings-body">
      <div className="access-safety-note"><Icon name={bridge.integrated && bridge.available ? 'check' : 'warning'} size={19}/><p><strong>{bridge.integrated ? bridge.available ? 'Controle protegido pela Gestão' : 'Integração protegida indisponível' : 'Modo demonstrativo local'}</strong><small>{bridge.integrated ? bridge.message || (bridge.writable ? 'As alterações passam pela sessão, API e auditoria do sistema de Gestão.' : 'A matriz foi consultada no servidor. A gravação permanece bloqueada neste laboratório.') : 'As alterações ficam somente neste navegador e não representam permissões de produção.'}</small></p></div>
      <div className="access-metrics" aria-label="Resumo dos acessos"><div><span>Perfis</span><strong>4</strong><small>Padrões editáveis</small></div><div><span>Usuários</span><strong>{draft.access.users.length}</strong><small>{operatorCount} operadores</small></div><div><span>Exceções</span><strong>{overrideCount}</strong><small>Liberações e bloqueios</small></div></div>
      {readOnly && <p className="access-readonly-note"><Icon name="warning" size={16}/> {bridge.integrated && !bridge.writable ? bridge.message || 'Consulta liberada; a gravação ainda não foi habilitada neste laboratório.' : 'Consulta liberada. Somente Gestor ou Administrador pode alterar perfis e exceções.'}</p>}
      <div className="access-tabs" role="tablist" aria-label="Configuração de acessos">
        {([['perfis', 'Perfis padrão'], ['usuarios', 'Usuários e exceções'], ['auditoria', 'Auditoria'], ['integracao', 'Integração segura']] as Array<[AccessTab, string]>).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === 'perfis' && <div className="access-workspace">
        <aside className="access-option-list" aria-label="Perfis de acesso">{draft.access.roles.map((role) => <button type="button" key={role.id} className={role.id === activeRole.id ? 'active' : ''} onClick={() => setRoleId(role.id)}><span><strong>{role.name}</strong><small>{role.permissions.length} de {allPermissionIds.length} permissões</small></span><Icon name="chevron" size={16}/></button>)}</aside>
        <section className="access-editor"><div className="access-editor-heading"><div><span>Perfil selecionado</span><h3>{activeRole.name}</h3><p>{activeRole.description}</p></div><button type="button" className="button secondary" onClick={resetRole} disabled={readOnly}>Restaurar padrão</button></div>
          {isProtectedRole && <p className="access-protected-note"><Icon name="check" size={16}/> O gerenciamento de acessos e a auditoria permanecem obrigatórios neste perfil para evitar bloqueio administrativo.</p>}
          <div className="permission-groups">{permissionGroups.map((group) => { const allowed = group.permissions.filter(([permission]) => activeRole.permissions.includes(permission)).length; return <details key={group.id}><summary><span><strong>{group.label}</strong><small>{group.description}</small></span><Badge>{allowed}/{group.permissions.length}</Badge><Icon name="chevron" size={16}/></summary><div>{group.permissions.map(([permission, label]) => { const locked = isProtectedRole && protectedAccessPermissions.includes(permission); return <label className="permission-row" key={permission}><span><strong>{label}</strong><small>{activeRole.permissions.includes(permission) ? 'Permitido pelo perfil' : 'Bloqueado pelo perfil'}</small></span>{locked && <Badge tone="info">Obrigatório</Badge>}<input type="checkbox" checked={activeRole.permissions.includes(permission)} disabled={locked || readOnly} onChange={(event) => updateRolePermission(permission, event.target.checked)}/></label>; })}</div></details>; })}</div>
        </section>
      </div>}
      {tab === 'usuarios' && activeUser && <div className="access-workspace">
        <aside className="access-option-list" aria-label="Usuários cadastrados">{draft.access.users.map((user) => <button type="button" key={user.id} className={user.id === activeUser.id ? 'active' : ''} onClick={() => setUserId(user.id)}><span><strong>{user.name}</strong><small>{draft.access.roles.find((role) => role.id === user.roleId)?.name} · {user.sector}</small></span><Badge tone={user.active ? 'success' : 'neutral'}>{user.active ? 'Ativo' : 'Bloqueado'}</Badge></button>)}</aside>
        <section className="access-editor"><div className="access-editor-heading"><div><span>Usuário selecionado</span><h3>{activeUser.name}</h3><p>{activeUser.email}</p></div><Badge tone="info">{effectiveCount} acessos efetivos</Badge></div>
          <div className="access-user-form"><label className="field"><span>Perfil-base</span><select value={activeUser.roleId} disabled={readOnly} onChange={(event) => updateUser({ roleId: event.target.value as AccessRoleId, overrides: {} })}>{draft.access.roles.map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></label><label className="field"><span>Setor principal</span><input value={activeUser.sector} disabled={readOnly} onChange={(event) => updateUser({ sector: event.target.value })} maxLength={60}/></label><label className="check-field"><input type="checkbox" checked={activeUser.active} disabled={readOnly} onChange={(event) => updateUser({ active: event.target.checked })}/><span><strong>Acesso ativo</strong><small>Ao bloquear, o usuário deixa de entrar no sistema.</small></span></label></div>
          <div className="access-legend"><span><i className="inherited"/> Herdar perfil</span><span><i className="allowed"/> Liberação individual</span><span><i className="blocked"/> Bloqueio individual</span></div>
          <div className="permission-groups user-overrides">{permissionGroups.map((group) => { const allowed = group.permissions.filter(([permission]) => effectivePermissions[permission]).length; return <details key={group.id}><summary><span><strong>{group.label}</strong><small>{allowed} acessos efetivos · {group.description}</small></span><Badge>{group.permissions.filter(([permission]) => activeUser.overrides[permission]).length} exceções</Badge><Icon name="chevron" size={16}/></summary><div>{group.permissions.map(([permission, label]) => { const inherited = userRole.permissions.includes(permission); const protectedPermission = (activeUser.roleId === 'gestor' || activeUser.roleId === 'administrador') && protectedAccessPermissions.includes(permission); return <label className="permission-row" key={permission}><span><strong>{label}</strong><small>{effectivePermissions[permission] ? 'Acesso efetivo permitido' : 'Acesso efetivo bloqueado'} · padrão {inherited ? 'permitido' : 'bloqueado'}</small></span><select aria-label={`${group.label} — ${label} para ${activeUser.name}`} value={activeUser.overrides[permission] ?? ''} disabled={protectedPermission || readOnly} onChange={(event) => updateOverride(permission, event.target.value as '' | AccessOverride)}><option value="">Herdar: {inherited ? 'permitido' : 'bloqueado'}</option><option value="permitir">Liberar para este usuário</option><option value="bloquear">Bloquear para este usuário</option></select></label>; })}</div></details>; })}</div>
          {Object.keys(activeUser.overrides).length > 0 && <button type="button" className="button secondary access-reset-overrides" onClick={() => updateUser({ overrides: {} })} disabled={readOnly}>Remover todas as exceções deste usuário</button>}
        </section>
      </div>}
      {tab === 'auditoria' && <div className="access-audit"><div className="access-editor-heading"><div><span>Histórico protegido</span><h3>Alterações de acesso</h3><p>Registro local demonstrativo. A versão real deverá guardar autor, data, origem e valores anteriores no servidor.</p></div><Badge>{draft.access.auditTrail.length} eventos</Badge></div>{draft.access.auditTrail.length ? <div>{draft.access.auditTrail.map((entry) => <article key={entry.id}><span><Icon name="document" size={17}/></span><p><strong>{entry.summary}</strong><small>{entry.actor} · {displayDateTime(entry.at)}</small></p></article>)}</div> : <EmptyState title="Nenhuma alteração registrada" description="As mudanças salvas na matriz aparecerão aqui."/>}</div>}
      {tab === 'integracao' && <div className="access-integration">
        <div className="access-editor-heading"><div><span>Fronteira de segurança</span><h3>Integração com o sistema de Gestão</h3><p>{bridge.integrated ? 'A sessão e o perfil ativo permanecem na Gestão; o módulo recebe apenas a matriz necessária para exibir os acessos.' : 'Abra pelo laboratório integrado da Gestão para validar sessão, perfil e persistência protegida.'}</p></div><Badge tone={bridge.available ? 'success' : 'warning'}>{bridge.available ? bridge.writable ? 'Conectada' : 'Consulta conectada' : 'Integração pendente'}</Badge></div>
        <div className="access-integration-grid" aria-label="Situação da integração de acessos">
          {[
            ['Matriz de permissões', 'Pronta no protótipo', 'Perfis, exceções individuais e ações protegidas usam uma decisão central.'],
            ['Login do AvantaLab', bridge.integrated ? 'Conectado' : 'Aguardando integração', bridge.integrated ? 'A sessão é confirmada no sistema de Gestão e o token não entra no módulo comercial.' : 'A sessão será confirmada pelo sistema de Gestão.'],
            ['Empresa e módulo ativos', bridge.available ? 'Confirmados' : 'Contrato definido', `A Gestão confirma o perfil ativo e a instalação do módulo ${SALES_MODULE_ID}.`],
            ['Proteção no servidor e banco', bridge.writable ? 'Conectada' : 'Aguardando integração', bridge.writable ? 'Leituras e alterações repetem a autorização na API e no banco.' : 'A leitura protegida está preparada; a escrita permanece desligada neste laboratório.'],
            ['Auditoria imutável', bridge.writable ? 'Conectada' : 'Aguardando integração', 'Autor, perfil, decisão anterior, decisão nova e data ficam no servidor.'],
            ['Segredos e credenciais', 'Protegidos', 'Tokens, senhas, certificados e chaves nunca serão enviados para este cliente.'],
          ].map(([title, status, description]) => { const ready = status !== 'Aguardando integração'; return <article key={title}><span className={ready ? 'ready' : 'pending'}><Icon name={ready ? 'check' : 'clock'} size={18}/></span><div><strong>{title}</strong><small>{description}</small></div><Badge tone={ready ? 'success' : 'warning'}>{status}</Badge></article>; })}
        </div>
        <section className="access-integration-flow"><h4>Ordem obrigatória em cada operação real</h4><ol><li>Confirmar a sessão e o usuário.</li><li>Confirmar o vínculo ativo com a empresa.</li><li>Confirmar empresa e módulo ativos.</li><li>Calcular perfil-base e exceções individuais.</li><li>Autorizar a ação no servidor e no banco.</li><li>Registrar a alteração na auditoria.</li></ol></section>
        <section className="access-profile-mapping"><h4>Correspondência com os perfis do sistema de Gestão</h4><div>{draft.access.roles.map((role) => <p key={role.id}><span>{role.name}</span><Icon name="arrow" size={14}/><strong>{coreProfileByModuleRole[role.id]}</strong></p>)}</div></section>
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <footer className="dialog-footer"><button type="button" className="button secondary" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</button><button type="button" className="button primary" onClick={save} disabled={readOnly}>Salvar controle de acesso</button></footer>
  </Dialog>;
}

function certificateBlockerDescription(blockers: readonly string[]) {
  const descriptions = blockers.map((code) => {
    if (code.includes('OWNER')) return 'o CNPJ do titular não corresponde à empresa ativa';
    if (code.includes('VALIDITY')) return 'o certificado está fora do período de validade';
    if (code.includes('KEY')) return 'a chave privada não atende aos requisitos de assinatura';
    if (code.includes('CHAIN')) return 'a cadeia de confiança da ICP-Brasil não pôde ser confirmada';
    if (code.includes('REVOCATION')) return 'a situação de revogação não pôde ser confirmada';
    if (code.includes('SIGN')) return 'a assinatura digital de prova não pôde ser concluída';
    if (code.includes('MTLS')) return 'a autenticação segura com o serviço fiscal não pôde ser preparada';
    if (code.includes('LOOKUP') || code.includes('REFERENCE') || code.includes('STORAGE')) return 'o armazenamento protegido não pôde ser acessado';
    return 'uma verificação técnica do certificado não foi concluída';
  });
  return [...new Set(descriptions)];
}

function CertificateDigitalDialog({ open, company, bridge, onClose, onRequestCompanyRegistration, onInstall, onActivate }: { open: boolean; company: CompanyProfile; bridge: FiscalCertificateBridgeState; onClose: () => void; onRequestCompanyRegistration: () => void; onInstall: (certificate: File, passphrase: string) => Promise<{ ok: boolean; message: string; certificate?: FiscalCertificateStatus }>; onActivate: () => Promise<{ ok: boolean; message: string; certificate?: FiscalCertificateStatus }> }) {
  const [adding, setAdding] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [validationError, setValidationError] = useState('');
  const [validationResult, setValidationResult] = useState<NfeA1ValidationDiagnostic | null>(null);
  const [validating, setValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectButtonRef = useRef<HTMLButtonElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const companyRegistration = useMemo(() => evaluateCertificateCompanyRegistration(company), [company]);
  const persistedCertificate = bridge.certificate;
  const certificateActive = persistedCertificate?.status === 'active';
  const certificateInstalled = persistedCertificate?.certificateInstalled === true;

  const resetSensitiveFields = () => {
    selectedFileRef.current = null;
    setSelectedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (passwordRef.current) passwordRef.current.value = '';
  };

  useEffect(() => {
    if (!open) return;
    setAdding(companyRegistration.ready && !certificateInstalled);
    setValidationError('');
    resetSensitiveFields();
  }, [open, companyRegistration.ready, certificateInstalled]);

  const selectCertificate = (file: File | undefined) => {
    setValidationError('');
    setValidationResult(null);
    if (!file) {
      resetSensitiveFields();
      return;
    }
    if (!/\.(?:pfx|p12)$/i.test(file.name)) {
      resetSensitiveFields();
      setValidationError('Selecione um arquivo no formato .pfx ou .p12.');
      return;
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      resetSensitiveFields();
      setValidationError('Selecione um certificado de até 5 MB.');
      return;
    }
    selectedFileRef.current = file;
    setSelectedFileName(file.name);
    window.setTimeout(() => passwordRef.current?.focus(), 0);
  };

  const validateCertificate = async () => {
    const certificate = selectedFileRef.current;
    const passphrase = passwordRef.current?.value ?? '';
    setValidationError('');
    setValidationResult(null);
    if (!companyRegistration.ready) {
      setValidationError('Complete os dados da empresa antes de validar o certificado.');
      return;
    }
    if (!certificate) {
      setValidationError('Selecione o arquivo do certificado.');
      selectButtonRef.current?.focus();
      return;
    }
    if (!passphrase) {
      setValidationError('Informe a senha do certificado.');
      passwordRef.current?.focus();
      return;
    }
    setValidating(true);
    try {
      if (bridge.integrated) {
        const result = await onInstall(certificate, passphrase);
        if (!result.ok) {
          setValidationError(result.message);
          return;
        }
        resetSensitiveFields();
        setAdding(false);
        return;
      }
      const body = new FormData();
      body.append('certificate', certificate, certificate.name);
      body.append('passphrase', passphrase);
      body.append('expectedDocument', company.document);
      const response = await fetch('/api/fiscal/nfe-sp/a1-validation', {
        method: 'POST',
        headers: { 'X-Avanta-Certificate-Flow': 'validacao-a1-local' },
        body,
      });
      const result = await response.json() as NfeA1ValidationDiagnostic;
      if (!response.ok || !result.valid) {
        setValidationError(result.errors?.[0]?.message || result.error || 'Não foi possível validar o certificado.');
        return;
      }
      setValidationResult(result);
      resetSensitiveFields();
      setAdding(false);
    } catch {
      setValidationError('Não foi possível validar o certificado. Tente novamente.');
    } finally {
      if (passwordRef.current) passwordRef.current.value = '';
      setValidating(false);
    }
  };

  const retryActivation = async () => {
    setValidationError('');
    const result = await onActivate();
    if (!result.ok) setValidationError(result.message);
  };

  if (!open) return null;
  const dialogTitle = !companyRegistration.ready ? 'Complete os dados da empresa' : adding ? 'Adicionar certificado digital' : 'Certificado digital';
  const statusLabel = bridge.loading ? 'Consultando' : certificateActive ? 'Certificado ativo' : certificateInstalled ? 'Instalado' : validationResult?.valid ? 'Validado neste navegador' : 'Não configurado';
  const statusTone: 'success' | 'warning' | 'info' = certificateActive || validationResult?.valid ? 'success' : certificateInstalled ? 'info' : 'warning';
  const statusTitle = certificateActive ? 'Certificado pronto para uso'
    : certificateInstalled ? 'Certificado instalado'
      : validationResult?.valid ? 'Certificado A1 validado localmente'
        : bridge.loading ? 'Consultando certificado' : 'Nenhum certificado instalado';
  const blockerDescriptions = certificateBlockerDescription(persistedCertificate?.blockers ?? []);
  const latestConnectionMessage = bridge.integrated && !bridge.loading && !validationError ? bridge.message.trim() : '';
  const statusDescription = certificateActive && latestConnectionMessage
    ? latestConnectionMessage
    : certificateActive && persistedCertificate?.validTo
    ? persistedCertificate.fiscalConnectionAvailable
      ? `Certificado vinculado à empresa e válido até ${new Date(persistedCertificate.validTo).toLocaleDateString('pt-BR')}. A conexão fiscal está disponível.`
      : persistedCertificate.fiscalConnectionChecked
        ? `Certificado vinculado à empresa e válido até ${new Date(persistedCertificate.validTo).toLocaleDateString('pt-BR')}. A SEFAZ respondeu, mas a homologação está indisponível; tente novamente mais tarde.`
        : `Certificado vinculado à empresa e válido até ${new Date(persistedCertificate.validTo).toLocaleDateString('pt-BR')}. Verifique a conexão segura antes de iniciar a homologação.`
    : certificateInstalled
      ? persistedCertificate?.validationChecked && blockerDescriptions.length
        ? `O arquivo continua protegido e vinculado à empresa. Falta concluir: ${blockerDescriptions.join('; ')}.`
        : 'O arquivo foi protegido e vinculado à empresa. Execute a verificação para concluir a ativação fiscal.'
      : validationResult?.valid
        ? `Titular e validade conferidos para ${company.name}. Validade até ${new Date(validationResult.certificateValidTo).toLocaleDateString('pt-BR')}.`
        : bridge.loading ? 'Aguarde enquanto a Gestão consulta a situação atual.' : 'Adicione o certificado A1 da empresa para assinar as notas fiscais. O sistema identifica e vincula a empresa automaticamente.';
  return <Dialog open title={dialogTitle} description={`Empresa ativa · ${company.name || 'Cadastro pendente'}`} eyebrow="Emissão de notas" onClose={onClose}>
    <div className="dialog-body certificate-settings-body">
      {!companyRegistration.ready ? <>
        <div className="certificate-status-empty"><span><Icon name="warning" size={28}/></span><div><Badge tone="warning">Cadastro pendente</Badge><h3>Preencha a identificação da empresa</h3><p>Esses dados serão usados para comparar o CNPJ da empresa ativa com o titular encontrado no certificado digital.</p></div></div>
        <div className="certificate-registration-pending" role="status" aria-live="polite"><strong>Informações que precisam ser concluídas</strong><ul>{companyRegistration.missing.map((item) => <li key={item.id}><Icon name="warning" size={15}/><span>{item.label}</span></li>)}</ul><small>Inscrição estadual e inscrição municipal serão verificadas depois, conforme o tipo de nota emitida.</small></div>
      </> : !adding ? <>
        <div className={`certificate-status-empty ${certificateActive || validationResult?.valid ? 'validated' : ''}`}><span><Icon name={certificateActive || validationResult?.valid ? 'check' : bridge.loading ? 'clock' : 'document'} size={28}/></span><div><Badge tone={statusTone}>{statusLabel}</Badge><h3>{statusTitle}</h3><p>{statusDescription}</p></div></div>
        <div className="certificate-type-summary"><span><Icon name="fiscal" size={22}/></span><div><strong>Certificado A1</strong><small>Arquivo no formato .pfx ou .p12</small></div><Badge>Recomendado</Badge></div>
        {validationError && <p className="form-error" role="alert">{validationError}</p>}
      </> : <>
        <div className="certificate-add-form">
          <div className="field field-wide"><span>Arquivo do certificado</span><div className="certificate-file-control"><span title={selectedFileName}>{selectedFileName || 'Nenhum arquivo selecionado'}</span><input ref={fileInputRef} type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={(event) => selectCertificate(event.target.files?.[0])} disabled={validating} hidden/><button ref={selectButtonRef} type="button" className="button secondary" onClick={() => fileInputRef.current?.click()} disabled={validating}>Selecionar arquivo</button></div><small className="field-message">Formatos aceitos: .pfx e .p12</small></div>
          <label className="field field-wide" htmlFor="certificate-password"><span>Senha do certificado</span><input ref={passwordRef} id="certificate-password" type="password" placeholder="Digite a senha" disabled={validating} autoComplete="new-password" maxLength={256}/></label>
          {validationError && <p className="form-error" role="alert">{validationError}</p>}
        </div>
      </>}
    </div>
    <footer className="dialog-footer">{!companyRegistration.ready ? <><button type="button" className="button secondary" onClick={onClose}>Fechar</button><button type="button" className="button primary" onClick={onRequestCompanyRegistration}><Icon name="edit" size={16}/> Completar cadastro</button></> : adding ? <><button type="button" className="button secondary" onClick={() => { resetSensitiveFields(); setValidationError(''); onClose(); }} disabled={validating}>Cancelar</button><button type="button" className="button primary" onClick={validateCertificate} disabled={validating || (bridge.integrated && !bridge.available)}>{validating ? bridge.integrated ? 'Instalando…' : 'Validando…' : bridge.integrated ? 'Instalar certificado' : 'Validar certificado'}</button></> : <><button type="button" className="button secondary" onClick={onClose}>Fechar</button>{certificateInstalled && (!certificateActive || !persistedCertificate?.fiscalConnectionAvailable) && <button type="button" className="button primary" onClick={retryActivation} disabled={bridge.loading}>{bridge.loading ? 'Verificando…' : certificateActive ? 'Verificar conexão' : 'Verificar novamente'}</button>}<button type="button" className="button secondary" onClick={() => { setValidationError(''); setAdding(true); }} disabled={bridge.loading}><Icon name="plus" size={16}/> {certificateInstalled || validationResult?.valid ? 'Substituir certificado' : 'Adicionar certificado'}</button></>}</footer>
  </Dialog>;
}

type SettingsTarget = SettingsSection | 'acessos' | 'matriz' | 'certificado' | null;
type SettingsGroupId = 'empresa-notas' | 'operacao' | 'equipe-acessos' | 'integracoes';
type SettingsItem = { title: string; description: string; icon: IconName; status: string; target: SettingsTarget };

function SettingsView({ settings, connected, canEdit, canViewAccess, canManageAccess, canConfigureFiscal, accessBridge, fiscalRulesBridge, certificateBridge, onSave, onSaveAccess, onSaveFiscalMatrix, onOpenCertificate }: { settings: ModuleSettings; connected: boolean; canEdit: boolean; canViewAccess: boolean; canManageAccess: boolean; canConfigureFiscal: boolean; accessBridge: AccessBridgeState; fiscalRulesBridge: FiscalRulesBridgeState; certificateBridge: FiscalCertificateBridgeState; onSave: (settings: ModuleSettings) => void; onSaveAccess: (settings: ModuleSettings) => void; onSaveFiscalMatrix: (input: FiscalMatrixSaveInput) => void; onOpenCertificate: () => void }) {
  const [section, setSection] = useState<SettingsSection | null>(null);
  const [accessOpen, setAccessOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<SettingsGroupId>('empresa-notas');
  const matrixValidation = validateFiscalMatrix(settings.fiscal.matrix, settings.fiscal.documentScope);
  const companyRegistration = evaluateCertificateCompanyRegistration(settings.company);
  const fiscalSeriesByDocument: Record<FiscalDocumentType, string> = { nfe: settings.fiscal.nfeSeries, nfce: settings.fiscal.nfceSeries, nfse: settings.fiscal.nfseSeries };
  const fiscalDataChecks = [
    Boolean(settings.fiscal.fiscalResponsible.trim()),
    ...settings.fiscal.documentScope.map((documentType) => Boolean(fiscalSeriesByDocument[documentType]?.trim())),
    settings.fiscal.taxReviewConfirmed,
    settings.fiscal.taxReformReviewConfirmed,
  ];
  const fiscalPendingCount = fiscalDataChecks.filter((ready) => !ready).length;
  const settingsGroups: Array<{ id: SettingsGroupId; label: string; title: string; description: string; items: SettingsItem[] }> = [
    { id: 'empresa-notas', label: 'Empresa e notas', title: 'Empresa e emissão de notas', description: 'Dados usados nos documentos e ajustes necessários para emitir notas fiscais.', items: [
      { title: 'Dados da empresa', description: 'CNPJ, endereço, inscrições e dados do emitente', icon: 'settings', status: companyRegistration.ready ? 'Completo' : `${companyRegistration.missing.length} pendentes`, target: 'empresa' },
      { title: 'Certificado digital', description: 'Adicionar ou substituir o certificado A1', icon: 'document', status: certificateBridge.loading ? 'Consultando' : certificateBridge.certificate?.certificateActive ? 'Certificado ativo' : certificateBridge.certificate?.certificateInstalled ? 'Instalado' : 'Não configurado', target: 'certificado' },
      { title: 'Dados para emissão', description: `${settings.fiscal.documentScope.length} ${settings.fiscal.documentScope.length === 1 ? 'tipo de nota' : 'tipos de nota'}, responsável e séries`, icon: 'fiscal', status: fiscalPendingCount ? `${fiscalPendingCount} ${fiscalPendingCount === 1 ? 'pendência' : 'pendências'}` : 'Completo', target: 'fiscal' },
      { title: 'Regras fiscais', description: 'Regras dos tipos de nota ativados', icon: 'document', status: fiscalRulesBridge.integrated ? fiscalRulesBridge.loading ? 'Consultando' : fiscalRulesBridge.configuration ? `Publicada · v${fiscalRulesBridge.configuration.version}` : fiscalRulesBridge.available ? 'Não publicada' : 'Indisponível' : matrixValidation.activeCount > 0 && matrixValidation.reviewedCount === matrixValidation.activeCount ? 'Revisadas localmente' : `${matrixValidation.reviewedCount}/${matrixValidation.activeCount} revisadas`, target: 'matriz' },
    ] },
    { id: 'operacao', label: 'Vendas e serviços', title: 'Rotina comercial', description: 'Padrões para registrar vendas, serviços, cobranças e movimentações.', items: [
      { title: 'Regras comerciais', description: 'Pedidos, orçamentos, descontos e aprovações', icon: 'sale', status: 'Ativo', target: 'comercial' },
      { title: 'Pagamentos', description: 'Formas de pagamento, parcelas e vencimentos', icon: 'money', status: 'Ativo', target: 'pagamentos' },
      { title: 'Estoque', description: `${settings.stock.locations.length} locais, entradas, saídas e inventário`, icon: 'stock', status: settings.stock.allowNegativeStock ? 'Saldo negativo permitido' : 'Protegido', target: 'estoque' },
    ] },
    { id: 'equipe-acessos', label: 'Equipe e acessos', title: 'Equipe e permissões', description: 'Pessoas que operam o módulo e o que cada uma pode consultar ou alterar.', items: [
      { title: 'Equipe comercial', description: 'Vendedores e responsáveis pelos serviços', icon: 'users', status: 'Ativo', target: 'equipe' },
      { title: 'Usuários e permissões', description: `${settings.access.users.length} usuários, perfis e liberações individuais`, icon: 'settings', status: accessBridge.integrated ? accessBridge.available ? accessBridge.writable ? 'Conectado' : 'Somente consulta' : 'Indisponível' : 'Modo local', target: 'acessos' },
    ] },
    { id: 'integracoes', label: 'Integrações', title: 'Conexões com outros módulos', description: 'Vínculos que evitam recadastro e mantêm as informações sincronizadas.', items: [
      { title: 'Catálogo e custos', description: 'Produtos, serviços, custos e preços publicados', icon: 'box', status: connected ? 'Conectado' : 'Planejada', target: null },
      { title: 'Gestão financeira', description: 'Recebimentos líquidos lançados por competência', icon: 'chart', status: connected ? 'Conectado' : 'Planejada', target: null },
    ] },
  ];
  const activeGroup = settingsGroups.find((group) => group.id === activeGroupId) ?? settingsGroups[0];
  const isUnavailable = (target: SettingsTarget) => !target || (target === 'acessos' ? !canViewAccess : target === 'matriz' || target === 'certificado' ? !canConfigureFiscal : !canEdit);
  const openTarget = (target: SettingsTarget) => {
    if (target === 'acessos') setAccessOpen(true);
    else if (target === 'matriz') setMatrixOpen(true);
    else if (target === 'certificado') onOpenCertificate();
    else if (target) setSection(target);
  };

  return <>
    <PageHeading view="configuracoes"/>
    <nav className="settings-tabs" aria-label="Áreas de ajustes">
      {settingsGroups.map((group) => <button type="button" key={group.id} className={group.id === activeGroup.id ? 'active' : ''} aria-pressed={group.id === activeGroup.id} onClick={() => setActiveGroupId(group.id)}>{group.label}</button>)}
    </nav>
    <section className="settings-group" aria-labelledby="settings-group-title">
      <header className="settings-group-heading"><div><h2 id="settings-group-title">{activeGroup.title}</h2><p>{activeGroup.description}</p></div><Badge tone="info">{activeGroup.items.length} {activeGroup.items.length === 1 ? 'ajuste' : 'ajustes'}</Badge></header>
      <div className="settings-grid">{activeGroup.items.map(({ title, description, icon, status, target }) => {
        const unavailable = isUnavailable(target);
        const attention = /Pendente|Pendência|Revisar|Não configurado|Não publicada|Indisponível|\d+\//i.test(status);
        return <button type="button" key={title} onClick={() => openTarget(target)} disabled={unavailable} title={!target ? 'Disponível quando a integração for conectada' : unavailable ? 'Seu perfil não permite alterar este ajuste' : undefined}><span><Icon name={icon}/></span><div><strong>{title}</strong><small>{description}</small><Badge tone={unavailable ? 'neutral' : attention ? 'warning' : 'neutral'}>{unavailable && target ? 'Sem acesso' : status}</Badge></div><Icon name={!unavailable ? 'chevron' : 'clock'} size={17}/></button>;
      })}</div>
    </section>
    <SettingsDialog section={section} settings={settings} onClose={() => setSection(null)} onSave={(next) => { onSave(next); setSection(null); }}/>
    <FiscalMatrixDialog open={matrixOpen} matrix={settings.fiscal.matrix} documentScope={settings.fiscal.documentScope} taxReviewConfirmed={settings.fiscal.taxReviewConfirmed} taxReformReviewConfirmed={settings.fiscal.taxReformReviewConfirmed} bridge={fiscalRulesBridge} readOnly={!canConfigureFiscal || (fiscalRulesBridge.integrated && !fiscalRulesBridge.writable)} onClose={() => setMatrixOpen(false)} onSave={onSaveFiscalMatrix}/>
    <AccessSettingsDialog open={accessOpen} settings={settings} bridge={accessBridge} readOnly={!canManageAccess || (accessBridge.integrated && !accessBridge.writable)} onClose={() => setAccessOpen(false)} onSave={(next) => { onSaveAccess(next); setAccessOpen(false); }}/>
  </>;
}

export function VendasServicosPrototype({ integratedManagementRuntime = false }: { integratedManagementRuntime?: boolean }) {
  const [view, setView] = useState<View>('painel');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [newMenu, setNewMenu] = useState(false);
  const [newType, setNewType] = useState<DocumentType | null>(null);
  const [clientCreateOpen, setClientCreateOpen] = useState(false);
  const [supplierCreateOpen, setSupplierCreateOpen] = useState(false);
  const [quoteSource, setQuoteSource] = useState<'vendas' | 'servicos'>('vendas');
  const [commercialClient, setCommercialClient] = useState('');
  const [commercialSku, setCommercialSku] = useState('');
  const [commercialReturnView, setCommercialReturnView] = useState<'vendas' | 'servicos' | 'clientes' | 'catalogo'>('vendas');
  const [serviceClient, setServiceClient] = useState('');
  const [serviceSku, setServiceSku] = useState('');
  const [serviceReturnView, setServiceReturnView] = useState<'servicos' | 'clientes' | 'catalogo'>('servicos');
  const [fiscalOrigin, setFiscalOrigin] = useState<FiscalOrigin | null>(null);
  const [fiscalDraftRecords, setFiscalDraftRecords] = useState<FiscalDraftRecord[]>(() => [createAuthorizedCancellationDemoDraft(), createRejectedNcmDemoDraft()]);
  const [receivableOrigin, setReceivableOrigin] = useState('');
  const [stockOrigin, setStockOrigin] = useState('');
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [companyRegistrationOpen, setCompanyRegistrationOpen] = useState(false);
  const [created, setCreated] = useState<CreatedRecord[]>([]);
  const [clientRecords, setClientRecords] = useState<ClientRecord[]>(clients);
  const [supplierRecords, setSupplierRecords] = useState<SupplierRecord[]>([]);
  const [catalogRecords, setCatalogRecords] = useState<CatalogItem[]>(() => inventory.map((item) => normalizeCatalogTaxProfile(item) as CatalogItem));
  const [managementCatalogBridge, setManagementCatalogBridge] = useState<ManagementCatalogBridge | null>(null);
  const [managementBridgeOrigin, setManagementBridgeOrigin] = useState('');
  const [accessBridgeState, setAccessBridgeState] = useState<AccessBridgeState>({ integrated: false, available: false, writable: false, loading: false, message: '' });
  const [fiscalRulesBridgeState, setFiscalRulesBridgeState] = useState<FiscalRulesBridgeState>({ integrated: false, available: false, writable: false, loading: false, message: '', configuration: null });
  const [fiscalCertificateBridgeState, setFiscalCertificateBridgeState] = useState<FiscalCertificateBridgeState>({ integrated: false, available: false, writable: false, loading: false, message: '', certificate: null });
  const [fiscalPrepareState, setFiscalPrepareState] = useState<Record<string, { loading: boolean; message: string }>>({});
  const [stockMovementRecords, setStockMovementRecords] = useState<StockMovementRecord[]>(stockMoves);
  const [receivableRecords, setReceivableRecords] = useState<ReceivableRecord[]>(initialReceivables);
  const [moduleSettings, setModuleSettings] = useState<ModuleSettings>(defaultModuleSettings);
  const [fiscalNumberingLedger, setFiscalNumberingLedger] = useState<FiscalNumberingLedger>(() => createFiscalNumberingLedger({ nfe: defaultModuleSettings.fiscal.nfeSeries, nfce: defaultModuleSettings.fiscal.nfceSeries, nfse: defaultModuleSettings.fiscal.nfseSeries }));
  const [fiscalHomologationPlan, setFiscalHomologationPlan] = useState<FiscalHomologationPlan>(() => ({
    ...createDefaultFiscalHomologationPlan(defaultModuleSettings.company),
    coordinator: defaultModuleSettings.fiscal.fiscalResponsible,
    providerMode: defaultModuleSettings.fiscal.providerMode,
    nfseAuthorityMode: defaultModuleSettings.fiscal.nfseAuthorityMode,
  }));
  const [fiscalIntegrationEvaluation, setFiscalIntegrationEvaluation] = useState<FiscalIntegrationEvaluation>(() => createDefaultFiscalIntegrationEvaluation());
  const [fiscalIssuerRegistry, setFiscalIssuerRegistry] = useState<FiscalIssuerRegistry>(() => createFiscalIssuerRegistry(defaultModuleSettings.company));
  const [nfeSpHomologationConfig, setNfeSpHomologationConfig] = useState<NfeSpHomologationConfig>(() => createDefaultNfeSpHomologationConfig());
  const [activeUserId, setActiveUserId] = useState(defaultModuleSettings.access.users[0].id);
  const [toast, setToast] = useState('');
  const newMenuRef = useRef<HTMLDivElement>(null);
  const pendingFiscalPrepareRef = useRef(new Map<string, { draftId: string; timer: number }>());
  const pendingFiscalValidationRef = useRef(new Map<string, { draftId: string; timer: number }>());
  const pendingFiscalNumberRef = useRef(new Map<string, { draftId: string; timer: number }>());
  const pendingFiscalIssueRef = useRef(new Map<string, { draftId: string; timer: number }>());
  const pendingOrderWorkflowRef = useRef(new Map<string, { recordId: string; target: 'confirmado' | 'em_separacao' | 'faturado' | 'cancelado' | 'devolvido'; timer: number }>());
  const pendingServiceWorkflowRef = useRef(new Map<string, { recordId: string; action: 'start' | 'complete' | 'cancel' | 'reverse'; timer: number }>());
  const pendingReceivableRef = useRef(new Map<string, PendingConfirmedSave>());
  const pendingStockRef = useRef(new Map<string, PendingConfirmedSave>());
  const pendingCustomerRef = useRef(new Map<string, PendingConfirmedSave>());
  const pendingSupplierRef = useRef(new Map<string, PendingConfirmedSave>());
  const pendingOperationSaveRef = useRef(new Map<string, { recordId: string; timer: number }>());
  const pendingAccessSaveRef = useRef(new Map<string, number>());
  const pendingFiscalRulesSaveRef = useRef(new Map<string, number>());
  const stockAttentionCount = catalogRecords.filter((item) => item.category !== 'Serviço' && item.trackStock && stockStatus(item.available, item.minimum) !== 'normal').length;
  const receivableOpenCount = receivableRecords.filter((item) => receivableBalance(item) > 0).length;
  const salesRecordCount = created.filter((item) => ['orcamento', 'pedido', 'venda'].includes(item.type)).length;
  const serviceRecordCount = created.filter((item) => item.type === 'ordem_servico').length;
  const fiscalDocumentCount = fiscalDraftRecords.length;
  const currentFiscalConfig = useMemo(() => fiscalConfigFromSettings(moduleSettings, fiscalCertificateBridgeState.certificate), [moduleSettings, fiscalCertificateBridgeState.certificate]);
  const managementProfileReady = !integratedManagementRuntime || Boolean(managementCatalogBridge?.company);
  const managementAccessReady = !integratedManagementRuntime || accessBridgeState.available;
  const managementContextReady = managementProfileReady && managementAccessReady;
  const sidebarFiscalStatus = useMemo(() => {
    if (currentFiscalConfig.certificateValid && currentFiscalConfig.providerConnected) return { title: 'Fiscal conectado', detail: 'Homologação fiscal disponível' };
    if (currentFiscalConfig.certificateValid) return { title: 'Certificado fiscal ativo', detail: 'Revisão e homologação pendentes' };
    if (fiscalCertificateBridgeState.loading) return { title: 'Situação fiscal em consulta', detail: 'Aguarde a verificação da empresa' };
    if (fiscalCertificateBridgeState.certificate?.certificateInstalled) return { title: 'Certificado em validação', detail: 'Produção bloqueada com segurança' };
    return { title: 'Fiscal não conectado', detail: 'Produção bloqueada com segurança' };
  }, [currentFiscalConfig.certificateValid, currentFiscalConfig.providerConnected, fiscalCertificateBridgeState.certificate?.certificateInstalled, fiscalCertificateBridgeState.loading]);
  const activeUser = moduleSettings.access.users.find((user) => user.id === activeUserId) ?? moduleSettings.access.users[0] ?? null;
  const activeRole = moduleSettings.access.roles.find((role) => role.id === activeUser?.roleId) ?? null;
  const effectivePermissions = useMemo(() => resolveEffectivePermissions({ rolePermissions: activeRole?.permissions ?? [], overrides: activeUser?.overrides ?? {}, permissionIds: allPermissionIds }), [activeRole, activeUser]);
  const accessBoundary = useMemo(() => normalizeAccessBoundary({ source: 'demo', userId: activeUser?.id ?? '', companyId: moduleSettings.company.document, moduleId: SALES_MODULE_ID, userActive: Boolean(activeUser?.active), membershipActive: Boolean(activeUser?.active), companyActive: true, moduleActive: true }), [activeUser, moduleSettings.company.document]);
  const accessDecision = (permission: string) => evaluateAccessDecision({ boundary: accessBoundary, effectivePermissions, permission });
  const can = (permission: string) => accessDecision(permission).allowed;
  const deny = (action: string, reason: Parameters<typeof accessDecisionMessage>[0]) => { setToast(`${activeUser?.name ?? 'Este usuário'} não pode ${action}. ${accessDecisionMessage(reason)}`); };
  const authorize = (permission: string, action: string) => { const decision = accessDecision(permission); if (decision.allowed) return true; deny(action, decision.reason); return false; };
  const installProtectedCertificate = useCallback((certificate: File, passphrase: string) => new Promise<{ ok: boolean; message: string; certificate?: FiscalCertificateStatus }>((resolve) => {
    if (!managementBridgeOrigin || window.parent === window) {
      resolve({ ok: false, message: 'Abra Vendas pela Gestão para instalar o certificado com segurança.' });
      return;
    }
    const requestId = `certificate-install:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
    const request = createFiscalCertificateInstallRequest({ requestId, certificate, passphrase });
    if (!request) {
      resolve({ ok: false, message: 'Selecione o certificado A1 e informe a senha de importação.' });
      return;
    }
    const channel = new MessageChannel();
    let settled = false;
    const finish = (result: { ok: boolean; message: string; certificate?: FiscalCertificateStatus }) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      channel.port1.close();
      resolve(result);
    };
    const timer = window.setTimeout(() => {
      setFiscalCertificateBridgeState((current) => ({ ...current, loading: false, message: 'A instalação demorou mais que o esperado. Tente novamente.' }));
      finish({ ok: false, message: 'A instalação demorou mais que o esperado. Tente novamente.' });
    }, 60_000);
    channel.port1.onmessage = (event) => {
      const response = parseFiscalCertificateInstallResponse(event.data);
      if (!response || response.requestId !== requestId) return;
      if (!response.ok) {
        setFiscalCertificateBridgeState((current) => ({ ...current, loading: false, message: response.message }));
        finish({ ok: false, message: response.message });
        return;
      }
      setFiscalCertificateBridgeState({ integrated: true, available: true, writable: true, loading: false, message: response.message, certificate: response.certificate });
      finish({ ok: true, message: response.message, certificate: response.certificate });
    };
    setFiscalCertificateBridgeState((current) => ({ ...current, loading: true, message: 'Instalando certificado…' }));
    window.parent.postMessage(request, managementBridgeOrigin, [channel.port2]);
  }), [managementBridgeOrigin]);
  const activateProtectedCertificate = useCallback(() => new Promise<{ ok: boolean; message: string; certificate?: FiscalCertificateStatus }>((resolve) => {
    if (!managementBridgeOrigin || window.parent === window) {
      resolve({ ok: false, message: 'Abra Vendas pela Gestão para verificar o certificado com segurança.' });
      return;
    }
    const requestId = `certificate-activate:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
    const request = createFiscalCertificateActivateRequest({ requestId });
    if (!request) {
      resolve({ ok: false, message: 'Não foi possível iniciar a verificação do certificado.' });
      return;
    }
    const channel = new MessageChannel();
    let settled = false;
    const finish = (result: { ok: boolean; message: string; certificate?: FiscalCertificateStatus }) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      channel.port1.close();
      resolve(result);
    };
    const timer = window.setTimeout(() => {
      const message = 'A verificação demorou mais que o esperado. O certificado continua instalado.';
      setFiscalCertificateBridgeState((current) => ({ ...current, loading: false, message }));
      finish({ ok: false, message });
    }, 60_000);
    channel.port1.onmessage = (event) => {
      const response = parseFiscalCertificateActivateResponse(event.data);
      if (!response || response.requestId !== requestId) return;
      if (!response.ok) {
        setFiscalCertificateBridgeState((current) => ({ ...current, loading: false, message: response.message }));
        finish({ ok: false, message: response.message });
        return;
      }
      setFiscalCertificateBridgeState({ integrated: true, available: true, writable: true, loading: false, message: response.message, certificate: response.certificate });
      finish({ ok: true, message: response.message, certificate: response.certificate });
    };
    setFiscalCertificateBridgeState((current) => ({ ...current, loading: true, message: 'Verificando certificado…' }));
    window.parent.postMessage(request, managementBridgeOrigin, [channel.port2]);
  }), [managementBridgeOrigin]);
  const applyFiscalIssueResponse = (data: unknown) => {
    const issued = parseFiscalIssueResponse(data);
    if (!issued) return false;
    const pending = pendingFiscalIssueRef.current.get(issued.requestId);
    if (!pending) return true;
    window.clearTimeout(pending.timer);
    pendingFiscalIssueRef.current.delete(issued.requestId);
    if (!issued.ok) {
      setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message: issued.message } }));
      setToast(issued.message);
      return true;
    }
    if (issued.emission.emissionId !== pending.draftId) {
      const message = 'O retorno da emissão não corresponde ao documento selecionado.';
      setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message } }));
      setToast(message);
      return true;
    }
    const now = new Date().toISOString();
    setFiscalDraftRecords((current) => current.map((draft) => draft.id === pending.draftId ? {
      ...draft,
      remoteState: issued.emission.state,
      remoteVersion: issued.emission.version,
      updatedAt: now,
      events: [...draft.events, { date: now, label: issued.emission.authorized ? 'NF-e autorizada' : issued.emission.rejected ? 'NF-e rejeitada' : 'NF-e em processamento', description: issued.emission.authorized ? 'Documento assinado, transmitido e autorizado.' : issued.emission.rejected ? `A NF-e foi transmitida e rejeitada${issued.emission.statusReason ? `: ${issued.emission.statusReason}` : '.'}` : 'Documento assinado e transmitido. A autorização será consultada sem repetir o envio.', user: 'Sistema' }],
    } : draft));
    const message = issued.emission.authorized ? 'NF-e autorizada com sucesso.' : issued.emission.rejected ? `NF-e rejeitada${issued.emission.statusReason ? `: ${issued.emission.statusReason}` : '.'}` : 'NF-e enviada e em processamento.';
    setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message } }));
    setToast(message);
    return true;
  };

  useEffect(() => {
    if (isIntegratedManagementRuntime()) return;
    try {
      const saved = readCompanyStorage(ACTIVE_USER_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; userId?: string };
      if (parsed.version === 1 && parsed.userId) setActiveUserId(parsed.userId);
    } catch { /* sessão local inválida volta ao gestor demonstrativo */ }
  }, []);

  useEffect(() => {
    if (moduleSettings.access.users.some((user) => user.id === activeUserId)) return;
    setActiveUserId(moduleSettings.access.users.find((user) => user.active)?.id ?? moduleSettings.access.users[0]?.id ?? '');
  }, [activeUserId, moduleSettings.access.users]);

  useEffect(() => {
    if (!activeUser?.active) return;
    const required = viewPermission[view];
    if (!required || effectivePermissions[required]) return;
    const fallback = (['painel', 'vendas', 'servicos', 'clientes', 'catalogo', 'estoque', 'fiscal', 'recebimentos', 'relatorios', 'configuracoes'] as View[]).find((candidate) => effectivePermissions[viewPermission[candidate] ?? '']);
    if (fallback) setView(fallback);
  }, [activeUser, effectivePermissions, view]);

  useEffect(() => {
    if (isIntegratedManagementRuntime()) return;
    try {
      const saved = readCompanyStorage(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; created?: CreatedRecord[] };
      if (parsed.version === 1 && Array.isArray(parsed.created)) setCreated(parsed.created.slice(0, 20));
    } catch { /* fallback seguro para dados locais inválidos */ }
  }, []);

  useEffect(() => {
    if (isIntegratedManagementRuntime()) return;
    try {
      const saved = [CATALOG_STORAGE_KEY, ...CATALOG_LEGACY_STORAGE_KEYS].map((key) => readCompanyStorage(key)).find(Boolean);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; catalog?: CatalogItem[] };
      if ((parsed.version === 1 || parsed.version === 2 || parsed.version === 3) && Array.isArray(parsed.catalog)) {
        const migrated = parsed.catalog.map((item) => normalizeCatalogTaxProfile(item) as CatalogItem);
        setCatalogRecords(migrated);
        if (parsed.version !== 3) writeCompanyStorage(CATALOG_STORAGE_KEY, JSON.stringify({ version: 3, catalog: migrated }));
      }
    } catch { /* fallback seguro para dados locais inválidos */ }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!['gestao', 'gestao-local'].includes(params.get('bridge') || '') || window.parent === window) return;
    let parentOrigin = window.location.origin;
    try {
      if (document.referrer) parentOrigin = new URL(document.referrer).origin;
    } catch { return; }
    if (!isAllowedLocalManagementOrigin(parentOrigin, window.location.origin)) return;
    setManagementBridgeOrigin(parentOrigin);
    setCreated([]);
    setClientRecords([]);
    setSupplierRecords([]);
    setCatalogRecords([]);
    setStockMovementRecords([]);
    setReceivableRecords([]);
    setFiscalDraftRecords([]);
    setAccessBridgeState({ integrated: true, available: false, writable: false, loading: true, message: 'Consultando permissões na Gestão…' });
    setFiscalRulesBridgeState({ integrated: true, available: false, writable: false, loading: true, message: 'Consultando regras fiscais na Gestão…', configuration: null });
    setFiscalCertificateBridgeState({ integrated: true, available: false, writable: false, loading: true, message: 'Consultando certificado digital…', certificate: null });
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== parentOrigin) return;
      const applyPublishedConfiguration = (configuration: NonNullable<FiscalRulesBridgeSnapshot['configuration']>) => {
        setModuleSettings((current) => normalizeModuleSettings({
          ...current,
          fiscal: {
            ...current.fiscal,
            matrix: configuration.matrix,
            fiscalResponsible: configuration.fiscalResponsible || current.fiscal.fiscalResponsible,
            taxReviewConfirmed: configuration.taxReviewConfirmed,
            taxReformReviewConfirmed: configuration.taxReformReviewConfirmed,
          },
        }, defaultModuleSettings) as ModuleSettings);
      };
      const accessSnapshot = parseAccessSnapshotMessage(event.data);
      if (accessSnapshot) {
        setAccessBridgeState({ integrated: true, available: accessSnapshot.available, writable: accessSnapshot.writable, loading: false, message: accessSnapshot.message });
        if (accessSnapshot.available) {
          if (accessSnapshot.activeUserId) setActiveUserId(accessSnapshot.activeUserId);
          setModuleSettings((current) => applyAccessBridgeSnapshot(current, accessSnapshot));
        }
        return;
      }
      const accessSave = parseAccessSaveResponse(event.data);
      if (accessSave) {
        const timer = pendingAccessSaveRef.current.get(accessSave.requestId);
        if (timer) window.clearTimeout(timer);
        pendingAccessSaveRef.current.delete(accessSave.requestId);
        setAccessBridgeState((current) => ({ ...current, loading: false, message: accessSave.message }));
        setToast(accessSave.message);
        return;
      }
      const fiscalRulesSnapshot = parseFiscalRulesSnapshot(event.data);
      if (fiscalRulesSnapshot) {
        setFiscalRulesBridgeState({ integrated: true, available: fiscalRulesSnapshot.available, writable: fiscalRulesSnapshot.writable, loading: false, message: fiscalRulesSnapshot.message, configuration: fiscalRulesSnapshot.configuration });
        if (fiscalRulesSnapshot.configuration) applyPublishedConfiguration(fiscalRulesSnapshot.configuration);
        return;
      }
      const fiscalRulesSave = parseFiscalRulesSaveResponse(event.data);
      if (fiscalRulesSave) {
        const timer = pendingFiscalRulesSaveRef.current.get(fiscalRulesSave.requestId);
        if (!timer) return;
        window.clearTimeout(timer);
        pendingFiscalRulesSaveRef.current.delete(fiscalRulesSave.requestId);
        if (fiscalRulesSave.ok && fiscalRulesSave.configuration) {
          applyPublishedConfiguration(fiscalRulesSave.configuration);
          setFiscalRulesBridgeState((current) => ({ ...current, available: true, writable: true, loading: false, message: fiscalRulesSave.message, configuration: fiscalRulesSave.configuration }));
        } else {
          setFiscalRulesBridgeState((current) => ({ ...current, loading: false, message: fiscalRulesSave.message }));
        }
        setToast(fiscalRulesSave.message);
        return;
      }
      const certificateStatus = parseFiscalCertificateStatusResponse(event.data);
      if (certificateStatus) {
        setFiscalCertificateBridgeState({
          integrated: true,
          available: certificateStatus.ok,
          writable: certificateStatus.ok,
          loading: false,
          message: certificateStatus.message,
          certificate: certificateStatus.ok ? certificateStatus.certificate : null,
        });
        return;
      }
      const commercial = parseCommercialOrderWorkflowResponse(event.data);
      if (commercial) {
        const pending = pendingOrderWorkflowRef.current.get(commercial.requestId);
        if (!pending) return;
        window.clearTimeout(pending.timer);
        pendingOrderWorkflowRef.current.delete(commercial.requestId);
        if (!commercial.ok) {
          if (pending.target === 'confirmado') setCreated((current) => current.filter((record) => record.id !== pending.recordId || Boolean(record.persistence)));
          setToast(commercial.message);
          return;
        }
        const status = commercial.order.status === 'faturado' ? 'Faturado' as const
          : commercial.order.status === 'em_separacao' ? 'Em separação' as const
            : commercial.order.status === 'cancelado' ? 'Cancelado' as const
              : commercial.order.status === 'devolvido' ? 'Devolvido' as const : 'Confirmado' as const;
        const stockState = ({ reservado: 'Reservado', em_separacao: 'Em separação', baixado: 'Baixado', liberado: 'Liberado', devolvido: 'Devolvido' } as const)[commercial.order.stockStatus as 'reservado' | 'em_separacao' | 'baixado' | 'liberado' | 'devolvido'] ?? 'Sem movimentação';
        const now = new Date().toISOString();
        setCreated((current) => {
          const next = current.map((record) => record.id === pending.recordId ? {
            ...record,
            status,
            persistence: {
              operationId: commercial.order.operationId,
              customerId: commercial.customerId,
              version: commercial.order.version,
              status: commercial.order.status,
              fiscalDraftId: commercial.order.fiscalDraftId || undefined,
            },
            order: record.order ? { ...record.order, stockState, reserveStock: commercial.order.stockIntegrated === true } : record.order,
            events: [...(record.events ?? []), {
              date: now,
              label: status === 'Faturado' ? 'Pedido faturado no repositório' : status === 'Em separação' ? 'Separação persistida' : status === 'Cancelado' ? 'Pedido cancelado' : status === 'Devolvido' ? 'Devolução registrada' : 'Pedido persistido',
              description: status === 'Faturado'
                ? `${commercial.order.receivableCount} ${commercial.order.receivableCount === 1 ? 'parcela registrada' : 'parcelas registradas'}${commercial.order.fiscalDraftId ? ' e rascunho fiscal criado.' : '.'}`
                : commercial.order.stockIntegrated ? `Operação vinculada ao perfil ativo com estoque em ${stockState.toLocaleLowerCase('pt-BR')}.` : 'Operação vinculada ao perfil ativo sem item controlado em estoque.',
            }],
          } : record);
          return next;
        });
        setToast(status === 'Faturado'
          ? 'Pedido faturado e persistido. A nota permaneceu como rascunho na Central Fiscal.'
          : status === 'Em separação' ? 'Separação registrada no repositório comercial.'
            : status === 'Cancelado' ? 'Pedido cancelado e reserva liberada no perfil ativo.'
              : status === 'Devolvido' ? 'Devolução registrada com estoque, parcelas e fiscal sincronizados.' : 'Pedido confirmado e persistido no perfil ativo.');
        return;
      }
      const serviceWorkflow = parseCommercialServiceWorkflowResponse(event.data);
      if (serviceWorkflow) {
        const pending = pendingServiceWorkflowRef.current.get(serviceWorkflow.requestId);
        if (!pending) return;
        window.clearTimeout(pending.timer); pendingServiceWorkflowRef.current.delete(serviceWorkflow.requestId);
        if (!serviceWorkflow.ok) { setToast(serviceWorkflow.message); return; }
        const now = new Date().toISOString();
        const status = pending.action === 'start' ? 'Em execução' as const : pending.action === 'complete' ? 'Concluído' as const : 'Cancelado' as const;
        setCreated((current) => {
          const next = current.map((record) => record.id === pending.recordId ? {
            ...record, status,
            persistence: record.persistence ? { ...record.persistence, version: serviceWorkflow.result.operationVersion, status: status === 'Em execução' ? 'em_execucao' : status === 'Concluído' ? 'concluido' : 'cancelado', fiscalDraftId: serviceWorkflow.result.fiscalDraftId || record.persistence.fiscalDraftId } : record.persistence,
            serviceOrder: record.serviceOrder ? { ...record.serviceOrder,
              startedAt: pending.action === 'start' ? now : record.serviceOrder.startedAt,
              completedAt: pending.action === 'complete' ? now : record.serviceOrder.completedAt,
              materialStockState: pending.action === 'complete' && serviceWorkflow.result.consumedQuantity > 0 ? 'Baixado' : pending.action === 'reverse' && serviceWorkflow.result.returnedQuantity > 0 ? 'Estornado' : record.serviceOrder.materialStockState,
            } : record.serviceOrder,
            events: [...(record.events ?? []), { date: now, label: pending.action === 'start' ? 'Atendimento iniciado' : pending.action === 'complete' ? 'Serviço concluído' : pending.action === 'reverse' ? 'Conclusão estornada' : 'Ordem cancelada', description: pending.action === 'complete' ? `${serviceWorkflow.result.receivableCount || 0} parcela(s) registrada(s)${serviceWorkflow.result.fiscalDraftId ? ' e rascunho de NFS-e criado.' : '.'}` : pending.action === 'start' ? 'Execução e reserva de materiais registradas no perfil ativo.' : pending.action === 'reverse' ? 'Materiais, parcelas e rascunho fiscal revertidos no perfil ativo.' : 'Cancelamento e liberação de reservas registrados no perfil ativo.' }],
          } : record);
          return next;
        });
        setToast(pending.action === 'complete' ? 'Serviço concluído com estoque, cobrança e fiscal sincronizados.' : pending.action === 'start' ? 'Atendimento iniciado no perfil empresarial.' : pending.action === 'reverse' ? 'Conclusão estornada com estoque, cobrança e fiscal sincronizados.' : 'Ordem cancelada e reservas liberadas.');
        return;
      }
      const receivableSnapshot=parseReceivableSnapshot(event.data);
      if(receivableSnapshot){
        if(!receivableSnapshot.ok){setReceivableRecords([]);setToast(receivableSnapshot.message||'Não foi possível carregar os recebimentos do perfil.');return;}
        const eventType=(value:string):ReceivableEvent['type']=>value==='recebimento'?'Recebimento':value==='estorno_recebimento'?'Estorno de recebimento':value==='estorno_parcela'||value==='cancelamento'?'Estorno da parcela':'Geração';
        setReceivableRecords(receivableSnapshot.records.map((row:any)=>({
          id:row.id,dueDate:row.dueDate,client:row.clientName||'Cliente',origin:row.originLabel||row.operationId,method:paymentMethodLabel(row.method),installment:`${row.installment}/${row.installmentCount}`,value:row.original,received:row.received,reversed:row.status==='cancelado'?row.original:0,refunded:row.refunded,createdAt:row.createdAt,status:row.status,
          events:(Array.isArray(row.events)?row.events:[]).map((entry:any)=>({date:entry.createdAt||`${entry.date}T12:00:00-03:00`,type:eventType(String(entry.type||'')),amount:Number(entry.amount)||0,method:paymentMethodLabel(entry.method),account:String(entry.account||''),user:'Sistema',description:String(entry.description||'Movimentação financeira registrada.')})),
          persistence:{operationId:row.operationId,version:row.version},
        })));
        return;
      }
      const receivableMove=parseReceivableMoveResponse(event.data);
      if(receivableMove){
        const pending=pendingReceivableRef.current.get(receivableMove.requestId);
        if(!pending)return;
        window.clearTimeout(pending.timer);
        pendingReceivableRef.current.delete(receivableMove.requestId);
        const result={ok:receivableMove.ok,message:receivableMove.message||(receivableMove.ok?'Operação financeira registrada.':'Não foi possível concluir a operação financeira.')};
        pending.resolve(result);
        setToast(result.message);
        return;
      }
      const stockSnapshot=parseStockSnapshot(event.data);
      if(stockSnapshot){if(!stockSnapshot.ok){setStockMovementRecords([]);setToast(stockSnapshot.message||'Não foi possível carregar o histórico de estoque.');return;}setStockMovementRecords(stockSnapshot.movements.map((row:any)=>({id:String(row.id),date:row.date?`${String(row.date).split('-').reverse().join('/')} 12:00`:new Date(row.createdAt).toLocaleString('pt-BR'),createdAt:String(row.createdAt||''),origin:String(row.document||row.id),type:String(row.type||'Movimentação'),direction:Number(row.quantity)<0?'saida':'entrada',sku:String(row.sku||''),item:String(row.item||''),quantity:Number(row.quantity)||0,balance:Number(row.physicalAfter)||0,user:String(row.actor||'Sistema'),location:String(row.location||'Estoque principal'),partner:String(row.partner?.name||row.partner?.document||''),document:String(row.document||''),lot:String(row.lot||''),expiry:String(row.expiry||''),notes:String(row.notes||'')})));return;}
      const stockMove=parseStockMoveResponse(event.data);if(stockMove){const pending=pendingStockRef.current.get(stockMove.requestId);if(!pending)return;window.clearTimeout(pending.timer);pendingStockRef.current.delete(stockMove.requestId);const result={ok:stockMove.ok,message:stockMove.message||(stockMove.ok?'Movimentação de estoque registrada.':'Não foi possível movimentar o estoque.')};pending.resolve(result);setToast(result.message);return;}
      const customerSnapshot = parsePartySnapshot(event.data, CUSTOMER_SNAPSHOT_TYPE, 'customers');
      if (customerSnapshot) { if (!customerSnapshot.ok) { setClientRecords([]); setToast(customerSnapshot.message || 'Não foi possível carregar os clientes do perfil.'); return; } setClientRecords(customerSnapshot.records as ClientRecord[]); return; }
      const customerSave = parsePartySaveResponse(event.data, CUSTOMER_SAVE_RESPONSE_TYPE);
      if (customerSave) {
        const pending = pendingCustomerRef.current.get(customerSave.requestId);
        if (!pending) return;
        window.clearTimeout(pending.timer);
        pendingCustomerRef.current.delete(customerSave.requestId);
        if (customerSave.ok && customerSave.record) {
          const saved = customerSave.record as ClientRecord;
          setClientRecords((current) => current.some((record) => record.id === saved.id) ? current.map((record) => record.id === saved.id ? saved : record) : [saved, ...current]);
        }
        const result = { ok: customerSave.ok, message: customerSave.message || (customerSave.ok ? 'Cliente salvo no perfil empresarial.' : 'Não foi possível salvar o cliente.') };
        pending.resolve(result);
        setToast(result.message);
        return;
      }
      const supplierSnapshot = parsePartySnapshot(event.data, SUPPLIER_SNAPSHOT_TYPE, 'suppliers');
      if (supplierSnapshot) { if (!supplierSnapshot.ok) { setSupplierRecords([]); setToast(supplierSnapshot.message || 'Não foi possível carregar os fornecedores do perfil.'); return; } setSupplierRecords(supplierSnapshot.records as SupplierRecord[]); return; }
      const supplierSave = parsePartySaveResponse(event.data, SUPPLIER_SAVE_RESPONSE_TYPE);
      if (supplierSave) {
        const pending = pendingSupplierRef.current.get(supplierSave.requestId);
        if (!pending) return;
        window.clearTimeout(pending.timer);
        pendingSupplierRef.current.delete(supplierSave.requestId);
        if (supplierSave.ok && supplierSave.record) {
          const saved = supplierSave.record as SupplierRecord;
          setSupplierRecords((current) => current.some((record) => record.id === saved.id) ? current.map((record) => record.id === saved.id ? saved : record) : [saved, ...current]);
        }
        const result = { ok: supplierSave.ok, message: supplierSave.message || (supplierSave.ok ? 'Fornecedor salvo no perfil empresarial.' : 'Não foi possível salvar o fornecedor.') };
        pending.resolve(result);
        setToast(result.message);
        return;
      }
      if (event.data?.type === OPERATION_SAVE_RESPONSE_TYPE && typeof event.data.requestId === 'string') {
        const pending = pendingOperationSaveRef.current.get(event.data.requestId);
        if (!pending) return;
        window.clearTimeout(pending.timer); pendingOperationSaveRef.current.delete(event.data.requestId);
        if (event.data.ok !== true) {
          setCreated((current) => current.filter((record) => record.id !== pending.recordId || Boolean(record.persistence)));
          setToast(String(event.data.message || 'Não foi possível persistir o documento comercial.'));
          return;
        }
        const persisted = event.data.order || event.data.operation;
        if (persisted?.id) setCreated((current) => current.map((record) => record.id === pending.recordId ? { ...record, id: `${persisted.year}/${persisted.number}`, persistence: { operationId: persisted.id, customerId: persisted.customerId || '', version: Number(persisted.version) || 1, status: String(persisted.status || '') } } : record));
        setToast(String(event.data.message || 'Documento salvo no perfil empresarial.'));
        return;
      }
      if (event.data?.type === OPERATION_SNAPSHOT_TYPE && typeof event.data.ok === 'boolean') {
        if (!event.data.ok || !Array.isArray(event.data.operations)) { setCreated([]); setToast(String(event.data.message || 'Não foi possível carregar os documentos comerciais.')); return; }
        const statusLabel = (value: string): CreatedRecord['status'] => ({ rascunho: 'Rascunho', salvo: 'Salvo', confirmado: 'Confirmado', em_separacao: 'Em separação', faturado: 'Faturado', cancelado: 'Cancelado', devolvido: 'Devolvido', agendado: 'Agendado', em_execucao: 'Em execução', concluido: 'Concluído' } as Record<string, CreatedRecord['status']>)[value] || 'Salvo';
        const records: CreatedRecord[] = event.data.operations.flatMap((operation: any) => {
          if (!operation?.id || !['orcamento', 'pedido', 'ordem_servico'].includes(operation.type)) return [];
          const items = Array.isArray(operation.items) ? operation.items : [];
          const base = { id: `${operation.year}/${operation.number}`, type: operation.type as DocumentType, client: String(operation.customerSnapshot?.displayName || operation.customerSnapshot?.legalName || 'Cliente'), total: Number(operation.total) || 0, createdAt: String(operation.createdAt || new Date().toISOString()), status: statusLabel(String(operation.status || 'salvo')), persistence: { operationId: operation.id, customerId: operation.customerId || '', version: Number(operation.version) || 1, status: String(operation.status || '') } };
          if (operation.type === 'orcamento') return [{ ...base, quote: { number: base.id, validUntil: operation.validityDate ? String(operation.validityDate).split('-').reverse().join('/') : '', company: moduleSettings.company, client: base.client, clientDocument: String(operation.customerSnapshot?.document || ''), clientCity: String(operation.customerSnapshot?.address?.city || ''), items: items.map((line: any) => ({ sku: line.sku, name: line.name, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) - Number(line.discountUnit || 0) })), subtotal: Number(operation.subtotalGross), discount: Number(operation.itemDiscount) + Number(operation.generalDiscount), freight: Number(operation.freight), total: Number(operation.total), notes: String(operation.customerNotes || ''), source: operation.channel === 'servicos' ? 'servicos' : 'vendas' } }];
          if (operation.type === 'pedido') return [{ ...base, order: { lines: items.map((line: any) => ({ catalogItemId: line.productId, sku: line.sku, name: line.name, kind: line.itemType === 'servico' ? 'servico' : 'produto', unit: line.unit, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice), unitDiscount: Number(line.discountUnit), cost: Number(line.costUnitSnapshot || 0) })), commercialTotals: { subtotal: Number(operation.subtotalGross), lineDiscount: Number(operation.itemDiscount), orderDiscount: Number(operation.generalDiscount), freight: Number(operation.freight), insurance: Number(operation.insurance), other: Number(operation.otherExpenses), invoice: Number(operation.total) }, reserveStock: operation.stockStatus !== 'sem_movimentacao', stockState: operation.stockStatus === 'reservado' ? 'Reservado' : operation.stockStatus === 'em_separacao' ? 'Em separação' : operation.stockStatus === 'baixado' ? 'Baixado' : 'Sem movimentação', seller: String(operation.sellerName || ''), fiscalDocument: operation.fiscalDocument || 'nenhum', paymentMethod: String(operation.paymentSnapshot?.method || ''), installments: Number(operation.paymentSnapshot?.installments || 1), firstDueDate: String(operation.paymentSnapshot?.firstDueDate || '') } }];
          const service = operation.serviceOrder || {};
          const scheduled = String(service.scheduledAt || '');
          return [{ ...base, serviceOrder: { lines: items.filter((line: any) => line.itemType === 'servico').map((line: any) => ({ sku: line.sku, name: line.name, kind: 'servico', unit: line.unit, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice), cost: Number(line.costUnitSnapshot || 0), municipalServiceCode: String(line.fiscalSnapshot?.municipalServiceCode || ''), fiscalStatus: line.fiscalReady ? 'Completo' : 'Revisar' })), scheduledDate: scheduled.slice(0, 10), scheduledTime: scheduled.slice(11, 16), durationMinutes: Number(service.expectedDurationMinutes || 60), technician: String(service.technicianName || ''), location: String(service.executionLocation || ''), contactName: String(service.onSiteContact || ''), paymentMethod: String(operation.paymentSnapshot?.method || ''), installments: Number(operation.paymentSnapshot?.installments || 1), firstDueDate: String(operation.paymentSnapshot?.firstDueDate || ''), fiscalDocument: operation.fiscalDocument === 'nfse' ? 'nfse' : 'nenhum', internalNotes: String(operation.internalNotes || ''), customerNotes: String(operation.customerNotes || ''), completionNotes: String(service.completionNotes || ''), startedAt: String(service.startedAt || ''), completedAt: String(service.completedAt || ''), actualDurationMinutes: Number(service.actualDurationMinutes || 0), materials: (Array.isArray(service.materials) ? service.materials : []).map((material: any) => ({ id: String(material.id), catalogItemId: String(material.productId || ''), sku: String(material.sku || ''), name: String(material.name || ''), quantity: Number(material.usedQuantity || material.plannedQuantity || 0), unit: String(material.unit || 'un'), source: material.origin === 'catalogo' ? 'Catálogo' : material.origin === 'cliente' ? 'Cliente' : 'Externo', cost: Number(material.costUnitSnapshot || 0) })), checklist: (Array.isArray(service.checklist) ? service.checklist : []).map((item: any) => ({ id: String(item.id), label: String(item.description || ''), complete: item.completed === true })), attachments: (Array.isArray(service.attachments) ? service.attachments : []).map((item: any) => ({ id: String(item.id), name: String(item.name || ''), type: String(item.type || 'application/octet-stream'), size: Number(item.size || 0), checksum: String(item.checksum || ''), addedAt: String(item.addedAt || '') })), acceptance: { status: service.acceptanceStatus === 'aceito' ? 'Aceito' : service.acceptanceStatus === 'recusado' ? 'Recusado' : 'Pendente', acceptedBy: String(service.acceptedBy || ''), acceptedAt: String(service.acceptedAt || ''), notes: String(service.acceptanceNotes || '') }, materialStockState: operation.stockStatus === 'baixado' ? 'Baixado' : operation.stockStatus === 'devolvido' ? 'Estornado' : operation.stockStatus === 'reservado' ? 'Pendente' : 'Não aplicável', laborCostTotal: Number(service.laborCost || 0), materialCostTotal: Number(service.materialCost || 0), actualCostTotal: Number(service.actualCost || 0) } }];
        });
        setCreated(records.slice(0, 200));
        return;
      }
      const prepared = parseFiscalPrepareResponse(event.data);
      if (prepared) {
        const pending = pendingFiscalPrepareRef.current.get(prepared.requestId);
        if (!pending) return;
        window.clearTimeout(pending.timer);
        pendingFiscalPrepareRef.current.delete(prepared.requestId);
        if (!prepared.ok) {
          setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message: prepared.message } }));
          setToast(prepared.message);
          return;
        }
        if (prepared.emission.draftId !== pending.draftId) {
          const message = 'A resposta fiscal não corresponde ao documento selecionado.';
          setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message } }));
          setToast(message);
          return;
        }
        const now = new Date().toISOString();
        setFiscalDraftRecords((current) => current.map((draft) => draft.id === pending.draftId ? {
          ...draft,
          emissionId: prepared.emission.emissionId,
          remoteState: prepared.emission.state,
          remoteVersion: prepared.emission.version,
          updatedAt: now,
          events: [...draft.events, { date: now, label: prepared.emission.reused ? 'Emissão localizada' : 'Emissão aberta', description: 'Ciclo fiscal aberto em homologação. Os dados ainda não foram validados no XSD; nenhum número foi reservado e nenhuma transmissão foi realizada.', user: 'Sistema' }],
        } : draft));
        const message = prepared.emission.reused ? 'Emissão já existente localizada em homologação.' : 'Emissão fiscal aberta em homologação. Agora valide os dados fiscais.';
        setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message } }));
        setToast(message);
        return;
      }
      const validated = parseFiscalValidateResponse(event.data);
      if (validated) {
        const pending = pendingFiscalValidationRef.current.get(validated.requestId);
        if (!pending) return;
        window.clearTimeout(pending.timer);
        pendingFiscalValidationRef.current.delete(validated.requestId);
        if (!validated.ok) {
          setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message: validated.message } }));
          setToast(validated.message);
          return;
        }
        if (validated.emission.draftId !== pending.draftId) {
          const message = 'A validação fiscal não corresponde ao documento selecionado.';
          setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message } }));
          setToast(message);
          return;
        }
        const now = new Date().toISOString();
        setFiscalDraftRecords((current) => current.map((draft) => draft.id === pending.draftId ? {
          ...draft,
          remoteState: validated.emission.state,
          remoteVersion: validated.emission.version,
          updatedAt: now,
          events: [...draft.events, { date: now, label: validated.emission.reused ? 'Validação fiscal localizada' : 'Dados fiscais validados', description: 'Regra revisada, pré-XML e XSD conferidos. Nenhum número foi reservado; certificado e SEFAZ não foram acessados.', user: 'Sistema' }],
        } : draft));
        const message = validated.emission.reused ? 'A validação fiscal já existente foi localizada.' : 'Dados fiscais validados no XSD, sem reservar número ou transmitir.';
        setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message } }));
        setToast(message);
        return;
      }
      const numbered = parseFiscalNumberResponse(event.data);
      if (numbered) {
        const pending = pendingFiscalNumberRef.current.get(numbered.requestId);
        if (!pending) return;
        window.clearTimeout(pending.timer);
        pendingFiscalNumberRef.current.delete(numbered.requestId);
        if (!numbered.ok) {
          setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message: numbered.message } }));
          setToast(numbered.message);
          return;
        }
        if (numbered.emission.draftId !== pending.draftId) {
          const message = 'A confirmação fiscal não corresponde ao documento selecionado.';
          setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message } }));
          setToast(message);
          return;
        }
        const now = new Date().toISOString();
        setFiscalDraftRecords((current) => current.map((draft) => draft.id === pending.draftId ? {
          ...draft,
          remoteState: numbered.emission.state,
          remoteVersion: numbered.emission.version,
          series: numbered.emission.series,
          number: String(numbered.emission.number),
          updatedAt: now,
          events: [...draft.events, { date: now, label: numbered.emission.reused ? 'Numeração confirmada' : 'Série e número vinculados', description: `NF-e vinculada à série ${numbered.emission.series} e ao número ${numbered.emission.number.toLocaleString('pt-BR')}. Certificado, assinatura e transmissão não foram executados.`, user: 'Sistema' }],
        } : draft));
        const message = `NF-e confirmada com série ${numbered.emission.series} e número ${numbered.emission.number.toLocaleString('pt-BR')}. Certificado e envio permanecem pendentes.`;
        setFiscalPrepareState((current) => ({ ...current, [pending.draftId]: { loading: false, message } }));
        setToast(message);
        return;
      }
      if (applyFiscalIssueResponse(event.data)) return;
      const fiscalDocuments = parseFiscalDocumentsMessage(event.data);
      if (fiscalDocuments) {
        const persisted = fiscalDocuments.documents.map(mapPersistedFiscalDocument);
        setFiscalDraftRecords((current) => [...persisted, ...current.filter((draft) => draft.persistenceSource !== 'server')].slice(0, 100));
        return;
      }
      const connected = parseManagementCatalogMessage(event.data);
      if (!connected) return;
      setManagementCatalogBridge(connected);
      setCatalogRecords(connected.items.map((item) => normalizeCatalogTaxProfile(item) as CatalogItem));
      if (connected.company) setFiscalIssuerRegistry(createFiscalIssuerRegistry(connected.company));
      setModuleSettings((current) => ({
        ...current,
        ...(connected.company ? { company: { ...current.company, ...connected.company } } : {}),
        commercial: { ...current.commercial, reserveStockDefault: connected.stockIntegrated },
      }));
      setToast(connected.catalogAvailable
        ? `${connected.items.length} itens carregados de Custos e Precificação. ${connected.stockIntegrated ? 'Saldos do estoque principal conectados.' : 'Configure o local principal para ativar o estoque.'}`
        : connected.message || 'O perfil empresarial foi carregado, mas o catálogo de Custos está indisponível.');
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: MANAGEMENT_CATALOG_READY_TYPE }, parentOrigin);
    window.parent.postMessage({ type: ACCESS_READY_MESSAGE_TYPE }, parentOrigin);
    window.parent.postMessage({ type: FISCAL_RULES_READY_TYPE }, parentOrigin);
    window.parent.postMessage({ type: RECEIVABLE_READY_TYPE }, parentOrigin);
    window.parent.postMessage({ type: STOCK_READY_TYPE }, parentOrigin);
    window.parent.postMessage({ type: CUSTOMER_READY_TYPE }, parentOrigin);
    window.parent.postMessage({ type: SUPPLIER_READY_TYPE }, parentOrigin);
    window.parent.postMessage({ type: OPERATION_READY_TYPE }, parentOrigin);
    const certificateRequest = createFiscalCertificateStatusRequest({ requestId: `certificate-status:${Date.now()}` });
    if (certificateRequest) window.parent.postMessage(certificateRequest, parentOrigin);
    return () => {
      window.removeEventListener('message', receive);
      setManagementBridgeOrigin('');
      setAccessBridgeState({ integrated: false, available: false, writable: false, loading: false, message: '' });
      setFiscalRulesBridgeState({ integrated: false, available: false, writable: false, loading: false, message: '', configuration: null });
      setFiscalCertificateBridgeState({ integrated: false, available: false, writable: false, loading: false, message: '', certificate: null });
    };
  }, []);

  useEffect(() => () => {
    pendingFiscalPrepareRef.current.forEach((request) => window.clearTimeout(request.timer));
    pendingFiscalPrepareRef.current.clear();
    pendingFiscalValidationRef.current.forEach((request) => window.clearTimeout(request.timer));
    pendingFiscalValidationRef.current.clear();
    pendingFiscalNumberRef.current.forEach((request) => window.clearTimeout(request.timer));
    pendingFiscalNumberRef.current.clear();
    pendingFiscalIssueRef.current.forEach((request) => window.clearTimeout(request.timer));
    pendingFiscalIssueRef.current.clear();
    pendingOrderWorkflowRef.current.forEach((request) => window.clearTimeout(request.timer));
    pendingOrderWorkflowRef.current.clear();
    pendingServiceWorkflowRef.current.forEach((request) => window.clearTimeout(request.timer));
    pendingServiceWorkflowRef.current.clear();
    pendingReceivableRef.current.forEach((pending) => { window.clearTimeout(pending.timer); pending.resolve({ ok: false, message: 'A tela foi encerrada antes da confirmação financeira.' }); });
    pendingReceivableRef.current.clear();
    pendingStockRef.current.forEach((pending) => { window.clearTimeout(pending.timer); pending.resolve({ ok: false, message: 'A tela foi encerrada antes da confirmação do estoque.' }); });
    pendingStockRef.current.clear();
    pendingCustomerRef.current.forEach((pending) => { window.clearTimeout(pending.timer); pending.resolve({ ok: false, message: 'A tela foi encerrada antes da confirmação do cliente.' }); });
    pendingCustomerRef.current.clear();
    pendingSupplierRef.current.forEach((pending) => { window.clearTimeout(pending.timer); pending.resolve({ ok: false, message: 'A tela foi encerrada antes da confirmação do fornecedor.' }); });
    pendingSupplierRef.current.clear();
    pendingOperationSaveRef.current.forEach(({ timer }) => window.clearTimeout(timer));
    pendingOperationSaveRef.current.clear();
    pendingAccessSaveRef.current.forEach((timer) => window.clearTimeout(timer));
    pendingAccessSaveRef.current.clear();
    pendingFiscalRulesSaveRef.current.forEach((timer) => window.clearTimeout(timer));
    pendingFiscalRulesSaveRef.current.clear();
  }, []);

  useEffect(() => {
    if (isIntegratedManagementRuntime()) return;
    try {
      const saved = [CLIENT_STORAGE_KEY, ...CLIENT_LEGACY_STORAGE_KEYS].map((key) => readCompanyStorage(key)).find(Boolean);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; clients?: ClientRecord[] };
      if ((parsed.version === 1 || parsed.version === 2) && Array.isArray(parsed.clients)) {
        const migrated = parsed.clients.map(normalizeClientRecord);
        setClientRecords(migrated);
        if (parsed.version !== 2) writeCompanyStorage(CLIENT_STORAGE_KEY, JSON.stringify({ version: 2, clients: migrated }));
      }
    } catch { /* fallback seguro para dados locais inválidos */ }
  }, []);

  useEffect(() => {
    if (isIntegratedManagementRuntime()) return;
    try {
      const saved = readCompanyStorage(SUPPLIER_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; suppliers?: SupplierRecord[] };
      if (parsed.version === 1 && Array.isArray(parsed.suppliers)) setSupplierRecords(parsed.suppliers.filter((supplier) => supplier && typeof supplier.id === 'string' && typeof supplier.name === 'string'));
    } catch { /* fallback seguro para dados locais inválidos */ }
  }, []);

  useEffect(() => {
    if (isIntegratedManagementRuntime()) return;
    try {
      const saved = readCompanyStorage(STOCK_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; movements?: StockMovementRecord[] };
      if (parsed.version === 1 && Array.isArray(parsed.movements)) setStockMovementRecords(parsed.movements.slice(0, 100));
    } catch { /* fallback seguro para dados locais inválidos */ }
  }, []);

  useEffect(() => {
    if (isIntegratedManagementRuntime()) return;
    try {
      const saved = readCompanyStorage(RECEIVABLE_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; receivables?: ReceivableRecord[] };
      if (parsed.version === 1 && Array.isArray(parsed.receivables)) setReceivableRecords(parsed.receivables.slice(0, 200));
    } catch { /* fallback seguro para dados locais inválidos */ }
  }, []);

  useEffect(() => {
    if (isIntegratedManagementRuntime()) return;
    try {
      const saved = [FISCAL_DRAFT_STORAGE_KEY, ...FISCAL_DRAFT_LEGACY_STORAGE_KEYS].map((key) => readCompanyStorage(key)).find(Boolean);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; drafts?: FiscalDraftRecord[] };
      if ((parsed.version === 1 || parsed.version === 2 || parsed.version === 3 || parsed.version === 4) && Array.isArray(parsed.drafts)) {
        const migrated = parsed.drafts.slice(0, 100).map((draft) => {
          const products = draft.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
          return { ...draft, issuer: draft.issuer, commercialTotals: draft.commercialTotals ?? { products, lineDiscount: 0, orderDiscount: Math.max(0, products - draft.total), discount: Math.max(0, products - draft.total), freight: 0, insurance: 0, other: 0, invoice: draft.total }, paymentMethod: draft.paymentMethod ?? 'Outros', items: draft.items.map((item) => ({ ...item, unitDiscount: item.unitDiscount ?? 0 })), matrixReference: draft.matrixReference ?? '', fiscalRuleId: draft.fiscalRuleId ?? '', fiscalRuleName: draft.fiscalRuleName ?? '', fiscalRuleStatus: draft.fiscalRuleStatus ?? 'Pendente', operationNature: draft.operationNature ?? '', operationContext: draft.operationContext };
        });
        setFiscalDraftRecords((current) => {
          const demo = current.filter((draft) => draft.demoScenario);
          return [...demo, ...migrated.filter((draft) => !draft.demoScenario)].slice(0, 100);
        });
        if (parsed.version !== 4) writeCompanyStorage(FISCAL_DRAFT_STORAGE_KEY, JSON.stringify({ version: 4, drafts: migrated }));
      }
    } catch { /* fallback seguro para dados locais inválidos */ }
  }, []);

  useEffect(() => {
    try {
      const saved = readCompanyStorage(FISCAL_HOMOLOGATION_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; plan?: unknown };
      if (parsed.version === 1) setFiscalHomologationPlan(normalizeFiscalHomologationPlan(parsed.plan, defaultModuleSettings.company));
    } catch { /* plano inválido volta ao roteiro seguro sem evidências inventadas */ }
  }, []);

  useEffect(() => {
    try {
      const saved = readCompanyStorage(FISCAL_INTEGRATION_EVALUATION_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; evaluation?: unknown };
      if (parsed.version === 1) setFiscalIntegrationEvaluation(normalizeFiscalIntegrationEvaluation(parsed.evaluation));
    } catch { /* avaliação inválida volta à matriz neutra sem decisão inventada */ }
  }, []);

  useEffect(() => {
    if (isIntegratedManagementRuntime()) return;
    try {
      const saved = [FISCAL_ISSUER_REGISTRY_STORAGE_KEY, ...FISCAL_ISSUER_REGISTRY_LEGACY_STORAGE_KEYS].map((key) => readCompanyStorage(key)).find(Boolean);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; registry?: unknown };
      if (parsed.version === 1 || parsed.version === 2) {
        const migrated = normalizeFiscalIssuerRegistry(parsed.registry, defaultModuleSettings.company);
        setFiscalIssuerRegistry(migrated);
        if (parsed.version !== 2) writeCompanyStorage(FISCAL_ISSUER_REGISTRY_STORAGE_KEY, JSON.stringify({ version: 2, companyId: defaultModuleSettings.company.document.replace(/\D/g, ''), module: 'vendas-servicos', registry: migrated }));
      }
    } catch { /* cadastro fiscal inválido volta ao estabelecimento demonstrativo */ }
  }, []);

  useEffect(() => {
    try {
      const saved = [NFE_SP_HOMOLOGATION_STORAGE_KEY, ...NFE_SP_HOMOLOGATION_LEGACY_STORAGE_KEYS].map((key) => readCompanyStorage(key)).find(Boolean);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; config?: unknown };
      if (parsed.version === 1 || parsed.version === 2) {
        const migrated = normalizeNfeSpHomologationConfig(parsed.config);
        setNfeSpHomologationConfig(migrated);
        if (parsed.version !== 2) writeCompanyStorage(NFE_SP_HOMOLOGATION_STORAGE_KEY, JSON.stringify({ version: 2, companyId: defaultModuleSettings.company.document.replace(/\D/g, ''), module: 'vendas-servicos', config: migrated }));
      }
    } catch { /* bancada inválida volta ao contrato seguro sem transmissão */ }
  }, []);

  useEffect(() => {
    try {
      const saved = [SETTINGS_STORAGE_KEY, ...SETTINGS_LEGACY_STORAGE_KEYS].map((key) => readCompanyStorage(key)).find(Boolean);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { version?: number; settings?: unknown };
      if ([1, 2, 3, 4, 5, 6, 7, 8].includes(Number(parsed.version))) {
        const savedSettings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings as { access?: { permissionSchemaVersion?: number } } : {};
        const migrated = normalizeModuleSettings(parsed.settings, defaultModuleSettings) as ModuleSettings;
        setModuleSettings(migrated);
        if (parsed.version !== 8 || Number(savedSettings.access?.permissionSchemaVersion) < 3) writeCompanyStorage(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 8, companyId: migrated.company.document.replace(/\D/g, ''), module: 'vendas-servicos', settings: migrated }));
      }
    } catch { /* configurações inválidas voltam ao padrão seguro */ }
  }, []);

  useEffect(() => {
    try {
      const savedSettings = [SETTINGS_STORAGE_KEY, ...SETTINGS_LEGACY_STORAGE_KEYS].map((key) => readCompanyStorage(key)).find(Boolean);
      const parsedSettings = savedSettings ? JSON.parse(savedSettings) as { settings?: unknown } : null;
      const settings = normalizeModuleSettings(parsedSettings?.settings, defaultModuleSettings) as ModuleSettings;
      const series = { nfe: settings.fiscal.nfeSeries, nfce: settings.fiscal.nfceSeries, nfse: settings.fiscal.nfseSeries };
      const saved = readCompanyStorage(FISCAL_NUMBERING_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) as { version?: number; ledger?: unknown } : null;
      const migrated = normalizeFiscalNumberingLedger(parsed?.version === 1 ? parsed.ledger : null, series);
      setFiscalNumberingLedger(migrated);
      if (!saved) writeCompanyStorage(FISCAL_NUMBERING_STORAGE_KEY, JSON.stringify({ version: 1, companyId: settings.company.document.replace(/\D/g, ''), module: 'vendas-servicos', ledger: migrated }));
    } catch { /* numeração inválida volta a uma sequência nova, sem reservas inventadas */ }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!newMenu) return;
    const close = (event: MouseEvent) => { if (!newMenuRef.current?.contains(event.target as Node)) setNewMenu(false); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setNewMenu(false); };
    document.addEventListener('mousedown', close); window.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', key); };
  }, [newMenu]);

  const persistFiscalDrafts = (next: FiscalDraftRecord[]) => {
    const limited = next.slice(0, 100);
    setFiscalDraftRecords(limited);
    writeCompanyStorage(FISCAL_DRAFT_STORAGE_KEY, JSON.stringify({ version: 4, drafts: limited }));
    return limited;
  };
  const persistFiscalNumbering = (ledger: FiscalNumberingLedger, message: string) => {
    if (!authorize('fiscal.configure', 'configurar séries e numeração fiscal')) return false;
    const normalized = normalizeFiscalNumberingLedger(ledger);
    const validation = validateFiscalNumberingLedger(normalized);
    if (!validation.valid) { setToast(validation.errors[0] ?? 'Revise as séries e a numeração fiscal.'); return false; }
    const seriesByType = {
      nfe: fiscalActiveSequence(normalized, 'nfe')?.series ?? moduleSettings.fiscal.nfeSeries,
      nfce: fiscalActiveSequence(normalized, 'nfce')?.series ?? moduleSettings.fiscal.nfceSeries,
      nfse: fiscalActiveSequence(normalized, 'nfse')?.series ?? moduleSettings.fiscal.nfseSeries,
    };
    const nextSettings = normalizeModuleSettings({ ...moduleSettings, fiscal: { ...moduleSettings.fiscal, nfeSeries: seriesByType.nfe, nfceSeries: seriesByType.nfce, nfseSeries: seriesByType.nfse } }, defaultModuleSettings) as ModuleSettings;
    setFiscalNumberingLedger(normalized);
    setModuleSettings(nextSettings);
    writeCompanyStorage(FISCAL_NUMBERING_STORAGE_KEY, JSON.stringify({ version: 1, companyId: nextSettings.company.document.replace(/\D/g, ''), module: 'vendas-servicos', ledger: normalized }));
    writeCompanyStorage(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 8, companyId: nextSettings.company.document.replace(/\D/g, ''), module: 'vendas-servicos', settings: nextSettings }));
    setToast(message);
    return true;
  };
  const saveModuleSettings = (next: ModuleSettings) => {
    if (!authorize('settings.edit', 'editar as configurações do sistema')) return false;
    const candidate = normalizeModuleSettings(next, defaultModuleSettings) as ModuleSettings;
    // No acesso integrado, o cadastro do perfil é a única fonte do emitente.
    // Alterações locais jamais podem substituir razão social, CNPJ ou endereço.
    const normalized = managementBridgeOrigin
      ? { ...candidate, company: moduleSettings.company }
      : candidate;
    setModuleSettings(normalized);
    writeCompanyStorage(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 8, companyId: normalized.company.document.replace(/\D/g, ''), module: 'vendas-servicos', settings: normalized }));
    setToast('Configurações do módulo salvas e aplicadas aos novos lançamentos.');
    return true;
  };
  const saveFiscalMatrix = ({ matrix, taxReviewConfirmed, taxReformReviewConfirmed }: FiscalMatrixSaveInput) => {
    if (!authorize('fiscal.configure', 'configurar a matriz fiscal')) return;
    const normalizedMatrix = normalizeFiscalMatrix(matrix);
    if (managementBridgeOrigin && window.parent !== window) {
      if (!fiscalRulesBridgeState.available || !fiscalRulesBridgeState.writable) {
        setToast(fiscalRulesBridgeState.message || 'A publicação protegida das regras fiscais ainda não está disponível.');
        return;
      }
      const requestId = `fiscal:rules:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
      const request = createFiscalRulesSaveRequest({
        requestId,
        expectedVersion: fiscalRulesBridgeState.configuration?.version ?? 0,
        matrix: normalizedMatrix,
        fiscalResponsible: moduleSettings.fiscal.fiscalResponsible || normalizedMatrix.reviewedBy,
        reviewedAt: normalizedMatrix.reviewedAt,
        taxReviewConfirmed,
        taxReformReviewConfirmed,
      });
      if (!request) { setToast('Não foi possível preparar a publicação das regras fiscais.'); return; }
      const timer = window.setTimeout(() => {
        pendingFiscalRulesSaveRef.current.delete(requestId);
        setFiscalRulesBridgeState((current) => ({ ...current, loading: false, message: 'A Gestão não confirmou a publicação no tempo esperado.' }));
        setToast('A Gestão não confirmou a publicação no tempo esperado.');
      }, 20_000);
      pendingFiscalRulesSaveRef.current.set(requestId, timer);
      setFiscalRulesBridgeState((current) => ({ ...current, loading: true, message: 'Publicando e auditando as regras fiscais…' }));
      window.parent.postMessage(request, managementBridgeOrigin);
      return;
    }
    const next = normalizeModuleSettings({ ...moduleSettings, fiscal: { ...moduleSettings.fiscal, matrix: normalizedMatrix, taxReviewConfirmed, taxReformReviewConfirmed } }, defaultModuleSettings) as ModuleSettings;
    setModuleSettings(next);
    writeCompanyStorage(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 8, companyId: next.company.document.replace(/\D/g, ''), module: 'vendas-servicos', settings: next }));
    setToast('Matriz fiscal salva somente neste navegador demonstrativo.');
  };
  const saveFiscalHomologation = (plan: FiscalHomologationPlan) => {
    if (!authorize('fiscal.homologate', 'gerenciar o plano de homologação fiscal')) return;
    const normalized = normalizeFiscalHomologationPlan(plan, moduleSettings.company);
    const validation = validateFiscalHomologationPlan(normalized);
    if (!validation.valid) { setToast(validation.errors[0] ?? 'Revise os bloqueios do plano de homologação.'); return; }
    setFiscalHomologationPlan(normalized);
    writeCompanyStorage(FISCAL_HOMOLOGATION_STORAGE_KEY, JSON.stringify({ version: 1, companyId: moduleSettings.company.document.replace(/\D/g, ''), module: 'vendas-servicos', plan: normalized }));
    setToast(validation.externallyValidated ? 'Ciclo de homologação registrado com todas as evidências obrigatórias.' : 'Plano de homologação salvo localmente. Nenhum dado foi transmitido.');
  };
  const saveFiscalIntegrationEvaluation = (evaluation: FiscalIntegrationEvaluation) => {
    if (!authorize('fiscal.homologate', 'gerenciar a avaliação da integração fiscal')) return;
    const normalized = normalizeFiscalIntegrationEvaluation(evaluation);
    const validation = validateFiscalIntegrationEvaluation(normalized);
    if (!validation.valid) { setToast(validation.errors[0] ?? 'Revise os bloqueios da avaliação fiscal.'); return; }
    setFiscalIntegrationEvaluation(normalized);
    writeCompanyStorage(FISCAL_INTEGRATION_EVALUATION_STORAGE_KEY, JSON.stringify({ version: 1, companyId: moduleSettings.company.document.replace(/\D/g, ''), module: 'vendas-servicos', evaluation: normalized }));
    setToast(validation.approvedForHomologation ? 'Alternativa aprovada somente para a fase de homologação.' : 'Avaliação fiscal salva localmente. Nenhuma contratação foi realizada.');
  };
  const saveFiscalIssuerRegistry = (registry: FiscalIssuerRegistry) => {
    if (!authorize('fiscal.configure', 'configurar os estabelecimentos emissores')) return;
    const normalized = normalizeFiscalIssuerRegistry(registry, moduleSettings.company);
    const validation = validateFiscalIssuerRegistry(normalized, moduleSettings.company);
    if (!validation.valid) { setToast(validation.errors[0] ?? 'Revise o cadastro dos estabelecimentos emissores.'); return; }
    setFiscalIssuerRegistry(normalized);
    writeCompanyStorage(FISCAL_ISSUER_REGISTRY_STORAGE_KEY, JSON.stringify({ version: 2, companyId: moduleSettings.company.document.replace(/\D/g, ''), module: 'vendas-servicos', registry: normalized }));
    setToast('Estabelecimentos e rotas salvos localmente. Nenhuma conexão fiscal foi realizada.');
  };
  const saveNfeSpHomologationConfig = (config: NfeSpHomologationConfig) => {
    if (!authorize('fiscal.homologate', 'gerenciar a bancada de homologação da NF-e de São Paulo')) return;
    const normalized = normalizeNfeSpHomologationConfig(config);
    setNfeSpHomologationConfig(normalized);
    writeCompanyStorage(NFE_SP_HOMOLOGATION_STORAGE_KEY, JSON.stringify({ version: 2, companyId: moduleSettings.company.document.replace(/\D/g, ''), module: 'vendas-servicos', config: normalized }));
    const nfeRules = moduleSettings.fiscal.matrix.rules.filter((rule) => rule.active && rule.documentType === 'nfe');
    const matrixReady = Boolean(moduleSettings.fiscal.matrix.reviewedBy && moduleSettings.fiscal.matrix.reviewedAt && nfeRules.length && nfeRules.every((rule) => rule.reviewed));
    const evaluation = evaluateNfeSpHomologationConfig(normalized, { issuerRegistry: fiscalIssuerRegistry, company: moduleSettings.company, drafts: fiscalDraftRecords, fiscalResponsible: moduleSettings.fiscal.fiscalResponsible, taxReviewConfirmed: moduleSettings.fiscal.taxReviewConfirmed, taxReformReviewConfirmed: moduleSettings.fiscal.taxReformReviewConfirmed, matrixReady });
    setToast(evaluation.localDiagnosticPassed ? 'Bancada NF-e/SP salva com pré-requisitos locais completos. A transmissão continua bloqueada.' : 'Bancada NF-e/SP salva localmente com pendências. Nenhum dado foi transmitido.');
  };
  const saveAccessSettings = (next: ModuleSettings) => {
    if (!authorize('access.manage', 'gerenciar perfis e exceções de acesso')) return;
    const normalized = normalizeModuleSettings(next, defaultModuleSettings) as ModuleSettings;
    if (managementBridgeOrigin && window.parent !== window) {
      if (!accessBridgeState.available || !accessBridgeState.writable) {
        setToast(accessBridgeState.message || 'A gravação de permissões não está habilitada neste laboratório.');
        return;
      }
      const requestId = `access:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
      const request = createAccessSaveRequest({ requestId, currentAccess: moduleSettings.access, nextAccess: normalized.access });
      if (!request) { setToast('Não foi possível preparar a alteração de permissões.'); return; }
      if (!request.changes.length) { setToast('Nenhuma alteração de acesso foi encontrada.'); return; }
      const timer = window.setTimeout(() => {
        pendingAccessSaveRef.current.delete(requestId);
        setAccessBridgeState((current) => ({ ...current, loading: false, message: 'A Gestão não confirmou a gravação no tempo esperado.' }));
        setToast('A Gestão não confirmou a gravação no tempo esperado.');
      }, 20_000);
      pendingAccessSaveRef.current.set(requestId, timer);
      setAccessBridgeState((current) => ({ ...current, loading: true, message: 'Salvando e auditando as permissões…' }));
      window.parent.postMessage(request, managementBridgeOrigin);
      return;
    }
    setModuleSettings(normalized);
    writeCompanyStorage(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 8, companyId: normalized.company.document.replace(/\D/g, ''), module: 'vendas-servicos', settings: normalized }));
    setToast('Controle de acesso salvo somente neste navegador demonstrativo.');
  };
  const fiscalItemsForOrigin = (origin: FiscalOrigin, localRecord?: CreatedRecord) => {
    if (localRecord?.order) return localRecord.order.lines.map((line) => {
      const catalogItem = catalogRecords.find((item) => item.sku === line.sku);
      return {
        sku: line.sku,
        name: line.name,
        kind: line.kind,
        unit: line.unit,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        unitDiscount: line.unitDiscount,
        taxableUnit: catalogItem?.taxableUnit ?? line.unit,
        fiscalBenefitCode: catalogItem?.fiscalBenefitCode ?? '',
        ncm: catalogItem?.ncm ?? '',
        cest: catalogItem?.cest ?? '',
        municipalServiceCode: catalogItem?.municipalServiceCode ?? '',
        nationalServiceCode: catalogItem?.nationalServiceCode ?? '',
        nbs: catalogItem?.nbs ?? '',
        issRate: catalogItem?.issRate ?? 0,
        serviceIncidenceMode: catalogItem?.serviceIncidenceMode ?? 'Definir por operação',
        fiscalOriginCode: catalogItem?.fiscalOriginCode ?? '',
        cfopInternal: origin.documentType === 'nfe' && catalogItem?.nfeOverrideEnabled ? catalogItem.nfeCfopInternal : origin.documentType === 'nfce' && catalogItem?.nfceOverrideEnabled ? catalogItem.nfceCfop : catalogItem?.cfopInternal ?? '',
        cfopInterstate: origin.documentType === 'nfe' && catalogItem?.nfeOverrideEnabled ? catalogItem.nfeCfopInterstate : catalogItem?.cfopInterstate ?? '',
        icmsCode: origin.documentType === 'nfe' && catalogItem?.nfeOverrideEnabled ? catalogItem.nfeIcmsCode : origin.documentType === 'nfce' && catalogItem?.nfceOverrideEnabled ? catalogItem.nfceIcmsCode : catalogItem?.icmsCode ?? '',
        pisCst: origin.documentType === 'nfe' && catalogItem?.nfeOverrideEnabled ? catalogItem.nfePisCst || catalogItem.pisCst : origin.documentType === 'nfce' && catalogItem?.nfceOverrideEnabled ? catalogItem.nfcePisCst || catalogItem.pisCst : catalogItem?.pisCst ?? '',
        cofinsCst: origin.documentType === 'nfe' && catalogItem?.nfeOverrideEnabled ? catalogItem.nfeCofinsCst || catalogItem.cofinsCst : origin.documentType === 'nfce' && catalogItem?.nfceOverrideEnabled ? catalogItem.nfceCofinsCst || catalogItem.cofinsCst : catalogItem?.cofinsCst ?? '',
        ipiCst: catalogItem?.ipiApplicable ? catalogItem.ipiCst : '',
        ipiLegalCode: catalogItem?.ipiApplicable ? catalogItem.ipiLegalCode : '',
        stBaseMode: catalogItem?.stApplicable ? catalogItem.stBaseMode : '',
        stIcmsRate: catalogItem?.stApplicable ? catalogItem.stIcmsRate : 0,
        ibsCbsCst: catalogItem?.ibsCbsCst ?? '',
        ibsCbsClassification: catalogItem?.ibsCbsClassification ?? '',
        ibsCbsOperationIndicator: catalogItem?.ibsCbsOperationIndicator ?? '',
        fiscalStatus: catalogItem?.fiscal ?? 'Revisar classificação',
      } satisfies FiscalDraftItem;
    });
    if (localRecord?.serviceOrder) return localRecord.serviceOrder.lines.map((line) => {
      const catalogItem = catalogRecords.find((item) => item.sku === line.sku);
      return {
        sku: line.sku,
        name: line.name,
        kind: line.kind,
        unit: line.unit,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        unitDiscount: 0,
        taxableUnit: line.unit,
        fiscalBenefitCode: '',
        ncm: '',
        cest: '',
        municipalServiceCode: line.municipalServiceCode,
        nationalServiceCode: catalogItem?.nationalServiceCode ?? '',
        nbs: catalogItem?.nbs ?? '',
        issRate: catalogItem?.issRate ?? 0,
        serviceIncidenceMode: catalogItem?.serviceIncidenceMode ?? 'Definir por operação',
        fiscalOriginCode: '',
        cfopInternal: '',
        cfopInterstate: '',
        icmsCode: '',
        pisCst: catalogItem?.pisCst ?? '',
        cofinsCst: catalogItem?.cofinsCst ?? '',
        ipiCst: '',
        ipiLegalCode: '',
        stBaseMode: '',
        stIcmsRate: 0,
        ibsCbsCst: catalogItem?.ibsCbsCst ?? '',
        ibsCbsClassification: catalogItem?.ibsCbsClassification ?? '',
        ibsCbsOperationIndicator: catalogItem?.ibsCbsOperationIndicator ?? '',
        fiscalStatus: line.fiscalStatus,
      } satisfies FiscalDraftItem;
    });
    return [{ sku: origin.id, name: origin.item, kind: origin.documentType === 'nfse' ? 'servico' : 'produto', unit: 'un', quantity: 1, unitPrice: origin.total, unitDiscount: 0, taxableUnit: 'un', fiscalBenefitCode: '', ncm: '', cest: '', municipalServiceCode: '', nationalServiceCode: '', nbs: '', issRate: 0, serviceIncidenceMode: 'Definir por operação', fiscalOriginCode: '', cfopInternal: '', cfopInterstate: '', icmsCode: '', pisCst: '', cofinsCst: '', ipiCst: '', ipiLegalCode: '', stBaseMode: '', stIcmsRate: 0, ibsCbsCst: '', ibsCbsClassification: '', ibsCbsOperationIndicator: '', fiscalStatus: 'Revisar classificação' } satisfies FiscalDraftItem];
  };
  const commercialSnapshotForOrigin = (origin: FiscalOrigin, localRecord?: CreatedRecord) => {
    if (localRecord?.order) {
      const products = localRecord.order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
      const lineDiscount = localRecord.order.lines.reduce((sum, line) => sum + line.quantity * Math.min(line.unitPrice, Math.max(0, line.unitDiscount || 0)), 0);
      return {
        totals: localRecord.order.commercialTotals ?? { products, lineDiscount, orderDiscount: Math.max(0, products - lineDiscount - localRecord.total), discount: Math.max(0, products - localRecord.total), freight: 0, insurance: 0, other: 0, invoice: localRecord.total },
        paymentMethod: localRecord.order.paymentMethod,
      };
    }
    if (localRecord?.serviceOrder) {
      const products = localRecord.serviceOrder.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
      return { totals: { products, lineDiscount: 0, orderDiscount: 0, discount: 0, freight: 0, insurance: 0, other: 0, invoice: localRecord.total }, paymentMethod: localRecord.serviceOrder.paymentMethod };
    }
    return { totals: { products: origin.total, lineDiscount: 0, orderDiscount: 0, discount: 0, freight: 0, insurance: 0, other: 0, invoice: origin.total }, paymentMethod: 'Outros' };
  };
  const issuerSelectionForOrigin = (origin: FiscalOrigin, localRecord?: CreatedRecord, priorIssuer?: FiscalIssuerSelectionSnapshot) => {
    const operationIssuer = localRecord?.order?.fiscalIssuer ?? localRecord?.serviceOrder?.fiscalIssuer;
    const selectedIssuer = priorIssuer ?? operationIssuer;
    const selection = resolveFiscalIssuerSelection(fiscalIssuerRegistry, origin.documentType, selectedIssuer?.establishmentId ?? '', moduleSettings.company);
    if (priorIssuer && selection.snapshot) return selection;
    const frozenIssuer = operationIssuer ?? priorIssuer;
    return frozenIssuer ? { ...selection, snapshot: frozenIssuer, warnings: frozenIssuer.routeBlockers } : selection;
  };
  const evaluateFiscalDraft = (origin: FiscalOrigin, sourceItems: FiscalDraftItem[], issuerSelection: ReturnType<typeof resolveFiscalIssuerSelection>) => {
    const client = clientRecords.find((record) => record.name === origin.client);
    const issuer = issuerSelection.snapshot;
    const context = fiscalOperationContext(origin, client, moduleSettings.company, issuer);
    const matrixResolution = resolveFiscalMatrixRule({ matrix: moduleSettings.fiscal.matrix, documentType: origin.documentType, ...context });
    const matrixRule = matrixResolution.rule;
    const requirements = [
      matrixRule?.requiresStateRegistration && !client?.stateRegistration ? 'inscrição estadual do destinatário' : '',
      matrixRule?.requiresMunicipalIncidence && !client?.city ? 'município de incidência do serviço' : '',
    ].filter(Boolean);
    const requirementsMet = requirements.length === 0;
    const items = sourceItems.map((item) => {
      if (!matrixResolution.reviewed || !matrixRule) return item;
      if (item.kind === 'servico' && matrixRule.serviceIncidenceMode && !['Herdar do serviço', 'Não aplicável'].includes(matrixRule.serviceIncidenceMode)) return { ...item, serviceIncidenceMode: matrixRule.serviceIncidenceMode };
      if (item.kind === 'produto' && matrixRule.cfopOverride) return context.destination === 'Fora da UF' ? { ...item, cfopInterstate: matrixRule.cfopOverride } : { ...item, cfopInternal: matrixRule.cfopOverride };
      return item;
    });
    const baseValidation = validateFiscalDraft({
      documentType: origin.documentType,
      recipient: { name: origin.client, document: client?.document ?? '', city: client?.city ?? '' },
      items,
      config: { ...fiscalConfigForIssuer(moduleSettings, issuer, fiscalCertificateBridgeState.certificate), fiscalMatrixRuleMatched: matrixResolution.matched, fiscalMatrixRuleReviewed: matrixResolution.reviewed, fiscalMatrixRuleName: matrixRule?.name ?? '', fiscalMatrixRequirementsMet: requirementsMet, fiscalMatrixRuleDetail: !matrixResolution.matched ? matrixResolution.reason : !matrixResolution.reviewed ? `${matrixRule?.name} ainda depende de revisão fiscal` : requirementsMet ? `${matrixRule?.name} revisada e correspondente ao contexto` : `${matrixRule?.name}: informe ${requirements.join(' e ')}` },
    });
    const issuerSelected = issuerSelection.valid && Boolean(issuer);
    const issuerRouteReady = issuerSelected && Boolean(issuer?.routeReadyForHomologation);
    const checks: FiscalDraftCheck[] = [
      ...baseValidation.checks,
      { key: 'issuer-selection', label: 'Estabelecimento emissor', ready: issuerSelected, detail: issuer ? `${issuer.label} · ${formatCnpj(issuer.document)} · ${issuer.city}/${issuer.uf}` : issuerSelection.errors[0] ?? 'Selecione o estabelecimento emissor.', scope: 'cadastro' },
      { key: 'issuer-route', label: 'Credenciamento e rota do emissor', ready: issuerRouteReady, detail: issuer ? `${issuer.authorityRoute} · série ${issuer.series || 'pendente'}${issuer.routeBlockers[0] ? ` · ${issuer.routeBlockers[0]}` : ''}` : 'A rota depende do estabelecimento emissor.', scope: 'transmissao' },
    ];
    const validation = {
      ...baseValidation,
      draftReady: baseValidation.draftReady && issuerSelected,
      transmissionReady: baseValidation.transmissionReady && issuerRouteReady,
      checks,
      errors: [...new Set([...baseValidation.errors, ...issuerSelection.errors])],
      warnings: [...new Set([...baseValidation.warnings, ...issuerSelection.warnings])],
    };
    return {
      client,
      items,
      issuer,
      matrixResolution,
      requirementsMet,
      validation,
    };
  };
  const ensureFiscalDraft = (origin: FiscalOrigin) => {
    const existing = fiscalDraftRecords.find((draft) => draft.originId === origin.id);
    if (existing) return existing;
    const localRecord = created.find((record) => record.id === origin.id);
    const sourceItems = fiscalItemsForOrigin(origin, localRecord);
    const commercialSnapshot = commercialSnapshotForOrigin(origin, localRecord);
    const issuerSelection = issuerSelectionForOrigin(origin, localRecord);
    const { client, items, issuer, validation, matrixResolution } = evaluateFiscalDraft(origin, sourceItems, issuerSelection);
    const profile = getFiscalDocumentProfile(origin.documentType);
    const now = new Date().toISOString();
    const draft: FiscalDraftRecord = {
      id: `FIS-${Date.now().toString().slice(-6)}`,
      originId: origin.id,
      sourceLabel: origin.sourceLabel,
      documentType: origin.documentType,
      client: origin.client,
      clientDocument: client?.document ?? '',
      clientCity: client?.city ?? '',
      total: origin.total,
      commercialTotals: commercialSnapshot.totals,
      paymentMethod: commercialSnapshot.paymentMethod,
      environment: 'Homologação local',
      series: issuer?.series || (origin.documentType === 'nfe' ? moduleSettings.fiscal.nfeSeries : origin.documentType === 'nfce' ? moduleSettings.fiscal.nfceSeries : moduleSettings.fiscal.nfseSeries),
      number: 'Não atribuído',
      key: 'Não gerada',
      issuer,
      schemaReference: profile.payload,
      authorityRoute: issuer?.authorityRoute ?? (origin.documentType === 'nfse' ? moduleSettings.fiscal.nfseAuthorityMode : profile.authority),
      fiscalResponsible: moduleSettings.fiscal.fiscalResponsible,
      taxReformStatus: moduleSettings.fiscal.taxReformReviewConfirmed ? 'Revisado' : 'Pendente',
      contingencyPlan: issuer?.contingency ?? moduleSettings.fiscal.contingencyPlan,
      matrixReference: matrixResolution.matrixReference,
      fiscalRuleId: matrixResolution.rule?.id ?? '',
      fiscalRuleName: matrixResolution.rule?.name ?? '',
      fiscalRuleStatus: !matrixResolution.matched ? 'Sem correspondência' : matrixResolution.reviewed ? 'Revisada' : 'Pendente',
      operationNature: matrixResolution.rule?.operationNature ?? '',
      operationContext: matrixResolution.context,
      status: validation.transmissionReady ? 'Pronto para homologação' : validation.draftReady ? 'Bloqueado para transmissão' : 'Com pendências',
      createdAt: now,
      updatedAt: now,
      items,
      checks: validation.checks,
      warnings: validation.warnings,
      events: [{ date: now, label: 'Rascunho criado', description: `Origem ${origin.sourceLabel.toLocaleLowerCase('pt-BR')} ${origin.id} vinculada. A nota ainda não foi emitida.`, user: localRecord?.order?.seller ?? localRecord?.serviceOrder?.technician ?? activeUser?.name ?? 'Sistema' }],
    };
    persistFiscalDrafts([draft, ...fiscalDraftRecords]);
    return draft;
  };
  const revalidateFiscalDraft = (draft: FiscalDraftRecord) => {
    if (!authorize('fiscal.prepare', 'preparar documentos fiscais')) return;
    const localRecord = created.find((record) => record.id === draft.originId);
    const origin: FiscalOrigin = { id: draft.originId, client: draft.client, item: draft.items.map((item) => item.name).join(', '), total: draft.total, documentType: draft.documentType, sourceLabel: draft.sourceLabel };
    const sourceItems = fiscalItemsForOrigin(origin, localRecord);
    const commercialSnapshot = commercialSnapshotForOrigin(origin, localRecord);
    const issuerSelection = issuerSelectionForOrigin(origin, localRecord, draft.issuer);
    const { client, items, issuer, validation, matrixResolution } = evaluateFiscalDraft(origin, sourceItems, issuerSelection);
    const profile = getFiscalDocumentProfile(draft.documentType);
    const now = new Date().toISOString();
    const nextDraft: FiscalDraftRecord = { ...draft, clientDocument: client?.document ?? draft.clientDocument, clientCity: client?.city ?? draft.clientCity, commercialTotals: commercialSnapshot.totals, paymentMethod: commercialSnapshot.paymentMethod, issuer: issuer ?? draft.issuer, series: issuer?.series || draft.series, schemaReference: profile.payload, authorityRoute: issuer?.authorityRoute ?? draft.authorityRoute, fiscalResponsible: moduleSettings.fiscal.fiscalResponsible, taxReformStatus: moduleSettings.fiscal.taxReformReviewConfirmed ? 'Revisado' : 'Pendente', contingencyPlan: issuer?.contingency ?? draft.contingencyPlan, matrixReference: matrixResolution.matrixReference, fiscalRuleId: matrixResolution.rule?.id ?? '', fiscalRuleName: matrixResolution.rule?.name ?? '', fiscalRuleStatus: !matrixResolution.matched ? 'Sem correspondência' : matrixResolution.reviewed ? 'Revisada' : 'Pendente', operationNature: matrixResolution.rule?.operationNature ?? '', operationContext: matrixResolution.context, items, checks: validation.checks, warnings: validation.warnings, status: validation.transmissionReady ? 'Pronto para homologação' : validation.draftReady ? 'Bloqueado para transmissão' : 'Com pendências', updatedAt: now, events: [...draft.events, { date: now, label: 'Conferência atualizada', description: validation.draftReady ? 'Dados da empresa, cliente e itens conferidos. A emissão permanece aguardando as demais liberações.' : 'Existem pendências que impedem concluir a preparação do documento.', user: activeUser?.name ?? 'Sistema' }] };
    persistFiscalDrafts(fiscalDraftRecords.map((record) => record.id === draft.id ? nextDraft : record));
    setToast(`Conferência fiscal atualizada para ${draft.originId}.`);
  };
  const cancelFiscalDraft = (draft: FiscalDraftRecord, reason = 'Rascunho cancelado antes da emissão da nota fiscal.') => {
    if (!authorize('fiscal.cancel', 'cancelar documentos fiscais')) return;
    if (draft.status === 'Cancelado') return;
    const now = new Date().toISOString();
    const next = fiscalDraftRecords.map((record) => record.id === draft.id ? { ...record, status: 'Cancelado' as const, updatedAt: now, events: [...record.events, { date: now, label: 'Rascunho cancelado', description: reason, user: activeUser?.name ?? 'Sistema' }] } : record);
    persistFiscalDrafts(next);
    setToast(`Rascunho fiscal de ${draft.originId} cancelado.`);
  };
  const cancelOrderFiscalDraft = (record: CreatedRecord, reason: string) => {
    const draft = fiscalDraftRecords.find((item) => item.originId === record.id && item.status !== 'Cancelado');
    if (!draft) return 0;
    cancelFiscalDraft(draft, reason);
    return 1;
  };

  const navigate = (next: View) => { const required = viewPermission[next]; if (required && !authorize(required, `acessar ${viewInfo[next].title.toLocaleLowerCase('pt-BR')}`)) return; if (next !== 'fiscal') setFiscalOrigin(null); if (next === 'recebimentos') setReceivableOrigin(''); if (next === 'estoque') setStockOrigin(''); setView(next); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openReceivables = (origin: string) => { if (!authorize('receivables.view', 'consultar recebimentos')) return; setFiscalOrigin(null); setReceivableOrigin(origin); setView('recebimentos'); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openStockMovements = (origin: string) => { if (!authorize('stock.view', 'consultar movimentações de estoque')) return; setFiscalOrigin(null); setStockOrigin(origin); setView('estoque'); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const startFiscal = (origin: FiscalOrigin) => {
    if (!authorize('fiscal.prepare', 'preparar documentos fiscais')) return;
    setNewMenu(false);
    const existing = fiscalDraftRecords.find((draft) => draft.originId === origin.id);
    ensureFiscalDraft(origin);
    setFiscalOrigin(origin);
    setView('fiscal');
    setNewType(null);
    setToast(existing ? `Rascunho fiscal de ${origin.id} aberto sem criar duplicidade.` : `Rascunho fiscal criado para ${origin.id}. Nenhuma transmissão foi realizada.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const preparePersistedFiscalEmission = (draft: FiscalDraftRecord) => {
    if (!authorize('fiscal.prepare', 'preparar a emissão fiscal')) return;
    if (draft.persistenceSource !== 'server' || draft.documentType !== 'nfe' || draft.emissionId) {
      setToast(draft.emissionId ? 'Esta emissão fiscal já foi aberta.' : 'Somente rascunhos persistidos de NF-e podem iniciar esta etapa.');
      return;
    }
    if (!managementBridgeOrigin || window.parent === window) {
      setToast('Abra o módulo pela Gestão para abrir a emissão com a sessão autenticada.');
      return;
    }
    const requestId = `prepare:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    const message = createFiscalPrepareRequest({ requestId, draftId: draft.id });
    if (!message) { setToast('Atualize a Central Fiscal e tente novamente.'); return; }
    setFiscalPrepareState((current) => ({ ...current, [draft.id]: { loading: true, message: 'Abrindo a emissão fiscal em homologação…' } }));
    const timer = window.setTimeout(() => {
      pendingFiscalPrepareRef.current.delete(requestId);
      setFiscalPrepareState((current) => ({ ...current, [draft.id]: { loading: false, message: 'A preparação demorou mais que o esperado. Tente novamente.' } }));
    }, 12_000);
    pendingFiscalPrepareRef.current.set(requestId, { draftId: draft.id, timer });
    window.parent.postMessage(message, managementBridgeOrigin);
  };
  const validatePersistedFiscalEmission = (draft: FiscalDraftRecord) => {
    if (!authorize('fiscal.prepare', 'validar os dados fiscais')) return;
    if (draft.persistenceSource !== 'server' || draft.documentType !== 'nfe' || !draft.emissionId) {
      setToast('Abra primeiro a emissão fiscal persistida da NF-e.');
      return;
    }
    if (!managementBridgeOrigin || window.parent === window) {
      setToast('Abra o módulo pela Gestão para validar a NF-e com a sessão autenticada.');
      return;
    }
    const requestId = `validate:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    const message = createFiscalValidateRequest({ requestId, draftId: draft.id });
    if (!message) { setToast('Atualize a Central Fiscal e tente novamente.'); return; }
    setFiscalPrepareState((current) => ({ ...current, [draft.id]: { loading: true, message: 'Aplicando a regra fiscal e validando o pré-XML…' } }));
    const timer = window.setTimeout(() => {
      pendingFiscalValidationRef.current.delete(requestId);
      setFiscalPrepareState((current) => ({ ...current, [draft.id]: { loading: false, message: 'A validação demorou mais que o esperado. Tente novamente.' } }));
    }, 12_000);
    pendingFiscalValidationRef.current.set(requestId, { draftId: draft.id, timer });
    window.parent.postMessage(message, managementBridgeOrigin);
  };
  const reservePersistedFiscalNumber = (draft: FiscalDraftRecord, expectedVersion: number) => {
    if (!authorize('fiscal.issue', 'confirmar a emissão da NF-e')) return;
    if (draft.persistenceSource !== 'server' || draft.documentType !== 'nfe' || !draft.emissionId || draft.remoteState !== 'prepared') {
      setToast('Abra e valide primeiro a emissão fiscal da NF-e.');
      return;
    }
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || draft.remoteVersion !== expectedVersion) {
      setToast('A situação fiscal mudou. Atualize a Central Fiscal antes de confirmar.');
      return;
    }
    if (!managementBridgeOrigin || window.parent === window) {
      setToast('Abra o módulo pela Gestão para confirmar a NF-e com a sessão autenticada.');
      return;
    }
    const requestId = `number:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    const message = createFiscalNumberRequest({ requestId, emissionId: draft.emissionId, expectedVersion });
    if (!message) { setToast('Atualize a Central Fiscal e tente novamente.'); return; }
    setFiscalPrepareState((current) => ({ ...current, [draft.id]: { loading: true, message: 'Confirmando série e número da NF-e…' } }));
    const timer = window.setTimeout(() => {
      pendingFiscalNumberRef.current.delete(requestId);
      setFiscalPrepareState((current) => ({ ...current, [draft.id]: { loading: false, message: 'A confirmação demorou mais que o esperado. Atualize e tente novamente.' } }));
    }, 20_000);
    pendingFiscalNumberRef.current.set(requestId, { draftId: draft.id, timer });
    window.parent.postMessage(message, managementBridgeOrigin);
  };
  const continuePersistedFiscalEmission = (draft: FiscalDraftRecord, expectedVersion: number) => {
    if (!authorize('fiscal.issue', 'continuar a emissão da NF-e')) return;
    if (draft.persistenceSource !== 'server' || draft.documentType !== 'nfe' || !draft.emissionId || !['number_reserved', 'signed'].includes(draft.remoteState ?? '')) {
      setToast('Confirme primeiro a série e o número da NF-e.');
      return;
    }
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || draft.remoteVersion !== expectedVersion) {
      setToast('A situação fiscal mudou. Atualize a Central Fiscal antes de continuar.');
      return;
    }
    if (!managementBridgeOrigin || window.parent === window) {
      setToast('Abra o módulo pela Gestão para continuar a NF-e com a sessão autenticada.');
      return;
    }
    const requestId = `issue:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    const message = createFiscalIssueRequest({ requestId, emissionId: draft.emissionId, expectedVersion });
    if (!message) { setToast('Atualize a Central Fiscal e tente novamente.'); return; }
    setFiscalPrepareState((current) => ({ ...current, [draft.id]: { loading: true, message: 'Conferindo, assinando e enviando a NF-e…' } }));
    const timer = window.setTimeout(() => {
      pendingFiscalIssueRef.current.delete(requestId);
      setFiscalPrepareState((current) => ({ ...current, [draft.id]: { loading: false, message: 'A emissão demorou mais que o esperado. Atualize a situação antes de tentar novamente.' } }));
    }, 30_000);
    pendingFiscalIssueRef.current.set(requestId, { draftId: draft.id, timer });
    const responseChannel = new MessageChannel();
    responseChannel.port1.onmessage = (event) => {
      applyFiscalIssueResponse(event.data);
      responseChannel.port1.close();
    };
    responseChannel.port1.start();
    window.parent.postMessage(message, managementBridgeOrigin, [responseChannel.port2]);
  };
  const openQuote = (source: 'vendas' | 'servicos') => {
    if (!authorize(source === 'servicos' ? 'services.create' : 'sales.create', 'criar orçamentos')) return;
    setNewMenu(false);
    setNewType(null);
    setCommercialClient('');
    setCommercialSku('');
    setCommercialReturnView(source);
    setQuoteSource(source);
    setView('novo_orcamento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openCosts = (newProduct = false) => {
    const companyId = managementCatalogBridge?.companyId || new URLSearchParams(window.location.search).get('empresaId') || '';
    if (!companyId) {
      setToast('Selecione um perfil empresarial na Gestão antes de abrir Custos e Precificação.');
      return;
    }
    const destination = `/custos?empresaId=${encodeURIComponent(companyId)}${newProduct ? '&novo=produto' : ''}&retorno=vendas`;
    window.top?.location.assign(destination);
  };
  const openNew = (type: NewActionType) => {
    setNewMenu(false);
    const required = newPermission[type];
    const actionLabel = type === 'cliente' ? 'cliente' : type === 'fornecedor' ? 'fornecedor' : type === 'produto' ? 'produto' : documentLabel(type).toLocaleLowerCase('pt-BR');
    if (required && !authorize(required, `criar ${actionLabel}`)) return;
    if (type === 'cliente') { setClientCreateOpen(true); return; }
    if (type === 'fornecedor') { setSupplierCreateOpen(true); return; }
    if (type === 'produto') {
      openCosts(true);
      return;
    }
    if (type === 'pedido') { setNewType(null); setCommercialClient(''); setCommercialSku(''); setCommercialReturnView('vendas'); setView('novo_pedido'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (type === 'orcamento') { openQuote('vendas'); return; }
    if (type === 'ordem_servico') { setNewType(null); setServiceClient(''); setServiceSku(''); setServiceReturnView('servicos'); setView('nova_ordem_servico'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (type === 'nfe' || type === 'nfce' || type === 'nfse') setFiscalOrigin(null);
    setNewType(type);
  };
  const openClientOrder = (client: ClientRecord) => {
    if (!authorize('sales.create', 'criar pedidos')) return;
    setNewMenu(false);
    setNewType(null);
    setCommercialClient(client.name);
    setCommercialSku('');
    setCommercialReturnView('clientes');
    setView('novo_pedido');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openClientQuote = (client: ClientRecord) => {
    if (!authorize('sales.create', 'criar orçamentos')) return;
    setNewMenu(false);
    setNewType(null);
    setCommercialClient(client.name);
    setCommercialSku('');
    setCommercialReturnView('clientes');
    setQuoteSource('vendas');
    setView('novo_orcamento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openClientService = (client: ClientRecord) => {
    if (!authorize('services.create', 'criar ordens de serviço')) return;
    setNewMenu(false);
    setNewType(null);
    setServiceClient(client.name);
    setServiceSku('');
    setServiceReturnView('clientes');
    setView('nova_ordem_servico');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openCatalogOrder = (item: CatalogItem) => {
    if (!authorize('sales.create', 'criar pedidos')) return;
    setNewMenu(false);
    setNewType(null);
    setCommercialClient('');
    setCommercialSku(item.sku);
    setCommercialReturnView('catalogo');
    setView('novo_pedido');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openCatalogQuote = (item: CatalogItem) => {
    if (!authorize(item.category === 'Serviço' ? 'services.create' : 'sales.create', 'criar orçamentos')) return;
    setNewMenu(false);
    setNewType(null);
    setCommercialClient('');
    setCommercialSku(item.sku);
    setCommercialReturnView('catalogo');
    setQuoteSource(item.category === 'Serviço' ? 'servicos' : 'vendas');
    setView('novo_orcamento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openCatalogService = (item: CatalogItem) => {
    if (!authorize('services.create', 'criar ordens de serviço')) return;
    setNewMenu(false);
    setNewType(null);
    setServiceClient('');
    setServiceSku(item.category === 'Serviço' ? item.sku : '');
    setServiceReturnView('catalogo');
    setView('nova_ordem_servico');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const saveClient = async (client: ClientRecord): Promise<ConfirmedSave> => {
    const exists = clientRecords.some((item) => item.id === client.id);
    if (!authorize(exists ? 'clients.edit' : 'clients.create', exists ? 'editar clientes' : 'cadastrar clientes')) return { ok: false, message: 'Seu acesso não permite salvar este cliente.' };
    if (managementBridgeOrigin && window.parent !== window) {
      const requestId = `customer:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      return new Promise<ConfirmedSave>((resolve) => {
        const timer = window.setTimeout(() => {
          pendingCustomerRef.current.delete(requestId);
          const result = { ok: false, message: 'A confirmação demorou mais que o esperado. Os dados foram mantidos; tente salvar novamente.' };
          setToast(result.message);
          resolve(result);
        }, 20_000);
        pendingCustomerRef.current.set(requestId, { timer, resolve });
        window.parent.postMessage({ type: CUSTOMER_SAVE_REQUEST_TYPE, requestId, customer: client }, managementBridgeOrigin);
        setToast(exists ? 'Salvando atualização do cliente…' : 'Cadastrando cliente no perfil empresarial…');
      });
    }
    setClientRecords((current) => {
      const exists = current.some((item) => item.id === client.id);
      const next = exists ? current.map((item) => item.id === client.id ? client : item) : [client, ...current];
      writeCompanyStorage(CLIENT_STORAGE_KEY, JSON.stringify({ version: 2, clients: next }));
      return next;
    });
    const message = `${client.tradeName} ${clientRecords.some((item) => item.id === client.id) ? 'atualizado' : 'cadastrado'} localmente.`;
    setToast(message);
    return { ok: true, message };
  };
  const saveSupplier = async (supplier: SupplierRecord): Promise<ConfirmedSave> => {
    if (!authorize('stock.entry', 'cadastrar fornecedores')) return { ok: false, message: 'Seu acesso não permite cadastrar fornecedores.' };
    if (managementBridgeOrigin && window.parent !== window) {
      const requestId = `supplier:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      return new Promise<ConfirmedSave>((resolve) => {
        const timer = window.setTimeout(() => {
          pendingSupplierRef.current.delete(requestId);
          const result = { ok: false, message: 'A confirmação demorou mais que o esperado. Os dados foram mantidos; tente salvar novamente.' };
          setToast(result.message);
          resolve(result);
        }, 20_000);
        pendingSupplierRef.current.set(requestId, { timer, resolve });
        window.parent.postMessage({ type: SUPPLIER_SAVE_REQUEST_TYPE, requestId, supplier }, managementBridgeOrigin);
        setToast('Cadastrando fornecedor no perfil empresarial…');
      });
    }
    setSupplierRecords((current) => {
      const next = [supplier, ...current];
      writeCompanyStorage(SUPPLIER_STORAGE_KEY, JSON.stringify({ version: 1, suppliers: next }));
      return next;
    });
    const message = `${supplier.name} cadastrado para compras e entradas de estoque.`;
    setToast(message);
    return { ok: true, message };
  };
  const saveCatalogItem = (item: CatalogItem) => {
    if (managementCatalogBridge) { setToast('O catálogo conectado é somente leitura. Faça alterações em Custos e Precificação.'); return; }
    if (!authorize('catalog.edit', 'editar produtos e serviços')) return;
    setCatalogRecords((current) => {
      const normalized = normalizeCatalogTaxProfile(item) as CatalogItem;
      const next = current.map((record) => record.sku === item.sku ? normalized : record);
      writeCompanyStorage(CATALOG_STORAGE_KEY, JSON.stringify({ version: 3, catalog: next }));
      return next;
    });
    setToast(`Complementos de ${item.name} salvos neste protótipo.`);
  };
  const saveStockMovement = async (item: CatalogItem, movement: StockMovementRecord): Promise<ConfirmedSave> => {
    if (managementCatalogBridge) {
      if(!managementCatalogBridge.stockIntegrated||!managementBridgeOrigin||window.parent===window){const message='Configure o estoque principal deste perfil antes de movimentar.';setToast(message);return {ok:false,message};}
      if(!item.catalogItemId||!item.stockLocationId){const message='Atualize o catálogo e selecione um produto vinculado ao estoque principal.';setToast(message);return {ok:false,message};}
      const dateParts=movement.date.slice(0,10).split('/');const movementDate=dateParts.length===3?`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`:todayIso();const id=typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;const requestId=`stock:${id}`;const supplier=supplierRecords.find((record)=>record.name===movement.partner);const mode=movement.direction==='inventario'?'inventario':movement.direction;const request=createStockMoveRequest({requestId,productId:item.catalogItemId,localId:item.stockLocationId,idempotencyKey:`stock:${id}:move`,mode,amount:Math.abs(movement.quantity),finalBalance:movement.balance,date:movementDate,nature:movement.type,partner:supplier?{id:supplier.id,name:supplier.name,document:supplier.document}:{name:movement.partner},document:movement.document,lot:movement.lot,expiry:movement.expiry,notes:movement.notes});if(!request){const message='Não foi possível preparar a movimentação. Atualize o catálogo e tente novamente.';setToast(message);return {ok:false,message};}return new Promise<ConfirmedSave>((resolve)=>{const timer=window.setTimeout(()=>{pendingStockRef.current.delete(requestId);const failure={ok:false,message:'A confirmação do estoque demorou mais que o esperado. Tente novamente; a operação é protegida contra duplicidade.'};setToast(failure.message);resolve(failure);},15_000);pendingStockRef.current.set(requestId,{timer,resolve});window.parent.postMessage(request,managementBridgeOrigin);setToast('Registrando movimentação no estoque do perfil…');});
    }
    const permission = movement.type.toLocaleLowerCase('pt-BR').includes('inventário') ? 'stock.inventory' : movement.direction === 'entrada' ? 'stock.entry' : 'stock.exit';
    if (!authorize(permission, 'movimentar o estoque')) return { ok: false, message: 'Seu acesso não permite movimentar o estoque.' };
    setCatalogRecords((current) => {
      const next = current.map((record) => record.sku === item.sku ? item : record);
      writeCompanyStorage(CATALOG_STORAGE_KEY, JSON.stringify({ version: 3, catalog: next }));
      return next;
    });
    setStockMovementRecords((current) => {
      const next = [movement, ...current].slice(0, 100);
      writeCompanyStorage(STOCK_STORAGE_KEY, JSON.stringify({ version: 1, movements: next }));
      return next;
    });
    const message = `${movement.type} registrada para ${item.name}. Saldo físico: ${item.current} ${item.unit}.`;
    setToast(message);
    return { ok: true, message };
  };
  const persistReceivables = (next: ReceivableRecord[]) => {
    const limited = next.slice(0, 200);
    setReceivableRecords(limited);
    writeCompanyStorage(RECEIVABLE_STORAGE_KEY, JSON.stringify({ version: 1, receivables: limited }));
    return limited;
  };
  const createOperationReceivables = (record: CreatedRecord) => {
    const operation = record.order ?? record.serviceOrder;
    if (!operation || receivableRecords.some((item) => item.origin === record.id)) return 0;
    const schedule = createReceivableSchedule({
      total: record.total,
      installments: operation.installments || 1,
      firstDueDate: operation.firstDueDate || record.createdAt.slice(0, 10),
    });
    if (!schedule.valid) {
      setToast(schedule.errors[0] ?? 'Não foi possível gerar as parcelas deste pedido.');
      return -1;
    }
    const now = new Date();
    const generated: ReceivableRecord[] = schedule.items.map((item, index) => ({
      id: `REC-${now.getTime().toString().slice(-5)}${index + 1}`,
      dueDate: item.dueDate,
      client: record.client,
      origin: record.id,
      method: paymentMethodLabel(operation.paymentMethod || 'prazo'),
      installment: item.installment,
      value: item.value,
      received: 0,
      reversed: 0,
      refunded: 0,
      createdAt: now.toISOString(),
      events: [{ date: now.toISOString(), type: 'Geração', amount: item.value, method: paymentMethodLabel(operation.paymentMethod || 'prazo'), account: 'Não aplicável', user: record.order?.seller ?? record.serviceOrder?.technician ?? 'Usuário local', description: `Parcela gerada pela ${record.type === 'ordem_servico' ? 'conclusão' : 'faturamento'} de ${record.id}.` }],
    }));
    persistReceivables([...generated, ...receivableRecords]);
    return generated.length;
  };
  const reverseOperationReceivables = (record: CreatedRecord, reason: string) => {
    let affected = 0;
    const now = new Date().toISOString();
    const next = receivableRecords.map((item) => {
      if (item.origin !== record.id || item.reversed >= item.value) return item;
      affected += 1;
      const reversal = reverseReceivable(item);
      return { ...item, ...reversal, events: [...item.events, { date: now, type: 'Estorno da parcela' as const, amount: item.value, method: item.method, account: 'Conta demonstração', user: record.order?.seller ?? record.serviceOrder?.technician ?? 'Usuário local', description: reason }] };
    });
    if (affected) persistReceivables(next);
    return affected;
  };
  const receiveInstallment = async (input: ReceivableOperationInput): Promise<ConfirmedSave> => {
    if (!authorize('receivables.receive', 'registrar recebimentos')) return { ok: false, message: 'Usuário sem permissão para registrar recebimentos.' };
    const record = receivableRecords.find((item) => item.id === input.id);
    if (!record) return { ok: false, message: 'Selecione uma parcela válida.' };
    if (!input.date) return { ok: false, message: 'Informe a data do recebimento.' };
    const result = applyReceivablePayment(record, input.amount);
    if (!result.valid) return { ok: false, message: result.errors[0] ?? 'Revise o valor recebido.' };
    if (!isValidIsoDate(input.date) || input.date > todayIso()) return { ok: false, message: 'A data do recebimento deve ser válida e não pode estar no futuro.' };
    if (managementCatalogBridge && managementBridgeOrigin && window.parent !== window) {
      if (!record.persistence) return { ok: false, message: 'Atualize os recebimentos vinculados ao perfil antes de continuar.' };
      const id=typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const requestId=`receivable:${id}`;const message=createReceivableMoveRequest({requestId,receivableId:record.id,expectedVersion:record.persistence.version,idempotencyKey:`receipt:${id}`,type:'recebimento',amount:input.amount,date:input.date,method:input.method,account:input.account,description:input.description});
      if(!message)return { ok: false, message: 'Não foi possível preparar o recebimento. Atualize a página.' };
      return new Promise<ConfirmedSave>((resolve)=>{const timer=window.setTimeout(()=>{pendingReceivableRef.current.delete(requestId);const failure={ok:false,message:'A confirmação do recebimento demorou mais que o esperado. Tente novamente; a operação é protegida contra duplicidade.'};setToast(failure.message);resolve(failure);},15_000);pendingReceivableRef.current.set(requestId,{timer,resolve});window.parent.postMessage(message,managementBridgeOrigin);setToast('Registrando recebimento no perfil e atualizando a entrada mensal…');});
    }
    const event: ReceivableEvent = { date: `${input.date}T12:00:00-03:00`, type: 'Recebimento', amount: input.amount, method: input.method, account: input.account, user: activeUser?.name ?? 'Usuário local', description: input.description.trim() || 'Recebimento comercial registrado localmente; conciliação bancária pendente.' };
    const next = receivableRecords.map((item) => item.id === input.id ? { ...item, received: result.received, events: [...item.events, event] } : item);
    persistReceivables(next);
    const message = `Recebimento de ${money(input.amount)} registrado em ${record.id}.`;
    setToast(message);
    return { ok: true, message };
  };
  const refundInstallment = async (input: ReceivableOperationInput): Promise<ConfirmedSave> => {
    if (!authorize('receivables.refund', 'estornar recebimentos')) return { ok: false, message: 'Usuário sem permissão para estornar recebimentos.' };
    const record = receivableRecords.find((item) => item.id === input.id);
    if (!record) return { ok: false, message: 'Selecione uma parcela válida.' };
    if (!input.date) return { ok: false, message: 'Informe a data do estorno.' };
    const result = applyReceivableRefund(record, input.amount);
    if (!result.valid) return { ok: false, message: result.errors[0] ?? 'Revise o valor do estorno.' };
    if (!isValidIsoDate(input.date) || input.date > todayIso()) return { ok: false, message: 'A data do estorno deve ser válida e não pode estar no futuro.' };
    if (managementCatalogBridge && managementBridgeOrigin && window.parent !== window) {
      if (!record.persistence) return { ok: false, message: 'Atualize os recebimentos vinculados ao perfil antes de continuar.' };
      const id=typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;const requestId=`receivable:${id}`;const message=createReceivableMoveRequest({requestId,receivableId:record.id,expectedVersion:record.persistence.version,idempotencyKey:`refund:${id}`,type:'estorno_recebimento',amount:input.amount,date:input.date,method:input.method,account:input.account,description:input.description});if(!message)return { ok: false, message: 'Não foi possível preparar o estorno. Atualize a página.' };return new Promise<ConfirmedSave>((resolve)=>{const timer=window.setTimeout(()=>{pendingReceivableRef.current.delete(requestId);const failure={ok:false,message:'A confirmação do estorno demorou mais que o esperado. Tente novamente; a operação é protegida contra duplicidade.'};setToast(failure.message);resolve(failure);},15_000);pendingReceivableRef.current.set(requestId,{timer,resolve});window.parent.postMessage(message,managementBridgeOrigin);setToast('Registrando estorno e atualizando a entrada mensal…');});
    }
    const event: ReceivableEvent = { date: `${input.date}T12:00:00-03:00`, type: 'Estorno de recebimento', amount: input.amount, method: input.method, account: input.account, user: activeUser?.name ?? 'Usuário local', description: input.description.trim() || 'Recebimento estornado localmente; o saldo da parcela foi reaberto.' };
    const next = receivableRecords.map((item) => item.id === input.id ? { ...item, refunded: result.refunded, events: [...item.events, event] } : item);
    persistReceivables(next);
    const message = `Estorno de ${money(input.amount)} registrado em ${record.id}.`;
    setToast(message);
    return { ok: true, message };
  };
  const applyOrderStockEffect = (record: CreatedRecord, transition: 'reservar' | 'liberar' | 'baixar' | 'baixar_direto' | 'devolver') => {
    const productLines = record.order?.lines.filter((line) => line.kind === 'produto') ?? [];
    if (!productLines.length) return true;
    const stockLines = productLines.map((line) => {
      const item = catalogRecords.find((recordItem) => recordItem.sku === line.sku);
      return { sku: line.sku, current: item?.current ?? 0, reserved: item?.reserved ?? 0, quantity: line.quantity };
    });
    const result = applyOrderStockTransition(stockLines, transition, { allowNegativeStock: moduleSettings.stock.allowNegativeStock });
    if (!result.valid) {
      setToast(result.errors[0] ?? 'Não foi possível atualizar o estoque deste pedido.');
      return false;
    }
    const bySku = new Map(result.items.map((item) => [item.sku, item]));
    const nextCatalog = catalogRecords.map((item) => {
      const next = bySku.get(item.sku);
      return next ? { ...item, current: next.current, reserved: next.reserved, available: next.available } : item;
    });
    const now = new Date();
    const labels = {
      reservar: { type: 'Reserva de pedido', direction: 'reserva' as const, sign: -1, notes: 'Saldo comprometido pela confirmação do pedido.' },
      liberar: { type: 'Liberação de reserva', direction: 'reserva' as const, sign: 1, notes: 'Reserva liberada pelo cancelamento do pedido.' },
      baixar: { type: 'Saída por faturamento', direction: 'saida' as const, sign: -1, notes: 'Reserva convertida em baixa física pelo faturamento.' },
      baixar_direto: { type: 'Saída por faturamento', direction: 'saida' as const, sign: -1, notes: 'Baixa física direta de pedido confirmado sem reserva.' },
      devolver: { type: 'Entrada por devolução', direction: 'entrada' as const, sign: 1, notes: 'Devolução total vinculada ao pedido faturado.' },
    }[transition];
    const movements: StockMovementRecord[] = productLines.map((line, index) => ({
      id: `MOV-${now.getTime().toString().slice(-7)}-${index + 1}`,
      date: now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      createdAt: now.toISOString(),
      origin: record.id,
      type: labels.type,
      direction: labels.direction,
      sku: line.sku,
      item: line.name,
      quantity: labels.sign * line.quantity,
      balance: bySku.get(line.sku)?.current ?? 0,
      user: record.order?.seller ?? 'Usuário local',
      location: moduleSettings.stock.defaultLocation,
      partner: record.client,
      document: record.id,
      lot: '',
      expiry: '',
      notes: labels.notes,
    }));
    setCatalogRecords(nextCatalog);
    writeCompanyStorage(CATALOG_STORAGE_KEY, JSON.stringify({ version: 3, catalog: nextCatalog }));
    const nextMovements = [...movements, ...stockMovementRecords].slice(0, 100);
    setStockMovementRecords(nextMovements);
    writeCompanyStorage(STOCK_STORAGE_KEY, JSON.stringify({ version: 1, movements: nextMovements }));
    return true;
  };
  const finalizeServiceMaterials = (materials: ServiceMaterial[]) => materials.map((material) => {
    if (material.source === 'Cliente') return { ...material, cost: 0 };
    if (material.source !== 'Catálogo' || !material.sku) return { ...material, cost: Math.max(0, material.cost) };
    const catalog = catalogRecords.find((item) => item.sku === material.sku);
    return catalog ? { ...material, name: catalog.name, unit: catalog.unit, cost: catalog.cost } : material;
  });
  const serviceMaterialSignature = (materials: ServiceMaterial[]) => JSON.stringify(materials.map((material) => ({ sku: material.sku, name: material.name, quantity: material.quantity, unit: material.unit, source: material.source, cost: material.cost })));
  const prepareServiceMaterialStockEffect = (record: CreatedRecord, materials: ServiceMaterial[], transition: 'consumir' | 'estornar') => {
    const stockMaterials = materials.filter((material) => material.source === 'Catálogo');
    if (!stockMaterials.length) return { valid: true, error: '', movements: [] as StockMovementRecord[], nextCatalog: catalogRecords, affected: 0 };
    const movementType = transition === 'consumir' ? 'Saída por ordem de serviço' : 'Estorno de materiais da OS';
    if (stockMovementRecords.some((movement) => movement.origin === record.id && movement.type === movementType)) {
      return { valid: true, error: '', movements: [] as StockMovementRecord[], nextCatalog: catalogRecords, affected: 0 };
    }
    const grouped = [...stockMaterials.reduce((map, material) => {
      if (!material.sku) return map;
      const current = map.get(material.sku);
      map.set(material.sku, { sku: material.sku, name: material.name, quantity: (current?.quantity ?? 0) + material.quantity });
      return map;
    }, new Map<string, { sku: string; name: string; quantity: number }>()).values()];
    if (grouped.length !== stockMaterials.length && stockMaterials.some((material) => !material.sku)) {
      return { valid: false, error: 'Selecione o produto do catálogo ou altere a origem do material para Externo ou Cliente.', movements: [] as StockMovementRecord[], nextCatalog: catalogRecords, affected: 0 };
    }
    const missing = grouped.find((material) => {
      const item = catalogRecords.find((catalog) => catalog.sku === material.sku);
      return !item || !item.trackStock;
    });
    if (missing) return { valid: false, error: `${missing.name || missing.sku}: produto indisponível para movimentação de estoque.`, movements: [] as StockMovementRecord[], nextCatalog: catalogRecords, affected: 0 };
    const stockLines = grouped.map((material) => {
      const item = catalogRecords.find((catalog) => catalog.sku === material.sku)!;
      return { ...material, current: item.current, reserved: item.reserved };
    });
    const result = applyServiceMaterialStockTransition(stockLines, transition);
    if (!result.valid) return { valid: false, error: result.errors[0] ?? 'Não foi possível movimentar os materiais da ordem.', movements: [] as StockMovementRecord[], nextCatalog: catalogRecords, affected: 0 };
    const bySku = new Map(result.items.map((item) => [item.sku, item]));
    const nextCatalog = catalogRecords.map((item) => {
      const next = bySku.get(item.sku);
      return next ? { ...item, current: next.current, reserved: next.reserved, available: next.available } : item;
    });
    const now = new Date();
    const movements: StockMovementRecord[] = grouped.map((material, index) => ({
      id: `MOV-${now.getTime().toString().slice(-7)}-OS-${index + 1}`,
      date: now.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      createdAt: now.toISOString(),
      origin: record.id,
      type: movementType,
      direction: transition === 'consumir' ? 'saida' : 'entrada',
      sku: material.sku,
      item: material.name,
      quantity: (transition === 'consumir' ? -1 : 1) * material.quantity,
      balance: bySku.get(material.sku)?.current ?? 0,
      user: record.serviceOrder?.technician ?? 'Usuário local',
      location: moduleSettings.stock.defaultLocation,
      partner: record.client,
      document: record.id,
      lot: '',
      expiry: '',
      notes: transition === 'consumir' ? 'Material consumido na conclusão da ordem de serviço.' : 'Material devolvido pelo estorno da conclusão da ordem de serviço.',
    }));
    return { valid: true, error: '', movements, nextCatalog, affected: movements.length };
  };
  const commitServiceMaterialStockEffect = (effect: { movements: StockMovementRecord[]; nextCatalog: CatalogItem[] }) => {
    if (!effect.movements.length) return;
    setCatalogRecords(effect.nextCatalog);
    writeCompanyStorage(CATALOG_STORAGE_KEY, JSON.stringify({ version: 3, catalog: effect.nextCatalog }));
    const nextMovements = [...effect.movements, ...stockMovementRecords].slice(0, 100);
    setStockMovementRecords(nextMovements);
    writeCompanyStorage(STOCK_STORAGE_KEY, JSON.stringify({ version: 1, movements: nextMovements }));
  };
  const syncCommercialOrder = (record: CreatedRecord, target: 'confirmado' | 'em_separacao' | 'faturado' | 'cancelado' | 'devolvido') => {
    if (!record.order || !managementCatalogBridge || !managementBridgeOrigin || window.parent === window) return false;
    if (record.order.fiscalDocument === 'nfse') { setToast('Pedido de venda não pode gerar NFS-e. Use uma ordem de serviço ou selecione NF-e.'); return true; }
    if ([...pendingOrderWorkflowRef.current.values()].some((pending) => pending.recordId === record.id)) {
      setToast('Este pedido já está sendo atualizado. Aguarde a conclusão.');
      return true;
    }
    const client = clientRecords.find((item) => item.name === record.client);
    if (!client) { setToast('Selecione novamente o cliente do pedido.'); return true; }
    const items = record.order.lines.map((line) => ({
      catalogItemId: line.catalogItemId || catalogRecords.find((item) => item.sku === line.sku)?.catalogItemId || '',
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountUnit: line.unitDiscount,
    }));
    if (items.some((item) => !item.catalogItemId)) { setToast('Atualize o catálogo de Custos e selecione novamente os itens deste pedido.'); return true; }
    const persistenceKey = record.persistenceKey || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const requestId = `order:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    const customer = {
      documentType: client.profile === 'Pessoa física' ? 'cpf' : 'cnpj', document: client.document, legalName: client.legalName, tradeName: client.tradeName,
      displayName: client.name, stateRegistration: client.stateRegistration === 'Isento' ? '' : client.stateRegistration,
      municipalRegistration: client.municipalRegistration,
      stateRegistrationIndicator: client.fiscal === 'Contribuinte ICMS' ? 'contribuinte_icms' : client.stateRegistration === 'Isento' ? 'contribuinte_isento' : 'nao_contribuinte',
      email: client.email, phone: client.phone, primaryContact: client.contactName, postalCode: client.cep,
      street: client.street, number: client.number, complement: client.complement, district: client.district,
      city: client.cityName || client.city, cityCode: client.cityCode, state: client.state,
      paymentTerms: client.paymentTerms, status: client.status === 'Inativo' ? 'inativo' : client.status === 'Revisar cadastro' ? 'revisar_cadastro' : 'ativo',
    };
    const order = {
      priceTableId: managementCatalogBridge.priceTable?.id || '', sellerName: record.order.seller,
      stockLocationId: catalogRecords.find((item) => item.trackStock && item.stockLocationId)?.stockLocationId || '',
      generalDiscount: record.order.commercialTotals.orderDiscount, freight: record.order.commercialTotals.freight,
      insurance: record.order.commercialTotals.insurance, otherExpenses: record.order.commercialTotals.other,
      fiscalDocument: record.order.fiscalDocument,
      payment: { method: record.order.paymentMethod, installments: record.order.installments, firstDueDate: record.order.firstDueDate },
      delivery: {}, items,
    };
    const message = createCommercialOrderWorkflowRequest({
      requestId, persistenceKey, target, operationId: record.persistence?.operationId || '', customer, order,
    });
    if (!message) { setToast('Não foi possível preparar a persistência do pedido. Atualize a página e tente novamente.'); return true; }
    if (!record.persistenceKey) {
      setCreated((current) => {
        return current.map((item) => item.id === record.id ? { ...item, persistenceKey } : item);
      });
    }
    const timer = window.setTimeout(() => {
      pendingOrderWorkflowRef.current.delete(requestId);
      if (target === 'confirmado') setCreated((current) => current.filter((item) => item.id !== record.id || Boolean(item.persistence)));
      setToast('A persistência do pedido demorou mais que o esperado. Tente novamente; a chave evita duplicidade.');
    }, 15_000);
    pendingOrderWorkflowRef.current.set(requestId, { recordId: record.id, target, timer });
    window.parent.postMessage(message, managementBridgeOrigin);
    setToast(target === 'faturado' ? 'Faturando o pedido no repositório comercial…' : target === 'em_separacao' ? 'Registrando a separação…' : target === 'cancelado' ? 'Cancelando o pedido e liberando a reserva…' : target === 'devolvido' ? 'Registrando devolução e estornos integrados…' : 'Persistindo e confirmando o pedido…');
    return true;
  };
  const syncSavedOperation = (record: CreatedRecord) => {
    if (!managementCatalogBridge || !managementBridgeOrigin || window.parent === window || !['orcamento', 'pedido', 'ordem_servico'].includes(record.type)) return false;
    const client = clientRecords.find((item) => item.name === record.client);
    if (!client?.persistence?.integrated || !/^[0-9a-f-]{36}$/i.test(client.id)) { setToast('Salve e confirme o cliente no perfil empresarial antes de criar este documento.'); return true; }
    const sourceLines = record.quote?.items ?? record.order?.lines ?? record.serviceOrder?.lines ?? [];
    const items = sourceLines.map((line) => {
      const catalog = catalogRecords.find((item) => item.sku === line.sku);
      return { catalogItemId: catalog?.catalogItemId || '', quantity: line.quantity, unitPrice: line.unitPrice, discountUnit: 0 };
    });
    if (!items.length || items.some((item) => !item.catalogItemId)) { setToast('Atualize o catálogo e selecione novamente os itens do documento.'); return true; }
    const persistenceKey = record.persistenceKey || `operation:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
    const requestId = `operation-save:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const isoValidity = record.quote?.validUntil?.split('/').reverse().join('-') || '';
    const firstDueDate = record.order?.firstDueDate || record.serviceOrder?.firstDueDate || isoValidity || new Date().toISOString().slice(0, 10);
    const operation = {
      type: record.type === 'pedido' ? 'pedido' : 'orcamento', channel: record.type === 'ordem_servico' || record.quote?.source === 'servicos' ? 'servicos' : 'vendas',
      customerId: client.id, priceTableId: managementCatalogBridge.priceTable?.id || '', sellerName: record.serviceOrder?.technician || '',
      idempotencyKey: persistenceKey, validityDate: isoValidity || firstDueDate,
      generalDiscount: record.quote?.discount || record.order?.commercialTotals.orderDiscount || 0, freight: record.quote?.freight || record.order?.commercialTotals.freight || 0, insurance: record.order?.commercialTotals.insurance || 0, otherExpenses: record.order?.commercialTotals.other || 0,
      fiscalDocument: record.order?.fiscalDocument || record.serviceOrder?.fiscalDocument || 'nenhum', payment: { method: record.order?.paymentMethod || record.serviceOrder?.paymentMethod || 'a_definir', installments: record.order?.installments || record.serviceOrder?.installments || 1, firstDueDate }, delivery: {},
      customerNotes: record.serviceOrder?.customerNotes || record.quote?.notes || '', internalNotes: record.serviceOrder?.internalNotes || '', items,
    };
    const serviceOrder = record.serviceOrder ? {
      scheduledAt: `${record.serviceOrder.scheduledDate}T${record.serviceOrder.scheduledTime}:00-03:00`, expectedDurationMinutes: record.serviceOrder.durationMinutes,
      technicianName: record.serviceOrder.technician, executionLocation: record.serviceOrder.location, onSiteContact: record.serviceOrder.contactName,
      checklist: [], materials: [],
    } : null;
    const timer = window.setTimeout(() => { pendingOperationSaveRef.current.delete(requestId); setCreated((current) => current.filter((item) => item.id !== record.id || Boolean(item.persistence))); setToast('A gravação do documento demorou além do esperado. O registro não confirmado foi removido; tente novamente com segurança.'); }, 20_000);
    pendingOperationSaveRef.current.set(requestId, { recordId: record.id, timer });
    window.parent.postMessage({ type: OPERATION_SAVE_REQUEST_TYPE, requestId, action: serviceOrder ? 'create_service_order' : 'create', operation, serviceOrder, serviceOrderKey: `${persistenceKey}:os` }, managementBridgeOrigin);
    setToast(serviceOrder ? 'Salvando e agendando a ordem de serviço no perfil…' : 'Salvando o orçamento no perfil empresarial…');
    return true;
  };
  const createRecord = (incomingRecord: CreatedRecord) => {
    const connectedOrder = incomingRecord.type === 'pedido' && managementCatalogBridge && incomingRecord.order
      ? { ...incomingRecord, persistenceKey: incomingRecord.persistenceKey || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`), order: { ...incomingRecord.order, reserveStock: managementCatalogBridge.stockIntegrated, stockState: 'Sem movimentação' as const } }
      : managementCatalogBridge && ['orcamento', 'ordem_servico'].includes(incomingRecord.type)
        ? { ...incomingRecord, persistenceKey: incomingRecord.persistenceKey || `operation:${Date.now()}:${Math.random().toString(36).slice(2, 9)}` }
        : incomingRecord;
    const record = connectedOrder;
    const required = newPermission[record.type];
    if (required && !authorize(required, `criar ${documentLabel(record.type).toLocaleLowerCase('pt-BR')}`)) return;
    if (record.type === 'pedido' && record.status === 'Confirmado' && (!authorize('sales.edit', 'confirmar pedidos') || !authorize('stock.exit', 'confirmar o efeito de estoque do pedido'))) return;
    if (record.type === 'pedido' && record.status === 'Confirmado' && record.order?.reserveStock && !managementCatalogBridge && !applyOrderStockEffect(record, 'reservar')) return;
    const next = [record, ...created].slice(0, 20);
    setCreated(next);
    if (!managementCatalogBridge) writeCompanyStorage(STORAGE_KEY, JSON.stringify({ version: 1, created: next }));
    setNewType(null);
    setToast(managementCatalogBridge
      ? `${documentLabel(record.type)} em confirmação. O registro só permanecerá após a Gestão confirmar o vínculo com o perfil ativo.`
      : `${documentLabel(record.type)} ${record.status ? record.status.toLocaleLowerCase('pt-BR') : 'demonstrativo criado'}. Nenhum dado foi enviado.`);
    if (record.type === 'pedido' && record.status === 'Confirmado') window.setTimeout(() => syncCommercialOrder(record, 'confirmado'), 0);
    if (['orcamento', 'ordem_servico'].includes(record.type) || (record.type === 'pedido' && record.status === 'Rascunho')) window.setTimeout(() => syncSavedOperation(record), 0);
    if (['pedido', 'orcamento', 'venda'].includes(record.type)) setView('vendas');
    else if (record.type === 'ordem_servico') setView('servicos');
    else setView('fiscal');
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  };
  const updateOrderLifecycle = (record: CreatedRecord, action: OrderLifecycleAction) => {
    if (!record.order) return;
    const commercialPermission = action === 'faturar' ? 'sales.invoice' : action === 'cancelar' || action === 'devolver' ? 'sales.cancel' : 'sales.edit';
    if (!authorize(commercialPermission, action === 'faturar' ? 'faturar pedidos' : action === 'cancelar' || action === 'devolver' ? 'cancelar ou devolver pedidos' : 'alterar pedidos')) return;
    if (!authorize(action === 'devolver' ? 'stock.adjust' : 'stock.exit', 'executar o efeito de estoque do pedido')) return;
    if (action === 'devolver' && (!authorize('receivables.refund', 'estornar as parcelas da devolução') || !authorize('fiscal.cancel', 'encerrar o vínculo fiscal da devolução'))) return;
    if (action === 'faturar' && record.order.fiscalDocument !== 'nenhum' && !authorize('fiscal.prepare', 'preparar o documento fiscal do faturamento')) return;
    if (action === 'faturar' && !(record.total > 0)) {
      setToast('O pedido precisa ter valor total maior que zero antes do faturamento.');
      return;
    }
    if (managementCatalogBridge && (record.persistence || record.persistenceKey)) {
      if (action === 'separar' || action === 'faturar' || action === 'cancelar' || action === 'devolver') {
        syncCommercialOrder(record, action === 'faturar' ? 'faturado' : action === 'cancelar' ? 'cancelado' : action === 'devolver' ? 'devolvido' : 'em_separacao');
        return;
      }
    }
    const hasProducts = record.order.lines.some((line) => line.kind === 'produto');
    const transition = action === 'faturar' && hasProducts
      ? (['Reservado', 'Em separação'].includes(record.order.stockState) ? 'baixar' : 'baixar_direto')
      : action === 'cancelar' && ['Reservado', 'Em separação'].includes(record.order.stockState)
        ? 'liberar'
        : action === 'devolver' && hasProducts
          ? 'devolver'
          : null;
    if (transition && !applyOrderStockEffect(record, transition)) return;
    const generatedInstallments = action === 'faturar' ? createOperationReceivables(record) : 0;
    if (generatedInstallments < 0) return;
    const reversedInstallments = action === 'cancelar' || action === 'devolver'
      ? reverseOperationReceivables(record, action === 'devolver' ? `Parcelas e recebimentos estornados pela devolução total de ${record.id}.` : `Parcelas estornadas pelo cancelamento de ${record.id}.`)
      : 0;
    const hadFiscalDraft = fiscalDraftRecords.some((draft) => draft.originId === record.id);
    const fiscalDraftCreated = action === 'faturar' && record.order.fiscalDocument !== 'nenhum'
      ? (ensureFiscalDraft({ id: record.id, client: record.client, item: `Pedido ${record.id}`, total: record.total, documentType: record.order.fiscalDocument, sourceLabel: 'Pedido' }), hadFiscalDraft ? 0 : 1)
      : 0;
    const fiscalDraftCanceled = action === 'cancelar' || action === 'devolver'
      ? cancelOrderFiscalDraft(record, action === 'devolver' ? `Rascunho encerrado pela devolução total de ${record.id}. Nenhum documento foi transmitido.` : `Rascunho encerrado pelo cancelamento de ${record.id}. Nenhum documento foi transmitido.`)
      : 0;
    const now = new Date().toISOString();
    const lifecycle = {
      separar: { status: 'Em separação' as const, stockState: record.order.stockState === 'Reservado' ? 'Em separação' as const : record.order.stockState, label: 'Separação iniciada', description: record.order.stockState === 'Reservado' ? 'A reserva foi preservada durante a preparação do pedido.' : 'Separação iniciada sem reserva de estoque.' },
      faturar: { status: 'Faturado' as const, stockState: hasProducts ? 'Baixado' as const : 'Sem movimentação' as const, label: 'Pedido faturado', description: `${hasProducts ? transition === 'baixar' ? 'A reserva foi convertida em saída física.' : 'O saldo disponível foi baixado diretamente.' : 'Pedido sem produto físico faturado.'} ${generatedInstallments ? `${generatedInstallments} ${generatedInstallments === 1 ? 'parcela gerada' : 'parcelas geradas'} em Recebimentos.` : 'As parcelas já estavam vinculadas.'}${fiscalDraftCreated ? ' Rascunho fiscal local criado sem transmissão.' : ''}` },
      cancelar: { status: 'Cancelado' as const, stockState: transition === 'liberar' ? 'Liberado' as const : record.order.stockState, label: 'Pedido cancelado', description: `${transition === 'liberar' ? 'A reserva foi liberada e retornou ao disponível.' : 'Cancelamento sem efeito de estoque.'}${reversedInstallments ? ` ${reversedInstallments} ${reversedInstallments === 1 ? 'parcela estornada' : 'parcelas estornadas'}.` : ''}${fiscalDraftCanceled ? ' Rascunho fiscal cancelado.' : ''}` },
      devolver: { status: 'Devolvido' as const, stockState: hasProducts ? 'Devolvido' as const : record.order.stockState, label: 'Devolução registrada', description: `${hasProducts ? 'Os produtos retornaram ao saldo físico e disponível.' : 'Pedido sem produto físico.'}${reversedInstallments ? ` ${reversedInstallments} ${reversedInstallments === 1 ? 'parcela e seu recebimento foram estornados' : 'parcelas e seus recebimentos foram estornados'}.` : ''}${fiscalDraftCanceled ? ' Rascunho fiscal cancelado sem transmissão.' : ''}` },
    }[action];
    const next = created.map((item) => item.id === record.id ? { ...item, status: lifecycle.status, order: { ...record.order!, stockState: lifecycle.stockState }, events: [...(item.events ?? []), { date: now, label: lifecycle.label, description: lifecycle.description }] } : item);
    setCreated(next);
    writeCompanyStorage(STORAGE_KEY, JSON.stringify({ version: 1, created: next }));
    setToast(`${lifecycle.label} em ${record.id}. ${lifecycle.description}`);
  };
  const syncServiceWorkflow = (record: CreatedRecord, action: 'start' | 'complete' | 'cancel' | 'reverse', input: Record<string, unknown>) => {
    if (!record.serviceOrder || !record.persistence?.operationId || !managementCatalogBridge || !managementBridgeOrigin || window.parent === window) return false;
    if ([...pendingServiceWorkflowRef.current.values()].some((pending) => pending.recordId === record.id)) { setToast('Esta ordem já está sendo atualizada. Aguarde a conclusão.'); return true; }
    const requestId = `service:${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
    const idempotencyKey = `${record.persistenceKey || record.persistence.operationId}:${action}:${record.persistence.version}`;
    const localId = catalogRecords.find((item) => item.trackStock && item.stockLocationId)?.stockLocationId || '';
    const message = createCommercialServiceWorkflowRequest({ requestId, idempotencyKey, action, orderId: record.persistence.operationId, expectedVersion: record.persistence.version, localId, input });
    if (!message) { setToast('Não foi possível preparar a atualização da ordem. Recarregue a página e tente novamente.'); return true; }
    const timer = window.setTimeout(() => { pendingServiceWorkflowRef.current.delete(requestId); setToast('A atualização da ordem demorou além do esperado. Tente novamente; a operação é protegida contra duplicidade.'); }, 20_000);
    pendingServiceWorkflowRef.current.set(requestId, { recordId: record.id, action, timer });
    window.parent.postMessage(message, managementBridgeOrigin);
    setToast(action === 'start' ? 'Iniciando atendimento e reservando materiais…' : action === 'complete' ? 'Concluindo serviço, estoque, cobrança e fiscal…' : action === 'reverse' ? 'Estornando conclusão, materiais, parcelas e fiscal…' : 'Cancelando ordem e liberando reservas…');
    return true;
  };
  const updateServiceLifecycle = (record: CreatedRecord, action: ServiceLifecycleAction, notes: string) => {
    if (!record.serviceOrder) return;
    if (!authorize('services.edit', 'alterar ordens de serviço')) return;
    if (action === 'cancelar' && record.status === 'Concluído' && (!authorize('stock.adjust', 'estornar os materiais da ordem') || !authorize('receivables.refund', 'estornar as parcelas da ordem') || !authorize('fiscal.cancel', 'encerrar o vínculo fiscal da ordem'))) return;
    if (managementCatalogBridge && record.persistence?.operationId && action === 'iniciar') { syncServiceWorkflow(record, 'start', { startedAt: new Date().toISOString() }); return; }
    if (managementCatalogBridge && record.persistence?.operationId && action === 'cancelar') { syncServiceWorkflow(record, record.status === 'Concluído' ? 'reverse' : 'cancel', { reason: notes.trim() || (record.status === 'Concluído' ? 'Estorno da conclusão solicitado pelo usuário.' : 'Cancelamento solicitado pelo usuário.') }); return; }
    if (managementCatalogBridge && record.persistence?.operationId) { setToast('A ordem já está agendada e persistida no perfil ativo.'); return; }
    const reversesConclusion = action === 'cancelar' && record.status === 'Concluído';
    const hasMaterialConsumption = record.serviceOrder.materialStockState === 'Baixado' || stockMovementRecords.some((movement) => movement.origin === record.id && movement.type === 'Saída por ordem de serviço');
    const stockEffect = reversesConclusion && hasMaterialConsumption
      ? prepareServiceMaterialStockEffect(record, record.serviceOrder.materials ?? [], 'estornar')
      : { valid: true, error: '', movements: [] as StockMovementRecord[], nextCatalog: catalogRecords, affected: 0 };
    if (!stockEffect.valid) { setToast(stockEffect.error); return; }
    const reversedInstallments = action === 'cancelar' ? reverseOperationReceivables(record, `Parcelas estornadas pelo cancelamento de ${record.id}.`) : 0;
    const fiscalDraftCanceled = action === 'cancelar' ? cancelOrderFiscalDraft(record, `Rascunho encerrado pelo cancelamento de ${record.id}. Nenhum documento foi transmitido.`) : 0;
    commitServiceMaterialStockEffect(stockEffect);
    const now = new Date().toISOString();
    const lifecycle = {
      agendar: { status: 'Agendado' as const, label: 'Ordem agendada', description: `Atendimento confirmado para ${displayIsoDate(record.serviceOrder.scheduledDate)} às ${record.serviceOrder.scheduledTime}, com ${record.serviceOrder.technician}.` },
      iniciar: { status: 'Em execução' as const, label: 'Atendimento iniciado', description: notes.trim() || 'Execução iniciada e horário registrado na ordem.' },
      cancelar: { status: 'Cancelado' as const, label: reversesConclusion ? 'Conclusão estornada' : 'Ordem cancelada', description: `${notes.trim() || (reversesConclusion ? 'Conclusão estornada sem justificativa adicional.' : 'Cancelamento registrado sem justificativa adicional.')}${stockEffect.affected ? ` ${stockEffect.affected} ${stockEffect.affected === 1 ? 'material devolvido' : 'materiais devolvidos'} ao estoque.` : ''}${reversedInstallments ? ` ${reversedInstallments} ${reversedInstallments === 1 ? 'parcela estornada' : 'parcelas estornadas'}.` : ''}${fiscalDraftCanceled ? ' Rascunho fiscal cancelado.' : ''}` },
    }[action];
    const next = created.map((item) => item.id === record.id ? {
      ...item,
      status: lifecycle.status,
      serviceOrder: {
        ...record.serviceOrder!,
        startedAt: action === 'iniciar' ? now : record.serviceOrder!.startedAt,
        materialStockState: reversesConclusion && hasMaterialConsumption ? 'Estornado' as const : record.serviceOrder!.materialStockState,
      },
      events: [...(item.events ?? []), { date: now, label: lifecycle.label, description: lifecycle.description }],
    } : item);
    setCreated(next);
    writeCompanyStorage(STORAGE_KEY, JSON.stringify({ version: 1, created: next }));
    setToast(`${lifecycle.label} em ${record.id}. ${lifecycle.description}`);
  };
  const uploadServiceAttachments = (record: CreatedRecord, attachments: ServiceAttachment[], afterSuccess: (saved: ServiceAttachment[]) => void) => {
    const files = attachments.flatMap((attachment) => attachment.file ? [attachment.file] : []);
    if (!files.length) { afterSuccess(attachments); return true; }
    if (!record.persistence?.operationId || !managementBridgeOrigin || window.parent === window) { setToast('Salve a ordem no perfil empresarial antes de anexar evidências.'); return false; }
    const requestId = `service-attachment:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
    const request = createServiceAttachmentUploadRequest({ requestId, orderId: record.persistence.operationId, files });
    if (!request) { setToast('Revise os anexos selecionados e tente novamente.'); return false; }
    const channel = new MessageChannel();
    let finished = false;
    const timer = window.setTimeout(() => {
      if (finished) return;
      finished = true; channel.port1.close();
      setToast('O envio dos anexos demorou além do esperado. Confirme a ordem antes de repetir.');
    }, 45_000);
    channel.port1.onmessage = (event) => {
      const response = parseServiceAttachmentResponse(event.data);
      if (!response || response.requestId !== requestId || finished) return;
      finished = true; window.clearTimeout(timer); channel.port1.close();
      if (!response.ok) { setToast(response.message || 'Não foi possível guardar os anexos.'); return; }
      const persisted = response.attachments as ServiceAttachment[];
      const existing = attachments.filter((attachment) => !attachment.file);
      const saved = [...existing, ...persisted];
      setCreated((current) => current.map((item) => item.id === record.id && item.serviceOrder ? { ...item, serviceOrder: { ...item.serviceOrder, attachments: saved } } : item));
      setToast(response.message || 'Anexos protegidos salvos no perfil.');
      afterSuccess(saved);
    };
    window.parent.postMessage(request, managementBridgeOrigin, [channel.port2]);
    setToast('Guardando anexos no perfil empresarial…');
    return true;
  };
  const openServiceAttachment = (attachment: ServiceAttachment) => {
    if (!managementBridgeOrigin || window.parent === window || !/^[0-9a-f-]{36}$/i.test(attachment.id)) { setToast('Este anexo existe somente na demonstração local.'); return; }
    const popup = window.open('', '_blank');
    const requestId = `service-attachment-open:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
    const request = createServiceAttachmentOpenRequest({ requestId, attachmentId: attachment.id });
    if (!request) { popup?.close(); setToast('Não foi possível identificar o anexo.'); return; }
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => { channel.port1.close(); popup?.close(); setToast('Não foi possível abrir o anexo no tempo esperado.'); }, 20_000);
    channel.port1.onmessage = (event) => {
      const response = parseServiceAttachmentResponse(event.data);
      if (!response || response.requestId !== requestId) return;
      window.clearTimeout(timer); channel.port1.close();
      if (!response.ok || !response.url) { popup?.close(); setToast(response.message || 'Não foi possível abrir o anexo.'); return; }
      if (popup) popup.location.href = response.url;
      else window.open(response.url, '_blank', 'noopener,noreferrer');
    };
    window.parent.postMessage(request, managementBridgeOrigin, [channel.port2]);
  };
  const saveServiceExecution = (record: CreatedRecord, execution: ServiceExecutionInput, conclude: boolean) => {
    if (!record.serviceOrder) return false;
    if (!authorize(conclude ? 'services.complete' : 'services.edit', conclude ? 'concluir ordens de serviço' : 'editar apontamentos de serviço')) return false;
    if (conclude && record.serviceOrder.fiscalDocument === 'nfse' && !authorize('fiscal.prepare', 'preparar o documento fiscal da ordem de serviço')) return false;
    const finalizedMaterials = finalizeServiceMaterials(execution.materials);
    const validation = validateServiceExecution({
      actualDurationMinutes: execution.actualDurationMinutes,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      completionNotes: execution.completionNotes,
      materials: finalizedMaterials,
      checklist: execution.checklist,
      acceptanceStatus: execution.acceptance.status,
      acceptedBy: execution.acceptance.acceptedBy,
    });
    if (conclude && !validation.ready) {
      setToast(validation.errors[0] ?? 'Revise o apontamento antes de concluir a ordem.');
      return false;
    }
    if (managementCatalogBridge && record.persistence?.operationId) {
      if (!conclude) { setToast('Os apontamentos serão persistidos ao concluir a ordem; nenhum dado local foi alterado.'); return false; }
      const costs = calculateServiceExecutionCost({ serviceLines: record.serviceOrder.lines, materials: finalizedMaterials, actualDurationMinutes: execution.actualDurationMinutes, total: record.total });
      const complete = () => syncServiceWorkflow(record, 'complete', {
        actualDurationMinutes: execution.actualDurationMinutes, completedAt: execution.completedAt || new Date().toISOString(), notes: execution.completionNotes,
        laborCost: costs.laborCost, acceptanceStatus: execution.acceptance.status.toLocaleLowerCase('pt-BR'), acceptedBy: execution.acceptance.acceptedBy,
        acceptanceNotes: execution.acceptance.notes, materials: finalizedMaterials.map((material) => ({ id: material.id, catalogItemId: material.catalogItemId || catalogRecords.find((item) => item.sku === material.sku)?.catalogItemId || '', source: material.source, name: material.name, unit: material.unit, quantity: material.quantity, cost: material.cost })),
        checklist: execution.checklist.map((item) => ({ id: item.id, label: item.label, complete: item.complete })),
      });
      return uploadServiceAttachments(record, execution.attachments, () => { complete(); });
    }
    const alreadyConcluded = record.status === 'Concluído';
    if (alreadyConcluded && record.serviceOrder.materialStockState === 'Baixado' && serviceMaterialSignature(finalizedMaterials) !== serviceMaterialSignature(record.serviceOrder.materials ?? [])) {
      setToast('Os materiais desta ordem já foram baixados. Estorne a conclusão antes de alterar o consumo.');
      return false;
    }
    const hasCatalogMaterials = finalizedMaterials.some((material) => material.source === 'Catálogo');
    const shouldConsumeStock = hasCatalogMaterials && ((conclude && !alreadyConcluded) || (alreadyConcluded && record.serviceOrder.materialStockState !== 'Baixado'));
    const stockEffect = shouldConsumeStock
      ? prepareServiceMaterialStockEffect(record, finalizedMaterials, 'consumir')
      : { valid: true, error: '', movements: [] as StockMovementRecord[], nextCatalog: catalogRecords, affected: 0 };
    if (!stockEffect.valid) { setToast(stockEffect.error); return false; }
    const costs = calculateServiceExecutionCost({ serviceLines: record.serviceOrder.lines, materials: finalizedMaterials, actualDurationMinutes: execution.actualDurationMinutes, total: record.total });
    const generatedInstallments = conclude && !alreadyConcluded ? createOperationReceivables(record) : 0;
    if (generatedInstallments < 0) return false;
    const hadFiscalDraft = fiscalDraftRecords.some((draft) => draft.originId === record.id);
    const fiscalDraftCreated = conclude && !alreadyConcluded && record.serviceOrder.fiscalDocument === 'nfse'
      ? (ensureFiscalDraft({ id: record.id, client: record.client, item: record.serviceOrder.lines.map((line) => line.name).join(', '), total: record.total, documentType: 'nfse', sourceLabel: 'Ordem de serviço' }), hadFiscalDraft ? 0 : 1)
      : 0;
    commitServiceMaterialStockEffect(stockEffect);
    const now = new Date().toISOString();
    const label = conclude && !alreadyConcluded ? 'Serviço concluído' : alreadyConcluded ? 'Documento operacional atualizado' : 'Apontamentos salvos';
    const description = conclude && !alreadyConcluded
      ? `${formatDuration(execution.actualDurationMinutes)} realizados · ${finalizedMaterials.length} ${finalizedMaterials.length === 1 ? 'material registrado' : 'materiais registrados'} · custo real ${money(costs.actualCost)} · aceite ${execution.acceptance.status.toLocaleLowerCase('pt-BR')}.${stockEffect.affected ? ` ${stockEffect.affected} ${stockEffect.affected === 1 ? 'baixa de estoque registrada' : 'baixas de estoque registradas'}.` : ''} ${generatedInstallments ? `${generatedInstallments} ${generatedInstallments === 1 ? 'parcela gerada' : 'parcelas geradas'}.` : 'As parcelas já estavam vinculadas.'}${fiscalDraftCreated ? ' Rascunho de NFS-e criado sem transmissão.' : ''}`
      : `${formatDuration(execution.actualDurationMinutes)} apontados · custo real ${money(costs.actualCost)} · aceite ${execution.acceptance.status.toLocaleLowerCase('pt-BR')} · ${execution.attachments.length} ${execution.attachments.length === 1 ? 'anexo referenciado' : 'anexos referenciados'}.${stockEffect.affected ? ` ${stockEffect.affected} ${stockEffect.affected === 1 ? 'baixa de estoque registrada' : 'baixas de estoque registradas'}.` : ''}`;
    const next = created.map((item) => item.id === record.id ? {
      ...item,
      status: conclude ? 'Concluído' as const : item.status,
      serviceOrder: {
        ...record.serviceOrder!,
        actualDurationMinutes: execution.actualDurationMinutes,
        startedAt: execution.startedAt || record.serviceOrder!.startedAt,
        completedAt: conclude ? execution.completedAt || now : record.serviceOrder!.completedAt,
        completionNotes: execution.completionNotes,
        materials: finalizedMaterials,
        checklist: execution.checklist,
        attachments: execution.attachments,
        acceptance: execution.acceptance,
        materialStockState: hasCatalogMaterials ? (shouldConsumeStock || record.serviceOrder!.materialStockState === 'Baixado' ? 'Baixado' as const : 'Pendente' as const) : 'Não aplicável' as const,
        laborCostTotal: costs.laborCost,
        materialCostTotal: costs.materialCost,
        actualCostTotal: costs.actualCost,
        actualMarginPercent: costs.marginPercent,
      },
      events: [...(item.events ?? []), { date: now, label, description }],
    } : item);
    setCreated(next);
    writeCompanyStorage(STORAGE_KEY, JSON.stringify({ version: 1, created: next }));
    setToast(`${label} em ${record.id}. ${description}`);
    return true;
  };

  const visibleNewOptions = newOptions.filter((option) => can(newPermission[option.type] ?? '')
    && (!managementCatalogBridge || !['venda', 'nfe', 'nfce', 'nfse'].includes(option.type))
    && (!['nfe', 'nfce', 'nfse'].includes(option.type) || moduleSettings.fiscal.documentScope.includes(option.type as FiscalDocumentType)));
  const visibleNavGroups = navGroups.map((group) => ({ ...group, items: group.items.filter(([id]) => can(viewPermission[id as View] ?? '')) })).filter((group) => group.items.length > 0);
  const gestaoHref = managementCatalogBridge?.companyId
    ? `/gestao?empresaId=${encodeURIComponent(managementCatalogBridge.companyId)}`
    : '/gestao';
  const profileColor = managementCatalogBridge?.primaryColor || '#003e73';

  return <PermissionContext.Provider value={{ can, user: activeUser, role: activeRole }}><div className="commercial-app" style={{ '--av-profile-primary': profileColor } as CSSProperties}>
    <header className="topbar">
      <div className="topbar-start">
        <a href={gestaoHref} className="module-exit" aria-label="Voltar ao início do AvantaLab"><Icon name="back" size={16}/> Início</a>
        <button type="button" className="mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Icon name="menu"/></button>
      </div>
      <div className="module-brand">
        <img src={brandLogoDataUri} alt="AvantaLab — Do zero ao operacional" className="module-logo"/>
        <span>{managementProfileReady ? moduleSettings.company.name : 'Carregando perfil empresarial'} · Vendas e Serviços</span>
      </div>
      <div className="topbar-actions">
        {managementContextReady && can('settings.view') && <button type="button" className="module-settings-button" onClick={() => navigate('configuracoes')} aria-label="Abrir ajustes de Vendas e Serviços" title="Ajustes"><Icon name="settings" size={18}/></button>}
      </div>
    </header>
    {newMenu && <button type="button" className="new-selection-backdrop" aria-label="Fechar opções de novo cadastro" onClick={() => setNewMenu(false)}/>} 
    <div className="app-body">
      {mobileMenu && <button className="nav-backdrop" type="button" aria-label="Fechar menu" onClick={() => setMobileMenu(false)}/>} 
      <aside className={`sidebar ${mobileMenu ? 'open' : ''} ${newMenu ? 'new-selection-open' : ''}`}>
        {newMenu && <button type="button" className="new-selection-sidebar-backdrop" aria-label="Fechar opções de novo cadastro" onClick={() => setNewMenu(false)}/>} 
        <div className="sidebar-mobile-head"><strong>Menu comercial</strong><button type="button" className="icon-button" onClick={() => setMobileMenu(false)} aria-label="Fechar menu"><Icon name="close"/></button></div>
        {managementContextReady && <div className="new-wrap" ref={newMenuRef}><button type="button" className="new-button" aria-expanded={newMenu} disabled={!visibleNewOptions.length} title={!visibleNewOptions.length ? 'Usuário sem permissão para criar lançamentos' : undefined} onClick={() => setNewMenu((value) => !value)}><Icon name="plus" size={19}/> Novo <span>⌄</span></button>{newMenu && <div className="new-menu">{visibleNewOptions.map((option) => <button type="button" key={option.type} onClick={() => openNew(option.type)}><span><Icon name={option.icon} size={18}/></span><div><strong>{option.title}</strong><small>{option.description}</small></div></button>)}</div>}</div>}
        {managementContextReady && <nav aria-label="Navegação comercial">{visibleNavGroups.map((group) => <div className="nav-group" key={group.label}><span>{group.label}</span>{group.items.map(([id, label, icon, count]) => { const active = view === id || ((view === 'novo_pedido' || view === 'novo_orcamento') && id === commercialReturnView) || (view === 'nova_ordem_servico' && id === serviceReturnView); const displayCount = id === 'vendas' ? String(managementCatalogBridge ? salesRecordCount : count ?? '') : id === 'servicos' ? String(managementCatalogBridge ? serviceRecordCount : count ?? '') : id === 'estoque' ? String(stockAttentionCount) : id === 'fiscal' ? String(managementCatalogBridge ? fiscalDocumentCount : count ?? '') : id === 'recebimentos' ? String(receivableOpenCount) : count; return <button type="button" key={id} onClick={() => navigate(id)} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon name={icon} size={18}/><b>{label}</b>{displayCount !== undefined && displayCount !== '' && <small>{displayCount}</small>}</button>; })}</div>)}</nav>}
        <div className="sidebar-footer"><div><span><Icon name="fiscal" size={17}/></span><p><strong>{sidebarFiscalStatus.title}</strong><small>{sidebarFiscalStatus.detail}</small></p></div></div>
      </aside>
      <main className="main-content">
        {!managementProfileReady && <section className="access-blocked-state"><span><Icon name="clock" size={24}/></span><h1>Carregando perfil empresarial</h1><p>Os dados comerciais permanecem ocultos até a Gestão confirmar o perfil selecionado.</p></section>}
        {managementProfileReady && !managementAccessReady && <section className="access-blocked-state"><span><Icon name={accessBridgeState.loading ? 'clock' : 'warning'} size={24}/></span><h1>{accessBridgeState.loading ? 'Confirmando seu acesso' : 'Acesso não confirmado'}</h1><p>{accessBridgeState.message || 'A Gestão precisa confirmar seu vínculo e suas permissões antes de liberar os dados comerciais.'}</p></section>}
        {managementContextReady && !activeUser?.active && <section className="access-blocked-state"><span><Icon name="warning" size={24}/></span><h1>Acesso bloqueado</h1><p>{activeUser?.name ?? 'Este usuário'} não pode operar o sistema. Peça a reativação ao Gestor ou Administrador.</p></section>}
        {managementContextReady && activeUser?.active && <>
        {view === 'painel' && <Dashboard onNew={openNew} onNavigate={navigate} connected={Boolean(managementCatalogBridge)} created={created} receivableRecords={receivableRecords} catalogRecords={catalogRecords}/>} 
        {view === 'vendas' && <SalesView
          created={created}
          connected={Boolean(managementCatalogBridge)}
          fiscalDrafts={fiscalDraftRecords}
          fiscalPrepareState={fiscalPrepareState}
          onNew={openNew}
          onNotify={setToast}
          onNavigate={navigate}
          onFiscalStart={startFiscal}
          onFiscalPrepare={preparePersistedFiscalEmission}
          onReceivables={openReceivables}
          onLifecycle={updateOrderLifecycle}
        />}
        {view === 'novo_pedido' && <NewOrderView clientRecords={clientRecords} catalogRecords={catalogRecords} settings={moduleSettings} issuerRegistry={fiscalIssuerRegistry} connected={Boolean(managementCatalogBridge)} initialClient={commercialClient} initialSku={commercialSku} onCancel={() => navigate(commercialReturnView)} onCreated={createRecord}/>}
        {view === 'novo_orcamento' && <QuoteView source={quoteSource} clientRecords={clientRecords} catalogRecords={catalogRecords} settings={moduleSettings} connected={Boolean(managementCatalogBridge)} initialClient={commercialClient} initialSku={commercialSku} onCancel={() => navigate(commercialReturnView)} onCreated={createRecord}/>}
        {view === 'nova_ordem_servico' && <NewServiceOrderView clientRecords={clientRecords} catalogRecords={catalogRecords} settings={moduleSettings} issuerRegistry={fiscalIssuerRegistry} connected={Boolean(managementCatalogBridge)} initialClient={serviceClient} initialSku={serviceSku} onCancel={() => navigate(serviceReturnView)} onCreated={createRecord}/>}
        {view === 'servicos' && <ServicesView created={created} connected={Boolean(managementCatalogBridge)} clients={clientRecords} catalogRecords={catalogRecords} fiscalDrafts={fiscalDraftRecords} company={moduleSettings.company} onNew={openNew} onQuote={() => openQuote('servicos')} onNavigate={navigate} onFiscalStart={startFiscal} onReceivables={openReceivables} onStock={openStockMovements} onLifecycle={updateServiceLifecycle} onExecutionSave={saveServiceExecution} onOpenAttachment={openServiceAttachment} onNotify={setToast}/>} 
        {view === 'clientes' && <ClientsView clientRecords={clientRecords} createdRecords={created} receivableRecords={receivableRecords} settings={moduleSettings} connected={Boolean(managementCatalogBridge)} onSave={saveClient} onNewOrder={openClientOrder} onNewService={openClientService} onNewQuote={openClientQuote} onNotify={setToast}/>}
        {view === 'catalogo' && <CatalogView catalogRecords={catalogRecords} onSave={saveCatalogItem} onNavigate={navigate} onOpenCosts={() => openCosts()} onNewOrder={openCatalogOrder} onNewService={openCatalogService} onNewQuote={openCatalogQuote}/>} 
        {view === 'estoque' && (
          <InventoryView
            catalogRecords={catalogRecords}
            movementRecords={stockMovementRecords}
            suppliers={supplierRecords}
            settings={moduleSettings}
            initialOrigin={stockOrigin}
            onClearOrigin={() => setStockOrigin('')}
            onSave={saveStockMovement}
            onNotify={setToast}
          />
        )}
        {view === 'fiscal' && <FiscalView
          origin={fiscalOrigin}
          drafts={fiscalDraftRecords}
          fiscalPrepareState={fiscalPrepareState}
          config={currentFiscalConfig}
          company={moduleSettings.company}
          settings={moduleSettings}
          numberingLedger={fiscalNumberingLedger}
          activeUserName={activeUser?.name ?? 'Sistema'}
          onClearOrigin={() => setFiscalOrigin(null)}
          onPrepare={preparePersistedFiscalEmission}
          onValidate={validatePersistedFiscalEmission}
          onReserveNumber={reservePersistedFiscalNumber}
          onContinueIssuance={continuePersistedFiscalEmission}
          onRevalidate={revalidateFiscalDraft}
          onCancel={cancelFiscalDraft}
          onOpenCertificate={() => setCertificateOpen(true)}
          onNavigate={navigate}
          onSaveNumbering={persistFiscalNumbering}
        />}
        {view === 'recebimentos' && <ReceivablesView records={receivableRecords} initialOrigin={receivableOrigin} connected={Boolean(managementCatalogBridge)} onReceive={receiveInstallment} onRefund={refundInstallment}/>}
        {view === 'relatorios' && <ReportsView created={created} catalogRecords={catalogRecords} movementRecords={stockMovementRecords} receivableRecords={receivableRecords} fiscalDrafts={fiscalDraftRecords} onNotify={setToast}/>}
        {view === 'configuracoes' && (
          <SettingsView
            settings={moduleSettings}
            connected={managementCatalogBridge?.catalogAvailable === true}
            canEdit={can('settings.edit')}
            canViewAccess={can('access.view')}
            canManageAccess={can('access.manage')}
            canConfigureFiscal={can('fiscal.configure')}
            accessBridge={accessBridgeState}
            fiscalRulesBridge={fiscalRulesBridgeState}
            certificateBridge={fiscalCertificateBridgeState}
            onSave={saveModuleSettings}
            onSaveAccess={saveAccessSettings}
            onSaveFiscalMatrix={saveFiscalMatrix}
            onOpenCertificate={() => setCertificateOpen(true)}
          />
        )}
        </>}
      </main>
    </div>
    <NewRecordDialog type={newType} fiscalOrigin={fiscalOrigin} fiscalConfig={currentFiscalConfig} settings={moduleSettings} onClose={() => setNewType(null)} onCreated={createRecord}/>
    <CertificateDigitalDialog open={certificateOpen} company={moduleSettings.company} bridge={fiscalCertificateBridgeState} onClose={() => setCertificateOpen(false)} onRequestCompanyRegistration={() => { setCertificateOpen(false); setCompanyRegistrationOpen(true); }} onInstall={installProtectedCertificate} onActivate={activateProtectedCertificate}/>
    <ClientFormDialog open={clientCreateOpen} client={null} clientRecords={clientRecords} sellers={moduleSettings.commercial.sellers} defaultSeller={moduleSettings.commercial.defaultSeller} connected={Boolean(managementCatalogBridge)} onClose={() => setClientCreateOpen(false)} onSave={saveClient}/>
    <SupplierFormDialog open={supplierCreateOpen} suppliers={supplierRecords} onClose={() => setSupplierCreateOpen(false)} onSave={saveSupplier}/>
    <SettingsDialog section={companyRegistrationOpen ? 'empresa' : null} settings={moduleSettings} onClose={() => { setCompanyRegistrationOpen(false); setCertificateOpen(true); }} onSave={(next) => { if (!saveModuleSettings(next)) return; setCompanyRegistrationOpen(false); setCertificateOpen(true); }}/>
    {toast && <div className="toast" role="status"><Icon name="check" size={18}/><span>{toast}</span><button type="button" onClick={() => setToast('')} aria-label="Fechar mensagem"><Icon name="close" size={16}/></button></div>}
  </div></PermissionContext.Provider>;
}
