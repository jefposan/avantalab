import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function chaveMestra() {
  const valor = process.env.REP_P_COFRE_CHAVE_BASE64?.trim();
  if (!valor) throw new Error('A chave mestra do cofre REP-P não foi configurada.');
  const chave = Buffer.from(valor, 'base64');
  if (chave.length !== 32) throw new Error('A chave mestra do cofre REP-P deve ter 32 bytes em Base64.');
  return chave;
}

export function criptografarSegredoRepP(valor: Buffer) {
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', chaveMestra(), iv);
  const conteudo = Buffer.concat([cifra.update(valor), cifra.final()]);
  return [iv.toString('base64'), cifra.getAuthTag().toString('base64'), conteudo.toString('base64')].join('.');
}

export function descriptografarSegredoRepP(valor: string) {
  const [ivBase64, tagBase64, conteudoBase64] = valor.split('.');
  if (!ivBase64 || !tagBase64 || !conteudoBase64) throw new Error('Segredo REP-P armazenado em formato inválido.');
  const decifra = createDecipheriv('aes-256-gcm', chaveMestra(), Buffer.from(ivBase64, 'base64'));
  decifra.setAuthTag(Buffer.from(tagBase64, 'base64'));
  return Buffer.concat([decifra.update(Buffer.from(conteudoBase64, 'base64')), decifra.final()]);
}

export function impressaoCertificadoRepP(arquivo: Buffer) {
  return createHash('sha256').update(arquivo).digest('hex');
}
