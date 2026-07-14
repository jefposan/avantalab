'use client';

import { useEffect, useState } from 'react';
import NovidadesVendasModal from '../components/NovidadesVendasModal';

type DadosConteudoVendas = {
  empresaId: string;
  nomeEmpresa: string;
  darkMode: boolean;
  corPrimaria?: string;
};

export default function VendasMobileConteudoBridge() {
  const [dados, setDados] = useState<DadosConteudoVendas | null>(null);

  useEffect(() => {
    const abrir = (evento: Event) => {
      const detalhe = (evento as CustomEvent<DadosConteudoVendas>).detail;
      if (!detalhe?.empresaId) return;
      setDados({
        empresaId: detalhe.empresaId,
        nomeEmpresa: detalhe.nomeEmpresa || 'Perfil atual',
        darkMode: Boolean(detalhe.darkMode),
        corPrimaria: detalhe.corPrimaria || '#003E73',
      });
    };

    window.addEventListener('avantalab:open-vendas-conteudo', abrir);
    return () => window.removeEventListener('avantalab:open-vendas-conteudo', abrir);
  }, []);

  useEffect(() => {
    if (!dados) return;
    const overflowAnterior = document.body.style.overflow;
    const overscrollAnterior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.body.style.overscrollBehavior = overscrollAnterior;
    };
  }, [dados]);

  return (
    <NovidadesVendasModal
      aberto={Boolean(dados)}
      empresaId={dados?.empresaId || null}
      nomeEmpresa={dados?.nomeEmpresa || ''}
      darkMode={Boolean(dados?.darkMode)}
      corPrimaria={dados?.corPrimaria || '#003E73'}
      onFechar={() => setDados(null)}
    />
  );
}
