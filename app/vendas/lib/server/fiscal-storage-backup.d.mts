export const FISCAL_STORAGE_BACKUP_REFERENCE: string;
export function createFiscalStorageBackupService(options?: {
  sourceStorage: { readVerified(input?: object): Promise<{ content: Uint8Array; contentType: string; byteLength: number; checksum: string; versionId: string }> };
  targetStorage?: { putImmutable(input?: object): Promise<{ storageReference: string; versionId: string; checksum: string; storedAt: string; reused: boolean }> };
  key: Uint8Array;
  clock?: () => string;
  randomBytes?: (size: number) => Uint8Array;
}): {
  id: string;
  createBackup(input?: object): Promise<{ envelope: Uint8Array; checksum: string; byteLength: number; sourceVersion: string }>;
  restoreBackup(envelope: Uint8Array): Promise<object>;
};
