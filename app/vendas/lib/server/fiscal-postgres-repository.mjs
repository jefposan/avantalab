export const FISCAL_POSTGRES_REPOSITORY_REFERENCE = '2026-09-04';

const JOB_TYPES = Object.freeze(['authorization_status', 'receipt_status', 'processed_artifact', 'danfe_generation']);
const ISOLATION_LEVELS = Object.freeze({
  'read committed': 'read committed',
  serializable: 'serializable',
});
const RETRYABLE_TRANSACTION_CODES = new Set(['40001', '40P01']);

function text(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function timestamp(value) {
  return value ? text(value) : '';
}

function nullable(value) {
  const normalized = text(value);
  return normalized || null;
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function assertSchema(value) {
  const schema = text(value) || 'fiscal_private';
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new TypeError('O schema fiscal informado não é seguro.');
  return schema;
}

function assertPool(pool) {
  if (!pool || (typeof pool.connect !== 'function' && typeof pool.query !== 'function')) throw new TypeError('Informe um pool PostgreSQL server-side compatível com query() ou connect().');
}

function transactionOptions(options = {}) {
  const isolationLevel = ISOLATION_LEVELS[text(options.isolationLevel).toLowerCase() || 'serializable'];
  if (!isolationLevel) throw new TypeError('O nível de isolamento PostgreSQL informado não é permitido.');
  const requestedRetries = Number(options.maxRetries ?? 2);
  if (!Number.isInteger(requestedRetries) || requestedRetries < 0 || requestedRetries > 5) throw new TypeError('A quantidade de novas tentativas transacionais deve estar entre 0 e 5.');
  return { isolationLevel, maxRetries: requestedRetries };
}

function mapEmission(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    establishmentId: row.establishment_id,
    draftId: row.draft_id,
    originId: row.origin_id || '',
    documentType: row.document_type,
    model: row.model,
    environment: row.environment,
    state: row.state,
    version: Number(row.version),
    series: row.series || '',
    number: Number(row.number || 0),
    reservationId: row.reservation_id || '',
    accessKey: row.access_key || '',
    signedChecksum: row.signed_checksum || '',
    batchId: row.batch_id || '',
    receiptNumber: row.receipt_number || '',
    statusCode: row.status_code || '',
    statusReason: row.status_reason || '',
    protocolNumber: row.protocol_number || '',
    submittedAt: timestamp(row.submitted_at),
    authorizedAt: timestamp(row.authorized_at),
    processedStorageReference: row.processed_storage_reference || '',
    processedChecksum: row.processed_checksum || '',
    danfeStorageReference: row.danfe_storage_reference || '',
    danfeChecksum: row.danfe_checksum || '',
    canceledAt: timestamp(row.canceled_at),
    cancellationProtocol: row.cancellation_protocol || '',
    cancellationStatusCode: row.cancellation_status_code || '',
    failureCode: row.failure_code || '',
    failureReason: row.failure_reason || '',
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  };
}

function mapOperation(row) {
  if (!row) return null;
  return { companyId: row.company_id, operationKey: row.operation_key, emissionId: row.emission_id, operationType: row.operation_type, requestHash: row.request_hash, resultingVersion: Number(row.resulting_version), createdAt: timestamp(row.created_at) };
}

function mapRecoveryJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    emissionId: row.emission_id,
    jobType: row.job_type,
    state: row.state,
    idempotencyKey: row.idempotency_key,
    attemptCount: Number(row.attempt_count),
    maxAttempts: Number(row.max_attempts),
    availableAt: timestamp(row.available_at),
    leasedAt: timestamp(row.leased_at),
    leaseExpiresAt: timestamp(row.lease_expires_at),
    workerId: row.worker_id || '',
    lastErrorCode: row.last_error_code || '',
    lastErrorReason: row.last_error_reason || '',
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
    completedAt: timestamp(row.completed_at),
  };
}

function mapArtifact(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    emissionId: row.emission_id,
    artifactType: row.artifact_type,
    revision: Number(row.revision || 1),
    storageReference: row.storage_reference,
    storageVersion: row.storage_version || '',
    checksum: row.checksum_sha256,
    byteLength: Number(row.byte_length),
    contentType: row.content_type,
    createdAt: timestamp(row.created_at),
  };
}

function mapTransmissionAttempt(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    emissionId: row.emission_id,
    attemptNumber: Number(row.attempt_number),
    operationKey: row.operation_key,
    accessKey: row.access_key,
    signedChecksum: row.signed_checksum,
    batchId: row.batch_id || '',
    receiptNumber: row.receipt_number || '',
    statusCode: row.status_code || '',
    statusReason: row.status_reason || '',
    protocolNumber: row.protocol_number || '',
    startedAt: timestamp(row.started_at),
    completedAt: timestamp(row.completed_at),
  };
}

