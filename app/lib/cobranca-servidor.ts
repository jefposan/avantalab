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
import { erroAutenticacaoDefinitivo, idSessaoAutenticada } from './sessao-perfil';
import {
  DATA_LANCAMENTO,
  type EstadoAcesso,
  type StatusAssinatura,
  type TipoPerfil,
} from './cobranca';
import { emailsContaRevisaoLojas } from './conta-revisao';
import { normalizarStatusTemporal } from './cobranca-fluxo';
import { normalizarPlanoComercial, PLANOS_COMERCIAIS, resolverPlanoCortesia, type PlanoComercial } from './planos-comerciais';
import { papelPodeConsumirQuotaDePerfis } from './perfis-quota';
import type { SupabaseClient } from '@supabase/supabase-js';
import { consultarPorIds } from './consultas-por-ids-servidor';

function servico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

function assinaturaComercialVigente(assinatura: { status: string | null; trial_fim: string | null; valido_ate: string | null }, agora = new Date()) {
  return assinatura.status === 'ativa'
    || (assinatura.status === 'cortesia' && (!assinatura.valido_ate || new Date(assinatura.valido_ate) > agora))
    || ((assinatura.status === 'cancelada' || assinatura.status === 'inadimplente') && !!assinatura.valido_ate && new Date(assinatura.valido_ate) > agora);
}

export type DireitoDePerfis = {
  plano: PlanoComercial | 'free';
  usados: number;
  limite: number;
  origemEmpresaId: string | null;
};

async function direitoFreeDaConta(db: SupabaseClient, userId: string): Promise<DireitoDePerfis> {
  const [{ data: vinculos }, { data: assinaturaLoja }] = await Promise.all([
    db
    .from('usuarios_empresa')
    .select('empresa_id')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .eq('perfil', 'gestor_master'),
    db
      .from('assinaturas_loja')
      .select('status, valido_ate')
      .eq('user_id', userId)
      .in('loja', ['apple_app_store', 'google_play'])
      .eq('entitlement_id', 'pessoal_premium')
      .order('atualizado_em', { ascending: false }),
  ]);
  const ids = Array.from(new Set((vinculos || []).map((item) => item.empresa_id).filter(Boolean)));
  const { count } = ids.length
    ? await db
      .from('empresas')
      .select('id', { count: 'exact', head: true })
      .in('id', ids)
      .eq('tipo_perfil', 'pessoal')
    : { count: 0 };
  const lojaVigente = (assinaturaLoja || []).some((item) => !!item.valido_ate
    && ['ativa', 'cancelada', 'inadimplente'].includes(item.status || '')
    && new Date(item.valido_ate) > new Date());
  const plano = lojaVigente ? 'pessoal_premium' : 'free';
  return {
    plano,
    usados: count || 0,
    limite: PLANOS_COMERCIAIS[plano].limites.perfis,
    origemEmpresaId: null,
  };
}

