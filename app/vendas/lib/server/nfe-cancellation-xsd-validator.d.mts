export const NFE_CANCELLATION_XSD_REFERENCE: string;
export const NFE_CANCELLATION_XSD_PACKAGE: string;
export const NFE_CANCELLATION_ALPHA_XSD_PACKAGE: string;
export function getNfeCancellationXsdPath(root?: string, alpha?: boolean): string;
export function nfeCancellationXsdRuntimeStatus(root?: string, alpha?: boolean): Record<string, any>;
export function validateNfeCancellationXmlAgainstXsd(xml: string, root?: string): Promise<Record<string, any>>;
