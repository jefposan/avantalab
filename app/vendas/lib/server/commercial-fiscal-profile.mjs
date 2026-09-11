const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOCUMENTS = ['nfe', 'nfce', 'nfse'];
const issue = (code, field, message) => ({ code, field, message });
const coded = (code) => Object.assign(new Error(code), { code });

function accessError(context, write = false) {
  if (!context || !UUID.test(String(context.companyId || '')) || !UUID.test(String(context.actorId || ''))) return issue('AV-FISCAL-PROFILE-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  if (context.moduleId && context.moduleId !== 'vendas') return issue('AV-FISCAL-PROFILE-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  const permissions = context.effectivePermissions || {};
  const allowed = write ? permissions['settings.edit'] === true || permissions['fiscal.configure'] === true : permissions['settings.view'] === true || permissions['fiscal.view'] === true;
  if (!context.active || !context.moduleActive || !allowed) return issue('AV-FISCAL-PROFILE-PERMISSION', 'permission', write ? 'Seu acesso não permite configurar os documentos fiscais da empresa.' : 'Seu acesso não permite consultar a configuração fiscal da empresa.');
  return null;
}

export function normalizeCommercialFiscalProfile(input = {}) {
  const requestedScope = Array.isArray(input.documentScope) ? input.documentScope : [];
  const documentScope = [...new Set(requestedScope.filter((item) => DOCUMENTS.includes(item)))];
  const environment = input.environment === 'producao' ? 'producao' : 'homologacao';
  const defaultDocument = documentScope.includes(input.defaultDocument) ? input.defaultDocument : documentScope[0] || 'nenhum';
  const errors = [];
  if (!documentScope.length) errors.push(issue('AV-FISCAL-PROFILE-DOCUMENTS', 'documentScope', 'Selecione ao menos um tipo de nota utilizado pela empresa.'));
  if (requestedScope.some((item) => !DOCUMENTS.includes(item))) errors.push(issue('AV-FISCAL-PROFILE-DOCUMENTS', 'documentScope', 'A configuração contém um tipo de nota fiscal desconhecido.'));
  if (input.defaultDocument && !documentScope.includes(input.defaultDocument)) errors.push(issue('AV-FISCAL-PROFILE-DEFAULT', 'defaultDocument', 'O documento padrão precisa estar entre os tipos utilizados pela empresa.'));
  if (input.environment && !['homologacao', 'producao'].includes(input.environment)) errors.push(issue('AV-FISCAL-PROFILE-ENVIRONMENT', 'environment', 'O ambiente fiscal informado é inválido.'));
  if (input.environment === 'producao') errors.push(issue('AV-FISCAL-PROFILE-ENVIRONMENT', 'environment', 'A produção só pode ser liberada após a homologação formal dos conectores da empresa.'));
  return { profile: { documentScope, defaultDocument, environment }, errors };
}

function mapRow(row) {
  if (!row) return null;
  return Object.freeze({
    documentScope: Array.isArray(row.documentos_habilitados) ? row.documentos_habilitados : [],
    defaultDocument: row.documento_padrao || 'nenhum', environment: row.ambiente_fiscal,
    version: Number(row.versao || 0), updatedAt: row.atualizado_em ? new Date(row.atualizado_em).toISOString() : '',
  });
}

export function createPostgresCommercialFiscalProfileRepository({ pool } = {}) {
  if (!pool?.query) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async get({ companyId }) {
      const result = await pool.query('select * from public.vendas_fiscal_perfis where empresa_id=$1 limit 1', [companyId]);
      return mapRow(result.rows[0]);
    },
    async save({ companyId, actorId, expectedVersion, profile }) {
      const result = await pool.query(`
        insert into public.vendas_fiscal_perfis(empresa_id,documentos_habilitados,documento_padrao,ambiente_fiscal,versao,atualizado_por)
        select $1,$2::text[],$3,$4,1,$5 where $6=0
        on conflict (empresa_id) do update set
          documentos_habilitados=excluded.documentos_habilitados,documento_padrao=excluded.documento_padrao,
          ambiente_fiscal=excluded.ambiente_fiscal,atualizado_por=excluded.atualizado_por
        where public.vendas_fiscal_perfis.versao=$6
        returning *
      `, [companyId, profile.documentScope, profile.defaultDocument, profile.environment, actorId, expectedVersion]);
      if (!result.rows[0]) throw coded('AV-FISCAL-PROFILE-CONFLICT');
      return mapRow(result.rows[0]);
    },
  });
}

export function createCommercialFiscalProfileService({ repository } = {}) {
  if (!repository?.get || !repository?.save) throw new TypeError('Informe o repositório do perfil fiscal.');
  return Object.freeze({
    async get({ context }) {
      const error = accessError(context, false);
      if (error) return { ok: false, errors: [error] };
      return { ok: true, canWrite: !accessError(context, true), profile: await repository.get({ companyId: context.companyId }) };
    },
    async save({ context, expectedVersion, input }) {
      const error = accessError(context, true);
      if (error) return { ok: false, errors: [error] };
      const normalized = normalizeCommercialFiscalProfile(input);
      if (normalized.errors.length) return { ok: false, errors: normalized.errors };
      try {
        const profile = await repository.save({ companyId: context.companyId, actorId: context.actorId, expectedVersion, profile: normalized.profile });
        return { ok: true, profile };
      } catch (failure) {
        if (failure?.code === 'AV-FISCAL-PROFILE-CONFLICT') return { ok: false, errors: [issue('AV-FISCAL-PROFILE-CONFLICT', 'version', 'A configuração fiscal foi alterada em outro acesso. Recarregue e tente novamente.')] };
        throw failure;
      }
    },
  });
}
