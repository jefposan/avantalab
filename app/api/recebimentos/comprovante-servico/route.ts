import { NextResponse } from 'next/server';
import { clientesServidor, erroValidacaoGestor, respostaErro, usuarioDaRequisicao, validarGestor } from '../_lib';

export const runtime = 'nodejs';

const BUCKET_ASSINATURAS = 'assinaturas-servicos';

export async function GET(request: Request) {
  try {
    const clientes = clientesServidor();
    if (!clientes) return respostaErro('Configuração do servidor incompleta.', 500);
    const usuario = await usuarioDaRequisicao(request, clientes.url, clientes.anonKey);
    if (!usuario) return respostaErro('Sessão não encontrada.', 401);
    const url = new URL(request.url);
    const empresaId = url.searchParams.get('empresaId')?.trim() || '';
    const servicoId = url.searchParams.get('servicoId')?.trim() || '';
    if (!empresaId || !servicoId) return respostaErro('Selecione um serviço válido.');
    const acesso = await validarGestor(clientes.admin, usuario.id, empresaId);
    if (acesso !== 'ok') return erroValidacaoGestor(acesso);

    const { data: servico, error } = await clientes.admin
      .from('recebimentos_servicos')
      // `*` mantém a visualização dos comprovantes legados operável durante a
      // publicação gradual da coluna de Storage.
      .select('*')
      .eq('id', servicoId).eq('empresa_id', empresaId).eq('situacao', 'realizado').maybeSingle();
    if (error) return respostaErro('Não foi possível localizar a assinatura.', 500);
    if (!servico) return respostaErro('Serviço realizado não encontrado.', 404);

    const nome = `Assinatura de ${String(servico.cliente_nome || 'cliente')}`;
    if (servico.assinatura_arquivo_path) {
      const { data, error: erroUrl } = await clientes.admin.storage.from(BUCKET_ASSINATURAS).createSignedUrl(servico.assinatura_arquivo_path, 300);
      if (erroUrl || !data?.signedUrl) return respostaErro('Não foi possível abrir a assinatura.', 502);
      return NextResponse.json({ erro: false, url: data.signedUrl, nome, mimeType: 'image/png', enviadoEm: servico.realizado_em || '' });
    }
    if (typeof servico.assinatura === 'string' && servico.assinatura.startsWith('data:image/png;base64,')) {
      return NextResponse.json({ erro: false, url: servico.assinatura, nome, mimeType: 'image/png', enviadoEm: servico.realizado_em || '' });
    }
    return respostaErro('Este serviço não possui uma assinatura disponível.', 404);
  } catch (error) {
    console.error('Erro inesperado ao abrir assinatura de serviço:', error);
    return respostaErro('Não foi possível abrir a assinatura.', 500);
  }
}
