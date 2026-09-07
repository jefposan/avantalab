import type { CatalogItemRecord } from './demo-data';

export type ManagementCatalogItem = CatalogItemRecord & { catalogItemId: string };

export type ManagementCatalogBridge = {
  items: ManagementCatalogItem[];
  companyId: string;
  catalogAvailable: boolean;
  message: string;
  primaryColor: string;
  company: {
    name: string;
    legalName: string;
    document: string;
    stateRegistration: string;
    municipalRegistration: string;
    taxRegime: string;
    cityCode: string;
    cep: string;
    street: string;
    number: string;
    complement: string;
    district: string;
    city: string;
    email: string;
    phone: string;
  } | null;
  priceTable: { id: string; name: string } | null;
  generatedAt: string;
  stockIntegrated: false;
  readOnly: true;
};

export function isAllowedLocalManagementOrigin(origin: string, currentOrigin?: string): boolean;
export function mapManagementCatalogItem(item: Record<string, unknown>): ManagementCatalogItem;
export function parseManagementCatalogMessage(data: unknown): ManagementCatalogBridge | null;
export const MANAGEMENT_CATALOG_MESSAGE_TYPE: 'AVANTALAB_VENDAS_CATALOGO_V1';
export const MANAGEMENT_CATALOG_READY_TYPE: 'AVANTALAB_VENDAS_CATALOGO_READY_V1';
