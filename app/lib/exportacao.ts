/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { normalizarTexto } from './formatters';
import { APP_VERSION } from './version';
import { CATEGORIAS_EXCLUSAO_EBITDA, normalizarTipoPerfil } from './perfis';
import type { AbrirAvisoFn } from '../hooks/useUI';

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
  lancamentosInseridos: number;
  lancamentosIgnorados: number;
  receitasEntradasInseridas: number;
  receitasEntradasIgnoradas: number;
  receitasTotaisInseridas: number;
  receitasTotaisIgnoradas: number;
  recorrenciasInseridas: number;
  recorrenciasIgnoradas: number;
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

function sheetRows(wb: XLSX.WorkBook, nome: string) {
  const ws = wb.Sheets[nome];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
}

function adicionarPlanilha(wb: XLSX.WorkBook, nome: string, dados: any[]) {
  const ws = XLSX.utils.json_to_sheet(dados.length > 0 ? dados : [{}]);
  XLSX.utils.book_append_sheet(wb, ws, nome);
}

async function lerWorkbookArquivo(arquivo: File): Promise<XLSX.WorkBook> {
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
    { Chave: 'logoUrl', Valor: config.logo_url ?? logoUrl ?? '' },
    { Chave: 'logoSettings', Valor: JSON.stringify(config.logo_settings || logoSettings || { scale: 100, x: 0, y: 0 }) },
    { Chave: 'corPrimaria', Valor: config.cor_primaria || corPrimaria || '#003E73' },
    { Chave: 'darkMode', Valor: String(config.dark_mode ?? darkMode) },
    { Chave: 'duplicadosAtivo', Valor: String(config.duplicados_ativo ?? duplicadosAtivo) },
    { Chave: 'ultimoBackupEm', Valor: agora },
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
}: {
  arquivo: File;
  empresaId: string;
}): Promise<ResultadoImportacaoBackup> {
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
