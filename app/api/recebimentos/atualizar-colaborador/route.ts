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
    const colaboradorUserId = String(corpo.colaboradorUserId ?? '').trim();
    const nome = String(corpo.nome ?? '').trim();
    const cpf = soDigitos(corpo.cpf);
    const celular = String(corpo.celular ?? '').trim();
    const emailContato = String(corpo.email ?? '').trim().toLowerCase();
    const ativo = corpo.ativo !== false;
    if (!empresaId || !colaboradorUserId) return respostaErro('Empresa ou colaborador não informado.');
    if (!nome) return respostaErro('Informe o nome do colaborador.');
    if (!cpfValido(cpf)) return respostaErro('Informe um CPF válido.');
    if (!celular) return respostaErro('Informe o celular do colaborador.');
    if (!/^\S+@\S+\.\S+$/.test(emailContato)) return respostaErro('Informe um e-mail de contato válido.');

    const validacao = await validarGestor(clientes.admin, user.id, empresaId);
    if (validacao !== 'ok') return erroValidacaoGestor(validacao);
    const { data: atual, error: erroAtual } = await clientes.admin
      .from('recebimentos_colaboradores')
      .select('id, cpf, email')
      .eq('empresa_id', empresaId)
      .eq('user_id', colaboradorUserId)
      .maybeSingle();
    if (erroAtual) return respostaErro('Não foi possível localizar o colaborador.', 500);
    if (!atual) return respostaErro('Colaborador não encontrado nesta empresa.', 404);

    const cpfMudou = atual.cpf !== cpf;
    const emailInterno = cpfMudou ? emailInternoColaborador(cpf) : String(atual.email);
    if (cpfMudou) {
      const { data: duplicado } = await clientes.admin
        .from('recebimentos_colaboradores')
        .select('id')
        .eq('cpf', cpf)
        .neq('user_id', colaboradorUserId)
        .maybeSingle();
      if (duplicado) return respostaErro('Este CPF já está cadastrado no Recebimentos Presencial.');
    }

    const { error: erroAuth } = await clientes.admin.auth.admin.updateUserById(colaboradorUserId, {
      ...(cpfMudou ? { email: emailInterno, email_confirm: true } : {}),
      user_metadata: { nome, cpf, celular, email_contato: emailContato, empresa_id: empresaId, tipo: 'colaborador_recebimentos' },
    });
    if (erroAuth) {
      if (erroDuplicidade(erroAuth)) return respostaErro('Este CPF já está cadastrado no Recebimentos Presencial.');
      return respostaErro('Não foi possível atualizar o acesso do colaborador.', 500);
    }

    const { error: erroAtualizacao } = await clientes.admin
      .from('recebimentos_colaboradores')
      .update({ nome, cpf, celular, email: emailInterno, email_contato: emailContato, ativo, atualizado_em: new Date().toISOString() })
      .eq('empresa_id', empresaId)
      .eq('user_id', colaboradorUserId);
    if (erroAtualizacao) {
      if (erroDuplicidade(erroAtualizacao)) return respostaErro('Este CPF já está cadastrado no Recebimentos Presencial.');
      return respostaErro('Não foi possível salvar as alterações.', 500);
    }
    return NextResponse.json({ erro: false });
  } catch (error) {
    console.error('Erro inesperado ao atualizar colaborador de recebimentos:', error);
    return respostaErro('Erro inesperado ao salvar.', 500);
  }
}
