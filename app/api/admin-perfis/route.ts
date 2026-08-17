import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';
import { DATA_LANCAMENTO, assinaturaVigente, type EstadoAcesso, type TipoPerfil, type StatusAssinatura } from '../../lib/cobranca';
import { normalizarStatusTemporal } from '../../lib/cobranca-fluxo';
import { removerAssinaturaAsaas, removerCobrancaAsaas } from '../../lib/asaas';

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

type AssinaturaRow = { empresa_id: string; status: string; plano: string | null; ciclo: string | null; valido_ate: string | null; trial_fim: string | null; cupom_id: string | null };
type FiltroPerfil = 'todos' | 'com_acesso' | 'sem_acesso' | StatusAssinatura;
type FiltroTipoPerfil = 'todos' | TipoPerfil;
type OrdemPerfil = 'nome_asc' | 'nome_desc' | 'criado_em_desc' | 'criado_em_asc';

const STATUS_FATURA_ABERTA = new Set(['PENDING', 'OVERDUE', 'AWAITING_RISK_ANALYSIS']);

// Cortesia não pode manter uma cobrança recorrente ativa. O cliente da Asaas é
// preservado para uma contratação futura; somente assinaturas e faturas abertas
// são canceladas. Em seguida, a cópia local e seus avisos são eliminados.
async function limparCobrancasParaCortesia(
  db: Awaited<ReturnType<typeof exigirAdmin>>['db'],
  empresaId: string,
  gatewaySubscriptionId: string | null | undefined,
) {
  const { data: faturas, error: erroFaturas } = await db
    .from('assinatura_faturas')
    .select('gateway_payment_id, gateway_subscription_id, status')
    .eq('empresa_id', empresaId);
  if (erroFaturas) throw erroFaturas;
  const { data: assinaturasModulos, error: erroAssinaturasModulos } = await db
    .from('assinaturas_modulos')
    .select('id, gateway_subscription_id')
    .eq('empresa_id', empresaId)
    .not('gateway_subscription_id', 'is', null)
    .neq('status', 'cancelada');
  if (erroAssinaturasModulos) throw erroAssinaturasModulos;

  const assinaturasAsaas = new Set(
    [
      gatewaySubscriptionId,
      ...(faturas || []).map((fatura) => fatura.gateway_subscription_id),
      ...(assinaturasModulos || []).map((assinatura) => assinatura.gateway_subscription_id),
    ]
      .filter((id): id is string => Boolean(id)),
  );

  for (const assinaturaId of assinaturasAsaas) {
    const resposta = await removerAssinaturaAsaas(assinaturaId);
    if (!resposta.ok && resposta.status !== 404) {
      throw new Error(resposta.erro || 'Não foi possível encerrar a assinatura na Asaas.');
    }
  }

  // Faturas avulsas sem uma assinatura identificada também devem desaparecer.
  for (const fatura of faturas || []) {
    if (fatura.gateway_subscription_id || !STATUS_FATURA_ABERTA.has(String(fatura.status || '').toUpperCase())) continue;
    const resposta = await removerCobrancaAsaas(fatura.gateway_payment_id);
    if (!resposta.ok && resposta.status !== 404) {
      throw new Error(resposta.erro || 'Não foi possível excluir uma fatura aberta na Asaas.');
    }
  }

  const { error: erroAvisos } = await db.from('assinatura_avisos').delete().eq('empresa_id', empresaId);
  if (erroAvisos) throw erroAvisos;
  const { error: erroNotificacoes } = await db.from('notificacoes').delete().eq('empresa_id', empresaId).eq('tipo', 'assinatura');
  if (erroNotificacoes) throw erroNotificacoes;
  const { error: erroLimpeza } = await db.from('assinatura_faturas').delete().eq('empresa_id', empresaId);
  if (erroLimpeza) throw erroLimpeza;
  if ((assinaturasModulos || []).length > 0) {
    const agora = new Date().toISOString();
    const { error: erroModulos } = await db.from('assinaturas_modulos').update({
      status: 'cancelada',
      valido_ate: agora,
      cancelamento_solicitado_em: agora,
      atualizado_em: agora,
    }).in('id', assinaturasModulos.map((assinatura) => assinatura.id));
    if (erroModulos) throw erroModulos;
    const { error: erroInstalacoes } = await db.from('empresa_modulos').update({
      origem: 'cortesia',
      expira_em: null,
      atualizado_em: agora,
    }).eq('empresa_id', empresaId).eq('ativo', true);
    if (erroInstalacoes) throw erroInstalacoes;
  }
}

