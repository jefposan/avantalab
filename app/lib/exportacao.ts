/* eslint-disable @typescript-eslint/no-explicit-any */
import type { WorkBook } from 'xlsx';
import { supabase } from './supabase';
import { normalizarTexto } from './formatters';
import { APP_VERSION } from './version';
import { CATEGORIAS_EXCLUSAO_EBITDA, normalizarTipoPerfil } from './perfis';
import type { AbrirAvisoFn } from '../hooks/useUI';

// Carregamento sob demanda da biblioteca xlsx (~300-400 KB no bundle):
// só é baixada quando uma exportação/importação Excel é realmente executada.
type XLSXModule = typeof import('xlsx');
let XLSX!: XLSXModule;
async function ensureXLSX(): Promise<void> {
  if (!XLSX) XLSX = await import('xlsx');
}

const MESES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

const MAPA_MESES: Record<string, string> = {
  JANEIRO: 'JANEIRO',
  FEVEREIRO: 'FEVEREIRO',
  MARCO: 'MARÇO',
  MARÇO: 'MARÇO',
  ABRIL: 'ABRIL',
  MAIO: 'MAIO',
  JUNHO: 'JUNHO',
  JULHO: 'JULHO',
  AGOSTO: 'AGOSTO',
  SETEMBRO: 'SETEMBRO',
  OUTUBRO: 'OUTUBRO',
  NOVEMBRO: 'NOVEMBRO',
  DEZEMBRO: 'DEZEMBRO',
};

const LIMITE_TEXTO_EXCEL = 32000;

export interface GerarBackupExcelParams {
  empresaId: string;
  nomePerfil?: string;
  tipoPerfil?: string;
  despesasCadastradas: { nome: string; categoria?: string }[];
  logoUrl: string;
  logoSettings: { scale: number; x: number; y: number };
  corPrimaria: string;
  darkMode: boolean;
  duplicadosAtivo: boolean;
  abrirAviso: AbrirAvisoFn;
  setUltimoBackupEm: (val: string) => void;
  setNomeConfirmacaoExclusao: (val: string) => void;
  setModalExcluirEmpresa: (val: boolean) => void;
  abrirExclusaoDepois?: boolean;
  nomeArquivoPrefixo?: string;
}

export type AnaliseBackupImportacao = {
  valido: boolean;
  nomeArquivo: string;
  versaoBackup: string;
  perfilOrigem: string;
  tipoPerfilOrigem: string;
  totalDespesasBase: number;
  totalLancamentos: number;
  totalReceitasEntradas: number;
  totalReceitasTotais: number;
  totalRecorrencias: number;
  avisos: string[];
  erros: string[];
};

export type ResultadoImportacaoBackup = {
  despesasBaseInseridas: number;
  despesasBaseIgnoradas: number;
  despesasBaseAtualizadas?: number;
  despesasBaseRemovidas?: number;
  lancamentosInseridos: number;
  lancamentosIgnorados: number;
  lancamentosAtualizados?: number;
  lancamentosRemovidos?: number;
  receitasEntradasInseridas: number;
  receitasEntradasIgnoradas: number;
  receitasEntradasAtualizadas?: number;
  receitasEntradasRemovidas?: number;
  receitasTotaisInseridas: number;
  receitasTotaisIgnoradas: number;
  receitasTotaisAtualizadas?: number;
  receitasTotaisRemovidas?: number;
  recorrenciasInseridas: number;
  recorrenciasIgnoradas: number;
  recorrenciasAtualizadas?: number;
  recorrenciasRemovidas?: number;
};

export type ModoImportacaoBackup = 'adicionar' | 'atualizar' | 'substituir';

type ImportarBackupExcelParams = {
  arquivo: File;
  empresaId: string;
};

type LinhaImportacao<T> = {
  idOriginal: string;
  dados: T;
  valido: boolean;
};

function sanitizarNomeArquivo(valor: string) {
  return normalizarTexto(valor || 'perfil')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'perfil';
}

function valorTexto(row: any, chaves: string[], fallback = '') {
  for (const chave of chaves) {
    const valor = row?.[chave];
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
      return String(valor).trim();
    }
  }
  return fallback;
}

function valorNumero(row: any, chaves: string[], fallback = 0) {
  const bruto = valorTexto(row, chaves, '');
  if (!bruto) return fallback;
  const normalizado = String(bruto)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(,|$))/g, '')
    .replace(',', '.');
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : fallback;
}

function normalizarMes(valor: unknown) {
  const chave = String(valor || '').trim().toUpperCase();
  return MAPA_MESES[chave] || chave;
}

function idOriginal(row: any) {
  return valorTexto(row, ['ID original', 'Id original', 'id', 'ID']);
}

function resultadoImportacaoVazio(): ResultadoImportacaoBackup {
  return {
    despesasBaseInseridas: 0,
    despesasBaseIgnoradas: 0,
    despesasBaseAtualizadas: 0,
    despesasBaseRemovidas: 0,
    lancamentosInseridos: 0,
    lancamentosIgnorados: 0,
    lancamentosAtualizados: 0,
    lancamentosRemovidos: 0,
    receitasEntradasInseridas: 0,
    receitasEntradasIgnoradas: 0,
    receitasEntradasAtualizadas: 0,
    receitasEntradasRemovidas: 0,
    receitasTotaisInseridas: 0,
    receitasTotaisIgnoradas: 0,
    receitasTotaisAtualizadas: 0,
    receitasTotaisRemovidas: 0,
    recorrenciasInseridas: 0,
    recorrenciasIgnoradas: 0,
    recorrenciasAtualizadas: 0,
    recorrenciasRemovidas: 0,
  };
}

function sheetRows(wb: WorkBook, nome: string) {
  const ws = wb.Sheets[nome];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
}

function adicionarPlanilha(wb: WorkBook, nome: string, dados: any[]) {
  const ws = XLSX.utils.json_to_sheet(sanitizarLinhasExcel(dados.length > 0 ? dados : [{}]));
  XLSX.utils.book_append_sheet(wb, ws, nome);
}

