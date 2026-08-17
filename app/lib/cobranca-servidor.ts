// ─────────────────────────────────────────────────────────────
// Cobrança — resolver de estado (SÓ servidor).
//
// Dado um perfil (empresa_id), descobre o "estado de acesso":
//   1) Se já existe assinatura registrada → usa ela.
//   2) Se não existe → deriva:
//        • perfil criado ANTES do lançamento → cliente atual (mantém acesso).
//        • empresa criada DEPOIS → aguarda a contratação escolhida.
//        • pessoal criado DEPOIS → grátis (núcleo livre, premium bloqueado).
//
// Não grava nada no banco: só lê e calcula. Usa a service role.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import {
  DATA_LANCAMENTO,
  type EstadoAcesso,
  type StatusAssinatura,
  type TipoPerfil,
} from './cobranca';
import { EMAIL_CONTA_REVISAO_APPLE } from './conta-revisao';
import { normalizarPlanoComercial, PLANOS_COMERCIAIS, type PlanoComercial } from './planos-comerciais';
import { papelPodeConsumirQuotaDePerfis } from './perfis-quota';
import type { SupabaseClient } from '@supabase/supabase-js';

function servico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

function assinaturaComercialVigente(assinatura: { status: string | null; trial_fim: string | null; valido_ate: string | null }, agora = new Date()) {
  return assinatura.status === 'ativa'
    || (assinatura.status === 'trial' && !!assinatura.trial_fim && new Date(assinatura.trial_fim) > agora)
    || ((assinatura.status === 'cancelada' || assinatura.status === 'inadimplente') && !!assinatura.valido_ate && new Date(assinatura.valido_ate) > agora);
}

export type DireitoDePerfis = {
  plano: PlanoComercial | 'free';
  usados: number;
  limite: number;
  origemEmpresaId: string | null;
};