// A franquia pertence exclusivamente ao perfil que contratou o plano. Um
// perfil que recebeu esse acesso por quota pode usar o sistema, mas não cria
// uma nova cadeia de perfis usando a mesma assinatura.
export async function resolverDireitoDePerfisDoPerfil(
  db: SupabaseClient,
  userId: string,
  empresaOrigemId: string | null | undefined,
): Promise<DireitoDePerfis> {
  if (!empresaOrigemId) return direitoFreeDaConta(db, userId);
  const { data: vinculo } = await db
    .from('usuarios_empresa')
    .select('id, perfil')
    .eq('user_id', userId)
    .eq('empresa_id', empresaOrigemId)
    .eq('status', 'ativo')
    .limit(1)
    .maybeSingle();
  if (!vinculo || !papelPodeConsumirQuotaDePerfis(vinculo.perfil)) {
    return direitoFreeDaConta(db, userId);
  }

  const [{ data: empresa }, { data: assinatura }] = await Promise.all([
    db.from('empresas').select('id, tipo_perfil, assinatura_origem_empresa_id').eq('id', empresaOrigemId).maybeSingle(),
    db.from('assinaturas').select('empresa_id, plano, status, trial_fim, valido_ate').eq('empresa_id', empresaOrigemId).maybeSingle(),
  ]);
  // O perfil compartilhado nunca se torna nova origem, mesmo que o mesmo
  // login também possua o perfil assinante em outra aba.
  if (!empresa || empresa.assinatura_origem_empresa_id || !assinatura) {
    return direitoFreeDaConta(db, userId);
  }
  const agora = new Date();
  if (!assinaturaComercialVigente(assinatura, agora)) {
    return direitoFreeDaConta(db, userId);
  }
  const planoAssinatura = normalizarPlanoComercial(assinatura.plano);
  const plano: PlanoComercial = empresa.tipo_perfil === 'empresa'
    ? (planoAssinatura === 'business_pro' || planoAssinatura === 'business_premium' ? planoAssinatura : 'business')
    : planoAssinatura === 'pessoal_premium' ? 'pessoal_premium' : 'free';
  const { count } = await db
    .from('empresas')
    .select('id', { count: 'exact', head: true })
    .or(`id.eq.${empresaOrigemId},assinatura_origem_empresa_id.eq.${empresaOrigemId}`);
  return {
    plano,
    usados: count || 1,
    limite: PLANOS_COMERCIAIS[plano].limites.perfisEmpresa ?? PLANOS_COMERCIAIS[plano].limites.perfis,
    origemEmpresaId: plano === 'free' ? null : empresaOrigemId,
  };
}

export async function autenticarPerfilCobrancaDetalhado(
  request: Request,
  empresaId: string,
  exigirGestao = false,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const falha = (status: number, codigo: string, mensagem: string) => ({ acesso: null, erro: { status, codigo, mensagem } });
  if (!url || !anonKey || !serviceRole) return falha(503, 'servico_indisponivel', 'Não foi possível verificar o acesso agora. Tente novamente.');
  if (!empresaId) return falha(400, 'perfil_ausente', 'Selecione um perfil.');

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return falha(401, 'sessao_expirada', 'Sua sessão expirou. Entre novamente.');
  const cliente = createClient(url, anonKey);
  const { data: auth, error } = await cliente.auth.getUser(token);
  if (error) return erroAutenticacaoDefinitivo(error)
    ? falha(401, 'sessao_expirada', 'Sua sessão expirou. Entre novamente.')
    : falha(503, 'servico_indisponivel', 'Não foi possível confirmar a sessão agora. Tente novamente.');
  if (!auth.user) return falha(401, 'sessao_expirada', 'Sua sessão expirou. Entre novamente.');
  const sessaoAuthId = idSessaoAutenticada(token, auth.user.id);
  if (!sessaoAuthId) return falha(401, 'sessao_expirada', 'Sua sessão expirou. Entre novamente.');

  const db = createClient(url, serviceRole);
  const { data: vinculo, error: erroVinculo } = await db
    .from('usuarios_empresa')
    .select('id, perfil, status')
    .eq('user_id', auth.user.id)
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')
    .limit(1)
    .maybeSingle();
  if (erroVinculo) return falha(503, 'servico_indisponivel', 'Não foi possível consultar o acesso ao perfil. Tente novamente.');
  if (!vinculo) return falha(403, 'perfil_nao_autorizado', 'Você não tem acesso a este perfil.');
  const podeGerenciar = ['gestor_master', 'administrador'].includes(vinculo.perfil || '');
  if (exigirGestao && !podeGerenciar) return falha(403, 'perfil_nao_autorizado', 'Você não tem permissão para esta ação.');
  const { data: sessoesPerfil, error: erroSessao } = await db.from('sessoes_acesso_perfil')
    .select('status, sessao_auth_id, simultaneas').eq('user_id', auth.user.id).eq('empresa_id', empresaId)
    .or(`sessao_auth_id.eq.${sessaoAuthId},and(status.eq.ativa,simultaneas.eq.false)`);
  if (erroSessao) return falha(503, 'servico_indisponivel', 'Não foi possível confirmar a sessão do perfil. Tente novamente.');
  const bloqueada = (sessoesPerfil || []).some(sessao => sessao.sessao_auth_id === sessaoAuthId
    ? sessao.status === 'revogada'
    : sessao.status === 'ativa' && sessao.simultaneas === false);
  if (bloqueada) return falha(409, 'perfil_em_outro_dispositivo', 'Este perfil foi acessado em outro dispositivo. Escolha outro perfil ou entre novamente.');
  return { acesso: { db, usuario: auth.user, vinculo, podeGerenciar }, erro: null };
}

