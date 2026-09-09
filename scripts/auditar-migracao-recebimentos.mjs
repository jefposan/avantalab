import fs from 'node:fs/promises';
import path from 'node:path';

function diaBrasil() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function diaValido(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 && numero <= 31 ? numero : null;
}

function fonteDoVencimento(cadastro, lancamentos, hoje) {
  const diaLegado = diaValido(cadastro.dia_vencimento);
  if (diaLegado) return 'dia_vencimento';
  const diaMensal = diaValido(cadastro.dia_mes);
  if (diaMensal) return 'dia_mes';
  const lancamento = [...lancamentos]
    .sort((a, b) => {
      const futuroA = a.vencimento >= hoje ? 1 : 0;
      const futuroB = b.vencimento >= hoje ? 1 : 0;
      return futuroB - futuroA || String(a.vencimento).localeCompare(String(b.vencimento));
    })[0];
  if (lancamento) return 'lancamento_existente';
  return 'recorrencia_inicio';
}

function configuracaoServico(cadastro) {
  const frequencia = cadastro.frequencia_execucao_servico || cadastro.frequencia_recebimento || 'mensal';
  const dias = cadastro.dias_execucao_semana?.length ? cadastro.dias_execucao_semana : (cadastro.dias_semana || []);
  const dia = cadastro.dia_execucao_mes ?? cadastro.dia_mes ?? null;
  const mes = cadastro.mes_inicio_execucao ?? cadastro.mes_inicio ?? null;
  const valida = (frequencia !== 'semanal' || dias.length > 0)
    && (!['quinzenal', 'mensal', 'trimestral', 'semestral', 'anual'].includes(frequencia) || diaValido(dia));
  return { frequencia, dias, dia, mes, valida };
}

async function main() {
  const [arquivoBackup, arquivoRelatorio] = process.argv.slice(2);
  if (!arquivoBackup || !arquivoRelatorio) throw new Error('Uso: node scripts/auditar-migracao-recebimentos.mjs <backup.json> <relatorio.json>');
  const backup = JSON.parse(await fs.readFile(path.resolve(arquivoBackup), 'utf8'));
  const tabelas = backup.tabelas;
  const hoje = diaBrasil();
  const empresas = tabelas.recebimentos_empresas;
  const subempresas = tabelas.recebimentos_subempresas;
  const lancamentos = tabelas.recebimentos_lancamentos;
  const idsEmpresas = new Set(empresas.map((item) => item.id));
  const idsSubempresas = new Set(subempresas.map((item) => item.id));
  const idsLancamentos = new Set(lancamentos.map((item) => item.id));
  const porEmpresa = new Map(lancamentos.filter((item) => !item.subempresa_id).map((item) => [item.recebimento_empresa_id, []]));
  const porSubempresa = new Map(subempresas.map((item) => [item.id, []]));
  for (const lancamento of lancamentos) {
    if (lancamento.subempresa_id) porSubempresa.get(lancamento.subempresa_id)?.push(lancamento);
    else porEmpresa.get(lancamento.recebimento_empresa_id)?.push(lancamento);
  }

  const fontes = [...empresas.filter((item) => item.tipo_cadastro === 'cliente_direto').map((item) => fonteDoVencimento(item, porEmpresa.get(item.id) || [], hoje)), ...subempresas.map((item) => fonteDoVencimento(item, porSubempresa.get(item.id) || [], hoje))];
  const configuracoes = [...empresas.filter((item) => item.tipo_cadastro === 'cliente_direto'), ...subempresas].map(configuracaoServico);
  const previsoesRecriadas = lancamentos.filter((item) => item.recorrencia_gerada && item.valor_recebido == null && item.vencimento >= hoje);
  const registrosFinanceirosPreservados = lancamentos.filter((item) => item.valor_recebido != null || item.vencimento < hoje);
  const perfilLimpQuality = tabelas.empresas.find((item) => String(item.nome || '').replace(/[^a-z0-9]/gi, '').toLowerCase().includes('limpquality'));
  const relacoesInvalidas = {
    subempresasSemEmpresa: subempresas.filter((item) => !idsEmpresas.has(item.recebimento_empresa_id)).length,
    lancamentosSemEmpresa: lancamentos.filter((item) => !idsEmpresas.has(item.recebimento_empresa_id)).length,
    lancamentosSemSubempresa: lancamentos.filter((item) => item.subempresa_id && !idsSubempresas.has(item.subempresa_id)).length,
    eventosSemLancamento: tabelas.recebimentos_eventos.filter((item) => !idsLancamentos.has(item.lancamento_id)).length,
    comprovantesSemLancamento: tabelas.recebimentos_comprovantes.filter((item) => !idsLancamentos.has(item.lancamento_id)).length,
  };
  const relacoesValidas = Object.values(relacoesInvalidas).every((valor) => valor === 0);
  const relatorio = {
    schema: 'avantalab.recebimentos.auditoria-pre-migration.v1',
    auditadoEm: new Date().toISOString(),
    dataDeCorte: hoje,
    perfilLimpQuality: perfilLimpQuality ? { id: perfilLimpQuality.id, nome: perfilLimpQuality.nome } : null,
    integridadeReferencial: { valida: relacoesValidas, detalhes: relacoesInvalidas },
    vencimentos: { fontes, semFonte: fontes.filter((fonte) => !fonte).length },
    execucaoServico: { total: configuracoes.length, configuracoesInvalidas: configuracoes.filter((item) => !item.valida).length },
    preservacao: {
      lancamentosFinanceirosOuHistoricos: registrosFinanceirosPreservados.length,
      eventos: tabelas.recebimentos_eventos.length,
      comprovantes: tabelas.recebimentos_comprovantes.length,
      previsoesFuturasAbertasQueSeraoRecriadas: previsoesRecriadas.length,
    },
  };
  await fs.writeFile(path.resolve(arquivoRelatorio), `${JSON.stringify(relatorio, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(relatorio, null, 2));
  if (!relacoesValidas || relatorio.execucaoServico.configuracoesInvalidas > 0 || relatorio.vencimentos.semFonte > 0) process.exitCode = 2;
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exitCode = 1;
});
