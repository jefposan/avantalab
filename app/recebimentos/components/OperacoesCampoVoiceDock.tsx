'use client';

import { useCallback, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import AvantaVoiceActionDock from '@/app/padrao-avanta/acoes-por-voz/AvantaVoiceActionDock';
import type { AvantaVoiceActionOperation } from '@/app/padrao-avanta/acoes-por-voz/contract';
import type { Empresa, FormaPagamentoRecebimento, Recebimento, Servico, Subempresa } from './types';
import type { AcaoVozCampo, MetricasVozCampo, ModoVozCampo, RascunhoVozCampo } from '../voice/types';
import { validarRascunhoVozCampo } from '../voice/schema';
import { normalizarBuscaVozCampo, resolverClienteVozCampo, type ClienteVozCampo } from '../voice/customer-resolution';
import { resolverServicoRegistroVoz } from '../voice/service-resolution';

type Props = {
  mode: ModoVozCampo;
  empresaId: string;
  userId: string;
  cliente: SupabaseClient;
  empresas: Empresa[];
  subempresas: Subempresa[];
  recebimentos: Recebimento[];
  servicos: Servico[];
  podeRegistrar?: boolean;
  podeAgendar?: boolean;
  offline?: boolean;
  onRegistrarRecebimento: (empresaId: string, subempresaId: string | null, valor: number, observacao: string, formaPagamento: FormaPagamentoRecebimento) => Promise<void>;
  onReceberCobranca: (recebimentoId: string, valor: number, observacao: string, formaPagamento: FormaPagamentoRecebimento) => Promise<void>;
  onAgendarServico: (empresaId: string, subempresaId: string | null, data: string, tipo: 'interna' | 'revisao' | 'extra') => Promise<void>;
  onPrepararRegistroServico: (empresaId: string, subempresaId: string | null, servicoId: string) => void;
};

type Selecao = { type: string; reference: string; id: string };

const FORMA_LABEL: Record<NonNullable<RascunhoVozCampo['paymentMethod']>, string> = {
  boleto: 'Boleto',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  dinheiro: 'Dinheiro',
  pix: 'Pix',
};

const TIPO_LABEL: Record<NonNullable<RascunhoVozCampo['serviceType']>, string> = {
  interna: 'Interna',
  revisao: 'Revisão',
  extra: 'Extra',
};

const METRICAS_VAZIAS: MetricasVozCampo = { interpretationMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };

function clientesDisponiveis(empresas: Empresa[], subempresas: Subempresa[]): ClienteVozCampo[] {
  const ativas = empresas.filter((item) => item.ativo);
  const diretas = ativas.filter((item) => item.tipoCadastro === 'cliente_direto').map((item) => ({
    id: item.id,
    companyId: item.id,
    subcompanyId: null,
    label: item.nome,
    detail: [item.bairro, item.cidade, item.responsavel].filter(Boolean).join(' · ') || 'Cliente direto',
    searchable: normalizarBuscaVozCampo([item.nome, item.responsavel, item.bairro, item.cidade].filter(Boolean).join(' ')),
  }));
  const agrupadoras = new Map(ativas.map((item) => [item.id, item]));
  const vinculadas = subempresas.filter((item) => item.ativo && agrupadoras.has(item.empresaId)).map((item) => {
    const local = agrupadoras.get(item.empresaId);
    return {
      id: item.id,
      companyId: item.empresaId,
      subcompanyId: item.id,
      label: item.nome,
      detail: [local?.nome, item.shoppingGaleria, item.lojaSala, item.bairro, item.cidade].filter(Boolean).join(' · ') || 'Cliente do local',
      searchable: normalizarBuscaVozCampo([item.nome, local?.nome, item.shoppingGaleria, item.lojaSala, item.responsavel, item.bairro, item.cidade].filter(Boolean).join(' ')),
    };
  });
  return [...diretas, ...vinculadas];
}

function selecoesValidas(value: unknown) {
  if (!Array.isArray(value)) return [] as Selecao[];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const type = String(row.type || '');
    const reference = String(row.reference || '').slice(0, 80);
    const id = String(row.id || '').slice(0, 160);
    return type && reference && id ? [{ type, reference, id }] : [];
  }).slice(-12);
}