// Reproduz a lógica do resolver para o admin ver a situação real de cada perfil.
function estadoDoPerfil(tipoPerfil: TipoPerfil, criadoEmISO: string | null, row: AssinaturaRow | undefined): EstadoAcesso & { plano: string | null; ciclo: string | null } {
  if (row) {
    const status = normalizarStatusTemporal(
      row.status as StatusAssinatura,
      row.trial_fim,
      row.valido_ate,
    );
    const plano = row.status === 'cortesia'
      ? (tipoPerfil === 'empresa' ? 'business_pro' : 'pessoal_premium')
      : row.plano;
    return { tipoPerfil, status, validoAte: row.valido_ate, trialFim: row.trial_fim, plano, ciclo: row.ciclo };
  }
  const criadoEm = criadoEmISO ? new Date(criadoEmISO) : null;
  const anteriorAoLancamento = !criadoEm || criadoEm < new Date(DATA_LANCAMENTO);
  if (anteriorAoLancamento) return { tipoPerfil, status: 'ativa', validoAte: null, trialFim: null, plano: null, ciclo: null };
  return { tipoPerfil, status: 'expirada', validoAte: null, trialFim: null, plano: null, ciclo: null };
}

// Busca perfis por nome, com a situação REAL da assinatura.
export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const filtroRecebido = url.searchParams.get('filtro') || 'todos';
    const filtro: FiltroPerfil = ['todos', 'com_acesso', 'sem_acesso', 'trial', 'ativa', 'expirada', 'cancelada', 'cortesia', 'inadimplente'].includes(filtroRecebido)
      ? filtroRecebido as FiltroPerfil
      : 'todos';
    const tipoRecebido = url.searchParams.get('tipo') || 'todos';
    const tipo: FiltroTipoPerfil = ['todos', 'empresa', 'pessoal'].includes(tipoRecebido)
      ? tipoRecebido as FiltroTipoPerfil
      : 'todos';
    const ordemRecebida = url.searchParams.get('ordem') || 'nome_asc';
    const ordem: OrdemPerfil = ['nome_asc', 'nome_desc', 'criado_em_desc', 'criado_em_asc'].includes(ordemRecebida)
      ? ordemRecebida as OrdemPerfil
      : 'nome_asc';
    const pagina = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
    const porPagina = [20, 50, 100].includes(Number(url.searchParams.get('porPagina'))) ? Number(url.searchParams.get('porPagina')) : 20;
    const de = (pagina - 1) * porPagina;
    const ate = de + porPagina - 1;

    let query = db.from('empresas')
      .select('id, nome, tipo_perfil, created_at, assinatura_origem_empresa_id')
      .order('nome', { ascending: true });
    if (q) query = query.ilike('nome', `%${q}%`);
    if (tipo !== 'todos') query = query.eq('tipo_perfil', tipo);

    const { data: empresas, error } = await query;
    if (error) throw error;

    const ids = (empresas || []).map((e) => e.id);
    const idsAssinaturas = Array.from(new Set([
      ...ids,
      ...(empresas || []).map((empresa) => empresa.assinatura_origem_empresa_id).filter(Boolean),
    ]));
    const assinaturas: AssinaturaRow[] = idsAssinaturas.length
      ? (await db.from('assinaturas').select('empresa_id, status, plano, ciclo, valido_ate, trial_fim, cupom_id').in('empresa_id', idsAssinaturas)).data || []
      : [];
    const mapa = new Map(assinaturas.map((a) => [a.empresa_id, a]));

    const perfisCompletos = (empresas || []).map((e) => {
      const tipoPerfil: TipoPerfil = e.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
      const assinaturaEfetiva = e.assinatura_origem_empresa_id
        ? mapa.get(e.assinatura_origem_empresa_id)
        : mapa.get(e.id);
      const estado = estadoDoPerfil(tipoPerfil, e.created_at, assinaturaEfetiva);
      return {
        id: e.id,
        nome: e.nome,
        tipo_perfil: tipoPerfil,
        criado_em: e.created_at || null,
        status: estado.status,
        plano: estado.plano,
        ciclo: estado.ciclo,
        valido_ate: estado.validoAte,
        trial_fim: estado.trialFim,
        cupom_id: assinaturaEfetiva?.cupom_id || null,
        tem_acesso: assinaturaVigente(estado),
        tem_registro: Boolean(assinaturaEfetiva),
        assinatura_compartilhada: Boolean(e.assinatura_origem_empresa_id),
        assinatura_origem_empresa_id: e.assinatura_origem_empresa_id || null,
      };
    });
    const perfisFiltrados = perfisCompletos.filter((perfil) => {
      if (filtro === 'todos') return true;
      if (filtro === 'com_acesso') return perfil.tem_acesso;
      if (filtro === 'sem_acesso') return !perfil.tem_acesso;
      return perfil.status === filtro;
    });
    const compararNomes = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
    const dataCriacao = (valor: string | null) => {
      const data = valor ? new Date(valor).getTime() : Number.NaN;
      return Number.isFinite(data) ? data : null;
    };
    const perfisOrdenados = [...perfisFiltrados].sort((a, b) => {
      if (ordem === 'nome_desc') return compararNomes.compare(b.nome, a.nome);
      if (ordem === 'criado_em_desc' || ordem === 'criado_em_asc') {
        const dataA = dataCriacao(a.criado_em);
        const dataB = dataCriacao(b.criado_em);
        if (dataA !== null && dataB !== null && dataA !== dataB) return ordem === 'criado_em_desc' ? dataB - dataA : dataA - dataB;
        if (dataA !== null && dataB === null) return -1;
        if (dataA === null && dataB !== null) return 1;
      }
      return compararNomes.compare(a.nome, b.nome);
    });
    const perfis = perfisOrdenados.slice(de, ate + 1);
    const idsPerfisDaPagina = perfis.map((perfil) => perfil.id);
    const { data: vinculos } = idsPerfisDaPagina.length
      ? await db
          .from('usuarios_empresa')
          .select('empresa_id, user_id')
          .in('empresa_id', idsPerfisDaPagina)
          .eq('status', 'ativo')
          .not('user_id', 'is', null)
      : { data: [] as Array<{ empresa_id: string; user_id: string | null }> };
    const idsUsuarios = Array.from(new Set((vinculos || []).map((vinculo) => vinculo.user_id).filter(Boolean))) as string[];
    const ultimoAcessoPorUsuario = new Map<string, string>();

    for (let inicio = 0; inicio < idsUsuarios.length; inicio += 10) {
      await Promise.all(idsUsuarios.slice(inicio, inicio + 10).map(async (userId) => {
        const { data, error: erroUsuario } = await db.auth.admin.getUserById(userId);
        if (erroUsuario) {
          console.error('Erro ao consultar último acesso do usuário:', erroUsuario);
          return;
        }
        if (data.user?.last_sign_in_at) ultimoAcessoPorUsuario.set(userId, data.user.last_sign_in_at);
      }));
    }

    const ultimoAcessoPorPerfil = new Map<string, string>();
    (vinculos || []).forEach((vinculo) => {
      if (!vinculo.user_id) return;
      const ultimoAcesso = ultimoAcessoPorUsuario.get(vinculo.user_id);
      const atual = ultimoAcessoPorPerfil.get(vinculo.empresa_id);
      if (ultimoAcesso && (!atual || new Date(ultimoAcesso).getTime() > new Date(atual).getTime())) {
        ultimoAcessoPorPerfil.set(vinculo.empresa_id, ultimoAcesso);
      }
    });

    return NextResponse.json({
      erro: false,
      perfis: perfis.map((perfil) => ({ ...perfil, ultimo_acesso: ultimoAcessoPorPerfil.get(perfil.id) || null })),
      total: perfisFiltrados.length,
      pagina,
      porPagina,
    });
  } catch (error) {
    console.error('Erro ao buscar perfis:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível buscar os perfis.' }, { status: 500 });
  }
}

