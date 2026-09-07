'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import type { CatalogoVendasDTO } from '@/app/modules/vendas/types';
import { CODIGOS_PERMISSOES_VENDAS } from '@/app/modules/vendas/permissions';
import { RECEIVABLE_MOVE_REQUEST_TYPE, RECEIVABLE_MOVE_RESPONSE_TYPE, RECEIVABLE_READY_TYPE, RECEIVABLE_SNAPSHOT_TYPE } from '@/app/vendas/lib/commercial-receivable-bridge.mjs';
import { STOCK_MOVE_REQUEST_TYPE, STOCK_MOVE_RESPONSE_TYPE, STOCK_READY_TYPE, STOCK_SNAPSHOT_TYPE } from '@/app/vendas/lib/commercial-stock-bridge.mjs';
import { COMMERCIAL_SERVICE_WORKFLOW_REQUEST_TYPE, COMMERCIAL_SERVICE_WORKFLOW_RESPONSE_TYPE } from '@/app/vendas/lib/commercial-service-workflow-bridge.mjs';
import { SERVICE_ATTACHMENT_OPEN_REQUEST_TYPE, SERVICE_ATTACHMENT_OPEN_RESPONSE_TYPE, SERVICE_ATTACHMENT_UPLOAD_REQUEST_TYPE, SERVICE_ATTACHMENT_UPLOAD_RESPONSE_TYPE } from '@/app/vendas/lib/commercial-service-attachment-bridge.mjs';
import { CUSTOMER_READY_TYPE, CUSTOMER_SAVE_REQUEST_TYPE, CUSTOMER_SAVE_RESPONSE_TYPE, CUSTOMER_SNAPSHOT_TYPE, OPERATION_READY_TYPE, OPERATION_SAVE_REQUEST_TYPE, OPERATION_SAVE_RESPONSE_TYPE, OPERATION_SNAPSHOT_TYPE, SUPPLIER_READY_TYPE, SUPPLIER_SAVE_REQUEST_TYPE, SUPPLIER_SAVE_RESPONSE_TYPE, SUPPLIER_SNAPSHOT_TYPE } from '@/app/vendas/lib/commercial-party-bridge.mjs';

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
const FISCAL_CERTIFICATE_ACTIVATE_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_ACTIVATE_REQUEST_V1';
const FISCAL_CERTIFICATE_ACTIVATE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_ACTIVATE_RESPONSE_V1';
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
const COMPANY_PROFILE_SAVE_REQUEST_TYPE = 'AVANTALAB_VENDAS_COMPANY_PROFILE_SAVE_REQUEST_V1';
const COMPANY_PROFILE_SAVE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_COMPANY_PROFILE_SAVE_RESPONSE_V1';
const ESCRITA_PERMISSOES_HABILITADA = true;
const PERFIS_MODULO = ['gestor_master', 'administrador', 'operador_completo', 'operador_simples'] as const;
const PERMISSOES_VENDAS = new Set(CODIGOS_PERMISSOES_VENDAS);

async function aguardarComLimite<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function requestIdValido(value: unknown) {
  return typeof value === 'string' && /^[A-Za-z0-9:_-]{8,120}$/.test(value);
}

function perfilComDadosDaEmpresa(perfil: Record<string, unknown>, company: Record<string, unknown>) {
  const cityWithState = String(company.city || '').trim();
  const cityMatch = cityWithState.match(/^(.*?)(?:\/([A-Z]{2}))?$/i);
  const stateRegistration = String(company.stateRegistration || '').trim();
  const municipalRegistration = String(company.municipalRegistration || '').trim();
  const taxRegimeLabel = String(company.taxRegime || '').trim();
  const taxRegime = ({
    'MEI / SIMEI': 'mei_simei',
    'Simples Nacional': 'simples_nacional',
    'Lucro Presumido': 'lucro_presumido',
    'Lucro Real': 'lucro_real',
    'Lucro Arbitrado': 'lucro_arbitrado',
    Imune: 'imune',
    Isenta: 'isenta',
    'Não se aplica': 'nao_aplicavel',
    Outro: 'outro',
  } as Record<string, string>)[taxRegimeLabel] || taxRegimeLabel;
  return {
    ...perfil,
    nome_fantasia: String(company.name || '').trim(),
    razao_social: String(company.legalName || '').trim(),
    tipo_documento: 'cnpj',
    documento: String(company.document || '').replace(/\D/g, '').slice(0, 14),
    cep: String(company.cep || '').replace(/\D/g, '').slice(0, 8),
    rua: String(company.street || '').trim(),
    numero: String(company.number || '').trim(),
    complemento: String(company.complement || '').trim(),
    bairro: String(company.district || '').trim(),
    cidade: String(cityMatch?.[1] || '').trim(),
    estado: String(cityMatch?.[2] || '').toUpperCase(),
    telefone: String(company.phone || '').replace(/\D/g, '').slice(0, 13),
    email_empresa: String(company.email || '').trim().toLowerCase(),
    inscricao_estadual: /^isento$/i.test(stateRegistration) ? '' : stateRegistration,
    inscricao_estadual_isento: /^isento$/i.test(stateRegistration),
    inscricao_municipal: /^isento$/i.test(municipalRegistration) ? '' : municipalRegistration,
    inscricao_municipal_isento: /^isento$/i.test(municipalRegistration),
    regime_tributario: taxRegime,
  };
}