function sanitizarLinhasExcel(dados: any[]) {
  return dados.map((linha) => {
    const linhaSegura: Record<string, any> = {};

    Object.entries(linha || {}).forEach(([chave, valor]) => {
      if (typeof valor === 'string' && valor.length > LIMITE_TEXTO_EXCEL) {
        linhaSegura[chave] = `${valor.slice(0, LIMITE_TEXTO_EXCEL - 120)}\n\n[Texto truncado pelo AvantaLab: excedia o limite de caracteres por celula do Excel.]`;
      } else {
        linhaSegura[chave] = valor;
      }
    });

    return linhaSegura;
  });
}

function valorConfiguracaoExcel(chave: string, valor: unknown) {
  const texto = typeof valor === 'string' ? valor : JSON.stringify(valor ?? '');

  if (chave === 'logoUrl') {
    return '[Logo nao incluida no backup. Reenvie a logo pelo Menu se precisar restaurar a identidade visual.]';
  }

  if (texto.length <= LIMITE_TEXTO_EXCEL) {
    return texto;
  }

  return `${texto.slice(0, LIMITE_TEXTO_EXCEL - 120)}\n\n[Texto truncado pelo AvantaLab: excedia o limite de caracteres por celula do Excel.]`;
}

async function lerWorkbookArquivo(arquivo: File): Promise<WorkBook> {
  await ensureXLSX();
  const buffer = await arquivo.arrayBuffer();
  return XLSX.read(buffer, { type: 'array' });
}

async function buscarDadosBackup(empresaId: string) {
  const consultas = await Promise.allSettled([
    supabase.from('empresas').select('*').eq('id', empresaId).single(),
    supabase.from('configuracoes').select('*').eq('empresa_id', empresaId).maybeSingle(),
    supabase.from('despesas_cadastradas').select('*').eq('empresa_id', empresaId).order('nome', { ascending: true }),
    supabase.from('lancamentos').select('*').eq('empresa_id', empresaId).order('ano', { ascending: true }).order('mes', { ascending: true }).order('dia', { ascending: true }),
    supabase.from('faturamentos').select('*').eq('empresa_id', empresaId).order('ano', { ascending: true }),
    supabase.from('faturamentos_entradas').select('*').eq('empresa_id', empresaId).order('ano', { ascending: true }).order('mes', { ascending: true }).order('dia', { ascending: true }),
    supabase.rpc('listar_usuarios_empresa_rpc', { p_empresa_id: empresaId }),
    supabase.from('recorrencias').select('*').eq('empresa_id', empresaId).order('nome', { ascending: true }),
  ]);

  const resultado = (index: number) => {
    const item = consultas[index];
    if (item.status !== 'fulfilled') return { data: null, error: item.reason };
    return item.value as { data: any; error: any };
  };

  return {
    empresa: resultado(0),
    configuracoes: resultado(1),
    despesasBase: resultado(2),
    lancamentos: resultado(3),
    faturamentos: resultado(4),
    faturamentosEntradas: resultado(5),
    usuarios: resultado(6),
    recorrencias: resultado(7),
  };
}

