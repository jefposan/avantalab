import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import * as tls from 'node:tls';
import { SEFAZ_SP_PUBLIC_LEAF, SEFAZ_SP_PUBLIC_INTERMEDIATE } from '../fixtures/nfe-sefaz-sp-tls/chain-publica.mjs';
import { NFE_SERVER_CA, ICP_BRASIL_SSL_ROOT, ICP_BRASIL_SSL_ROOT_SHA256 } from '../../app/vendas/lib/server/nfe-server-trust.mjs';
import { ICP_BRASIL_OFFICIAL_SIGNING_ROOTS } from '../../app/vendas/lib/server/icp-brasil-trust-anchors.mjs';

test('raiz SSL oficial complementa confiança padrão sem virar raiz de assinatura A1', () => {
  const root = new X509Certificate(ICP_BRASIL_SSL_ROOT);
  assert.equal(root.ca, true);
  assert.equal(root.verify(root.publicKey), true);
  assert.equal(root.fingerprint256.replaceAll(':',''), ICP_BRASIL_SSL_ROOT_SHA256);
  assert.ok(!ICP_BRASIL_OFFICIAL_SIGNING_ROOTS.some(item=>item.fingerprint256===ICP_BRASIL_SSL_ROOT_SHA256));
  const defaults = tls.getCACertificates?.('default') ?? tls.rootCertificates;
  for (const cert of defaults) assert.ok(NFE_SERVER_CA.includes(cert));
});

test('cadeia pública SP valida com raiz ITI e recusa hostname diferente ou raiz ausente', () => {
  const directory=mkdtempSync(join(tmpdir(),'avanta-tls-'));
  try {
    const root=join(directory,'root.pem');writeFileSync(root,ICP_BRASIL_SSL_ROOT);
    const intermediate=join(directory,'intermediate.pem'),leaf=join(directory,'leaf.pem');
    writeFileSync(intermediate,SEFAZ_SP_PUBLIC_INTERMEDIATE);writeFileSync(leaf,SEFAZ_SP_PUBLIC_LEAF);
    const base=['verify','-attime','1793923200','-untrusted',intermediate];
    const verify=args=>spawnSync('openssl',[...base,...args,leaf],{encoding:'utf8'});
    assert.equal(verify(['-CAfile',root,'-verify_hostname','homologacao.nfe.fazenda.sp.gov.br']).status,0);
    assert.notEqual(verify(['-CAfile',root,'-verify_hostname','outro.example.com']).status,0);
    assert.notEqual(verify(['-no-CAfile','-no-CApath','-verify_hostname','homologacao.nfe.fazenda.sp.gov.br']).status,0);
  } finally { rmSync(directory,{recursive:true,force:true}); }
});

test('todos os transportes fiscais mantêm validação TLS e usam a raiz oficial somente no cliente fiscal', () => {
  for (const name of ['authorization','return','status','cancellation']) {
    const source=readFileSync(`app/vendas/lib/server/nfe-a1-mtls-${name}-transport.mjs`,'utf8');
    assert.match(source,/rejectUnauthorized:\s*true/);
    assert.match(source,/ca:\s*NFE_SERVER_CA/);
    assert.match(source,/servername:\s*url.hostname/);
    assert.doesNotMatch(source,/rejectUnauthorized:\s*false|NODE_TLS_REJECT_UNAUTHORIZED|checkServerIdentity\s*:/);
  }
});
