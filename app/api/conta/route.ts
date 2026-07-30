import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { criarSupabaseAdmin } from '../../lib/admin-server';

export const runtime = 'nodejs';

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

export async function DELETE(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !anonKey) return erro('Configuração do servidor incompleta.', 500);

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const corpo = await request.json().catch(() => ({}));
  if (String(corpo.confirmacao || '').trim().toUpperCase() !== 'EXCLUIR') {
    return erro('Confirmação inválida.', 400);
  }

  const cliente = createClient(supabaseUrl, anonKey);
  const { data: autenticacao, error: erroAuth } = await cliente.auth.getUser(token);
  if (erroAuth || !autenticacao.user) return erro('Sessão inválida.', 401);

  const userId = autenticacao.user.id;
  const db = criarSupabaseAdmin();
  const { data: vinculos, error: erroVinculos } = await db
    .from('usuarios_empresa')
    .select('id, empresa_id, perfil, status')
    .eq('user_id', userId);
  if (erroVinculos) return erro('Não foi possível verificar seus perfis.', 500);

  // Antes de qualquer alteração, garante que nenhuma empresa com equipe fique
  // sem gestor master. O usuário pode transferir a função e tentar novamente.
  for (const vinculo of vinculos || []) {
    if (vinculo.perfil !== 'gestor_master' || vinculo.status !== 'ativo') continue;
    const [{ count: outrosAtivos }, { count: outrosMasters }] = await Promise.all([
      db.from('usuarios_empresa')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', vinculo.empresa_id)
        .eq('status', 'ativo')
        .neq('user_id', userId),
      db.from('usuarios_empresa')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', vinculo.empresa_id)
        .eq('status', 'ativo')
        .eq('perfil', 'gestor_master')
        .neq('user_id', userId),
    ]);
    if ((outrosAtivos || 0) > 0 && (outrosMasters || 0) === 0) {
      return erro(
        'Antes de excluir a conta, defina outro Gestor Master nos perfis que possuem equipe.',
        409,
      );
    }
  }

  let retencaoLegal = false;
  for (const vinculo of vinculos || []) {
    const { count: outrosAtivos } = await db
      .from('usuarios_empresa')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', vinculo.empresa_id)
      .eq('status', 'ativo')
      .neq('user_id', userId);

    if (vinculo.perfil === 'gestor_master' && (outrosAtivos || 0) === 0) {
      const { error: erroPerfil } = await db.from('empresas').delete().eq('id', vinculo.empresa_id);
      if (erroPerfil) retencaoLegal = true;
      continue;
    }

    const { error: erroVinculo } = await db.from('usuarios_empresa').delete().eq('id', vinculo.id);
    if (erroVinculo) retencaoLegal = true;
  }

  const { error: erroExcluir } = await db.auth.admin.deleteUser(userId);
  if (!erroExcluir) {
    return NextResponse.json({ ok: true, retencaoLegal });
  }

  // Registros trabalhistas/REP-P são legalmente imutáveis e podem impedir a
  // remoção física do UUID. Nesse caso, a conta é anonimizada, bloqueada e
  // perde todos os meios de autenticação; apenas os registros obrigatórios
  // permanecem pelo prazo legal.
  const emailAnonimo = `deleted-${userId}@deleted.avantalab.invalid`;
  const { error: erroAnonimizar } = await db.auth.admin.updateUserById(userId, {
    email: emailAnonimo,
    password: randomBytes(48).toString('base64url'),
    email_confirm: true,
    ban_duration: '876000h',
    user_metadata: { conta_excluida: true },
    app_metadata: { conta_excluida: true },
  });
  if (erroAnonimizar) {
    console.error('Falha ao excluir e anonimizar conta:', erroExcluir, erroAnonimizar);
    return erro('Não foi possível concluir a exclusão. Nenhuma sessão foi encerrada.', 500);
  }

  return NextResponse.json({ ok: true, retencaoLegal: true });
}
