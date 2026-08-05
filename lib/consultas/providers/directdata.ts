import 'server-only';
import type { ResumoFonteCredito } from '../credito-types';
import type { TipoConsultaCredito } from '@/app/lib/carteira';

const BASE_URL = 'https://apiv3.directd.com.br/api';
const PACOTES: Record<TipoConsultaCredito, { endpoint: string; codigo: string; nome: string }[]> = {
  credito_essencial: [{ endpoint: 'DossieCreditoCompleto', codigo: 'dossie_quod', nome: 'Dossiê QUOD' }],
  credito_avancada: [
    { endpoint: 'DossieCreditoCompleto', codigo: 'dossie_quod', nome: 'Dossiê QUOD' },
    { endpoint: 'ProtestosOnline', codigo: 'protestos_nacional', nome: 'Protestos nacional — IEPTB' },
    { endpoint: 'ProcessosJudiciaisCompleta', codigo: 'processos', nome: 'Processos judiciais' },
  ],
  credito_completa: [
    { endpoint: 'DossieCreditoCompleto', codigo: 'dossie_quod', nome: 'Dossiê QUOD' },
    { endpoint: 'ProtestosOnline', codigo: 'protestos_nacional', nome: 'Protestos nacional — IEPTB' },
    { endpoint: 'ProcessosJudiciaisCompleta', codigo: 'processos', nome: 'Processos judiciais' },
    { endpoint: 'SCRBacenDetalhada', codigo: 'scr_bacen', nome: 'SCR Bacen detalhado' },
  ],
};

export class ErroDirectData extends Error { constructor(public codigo: 'NAO_CONFIGURADO'|'NAO_ENCONTRADO'|'SEM_SALDO_PROVEDOR'|'TIMEOUT'|'INDISPONIVEL') { super(codigo); } }

function objeto(valor: unknown): Record<string, unknown> { return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor as Record<string, unknown> : {}; }
function lista(valor: unknown): unknown[] { return Array.isArray(valor) ? valor : []; }
function primeiro(...valores: unknown[]) { return valores.find((valor) => valor !== null && valor !== undefined && valor !== '') ?? null; }

function resumir(codigo: string, nome: string, bruto: unknown): ResumoFonteCredito {
  const raiz = objeto(bruto); const meta = objeto(raiz.metaDados); const retorno = objeto(raiz.retorno);
  if (codigo === 'dossie_quod') {
    const juridica = objeto(retorno.entidadeJuridica); const fisica = objeto(retorno.entidadeFisica); const entidade = Object.keys(juridica).length ? juridica : fisica;
    const cadastro = objeto(entidade.dadosCadastrais); const indicadores = objeto(entidade.indicadores); const consulta = objeto(entidade.consulta);
    return { codigo, nome, resultado: String(meta.resultado || '') || null, consultaUid: String(meta.consultaUid || '') || null, resumo: {
      razaoSocial: primeiro(cadastro.razaoSocial, cadastro.nomeCompleto), nomeFantasia: primeiro(cadastro.nomeFantasia), situacaoCadastral: primeiro(cadastro.situacaoCadastral),
      score: primeiro(entidade.score, entidade.pontuacao, indicadores.score), capacidadePagamento: primeiro(entidade.capacidadePagamento, indicadores.capacidadePagamento),
      quantidadeIndicadores: primeiro(indicadores.quantidadeIndicadores, lista(indicadores.indicacoes).length), consultasUltimos30Dias: primeiro(consulta.ultimos30Dias),
      possuiPendencias: primeiro(entidade.statusCadastroPositivo, entidade.possuiPendencias),
    } };
  }
  if (codigo === 'processos') return { codigo, nome, resultado: String(meta.resultado || '') || null, consultaUid: String(meta.consultaUid || '') || null, resumo: { total: primeiro(retorno.totalProcessos, retorno.quantidadeProcessos, lista(retorno.processos).length), processos: lista(retorno.processos).slice(0, 50).map((item) => { const p = objeto(item); return { numero: primeiro(p.numeroProcesso, p.numero), tribunal: primeiro(p.tribunal), uf: primeiro(p.uf), status: primeiro(p.status, p.situacao), valor: primeiro(p.valorProcesso), segredoJustica: primeiro(p.segredoJustica, p.flagSegredoJustica) }; }) } };
  if (codigo === 'protestos_nacional') return { codigo, nome, resultado: String(meta.resultado || '') || null, consultaUid: String(meta.consultaUid || '') || null, resumo: { total: primeiro(retorno.totalProtestos, retorno.quantidadeProtestos, lista(retorno.protestos).length), protestos: lista(retorno.protestos).slice(0, 50).map((item) => { const p = objeto(item); return { cartorio: primeiro(p.cartorio, p.nomeCartorio), cidade: primeiro(p.cidade), uf: primeiro(p.uf), data: primeiro(p.dataProtesto, p.data), valor: primeiro(p.valor) }; }) } };
  return { codigo, nome, resultado: String(meta.resultado || '') || null, consultaUid: String(meta.consultaUid || '') || null, resumo: { totalOperacoes: primeiro(retorno.totalOperacoes, retorno.quantidadeOperacoes), responsabilidadeTotal: primeiro(retorno.responsabilidadeTotal, retorno.valorTotal), dataBase: primeiro(retorno.dataBase, retorno.dataReferencia) } };
}

async function consultarFonte(documento: string, tipoDocumento: 'CPF'|'CNPJ', fonte: { endpoint: string; codigo: string; nome: string }, token: string) {
  const url = new URL(`${BASE_URL}/${fonte.endpoint}`); url.searchParams.set(tipoDocumento === 'CNPJ' ? 'Cnpj' : 'Cpf', documento); url.searchParams.set('Token', token);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 18_000);
  try {
    const resposta = await fetch(url, { method: 'GET', cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json' } });
    if (resposta.status === 404) throw new ErroDirectData('NAO_ENCONTRADO');
    if (resposta.status === 401 || resposta.status === 403) throw new ErroDirectData('SEM_SALDO_PROVEDOR');
    if (!resposta.ok) throw new ErroDirectData('INDISPONIVEL');
    return resumir(fonte.codigo, fonte.nome, await resposta.json());
  } catch (erro) { if (erro instanceof ErroDirectData) throw erro; if (erro instanceof DOMException && erro.name === 'AbortError') throw new ErroDirectData('TIMEOUT'); throw new ErroDirectData('INDISPONIVEL'); }
  finally { clearTimeout(timeout); }
}

export async function consultarDirectData(documento: string, tipoDocumento: 'CPF'|'CNPJ', tipoConsulta: TipoConsultaCredito) {
  const token = (process.env.DIRECT_DATA_TOKEN || '').trim(); if (!token) throw new ErroDirectData('NAO_CONFIGURADO');
  return Promise.all(PACOTES[tipoConsulta].map((fonte) => consultarFonte(documento, tipoDocumento, fonte, token)));
}
