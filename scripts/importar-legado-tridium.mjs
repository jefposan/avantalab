#!/usr/bin/env node

/**
 * Importação controlada do backup MySQL legado da Tridium para o Vendas Mobile.
 *
 * Uso:
 *   node scripts/importar-legado-tridium.mjs --arquivo /caminho/BancodeDados_tridium.zip
 *   node scripts/importar-legado-tridium.mjs --arquivo /caminho/BancodeDados_tridium.zip --executar
 *
 * Sem --executar o script apenas valida e apresenta o plano. A operação usa IDs
 * UUID determinísticos para poder ser retomada com segurança, sem duplicar dados.
 */

import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;

const REPRESENTANTES = [
  { legadoId: '5', nome: 'Jefferson Ferreira', email: 'jefposan@gmail.com', criar: false },
  { legadoId: '9', nome: 'Marcos Soares', email: 'marcos-beserra@hotmail.com', criar: true },
  { legadoId: '16', nome: 'William De Lima Raposo', email: 'wlimaraposo1979@gmail.com', criar: false },
];

const NAMESPACE_URL = Buffer.from('6ba7b8109dad11d180b400c04fd430c8', 'hex');
const ORIGEM = 'tridium_mysql_20260715';

function argumento(nome) {
  const indice = process.argv.indexOf(nome);
  return indice >= 0 ? process.argv[indice + 1] : '';
}

