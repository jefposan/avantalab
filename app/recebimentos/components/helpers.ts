// Funções utilitárias do estudo "Recebimentos em Campo".
import type { DiferencaTipo, FrequenciaRecebimento, LabelSituacao, Recebimento, SituacaoRecebimento } from './types';

export function dataLocalIso(referencia = new Date()): string {
  const local = new Date(referencia.getTime() - referencia.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function diferencaDiasIso(inicio: string, fim: string): number {
  const [anoInicio, mesInicio, diaInicio] = inicio.split('-').map(Number);
  const [anoFim, mesFim, diaFim] = fim.split('-').map(Number);
  const diferenca = Date.UTC(anoFim, mesFim - 1, diaFim) - Date.UTC(anoInicio, mesInicio - 1, diaInicio);
  return Math.max(0, Math.round(diferenca / (1000 * 60 * 60 * 24)));
}

export function proximasCobrancasPorEmpresa(recebimentos: Recebimento[], hojeIso: string): Recebimento[] {
  const empresasComProximo = new Set<string>();
  return recebimentos
    .filter(
      (recebimento) =>
        recebimento.valorRecebido == null &&
        recebimento.situacao === 'previsto' &&
        recebimento.vencimento >= hojeIso,
    )
    .sort(
      (a, b) =>
        a.vencimento.localeCompare(b.vencimento) ||
        a.empresaId.localeCompare(b.empresaId) ||
        a.id.localeCompare(b.id),
    )
    .filter((recebimento) => {
      if (empresasComProximo.has(recebimento.empresaId)) return false;
      empresasComProximo.add(recebimento.empresaId);
      return true;
    });
}

export const FREQUENCIAS_RECEBIMENTO: Array<[FrequenciaRecebimento, string]> = [
  ['semanal', 'Semanal'],
  ['quinzenal', 'Quinzenal'],
  ['mensal', 'Mensal'],
  ['trimestral', 'Trimestral'],
  ['semestral', 'Semestral'],
  ['anual', 'Anual'],
];

export function rotuloFrequenciaRecebimento(frequencia: FrequenciaRecebimento): string {
  return FREQUENCIAS_RECEBIMENTO.find(([valor]) => valor === frequencia)?.[1] ?? 'Mensal';
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// CPF: máscara 000.000.000-00 aplicada conforme o usuário digita.
export function formatarCpf(valor: string): string {
  const d = String(valor || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Só os dígitos do CPF (para armazenar/validar).
export function digitosCpf(valor: string): string {
  return String(valor || '').replace(/\D/g, '').slice(0, 11);
}

// Validação de CPF (11 dígitos + dígitos verificadores).
export function cpfValido(valor: string): boolean {
  const d = digitosCpf(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (base: number) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

// Nome próprio: primeira letra de cada palavra maiúscula, restante minúsculo.
// Preserva os espaços digitados (inclusive o do fim, para não travar a digitação).
export function formatarNomeProprio(valor: string): string {
  return String(valor || '')
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|\s|['’-])([\p{L}])/gu, (_, sep, letra) => sep + letra.toLocaleUpperCase('pt-BR'));
}

// Máscara de valor monetário (2 casas): trata os dígitos como centavos e
// exibe no formato brasileiro (ex.: 1500000 -> "15.000,00").
export function formatarValorInput(valor: string): string {
  const d = String(valor || '').replace(/\D/g, '');
  if (!d) return '';
  return (Number(d) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Converte um valor formatado (ou número) para número (reais).
export function parseValorBR(texto: string): number {
  const d = String(texto || '').replace(/\D/g, '');
  return d ? Number(d) / 100 : NaN;
}

// Exibe um número de reais na máscara do input (ex.: 1200 -> "1.200,00").
export function valorParaInput(valor: number): string {
  return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Formata o telefone no padrão (11) 99999-9999 (ou (11) 9999-9999 p/ fixo),
// aplicando a máscara conforme o usuário digita.
export function formatarTelefone(valor: string): string {
  const d = String(valor || '').replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}

// Classifica a diferença entre valor recebido e valor combinado.
export function tipoDiferenca(valorCombinado: number, valorRecebido: number | null): DiferencaTipo {
  if (valorRecebido == null) return 'exato';
  const dif = Number((valorRecebido - valorCombinado).toFixed(2));
  if (dif === 0) return 'exato';
  return dif < 0 ? 'menor' : 'maior';
}

// Deriva a situação a partir do valor registrado (antes da baixa do gestor).
export function situacaoPorValor(valorCombinado: number, valorRecebido: number): SituacaoRecebimento {
  const tipo = tipoDiferenca(valorCombinado, valorRecebido);
  if (tipo === 'menor') return 'recebido_a_menor';
  if (tipo === 'maior') return 'recebido_a_maior';
  return 'aguardando_conferencia';
}

const MAPA: Record<SituacaoRecebimento, LabelSituacao> = {
  previsto: { texto: 'Previsto', cor: '#475569', fundo: '#e2e8f0' },
  aguardando_conferencia: { texto: 'Aguardando conferência', cor: '#92600a', fundo: '#fef3c7' },
  baixado: { texto: 'Baixado', cor: '#166534', fundo: '#dcfce7' },
  recebido_a_menor: { texto: 'Recebido a menor', cor: '#9a3412', fundo: '#ffedd5' },
  recebido_a_maior: { texto: 'Recebido a maior', cor: '#1e40af', fundo: '#dbeafe' },
  em_atraso: { texto: 'Em atraso', cor: '#b91c1c', fundo: '#fee2e2' },
  devolvido_para_correcao: { texto: 'Devolvido p/ correção', cor: '#6d28d9', fundo: '#ede9fe' },
};

export function rotuloSituacao(s: SituacaoRecebimento): LabelSituacao {
  return MAPA[s];
}

// Estados que ainda estão "aguardando conferência" (pendentes de baixa).
export function aguardandoConferencia(s: SituacaoRecebimento): boolean {
  return s === 'aguardando_conferencia' || s === 'recebido_a_menor' || s === 'recebido_a_maior';
}

export function diasEmAtraso(vencimento: string, hoje: Date): number {
  return diferencaDiasIso(vencimento, dataLocalIso(hoje));
}

// Primeiro e último dia (ISO YYYY-MM-DD) de um mês "YYYY-MM".
export function limitesDoMes(chaveMes: string): { inicio: string; fim: string } {
  const [ano, mes] = chaveMes.split('-').map(Number);
  const ultimo = new Date(ano, mes, 0).getDate();
  return { inicio: `${chaveMes}-01`, fim: `${chaveMes}-${String(ultimo).padStart(2, '0')}` };
}

export function mesmoDia(iso: string | null, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}
