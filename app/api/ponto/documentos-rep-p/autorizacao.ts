import { createClient } from '@supabase/supabase-js';
import { criarSupabaseAdmin } from '@/app/lib/admin-server';

export async function autorizarEmpresa(request: Request, empresaId: string) {
  const db = criarSupabaseAdmin();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const auth = request.headers.get('authorization');
  if (!supabaseUrl || !anon || !auth) return null;

  const usuario = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await usuario.auth.getUser();
  if (!user) return null;
  const { data: vinculo } = await db
    .from('usuarios_empresa')
    .select('user_id')
    .eq('empresa_id', empresaId)
    .eq('user_id', user.id)
    .eq('status', 'ativo')
    .in('perfil', ['gestor_master', 'administrador'])
    .maybeSingle();
  if (!vinculo) return null;
  return { db, solicitante: user.id };
}
