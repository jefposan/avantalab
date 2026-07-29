import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { COBRANCA_ATIVA } from '../../lib/cobranca';
import { normalizarPlanoComercial, PLANOS_COMERCIAIS, type PlanoComercial } from '../../lib/planos-comerciais';

function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: true, mensagem }, { status });
}

function planoComMaiorCapacidade(planos: PlanoComercial[]): PlanoComercial {
  return planos.includes('business_pro') ? 'business_pro'
    : planos.includes('business') ? 'business'
      : planos.includes('pessoal_premium') ? 'pessoal_premium'
        : 'free';
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

  if (COBRANCA_ATIVA && ids.length) {
    const [{ data: empresas }, { data: assinaturas }] = await Promise.all([
      db.from('empresas').select('id, tipo_perfil').in('id', ids),
      db.from('assinaturas').select('empresa_id, plano, status, trial_fim, valido_ate').in('empresa_id', ids),
    ]);
    const porEmpresa = new Map((assinaturas || []).map((a) => [a.empresa_id, a]));
    const agora = new Date();
    const planos = (empresas || []).flatMap((empresa) => {
      const assinatura = porEmpresa.get(empresa.id);
      const plano = normalizarPlanoComercial(assinatura?.plano);
      const vigente = assinatura?.status === 'ativa'
        || (assinatura?.status === 'trial' && !!assinatura.trial_fim && new Date(assinatura.trial_fim) > agora)
        || ((assinatura?.status === 'cancelada' || assinatura?.status === 'inadimplente') && !!assinatura.valido_ate && new Date(assinatura.valido_ate) > agora);
      if (empresa.tipo_perfil === 'empresa' && vigente) return [plano === 'business_pro' ? 'business_pro' : 'business'];
      if (empresa.tipo_perfil === 'pessoal' && vigente && plano === 'pessoal_premium') return ['pessoal_premium'];
      return [];
    }) as PlanoComercial[];
    const plano = planoComMaiorCapacidade(planos);
    const limites = PLANOS_COMERCIAIS[plano].limites;
    if (!limites.tiposDePerfilPermitidos.includes(tipoPerfil)) {
      return erro('Seu plano atual permite apenas perfis pessoais. Assine Business para criar um perfil empresarial.', 409);
    }
    if (ids.length >= limites.perfis) {
      const sugestao = plano === 'free' ? 'Pessoal Premium' : plano === 'pessoal_premium' || plano === 'business' ? 'Business Pro' : 'um plano superior';
      return erro(`Este plano permite até ${limites.perfis} ${limites.perfis === 1 ? 'perfil' : 'perfis'}. Faça upgrade para o ${sugestao} para continuar.`, 409);
    }
  }

  const email = String(auth.user.email || '').toLowerCase();
  const nomeUsuario = String(auth.user.user_metadata?.nome || email.split('@')[0] || 'Usuário').trim();
  const { data: empresa, error: empresaErro } = await db.from('empresas').insert({ nome, tipo_perfil: tipoPerfil }).select().single();
  if (empresaErro || !empresa) return erro(empresaErro?.message || 'Não foi possível criar o perfil.', 500);
  const { error: vinculoErro } = await db.from('usuarios_empresa').insert({ empresa_id: empresa.id, user_id: auth.user.id, nome: nomeUsuario, email, perfil: 'gestor_master', status: 'ativo' });
  if (vinculoErro) {
    await db.from('empresas').delete().eq('id', empresa.id);
    return erro('Não foi possível concluir o vínculo do perfil.', 500);
  }
  await db.from('configuracoes').upsert({ empresa_id: empresa.id, duplicados_ativo: true }, { onConflict: 'empresa_id' });
  return NextResponse.json({ erro: false, empresa, criado: true });
}
