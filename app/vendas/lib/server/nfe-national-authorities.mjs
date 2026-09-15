// Catálogo estático dos Web Services NF-e 4.00 publicados no Portal Nacional.
// Fonte consultada em 2026-09-14: https://www.nfe.fazenda.gov.br/portal/webServices.aspx
// Nunca aceite URLs de autorizadores informadas pelo cliente ou pela empresa.

export const NFE_NATIONAL_AUTHORITIES_REFERENCE = '2026-09-14';

const SERVICES = Object.freeze(['authorization', 'receipt', 'protocol', 'status', 'event', 'inutilization']);
const ENVIRONMENTS = Object.freeze({ homologacao: '2', producao: '1' });
const UF = /^[A-Z]{2}$/;

function endpoints(base) {
  return Object.freeze({
    authorization: base.authorization,
    receipt: base.receipt,
    protocol: base.protocol,
    status: base.status,
    event: base.event,
    inutilization: base.inutilization,
  });
}

function authority(id, label, environments) {
  return Object.freeze({ id, label, environments: Object.freeze(environments) });
}

export const NFE_AUTHORITIES = Object.freeze({
  AM: authority('AM', 'SEFAZ Amazonas', {
    producao: endpoints({ authorization: 'https://nfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4', receipt: 'https://nfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4', protocol: 'https://nfe.sefaz.am.gov.br/services2/services/NfeConsulta4', status: 'https://nfe.sefaz.am.gov.br/services2/services/NfeStatusServico4', event: 'https://nfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4', inutilization: 'https://nfe.sefaz.am.gov.br/services2/services/NfeInutilizacao4' }),
    homologacao: endpoints({ authorization: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4', receipt: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4', protocol: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeConsulta4', status: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeStatusServico4', event: 'https://homnfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4', inutilization: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeInutilizacao4' }),
  }),
  BA: authority('BA', 'SEFAZ Bahia', {
    producao: endpoints({ authorization: 'https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx', receipt: 'https://nfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx', protocol: 'https://nfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx', status: 'https://nfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx', event: 'https://nfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx', inutilization: 'https://nfe.sefaz.ba.gov.br/webservices/NFeInutilizacao4/NFeInutilizacao4.asmx' }),
    homologacao: endpoints({ authorization: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx', receipt: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx', protocol: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx', status: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx', event: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx', inutilization: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeInutilizacao4/NFeInutilizacao4.asmx' }),
  }),
  GO: authority('GO', 'SEFAZ Goiás', {
    producao: endpoints({ authorization: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4', receipt: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4', protocol: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4', status: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4', event: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4', inutilization: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeInutilizacao4' }),
    homologacao: endpoints({ authorization: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4', receipt: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4', protocol: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4', status: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4', event: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4', inutilization: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeInutilizacao4' }),
  }),
  MG: authority('MG', 'SEFAZ Minas Gerais', {
    producao: endpoints({ authorization: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4', receipt: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4', protocol: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4', status: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4', event: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4', inutilization: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4' }),
    homologacao: endpoints({ authorization: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4', receipt: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4', protocol: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4', status: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4', event: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4', inutilization: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4' }),
  }),
  MS: authority('MS', 'SEFAZ Mato Grosso do Sul', {
    producao: endpoints({ authorization: 'https://nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4', receipt: 'https://nfe.sefaz.ms.gov.br/ws/NFeRetAutorizacao4', protocol: 'https://nfe.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4', status: 'https://nfe.sefaz.ms.gov.br/ws/NFeStatusServico4', event: 'https://nfe.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4', inutilization: 'https://nfe.sefaz.ms.gov.br/ws/NFeInutilizacao4' }),
    homologacao: endpoints({ authorization: 'https://hom.nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4', receipt: 'https://hom.nfe.sefaz.ms.gov.br/ws/NFeRetAutorizacao4', protocol: 'https://hom.nfe.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4', status: 'https://hom.nfe.sefaz.ms.gov.br/ws/NFeStatusServico4', event: 'https://hom.nfe.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4', inutilization: 'https://hom.nfe.sefaz.ms.gov.br/ws/NFeInutilizacao4' }),
  }),
  MT: authority('MT', 'SEFAZ Mato Grosso', {
    producao: endpoints({ authorization: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4', receipt: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4', protocol: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4', status: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4', event: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/RecepcaoEvento4', inutilization: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeInutilizacao4' }),
    homologacao: endpoints({ authorization: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4', receipt: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4', protocol: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4', status: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4', event: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/RecepcaoEvento4', inutilization: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeInutilizacao4' }),
  }),
  PE: authority('PE', 'SEFAZ Pernambuco', {
    producao: endpoints({ authorization: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4', receipt: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4', protocol: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4', status: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4', event: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento4', inutilization: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeInutilizacao4' }),
    homologacao: endpoints({ authorization: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4', receipt: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4', protocol: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4', status: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4', event: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento4', inutilization: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeInutilizacao4' }),
  }),
  PR: authority('PR', 'SEFAZ Paraná', {
    producao: endpoints({ authorization: 'https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4', receipt: 'https://nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4', protocol: 'https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4', status: 'https://nfe.sefa.pr.gov.br/nfe/NFeStatusServico4', event: 'https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4', inutilization: 'https://nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4' }),
    homologacao: endpoints({ authorization: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4', receipt: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4', protocol: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4', status: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4', event: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4', inutilization: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4' }),
  }),
  RS: authority('RS', 'SEFAZ Rio Grande do Sul', {
    producao: endpoints({ authorization: 'https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx', receipt: 'https://nfe.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx', protocol: 'https://nfe.sefazrs.rs.gov.br/ws/NfeConsulta/NFeConsulta4.asmx', status: 'https://nfe.sefazrs.rs.gov.br/ws/NfeStatusServico/NFeStatusServico4.asmx', event: 'https://nfe.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx', inutilization: 'https://nfe.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx' }),
    homologacao: endpoints({ authorization: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx', receipt: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx', protocol: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta/NFeConsulta4.asmx', status: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NFeStatusServico4.asmx', event: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx', inutilization: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx' }),
  }),
  SP: authority('SP', 'SEFAZ São Paulo', {
    producao: endpoints({ authorization: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx', receipt: 'https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx', protocol: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx', status: 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx', event: 'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx', inutilization: 'https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx' }),
    homologacao: endpoints({ authorization: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx', receipt: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx', protocol: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx', status: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx', event: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx', inutilization: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx' }),
  }),
  SVAN: authority('SVAN', 'SEFAZ Virtual do Ambiente Nacional', {
    producao: endpoints({ authorization: 'https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx', receipt: 'https://www.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx', protocol: 'https://www.sefazvirtual.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx', status: 'https://www.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx', event: 'https://www.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx', inutilization: 'https://www.sefazvirtual.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx' }),
    homologacao: endpoints({ authorization: 'https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx', receipt: 'https://hom.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx', protocol: 'https://hom.sefazvirtual.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx', status: 'https://hom.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx', event: 'https://hom.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx', inutilization: 'https://hom.sefazvirtual.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx' }),
  }),
  SVRS: authority('SVRS', 'SEFAZ Virtual Rio Grande do Sul', {
    producao: endpoints({ authorization: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx', receipt: 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx', protocol: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NFeConsulta4.asmx', status: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NFeStatusServico4.asmx', event: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx', inutilization: 'https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx' }),
    homologacao: endpoints({ authorization: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx', receipt: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx', protocol: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NFeConsulta4.asmx', status: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx', event: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx', inutilization: 'https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx' }),
  }),
});

const NATIONAL_UFS = Object.freeze({
  AC: ['12', 'SVRS'], AL: ['27', 'SVRS'], AP: ['16', 'SVRS'], AM: ['13', 'AM'], BA: ['29', 'BA'], CE: ['23', 'SVRS'],
  DF: ['53', 'SVRS'], ES: ['32', 'SVRS'], GO: ['52', 'GO'], MA: ['21', 'SVAN'], MT: ['51', 'MT'], MS: ['50', 'MS'],
  MG: ['31', 'MG'], PA: ['15', 'SVRS'], PB: ['25', 'SVRS'], PR: ['41', 'PR'], PE: ['26', 'PE'], PI: ['22', 'SVRS'],
  RJ: ['33', 'SVRS'], RN: ['24', 'SVRS'], RS: ['43', 'RS'], RO: ['11', 'SVRS'], RR: ['14', 'SVRS'], SC: ['42', 'SVRS'],
  SP: ['35', 'SP'], SE: ['28', 'SVRS'], TO: ['17', 'SVRS'],
});

export const NFE_UFS = Object.freeze(Object.fromEntries(Object.entries(NATIONAL_UFS).map(([uf, [code, authorityId]]) => [uf, Object.freeze({ uf, code, authorityId })])));

function normalized(value) { return String(value || '').trim().toUpperCase(); }

export function resolveNationalNfeAuthority({ uf, environment = 'homologacao' } = {}) {
  const issuerUf = normalized(uf);
  if (!UF.test(issuerUf) || !NFE_UFS[issuerUf]) return null;
  if (!Object.prototype.hasOwnProperty.call(ENVIRONMENTS, environment)) return null;
  const issuer = NFE_UFS[issuerUf];
  const authority = NFE_AUTHORITIES[issuer.authorityId];
  const serviceEndpoints = authority?.environments?.[environment];
  if (!authority || !serviceEndpoints || SERVICES.some((service) => !serviceEndpoints[service])) return null;
  return Object.freeze({
    issuerUf,
    issuerCode: issuer.code,
    authorityId: authority.id,
    authority: authority.label,
    environment,
    environmentCode: ENVIRONMENTS[environment],
    endpoints: serviceEndpoints,
  });
}

export function resolveNationalNfeAuthorityByCode({ code, environment = 'homologacao' } = {}) {
  const issuerCode = String(code || '').replace(/\D/g, '').slice(0, 2);
  const issuer = Object.values(NFE_UFS).find((entry) => entry.code === issuerCode);
  return issuer ? resolveNationalNfeAuthority({ uf: issuer.uf, environment }) : null;
}

export function listNationalNfeUfs() {
  return Object.freeze(Object.keys(NFE_UFS).sort().map((uf) => Object.freeze({ ...NFE_UFS[uf] })));
}

export function isOfficialNfeEndpoint({ uf, environment, service, endpoint } = {}) {
  const authority = resolveNationalNfeAuthority({ uf, environment });
  return Boolean(authority && SERVICES.includes(service) && authority.endpoints[service] === String(endpoint || '').trim());
}
