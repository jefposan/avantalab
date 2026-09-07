export type FiscalHomologationDocument = 'nfe' | 'nfce' | 'nfse';
export type FiscalHomologationStatus = 'Não iniciado' | 'Em preparação' | 'Pronto para teste externo' | 'Aguardando evidência' | 'Validado externamente' | 'Reprovado' | 'Não aplicável';
export type FiscalHomologationScenario = { id: string; documentType: FiscalHomologationDocument; title: string; purpose: string; expectedResult: string; required: boolean; status: FiscalHomologationStatus; evidenceReference: string; externalReference: string; testedAt: string; testedBy: string; notes: string };
export type FiscalHomologationPlan = { version: 1; reference: string; company: { name: string; document: string; uf: string; city: string; cityCode: string; taxRegime: string }; coordinator: string; targetDate: string; providerMode: string; nfseAuthorityMode: string; documentScope: FiscalHomologationDocument[]; notes: string; scenarios: FiscalHomologationScenario[] };
export const FISCAL_HOMOLOGATION_REFERENCE: string;
export const FISCAL_HOMOLOGATION_STATUSES: FiscalHomologationStatus[];
export function createDefaultFiscalHomologationPlan(company?: Partial<FiscalHomologationPlan['company']>): FiscalHomologationPlan;
export function normalizeFiscalHomologationPlan(value: unknown, company?: Partial<FiscalHomologationPlan['company']>): FiscalHomologationPlan;
export function validateFiscalHomologationPlan(value: unknown): { valid: boolean; errors: string[]; warnings: string[]; total: number; required: number; validated: number; evidenceCount: number; progress: number; readyForExternalCycle: boolean; externallyValidated: boolean };
