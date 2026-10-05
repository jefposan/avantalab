import 'server-only';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { uuidIsValid } from './listing-model';

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !anon || !service) throw new MarketplaceError(503, 'server_config', 'Configuração do servidor incompleta.');
  return {
    auth: createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }),
    db: createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

async function requestUser(request: Request): Promise<{ user: User; db: SupabaseClient }> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new MarketplaceError(401, 'unauthorized', 'Sua sessão expirou. Entre novamente.');
  const { auth, db } = clients();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) throw new MarketplaceError(401, 'unauthorized', 'Sua sessão expirou. Entre novamente.');
  return { user: data.user, db };
}

async function activeModule(db: SupabaseClient, empresaId: string) {
  const { data, error } = await db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id', empresaId).eq('modulo_id', 'marketplaces').maybeSingle();
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível validar o acesso ao AvantaPreços.');
  return Boolean(data?.ativo && (!data.expira_em || new Date(data.expira_em).getTime() > Date.now()));
}

export async function authorizePriceConsultation(request: Request, rawEmpresaId: unknown) {
  if (!uuidIsValid(rawEmpresaId)) throw new MarketplaceError(400, 'invalid_company', 'Empresa inválida.');
  const empresaId = String(rawEmpresaId);
  const { user, db } = await requestUser(request);
  const [{ data: regular, error: regularError }, { data: dedicated, error: dedicatedError }] = await Promise.all([
    db.from('usuarios_empresa').select('id,perfil,status').eq('empresa_id', empresaId).eq('user_id', user.id).eq('status', 'ativo').maybeSingle(),
    db.from('marketplace_price_users').select('id,ativo').eq('empresa_id', empresaId).eq('user_id', user.id).eq('ativo', true).maybeSingle(),
  ]);
  if (regularError || dedicatedError) throw new MarketplaceError(503, 'database', 'Não foi possível validar seu acesso ao AvantaPreços.');
  if (!regular && !dedicated) throw new MarketplaceError(403, 'forbidden', 'Este login não possui acesso ao AvantaPreços desta empresa.');
  if (!await activeModule(db, empresaId)) throw new MarketplaceError(403, 'module_inactive', 'O AvantaPreços está indisponível nesta empresa.');
  return { db, empresaId, usuario: user, dedicated: Boolean(dedicated), perfil: regular?.perfil || 'consulta_precos' };
}

export async function listPriceCompanies(request: Request) {
  const { user, db } = await requestUser(request);
  const [{ data: regular, error: regularError }, { data: dedicated, error: dedicatedError }] = await Promise.all([
    db.from('usuarios_empresa').select('empresa_id,perfil').eq('user_id', user.id).eq('status', 'ativo'),
    db.from('marketplace_price_users').select('empresa_id').eq('user_id', user.id).eq('ativo', true),
  ]);
  if (regularError || dedicatedError) throw new MarketplaceError(503, 'database', 'Não foi possível carregar as empresas deste acesso.');
  const candidates = new Map<string, string>();
  for (const item of regular || []) candidates.set(item.empresa_id, item.perfil || '');
  for (const item of dedicated || []) if (!candidates.has(item.empresa_id)) candidates.set(item.empresa_id, 'consulta_precos');
  const activeIds: string[] = [];
  for (const id of candidates.keys()) if (await activeModule(db, id)) activeIds.push(id);
  if (!activeIds.length) return [];
  const { data: companies, error } = await db.from('empresas').select('id,nome').in('id', activeIds).order('nome');
  if (error) throw new MarketplaceError(503, 'database', 'Não foi possível carregar as empresas deste acesso.');
  return (companies || []).map((company) => ({ ...company, perfil: candidates.get(company.id) || 'consulta_precos' }));
}

export function priceAdminClient() {
  return clients().db;
}