function mapNumberReservation(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    establishmentId: row.establishment_id,
    emissionId: row.emission_id,
    documentType: row.document_type,
    series: row.series,
    number: Number(row.number),
    idempotencyKey: row.idempotency_key,
    status: row.status,
    reservedAt: timestamp(row.reserved_at),
    updatedAt: timestamp(row.updated_at),
  };
}

function emissionValues(emission) {
  return [
    emission.id, emission.companyId, emission.establishmentId, emission.draftId, nullable(emission.originId), emission.documentType,
    emission.model, emission.environment, emission.state, emission.version, nullable(emission.series), numberOrNull(emission.number),
    nullable(emission.reservationId), nullable(emission.accessKey), nullable(emission.signedChecksum), nullable(emission.batchId),
    nullable(emission.receiptNumber), nullable(emission.statusCode), nullable(emission.statusReason), nullable(emission.protocolNumber),
    nullable(emission.submittedAt), nullable(emission.authorizedAt), nullable(emission.processedStorageReference), nullable(emission.processedChecksum),
    nullable(emission.danfeStorageReference), nullable(emission.danfeChecksum), nullable(emission.canceledAt), nullable(emission.cancellationProtocol),
    nullable(emission.cancellationStatusCode), nullable(emission.failureCode), nullable(emission.failureReason), emission.createdAt, emission.updatedAt,
  ];
}

