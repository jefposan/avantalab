import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const NFE_CERTIFICATE_PROTECTED_STORAGE_REFERENCE = '2026-09-05';

const AES_KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const PAYLOAD_VERSION = 1;
const MAX_PASSPHRASE_BYTES = 512;
const MAX_PKCS12_BYTES = 5 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFERENCE = /^certificate:\/\/([0-9a-f-]{36})\/([0-9a-f-]{36})$/i;
const KEY_ID = /^[A-Za-z0-9._-]{3,80}$/;

function clean(value) { return String(value ?? '').trim(); }

function normalizeKey(value) {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (typeof value !== 'string') return null;
  const source = value.trim();
  if (!source) return null;
  if (/^[a-f0-9]{64}$/i.test(source)) return Buffer.from(source, 'hex');
  try { return Buffer.from(source, 'base64'); } catch { return null; }
}

function certificateReference(companyId, certificateId) {
  if (!UUID.test(clean(companyId)) || !UUID.test(clean(certificateId))) throw new TypeError('A empresa e o certificado precisam ser identificados com segurança.');
  return `certificate://${clean(companyId).toLowerCase()}/${clean(certificateId).toLowerCase()}`;
}

function aad(reference, keyId) {
  return Buffer.from(`${NFE_CERTIFICATE_PROTECTED_STORAGE_REFERENCE}|${keyId}|${reference}`, 'utf8');
}

function pack(pkcs12, passphrase) {
  const certificate = Buffer.isBuffer(pkcs12) ? Buffer.from(pkcs12) : pkcs12 instanceof Uint8Array ? Buffer.from(pkcs12.buffer, pkcs12.byteOffset, pkcs12.byteLength) : null;
  const password = typeof passphrase === 'string' ? Buffer.from(passphrase, 'utf8') : null;
  if (!certificate || certificate.byteLength === 0 || certificate.byteLength > MAX_PKCS12_BYTES || !password || password.byteLength === 0 || password.byteLength > MAX_PASSPHRASE_BYTES) {
    certificate?.fill(0);
    password?.fill(0);
    throw new TypeError('O material interno do certificado não atende ao contrato protegido.');
  }
  const payload = Buffer.allocUnsafe(7 + password.byteLength + certificate.byteLength);
  payload.writeUInt8(PAYLOAD_VERSION, 0);
  payload.writeUInt16BE(password.byteLength, 1);
  payload.writeUInt32BE(certificate.byteLength, 3);
  password.copy(payload, 7);
  certificate.copy(payload, 7 + password.byteLength);
  password.fill(0);
  certificate.fill(0);
  return payload;
}

function unpack(payload) {
  if (!Buffer.isBuffer(payload) || payload.byteLength < 8 || payload.readUInt8(0) !== PAYLOAD_VERSION) throw new Error('O conteúdo protegido do certificado é incompatível.');
  const passwordLength = payload.readUInt16BE(1);
  const certificateLength = payload.readUInt32BE(3);
  if (passwordLength < 1 || passwordLength > MAX_PASSPHRASE_BYTES || certificateLength < 1 || certificateLength > MAX_PKCS12_BYTES || 7 + passwordLength + certificateLength !== payload.byteLength) {
    throw new Error('O conteúdo protegido do certificado está corrompido.');
  }
  return {
    passphrase: payload.subarray(7, 7 + passwordLength).toString('utf8'),
    pkcs12: Buffer.from(payload.subarray(7 + passwordLength)),
  };
}

