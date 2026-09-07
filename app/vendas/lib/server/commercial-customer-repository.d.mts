export const COMMERCIAL_CUSTOMER_REPOSITORY_REFERENCE: string;
export type CommercialCustomerRecord = {
  id: string; companyId: string; code: number; personType: 'juridica' | 'fisica';
  documentType: 'cnpj' | 'cpf'; document: string; legalName: string; tradeName: string;
  displayName: string; stateRegistration: string; municipalRegistration: string;
  stateRegistrationIndicator: 'contribuinte_icms' | 'contribuinte_isento' | 'nao_contribuinte';
  email: string; phone: string; primaryContact: string; postalCode: string; street: string;
  number: string; complement: string; district: string; city: string; cityCode: string;
  state: string; sellerId: string; paymentTerms: string; notes: string;
  status: 'ativo' | 'revisar_cadastro' | 'inativo'; version: number;
  createdBy: string; updatedBy: string; createdAt: string; updatedAt: string;
};
export function createPostgresCommercialCustomerRepository(options?: { pool?: any }): {
  id: string; configured: true;
  create(customer: Record<string, any>): Promise<CommercialCustomerRecord>;
  update(input: Record<string, any>): Promise<CommercialCustomerRecord>;
  deactivate(input: Record<string, any>): Promise<CommercialCustomerRecord>;
  get(input: { companyId: string; customerId: string }): Promise<CommercialCustomerRecord | null>;
  findByDocument(input: { companyId: string; document: string }): Promise<CommercialCustomerRecord | null>;
  list(input: { companyId: string; query?: string; status?: string; limit?: number; offset?: number }): Promise<CommercialCustomerRecord[]>;
};
