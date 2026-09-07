import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '@/app/lib/cobranca-servidor';
import {
  carregarAdministracaoPermissoesModulo,
  ErroPermissaoModulo,
  salvarDecisaoPermissaoModulo,
} from '@/app/lib/permissoes-modulos-servidor';
import {
  GRUPOS_PERMISSOES_VENDAS,
  PERMISSOES_VENDAS_POR_PERFIL,
  PERMISSOES_VENDAS_PROTEGIDAS,
  type DecisaoPermissaoModulo,
} from '@/app/modules/vendas/permissions';
import { VENDAS_MODULE_ID } from '@/app/modules/vendas/manifest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function respostaErro(error: unknown) {
  if (error instanceof ErroPermissaoModulo) {
    return NextResponse.json({ erro: true, codigo: error.codigo, mensagem: error.message }, { status: error.status });
  }
  return NextResponse.json({ erro: true, codigo: 'FALHA_INTERNA', mensagem: 'Não foi possível processar as permissões.' }, { status: 500 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const empresaId = String(url.searchParams.get('empresaId') || '').trim();
  const moduloId = String(url.searchParams.get('moduloId') || '').trim();
  if (!empresaId || moduloId !== VENDAS_MODULE_ID) {
    return NextResponse.json({ erro: true, mensagem: 'Perfil ou módulo inválido.' }, { status: 400 });
  }
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  try {
    const dados = await carregarAdministracaoPermissoesModulo(acesso.db, empresaId, moduloId);
    return NextResponse.json({
      ok: true,
      moduloId,
      grupos: GRUPOS_PERMISSOES_VENDAS,
      permissoesProtegidas: PERMISSOES_VENDAS_PROTEGIDAS,
      padroes: PERMISSOES_VENDAS_POR_PERFIL,
      ...dados,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return respostaErro(error);
  }
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erro: true, mensagem: 'Envie um corpo JSON válido.' }, { status: 400 });
  }
  const empresaId = String(body.empresaId || '').trim();
  const moduloId = String(body.moduloId || '').trim();
  const tipoAlvo = String(body.tipoAlvo || '').trim();
  const alvoId = String(body.alvoId || '').trim();
  const codigoPermissao = String(body.codigoPermissao || '').trim();
  const decisao = String(body.decisao || '').trim() as DecisaoPermissaoModulo;
  if (!empresaId || moduloId !== VENDAS_MODULE_ID || !['perfil', 'usuario'].includes(tipoAlvo) || !alvoId) {
    return NextResponse.json({ erro: true, mensagem: 'Dados da permissão inválidos.' }, { status: 400 });
  }
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  try {
    const salvo = await salvarDecisaoPermissaoModulo({
      db: acesso.db,
      empresaId,
      moduloId,
      codigoPermissao,
      decisao,
      alvo: tipoAlvo === 'perfil'
        ? { tipo: 'perfil', perfil: alvoId as 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples' }
        : { tipo: 'usuario', usuarioId: alvoId },
      autorId: acesso.usuario.id,
    });
    return NextResponse.json({ ok: true, salvo }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return respostaErro(error);
  }
}

