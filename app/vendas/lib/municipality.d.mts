export type MunicipalityResolutionInput = {
  city?: string;
  uf?: string;
  cep?: string;
  currentCode?: string;
};

export function splitMunicipality(value: string, explicitUf?: string): { city: string; uf: string };
export function resolveMunicipalityCode(input?: MunicipalityResolutionInput): string;
export function municipalityIsResolved(cityCode: string): boolean;
