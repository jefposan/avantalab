'use client';

import type { DadosRecebimentos } from './repo';
import type { AvaliacaoServico, FormaPagamentoRecebimento, Recebimento, Servico } from '../components/types';

const BANCO = 'avantalab.recebimentos.colaborador.offline';
const STORE_ESTADO = 'estado';
const STORE_FILA = 'fila';
const VERSAO = 1;
export const VALIDADE_ACESSO_OFFLINE_MS = 30 * 24 * 60 * 60 * 1000;

export type ContextoOffline = {
  chave: string;
  usuarioId: string;
  empresaId: string;
  colaboradorId: string;
  empresaNome: string;
  autorizadoAte: number;
  atualizadoEm: number;
};

type RecebimentoPendente = {
  tipo: 'recebimento';
  recebimentoEmpresaId?: string;
  subempresaId?: string | null;
  lancamentoId?: string;
  valor: number;
  observacao: string;
  formaPagamento: FormaPagamentoRecebimento;
  comprovante?: File | null;
  dataPagamento?: string | null;
};

type ServicoPendente = {
  tipo: 'servico';
  recebimentoEmpresaId: string;
  subempresaId: string | null;
  clienteNome: string;
  assinatura: string;
  avaliacao: AvaliacaoServico;
  observacaoCliente: string;
  servicoId: string;
};

export type OperacaoOffline = {
  id: string;
  contexto: string;
  criadoEm: number;
  tentativas: number;
} & (RecebimentoPendente | ServicoPendente);

type EstadoSalvo = {
  contexto: ContextoOffline;
  dados: DadosRecebimentos;
};

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (caractere) => {
    const aleatorio = Math.floor(Math.random() * 16);
    return (caractere === 'x' ? aleatorio : (aleatorio & 0x3) | 0x8).toString(16);
  });
}

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolver, rejeitar) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      rejeitar(new Error('O armazenamento local não está disponível neste aparelho.'));
      return;
    }
    const pedido = window.indexedDB.open(BANCO, VERSAO);
    pedido.onupgradeneeded = () => {
      if (!pedido.result.objectStoreNames.contains(STORE_ESTADO)) pedido.result.createObjectStore(STORE_ESTADO);
      if (!pedido.result.objectStoreNames.contains(STORE_FILA)) pedido.result.createObjectStore(STORE_FILA, { keyPath: 'id' });
    };
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rejeitar(pedido.error ?? new Error('Não foi possível abrir o armazenamento local.'));
  });
}

function ler<T>(store: IDBObjectStore, chave: IDBValidKey): Promise<T | null> {
  return new Promise((resolver, rejeitar) => {
    const pedido = store.get(chave);
    pedido.onsuccess = () => resolver((pedido.result as T | undefined) ?? null);
    pedido.onerror = () => rejeitar(pedido.error);
  });
}

function gravar(store: IDBObjectStore, valor: unknown, chave?: IDBValidKey): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    const pedido = chave === undefined ? store.put(valor) : store.put(valor, chave);
    pedido.onsuccess = () => resolver();
    pedido.onerror = () => rejeitar(pedido.error);
  });
}

function apagar(store: IDBObjectStore, chave: IDBValidKey): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    const pedido = store.delete(chave);
    pedido.onsuccess = () => resolver();
    pedido.onerror = () => rejeitar(pedido.error);
  });
}

function chaveContexto(usuarioId: string, empresaId: string) { return `${usuarioId}:${empresaId}`; }
function chaveEstado(contexto: string) { return `dados:${contexto}`; }
const CHAVE_ATIVA = 'sessao-ativa';

export async function salvarContextoOffline(
  dados: DadosRecebimentos,
  parametros: Omit<ContextoOffline, 'chave' | 'autorizadoAte' | 'atualizadoEm'>,
) {
  const agora = Date.now();
  const contexto: ContextoOffline = {
    ...parametros,
    chave: chaveContexto(parametros.usuarioId, parametros.empresaId),
    autorizadoAte: agora + VALIDADE_ACESSO_OFFLINE_MS,
    atualizadoEm: agora,
  };
  const banco = await abrirBanco();
  try {
    const transacao = banco.transaction(STORE_ESTADO, 'readwrite');
    const store = transacao.objectStore(STORE_ESTADO);
    await Promise.all([
      gravar(store, { contexto, dados } satisfies EstadoSalvo, chaveEstado(contexto.chave)),
      gravar(store, contexto.chave, CHAVE_ATIVA),
    ]);
  } finally { banco.close(); }
  return contexto;
}

export async function restaurarContextoOffline(): Promise<EstadoSalvo | null> {
  const banco = await abrirBanco();
  try {
    const store = banco.transaction(STORE_ESTADO, 'readonly').objectStore(STORE_ESTADO);
    const chave = await ler<string>(store, CHAVE_ATIVA);
    if (!chave) return null;
    const salvo = await ler<EstadoSalvo>(store, chaveEstado(chave));
    if (!salvo || salvo.contexto.autorizadoAte <= Date.now()) return null;
    return salvo;
  } finally { banco.close(); }
}