// Ação sobre um perfil:
//   'revogar' → bloqueia uma cortesia/cupom vigente (cancelada)
//   'liberar' → concede cortesia (Premium/acesso)
export async function PATCH(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const corpo = await request.json().catch(() => ({}));
    const empresaId = corpo.empresaId;
    const acao = corpo.acao;
    if (!empresaId || !['revogar', 'liberar'].includes(acao)) {
      return NextResponse.json({ erro: true, mensagem: 'Dados inválidos.' }, { status: 400 });
    }

    const { data: emp } = await db.from('empresas').select('tipo_perfil, created_at, assinatura_origem_empresa_id').eq('id', empresaId).maybeSingle();
    if (emp?.assinatura_origem_empresa_id) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Este perfil utiliza uma assinatura compartilhada. Gerencie o benefício no perfil assinante.',
      }, { status: 409 });
    }
    const tipoPerfil = emp?.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';

    const { data: existe } = await db
      .from('assinaturas')
      .select('id, status, gateway_customer_id, gateway_subscription_id')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (acao === 'revogar' && existe?.status !== 'cortesia') {
      return NextResponse.json({ erro: true, mensagem: 'Só é possível revogar perfis liberados por cortesia ou cupom.' }, { status: 409 });
    }

    if (acao === 'liberar') {
      await limparCobrancasParaCortesia(db, empresaId, existe?.gateway_subscription_id);
    }

    const status = acao === 'revogar' ? 'cancelada' : 'cortesia';
    // Cortesia é uma liberação integral do perfil: Empresa recebe todos os
    // benefícios do Business Pro e Pessoal recebe o Pessoal Premium.
    const planoCortesia = tipoPerfil === 'empresa' ? 'business_pro' : 'pessoal_premium';

    // Liberar: cortesia vitalícia (sem duração) ou por período (valor + unidade).
    let validoAte: string | null = null;
    if (acao === 'liberar') {
      const valor = Number(corpo.duracaoValor) || 0;
      const unidade = corpo.duracaoUnidade;
      if (valor > 0 && (unidade === 'dias' || unidade === 'semanas' || unidade === 'meses')) {
        const fim = new Date();
        if (unidade === 'dias') fim.setDate(fim.getDate() + valor);
        else if (unidade === 'semanas') fim.setDate(fim.getDate() + valor * 7);
        else fim.setMonth(fim.getMonth() + valor);
        validoAte = fim.toISOString();
      }
    }

    const base = {
      empresa_id: empresaId,
      tipo_perfil: tipoPerfil,
      status,
      valido_ate: validoAte,
      plano: acao === 'liberar' ? planoCortesia : null,
      ciclo: null,
      trial_fim: null,
      gateway: null,
      gateway_customer_id: existe?.gateway_customer_id || null,
      gateway_subscription_id: null,
      cupom_id: null,
      atualizado_em: new Date().toISOString(),
    };

    const persistencia = existe
      ? await db.from('assinaturas').update(base).eq('empresa_id', empresaId)
      : await db.from('assinaturas').insert(base);
    if (persistencia.error) throw persistencia.error;

    return NextResponse.json({ erro: false, status, validoAte, trialFim: null, cupomId: null, temAcesso: acao === 'liberar', temRegistro: true });
  } catch (error) {
    console.error('Erro na ação sobre o perfil:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível executar a ação.' }, { status: 500 });
  }
}
