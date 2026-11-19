import { normalizarTexto } from './formatters';

export type OpcaoSelecaoPesquisavel = {
  value: string;
  label: string;
  selectedLabel?: string;
  searchText?: string;
  disabled?: boolean;
};

export function filtrarOpcoesPesquisaveis(options: OpcaoSelecaoPesquisavel[], query: string, somenteAoDigitar = false) {
  const termo = normalizarTexto(query);
  if (somenteAoDigitar && !termo) return [];
  const compacto = termo.replace(/[^a-z0-9]/g, '');
  return options.filter(option => {
    const texto = normalizarTexto(`${option.label} ${option.searchText || ''}`);
    return texto.includes(termo) || Boolean(option.searchText && compacto && normalizarTexto(option.searchText).replace(/[^a-z0-9]/g, '').includes(compacto));
  });
}
