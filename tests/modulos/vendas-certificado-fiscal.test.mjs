import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createNfeCertificateActivationService } from '../../app/vendas/lib/server/nfe-certificate-activation-service.mjs';
import {
  createFiscalCertificateActivateRequest,
  parseFiscalCertificateActivateResponse,
} from '../../app/vendas/lib/fiscal-status-bridge.mjs';

test('certificado A1 atravessa somente a rota autenticada e o handler protegido', async () => {
  const [bridge, route, handler] = await Promise.all([
    readFile('app/vendas/VendasIntegrado.tsx', 'utf8'),
    readFile('app/api/modulos/vendas/fiscal/certificate/route.ts', 'utf8'),
    readFile('app/vendas/lib/server/nfe-certificate-installation-http.mjs', 'utf8'),
  ]);
  assert.match(bridge, /AVANTALAB_VENDAS_FISCAL_CERTIFICATE_INSTALL_REQUEST_V1/);
  assert.match(bridge, /new FormData\(\)/);
  assert.match(bridge, /Authorization: `Bearer \$\{token\}`/);
  assert.match(bridge, /event\.ports\[0\]/);
  assert.doesNotMatch(bridge, /localStorage[^\n]*(?:certificate|passphrase|senha)/i);
  assert.match(route, /handleNfeCertificateInstallationRequest/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /handleNfeCertificateActivationRequest/);
  assert.match(handler, /certificate instanceof File/);
  assert.match(handler, /NFE_A1_MAX_PKCS12_BYTES/);
  assert.match(handler, /secureTransport/);
  assert.doesNotMatch(route, /console\.(?:log|error)|service_role|FISCAL_CERTIFICATE_MASTER_KEY/);
});

test('revalidação reutiliza o certificado protegido e devolve somente diagnóstico público', async () => {
  const companyId = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
  const actorId = '16978fc9-125f-4aa8-a14e-275b4c4ca14d';
  const certificateId = '48a4ca59-acde-4da2-9019-3ca62254033d';
  let recorded = null;
  const repository = {
    async getPendingBinding() {
      return {
        certificateId,
        secureReference: `fiscal-certificate:${companyId}:${certificateId}`,
        expectedMode: 'Certificado A1',
        summary: { id: certificateId, status: 'pending_validation' },
      };
    },
    async activate() { throw new Error('não deve ativar um certificado bloqueado'); },
    async recordValidation(input) {
      recorded = input;
      return { summary: { id: certificateId, status: 'pending_validation', validationCheckedAt: input.evidence.checkedAt, blockers: input.evidence.blockers } };
    },
  };
  const service = createNfeCertificateActivationService({
    repository,
    issuerResolver: async () => ({ document: '12345678000195' }),
    certificateAdapter: {
      inspectBinding: async () => ({
        valid: false,
        realCertificateInspected: true,
        readyForXmlSignature: true,
        readyForMutualTls: true,
        ownerVerified: true,
        validityVerified: true,
        keyUsageVerified: true,
        chainVerified: true,
        rootPinned: true,
        revocationVerified: false,
        signingAvailable: true,
        mutualTlsAvailable: true,
        errors: [{ code: 'AV-NFE-CERT-REVOCATION' }],
      }),
    },
    now: () => new Date('2026-09-07T12:00:00.000Z'),
  });
  const result = await service.activate({ context: { companyId, actorId, moduleId: 'vendas', active: true, moduleActive: true, effectivePermissions: { 'fiscal.configure': true } } });
  assert.equal(result.ok, true);
  assert.equal(result.result.certificateInstalled, true);
  assert.equal(result.result.certificateActive, false);
  assert.deepEqual(result.result.blockers, ['AV-NFE-CERT-REVOCATION']);
  assert.equal(recorded.certificateId, certificateId);
  assert.equal(recorded.evidence.checkedAt, '2026-09-07T12:00:00.000Z');
  assert.equal('pkcs12' in recorded || 'passphrase' in recorded, false);
});

test('ponte de revalidação rejeita segredos e normaliza somente bloqueios públicos', () => {
  const request = createFiscalCertificateActivateRequest({ requestId: 'certificate-activate:12345678' });
  assert.deepEqual(request, {
    type: 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_ACTIVATE_REQUEST_V1',
    requestId: 'certificate-activate:12345678',
  });
  assert.equal('certificate' in request || 'passphrase' in request, false);
  const response = parseFiscalCertificateActivateResponse({
    type: 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_ACTIVATE_RESPONSE_V1',
    requestId: request.requestId,
    ok: true,
    certificate: {
      status: 'pending_validation',
      certificateInstalled: true,
      certificateActive: false,
      validationChecked: true,
      validationCheckedAt: '2026-09-07T12:00:00.000Z',
      blockers: ['AV-NFE-CERT-REVOCATION', 'conteúdo privado'],
      sensitiveMaterialReturned: false,
    },
  });
  assert.deepEqual(response.certificate.blockers, ['AV-NFE-CERT-REVOCATION']);
});

