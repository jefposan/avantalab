import 'server-only';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export type ContextoCarteira = {
  db: SupabaseClient;
  usuario: User;
  empresaId: string;
  podeGerenciar: boolean;
};

export async function autenticarCarteira(request: Request, empresaId: string): Promise<ContextoCarteira | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !anon || !service || !token || !empresaId) return null;
  const publico = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await publico.auth.getUser(token);
  if (error || !data.user) return null;
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: vinculo } = await db.from('usuarios_empresa').select('perfil,status').eq('empresa_id', empresaId).eq('user_id', data.user.id).eq('status', 'ativo').maybeSingle();
  if (!vinculo) return null;
  return { db, usuario: data.user, empresaId, podeGerenciar: ['gestor_master', 'administrador'].includes(vinculo.perfil || '') };
}

export const CABECALHOS_PRIVADOS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
};
