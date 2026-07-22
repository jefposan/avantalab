'use client';

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { buscarDespesasCadastradas, buscarEmpresasDoUsuario } from '@/app/lib/database';
import type { CategoriaDespesa, DespesaImportada, RascunhoImportacao, TipoDocumentoImportado, TipoDocumentoSelecionado } from '../types';
import styles from './ImportadorDespesas.module.css';

const CHAVE_RASCUNHO = 'avanta:importador-despesas:v1';
const EXEMPLO: DespesaImportada[] = [
  { id: 'ex-1', data: '2026-07-10', descricaoOriginal: 'PIX MERCADO CENTRAL', descricao: 'PIX Mercado Central', valor: 328.4, categoria: '', incluir: true, confianca: 'Revisar' },
  { id: 'ex-2', data: '2026-07-11', descricaoOriginal: 'PAGAMENTO ENERGIA', descricao: 'Pagamento de energia', valor: 612.9, categoria: '', incluir: true, confianca: 'Revisar' },
  { id: 'ex-3', data: '2026-07-12', descricaoOriginal: 'TRANSFERENCIA', descricao: 'Transferência sem favorecido', valor: 1000, categoria: '', incluir: true, confianca: 'Revisar' },
  { id: 'ex-4', data: '2026-07-14', descricaoOriginal: 'TARIFA BANCARIA', descricao: 'Tarifa bancária', valor: 18.5, categoria: '', incluir: true, confianca: 'Revisar' },
];

type PerfilDestino = { id: string; nome: string; perfil: string };

