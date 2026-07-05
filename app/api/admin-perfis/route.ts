import { NextResponse } from 'next/server';
import { exigirAdmin } from '../../lib/admin-server';

function naoAutorizado() {
  return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 401 });
}

// Busca perfis (empresas/pessoais) por nome, com a situação da assinatura.
export async function GET(request: Request) {
  try {
    const { autorizado, db } = await exigirAdmin(request);
    if (!autorizado) return naoAutorizado();

    const q = (new URL(request.url).searchParams.get('q') || '').trim();
    let query = db.from('empresas').select('id, nome, tipo_perfil').order('nome', { ascending: true }).limit(50);
    if (q) query = query.ilike('nome', `%${q}%`);

    const { data: empresas, error } = await query;
    if (error) throw error;

    const ids = (empresas || []).map((e) => e.id);
    const assinaturas = ids.length
      ? (await db.from('assinaturas').select('empresa_id, status, plano, ciclo, valido_ate, trial_fim').in('empresa_id', ids)).data || []
      : [];
    const mapa = new Map(assinaturas.map((a) => [a.empresa_id, a]));

    const perfis = (empresas || []).map((e) => ({
      id: e.id,
      nome: e.nome,
      tipo_perfil: e.tipo_perfil,
      assinatura: mapa.get(e.id) || null,
    }));
    return NextResponse.json({ erro: false, perfis });
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
      valido_ate: null, // revogar: bloqueado; liberar: cortesia sem prazo
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
