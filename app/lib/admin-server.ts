import 'server-only';

import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const ADMIN_CONFIG_ID = 'principal';
const HASH_ITERATIONS = 210_000;

type AdminPasswordConfig = {
  password_hash: string;
  password_salt: string;
  password_iterations: number;
};

function comparacaoSegura(valor: string, esperado: string) {
  const recebido = Buffer.from(valor);
  const referencia = Buffer.from(esperado);
  return recebido.length === referencia.length && timingSafeEqual(recebido, referencia);
}

function gerarHash(senha: string, salt: string, iterations: number) {
  return pbkdf2Sync(senha, salt, iterations, 64, 'sha512').toString('base64');
}

export function obterTokenAdmin(request: Request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
}

export function criarSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configuração do Supabase Admin incompleta.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function buscarSenhaPersonalizada(db: SupabaseClient) {
  const { data, error } = await db
    .from('admin_configuracoes')
    .select('password_hash, password_salt, password_iterations')
    .eq('id', ADMIN_CONFIG_ID)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return null;
    throw error;
  }

  return data as AdminPasswordConfig | null;
}

export async function validarTokenAdmin(token: string, db = criarSupabaseAdmin()) {
  if (!token) return false;

  const configuracao = await buscarSenhaPersonalizada(db);
  if (configuracao?.password_hash && configuracao.password_salt) {
    const hash = gerarHash(
      token,
      configuracao.password_salt,
      configuracao.password_iterations || HASH_ITERATIONS,
    );
    return comparacaoSegura(hash, configuracao.password_hash);
  }

  const tokenInicial = process.env.ADMIN_FEEDBACKS_TOKEN || '';
  return Boolean(tokenInicial) && comparacaoSegura(token, tokenInicial);
}

export async function exigirAdmin(request: Request) {
  const db = criarSupabaseAdmin();
  const token = obterTokenAdmin(request);
  return { autorizado: await validarTokenAdmin(token, db), db, token };
}

export async function salvarNovaSenhaAdmin(db: SupabaseClient, novaSenha: string) {
  const salt = randomBytes(24).toString('base64');
  const passwordHash = gerarHash(novaSenha, salt, HASH_ITERATIONS);
  const { error } = await db.from('admin_configuracoes').upsert({
    id: ADMIN_CONFIG_ID,
    password_hash: passwordHash,
    password_salt: salt,
    password_iterations: HASH_ITERATIONS,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function possuiSenhaPersonalizada(db: SupabaseClient) {
  return Boolean(await buscarSenhaPersonalizada(db));
}
