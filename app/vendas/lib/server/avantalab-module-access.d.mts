export const AVANTALAB_MODULE_ACCESS_REFERENCE: string;
export const COMMERCIAL_PERMISSION_DEFAULTS_BY_PROFILE: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
export const FISCAL_DOWNLOAD_PERMISSION_DEFAULTS: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
export function resolveModuleEffectivePermissions(input?: { profile?: string; roleOverrides?: Record<string,string>; userOverrides?: Record<string,string>; defaults?: Record<string,Record<string,boolean>> }): Record<string,boolean>;
export function createPostgresAvantaLabModuleAccessRepository(options?: { pool: object; moduleId?: string }): { id: string; configured: true; moduleId: string; findAccess(input?: object): Promise<object | null> };
export function createAvantaLabAccessResolver(options?: { authClient: object; accessRepository: object; moduleId?: string; defaults?: Record<string,Record<string,boolean>>; clock?: () => string }): { id: string; resolve(request: Request, input?: { companyId?: string }): Promise<{ authenticated: boolean; reason: string; boundary: object; effectivePermissions: Record<string,boolean>; profile: string }> };
