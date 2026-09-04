import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA, assinaturaVigente } from '../../../lib/cobranca';
import { resolverEstadoAcesso } from '../../../lib/cobranca-servidor';

function soDigitos(v: string) {
  return String(v || '').replace(/\D/g, '');
}

// Recebe o CPF e devolve o e-mail interno do funcionário de ponto correspondente.
// Login único em /ponto: o CPF é único globalmente, então resolve a empresa sem ambiguidade.
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ erro: true }, { status: 500 });
    }

    const corpo = await request.json().catch(() => ({}));
    const cpf = soDigitos(corpo.cpf || '');
    if (cpf.length !== 11) {
      return NextResponse.json({ erro: true, mensagem: 'CPF inválido.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('email, empresa_id, user_id, status')
      .eq('login', cpf)
      .eq('perfil', 'funcionario_ponto')
      .limit(1)
      .maybeSingle();

    // Resposta genérica para não vazar se um CPF existe ou não.
    if (error || !data || !data.email || data.status !== 'ativo') {
      return NextResponse.json({ erro: true, mensagem: 'CPF ou senha inválidos.' }, { status: 404 });
    }

    // O vínculo acima localiza a identidade. A permissão de fato para registrar
    // fica no cadastro próprio do ponto: um funcionário desligado pode manter
    // seus dados por exigência de histórico, mas não volta a receber o e-mail de
    // login, mesmo que o vínculo técnico continue preservado.
    const { data: funcionario, error: erroFuncionario } = await supabaseAdmin
      .from('ponto_funcionarios')
      .select('id')
      .eq('empresa_id', data.empresa_id)
      .eq('user_id', data.user_id)
      .eq('ativo', true)
      .maybeSingle();
    if (erroFuncionario || !funcionario) {
      return NextResponse.json({ erro: true, mensagem: 'CPF ou senha inválidos.' }, { status: 404 });
    }

    // Bloqueio: se o módulo Controle de Ponto foi removido (desativado) para a
    // empresa do funcionário, o acesso fica bloqueado (sem excluir o cadastro).
    if (data.empresa_id) {
      const { data: modulo, error: erroModulo } = await supabaseAdmin
        .from('empresa_modulos')
        .select('id')
      .eq('empresa_id', data.empresa_id)
        .eq('modulo_id', 'ponto')
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();

      // Só bloqueia quando a consulta foi bem-sucedida e o módulo não está ativo.
      // Em erro de leitura, mantém o acesso (fail-open) para não travar por instabilidade.
      if (!erroModulo && !modulo) {
        return NextResponse.json(
          { erro: true, bloqueado: true, mensagem: 'O controle de ponto está indisponível para a sua empresa no momento. Fale com o gestor.' },
          { status: 403 }
        );
      }

      if (COBRANCA_ATIVA) {
        const estado = await resolverEstadoAcesso(data.empresa_id);
        if (estado?.tipoPerfil === 'empresa' && !assinaturaVigente(estado)) {
          return NextResponse.json(
            { erro: true, bloqueado: true, mensagem: 'O controle de ponto está indisponível para a sua empresa no momento. Fale com o gestor.' },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json({ erro: false, email: data.email });
  } catch (error) {
    console.error('Erro ao resolver e-mail do funcionário de ponto:', error);
    return NextResponse.json({ erro: true, mensagem: 'Erro ao validar o acesso.' }, { status: 500 });
  }
}
