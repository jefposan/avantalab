import { NextResponse } from 'next/server';
import { assinaturaEmpresaLiberada, clientesServidor, respostaErro, usuarioDaRequisicao } from '../_lib';

export const runtime = 'nodejs';

const TIPOS = new Set(['interna', 'revisao', 'extra']);
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const dataOperacional = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());

export async function POST(request: Request) {
  try {
    const clientes = clientesServidor();
    if (!clientes) return respostaErro('Configuração do servidor incompleta.', 500);
    const user = await usuarioDaRequisicao(request, clientes.url, clientes.anonKey);
    if (!user) return respostaErro('Sessão não encontrada.', 401);
    const corpo = await request.json().catch(() => ({}));
    const empresaId = String(corpo.empresaId ?? '').trim();
    const recebimentoEmpresaId = String(corpo.recebimentoEmpresaId ?? '').trim();
    const subempresaId = String(corpo.subempresaId ?? '').trim() || null;
    const dataProgramada = String(corpo.dataProgramada ?? '').trim();
    const tipoServico = String(corpo.tipoServico ?? '').trim();
    if (!empresaId || !recebimentoEmpresaId || !DATA_ISO.test(dataProgramada) || !TIPOS.has(tipoServico)) {
      return respostaErro('Selecione empresa, data e um tipo de serviço válido.');
    }
    if (dataProgramada < dataOperacional()) return respostaErro('Escolha hoje ou uma data futura para o agendamento.');
    if (!await assinaturaEmpresaLiberada(empresaId)) return respostaErro('A assinatura deste perfil precisa estar ativa para agendar serviços.', 403);

    const { data: colaborador, error: erroColaborador } = await clientes.admin
      .from('recebimentos_colaboradores')
      .select('id')
      .eq('empresa_id', empresaId).eq('user_id', user.id).eq('ativo', true).eq('pode_agendamentos', true).maybeSingle();
    if (erroColaborador || !colaborador) return respostaErro('Seu acesso não possui permissão para agendar serviços.', 403);

    const { data: empresa, error: erroEmpresa } = await clientes.admin
      .from('recebimentos_empresas')
      .select('id, tipo_cadastro')
      .eq('empresa_id', empresaId).eq('id', recebimentoEmpresaId).eq('ativo', true).maybeSingle();
    if (erroEmpresa || !empresa) return respostaErro('Empresa não encontrada ou inativa.', 404);
    if (empresa.tipo_cadastro === 'local_agrupador' && !subempresaId) return respostaErro('Selecione o cliente do local agrupado.');
    if (empresa.tipo_cadastro !== 'local_agrupador' && subempresaId) return respostaErro('Este cliente não possui vínculo de subempresa.');
    if (subempresaId) {
      const { data: subempresa, error: erroSubempresa } = await clientes.admin
        .from('recebimentos_subempresas')
        .select('id')
        .eq('empresa_id', empresaId).eq('recebimento_empresa_id', recebimentoEmpresaId).eq('id', subempresaId).eq('ativo', true).maybeSingle();
      if (erroSubempresa || !subempresa) return respostaErro('Cliente não encontrado ou inativo.', 404);
    }

    const { data: agendamento, error } = await clientes.admin
      .from('recebimentos_servicos')
      .insert({
        empresa_id: empresaId,
        recebimento_empresa_id: recebimentoEmpresaId,
        subempresa_id: subempresaId,
        data_programada: dataProgramada,
        tipo_servico: tipoServico,
        situacao: 'pendente',
        atualizado_em: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') return respostaErro('Já existe um agendamento deste tipo para este local nesta data.');
      console.error('Erro ao criar agendamento de serviço:', error);
      return respostaErro('Não foi possível salvar o agendamento.', 500);
    }
    return NextResponse.json({ erro: false, agendamentoId: agendamento.id });
  } catch (error) {
    console.error('Erro inesperado ao agendar serviço:', error);
    return respostaErro('Não foi possível salvar o agendamento.', 500);
  }
}
