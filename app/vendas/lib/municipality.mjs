const MUNICIPALITY_CODES = new Map([
  ['são paulo/sp', '3550308'],
  ['campinas/sp', '3509502'],
  ['sorocaba/sp', '3552205'],
  ['jundiaí/sp', '3525904'],
  ['campos do jordão/sp', '3509700'],
]);

const CEP_MUNICIPALITY_CODES = new Map([
  ['01001000', '3550308'],
  ['01310100', '3550308'],
  ['04538000', '3550308'],
  ['13010111', '3509502'],
  ['18010160', '3552205'],
  ['13201000', '3525904'],
  ['12460000', '3509700'],
]);

function text(value) {
  return String(value || '').trim();
}

function normalized(value) {
  return text(value).normalize('NFC').toLocaleLowerCase('pt-BR');
}

export function splitMunicipality(value, explicitUf = '') {
  const raw = text(value);
  const parts = raw.split('/');
  const ufFromValue = parts.length > 1 ? text(parts.pop()).toUpperCase() : '';
  return {
    city: parts.join('/').trim(),
    uf: text(explicitUf).toUpperCase() || ufFromValue,
  };
}

export function resolveMunicipalityCode({ city = '', uf = '', cep = '', currentCode = '' } = {}) {
  const cepCode = CEP_MUNICIPALITY_CODES.get(text(cep).replace(/\D/g, ''));
  if (cepCode) return cepCode;

  const municipality = splitMunicipality(city, uf);
  const cityCode = municipality.city && municipality.uf
    ? MUNICIPALITY_CODES.get(`${normalized(municipality.city)}/${municipality.uf.toLowerCase()}`)
    : '';
  if (cityCode) return cityCode;

  const preserved = text(currentCode).replace(/\D/g, '').slice(0, 7);
  return preserved.length === 7 ? preserved : '';
}

export function municipalityIsResolved(cityCode) {
  return text(cityCode).replace(/\D/g, '').length === 7;
}
