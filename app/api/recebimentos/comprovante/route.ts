import { NextResponse } from 'next/server';
import {
  clientesServidor,
  respostaErro,
  usuarioDaRequisicao,
  validarGestor,
} from '../_lib';

export const runtime = 'nodejs';

const BUCKET = 'recebimentos-comprovantes';

export async function GET(request: Request) {
  try {
    const clientes = clientesServidor();
    if (!clientes) return respostaErro('Configuração do servidor incompleta.', 500);
    const user = await usuarioDaRequisicao(request, clientes.url, clientes.anonKey);
    if (!user) return respostaErro('Sessão não encontrada.', 401);

    const lancamentoId = new URL(request.url).searchParams.get('lancamentoId')?.trim() ?? '';
    if (!lancamentoId) return respostaErro('Lançamento não informado.');

    const { data: lancamento, error: erroLancamento } = await clientes.admin
      .from('recebimentos_lancamentos')
      .select('id, empresa_id, colaborador_user_id')
      .eq('id', lancamentoId)
      .maybeSingle();
    if (erroLancamento || !lancamento) return respostaErro('Lançamento não encontrado.', 404);

    const empresaId = String(lancamento.empresa_id);
    const gestor = await validarGestor(clientes.admin, user.id, empresaId);
    let autorizado = gestor === 'ok';
    if (!autorizado && String(lancamento.colaborador_user_id ?? '') === user.id) {
      const { data: colaborador } = await clientes.admin
        .from('recebimentos_colaboradores')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('user_id', user.id)
        .eq('ativo', true)
        .maybeSingle();
      autorizado = Boolean(colaborador);
    }
    if (!autorizado) return respostaErro('Você não tem acesso a este comprovante.', 403);

    const { data: comprovante, error: erroComprovante } = await clientes.admin
      .from('recebimentos_comprovantes')
      .select('storage_path, nome_original, mime_type, tamanho_bytes, criado_em')
      .eq('empresa_id', empresaId)
      .eq('lancamento_id', lancamentoId)
      .maybeSingle();
    if (erroComprovante || !comprovante) return respostaErro('Este lançamento não possui comprovante.', 404);

    const { data: assinatura, error: erroAssinatura } = await clientes.admin.storage
      .from(BUCKET)
      .createSignedUrl(String(comprovante.storage_path), 300);
    if (erroAssinatura || !assinatura?.signedUrl) {
      console.error('Erro ao abrir comprovante de recebimento:', erroAssinatura);
      return respostaErro('Não foi possível abrir o comprovante.', 502);
    }

    return NextResponse.json({
      erro: false,
      url: assinatura.signedUrl,
      nome: comprovante.nome_original,
      mimeType: comprovante.mime_type,
      tamanho: comprovante.tamanho_bytes,
      enviadoEm: comprovante.criado_em,
    });
  } catch (error) {
    console.error('Erro inesperado ao abrir comprovante de recebimento:', error);
    return respostaErro('Não foi possível abrir o comprovante.', 500);
  }
}