function createTransaction(client, schema) {
  const emissions = `${schema}.emissions`;
  const operations = `${schema}.operations`;
  const events = `${schema}.events`;
  const jobs = `${schema}.recovery_jobs`;
  const artifacts = `${schema}.artifacts`;
  const transmissionAttempts = `${schema}.transmission_attempts`;
  const numberSequences = `${schema}.number_sequences`;
  const numberReservations = `${schema}.number_reservations`;
  const numberVoids = `${schema}.number_voids`;
  return Object.freeze({
    async lockKey(namespace, ...parts) {
      const key = [text(namespace), ...parts.map(text)].join(':');
      await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
    },
    async getOperation(companyId, operationKey) {
      const result = await client.query(`select * from ${operations} where company_id = $1 and operation_key = $2`, [companyId, operationKey]);
      return mapOperation(result.rows?.[0]);
    },
    async getEmission(id, options = {}) {
      const suffix = options.forUpdate ? ' for update' : '';
      const result = await client.query(`select * from ${emissions} where id = $1${suffix}`, [id]);
      return mapEmission(result.rows?.[0]);
    },
    async insertEmission(emission) {
      const columns = 'id,company_id,establishment_id,draft_id,origin_id,document_type,model,environment,state,version,series,number,reservation_id,access_key,signed_checksum,batch_id,receipt_number,status_code,status_reason,protocol_number,submitted_at,authorized_at,processed_storage_reference,processed_checksum,danfe_storage_reference,danfe_checksum,canceled_at,cancellation_protocol,cancellation_status_code,failure_code,failure_reason,created_at,updated_at';
      const placeholders = Array.from({ length: 33 }, (_, index) => `$${index + 1}`).join(',');
      await client.query(`insert into ${emissions} (${columns}) values (${placeholders})`, emissionValues(emission));
    },
    async updateEmission(emission, { expectedVersion } = {}) {
      const values = emissionValues(emission);
      const assignments = 'company_id=$2,establishment_id=$3,draft_id=$4,origin_id=$5,document_type=$6,model=$7,environment=$8,state=$9,version=$10,series=$11,number=$12,reservation_id=$13,access_key=$14,signed_checksum=$15,batch_id=$16,receipt_number=$17,status_code=$18,status_reason=$19,protocol_number=$20,submitted_at=$21,authorized_at=$22,processed_storage_reference=$23,processed_checksum=$24,danfe_storage_reference=$25,danfe_checksum=$26,canceled_at=$27,cancellation_protocol=$28,cancellation_status_code=$29,failure_code=$30,failure_reason=$31,created_at=$32,updated_at=$33';
      const result = await client.query(`update ${emissions} set ${assignments} where id = $1 and version = $34`, [...values, expectedVersion]);
      return result.rowCount === 1;
    },
    async appendEvent(event) {
      await client.query(`insert into ${events} (company_id,emission_id,sequence,from_state,to_state,event_type,actor_id,public_payload,occurred_at) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`, [event.companyId, event.emissionId, event.sequence, nullable(event.fromState), event.toState, event.eventType, nullable(event.actorId), JSON.stringify(event.publicPayload || {}), event.occurredAt]);
    },
    async insertOperation(operation) {
      await client.query(`insert into ${operations} (company_id,operation_key,emission_id,operation_type,request_hash,resulting_version,created_at) values ($1,$2,$3,$4,$5,$6,$7)`, [operation.companyId, operation.operationKey, operation.emissionId, operation.operationType, operation.requestHash, operation.resultingVersion, operation.createdAt]);
    },
    async reserveNextFiscalNumber({ companyId, establishmentId, emissionId, documentType, idempotencyKey, at }) {
      const existingResult = await client.query(`
        select * from ${numberReservations}
        where company_id=$1 and (emission_id=$2 or idempotency_key=$3)
        order by (emission_id=$2) desc for update
      `, [companyId, emissionId, idempotencyKey]);
      const existingRows = existingResult.rows || [];
      if (existingRows.length) {
        const existing = existingRows.find((row) => row.emission_id === emissionId && row.idempotency_key === idempotencyKey);
        if (existingRows.length !== 1 || !existing) {
          throw Object.assign(new Error('A chave ou a emissão já possui outra reserva fiscal.'), { code: 'AV-FISCAL-NUMBER-IDEMPOTENCY' });
        }
        return { reused: true, reservation: mapNumberReservation(existing) };
      }
      const sequenceResult = await client.query(`
        select * from ${numberSequences}
        where company_id=$1 and establishment_id=$2 and document_type=$3 and active
        for update
      `, [companyId, establishmentId, documentType]);
      const sequence = sequenceResult.rows?.[0];
      if (!sequence) throw Object.assign(new Error('A série fiscal ativa não foi configurada.'), { code: 'AV-FISCAL-NUMBER-SEQUENCE' });
      let candidate = Math.max(Number(sequence.next_number), Number(sequence.last_reserved_number) + 1);
      let available = false;
      for (let attempt = 0; attempt < 1000; attempt += 1) {
        if (!Number.isInteger(candidate) || candidate < 1 || candidate >= 999999999) {
          throw Object.assign(new Error('A série fiscal não possui numeração disponível.'), { code: 'AV-FISCAL-NUMBER-EXHAUSTED' });
        }
        const unavailable = await client.query(`
          select
            (select max(end_number)::int from ${numberVoids}
              where company_id=$1 and establishment_id=$2 and document_type=$3 and series=$4
                and status<>'rejected' and $5 between start_number and end_number) as void_end,
            exists(select 1 from ${numberReservations}
              where company_id=$1 and establishment_id=$2 and document_type=$3 and series=$4 and number=$5) as reserved
        `, [companyId, establishmentId, documentType, sequence.series, candidate]);
        const conflict = unavailable.rows?.[0] || {};
        if (conflict.void_end) {
          candidate = Number(conflict.void_end) + 1;
          continue;
        }
        if (conflict.reserved) {
          candidate += 1;
          continue;
        }
        available = true;
        break;
      }
      if (!available) throw Object.assign(new Error('Não foi possível localizar um número fiscal livre nesta tentativa.'), { code: 'AV-FISCAL-NUMBER-EXHAUSTED' });
      const inserted = await client.query(`
        insert into ${numberReservations}(
          company_id,establishment_id,emission_id,document_type,series,number,
          idempotency_key,status,reserved_at,updated_at
        ) values ($1,$2,$3,$4,$5,$6,$7,'reserved',$8,$8) returning *
      `, [companyId, establishmentId, emissionId, documentType, sequence.series, candidate, idempotencyKey, at]);
      await client.query(`
        update ${numberSequences}
        set next_number=$2,last_reserved_number=$3,version=version+1,updated_at=$4
        where id=$1
      `, [sequence.id, candidate + 1, candidate, at]);
      return { reused: false, reservation: mapNumberReservation(inserted.rows?.[0]) };
    },
    async findArtifact(companyId, emissionId, artifactType) {
      const result = await client.query(`select * from ${artifacts} where company_id=$1 and emission_id=$2 and artifact_type=$3 order by revision desc limit 1`, [companyId, emissionId, artifactType]);
      return mapArtifact(result.rows?.[0]);
    },
    async insertArtifact(artifact) {
      const next = await client.query(`select coalesce(max(revision),0)::int + 1 as revision from ${artifacts} where company_id=$1 and emission_id=$2 and artifact_type=$3`, [artifact.companyId, artifact.emissionId, artifact.artifactType]);
      const revision = Number(next.rows?.[0]?.revision || 1);
      const result = await client.query(`insert into ${artifacts} (company_id,emission_id,artifact_type,revision,storage_reference,storage_version,checksum_sha256,byte_length,content_type,created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`, [artifact.companyId, artifact.emissionId, artifact.artifactType, revision, artifact.storageReference, nullable(artifact.storageVersion), artifact.checksum, artifact.byteLength, artifact.contentType, artifact.createdAt]);
      return mapArtifact(result.rows?.[0]);
    },
    async findTransmissionAttempt(companyId, operationKey) {
      const result = await client.query(`select * from ${transmissionAttempts} where company_id=$1 and operation_key=$2`, [companyId, operationKey]);
      return mapTransmissionAttempt(result.rows?.[0]);
    },
    async insertTransmissionAttempt(attempt) {
      const next = await client.query(`select coalesce(max(attempt_number),0)::int + 1 as attempt_number from ${transmissionAttempts} where company_id=$1 and emission_id=$2`, [attempt.companyId, attempt.emissionId]);
      const attemptNumber = Number(next.rows?.[0]?.attempt_number || 1);
      const result = await client.query(`insert into ${transmissionAttempts} (company_id,emission_id,attempt_number,operation_key,access_key,signed_checksum,batch_id,started_at) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`, [attempt.companyId, attempt.emissionId, attemptNumber, attempt.operationKey, attempt.accessKey, attempt.signedChecksum, nullable(attempt.batchId), attempt.startedAt]);
      return mapTransmissionAttempt(result.rows?.[0]);
    },
    async enqueueRecoveryJob(job) {
      const result = await client.query(`insert into ${jobs} (company_id,emission_id,job_type,idempotency_key,max_attempts,available_at,created_at,updated_at) values ($1,$2,$3,$4,$5,$6,$7,$7) on conflict (company_id,idempotency_key) do update set idempotency_key = excluded.idempotency_key returning *`, [job.companyId, job.emissionId, job.jobType, job.idempotencyKey, job.maxAttempts, job.availableAt, job.createdAt]);
      return mapRecoveryJob(result.rows?.[0]);
    },
    async claimRecoveryJobs({ workerId, limit, leaseSeconds, now }) {
      const result = await client.query(`with candidates as (select id from ${jobs} where state = 'pending' and available_at <= $1 order by available_at,id for update skip locked limit $2) update ${jobs} as job set state='leased',attempt_count=job.attempt_count+1,leased_at=$1,lease_expires_at=$1::timestamptz + make_interval(secs => $3),worker_id=$4,updated_at=$1 from candidates where job.id=candidates.id returning job.*`, [now, limit, leaseSeconds, workerId]);
      return (result.rows || []).map(mapRecoveryJob);
    },
    async completeRecoveryJob({ jobId, workerId, now }) {
      const result = await client.query(`update ${jobs} set state='completed',completed_at=$3,updated_at=$3,lease_expires_at=null where id=$1 and state='leased' and worker_id=$2 returning *`, [jobId, workerId, now]);
      return mapRecoveryJob(result.rows?.[0]);
    },
    async failRecoveryJob({ jobId, workerId, failureCode, failureReason, now, baseDelaySeconds, maxDelaySeconds }) {
      const result = await client.query(`update ${jobs} set state=case when attempt_count>=max_attempts then 'dead_letter' else 'pending' end,available_at=case when attempt_count>=max_attempts then available_at else $5::timestamptz + make_interval(secs => least($7::integer,($6::integer * power(2,greatest(attempt_count-1,0)))::integer)) end,last_error_code=$3,last_error_reason=$4,worker_id=null,leased_at=null,lease_expires_at=null,updated_at=$5 where id=$1 and state='leased' and worker_id=$2 returning *`, [jobId, workerId, failureCode, failureReason, now, baseDelaySeconds, maxDelaySeconds]);
      return mapRecoveryJob(result.rows?.[0]);
    },
    async recoverExpiredRecoveryJobs({ now }) {
      const result = await client.query(`update ${jobs} set state=case when attempt_count>=max_attempts then 'dead_letter' else 'pending' end,worker_id=null,leased_at=null,lease_expires_at=null,updated_at=$1,last_error_code='AV-FISCAL-RECOVERY-LEASE-EXPIRED',last_error_reason='A execução anterior perdeu o prazo de confirmação.' where state='leased' and lease_expires_at <= $1 returning *`, [now]);
      return (result.rows || []).map(mapRecoveryJob);
    },
  });
}

