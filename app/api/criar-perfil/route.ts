import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA } from '../../lib/cobranca';
import { PLANOS_COMERCIAIS } from '../../lib/planos-comerciais';
import { resolverDireitoDePerfisDoPerfil } from '../../lib/cobranca-servidor';
import { avaliarQuotaParaCriacao } from '../../lib/perfis-quota';

function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !anon || !service) return erro('Configuração do servidor incompleta.', 500);
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return erro('Sessão não encontrada.', 401);
  const cliente = createClient(url, anon);
  const { data: auth, error: authErro } = await cliente.auth.getUser(token);
  if (authErro || !auth.user) return erro('Usuário autenticado não encontrado.', 401);
  const corpo = await request.json().catch(() => ({}));
  const nome = String(corpo.nome || '').trim();
  const tipoPerfil = corpo.tipoPerfil === 'pessoal' ? 'pessoal' : 'empresa';
  const empresaOrigemId = String(corpo.empresaOrigemId || '').trim() || null;
  const somentePrimeiro = corpo.somentePrimeiro === true;
  if (!nome) return erro('Informe o nome do perfil financeiro.');

  const db = createClient(url, service);
  const { data: vinculos, error: vinculosErro } = await db
    .from('usuarios_empresa').select('empresa_id').eq('user_id', auth.user.id).eq('status', 'ativo');
  if (vinculosErro) return erro('Não foi possível validar seus perfis.', 500);
  const ids = (vinculos || []).map((v) => v.empresa_id);
  if (somentePrimeiro && ids.length) {
    const { data: existente } = await db.from('empresas').select('*').eq('id', ids[0]).maybeSingle();
    return NextResponse.json({ erro: false, empresa: existente, criado: false });
  }

  let direitoPerfis: Awaited<ReturnType<typeof resolverDireitoDePerfisDoPerfil>> | null = null;
  if (COBRANCA_ATIVA && ids.length) {
    direitoPerfis = await resolverDireitoDePerfisDoPerfil(db, auth.user.id, empresaOrigemId);
    const plano = direitoPerfis.plano;
    const limites = PLANOS_COMERCIAIS[plano].limites;
    const quota = avaliarQuotaParaCriacao(
      direitoPerfis,
      tipoPerfil,
      limites.tiposDePerfilPermitidos,
    );
    // Um perfil empresarial sem vaga compartilhada continua podendo iniciar
    // uma assinatura própria. Perfis pessoais extras permanecem protegidos
    // pelos limites do plano atual.
    if (tipoPerfil === 'pessoal' && !quota.tipoPermitido) {
      return erro('Seu plano atual não permite criar outro perfil pessoal. Faça upgrade para continuar.', 409);
    }
    if (tipoPerfil === 'pessoal' && !quota.temVaga) {
      const sugestao = plano === 'free' ? 'Pessoal Premium' : plano === 'pessoal_premium' || plano === 'business' ? 'Business Pro' : 'um plano superior';
      return erro(`Este plano permite até ${limites.perfis} ${limites.perfis === 1 ? 'perfil' : 'perfis'}. Faça upgrade para o ${sugestao} para continuar.`, 409);
    }
  }

  const email = String(auth.user.email || '').toLowerCase();
  const nomeUsuario = String(auth.user.user_metadata?.nome || email.split('@')[0] || 'Usuário').trim();
  const { data: criacao, error: criacaoErro } = await db.rpc('criar_perfil_financeiro_seguro', {
    p_user_id: auth.user.id,
    p_nome: nome,
    p_tipo_perfil: tipoPerfil,
    p_origem_empresa_id: empresaOrigemId,
    p_nome_usuario: nomeUsuario,
    p_email: email,
  });
  if (criacaoErro) return erro('Não foi possível criar o perfil com segurança.', 500);
  const resultado = criacao && typeof criacao === 'object' ? criacao as Record<string, unknown> : {};
  if (resultado.ok !== true) {
    const codigo = String(resultado.codigo || '');
    if (codigo === 'limite_pessoal') {
      return erro('Seu plano atual não possui vaga para outro perfil pessoal. Faça upgrade para continuar.', 409);
    }
    if (codigo === 'origem_sem_permissao') {
      return erro('Você não possui permissão para usar a assinatura deste perfil.', 403);
    }
    return erro('Não foi possível validar a criação deste perfil.', 400);
  }
  const empresa = resultado.empresa && typeof resultado.empresa === 'object'
    ? resultado.empresa as Record<string, unknown>
    : null;
  if (!empresa?.id) return erro('O perfil foi criado sem um identificador válido.', 500);
  return NextResponse.json({ erro: false, empresa, criado: true });
}