// Preserva o contrato dos demais endpoints; o cadastro usa o resultado
// detalhado para distinguir sessão expirada, vínculo negado e falha de rede.
export async function autenticarPerfilCobranca(request: Request, empresaId: string, exigirGestao = false) {
  const acesso = (await autenticarPerfilCobrancaDetalhado(request, empresaId, exigirGestao)).acesso;
  if (!acesso) return null;
  const { conferirLiberacao } = await import('./acessos-usuario-servidor');
  const { areaDaApi } = await import('./acessos-usuario');
  const url = new URL(request.url);
  const area = areaDaApi(url.pathname, url.searchParams.get('moduloId'));
  return await conferirLiberacao(acesso.db, acesso.usuario.id, empresaId, area) ? acesso : null;
}

export type EmpresaEstadoAcesso = { id: string; tipo_perfil: string | null; created_at: string | null; assinatura_origem_empresa_id: string | null };
type AssinaturaEstado = { empresa_id: string; tipo_perfil?: string | null; status: string; valido_ate: string | null; trial_fim: string | null; plano: string | null; ciclo: string | null };
type AdicionalEstado = { empresa_id: string; status: string; valido_ate: string | null };
type LeiturasEstadoAcesso = {
  empresas: Map<string, EmpresaEstadoAcesso>;
  assinaturas: Map<string, AssinaturaEstado>;
  adicionais: Map<string, AdicionalEstado>;
};

function indexarEstadoUnico<T extends { empresa_id: string }>(linhas: T[]) {
  const mapa = new Map<string, T>();
  for (const linha of linhas) {
    if (mapa.has(linha.empresa_id)) throw new Error('Não foi possível confirmar a assinatura do perfil.');
    mapa.set(linha.empresa_id, linha);
  }
  return mapa;
}

/** Apenas leituras desta requisição. A decisão continua no mesmo resolvedor de assinatura. */
export async function resolverEstadosAcessoEmLote(db: SupabaseClient, empresas: EmpresaEstadoAcesso[]) {
  const ids = empresas.map(e => e.id);
  const origens = empresas.map(e => e.assinatura_origem_empresa_id).filter((id): id is string => Boolean(id));
  const derivados = empresas.filter(e => e.assinatura_origem_empresa_id).map(e => e.id);
  const [assinaturas, adicionais] = await Promise.all([
    consultarPorIds<AssinaturaEstado>(db, 'assinaturas', 'empresa_id,tipo_perfil,status,valido_ate,trial_fim,plano,ciclo', 'empresa_id', [...ids, ...origens]),
    consultarPorIds<AdicionalEstado>(db, 'assinaturas_perfis_adicionais', 'empresa_id,status,valido_ate', 'empresa_id', derivados),
  ]);
  const leituras: LeiturasEstadoAcesso = {
    empresas: new Map(empresas.map(e => [e.id, e])),
    assinaturas: indexarEstadoUnico(assinaturas),
    adicionais: indexarEstadoUnico(adicionais),
  };
  return new Map(await Promise.all(empresas.map(async empresa => [empresa.id, await resolverEstadoAcesso(empresa.id, leituras)] as const)));
}

