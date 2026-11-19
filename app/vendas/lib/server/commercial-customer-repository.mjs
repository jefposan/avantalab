import {sanitizarCnpj} from '../../../../lib/consultas/validators/cnpj.ts';
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
    consumerFinal: row.consumidor_final === true,
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
    ...(Object.hasOwn(row,'tabela_preco_id')?{priceTableId:row.tabela_preco_id||''}:{}),
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
    customer.stateRegistrationIndicator, customer.consumerFinal === true,
    nullable(customer.email), nullable(customer.phone), nullable(customer.primaryContact),
    nullable(customer.postalCode), nullable(customer.street), nullable(customer.number),
    nullable(customer.complement), nullable(customer.district), nullable(customer.city),
    nullable(customer.cityCode), nullable(customer.state), nullable(customer.sellerId),
    nullable(customer.paymentTerms), nullable(customer.notes), customer.status, customer.actorId,
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

    async findExistingDocuments({companyId,documents}) {
      return withClient(pool,async client=>{
        const result=await client.query('select documento from public.vendas_clientes where empresa_id=$1 and documento=any($2::text[])',[companyId,documents]);
        return (result.rows||[]).map(row=>row.documento);
      });
    },

    async findImportSnapshot({companyId}) {
      return withClient(pool,async client=>(await client.query('select id,documento,versao,situacao,atualizado_em from public.vendas_clientes where empresa_id=$1 order by id',[companyId])).rows);
    },

    async importMany({companyId,actorId,customers,expectedExisting,fileName,mode='add',expectedSnapshot}) {
      if(!['add','replace'].includes(mode)||!customers.length)throw new Error('Modo ou lote inválido');
      return runSerializable(pool,async client=>{
        await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`vendas:cliente:codigo:${companyId}`]);
        let updated=0,inactivated=0;
        if(mode==='replace'){
          const snapshot=(await client.query('select id,documento,versao,situacao,atualizado_em from public.vendas_clientes where empresa_id=$1 order by id for update',[companyId])).rows;
          if(JSON.stringify(snapshot)!==JSON.stringify(expectedSnapshot)){const error=new Error('Prévia alterada');error.code='AV-COMMERCIAL-IMPORT-CONFLICT';throw error;}
        }
        const current=await client.query('select documento from public.vendas_clientes where empresa_id=$1 and documento=any($2::text[]) for update',[companyId,customers.map(c=>c.document)]);
        const existing=(current.rows||[]).map(row=>row.documento).sort();
        if(JSON.stringify(existing)!==JSON.stringify([...expectedExisting].sort())){const error=new Error('Prévia alterada');error.code='AV-COMMERCIAL-IMPORT-CONFLICT';throw error;}
        const seen=new Set(existing); const novos=customers.filter(customer=>!seen.has(customer.document));
        if(mode==='replace'){
          const changed=await client.query(`update public.vendas_clientes c set
            tipo_pessoa=item->>'personType',documento_tipo=item->>'documentType',razao_social=item->>'legalName',
            nome_fantasia=nullif(item->>'tradeName',''),nome_exibicao=item->>'displayName',
            inscricao_estadual=nullif(item->>'stateRegistration',''),inscricao_municipal=nullif(item->>'municipalRegistration',''),
            indicador_ie=item->>'stateRegistrationIndicator',consumidor_final=(item->>'consumerFinal')::boolean,
            email=nullif(item->>'email',''),telefone=nullif(item->>'phone',''),contato_principal=nullif(item->>'primaryContact',''),
            cep=nullif(item->>'postalCode',''),logradouro=nullif(item->>'street',''),numero=nullif(item->>'number',''),
            complemento=nullif(item->>'complement',''),bairro=nullif(item->>'district',''),municipio=nullif(item->>'city',''),
            municipio_ibge=nullif(item->>'cityCode',''),uf=nullif(item->>'state',''),condicao_pagamento=nullif(item->>'paymentTerms',''),
            observacoes=nullif(item->>'notes',''),situacao=item->>'status',atualizado_por=$3
            from jsonb_array_elements($2::jsonb) item where c.empresa_id=$1 and c.documento=item->>'document' returning c.id`,[companyId,JSON.stringify(customers),actorId]);
          const hidden=await client.query("update public.vendas_clientes set situacao='inativo',atualizado_por=$3 where empresa_id=$1 and not(documento=any($2::text[])) and situacao<>'inativo' returning id",[companyId,customers.map(c=>c.document),actorId]);
          updated=changed.rows.length;inactivated=hidden.rows.length;
          for(const [items,event,summary] of [[changed.rows,'cliente_atualizado_excel','Cadastro atualizado pela substituição da base Excel.'],[hidden.rows,'cliente_inativado_excel','Cliente ausente da planilha inativado, com histórico preservado.']]){
            if(items.length)await client.query(`insert into public.vendas_eventos(empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,criado_por)
              select $1,'cliente',x.id::uuid,$3,$4,$5::jsonb,$6 from jsonb_to_recordset($2::jsonb) x(id text)`,[companyId,JSON.stringify(items),event,summary,JSON.stringify({origem:'excel',modo:mode,arquivo:fileName}),actorId]);
          }
        }
        if(!novos.length)return mode==='replace'?{created:0,skipped:0,updated,inactivated}:{created:0,skipped:customers.length};
        await client.query(`insert into public.vendas_sequencias(empresa_id,tipo,ano,proximo_numero)
          select $1,'cliente',0,coalesce(max(codigo)+1,1) from public.vendas_clientes where empresa_id=$1
          on conflict on constraint vendas_sequencias_pkey do nothing`,[companyId]);
        const sequence=await client.query("select proximo_numero from public.vendas_sequencias where empresa_id=$1 and tipo='cliente' and ano=0 for update",[companyId]);
        const code=Number(sequence.rows?.[0]?.proximo_numero);
        if(!Number.isSafeInteger(code)||code<1||!Number.isSafeInteger(code+novos.length))throw new Error('Sequência indisponível');
        await client.query("update public.vendas_sequencias set proximo_numero=$2,atualizado_em=now() where empresa_id=$1 and tipo='cliente' and ano=0",[companyId,code+novos.length]);
        const result=await client.query(`insert into public.vendas_clientes(
          empresa_id,codigo,tipo_pessoa,documento_tipo,documento,razao_social,nome_fantasia,nome_exibicao,
          inscricao_estadual,inscricao_municipal,indicador_ie,consumidor_final,email,telefone,contato_principal,
          cep,logradouro,numero,complemento,bairro,municipio,municipio_ibge,uf,condicao_pagamento,observacoes,situacao,criado_por,atualizado_por)
          select $1, $3::bigint+ordinality-1, item->>'personType',item->>'documentType',item->>'document',item->>'legalName',
          nullif(item->>'tradeName',''),item->>'displayName',nullif(item->>'stateRegistration',''),nullif(item->>'municipalRegistration',''),
          item->>'stateRegistrationIndicator',(item->>'consumerFinal')::boolean,nullif(item->>'email',''),nullif(item->>'phone',''),nullif(item->>'primaryContact',''),
          nullif(item->>'postalCode',''),nullif(item->>'street',''),nullif(item->>'number',''),nullif(item->>'complement',''),nullif(item->>'district',''),
          nullif(item->>'city',''),nullif(item->>'cityCode',''),nullif(item->>'state',''),nullif(item->>'paymentTerms',''),nullif(item->>'notes',''),item->>'status',$4,$4
          from jsonb_array_elements($2::jsonb) with ordinality as source(item,ordinality) returning *`,[companyId,JSON.stringify(novos),code,actorId]);
        if(result.rows.length!==novos.length)throw new Error('Lote incompleto');
        await client.query(`insert into public.vendas_eventos(empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,criado_por)
          select $1,'cliente',x.id::uuid,'cliente_importado',x.resumo,x.metadados,$3
          from jsonb_to_recordset($2::jsonb) as x(id text,resumo text,metadados jsonb)`,[companyId,JSON.stringify(result.rows.map(row=>({id:row.id,resumo:`Cliente ${row.nome_exibicao} importado por Excel.`,metadados:{origem:'excel',arquivo:fileName,codigo:row.codigo}}))),actorId]);
        return mode==='replace'?{created:novos.length,skipped:0,updated,inactivated}:{created:novos.length,skipped:customers.length-novos.length};
      });
    },

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
              nome_exibicao,inscricao_estadual,inscricao_municipal,indicador_ie,consumidor_final,email,telefone,
              contato_principal,cep,logradouro,numero,complemento,bairro,municipio,municipio_ibge,
              uf,vendedor_id,condicao_pagamento,observacoes,situacao,criado_por,atualizado_por${Object.hasOwn(customer,'priceTableId')?',tabela_preco_id':''}
            ) values (
              $1,$28,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
              $22,$23,$24,$25,$26,$27,$27${Object.hasOwn(customer,'priceTableId')?',$29':''}
            ) returning *
          `, [...values, code,...(Object.hasOwn(customer,'priceTableId')?[customer.priceTableId||null]:[])]);
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
              consumidor_final=$11,email=$12,telefone=$13,contato_principal=$14,cep=$15,
              logradouro=$16,numero=$17,complemento=$18,bairro=$19,municipio=$20,
              municipio_ibge=$21,uf=$22,vendedor_id=$23,condicao_pagamento=$24,
              observacoes=$25,situacao=$26,atualizado_por=$27${Object.hasOwn(customer,'priceTableId')?',tabela_preco_id=$30':''}
            where empresa_id=$1 and id=$28 and versao=$29 returning *
          `, [...values, customerId, expectedVersion,...(Object.hasOwn(customer,'priceTableId')?[customer.priceTableId||null]:[])]);
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
          [companyId, sanitizarCnpj(String(document))],
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
        `, [companyId, text(status), search, sanitizarCnpj(String(search)), limit, offset]);
        return (result.rows || []).map(mapCustomer);
      });
    },
  });
}
