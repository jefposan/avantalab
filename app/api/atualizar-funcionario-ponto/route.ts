import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function soDigitos(v: string) {
  return String(v || '').replace(/\D/g, '');
}

function cpfValido(cpf: string) {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (base: number) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return respostaErro('Configuração do servidor incompleta.', 500);
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) return respostaErro('Sessão não encontrada.', 401);

    const supabaseUsuario = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: erroUsuario } = await supabaseUsuario.auth.getUser();
    if (erroUsuario || !user) return respostaErro('Usuário autenticado não encontrado.', 401);

    const corpo = await request.json();
    const empresaId = String(corpo.empresaId || '').trim();
    const funcionarioUserId = String(corpo.funcionarioUserId || '').trim();
    const nome = String(corpo.nome || '').trim();
    const cargo = String(corpo.cargo || '').trim();
    const cpf = soDigitos(corpo.cpf || '');
    const ativo = corpo.ativo !== false;
    const horaEntrada = /^\d{2}:\d{2}$/.test(String(corpo.horaEntrada || '')) ? String(corpo.horaEntrada) : null;
    const horaSaida = /^\d{2}:\d{2}$/.test(String(corpo.horaSaida || '')) ? String(corpo.horaSaida) : null;
    const diasTrabalho = Array.isArray(corpo.diasTrabalho)
      ? Array.from(new Set(corpo.diasTrabalho.filter((n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 6))).sort()
      : [1, 2, 3, 4, 5];

    if (!empresaId) return respostaErro('Empresa não informada.');
    if (!funcionarioUserId) return respostaErro('Funcionário não informado.');
    if (!nome) return respostaErro('Informe o nome do funcionário.');
    if (cpf && !cpfValido(cpf)) return respostaErro('Informe um CPF válido.');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Quem chama precisa ser gestor/admin da empresa
    const { data: permissao, error: erroPermissao } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .in('perfil', ['gestor_master', 'administrador'])
      .maybeSingle();
    if (erroPermissao) return respostaErro('Não foi possível validar sua permissão.', 500);
    if (!permissao) return respostaErro('Você não tem permissão para editar funcionários.', 403);

    // Funcionário precisa pertencer à empresa
    const { data: atual, error: erroAtual } = await supabaseAdmin
      .from('ponto_funcionarios')
      .select('id, login, cpf')
      .eq('empresa_id', empresaId)
      .eq('user_id', funcionarioUserId)
      .maybeSingle();
    if (erroAtual) return respostaErro('Não foi possível localizar o funcionário.', 500);
    if (!atual) return respostaErro('Funcionário não encontrado nesta empresa.', 404);

    // Migração de CPF (vira o novo login + email interno) quando muda/é definido
    const cpfMudou = cpf && cpf !== (atual.cpf || '');
    if (cpfMudou) {
      const { data: jaExiste } = await supabaseAdmin
        .from('usuarios_empresa')
        .select('id')
        .eq('login', cpf)
        .eq('perfil', 'funcionario_ponto')
        .neq('user_id', funcionarioUserId)
        .limit(1)
        .maybeSingle();
      if (jaExiste) return respostaErro('Este CPF já está cadastrado no sistema. Use outro.');

      const novoEmail = `${cpf}+${empresaId}@usuarios.avantalab.local`;
      const { error: erroAuth } = await supabaseAdmin.auth.admin.updateUserById(funcionarioUserId, {
        email: novoEmail,
        email_confirm: true,
        user_metadata: { nome, login: cpf, cpf, empresa_id: empresaId, tipo: 'funcionario_ponto' },
      });
      if (erroAuth) {
        console.error('Erro ao atualizar acesso (CPF) do funcionário:', erroAuth);
        return respostaErro('Não foi possível atualizar o CPF/login do funcionário.', 500);
      }
      await supabaseAdmin
        .from('usuarios_empresa')
        .update({ login: cpf, email: novoEmail, nome, atualizado_em: new Date().toISOString() })
        .eq('empresa_id', empresaId)
        .eq('user_id', funcionarioUserId);
    } else {
      await supabaseAdmin
        .from('usuarios_empresa')
        .update({ nome, atualizado_em: new Date().toISOString() })
        .eq('empresa_id', empresaId)
        .eq('user_id', funcionarioUserId);
    }

    const atualizacao: Record<string, unknown> = {
      nome, cargo, ativo, hora_entrada: horaEntrada, hora_saida: horaSaida, dias_trabalho: diasTrabalho,
    };
    if (cpfMudou) { atualizacao.cpf = cpf; atualizacao.login = cpf; }

    const { error: erroFunc } = await supabaseAdmin
      .from('ponto_funcionarios')
      .update(atualizacao)
      .eq('empresa_id', empresaId)
      .eq('user_id', funcionarioUserId);
    if (erroFunc) {
      console.error('Erro ao atualizar funcionário de ponto:', erroFunc);
      return respostaErro('Não foi possível salvar as alterações.', 500);
    }

    return NextResponse.json({ erro: false });
  } catch (error) {
    console.error('Erro ao atualizar funcionário de ponto:', error);
    return respostaErro('Erro inesperado ao salvar.', 500);
  }
}
