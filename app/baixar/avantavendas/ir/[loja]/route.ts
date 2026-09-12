import { after, NextResponse } from 'next/server';
import { registrarEventoDownloadAvantaVendas } from '@/app/lib/avantavendas-download-analytics';
import {
  criarUrlLojaAvantaVendas,
  extrairParametrosCampanhaAvantaVendas,
  identificarDispositivoDownloadAvantaVendas,
  lojaParaDestinoDownloadAvantaVendas,
  normalizarParametrosDownloadAvantaVendas,
  obterLinksDownloadAvantaVendas,
  type LojaDownloadAvantaVendas,
} from '@/app/lib/avantavendas-download';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function lojaValida(valor: string): valor is LojaDownloadAvantaVendas {
  return valor === 'ios' || valor === 'android';
}

export async function GET(request: Request, contexto: { params: Promise<{ loja: string }> }) {
  const { loja } = await contexto.params;
  const urlSolicitada = new URL(request.url);
  const parametros = normalizarParametrosDownloadAvantaVendas(urlSolicitada.searchParams);

  if (!lojaValida(loja)) {
    const paginaEscolha = new URL('/baixar/avantavendas', request.url);
    paginaEscolha.search = parametros.toString();
    return NextResponse.redirect(paginaEscolha, 307);
  }

  const links = obterLinksDownloadAvantaVendas();
  const destino = lojaParaDestinoDownloadAvantaVendas(loja);
  const lojaUrl = loja === 'ios' ? links.appStoreUrl : links.playStoreUrl;
  const dispositivo = identificarDispositivoDownloadAvantaVendas(request.headers.get('user-agent'));
  const campanha = extrairParametrosCampanhaAvantaVendas(parametros);

  after(() => registrarEventoDownloadAvantaVendas({
    tipo: 'selecao_loja',
    dispositivo,
    destino,
    campanha,
  }));

  return NextResponse.redirect(criarUrlLojaAvantaVendas(lojaUrl, parametros), 307);
}