export function createNfeCertificateEnvelopeCipher({ key, keyId = 'principal-v1' } = {}) {
  const encryptionKey = normalizeKey(key);
  const safeKeyId = clean(keyId);
  if (!encryptionKey || encryptionKey.byteLength !== AES_KEY_BYTES) {
    encryptionKey?.fill(0);
    throw new TypeError('A chave mestra do certificado precisa ter exatamente 32 bytes.');
  }
  if (!KEY_ID.test(safeKeyId)) {
    encryptionKey.fill(0);
    throw new TypeError('A identificação da chave mestra é inválida.');
  }
  return Object.freeze({
    id: 'avantalab-certificate-envelope-aes-256-gcm-v1',
    keyId: safeKeyId,
    seal({ companyId, certificateId, pkcs12, passphrase } = {}) {
      const reference = certificateReference(companyId, certificateId);
      const iv = randomBytes(IV_BYTES);
      const payload = pack(pkcs12, passphrase);
      try {
        const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv, { authTagLength: TAG_BYTES });
        cipher.setAAD(aad(reference, safeKeyId));
        const encryptedPayload = Buffer.concat([cipher.update(payload), cipher.final()]);
        return Object.freeze({ reference, keyId: safeKeyId, iv, authTag: cipher.getAuthTag(), encryptedPayload });
      } finally {
        payload.fill(0);
      }
    },
    open({ reference, keyId: storedKeyId, iv, authTag, encryptedPayload } = {}) {
      const match = REFERENCE.exec(clean(reference));
      if (!match || !UUID.test(match[1]) || !UUID.test(match[2]) || clean(storedKeyId) !== safeKeyId) throw new Error('A referência protegida do certificado não pôde ser confirmada.');
      const safeIv = Buffer.from(iv || []);
      const safeTag = Buffer.from(authTag || []);
      const safePayload = Buffer.from(encryptedPayload || []);
      if (safeIv.byteLength !== IV_BYTES || safeTag.byteLength !== TAG_BYTES || safePayload.byteLength < 1 || safePayload.byteLength > MAX_PKCS12_BYTES + 1024) {
        throw new Error('O conteúdo protegido do certificado é inválido.');
      }
      let decrypted;
      try {
        const decipher = createDecipheriv('aes-256-gcm', encryptionKey, safeIv, { authTagLength: TAG_BYTES });
        decipher.setAAD(aad(clean(reference), safeKeyId));
        decipher.setAuthTag(safeTag);
        decrypted = Buffer.concat([decipher.update(safePayload), decipher.final()]);
        return unpack(decrypted);
      } finally {
        decrypted?.fill(0);
        safeIv.fill(0);
        safeTag.fill(0);
        safePayload.fill(0);
      }
    },
  });
}

function mapSummary(row) {
  if (!row) return null;
  const validationEvidence = row.validation_evidence && typeof row.validation_evidence === 'object' && !Array.isArray(row.validation_evidence)
    ? row.validation_evidence
    : null;
  return Object.freeze({
    id: row.id,
    companyId: row.company_id,
    documentType: row.document_type,
    mode: row.mode,
    status: row.status,
    fingerprint: row.fingerprint_sha256,
    subjectDocument: row.subject_document,
    validFrom: row.valid_from instanceof Date ? row.valid_from.toISOString() : String(row.valid_from || ''),
    validTo: row.valid_to instanceof Date ? row.valid_to.toISOString() : String(row.valid_to || ''),
    installedAt: row.installed_at instanceof Date ? row.installed_at.toISOString() : String(row.installed_at || ''),
    activatedAt: row.activated_at instanceof Date ? row.activated_at.toISOString() : String(row.activated_at || ''),
    validationCheckedAt: row.validation_checked_at instanceof Date ? row.validation_checked_at.toISOString() : String(row.validation_checked_at || ''),
    blockers: Object.freeze(Array.isArray(validationEvidence?.blockers)
      ? validationEvidence.blockers.map(clean).filter(Boolean).slice(0, 12)
      : []),
  });
}