// A franquia pertence exclusivamente ao perfil que contratou o plano. Um
// perfil que recebeu esse acesso por quota pode usar o sistema, mas não cria
// uma nova cadeia de perfis usando a mesma assinatura.
export async function resolverDireitoDePerfisDoPerfil(
  db: SupabaseClient,
  userId: string,
  empresaOrigemId: string | null | undefined,
): Promise<DireitoDePerfis> {
  if (!empresaOrigemId) return { plano: 'free', usados: 0, limite: PLANOS_COMERCIAIS.free.limites.perfis, origemEmpresaId: null };
  const { data: vinculo } = await db
    .from('usuarios_empresa')
    .select('id, perfil')
    .eq('user_id', userId)
    .eq('empresa_id', empresaOrigemId)
    .eq('status', 'ativo')
    .limit(1)
    .maybeSingle();
  if (!vinculo || !papelPodeConsumirQuotaDePerfis(vinculo.perfil)) {
    return { plano: 'free', usados: 0, limite: PLANOS_COMERCIAIS.free.limites.perfis, origemEmpresaId: null };
  }

  const [{ data: empresa }, { data: assinatura }] = await Promise.all([
    db.from('empresas').select('id, tipo_perfil, assinatura_origem_empresa_id').eq('id', empresaOrigemId).maybeSingle(),
    db.from('assinaturas').select('empresa_id, plano, status, trial_fim, valido_ate').eq('empresa_id', empresaOrigemId).maybeSingle(),
  ]);
  // O perfil compartilhado nunca se torna nova origem, mesmo que o mesmo
  // login também possua o perfil assinante em outra aba.
  if (!empresa || empresa.assinatura_origem_empresa_id || !assinatura) {
    return { plano: 'free', usados: 0, limite: PLANOS_COMERCIAIS.free.limites.perfis, origemEmpresaId: null };
  }
  const agora = new Date();
  if (!assinaturaComercialVigente(assinatura, agora)) {
    return { plano: 'free', usados: 0, limite: PLANOS_COMERCIAIS.free.limites.perfis, origemEmpresaId: null };
  }
  const planoAssinatura = normalizarPlanoComercial(assinatura.plano);
  const plano: PlanoComercial = empresa.tipo_perfil === 'empresa'
    ? (planoAssinatura === 'business_pro' ? 'business_pro' : 'business')
    : planoAssinatura === 'pessoal_premium' ? 'pessoal_premium' : 'free';
  const { count } = await db
    .from('empresas')
    .select('id', { count: 'exact', head: true })
    .or(`id.eq.${empresaOrigemId},assinatura_origem_empresa_id.eq.${empresaOrigemId}`);
  return {
    plano,
    usados: count || 1,
    limite: PLANOS_COMERCIAIS[plano].limites.perfis,
    origemEmpresaId: plano === 'free' ? null : empresaOrigemId,
  };
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

  // O tipo do perfil vem SEMPRE da tabela `empresas` (fonte da verdade) —
  // a coluna tipo_perfil da assinatura pode estar desatualizada/errada.
  const { data: emp } = await db
    .from('empresas')
    .select('tipo_perfil, created_at, assinatura_origem_empresa_id')
    .eq('id', empresaId)
    .maybeSingle();

  if (!emp) return null; // sem info → o "cérebro" trata como fail-open (não bloqueia)

  const tipoPerfil: TipoPerfil = emp.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';

  // Perfil criado ou reconciliado dentro da quota: a assinatura de origem é
  // a fonte da verdade. Uma assinatura local antiga de trial/cortesia pode
  // permanecer apenas como histórico e não deve se sobrepor à origem paga.
  if (emp.assinatura_origem_empresa_id) {
    const { data: assinaturaOrigem } = await db
      .from('assinaturas')
      .select('status, valido_ate, trial_fim, plano, ciclo')
      .eq('empresa_id', emp.assinatura_origem_empresa_id)
      .maybeSingle();
    if (assinaturaOrigem) {
      const planoOrigem = normalizarPlanoComercial(assinaturaOrigem.plano);
      return {
        tipoPerfil,
        status: assinaturaOrigem.status as StatusAssinatura,
        validoAte: assinaturaOrigem.valido_ate,
        trialFim: assinaturaOrigem.trial_fim,
        plano: tipoPerfil === 'pessoal' && (planoOrigem === 'business' || planoOrigem === 'business_pro')
          ? 'pessoal_premium'
          : assinaturaOrigem.plano ?? null,
        ciclo: assinaturaOrigem.ciclo ?? null,
      };
    }
  }

  // 1) Já existe assinatura registrada? Ela é a fonte da verdade do STATUS.
  const { data: assin } = await db
    .from('assinaturas')
    .select('tipo_perfil, status, valido_ate, trial_fim, plano, ciclo')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (assin) {
    // Protege perfis antigos cuja cortesia foi gravada antes de o plano ser
    // persistido. Cortesia sempre representa acesso completo ao plano do tipo
    // de perfil, sem depender da normalização histórica no banco.
    const planoCortesia = assin.status === 'cortesia'
      ? (tipoPerfil === 'empresa' ? 'business_pro' : 'pessoal_premium')
      : null;
    return {
      tipoPerfil,
      status: assin.status as StatusAssinatura,
      validoAte: assin.valido_ate,
      trialFim: assin.trial_fim,
      plano: planoCortesia ?? assin.plano ?? null,
      ciclo: assin.ciclo ?? null,
    };
  }

  // 2) Sem assinatura → derivar do próprio perfil.
  const criadoEm = emp.created_at ? new Date(emp.created_at) : null;
  const anteriorAoLancamento = !criadoEm || criadoEm < new Date(DATA_LANCAMENTO);

  // Clientes/avaliadores anteriores ao lançamento: mantêm acesso.
  if (anteriorAoLancamento) {
    return { tipoPerfil, status: 'ativa', validoAte: null, trialFim: null, plano: null, ciclo: null };
  }

  // Perfis criados após o lançamento aguardam contratação. O único teste é
  // gravado explicitamente no Business Pro por /api/cobranca/definir-inicio;
  // assim um perfil empresarial não ganha trial apenas por ter sido criado.
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
  if (!estado) return estado;

  const db = servico();
  const { data: vinculoRevisao } = await db
    .from('usuarios_empresa')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .ilike('email', EMAIL_CONTA_REVISAO_APPLE)
    .limit(1)
    .maybeSingle();

  // A conta fornecida à Apple precisa permitir a exploração completa do app,
  // mas não pode fingir que uma assinatura foi comprada. O modo de revisão
  // libera os recursos e mantém o fluxo real de compra/restauração disponível.
  if (vinculoRevisao) {
    return {
      ...estado,
      tipoPerfil: 'pessoal',
      status: 'ativa',
      validoAte: null,
      trialFim: null,
      plano: 'pessoal_premium',
      ciclo: null,
      modoRevisao: true,
    };
  }

  if (estado.tipoPerfil !== 'pessoal') return estado;
  const vigente = estado.status === 'ativa'
    || (estado.status === 'cortesia' && (!estado.validoAte || new Date(estado.validoAte) > new Date()))
    || ((estado.status === 'inadimplente' || estado.status === 'cancelada') && !!estado.validoAte && new Date(estado.validoAte) > new Date());
  if (vigente) return estado;

  // O Pessoal Premium contratado pela App Store pertence ao login. Assim, a
  // mesma compra libera os perfis pessoais permitidos pelo plano sem apagar
  // ou substituir uma eventual assinatura web vinculada a um perfil.
  const { data: assinaturaLoja, error: erroLoja } = await db
    .from('assinaturas_loja')
    .select('status, ciclo, valido_ate')
    .eq('user_id', userId)
    .eq('loja', 'apple_app_store')
    .eq('entitlement_id', 'pessoal_premium')
    .maybeSingle();
  if (!erroLoja && assinaturaLoja) {
    const validaAte = assinaturaLoja.valido_ate ? new Date(assinaturaLoja.valido_ate) : null;
    const vigenteNaLoja = ['ativa', 'cancelada', 'inadimplente'].includes(assinaturaLoja.status)
      && Boolean(validaAte && validaAte > new Date());
    if (vigenteNaLoja) {
      return {
        ...estado,
        status: assinaturaLoja.status as StatusAssinatura,
        validoAte: assinaturaLoja.valido_ate,
        plano: 'pessoal_premium',
        ciclo: assinaturaLoja.ciclo,
      };
    }
  }

  if (await usuarioTemEmpresaAssinante(userId)) {
    return { ...estado, status: 'cortesia', validoAte: null, plano: 'pessoal_premium', ciclo: null };
  }
  return estado;
}
