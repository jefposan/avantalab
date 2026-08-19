import type { Metadata } from 'next';
import { AvantaLandingPage } from '../page';

export const metadata: Metadata = {
  title: 'Gestão financeira | AvantaLab',
  description: 'Organize receitas, despesas, indicadores e a operação da empresa em uma única visão.',
  alternates: { canonical: 'https://avantalab.com.br/gestao-financeira' },
};

export default function GestaoFinanceiraPage() {
  return <AvantaLandingPage contexto="gestao" />;
}