function mesclarSelecao(selections: Selecao[], value: unknown) {
  if (!value || typeof value !== 'object') return selections;
  const row = value as Record<string, unknown>;
  const next = { type: String(row.type || ''), reference: String(row.reference || ''), id: String(row.id || '') };
  if (!next.type || !next.reference || !next.id) return selections;
  return [...selections.filter((item) => item.type !== next.type || item.reference !== next.reference), next].slice(-12);
}

function aplicarEscolha(draft: RascunhoVozCampo, selection: Selecao | undefined) {
  if (!selection || selection.type !== 'choice') return draft;
  if (selection.reference === 'payment_method' && selection.id in FORMA_LABEL) {
    return { ...draft, paymentMethod: selection.id as RascunhoVozCampo['paymentMethod'] };
  }
  if (selection.reference === 'service_type' && selection.id in TIPO_LABEL) {
    return { ...draft, serviceType: selection.id as RascunhoVozCampo['serviceType'] };
  }
  return draft;
}

function hojeIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function construirResposta(input: {
  mode: ModoVozCampo;
  draft: RascunhoVozCampo;
  transcription: string;
  metrics: MetricasVozCampo;
  selections: Selecao[];
  clientes: ClienteVozCampo[];
  recebimentos: Recebimento[];
  servicos: Servico[];
  podeRegistrar: boolean;
  podeAgendar: boolean;
}) {
  const { mode, transcription, metrics, selections, clientes, recebimentos, servicos, podeRegistrar, podeAgendar } = input;
  const currentSelection = selections.at(-1);
  const draft = aplicarEscolha(input.draft, currentSelection);
  if (mode === 'recebimentos' && draft.intent !== 'register_receipt') {
    throw new Error('Neste sistema, a voz registra recebimentos. Para serviços, troque para o sistema Serviços.');
  }
  if (mode === 'servicos' && !['schedule_service', 'complete_service'].includes(draft.intent)) {
    throw new Error('Em Serviços, diga se deseja registrar ou agendar um atendimento.');
  }
  if (draft.intent === 'complete_service' && !podeRegistrar) throw new Error('Seu acesso permite agendar, mas não registrar serviços realizados.');
  if (draft.intent === 'schedule_service' && !podeAgendar) throw new Error('Seu acesso permite registrar serviços, mas não criar agendamentos.');
  if (!draft.customerReference) {
    return { kind: 'clarification', question: 'Para qual cliente?', candidates: [], entity: null, selections, draft, transcription, metrics };
  }
  const selectedCustomerId = [...selections].reverse().find((item) => item.type === 'customer')?.id;
  const clientesComServico = draft.intent === 'complete_service'
    ? clientes.filter((cliente) => servicos.some((servico) => servico.empresaId === cliente.companyId
      && servico.subempresaId === cliente.subcompanyId
      && servico.dataProgramada <= hojeIso()
      && ['pendente', 'atrasado'].includes(servico.situacao)))
    : clientes;
  const customer = resolverClienteVozCampo(draft.customerReference, clientesComServico, selectedCustomerId);
  if (!customer.selected) {
    return {
      kind: 'clarification',
      question: customer.candidates.length ? `Encontrei mais de um cliente para “${draft.customerReference}”. Qual deles?` : `Não localizei “${draft.customerReference}”. Diga o nome ou o local de outra forma.`,
      candidates: customer.candidates.map((item) => ({ id: item.id, label: item.label, detail: item.detail })),
      entity: { type: 'customer', reference: draft.customerReference },
      selections,
      draft,
      transcription,
      metrics,
    };
  }
  if (draft.intent === 'register_receipt') {
    if (!draft.amount) return { kind: 'clarification', question: `Qual valor foi recebido de ${customer.selected.label}?`, candidates: [], entity: null, selections, draft, transcription, metrics };
    if (!draft.paymentMethod) {
      return {
        kind: 'clarification',
        question: 'Confirme a forma de pagamento.',
        candidates: Object.entries(FORMA_LABEL).map(([id, label]) => ({ id, label, detail: '' })),
        entity: { type: 'choice', reference: 'payment_method' }, selections, draft, transcription, metrics,
      };
    }
    const competencia = hojeIso().slice(0, 7);
    const cobrancas = recebimentos.filter((item) => item.empresaId === customer.selected?.companyId
      && item.subempresaId === customer.selected?.subcompanyId
      && item.vencimento.slice(0, 7) === competencia
      && item.valorRecebido == null
      && ['em_atraso', 'previsto'].includes(item.situacao));
    const cobrancaEscolhidaId = [...selections].reverse().find((item) => item.type === 'choice' && item.reference === 'receipt_id')?.id;
    let cobranca = cobrancaEscolhidaId ? cobrancas.find((item) => item.id === cobrancaEscolhidaId) : null;
    if (!cobranca && cobrancas.length > 1) {
      return {
        kind: 'clarification', question: 'Qual cobrança deseja receber?',
        candidates: cobrancas.map((item) => ({ id: item.id, label: new Date(`${item.vencimento}T12:00:00`).toLocaleDateString('pt-BR'), detail: item.valorCombinado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) })),
        entity: { type: 'choice', reference: 'receipt_id' }, selections, draft, transcription, metrics,
      };
    }
    cobranca ??= cobrancas[0] ?? null;
    const amount = draft.amount;
    if (cobranca && Math.abs(amount - cobranca.valorCombinado) >= .01 && !draft.notes) {
      const diferenca = amount < cobranca.valorCombinado ? 'menor' : 'maior';
      return { kind: 'clarification', question: `O valor é ${diferenca} que o contratado. Qual é o motivo da diferença?`, candidates: [], entity: null, selections, draft, transcription, metrics };
    }
    const action: AcaoVozCampo = { intent: 'register_receipt', companyId: customer.selected.companyId, subcompanyId: customer.selected.subcompanyId, customerName: customer.selected.label, receiptId: cobranca?.id ?? null, amount, paymentMethod: draft.paymentMethod, scheduledDate: null, serviceType: null, notes: draft.notes };
    const vencimento = cobranca ? `\nVencimento: ${new Date(`${cobranca.vencimento}T12:00:00`).toLocaleDateString('pt-BR')}` : '';
    return { kind: 'confirmation', title: 'Registrar recebimento', message: `Cliente: ${action.customerName}${vencimento}\nValor: ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\nForma: ${FORMA_LABEL[draft.paymentMethod]}`, action, selections, draft, transcription, metrics };
  }
  if (draft.intent === 'complete_service') {
    const selectedServiceId = [...selections].reverse().find((item) => item.type === 'choice' && item.reference === 'service_id')?.id;
    const service = resolverServicoRegistroVoz({
      services: servicos.map((item) => ({
        id: item.id,
        companyId: item.empresaId,
        subcompanyId: item.subempresaId,
        scheduledDate: item.dataProgramada,
        status: item.situacao,
        serviceType: item.tipoServico,
      })),
      companyId: customer.selected.companyId,
      subcompanyId: customer.selected.subcompanyId,
      today: hojeIso(),
      serviceType: draft.serviceType,
      transcription,
      selectedId: selectedServiceId,
    });
    if (!service.selected && service.candidates.length > 1) {
      return {
        kind: 'clarification',
        question: 'Qual serviço deseja registrar?',
        candidates: service.candidates.map((item) => ({
          id: item.id,
          label: item.serviceType === 'rotina' ? 'Serviço padrão' : `Serviço ${TIPO_LABEL[item.serviceType]}`,
          detail: item.scheduledDate === hojeIso()
            ? 'Programado para hoje'
            : `Programado para ${new Date(`${item.scheduledDate}T12:00:00`).toLocaleDateString('pt-BR')}`,
        })),
        entity: { type: 'choice', reference: 'service_id' },
        selections, draft, transcription, metrics,
      };
    }
    if (!service.selected) throw new Error('Não há serviço pendente para registrar nesse cliente.');
    const action: AcaoVozCampo = {
      intent: 'prepare_service_registration',
      companyId: customer.selected.companyId,
      subcompanyId: customer.selected.subcompanyId,
      customerName: customer.selected.label,
      serviceId: service.selected.id,
      amount: null,
      paymentMethod: null,
      scheduledDate: service.selected.scheduledDate,
      serviceType: service.selected.serviceType === 'rotina' ? null : service.selected.serviceType,
      notes: draft.notes,
    };
    return { kind: 'handoff', action, selections, draft, transcription, metrics };
  }
  if (!draft.scheduledDate) return { kind: 'clarification', question: `Para qual data deseja agendar o serviço de ${customer.selected.label}?`, candidates: [], entity: null, selections, draft, transcription, metrics };
  if (draft.scheduledDate < hojeIso()) return { kind: 'clarification', question: 'A data já passou. Informe hoje ou uma data futura.', candidates: [], entity: null, selections, draft, transcription, metrics };
  if (!draft.serviceType) {
    return { kind: 'clarification', question: 'Qual é o tipo do serviço?', candidates: Object.entries(TIPO_LABEL).map(([id, label]) => ({ id, label, detail: '' })), entity: { type: 'choice', reference: 'service_type' }, selections, draft, transcription, metrics };
  }
  const action: AcaoVozCampo = { intent: 'schedule_service', companyId: customer.selected.companyId, subcompanyId: customer.selected.subcompanyId, customerName: customer.selected.label, amount: null, paymentMethod: null, scheduledDate: draft.scheduledDate, serviceType: draft.serviceType, notes: draft.notes };
  const data = new Date(`${draft.scheduledDate}T12:00:00`).toLocaleDateString('pt-BR');
  return { kind: 'confirmation', title: 'Agendar serviço', message: `Cliente: ${action.customerName}\nData: ${data}\nTipo: ${TIPO_LABEL[draft.serviceType]}`, action, selections, draft, transcription, metrics };
}

