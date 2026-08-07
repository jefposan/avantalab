import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca, resolverEstadoAcesso } from '../../../../lib/cobranca-servidor';
import { assinaturaVigente, COBRANCA_ATIVA } from '../../../../lib/cobranca';
import { normalizarPlanoComercial } from '../../../../lib/planos-comerciais';

export const runtime = 'nodejs';

// Business Pro inclui os módulos, mas o gestor decide quais deseja instalar.
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const empresaId = String(corpo.empresaId || '').trim();
  const moduloId = String(corpo.moduloId || '').trim();
  if (!empresaId || !moduloId) return NextResponse.json({ erro: true, mensagem: 'Dados inválidos.' }, { status: 400 });
  const acesso = await autenticarPerfilCobranca(request, empresaId, true);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  if (COBRANCA_ATIVA) {
    const estado = await resolverEstadoAcesso(empresaId);
    if (!estado || !assinaturaVigente(estado) || normalizarPlanoComercial(estado.plano) !== 'business_pro') {
      return NextResponse.json({ erro: true, mensagem: 'A instalação sem cobrança está disponível apenas no Business Pro ativo.' }, { status: 409 });
    }
  }
  const { data: modulo } = await acesso.db.from('modulos').select('id, disponivel').eq('id', moduloId).maybeSingle();
  if (!modulo?.disponivel) return NextResponse.json({ erro: true, mensagem: 'Módulo indisponível.' }, { status: 404 });
  const { error } = await acesso.db.from('empresa_modulos').upsert({
    empresa_id: empresaId,
    modulo_id: moduloId,
    ativo: true,
    origem: COBRANCA_ATIVA ? 'plano_business_pro' : 'avulso',
    expira_em: null,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'empresa_id,modulo_id' });
  if (error) return NextResponse.json({ erro: true, mensagem: 'Não foi possível instalar o módulo.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
