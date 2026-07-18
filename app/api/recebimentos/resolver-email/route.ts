import { NextResponse } from 'next/server';
import { clientesServidor, cpfValido, respostaErro, soDigitos, MODULO_RECEBIMENTOS } from '../_lib';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const clientes = clientesServidor();
    if (!clientes) return respostaErro('Configuração do servidor incompleta.', 500);
    const corpo = await request.json().catch(() => ({}));
    const cpf = soDigitos(corpo.cpf);
    if (!cpfValido(cpf)) return respostaErro('CPF inválido.');

    const { data, error } = await clientes.admin
      .from('recebimentos_colaboradores')
      .select('email, empresa_id')
      .eq('cpf', cpf)
      .eq('ativo', true)
      .maybeSingle();
    if (error || !data?.email) return respostaErro('CPF ou senha inválidos.', 404);

    const { data: modulo, error: erroModulo } = await clientes.admin
      .from('empresa_modulos')
      .select('id')
      .eq('empresa_id', data.empresa_id)
      .eq('modulo_id', MODULO_RECEBIMENTOS)
      .eq('ativo', true)
      .maybeSingle();
    if (!erroModulo && !modulo) {
      return respostaErro('O Recebimentos Presenciais está indisponível. Fale com o gestor.', 403, { bloqueado: true });
    }
    return NextResponse.json({ erro: false, email: data.email, empresaId: data.empresa_id });
  } catch (error) {
    console.error('Erro ao resolver e-mail de recebimentos:', error);
    return respostaErro('Erro ao validar o acesso.', 500);
  }
}
