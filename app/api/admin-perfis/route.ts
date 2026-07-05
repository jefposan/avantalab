import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';
import { DATA_LANCAMENTO, TRIAL_DIAS, assinaturaVigente, type EstadoAcesso, type TipoPerfil, type StatusAssinatura } from '../../lib/cobranca';

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

type AssinaturaRow = { empresa_id: string; status: string; plano: string | null; ciclo: string | null; valido_ate: string | null; trial_fim: string | null };

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
      ? (await db.from('assinaturas').select('empresa_id, status, plano, ciclo, valido_ate, trial_fim').in('empresa_id', ids)).data || []
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

// Ação sobre um perfil: 'revogar' (bloqueia) ou 'liberar' (concede cortesia).
export async function PATCH(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const { empresaId, acao } = await request.json();
    if (!empresaId || (acao !== 'revogar' && acao !== 'liberar')) {
      return NextResponse.json({ erro: true, mensagem: 'Dados inválidos.' }, { status: 400 });
    }

    const { data: emp } = await db.from('empresas').select('tipo_perfil').eq('id', empresaId).maybeSingle();
    const tipoPerfil = emp?.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
    const status = acao === 'revogar' ? 'cancelada' : 'cortesia';

    const base = {
      empresa_id: empresaId,
      tipo_perfil: tipoPerfil,
      status,
      valido_ate: null,
      atualizado_em: new Date().toISOString(),
    };

    const { data: existe } = await db.from('assinaturas').select('id').eq('empresa_id', empresaId).maybeSingle();
    if (existe) await db.from('assinaturas').update(base).eq('empresa_id', empresaId);
    else await db.from('assinaturas').insert(base);

    return NextResponse.json({ erro: false, status });
  } catch (error) {
    console.error('Erro na ação sobre o perfil:', error);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível executar a ação.' }, { status: 500 });
  }
}
