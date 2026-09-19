import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca, resolverEstadoAcesso } from '../../../../lib/cobranca-servidor';
import {
  permiteInstalacaoModuloSemCobranca,
  resolverAcessoComercialModulo,
} from '../../../../lib/modulos-acesso-comercial';
import { MENSAGEM_MODULO_EM_FINALIZACAO, moduloDisponivelParaEmpresa } from '../../../../lib/modulos-disponibilidade';

export const runtime = 'nodejs';

// Business Pro inclui os módulos, mas o gestor decide quais deseja instalar.
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const moduloId = String(corpo.moduloId || '').trim();
  if (!empresaId || !moduloId) return NextResponse.json({ erro: true, mensagem: 'Dados inválidos.' }, { status: 400 });
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  if (!moduloDisponivelParaEmpresa(moduloId, empresaId)) {
    return NextResponse.json({ erro: true, mensagem: MENSAGEM_MODULO_EM_FINALIZACAO }, { status: 404 });
  }
  const estado = await resolverEstadoAcesso(empresaId);
  const acessoComercial = resolverAcessoComercialModulo(estado);
  if (!permiteInstalacaoModuloSemCobranca(acessoComercial)) {
    return NextResponse.json({ erro: true, mensagem: 'A instalação sem cobrança está disponível no Business Pro ou em perfis liberados por cortesia.' }, { status: 409 });
  }
  const [{ data: modulo }, { data: empresa }, { data: custos }] = await Promise.all([
    acesso.db.from('modulos').select('id, disponivel, perfis').eq('id', moduloId).maybeSingle(),
    acesso.db.from('empresas').select('tipo_perfil').eq('id', empresaId).maybeSingle(),
    moduloId === 'vendas'
      ? acesso.db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id', empresaId).eq('modulo_id', 'custos').maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!modulo?.disponivel) return NextResponse.json({ erro: true, mensagem: 'Módulo indisponível.' }, { status: 404 });
  const tipoPerfil = empresa?.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
  if (!Array.isArray(modulo.perfis) || !modulo.perfis.includes(tipoPerfil)) {
    return NextResponse.json({ erro: true, mensagem: 'Módulo indisponível para este tipo de perfil.' }, { status: 404 });
  }
  const custosExpirado = custos?.expira_em && new Date(custos.expira_em) <= new Date();
  if (moduloId === 'vendas' && (custos?.ativo !== true || custosExpirado)) {
    return NextResponse.json({ erro: true, mensagem: 'Instale primeiro o módulo Custos e Precificação neste perfil.' }, { status: 409 });
  }
  const { error } = await acesso.db.from('empresa_modulos').upsert({
    empresa_id: empresaId,
    modulo_id: moduloId,
    ativo: true,
    origem: acessoComercial === 'business_pro'
      ? 'plano_business_pro'
      : acessoComercial === 'cortesia'
        ? 'cortesia'
        : 'avulso',
    expira_em: null,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'empresa_id,modulo_id' });
  if (error) return NextResponse.json({ erro: true, mensagem: 'Não foi possível instalar o módulo.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
