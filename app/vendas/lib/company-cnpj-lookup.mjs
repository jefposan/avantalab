// Usa exclusivamente a Central de Consultas do AvantaLab; não consulta exemplos locais.
export async function lookupCompanyCnpj(document, { fetcher = fetch, signal } = {}) {
  const digits = String(document).replace(/\D/g, '');
  if (digits.length !== 14) throw new Error('Informe os 14 dígitos do CNPJ.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 12000);
  try {
    const response = await fetcher('/api/consultas/cnpj', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj: digits }), cache: 'no-store', signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success || !payload.data) {
      throw new Error(payload?.error?.message || 'Não foi possível consultar o CNPJ. Tente novamente.');
    }
    const company = payload.data;
    if (company.documento !== digits) throw new Error('A consulta retornou outro CNPJ. Confira o documento e tente novamente.');
    const address = company.endereco ?? {};
    const optional = (value) => typeof value === 'string' && value.trim() ? value.trim() : undefined;
    const state = optional(address.uf)?.toUpperCase();
    const phone = company.contatos?.telefones?.[0];
    let cityCode;
    const cepDigits = String(address.cep ?? '').replace(/\D/g, '');
    if (cepDigits.length === 8) {
      try {
        const responseCep = await fetcher(`/api/cep?cep=${cepDigits}`, { cache: 'no-store', signal: controller.signal });
        const payloadCep = await responseCep.json().catch(() => null);
        if (responseCep.ok && /^\d{7}$/.test(String(payloadCep?.codigoIbge ?? ''))) cityCode = String(payloadCep.codigoIbge);
      } catch { /* Falha no complemento de CEP não descarta os dados do CNPJ. */ }
    }
    if (controller.signal.aborted) throw new Error('Consulta interrompida.');
    return {
      document: digits, legalName: optional(company.razaoSocial),
      tradeName: optional(company.nomeFantasia),
      stateRegistration: optional(company.inscricoesEstaduais?.find((item) => item.ativa === true && item.uf?.toUpperCase() === state)?.inscricao),
      email: optional(company.contatos?.emails?.[0]?.endereco),
      phone: phone ? optional(`${phone.ddd ?? ''}${phone.numero ?? ''}`) : undefined,
      cep: optional(address.cep), street: optional(address.logradouro), number: optional(address.numero),
      complement: optional(address.complemento), district: optional(address.bairro),
      cityName: optional(address.cidade), state, cityCode,
    };
  } catch (error) {
    if (controller.signal.aborted) throw new Error('A consulta foi interrompida ou demorou demais. Tente novamente.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
