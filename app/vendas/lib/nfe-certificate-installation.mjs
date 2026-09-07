export const NFE_CERTIFICATE_INSTALLATION_REFERENCE = '2026-08-31';

export const NFE_CERTIFICATE_INSTALLATION_REQUIREMENTS = Object.freeze([
  Object.freeze({ id: 'authentication', label: 'Sessão autenticada', detail: 'Confirmar usuário, empresa ativa e validade da sessão no servidor.' }),
  Object.freeze({ id: 'authorization', label: 'Permissão administrativa', detail: 'Exigir Gestor ou Administrador com permissão fiscal efetiva.' }),
  Object.freeze({ id: 'secure-transport', label: 'Conexão protegida', detail: 'Receber o formulário somente por HTTPS e bloquear origens não autorizadas.' }),
  Object.freeze({ id: 'server-importer', label: 'Importação no servidor', detail: 'Processar arquivo e senha fora do JavaScript da página e sem criar cópias temporárias.' }),
  Object.freeze({ id: 'protected-storage', label: 'Armazenamento protegido', detail: 'Guardar o certificado cifrado e manter a chave privada indisponível ao navegador.' }),
  Object.freeze({ id: 'audit', label: 'Auditoria sem segredos', detail: 'Registrar responsável, horário e resultado, nunca senha, PFX ou chave privada.' }),
]);

const REQUIREMENT_KEYS = Object.freeze({
  authentication: 'authenticated',
  authorization: 'authorized',
  'secure-transport': 'secureTransport',
  'server-importer': 'serverImporterConfigured',
  'protected-storage': 'protectedStorageConfigured',
  audit: 'auditConfigured',
});

export function evaluateNfeCertificateInstallationReadiness(value = {}) {
  const checks = NFE_CERTIFICATE_INSTALLATION_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    ready: value?.[REQUIREMENT_KEYS[requirement.id]] === true,
  }));
  const readyCount = checks.filter((item) => item.ready).length;
  const infrastructureReady = readyCount === checks.length;
  return {
    reference: NFE_CERTIFICATE_INSTALLATION_REFERENCE,
    checks,
    readyCount,
    totalCount: checks.length,
    infrastructureReady,
    canRenderSensitiveForm: infrastructureReady,
    canAcceptCertificate: infrastructureReady,
    passwordPersistenceAllowed: false,
    browserStorageAllowed: false,
    clientSidePkcs12ParsingAllowed: false,
    currentStatus: infrastructureReady ? 'Pronto para integração formal' : 'Bloqueado neste protótipo',
  };
}
