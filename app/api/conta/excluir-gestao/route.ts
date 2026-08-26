import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CONFIRMACAO = 'EXCLUIR MINHA CONTA';

function erro(mensagem: string, status = 400, bloqueios: string[] = []) {
  return NextResponse.json({ erro: true, mensagem, bloqueios }, { status });
}

// Exclusão pessoal restrita à Gestão. A conta de autenticação e qualquer
// vínculo do AvantaVendas permanecem intactos e são tratados naquele produto.
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!url || !anon || !service || !token) return erro('Sessão não encontrada.', 401);
  const cliente = createClient(url, anon);
  const { data: auth, error: authErro } = await cliente.auth.getUser(token);
  if (authErro || !auth.user) return erro('Sessão não encontrada.', 401);
  const corpo = await request.json().catch(() => ({}));
  if (String(corpo.confirmacao || '').trim().toUpperCase() !== CONFIRMACAO) {
    return erro(`Digite “${CONFIRMACAO}” para confirmar.`);
  }

  const db = createClient(url, service);
  const { data: vinculos, error: vinculosErro } = await db
    .from('usuarios_empresa')
    .select('id, empresa_id, perfil')
    .eq('user_id', auth.user.id)
    .eq('status', 'ativo');
  if (vinculosErro) return erro('Não foi possível verificar seus vínculos na Gestão.', 500);

  const bloqueios: string[] = [];
  for (const vinculo of vinculos || []) {
    const { count, error: erroGestores } = await db
      .from('usuarios_empresa')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', vinculo.empresa_id)
      .eq('status', 'ativo')
      .in('perfil', ['gestor_master', 'administrador']);
    if (erroGestores) return erro('Não foi possível validar as responsabilidades dos seus perfis.', 500);
    if (vinculo.perfil === 'gestor_master') {
      bloqueios.push('Você é Gestor Master de um perfil. Transfira essa responsabilidade antes de excluir sua conta da Gestão.');
    } else if (vinculo.perfil === 'administrador' && (count || 0) <= 1) {
      bloqueios.push('Você é o único administrador de um perfil. Adicione ou promova outro administrador antes de excluir sua conta da Gestão.');
    }
  }
  if (bloqueios.length) return erro('Há responsabilidades que precisam ser transferidas antes da exclusão.', 409, bloqueios);

  const ids = (vinculos || []).map((v) => v.id);
  if (ids.length) {
    const { error: removerErro } = await db.from('usuarios_empresa').delete().in('id', ids);
    if (removerErro) return erro('Não foi possível remover seus acessos da Gestão. Nenhuma conta do AvantaVendas foi alterada.', 500);
  }
  return NextResponse.json({ erro: false, mensagem: 'Sua conta foi removida da Gestão. O AvantaVendas continua separado e não foi alterado.' });
}