function temArgumento(nome) {
  return process.argv.includes(nome);
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

function uuidDeterministico(chave) {
  const hash = createHash('sha1').update(Buffer.concat([NAMESPACE_URL, Buffer.from(chave)])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function senhaTemporaria() {
  return `Avanta#${randomBytes(9).toString('base64url')}9`;
}

function dataIsoLegada(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return new Date().toISOString();
  return `${texto.replace(' ', 'T')}-03:00`;
}

function dataLegada(valor) {
  return String(valor || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
}

function numero(valor) {
  const convertido = Number(valor || 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

function dividirValores(texto) {
  const valores = [];
  let atual = '';
  let aspas = false;
  let escape = false;
  let profundidade = 0;

  for (const caractere of texto) {
    if (aspas) {
      atual += caractere;
      if (escape) escape = false;
      else if (caractere === '\\') escape = true;
      else if (caractere === "'") aspas = false;
      continue;
    }
    if (caractere === "'") {
      aspas = true;
      atual += caractere;
    } else if (caractere === '(') {
      profundidade += 1;
      atual += caractere;
    } else if (caractere === ')') {
      profundidade -= 1;
      atual += caractere;
    } else if (caractere === ',' && profundidade === 0) {
      valores.push(atual.trim());
      atual = '';
    } else {
      atual += caractere;
    }
  }
  if (atual.trim()) valores.push(atual.trim());
  return valores;
}

function extrairTuplas(texto) {
  const tuplas = [];
  let aspas = false;
  let escape = false;
  let profundidade = 0;
  let inicio = -1;

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caractere = texto[indice];
    if (aspas) {
      if (escape) escape = false;
      else if (caractere === '\\') escape = true;
      else if (caractere === "'") aspas = false;
      continue;
    }
    if (caractere === "'") aspas = true;
    else if (caractere === '(') {
      if (profundidade === 0) inicio = indice + 1;
      profundidade += 1;
    } else if (caractere === ')') {
      profundidade -= 1;
      if (profundidade === 0) tuplas.push(texto.slice(inicio, indice));
    }
  }
  return tuplas;
}

function valorSql(valor) {
  const texto = valor.trim();
  if (texto === 'NULL') return null;
  if (texto.startsWith("'") && texto.endsWith("'")) {
    return texto.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  }
  return texto;
}

function lerTabelaLegada(diretorio, tabela) {
  const arquivo = join(diretorio, `tridium_${tabela}.sql`);
  const texto = readFileSync(arquivo, 'utf8');
  const inicioCreate = texto.indexOf('CREATE TABLE');
  const fimCreate = texto.indexOf(') ENGINE');
  const colunas = [...texto.slice(inicioCreate, fimCreate).matchAll(/^\s*`([^`]+)`/gm)].map((item) => item[1]);
  const valores = (texto.match(/INSERT INTO `[^`]+` VALUES ([\s\S]*?);\s*(?:\/\*!|$)/) || [])[1] || '';
  return extrairTuplas(valores).map((tupla) => Object.fromEntries(
    dividirValores(tupla).map((valor, indice) => [colunas[indice], valorSql(valor)]),
  ));
}

function carregarBackup(arquivo) {
  const diretorioTemporario = mkdtempSync(join(tmpdir(), 'avantalab-tridium-'));
  try {
    execFileSync('unzip', ['-q', arquivo, '-d', diretorioTemporario], { stdio: 'pipe' });
    const diretorio = join(diretorioTemporario, 'BancodeDados');
    const tabelas = Object.fromEntries([
      'categories', 'client_professionals', 'client_representatives', 'products',
      'products_representate', 'pedidos', 'pedido_items', 'pagamentos', 'agenda',
    ].map((tabela) => [tabela, lerTabelaLegada(diretorio, tabela)]));
    return { tabelas, diretorioTemporario };
  } catch (erro) {
    rmSync(diretorioTemporario, { recursive: true, force: true });
    throw erro;
  }
}

async function carregarUsuariosAuth(db) {
  const resultado = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (resultado.error) throw resultado.error;
  return resultado.data.users || [];
}

async function emLotes(itens, tamanho, executar) {
  for (let indice = 0; indice < itens.length; indice += tamanho) {
    await executar(itens.slice(indice, indice + tamanho));
  }
}

async function falharSeErro(resultado, contexto) {
  if (resultado.error) throw new Error(`${contexto}: ${resultado.error.message || resultado.error.code}`);
  return resultado.data;
}

function montarPlano(tabelas, representante) {
  const pedidos = tabelas.pedidos.filter((item) => String(item.id_usuario_logado) === representante.legadoId);
  const pedidoIds = new Set(pedidos.map((item) => String(item.id)));
  const itens = tabelas.pedido_items.filter((item) => pedidoIds.has(String(item.id_pedido)));
  const clientes = tabelas.client_professionals.filter((item) => String(item.id_representante) === representante.legadoId);
  const pagamentos = tabelas.pagamentos.filter((item) => String(item.id_usuario_logado) === representante.legadoId);
  const agenda = tabelas.agenda.filter((item) => String(item.id_usuario_logado) === representante.legadoId);
  const produtos = tabelas.products;
  return { ...representante, pedidos, itens, clientes, pagamentos, agenda, produtos };
}

function pagamentoImportavel(item) {
  if (String(item.status) !== 'Confirmado') return false;
  const forma = String(item.forma_pagamento || '');
  if (forma === 'Saldo Devedor' || forma === 'Crédito em Loja') return false;
  return numero(item.valor) !== 0;
}

async function garantirConta(db, representante, dadosRepresentante, executar, redefinirSenha) {
  const usuarios = await carregarUsuariosAuth(db);
  let usuario = usuarios.find((item) => normalizarTexto(item.email) === normalizarTexto(representante.email));
  let senha = '';

  if (!usuario && representante.criar) {
    senha = senhaTemporaria();
    if (executar) {
      const criado = await db.auth.admin.createUser({
        email: representante.email,
        password: senha,
        email_confirm: true,
        phone: dadosRepresentante?.phone || undefined,
        user_metadata: { nome: representante.nome, telefone: dadosRepresentante?.phone || null, origem: ORIGEM },
      });
      if (criado.error || !criado.data.user) throw new Error(`Não foi possível criar ${representante.nome}: ${criado.error?.message || 'erro desconhecido'}`);
      usuario = criado.data.user;
    } else {
      usuario = { id: uuidDeterministico(`auth-simulacao:${representante.email}`), email: representante.email };
    }
  }

  if (!usuario) throw new Error(`A conta ${representante.email} não foi encontrada no Supabase Auth.`);
  if (usuario && representante.criar && redefinirSenha) {
    senha = senhaTemporaria();
    if (executar) {
      const atualizado = await db.auth.admin.updateUserById(usuario.id, {
        password: senha,
        email_confirm: true,
        user_metadata: { ...usuario.user_metadata, nome: representante.nome, telefone: dadosRepresentante?.phone || null, origem: ORIGEM },
      });
      if (atualizado.error) throw new Error(`Não foi possível redefinir a senha de ${representante.nome}: ${atualizado.error.message}`);
    }
  }
  return { userId: usuario.id, senha };
}

async function garantirAcessos(db, empresaId, userId, executar) {
  if (!executar) return;
  const acessoAtual = await falharSeErro(
    await db.from('vendas_mobile_acessos').select('papel').eq('empresa_id', empresaId).eq('user_id', userId).maybeSingle(),
    'Não foi possível consultar o acesso do Vendas',
  );
  await falharSeErro(
    await db.from('empresa_modulos').upsert({ empresa_id: empresaId, modulo_id: 'vendas_mobile', ativo: true }, { onConflict: 'empresa_id,modulo_id' }),
    'Não foi possível ativar o módulo Vendas',
  );
  await falharSeErro(
    await db.from('vendas_mobile_acessos').upsert({
      empresa_id: empresaId,
      user_id: userId,
      papel: acessoAtual?.papel || 'vendedor',
      status: 'ativo',
      aprovado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'empresa_id,user_id' }),
    'Não foi possível liberar o acesso do Vendas',
  );
  await falharSeErro(
    await db.from('vendas_mobile_perfis_financeiros').upsert({ user_id: userId, empresa_id: empresaId, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id' }),
    'Não foi possível definir o perfil financeiro da Tridium',
  );
}

async function importarRepresentante(db, empresaId, catalogoId, tabelas, plano, userId, executar) {
  const categorias = new Map(tabelas.categories.map((item) => [String(item.id), item.name || null]));
  const produtosPorId = new Map(tabelas.products.map((item) => [String(item.id), item]));
  const produtosPorNome = new Map();
  const produtosPorOrigemCatalogo = new Map();
  const { data: produtosAtuais } = await db.from('vendas_mobile_produtos').select('id,nome,catalogo_produto_origem_id').eq('user_id', userId);
  for (const produto of produtosAtuais || []) {
    produtosPorNome.set(normalizarTexto(produto.nome), produto.id);
    if (produto.catalogo_produto_origem_id) produtosPorOrigemCatalogo.set(String(produto.catalogo_produto_origem_id), produto.id);
  }

  const catalogoPorNome = new Map();
  const catalogoPorLegadoId = new Map();
  const { data: catalogoAtual } = await db.from('vendas_mobile_catalogo_produtos').select('id,nome,observacoes_fiscais').eq('catalogo_id', catalogoId);
  for (const produto of catalogoAtual || []) {
    catalogoPorNome.set(normalizarTexto(produto.nome), produto.id);
    const legado = String(produto.observacoes_fiscais || '').match(/produto legado #(\d+)/i)?.[1];
    if (legado) catalogoPorLegadoId.set(legado, produto.id);
  }

  const produtosSelecionados = plano.produtos;
  const ajustesProduto = new Map(
    tabelas.products_representate
      .filter((item) => String(item.id_usuario_logado) === plano.legadoId)
      .map((item) => [String(item.id_produto), item]),
  );
  const catalogoProdutos = [];
  const produtosPessoais = [];
  const mapaProdutos = new Map();
  const produtosPessoaisPlanejados = new Set();
  const nomesPessoaisReutilizados = new Set();

  for (const produto of produtosSelecionados) {
    const chaveNome = normalizarTexto(produto.name);
    const preco = numero(produto.price);
    const catalogoProdutoId = catalogoPorLegadoId.get(String(produto.id))
      || (preco > 0 ? uuidDeterministico(`${ORIGEM}:catalogo-produto:${produto.id}`) : null);
    if (catalogoProdutoId && !catalogoPorLegadoId.has(String(produto.id))) {
      catalogoPorNome.set(chaveNome, catalogoProdutoId);
      catalogoPorLegadoId.set(String(produto.id), catalogoProdutoId);
      catalogoProdutos.push({
        id: catalogoProdutoId,
        catalogo_id: catalogoId,
        categoria: categorias.get(String(produto.category_id)) || null,
        nome: produto.name,
        descricao: produto.description || null,
        preco_custo: 0,
        preco_venda: preco,
        imagem_url: String(produto.image_url_1 || '').startsWith('/uploads/') ? null : (produto.image_url_1 || null),
        ativo: String(produto.status || 'ativo') === 'ativo',
        observacoes_fiscais: `Importado de ${ORIGEM}; produto legado #${produto.id}.`,
      });
    }
    const ajuste = ajustesProduto.get(String(produto.id));
    const precoPessoal = ajuste?.preco == null ? preco : numero(ajuste.preco);
    const custoPessoal = ajuste?.custo == null ? 0 : numero(ajuste.custo);
    const ativoPessoal = ajuste?.status == null ? String(produto.status || 'ativo') === 'ativo' : String(ajuste.status) === 'ativo';
    const produtoPessoalId = (catalogoProdutoId ? produtosPorOrigemCatalogo.get(String(catalogoProdutoId)) : null)
      || (!nomesPessoaisReutilizados.has(chaveNome) ? produtosPorNome.get(chaveNome) : null)
      || uuidDeterministico(`${ORIGEM}:produto:${plano.legadoId}:${produto.id}`);
    mapaProdutos.set(String(produto.id), produtoPessoalId);
    nomesPessoaisReutilizados.add(chaveNome);
    if (!produtosPorNome.has(chaveNome) && !produtosPessoaisPlanejados.has(produtoPessoalId)) {
      produtosPessoaisPlanejados.add(produtoPessoalId);
      if (catalogoProdutoId) produtosPorOrigemCatalogo.set(String(catalogoProdutoId), produtoPessoalId);
      produtosPessoais.push({
        id: produtoPessoalId,
        user_id: userId,
        catalogo_empresa_id: catalogoId,
        catalogo_produto_origem_id: catalogoProdutoId,
        marca: 'Tridium',
        categoria: categorias.get(String(produto.category_id)) || null,
        nome: produto.name,
        descricao: produto.description || null,
        preco: precoPessoal,
        estoque: null,
        unidade: 'un',
        imagem_url: String(produto.image_url_1 || '').startsWith('/uploads/') ? null : (produto.image_url_1 || null),
        ativo: ativoPessoal,
        preco_custo: custoPessoal,
        metadados: { origem_migracao: ORIGEM, produto_legado_id: Number(produto.id), ajuste_legacy: Boolean(ajuste) },
      });
    }
  }

  if (executar) {
    await emLotes(catalogoProdutos, 100, async (lote) => falharSeErro(await db.from('vendas_mobile_catalogo_produtos').upsert(lote, { onConflict: 'id' }), 'Não foi possível importar o catálogo'));
    await emLotes(produtosPessoais, 100, async (lote) => falharSeErro(await db.from('vendas_mobile_produtos').upsert(lote, { onConflict: 'id' }), 'Não foi possível importar os produtos pessoais'));
  }

  const mapaClientes = new Map();
  const clientes = plano.clientes.map((cliente) => {
    const id = uuidDeterministico(`${ORIGEM}:cliente:${plano.legadoId}:${cliente.id}`);
    mapaClientes.set(String(cliente.id), id);
    return {
      id,
      user_id: userId,
      nome: cliente.name,
      telefone: cliente.phone || null,
      email: cliente.email || null,
      endereco: {
        cep: cliente.cep ? String(cliente.cep).padStart(8, '0') : null,
        logradouro: cliente.endereço || null,
        cidade: cliente.city || null,
        estado: cliente.state || null,
      },
      observacoes: `Importado de ${ORIGEM}; cliente legado #${cliente.id}${cliente.profession ? `; profissão: ${cliente.profession}` : ''}.`,
      ativo: String(cliente.status || 'Ativo').toLocaleLowerCase('pt-BR') !== 'inativo',
      criado_em: dataIsoLegada(cliente.created_at),
      atualizado_em: dataIsoLegada(cliente.created_at),
    };
  });

  const mapaPedidos = new Map();
  const pedidos = plano.pedidos.map((pedido) => {
    const id = uuidDeterministico(`${ORIGEM}:pedido:${plano.legadoId}:${pedido.id}`);
    mapaPedidos.set(String(pedido.id), id);
    const consignado = String(pedido.status) === 'Consignado';
    return {
      id,
      user_id: userId,
      empresa_id: empresaId,
      cliente_id: mapaClientes.get(String(pedido.id_cliente)) || null,
      status: consignado ? 'consignado' : 'concluida',
      subtotal: numero(pedido.valor_total) + numero(pedido.valor_desconto),
      desconto: numero(pedido.valor_desconto),
      total: numero(pedido.valor_total),
      forma_pagamento: consignado ? 'Consignado' : 'Venda',
      observacoes: JSON.stringify({ avantalab_pedido: true, origem_migracao: ORIGEM, pedido_legado_id: Number(pedido.id), status_legado: pedido.status, eh_bonificacao: Number(pedido.eh_bonificacao || 0) === 1 }),
      criado_em: dataIsoLegada(pedido.data_cadastro),
      atualizado_em: dataIsoLegada(pedido.data_update || pedido.data_cadastro),
    };
  });

  const itens = plano.itens.map((item) => {
    const quantidade = numero(item.quant) || 1;
    const preco = numero(item.preco_unit);
    const bonificado = Number(item.eh_bonificacao || 0) === 1;
    return {
      id: uuidDeterministico(`${ORIGEM}:item:${plano.legadoId}:${item.id}`),
      pedido_id: mapaPedidos.get(String(item.id_pedido)),
      produto_id: mapaProdutos.get(String(item.id_produto)) || null,
      produto_nome: produtosPorId.get(String(item.id_produto))?.name || `Produto legado #${item.id_produto}`,
      quantidade,
      preco_unitario: preco,
      preco_custo: null,
      desconto: bonificado ? quantidade * preco : 0,
      total: bonificado ? 0 : quantidade * preco,
    };
  });

  const pagamentos = [];
  const creditoPorCliente = new Map();
  for (const pagamento of plano.pagamentos) {
    const forma = String(pagamento.forma_pagamento || '');
    const valor = numero(pagamento.valor);
    const clienteLegadoId = String(pagamento.id_cliente);
    if (String(pagamento.status) === 'Confirmado' && forma === 'Crédito em Loja') {
      creditoPorCliente.set(clienteLegadoId, numero(creditoPorCliente.get(clienteLegadoId)) + valor);
      continue;
    }
    if (String(pagamento.status) === 'Confirmado' && forma.startsWith('Uso de Crédito')) {
      creditoPorCliente.set(clienteLegadoId, numero(creditoPorCliente.get(clienteLegadoId)) + valor);
    }
    if (!pagamentoImportavel(pagamento)) continue;
    pagamentos.push({
      id: uuidDeterministico(`${ORIGEM}:pagamento:${plano.legadoId}:${pagamento.id}`),
      user_id: userId,
      empresa_id: empresaId,
      cliente_id: mapaClientes.get(clienteLegadoId) || null,
      pedido_id: mapaPedidos.get(String(pagamento.id_pedido)) || null,
      tipo: 'pagamento',
      forma_pagamento: forma.startsWith('Uso de Crédito') ? 'Crédito em loja' : forma,
      valor: Math.abs(valor),
      desconto: Math.max(0, numero(pagamento.desconto)),
      saldo_anterior: 0,
      saldo_final: 0,
      observacoes: JSON.stringify({ avantalab_pagamento: true, origem_migracao: ORIGEM, pagamento_legado_id: Number(pagamento.id), forma_legada: forma, status_legado: pagamento.status }),
      data_pagamento: dataLegada(pagamento.data_pagamento),
      criado_em: dataIsoLegada(pagamento.data_pagamento),
    });
  }
  for (const [clienteLegadoId, saldoCredito] of creditoPorCliente.entries()) {
    if (saldoCredito <= 0.005) continue;
    pagamentos.push({
      id: uuidDeterministico(`${ORIGEM}:credito-remanescente:${plano.legadoId}:${clienteLegadoId}`),
      user_id: userId,
      empresa_id: empresaId,
      cliente_id: mapaClientes.get(clienteLegadoId) || null,
      pedido_id: null,
      tipo: 'pagamento',
      forma_pagamento: 'Crédito em loja',
      valor: saldoCredito,
      desconto: 0,
      saldo_anterior: 0,
      saldo_final: 0,
      observacoes: JSON.stringify({ avantalab_pagamento: true, origem_migracao: ORIGEM, tipo: 'credito_legado_remanescente' }),
      data_pagamento: '2026-07-15',
      criado_em: '2026-07-15T12:00:00-03:00',
    });
  }

  const clientesPorNome = new Map(clientes.map((cliente) => [normalizarTexto(cliente.nome), cliente.id]));
  const agenda = plano.agenda.map((evento) => ({
    id: uuidDeterministico(`${ORIGEM}:agenda:${plano.legadoId}:${evento.id}`),
    user_id: userId,
    cliente_id: clientesPorNome.get(normalizarTexto(evento.client_name)) || null,
    cliente_nome: evento.client_name || null,
    tipo: evento.type || 'visita',
    data: dataLegada(evento.date_scheduled),
    horario: evento.time_scheduled || null,
    observacoes: evento.description || null,
    status: evento.status || 'pendente',
    criado_em: dataIsoLegada(evento.created_at),
    atualizado_em: dataIsoLegada(evento.updated_at || evento.created_at),
  }));

  if (executar) {
    await emLotes(clientes, 100, async (lote) => falharSeErro(await db.from('vendas_mobile_clientes').upsert(lote, { onConflict: 'id' }), 'Não foi possível importar os clientes'));
    await emLotes(pedidos, 100, async (lote) => falharSeErro(await db.from('vendas_mobile_pedidos').upsert(lote, { onConflict: 'id' }), 'Não foi possível importar os pedidos'));
    await emLotes(itens, 200, async (lote) => falharSeErro(await db.from('vendas_mobile_pedido_itens').upsert(lote, { onConflict: 'id' }), 'Não foi possível importar os itens dos pedidos'));
    await emLotes(pagamentos, 200, async (lote) => falharSeErro(await db.from('vendas_mobile_pagamentos').upsert(lote, { onConflict: 'id' }), 'Não foi possível importar os pagamentos'));
    await emLotes(agenda, 100, async (lote) => falharSeErro(await db.from('vendas_mobile_agenda').upsert(lote, { onConflict: 'id' }), 'Não foi possível importar a agenda'));
  }

  return { produtos: produtosPessoais.length, clientes: clientes.length, pedidos: pedidos.length, itens: itens.length, pagamentos: pagamentos.length, agenda: agenda.length };
}

async function principal() {
  const arquivo = argumento('--arquivo');
  const executar = temArgumento('--executar');
  const redefinirSenhaMarcos = temArgumento('--redefinir-senha-marcos');
  if (!arquivo || !existsSync(arquivo)) throw new Error('Informe um arquivo ZIP válido com --arquivo.');
  loadEnvConfig(process.cwd());
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Credenciais administrativas do Supabase não estão configuradas.');

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { tabelas, diretorioTemporario } = carregarBackup(arquivo);
  try {
    const empresa = await falharSeErro(await db.from('empresas').select('id,nome').eq('nome', 'Tridium Cosméticos').maybeSingle(), 'Não foi possível localizar a empresa Tridium');
    if (!empresa) throw new Error('A empresa Tridium Cosméticos não foi encontrada.');
    const catalogo = await falharSeErro(await db.from('vendas_mobile_catalogos').select('id').eq('empresa_id', empresa.id).eq('codigo', 'PRINCIPAL').maybeSingle(), 'Não foi possível localizar o catálogo principal');
    if (!catalogo) throw new Error('O catálogo principal da Tridium não foi encontrado.');

    const resumo = [];
    const credenciais = [];
    for (const representante of REPRESENTANTES) {
      const dadosRepresentante = tabelas.client_representatives.find((item) => String(item.id) === representante.legadoId);
      const plano = montarPlano(tabelas, representante);
      const conta = await garantirConta(db, representante, dadosRepresentante, executar, redefinirSenhaMarcos);
      await garantirAcessos(db, empresa.id, conta.userId, executar);
      const totais = await importarRepresentante(db, empresa.id, catalogo.id, tabelas, plano, conta.userId, executar);
      resumo.push({ nome: representante.nome, email: representante.email, user_id: conta.userId, ...totais });
      if (conta.senha) credenciais.push({ nome: representante.nome, email: representante.email, senha_temporaria: conta.senha });
    }
    console.log(JSON.stringify({ modo: executar ? 'executado' : 'simulacao', empresa: empresa.nome, resumo, credenciais }, null, 2));
  } finally {
    rmSync(diretorioTemporario, { recursive: true, force: true });
  }
}

principal().catch((erro) => {
  console.error(`ERRO: ${erro.message || erro}`);
  process.exit(1);
});
