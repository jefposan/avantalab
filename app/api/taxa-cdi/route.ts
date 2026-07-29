import { NextResponse } from 'next/server';

type RegistroSgs = { data?: string; valor?: string };

const URL_CDI_DIARIO = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/10?formato=json';
const DIAS_UTEIS_ANO = 252;

export async function GET() {
  try {
    const resposta = await fetch(URL_CDI_DIARIO, {
      next: { revalidate: 60 * 60 * 12 },
      headers: { Accept: 'application/json' },
    });
    if (!resposta.ok) throw new Error(`BCB respondeu ${resposta.status}`);

    const registros = (await resposta.json()) as RegistroSgs[];
    const ultimo = registros.at(-1);
    const taxaDiaria = Number(String(ultimo?.valor ?? '').replace(',', '.'));
    if (!ultimo?.data || !Number.isFinite(taxaDiaria) || taxaDiaria <= 0) throw new Error('Série CDI sem valor válido');

    const taxaAnualPercentual = (Math.pow(1 + taxaDiaria / 100, DIAS_UTEIS_ANO) - 1) * 100;
    return NextResponse.json(
      { fonte: 'Banco Central do Brasil — SGS 12', referencia: ultimo.data, taxaDiariaPercentual: taxaDiaria, taxaAnualPercentual, convencao: `${DIAS_UTEIS_ANO} dias úteis` },
      { headers: { 'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400' } },
    );
  } catch {
    return NextResponse.json({ erro: 'Não foi possível atualizar a Taxa DI agora.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
