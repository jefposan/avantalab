import VendasMobileConteudoClient from './VendasMobileConteudoClient';

export default async function ConteudoVendasMobilePage({ searchParams }: { searchParams: Promise<{ empresaId?: string }> }) {
  const parametros = await searchParams;
  return <VendasMobileConteudoClient empresaId={String(parametros.empresaId || '')} />;
}
