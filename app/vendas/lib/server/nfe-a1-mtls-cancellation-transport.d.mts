export const NFE_A1_MTLS_CANCELLATION_TRANSPORT_REFERENCE: string;
export function createNfeA1MtlsCancellationTransport(options?: Record<string, any>): { id: string; configured: boolean; postSoap(input?: Record<string, any>): Promise<{ status: number; body: string }> };
