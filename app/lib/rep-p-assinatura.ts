import 'server-only';
import forge from 'node-forge';

type DiagnosticoCertificado = {
  situacao: 'valido' | 'vencido' | 'ainda_nao_valido' | 'invalido';
  validoAte?: string;
};

export type MetadadosCertificadoRepP = {
  validadeInicio: string;
  validadeFim: string;
  impressaoSha256: string;
};

export type EstadoAssinaturaRepP = {
  modo: 'homologacao' | 'producao';
  certificadoConfigurado: boolean;
  senhaConfigurada: boolean;
  emissaoLegalPermitida: false;
  situacao: 'nao_configurado' | 'homologacao' | 'certificado_invalido' | 'certificado_vencido' | 'aguardando_validacao';
  validadeCertificado?: string;
  mensagem: string;
};

export function diagnosticarCertificadoA1(arquivo: Buffer, senha: string): DiagnosticoCertificado {
  try {
    if (arquivo.length === 0) return { situacao: 'invalido' };
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(arquivo.toString('binary')));
    const pacote = forge.pkcs12.pkcs12FromAsn1(asn1, false, senha);
    const bolsas = pacote.getBags({ bagType: forge.pki.oids.certBag });
    const certificado = bolsas[forge.pki.oids.certBag]?.find((bolsa) => Boolean(bolsa.cert))?.cert;
    if (!certificado) return { situacao: 'invalido' };

    const agora = new Date();
    const validoAte = certificado.validity.notAfter.toISOString();
    if (certificado.validity.notAfter < agora) return { situacao: 'vencido', validoAte };
    if (certificado.validity.notBefore > agora) return { situacao: 'ainda_nao_valido', validoAte };
    return { situacao: 'valido', validoAte };
  } catch {
    return { situacao: 'invalido' };
  }
}

export function lerMetadadosCertificadoA1(arquivo: Buffer, senha: string): MetadadosCertificadoRepP | null {
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(arquivo.toString('binary')));
    const pacote = forge.pkcs12.pkcs12FromAsn1(asn1, false, senha);
    const bolsas = pacote.getBags({ bagType: forge.pki.oids.certBag });
    const certificado = bolsas[forge.pki.oids.certBag]?.find((bolsa) => Boolean(bolsa.cert))?.cert;
    if (!certificado) return null;
    return {
      validadeInicio: certificado.validity.notBefore.toISOString(),
      validadeFim: certificado.validity.notAfter.toISOString(),
      impressaoSha256: '',
    };
  } catch { return null; }
}

/**
 * Lê somente a presença dos segredos da assinatura. O certificado e a senha
 * nunca são enviados ao navegador, gravados no banco ou registrados em logs.
 */
export function obterEstadoAssinaturaRepP(): EstadoAssinaturaRepP {
  const modo = process.env.REP_P_ASSINATURA_MODO === 'producao' ? 'producao' : 'homologacao';
  const certificadoConfigurado = Boolean(process.env.REP_P_CERTIFICADO_A1_BASE64?.trim());
  const senhaConfigurada = Boolean(process.env.REP_P_CERTIFICADO_A1_SENHA?.trim());

  if (!certificadoConfigurado || !senhaConfigurada) {
    return {
      modo,
      certificadoConfigurado,
      senhaConfigurada,
      emissaoLegalPermitida: false,
      situacao: 'nao_configurado',
      mensagem: 'Certificado A1 ainda não configurado nos segredos do servidor.',
    };
  }

  const diagnostico = diagnosticarCertificadoA1(Buffer.from(process.env.REP_P_CERTIFICADO_A1_BASE64!.replace(/\s/g, ''), 'base64'), process.env.REP_P_CERTIFICADO_A1_SENHA!);

  if (diagnostico.situacao === 'invalido') {
    return {
      modo,
      certificadoConfigurado,
      senhaConfigurada,
      emissaoLegalPermitida: false,
      situacao: 'certificado_invalido',
      mensagem: 'Não foi possível validar o arquivo A1 ou a senha. A emissão legal permanece bloqueada.',
    };
  }

  if (diagnostico.situacao === 'vencido') {
    return {
      modo,
      certificadoConfigurado,
      senhaConfigurada,
      emissaoLegalPermitida: false,
      situacao: modo === 'homologacao' ? 'homologacao' : 'certificado_vencido',
      validadeCertificado: diagnostico.validoAte,
      mensagem: modo === 'homologacao'
        ? 'Certificado vencido lido em homologação. Ele serve apenas para testes; a emissão legal permanece bloqueada.'
        : 'Certificado vencido. A emissão legal está bloqueada até a substituição por um certificado ICP-Brasil válido.',
    };
  }

  if (diagnostico.situacao === 'ainda_nao_valido') {
    return {
      modo,
      certificadoConfigurado,
      senhaConfigurada,
      emissaoLegalPermitida: false,
      validadeCertificado: diagnostico.validoAte,
      situacao: 'certificado_invalido',
      mensagem: 'O certificado ainda não está vigente. A emissão legal permanece bloqueada.',
    };
  }

  if (modo === 'homologacao') {
    return {
      modo,
      certificadoConfigurado,
      senhaConfigurada,
      emissaoLegalPermitida: false,
      situacao: 'homologacao',
      validadeCertificado: diagnostico.validoAte,
      mensagem: 'Homologação ativa: a emissão de documentos legais permanece bloqueada.',
    };
  }

  return {
    modo,
    certificadoConfigurado,
    senhaConfigurada,
    emissaoLegalPermitida: false,
    situacao: 'aguardando_validacao',
    validadeCertificado: diagnostico.validoAte,
    mensagem: 'Certificado configurado, aguardando validação criptográfica antes da emissão legal.',
  };
}

export function exigirEmissaoLegalRepP(): never {
  throw new Error('A emissão legal do REP-P está bloqueada até a validação criptográfica de um certificado ICP-Brasil válido.');
}
