import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const MODULO_RECEBIMENTOS = 'recebimentos_presencial';

export function soDigitos(valor: unknown) {
  return String(valor ?? '').replace(/\D/g, '');
}

export function cpfValido(valor: unknown) {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: number) => {
    let soma = 0;
    for (let i = 0; i < base; i += 1) soma += Number(cpf[i]) * (base + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export function emailInternoColaborador(cpf: string) {
  return `${soDigitos(cpf)}@colaboradores.avantalab.local`;
}

export function respostaErro(mensagem: string, status = 400, extras?: Record<string, unknown>) {
  return NextResponse.json({ erro: true, mensagem, ...extras }, { status });
}

export function clientesServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) return null;
  return {
    url,
    anonKey,
    admin: createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

export async function usuarioDaRequisicao(request: Request, url: string, anonKey: string): Promise<User | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  const cliente = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await cliente.auth.getUser();
  return error ? null : data.user;
}

export async function validarGestor(
  admin: SupabaseClient,
  userId: string,
  empresaId: string,
): Promise<'ok' | 'sem_permissao' | 'modulo_inativo' | 'erro'> {
  const { data: permissao, error: erroPermissao } = await admin
    .from('usuarios_empresa')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .in('perfil', ['gestor_master', 'administrador'])
    .maybeSingle();
  if (erroPermissao) return 'erro';
  if (!permissao) return 'sem_permissao';

  const { data: modulo, error: erroModulo } = await admin
    .from('empresa_modulos')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('modulo_id', MODULO_RECEBIMENTOS)
    .eq('ativo', true)
    .maybeSingle();
  if (erroModulo) return 'erro';
  return modulo ? 'ok' : 'modulo_inativo';
}

export function erroValidacaoGestor(resultado: Exclude<Awaited<ReturnType<typeof validarGestor>>, 'ok'>) {
  if (resultado === 'sem_permissao') return respostaErro('Você não tem permissão para gerenciar colaboradores.', 403);
  if (resultado === 'modulo_inativo') return respostaErro('O módulo Recebimentos Presenciais não está ativo nesta empresa.', 403);
  return respostaErro('Não foi possível validar sua permissão.', 500);
}

export function erroDuplicidade(error: { code?: string; message?: string } | null | undefined) {
  const texto = String(error?.message ?? '').toLowerCase();
  return error?.code === '23505' || texto.includes('duplicate') || texto.includes('unique') || texto.includes('already');
}
