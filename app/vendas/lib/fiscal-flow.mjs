export const FISCAL_REFERENCE_DATE = '2026-08-28';

export const fiscalDocumentProfiles = Object.freeze({
  nfe: Object.freeze({
    type: 'nfe',
    label: 'NF-e',
    model: '55',
    authority: 'SEFAZ autorizadora da UF',
    payload: 'XML 4.00 conforme MOC 7.0 e Notas Técnicas vigentes',
    primaryDocument: 'NF-e',
    auxiliaryDocument: 'DANFE',
    technicalReferences: ['MOC 7.0', 'NT 2025.002 v1.51', 'NT 2026.002 v1.10', 'NT 2026.004 v1.01', 'NT 2026.007 v1.00'],
    requiredCatalogFields: ['NCM', 'CFOP', 'origem', 'ICMS/CSOSN', 'PIS', 'COFINS', 'IBS/CBS quando aplicável'],
    events: ['Cancelamento', 'Carta de Correção', 'Inutilização de numeração', 'Consulta protocolo', 'Contingência EPEC/SVC'],
  }),
  nfce: Object.freeze({
    type: 'nfce',
    label: 'NFC-e',
    model: '65',
    authority: 'SEFAZ autorizadora da UF',
    payload: 'XML 4.00 conforme MOC 7.0 e Notas Técnicas vigentes',
    primaryDocument: 'NFC-e',
    auxiliaryDocument: 'DANFE NFC-e com QR Code',
    technicalReferences: ['MOC 7.0', 'NT 2025.002 v1.51', 'NT 2026.002 v1.10', 'NT 2026.004 v1.01', 'NT 2026.007 v1.00'],
    requiredCatalogFields: ['NCM', 'CFOP', 'origem', 'ICMS/CSOSN', 'PIS', 'COFINS', 'IBS/CBS quando aplicável'],
    events: ['Cancelamento', 'Consulta protocolo', 'Inutilização de numeração', 'Contingência off-line quando permitida'],
  }),
  nfse: Object.freeze({
    type: 'nfse',
    label: 'NFS-e',
    model: 'DPS/NFS-e',
    authority: 'Sistema Nacional ou prefeitura/provedor municipal',
    payload: 'DPS conforme leiaute SNNFSe vigente e regras do município',
    primaryDocument: 'NFS-e gerada a partir da DPS',
    auxiliaryDocument: 'DANFSe conforme padrão vigente',
    technicalReferences: ['SNNFSe v1.01 / XSD 20260209', 'NT 007', 'NT 008/2026', 'NT 009/2026'],
    requiredCatalogFields: ['Item da lista de serviço', 'código municipal', 'NBS', 'ISS', 'município de incidência', 'IBS/CBS quando aplicável'],
    events: ['Cancelamento', 'Substituição com vínculo entre notas', 'Consulta da NFS-e', 'Eventos sujeitos às regras municipais'],
  }),
});

export function getFiscalDocumentProfile(documentType) {
  return fiscalDocumentProfiles[documentType] ?? fiscalDocumentProfiles.nfe;
}

export function buildFiscalWorkflow({ documentType, draftReady = false, taxReviewConfirmed = false, taxReformReviewConfirmed = false, authorityDefined = false, certificateReady = false, providerReady = false }) {
  const profile = getFiscalDocumentProfile(documentType);
  const reviewed = Boolean(taxReviewConfirmed && taxReformReviewConfirmed);
  const transmissionReady = Boolean(draftReady && reviewed && authorityDefined && certificateReady && providerReady);
  return {
    profile,
    transmissionReady,
    steps: [
      { id: 'origin', label: 'Origem comercial e cadastro', detail: 'Pedido ou serviço, emitente, destinatário/tomador, itens e valores.', state: draftReady ? 'ready' : 'pending' },
      { id: 'tax', label: 'Revisão tributária', detail: 'Regime, regras do documento e adequações de IBS/CBS validadas pelo responsável fiscal.', state: reviewed ? 'ready' : 'pending' },
      { id: 'payload', label: documentType === 'nfse' ? 'Montagem e validação da DPS' : 'Montagem e validação do XML', detail: profile.payload, state: draftReady && reviewed ? 'ready' : 'blocked' },
      { id: 'signature', label: 'Assinatura em ambiente protegido', detail: 'Certificado ou assinatura nunca será armazenado neste navegador.', state: certificateReady ? 'ready' : 'blocked' },
      { id: 'authorization', label: 'Transmissão e retorno do autorizador', detail: !authorityDefined ? 'Rota de autorização ainda não definida.' : providerReady ? profile.authority : `${profile.authority}; conector de homologação ainda não configurado.`, state: authorityDefined && providerReady ? 'ready' : 'blocked' },
      { id: 'storage', label: 'Protocolo, documento e eventos', detail: `${profile.primaryDocument}, ${profile.auxiliaryDocument}, retornos e eventos serão guardados com rastreabilidade.`, state: transmissionReady ? 'ready' : 'planned' },
    ],
  };
}
