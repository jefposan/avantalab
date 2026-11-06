/** Resultado usa somente estados confirmados e documentos devolvidos pelo servidor. */
export function fiscalNoteResult(status, fallbackState = '') {
  const state = status?.state || fallbackState;
  const authorized = ['authorized', 'artifacts_stored', 'danfe_ready'].includes(state) && Boolean(status?.protocolNumber);
  const canceled = state === 'canceled';
  const rejected = ['rejected', 'failed'].includes(state);
  const retryAvailable = state === 'signed' && status?.statusCode === '217' && !status?.protocolNumber && !status?.authorizedAt;
  const pending = ['submitted', 'processing'].includes(state);
  const artifacts = authorized || canceled ? status?.artifacts || [] : [];
  return {
    authorized, canceled, rejected, pending, retryAvailable,
    tone: canceled || rejected ? 'danger' : authorized ? 'success' : 'info',
    title: retryAvailable ? 'Envio não recebido pela SEFAZ' : canceled ? 'Nota fiscal cancelada' : authorized ? 'Nota fiscal autorizada com sucesso' : rejected ? 'A nota não foi autorizada' : pending ? 'Envio sem confirmação de autorização' : 'Situação da nota fiscal',
    description: retryAvailable ? 'A SEFAZ não localizou esta nota. A série, o número e o XML foram preservados. Confira os dados para tentar o envio novamente.' : canceled ? 'O evento e a autorização original permanecem no histórico.' : authorized ? status.environment === 'homologacao' ? 'Homologação · sem valor fiscal.' : 'Autorização confirmada pela SEFAZ.' : rejected ? status?.statusReason || 'Revise o retorno fiscal antes de continuar.' : pending ? `A comunicação não confirmou o resultado. Consulte esta mesma nota antes de reenviar.${status?.consultationErrorCode ? ` Referência: ${status.consultationErrorCode}.` : ''}` : 'Consulte o estado atualizado para continuar.',
    xml: artifacts.find(artifact => artifact.available && artifact.artifactType === 'processed_xml'),
    danfe: artifacts.find(artifact => artifact.available && artifact.artifactType === 'danfe_pdf'),
  };
}

/** Fluxo ordinário paulista do piloto; procedimentos extemporâneos são separados. */
export function nfeStandardCancellationAvailability(status, now = Date.now()) {
  if (!['authorized', 'artifacts_stored', 'danfe_ready'].includes(status?.state)) return { allowed: false, reason: 'A nota precisa estar autorizada e sem cancelamento.' };
  if (!String(status?.accessKey || '').startsWith('35')) return { allowed: false, reason: 'O cancelamento deste autorizador não está disponível neste fluxo.' };
  const authorizedAt = Date.parse(status?.authorizedAt || '');
  const elapsed = Number(now) - authorizedAt;
  if (!Number.isFinite(elapsed) || elapsed < 0) return { allowed: false, reason: 'Consulte a autorização antes de solicitar o cancelamento.' };
  if (elapsed > 24 * 60 * 60 * 1000) return { allowed: false, reason: 'Prazo ordinário de 24 horas encerrado. O cancelamento fora do prazo exige o procedimento fiscal aplicável.' };
  return { allowed: true, reason: '' };
}

/** Página pública conferida no menu Serviços do Portal Nacional, em ambos os ambientes. */
export function nfePublicConsultationUrl(environment) {
  const host = environment === 'homologacao' ? 'hom.nfe.fazenda.gov.br' : environment === 'producao' ? 'www.nfe.fazenda.gov.br' : '';
  return host ? `https://${host}/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ%2BgAVw2g%3D` : '';
}
