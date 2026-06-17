/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { normalizarTexto } from './formatters';
import { CATEGORIAS_EXCLUSAO_EBITDA } from './perfis';
import type { AbrirAvisoFn } from '../hooks/useUI';

const MESES = [
  'JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
  'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO',
];

export interface GerarBackupExcelParams {
  empresaId: string;
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
}

export async function gerarBackupExcel({
  empresaId,
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
}: GerarBackupExcelParams): Promise<void> {
  const meses = MESES;
  if (!empresaId) {
  abrirAviso(
    'Empresa não carregada',
    'Faça login novamente e tente gerar o backup.'
  );
  return;
}

  const dadosResumo: any[] = [];
  const dadosLancamentos: any[] = [];

  const { data: lancamentosBanco, error: erroLancamentos } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('ano', { ascending: true })
    .order('mes', { ascending: true })
    .order('dia', { ascending: true });

  if (erroLancamentos) {
  console.error('Erro ao buscar lançamentos para backup:', erroLancamentos);
  abrirAviso(
    'Erro ao gerar backup',
    erroLancamentos.message || 'Não foi possível buscar os lançamentos para o backup.'
  );
  return;
}

  const { data: faturamentosBanco, error: erroFaturamentos } = await supabase
    .from('faturamentos')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('ano', { ascending: true });

  if (erroFaturamentos) {
  console.error('Erro ao buscar faturamentos para backup:', erroFaturamentos);
  abrirAviso(
    'Erro ao gerar backup',
    erroFaturamentos.message || 'Não foi possível buscar os faturamentos para o backup.'
  );
  return;
}

  const lancamentosBackup = lancamentosBanco || [];
  const faturamentosBackup = faturamentosBanco || [];

  const anosNoBanco = Array.from(
    new Set([
      ...lancamentosBackup.map((l: any) => String(l.ano)),
      ...faturamentosBackup.map((f: any) => String(f.ano)),
    ])
  ).sort();

  if (anosNoBanco.length === 0) {
  abrirAviso(
    'Backup sem dados',
    'Nenhum dado foi encontrado para gerar o backup.',
    abrirExclusaoDepois
      ? () => {
          setNomeConfirmacaoExclusao('');
          setModalExcluirEmpresa(true);
        }
      : undefined
  );
  return;
}

  anosNoBanco.forEach((ano) => {
    const lancsAno = lancamentosBackup.filter((l: any) => String(l.ano) === ano);
    const fatsAno = faturamentosBackup.filter((f: any) => String(f.ano) === ano);

    const faturamentosPorMes: Record<string, number> = {};

    fatsAno.forEach((f: any) => {
      faturamentosPorMes[f.mes] = Number(f.valor || 0);
    });

    let totalFatAno = 0;
    let totalDespAno = 0;
    let totalLucroAno = 0;
    let totalEbitdaAno = 0;

    lancsAno.forEach((l: any) => {
      dadosLancamentos.push({
        Ano: ano,
        Mês: l.mes,
        Dia: l.dia,
        Despesa: l.despesa_nome,
        Descrição: l.descricao || '-',
        'Valor (R$)': Number(l.valor || 0),
      });
    });

    meses.forEach((mes) => {
      const faturamento = faturamentosPorMes[mes] || 0;
      const lancsMes = lancsAno.filter((l: any) => l.mes === mes);

      let despesas = 0;
      let exclusoesEbitda = 0;

      lancsMes.forEach((l: any) => {
        const valor = Number(l.valor || 0);
        despesas += valor;

        const despesaCat =
  despesasCadastradas.find(
    (d) => normalizarTexto(d.nome) === normalizarTexto(l.despesa_nome)
  )?.categoria || 'Outros';

        if (CATEGORIAS_EXCLUSAO_EBITDA.includes(despesaCat)) {
          exclusoesEbitda += valor;
        }
      });

      const lucro = faturamento - despesas;
      const ebitda = lucro + exclusoesEbitda;

      if (faturamento > 0 || despesas > 0) {
        dadosResumo.push({
          Ano: ano,
          Mês: mes,
          'Faturamento (R$)': faturamento,
          'Despesas (R$)': despesas,
          'Lucro (R$)': lucro,
          'EBITDA (R$)': ebitda,
        });

        totalFatAno += faturamento;
        totalDespAno += despesas;
        totalLucroAno += lucro;
        totalEbitdaAno += ebitda;
      }
    });

    if (totalFatAno > 0 || totalDespAno > 0) {
      dadosResumo.push({
        Ano: ano,
        Mês: 'TOTAL ANUAL',
        'Faturamento (R$)': totalFatAno,
        'Despesas (R$)': totalDespAno,
        'Lucro (R$)': totalLucroAno,
        'EBITDA (R$)': totalEbitdaAno,
      });

      dadosResumo.push({
        Ano: '',
        Mês: '',
        'Faturamento (R$)': null,
        'Despesas (R$)': null,
        'Lucro (R$)': null,
        'EBITDA (R$)': null,
      });
    }
  });

  const wb = XLSX.utils.book_new();

  const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Financeiro');

  if (dadosLancamentos.length > 0) {
    const wsLancs = XLSX.utils.json_to_sheet(dadosLancamentos);
    XLSX.utils.book_append_sheet(wb, wsLancs, 'Lançamentos Detalhados');
  }

  const dadosConfiguracoes = [
    {
      chave: 'empresaId',
      valor: empresaId,
    },
    {
      chave: 'logoUrl',
      valor: logoUrl || '',
    },
    {
      chave: 'logoSettings',
      valor: JSON.stringify(logoSettings || { scale: 100, x: 0, y: 0 }),
    },
    {
      chave: 'corPrimaria',
      valor: corPrimaria || '#003E73',
    },
    {
      chave: 'darkMode',
      valor: String(darkMode),
    },
    {
      chave: 'duplicadosAtivo',
      valor: String(duplicadosAtivo),
    },
    {
      chave: 'despesasCadastradas',
      valor: JSON.stringify(despesasCadastradas || []),
    },
  ];

  const wsConfig = XLSX.utils.json_to_sheet(dadosConfiguracoes);
  XLSX.utils.book_append_sheet(wb, wsConfig, 'Configurações');

  const dataHoje = new Date().toISOString().split('T')[0];
XLSX.writeFile(wb, `backup_avantalab_${dataHoje}.xlsx`);

const agora = new Date().toISOString();

const { error: erroSalvarBackup } = await supabase
  .from('configuracoes')
  .upsert(
    {
      empresa_id: empresaId,
      ultimo_backup_em: agora,
    },
    {
      onConflict: 'empresa_id',
    }
  );

if (erroSalvarBackup) {
  console.error('Erro ao salvar data do backup:', erroSalvarBackup);
  abrirAviso(
    'Backup gerado',
    'O arquivo foi gerado, mas não foi possível salvar a data do último backup.'
  );
  return;
}

setUltimoBackupEm(agora);

if (abrirExclusaoDepois) {
  abrirAviso(
    'Backup gerado',
    'O backup foi gerado com sucesso. Agora confirme a exclusão digitando exatamente o nome da empresa.',
    () => {
      setNomeConfirmacaoExclusao('');
      setModalExcluirEmpresa(true);
    }
  );
}
}
