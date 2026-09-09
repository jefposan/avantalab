import { NextResponse } from 'next/server';
import { clientesServidor, erroValidacaoGestor, respostaErro, usuarioDaRequisicao, validarGestor } from '../_lib';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const clientes = clientesServidor();
    if (!clientes) return respostaErro('Configuração do servidor incompleta.', 500);
    const user = await usuarioDaRequisicao(request, clientes.url, clientes.anonKey);
    if (!user) return respostaErro('Sessão não encontrada.', 401);
    const corpo = await request.json().catch(() => ({}));
    const empresaId = String(corpo.empresaId ?? '').trim();
    const servicoId = String(corpo.servicoId ?? '').trim();
    if (!empresaId || !servicoId) return respostaErro('Serviço não informado.');
    const validacao = await validarGestor(clientes.admin, user.id, empresaId);
    if (validacao !== 'ok') return erroValidacaoGestor(validacao);
    const { data, error } = await clientes.admin.from('recebimentos_servicos').update({
      aviso_concluido_em: null, aviso_concluido_por: null, atualizado_em: new Date().toISOString(),
    }).eq('empresa_id', empresaId).eq('id', servicoId).eq('avaliacao', 'regular').not('aviso_concluido_em', 'is', null).select('id').maybeSingle();
    if (error) return respostaErro('Não foi possível reabrir o aviso.', 500);
    if (!data) return respostaErro('O aviso não está disponível para reabertura.', 404);
    return NextResponse.json({ erro: false });
  } catch (error) {
    console.error('Erro ao reabrir aviso de serviço:', error);
    return respostaErro('Não foi possível reabrir o aviso.', 500);
  }
}
