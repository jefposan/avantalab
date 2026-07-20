import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { obterEstadoAssinaturaRepP } from '@/app/lib/rep-p-assinatura';

export const runtime = 'nodejs';

function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return respostaErro('Configuração do servidor incompleta.', 500);
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) return respostaErro('Sessão não encontrada.', 401);
    const empresaId = new URL(request.url).searchParams.get('empresaId')?.trim();
    if (!empresaId) return respostaErro('Empresa não informada.');

    const supabaseUsuario = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: erroUsuario } = await supabaseUsuario.auth.getUser();
    if (erroUsuario || !user) return respostaErro('Usuário autenticado não encontrado.', 401);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: permissao, error: erroPermissao } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .in('perfil', ['gestor_master', 'administrador'])
      .maybeSingle();
    if (erroPermissao) return respostaErro('Não foi possível validar sua permissão.', 500);
    if (!permissao) return respostaErro('Você não tem permissão para consultar a configuração de assinatura.', 403);

    const { data: certificado, error: erroCertificado } = await supabaseAdmin
      .from('rep_p_certificados')
      .select('modo, validade_fim')
      .eq('ativo', true)
      .maybeSingle();
    if (erroCertificado && erroCertificado.code !== '42P01' && erroCertificado.code !== 'PGRST205') throw erroCertificado;

    if (!certificado) return NextResponse.json({ erro: false, assinatura: obterEstadoAssinaturaRepP() });
    const vencido = new Date(certificado.validade_fim) < new Date();
    const assinatura = vencido
      ? { modo: certificado.modo, certificadoConfigurado: true, senhaConfigurada: true, emissaoLegalPermitida: false, situacao: certificado.modo === 'homologacao' ? 'homologacao' : 'certificado_vencido', validadeCertificado: certificado.validade_fim, mensagem: certificado.modo === 'homologacao' ? 'Certificado vencido guardado para homologação. A emissão legal permanece bloqueada.' : 'Certificado vencido. A emissão legal está bloqueada.' }
      : { modo: certificado.modo, certificadoConfigurado: true, senhaConfigurada: true, emissaoLegalPermitida: false, situacao: certificado.modo === 'homologacao' ? 'homologacao' : 'aguardando_validacao', validadeCertificado: certificado.validade_fim, mensagem: certificado.modo === 'homologacao' ? 'Certificado guardado para homologação. A emissão legal permanece bloqueada.' : 'Certificado vigente guardado, aguardando a etapa de assinatura criptográfica.' };
    return NextResponse.json({ erro: false, assinatura });
  } catch (error) {
    console.error('Erro ao consultar a assinatura do REP-P:', error);
    return respostaErro('Erro inesperado ao consultar a assinatura.', 500);
  }
}
