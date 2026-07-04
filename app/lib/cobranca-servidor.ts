// ─────────────────────────────────────────────────────────────
// Cobrança — resolver de estado (SÓ servidor).
//
// Dado um perfil (empresa_id), descobre o "estado de acesso":
//   1) Se já existe assinatura registrada → usa ela.
//   2) Se não existe → deriva:
//        • perfil criado ANTES do lançamento → cliente atual (mantém acesso).
//        • empresa criada DEPOIS → trial de TRIAL_DIAS a partir da criação.
//        • pessoal criado DEPOIS → grátis (núcleo livre, premium bloqueado).
//
// Não grava nada no banco: só lê e calcula. Usa a service role.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import {
  DATA_LANCAMENTO,
  TRIAL_DIAS,
  type EstadoAcesso,
  type StatusAssinatura,
  type TipoPerfil,
} from './cobranca';

function servico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

export async function resolverEstadoAcesso(empresaId: string): Promise<EstadoAcesso | null> {
  if (!empresaId) return null;
  const db = servico();

  // 1) Já existe assinatura registrada? Ela é a fonte da verdade.
  const { data: assin } = await db
    .from('assinaturas')
    .select('tipo_perfil, status, valido_ate, trial_fim')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (assin) {
    return {
      tipoPerfil: assin.tipo_perfil as TipoPerfil,
      status: assin.status as StatusAssinatura,
      validoAte: assin.valido_ate,
      trialFim: assin.trial_fim,
    };
  }

  // 2) Sem assinatura → derivar do próprio perfil.
  const { data: emp } = await db
    .from('empresas')
    .select('tipo_perfil, criado_em')
    .eq('id', empresaId)
    .maybeSingle();

  if (!emp) return null; // sem info → o "cérebro" trata como fail-open (não bloqueia)

  const tipoPerfil: TipoPerfil = emp.tipo_perfil === 'pessoal' ? 'pessoal' : 'empresa';
  const criadoEm = emp.criado_em ? new Date(emp.criado_em) : null;
  const anteriorAoLancamento = !criadoEm || criadoEm < new Date(DATA_LANCAMENTO);

  // Clientes/avaliadores anteriores ao lançamento: mantêm acesso.
  if (anteriorAoLancamento) {
    return { tipoPerfil, status: 'ativa', validoAte: null, trialFim: null };
  }

  // Novos, após o lançamento:
  if (tipoPerfil === 'empresa') {
    const fim = new Date(criadoEm as Date);
    fim.setDate(fim.getDate() + TRIAL_DIAS);
    return { tipoPerfil, status: 'trial', validoAte: null, trialFim: fim.toISOString() };
  }

  // Pessoal novo → grátis (núcleo sempre livre; recursos premium bloqueados).
  return { tipoPerfil, status: 'expirada', validoAte: null, trialFim: null };
}
