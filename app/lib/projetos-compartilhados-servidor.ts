import type { SupabaseClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA, assinaturaVigente } from './cobranca';
import { resolverEstadoAcesso } from './cobranca-servidor';
import { calculateProjectProgress } from '@/app/projetos/domain/project';
import { STATUSES, type Project, type ProjectCollection, type ProjectStatus, type SharedProjectSummary } from '@/app/projetos/types';

type ShareRow = {
  id: string;
  empresa_id: string;
  projeto_id: string;
  acesso: 'editor' | 'observador';
};

function projectStatus(value: unknown): ProjectStatus {
  return STATUSES.includes(value as ProjectStatus) ? value as ProjectStatus : 'ideia';
}

export async function listarProjetosCompartilhados(db: SupabaseClient, userId: string): Promise<SharedProjectSummary[]> {
  if (!userId) return [];
  const { data: shares, error: sharesError } = await db.from('projetos_compartilhamentos')
    .select('id,empresa_id,projeto_id,acesso')
    .eq('user_id', userId)
    .eq('situacao', 'ativo')
    .order('criado_em', { ascending: false });
  if (sharesError) throw new Error('Não foi possível consultar os projetos compartilhados.');
  if (!shares?.length) return [];

  const companyIds = [...new Set((shares as ShareRow[]).map((item) => item.empresa_id))];
  const [companiesResult, configsResult, modulesResult, documentsResult] = await Promise.all([
    db.from('empresas').select('id,nome').in('id', companyIds),
    db.from('configuracoes').select('empresa_id,cor_primaria,dark_mode').in('empresa_id', companyIds),
    db.from('empresa_modulos').select('empresa_id,ativo,expira_em').in('empresa_id', companyIds).eq('modulo_id', 'projetos'),
    db.from('projetos_documentos').select('empresa_id,documento').in('empresa_id', companyIds),
  ]);
  if (companiesResult.error || configsResult.error || modulesResult.error || documentsResult.error) {
    throw new Error('Não foi possível preparar os projetos compartilhados.');
  }

  const now = Date.now();
  const installedCompanies = new Set((modulesResult.data || [])
    .filter((item) => item.ativo === true && (!item.expira_em || new Date(item.expira_em).getTime() > now))
    .map((item) => String(item.empresa_id)));
  if (COBRANCA_ATIVA && installedCompanies.size) {
    const validity = await Promise.all([...installedCompanies].map(async (companyId) => {
      const state = await resolverEstadoAcesso(companyId);
      return state?.tipoPerfil === 'empresa' && assinaturaVigente(state) ? companyId : null;
    }));
    const validCompanies = new Set(validity.filter((item): item is string => Boolean(item)));
    [...installedCompanies].forEach((companyId) => { if (!validCompanies.has(companyId)) installedCompanies.delete(companyId); });
  }

  const companies = new Map((companiesResult.data || []).map((item) => [String(item.id), String(item.nome || 'Perfil empresarial')]));
  const configs = new Map((configsResult.data || []).map((item) => [String(item.empresa_id), String(item.cor_primaria || '#003E73')]));
  const documents = new Map((documentsResult.data || []).map((item) => [String(item.empresa_id), item.documento as ProjectCollection | null]));

  return (shares as ShareRow[]).flatMap((share) => {
    if (!installedCompanies.has(share.empresa_id)) return [];
    const collection = documents.get(share.empresa_id);
    const project = collection?.projects?.find((item) => item.id === share.projeto_id) as Project | undefined;
    if (!project) return [];
    return [{
      shareId: share.id,
      companyId: share.empresa_id,
      companyName: companies.get(share.empresa_id) || 'Perfil empresarial',
      companyColor: configs.get(share.empresa_id) || '#003E73',
      projectId: project.id,
      name: project.name,
      description: project.description,
      color: project.color,
      icon: project.icon,
      status: projectStatus(project.status),
      archivedAt: project.archivedAt,
      dueDate: project.dueDate,
      updatedAt: project.updatedAt,
      taskCount: project.nodes.filter((node) => node.type === 'tarefa').length,
      progress: calculateProjectProgress(project),
      access: share.acesso,
    }];
  });
}
