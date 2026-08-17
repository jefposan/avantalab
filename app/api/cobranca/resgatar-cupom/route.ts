import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const MENSAGENS: Record<string, { mensagem: string; status: number }> = {
  sem_permissao: { mensagem: 'Somente gestores e administradores podem aplicar um cupom.', status: 403 },
  perfil_invalido: { mensagem: 'Perfil não encontrado.', status: 404 },
  perfil_compartilhado: { mensagem: 'Este perfil já utiliza uma assinatura compartilhada.', status: 409 },
  cupom_invalido: { mensagem: 'Cupom inválido ou inativo.', status: 404 },
  cupom_expirado: { mensagem: 'Este cupom expirou.', status: 400 },
  limite_atingido: { mensagem: 'Este cupom atingiu o limite de usos.', status: 409 },
  cupom_ja_utilizado: { mensagem: 'Este cupom já foi utilizado neste perfil.', status: 409 },
  assinatura_recorrente: { mensagem: 'Este perfil possui uma assinatura recorrente. O cupom não pode substituir uma cobrança ativa.', status: 409 },
  assinatura_loja: { mensagem: 'Sua assinatura pela App Store ainda está vigente. Aguarde o término antes de aplicar um cupom.', status: 409 },
  assinatura_modulo: { mensagem: 'Cancele as renovações avulsas dos módulos antes de aplicar o cupom.', status: 409 },
};

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !anonKey || !serviceRole) {
    return NextResponse.json({ erro: true, mensagem: 'Configuração do servidor incompleta.' }, { status: 500 });
  }

  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const codigo = String(corpo.codigo || '').trim().toUpperCase();
  if (!empresaId || !codigo) {
    return NextResponse.json({ erro: true, mensagem: 'Informe o cupom.' }, { status: 400 });
  }

  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ erro: true, mensagem: 'Sessão não encontrada.' }, { status: 401 });
  const cliente = createClient(supabaseUrl, anonKey);
  const { data: auth, error: erroAuth } = await cliente.auth.getUser(token);
  if (erroAuth || !auth.user) {
    return NextResponse.json({ erro: true, mensagem: 'Sessão inválida.' }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRole);
  const { data, error } = await admin.rpc('resgatar_cupom_perfil', {
    p_empresa_id: empresaId,
    p_user_id: auth.user.id,
    p_codigo: codigo,
  });
  if (error) {
    console.error('Erro transacional ao resgatar cupom:', error.message);
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível aplicar o cupom.' }, { status: 500 });
  }

  const resultado = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  if (resultado.ok !== true) {
    const retorno = MENSAGENS[String(resultado.codigo || '')]
      || { mensagem: 'Não foi possível aplicar o cupom.', status: 400 };
    return NextResponse.json({ erro: true, mensagem: retorno.mensagem }, { status: retorno.status });
  }

  return NextResponse.json({
    ok: true,
    reutilizado: resultado.reutilizado === true,
    validoAte: resultado.validoAte || null,
  });
}
