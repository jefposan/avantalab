import { NextResponse } from 'next/server';
import { clientesServidor, MODULO_RECEBIMENTOS, respostaErro, usuarioDaRequisicao } from '../_lib';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const clientes = clientesServidor();
    if (!clientes) return respostaErro('Configuração do servidor incompleta.', 500);
    const user = await usuarioDaRequisicao(request, clientes.url, clientes.anonKey);
    if (!user) return respostaErro('Sessão não encontrada.', 401);
    const corpo = await request.json().catch(() => ({}));
    const empresaId = String(corpo.empresaId ?? '').trim();
    if (!empresaId) return respostaErro('Empresa não informada.');

    const { data: colaborador, error: erroColaborador } = await clientes.admin
      .from('recebimentos_colaboradores')
      .select('id, ativo')
      .eq('empresa_id', empresaId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (erroColaborador) return NextResponse.json({ ativo: true, indeterminado: true });
    if (!colaborador?.ativo) return NextResponse.json({ ativo: false, motivo: 'colaborador' });

    const { data: modulo, error: erroModulo } = await clientes.admin
      .from('empresa_modulos')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('modulo_id', MODULO_RECEBIMENTOS)
      .eq('ativo', true)
      .maybeSingle();
    if (erroModulo) return NextResponse.json({ ativo: true, indeterminado: true });
    return NextResponse.json({ ativo: Boolean(modulo), motivo: modulo ? undefined : 'modulo' });
  } catch (error) {
    console.error('Erro ao verificar acesso de recebimentos:', error);
    return NextResponse.json({ ativo: true, indeterminado: true });
  }
}
