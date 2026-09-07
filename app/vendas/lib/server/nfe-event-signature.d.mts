export const NFE_EVENT_SIGNATURE_REFERENCE: string;
export function createProtectedSignedNfeEventXml(input?: { unsignedEventXml?: string; certificatePem?: string; signCanonicalized?: (value: string) => string | Promise<string> }): Promise<Record<string, any>>;
export function verifyProtectedSignedNfeEventXml(signedEventXml: string, expectedIssuerDocument?: string): Promise<Record<string, any>>;