function clienteParaTela(customer: Record<string, any>) {
  const state = String(customer.state || '').toUpperCase();
  const cityName = String(customer.city || '');
  return {
    id: String(customer.id || ''), name: String(customer.displayName || customer.tradeName || customer.legalName || ''),
    legalName: String(customer.legalName || ''), tradeName: String(customer.tradeName || customer.displayName || customer.legalName || ''),
    document: String(customer.document || ''), profile: customer.documentType === 'cpf' ? 'Pessoa física' : 'Pessoa jurídica',
    stateRegistration: String(customer.stateRegistration || ''), municipalRegistration: String(customer.municipalRegistration || ''),
    fiscal: customer.stateRegistrationIndicator === 'contribuinte_icms' ? 'Contribuinte ICMS' : customer.stateRegistrationIndicator === 'contribuinte_isento' ? 'Consumidor final' : 'Não contribuinte',
    email: String(customer.email || ''), phone: String(customer.phone || ''), contactName: String(customer.primaryContact || ''),
    cep: String(customer.postalCode || ''), street: String(customer.street || ''), number: String(customer.number || ''), complement: String(customer.complement || ''), district: String(customer.district || ''),
    cityName, cityCode: String(customer.cityCode || ''), state, city: cityName && state ? `${cityName}/${state}` : cityName,
    seller: '', paymentTerms: String(customer.paymentTerms || 'À vista'), orders: 0, revenue: 0, lastPurchase: 'Sem compras',
    status: customer.status === 'ativo' ? 'Ativo' : customer.status === 'inativo' ? 'Inativo' : 'Revisar cadastro',
    persistence: { integrated: true, version: Number(customer.version) || 1 },
  };
}

function clienteParaApi(customer: Record<string, any>) {
  return {
    documentType: customer.profile === 'Pessoa física' ? 'cpf' : 'cnpj', document: customer.document,
    legalName: customer.legalName, tradeName: customer.tradeName, displayName: customer.name,
    stateRegistration: customer.stateRegistration, municipalRegistration: customer.municipalRegistration,
    stateRegistrationIndicator: customer.fiscal === 'Contribuinte ICMS' ? 'contribuinte_icms' : customer.fiscal === 'Consumidor final' ? 'contribuinte_isento' : 'nao_contribuinte',
    email: customer.email, phone: customer.phone, primaryContact: customer.contactName,
    postalCode: customer.cep, street: customer.street, number: customer.number, complement: customer.complement, district: customer.district,
    city: customer.cityName, cityCode: customer.cityCode, state: customer.state, paymentTerms: customer.paymentTerms,
    status: customer.status === 'Ativo' ? 'ativo' : customer.status === 'Inativo' ? 'inativo' : 'revisar_cadastro',
  };
}

function perfilModuloParaTela(perfil: string) {
  return perfil === 'gestor_master' ? 'gestor' : perfil;
}

function normalizarSnapshotPermissoes(payload: Record<string, any>, writable: boolean, authenticatedUserId = '') {
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
  const activeUserId = users.some((user: { id: string }) => user.id === authenticatedUserId) ? authenticatedUserId : '';
  return { available: true, writable, message: writable ? 'Permissões conectadas à API protegida da Gestão.' : 'Consulta protegida ativa. A escrita remota permanece desligada neste laboratório.', activeUserId, roles, users, audit };
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
    fiscalResponsible: String(data.fiscalResponsible || '').slice(0, 160),
    reviewedAt: String(data.reviewedAt || '').slice(0, 40),
    taxReviewConfirmed: data.taxReviewConfirmed === true,
    taxReformReviewConfirmed: data.taxReformReviewConfirmed === true,
  };
}

