import { assertCompanyScope } from '../permissions';
import { PROJECT_FILE_VERSION, type ProjectCollection } from '../types';

export interface ProjectRepository {
  load(companyId: string): Promise<ProjectCollection | null>;
  save(collection: ProjectCollection): Promise<void>;
  clear(companyId: string): Promise<void>;
}

const STORAGE_KEY = `avantalab:projetos:demo:v${PROJECT_FILE_VERSION}`;

function storageKey(companyId: string) { return `${STORAGE_KEY}:${companyId}`; }
function backupKey(companyId: string) { return `${storageKey(companyId)}:backup`; }

export class BrowserDemoProjectRepository implements ProjectRepository {
  async load(companyId: string) {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(storageKey(companyId));
    if (!raw) return null;
    let collection: ProjectCollection;
    try {
      collection = JSON.parse(raw) as ProjectCollection;
    } catch {
      const backup = window.localStorage.getItem(backupKey(companyId));
      if (!backup) throw new Error('Os dados locais estão corrompidos e não há cópia de recuperação.');
      collection = JSON.parse(backup) as ProjectCollection;
    }
    if (collection.version !== PROJECT_FILE_VERSION) throw new Error('Os dados locais usam uma versão incompatível.');
    assertCompanyScope(collection.companyId, companyId);
    return collection;
  }

  async save(collection: ProjectCollection) {
    if (typeof window === 'undefined') return;
    const key = storageKey(collection.companyId);
    const current = window.localStorage.getItem(key);
    if (current) window.localStorage.setItem(backupKey(collection.companyId), current);
    window.localStorage.setItem(key, JSON.stringify(collection));
  }

  async clear(companyId: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(storageKey(companyId));
    window.localStorage.removeItem(backupKey(companyId));
  }
}
