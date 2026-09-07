import { NextResponse } from 'next/server';
import { autenticarPerfilCobranca } from '@/app/lib/cobranca-servidor';
import {
  carregarCatalogoCustosParaVendas,
  ErroCatalogoVendas,
} from '@/app/modules/vendas/services/catalogo-servidor';
import { encaminharFiscalLab } from '@/app/lib/fiscalLabProxy';
import { moduloDisponivelParaEmpresa } from '@/app/lib/modulos-disponibilidade';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const empresaId = String(url.searchParams.get('empresaId') || '').trim();
  const tabelaPrecoId = String(url.searchParams.get('tabelaPrecoId') || '').trim();
  if (!empresaId) return NextResponse.json({ erro: true, mensagem: 'Selecione um perfil empresarial.' }, { status: 400 });
  const acesso = await autenticarPerfilCobranca(request, empresaId);
  if (!acesso) return NextResponse.json({ erro: true, mensagem: 'Acesso não autorizado.' }, { status: 403 });
  if (!moduloDisponivelParaEmpresa('vendas', empresaId)) {
    return NextResponse.json({ erro: true, mensagem: 'Módulo indisponível para este perfil.' }, { status: 404 });
  }
  const [{ data: empresa }, { data: instalacao }] = await Promise.all([
    acesso.db.from('empresas').select('tipo_perfil').eq('id', empresaId).maybeSingle(),
    acesso.db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id', empresaId).eq('modulo_id', 'vendas').maybeSingle(),
  ]);
  const expiraEm = instalacao?.expira_em ? new Date(instalacao.expira_em) : null;
  if (empresa?.tipo_perfil !== 'empresa' || instalacao?.ativo !== true || (expiraEm && expiraEm <= new Date())) {
    return NextResponse.json({ erro: true, mensagem: 'Instale o módulo Vendas e Serviços neste perfil empresarial.' }, { status: 403 });
  }
  try {
    const catalogo = await carregarCatalogoCustosParaVendas({ db: acesso.db, empresaId, tabelaPrecoId });
    return NextResponse.json({ ok: true, catalogo }, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    if (error instanceof ErroCatalogoVendas) {
      if (process.env.NODE_ENV === 'development' && [403, 404].includes(error.status)) {
        const parametros = new URLSearchParams({ companyId: empresaId });
        if (tabelaPrecoId) parametros.set('priceTableId', tabelaPrecoId);
        const laboratorio = await encaminharFiscalLab({
          request,
          method: 'GET',
          path: `/api/commercial/catalog?${parametros}`,
        });
        if (laboratorio.ok) return laboratorio;
      }
      return NextResponse.json({ erro: true, mensagem: error.message }, { status: error.status });
    }
    return NextResponse.json({ erro: true, mensagem: 'Não foi possível consultar o catálogo.' }, { status: 500 });
  }
}