export async function limparContextoOffline(usuarioId?: string, empresaId?: string) {
  const banco = await abrirBanco();
  try {
    const estado = banco.transaction(STORE_ESTADO, 'readwrite').objectStore(STORE_ESTADO);
    const ativo = await ler<string>(estado, CHAVE_ATIVA);
    const alvo = usuarioId && empresaId ? chaveContexto(usuarioId, empresaId) : ativo;
    if (!alvo) return;
    await apagar(estado, chaveEstado(alvo));
    if (ativo === alvo) await apagar(estado, CHAVE_ATIVA);
    // A leitura e as remoções ocorrem em transações distintas: alguns
    // navegadores encerram a transação original depois de um await.
    const filaLeitura = banco.transaction(STORE_FILA, 'readonly').objectStore(STORE_FILA);
    const pendencias = await new Promise<OperacaoOffline[]>((resolver, rejeitar) => {
      const pedido = filaLeitura.getAll();
      pedido.onsuccess = () => resolver((pedido.result ?? []) as OperacaoOffline[]);
      pedido.onerror = () => rejeitar(pedido.error);
    });
    const filaEscrita = banco.transaction(STORE_FILA, 'readwrite').objectStore(STORE_FILA);
    await Promise.all(pendencias.filter((item) => item.contexto === alvo).map((item) => apagar(filaEscrita, item.id)));
  } finally { banco.close(); }
}

export async function enfileirarOperacao(
  contexto: ContextoOffline,
  dados: Omit<RecebimentoPendente, 'tipo'> | Omit<ServicoPendente, 'tipo'>,
  tipo: OperacaoOffline['tipo'],
) {
  const operacao = { id: uuid(), contexto: contexto.chave, criadoEm: Date.now(), tentativas: 0, tipo, ...dados } as OperacaoOffline;
  const banco = await abrirBanco();
  try { await gravar(banco.transaction(STORE_FILA, 'readwrite').objectStore(STORE_FILA), operacao); }
  finally { banco.close(); }
  return operacao;
}

export async function listarOperacoesOffline(contexto: ContextoOffline) {
  const banco = await abrirBanco();
  try {
    const operacoes = await new Promise<OperacaoOffline[]>((resolver, rejeitar) => {
      const pedido = banco.transaction(STORE_FILA, 'readonly').objectStore(STORE_FILA).getAll();
      pedido.onsuccess = () => resolver((pedido.result ?? []) as OperacaoOffline[]);
      pedido.onerror = () => rejeitar(pedido.error);
    });
    return operacoes.filter((item) => item.contexto === contexto.chave).sort((a, b) => a.criadoEm - b.criadoEm);
  } finally { banco.close(); }
}

export async function concluirOperacaoOffline(id: string) {
  const banco = await abrirBanco();
  try { await apagar(banco.transaction(STORE_FILA, 'readwrite').objectStore(STORE_FILA), id); }
  finally { banco.close(); }
}

export async function registrarTentativaOffline(operacao: OperacaoOffline) {
  const banco = await abrirBanco();
  try { await gravar(banco.transaction(STORE_FILA, 'readwrite').objectStore(STORE_FILA), { ...operacao, tentativas: operacao.tentativas + 1 }); }
  finally { banco.close(); }
}

export function aplicarOperacoesPendentes(dados: DadosRecebimentos, operacoes: OperacaoOffline[]): DadosRecebimentos {
  const recebimentos = [...dados.recebimentos];
  const servicos = [...dados.servicos];
  for (const operacao of operacoes) {
    if (operacao.tipo === 'servico') {
      const indice = servicos.findIndex((item) => item.id === operacao.servicoId);
      if (indice >= 0) {
        servicos[indice] = {
          ...servicos[indice], situacao: 'realizado', clienteNome: operacao.clienteNome,
          assinatura: operacao.assinatura, avaliacao: operacao.avaliacao,
          observacaoCliente: operacao.observacaoCliente, realizadoEm: new Date(operacao.criadoEm).toISOString(),
        };
      }
    } else if (operacao.lancamentoId) {
      const indice = recebimentos.findIndex((item) => item.id === operacao.lancamentoId);
      if (indice >= 0) {
        const atual = recebimentos[indice];
        recebimentos[indice] = {
          ...atual, valorRecebido: operacao.valor, recebidoEm: new Date(operacao.criadoEm).toISOString(),
          observacao: operacao.observacao || null, formaPagamento: operacao.formaPagamento,
          temComprovante: Boolean(operacao.comprovante), situacao: operacao.valor < atual.valorCombinado ? 'recebido_a_menor' : operacao.valor > atual.valorCombinado ? 'recebido_a_maior' : 'aguardando_conferencia',
        };
      }
    }
  }
  return { ...dados, recebimentos, servicos };
}

export function erroDeConexao(error: unknown) {
  const mensagem = error instanceof Error ? error.message : String(error ?? '');
  return typeof navigator !== 'undefined' && (!navigator.onLine || /fetch|network|conex|offline|timeout|tempo esperado|load failed/i.test(mensagem));
}