export default function VendasIntegrado() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [empresaId, setEmpresaId] = useState('');
  const [catalogo, setCatalogo] = useState<CatalogoVendasDTO | null>(null);
  const [perfilCadastro, setPerfilCadastro] = useState<Record<string, unknown> | null>(null);
  const [corPrimaria, setCorPrimaria] = useState('#003e73');
  const [documentosFiscais, setDocumentosFiscais] = useState<unknown[]>([]);
  const [erro, setErro] = useState('');
  const [iframePronto, setIframePronto] = useState(false);
  const origemPrototipo = useMemo(() => typeof window === 'undefined' ? '' : window.location.origin, []);

  const enviarCatalogo = useCallback(() => {
    if (!perfilCadastro || !empresaId || !iframePronto || !iframeRef.current?.contentWindow) return;
    const catalogoDoPerfil: CatalogoVendasDTO = catalogo ?? {
      versao: 1,
      origem: 'custos_precificacao',
      somenteLeitura: true,
      estoqueIntegrado: false,
      empresaId,
      catalogoId: '',
      tabelaPreco: null,
      tabelasDisponiveis: [],
      itens: [],
      geradoEm: new Date().toISOString(),
    };
    iframeRef.current.contentWindow.postMessage({
      type: 'AVANTALAB_VENDAS_CATALOGO_V1',
      catalogo: catalogoDoPerfil,
      perfil: perfilCadastro,
      corPrimaria,
      catalogoDisponivel: Boolean(catalogo),
      mensagem: catalogo ? '' : erro || 'O perfil foi carregado; o catálogo de Custos ainda está sendo consultado.',
    }, origemPrototipo);
  }, [catalogo, corPrimaria, empresaId, erro, iframePronto, origemPrototipo, perfilCadastro]);

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
      const authenticatedUserId = data.session?.user.id;
      if (!token || !authenticatedUserId) { send({ available: false, writable: false, message: 'Confirme novamente sua sessão na Gestão.' }); return false; }
      const params = new URLSearchParams({ empresaId: perfilId, moduloId: 'vendas' });
      const response = await fetch(`/api/modulos/permissoes?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok !== true) {
        send({ available: false, writable: false, message: payload.mensagem || 'A matriz protegida ainda não está disponível neste perfil.' });
        return false;
      }
      send(normalizarSnapshotPermissoes(payload, ESCRITA_PERMISSOES_HABILITADA, authenticatedUserId));
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

  const carregarRecebimentos = useCallback(async (perfilId: string) => {
    const destination=iframeRef.current?.contentWindow;
    if(!destination||!UUID_PATTERN.test(perfilId))return false;
    const send=(ok:boolean,records:unknown[],message='')=>destination.postMessage({type:RECEIVABLE_SNAPSHOT_TYPE,ok,records,message},origemPrototipo);
    try{
      const {data}=await supabase.auth.getSession();const token=data.session?.access_token;
      if(!token){send(false,[],'Confirme novamente sua sessão na Gestão.');return false;}
      const params=new URLSearchParams({companyId:perfilId,limit:'200'});
      const response=await fetch(`/api/modulos/vendas/commercial/receivables?${params}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||payload.ok!==true||!Array.isArray(payload.receivables)){send(false,[],payload.message||'Não foi possível carregar os recebimentos.');return false;}
      send(true,payload.receivables);return true;
    }catch{send(false,[],'A conexão com os recebimentos está indisponível.');return false;}
  },[origemPrototipo]);

  const carregarEstoque = useCallback(async (perfilId:string)=>{
    const destination=iframeRef.current?.contentWindow;if(!destination||!UUID_PATTERN.test(perfilId))return false;const send=(ok:boolean,movements:unknown[],message='')=>destination.postMessage({type:STOCK_SNAPSHOT_TYPE,ok,movements,message},origemPrototipo);
    try{const {data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token){send(false,[],'Confirme novamente sua sessão na Gestão.');return false;}const params=new URLSearchParams({companyId:perfilId,limit:'200'});const response=await fetch(`/api/modulos/vendas/commercial/stock?${params}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const payload=await response.json().catch(()=>({}));if(!response.ok||payload.ok!==true||!Array.isArray(payload.movements)){send(false,[],payload.message||'Não foi possível carregar o estoque.');return false;}send(true,payload.movements);return true;}catch{send(false,[],'A conexão com o estoque está indisponível.');return false;}
  },[origemPrototipo]);

  const carregarClientes = useCallback(async (perfilId: string) => {
    const destination = iframeRef.current?.contentWindow;
    if (!destination || !UUID_PATTERN.test(perfilId)) return false;
    const send = (ok: boolean, customers: unknown[], message = '') => destination.postMessage({ type: CUSTOMER_SNAPSHOT_TYPE, ok, customers, message }, origemPrototipo);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { send(false, [], 'Confirme novamente sua sessão na Gestão.'); return false; }
      const params = new URLSearchParams({ companyId: perfilId, limit: '100' });
      const response = await fetch(`/api/modulos/vendas/commercial/customers?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok !== true || !Array.isArray(payload.customers)) { send(false, [], payload.message || 'Não foi possível carregar os clientes.'); return false; }
      send(true, payload.customers.map(clienteParaTela));
      return true;
    } catch { send(false, [], 'A conexão com os clientes está indisponível.'); return false; }
  }, [origemPrototipo]);

  const carregarFornecedores = useCallback(async (perfilId: string) => {
    const destination = iframeRef.current?.contentWindow;
    if (!destination || !UUID_PATTERN.test(perfilId)) return false;
    const send = (ok: boolean, suppliers: unknown[], message = '') => destination.postMessage({ type: SUPPLIER_SNAPSHOT_TYPE, ok, suppliers, message }, origemPrototipo);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { send(false, [], 'Confirme novamente sua sessão na Gestão.'); return false; }
      const params = new URLSearchParams({ companyId: perfilId, limit: '200' });
      const response = await fetch(`/api/modulos/vendas/commercial/suppliers?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok !== true || !Array.isArray(payload.suppliers)) { send(false, [], payload.message || 'Não foi possível carregar os fornecedores.'); return false; }
      send(true, payload.suppliers.map((supplier: Record<string, any>) => ({ id: supplier.id, name: supplier.name, document: supplier.document, contactName: supplier.contactName, email: supplier.email, phone: supplier.phone, active: supplier.active, persistence: { integrated: true, version: supplier.version } })));
      return true;
    } catch { send(false, [], 'A conexão com os fornecedores está indisponível.'); return false; }
  }, [origemPrototipo]);

  const carregarOperacoes = useCallback(async (perfilId: string) => {
    const destination = iframeRef.current?.contentWindow;
    if (!destination || !UUID_PATTERN.test(perfilId)) return false;
    const send = (ok: boolean, operations: unknown[], message = '') => destination.postMessage({ type: OPERATION_SNAPSHOT_TYPE, ok, operations, message }, origemPrototipo);
    try {
      const { data } = await supabase.auth.getSession(); const token = data.session?.access_token;
      if (!token) { send(false, [], 'Confirme novamente sua sessão na Gestão.'); return false; }
      const headers = { Authorization: `Bearer ${token}` };
      const [salesResponse, servicesResponse] = await Promise.all(['vendas', 'servicos'].map((channel) => fetch(`/api/modulos/vendas/commercial/operations?${new URLSearchParams({ companyId: perfilId, channel, limit: '100' })}`, { headers, cache: 'no-store' })));
      const [sales, services] = await Promise.all([salesResponse.json().catch(() => ({})), servicesResponse.json().catch(() => ({}))]);
      if (!salesResponse.ok || !servicesResponse.ok || sales.ok !== true || services.ok !== true) { send(false, [], sales.message || services.message || 'Não foi possível carregar os documentos comerciais.'); return false; }
      send(true, [...(sales.operations || []), ...(services.operations || [])]); return true;
    } catch { send(false, [], 'A conexão com os documentos comerciais está indisponível.'); return false; }
  }, [origemPrototipo]);

  const carregarCatalogo = useCallback(async (perfilId: string) => {
    if (!perfilId) return;
    setErro('');
    setCatalogo(null);
    setPerfilCadastro((current) => String(current?.empresa_id || '') === perfilId ? current : null);
    try {
      const { data } = await aguardarComLimite(supabase.auth.getSession(), 10_000, 'A confirmação da sessão demorou mais que o esperado. Tente novamente.');
      const token = data.session?.access_token;
      if (!token) throw new Error('Entre na Gestão para utilizar o laboratório integrado.');
      const respostaPerfil = await aguardarComLimite(fetch(`/api/perfil-cadastro?empresaId=${encodeURIComponent(perfilId)}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      }), 20_000, 'A confirmação do perfil demorou mais que o esperado. Tente novamente.');
      const perfil = await respostaPerfil.json().catch(() => ({}));
      if (!respostaPerfil.ok || perfil.tipoPerfil !== 'empresa' || !perfil.cadastro) {
        throw new Error(perfil.mensagem || 'Complete o cadastro do perfil empresarial antes de usar o módulo.');
      }
      setPerfilCadastro(perfil.cadastro);
      setCorPrimaria(typeof perfil.corPrimaria === 'string' && /^#[0-9a-f]{6}$/i.test(perfil.corPrimaria) ? perfil.corPrimaria : '#003e73');
      if (iframeRef.current?.contentWindow) {
        void Promise.all([
          carregarDocumentosFiscais(perfilId, token),
          carregarPermissoes(perfilId),
          carregarRegrasFiscais(perfilId),
          carregarRecebimentos(perfilId),
          carregarEstoque(perfilId),
          carregarClientes(perfilId),
          carregarFornecedores(perfilId),
          carregarOperacoes(perfilId),
        ]);
      }
      const parametros = new URLSearchParams({ empresaId: perfilId });
      const resposta = await fetch(`/api/modulos/vendas/catalogo?${parametros}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(json.mensagem || 'Não foi possível carregar o catálogo de Custos.');
      const proximo = json.catalogo as CatalogoVendasDTO;
      setCatalogo(proximo);
    } catch (falha) {
      setCatalogo(null);
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar o catálogo de Custos.');
    }
  }, [carregarDocumentosFiscais, carregarPermissoes, carregarRegrasFiscais, carregarRecebimentos, carregarEstoque, carregarClientes, carregarFornecedores, carregarOperacoes]);

  useEffect(() => {
    let ativo = true;
    const iniciar = async () => {
      const { data } = await aguardarComLimite(supabase.auth.getSession(), 10_000, 'A confirmação da sessão demorou mais que o esperado. Tente novamente.');
      if (!data.session?.user) {
        if (ativo) setErro('Entre na Gestão para utilizar o laboratório integrado.');
        return;
      }
      const solicitado = new URLSearchParams(window.location.search).get('empresaId') || '';
      if (!UUID_PATTERN.test(solicitado)) {
        if (ativo) setErro('Abra o módulo a partir do perfil empresarial selecionado na Gestão.');
        return;
      }
      if (!ativo) return;
      setEmpresaId(solicitado);
      await carregarCatalogo(solicitado);
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
      if (event.data?.type === RECEIVABLE_READY_TYPE) { void carregarRecebimentos(empresaId); return; }
      if (event.data?.type === STOCK_READY_TYPE) { void carregarEstoque(empresaId); return; }
      if (event.data?.type === CUSTOMER_READY_TYPE) { void carregarClientes(empresaId); return; }
      if (event.data?.type === SUPPLIER_READY_TYPE) { void carregarFornecedores(empresaId); return; }
      if (event.data?.type === OPERATION_READY_TYPE) { void carregarOperacoes(empresaId); return; }
      if (event.data?.type === COMPANY_PROFILE_SAVE_REQUEST_TYPE) {
        const responsePort = event.ports[0];
        const requestId = String(event.data.requestId || '');
        const company = event.data.company && typeof event.data.company === 'object' ? event.data.company as Record<string, unknown> : null;
        if (!responsePort || !requestIdValido(requestId) || !company || !UUID_PATTERN.test(empresaId)) return;
        const deliver = (ok: boolean, message: string) => responsePort.postMessage({ type: COMPANY_PROFILE_SAVE_RESPONSE_TYPE, requestId, ok, message });
        const saveCompanyProfile = async () => {
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) { deliver(false, 'Confirme novamente sua sessão na Gestão.'); return; }
            if (!perfilCadastro) { deliver(false, 'O cadastro atual do perfil ainda não foi carregado.'); return; }
            const response = await fetch('/api/perfil-cadastro', {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ empresaId, dados: perfilComDadosDaEmpresa(perfilCadastro, company), concluir: false }),
              cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true || !payload.cadastro) {
              deliver(false, payload.mensagem || 'Não foi possível atualizar o perfil empresarial.');
              return;
            }
            setPerfilCadastro(payload.cadastro);
            deliver(true, 'Dados do emitente atualizados no perfil empresarial.');
          } catch {
            deliver(false, 'A conexão com o cadastro empresarial foi interrompida. Tente novamente.');
          }
        };
        void saveCompanyProfile();
        return;
      }
      if ([SERVICE_ATTACHMENT_UPLOAD_REQUEST_TYPE, SERVICE_ATTACHMENT_OPEN_REQUEST_TYPE].includes(event.data?.type)) {
        const destination = iframeRef.current?.contentWindow;
        const responsePort = event.ports[0];
        const requestId = String(event.data?.requestId || '');
        const responseType = event.data?.type === SERVICE_ATTACHMENT_UPLOAD_REQUEST_TYPE ? SERVICE_ATTACHMENT_UPLOAD_RESPONSE_TYPE : SERVICE_ATTACHMENT_OPEN_RESPONSE_TYPE;
        if (!destination || !responsePort || !requestIdValido(requestId) || !UUID_PATTERN.test(empresaId)) return;
        const deliver = (payload: Record<string, unknown>) => responsePort.postMessage({ type: responseType, requestId, ...payload });
        const handleAttachment = async () => {
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) { deliver({ ok: false, message: 'Confirme novamente sua sessão na Gestão.' }); return; }
            const params = new URLSearchParams({ companyId: empresaId });
            if (event.data.type === SERVICE_ATTACHMENT_OPEN_REQUEST_TYPE) {
              params.set('attachmentId', String(event.data.attachmentId || ''));
              const response = await fetch(`/api/modulos/vendas/commercial/services/attachments?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
              const payload = await response.json().catch(() => ({}));
              deliver(response.ok && payload.ok === true ? { ok: true, url: payload.url } : { ok: false, message: payload.message || 'Não foi possível abrir o anexo.' });
              return;
            }
            const files = Array.isArray(event.data.files) ? event.data.files.filter((file: unknown) => file instanceof File) : [];
            if (!UUID_PATTERN.test(String(event.data.orderId || '')) || !files.length || files.length > 5) { deliver({ ok: false, message: 'Selecione uma ordem e até cinco anexos válidos.' }); return; }
            const body = new FormData();
            body.append('orderId', event.data.orderId);
            files.forEach((file: File) => body.append('attachments', file, file.name));
            const response = await fetch(`/api/modulos/vendas/commercial/services/attachments?${params}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body, cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { deliver({ ok: false, message: payload.message || 'Não foi possível anexar os arquivos.' }); return; }
            deliver({ ok: true, attachments: payload.attachments, message: `${payload.attachments.length} ${payload.attachments.length === 1 ? 'anexo protegido foi salvo' : 'anexos protegidos foram salvos'} no perfil.` });
            await carregarOperacoes(empresaId);
          } catch {
            deliver({ ok: false, message: 'A conexão com o armazenamento de anexos foi interrompida.' });
          }
        };
        void handleAttachment();
        return;
      }
      if (event.data?.type === CUSTOMER_SAVE_REQUEST_TYPE) {
        const destination = iframeRef.current?.contentWindow;
        const requestId = String(event.data.requestId || '');
        if (!destination || !requestIdValido(requestId)) return;
        const respond = (ok: boolean, message: string, customer: unknown = null) => destination.postMessage({ type: CUSTOMER_SAVE_RESPONSE_TYPE, requestId, ok, message, customer }, origemPrototipo);
        const save = async () => {
          try {
            const { data } = await supabase.auth.getSession(); const token = data.session?.access_token;
            if (!token) { respond(false, 'Confirme novamente sua sessão na Gestão.'); return; }
            const current = event.data.customer && typeof event.data.customer === 'object' ? event.data.customer : {};
            const integrated = current.persistence?.integrated === true && UUID_PATTERN.test(String(current.id || ''));
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/commercial/customers?${params}`, { method: integrated ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: integrated ? current.id : undefined, expectedVersion: integrated ? Number(current.persistence.version) : undefined, customer: clienteParaApi(current) }), cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true || !payload.customer) { respond(false, payload.message || 'Não foi possível salvar o cliente.'); return; }
            const mapped = clienteParaTela(payload.customer);
            respond(true, integrated ? 'Cliente atualizado no perfil empresarial.' : 'Cliente cadastrado no perfil empresarial.', mapped);
            await carregarClientes(empresaId);
          } catch { respond(false, 'A conexão com os clientes foi interrompida. Tente novamente.'); }
        };
        void save(); return;
      }
      if (event.data?.type === SUPPLIER_SAVE_REQUEST_TYPE) {
        const destination = iframeRef.current?.contentWindow;
        const requestId = String(event.data.requestId || '');
        if (!destination || !requestIdValido(requestId)) return;
        const respond = (ok: boolean, message: string, supplier: unknown = null) => destination.postMessage({ type: SUPPLIER_SAVE_RESPONSE_TYPE, requestId, ok, message, supplier }, origemPrototipo);
        const save = async () => {
          try {
            const { data } = await supabase.auth.getSession(); const token = data.session?.access_token;
            if (!token) { respond(false, 'Confirme novamente sua sessão na Gestão.'); return; }
            const current = event.data.supplier && typeof event.data.supplier === 'object' ? event.data.supplier : {};
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/commercial/suppliers?${params}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ supplier: current }), cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true || !payload.supplier) { respond(false, payload.message || 'Não foi possível salvar o fornecedor.'); return; }
            respond(true, payload.reused ? 'Fornecedor já cadastrado neste perfil.' : 'Fornecedor cadastrado no perfil empresarial.', { id: payload.supplier.id, name: payload.supplier.name, document: payload.supplier.document, contactName: payload.supplier.contactName, email: payload.supplier.email, phone: payload.supplier.phone, active: payload.supplier.active, persistence: { integrated: true, version: payload.supplier.version } });
            await carregarFornecedores(empresaId);
          } catch { respond(false, 'A conexão com os fornecedores foi interrompida. Tente novamente.'); }
        };
        void save(); return;
      }
      if (event.data?.type === OPERATION_SAVE_REQUEST_TYPE) {
        const destination = iframeRef.current?.contentWindow;
        const requestId = String(event.data.requestId || '');
        if (!destination || !requestIdValido(requestId)) return;
        const respond = (ok: boolean, message: string, payload: Record<string, unknown> = {}) => destination.postMessage({ type: OPERATION_SAVE_RESPONSE_TYPE, requestId, ok, message, ...payload }, origemPrototipo);
        const save = async () => {
          try {
            const { data } = await supabase.auth.getSession(); const token = data.session?.access_token;
            if (!token) { respond(false, 'Confirme novamente sua sessão na Gestão.'); return; }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/commercial/operations?${params}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: event.data.action, operation: event.data.operation, serviceOrder: event.data.serviceOrder, serviceOrderKey: event.data.serviceOrderKey }), cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { respond(false, payload.message || 'Não foi possível salvar o documento comercial.'); return; }
            respond(true, payload.order ? 'Ordem de serviço agendada e vinculada ao perfil empresarial.' : payload.reused ? 'Documento já confirmado no perfil empresarial.' : 'Orçamento salvo no perfil empresarial.', { operation: payload.operation || payload.quote, order: payload.order || null });
            await carregarOperacoes(empresaId);
          } catch { respond(false, 'A conexão comercial foi interrompida. Tente novamente.'); }
        };
        void save(); return;
      }
      if(event.data?.type===RECEIVABLE_MOVE_REQUEST_TYPE){
        const destination=iframeRef.current?.contentWindow;const requestId=String(event.data.requestId||'');
        if(!destination||!requestIdValido(requestId))return;
        const respond=(ok:boolean,message:string,receivable:unknown=null)=>destination.postMessage({type:RECEIVABLE_MOVE_RESPONSE_TYPE,requestId,ok,message,receivable},origemPrototipo);
        const move=async()=>{try{const {data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token){respond(false,'Confirme novamente sua sessão na Gestão.');return;}const params=new URLSearchParams({companyId:empresaId});const response=await fetch(`/api/modulos/vendas/commercial/receivables?${params}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({receivableId:event.data.receivableId,expectedVersion:event.data.expectedVersion,idempotencyKey:event.data.idempotencyKey,type:event.data.operationType,amount:event.data.amount,date:event.data.date,method:event.data.method,account:event.data.account,description:event.data.description}),cache:'no-store'});const payload=await response.json().catch(()=>({}));if(!response.ok||payload.ok!==true){respond(false,payload.message||'Não foi possível concluir a operação financeira.');return;}respond(true,payload.reused?'Operação financeira já confirmada.':'Operação financeira registrada e vinculada à entrada mensal.',payload.receivable);await carregarRecebimentos(empresaId);}catch{respond(false,'A conexão financeira foi interrompida. Tente novamente.');}};void move();return;
      }
      if (event.data?.type === STOCK_MOVE_REQUEST_TYPE) {
        const destination = iframeRef.current?.contentWindow;
        const requestId = String(event.data.requestId || '');
        if (!destination || !requestIdValido(requestId)) return;
        const respond = (ok: boolean, message: string, payload: Record<string, unknown> = {}) => destination.postMessage({ type: STOCK_MOVE_RESPONSE_TYPE, requestId, ok, message, ...payload }, origemPrototipo);
        const move = async () => {
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) { respond(false, 'Confirme novamente sua sessão na Gestão.'); return; }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/commercial/stock?${params}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: event.data.productId, localId: event.data.localId, idempotencyKey: event.data.idempotencyKey, mode: event.data.mode, amount: event.data.amount, finalBalance: event.data.finalBalance, date: event.data.date, nature: event.data.nature, partner: event.data.partner, document: event.data.document, lot: event.data.lot, expiry: event.data.expiry, notes: event.data.notes }), cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { respond(false, payload.message || 'Não foi possível movimentar o estoque.'); return; }
            respond(true, payload.reused ? 'Movimentação já confirmada.' : 'Movimentação registrada no estoque do perfil.', { movement: payload.movement, balance: payload.balance });
            await Promise.all([carregarEstoque(empresaId), carregarCatalogo(empresaId)]);
          } catch { respond(false, 'A conexão com o estoque foi interrompida. Tente novamente.'); }
        };
        void move(); return;
      }
      if (event.data?.type === ACCESS_SAVE_REQUEST_MESSAGE_TYPE) {
        const request = analisarAlteracoesPermissoes(event.data);
        const destination = iframeRef.current?.contentWindow;
        if (!request || !destination) return;
        const respond = (ok: boolean, message: string) => destination.postMessage({ type: ACCESS_SAVE_RESPONSE_MESSAGE_TYPE, requestId: request.requestId, ok, message }, origemPrototipo);
        const save = async () => {
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
      if ([FISCAL_CERTIFICATE_STATUS_REQUEST_TYPE, FISCAL_CERTIFICATE_INSTALL_REQUEST_TYPE, FISCAL_CERTIFICATE_ACTIVATE_REQUEST_TYPE].includes(event.data?.type)) {
        const requestId = event.data?.requestId;
        const destination = iframeRef.current?.contentWindow;
        const responseType = event.data?.type === FISCAL_CERTIFICATE_INSTALL_REQUEST_TYPE
          ? FISCAL_CERTIFICATE_INSTALL_RESPONSE_TYPE
          : event.data?.type === FISCAL_CERTIFICATE_ACTIVATE_REQUEST_TYPE
            ? FISCAL_CERTIFICATE_ACTIVATE_RESPONSE_TYPE
            : FISCAL_CERTIFICATE_STATUS_RESPONSE_TYPE;
        const responsePort = event.data?.type === FISCAL_CERTIFICATE_STATUS_REQUEST_TYPE ? undefined : event.ports[0];
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
            if (event.data.type === FISCAL_CERTIFICATE_ACTIVATE_REQUEST_TYPE) {
              const response = await fetch(`/api/modulos/vendas/fiscal/certificate?${params}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
              });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível verificar o certificado digital.'); return; }
              deliver({ type: responseType, requestId, ok: true, certificate: payload.certificate, message: payload.message || 'Verificação concluída.' });
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
            fail(event.data.type === FISCAL_CERTIFICATE_ACTIVATE_REQUEST_TYPE
              ? 'A verificação do certificado está temporariamente indisponível.'
              : 'A instalação do certificado está temporariamente indisponível.');
          }
        };
        void handleCertificate();
        return;
      }
      if (![FISCAL_STATUS_REQUEST_TYPE, FISCAL_DOWNLOAD_REQUEST_TYPE, FISCAL_PREPARE_REQUEST_TYPE, FISCAL_VALIDATE_REQUEST_TYPE, FISCAL_NUMBER_REQUEST_TYPE, FISCAL_ISSUE_REQUEST_TYPE, FISCAL_CORRECTION_REQUEST_TYPE, FISCAL_CANCELLATION_REQUEST_TYPE, COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE, COMMERCIAL_SERVICE_WORKFLOW_REQUEST_TYPE].includes(event.data?.type)) return;
      const responder = async () => {
        const requestId = event.data?.requestId;
        const responseType = event.data?.type === COMMERCIAL_SERVICE_WORKFLOW_REQUEST_TYPE
          ? COMMERCIAL_SERVICE_WORKFLOW_RESPONSE_TYPE
          : event.data?.type === COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE
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
            if (!['confirmado', 'em_separacao', 'faturado', 'cancelado', 'devolvido'].includes(target)
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
            if (payload.order?.stockIntegrated) await carregarCatalogo(empresaId);
            return;
          }
          if (event.data.type === COMMERCIAL_SERVICE_WORKFLOW_REQUEST_TYPE) {
            const action = String(event.data.action || '');
            const orderId = String(event.data.orderId || '');
            const expectedVersion = Number(event.data.expectedVersion);
            const idempotencyKey = String(event.data.idempotencyKey || '');
            if (!['start', 'complete', 'cancel', 'reverse'].includes(action) || !UUID_PATTERN.test(orderId)
              || !Number.isInteger(expectedVersion) || expectedVersion < 1 || !requestIdValido(idempotencyKey)) {
              fail('A solicitação da ordem de serviço é inválida. Atualize a página e tente novamente.');
              return;
            }
            const params = new URLSearchParams({ companyId: empresaId });
            const response = await fetch(`/api/modulos/vendas/commercial/services/workflow?${params}`, {
              method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ action, orderId, expectedVersion, idempotencyKey, localId: event.data.localId, input: event.data.input }), cache: 'no-store',
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || payload.ok !== true) { fail(payload.message || 'Não foi possível atualizar a ordem de serviço.'); return; }
            destination.postMessage({ type: responseType, requestId, ok: true, result: payload.result }, origemPrototipo);
            await Promise.all([carregarOperacoes(empresaId), carregarCatalogo(empresaId), carregarRecebimentos(empresaId), carregarDocumentosFiscais(empresaId, token)]);
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
  }, [carregarCatalogo, carregarDocumentosFiscais, carregarPermissoes, carregarRegrasFiscais, carregarRecebimentos, carregarEstoque, carregarClientes, carregarFornecedores, carregarOperacoes, empresaId, origemPrototipo, perfilCadastro]);

  const perfilPronto = Boolean(empresaId && perfilCadastro);

  return <main className="flex min-h-screen flex-col bg-slate-100 text-slate-800">
    <section className="min-h-0 flex-1" aria-label="Vendas e Serviços">
      {!perfilPronto ? <div className="grid min-h-screen place-items-center bg-white p-6 text-center"><div><h2 className="text-lg font-semibold">{erro ? 'Módulo indisponível' : 'Preparando o módulo'}</h2><p className="mt-2 max-w-xl text-sm text-slate-600">{erro || 'Confirmando sua sessão e o perfil empresarial ativo.'}</p>{erro ? <div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center rounded-xl bg-[#003E73] px-5 text-sm font-semibold text-white">Tentar novamente</button><Link href="/gestao" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-[#003E73]">Abrir Gestão</Link></div> : null}</div></div> : <iframe ref={iframeRef} src={`/vendas/sistema?bridge=gestao&companyId=${encodeURIComponent(empresaId)}`} title="Vendas e Serviços" className="block h-screen min-h-[620px] w-full border-0 bg-white" onLoad={() => setIframePronto(true)} />}
    </section>
  </main>;
}
