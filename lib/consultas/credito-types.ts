import type { TipoConsultaCredito } from '@/app/lib/carteira';

export type ResumoFonteCredito = {
  codigo: string;
  nome: string;
  resultado: string | null;
  consultaUid: string | null;
  resumo: Record<string, unknown>;
};

export type ResultadoConsultaCredito = {
  id: string;
  documento: string;
  tipoDocumento: 'CPF' | 'CNPJ';
  tipoConsulta: TipoConsultaCredito;
  nomeConsulta: string;
  valorCentavos: number;
  fontes: ResumoFonteCredito[];
  provedor: 'DIRECT_DATA';
  consultadoEm: string;
};
