import type { FiscalIssuerRegistry, FiscalIssuerSelectionSnapshot } from './fiscal-issuer-routing.mjs';

export type NfeSpCertificateMode = 'Não definido' | 'Certificado A1' | 'Certificado em nuvem';
export type NfeSpHomologationConfig = {
  version: 2;
  adapterId: string;
  reference: string;
  environment: 'homologacao';
  selectedEstablishmentId: string;
  selectedDraftId: string;
  testDocumentNumber: string;
  testNumericCode: string;
  accreditationConfirmed: boolean;
  contingencyReviewed: boolean;
  responsible: string;
  certificate: { mode: NfeSpCertificateMode; secureReference: string; subjectDocument: string; expiresAt: string; chainValidated: boolean };
  notes: string;
  lastLocalDiagnosticAt: string;
};
export type NfeSpHomologationEndpoint = { id: string; service: string; version: string; purpose: string; url: string };
export type NfeSpHomologationCheck = { id: string; phase: 'cadastro' | 'seguranca' | 'documento' | 'conector'; label: string; ready: boolean; detail: string };
export type NfeSpHomologationContext = {
  issuerRegistry?: FiscalIssuerRegistry;
  company?: Record<string, unknown>;
  drafts?: Array<Record<string, any>>;
  fiscalResponsible?: string;
  taxReviewConfirmed?: boolean;
  taxReformReviewConfirmed?: boolean;
  matrixReady?: boolean;
  now?: Date;
};

export const NFE_SP_HOMOLOGATION_REFERENCE: string;
export const NFE_SP_ADAPTER_ID: string;
export const NFE_SP_HOMOLOGATION_ENDPOINTS: readonly NfeSpHomologationEndpoint[];
export function createDefaultNfeSpHomologationConfig(): NfeSpHomologationConfig;
export function normalizeNfeSpHomologationConfig(value: unknown): NfeSpHomologationConfig;
export function evaluateNfeSpHomologationConfig(value: unknown, context?: NfeSpHomologationContext): {
  config: NfeSpHomologationConfig;
  issuer?: Record<string, any>;
  issuerSnapshot?: FiscalIssuerSelectionSnapshot;
  draft?: Record<string, any>;
  checks: NfeSpHomologationCheck[];
  blockers: string[];
  localDiagnosticPassed: boolean;
  readyForConnectorDevelopment: boolean;
  readyForExternalHomologation: false;
  externalTransmissionAllowed: false;
  endpoints: readonly NfeSpHomologationEndpoint[];
};
export function buildNfeSpHomologationExecutionPlan(value: unknown, context?: NfeSpHomologationContext): {
  adapterId: string;
  reference: string;
  environment: 'homologacao';
  authority: 'SEFAZ/SP';
  documentModel: '55';
  schemaVersion: '4.00';
  transport: string;
  issuer?: FiscalIssuerSelectionSnapshot;
  draftId: string;
  transmissionEnabled: false;
  steps: Array<{ id: string; label: string; state: 'implemented' | 'contract' | 'lab' | 'planned' | 'blocked'; service: string }>;
};
