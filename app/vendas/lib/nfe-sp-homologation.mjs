import { resolveFiscalIssuerSelection } from './fiscal-issuer-routing.mjs';

export const NFE_SP_HOMOLOGATION_REFERENCE = '2026-09-02';
export const NFE_SP_ADAPTER_ID = 'avantalab-direct-nfe-sp-v1';

export const NFE_SP_HOMOLOGATION_ENDPOINTS = Object.freeze([
  Object.freeze({ id: 'status', service: 'NfeStatusServico', version: '4.00', purpose: 'Consultar a disponibilidade do autorizador antes do envio.', url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx' }),
  Object.freeze({ id: 'authorization', service: 'NFeAutorizacao', version: '4.00', purpose: 'Enviar o lote assinado de NF-e para autorização.', url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx' }),
  Object.freeze({ id: 'authorization-return', service: 'NFeRetAutorizacao', version: '4.00', purpose: 'Consultar o resultado de um lote processado de forma assíncrona.', url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx' }),
  Object.freeze({ id: 'protocol', service: 'NfeConsultaProtocolo', version: '4.00', purpose: 'Consultar a situação e o protocolo pela chave de acesso.', url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx' }),
  Object.freeze({ id: 'registration', service: 'NfeConsultaCadastro', version: '4.00', purpose: 'Consultar o cadastro do contribuinte quando aplicável.', url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/cadconsultacadastro4.asmx' }),
  Object.freeze({ id: 'event', service: 'RecepcaoEvento', version: '4.00', purpose: 'Recepcionar eventos, como cancelamento e carta de correção.', url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx' }),
  Object.freeze({ id: 'inutilization', service: 'NfeInutilizacao', version: '4.00', purpose: 'Solicitar a inutilização de uma faixa de numeração.', url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx' }),
]);

const CERTIFICATE_MODES = ['Não definido', 'Certificado A1', 'Certificado em nuvem'];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function createDefaultNfeSpHomologationConfig() {
  return {
    version: 2,
    adapterId: NFE_SP_ADAPTER_ID,
    reference: NFE_SP_HOMOLOGATION_REFERENCE,
    environment: 'homologacao',
    selectedEstablishmentId: '',
    selectedDraftId: '',
    testDocumentNumber: '',
    testNumericCode: '',
    accreditationConfirmed: false,
    contingencyReviewed: false,
    responsible: '',
    certificate: {
      mode: 'Não definido',
      secureReference: '',
      subjectDocument: '',
      expiresAt: '',
      chainValidated: false,
    },
    notes: '',
    lastLocalDiagnosticAt: '',
  };
}

export function normalizeNfeSpHomologationConfig(value) {
  const fallback = createDefaultNfeSpHomologationConfig();
  if (!value || typeof value !== 'object') return fallback;
  const certificate = value.certificate && typeof value.certificate === 'object' ? value.certificate : {};
  const certificateMode = certificate.mode === 'A1 em cofre' ? 'Certificado A1' : certificate.mode === 'Assinatura em nuvem' ? 'Certificado em nuvem' : certificate.mode;
  return {
    ...fallback,
    ...value,
    version: 2,
    adapterId: NFE_SP_ADAPTER_ID,
    reference: NFE_SP_HOMOLOGATION_REFERENCE,
    environment: 'homologacao',
    selectedEstablishmentId: text(value.selectedEstablishmentId),
    selectedDraftId: text(value.selectedDraftId),
    testDocumentNumber: digits(value.testDocumentNumber).slice(0, 9),
    testNumericCode: digits(value.testNumericCode).slice(0, 8),
    accreditationConfirmed: value.accreditationConfirmed === true,
    contingencyReviewed: value.contingencyReviewed === true,
    responsible: text(value.responsible),
    certificate: {
      mode: CERTIFICATE_MODES.includes(certificateMode) ? certificateMode : 'Não definido',
      secureReference: text(certificate.secureReference),
      subjectDocument: digits(certificate.subjectDocument).slice(0, 14),
      expiresAt: text(certificate.expiresAt),
      chainValidated: certificate.chainValidated === true,
    },
    notes: text(value.notes),
    lastLocalDiagnosticAt: text(value.lastLocalDiagnosticAt),
  };
}

function validFutureDate(value, now) {
  if (!value) return false;
  const expiresAt = new Date(`${value}T23:59:59-03:00`);
  return Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
}

function check(id, phase, label, ready, detail) {
  return { id, phase, label, ready: Boolean(ready), detail };
}

export function evaluateNfeSpHomologationConfig(value, context = {}) {
  const config = normalizeNfeSpHomologationConfig(value);
  const issuerSelection = resolveFiscalIssuerSelection(context.issuerRegistry, 'nfe', config.selectedEstablishmentId, context.company);
  const issuer = config.selectedEstablishmentId ? issuerSelection.establishment : undefined;
  const snapshot = config.selectedEstablishmentId ? issuerSelection.snapshot : undefined;
  const drafts = Array.isArray(context.drafts) ? context.drafts : [];
  const draft = drafts.find((item) => item?.id === config.selectedDraftId);
  const now = context.now instanceof Date ? context.now : new Date();
  const issuerDocument = digits(snapshot?.document);
  const draftRegistrationReady = Boolean(draft?.checks?.filter((item) => item?.scope === 'cadastro').every((item) => item.ready));
  const certificateDocumentMatches = issuerDocument.length === 14 && digits(config.certificate.subjectDocument) === issuerDocument;

  const checks = [
    check('environment-lock', 'seguranca', 'Ambiente travado em homologação', config.environment === 'homologacao', 'Este adaptador não contém endereço de produção nem chave para liberar transmissão real.'),
    check('issuer', 'cadastro', 'Emissor paulista selecionado', Boolean(config.selectedEstablishmentId && issuerSelection.valid && snapshot?.uf === 'SP' && snapshot?.documentType === 'nfe'), snapshot?.uf === 'SP' ? `${snapshot.label} · ${snapshot.city}/SP` : 'Selecione uma matriz ou filial ativa localizada em São Paulo e habilitada para NF-e.'),
    check('issuer-registration', 'cadastro', 'Credenciamento da NF-e', ['Homologação', 'Produção'].includes(snapshot?.registrationStatus) && config.accreditationConfirmed, snapshot ? `Cadastro do emissor: ${snapshot.registrationStatus}. Confirme também a habilitação no ambiente de testes da SEFAZ-SP.` : 'O emissor ainda não foi selecionado.'),
    check('issuer-tax-registration', 'cadastro', 'CNPJ, IE e município', issuerDocument.length === 14 && Boolean(snapshot?.stateRegistration) && digits(snapshot?.cityCode).length === 7, 'O estabelecimento precisa manter CNPJ, inscrição estadual e município fiscal identificado automaticamente.'),
    check('draft', 'documento', 'Rascunho NF-e vinculado', Boolean(draft && draft.documentType === 'nfe' && draft.status !== 'Cancelado'), draft ? `${draft.id} · origem ${draft.originId}` : 'Selecione um rascunho NF-e ainda ativo.'),
    check('draft-issuer', 'documento', 'Rascunho pertence ao emissor', Boolean(draft && snapshot && draft.issuer?.establishmentId === snapshot.establishmentId), 'O rascunho não pode ser testado com um CNPJ emissor diferente do registrado na operação.'),
    check('draft-registration', 'documento', 'Cadastro do rascunho validado', draftRegistrationReady, 'Itens, destinatário, valores e classificação precisam passar pela pré-validação cadastral.'),
    check('test-number', 'documento', 'Número isolado de teste', Boolean(config.testDocumentNumber && Number(config.testDocumentNumber) > 0), 'Informe um número apenas para o diagnóstico; ele não será reservado na numeração fiscal real.'),
    check('numeric-code', 'documento', 'Código numérico cNF', config.testNumericCode.length === 8, 'Informe os oito dígitos usados na chave técnica do pré-XML.'),
    check('tax-review', 'documento', 'Revisão tributária responsável', Boolean(context.taxReviewConfirmed && context.taxReformReviewConfirmed && context.matrixReady), 'Exige revisão fiscal, matriz aplicável e adequação dos campos vigentes antes de gerar XML.'),
    check('responsible', 'seguranca', 'Responsável pela homologação', Boolean(config.responsible || context.fiscalResponsible), config.responsible || context.fiscalResponsible || 'Identifique quem acompanhará o diagnóstico e as evidências.'),
    check('certificate-mode', 'seguranca', 'Tipo do certificado definido', config.certificate.mode !== 'Não definido', 'O certificado será utilizado somente pelo servidor; a chave privada nunca ficará disponível no navegador.'),
    check('certificate-reference', 'seguranca', 'Identificação do certificado', Boolean(config.certificate.secureReference), 'Informe somente o nome interno do certificado; nunca a senha, o arquivo PFX ou a chave privada.'),
    check('certificate-owner', 'seguranca', 'Titular do certificado confere', certificateDocumentMatches, certificateDocumentMatches ? 'O CNPJ informado corresponde ao emissor selecionado.' : 'O CNPJ do titular precisa corresponder ao estabelecimento emissor.'),
    check('certificate-validity', 'seguranca', 'Validade e conferência declaradas', validFutureDate(config.certificate.expiresAt, now) && config.certificate.chainValidated, 'A declaração prepara o piloto, mas não substitui inspeção X.509, raiz ICP-Brasil fixada e revogação no servidor.'),
    check('contingency', 'seguranca', 'Contingência revisada', config.contingencyReviewed, 'Para o piloto paulista, documente o acionamento e a reconciliação da SVC-AN.'),
    check('server-connector', 'conector', 'Conector server-side implementado', false, 'Pré-XML, XSD, XMLDSig, numeração, custódia A1, raízes ICP-Brasil, LCR, transportes mTLS, procNFe, DANFE A4, ciclo e orquestrador bloqueado já possuem implementação local; os ensaios sintéticos integral, de resiliência, rejeição e fila esgotada foram aprovados sem retransmissão. Ainda faltam o ensaio controlado com certificado real, a liberação revisada do executor, armazenamento fiscal durável e implantação formal.'),
  ];
  const prerequisiteChecks = checks.filter((item) => item.id !== 'server-connector');
  const blockers = checks.filter((item) => !item.ready).map((item) => item.detail);
  const localDiagnosticPassed = prerequisiteChecks.every((item) => item.ready);
  return {
    config,
    issuer,
    issuerSnapshot: snapshot,
    draft,
    checks,
    blockers: [...new Set(blockers)],
    localDiagnosticPassed,
    readyForConnectorDevelopment: localDiagnosticPassed,
    readyForExternalHomologation: false,
    externalTransmissionAllowed: false,
    endpoints: NFE_SP_HOMOLOGATION_ENDPOINTS,
  };
}

export function buildNfeSpHomologationExecutionPlan(value, context = {}) {
  const evaluation = evaluateNfeSpHomologationConfig(value, context);
  return {
    adapterId: NFE_SP_ADAPTER_ID,
    reference: NFE_SP_HOMOLOGATION_REFERENCE,
    environment: 'homologacao',
    authority: 'SEFAZ/SP',
    documentModel: '55',
    schemaVersion: '4.00',
    transport: 'SOAP 1.2 sobre TLS mútuo, exclusivamente no servidor',
    issuer: evaluation.issuerSnapshot,
    draftId: evaluation.draft?.id || '',
    transmissionEnabled: false,
    steps: [
      { id: 'status', label: 'Consultar status do serviço', state: 'lab', service: 'NfeStatusServico · transporte mTLS no runtime local · ensaio real pendente' },
      { id: 'preparation', label: 'Preparar tentativa idempotente', state: 'implemented', service: 'Candidato de série/número, cNF, pré-XML e chave calculados sem consumir numeração' },
      { id: 'xml', label: 'Gerar e validar XML 4.00', state: 'implemented', service: 'Pré-XML local · XSD PL_010e_v1.02' },
      { id: 'numbering', label: 'Reservar número fiscal', state: 'contract', service: 'Contrato transacional e índices de unicidade preparados · migração não aplicada' },
      { id: 'certificate', label: 'Validar certificado digital', state: 'contract', service: 'Validador A1 em memória implementado · certificado real ainda não instalado' },
      { id: 'signature', label: 'Assinar o XML', state: 'lab', service: 'Bancada XMLDSig efêmera · certificado ICP-Brasil pendente' },
      { id: 'authorization', label: 'Solicitar autorização', state: 'lab', service: 'NFeAutorizacao · lote síncrono e transporte mTLS no runtime local · fluxo desconectado' },
      { id: 'receipt', label: 'Consultar recibo e protocolo', state: 'lab', service: 'NFeRetAutorizacao / NfeConsultaProtocolo · transportes mTLS no runtime local · fila desconectada' },
      { id: 'lifecycle', label: 'Registrar ciclo e tentativas', state: 'contract', service: 'Estados, versão otimista, idempotência e eventos imutáveis preparados · repositório desativado' },
      { id: 'storage', label: 'Persistir XML processado e evidências', state: 'contract', service: 'procNFe, DANFE A4 e contrato de guarda imutável implementados · provedor e auditoria durável pendentes' },
    ],
  };
}