export async function gerarBackupExcel({
  empresaId,
  nomePerfil,
  tipoPerfil,
  despesasCadastradas,
  logoUrl,
  logoSettings,
  corPrimaria,
  darkMode,
  duplicadosAtivo,
  abrirAviso,
  setUltimoBackupEm,
  setNomeConfirmacaoExclusao,
  setModalExcluirEmpresa,
  abrirExclusaoDepois = false,
  nomeArquivoPrefixo = 'backup_avantalab',
}: GerarBackupExcelParams): Promise<void> {
  if (!empresaId) {
    abrirAviso('Perfil nao carregado', 'Faca login novamente e tente gerar o backup.', undefined, 'erro');
    return;
  }

  const dados = await buscarDadosBackup(empresaId);

  if (dados.lancamentos.error) {
    console.error('Erro ao buscar lancamentos para backup:', dados.lancamentos.error);
    abrirAviso('Erro ao gerar backup', dados.lancamentos.error.message || 'Nao foi possivel buscar os lancamentos para o backup.', undefined, 'erro');
    return;
  }

  if (dados.faturamentos.error) {
    console.error('Erro ao buscar receitas totais para backup:', dados.faturamentos.error);
    abrirAviso('Erro ao gerar backup', dados.faturamentos.error.message || 'Nao foi possivel buscar as receitas totais para o backup.', undefined, 'erro');
    return;
  }

  const empresa = dados.empresa.data || {};
  const config = dados.configuracoes.data || {};
  const despesasBaseBanco = dados.despesasBase.data || [];
  const lancamentosBackup = dados.lancamentos.data || [];
  const faturamentosBackup = dados.faturamentos.data || [];
  const faturamentosEntradasBackup = dados.faturamentosEntradas.data || [];
  const usuariosBackup = dados.usuarios.data || [];
  const recorrenciasBackup = dados.recorrencias.data || [];

  const nomePerfilFinal = nomePerfil || empresa.nome || 'Perfil financeiro';
  const tipoPerfilFinal = normalizarTipoPerfil(tipoPerfil || empresa.tipo_perfil || 'empresa');
  const agora = new Date().toISOString();
  const dataHoje = agora.split('T')[0];

  await ensureXLSX();
  const wb = XLSX.utils.book_new();

  adicionarPlanilha(wb, 'Resumo', [
    { Campo: 'Sistema', Valor: 'AvantaLab Gestao' },
    { Campo: 'Versao do sistema', Valor: APP_VERSION },
    { Campo: 'Tipo do arquivo', Valor: 'Backup completo para restauracao' },
    { Campo: 'Data do backup', Valor: agora },
    { Campo: 'Perfil financeiro', Valor: nomePerfilFinal },
    { Campo: 'Tipo do perfil', Valor: tipoPerfilFinal },
    { Campo: 'ID original do perfil', Valor: empresaId },
    { Campo: 'Aviso', Valor: 'Edite os dados com cuidado. Mantenha os nomes das abas e colunas para importar novamente.' },
  ]);

  adicionarPlanilha(wb, 'Perfil', [
    {
      'ID original': empresaId,
      Nome: nomePerfilFinal,
      'Tipo do perfil': tipoPerfilFinal,
      'Criado em': empresa.created_at || empresa.criado_em || '',
      'Atualizado em': empresa.updated_at || empresa.atualizado_em || '',
    },
  ]);

  adicionarPlanilha(
    wb,
    'Despesas Base',
    (despesasBaseBanco.length > 0 ? despesasBaseBanco : despesasCadastradas).map((d: any) => ({
      'ID original': d.id || '',
      Nome: d.nome || '',
      Categoria: d.categoria || 'Outros',
    }))
  );

  adicionarPlanilha(
    wb,
    'Lancamentos Despesas',
    lancamentosBackup.map((l: any) => ({
      'ID original': l.id || '',
      Ano: l.ano,
      Mes: normalizarMes(l.mes),
      Dia: l.dia,
      Despesa: l.despesa_nome,
      Descricao: l.descricao || '',
      Valor: Number(l.valor || 0),
    }))
  );

  adicionarPlanilha(
    wb,
    'Receitas Entradas',
    faturamentosEntradasBackup.map((entrada: any) => ({
      'ID original': entrada.id || '',
      Ano: entrada.ano,
      Mes: normalizarMes(entrada.mes),
      Dia: entrada.dia,
      Origem: entrada.origem || '',
      Valor: Number(entrada.valor || 0),
    }))
  );

  adicionarPlanilha(
    wb,
    'Receitas Totais',
    faturamentosBackup.map((f: any) => ({
      'ID original': f.id || '',
      Ano: f.ano,
      Mes: normalizarMes(f.mes),
      Valor: Number(f.valor || 0),
    }))
  );

  adicionarPlanilha(
    wb,
    'Recorrencias',
    recorrenciasBackup.map((r: any) => ({
      'ID original': r.id || '',
      Nome: r.nome || '',
      Categoria: r.categoria || '',
      Descricao: r.descricao || '',
      Dia: r.dia || '',
      Ativo: r.ativo !== false ? 'sim' : 'nao',
    }))
  );

  adicionarPlanilha(
    wb,
    'Usuarios Vinculados',
    usuariosBackup.map((u: any) => ({
      Nome: u.nome || u.nome_usuario || '',
      Login: u.login || u.email || '',
      Email: u.email || '',
      Perfil: u.perfil || '',
      Status: u.status || '',
      'Telefone confirmado': u.telefone_confirmado === true ? 'sim' : 'nao',
    }))
  );

  adicionarPlanilha(wb, 'Configuracoes', [
    { Chave: 'empresaIdOriginal', Valor: empresaId },
    { Chave: 'logoUrl', Valor: valorConfiguracaoExcel('logoUrl', config.logo_url ?? logoUrl ?? '') },
    { Chave: 'logoSettings', Valor: valorConfiguracaoExcel('logoSettings', config.logo_settings || logoSettings || { scale: 100, x: 0, y: 0 }) },
    { Chave: 'corPrimaria', Valor: valorConfiguracaoExcel('corPrimaria', config.cor_primaria || corPrimaria || '#003E73') },
    { Chave: 'darkMode', Valor: valorConfiguracaoExcel('darkMode', String(config.dark_mode ?? darkMode)) },
    { Chave: 'duplicadosAtivo', Valor: valorConfiguracaoExcel('duplicadosAtivo', String(config.duplicados_ativo ?? duplicadosAtivo)) },
    { Chave: 'ultimoBackupEm', Valor: agora },
    { Chave: 'observacaoLogo', Valor: 'A logo nao e incluida no backup para evitar arquivos pesados e limites tecnicos do Excel. Os dados financeiros nao sao afetados.' },
  ]);

  const dadosResumoFinanceiro: any[] = [];
  const anosNoBanco = Array.from(new Set([
    ...lancamentosBackup.map((l: any) => String(l.ano)),
    ...faturamentosBackup.map((f: any) => String(f.ano)),
  ])).sort();

  anosNoBanco.forEach((ano) => {
    MESES.forEach((mes) => {
      const faturamento = Number(faturamentosBackup.find((f: any) => String(f.ano) === ano && normalizarMes(f.mes) === mes)?.valor || 0);
      const lancsMes = lancamentosBackup.filter((l: any) => String(l.ano) === ano && normalizarMes(l.mes) === mes);
      const despesas = lancsMes.reduce((total: number, l: any) => total + Number(l.valor || 0), 0);
      const exclusoesEbitda = lancsMes.reduce((total: number, l: any) => {
        const categoria = despesasCadastradas.find((d) => normalizarTexto(d.nome) === normalizarTexto(l.despesa_nome))?.categoria || 'Outros';
        return CATEGORIAS_EXCLUSAO_EBITDA.includes(categoria) ? total + Number(l.valor || 0) : total;
      }, 0);

      if (faturamento > 0 || despesas > 0) {
        dadosResumoFinanceiro.push({
          Ano: ano,
          Mes: mes,
          'Receitas totais': faturamento,
          Despesas: despesas,
          Saldo: faturamento - despesas,
          EBITDA: faturamento - despesas + exclusoesEbitda,
        });
      }
    });
  });

  adicionarPlanilha(wb, 'Resumo Financeiro', dadosResumoFinanceiro);

  const nomeArquivo = `${nomeArquivoPrefixo}_${sanitizarNomeArquivo(nomePerfilFinal)}_${dataHoje}_v${APP_VERSION}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);

  const { error: erroSalvarBackup } = await supabase
    .from('configuracoes')
    .upsert({ empresa_id: empresaId, ultimo_backup_em: agora }, { onConflict: 'empresa_id' });

  if (erroSalvarBackup) {
    console.error('Erro ao salvar data do backup:', erroSalvarBackup);
    abrirAviso('Backup gerado', 'O arquivo foi gerado, mas nao foi possivel salvar a data do ultimo backup.', undefined, 'alerta');
    return;
  }

  setUltimoBackupEm(agora);

  if (abrirExclusaoDepois) {
    abrirAviso(
      'Backup gerado',
      'O backup foi gerado com sucesso. Agora confirme a exclusao digitando exatamente o nome do perfil.',
      () => {
        setNomeConfirmacaoExclusao('');
        setModalExcluirEmpresa(true);
      },
      'sucesso'
    );
  }
}

export async function analisarBackupExcel(arquivo: File): Promise<AnaliseBackupImportacao> {
  const wb = await lerWorkbookArquivo(arquivo);
  const resumo = sheetRows(wb, 'Resumo');
  const perfil = sheetRows(wb, 'Perfil');
  const despesasBase = sheetRows(wb, 'Despesas Base');
  const lancamentos = sheetRows(wb, 'Lancamentos Despesas');
  const receitasEntradas = sheetRows(wb, 'Receitas Entradas');
  const receitasTotais = sheetRows(wb, 'Receitas Totais');
  const recorrencias = sheetRows(wb, 'Recorrencias');

  const erros: string[] = [];
  const avisos: string[] = [];
  const temFormatoNovo = wb.SheetNames.includes('Resumo') && wb.SheetNames.includes('Lancamentos Despesas');

  if (!temFormatoNovo) {
    erros.push('O arquivo nao parece ser um backup completo gerado pelo AvantaLab nesta nova estrutura.');
  }

  if (lancamentos.length === 0 && receitasEntradas.length === 0 && receitasTotais.length === 0 && despesasBase.length === 0) {
    avisos.push('Nenhum dado financeiro importavel foi encontrado no arquivo.');
  }

  const campoResumo = (nome: string) => {
    const linha = resumo.find((r) => normalizarTexto(r.Campo) === normalizarTexto(nome));
    return linha?.Valor ? String(linha.Valor) : '';
  };

  return {
    valido: erros.length === 0,
    nomeArquivo: arquivo.name,
    versaoBackup: campoResumo('Versao do sistema') || '',
    perfilOrigem: campoResumo('Perfil financeiro') || valorTexto(perfil[0], ['Nome'], 'Nao identificado'),
    tipoPerfilOrigem: campoResumo('Tipo do perfil') || valorTexto(perfil[0], ['Tipo do perfil'], ''),
    totalDespesasBase: despesasBase.length,
    totalLancamentos: lancamentos.length,
    totalReceitasEntradas: receitasEntradas.length,
    totalReceitasTotais: receitasTotais.length,
    totalRecorrencias: recorrencias.length,
    avisos,
    erros,
  };
}

export async function importarBackupExcelAdicionar({
  arquivo,
  empresaId,
}: ImportarBackupExcelParams): Promise<ResultadoImportacaoBackup> {
  const { data: usuarioLogado } = await supabase.auth.getUser();
  const usuarioId = usuarioLogado.user?.id || null;
  const wb = await lerWorkbookArquivo(arquivo);
  const despesasBase = sheetRows(wb, 'Despesas Base');
  const lancamentos = sheetRows(wb, 'Lancamentos Despesas');
  const receitasEntradas = sheetRows(wb, 'Receitas Entradas');
  const receitasTotais = sheetRows(wb, 'Receitas Totais');
  const recorrencias = sheetRows(wb, 'Recorrencias');

  const resultado: ResultadoImportacaoBackup = {
    despesasBaseInseridas: 0,
    despesasBaseIgnoradas: 0,
    lancamentosInseridos: 0,
    lancamentosIgnorados: 0,
    receitasEntradasInseridas: 0,
    receitasEntradasIgnoradas: 0,
    receitasTotaisInseridas: 0,
    receitasTotaisIgnoradas: 0,
    recorrenciasInseridas: 0,
    recorrenciasIgnoradas: 0,
  };

  const [
    despesasExistentesRes,
    lancamentosExistentesRes,
    entradasExistentesRes,
    totaisExistentesRes,
    recorrenciasExistentesRes,
  ] = await Promise.all([
    supabase.from('despesas_cadastradas').select('nome,categoria').eq('empresa_id', empresaId),
    supabase.from('lancamentos').select('ano,mes,dia,despesa_nome,descricao,valor').eq('empresa_id', empresaId),
    supabase.from('faturamentos_entradas').select('ano,mes,dia,origem,valor').eq('empresa_id', empresaId),
    supabase.from('faturamentos').select('ano,mes,valor').eq('empresa_id', empresaId),
    supabase.from('recorrencias').select('nome,categoria,descricao,dia').eq('empresa_id', empresaId),
  ]);

  if (despesasExistentesRes.error) throw new Error(`Erro ao consultar despesas base: ${despesasExistentesRes.error.message}`);
  if (lancamentosExistentesRes.error) throw new Error(`Erro ao consultar lançamentos: ${lancamentosExistentesRes.error.message}`);
  if (entradasExistentesRes.error) throw new Error(`Erro ao consultar entradas/receitas: ${entradasExistentesRes.error.message}`);
  if (totaisExistentesRes.error) throw new Error(`Erro ao consultar totais mensais: ${totaisExistentesRes.error.message}`);

  const chaveDespesa = (nome: string) => normalizarTexto(nome);
  const chavesDespesas = new Set((despesasExistentesRes.data || []).map((d: any) => chaveDespesa(d.nome)));

  const novasDespesas = despesasBase
    .map((row) => ({
      empresa_id: empresaId,
      nome: valorTexto(row, ['Nome', 'Despesa']),
      categoria: valorTexto(row, ['Categoria'], 'Outros'),
    }))
    .filter((row) => {
      if (!row.nome || chavesDespesas.has(chaveDespesa(row.nome))) {
        resultado.despesasBaseIgnoradas += 1;
        return false;
      }
      chavesDespesas.add(chaveDespesa(row.nome));
      return true;
    });

  if (novasDespesas.length > 0) {
    const { error } = await supabase.from('despesas_cadastradas').insert(novasDespesas);
    if (error) throw new Error(`Erro ao inserir despesas base: ${error.message}`);
    resultado.despesasBaseInseridas = novasDespesas.length;
  }

  const chaveLancamento = (row: any) => [
    row.ano,
    normalizarMes(row.mes),
    row.dia,
    normalizarTexto(row.despesa_nome),
    normalizarTexto(row.descricao || ''),
    Number(row.valor || 0).toFixed(2),
  ].join('|');
  const chavesLancamentos = new Set((lancamentosExistentesRes.data || []).map((l: any) => chaveLancamento(l)));

  const novosLancamentos = lancamentos
    .map((row) => ({
      empresa_id: empresaId,
      ano: Math.trunc(valorNumero(row, ['Ano'])),
      mes: normalizarMes(valorTexto(row, ['Mes', 'Mês'])),
      dia: Math.trunc(valorNumero(row, ['Dia'])),
      despesa_nome: valorTexto(row, ['Despesa', 'Nome']),
      descricao: valorTexto(row, ['Descricao', 'Descrição'], ''),
      valor: valorNumero(row, ['Valor', 'Valor (R$)']),
    }))
    .filter((row) => {
      const valido = row.ano > 0 && MESES.includes(row.mes) && row.dia > 0 && row.despesa_nome && row.valor > 0;
      const chave = chaveLancamento(row);
      if (!valido || chavesLancamentos.has(chave)) {
        resultado.lancamentosIgnorados += 1;
        return false;
      }
      chavesLancamentos.add(chave);
      return true;
    });

  if (novosLancamentos.length > 0) {
    const { error } = await supabase.from('lancamentos').insert(novosLancamentos);
    if (error) throw new Error(`Erro ao inserir lançamentos: ${error.message}`);
    resultado.lancamentosInseridos = novosLancamentos.length;
  }

  const chaveEntrada = (row: any) => [
    row.ano,
    normalizarMes(row.mes),
    row.dia,
    normalizarTexto(row.origem || ''),
    Number(row.valor || 0).toFixed(2),
  ].join('|');
  const chavesEntradas = new Set((entradasExistentesRes.data || []).map((e: any) => chaveEntrada(e)));

  const novasEntradas = receitasEntradas
    .map((row) => ({
      empresa_id: empresaId,
      ano: Math.trunc(valorNumero(row, ['Ano'])),
      mes: normalizarMes(valorTexto(row, ['Mes', 'Mês'])),
      dia: Math.trunc(valorNumero(row, ['Dia'])),
      origem: valorTexto(row, ['Origem'], ''),
      valor: valorNumero(row, ['Valor', 'Valor (R$)']),
      criado_por: usuarioId,
    }))
    .filter((row) => {
      const valido = row.ano > 0 && MESES.includes(row.mes) && row.dia > 0 && row.origem && row.valor > 0;
      const chave = chaveEntrada(row);
      if (!valido || chavesEntradas.has(chave)) {
        resultado.receitasEntradasIgnoradas += 1;
        return false;
      }
      chavesEntradas.add(chave);
      return true;
    });

  if (novasEntradas.length > 0) {
    const { error } = await supabase.from('faturamentos_entradas').insert(novasEntradas);
    if (error) throw new Error(`Erro ao inserir entradas/receitas: ${error.message}`);
    resultado.receitasEntradasInseridas = novasEntradas.length;
  }

  const chaveTotal = (row: any) => `${row.ano}|${normalizarMes(row.mes)}`;
  const chavesTotais = new Set((totaisExistentesRes.data || []).map((f: any) => chaveTotal(f)));

  const novosTotais = receitasTotais
    .map((row) => ({
      empresa_id: empresaId,
      ano: Math.trunc(valorNumero(row, ['Ano'])),
      mes: normalizarMes(valorTexto(row, ['Mes', 'Mês'])),
      valor: valorNumero(row, ['Valor', 'Valor (R$)']),
    }))
    .filter((row) => {
      const valido = row.ano > 0 && MESES.includes(row.mes) && row.valor > 0;
      const chave = chaveTotal(row);
      if (!valido || chavesTotais.has(chave)) {
        resultado.receitasTotaisIgnoradas += 1;
        return false;
      }
      chavesTotais.add(chave);
      return true;
    });

  if (novosTotais.length > 0) {
    const { error } = await supabase.from('faturamentos').insert(novosTotais);
    if (error) throw new Error(`Erro ao inserir totais mensais: ${error.message}`);
    resultado.receitasTotaisInseridas = novosTotais.length;
  }

  const chaveRecorrencia = (row: any) => [
    normalizarTexto(row.nome),
    normalizarTexto(row.categoria),
    Math.trunc(Number(row.dia || 0)),
  ].join('|');
  const recorrenciasDisponiveis = !recorrenciasExistentesRes.error;
  const chavesRecorrencias = new Set((recorrenciasExistentesRes.data || []).map((r: any) => chaveRecorrencia(r)));

  const novasRecorrencias = recorrencias
    .map((row) => ({
      empresa_id: empresaId,
      nome: valorTexto(row, ['Nome']),
      categoria: valorTexto(row, ['Categoria'], 'Outros'),
      descricao: valorTexto(row, ['Descricao', 'Descrição'], ''),
      dia: Math.trunc(valorNumero(row, ['Dia'])),
      ativo: normalizarTexto(valorTexto(row, ['Ativo'], 'sim')) !== 'nao',
    }))
    .filter((row) => {
      const valido = row.nome && row.dia > 0;
      const chave = chaveRecorrencia(row);
      if (!valido || chavesRecorrencias.has(chave)) {
        resultado.recorrenciasIgnoradas += 1;
        return false;
      }
      chavesRecorrencias.add(chave);
      return true;
    });

  if (novasRecorrencias.length > 0) {
    if (!recorrenciasDisponiveis) {
      resultado.recorrenciasIgnoradas += novasRecorrencias.length;
    } else {
      const { error } = await supabase.from('recorrencias').insert(novasRecorrencias);
      if (error) throw new Error(`Erro ao inserir despesas fixas: ${error.message}`);
      resultado.recorrenciasInseridas = novasRecorrencias.length;
    }
  }

  return resultado;
}

function parseDespesasBase(rows: any[], empresaId: string): LinhaImportacao<{
  empresa_id: string;
  nome: string;
  categoria: string;
}>[] {
  return rows.map((row) => {
    const dados = {
      empresa_id: empresaId,
      nome: valorTexto(row, ['Nome', 'Despesa']),
      categoria: valorTexto(row, ['Categoria'], 'Outros'),
    };

    return {
      idOriginal: idOriginal(row),
      dados,
      valido: Boolean(dados.nome),
    };
  });
}

function parseLancamentos(rows: any[], empresaId: string): LinhaImportacao<{
  empresa_id: string;
  ano: number;
  mes: string;
  dia: number;
  despesa_nome: string;
  descricao: string;
  valor: number;
}>[] {
  return rows.map((row) => {
    const dados = {
      empresa_id: empresaId,
      ano: Math.trunc(valorNumero(row, ['Ano'])),
      mes: normalizarMes(valorTexto(row, ['Mes', 'Mês'])),
      dia: Math.trunc(valorNumero(row, ['Dia'])),
      despesa_nome: valorTexto(row, ['Despesa', 'Nome']),
      descricao: valorTexto(row, ['Descricao', 'Descrição'], ''),
      valor: valorNumero(row, ['Valor', 'Valor (R$)']),
    };

    return {
      idOriginal: idOriginal(row),
      dados,
      valido: dados.ano > 0 && MESES.includes(dados.mes) && dados.dia > 0 && Boolean(dados.despesa_nome) && dados.valor > 0,
    };
  });
}

function parseReceitasEntradas(rows: any[], empresaId: string, usuarioId: string | null): LinhaImportacao<{
  empresa_id: string;
  ano: number;
  mes: string;
  dia: number;
  origem: string;
  valor: number;
  criado_por: string | null;
}>[] {
  return rows.map((row) => {
    const dados = {
      empresa_id: empresaId,
      ano: Math.trunc(valorNumero(row, ['Ano'])),
      mes: normalizarMes(valorTexto(row, ['Mes', 'Mês'])),
      dia: Math.trunc(valorNumero(row, ['Dia'])),
      origem: valorTexto(row, ['Origem'], ''),
      valor: valorNumero(row, ['Valor', 'Valor (R$)']),
      criado_por: usuarioId,
    };

    return {
      idOriginal: idOriginal(row),
      dados,
      valido: dados.ano > 0 && MESES.includes(dados.mes) && dados.dia > 0 && Boolean(dados.origem) && dados.valor > 0,
    };
  });
}

function parseReceitasTotais(rows: any[], empresaId: string): LinhaImportacao<{
  empresa_id: string;
  ano: number;
  mes: string;
  valor: number;
}>[] {
  return rows.map((row) => {
    const dados = {
      empresa_id: empresaId,
      ano: Math.trunc(valorNumero(row, ['Ano'])),
      mes: normalizarMes(valorTexto(row, ['Mes', 'Mês'])),
      valor: valorNumero(row, ['Valor', 'Valor (R$)']),
    };

    return {
      idOriginal: idOriginal(row),
      dados,
      valido: dados.ano > 0 && MESES.includes(dados.mes) && dados.valor > 0,
    };
  });
}

function parseRecorrencias(rows: any[], empresaId: string): LinhaImportacao<{
  empresa_id: string;
  nome: string;
  categoria: string;
  descricao: string;
  dia: number;
  ativo: boolean;
}>[] {
  return rows.map((row) => {
    const dados = {
      empresa_id: empresaId,
      nome: valorTexto(row, ['Nome']),
      categoria: valorTexto(row, ['Categoria'], 'Outros'),
      descricao: valorTexto(row, ['Descricao', 'Descrição'], ''),
      dia: Math.trunc(valorNumero(row, ['Dia'])),
      ativo: normalizarTexto(valorTexto(row, ['Ativo'], 'sim')) !== 'nao',
    };

    return {
      idOriginal: idOriginal(row),
      dados,
      valido: Boolean(dados.nome) && dados.dia > 0,
    };
  });
}

async function consultarDadosExistentesImportacao(empresaId: string) {
  const [
    despesasExistentesRes,
    lancamentosExistentesRes,
    entradasExistentesRes,
    totaisExistentesRes,
    recorrenciasExistentesRes,
  ] = await Promise.all([
    supabase.from('despesas_cadastradas').select('id,nome,categoria').eq('empresa_id', empresaId),
    supabase.from('lancamentos').select('id,ano,mes,dia,despesa_nome,descricao,valor').eq('empresa_id', empresaId),
    supabase.from('faturamentos_entradas').select('id,ano,mes,dia,origem,valor').eq('empresa_id', empresaId),
    supabase.from('faturamentos').select('id,ano,mes,valor').eq('empresa_id', empresaId),
    supabase.from('recorrencias').select('id,nome,categoria,descricao,dia').eq('empresa_id', empresaId),
  ]);

  if (despesasExistentesRes.error) throw new Error(`Erro ao consultar despesas base: ${despesasExistentesRes.error.message}`);
  if (lancamentosExistentesRes.error) throw new Error(`Erro ao consultar lançamentos: ${lancamentosExistentesRes.error.message}`);
  if (entradasExistentesRes.error) throw new Error(`Erro ao consultar entradas/receitas: ${entradasExistentesRes.error.message}`);
  if (totaisExistentesRes.error) throw new Error(`Erro ao consultar totais mensais: ${totaisExistentesRes.error.message}`);

  return {
    despesas: despesasExistentesRes.data || [],
    lancamentos: lancamentosExistentesRes.data || [],
    entradas: entradasExistentesRes.data || [],
    totais: totaisExistentesRes.data || [],
    recorrencias: recorrenciasExistentesRes.error ? [] : (recorrenciasExistentesRes.data || []),
    recorrenciasDisponiveis: !recorrenciasExistentesRes.error,
  };
}

async function importarLinhasBackup({
  arquivo,
  empresaId,
  modo,
}: ImportarBackupExcelParams & { modo: ModoImportacaoBackup }): Promise<ResultadoImportacaoBackup> {
  const { data: usuarioLogado } = await supabase.auth.getUser();
  const usuarioId = usuarioLogado.user?.id || null;
  const wb = await lerWorkbookArquivo(arquivo);
  const resultado = resultadoImportacaoVazio();

  const despesasBase = parseDespesasBase(sheetRows(wb, 'Despesas Base'), empresaId);
  const lancamentos = parseLancamentos(sheetRows(wb, 'Lancamentos Despesas'), empresaId);
  const receitasEntradas = parseReceitasEntradas(sheetRows(wb, 'Receitas Entradas'), empresaId, usuarioId);
  const receitasTotais = parseReceitasTotais(sheetRows(wb, 'Receitas Totais'), empresaId);
  const recorrencias = parseRecorrencias(sheetRows(wb, 'Recorrencias'), empresaId);

  const existentes = await consultarDadosExistentesImportacao(empresaId);

  const chaveDespesa = (nome: string) => normalizarTexto(nome);
  const chaveLancamento = (row: any) => [
    row.ano,
    normalizarMes(row.mes),
    row.dia,
    normalizarTexto(row.despesa_nome),
    normalizarTexto(row.descricao || ''),
    Number(row.valor || 0).toFixed(2),
  ].join('|');
  const chaveEntrada = (row: any) => [
    row.ano,
    normalizarMes(row.mes),
    row.dia,
    normalizarTexto(row.origem || ''),
    Number(row.valor || 0).toFixed(2),
  ].join('|');
  const chaveTotal = (row: any) => `${row.ano}|${normalizarMes(row.mes)}`;
  const chaveRecorrencia = (row: any) => [
    normalizarTexto(row.nome),
    Math.trunc(Number(row.dia || 0)),
  ].join('|');

  const idsDespesas = new Set(existentes.despesas.map((item: any) => item.id));
  const idsLancamentos = new Set(existentes.lancamentos.map((item: any) => item.id));
  const idsEntradas = new Set(existentes.entradas.map((item: any) => item.id));
  const idsTotais = new Set(existentes.totais.map((item: any) => item.id));
  const idsRecorrencias = new Set(existentes.recorrencias.map((item: any) => item.id));

  const despesasPorChave = new Map(existentes.despesas.map((item: any) => [chaveDespesa(item.nome), item]));
  const lancamentosChaves = new Set(existentes.lancamentos.map((item: any) => chaveLancamento(item)));
  const entradasChaves = new Set(existentes.entradas.map((item: any) => chaveEntrada(item)));
  const totaisPorChave = new Map(existentes.totais.map((item: any) => [chaveTotal(item), item]));
  const recorrenciasPorChave = new Map(existentes.recorrencias.map((item: any) => [chaveRecorrencia(item), item]));

  const novasDespesas: any[] = [];
  for (const linha of despesasBase) {
    const chave = chaveDespesa(linha.dados.nome);
    const existentePorNome = despesasPorChave.get(chave) as any;

    if (!linha.valido) {
      resultado.despesasBaseIgnoradas += 1;
    } else if (modo === 'atualizar' && linha.idOriginal && idsDespesas.has(linha.idOriginal)) {
      const { error } = await supabase
        .from('despesas_cadastradas')
        .update({ nome: linha.dados.nome, categoria: linha.dados.categoria })
        .eq('id', linha.idOriginal)
        .eq('empresa_id', empresaId);
      if (error) throw new Error(`Erro ao atualizar despesa base: ${error.message}`);
      resultado.despesasBaseAtualizadas = (resultado.despesasBaseAtualizadas || 0) + 1;
      despesasPorChave.set(chave, { ...linha.dados, id: linha.idOriginal });
    } else if (modo === 'atualizar' && existentePorNome) {
      const { error } = await supabase
        .from('despesas_cadastradas')
        .update({ categoria: linha.dados.categoria })
        .eq('id', existentePorNome.id)
        .eq('empresa_id', empresaId);
      if (error) throw new Error(`Erro ao atualizar categoria da despesa: ${error.message}`);
      resultado.despesasBaseAtualizadas = (resultado.despesasBaseAtualizadas || 0) + 1;
    } else if (despesasPorChave.has(chave)) {
      resultado.despesasBaseIgnoradas += 1;
    } else {
      novasDespesas.push(linha.dados);
      despesasPorChave.set(chave, linha.dados);
    }
  }

  if (novasDespesas.length > 0) {
    const { error } = await supabase.from('despesas_cadastradas').insert(novasDespesas);
    if (error) throw new Error(`Erro ao inserir despesas base: ${error.message}`);
    resultado.despesasBaseInseridas = novasDespesas.length;
  }

  const novosLancamentos: any[] = [];
  for (const linha of lancamentos) {
    const chave = chaveLancamento(linha.dados);

    if (!linha.valido) {
      resultado.lancamentosIgnorados += 1;
    } else if (modo === 'atualizar' && linha.idOriginal && idsLancamentos.has(linha.idOriginal)) {
      const { empresa_id, ...campos } = linha.dados;
      const { error } = await supabase
        .from('lancamentos')
        .update(campos)
        .eq('id', linha.idOriginal)
        .eq('empresa_id', empresaId);
      if (error) throw new Error(`Erro ao atualizar lançamento: ${error.message}`);
      resultado.lancamentosAtualizados = (resultado.lancamentosAtualizados || 0) + 1;
      lancamentosChaves.add(chave);
    } else if (lancamentosChaves.has(chave)) {
      resultado.lancamentosIgnorados += 1;
    } else {
      novosLancamentos.push(linha.dados);
      lancamentosChaves.add(chave);
    }
  }

  if (novosLancamentos.length > 0) {
    const { error } = await supabase.from('lancamentos').insert(novosLancamentos);
    if (error) throw new Error(`Erro ao inserir lançamentos: ${error.message}`);
    resultado.lancamentosInseridos = novosLancamentos.length;
  }

  const novasEntradas: any[] = [];
  for (const linha of receitasEntradas) {
    const chave = chaveEntrada(linha.dados);

    if (!linha.valido) {
      resultado.receitasEntradasIgnoradas += 1;
    } else if (modo === 'atualizar' && linha.idOriginal && idsEntradas.has(linha.idOriginal)) {
      const { empresa_id, ...campos } = linha.dados;
      const { error } = await supabase
        .from('faturamentos_entradas')
        .update(campos)
        .eq('id', linha.idOriginal)
        .eq('empresa_id', empresaId);
      if (error) throw new Error(`Erro ao atualizar entrada/receita: ${error.message}`);
      resultado.receitasEntradasAtualizadas = (resultado.receitasEntradasAtualizadas || 0) + 1;
      entradasChaves.add(chave);
    } else if (entradasChaves.has(chave)) {
      resultado.receitasEntradasIgnoradas += 1;
    } else {
      novasEntradas.push(linha.dados);
      entradasChaves.add(chave);
    }
  }

  if (novasEntradas.length > 0) {
    const { error } = await supabase.from('faturamentos_entradas').insert(novasEntradas);
    if (error) throw new Error(`Erro ao inserir entradas/receitas: ${error.message}`);
    resultado.receitasEntradasInseridas = novasEntradas.length;
  }

  const novosTotais: any[] = [];
  for (const linha of receitasTotais) {
    const chave = chaveTotal(linha.dados);
    const totalExistente = totaisPorChave.get(chave) as any;

    if (!linha.valido) {
      resultado.receitasTotaisIgnoradas += 1;
    } else if (modo === 'atualizar' && linha.idOriginal && idsTotais.has(linha.idOriginal)) {
      const { empresa_id, ...campos } = linha.dados;
      const { error } = await supabase
        .from('faturamentos')
        .update(campos)
        .eq('id', linha.idOriginal)
        .eq('empresa_id', empresaId);
      if (error) throw new Error(`Erro ao atualizar total mensal: ${error.message}`);
      resultado.receitasTotaisAtualizadas = (resultado.receitasTotaisAtualizadas || 0) + 1;
      totaisPorChave.set(chave, { ...linha.dados, id: linha.idOriginal });
    } else if (modo === 'atualizar' && totalExistente) {
      const { error } = await supabase
        .from('faturamentos')
        .update({ valor: linha.dados.valor })
        .eq('id', totalExistente.id)
        .eq('empresa_id', empresaId);
      if (error) throw new Error(`Erro ao atualizar total mensal: ${error.message}`);
      resultado.receitasTotaisAtualizadas = (resultado.receitasTotaisAtualizadas || 0) + 1;
    } else if (totaisPorChave.has(chave)) {
      resultado.receitasTotaisIgnoradas += 1;
    } else {
      novosTotais.push(linha.dados);
      totaisPorChave.set(chave, linha.dados);
    }
  }

  if (novosTotais.length > 0) {
    const { error } = await supabase.from('faturamentos').insert(novosTotais);
    if (error) throw new Error(`Erro ao inserir totais mensais: ${error.message}`);
    resultado.receitasTotaisInseridas = novosTotais.length;
  }

  if (existentes.recorrenciasDisponiveis) {
    const novasRecorrencias: any[] = [];
    for (const linha of recorrencias) {
      const chave = chaveRecorrencia(linha.dados);
      const recorrenciaExistente = recorrenciasPorChave.get(chave) as any;

      if (!linha.valido) {
        resultado.recorrenciasIgnoradas += 1;
      } else if (modo === 'atualizar' && linha.idOriginal && idsRecorrencias.has(linha.idOriginal)) {
        const { empresa_id, ...campos } = linha.dados;
        const { error } = await supabase
          .from('recorrencias')
          .update(campos)
          .eq('id', linha.idOriginal)
          .eq('empresa_id', empresaId);
        if (error) throw new Error(`Erro ao atualizar despesa fixa: ${error.message}`);
        resultado.recorrenciasAtualizadas = (resultado.recorrenciasAtualizadas || 0) + 1;
        recorrenciasPorChave.set(chave, { ...linha.dados, id: linha.idOriginal });
      } else if (modo === 'atualizar' && recorrenciaExistente) {
        const { error } = await supabase
          .from('recorrencias')
          .update({
            categoria: linha.dados.categoria,
            descricao: linha.dados.descricao,
            ativo: linha.dados.ativo,
          })
          .eq('id', recorrenciaExistente.id)
          .eq('empresa_id', empresaId);
        if (error) throw new Error(`Erro ao atualizar despesa fixa: ${error.message}`);
        resultado.recorrenciasAtualizadas = (resultado.recorrenciasAtualizadas || 0) + 1;
      } else if (recorrenciasPorChave.has(chave)) {
        resultado.recorrenciasIgnoradas += 1;
      } else {
        novasRecorrencias.push(linha.dados);
        recorrenciasPorChave.set(chave, linha.dados);
      }
    }

    if (novasRecorrencias.length > 0) {
      const { error } = await supabase.from('recorrencias').insert(novasRecorrencias);
      if (error) throw new Error(`Erro ao inserir despesas fixas: ${error.message}`);
      resultado.recorrenciasInseridas = novasRecorrencias.length;
    }
  } else {
    resultado.recorrenciasIgnoradas += recorrencias.length;
  }

  return resultado;
}

async function apagarDadosFinanceirosAtuais(empresaId: string): Promise<Partial<ResultadoImportacaoBackup>> {
  const remover = async (tabela: string, opcional = false) => {
    const { count, error } = await supabase
      .from(tabela)
      .delete({ count: 'exact' })
      .eq('empresa_id', empresaId);

    if (error) {
      if (opcional) return 0;
      throw new Error(`Erro ao remover dados atuais de ${tabela}: ${error.message}`);
    }

    return count || 0;
  };

  const [
    recorrenciasRemovidas,
    lancamentosRemovidos,
    receitasEntradasRemovidas,
    receitasTotaisRemovidas,
    despesasBaseRemovidas,
  ] = await Promise.all([
    remover('recorrencias', true),
    remover('lancamentos'),
    remover('faturamentos_entradas'),
    remover('faturamentos'),
    remover('despesas_cadastradas'),
  ]);

  return {
    recorrenciasRemovidas,
    lancamentosRemovidos,
    receitasEntradasRemovidas,
    receitasTotaisRemovidas,
    despesasBaseRemovidas,
  };
}

export async function importarBackupExcelAtualizar(params: ImportarBackupExcelParams): Promise<ResultadoImportacaoBackup> {
  return importarLinhasBackup({ ...params, modo: 'atualizar' });
}

export async function importarBackupExcelSubstituir(params: ImportarBackupExcelParams): Promise<ResultadoImportacaoBackup> {
  const removidos = await apagarDadosFinanceirosAtuais(params.empresaId);
  const resultado = await importarLinhasBackup({ ...params, modo: 'substituir' });

  return {
    ...resultado,
    ...removidos,
  };
}
