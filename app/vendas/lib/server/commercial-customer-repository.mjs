export const COMMERCIAL_CUSTOMER_REPOSITORY_REFERENCE = '2026-09-03';

const RETRYABLE_TRANSACTION_CODES = new Set(['40001', '40P01']);

function assertPool(pool) {
  if (!pool || (typeof pool.connect !== 'function' && typeof pool.query !== 'function')) {
    throw new TypeError('Informe um pool PostgreSQL disponível somente no servidor.');
  }
}

function text(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function nullable(value) {
  return text(value) || null;
}

function digits(value) {
  return text(value).replace(/\D/g, '');
}

function timestamp(value) {
  return value ? text(value) : '';
}

function mapCustomer(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.empresa_id,
    code: Number(row.codigo),
    personType: row.tipo_pessoa,
    documentType: row.documento_tipo,
    document: row.documento,
    legalName: row.razao_social,
    tradeName: row.nome_fantasia || '',
    displayName: row.nome_exibicao,
    stateRegistration: row.inscricao_estadual || '',
    municipalRegistration: row.inscricao_municipal || '',
    stateRegistrationIndicator: row.indicador_ie,
    email: row.email || '',
    phone: row.telefone || '',
    primaryContact: row.contato_principal || '',
    postalCode: row.cep || '',
    street: row.logradouro || '',
    number: row.numero || '',
    complement: row.complemento || '',
    district: row.bairro || '',
    city: row.municipio || '',
    cityCode: row.municipio_ibge || '',
    state: row.uf || '',
    sellerId: row.vendedor_id || '',
    paymentTerms: row.condicao_pagamento || '',
    notes: row.observacoes || '',
    status: row.situacao,
    version: Number(row.versao),
    createdBy: row.criado_por || '',
    updatedBy: row.atualizado_por || '',
    createdAt: timestamp(row.criado_em),
    updatedAt: timestamp(row.atualizado_em),
  };
}

function customerValues(customer) {
  return [
    customer.companyId, customer.personType, customer.documentType, customer.document,
    customer.legalName, nullable(customer.tradeName), customer.displayName,
    nullable(customer.stateRegistration), nullable(customer.municipalRegistration),
    customer.stateRegistrationIndicator, nullable(customer.email), nullable(customer.phone),
    nullable(customer.primaryContact), nullable(customer.postalCode), nullable(customer.street),
    nullable(customer.number), nullable(customer.complement), nullable(customer.district),
    nullable(customer.city), nullable(customer.cityCode), nullable(customer.state),
    nullable(customer.sellerId), nullable(customer.paymentTerms), nullable(customer.notes),
    customer.status, customer.actorId,
  ];
}

async function withClient(pool, work) {
  const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
  try {
    return await work(client);
  } finally {
    if (client !== pool && typeof client.release === 'function') client.release();
  }
}

async function runSerializable(pool, work, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
    try {
      await client.query('begin');
      await client.query('set transaction isolation level serializable');
      const result = await work(client);
      await client.query('commit');
      return result;
    } catch (cause) {
      try { await client.query('rollback'); } catch {}
      if (!RETRYABLE_TRANSACTION_CODES.has(cause?.code) || attempt === maxRetries) throw cause;
    } finally {
      if (client !== pool && typeof client.release === 'function') client.release();
    }
  }
  throw new Error('A transação do cliente não pôde ser concluída.');
}

async function appendEvent(client, { companyId, customerId, event, summary, actorId, metadata = {} }) {
  await client.query(`
    insert into public.vendas_eventos(
      empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,criado_por
    ) values ($1,'cliente',$2,$3,$4,$5::jsonb,$6)
  `, [companyId, customerId, event, summary, JSON.stringify(metadata), actorId]);
}

function duplicateError(cause) {
  if (cause?.code !== '23505') return cause;
  const error = new Error('Já existe um cliente com este CNPJ nesta empresa.');
  error.code = 'AV-COMMERCIAL-CUSTOMER-DUPLICATE';
  error.cause = cause;
  return error;
}

