import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Resgate de cupom: valida o código e concede acesso de "cortesia" ao perfil.
// Serve tanto para avaliadores (empresa) quanto para o Premium Pessoal.
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !anonKey || !serviceRole) return NextResponse.json({ erro: true }, { status: 500 });

  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const codigo = String(corpo.codigo || '').trim();
  if (!empresaId || !codigo) return NextResponse.json({ erro: true, mensagem: 'Informe o cupom.' }, { status: 400 });

  // 1) Autentica o usuário.
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ erro: true }, { status: 401 });
  let userId = '';
  try {
    const sb = createClient(supabaseUrl, anonKey);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return NextResponse.json({ erro: true }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json({ erro: true }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRole);

  // 2) Confirma vínculo com o perfil.
  const { data: vinculo } = await admin
    .from('usuarios_empresa').select('id').eq('user_id', userId).eq('empresa_id', empresaId).limit(1).maybeSingle();
  if (!vinculo) return NextResponse.json({ erro: true, mensagem: 'Sem acesso a este perfil.' }, { status: 403 });

  // 3) Busca e valida o cupom.
  const { data: cupom } = await admin
    .from('cupons').select('*').eq('codigo', codigo).eq('ativo', true).maybeSingle();
  if (!cupom) return NextResponse.json({ erro: true, mensagem: 'Cupom inválido ou inativo.' }, { status: 404 });

  const agora = new Date();
  if (cupom.validade && new Date(cupom.validade) < agora) {
    return NextResponse.json({ erro: true, mensagem: 'Este cupom expirou.' }, { status: 400 });
  }
  if (cupom.max_usos != null && (cupom.usos || 0) >= cupom.max_usos) {
    return NextResponse.json({ erro: true, mensagem: 'Este cupom atingiu o limite de usos.' }, { status: 400 });
  }

  // 4) Calcula até quando o acesso vale (período) ou sem prazo (vitalício).
  let validoAte: string | null = null;
  if (cupom.tipo === 'periodo') {
    const fim = new Date(agora);
    const unidade = cupom.duracao_unidade || 'meses';
    const valor = Number(cupom.duracao_valor ?? cupom.duracao_meses ?? 0);
    if (valor > 0) {
      if (unidade === 'dias') fim.setDate(fim.getDate() + valor);
      else if (unidade === 'semanas') fim.setDate(fim.getDate() + valor * 7);
      else fim.setMonth(fim.getMonth() + valor);
      validoAte = fim.toISOString();
    }
  }

  const { data: emp } = await admin.from('empresas').select('tipo_perfil').eq('id', empresaId).maybeSingle();
  const tipoPerfil = emp?.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';

  // 5) Concede a cortesia no perfil.
  const { data: assinExistente } = await admin
    .from('assinaturas').select('id').eq('empresa_id', empresaId).maybeSingle();
  const base = {
    empresa_id: empresaId,
    tipo_perfil: tipoPerfil,
    status: 'cortesia',
    valido_ate: validoAte,
    cupom_id: cupom.id,
    atualizado_em: new Date().toISOString(),
  };
  if (assinExistente) await admin.from('assinaturas').update(base).eq('empresa_id', empresaId);
  else await admin.from('assinaturas').insert(base);

  // 6) Registra o resgate e incrementa o contador.
  await admin.from('cupons_resgates').insert({ cupom_id: cupom.id, empresa_id: empresaId });
  await admin.from('cupons').update({ usos: (cupom.usos || 0) + 1, atualizado_em: new Date().toISOString() }).eq('id', cupom.id);

  return NextResponse.json({ ok: true, validoAte });
}
