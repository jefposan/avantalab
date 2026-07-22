'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

type TipoDocumento = 'automatico' | 'extrato-bancario' | 'fatura-cartao';
type TipoDetectado = Exclude<TipoDocumento, 'automatico'>;

type DespesaRevisao = {
  id: string;
  data: string;
  descricao: string;
  descricaoOriginal: string;
  valor: number;
  valorOriginal: number;
  tipo: string;
  tipoSugeridoHistorico?: boolean;
  incluir: boolean;
  natureza: 'despesa' | 'estorno';
};

type ItemIA = {
  pagina: number;
  cartao_final: string | null;
  data: string | null;
  descricao: string;
  valor: number;
};

type AnaliseIA = {
  tipo_documento: TipoDetectado;
  total_documento: number | null;
  despesas: ItemIA[];
  estornos: ItemIA[];
};

type SugestaoHistorico = { id: string; tipo: string; ocorrencias: number };

type Props = {
  arquivo: File | null;
  retomarRascunho?: boolean;
  empresaId: string;
  mesDestino: string;
  anoDestino: number;
  despesasCadastradas: Array<{ nome: string }>;
  corPrimaria: string;
  darkMode: boolean;
  onFechar: () => void;
  onConcluido: () => void | Promise<void>;
  onEstadoRascunho?: (existe: boolean) => void;
  onArquivoDescartado?: () => void;
  onSessaoExpirada?: () => void;
  onSolicitarDescarte?: (descartar: () => void) => void;
};

const CHAVE_RASCUNHO = 'avanta:importador-despesas:inline:v1';

type RascunhoImportador = {
  versao: 1;
  empresaId: string;
  mesDestino: string;
  anoDestino: number;
  loteChave: string;
  nomeArquivo: string;
  tipoDocumento: TipoDocumento;
  tipoDetectado: TipoDetectado | null;
  totalDocumento: number | null;
  itens: DespesaRevisao[];
  salvoEm: string;
};

export function existeRascunhoImportador() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.localStorage.getItem(CHAVE_RASCUNHO));
}

function moeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}
function valorComDuasCasas(valor: number) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function id() { return `importacao-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function dataExibida(data: string) {
  const [ano, mes, dia] = data.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : 'Não identificada';
}
function parseData(valor: unknown) {
  const texto = String(valor ?? '').trim();
  const brasileira = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (brasileira) return `${brasileira[3].length === 2 ? `20${brasileira[3]}` : brasileira[3]}-${brasileira[2].padStart(2, '0')}-${brasileira[1].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : '';
}
const MESES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
function dataNoMesDestino(data: string, mesDestino: string, anoDestino: number) {
  const indice = MESES.indexOf(mesDestino);
  if (indice < 0 || !Number.isInteger(anoDestino)) return data;
  const diaInformado = Number(data.split('-')[2]) || 1;
  const ultimoDia = new Date(anoDestino, indice + 1, 0).getDate();
  return `${anoDestino}-${String(indice + 1).padStart(2, '0')}-${String(Math.min(Math.max(diaInformado, 1), ultimoDia)).padStart(2, '0')}`;
}
function parseValor(valor: unknown) {
  if (typeof valor === 'number') return valor;
  const texto = String(valor ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
  const negativo = /^-/.test(texto) || /^\(.+\)$/.test(texto);
  const limpo = texto.replace(/[()\-]/g, '');
  const numero = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  return negativo ? -numero : numero;
}
function normalizar(valor: unknown) { return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function dividirLinha(linha: string, separador: string) {
  const partes: string[] = []; let atual = ''; let aspas = false;
  for (let indice = 0; indice < linha.length; indice += 1) {
    const caractere = linha[indice];
    if (caractere === '"') { if (aspas && linha[indice + 1] === '"') { atual += '"'; indice += 1; } else aspas = !aspas; }
    else if (caractere === separador && !aspas) { partes.push(atual.trim()); atual = ''; }
    else atual += caractere;
  }
  partes.push(atual.trim()); return partes;
}
function linhasTabulares(cabecalhos: string[], linhas: unknown[][]): DespesaRevisao[] {
  const nomes = cabecalhos.map(normalizar);
  const indice = (termos: string[]) => nomes.findIndex((nome) => termos.some((termo) => nome.includes(termo)));
  const data = indice(['data', 'date']), descricao = indice(['descricao', 'historico', 'lancamento', 'favorecido', 'detalhe']);
  const debito = indice(['debito', 'saida', 'pagamento']), credito = indice(['credito', 'entrada', 'recebimento']);
  const valor = indice(['valor', 'amount', 'montante']), natureza = indice(['tipo', 'natureza', 'd/c', 'dc', 'movimento']);
  return linhas.flatMap((linha) => {
    const valorDebito = debito >= 0 ? parseValor(linha[debito]) : Number.NaN;
    const valorGeral = valor >= 0 ? parseValor(linha[valor]) : Number.NaN;
    const codigo = natureza >= 0 ? normalizar(linha[natureza]) : '';
    const entrada = (credito >= 0 && Number.isFinite(parseValor(linha[credito])) && parseValor(linha[credito]) !== 0) || /credito|entrada|recebimento|\bc\b/.test(codigo);
    const bruto = Number.isFinite(valorDebito) ? valorDebito : valorGeral;
    const saida = (Number.isFinite(valorDebito) && valorDebito !== 0) || bruto < 0 || /debito|saida|pagamento|\bd\b/.test(codigo);
    if (!Number.isFinite(bruto) || bruto === 0 || entrada || !saida) return [];
    const texto = String(descricao >= 0 ? linha[descricao] ?? '' : '').trim() || 'Despesa sem descrição';
    const valorLancamento = Math.abs(bruto);
    return [{ id: id(), data: data >= 0 ? parseData(linha[data]) : '', descricao: texto, descricaoOriginal: texto, valor: valorLancamento, valorOriginal: valorLancamento, tipo: '', incluir: true, natureza: 'despesa' as const }];
  });
}
function lerTexto(conteudo: string) {
  const linhas = conteudo.replace(/^\uFEFF/, '').split(/\r?\n/).filter((linha) => linha.trim());
  if (linhas.length < 2) return [];
  const separador = [';', '\t', ','].sort((a, b) => linhas[0].split(b).length - linhas[0].split(a).length)[0];
  return linhasTabulares(dividirLinha(linhas[0], separador), linhas.slice(1).map((linha) => dividirLinha(linha, separador)));
}
async function sha256(texto: string | ArrayBuffer) {
  const bytes = typeof texto === 'string' ? new TextEncoder().encode(texto) : texto;
  const resumo = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(resumo), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function Progresso({ percentual, titulo, detalhe, corPrimaria, darkMode }: { percentual: number; titulo: string; detalhe: string; corPrimaria: string; darkMode: boolean }) {
  return <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-950/75 px-4" role="status" aria-live="polite">
    <section className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      <div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-sm font-black">{titulo}</p><p className={`mt-1 text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>{detalhe}</p></div><strong className="text-2xl tabular-nums" style={{ color: corPrimaria }}>{percentual}%</strong></div>
      <div className={`h-2.5 overflow-hidden rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${percentual}%`, backgroundColor: corPrimaria }} /></div>
      <p className={`mt-3 text-[11px] font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Não feche esta janela enquanto o processamento estiver em andamento.</p>
    </section>
  </div>;
}

export default function ImportadorDespesasModal({ arquivo, retomarRascunho = false, empresaId, mesDestino, anoDestino, despesasCadastradas, corPrimaria, darkMode, onFechar, onConcluido, onEstadoRascunho, onArquivoDescartado, onSessaoExpirada, onSolicitarDescarte }: Props) {
  const [etapa, setEtapa] = useState<'analisando' | 'revisando' | 'confirmando'>('analisando');
  const [progresso, setProgresso] = useState(7);
  const [detalhe, setDetalhe] = useState('Preparando o documento…');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('automatico');
  const [tipoDetectado, setTipoDetectado] = useState<TipoDetectado | null>(null);
  const [itens, setItens] = useState<DespesaRevisao[]>([]);
  const [totalDocumento, setTotalDocumento] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const [loteChave, setLoteChave] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [salvoEm, setSalvoEm] = useState('');
  const [rascunhoRemoto, setRascunhoRemoto] = useState<RascunhoImportador | null>(null);
  const [valoresDigitados, setValoresDigitados] = useState<Record<string, string>>({});
  const focoLinhas = useRef<Record<string, HTMLSelectElement | null>>({});
  const progressoAtual = useRef(7);
  const emAnalise = useRef(false);
  const tipos = useMemo(() => despesasCadastradas.map((despesa) => despesa.nome).filter(Boolean), [despesasCadastradas]);
  const despesas = useMemo(() => itens.filter((item) => item.natureza === 'despesa'), [itens]);
  const estornos = useMemo(() => itens.filter((item) => item.natureza === 'estorno'), [itens]);
  const selecionadas = useMemo(() => despesas.filter((item) => item.incluir), [despesas]);
  const totalDespesasDocumento = useMemo(() => despesas.reduce((soma, item) => soma + item.valorOriginal, 0), [despesas]);
  const totalEstornosDocumento = useMemo(() => estornos.reduce((soma, item) => soma + item.valorOriginal, 0), [estornos]);
  const totalLiquidoDocumento = totalDespesasDocumento - totalEstornosDocumento;
  const totalParaLancar = useMemo(() => selecionadas.reduce((soma, item) => soma + item.valor, 0), [selecionadas]);
  const diferenca = totalDocumento === null ? null : totalLiquidoDocumento - totalDocumento;
  const confere = diferenca !== null && Math.abs(diferenca) <= 0.02;

  const atualizar = (itemId: string, alteracao: Partial<DespesaRevisao>) => setItens((atuais) => atuais.map((item) => item.id === itemId ? { ...item, ...alteracao } : item));

  const executarComSessao = async (executar: (token: string) => Promise<Response>) => {
    const { data: sessaoAtual } = await supabase.auth.getSession();
    let token = sessaoAtual.session?.access_token || null;

    if (!token) {
      const { data: sessaoRenovada, error } = await supabase.auth.refreshSession();
      if (!error) token = sessaoRenovada.session?.access_token || null;
    }

    if (!token) {
      onSessaoExpirada?.();
      return null;
    }

    let resposta = await executar(token);
    if (resposta.status !== 401) return resposta;

    const { data: sessaoRenovada, error } = await supabase.auth.refreshSession();
    const tokenRenovado = error ? null : sessaoRenovada.session?.access_token;
    if (!tokenRenovado) {
      onSessaoExpirada?.();
      return null;
    }

    resposta = await executar(tokenRenovado);
    if (resposta.status === 401) {
      onSessaoExpirada?.();
      return null;
    }

    return resposta;
  };

  const sugerirTiposPeloHistorico = async (reconhecidos: DespesaRevisao[]) => {
    const candidatos = reconhecidos.filter((item) => item.natureza === 'despesa' && item.descricao.trim());
    if (!candidatos.length || !empresaId) return reconhecidos;
    const resposta = await executarComSessao((token) => fetch('/api/importador-despesas/sugestoes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresaId, itens: candidatos.map((item) => ({ id: item.id, descricao: item.descricao })) }),
    }));
    if (!resposta) return reconhecidos;
    const corpo = await resposta.json().catch(() => null);
    if (!resposta.ok || corpo?.erro || !Array.isArray(corpo?.sugestoes)) return reconhecidos;
    const sugestoes = new Map<string, SugestaoHistorico>((corpo.sugestoes as SugestaoHistorico[])
      .filter((sugestao) => sugestao && typeof sugestao.id === 'string' && typeof sugestao.tipo === 'string' && tipos.includes(sugestao.tipo))
      .map((sugestao) => [sugestao.id, sugestao]));
    return reconhecidos.map((item) => {
      const sugestao = sugestoes.get(item.id);
      return sugestao && !item.tipo ? { ...item, tipo: sugestao.tipo, tipoSugeridoHistorico: true } : item;
    });
  };

  const fechar = () => {
    setItens([]); setValoresDigitados({}); setErro(''); setSalvoEm(''); setEtapa('analisando');
    onFechar();
  };

  const analisar = async (tipo: TipoDocumento) => {
    if (!arquivo || emAnalise.current) return;
    emAnalise.current = true;
    progressoAtual.current = 7;
    setEtapa('analisando'); setTipoDocumento(tipo); setProgresso(7); setDetalhe('Preparando o documento…'); setErro('');
    const cronometro = window.setInterval(() => {
      const atual = progressoAtual.current;
      const proximo = Math.min(91, atual + (atual < 42 ? 7 : atual < 72 ? 4 : 2));
      progressoAtual.current = proximo;
      setProgresso(proximo);
      setDetalhe(proximo < 35 ? 'Lendo o arquivo…' : proximo < 70 ? 'Identificando lançamentos…' : 'Conferindo totais e estornos…');
    }, 620);
    try {
      const extensao = arquivo.name.split('.').pop()?.toLowerCase();
      let encontrados: DespesaRevisao[] = []; let detectado: TipoDetectado | null = null; let total: number | null = null;
      if (extensao === 'pdf') {
        const form = new FormData(); form.append('arquivo', arquivo); form.append('tipoDocumento', tipo);
        const resposta = await executarComSessao((token) => fetch('/api/importador-despesas/analisar', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }));
        if (!resposta) return;
        const corpo = await resposta.json().catch(() => null);
        if (!resposta.ok || corpo?.erro) throw new Error(corpo?.mensagem || 'Não foi possível analisar este documento.');
        const analise = corpo as AnaliseIA;
        detectado = analise.tipo_documento; total = analise.total_documento;
        const converter = (item: ItemIA, natureza: 'despesa' | 'estorno'): DespesaRevisao[] => {
          if (!item.data || !item.descricao || !Number.isFinite(item.valor) || item.valor <= 0) return [];
          const cartao = item.cartao_final ? ` · cartão ${item.cartao_final}` : '';
          return [{ id: id(), data: parseData(item.data), descricao: item.descricao, descricaoOriginal: `Página ${item.pagina}${cartao}`, valor: item.valor, valorOriginal: item.valor, tipo: '', incluir: natureza === 'despesa', natureza }];
        };
        encontrados = [...analise.despesas.flatMap((item) => converter(item, 'despesa')), ...analise.estornos.flatMap((item) => converter(item, 'estorno'))];
      } else if (extensao === 'csv' || extensao === 'txt') {
        encontrados = lerTexto(await arquivo.text()); detectado = 'extrato-bancario';
      } else if (extensao === 'xls' || extensao === 'xlsx') {
        const XLSX = await import('xlsx'); const planilha = XLSX.read(await arquivo.arrayBuffer(), { type: 'array', cellDates: true });
        const matriz = XLSX.utils.sheet_to_json<unknown[]>(planilha.Sheets[planilha.SheetNames[0]], { header: 1, defval: '' });
        encontrados = matriz.length > 1 ? linhasTabulares((matriz[0] as unknown[]).map(String), matriz.slice(1) as unknown[][]) : []; detectado = 'extrato-bancario';
      } else throw new Error('Envie PDF, CSV, TXT, XLS ou XLSX. Imagens continuam sendo usadas como nota do lançamento.');
      if (!encontrados.length) throw new Error('Nenhuma saída confiável foi encontrada neste documento.');
      setDetalhe('Consultando sugestões do seu histórico…');
      encontrados = (await sugerirTiposPeloHistorico(encontrados)).map((item) => ({ ...item, data: dataNoMesDestino(item.data, mesDestino, anoDestino) }));
      setProgresso(100); setDetalhe('Análise concluída.');
      const chaveLote = await sha256(await arquivo.arrayBuffer());
      setItens(encontrados); setTipoDetectado(detectado); setTotalDocumento(total); setNomeArquivo(arquivo.name); setSalvoEm(''); setLoteChave(chaveLote);
      if (extensao === 'pdf') onArquivoDescartado?.();
      window.setTimeout(() => setEtapa('revisando'), 350);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível analisar este documento.');
      setEtapa('revisando');
    } finally { window.clearInterval(cronometro); emAnalise.current = false; }
  };

  useEffect(() => { if (arquivo) void analisar('automatico'); }, [arquivo]);

  useEffect(() => {
    if (!empresaId) return;
    const sincronizar = async () => {
      const { data: sessao } = await supabase.auth.getSession(); const usuarioId = sessao.session?.user.id;
      if (!usuarioId) return;
      const salvo = window.localStorage.getItem(CHAVE_RASCUNHO);
      const local = salvo ? JSON.parse(salvo) as RascunhoImportador : null;
      if (local?.versao === 1 && local.empresaId === empresaId && local.mesDestino === mesDestino && local.anoDestino === anoDestino && Array.isArray(local.itens)) {
        const { error } = await supabase.from('importador_despesas_rascunhos').upsert({ empresa_id: empresaId, usuario_id: usuarioId, ano: anoDestino, mes: mesDestino, dados: local, atualizado_em: new Date().toISOString() }, { onConflict: 'empresa_id,usuario_id,ano,mes' });
        if (!error) window.localStorage.removeItem(CHAVE_RASCUNHO);
      }
      const { data } = await supabase.from('importador_despesas_rascunhos').select('dados').eq('empresa_id', empresaId).eq('usuario_id', usuarioId).eq('ano', anoDestino).eq('mes', mesDestino).maybeSingle();
      const remoto = data?.dados as RascunhoImportador | null;
      if (remoto?.versao === 1 && remoto.empresaId === empresaId && remoto.mesDestino === mesDestino && remoto.anoDestino === anoDestino && Array.isArray(remoto.itens)) { setRascunhoRemoto(remoto); onEstadoRascunho?.(true); }
      else { setRascunhoRemoto(null); onEstadoRascunho?.(false); }
    };
    void sincronizar();
  }, [empresaId, mesDestino, anoDestino]);

  useEffect(() => {
    if (!retomarRascunho || arquivo) return;
    try {
      const salvo = window.localStorage.getItem(CHAVE_RASCUNHO);
      const rascunho = rascunhoRemoto || (salvo ? JSON.parse(salvo) as RascunhoImportador : null);
      if (!rascunho || rascunho.versao !== 1 || rascunho.empresaId !== empresaId || rascunho.mesDestino !== mesDestino || rascunho.anoDestino !== anoDestino || !Array.isArray(rascunho.itens)) throw new Error('Não existe uma importação salva para este mês.');
      setItens(rascunho.itens.map((item) => ({ ...item, valorOriginal: Number.isFinite(item.valorOriginal) ? item.valorOriginal : item.valor })));
      setLoteChave(rascunho.loteChave); setNomeArquivo(rascunho.nomeArquivo); setTipoDocumento(rascunho.tipoDocumento); setTipoDetectado(rascunho.tipoDetectado); setTotalDocumento(rascunho.totalDocumento); setSalvoEm(rascunho.salvoEm); setErro(''); setEtapa('revisando');
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível recuperar o rascunho.'); setEtapa('revisando'); onEstadoRascunho?.(false);
    }
  }, [retomarRascunho, arquivo, empresaId, mesDestino, anoDestino, onEstadoRascunho, rascunhoRemoto]);

  const salvarRascunho = async () => {
    if (!itens.length) { setErro('Aguarde a análise terminar antes de salvar o rascunho.'); return false; }
    const chave = loteChave || crypto.randomUUID();
    const agora = new Date().toLocaleString('pt-BR');
    const rascunho: RascunhoImportador = { versao: 1, empresaId, mesDestino, anoDestino, loteChave: chave, nomeArquivo: nomeArquivo || arquivo?.name || 'Documento importado', tipoDocumento, tipoDetectado, totalDocumento, itens, salvoEm: agora };
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session?.user.id) { setErro('Sua sessão expirou. Entre novamente.'); return false; }
    const { error: erroServidor } = await supabase.from('importador_despesas_rascunhos').upsert({ empresa_id: empresaId, usuario_id: sessao.session.user.id, ano: anoDestino, mes: mesDestino, dados: rascunho, atualizado_em: new Date().toISOString() }, { onConflict: 'empresa_id,usuario_id,ano,mes' });
    if (erroServidor) { setErro('Não foi possível salvar o rascunho no servidor.'); return false; }
    window.localStorage.removeItem(CHAVE_RASCUNHO); setRascunhoRemoto(rascunho);
    setLoteChave(chave); setSalvoEm(agora); setErro(''); onEstadoRascunho?.(true);
    return true;
  };

  useEffect(() => {
    if (etapa !== 'revisando' || !itens.length || !empresaId) return;
    const agendamento = window.setTimeout(() => {
      const chave = loteChave || crypto.randomUUID();
      const agora = new Date().toLocaleString('pt-BR');
      const rascunho: RascunhoImportador = { versao: 1, empresaId, mesDestino, anoDestino, loteChave: chave, nomeArquivo: nomeArquivo || arquivo?.name || 'Documento importado', tipoDocumento, tipoDetectado, totalDocumento, itens, salvoEm: agora };
      void supabase.auth.getSession().then(async ({ data }) => {
        const usuarioId = data.session?.user.id;
        if (!usuarioId) return;
        const { error } = await supabase.from('importador_despesas_rascunhos').upsert({ empresa_id: empresaId, usuario_id: usuarioId, ano: anoDestino, mes: mesDestino, dados: rascunho, atualizado_em: new Date().toISOString() }, { onConflict: 'empresa_id,usuario_id,ano,mes' });
        if (!error) { window.localStorage.removeItem(CHAVE_RASCUNHO); setRascunhoRemoto(rascunho); }
      });
      if (!loteChave) setLoteChave(chave);
      setSalvoEm(agora); onEstadoRascunho?.(true);
    }, 700);
    return () => window.clearTimeout(agendamento);
  }, [etapa, itens, empresaId, mesDestino, anoDestino, loteChave, nomeArquivo, arquivo?.name, tipoDocumento, tipoDetectado, totalDocumento, onEstadoRascunho]);

  const salvarEFechar = async () => { if (await salvarRascunho()) fechar(); };

  const descartarRascunho = () => {
    void supabase.auth.getSession().then(async ({ data }) => {
      const usuarioId = data.session?.user.id;
      if (!usuarioId) return;
      await supabase.from('importador_despesas_rascunhos').delete().eq('empresa_id', empresaId).eq('usuario_id', usuarioId).eq('ano', anoDestino).eq('mes', mesDestino);
    });
    window.localStorage.removeItem(CHAVE_RASCUNHO); setRascunhoRemoto(null);
    onEstadoRascunho?.(false);
    fechar();
  };

  const confirmar = async () => {
    if (!confere) { setErro('A soma ainda não confere com o total informado no documento. Revise ou refaça a análise.'); return; }
    const pendente = selecionadas.find((item) => !item.tipo || !Number.isFinite(item.valor) || item.valor <= 0);
    if (pendente) {
      setErro('Escolha o tipo de despesa e informe um valor maior que zero para todos os lançamentos selecionados.');
      window.setTimeout(() => { focoLinhas.current[pendente.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); focoLinhas.current[pendente.id]?.focus(); }, 0);
      return;
    }
    setEtapa('confirmando'); setProgresso(18); setDetalhe('Validando os lançamentos…');
    const cronometro = window.setInterval(() => setProgresso((atual) => Math.min(91, atual + 9)), 500);
    try {
      const lancamentos = await Promise.all(selecionadas.map(async (item, indice) => ({ data: item.data, tipo_despesa: item.tipo, descricao: item.descricao.trim(), valor: Number(item.valor.toFixed(2)), item_chave: await sha256(`${loteChave}|${indice}|${item.data}|${item.descricaoOriginal}|${item.valor.toFixed(2)}`) })));
      const resposta = await executarComSessao((token) => fetch('/api/importador-despesas/confirmar', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ empresaId, loteChave, lancamentos }) }));
      if (!resposta) return;
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || corpo?.erro) throw new Error(corpo?.mensagem || 'Não foi possível inserir os lançamentos.');
      setProgresso(100); setDetalhe('Lançamentos inseridos com sucesso.');
      const { data: sessaoAtual } = await supabase.auth.getSession(); const usuarioId = sessaoAtual.session?.user.id; if (usuarioId) await supabase.from('importador_despesas_rascunhos').delete().eq('empresa_id', empresaId).eq('usuario_id', usuarioId).eq('ano', anoDestino).eq('mes', mesDestino); window.localStorage.removeItem(CHAVE_RASCUNHO); setRascunhoRemoto(null); onEstadoRascunho?.(false);
      await onConcluido();
      window.setTimeout(fechar, 450);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível inserir os lançamentos.'); setEtapa('revisando');
    } finally { window.clearInterval(cronometro); }
  };

  if (!arquivo && !retomarRascunho && !itens.length) return null;
  if (etapa === 'analisando' || etapa === 'confirmando') return <Progresso percentual={progresso} titulo={etapa === 'analisando' ? 'Analisando documento' : 'Inserindo lançamentos'} detalhe={detalhe} corPrimaria={corPrimaria} darkMode={darkMode} />;

  return <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-950/75 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-importador">
    <section className={`flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl shadow-2xl ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      <header className="flex items-start justify-between gap-4 px-5 py-4 text-white" style={{ backgroundColor: corPrimaria }}>
        <div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/75">Importação assistida</p><h2 id="titulo-importador" className="mt-1 text-lg font-black">Confira as despesas antes de lançar</h2><p className="mt-1 text-xs font-semibold text-white/80">{nomeArquivo || arquivo?.name || 'Rascunho salvo'} · {tipoDetectado === 'fatura-cartao' ? 'Fatura de cartão' : 'Extrato ou planilha'}</p></div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2"><button type="button" onClick={() => void salvarEFechar()} className="h-10 rounded-xl bg-white px-3 text-xs font-black shadow-sm" style={{ color: corPrimaria }}>Salvar e continuar depois</button>{salvoEm && <button type="button" onClick={() => onSolicitarDescarte?.(descartarRascunho)} className="h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 hover:bg-red-100">Descartar</button>}<button type="button" onClick={fechar} className="h-10 rounded-xl border border-white/50 px-3 text-xs font-black text-white hover:bg-white/10">Fechar</button><button type="button" disabled={!arquivo} onClick={() => void analisar(tipoDocumento)} title={arquivo ? 'Analisar novamente este documento' : 'Envie novamente o documento para refazer a análise'} className="h-10 rounded-xl border border-white/50 px-3 text-xs font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">Refazer análise</button></div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {erro && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">{erro}</div>}
        <div className="mb-2 text-xs font-semibold text-slate-500">A conferência usa os valores originais reconhecidos. O <strong>valor a lançar</strong> pode ser ajustado — por exemplo, para lançar apenas a sua parte de uma compra compartilhada.</div>{salvoEm && <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">Rascunho salvo neste navegador em {salvoEm}. Você pode fechar e continuar depois.</div>}
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Resumo titulo="Despesas reconhecidas" valor={moeda(totalDespesasDocumento)} detalhe={`${despesas.length} lançamentos`} darkMode={darkMode} /><Resumo titulo="Estornos e créditos" valor={`− ${moeda(totalEstornosDocumento)}`} detalhe={`${estornos.length} separados`} darkMode={darkMode} /><Resumo titulo="Total a lançar" valor={moeda(totalParaLancar)} destaque corPrimaria={corPrimaria} detalhe="Após seus ajustes" darkMode={darkMode} /><label className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}><span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">Total no documento</span><input value={totalDocumento === null ? '' : totalDocumento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={(event) => setTotalDocumento(Number.isFinite(parseValor(event.target.value)) ? Math.abs(parseValor(event.target.value)) : null)} placeholder="R$ 0,00" className={`mt-1 w-full bg-transparent text-lg font-black outline-none ${darkMode ? 'text-white' : 'text-slate-900'}`} inputMode="decimal" /><small className={`block text-[11px] font-semibold ${confere ? 'text-emerald-700' : 'text-red-700'}`}>{diferenca === null ? 'Informe o total para conferir.' : confere ? '✓ O original confere.' : `Diferença de ${moeda(Math.abs(diferenca))}`}</small></label><label className={`rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}><span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">Tipo de documento</span><select value={tipoDocumento} onChange={(event) => setTipoDocumento(event.target.value as TipoDocumento)} className={`mt-1 w-full bg-transparent text-sm font-bold outline-none ${darkMode ? 'text-white' : 'text-slate-900'}`}><option value="automatico">Detectar automaticamente</option><option value="extrato-bancario">Extrato bancário</option><option value="fatura-cartao">Fatura de cartão</option></select><small className="block pt-2 text-[11px] font-semibold text-slate-500">Use Refazer após alterar.</small></label></div>
        {!tipos.length && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Cadastre ao menos um tipo de despesa antes de confirmar esta importação.</div>}
        {!confere && totalDocumento !== null && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">A confirmação está bloqueada enquanto a soma não conferir. Revise os itens ou use <strong>Refazer análise</strong>.</div>}
        <div className={`overflow-x-auto rounded-xl border ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><table className="w-full min-w-[760px] text-left text-sm"><thead className={darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}><tr><th className="p-3">Incluir</th><th className="p-3">Data</th><th className="p-3">Descrição</th><th className="p-3">Valor a lançar</th><th className="p-3">Tipo da despesa</th></tr></thead><tbody>{despesas.map((item) => <tr key={item.id} className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} ${!item.incluir ? 'opacity-50' : ''}`}><td className="p-3"><input type="checkbox" checked={item.incluir} onChange={(event) => atualizar(item.id, { incluir: event.target.checked })} aria-label={`Incluir ${item.descricao}`} /></td><td className="p-3 whitespace-nowrap">{dataExibida(item.data)}</td><td className="p-3"><input value={item.descricao} onChange={(event) => atualizar(item.id, { descricao: event.target.value, tipoSugeridoHistorico: false })} className={`w-full min-w-[190px] rounded-lg border px-2 py-1.5 text-xs ${darkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-900'}`} /><small className="mt-1 block text-[10px] font-semibold text-slate-500">{item.descricaoOriginal}</small></td><td className="p-3"><label className="sr-only" htmlFor={`valor-${item.id}`}>Valor a lançar de {item.descricao}</label><div className={`flex w-28 items-center rounded-lg border px-2 py-1.5 ${item.valor <= 0 ? 'border-red-300 bg-red-50' : darkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-900'}`}><input id={`valor-${item.id}`} value={valoresDigitados[item.id] ?? valorComDuasCasas(item.valor)} onChange={(event) => { const digitos = event.target.value.replace(/\D/g, ''); if (!digitos) { setValoresDigitados((atuais) => ({ ...atuais, [item.id]: '' })); atualizar(item.id, { valor: 0 }); return; } const valor = parseInt(digitos, 10) / 100; setValoresDigitados((atuais) => ({ ...atuais, [item.id]: valorComDuasCasas(valor) })); atualizar(item.id, { valor }); }} inputMode="numeric" className="min-w-0 flex-1 bg-transparent text-right text-xs font-black outline-none" /></div><small className="mt-1 block text-[10px] font-semibold text-slate-500">Original: {moeda(item.valorOriginal)}</small></td><td className="p-3"><select ref={(element) => { focoLinhas.current[item.id] = element; }} value={item.tipo} onChange={(event) => atualizar(item.id, { tipo: event.target.value, tipoSugeridoHistorico: false })} className={`min-w-[180px] rounded-lg border px-2 py-1.5 text-xs font-bold ${!item.tipo ? 'border-red-300 bg-red-50' : darkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-900'}`}><option value="">Selecionar tipo</option>{tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}</select>{item.tipoSugeridoHistorico && <small className="mt-1 block text-[10px] font-bold text-emerald-700">Sugerido pelo seu histórico</small>}</td></tr>)}</tbody></table></div>
        {estornos.length > 0 && <section className={`mt-5 overflow-hidden rounded-xl border ${darkMode ? 'border-emerald-900 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50/40'}`}><div className="p-4"><h3 className="font-black">Estornos e créditos</h3><p className="mt-1 text-xs font-semibold text-slate-500">Eles não serão lançados como despesas nesta etapa.</p></div><table className="w-full text-left text-sm"><tbody>{estornos.map((item) => <tr key={item.id} className={`border-t ${darkMode ? 'border-emerald-900' : 'border-emerald-100'}`}><td className="p-3">{dataExibida(item.data)}</td><td className="p-3">{item.descricao}</td><td className="p-3 font-black text-emerald-700">{moeda(item.valor)}</td></tr>)}</tbody></table></section>}
      </div>
      <footer className={`flex flex-col-reverse gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}><p className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>{selecionadas.length} despesa{selecionadas.length === 1 ? '' : 's'} selecionada{selecionadas.length === 1 ? '' : 's'} · {moeda(totalParaLancar)}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void salvarEFechar()} className={`h-11 rounded-xl border px-4 text-sm font-black ${darkMode ? 'border-slate-600 text-slate-200' : 'border-slate-300 text-slate-600'}`}>Salvar e continuar depois</button><button type="button" onClick={() => void confirmar()} disabled={!confere || !selecionadas.length || !tipos.length} className="h-11 rounded-xl px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: corPrimaria }}>Confirmar e lançar despesas</button></div></footer>
    </section>
  </div>;
}

function Resumo({ titulo, valor, detalhe, destaque = false, corPrimaria, darkMode }: { titulo: string; valor: string; detalhe: string; destaque?: boolean; corPrimaria?: string; darkMode: boolean }) {
  return <div className={`rounded-xl border p-3 ${destaque ? 'text-white' : darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`} style={destaque ? { backgroundColor: corPrimaria } : undefined}><span className={`block text-[11px] font-black uppercase tracking-wide ${destaque ? 'text-white/75' : 'text-slate-500'}`}>{titulo}</span><strong className="mt-1 block text-lg">{valor}</strong><small className={`block text-[11px] font-semibold ${destaque ? 'text-white/75' : 'text-slate-500'}`}>{detalhe}</small></div>;
}
