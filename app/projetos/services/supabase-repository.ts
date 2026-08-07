import { supabase } from '@/app/lib/supabase';
import { assertCompanyScope } from '../permissions';
import { PROJECT_FILE_VERSION, type ProjectCollection } from '../types';
import type { ProjectRepository } from './repository';

export class SupabaseProjectRepository implements ProjectRepository {
  async load(companyId: string): Promise<ProjectCollection | null> {
    const { data, error } = await supabase.from('projetos_documentos').select('documento').eq('empresa_id', companyId).maybeSingle();
    if (error) throw new Error(`Não foi possível carregar os projetos: ${error.message}`);
    if (!data?.documento) return null;
    const collection = data.documento as ProjectCollection;
    if (collection.version !== PROJECT_FILE_VERSION) throw new Error('Os projetos usam uma versão incompatível.');
    assertCompanyScope(collection.companyId, companyId);
    return collection;
  }

  async save(collection: ProjectCollection): Promise<void> {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error('Sua sessão expirou. Entre novamente para salvar.');
    const { error } = await supabase.from('projetos_documentos').upsert({
      empresa_id: collection.companyId,
      documento: collection,
      atualizado_por: auth.user.id,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'empresa_id' });
    if (error) throw new Error(`Não foi possível salvar os projetos: ${error.message}`);
  }

  async clear(companyId: string): Promise<void> {
    const { error } = await supabase.from('projetos_documentos').delete().eq('empresa_id', companyId);
    if (error) throw new Error(`Não foi possível limpar os projetos: ${error.message}`);
  }
}
