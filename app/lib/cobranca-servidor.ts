// ─────────────────────────────────────────────────────────────
// Cobrança — resolver de estado (SÓ servidor).
//
// Dado um perfil (empresa_id), descobre o "estado de acesso":
//   1) Se já existe assinatura registrada → usa ela.
//   2) Se não existe → deriva:
//        • perfil criado ANTES do lançamento → cliente atual (mantém acesso).
//        • empresa criada DEPOIS → trial de TRIAL_DIAS a partir da criação.
//        • pessoal criado DEPOIS → grátis (núcleo livre, premium bloqueado).
//
// Não grava nada no banco: só lê e calcula. Usa a service role.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import {
  DATA_LANCAMENTO,
  TRIAL_DIAS,
  type EstadoAcesso,
  type StatusAssinatura,
  type TipoPerfil,
} from './cobranca';

function servico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

export async function autenticarPerfilCobranca(
  request: Request,
  empresaId: string,
  exigirGestao = false,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !anonKey || !serviceRole || !empresaId) return null;

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const cliente = createClient(url, anonKey);
  const { data: auth, error } = await cliente.auth.getUser(token);
  if (error || !auth.user) return null;

  const db = createClient(url, serviceRole);
  const { data: vinculo } = await db
    .from('usuarios_empresa')
    .select('id, perfil, status')
    .eq('user_id', auth.user.id)
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')
    .limit(1)
    .maybeSingle();
  if (!vinculo) return null;
  const podeGerenciar = ['gestor_master', 'administrador'].includes(vinculo.perfil || '');
  if (exigirGestao && !podeGerenciar) return null;
  return { db, usuario: auth.user, vinculo, podeGerenciar };
}

export async function resolverEstadoAcesso(empresaId: string): Promise<EstadoAcesso | null> {
  if (!empresaId) return null;
  const db = servico();

  // 1) Já existe assinatura registrada? Ela é a fonte da verdade.
  const { data: assin } = await db
    .from('assinaturas')
    .select('tipo_perfil, status, valido_ate, trial_fim, plano, ciclo')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (assin) {
    return {
      tipoPerfil: assin.tipo_perfil as TipoPerfil,
      status: assin.status as StatusAssinatura,
      validoAte: assin.valido_ate,
      trialFim: assin.trial_fim,
      plano: assin.plano ?? null,
      ciclo: assin.ciclo ?? null,
    };
  }

  // 2) Sem assinatura → derivar do próprio perfil.
  const { data: emp } = await db
    .from('empresas')
    .select('tipo_perfil, created_at')
    .eq('id', empresaId)
    .maybeSingle();

  if (!emp) return null; // sem info → o "cérebro" trata como fail-open (não bloqueia)

  const tipoPerfil: TipoPerfil = emp.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
  const criadoEm = emp.created_at ? new Date(emp.created_at) : null;
  const anteriorAoLancamento = !criadoEm || criadoEm < new Date(DATA_LANCAMENTO);

  // Clientes/avaliadores anteriores ao lançamento: mantêm acesso.
  if (anteriorAoLancamento) {
    return { tipoPerfil, status: 'ativa', validoAte: null, trialFim: null, plano: null, ciclo: null };
  }

  // Novos, após o lançamento:
  if (tipoPerfil === 'empresa') {
    const fim = new Date(criadoEm as Date);
    fim.setDate(fim.getDate() + TRIAL_DIAS);
    return { tipoPerfil, status: 'trial', validoAte: null, trialFim: fim.toISOString(), plano: null, ciclo: null };
  }

  // Pessoal novo → grátis (núcleo sempre livre; recursos premium bloqueados).
  return { tipoPerfil, status: 'expirada', validoAte: null, trialFim: null, plano: null, ciclo: null };
}

// Benefício cruzado: quem ASSINA o plano Empresa (status 'ativa') ganha o
// Premium Pessoal nos perfis pessoais em que é gestor/administrador.
// (Trial de empresa NÃO libera — só assinatura paga.)
export async function usuarioTemEmpresaAssinante(userId: string): Promise<boolean> {
  if (!userId) return false;
  const db = servico();
  const { data: vinculos } = await db
    .from('usuarios_empresa')
    .select('empresa_id, perfil, status')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .in('perfil', ['gestor_master', 'administrador']);
  const ids = (vinculos || []).map((v) => v.empresa_id).filter(Boolean);
  if (!ids.length) return false;
  const { data: assinaturas } = await db
    .from('assinaturas')
    .select('empresa_id, tipo_perfil, status, valido_ate')
    .in('empresa_id', ids)
    .eq('tipo_perfil', 'empresa')
    .eq('status', 'ativa');
  return (assinaturas || []).length > 0;
}

// Resolve o estado de acesso já aplicando o benefício cruzado do usuário:
// perfil pessoal sem assinatura própria, mas dono de empresa assinante,
// é tratado como cortesia Premium Pessoal.
export async function resolverEstadoAcessoParaUsuario(
  empresaId: string,
  userId: string,
): Promise<EstadoAcesso | null> {
  const estado = await resolverEstadoAcesso(empresaId);
  if (!estado || estado.tipoPerfil !== 'pessoal') return estado;
  const vigente = estado.status === 'ativa'
    || (estado.status === 'cortesia' && (!estado.validoAte || new Date(estado.validoAte) > new Date()))
    || ((estado.status === 'inadimplente' || estado.status === 'cancelada') && !!estado.validoAte && new Date(estado.validoAte) > new Date());
  if (vigente) return estado;
  if (await usuarioTemEmpresaAssinante(userId)) {
    return { ...estado, status: 'cortesia', validoAte: null, plano: 'pessoal_premium', ciclo: null };
  }
  return estado;
}
