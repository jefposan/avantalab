export const FISCAL_LOCAL_MAX_BODY_BYTES: number;
export function containsForbiddenFiscalSecret(value: unknown, depth?: number): boolean;
export function readLocalFiscalJsonRequest(request: Request, expectedMode: string): Promise<{ ok: false; status: number; error: string } | { ok: true; status: 200; value: Record<string, unknown> }>;
export function saoPauloFiscalTimestamp(date?: Date): string;
