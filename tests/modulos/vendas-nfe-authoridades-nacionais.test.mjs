import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NFE_AUTHORITIES,
  listNationalNfeUfs,
  isOfficialNfeEndpoint,
  resolveNationalNfeAuthority,
  resolveNationalNfeAuthorityByCode,
} from '../../app/vendas/lib/server/nfe-national-authorities.mjs';
import { createNfeStatusServiceAdapter } from '../../app/vendas/lib/server/nfe-status-service.mjs';
import { buildNfeAuthorizationSoapRequest } from '../../app/vendas/lib/server/nfe-authorization-service.mjs';

test('catálogo nacional cobre as 27 UFs para NF-e 4.00', () => {
  const ufs = listNationalNfeUfs();
  assert.equal(ufs.length, 27);
  assert.deepEqual(ufs.map((item) => item.uf), ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']);
  for (const item of ufs) {
    for (const environment of ['homologacao', 'producao']) {
      const authority = resolveNationalNfeAuthority({ uf: item.uf, environment });
      assert.ok(authority, `${item.uf}/${environment}`);
      assert.match(authority.endpoints.authorization, /^https:\/\//);
      assert.match(authority.endpoints.receipt, /^https:\/\//);
      assert.match(authority.endpoints.protocol, /^https:\/\//);
      assert.match(authority.endpoints.status, /^https:\/\//);
      assert.match(authority.endpoints.event, /^https:\/\//);
      assert.match(authority.endpoints.inutilization, /^https:\/\//);
      assert.equal(authority.environmentCode, environment === 'producao' ? '1' : '2');
    }
  }
});

test('seleciona autorizador próprio, SVAN ou SVRS segundo a UF emitente', () => {
  assert.equal(resolveNationalNfeAuthority({ uf: 'SP' }).authorityId, 'SP');
  assert.equal(resolveNationalNfeAuthority({ uf: 'MA' }).authorityId, 'SVAN');
  assert.equal(resolveNationalNfeAuthority({ uf: 'CE' }).authorityId, 'SVRS');
  assert.equal(resolveNationalNfeAuthority({ uf: 'RR' }).authorityId, 'SVRS');
  assert.equal(resolveNationalNfeAuthority({ uf: 'XX' }), null);
  assert.equal(resolveNationalNfeAuthority({ uf: 'SP', environment: 'desconhecido' }), null);
  assert.equal(resolveNationalNfeAuthorityByCode({ code: '35' }).issuerUf, 'SP');
  assert.equal(resolveNationalNfeAuthorityByCode({ code: '23' }).authorityId, 'SVRS');
  assert.equal(resolveNationalNfeAuthorityByCode({ code: '99' }), null);
});

test('aceita somente URLs fixadas no catálogo oficial da UF e ambiente', () => {
  const spProduction = resolveNationalNfeAuthority({ uf: 'SP', environment: 'producao' });
  assert.equal(isOfficialNfeEndpoint({ uf: 'SP', environment: 'producao', service: 'authorization', endpoint: spProduction.endpoints.authorization }), true);
  assert.equal(isOfficialNfeEndpoint({ uf: 'SP', environment: 'producao', service: 'authorization', endpoint: NFE_AUTHORITIES.SP.environments.homologacao.authorization }), false);
  assert.equal(isOfficialNfeEndpoint({ uf: 'SP', environment: 'producao', service: 'authorization', endpoint: 'https://example.invalid' }), false);
});

test('consulta de disponibilidade usa o autorizador da UF somente em homologação', async () => {
  const received = [];
  const adapter = createNfeStatusServiceAdapter({
    certificateAdapter: { async inspectBinding() { return { valid: true, readyForMutualTls: true, errors: [] }; } },
    transport: {
      configured: true,
      async postSoap(request) {
        received.push(request);
        return { body: '<?xml version="1.0"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><retConsStatServ versao="4.00"><tpAmb>2</tpAmb><cUF>23</cUF><cStat>107</cStat><xMotivo>Servico em Operacao</xMotivo><dhRecbto>2026-09-14T10:00:00-03:00</dhRecbto></retConsStatServ></soap12:Body></soap12:Envelope>' };
      },
    },
  });
  const result = await adapter.checkAvailability({ secureReference: 'vault://certificate/01234567-89ab-4def-8123-456789abcdef', expectedDocument: '12345678000195', expectedMode: 'production', issuerUf: 'CE' });
  assert.equal(result.valid, true);
  assert.equal(result.authority, 'SEFAZ Virtual Rio Grande do Sul');
  assert.equal(received.length, 1);
  assert.equal(received[0].endpoint, resolveNationalNfeAuthority({ uf: 'CE' }).endpoints.status);
  assert.match(received[0].body, /<tpAmb>2<\/tpAmb>/);
  assert.match(received[0].body, /<cUF>23<\/cUF>/);

  const production = await adapter.checkAvailability({ secureReference: 'vault://certificate/01234567-89ab-4def-8123-456789abcdef', expectedDocument: '12345678000195', expectedMode: 'production', issuerUf: 'CE', environment: 'producao' });
  assert.equal(production.networkAttempted, false);
  assert.ok(production.errors.some((entry) => entry.code === 'AV-NFE-STATUS-ENVIRONMENT-LOCK'));
});

test('autorização deriva o autorizador nacional da chave assinada', () => {
  const accessKey = '23' + '2609' + '12345678000195' + '55' + '001' + '000000001' + '1' + '12345678' + '0';
  assert.equal(accessKey.length, 44);
  const request = buildNfeAuthorizationSoapRequest({
    lotId: '123',
    signedXml: `<NFe><infNFe Id="NFe${accessKey}"><ide><cUF>23</cUF><tpAmb>2</tpAmb><mod>55</mod></ide></infNFe><Signature><SignatureValue>assinatura</SignatureValue></Signature></NFe>`,
  });
  assert.equal(request.valid, true);
  assert.equal(request.issuerUf, 'CE');
  assert.equal(request.endpoint, resolveNationalNfeAuthority({ uf: 'CE' }).endpoints.authorization);
  assert.match(request.envelope, /NFeAutorizacao4/);
});