function normalizar(valor: unknown) { return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function moeda(valor: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor); }
function gerarId() { return `despesa-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function dataExibida(data: string) { const [ano, mes, dia] = data.split('-'); return ano && mes && dia ? `${dia}/${mes}/${ano}` : 'Não identificada'; }
function parseData(valor: unknown) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor.toISOString().slice(0, 10);
  const texto = String(valor ?? '').trim(); const brasileira = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (brasileira) return `${brasileira[3].length === 2 ? `20${brasileira[3]}` : brasileira[3]}-${brasileira[2].padStart(2, '0')}-${brasileira[1].padStart(2, '0')}`;
  return /^\d{4}-\d{2}-\d{2}/.test(texto) ? texto.slice(0, 10) : '';
}
function parseValor(valor: unknown) {
  if (typeof valor === 'number') return valor;
  const texto = String(valor ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, ''); if (!texto) return Number.NaN;
  const negativo = /^-/.test(texto) || /^\(.+\)$/.test(texto); const limpo = texto.replace(/[()\-]/g, '');
  const numero = Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
  return negativo ? -numero : numero;
}
async function sha256(texto: string | ArrayBuffer) {
  const bytes = typeof texto === 'string' ? new TextEncoder().encode(texto) : texto;
  const resumo = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(resumo), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function dividirLinha(linha: string, separador: string) {
  const partes: string[] = []; let atual = ''; let aspas = false;
  for (let indice = 0; indice < linha.length; indice += 1) { const caractere = linha[indice]; if (caractere === '"') { if (aspas && linha[indice + 1] === '"') { atual += '"'; indice += 1; } else aspas = !aspas; } else if (caractere === separador && !aspas) { partes.push(atual.trim()); atual = ''; } else atual += caractere; }
  partes.push(atual.trim()); return partes;
}
function transformarLinhas(cabecalhos: string[], linhas: unknown[][]): DespesaImportada[] {
  const nomes = cabecalhos.map(normalizar); const indice = (termos: string[]) => nomes.findIndex((nome) => termos.some((termo) => nome.includes(termo)));
  const data = indice(['data', 'date']), descricao = indice(['descricao', 'historico', 'lancamento', 'favorecido', 'detalhe']), debito = indice(['debito', 'saida', 'pagamento']), credito = indice(['credito', 'entrada', 'recebimento']), valor = indice(['valor', 'amount', 'montante']), natureza = indice(['tipo', 'natureza', 'd/c', 'dc', 'movimento']);
  return linhas.flatMap((linha) => {
    const valorDebito = debito >= 0 ? parseValor(linha[debito]) : Number.NaN; const valorGeral = valor >= 0 ? parseValor(linha[valor]) : Number.NaN; const codigo = natureza >= 0 ? normalizar(linha[natureza]) : '';
    const eEntrada = (credito >= 0 && Number.isFinite(parseValor(linha[credito])) && parseValor(linha[credito]) !== 0) || /credito|entrada|recebimento|\bc\b/.test(codigo);
    const bruto = Number.isFinite(valorDebito) ? valorDebito : valorGeral; const eSaida = (Number.isFinite(valorDebito) && valorDebito !== 0) || bruto < 0 || /debito|saida|pagamento|\bd\b/.test(codigo);
    if (!Number.isFinite(bruto) || bruto === 0 || eEntrada || !eSaida) return [];
    const descricaoOriginal = String(descricao >= 0 ? linha[descricao] ?? '' : '').trim() || 'Despesa sem descrição';
    return [{ id: gerarId(), data: data >= 0 ? parseData(linha[data]) : '', descricaoOriginal, descricao: descricaoOriginal, valor: Math.abs(bruto), categoria: '', incluir: true, confianca: 'Revisar' }];
  });
}
function parseTexto(conteudo: string) {
  const linhas = conteudo.replace(/^\uFEFF/, '').split(/\r?\n/).filter((linha) => linha.trim()); if (linhas.length < 2) return [];
  const separador = [';', '\t', ','].sort((a, b) => linhas[0].split(b).length - linhas[0].split(a).length)[0];
  return transformarLinhas(dividirLinha(linhas[0], separador), linhas.slice(1).map((linha) => dividirLinha(linha, separador)));
}

type ItemAnalisadoPorIA = {
  pagina: number;
  cartao_final: string | null;
  data: string | null;
  descricao: string;
  valor: number;
  confianca: 'alta' | 'media' | 'baixa';
};

type AnalisePorIA = {
  tipo_documento: TipoDocumentoImportado;
  total_documento: number | null;
  total_despesas: number;
  total_estornos: number;
  total_calculado: number;
  diferenca: number | null;
  despesas: ItemAnalisadoPorIA[];
  estornos: ItemAnalisadoPorIA[];
};

async function analisarPdfComIA(arquivo: File, tipoDocumento: TipoDocumentoSelecionado): Promise<AnalisePorIA> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Faça login no AvantaLab para usar a análise por IA.');
  const formulario = new FormData();
  formulario.append('arquivo', arquivo);
  formulario.append('tipoDocumento', tipoDocumento);
  const resposta = await fetch('/api/importador-despesas/analisar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  });
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok || !corpo || corpo.erro) throw new Error(corpo?.mensagem || 'Não foi possível analisar o documento com IA.');
  return corpo as AnalisePorIA;
}

function itensDaAnalise(analise: AnalisePorIA): DespesaImportada[] {
  const converter = (item: ItemAnalisadoPorIA, natureza: 'despesa' | 'estorno'): DespesaImportada[] => {
    if (!item.data || !item.descricao || !Number.isFinite(item.valor) || item.valor <= 0) return [];
    const categoria = '';
    const complemento = item.cartao_final ? ` · cartão ${item.cartao_final}` : '';
    return [{
      id: gerarId(), data: parseData(item.data), descricaoOriginal: `Página ${item.pagina}${complemento}`, descricao: item.descricao,
      valor: item.valor, categoria, incluir: natureza === 'despesa', natureza, pagina: item.pagina,
      cartaoFinal: item.cartao_final || undefined,
      confianca: natureza === 'despesa' && (item.confianca === 'baixa' || !categoria) ? 'Revisar' : 'Alta',
    }];
  };
  return [
    ...analise.despesas.flatMap((item) => converter(item, 'despesa')),
    ...analise.estornos.flatMap((item) => converter(item, 'estorno')),
  ];
}

export default function ImportadorDespesas() {
  const [despesas, setDespesas] = useState<DespesaImportada[]>([]);
  const [perfis, setPerfis] = useState<PerfilDestino[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [tiposDespesa, setTiposDespesa] = useState<string[]>([]);
  const [carregandoDestino, setCarregandoDestino] = useState(true);
  const [carregandoTipos, setCarregandoTipos] = useState(false);
  const [loteChave, setLoteChave] = useState('');
  const [arquivo, setArquivo] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoImportado | null>(null);
  const [tipoDocumentoSelecionado, setTipoDocumentoSelecionado] = useState<TipoDocumentoSelecionado>('automatico');
  const [totalDocumento, setTotalDocumento] = useState('');
  const [salvoEm, setSalvoEm] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const salvo = window.localStorage.getItem(CHAVE_RASCUNHO);
    if (!salvo) return;
    try {
      const rascunho = JSON.parse(salvo) as RascunhoImportacao;
      if (rascunho.versao === 1 && Array.isArray(rascunho.despesas)) {
        setDespesas(rascunho.despesas);
        setEmpresaId(rascunho.empresaId || '');
        setLoteChave(rascunho.loteChave || crypto.randomUUID());
        setArquivo(rascunho.arquivo);
        setTipoDocumento(rascunho.tipoDocumento ?? null);
        setTipoDocumentoSelecionado(rascunho.tipoDocumentoSelecionado ?? 'automatico');
        setTotalDocumento(rascunho.totalDocumento);
        setSalvoEm(rascunho.salvoEm);
        setAviso('Rascunho recuperado. Você pode continuar de onde parou.');
      }
    } catch {
      window.localStorage.removeItem(CHAVE_RASCUNHO);
    }
  }, []);
  useEffect(() => {
    let ativo = true;
    void (async () => {
      setCarregandoDestino(true);
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error('Faça login no AvantaLab para escolher o perfil de destino.');
        const encontrados = await buscarEmpresasDoUsuario(data.user.id) as Array<Record<string, unknown>>;
        const permitidos = encontrados.map((perfil) => ({
          id: String(perfil.id || ''),
          nome: String(perfil.nome || perfil.empresa_nome || 'Perfil sem nome'),
          perfil: String(perfil.perfil || ''),
        })).filter((perfil) => perfil.id);
        if (!ativo) return;
        setPerfis(permitidos);
        setEmpresaId((atual) => permitidos.some((perfil) => perfil.id === atual) ? atual : (permitidos[0]?.id || ''));
        if (!permitidos.length) setAviso('Nenhum perfil financeiro ativo foi encontrado para esta conta.');
      } catch (error) {
        if (ativo) setAviso(error instanceof Error ? error.message : 'Não foi possível carregar seus perfis.');
      } finally {
        if (ativo) setCarregandoDestino(false);
      }
    })();
    return () => { ativo = false; };
  }, []);
  useEffect(() => {
    let ativo = true;
    if (!empresaId) { setTiposDespesa([]); setCarregandoTipos(false); return; }
    setCarregandoTipos(true);
    void (async () => {
      const cadastradas = await buscarDespesasCadastradas(empresaId);
      if (!ativo) return;
      const nomes = cadastradas.map((despesa: { nome?: unknown }) => String(despesa.nome || '').trim()).filter(Boolean);
      setTiposDespesa(nomes);
      setDespesas((atuais) => atuais.map((despesa) => despesa.categoria && !nomes.includes(despesa.categoria)
        ? { ...despesa, categoria: '', confianca: 'Revisar' }
        : despesa));
      setCarregandoTipos(false);
    })();
    return () => { ativo = false; };
  }, [empresaId]);
  const despesasReconhecidas = useMemo(() => despesas.filter((item) => item.natureza !== 'estorno'), [despesas]);
  const estornosReconhecidos = useMemo(() => despesas.filter((item) => item.natureza === 'estorno'), [despesas]);
  const selecionadas = useMemo(() => despesasReconhecidas.filter((item) => item.incluir), [despesasReconhecidas]);
  const totalImportado = useMemo(() => selecionadas.reduce((soma, item) => soma + item.valor, 0), [selecionadas]);
  const totalDespesasReconhecido = useMemo(() => despesasReconhecidas.reduce((soma, item) => soma + item.valor, 0), [despesasReconhecidas]);
  const totalEstornosReconhecido = useMemo(() => estornosReconhecidos.reduce((soma, item) => soma + item.valor, 0), [estornosReconhecidos]);
  const totalLiquidoReconhecido = totalDespesasReconhecido - totalEstornosReconhecido;
  const pendencias = useMemo(() => selecionadas.filter((item) => !item.categoria || item.confianca === 'Revisar').length, [selecionadas]);
  const informado = parseValor(totalDocumento);
  const diferenca = Number.isFinite(informado) ? totalLiquidoReconhecido - Math.abs(informado) : null;
  function salvarRascunho() { if (!despesas.length) { setAviso('Adicione despesas antes de salvar um rascunho.'); return; } const agora = new Date().toLocaleString('pt-BR'); const rascunho: RascunhoImportacao = { versao: 1, empresaId, loteChave: loteChave || crypto.randomUUID(), arquivo, tipoDocumento: tipoDocumento ?? undefined, tipoDocumentoSelecionado, salvoEm: agora, totalDocumento, despesas }; setLoteChave(rascunho.loteChave || ''); window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(rascunho)); setSalvoEm(agora); setAviso('Rascunho salvo neste navegador. Você pode continuar depois.'); }
  function carregarExemplo() { setDespesas(EXEMPLO.map((despesa) => ({ ...despesa, natureza: 'despesa' }))); setLoteChave('exemplo-importador-despesas-2026-07'); setArquivo('extrato-julho-2026.csv'); setTipoDocumento('extrato-bancario'); setTipoDocumentoSelecionado('automatico'); setTotalDocumento('1959,80'); setConfirmado(false); setAviso('Dados de exemplo carregados para você conhecer a revisão.'); }
  async function processarArquivo(file: File) { setCarregando(true); setAviso(''); setConfirmado(false); try { const extensao = file.name.split('.').pop()?.toLowerCase(); if (!extensao || !['csv', 'txt', 'xls', 'xlsx', 'pdf'].includes(extensao)) throw new Error('Escolha um arquivo CSV, TXT, XLS, XLSX ou PDF.'); let encontradas: DespesaImportada[] = []; let tipoDetectado: TipoDocumentoImportado | null = null; let totalDetectado: number | null = null; if (extensao === 'pdf') { setAviso('A IA está estudando todas as páginas e conferindo despesas e estornos…'); const analise = await analisarPdfComIA(file, tipoDocumentoSelecionado); encontradas = itensDaAnalise(analise); tipoDetectado = analise.tipo_documento; totalDetectado = analise.total_documento; } else if (extensao === 'csv' || extensao === 'txt') encontradas = parseTexto(await file.text()); else { const XLSX = await import('xlsx'); const planilha = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); const aba = planilha.Sheets[planilha.SheetNames[0]]; const matriz = XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, defval: '' }); encontradas = matriz.length > 1 ? transformarLinhas((matriz[0] as unknown[]).map(String), matriz.slice(1) as unknown[][]) : []; } if (!encontradas.length) throw new Error('A análise não encontrou despesas confiáveis. Revise o tipo de documento ou o arquivo enviado.'); setDespesas(encontradas); setLoteChave(await sha256(await file.arrayBuffer())); setArquivo(file.name); setTipoDocumento(tipoDetectado); setTotalDocumento(totalDetectado === null ? '' : totalDetectado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); setSalvoEm(''); const quantidadeEstornos = encontradas.filter((item) => item.natureza === 'estorno').length; const quantidadeDespesas = encontradas.length - quantidadeEstornos; setAviso(tipoDetectado === 'fatura-cartao' ? `Fatura conferida: ${quantidadeDespesas} despesas e ${quantidadeEstornos} estornos separados para revisão.` : `${quantidadeDespesas} saída${quantidadeDespesas === 1 ? '' : 's'} validada${quantidadeDespesas === 1 ? '' : 's'} pela IA.`); } catch (erro) { setAviso(erro instanceof Error ? erro.message : 'Não foi possível ler este arquivo.'); } finally { setCarregando(false); } }
  function atualizar(id: string, alteracao: Partial<DespesaImportada>) { setDespesas((atuais) => atuais.map((despesa) => despesa.id === id ? { ...despesa, ...alteracao } : despesa)); }
  async function confirmarImportacao() {
    if (confirmando || confirmado) return;
    if (!empresaId) { setAviso('Escolha o perfil de destino antes de confirmar.'); return; }
    if (!selecionadas.length) { setAviso('Selecione ao menos uma despesa para confirmar.'); return; }
    if (selecionadas.some((despesa) => !despesa.data || !despesa.categoria || !tiposDespesa.includes(despesa.categoria))) { setAviso('Revise a data e escolha um tipo de despesa válido para todos os lançamentos selecionados.'); return; }
    setConfirmando(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
      const chaveLote = loteChave || crypto.randomUUID();
      setLoteChave(chaveLote);
      const lancamentos = await Promise.all(selecionadas.map(async (despesa, indice) => ({
        data: despesa.data,
        tipo_despesa: despesa.categoria,
        descricao: despesa.descricao.trim(),
        valor: Number(despesa.valor.toFixed(2)),
        item_chave: await sha256(`${chaveLote}|${indice}|${despesa.data}|${despesa.descricaoOriginal}|${despesa.valor.toFixed(2)}`),
      })));
      const resposta = await fetch('/api/importador-despesas/confirmar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId, loteChave: chaveLote, lancamentos }),
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || corpo?.erro) throw new Error(corpo?.mensagem || 'Não foi possível criar os lançamentos.');
      const inseridos = Number(corpo?.resultado?.inseridos || 0);
      const ignorados = Number(corpo?.resultado?.ignorados || 0);
      setConfirmado(true);
      window.localStorage.removeItem(CHAVE_RASCUNHO);
      setSalvoEm('');
      setAviso(inseridos > 0
        ? `${inseridos} despesa${inseridos === 1 ? '' : 's'} lançada${inseridos === 1 ? '' : 's'} no AvantaLab.${ignorados ? ` ${ignorados} já existia${ignorados === 1 ? '' : 'm'} e não foi${ignorados === 1 ? '' : 'ram'} duplicada${ignorados === 1 ? '' : 's'}.` : ''}`
        : 'Esta fatura já havia sido importada. Nenhum lançamento foi duplicado.');
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'Não foi possível criar os lançamentos.');
    } finally {
      setConfirmando(false);
    }
  }
  function soltarArquivo(evento: DragEvent<HTMLDivElement>) { evento.preventDefault(); const file = evento.dataTransfer.files[0]; if (file) void processarArquivo(file); }
  const alertaErro = /não |escolha|pdf foi|incompleta|excedeu|nenhuma|não conseguiu|sessão|inválid|erro|expirou/i.test(aviso);
  return <main className={styles.pagina}>
    <header className={styles.cabecalho}><div className={styles.marca}><span aria-hidden="true">A</span><div><strong>AvantaLab</strong><small>Financeiro</small></div></div><div className={styles.statusWeb}><span aria-hidden="true" />Versão web em construção</div></header>
    <section className={styles.intro} aria-labelledby="titulo-pagina"><div><p className={styles.sobretitulo}>DESPESAS · IMPORTAÇÃO ASSISTIDA</p><h1 id="titulo-pagina">Importe, revise e confirme suas despesas.</h1><p>O sistema identifica saídas no arquivo. Você confere, escolhe os tipos e confirma os lançamentos.</p></div><button className={`${styles.botao} ${styles.secundario}`} type="button" onClick={salvarRascunho} disabled={!despesas.length}>Salvar e continuar depois</button></section>
    <section className={styles.etapas} aria-label="Etapas da importação"><span className={`${styles.etapa} ${styles.ativa}`}><b>1</b>Enviar arquivo</span><span className={`${styles.linha} ${despesas.length ? styles.linhaAtiva : ''}`} /><span className={`${styles.etapa} ${despesas.length ? styles.ativa : ''}`}><b>2</b>Conferir despesas</span><span className={`${styles.linha} ${confirmado ? styles.linhaAtiva : ''}`} /><span className={`${styles.etapa} ${confirmado ? styles.ativa : ''}`}><b>3</b>Confirmar</span></section>
    <section className={`${styles.painel} ${styles.upload}`} aria-labelledby="titulo-upload"><div className={styles.cabecalhoSecao}><div><h2 id="titulo-upload">Enviar extrato ou planilha</h2><p>CSV, TXT, XLS, XLSX ou PDF · até 10 MB</p></div><button className={styles.link} type="button" onClick={carregarExemplo}>Usar exemplo</button></div><div className={styles.configuracaoUpload}><div className={styles.tipoDocumento}><label htmlFor="perfil-destino">Perfil de destino</label><select id="perfil-destino" value={empresaId} disabled={carregandoDestino || confirmando || confirmado} onChange={(evento) => { setEmpresaId(evento.target.value); setConfirmado(false); }}><option value="">{carregandoDestino ? 'Carregando perfis…' : 'Selecionar perfil'}</option>{perfis.map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nome}</option>)}</select><small>Os lançamentos serão criados somente neste perfil.</small></div><div className={styles.tipoDocumento}><label htmlFor="tipo-documento">Tipo do documento</label><select id="tipo-documento" value={tipoDocumentoSelecionado} onChange={(evento) => setTipoDocumentoSelecionado(evento.target.value as TipoDocumentoSelecionado)}><option value="automatico">Detectar automaticamente</option><option value="extrato-bancario">Extrato bancário</option><option value="fatura-cartao">Fatura de cartão</option></select><small>A escolha manual tem prioridade na leitura do PDF.</small></div></div><div className={styles.dropzone} role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(evento) => { if (evento.key === 'Enter' || evento.key === ' ') inputRef.current?.click(); }} onDragOver={(evento) => evento.preventDefault()} onDrop={soltarArquivo} aria-describedby="ajuda-upload"><div className={styles.arquivoIcone} aria-hidden="true">↑</div><strong>{carregando ? 'Analisando todas as páginas…' : 'Arraste o arquivo aqui ou selecione do computador'}</strong><span id="ajuda-upload">Ao enviar um PDF, suas páginas são processadas pela OpenAI. O arquivo não é armazenado no AvantaLab nesta etapa; somente os lançamentos confirmados são gravados.</span><button className={`${styles.botao} ${styles.primario}`} type="button" tabIndex={-1} disabled={carregando}>Selecionar arquivo</button><input ref={inputRef} className={styles.visualmenteOculto} type="file" accept=".csv,.txt,.xls,.xlsx,.pdf" onChange={(evento: ChangeEvent<HTMLInputElement>) => { const file = evento.target.files?.[0]; if (file) void processarArquivo(file); evento.target.value = ''; }} /></div></section>
    {aviso && <div className={`${styles.aviso} ${alertaErro ? styles.erro : styles.informacao}`} role="status">{aviso}</div>}
    {despesas.length > 0 && <><section className={styles.resumo} aria-label="Resumo da importação"><div><span>Arquivo</span><strong>{arquivo || 'Rascunho sem arquivo'}</strong><small>{tipoDocumento === 'fatura-cartao' ? 'Fatura: despesas e estornos separados.' : 'Extrato: somente saídas.'}</small>{salvoEm && <small>Salvo em {salvoEm}</small>}</div><div><span>Despesas reconhecidas</span><strong>{moeda(totalDespesasReconhecido)}</strong><small>{despesasReconhecidas.length} lançamentos</small></div><div className={styles.creditoResumo}><span>Estornos e créditos</span><strong>− {moeda(totalEstornosReconhecido)}</strong><small>{estornosReconhecidos.length} lançamentos separados</small></div><div className={styles.total}><span>Total líquido conferido</span><strong>{moeda(totalLiquidoReconhecido)}</strong></div><label className={styles.totalDocumento}>Total no documento<input value={totalDocumento} onChange={(evento) => setTotalDocumento(evento.target.value)} inputMode="decimal" placeholder="R$ 0,00" aria-label="Total informado no documento" /><small>{diferenca === null ? 'Informe para conferir.' : Math.abs(diferenca) < 0.005 ? '✓ O total confere.' : `Diferença de ${moeda(Math.abs(diferenca))}`}</small></label></section>
    <section className={`${styles.painel} ${styles.tabelaPainel}`} aria-labelledby="titulo-lista"><div className={styles.cabecalhoSecao}><div><h2 id="titulo-lista">Despesas identificadas</h2><p>Desmarque o que não deve ser lançado e complete os itens em revisão.</p></div><span className={styles.badge}>{pendencias ? `${pendencias} pendência${pendencias === 1 ? '' : 's'}` : 'Tudo revisado'}</span></div>{!carregandoTipos && empresaId && !tiposDespesa.length && <div className={`${styles.aviso} ${styles.erro}`}>O perfil selecionado não possui tipos de despesa disponíveis. Cadastre-os na Gestão antes de confirmar.</div>}<div className={styles.tabelaRolagem}><table><thead><tr><th scope="col"><span className={styles.visualmenteOculto}>Incluir</span></th><th scope="col">Data</th><th scope="col">Descrição</th><th scope="col">Valor</th><th scope="col">Tipo da despesa</th><th scope="col">Situação</th></tr></thead><tbody>{despesasReconhecidas.map((despesa) => <tr key={despesa.id} className={!despesa.incluir ? styles.ignorando : ''}><td><input type="checkbox" checked={despesa.incluir} disabled={confirmando || confirmado} onChange={(evento) => atualizar(despesa.id, { incluir: evento.target.checked })} aria-label={`Incluir ${despesa.descricao}`} /></td><td><input className={`${styles.campo} ${styles.data}`} disabled={confirmando || confirmado} value={dataExibida(despesa.data)} onChange={(evento) => atualizar(despesa.id, { data: parseData(evento.target.value) })} aria-label={`Data de ${despesa.descricao}`} /></td><td><label className={styles.visualmenteOculto} htmlFor={`descricao-${despesa.id}`}>Descrição</label><input id={`descricao-${despesa.id}`} className={`${styles.campo} ${styles.descricao}`} disabled={confirmando || confirmado} value={despesa.descricao} onChange={(evento) => atualizar(despesa.id, { descricao: evento.target.value, confianca: 'Alta' })} /><small>{despesa.descricaoOriginal}</small></td><td className={styles.valor}>{moeda(despesa.valor)}</td><td><label className={styles.visualmenteOculto} htmlFor={`categoria-${despesa.id}`}>Tipo da despesa</label><select id={`categoria-${despesa.id}`} value={despesa.categoria} disabled={confirmando || confirmado || carregandoTipos || !tiposDespesa.length} onChange={(evento) => atualizar(despesa.id, { categoria: evento.target.value as CategoriaDespesa, confianca: 'Alta' })} className={`${styles.campo} ${!despesa.categoria ? styles.erroCampo : ''}`}><option value="">{carregandoTipos ? 'Carregando tipos…' : 'Selecionar tipo'}</option>{tiposDespesa.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></td><td><span className={`${styles.situacao} ${despesa.confianca === 'Alta' ? styles.ok : styles.revisar}`}>{despesa.confianca === 'Alta' ? '✓ Pronto' : '! Revisar'}</span></td></tr>)}</tbody></table></div><footer className={styles.acoes}><div><strong>{moeda(totalImportado)}</strong><span> em {selecionadas.length} despesas selecionadas</span></div><div><button className={`${styles.botao} ${styles.discreto}`} type="button" onClick={salvarRascunho} disabled={confirmando || confirmado}>Salvar rascunho</button><button className={`${styles.botao} ${styles.primario}`} type="button" onClick={() => void confirmarImportacao()} disabled={!empresaId || !selecionadas.length || pendencias > 0 || confirmando || confirmado || carregandoTipos || !tiposDespesa.length}>{confirmando ? 'Criando lançamentos…' : confirmado ? 'Despesas lançadas' : 'Confirmar e lançar despesas'}</button></div></footer></section>
    {estornosReconhecidos.length > 0 && <section className={`${styles.painel} ${styles.tabelaPainel} ${styles.estornosPainel}`} aria-labelledby="titulo-estornos"><div className={styles.cabecalhoSecao}><div><h2 id="titulo-estornos">Estornos e créditos identificados</h2><p>Eles permanecem separados e não serão lançados nesta etapa. A entrada como receita será conectada em uma entrega própria.</p></div><span className={`${styles.badge} ${styles.badgeCredito}`}>{moeda(totalEstornosReconhecido)}</span></div><div className={styles.tabelaRolagem}><table><thead><tr><th scope="col">Data</th><th scope="col">Descrição</th><th scope="col">Valor</th><th scope="col">Situação</th></tr></thead><tbody>{estornosReconhecidos.map((estorno) => <tr key={estorno.id}><td>{dataExibida(estorno.data)}</td><td>{estorno.descricao}<small>{estorno.descricaoOriginal}</small></td><td className={`${styles.valor} ${styles.valorCredito}`}>{moeda(estorno.valor)}</td><td><span className={`${styles.situacao} ${styles.revisar}`}>Não lançado</span></td></tr>)}</tbody></table></div></section>}</>}
  </main>;
}
