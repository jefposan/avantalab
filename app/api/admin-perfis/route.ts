import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';
import { DATA_LANCAMENTO, TRIAL_DIAS, assinaturaVigente, type EstadoAcesso, type TipoPerfil, type StatusAssinatura } from '../../lib/cobranca';

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

type AssinaturaRow = { empresa_id: string; status: string; plano: string | null; ciclo: string | null; valido_ate: string | null; trial_fim: string | null; cupom_id: string | null };

// Reproduz a lógica do resolver para o admin ver a situação real de cada perfil.
function estadoDoPerfil(tipoPerfil: TipoPerfil, criadoEmISO: string | null, row: AssinaturaRow | undefined): EstadoAcesso & { plano: string | null; ciclo: string | null } {
  if (row) {
    return { tipoPerfil, status: row.status as StatusAssinatura, validoAte: row.valido_ate, trialFim: row.trial_fim, plano: row.plano, ciclo: row.ciclo };
  }
  const criadoEm = criadoEmISO ? new Date(criadoEmISO) : null;
  const anteriorAoLancamento = !criadoEm || criadoEm < new Date(DATA_LANCAMENTO);
  if (anteriorAoLancamento) return { tipoPerfil, status: 'ativa', validoAte: null, trialFim: null, plano: null, ciclo: null };
  if (tipoPerfil === 'empresa') {
    const fim = new Date(criadoEm as Date);
    fim.setDate(fim.getDate() + TRIAL_DIAS);
    return { tipoPerfil, status: 'trial', validoAte: null, trialFim: fim.toISOString(), plano: null, ciclo: null };
  }
  return { tipoPerfil, status: 'expirada', validoAte: null, trialFim: null, plano: null, ciclo: null };
}

// Busca perfis por nome, com a situação REAL da assinatura.
export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const pagina = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
    const porPagina = [20, 50, 100].includes(Number(url.searchParams.get('porPagina'))) ? Number(url.searchParams.get('porPagina')) : 20;
    const de = (pagina - 1) * porPagina;
    const ate = de + porPagina - 1;

    let query = db.from('empresas')
      .select('id, nome, tipo_perfil, created_at', { count: 'exact' })
      .order('nome', { ascending: true })
      .range(de, ate);
    if (q) query = query.ilike('nome', `%${q}%`);

    const { data: empresas, error, count } = await query;
    if (error) throw error;

    const ids = (empresas || []).map((e) => e.id);
    const assinaturas: AssinaturaRow[] = ids.length
      ? (await db.from('assinaturas').select('empresa_id, status, plano, ciclo, valido_ate, trial_fim, cupom_id').in('empresa_id', ids)).data || []
      : [];
    const mapa = new Map(assinaturas.map((a) => [a.empresa_id, a]));

    const perfis = (empresas || []).map((e) => {
      const tipoPerfil: TipoPerfil = e.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
      const estado = estadoDoPerfil(tipoPerfil, e.created_at, mapa.get(e.id));
      return {
        id: e.id,
        nome: e.nome,
        tipo_perfil: tipoPerfil,
        status: estado.status,
        plano: estado.plano,
        ciclo: estado.ciclo,
        valido_ate: estado.validoAte,
        trial_fim: estado.trialFim,
        cupom_id: mapa.get(e.id)?.cupom_id || null,
        tem_acesso: assinaturaVigente(estado),
        tem_registro: Boolean(mapa.get(e.id)),
      };
    });
    return NextResponse.json({ erro: false, perfis, total: count || 0, pagina, porPagina });
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

    const { data: emp } = await db.from('empresas').select('tipo_perfil, created_at').eq('id', empresaId).maybeSingle();
    const tipoPerfil = emp?.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';

    const { data: existe } = await db.from('assinaturas').select('id, status').eq('empresa_id', empresaId).maybeSingle();

    if (acao === 'revogar' && existe?.status !== 'cortesia') {
      return NextResponse.json({ erro: true, mensagem: 'Só é possível revogar perfis liberados por cortesia ou cupom.' }, { status: 409 });
    }

    const status = acao === 'revogar' ? 'cancelada' : 'cortesia';

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
      plano: null,
      ciclo: null,
      trial_fim: null,
      gateway: null,
      gateway_customer_id: null,
      gateway_subscription_id: null,
      cupom_id: null,
      atualizado_em: new Date().toISOString(),
    };

    if (existe) await db.from('assinaturas').update(base).eq('empresa_id', empresaId);
    else await db.from('assinaturas').insert(base);

    return NextResponse.json({ erro: false, status, validoAte, trialFim: null, cupomId: null, temAcesso: acao === 'liberar', temRegistro: true });
  } catch (error) {
    console.error('Erro na ação sobre o perfil:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível executar a ação.' }, { status: 500 });
  }
}
