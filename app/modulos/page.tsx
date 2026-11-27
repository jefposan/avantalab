import MeusModulos from './MeusModulos';
import { PARAMETRO_PREPARACAO_ACESSO } from '@/app/lib/origem-preparacao';

export default async function ModulosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <MeusModulos retornoInterno={params.retorno === '1'} entradaEmCurso={params[PARAMETRO_PREPARACAO_ACESSO] === '1'} />;
}
