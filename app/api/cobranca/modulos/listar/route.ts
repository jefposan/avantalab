import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '@/app/lib/cobranca-servidor';
import { listarProjetosCompartilhados } from '@/app/lib/projetos-compartilhados-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const empresaId = new URL(request.url).searchParams.get('empresaId')?.trim() || '';
  if (!empresaId) {
    return NextResponse.json(
      { erro: true, mensagem: 'Perfil não identificado.' },
      { status: 400 },
    );
  }

  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso) {
    return NextResponse.json(
      { erro: true, mensagem: 'Acesso não autorizado.' },
      { status: 403 },
    );
  }

  const [catalogo, instalacoes, assinaturasCanceladas] = await Promise.all([
    acesso.db
      .from('modulos')
      .select('id, nome, descricao, icone, perfis')
      .eq('disponivel', true)
      .order('ordem', { ascending: true }),
    acesso.db
      .from('empresa_modulos')
      .select('modulo_id, expira_em')
      .eq('empresa_id', empresaId)
      .eq('ativo', true),
    acesso.db
      .from('assinaturas_modulos')
      .select('modulo_id, valido_ate')
      .eq('empresa_id', empresaId)
      .eq('status', 'cancelada'),
  ]);

  if (catalogo.error || instalacoes.error || assinaturasCanceladas.error) {
    console.error('Falha ao carregar módulos do perfil.', {
      catalogo: catalogo.error?.code,
      instalacoes: instalacoes.error?.code,
      assinaturas: assinaturasCanceladas.error?.code,
    });
    return NextResponse.json(
      { erro: true, mensagem: 'Não foi possível carregar os módulos. Tente novamente.' },
      { status: 500 },
    );
  }

  const agora = Date.now();
  const ativos = (instalacoes.data || [])
    .filter((item) => !item.expira_em || new Date(item.expira_em).getTime() > agora)
    .map((item) => String(item.modulo_id));
  const cancelamentos = Object.fromEntries(
    (assinaturasCanceladas.data || [])
      .filter((item) => item.valido_ate && new Date(item.valido_ate).getTime() > agora)
      .map((item) => [String(item.modulo_id), String(item.valido_ate)]),
  );

  const modulosVisiveis = acesso.podeGerenciar
    ? catalogo.data || []
    : (catalogo.data || []).filter((modulo) => ativos.includes(String(modulo.id)));

  let projetosCompartilhados = 0;
  try {
    projetosCompartilhados = (await listarProjetosCompartilhados(acesso.db, acesso.usuario.id)).length;
  } catch (error) {
    console.error('Falha ao consultar projetos compartilhados no menu.', error);
  }

  return NextResponse.json(
    {
      modulos: modulosVisiveis,
      ativos,
      cancelamentos: acesso.podeGerenciar ? cancelamentos : {},
      projetosCompartilhados,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
