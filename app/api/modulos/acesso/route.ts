import { NextResponse } from 'next/server';
import { COBRANCA_ATIVA, assinaturaVigente } from '@/app/lib/cobranca';
import { autenticarPerfilCobranca, resolverEstadoAcesso } from '@/app/lib/cobranca-servidor';
import { obterRegistroModulo } from '@/app/lib/modulos-registro';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const empresaId = String(url.searchParams.get('empresaId') || '').trim();
  const moduloId = String(url.searchParams.get('moduloId') || '').trim();
  const manifesto = obterRegistroModulo(moduloId);
  if (!empresaId || !manifesto) return NextResponse.json({ erro: true, mensagem: 'Módulo ou perfil inválido.' }, { status: 400 });

  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  if (COBRANCA_ATIVA) {
    const estado = await resolverEstadoAcesso(empresaId);
    if (!estado || estado.tipoPerfil !== 'empresa' || !assinaturaVigente(estado)) {
      return NextResponse.json({ erro: true, mensagem: 'O plano deste perfil não está ativo.' }, { status: 403 });
    }
  }

  const agora = new Date().toISOString();
  const [{ data: instalacao }, { data: empresa }, { data: configuracao }] = await Promise.all([
    acesso.db.from('empresa_modulos').select('ativo, origem, expira_em').eq('empresa_id', empresaId).eq('modulo_id', moduloId).maybeSingle(),
    acesso.db.from('empresas').select('nome').eq('id', empresaId).maybeSingle(),
    acesso.db.from('configuracoes').select('cor_primaria').eq('empresa_id', empresaId).maybeSingle(),
  ]);

  const instalado = instalacao?.ativo === true && (!instalacao.expira_em || instalacao.expira_em > agora);
  if (!instalado) return NextResponse.json({ erro: true, mensagem: 'Este módulo não está instalado neste perfil.' }, { status: 403 });

  const perfil = acesso.vinculo.perfil as keyof typeof manifesto.permissoes;
  const nivel = manifesto.permissoes[perfil];
  if (!nivel) return NextResponse.json({ erro: true, mensagem: 'Seu perfil não possui acesso a este módulo.' }, { status: 403 });

  return NextResponse.json({
    ok: true,
    empresa: { id: empresaId, nome: empresa?.nome || 'Perfil empresarial', corPrimaria: configuracao?.cor_primaria || '#003E73' },
    perfil,
    nivel,
    podeEditar: nivel !== 'visualizar',
    podeGerenciarModulo: acesso.podeGerenciar,
    expiraEm: instalacao.expira_em || null,
  });
}
