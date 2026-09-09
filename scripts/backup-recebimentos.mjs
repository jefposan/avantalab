import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function carregarEnv(arquivo) {
  return fs.readFile(arquivo, 'utf8').then((conteudo) => {
    for (const linha of conteudo.split(/\r?\n/)) {
      const item = linha.trim();
      if (!item || item.startsWith('#')) continue;
      const separador = item.indexOf('=');
      if (separador < 1) continue;
      const chave = item.slice(0, separador).trim();
      let valor = item.slice(separador + 1).trim();
      if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) valor = valor.slice(1, -1);
      if (!(chave in process.env)) process.env[chave] = valor;
    }
  });
}

async function buscarTodos(cliente, tabela) {
  const registros = [];
  const tamanhoLote = 1000;
  for (let inicio = 0; ; inicio += tamanhoLote) {
    const { data, error } = await cliente.from(tabela).select('*').range(inicio, inicio + tamanhoLote - 1);
    if (error) throw new Error(`Não foi possível exportar ${tabela}: ${error.message}`);
    registros.push(...(data || []));
    if ((data || []).length < tamanhoLote) return registros;
  }
}

function hash(conteudo) {
  return createHash('sha256').update(conteudo).digest('hex');
}

function idsUnicos(registros, chave) {
  return [...new Set(registros.map((registro) => registro[chave]).filter(Boolean))];
}

async function main() {
  const diretorioDestino = process.argv[2];
  if (!diretorioDestino) throw new Error('Uso: node scripts/backup-recebimentos.mjs <diretório de destino>');

  await carregarEnv(path.resolve('.env.local'));
  const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const chave = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !chave) throw new Error('Credenciais administrativas do Supabase não encontradas.');

  const cliente = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  const destino = path.resolve(diretorioDestino);
  const diretorioComprovantes = path.join(destino, 'comprovantes');
  await fs.mkdir(diretorioComprovantes, { recursive: true });

  const [colaboradores, empresasRecebimentos, subempresas, lancamentos, eventosBrutos, comprovantes, integracoes, receitasGestao, modulos] = await Promise.all([
    buscarTodos(cliente, 'recebimentos_colaboradores'),
    buscarTodos(cliente, 'recebimentos_empresas'),
    buscarTodos(cliente, 'recebimentos_subempresas'),
    buscarTodos(cliente, 'recebimentos_lancamentos'),
    buscarTodos(cliente, 'recebimentos_eventos'),
    buscarTodos(cliente, 'recebimentos_comprovantes'),
    buscarTodos(cliente, 'recebimentos_integracao_financeira'),
    buscarTodos(cliente, 'recebimentos_receitas_gestao'),
    buscarTodos(cliente, 'empresa_modulos'),
  ]);

  const idsLancamentos = new Set(idsUnicos(lancamentos, 'id'));
  const eventos = eventosBrutos.filter((evento) => idsLancamentos.has(evento.lancamento_id));
  const modulosRecebimentos = modulos.filter((modulo) => modulo.modulo_id === 'recebimentos_presencial');
  const idsEmpresas = new Set([
    ...idsUnicos(colaboradores, 'empresa_id'),
    ...idsUnicos(empresasRecebimentos, 'empresa_id'),
    ...idsUnicos(subempresas, 'empresa_id'),
    ...idsUnicos(lancamentos, 'empresa_id'),
    ...idsUnicos(comprovantes, 'empresa_id'),
    ...idsUnicos(integracoes, 'empresa_id'),
    ...idsUnicos(receitasGestao, 'empresa_id'),
    ...idsUnicos(modulosRecebimentos, 'empresa_id'),
  ]);

  const [empresasTodas, vinculosTodos] = await Promise.all([
    buscarTodos(cliente, 'empresas'),
    buscarTodos(cliente, 'usuarios_empresa'),
  ]);
  const empresas = empresasTodas.filter((empresa) => idsEmpresas.has(empresa.id));
  const vinculos = vinculosTodos.filter((vinculo) => idsEmpresas.has(vinculo.empresa_id));
  const idsEntradas = new Set(idsUnicos(receitasGestao, 'faturamento_entrada_id'));
  const entradasTodas = idsEntradas.size ? await buscarTodos(cliente, 'faturamentos_entradas') : [];
  const faturamentosEntradas = entradasTodas.filter((entrada) => idsEntradas.has(entrada.id));

  const arquivos = [];
  for (const comprovante of comprovantes) {
    const caminhoOriginal = String(comprovante.storage_path || '');
    if (!caminhoOriginal) continue;
    const partesSeguras = caminhoOriginal.split('/').filter((parte) => parte && parte !== '.' && parte !== '..');
    const destinoArquivo = path.resolve(diretorioComprovantes, ...partesSeguras);
    if (!destinoArquivo.startsWith(`${diretorioComprovantes}${path.sep}`)) throw new Error('Caminho de comprovante inválido no backup.');
    const { data, error } = await cliente.storage.from('recebimentos-comprovantes').download(caminhoOriginal);
    if (error || !data) throw new Error(`Não foi possível exportar o comprovante ${caminhoOriginal}: ${error?.message || 'arquivo ausente'}`);
    const bytes = Buffer.from(await data.arrayBuffer());
    await fs.mkdir(path.dirname(destinoArquivo), { recursive: true });
    await fs.writeFile(destinoArquivo, bytes);
    arquivos.push({ storagePath: caminhoOriginal, arquivo: path.relative(destino, destinoArquivo), tamanhoBytes: bytes.length, sha256: hash(bytes) });
  }

  const dados = {
    schema: 'avantalab.recebimentos.backup.v1',
    geradoEm: new Date().toISOString(),
    tabelas: {
      empresas,
      usuarios_empresa: vinculos,
      empresa_modulos: modulosRecebimentos,
      recebimentos_colaboradores: colaboradores,
      recebimentos_empresas: empresasRecebimentos,
      recebimentos_subempresas: subempresas,
      recebimentos_lancamentos: lancamentos,
      recebimentos_eventos: eventos,
      recebimentos_comprovantes: comprovantes,
      recebimentos_integracao_financeira: integracoes,
      recebimentos_receitas_gestao: receitasGestao,
      faturamentos_entradas: faturamentosEntradas,
    },
  };
  const dadosSerializados = `${JSON.stringify(dados, null, 2)}\n`;
  await fs.writeFile(path.join(destino, 'dados-recebimentos.json'), dadosSerializados, 'utf8');

  const perfilLimpQuality = empresas.find((empresa) => String(empresa.nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLocaleLowerCase('pt-BR')
    .includes('limpquality')) || null;
  const manifesto = {
    schema: 'avantalab.recebimentos.manifesto.v1',
    geradoEm: dados.geradoEm,
    perfilLimpQuality: perfilLimpQuality ? { id: perfilLimpQuality.id, nome: perfilLimpQuality.nome } : null,
    contagens: Object.fromEntries(Object.entries(dados.tabelas).map(([tabela, registros]) => [tabela, registros.length])),
    comprovantes: arquivos,
    dadosSha256: hash(dadosSerializados),
  };
  await fs.writeFile(path.join(destino, 'manifesto.json'), `${JSON.stringify(manifesto, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ perfilLimpQuality: manifesto.perfilLimpQuality, contagens: manifesto.contagens, comprovantes: arquivos.length, dadosSha256: manifesto.dadosSha256 }, null, 2));
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exitCode = 1;
});
