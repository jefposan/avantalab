import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function soDigitos(v: string) {
  return String(v || '').replace(/\D/g, '');
}

// Valida CPF (11 dígitos + dígitos verificadores).
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
    const nome = String(corpo.nome || '').trim();
    const cpf = soDigitos(corpo.cpf || '');
    const senha = String(corpo.senha || '');
    const cargo = String(corpo.cargo || '').trim();
    const horaEntrada = /^\d{2}:\d{2}$/.test(String(corpo.horaEntrada || '')) ? String(corpo.horaEntrada) : null;
    const horaSaida = /^\d{2}:\d{2}$/.test(String(corpo.horaSaida || '')) ? String(corpo.horaSaida) : null;
    const diasTrabalho = Array.isArray(corpo.diasTrabalho)
      ? Array.from(new Set(corpo.diasTrabalho.filter((n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 6))).sort()
      : [1, 2, 3, 4, 5];
    // O login do funcionário de ponto é sempre o CPF (só dígitos).
    const login = cpf;

    if (!empresaId) return respostaErro('Empresa não informada.');
    if (!nome) return respostaErro('Informe o nome do funcionário.');
    if (!cpfValido(cpf)) return respostaErro('Informe um CPF válido.');
    if (!senha || senha.length < 8) return respostaErro('A senha deve ter pelo menos 8 caracteres.');

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
    if (!permissao) return respostaErro('Você não tem permissão para cadastrar funcionários.', 403);

    // Empresa precisa ter o módulo de ponto ativo
    const { data: moduloAtivo } = await supabaseAdmin
      .from('empresa_modulos')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('modulo_id', 'ponto')
      .eq('ativo', true)
      .maybeSingle();
    if (!moduloAtivo) return respostaErro('O módulo Controle de Ponto não está ativo nesta empresa.', 403);

    // CPF (login) único GLOBALMENTE entre funcionários de ponto.
    // (Um CPF = uma empresa: permite o login único em /ponto resolver a empresa.)
    const { data: loginExistente } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id')
      .eq('login', login)
      .eq('perfil', 'funcionario_ponto')
      .limit(1)
      .maybeSingle();
    if (loginExistente) return respostaErro('Este CPF já está cadastrado no sistema. Use outro.');

    const emailInterno = `${login}+${empresaId}@usuarios.avantalab.local`;

    const { data: usuarioCriado, error: erroCriarAuth } = await supabaseAdmin.auth.admin.createUser({
      email: emailInterno,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, login, cpf, empresa_id: empresaId, tipo: 'funcionario_ponto' },
    });

    if (erroCriarAuth || !usuarioCriado.user) {
      const msg = erroCriarAuth?.message || '';
      if (msg.includes('already')) {
        return respostaErro('Este CPF já está cadastrado nesta empresa. Use outro.');
      }
      return respostaErro('Não foi possível criar o acesso do funcionário.', 500);
    }

    const novoUserId = usuarioCriado.user.id;

    const { error: erroVinculo } = await supabaseAdmin
      .from('usuarios_empresa')
      .insert({
        empresa_id: empresaId,
        user_id: novoUserId,
        nome,
        email: emailInterno,
        login,
        perfil: 'funcionario_ponto',
        status: 'ativo',
      });

    if (erroVinculo) {
      console.error('Erro ao vincular funcionário de ponto:', erroVinculo);
      await supabaseAdmin.auth.admin.deleteUser(novoUserId);
      const m = String(erroVinculo.message || erroVinculo.code || '').toLowerCase();
      if (erroVinculo.code === '23505' || m.includes('duplicate') || m.includes('unique')) {
        return respostaErro('Este CPF já está cadastrado nesta empresa. Use outro.');
      }
      return respostaErro('Não foi possível cadastrar o funcionário. Tente novamente.', 500);
    }

    const { error: erroFunc } = await supabaseAdmin
      .from('ponto_funcionarios')
      .insert({ user_id: novoUserId, empresa_id: empresaId, nome, login, cpf, cargo, hora_entrada: horaEntrada, hora_saida: horaSaida, dias_trabalho: diasTrabalho });

    if (erroFunc) {
      console.error('Erro ao salvar dados do funcionário de ponto:', erroFunc);
      // rollback: remove o vínculo e o acesso, evitando funcionário órfão
      await supabaseAdmin.from('usuarios_empresa').delete().eq('user_id', novoUserId).eq('empresa_id', empresaId);
      await supabaseAdmin.auth.admin.deleteUser(novoUserId);
      return respostaErro('Não foi possível cadastrar o funcionário. Tente novamente.', 500);
    }

    return NextResponse.json({ erro: false, funcionario: { user_id: novoUserId, nome, login, cargo } });
  } catch (error) {
    console.error('Erro ao criar funcionário de ponto:', error);
    return respostaErro('Erro inesperado ao cadastrar funcionário.', 500);
  }
}