async function withClient(pool, work) {
  const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
  try {
    return await work(client);
  } finally {
    if (client !== pool && typeof client.release === 'function') client.release();
  }
}

export function createPostgresFiscalRepository({ pool, schema = 'fiscal_private' } = {}) {
  assertPool(pool);
  const safeSchema = assertSchema(schema);
  return Object.freeze({
    id: 'avantalab-fiscal-postgres-repository-v1',
    configured: true,
    schema: safeSchema,
    jobTypes: JOB_TYPES,
    async findEmissionStatus({ companyId, emissionId } = {}) {
      const emissions = `${safeSchema}.emissions`;
      const artifacts = `${safeSchema}.artifacts`;
      const jobs = `${safeSchema}.recovery_jobs`;
      return withClient(pool, async (client) => {
        const result = await client.query(`
          select e.*,
            coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'artifactType',a.artifact_type) order by case a.artifact_type when 'processed_xml' then 1 else 2 end,a.created_at)
              from ${artifacts} a where a.company_id=e.company_id and a.emission_id=e.id
                and a.artifact_type in ('processed_xml','danfe_pdf')), '[]'::jsonb) as public_artifacts,
            coalesce((select jsonb_agg(jsonb_build_object('jobType',j.job_type,'state',j.state,'attemptCount',j.attempt_count,'maxAttempts',j.max_attempts) order by j.created_at)
              from ${jobs} j where j.company_id=e.company_id and j.emission_id=e.id and j.state<>'completed'), '[]'::jsonb) as active_recovery_jobs
          from ${emissions} e where e.company_id=$1 and e.id=$2 limit 1
        `, [text(companyId), text(emissionId)]);
        const row = result.rows?.[0];
        const emission = mapEmission(row);
        return emission ? { ...emission, artifacts: Array.isArray(row.public_artifacts) ? row.public_artifacts : [], recoveryJobs: Array.isArray(row.active_recovery_jobs) ? row.active_recovery_jobs : [] } : null;
      });
    },
    async findArtifactForDownload({ companyId, artifactId, artifactType } = {}) {
      const artifacts = `${safeSchema}.artifacts`;
      const emissions = `${safeSchema}.emissions`;
      return withClient(pool, async (client) => {
        const result = await client.query(`select a.*,e.access_key from ${artifacts} a join ${emissions} e on e.id=a.emission_id and e.company_id=a.company_id where a.company_id=$1 and a.id=$2 and a.artifact_type=$3`, [text(companyId), text(artifactId), text(artifactType)]);
        const artifact = mapArtifact(result.rows?.[0]);
        return artifact ? { ...artifact, accessKey: text(result.rows[0].access_key) } : null;
      });
    },
    async appendArtifactAccessEvent(event = {}) {
      const accessEvents = `${safeSchema}.artifact_access_events`;
      const outcome = text(event.outcome);
      if (!['granted', 'denied', 'failed'].includes(outcome)) throw new TypeError('O resultado da auditoria fiscal não é válido.');
      return withClient(pool, async (client) => {
        const result = await client.query(`insert into ${accessEvents} (company_id,emission_id,artifact_id,actor_id,artifact_type,permission_code,outcome,reason_code,grant_expires_at,occurred_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`, [text(event.companyId), nullable(event.emissionId), nullable(event.artifactId), text(event.actorId), text(event.artifactType), text(event.permission), outcome, text(event.reasonCode), nullable(event.grantExpiresAt), text(event.occurredAt)]);
        return { id: result.rows?.[0]?.id ?? null, recorded: Number(result.rowCount ?? result.rows?.length ?? 0) === 1 };
      });
    },
    async runInTransaction(callback, options = {}) {
      if (typeof callback !== 'function') throw new TypeError('A transação fiscal exige uma função de trabalho.');
      const settings = transactionOptions(options);
      for (let attempt = 0; attempt <= settings.maxRetries; attempt += 1) {
        const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
        try {
          await client.query('begin');
          await client.query(`set transaction isolation level ${settings.isolationLevel}`);
          const result = await callback(createTransaction(client, safeSchema));
          await client.query('commit');
          return result;
        } catch (cause) {
          try { await client.query('rollback'); } catch {}
          if (!RETRYABLE_TRANSACTION_CODES.has(cause?.code) || attempt === settings.maxRetries) throw cause;
        } finally {
          if (client !== pool && typeof client.release === 'function') client.release();
        }
      }
      throw new Error('A transação fiscal não pôde ser concluída.');
    },
  });
}