export async function resolverEstadoAcesso(empresaId: string, leituras?: LeiturasEstadoAcesso, leituraEstrita = false): Promise<EstadoAcesso | null> {
  if (!empresaId) return null;
  const db = leituras ? null : servico();

  // O tipo do perfil vem SEMPRE da tabela `empresas` (fonte da verdade) —
  // a coluna tipo_perfil da assinatura pode estar desatualizada/errada.
  const { data: emp, error: erroEmpresa } = leituras ? { data: leituras.empresas.get(empresaId) || null, error: null } : await db!
    .from('empresas')
    .select('tipo_perfil, created_at, assinatura_origem_empresa_id')
    .eq('id', empresaId)
    .maybeSingle();

  if (leituraEstrita && erroEmpresa) throw new Error('Não foi possível conferir o perfil e a assinatura.');
  if (!emp) return null; // sem info → o "cérebro" trata como fail-open (não bloqueia)

  const tipoPerfil: TipoPerfil = emp.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';

  // Perfil criado ou reconciliado dentro da quota: a assinatura de origem é
  // a fonte da verdade. Uma assinatura local antiga de trial/cortesia pode
  // permanecer apenas como histórico e não deve se sobrepor à origem paga.
  if (emp.assinatura_origem_empresa_id) {
    // Perfis criados além das vagas incluídas do Business Pro ou Premium têm uma
    // recorrência própria. O vínculo com a origem só libera acesso após a
    // confirmação da Asaas; isso impede que uma empresa pendente use o plano
    // assinatura de origem antes de pagar.
    const { data: perfilAdicional, error: erroAdicional } = leituras ? { data: leituras.adicionais.get(empresaId) || null, error: null } : await db!
      .from('assinaturas_perfis_adicionais')
      .select('status, valido_ate')
      .eq('empresa_id', empresaId)
      .maybeSingle();
    if (leituraEstrita && erroAdicional) throw new Error('Não foi possível conferir a assinatura adicional.');
    if (perfilAdicional) {
      const adicionalVigente = perfilAdicional.status === 'ativa'
        || ((perfilAdicional.status === 'cancelada' || perfilAdicional.status === 'inadimplente')
          && !!perfilAdicional.valido_ate
          && new Date(perfilAdicional.valido_ate) > new Date());
      if (!adicionalVigente) {
        return {
          tipoPerfil,
          status: 'expirada',
          validoAte: perfilAdicional.valido_ate,
          trialFim: null,
          plano: null,
          ciclo: 'mensal',
        };
      }
    }
    const { data: assinaturaOrigem, error: erroOrigem } = leituras ? { data: leituras.assinaturas.get(emp.assinatura_origem_empresa_id) || null, error: null } : await db!
      .from('assinaturas')
      .select('status, valido_ate, trial_fim, plano, ciclo')
      .eq('empresa_id', emp.assinatura_origem_empresa_id)
      .maybeSingle();
    if (leituraEstrita && erroOrigem) throw new Error('Não foi possível conferir a assinatura de origem.');
    if (assinaturaOrigem) {
      const planoOrigem = normalizarPlanoComercial(assinaturaOrigem.plano);
      const statusOrigem = normalizarStatusTemporal(
        assinaturaOrigem.status as StatusAssinatura,
        assinaturaOrigem.trial_fim,
        assinaturaOrigem.valido_ate,
      );
      return {
        tipoPerfil,
        status: statusOrigem,
        validoAte: assinaturaOrigem.valido_ate,
        trialFim: assinaturaOrigem.trial_fim,
        plano: tipoPerfil === 'pessoal' && (planoOrigem === 'business' || planoOrigem === 'business_pro' || planoOrigem === 'business_premium')
          ? 'pessoal_premium'
          : assinaturaOrigem.plano ?? null,
        ciclo: assinaturaOrigem.ciclo ?? null,
      };
    }
  }

  // 1) Já existe assinatura registrada? Ela é a fonte da verdade do STATUS.
  const { data: assin, error: erroAssinatura } = leituras ? { data: leituras.assinaturas.get(empresaId) || null, error: null } : await db!
    .from('assinaturas')
    .select('tipo_perfil, status, valido_ate, trial_fim, plano, ciclo')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (leituraEstrita && erroAssinatura) throw new Error('Não foi possível conferir a assinatura.');

  if (assin) {
    // Cortesias atuais respeitam o plano escolhido no Admin. Registros antigos
    // sem plano preservam o antigo equivalente ao Business Pro.
    const planoCortesia = assin.status === 'cortesia'
      ? resolverPlanoCortesia(tipoPerfil, assin.plano)
      : null;
    const status = normalizarStatusTemporal(
      assin.status as StatusAssinatura,
      assin.trial_fim,
      assin.valido_ate,
    );
    return {
      tipoPerfil,
      status,
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
export async function usuarioTemEmpresaAssinante(userId: string, leituraEstrita = false): Promise<boolean> {
  if (!userId) return false;
  const db = servico();
  const { data: vinculos, error: erroVinculos } = await db
    .from('usuarios_empresa')
    .select('empresa_id, perfil, status')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .in('perfil', ['gestor_master', 'administrador']);
  if (leituraEstrita && erroVinculos) throw new Error('Não foi possível conferir os vínculos da assinatura.');
  const ids = (vinculos || []).map((v) => v.empresa_id).filter(Boolean);
  if (!ids.length) return false;
  const { data: assinaturas, error: erroAssinaturas } = await db
    .from('assinaturas')
    .select('empresa_id')
    .in('empresa_id', ids)
    .eq('status', 'ativa');
  if (leituraEstrita && erroAssinaturas) throw new Error('Não foi possível conferir o benefício de assinatura.');
  const empresasAssinantes = (assinaturas || []).map((assinatura) => assinatura.empresa_id).filter(Boolean);
  if (!empresasAssinantes.length) return false;
  const { count, error: erroContagem } = await db
    .from('empresas')
    .select('id', { count: 'exact', head: true })
    .in('id', empresasAssinantes)
    .eq('tipo_perfil', 'empresa')
    .is('assinatura_origem_empresa_id', null);
  if (leituraEstrita && (erroContagem || !Number.isSafeInteger(count))) throw new Error('Não foi possível conferir o benefício de assinatura.');
  return (count || 0) > 0;
}

// Resolve o estado de acesso já aplicando o benefício cruzado do usuário:
// perfil pessoal sem assinatura própria, mas dono de empresa assinante,
// é tratado como cortesia Premium Pessoal.
export async function resolverEstadoAcessoParaUsuario(
  empresaId: string,
  userId: string,
  leituraEstrita = false,
): Promise<EstadoAcesso | null> {
  const estado = await resolverEstadoAcesso(empresaId, undefined, leituraEstrita);
  if (!estado && leituraEstrita) throw new Error('Não foi possível conferir a assinatura do perfil.');
  if (!estado) return estado;

  const db = servico();
  const { data: vinculoRevisao, error: erroRevisao } = await db
    .from('usuarios_empresa')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .in('email', emailsContaRevisaoLojas())
    .limit(1)
    .maybeSingle();
  if (leituraEstrita && erroRevisao) throw new Error('Não foi possível conferir a modalidade de acesso.');

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

  // O Pessoal Premium comprado em uma loja pertence ao login. Assim, a mesma
  // compra libera os perfis pessoais permitidos pelo plano sem substituir uma
  // eventual assinatura web vinculada a um perfil.
  const { data: assinaturasLoja, error: erroLoja } = await db
    .from('assinaturas_loja')
    .select('status, ciclo, valido_ate')
    .eq('user_id', userId)
    .in('loja', ['apple_app_store', 'google_play'])
    .eq('entitlement_id', 'pessoal_premium')
    .order('atualizado_em', { ascending: false });
  if (leituraEstrita && erroLoja) throw new Error('Não foi possível conferir a assinatura da loja.');
  const assinaturaLoja = (assinaturasLoja || []).find((item) => {
    const validaAte = item.valido_ate ? new Date(item.valido_ate) : null;
    return ['ativa', 'cancelada', 'inadimplente'].includes(item.status)
      && Boolean(validaAte && validaAte > new Date());
  });
  if (!erroLoja && assinaturaLoja) {
    return {
      ...estado,
      status: assinaturaLoja.status as StatusAssinatura,
      validoAte: assinaturaLoja.valido_ate,
      plano: 'pessoal_premium',
      ciclo: assinaturaLoja.ciclo,
    };
  }

  if (await usuarioTemEmpresaAssinante(userId, leituraEstrita)) {
    return { ...estado, status: 'cortesia', validoAte: null, plano: 'pessoal_premium', ciclo: null };
  }
  return estado;
}
