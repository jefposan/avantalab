import { NextResponse } from 'next/server';
import { assinaturaEmpresaLiberada, clientesServidor, respostaErro, usuarioDaRequisicao } from '../_lib';

export const runtime = 'nodejs';

const AVALIACOES = new Set(['bom', 'regular']);
const BUCKET_ASSINATURAS = 'assinaturas-servicos';
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
    const clienteNome = String(corpo.clienteNome ?? '').trim().slice(0, 160);
    const assinatura = String(corpo.assinatura ?? '');
    const avaliacao = String(corpo.avaliacao ?? '');
    const observacaoCliente = String(corpo.observacaoCliente ?? '').trim().slice(0, 2000) || null;
    if (!empresaId || !recebimentoEmpresaId || !clienteNome) return respostaErro('Selecione o cliente e informe o nome de quem recebeu o atendimento.');
    if (!assinatura.startsWith('data:image/png;base64,') || assinatura.length > 700_000) return respostaErro('A assinatura digital é obrigatória e precisa ser válida.');
    if (!AVALIACOES.has(avaliacao)) return respostaErro('Escolha como foi o atendimento.');
    if (!await assinaturaEmpresaLiberada(empresaId)) return respostaErro('A assinatura deste perfil precisa estar ativa para registrar serviços.', 403);

    const { data: colaborador, error: erroColaborador } = await clientes.admin
      .from('recebimentos_colaboradores')
      .select('id')
      .eq('empresa_id', empresaId).eq('user_id', user.id).eq('ativo', true).eq('pode_servicos', true).maybeSingle();
    if (erroColaborador || !colaborador) return respostaErro('Seu acesso não possui permissão para registrar serviços.', 403);

    let consultaServico = clientes.admin
      .from('recebimentos_servicos')
      .select('id, tipo_servico')
      .eq('empresa_id', empresaId)
      .eq('recebimento_empresa_id', recebimentoEmpresaId)
      .in('situacao', ['pendente', 'atrasado'])
      .lte('data_programada', dataOperacional())
      .order('data_programada', { ascending: false })
      .limit(20);
    consultaServico = subempresaId ? consultaServico.eq('subempresa_id', subempresaId) : consultaServico.is('subempresa_id', null);
    const { data: servicosPendentes, error: erroServico } = await consultaServico;
    // Agendamentos manuais têm prioridade para que o alerta de atendimento
    // especial desapareça exatamente após a confirmação correspondente.
    const servico = (servicosPendentes ?? []).find((item) => item.tipo_servico !== 'rotina') ?? servicosPendentes?.[0] ?? null;
    if (erroServico) return respostaErro('Não foi possível localizar a programação do serviço.', 500);
    if (!servico) return respostaErro('Não há serviço pendente para este cliente hoje.');

    const realizadoEm = new Date().toISOString();
    const base64 = assinatura.slice('data:image/png;base64,'.length);
    const imagem = Buffer.from(base64, 'base64');
    const caminhoAssinatura = `${empresaId}/${servico.id}/${Date.now()}.png`;
    const { error: erroUpload } = await clientes.admin.storage.from(BUCKET_ASSINATURAS).upload(caminhoAssinatura, imagem, {
      contentType: 'image/png', cacheControl: '31536000', upsert: false,
    });
    const dadosRegistro = {
      situacao: 'realizado', colaborador_user_id: user.id, cliente_nome: clienteNome,
      assinatura, avaliacao, observacao_cliente: observacaoCliente, realizado_em: realizadoEm, atualizado_em: realizadoEm,
    };
    let erroRegistro: { message?: string } | null = null;
    if (!erroUpload) {
      const resultado = await clientes.admin.from('recebimentos_servicos').update({ ...dadosRegistro, assinatura_arquivo_path: caminhoAssinatura })
        .eq('id', servico.id).eq('empresa_id', empresaId).in('situacao', ['pendente', 'atrasado']);
      erroRegistro = resultado.error;
      // Durante a atualização gradual, a assinatura segue preservada no banco
      // mesmo se o ambiente ainda não possuir a nova coluna de Storage.
      if (erroRegistro) {
        await clientes.admin.storage.from(BUCKET_ASSINATURAS).remove([caminhoAssinatura]);
        const legado = await clientes.admin.from('recebimentos_servicos').update(dadosRegistro)
          .eq('id', servico.id).eq('empresa_id', empresaId).in('situacao', ['pendente', 'atrasado']);
        erroRegistro = legado.error;
      }
    } else {
      const legado = await clientes.admin.from('recebimentos_servicos').update(dadosRegistro)
        .eq('id', servico.id).eq('empresa_id', empresaId).in('situacao', ['pendente', 'atrasado']);
      erroRegistro = legado.error;
    }
    if (erroRegistro) return respostaErro('Não foi possível registrar o serviço.', 500);
    return NextResponse.json({ erro: false, servicoId: servico.id });
  } catch (error) {
    console.error('Erro inesperado ao registrar serviço:', error);
    return respostaErro('Não foi possível registrar o serviço.', 500);
  }
}
