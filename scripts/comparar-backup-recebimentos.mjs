import fs from 'node:fs/promises';
import path from 'node:path';

function canonico(valor) {
  if (Array.isArray(valor)) return valor.map(canonico);
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.keys(valor).sort().map((chave) => [chave, canonico(valor[chave])]));
  return valor;
}

function igual(a, b) {
  return JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));
}

function indexar(registros) {
  return new Map(registros.map((registro) => [registro.id, registro]));
}

function diferencasPorId(antes, depois, filtro = () => true, normalizar = (valor) => valor) {
  const mapaDepois = indexar(depois);
  return antes.filter(filtro).filter((registro) => !mapaDepois.has(registro.id) || !igual(normalizar(registro), normalizar(mapaDepois.get(registro.id)))).length;
}

function baseCadastro(registro) {
  const copia = { ...registro };
  delete copia.frequencia_recebimento;
  delete copia.dias_semana;
  delete copia.dia_mes;
  delete copia.mes_inicio;
  delete copia.frequencia_execucao_servico;
  delete copia.dias_execucao_semana;
  delete copia.dia_execucao_mes;
  delete copia.mes_inicio_execucao;
  delete copia.herda_execucao_servico;
  delete copia.tipo_nivel;
  delete copia.identificacao_nivel;
  return copia;
}

function configuracaoEsperada(registro) {
  return {
    frequencia_execucao_servico: registro.frequencia_recebimento || 'mensal',
    dias_execucao_semana: registro.dias_semana || [],
    dia_execucao_mes: registro.dia_mes ?? null,
    mes_inicio_execucao: registro.mes_inicio ?? null,
  };
}

async function main() {
  const [arquivoAntes, arquivoDepois, arquivoRelatorio] = process.argv.slice(2);
  if (!arquivoAntes || !arquivoDepois || !arquivoRelatorio) throw new Error('Uso: node scripts/comparar-backup-recebimentos.mjs <antes.json> <depois.json> <relatorio.json>');
  const antes = JSON.parse(await fs.readFile(path.resolve(arquivoAntes), 'utf8')).tabelas;
  const depois = JSON.parse(await fs.readFile(path.resolve(arquivoDepois), 'utf8')).tabelas;
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const porIdDepois = {
    empresas: indexar(depois.recebimentos_empresas),
    subempresas: indexar(depois.recebimentos_subempresas),
  };
  const cadastrosEmpresas = diferencasPorId(antes.recebimentos_empresas, depois.recebimentos_empresas, () => true, baseCadastro);
  const cadastrosSubempresas = diferencasPorId(antes.recebimentos_subempresas, depois.recebimentos_subempresas, () => true, baseCadastro);
  const vencimentosAlterados = [...antes.recebimentos_empresas, ...antes.recebimentos_subempresas].filter((registro) => {
    const correspondente = porIdDepois.empresas.get(registro.id) || porIdDepois.subempresas.get(registro.id);
    return !correspondente || correspondente.dia_vencimento !== registro.dia_vencimento;
  }).length;
  const configuracoesNaoMigradas = [...antes.recebimentos_empresas.filter((registro) => registro.tipo_cadastro === 'cliente_direto'), ...antes.recebimentos_subempresas].filter((registro) => {
    const correspondente = porIdDepois.empresas.get(registro.id) || porIdDepois.subempresas.get(registro.id);
    return !correspondente || !igual(configuracaoEsperada(registro), {
      frequencia_execucao_servico: correspondente.frequencia_execucao_servico,
      dias_execucao_semana: correspondente.dias_execucao_semana,
      dia_execucao_mes: correspondente.dia_execucao_mes,
      mes_inicio_execucao: correspondente.mes_inicio_execucao,
    });
  }).length;
  const historicos = (registro) => registro.valor_recebido != null || registro.vencimento < hoje;
  const previsoesAbertas = (registro) => registro.recorrencia_gerada && registro.valor_recebido == null && registro.vencimento >= hoje;
  const eventosAlterados = diferencasPorId(antes.recebimentos_eventos, depois.recebimentos_eventos);
  const comprovantesAlterados = diferencasPorId(antes.recebimentos_comprovantes, depois.recebimentos_comprovantes);
  const historicosAlterados = diferencasPorId(antes.recebimentos_lancamentos, depois.recebimentos_lancamentos, historicos);
  const previsoesAntes = antes.recebimentos_lancamentos.filter(previsoesAbertas);
  const previsoesDepois = depois.recebimentos_lancamentos.filter(previsoesAbertas);
  const perfilLimpQuality = antes.empresas.find((empresa) => String(empresa.nome || '').replace(/[^a-z0-9]/gi, '').toLowerCase().includes('limpquality'));
  const relatorio = {
    schema: 'avantalab.recebimentos.comparacao-pos-migration.v1',
    comparadoEm: new Date().toISOString(),
    dataDeCorte: hoje,
    perfilLimpQuality: perfilLimpQuality ? { id: perfilLimpQuality.id, nome: perfilLimpQuality.nome } : null,
    preservados: {
      cadastrosEmpresas: antes.recebimentos_empresas.length - cadastrosEmpresas,
      cadastrosSubempresas: antes.recebimentos_subempresas.length - cadastrosSubempresas,
      lancamentosFinanceirosOuHistoricos: antes.recebimentos_lancamentos.filter(historicos).length - historicosAlterados,
      eventos: antes.recebimentos_eventos.length - eventosAlterados,
      comprovantes: antes.recebimentos_comprovantes.length - comprovantesAlterados,
      diaVencimento: antes.recebimentos_empresas.length + antes.recebimentos_subempresas.length - vencimentosAlterados,
      configuracoesExecucaoServico: antes.recebimentos_empresas.filter((registro) => registro.tipo_cadastro === 'cliente_direto').length + antes.recebimentos_subempresas.length - configuracoesNaoMigradas,
    },
    divergencias: { cadastrosEmpresas, cadastrosSubempresas, historicosAlterados, eventosAlterados, comprovantesAlterados, vencimentosAlterados, configuracoesNaoMigradas },
    previsoesFuturasRecriadas: { antes: previsoesAntes.length, depois: previsoesDepois.length },
  };
  relatorio.aprovado = Object.values(relatorio.divergencias).every((valor) => valor === 0)
    && relatorio.previsoesFuturasRecriadas.antes === relatorio.previsoesFuturasRecriadas.depois;
  await fs.writeFile(path.resolve(arquivoRelatorio), `${JSON.stringify(relatorio, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(relatorio, null, 2));
  if (!relatorio.aprovado) process.exitCode = 2;
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exitCode = 1;
});
