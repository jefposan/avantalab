const CODES = new Set(['HTTP_STATUS','ETIMEDOUT','ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','EHOSTUNREACH','CERT_HAS_EXPIRED','CERT_NOT_YET_VALID','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','ERR_TLS_CERT_ALTNAME_INVALID']);
/** Somente códigos de HTTP/Node; nunca mensagem, XML, URL privada ou credencial. */
export function nfeTransportDiagnostic(cause) {
  const code = CODES.has(cause?.code) ? cause.code : 'CONNECTION_FAILED';
  const httpStatus = Number.isInteger(cause?.httpStatus) && cause.httpStatus >= 100 && cause.httpStatus <= 599 ? cause.httpStatus : 0;
  return {transportErrorCode:code,httpStatus};
}
