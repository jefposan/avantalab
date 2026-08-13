import { NextResponse } from 'next/server';
import { COBRANCA_ATIVA, assinaturaVigente } from '@/app/lib/cobranca';
import { autenticarPerfilCobranca, resolverEstadoAcesso } from '@/app/lib/cobranca-servidor';
import { obterRegistroModulo } from '@/app/lib/modulos-registro';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const empresaId = String(url.searchParams.get('empresaId') || '').trim();
  const moduloId = String(url.searchParams.get('moduloId') || '').trim();
  const manifesto = obterRegistroModulo(moduloId);
  if (!empresaId || !manifesto) return NextResponse.json({ erro: true, mensagem: 'Módulo ou perfil inválido.' }, { status: 400 });

  let acesso: Awaited<ReturnType<typeof autenticarPerfilCobranca>> = await autenticarPerfilCobranca(request, empresaId);
  let compartilhado = false;
  let compartilhamentoEdita = false;
  if (!acesso && moduloId === 'projetos') {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const cliente = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    const { data: auth } = await cliente.auth.getUser(token);
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
    const { data: vinculo } = auth.user ? await db.from('projetos_compartilhamentos').select('id,acesso').eq('empresa_id', empresaId).eq('user_id', auth.user.id).eq('situacao', 'ativo').limit(1).maybeSingle() : { data: null };
    if (vinculo && auth.user) { acesso = { db, usuario: auth.user, vinculo: { id: vinculo.id, perfil: 'operador_simples', status: 'ativo' }, podeGerenciar: false }; compartilhado = true; compartilhamentoEdita = vinculo.acesso === 'editor'; }
  }
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
    acesso.db.from('configuracoes').select('cor_primaria, dark_mode').eq('empresa_id', empresaId).maybeSingle(),
  ]);

  const instalado = instalacao?.ativo === true && (!instalacao.expira_em || instalacao.expira_em > agora);
  if (!instalado) return NextResponse.json({ erro: true, mensagem: 'Este módulo não está instalado neste perfil.' }, { status: 403 });

  const perfil = acesso.vinculo.perfil as keyof typeof manifesto.permissoes;
  const nivel = manifesto.permissoes[perfil];
  if (!nivel) return NextResponse.json({ erro: true, mensagem: 'Seu perfil não possui acesso a este módulo.' }, { status: 403 });

  return NextResponse.json({
    ok: true,
    empresa: {
      id: empresaId,
      nome: empresa?.nome || 'Perfil empresarial',
      corPrimaria: configuracao?.cor_primaria || '#003E73',
      temaEscuro: configuracao?.dark_mode === true,
    },
    perfil,
    nivel,
    podeEditar: compartilhado ? compartilhamentoEdita : nivel !== 'visualizar',
    compartilhado,
    podeGerenciarModulo: acesso.podeGerenciar,
    expiraEm: instalacao.expira_em || null,
  });
}
