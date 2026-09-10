import { NextResponse } from 'next/server';
import { clientesServidor, erroDuplicidade, erroValidacaoGestor, respostaErro, usuarioDaRequisicao, validarGestor } from '../_lib';

export const runtime = 'nodejs';

const TIPOS = new Set(['interna', 'revisao', 'extra']);
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const dataOperacional = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());

async function validarDestino(
  admin: NonNullable<ReturnType<typeof clientesServidor>>['admin'],
  empresaId: string,
  recebimentoEmpresaId: string,
  subempresaId: string | null,
) {
  const { data: empresa, error: erroEmpresa } = await admin.from('recebimentos_empresas')
    .select('id, tipo_cadastro').eq('empresa_id', empresaId).eq('id', recebimentoEmpresaId).eq('ativo', true).maybeSingle();
  if (erroEmpresa || !empresa) return 'Empresa não encontrada ou inativa.';
  if (empresa.tipo_cadastro === 'local_agrupador' && !subempresaId) return 'Selecione o cliente do local agrupado.';
  if (empresa.tipo_cadastro !== 'local_agrupador' && subempresaId) return 'Este cliente não possui vínculo de subempresa.';
  if (!subempresaId) return null;
  const { data: subempresa, error: erroSubempresa } = await admin.from('recebimentos_subempresas')
    .select('id').eq('empresa_id', empresaId).eq('recebimento_empresa_id', recebimentoEmpresaId).eq('id', subempresaId).eq('ativo', true).maybeSingle();
  return erroSubempresa || !subempresa ? 'Cliente não encontrado ou inativo.' : null;
}

export async function POST(request: Request) {
  try {
    const clientes = clientesServidor();
    if (!clientes) return respostaErro('Configuração do servidor incompleta.', 500);
    const user = await usuarioDaRequisicao(request, clientes.url, clientes.anonKey);
    if (!user) return respostaErro('Sessão não encontrada.', 401);
    const corpo = await request.json().catch(() => ({}));
    const empresaId = String(corpo.empresaId ?? '').trim();
    const servicoId = String(corpo.servicoId ?? '').trim();
    const acao = String(corpo.acao ?? '').trim();
    if (!empresaId || !servicoId || !['editar', 'cancelar', 'concluir'].includes(acao)) return respostaErro('Ação de agendamento inválida.');
    const acesso = await validarGestor(clientes.admin, user.id, empresaId);
    if (acesso !== 'ok') return erroValidacaoGestor(acesso);

    const { data: agendamento, error: erroAgendamento } = await clientes.admin.from('recebimentos_servicos')
      .select('id, data_programada, situacao, tipo_servico').eq('empresa_id', empresaId).eq('id', servicoId).maybeSingle();
    if (erroAgendamento) return respostaErro('Não foi possível localizar o agendamento.', 500);
    if (!agendamento || agendamento.tipo_servico === 'rotina' || !['pendente', 'atrasado'].includes(String(agendamento.situacao))) {
      return respostaErro('Este agendamento não está mais disponível para alteração.', 409);
    }

    if (acao === 'cancelar') {
      const { error } = await clientes.admin.from('recebimentos_servicos').delete()
        .eq('empresa_id', empresaId).eq('id', servicoId).neq('tipo_servico', 'rotina').in('situacao', ['pendente', 'atrasado']);
      if (error) return respostaErro('Não foi possível cancelar o agendamento.', 500);
      return NextResponse.json({ erro: false });
    }

    if (acao === 'concluir') {
      if (String(agendamento.data_programada) > dataOperacional()) return respostaErro('O serviço só pode ser concluído a partir da data agendada.');
      const realizadoEm = new Date().toISOString();
      const { data, error } = await clientes.admin.from('recebimentos_servicos').update({
        situacao: 'realizado', realizado_em: realizadoEm, atualizado_em: realizadoEm,
      }).eq('empresa_id', empresaId).eq('id', servicoId).neq('tipo_servico', 'rotina').in('situacao', ['pendente', 'atrasado']).select('id').maybeSingle();
      if (error) return respostaErro('Não foi possível concluir o agendamento.', 500);
      if (!data) return respostaErro('O agendamento não está disponível para conclusão.', 409);
      return NextResponse.json({ erro: false });
    }

    const recebimentoEmpresaId = String(corpo.recebimentoEmpresaId ?? '').trim();
    const subempresaId = String(corpo.subempresaId ?? '').trim() || null;
    const dataProgramada = String(corpo.dataProgramada ?? '').trim();
    const tipoServico = String(corpo.tipoServico ?? '').trim();
    if (!recebimentoEmpresaId || !DATA_ISO.test(dataProgramada) || !TIPOS.has(tipoServico)) return respostaErro('Selecione empresa, data e um tipo de serviço válido.');
    if (dataProgramada < dataOperacional()) return respostaErro('Escolha hoje ou uma data futura para o agendamento.');
    const erroDestino = await validarDestino(clientes.admin, empresaId, recebimentoEmpresaId, subempresaId);
    if (erroDestino) return respostaErro(erroDestino);
    const { data, error } = await clientes.admin.from('recebimentos_servicos').update({
      recebimento_empresa_id: recebimentoEmpresaId, subempresa_id: subempresaId, data_programada: dataProgramada, tipo_servico: tipoServico,
      situacao: 'pendente', atualizado_em: new Date().toISOString(),
    }).eq('empresa_id', empresaId).eq('id', servicoId).neq('tipo_servico', 'rotina').in('situacao', ['pendente', 'atrasado']).select('id').maybeSingle();
    if (error) return erroDuplicidade(error) ? respostaErro('Já existe um agendamento deste tipo para este local nesta data.') : respostaErro('Não foi possível atualizar o agendamento.', 500);
    if (!data) return respostaErro('O agendamento não está disponível para edição.', 409);
    return NextResponse.json({ erro: false });
  } catch (error) {
    console.error('Erro inesperado ao gerenciar agendamento de serviço:', error);
    return respostaErro('Não foi possível concluir a ação do agendamento.', 500);
  }
}
