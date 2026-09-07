import { VendasServicosPrototype } from './VendasServicosPrototype';

export default async function VendasSistemaPage({ searchParams }: { searchParams: Promise<{ bridge?: string | string[] }> }) {
  const params = await searchParams;
  const bridge = Array.isArray(params.bridge) ? params.bridge[0] : params.bridge;
  return <VendasServicosPrototype integratedManagementRuntime={bridge === 'gestao' || bridge === 'gestao-local'} />;
}