export function createPostgresCommercialCustomerRepository({ pool } = {}) {
  assertPool(pool);
  return Object.freeze({
    id: 'avantalab-commercial-customer-postgres-v1',
    configured: true,

    async create(customer) {
      try {
        return await runSerializable(pool, async (client) => {
          await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [`vendas:cliente:codigo:${customer.companyId}`]);
          await client.query(`
            insert into public.vendas_sequencias(empresa_id,tipo,ano,proximo_numero)
            select $1,'cliente',0,coalesce(max(codigo)+1,1) from public.vendas_clientes where empresa_id=$1
            on conflict on constraint vendas_sequencias_pkey do nothing
          `, [customer.companyId]);
          const sequence = await client.query(`
            select proximo_numero from public.vendas_sequencias
            where empresa_id=$1 and tipo='cliente' and ano=0 for update
          `, [customer.companyId]);
          const code = Number(sequence.rows?.[0]?.proximo_numero);
          if (!Number.isSafeInteger(code) || code < 1) throw new Error('A sequência de clientes está indisponível.');
          await client.query(`
            update public.vendas_sequencias set proximo_numero=$2,atualizado_em=now()
            where empresa_id=$1 and tipo='cliente' and ano=0
          `, [customer.companyId, code + 1]);
          const values = customerValues(customer);
          const result = await client.query(`
            insert into public.vendas_clientes(
              empresa_id,codigo,tipo_pessoa,documento_tipo,documento,razao_social,nome_fantasia,
              nome_exibicao,inscricao_estadual,inscricao_municipal,indicador_ie,email,telefone,
              contato_principal,cep,logradouro,numero,complemento,bairro,municipio,municipio_ibge,
              uf,vendedor_id,condicao_pagamento,observacoes,situacao,criado_por,atualizado_por
            ) values (
              $1,$27,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
              $22,$23,$24,$25,$26,$26
            ) returning *
          `, [...values, code]);
          const created = mapCustomer(result.rows?.[0]);
          await appendEvent(client, {
            companyId: customer.companyId,
            customerId: created.id,
            event: 'cliente_criado',
            summary: `Cliente ${created.displayName} cadastrado.`,
            actorId: customer.actorId,
            metadata: { code: created.code, status: created.status, documentType: created.documentType },
          });
          return created;
        });
      } catch (cause) {
        throw duplicateError(cause);
      }
    },

    async update({ companyId, customerId, expectedVersion, actorId, customer }) {
      try {
        return await runSerializable(pool, async (client) => {
          const values = customerValues({ ...customer, companyId, actorId });
          const result = await client.query(`
            update public.vendas_clientes set
              tipo_pessoa=$2,documento_tipo=$3,documento=$4,razao_social=$5,nome_fantasia=$6,
              nome_exibicao=$7,inscricao_estadual=$8,inscricao_municipal=$9,indicador_ie=$10,
              email=$11,telefone=$12,contato_principal=$13,cep=$14,logradouro=$15,numero=$16,
              complemento=$17,bairro=$18,municipio=$19,municipio_ibge=$20,uf=$21,vendedor_id=$22,
              condicao_pagamento=$23,observacoes=$24,situacao=$25,atualizado_por=$26
            where empresa_id=$1 and id=$27 and versao=$28 returning *
          `, [...values, customerId, expectedVersion]);
          if (!result.rows?.[0]) {
            const current = await client.query('select versao from public.vendas_clientes where empresa_id=$1 and id=$2', [companyId, customerId]);
            const error = new Error(current.rows?.[0]
              ? 'O cliente foi alterado por outra pessoa. Atualize os dados antes de salvar novamente.'
              : 'Cliente não localizado nesta empresa.');
            error.code = current.rows?.[0] ? 'AV-COMMERCIAL-CUSTOMER-CONFLICT' : 'AV-COMMERCIAL-CUSTOMER-NOT-FOUND';
            throw error;
          }
          const updated = mapCustomer(result.rows[0]);
          await appendEvent(client, {
            companyId, customerId, event: 'cliente_atualizado',
            summary: `Cadastro de ${updated.displayName} atualizado.`, actorId,
            metadata: { previousVersion: expectedVersion, version: updated.version, status: updated.status },
          });
          return updated;
        });
      } catch (cause) {
        throw duplicateError(cause);
      }
    },

    async deactivate({ companyId, customerId, expectedVersion, actorId }) {
      return runSerializable(pool, async (client) => {
        const result = await client.query(`
          update public.vendas_clientes set situacao='inativo',atualizado_por=$4
          where empresa_id=$1 and id=$2 and versao=$3 returning *
        `, [companyId, customerId, expectedVersion, actorId]);
        if (!result.rows?.[0]) {
          const current = await client.query('select versao from public.vendas_clientes where empresa_id=$1 and id=$2', [companyId, customerId]);
          const error = new Error(current.rows?.[0]
            ? 'O cliente foi alterado por outra pessoa. Atualize os dados antes de inativar.'
            : 'Cliente não localizado nesta empresa.');
          error.code = current.rows?.[0] ? 'AV-COMMERCIAL-CUSTOMER-CONFLICT' : 'AV-COMMERCIAL-CUSTOMER-NOT-FOUND';
          throw error;
        }
        const updated = mapCustomer(result.rows[0]);
        await appendEvent(client, {
          companyId, customerId, event: 'cliente_inativado',
          summary: `Cliente ${updated.displayName} inativado.`, actorId,
          metadata: { previousVersion: expectedVersion, version: updated.version },
        });
        return updated;
      });
    },

    async get({ companyId, customerId }) {
      return withClient(pool, async (client) => {
        const result = await client.query('select * from public.vendas_clientes where empresa_id=$1 and id=$2', [companyId, customerId]);
        return mapCustomer(result.rows?.[0]);
      });
    },

    async findByDocument({ companyId, document }) {
      return withClient(pool, async (client) => {
        const result = await client.query(
          'select * from public.vendas_clientes where empresa_id=$1 and documento=$2 limit 1',
          [companyId, digits(document)],
        );
        return mapCustomer(result.rows?.[0]);
      });
    },

    async list({ companyId, query = '', status = '', limit = 50, offset = 0 }) {
      return withClient(pool, async (client) => {
        const search = text(query);
        const result = await client.query(`
          select * from public.vendas_clientes
          where empresa_id=$1
            and ($2='' or situacao=$2)
            and ($3='' or nome_exibicao ilike '%' || $3 || '%' or razao_social ilike '%' || $3 || '%'
              or ($4<>'' and documento like '%' || $4 || '%') or coalesce(email,'') ilike '%' || $3 || '%')
          order by nome_exibicao,id limit $5 offset $6
        `, [companyId, text(status), search, digits(search), limit, offset]);
        return (result.rows || []).map(mapCustomer);
      });
    },
  });
}
