import { supabase } from '@/app/lib/supabase';
import { assertCompanyScope } from '../permissions';
import { PROJECT_FILE_VERSION, type ProjectCollection } from '../types';
import type { ProjectRepository } from './repository';

export class SupabaseProjectRepository implements ProjectRepository {
  async load(companyId: string): Promise<ProjectCollection | null> {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) throw new Error('Sua sessão expirou. Entre novamente para abrir os projetos.');
    const response = await fetch(`/api/modulos/projetos/documento?empresaId=${encodeURIComponent(companyId)}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.mensagem || 'Não foi possível carregar os projetos.');
    if (!data?.documento) return null;
    const collection = data.documento as ProjectCollection;
    if (collection.version !== PROJECT_FILE_VERSION) throw new Error('Os projetos usam uma versão incompatível.');
    assertCompanyScope(collection.companyId, companyId);
    return collection;
  }

  async save(collection: ProjectCollection): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sua sessão expirou. Entre novamente para salvar.');
    const response = await fetch('/api/modulos/projetos/documento', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ empresaId: collection.companyId, documento: collection }) });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.mensagem || 'Não foi possível salvar os projetos.');
  }

  async clear(companyId: string): Promise<void> {
    const { error } = await supabase.from('projetos_documentos').delete().eq('empresa_id', companyId);
    if (error) throw new Error(`Não foi possível limpar os projetos: ${error.message}`);
  }
}
