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
  let assinaturaOrigemEmpresaId: string | null = null;
  if (COBRANCA_ATIVA && ids.length) {
    direitoPerfis = await resolverDireitoDePerfisDoPerfil(db, auth.user.id, empresaOrigemId);
    const plano = direitoPerfis.plano;
    const limites = PLANOS_COMERCIAIS[plano].limites;
    const quota = avaliarQuotaParaCriacao(
      direitoPerfis,
      tipoPerfil,
      limites.tiposDePerfilPermitidos,
    );
    assinaturaOrigemEmpresaId = quota.compartilhaAssinatura ? direitoPerfis.origemEmpresaId : null;

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
  const { data: empresa, error: empresaErro } = await db.from('empresas').insert({
    nome,
    tipo_perfil: tipoPerfil,
    ...(assinaturaOrigemEmpresaId ? { assinatura_origem_empresa_id: assinaturaOrigemEmpresaId } : {}),
  }).select().single();
  if (empresaErro || !empresa) return erro(empresaErro?.message || 'Não foi possível criar o perfil.', 500);
  const { error: vinculoErro } = await db.from('usuarios_empresa').insert({ empresa_id: empresa.id, user_id: auth.user.id, nome: nomeUsuario, email, perfil: 'gestor_master', status: 'ativo' });
  if (vinculoErro) {
    await db.from('empresas').delete().eq('id', empresa.id);
    return erro('Não foi possível concluir o vínculo do perfil.', 500);
  }
  await db.from('configuracoes').upsert({ empresa_id: empresa.id, duplicados_ativo: true }, { onConflict: 'empresa_id' });
  return NextResponse.json({ erro: false, empresa, criado: true });
}
