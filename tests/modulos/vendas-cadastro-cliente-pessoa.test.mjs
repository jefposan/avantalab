import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { normalizeCommercialCustomerInput } from '../../app/vendas/lib/server/commercial-customer-service.mjs';

test('cadastro de pessoa física não persiste inscrições nem situação estadual', () => {
  const { normalized } = normalizeCommercialCustomerInput({
    documentType: 'cpf',
    document: '529.982.247-25',
    stateRegistration: '123.456.789.012',
    municipalRegistration: '987654',
    stateRegistrationIndicator: 'contribuinte_icms',
  });

  assert.equal(normalized.personType, 'fisica');
  assert.equal(normalized.documentType, 'cpf');
  assert.equal(normalized.stateRegistration, '');
  assert.equal(normalized.municipalRegistration, '');
  assert.equal(normalized.stateRegistrationIndicator, 'nao_contribuinte');
});

test('formulário pede tipo de pessoa antes do documento e esconde campos empresariais para CPF', async () => {
  const source = await readFile(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../../app/vendas/sistema/vendas.css', import.meta.url), 'utf8');
  const formStart = source.indexOf('function ClientFormDialog');
  const formEnd = source.indexOf('function SupplierFormDialog', formStart);
  const form = source.slice(formStart, formEnd);

  assert.ok(form.indexOf('Tipo de pessoa *</span>') < form.indexOf("{isIndividual ? 'CPF' : 'CNPJ'} *"));
  assert.match(form, /client-profile-picker/);
  assert.match(form, /aria-haspopup="listbox"/);
  assert.match(form, /className="client-profile-options"/);
  assert.match(styles, /\.client-profile-options \{ position: absolute; z-index: 12; top: calc\(100% \+ 6px\)/);
  assert.match(form, /!isIndividual && <label className="field"><span>Situação da inscrição estadual/);
  assert.match(form, /!isIndividual && <label className="field client-state-registration"><span>Inscrição estadual/);
  assert.match(form, /!isIndividual && <label className="field client-municipal-registration"><span>Inscrição municipal/);
  assert.match(form, /stateRegistration: profile === 'Pessoa física' \? ''/);
  assert.match(form, /municipalRegistration: profile === 'Pessoa física' \? ''/);
  assert.match(form, /client-individual-name/);
  assert.match(form, /client-consumer-final/);
  assert.match(form, /form-grid\$\{!isIndividual \? ' client-fiscal-grid' : ''\}/);
  assert.match(form, /client-state-registration/);
  assert.match(form, /client-municipal-registration/);
  assert.match(form, /Nome fantasia<\/span>/);
  assert.doesNotMatch(form, /Nome fantasia \*/);
  assert.match(form, /!isIndividual && <label className="field"><span>Contato principal/);
  assert.match(form, /contactName: isIndividual \? form\.legalName\.trim\(\) : form\.contactName\.trim\(\)/);
  assert.match(form, /className=\{`field\$\{isIndividual \? '' : ' field-wide'\}`\}/);
  assert.match(form, /className="form-grid client-address-grid"/);
  assert.match(form, /client-address-district/);
  assert.match(form, /client-address-city/);
  assert.match(form, /client-address-state/);
  assert.match(form, /!municipalityIsResolved\(form\.cityCode\) &&/);
  assert.match(form, /className="form-grid client-commercial-grid"/);
  assert.doesNotMatch(form, /lookup-notice/);
  assert.match(styles, /\.client-address-grid > \.client-address-district, \.client-address-grid > \.client-address-city \{ grid-column: span 5; \}/);
  assert.match(styles, /\.client-address-grid > \.client-address-state \{ grid-column: span 2; \}/);
  assert.match(styles, /\.client-commercial-grid > \.client-commercial-status \{ grid-column: span 3; \}/);
  assert.match(styles, /\.client-fiscal-grid > \.client-consumer-final \{ grid-column: span 2; width: auto; \}/);
  assert.match(styles, /\.client-fiscal-grid > \.client-state-registration, \.client-fiscal-grid > \.client-municipal-registration \{ grid-column: span 5; \}/);
});
