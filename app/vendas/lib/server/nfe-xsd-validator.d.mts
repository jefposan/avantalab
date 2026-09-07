export type NfeXsdValidationMessage = { code: string; field: string; message: string; line?: number; index?: number };
export type NfeXsdValidationResult = { executed: boolean; valid: boolean; schemaPackage: string; schemaRoot: string; errors: NfeXsdValidationMessage[] };
export const NFE_XSD_PACKAGE: 'PL_010e_v1.02';
export const NFE_XSD_ROOT: 'nfe_v4.00.xsd';
export const NFE_XSD_MAX_XML_BYTES: number;
export function getNfeXsdPath(): string;
export function nfeXsdRuntimeStatus(): { available: boolean; validator: 'xmllint'; schemaPath: string; schemaPackage: string; schemaRoot: string };
export function validateNfeXmlAgainstXsd(xml: string, options?: { allowSignature?: boolean }): Promise<NfeXsdValidationResult>;
