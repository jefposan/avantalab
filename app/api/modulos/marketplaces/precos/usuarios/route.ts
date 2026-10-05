import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';

export const runtime = 'nodejs';

function normalizeLogin(value: unknown) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');
}

function validate(body: Record<string, unknown>, passwordRequired: boolean) {
  const nome = String(body.nome || '').trim().replace(/\s+/g, ' ');
  const login = normalizeLogin(body.login);
  const senha = String(body.senha || '');
  if (nome.length < 2) throw new MarketplaceError(400, 'invalid_name', 'Informe o nome do usuário.', { nome: 'Informe o nome do usuário.' });
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(login)) throw new MarketplaceError(400, 'invalid_login', 'Use um login de 3 a 40 caracteres, com letras, números, ponto, hífen ou sublinhado.', { login: 'Informe um login válido.' });
  if ((passwordRequired || senha) && senha.length < 8) throw new MarketplaceError(400, 'invalid_password', 'A senha deve ter pelo menos 8 caracteres.', { senha: 'Use pelo menos 8 caracteres.' });
  return { nome, login, senha };
}

async function manager(request: Request, empresaId: unknown) {
  return authorizeMarketplace(request, empresaId, 'connections');
}

export async function GET(request: Request) {
  try {
    const empresaId = new URL(request.url).searchParams.get('empresaId');
    const { db } = await manager(request, empresaId);
    const { data, error } = await db.from('marketplace_price_users').select('id,user_id,nome,login,ativo,created_at,updated_at').eq('empresa_id', empresaId).order('nome');
    if (error) throw new MarketplaceError(503, 'database', 'Não foi possível carregar os usuários do AvantaPreços.');
    return NextResponse.json({ users: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { db, empresaId, usuario } = await manager(request, body.empresaId);
    const values = validate(body, true);
    const { data: conflict } = await db.from('usuarios_contas').select('user_id').eq('login', values.login).maybeSingle();
    if (conflict) throw new MarketplaceError(409, 'login_taken', 'Este login já está em uso.', { login: 'Escolha outro login.' });
    const email = `avantaprecos.${randomUUID()}@acesso.avantalab.local`;
    const { data: auth, error: authError } = await db.auth.admin.createUser({ email, password: values.senha, email_confirm: true, app_metadata: { origem_avantalab: 'avantaprecos', empresa_id: empresaId, restricted_app: 'avantaprecos' }, user_metadata: { nome: values.nome, login: values.login, empresa_id: empresaId, tipo: 'usuario_avantaprecos' } });
    if (authError || !auth.user) throw new MarketplaceError(503, 'auth_create', 'Não foi possível criar o acesso.');
    const { error: accountError } = await db.from('usuarios_contas').upsert({ user_id: auth.user.id, email, nome: values.nome, login: values.login, origem: 'avantaprecos', empresa_origem_id: empresaId, criado_por: usuario.id, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id' });
    if (accountError) {
      await db.auth.admin.deleteUser(auth.user.id);
      throw new MarketplaceError(accountError.code === '23505' ? 409 : 503, 'account_create', accountError.code === '23505' ? 'Este login já está em uso.' : 'Não foi possível registrar o login.');
    }
    const { data, error } = await db.from('marketplace_price_users').insert({ empresa_id: empresaId, user_id: auth.user.id, nome: values.nome, login: values.login, email, created_by: usuario.id }).select('id,user_id,nome,login,ativo,created_at,updated_at').single();
    if (error || !data) {
      await db.auth.admin.deleteUser(auth.user.id);
      throw new MarketplaceError(error?.code === '23505' ? 409 : 503, 'user_create', error?.code === '23505' ? 'Este login já está em uso.' : 'Não foi possível vincular o acesso à empresa.');
    }
    return NextResponse.json({ user: data }, { status: 201 });
  } catch (error) {
    return managementFailure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { db, empresaId } = await manager(request, body.empresaId);
    const id = String(body.id || '');
    const values = validate(body, false);
    const { data: target, error: targetError } = await db.from('marketplace_price_users').select('id,user_id,email').eq('id', id).eq('empresa_id', empresaId).maybeSingle();
    if (targetError || !target) throw new MarketplaceError(404, 'not_found', 'Usuário não encontrado nesta empresa.');
    const { data: conflict } = await db.from('usuarios_contas').select('user_id').eq('login', values.login).neq('user_id', target.user_id).maybeSingle();
    if (conflict) throw new MarketplaceError(409, 'login_taken', 'Este login já está em uso.', { login: 'Escolha outro login.' });
    const { error: authError } = await db.auth.admin.updateUserById(target.user_id, { ...(values.senha ? { password: values.senha } : {}), user_metadata: { nome: values.nome, login: values.login, empresa_id: empresaId, tipo: 'usuario_avantaprecos' } });
    if (authError) throw new MarketplaceError(503, 'auth_update', 'Não foi possível atualizar o acesso.');
    const now = new Date().toISOString();
    const [{ error: accountError }, { data, error }] = await Promise.all([
      db.from('usuarios_contas').update({ nome: values.nome, login: values.login, atualizado_em: now }).eq('user_id', target.user_id),
      db.from('marketplace_price_users').update({ nome: values.nome, login: values.login, updated_at: now }).eq('id', id).eq('empresa_id', empresaId).select('id,user_id,nome,login,ativo,created_at,updated_at').single(),
    ]);
    if (accountError || error || !data) throw new MarketplaceError(503, 'user_update', 'Não foi possível salvar as alterações.');
    return NextResponse.json({ user: data });
  } catch (error) { return managementFailure(error); }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { db, empresaId } = await manager(request, body.empresaId);
    const id = String(body.id || '');
    const { data: target, error } = await db.from('marketplace_price_users').select('user_id').eq('id', id).eq('empresa_id', empresaId).maybeSingle();
    if (error || !target) throw new MarketplaceError(404, 'not_found', 'Usuário não encontrado nesta empresa.');
    const { error: authError } = await db.auth.admin.deleteUser(target.user_id);
    if (authError) throw new MarketplaceError(503, 'auth_delete', 'Não foi possível excluir o acesso.');
    return NextResponse.json({ success: true });
  } catch (error) { return managementFailure(error); }
}