test('interface oferece revalidação sem reabrir automaticamente o formulário de arquivo', async () => {
  const source = await readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
  assert.match(source, /Verificar novamente/);
  assert.match(source, /companyRegistration\.ready && !certificateInstalled/);
  assert.match(source, /createFiscalCertificateActivateRequest/);
  assert.match(source, /parseFiscalCertificateActivateResponse/);
});

test('certificado ativo alimenta a prontidão fiscal sem simular conexão com o autorizador', async () => {
  const source = await readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
  assert.match(source, /certificateValid: certificate\?\.certificateActive === true/);
  assert.match(source, /providerConnected: certificate\?\.fiscalConnectionAvailable === true/);
  assert.match(source, /fiscalConfigForIssuer\(moduleSettings, issuer, fiscalCertificateBridgeState\.certificate\)/);
  assert.match(source, /Certificado fiscal ativo/);
  assert.match(source, /Conexão segura ainda não confirmada/);
  assert.doesNotMatch(source, /<strong>Fiscal não conectado<\/strong><small>Produção bloqueada com segurança<\/small>/);
});

test('inicialização fiscal local recupera a mesma chave do cofre e nunca cria chave aleatória', async () => {
  const [runner, packageSource] = await Promise.all([
    readFile('scripts/iniciar-vendas-fiscal-local.mjs', 'utf8'),
    readFile('package.json', 'utf8'),
  ]);
  assert.match(packageSource, /"dev:vendas-fiscal":\s*"node scripts\/iniciar-vendas-fiscal-local\.mjs"/);
  assert.match(runner, /find-generic-password/);
  assert.match(runner, /FISCAL_CERTIFICATE_MASTER_KEY: fiscalCertificateMasterKey/);
  assert.match(runner, /repository\.load\(binding\.secureReference\)/);
  assert.match(runner, /material\.pkcs12\.fill\(0\)/);
  assert.doesNotMatch(runner, /randomBytes|createCipher|console\.log\(fiscalCertificateMasterKey/);
});

test('preparação do banco local inclui custódia e revisões fiscais imutáveis', async () => {
  const source = await readFile('scripts/preparar-vendas-ui-lab.mjs', 'utf8');
  assert.match(source, /0006_fiscal_certificates_NOT_APPLIED\.sql/);
  assert.match(source, /0007_fiscal_certificate_activation_NOT_APPLIED\.sql/);
  assert.match(source, /0008_fiscal_artifact_revisions_NOT_APPLIED\.sql/);
  assert.match(source, /0009_fiscal_rejection_corrections_NOT_APPLIED\.sql/);
});

test('runtime fiscal usa as âncoras ICP-Brasil oficiais sem expor configuração na tela', async () => {
  const [runtime, interfaceSource, crlChecker, vault] = await Promise.all([
    readFile('app/vendas/lib/server/fiscal-status-runtime.mjs', 'utf8'),
    readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8'),
    readFile('app/vendas/lib/server/icp-brasil-crl-checker.mjs', 'utf8'),
    readFile('app/vendas/lib/server/nfe-certificate-vault.mjs', 'utf8'),
  ]);
  assert.match(runtime, /resolveIcpBrasilTrustedRootFingerprints/);
  assert.match(runtime, /createIcpBrasilCrlRevocationChecker/);
  assert.match(runtime, /createIcpBrasilChainResolver/);
  assert.match(runtime, /createCommercialNfeSigningService/);
  assert.match(runtime, /createNfeCertificateSecretLoader/);
  assert.match(runtime, /getActiveBinding/);
  assert.match(runtime, /createLocalFiscalArtifactStorage/);
  assert.match(runtime, /createNfeA1MtlsStatusTransport/);
  assert.match(runtime, /createNfeA1MtlsAuthorizationTransport/);
  assert.match(runtime, /createNfeA1MtlsReturnTransport/);
  assert.match(runtime, /createNfeStatusServiceAdapter/);
  assert.match(runtime, /createNfeAuthorizationAdapter/);
  assert.match(runtime, /createNfeReturnAdapter/);
  assert.match(runtime, /createNfeIssuanceOrchestrator/);
  assert.match(runtime, /createCommercialNfeAutomaticIssuanceService/);
  assert.match(runtime, /createCommercialNfeSubmissionService/);
  assert.match(runtime, /createCommercialNfeRejectionCorrectionService/);
  assert.match(runtime, /createPostgresCommercialNfeRejectionCorrectionRepository/);
  assert.match(runtime, /createFiscalArtifactRecoveryHandlers/);
  assert.match(runtime, /createFiscalRecoveryWorker/);
  assert.match(runtime, /nfeStatusServiceAdapter/);
  assert.match(runtime, /nfeAuthorizationAdapter/);
  assert.match(runtime, /nfeReturnAdapter/);
  assert.match(runtime, /nfeIssuanceOrchestrator/);
  assert.match(runtime, /nfeRejectionCorrectionService/);
  assert.match(runtime, /availabilityService: nfeStatusServiceAdapter/);
  assert.match(runtime, /nfeAutomaticIssuanceService: null/);
  assert.match(crlChecker, /fromBER\(der,\s*\{/);
  assert.match(crlChecker, /maxNodes: MAX_ASN1_NODES/);
  assert.match(crlChecker, /asn1\.offset !== der\.byteLength/);
  assert.doesNotMatch(crlChecker, /CertificateRevocationList\.fromBER\(crlDer\(body\)\)/);
  assert.match(vault, /checkedAt\.getTime\(\) <= now\.getTime\(\) \+ REVOCATION_CLOCK_SKEW_MS/);
  assert.match(interfaceSource, /A conexão fiscal será confirmada automaticamente ao emitir/);
  assert.doesNotMatch(interfaceSource, /FISCAL_ICP_BRASIL_TRUSTED_ROOT_FINGERPRINTS|âncora de confiança|fingerprint da raiz|pacote oficial.*ICP-Brasil|SHA-512/i);
});

test('ensaio integral do orquestrador é local, repetível e sem rede externa', async () => {
  const [script, packageSource] = await Promise.all([
    readFile('app/vendas/scripts/verificar-orquestrador-nfe-local.mjs', 'utf8'),
    readFile('package.json', 'utf8'),
  ]);
  assert.match(packageSource, /"fiscal:orchestrator:verify":\s*"node app\/vendas\/scripts\/verificar-orquestrador-nfe-local\.mjs"/);
  assert.match(script, /createNfeIssuanceOrchestrator/);
  assert.match(script, /createCommercialNfeAutomaticIssuanceService/);
  assert.match(script, /createCommercialNfeSubmissionService/);
  assert.match(script, /createFiscalArtifactRecoveryHandlers/);
  assert.match(script, /createFiscalRecoveryWorker/);
  assert.match(script, /createLocalFiscalArtifactStorage/);
  assert.match(script, /externalNetworkCalls:\s*0/);
  assert.match(script, /realCertificateUsed:\s*false/);
  assert.match(script, /await rm\(rootDirectory,\s*\{ recursive: true, force: true \}\)/);
  assert.doesNotMatch(script, /from ['"]node:https['"]|\bfetch\s*\(|https:\/\/www\.nfe\.fazenda\.gov\.br/i);
});

test('ensaio de resiliência reconcilia timeout e recibo sem retransmissão', async () => {
  const [script, packageSource] = await Promise.all([
    readFile('app/vendas/scripts/verificar-resiliencia-orquestrador-nfe-local.mjs', 'utf8'),
    readFile('package.json', 'utf8'),
  ]);
  assert.match(packageSource, /"fiscal:orchestrator:resilience":\s*"node app\/vendas\/scripts\/verificar-resiliencia-orquestrador-nfe-local\.mjs"/);
  assert.match(script, /timeout sintético depois do registro do envio/);
  assert.match(script, /<cStat>103<\/cStat>/);
  assert.match(script, /<cStat>105<\/cStat>/);
  assert.match(script, /<cStat>204<\/cStat>/);
  assert.match(script, /<cStat>778<\/cStat>/);
  assert.match(script, /attempt <= 8/);
  assert.match(script, /queueState/);
  assert.match(script, /recommendedAction/);
  assert.match(script, /retransmissions:\s*0/);
  assert.match(script, /externalNetworkCalls:\s*0/);
  assert.match(script, /realCertificateUsed:\s*false/);
  assert.doesNotMatch(script, /from ['"]node:https['"]|\bfetch\s*\(/i);
});