async function respostaJson(response: Response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(result.message || result.mensagem || 'Não foi possível concluir a solicitação.'));
  return result as Record<string, unknown>;
}

export default function OperacoesCampoVoiceDock({
  mode,
  empresaId,
  userId,
  cliente,
  empresas,
  subempresas,
  recebimentos,
  servicos,
  podeRegistrar = false,
  podeAgendar = false,
  offline = false,
  onRegistrarRecebimento,
  onReceberCobranca,
  onAgendarServico,
  onPrepararRegistroServico,
}: Props) {
  const clientes = useMemo(() => clientesDisponiveis(empresas, subempresas), [empresas, subempresas]);
  const helpText = mode === 'recebimentos'
    ? 'Ao tocar no microfone, diga o cliente, o valor recebido e a forma de pagamento. O lançamento seguirá para a conferência do gestor.'
    : podeRegistrar && podeAgendar
      ? 'Para registrar, diga “registrar serviço” e o cliente; depois, informe o nome e colete a assinatura. Para agendar, diga “agendar” com cliente, data e tipo.'
      : podeRegistrar
        ? 'Diga “registrar serviço” e o cliente. Depois, informe o nome e colete a assinatura.'
        : 'Diga “agendar” com cliente, data e tipo: interna, revisão ou extra.';

  const request = useCallback(async (operation: AvantaVoiceActionOperation, payload: Record<string, unknown> | FormData) => {
    if (offline) throw new Error('Solicitação por Voz indisponível sem internet. Use os lançamentos manuais.');
    const { data } = await cliente.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    const values = payload instanceof FormData ? {} : payload;
    const signal = values.signal instanceof AbortSignal ? values.signal : undefined;
    if (operation === 'transcribe') {
      const audio = values.audio;
      if (!(audio instanceof Blob) || !audio.size) throw new Error('Não identificamos áudio. Tente novamente.');
      const form = new FormData();
      form.set('empresaId', empresaId);
      form.set('mode', mode);
      form.set('audio', audio, `solicitacao-voz.${values.extension === 'mp4' ? 'mp4' : 'webm'}`);
      return respostaJson(await fetch('/api/recebimentos/solicitacao-voz/transcrever', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal }));
    }
    if (operation === 'process') {
      const previousDraft = values.previousDraft ? validarRascunhoVozCampo(values.previousDraft) : null;
      const selections = mesclarSelecao(selecoesValidas(values.selections), values.selection);
      const selection = mesclarSelecao([], values.selection).at(-1);
      let draft = previousDraft;
      let metrics = METRICAS_VAZIAS;
      if (!(selection && previousDraft && (selection.type === 'customer' || selection.type === 'choice'))) {
        const result = await respostaJson(await fetch('/api/recebimentos/solicitacao-voz/processar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ empresaId, mode, transcription: values.transcription, previousDraft }),
          signal,
        }));
        draft = validarRascunhoVozCampo(result.draft);
        metrics = (result.metrics || METRICAS_VAZIAS) as MetricasVozCampo;
      }
      if (!draft) throw new Error('A solicitação não passou pela validação de segurança.');
      const replacesPrevious = draft.replacePrevious;
      const stableDraft = { ...draft, replacePrevious: false };
      const stableSelections = replacesPrevious ? [] : selections;
      const response = construirResposta({ mode, draft: stableDraft, transcription: String(values.transcription || ''), metrics, selections: stableSelections, clientes, recebimentos, servicos, podeRegistrar, podeAgendar });
      if (response.kind === 'handoff' && response.action?.intent === 'prepare_service_registration' && response.action.serviceId) {
        onPrepararRegistroServico(response.action.companyId, response.action.subcompanyId, response.action.serviceId);
      }
      return {
        ...response,
        replacesPrevious,
      };
    }
    if (operation === 'execute') {
      const action = values.action as AcaoVozCampo | undefined;
      if (!action) throw new Error('A ação não passou pela validação de segurança.');
      if (action.intent === 'register_receipt' && action.amount && action.paymentMethod) {
        const amount = action.amount;
        if (action.receiptId) await onReceberCobranca(action.receiptId, amount, action.notes || '', action.paymentMethod);
        else await onRegistrarRecebimento(action.companyId, action.subcompanyId, amount, action.notes || '', action.paymentMethod);
        return { title: 'Recebimento registrado', message: `${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} recebido de ${action.customerName}.` };
      }
      if (action.intent === 'schedule_service' && action.scheduledDate && action.serviceType) {
        await onAgendarServico(action.companyId, action.subcompanyId, action.scheduledDate, action.serviceType);
        return { title: 'Serviço agendado', message: `Agendamento de ${action.customerName} criado com sucesso.` };
      }
      throw new Error('A ação não possui todos os dados necessários.');
    }
    return {};
  }, [cliente, clientes, empresaId, mode, offline, onAgendarServico, onPrepararRegistroServico, onReceberCobranca, onRegistrarRecebimento, podeAgendar, podeRegistrar, recebimentos, servicos]);

  return (
    <AvantaVoiceActionDock
      id={`operacoes-campo-voz-${mode}`}
      account={{ id: `${empresaId}:${userId}`, userId, label: mode === 'recebimentos' ? 'Recebimentos' : 'Serviços' }}
      storageNamespace={`avantalab.operacoes-campo.${mode}.voice-actions.v1`}
      allowSaveForLater={false}
      compactShortLists
      helpText={helpText}
      disabled={offline}
      request={request}
    />
  );
}
