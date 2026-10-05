import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type SealedMarketplaceSecret = {
  version: 1;
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  ciphertext: string;
};

function getEncryptionKey() {
  const configuredKey = process.env.MARKETPLACE_SECRETS_KEY;
  if (!configuredKey) throw new Error('MARKETPLACE_SECRETS_KEY não está configurada.');

  const key = Buffer.from(configuredKey, 'base64url');
  if (key.length !== 32) throw new Error('MARKETPLACE_SECRETS_KEY deve conter 32 bytes em base64url.');
  return key;
}

/** Mantém tokens OAuth fora do navegador e criptografados antes da persistência. */
export function sealMarketplaceSecret(value: string): SealedMarketplaceSecret {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);

  return {
    version: 1,
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  };
}

export function openMarketplaceSecret(sealed: SealedMarketplaceSecret) {
  if (sealed.version !== 1 || sealed.algorithm !== 'aes-256-gcm') throw new Error('Formato de segredo não suportado.');

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(sealed.iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(sealed.tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
