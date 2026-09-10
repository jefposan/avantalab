'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buscarEmpresasDoUsuario } from '@/app/lib/database';
import { supabase } from '@/app/lib/supabase';
import type { CatalogoVendasDTO } from '@/app/modules/vendas/types';
import { CODIGOS_PERMISSOES_VENDAS } from '@/app/modules/vendas/permissions';

type EmpresaLab = { id: string; nome?: string; empresa_nome?: string; tipo_perfil?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FISCAL_STATUS_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_STATUS_REQUEST_V1';
const FISCAL_STATUS_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_STATUS_RESPONSE_V1';
const FISCAL_DOWNLOAD_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_DOWNLOAD_REQUEST_V1';
const FISCAL_DOWNLOAD_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_DOWNLOAD_RESPONSE_V1';
const FISCAL_PREPARE_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_PREPARE_REQUEST_V1';
const FISCAL_PREPARE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_PREPARE_RESPONSE_V1';
const FISCAL_VALIDATE_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_VALIDATE_REQUEST_V1';
const FISCAL_VALIDATE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_VALIDATE_RESPONSE_V1';
const FISCAL_NUMBER_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_NUMBER_REQUEST_V1';
const FISCAL_NUMBER_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_NUMBER_RESPONSE_V1';
const FISCAL_ISSUE_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_ISSUE_REQUEST_V1';
const FISCAL_ISSUE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_ISSUE_RESPONSE_V1';
const FISCAL_CORRECTION_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_CORRECTION_REQUEST_V1';
const FISCAL_CORRECTION_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_CORRECTION_RESPONSE_V1';
const FISCAL_CANCELLATION_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_CANCELLATION_REQUEST_V1';
const FISCAL_CANCELLATION_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_CANCELLATION_RESPONSE_V1';
const FISCAL_CERTIFICATE_STATUS_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_STATUS_REQUEST_V1';
const FISCAL_CERTIFICATE_STATUS_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_STATUS_RESPONSE_V1';
const FISCAL_CERTIFICATE_INSTALL_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_INSTALL_REQUEST_V1';
const FISCAL_CERTIFICATE_INSTALL_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_INSTALL_RESPONSE_V1';
const FISCAL_RULES_READY_TYPE = 'AVANTALAB_VENDAS_FISCAL_RULES_READY_V1';
const FISCAL_RULES_SNAPSHOT_TYPE = 'AVANTALAB_VENDAS_FISCAL_RULES_SNAPSHOT_V1';
const FISCAL_RULES_SAVE_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_RULES_SAVE_REQUEST_V1';
const FISCAL_RULES_SAVE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_RULES_SAVE_RESPONSE_V1';
const FISCAL_DOCUMENTS_MESSAGE_TYPE = 'AVANTALAB_VENDAS_FISCAL_DOCUMENTS_V1';
const COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE = 'AVANTALAB_VENDAS_ORDER_WORKFLOW_REQUEST_V1';
const COMMERCIAL_ORDER_WORKFLOW_RESPONSE_TYPE = 'AVANTALAB_VENDAS_ORDER_WORKFLOW_RESPONSE_V1';
const ACCESS_READY_MESSAGE_TYPE = 'AVANTALAB_VENDAS_ACCESS_READY_V1';
const ACCESS_SNAPSHOT_MESSAGE_TYPE = 'AVANTALAB_VENDAS_ACCESS_SNAPSHOT_V1';
const ACCESS_SAVE_REQUEST_MESSAGE_TYPE = 'AVANTALAB_VENDAS_ACCESS_SAVE_REQUEST_V1';
const ACCESS_SAVE_RESPONSE_MESSAGE_TYPE = 'AVANTALAB_VENDAS_ACCESS_SAVE_RESPONSE_V1';
const ESCRITA_PERMISSOES_LAB_HABILITADA = process.env.NEXT_PUBLIC_VENDAS_LAB_PERMISSION_WRITES === 'true';
const PERFIS_MODULO = ['gestor_master', 'administrador', 'operador_completo', 'operador_simples'] as const;
const PERMISSOES_VENDAS = new Set(CODIGOS_PERMISSOES_VENDAS);

function requestIdValido(value: unknown) {
  return typeof value === 'string' && /^[A-Za-z0-9:_-]{8,120}$/.test(value);
}

function perfilModuloParaTela(perfil: string) {
  return perfil === 'gestor_master' ? 'gestor' : perfil;
}

function normalizarSnapshotPermissoes(payload: Record<string, any>, writable: boolean) {
  const padroes = payload.padroes && typeof payload.padroes === 'object' ? payload.padroes : {};
  const excecoesPerfis = Array.isArray(payload.excecoesPerfis) ? payload.excecoesPerfis : [];
  const excecoesUsuarios = Array.isArray(payload.excecoesUsuarios) ? payload.excecoesUsuarios : [];
  const pessoas = Array.isArray(payload.usuarios) ? payload.usuarios : [];
  const permissionCodes = [...PERMISSOES_VENDAS];
  const roles = PERFIS_MODULO.map((profile) => {
    const allowed = new Set(Array.isArray(padroes[profile]) ? padroes[profile].filter((code: unknown) => typeof code === 'string' && PERMISSOES_VENDAS.has(code)) : []);
    for (const row of excecoesPerfis) {
      if (row?.profile !== profile || !PERMISSOES_VENDAS.has(String(row?.permission_code || ''))) continue;
      if (row.decision === 'allow') allowed.add(row.permission_code);
      if (row.decision === 'deny') allowed.delete(row.permission_code);
    }
    return { id: perfilModuloParaTela(profile), permissions: permissionCodes.filter((code) => allowed.has(code)) };
  });
  const users = pessoas.flatMap((person: Record<string, unknown>) => {
    const id = String(person.user_id || '');
    const profile = String(person.perfil || '');
    if (!UUID_PATTERN.test(id) || !PERFIS_MODULO.includes(profile as (typeof PERFIS_MODULO)[number])) return [];
    const overrides = Object.fromEntries(excecoesUsuarios.flatMap((row: Record<string, unknown>) => {
      const permission = String(row.permission_code || '');
      if (row.user_id !== id || !PERMISSOES_VENDAS.has(permission) || !['allow', 'deny'].includes(String(row.decision || ''))) return [];
      return [[permission, row.decision === 'allow' ? 'permitir' : 'bloquear']];
    }));
    return [{
      id,
      name: String(person.nome || person.login || person.email || 'Usuário').slice(0, 100),
      email: String(person.email || '').slice(0, 160),
      roleId: perfilModuloParaTela(profile),
      sector: 'Geral',
      active: person.status === 'ativo',
      overrides,
    }];
  });
  const userNames = new Map(users.map((user: { id: string; name: string }) => [user.id, user.name]));
  const audit = (Array.isArray(payload.auditoria) ? payload.auditoria : []).slice(0, 100).map((row: Record<string, unknown>) => ({
    id: String(row.id || ''),
    at: String(row.occurred_at || ''),
    actor: userNames.get(String(row.actor_id || '')) || 'Administrador',
    summary: `${row.target_type === 'profile' ? 'Perfil' : 'Usuário'} · ${String(row.permission_code || '')} · ${String(row.new_decision || 'inherit')}`,
  }));
  return { available: true, writable, message: writable ? 'Permissões conectadas à API protegida da Gestão.' : 'Consulta protegida ativa. A escrita remota permanece desligada neste laboratório.', roles, users, audit };
}

function analisarAlteracoesPermissoes(data: any) {
  if (!data || data.type !== ACCESS_SAVE_REQUEST_MESSAGE_TYPE || !requestIdValido(data.requestId) || !Array.isArray(data.changes) || data.changes.length > 400) return null;
  const changes = data.changes.flatMap((change: Record<string, unknown>) => {
    const targetType = String(change.targetType || '');
    const targetId = String(change.targetId || '');
    const permission = String(change.permission || '');
    const decision = String(change.decision || '');
    const validTarget = targetType === 'role'
      ? ['gestor', 'administrador', 'operador_completo', 'operador_simples'].includes(targetId)
      : targetType === 'user' && UUID_PATTERN.test(targetId);
    if (!validTarget || !PERMISSOES_VENDAS.has(permission) || !['allow', 'deny', 'inherit'].includes(decision)) return [];
    return [{ targetType, targetId, permission, decision }];
  });
  return changes.length === data.changes.length ? { requestId: data.requestId as string, changes } : null;
}

function analisarPublicacaoRegrasFiscais(data: any) {
  if (!data || data.type !== FISCAL_RULES_SAVE_REQUEST_TYPE || !requestIdValido(data.requestId)
    || !Number.isInteger(data.expectedVersion) || data.expectedVersion < 0
    || !data.matrix || typeof data.matrix !== 'object' || !Array.isArray(data.matrix.rules)
    || !data.matrix.rules.length || data.matrix.rules.length > 100) return null;
  return {
    requestId: data.requestId as string,
    idempotencyKey: data.requestId as string,
    expectedVersion: data.expectedVersion as number,
    matrix: data.matrix,
    documentScope: Array.isArray(data.documentScope) ? data.documentScope : [],
    fiscalResponsible: String(data.fiscalResponsible || '').slice(0, 160),
    reviewedAt: String(data.reviewedAt || '').slice(0, 40),
    taxReviewConfirmed: data.taxReviewConfirmed === true,
    taxReformReviewConfirmed: data.taxReformReviewConfirmed === true,
  };
}

export default function VendasCatalogoLab() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [empresas, setEmpresas] = useState<EmpresaLab[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [tabelaPrecoId, setTabelaPrecoId] = useState('');
  const [catalogo, setCatalogo] = useState<CatalogoVendasDTO | null>(null);
  const [documentosFiscais, setDocumentosFiscais] = useState<unknown[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [iframePronto, setIframePronto] = useState(false);
  const origemPrototipo = useMemo(() => typeof window === 'undefined'
    ? 'http://localhost:3015'
    : `${window.location.protocol}//${window.location.hostname}:3015`, []);

  const enviarCatalogo = useCallback(() => {
    if (!catalogo || !iframePronto || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({
      type: 'AVANTALAB_VENDAS_CATALOGO_V1',
      catalogo,
    }, origemPrototipo);
  }, [catalogo, iframePronto, origemPrototipo]);

  const enviarDocumentosFiscais = useCallback(() => {
    if (!iframePronto || !iframeRef.current?.contentWindow || !UUID_PATTERN.test(empresaId)) return;
    iframeRef.current.contentWindow.postMessage({
      type: FISCAL_DOCUMENTS_MESSAGE_TYPE,
      companyId: empresaId,
      documents: documentosFiscais,
    }, origemPrototipo);
  }, [documentosFiscais, empresaId, iframePronto, origemPrototipo]);

  const carregarDocumentosFiscais = useCallback(async (perfilId: string, token: string) => {
    if (!UUID_PATTERN.test(perfilId)) { setDocumentosFiscais([]); return; }
    try {
      const parametros = new URLSearchParams({ companyId: perfilId });
      const resposta = await fetch(`/api/modulos/vendas/fiscal/documents?${parametros}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await resposta.json().catch(() => ({}));
      setDocumentosFiscais(resposta.ok && json.ok === true && Array.isArray(json.documents) ? json.documents : []);
    } catch {
      setDocumentosFiscais([]);
    }
  }, []);

  const carregarPermissoes = useCallback(async (perfilId: string) => {
    const destination = iframeRef.current?.contentWindow;
    if (!destination || !UUID_PATTERN.test(perfilId)) return false;
    const send = (snapshot: Record<string, unknown>) => destination.postMessage({ type: ACCESS_SNAPSHOT_MESSAGE_TYPE, snapshot }, origemPrototipo);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { send({ available: false, writable: false, message: 'Confirme novamente sua sessão na Gestão.' }); return false; }
      const params = new URLSearchParams({ empresaId: perfilId, moduloId: 'vendas' });
      const response = await fetch(`/api/modulos/permissoes?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok !== true) {
        send({ available: false, writable: false, message: payload.mensagem || 'A matriz protegida ainda não está disponível neste perfil.' });
        return false;
      }
      send(normalizarSnapshotPermissoes(payload, ESCRITA_PERMISSOES_LAB_HABILITADA));
      return true;
    } catch {
      send({ available: false, writable: false, message: 'Não foi possível consultar as permissões na Gestão.' });
      return false;
    }
  }, [origemPrototipo]);

  const carregarRegrasFiscais = useCallback(async (perfilId: string) => {
    const destination = iframeRef.current?.contentWindow;
    if (!destination || !UUID_PATTERN.test(perfilId)) return false;
    const send = (snapshot: Record<string, unknown>) => destination.postMessage({ type: FISCAL_RULES_SNAPSHOT_TYPE, snapshot }, origemPrototipo);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { send({ available: false, writable: false, message: 'Confirme novamente sua sessão na Gestão.', configuration: null }); return false; }
      const params = new URLSearchParams({ companyId: perfilId });
      const response = await fetch(`/api/modulos/vendas/fiscal/rules?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok !== true) {
        send({ available: false, writable: false, message: payload.message || 'A publicação protegida das regras fiscais ainda não está disponível.', configuration: null });
        return false;
      }
      const published = payload.configuration && typeof payload.configuration === 'object' ? payload.configuration : null;
      send({
        available: true,
        writable: payload.writable === true,
        message: published ? `Versão ${Number(published.version)} publicada e ativa no servidor.` : 'Nenhuma regra fiscal foi publicada para esta empresa.',
        configuration: published,
      });
      return true;
    } catch {
      send({ available: false, writable: false, message: 'Não foi possível consultar as regras fiscais na Gestão.', configuration: null });
      return false;
    }
  }, [origemPrototipo]);

  const carregarCatalogo = useCallback(async (perfilId: string, tabelaId = '') => {
    if (!perfilId) return;
    setCarregando(true);
    setErro('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Entre na Gestão para utilizar o laboratório integrado.');
      await Promise.all([
        carregarDocumentosFiscais(perfilId, token),
        carregarPermissoes(perfilId),
        carregarRegrasFiscais(perfilId),
      ]);
      const parametros = new URLSearchParams({ empresaId: perfilId });
      if (tabelaId) parametros.set('tabelaPrecoId', tabelaId);
      const resposta = await fetch(`/api/modulos/vendas/catalogo?${parametros}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível carregar o catálogo de Custos.');
      const proximo = json.catalogo as CatalogoVendasDTO;
      setCatalogo(proximo);
      setTabelaPrecoId(proximo.tabelaPreco?.id || '');
    } catch (falha) {
      setCatalogo(null);
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar o catálogo de Custos.');
    } finally {
      setCarregando(false);
    }
  }, [carregarDocumentosFiscais, carregarPermissoes, carregarRegrasFiscais]);

  useEffect(() => {
    let ativo = true;
    const iniciar = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        if (ativo) { setErro('Entre na Gestão para utilizar o laboratório integrado.'); setCarregando(false); }
        return;
      }
      const perfis: EmpresaLab[] = (await buscarEmpresasDoUsuario(data.session.user.id)).flatMap((item) => item?.id ? [{
        id: String(item.id),
        nome: item.nome ? String(item.nome) : undefined,
        empresa_nome: item.empresa_nome ? String(item.empresa_nome) : undefined,
        tipo_perfil: item.tipo_perfil ? String(item.tipo_perfil) : undefined,
      }] : []);
      if (!ativo) return;
      setEmpresas(perfis);
      const primeiro = perfis[0]?.id || '';
      setEmpresaId(primeiro);
      if (primeiro) await carregarCatalogo(primeiro);
      else { setErro('Nenhum perfil empresarial foi encontrado para esta conta.'); setCarregando(false); }
    };
    void iniciar();
    return () => { ativo = false; };
  }, [carregarCatalogo]);

  useEffect(() => { enviarCatalogo(); }, [enviarCatalogo]);
  useEffect(() => { enviarDocumentosFiscais(); }, [enviarDocumentosFiscais]);

  useEffect(() => {
    const receber = (event: MessageEvent) => {
      if (event.origin !== origemPrototipo || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'AVANTALAB_VENDAS_CATALOGO_READY_V1') { setIframePronto(true); return; }
      if (event.data?.type === ACCESS_READY_MESSAGE_TYPE) { void carregarPermissoes(empresaId); return; }
      if (event.data?.type === FISCAL_RULES_READY_TYPE) { void carregarRegrasFiscais(empresaId); return; }
      if (event.data?.type === ACCESS_SAVE_REQUEST_MESSAGE_TYPE) {
        const request = analisarAlteracoesPermissoes(event.data);
        const destination = iframeRef.current?.contentWindow;
        if (!request || !destination) return;
        const respond = (ok: boolean, message: string) => destination.postMessage({ type: ACCESS_SAVE_RESPONSE_MESSAGE_TYPE, requestId: request.requestId, ok, message }, origemPrototipo);
        const save = async () => {
          if (!ESCRITA_PERMISSOES_LAB_HABILITADA) {
            respond(false, 'A escrita remota está desligada. Valide as alterações no PostgreSQL local antes de habilitar este laboratório.');
            return;
          }
          if (!UUID_PATTERN.test(empresaId)) { respond(false, 'Selecione um perfil empresarial válido.'); return; }
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) { respond(false, 'Confirme novamente sua sessão na Gestão.'); return; }
            for (const change of request.changes) {
              const response = await fetch('/api/modulos/permissoes', {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  empresaId,
                  moduloId: 'vendas',
                  tipoAlvo: change.targetType === 'role' ? 'perfil' : 'usuario',
                  alvoId: change.targetType === 'role' && change.targetId === 'gestor' ? 'gestor_master' : change.targetId,
                  codigoPermissao: change.permission,
                  decisao: change.decision,
                }),
                cache: 'no-store',
              });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok || payload.ok !== true) {
                await carregarPermissoes(empresaId);
                respond(false, payload.mensagem || 'A Gestão recusou uma das alterações. A matriz foi recarregada.');
                return;
              }
            }
            await carregarPermissoes(empresaId);
            respond(true, `${request.changes.length} ${request.changes.length === 1 ? 'alteração salva e auditada' : 'alterações salvas e auditadas'} pela Gestão.`);
          } catch {
            await carregarPermissoes(empresaId);
            respond(false, 'A conexão com a Gestão foi interrompida. A matriz foi recarregada.');
          }
        };
        void save();
        return;
      }
      if (event.data?.type === FISCAL_RULES_SAVE_REQUEST_TYPE) {
        const publication = analisarPublicacaoRegrasFiscais(event.data);
        const destination = iframeRef.current?.contentWindow;
        if (!publication || !destination) return;
        const respond = (ok: boolean, message: string, configuration: unknown = null) => destination.postMessage({ type: FISCAL_RULES_SAVE_RESPONSE_TYPE, requestId: publication.requestId, ok, message, configuration }, origemPrototipo);
        const publish = async () => {
          if (!UUID_PATTERN.test(empresaId)) { respond(false, 'Selecione um perfil empresarial válido.'); return; }
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) { respond(false, 'Confirme novamente sua sessão na Gestão.'); return; }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/fiscal/rules?${params}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(publication),
              cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true || !payload.configuration) {
              await carregarRegrasFiscais(empresaId);
              respond(false, payload.message || 'A Gestão recusou a publicação. As regras foram recarregadas.');
              return;
            }
            respond(true, `Versão ${Number(payload.configuration.version)} publicada e auditada pela Gestão.`, payload.configuration);
            await carregarRegrasFiscais(empresaId);
          } catch {
            await carregarRegrasFiscais(empresaId);
            respond(false, 'A conexão com a Gestão foi interrompida. As regras foram recarregadas.');
          }
        };
        void publish();
        return;
      }
      if ([FISCAL_CERTIFICATE_STATUS_REQUEST_TYPE, FISCAL_CERTIFICATE_INSTALL_REQUEST_TYPE].includes(event.data?.type)) {
        const requestId = event.data?.requestId;
        const destination = iframeRef.current?.contentWindow;
        const responseType = event.data?.type === FISCAL_CERTIFICATE_INSTALL_REQUEST_TYPE
          ? FISCAL_CERTIFICATE_INSTALL_RESPONSE_TYPE
          : FISCAL_CERTIFICATE_STATUS_RESPONSE_TYPE;
        const responsePort = event.data?.type === FISCAL_CERTIFICATE_INSTALL_REQUEST_TYPE ? event.ports[0] : undefined;
        if (!destination || !requestIdValido(requestId)) return;
        const deliver = (payload: Record<string, unknown>) => {
          if (responsePort) responsePort.postMessage(payload);
          else destination.postMessage(payload, origemPrototipo);
        };
        const fail = (message: string) => deliver({ type: responseType, requestId, ok: false, message });
        const handleCertificate = async () => {
          if (!UUID_PATTERN.test(empresaId)) { fail('Selecione novamente o perfil empresarial.'); return; }
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) { fail('Sua sessão precisa ser confirmada novamente.'); return; }
            const params = new URLSearchParams({ companyId: empresaId });
            if (event.data.type === FISCAL_CERTIFICATE_STATUS_REQUEST_TYPE) {
              const response = await fetch(`/api/modulos/vendas/fiscal/certificate?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
              });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível consultar o certificado digital.'); return; }
              deliver({ type: responseType, requestId, ok: true, certificate: payload.certificate, message: payload.message || '' });
              return;
            }
            const certificate = event.data.certificate;
            const passphrase = event.data.passphrase;
            if (!(certificate instanceof File) || !/\.(?:pfx|p12)$/i.test(certificate.name)
              || certificate.size < 1 || certificate.size > 5 * 1024 * 1024
              || typeof passphrase !== 'string' || passphrase.length < 1 || passphrase.length > 256) {
              fail('Selecione o certificado A1 e informe a senha de importação.');
              return;
            }
            const body = new FormData();
            body.append('certificate', certificate, certificate.name);
            body.append('passphrase', passphrase);
            const response = await fetch(`/api/modulos/vendas/fiscal/certificate?${params}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body,
              cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível instalar o certificado digital.'); return; }
            deliver({ type: responseType, requestId, ok: true, certificate: payload.certificate, message: payload.message || 'Certificado instalado.' });
          } catch {
            fail('A instalação do certificado está temporariamente indisponível.');
          }
        };
        void handleCertificate();
        return;
      }
      if (![FISCAL_STATUS_REQUEST_TYPE, FISCAL_DOWNLOAD_REQUEST_TYPE, FISCAL_PREPARE_REQUEST_TYPE, FISCAL_VALIDATE_REQUEST_TYPE, FISCAL_NUMBER_REQUEST_TYPE, FISCAL_ISSUE_REQUEST_TYPE, FISCAL_CORRECTION_REQUEST_TYPE, FISCAL_CANCELLATION_REQUEST_TYPE, COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE].includes(event.data?.type)) return;
      const responder = async () => {
        const requestId = event.data?.requestId;
        const responseType = event.data?.type === COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE
          ? COMMERCIAL_ORDER_WORKFLOW_RESPONSE_TYPE
          : event.data?.type === FISCAL_STATUS_REQUEST_TYPE
          ? FISCAL_STATUS_RESPONSE_TYPE
          : event.data?.type === FISCAL_PREPARE_REQUEST_TYPE
            ? FISCAL_PREPARE_RESPONSE_TYPE
            : event.data?.type === FISCAL_VALIDATE_REQUEST_TYPE
              ? FISCAL_VALIDATE_RESPONSE_TYPE
              : event.data?.type === FISCAL_NUMBER_REQUEST_TYPE
                ? FISCAL_NUMBER_RESPONSE_TYPE
                : event.data?.type === FISCAL_ISSUE_REQUEST_TYPE
                  ? FISCAL_ISSUE_RESPONSE_TYPE
                  : event.data?.type === FISCAL_CORRECTION_REQUEST_TYPE
                    ? FISCAL_CORRECTION_RESPONSE_TYPE
                    : event.data?.type === FISCAL_CANCELLATION_REQUEST_TYPE
                      ? FISCAL_CANCELLATION_RESPONSE_TYPE
            : FISCAL_DOWNLOAD_RESPONSE_TYPE;
        const destination = iframeRef.current?.contentWindow;
        if (!destination || !requestIdValido(requestId) || !UUID_PATTERN.test(empresaId)) return;
        const responsePort = event.data?.type === FISCAL_ISSUE_REQUEST_TYPE ? event.ports[0] : undefined;
        const deliver = (payload: Record<string, unknown>) => {
          if (responsePort) responsePort.postMessage(payload);
          else destination.postMessage(payload, origemPrototipo);
        };
        const fail = (message: string) => deliver({ type: responseType, requestId, ok: false, message });
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (!token) { fail('Sua sessão precisa ser confirmada novamente.'); return; }
          if (event.data.type === COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE) {
            const target = String(event.data.target || '');
            const persistenceKey = String(event.data.persistenceKey || '');
            const operationId = String(event.data.operationId || '');
            if (!['confirmado', 'em_separacao', 'faturado'].includes(target)
              || !requestIdValido(persistenceKey) || (operationId && !UUID_PATTERN.test(operationId))) {
              fail('A solicitação comercial é inválida. Atualize o pedido e tente novamente.');
              return;
            }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/commercial/orders/workflow?${params}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ target, persistenceKey, operationId, customer: event.data.customer, order: event.data.order }),
              cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível persistir o pedido.'); return; }
            destination.postMessage({ type: responseType, requestId, ok: true, customerId: payload.customerId, order: payload.order }, origemPrototipo);
            if (payload.order?.fiscalDraftId) await carregarDocumentosFiscais(empresaId, token);
            return;
          }
          if (event.data.type === FISCAL_STATUS_REQUEST_TYPE) {
            const emissionId = String(event.data.emissionId || '');
            if (!UUID_PATTERN.test(emissionId)) { fail('A consulta fiscal é inválida.'); return; }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/fiscal/status/${encodeURIComponent(emissionId)}?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível atualizar a situação fiscal.'); return; }
            destination.postMessage({ type: responseType, requestId, ok: true, emission: payload.emission }, origemPrototipo);
            return;
          }
          if (event.data.type === FISCAL_PREPARE_REQUEST_TYPE) {
            const draftId = String(event.data.draftId || '');
            if (!UUID_PATTERN.test(draftId)) { fail('A preparação fiscal é inválida.'); return; }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/fiscal/documents/${encodeURIComponent(draftId)}/prepare?${params}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível preparar a emissão fiscal.'); return; }
            destination.postMessage({ type: responseType, requestId, ok: true, emission: payload.emission }, origemPrototipo);
            await carregarDocumentosFiscais(empresaId, token);
            return;
          }
          if (event.data.type === FISCAL_VALIDATE_REQUEST_TYPE) {
            const draftId = String(event.data.draftId || '');
            if (!UUID_PATTERN.test(draftId)) { fail('A validação fiscal é inválida.'); return; }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/fiscal/documents/${encodeURIComponent(draftId)}/validate?${params}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível validar os dados fiscais da NF-e.'); return; }
            destination.postMessage({ type: responseType, requestId, ok: true, emission: payload.emission }, origemPrototipo);
            await carregarDocumentosFiscais(empresaId, token);
            return;
          }
          if (event.data.type === FISCAL_NUMBER_REQUEST_TYPE) {
            const emissionId = String(event.data.emissionId || '');
            const expectedVersion = Number(event.data.expectedVersion);
            if (!UUID_PATTERN.test(emissionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
              fail('Atualize a situação fiscal e tente novamente.');
              return;
            }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/fiscal/documents/${encodeURIComponent(emissionId)}/number?${params}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ expectedVersion }),
              cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível confirmar a emissão da NF-e.'); return; }
            destination.postMessage({ type: responseType, requestId, ok: true, emission: payload.emission }, origemPrototipo);
            await carregarDocumentosFiscais(empresaId, token);
            return;
          }
          if (event.data.type === FISCAL_CORRECTION_REQUEST_TYPE) {
            const emissionId = String(event.data.emissionId || '');
            const expectedVersion = Number(event.data.expectedVersion);
            const rejectedStatusCode = String(event.data.rejectedStatusCode || '');
            const items = Array.isArray(event.data.items) ? event.data.items : [];
            if (!UUID_PATTERN.test(emissionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1
              || !/^\d{3}$/.test(rejectedStatusCode) || !items.length || items.length > 200) {
              fail('Revise os dados fiscais indicados e tente novamente.');
              return;
            }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/fiscal/documents/${encodeURIComponent(emissionId)}/correction?${params}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ expectedVersion, rejectedStatusCode, items }),
              cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível revisar os dados fiscais da NF-e.'); return; }
            destination.postMessage({ type: responseType, requestId, ok: true, emission: payload.emission }, origemPrototipo);
            await carregarDocumentosFiscais(empresaId, token);
            return;
          }
          if (event.data.type === FISCAL_CANCELLATION_REQUEST_TYPE) {
            const emissionId = String(event.data.emissionId || '');
            const expectedVersion = Number(event.data.expectedVersion);
            const justification = String(event.data.justification || '').trim().replace(/\s+/g, ' ');
            if (!UUID_PATTERN.test(emissionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1
              || justification.length < 15 || justification.length > 255) {
              fail('Informe uma justificativa de 15 a 255 caracteres e tente novamente.');
              return;
            }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/fiscal/documents/${encodeURIComponent(emissionId)}/cancel?${params}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ expectedVersion, justification }),
              cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível cancelar a NF-e.'); return; }
            destination.postMessage({ type: responseType, requestId, ok: true, emission: payload.emission }, origemPrototipo);
            await carregarDocumentosFiscais(empresaId, token);
            return;
          }
          if (event.data.type === FISCAL_ISSUE_REQUEST_TYPE) {
            const emissionId = String(event.data.emissionId || '');
            const expectedVersion = Number(event.data.expectedVersion);
            if (!UUID_PATTERN.test(emissionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
              fail('Atualize a situação fiscal e tente novamente.');
              return;
            }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/fiscal/documents/${encodeURIComponent(emissionId)}/continue?${params}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ expectedVersion }),
              cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível continuar a emissão da NF-e.'); return; }
            deliver({ type: responseType, requestId, ok: true, emission: payload.emission });
            await carregarDocumentosFiscais(empresaId, token);
            return;
          }
          const artifactId = String(event.data.artifactId || '');
          const artifactType = String(event.data.artifactType || '');
          if (!UUID_PATTERN.test(artifactId) || !['processed_xml', 'danfe_pdf'].includes(artifactType)) { fail('A solicitação do arquivo fiscal é inválida.'); return; }
          const response = await fetch(`/api/modulos/vendas/fiscal/documents/${encodeURIComponent(artifactId)}/download`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId: empresaId, artifactType }), cache: 'no-store' });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível preparar o arquivo fiscal.'); return; }
          destination.postMessage({ type: responseType, requestId, ok: true, download: payload.download }, origemPrototipo);
        } catch {
          fail('A conexão fiscal está temporariamente indisponível.');
        }
      };
      void responder();
    };
    window.addEventListener('message', receber);
    return () => window.removeEventListener('message', receber);
  }, [carregarDocumentosFiscais, carregarPermissoes, carregarRegrasFiscais, empresaId, origemPrototipo]);

  return <main className="flex min-h-screen flex-col bg-slate-100 text-slate-800">
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 bg-[#003E73] px-4 py-3 text-white shadow-sm md:px-6">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100">Laboratório local</p>
        <h1 className="truncate text-lg font-semibold">Vendas conectado a Custos e Precificação</h1>
      </div>
      <Link href="/gestao" className="inline-flex min-h-11 items-center rounded-xl bg-white/10 px-4 text-sm font-semibold outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white">Voltar à Gestão</Link>
    </header>

    <section className="grid gap-3 bg-white px-4 py-4 shadow-sm md:grid-cols-[minmax(240px,1fr)_minmax(220px,0.8fr)_auto] md:items-end md:px-6" aria-label="Origem do catálogo">
      <label className="grid gap-1 text-xs font-semibold" htmlFor="vendas-lab-perfil">
        Perfil empresarial
        <select id="vendas-lab-perfil" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-600" value={empresaId} onChange={(event) => { const id = event.target.value; setEmpresaId(id); setTabelaPrecoId(''); void carregarCatalogo(id); }}>
          {empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome || empresa.empresa_nome || 'Perfil empresarial'}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold" htmlFor="vendas-lab-tabela">
        Tabela de preços
        <select id="vendas-lab-tabela" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-600" value={tabelaPrecoId} disabled={!catalogo || carregando} onChange={(event) => { const id = event.target.value; setTabelaPrecoId(id); void carregarCatalogo(empresaId, id); }}>
          {(catalogo?.tabelasDisponiveis || []).map((tabela) => <option key={tabela.id} value={tabela.id}>{tabela.nome}{tabela.padrao ? ' · padrão' : ''}</option>)}
        </select>
      </label>
      <button type="button" className="min-h-11 rounded-xl bg-[#003E73] px-5 text-sm font-semibold text-white outline-none transition hover:bg-[#07558f] focus-visible:ring-2 focus-visible:ring-sky-600 disabled:cursor-wait disabled:opacity-60" disabled={!empresaId || carregando} onClick={() => void carregarCatalogo(empresaId, tabelaPrecoId)}>{carregando ? 'Atualizando…' : 'Atualizar catálogo'}</button>
      <p className="text-xs leading-relaxed text-slate-600 md:col-span-3" role="status">
        {erro || (catalogo ? `${catalogo.itens.length} itens publicados · somente leitura · estoque ainda não integrado.` : 'Preparando integração local…')}
      </p>
    </section>

    <section className="min-h-0 flex-1 p-3 md:p-4" aria-label="Protótipo de Vendas e Serviços">
      {!empresaId ? <div className="grid min-h-[50vh] place-items-center rounded-2xl bg-white p-6 text-center shadow-sm"><div><h2 className="text-lg font-semibold">{erro ? 'Integração indisponível' : 'Preparando integração local'}</h2><p className="mt-2 max-w-xl text-sm text-slate-600">{erro || 'Confirmando sua sessão e os perfis empresariais disponíveis.'}</p>{erro ? <Link href="/gestao" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#003E73] px-5 text-sm font-semibold text-white">Abrir Gestão</Link> : null}</div></div> : <iframe ref={iframeRef} src={`${origemPrototipo}/?bridge=gestao-local`} title="Protótipo de Vendas e Serviços com catálogo da Gestão" className="h-[calc(100vh-190px)] min-h-[620px] w-full rounded-2xl bg-white shadow-sm" onLoad={() => setIframePronto(true)} />}
    </section>
  </main>;
}
