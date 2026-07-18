import { NextResponse } from 'next/server';
import {
  clientesServidor,
  cpfValido,
  emailInternoColaborador,
  erroDuplicidade,
  erroValidacaoGestor,
  respostaErro,
  soDigitos,
  usuarioDaRequisicao,
  validarGestor,
} from '../_lib';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const clientes = clientesServidor();
    if (!clientes) return respostaErro('Configuração do servidor incompleta.', 500);
    const user = await usuarioDaRequisicao(request, clientes.url, clientes.anonKey);
    if (!user) return respostaErro('Sessão não encontrada.', 401);

    const corpo = await request.json().catch(() => ({}));
    const empresaId = String(corpo.empresaId ?? '').trim();
    const nome = String(corpo.nome ?? '').trim();
    const cpf = soDigitos(corpo.cpf);
    const senha = String(corpo.senha ?? '');
    const celular = String(corpo.celular ?? '').trim();
    const emailContato = String(corpo.email ?? '').trim().toLowerCase();
    if (!empresaId) return respostaErro('Empresa não informada.');
    if (!nome) return respostaErro('Informe o nome do colaborador.');
    if (!cpfValido(cpf)) return respostaErro('Informe um CPF válido.');
    if (senha.length < 8) return respostaErro('A senha deve ter pelo menos 8 caracteres.');
    if (!celular) return respostaErro('Informe o celular do colaborador.');
    if (!/^\S+@\S+\.\S+$/.test(emailContato)) return respostaErro('Informe um e-mail de contato válido.');

    const validacao = await validarGestor(clientes.admin, user.id, empresaId);
    if (validacao !== 'ok') return erroValidacaoGestor(validacao);

    const { data: existente, error: erroBusca } = await clientes.admin
      .from('recebimentos_colaboradores')
      .select('id')
      .eq('cpf', cpf)
      .maybeSingle();
    if (erroBusca) return respostaErro('Não foi possível validar o CPF.', 500);
    if (existente) return respostaErro('Este CPF já está cadastrado no Recebimentos Presenciais.');

    const emailInterno = emailInternoColaborador(cpf);
    const { data: usuarioCriado, error: erroAuth } = await clientes.admin.auth.admin.createUser({
      email: emailInterno,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome,
        cpf,
        celular,
        email_contato: emailContato,
        empresa_id: empresaId,
        tipo: 'colaborador_recebimentos',
      },
    });
    if (erroAuth || !usuarioCriado.user) {
      if (erroDuplicidade(erroAuth)) return respostaErro('Este CPF já está cadastrado no Recebimentos Presenciais.');
      console.error('Erro ao criar auth do colaborador de recebimentos:', erroAuth);
      return respostaErro('Não foi possível criar o acesso do colaborador.', 500);
    }

    const { error: erroCadastro } = await clientes.admin.from('recebimentos_colaboradores').insert({
      user_id: usuarioCriado.user.id,
      empresa_id: empresaId,
      nome,
      cpf,
      celular,
      email: emailInterno,
      email_contato: emailContato,
      ativo: true,
    });
    if (erroCadastro) {
      await clientes.admin.auth.admin.deleteUser(usuarioCriado.user.id);
      if (erroDuplicidade(erroCadastro)) return respostaErro('Este CPF já está cadastrado no Recebimentos Presenciais.');
      console.error('Erro ao cadastrar colaborador de recebimentos:', erroCadastro);
      return respostaErro('Não foi possível cadastrar o colaborador.', 500);
    }

    return NextResponse.json({
      erro: false,
      colaborador: { id: usuarioCriado.user.id, nome, cpf, celular, email: emailContato, ativo: true },
    });
  } catch (error) {
    console.error('Erro inesperado ao criar colaborador de recebimentos:', error);
    return respostaErro('Erro inesperado ao cadastrar colaborador.', 500);
  }
}