export function createPostgresNfeCertificateProtectedRepository({ pool, cipher } = {}) {
  if (!pool?.query) throw new TypeError('Informe o pool PostgreSQL server-side.');
  if (!cipher?.seal || !cipher?.open) throw new TypeError('Informe o cifrador protegido do certificado.');
  const loadByStatuses = async (reference, statuses) => {
    const match = REFERENCE.exec(clean(reference));
    if (!match || !UUID.test(match[1]) || !UUID.test(match[2])) throw new Error('A referência protegida do certificado é inválida.');
    const result = await pool.query(`
      select secure_reference,key_id,iv,auth_tag,encrypted_payload
      from fiscal_private.certificates where company_id=$1 and id=$2 and document_type='nfe' and status=any($3::text[]) limit 1
    `, [match[1], match[2], statuses]);
    const row = result.rows?.[0];
    if (!row) throw new Error('O certificado protegido não foi localizado.');
    return cipher.open({ reference: row.secure_reference, keyId: row.key_id, iv: row.iv, authTag: row.auth_tag, encryptedPayload: row.encrypted_payload });
  };
  return Object.freeze({
    configured: true,
    async install({ companyId, certificateId, actorId, pkcs12, passphrase, metadata } = {}) {
      const reference = certificateReference(companyId, certificateId);
      const sealed = cipher.seal({ companyId, certificateId, pkcs12, passphrase });
      const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
      try {
        await client.query('begin');
        const previous = await client.query(`select id from fiscal_private.certificates where company_id=$1 and document_type='nfe' and status in ('pending_validation','active') for update`, [companyId]);
        await client.query(`update fiscal_private.certificates set status='replaced', replaced_at=now() where company_id=$1 and document_type='nfe' and status in ('pending_validation','active')`, [companyId]);
        const inserted = await client.query(`
          insert into fiscal_private.certificates (
            id,company_id,document_type,mode,status,secure_reference,key_id,iv,auth_tag,encrypted_payload,
            fingerprint_sha256,subject_document,valid_from,valid_to,installed_by
          ) values ($1,$2,'nfe','a1','pending_validation',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
          returning id,company_id,document_type,mode,status,fingerprint_sha256,subject_document,valid_from,valid_to,installed_at,activated_at,validation_checked_at,validation_evidence
        `, [certificateId, companyId, reference, sealed.keyId, sealed.iv, sealed.authTag, sealed.encryptedPayload, metadata.fingerprint, metadata.subjectDocument, metadata.validFrom, metadata.validTo, actorId]);
        await client.query(`
          insert into fiscal_private.certificate_events (company_id,certificate_id,event_type,actor_id,public_payload)
          values ($1,$2,$3,$4,$5::jsonb)
        `, [companyId, certificateId, previous.rowCount ? 'certificate.replaced' : 'certificate.installed', actorId, JSON.stringify({ documentType: 'nfe', mode: 'a1', fingerprint: metadata.fingerprint, validTo: metadata.validTo })]);
        await client.query('commit');
        return { summary: mapSummary(inserted.rows?.[0]), reference, replaced: previous.rowCount > 0 };
      } catch (error) {
        await client.query('rollback').catch(() => null);
        throw error;
      } finally {
        sealed.iv.fill(0);
        sealed.authTag.fill(0);
        sealed.encryptedPayload.fill(0);
        if (client !== pool) client.release();
      }
    },
    async getActiveSummary({ companyId } = {}) {
      const result = await pool.query(`
        select id,company_id,document_type,mode,status,fingerprint_sha256,subject_document,valid_from,valid_to,installed_at,activated_at,validation_checked_at,validation_evidence
        from fiscal_private.certificates where company_id=$1 and document_type='nfe' and status in ('pending_validation','active')
        order by installed_at desc limit 1
      `, [companyId]);
      return mapSummary(result.rows?.[0]);
    },
    async getActiveBinding({ companyId } = {}) {
      const result = await pool.query(`select secure_reference from fiscal_private.certificates where company_id=$1 and document_type='nfe' and status='active' limit 1`, [companyId]);
      return result.rows?.[0]?.secure_reference ? { secureReference: result.rows[0].secure_reference, expectedMode: 'Certificado A1' } : null;
    },
    async getPendingBinding({ companyId, certificateId } = {}) {
      const values = [companyId];
      const certificateFilter = certificateId ? 'and id=$2' : '';
      if (certificateId) values.push(certificateId);
      const result = await pool.query(`
        select id,company_id,document_type,mode,status,secure_reference,fingerprint_sha256,subject_document,valid_from,valid_to,installed_at,activated_at,validation_checked_at,validation_evidence
        from fiscal_private.certificates where company_id=$1 ${certificateFilter} and document_type='nfe' and status='pending_validation'
        order by installed_at desc limit 1
      `, values);
      const row = result.rows?.[0];
      return row ? { certificateId: row.id, secureReference: row.secure_reference, expectedMode: 'Certificado A1', summary: mapSummary(row) } : null;
    },
    async activate({ companyId, certificateId, actorId, evidence } = {}) {
      const requiredEvidence = ['ownerVerified', 'validityVerified', 'keyUsageVerified', 'chainVerified', 'rootPinned', 'revocationVerified', 'signingAvailable', 'mutualTlsAvailable'];
      const fingerprint = clean(evidence?.fingerprint).replace(/[^a-f0-9]/gi, '').toLowerCase();
      if (!UUID.test(clean(companyId)) || !UUID.test(clean(certificateId)) || !UUID.test(clean(actorId))
        || !evidence || requiredEvidence.some((key) => evidence[key] !== true) || !/^[a-f0-9]{64}$/.test(fingerprint)) {
        throw new TypeError('As evidências de ativação do certificado são inválidas.');
      }
      const publicEvidence = {
        checkedAt: clean(evidence.checkedAt), ownerVerified: true, validityVerified: true,
        keyUsageVerified: true, chainVerified: true, rootPinned: true, revocationVerified: true,
        signingAvailable: true, mutualTlsAvailable: true, keyType: clean(evidence.keyType).slice(0, 20),
        keyBits: Number.isSafeInteger(evidence.keyBits) ? evidence.keyBits : 0, fingerprint,
      };
      const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
      try {
        await client.query('begin');
        const current = await client.query(`
          select id,company_id,document_type,mode,status,fingerprint_sha256,subject_document,valid_from,valid_to,installed_at,activated_at,validation_checked_at,validation_evidence
          from fiscal_private.certificates where company_id=$1 and id=$2 and document_type='nfe' for update
        `, [companyId, certificateId]);
        const row = current.rows?.[0];
        if (!row || !['pending_validation', 'active'].includes(row.status) || clean(row.fingerprint_sha256) !== fingerprint) throw new Error('O certificado pendente mudou durante a validação.');
        if (row.status === 'active') {
          await client.query('commit');
          return { summary: mapSummary(row), reused: true };
        }
        const updated = await client.query(`
          update fiscal_private.certificates set status='active',validation_checked_at=$3,activated_at=$3,validation_evidence=$4::jsonb
          where company_id=$1 and id=$2 and status='pending_validation'
          returning id,company_id,document_type,mode,status,fingerprint_sha256,subject_document,valid_from,valid_to,installed_at,activated_at,validation_checked_at,validation_evidence
        `, [companyId, certificateId, publicEvidence.checkedAt, JSON.stringify(publicEvidence)]);
        if (updated.rowCount !== 1) throw new Error('O certificado não pôde ser ativado de forma atômica.');
        await client.query(`
          insert into fiscal_private.certificate_events (company_id,certificate_id,event_type,actor_id,public_payload)
          values ($1,$2,'certificate.activated',$3,$4::jsonb)
        `, [companyId, certificateId, actorId, JSON.stringify(publicEvidence)]);
        await client.query('commit');
        return { summary: mapSummary(updated.rows[0]), reused: false };
      } catch (error) {
        await client.query('rollback').catch(() => null);
        throw error;
      } finally {
        if (client !== pool) client.release();
      }
    },
    async recordValidation({ companyId, certificateId, actorId, evidence } = {}) {
      const checkedAt = new Date(clean(evidence?.checkedAt));
      if (!UUID.test(clean(companyId)) || !UUID.test(clean(certificateId)) || !UUID.test(clean(actorId)) || !Number.isFinite(checkedAt.getTime())) {
        throw new TypeError('A validação pendente do certificado é inválida.');
      }
      const blockerPattern = /^AV-NFE-[A-Z0-9-]{3,80}$/;
      const publicEvidence = {
        checkedAt: checkedAt.toISOString(),
        ownerVerified: evidence?.ownerVerified === true,
        validityVerified: evidence?.validityVerified === true,
        keyUsageVerified: evidence?.keyUsageVerified === true,
        chainVerified: evidence?.chainVerified === true,
        rootPinned: evidence?.rootPinned === true,
        revocationVerified: evidence?.revocationVerified === true,
        signingAvailable: evidence?.signingAvailable === true,
        mutualTlsAvailable: evidence?.mutualTlsAvailable === true,
        keyType: clean(evidence?.keyType).slice(0, 20),
        keyBits: Number.isSafeInteger(evidence?.keyBits) ? evidence.keyBits : 0,
        fingerprint: /^[a-f0-9]{64}$/i.test(clean(evidence?.fingerprint)) ? clean(evidence.fingerprint).toLowerCase() : '',
        blockers: Object.freeze(Array.isArray(evidence?.blockers)
          ? [...new Set(evidence.blockers.map(clean).filter((code) => blockerPattern.test(code)))].slice(0, 12)
          : []),
      };
      const client = typeof pool.connect === 'function' ? await pool.connect() : pool;
      try {
        await client.query('begin');
        const updated = await client.query(`
          update fiscal_private.certificates set validation_checked_at=$3,validation_evidence=$4::jsonb
          where company_id=$1 and id=$2 and document_type='nfe' and status='pending_validation'
          returning id,company_id,document_type,mode,status,fingerprint_sha256,subject_document,valid_from,valid_to,installed_at,activated_at,validation_checked_at,validation_evidence
        `, [companyId, certificateId, publicEvidence.checkedAt, JSON.stringify(publicEvidence)]);
        if (updated.rowCount !== 1) throw new Error('O certificado pendente mudou durante a validação.');
        await client.query(`
          insert into fiscal_private.certificate_events (company_id,certificate_id,event_type,actor_id,public_payload)
          values ($1,$2,'certificate.blocked',$3,$4::jsonb)
        `, [companyId, certificateId, actorId, JSON.stringify({ checkedAt: publicEvidence.checkedAt, blockers: publicEvidence.blockers })]);
        await client.query('commit');
        return { summary: mapSummary(updated.rows[0]) };
      } catch (error) {
        await client.query('rollback').catch(() => null);
        throw error;
      } finally {
        if (client !== pool) client.release();
      }
    },
    loadForValidation(reference) {
      return loadByStatuses(reference, ['pending_validation', 'active']);
    },
    async load(reference) {
      return loadByStatuses(reference, ['active']);
    },
  });
}

export function createNfeCertificateSecretLoader(repository) {
  return Object.freeze({ configured: Boolean(repository?.configured && repository?.load), load: (reference) => repository.load(reference) });
}

export function createNfeCertificateValidationLoader(repository) {
  return Object.freeze({ configured: Boolean(repository?.configured && repository?.loadForValidation), load: (reference) => repository.loadForValidation(reference) });
}
