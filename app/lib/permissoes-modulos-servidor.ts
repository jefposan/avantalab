import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PerfilModulo } from './modulos-registro';
import {
  type DecisaoPermissaoModulo,
  permissaoVendasConhecida,
  permissaoVendasProtegida,
} from '@/app/modules/vendas/permissions';
import { VENDAS_MODULE_ID } from '@/app/modules/vendas/manifest';

export type AlvoPermissaoModulo =
  | { tipo: 'perfil'; perfil: PerfilModulo }
  | { tipo: 'usuario'; usuarioId: string };

export class ErroPermissaoModulo extends Error {
  constructor(
    message: string,
    readonly codigo: 'BANCO_NAO_PREPARADO' | 'MODULO_INATIVO' | 'ALVO_INVALIDO' | 'PERMISSAO_PROTEGIDA' | 'FALHA_PERSISTENCIA',
    readonly status: number,
  ) {
    super(message);
  }
}

const PERFIS: readonly PerfilModulo[] = [
  'gestor_master',
  'administrador',
  'operador_completo',
  'operador_simples',
];
const DECISOES: readonly DecisaoPermissaoModulo[] = ['allow', 'deny', 'inherit'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function bancoNaoPreparado(error: { code?: string } | null) {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}

function conferirModulo(moduloId: string) {
  if (moduloId !== VENDAS_MODULE_ID) {
    throw new ErroPermissaoModulo('O módulo informado ainda não possui uma matriz granular oficial.', 'ALVO_INVALIDO', 400);
  }
}

async function conferirInstalacao(db: SupabaseClient, empresaId: string, moduloId: string) {
  const { data, error } = await db
    .from('empresa_modulos')
    .select('ativo,expira_em')
    .eq('empresa_id', empresaId)
    .eq('modulo_id', moduloId)
    .maybeSingle();
  if (error) throw new ErroPermissaoModulo('Não foi possível conferir a instalação do módulo.', 'FALHA_PERSISTENCIA', 500);
  const expiraEm = data?.expira_em ? new Date(data.expira_em) : null;
  if (data?.ativo !== true || (expiraEm && expiraEm <= new Date())) {
    throw new ErroPermissaoModulo('O módulo precisa estar ativo neste perfil para configurar permissões.', 'MODULO_INATIVO', 403);
  }
}

export async function carregarAdministracaoPermissoesModulo(
  db: SupabaseClient,
  empresaId: string,
  moduloId: string,
) {
  conferirModulo(moduloId);
  await conferirInstalacao(db, empresaId, moduloId);
  const [perfis, usuarios, pessoas, auditoria] = await Promise.all([
    db
      .from('module_role_permission_overrides')
      .select('profile,permission_code,decision,updated_at')
      .eq('company_id', empresaId)
      .eq('module_id', moduloId)
      .order('profile')
      .order('permission_code'),
    db
      .from('module_user_permission_overrides')
      .select('user_id,permission_code,decision,updated_at')
      .eq('company_id', empresaId)
      .eq('module_id', moduloId)
      .order('user_id')
      .order('permission_code'),
    db
      .from('usuarios_empresa')
      .select('id,user_id,nome,email,login,perfil,status')
      .eq('empresa_id', empresaId)
      .neq('perfil', 'funcionario_ponto')
      .order('nome'),
    db
      .from('module_permission_audit')
      .select('id,target_type,target_profile,target_user_id,permission_code,previous_decision,new_decision,actor_id,occurred_at')
      .eq('company_id', empresaId)
      .eq('module_id', moduloId)
      .order('occurred_at', { ascending: false })
      .limit(100),
  ]);
  const erro = perfis.error || usuarios.error || pessoas.error || auditoria.error;
  if (erro) {
    if (bancoNaoPreparado(erro)) {
      throw new ErroPermissaoModulo('A persistência de permissões ainda não foi instalada.', 'BANCO_NAO_PREPARADO', 503);
    }
    throw new ErroPermissaoModulo('Não foi possível carregar as permissões do módulo.', 'FALHA_PERSISTENCIA', 500);
  }
  return {
    excecoesPerfis: perfis.data || [],
    excecoesUsuarios: usuarios.data || [],
    usuarios: pessoas.data || [],
    auditoria: auditoria.data || [],
  };
}

export async function salvarDecisaoPermissaoModulo({
  db,
  empresaId,
  moduloId,
  codigoPermissao,
  decisao,
  alvo,
  autorId,
}: {
  db: SupabaseClient;
  empresaId: string;
  moduloId: string;
  codigoPermissao: string;
  decisao: DecisaoPermissaoModulo;
  alvo: AlvoPermissaoModulo;
  autorId: string;
}) {
  conferirModulo(moduloId);
  if (!permissaoVendasConhecida(codigoPermissao) || !DECISOES.includes(decisao)) {
    throw new ErroPermissaoModulo('Permissão ou decisão inválida.', 'ALVO_INVALIDO', 400);
  }
  await conferirInstalacao(db, empresaId, moduloId);

  let perfilAlvo: PerfilModulo;
  if (alvo.tipo === 'perfil') {
    if (!PERFIS.includes(alvo.perfil)) throw new ErroPermissaoModulo('Tipo de usuário inválido.', 'ALVO_INVALIDO', 400);
    perfilAlvo = alvo.perfil;
  } else {
    if (!UUID.test(alvo.usuarioId)) throw new ErroPermissaoModulo('Usuário inválido.', 'ALVO_INVALIDO', 400);
    const { data: vinculo, error } = await db
      .from('usuarios_empresa')
      .select('perfil,status')
      .eq('empresa_id', empresaId)
      .eq('user_id', alvo.usuarioId)
      .eq('status', 'ativo')
      .limit(1)
      .maybeSingle();
    if (error || !vinculo || !PERFIS.includes(vinculo.perfil as PerfilModulo)) {
      throw new ErroPermissaoModulo('O usuário não possui vínculo ativo com este perfil.', 'ALVO_INVALIDO', 400);
    }
    perfilAlvo = vinculo.perfil as PerfilModulo;
  }

  if (
    decisao === 'deny'
    && (perfilAlvo === 'gestor_master' || perfilAlvo === 'administrador')
    && permissaoVendasProtegida(codigoPermissao)
  ) {
    throw new ErroPermissaoModulo('Esta permissão administrativa é obrigatória para o tipo de usuário.', 'PERMISSAO_PROTEGIDA', 409);
  }

  const base = {
    company_id: empresaId,
    module_id: moduloId,
    permission_code: codigoPermissao,
    decision: decisao,
    updated_by: autorId,
  };
  const resultado = alvo.tipo === 'perfil'
    ? await db
      .from('module_role_permission_overrides')
      .upsert({ ...base, profile: alvo.perfil }, { onConflict: 'company_id,module_id,profile,permission_code' })
      .select('profile,permission_code,decision,updated_at')
      .single()
    : await db
      .from('module_user_permission_overrides')
      .upsert({ ...base, user_id: alvo.usuarioId }, { onConflict: 'company_id,module_id,user_id,permission_code' })
      .select('user_id,permission_code,decision,updated_at')
      .single();

  if (resultado.error) {
    if (bancoNaoPreparado(resultado.error)) {
      throw new ErroPermissaoModulo('A persistência de permissões ainda não foi instalada.', 'BANCO_NAO_PREPARADO', 503);
    }
    throw new ErroPermissaoModulo('Não foi possível salvar a permissão.', 'FALHA_PERSISTENCIA', 500);
  }
  return resultado.data;
}

