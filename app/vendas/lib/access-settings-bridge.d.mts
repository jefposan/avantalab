export type AccessBridgeRoleId = 'gestor' | 'administrador' | 'operador_completo' | 'operador_simples';
export type AccessBridgeSnapshot = {
  available: boolean;
  writable: boolean;
  loading: false;
  message: string;
  activeUserId: string;
  roles: Array<{ id: AccessBridgeRoleId; permissions: string[] }>;
  users: Array<{ id: string; name: string; email: string; roleId: AccessBridgeRoleId; sector: string; active: boolean; overrides: Record<string, 'permitir' | 'bloquear'> }>;
  audit: Array<{ id: string; at: string; actor: string; summary: string }>;
};
export function parseAccessSnapshotMessage(data: unknown): AccessBridgeSnapshot | null;
export function createAccessSaveRequest(input: { requestId: string; currentAccess: unknown; nextAccess: unknown }): { type: 'AVANTALAB_VENDAS_ACCESS_SAVE_REQUEST_V1'; requestId: string; changes: Array<{ targetType: 'role' | 'user'; targetId: string; permission: string; decision: 'allow' | 'deny' | 'inherit' }> } | null;
export function parseAccessSaveResponse(data: unknown): { requestId: string; ok: boolean; message: string } | null;
export const ACCESS_READY_MESSAGE_TYPE: 'AVANTALAB_VENDAS_ACCESS_READY_V1';
export const ACCESS_SNAPSHOT_MESSAGE_TYPE: 'AVANTALAB_VENDAS_ACCESS_SNAPSHOT_V1';
export const ACCESS_SAVE_REQUEST_MESSAGE_TYPE: 'AVANTALAB_VENDAS_ACCESS_SAVE_REQUEST_V1';
export const ACCESS_SAVE_RESPONSE_MESSAGE_TYPE: 'AVANTALAB_VENDAS_ACCESS_SAVE_RESPONSE_V1';
