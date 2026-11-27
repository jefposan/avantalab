'use client';

import { useSyncExternalStore } from 'react';
import CarregamentoDadosModulo from './CarregamentoDadosModulo';
import TelaCarregandoAcesso from './TelaCarregandoAcesso';
import { PARAMETRO_PREPARACAO_ACESSO } from '@/app/lib/origem-preparacao';

const semInscricao = () => () => {};
function formaDePreparacao() {
  if (window.parent !== window) return 'embutida';
  return new URLSearchParams(window.location.search).get(PARAMETRO_PREPARACAO_ACESSO) === '1' ? 'acesso' : 'interna';
}
const servidor = () => null;

type Props = { destino: string; mensagem?: string; titulo?: string; somenteInterna?: boolean };

/** O card interno pertence apenas à janela principal, inclusive em módulos aninhados. */
export default function TransicaoNavegacaoInterna({ destino, mensagem = 'Carregando os dados do módulo…', titulo, somenteInterna = false }: Props) {
  const forma = useSyncExternalStore(semInscricao, formaDePreparacao, servidor);
  if (!forma || forma === 'embutida') return null;
  if (forma === 'acesso' && !somenteInterna) return <TelaCarregandoAcesso preparandoAcesso mensagem="Aguarde um instante." />;
  return <CarregamentoDadosModulo
    ativo
    fundoBranco
    titulo={titulo || `Preparando ${destino}`}
    mensagem={mensagem}
    corPrimaria="#00AAA7"
  />;
}
