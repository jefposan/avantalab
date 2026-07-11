import { redirect } from 'next/navigation';

type MobilePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MobilePage({ searchParams }: MobilePageProps) {
  const parametrosRecebidos = await searchParams;
  const parametros = new URLSearchParams();

  Object.entries(parametrosRecebidos).forEach(([chave, valor]) => {
    if (Array.isArray(valor)) {
      valor.forEach((item) => parametros.append(chave, item));
    } else if (valor) {
      parametros.set(chave, valor);
    }
  });

  const busca = parametros.toString();
  redirect(busca ? `/?${busca}` : '/');
}
