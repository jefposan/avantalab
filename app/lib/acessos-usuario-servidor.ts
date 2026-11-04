import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { areaDaApi, liberacoesDoVinculo } from './acessos-usuario';

export async function conferirLiberacao(db: SupabaseClient, usuarioId: string, empresaId: string, area: string) {
  const { data, error } = await db.from('usuarios_empresa').select('perfil,status,dashboard_liberada,modulos_liberados').eq('user_id', usuarioId).eq('empresa_id', empresaId).eq('status', 'ativo').limit(1).maybeSingle();
  if (error) throw new Error('Não foi possível conferir as liberações. A migração de acessos precisa estar instalada.');
  if (!data) return false;
  const acesso = liberacoesDoVinculo(data);
  return area === 'contexto' || (area === 'dashboard' ? acesso.dashboard : acesso.modulos.includes(area));
}

/** Protege também endpoints legados que usam service role diretamente. */
export async function protegerApiPorLiberacao(request: Request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || !request.headers.get('authorization')?.match(/^Bearer\s/i)) return null;
  const url = new URL(request.url);
  // O painel usa senha administrativa própria (exigirAdmin), não JWT de usuário.
  // Limitar às rotas existentes; cada handler mantém sua autenticação obrigatória.
  if (/^\/api\/admin-(cadastros|configuracoes|consumo|conteudos-vendas|cupons|disparos|downloads|feedbacks|perfis|rep-p-certificado|rep-p-empresas)(\/|$)/.test(url.pathname)) return null;
  if (/^\/api\/(admin|cron|avantavendas|vendas-mobile|ponto\/resolver-email|marketplaces\/renovar)(\/|$)/.test(url.pathname)) return null;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', { auth: { persistSession: false } });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError && (authError.name === 'AuthRetryableFetchError' || authError.status === 0 || (authError.status ?? 0) >= 500)) return NextResponse.json({ mensagem: 'Não foi possível comunicar com a autenticação. Sua sessão não foi encerrada; tente novamente.' }, { status: 503 });
  if (authError || !auth.user) return NextResponse.json({ mensagem: 'Sua sessão expirou.' }, { status: 401 });
  let body: Record<string, unknown> = {};
  if (request.headers.get('content-type')?.includes('application/json') && !['GET','HEAD'].includes(request.method)) body = await request.clone().json().catch(() => ({}));
  if (url.pathname === '/api/lancamentos/nota' && request.headers.get('content-type')?.includes('multipart/form-data')) {
    const form = await request.clone().formData(); body.lancamentoId = form.get('lancamentoId');
  }
  let empresaId = String(url.searchParams.get('empresaId') || url.searchParams.get('companyId') || body.empresaId || body.companyId || '');
  if (!empresaId && body.acessoId) {
    const alvo = await db.from('usuarios_empresa').select('empresa_id').eq('id', body.acessoId).maybeSingle();
    empresaId = alvo.data?.empresa_id || '';
  }
  const lancamentoId = url.searchParams.get('lancamentoId') || body.lancamentoId;
  if (!empresaId && lancamentoId && url.pathname === '/api/lancamentos/nota') {
    const alvo = await db.from('lancamentos').select('empresa_id').eq('id', lancamentoId).maybeSingle();
    if (alvo.error) throw alvo.error;
    empresaId = alvo.data?.empresa_id || '';
  }
  const area = areaDaApi(url.pathname, String(url.searchParams.get('moduloId') || body.moduloId || ''));
  if (area === 'contexto') return null;
  if (empresaId) {
    if (!await conferirLiberacao(db, auth.user.id, empresaId, area)) {
      const vinculo = await db.from('usuarios_empresa').select('id,perfil').eq('user_id', auth.user.id).eq('empresa_id', empresaId).eq('status','ativo').maybeSingle();
      if (vinculo.error) throw vinculo.error;
      if (vinculo.data && vinculo.data.perfil !== 'funcionario_ponto') return NextResponse.json({ mensagem: 'Esta área não foi liberada para seu usuário.' }, { status: 403 });
    }
  } else {
    const { data, error } = await db.from('usuarios_empresa').select('perfil,dashboard_liberada,modulos_liberados').eq('user_id', auth.user.id).eq('status', 'ativo').neq('perfil', 'funcionario_ponto');
    if (error) throw error;
    // Uma operação sem empresa não pode herdar a permissão de outro vínculo.
    if (data?.some(v => { const acesso = liberacoesDoVinculo(v); return area === 'dashboard' ? !acesso.dashboard : !acesso.modulos.includes(area); })) return NextResponse.json({ mensagem: 'Informe o perfil autorizado para esta operação.' }, { status: 403 });
  }
  return null;
}
