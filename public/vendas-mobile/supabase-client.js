(function () {
  const config = window.VENDAS_MOBILE_CONFIG || {};
  const sdk = window.supabase;
  const legacyStorageKey = 'avantalab-vendas-mobile-auth';
  const projectRef = (() => {
    try { return new URL(config.supabaseUrl).hostname.split('.')[0]; } catch { return ''; }
  })();
  const sharedStorageKey = projectRef ? `sb-${projectRef}-auth-token` : legacyStorageKey;
  try {
    const legacySession = localStorage.getItem(legacyStorageKey);
    if (legacySession && !localStorage.getItem(sharedStorageKey)) localStorage.setItem(sharedStorageKey, legacySession);
    if (sharedStorageKey !== legacyStorageKey) localStorage.removeItem(legacyStorageKey);
  } catch { /* armazenamento indisponível */ }
  const client = sdk && config.supabaseUrl && config.supabaseAnonKey
    ? sdk.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          storageKey: sharedStorageKey,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

  function atualizarProgresso(grupo, concluido, total, rotulo) {
    if (typeof window.__avantalabAtualizarProgressoVendas === 'function') {
      window.__avantalabAtualizarProgressoVendas(grupo, concluido, total, rotulo);
    }
  }

  function requireClient() {
    if (!client) throw new Error('Supabase não configurado.');
    return client;
  }

  async function currentUser() {
    const { data, error } = await requireClient().auth.getUser();
    if (error) return null;
    return data.user || null;
  }

  async function hasSession() {
    const { data, error } = await requireClient().auth.getSession();
    if (error) return false;
    return Boolean(data.session);
  }

  async function getAccessToken() {
    const { data, error } = await requireClient().auth.getSession();
    if (error) throw error;
    return data.session?.access_token || '';
  }

  async function uploadProductImage(file, productId = null) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const identificador = String(productId || (crypto.randomUUID ? crypto.randomUUID() : Date.now())).replace(/[^a-zA-Z0-9_-]/g, '');
    const path = `${user.id}/${identificador}-${Date.now()}.webp`;
    const { error } = await requireClient().storage
      .from('vendas-produtos')
      .upload(path, file, { cacheControl: '31536000', contentType: 'image/webp', upsert: false });
    if (error) throw error;
    const { data } = requireClient().storage.from('vendas-produtos').getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('Não foi possível gerar o link da imagem.');
    return data.publicUrl;
  }

  async function signIn(email, password) {
    const { data, error } = await requireClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  async function signInPhone(phone, password) {
    const { data, error } = await requireClient().auth.signInWithPassword({ phone, password });
    if (error) throw error;
    return data.user;
  }

  async function signInWithGoogle(redirectTo) {
    const { error } = await requireClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  }

  async function resetPassword(email, redirectTo) {
    const { error } = await requireClient().auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async function updatePassword(password) {
    const { error } = await requireClient().auth.updateUser({ password });
    if (error) throw error;
  }

  async function updateUserMetadata(data) {
    const { error } = await requireClient().auth.updateUser({ data });
    if (error) throw error;
  }

  async function signUp({ email, password, nome, telefone }) {
    const { data, error } = await requireClient().auth.signUp({
      email,
      password,
      phone: telefone || undefined,
      options: { data: { nome } },
    });
    if (error) throw error;
    return data.user;
  }

  async function signOut() {
    const { error } = await requireClient().auth.signOut();
    if (error) throw error;
  }

  async function solicitarAcesso({ codigo, nome, telefone }) {
    const { data, error } = await requireClient().rpc('solicitar_acesso_vendas_mobile_rpc', {
      p_codigo_empresa: codigo,
      p_nome: nome,
      p_telefone: telefone || null,
    });
    if (error) throw error;
    return data;
  }

  async function buscarAcessoVendas() {
    const user = await currentUser();
    atualizarProgresso('access', 1, 4, 'Identificando seu acesso');
    if (!user) {
      atualizarProgresso('access', 4, 4, 'Sessão não encontrada');
      return { acesso: null, solicitacao: null };
    }
    // Para gestores, o próprio servidor cria/atualiza o acesso integrado das
    // empresas em que o módulo está instalado. Operadores não são afetados.
    const acessoGestorRes = await requireClient().rpc('garantir_acessos_gestor_vendas_mobile_rpc');
    if (acessoGestorRes.error) throw acessoGestorRes.error;
    atualizarProgresso('access', 2, 4, 'Conferindo permissões');
    const [acessosRes, solicitacaoRes] = await Promise.all([
      requireClient().rpc('meus_acessos_vendas_mobile_rpc'),
      requireClient().from('vendas_mobile_solicitacoes_acesso').select('*').eq('user_id', user.id).order('atualizado_em', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (acessosRes.error) throw acessosRes.error;
    if (solicitacaoRes.error) throw solicitacaoRes.error;
    atualizarProgresso('access', 3, 4, 'Validando módulos disponíveis');
    const acessosAtivos = (acessosRes.data || []).filter((item) => item.status === 'ativo');
    let empresaContexto = '';
    try {
      empresaContexto = JSON.parse(localStorage.getItem('avantalab_mobile_sistema_contexto') || 'null')?.empresaId || '';
    } catch { /* preferência inválida */ }
    const candidatos = [...acessosAtivos].sort((a, b) => Number(b.empresa_id === empresaContexto) - Number(a.empresa_id === empresaContexto));
    const modulos = await Promise.all(candidatos.map((item) => requireClient().rpc('modulo_vendas_mobile_ativo_rpc', {
      p_empresa_id: item.empresa_id,
    })));
    const perfisVendas = candidatos.filter((_, indice) => !modulos[indice].error && modulos[indice].data === true);
    atualizarProgresso('access', 4, 4, 'Acesso ao Vendas confirmado');
    const moduloAtivo = perfisVendas.length > 0;
    let vindoDaGestao = false;
    let perfilSelecionadoId = '';
    try {
      vindoDaGestao = sessionStorage.getItem('avantalab_vendas_entrada_gestao') === '1';
      perfilSelecionadoId = sessionStorage.getItem('avantalab_vendas_perfil_ativo') || '';
    } catch { /* armazenamento indisponível */ }
    let acesso = null;
    if (perfisVendas.length === 1) acesso = perfisVendas[0];
    else if (perfisVendas.length > 1 && !vindoDaGestao) {
      acesso = perfisVendas.find((item) => item.empresa_id === perfilSelecionadoId)
        || perfisVendas.find((item) => item.empresa_id === empresaContexto)
        || perfisVendas[0];
    } else if (!perfisVendas.length) acesso = candidatos[0] || null;
    if (acesso && acesso.empresa_id !== empresaContexto) {
      try {
        localStorage.setItem('avantalab_mobile_sistema_contexto', JSON.stringify({
          empresaId: acesso.empresa_id,
          sistema: 'vendas',
          atualizadoEm: new Date().toISOString(),
        }));
      } catch { /* contexto local indisponível */ }
    }
    return {
      acesso,
      moduloAtivo,
      perfisVendas,
      solicitacao: solicitacaoRes.data || null,
    };
  }

  async function listarCatalogoVendas() {
    const { data, error } = await requireClient().from('vendas_mobile_produtos').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    const produtos = (data || []).map((produto) => ({
      ...produto,
      preco_custo: Number(Number(produto.preco_custo || 0) > 0 ? produto.preco_custo : produto.metadados?.preco_custo ?? 0),
      pacote_origem_id: produto.pacote_origem_id ?? produto.metadados?.pacote?.id ?? null,
    }));
    const pacotes = [...new Map(produtos
      .map((produto) => produto.metadados?.pacote)
      .filter((pacote) => pacote?.id)
      .map((pacote) => [pacote.id, pacote])).values()]
      .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
    return { produtos, pacotes };
  }

  async function sincronizarCatalogoVendas() {
    const { data, error } = await requireClient().rpc('sincronizar_catalogo_vendas_mobile_rpc');
    if (error) throw error;
    return data || { adicionados: 0, ja_recebidos: 0 };
  }

  async function loadAll(contextoPreparado = null) {
    const user = contextoPreparado?.user || await currentUser();
    if (!user) return { user: null, produtos: [], pacotes: [], clientes: [], vendas: [], pagamentos: [], conteudos: null, divulgacaoPastas: [], divulgacaoMateriais: [], moduloAtivo: true };

    const acessoVendas = contextoPreparado?.acessoVendas || await buscarAcessoVendas();
    if (!acessoVendas.acesso) {
      atualizarProgresso('data', 1, 1, 'Aguardando escolha do perfil');
      return { user, produtos: [], pacotes: [], clientes: [], vendas: [], pagamentos: [], conteudos: null, divulgacaoPastas: [], divulgacaoMateriais: [], moduloAtivo: true, ...acessoVendas };
    }

    const totalEtapasDados = 11;
    let etapasDadosConcluidas = 0;
    const acompanharEtapaDados = (promessa, rotulo) => Promise.resolve(promessa).then(
      (resultado) => {
        etapasDadosConcluidas += 1;
        atualizarProgresso('data', etapasDadosConcluidas, totalEtapasDados, rotulo);
        return resultado;
      },
      (erro) => {
        etapasDadosConcluidas += 1;
        atualizarProgresso('data', etapasDadosConcluidas, totalEtapasDados, rotulo);
        throw erro;
      },
    );

    const moduloAtivo = acessoVendas.moduloAtivo === true;
    const [vinculosRes, perfisFinanceirosRes] = await Promise.all([
      acompanharEtapaDados(requireClient().rpc('meus_vinculos_comerciais_vendas_mobile_rpc'), 'Carregando vínculos comerciais'),
      acompanharEtapaDados(requireClient().rpc('meus_perfis_financeiros_vendas_mobile_rpc'), 'Carregando perfis financeiros'),
    ]);
    if (vinculosRes.error) throw vinculosRes.error;
    if (perfisFinanceirosRes.error) throw perfisFinanceirosRes.error;
    const vinculosComerciais = vinculosRes.data || [];
    const vinculoAtivo = vinculosComerciais.find((vinculo) => vinculo.ativo) || null;
    const [catalogoRes, clientesRes, pedidosRes, pagamentosRes, conteudosRes, pastasRes, materiaisRes, integracaoRes] = await Promise.all([
      acompanharEtapaDados(listarCatalogoVendas(), 'Carregando produtos'),
      acompanharEtapaDados(client.from('vendas_mobile_clientes').select('*').order('nome'), 'Carregando clientes'),
      acompanharEtapaDados(client.from('vendas_mobile_pedidos').select('*, itens:vendas_mobile_pedido_itens(*)').order('criado_em', { ascending: false }), 'Carregando pedidos'),
      acompanharEtapaDados(client.from('vendas_mobile_pagamentos').select('*').order('data_pagamento', { ascending: false }).order('criado_em', { ascending: false }), 'Carregando pagamentos'),
      acompanharEtapaDados(client.from('vendas_mobile_conteudos').select('id, empresa_id, pagina, tipo, titulo, descricao, criado_em').eq('ativo', true).order('criado_em', { ascending: false }), 'Carregando novidades'),
      acompanharEtapaDados(client.from('vendas_mobile_divulgacao_pastas').select('id, empresa_id, pasta_pai_id, nome, descricao, ordem, criado_em').eq('ativo', true).order('ordem').order('criado_em', { ascending: false }), 'Carregando pastas de divulgação'),
      acompanharEtapaDados(client.from('vendas_mobile_divulgacao_materiais').select('id, pasta_id, titulo, tipo, arquivo_url, miniatura_url, miniatura_status, mime_type, tamanho_bytes, ordem, criado_em').eq('ativo', true).order('ordem').order('criado_em', { ascending: false }), 'Carregando materiais'),
      acompanharEtapaDados(client.rpc('obter_integracao_gestao_vendas_mobile_rpc'), 'Carregando integração financeira'),
    ]);
    const error = clientesRes.error || pedidosRes.error || pagamentosRes.error || integracaoRes.error;
    if (error) throw error;

    const produtos = catalogoRes.produtos;
    const pacotes = catalogoRes.pacotes;
    etapasDadosConcluidas += 1;
    atualizarProgresso('data', etapasDadosConcluidas, totalEtapasDados, 'Organizando seus dados');

    return {
      user,
      produtos,
      pacotes,
      clientes: (clientesRes.data || []).map((c) => ({
        ...c,
        ...(c.endereco || {}),
      })),
      vendas: (pedidosRes.data || []).map((p) => ({ ...p, itens: p.itens || [] })),
      pagamentos: (pagamentosRes.data || []).map((pagamento) => {
        let legado = {};
        try {
          const observacoes = JSON.parse(pagamento.observacoes || '{}');
          if (observacoes?.avantalab_pagamento) legado = observacoes;
        } catch { /* observação comum, sem metadados financeiros */ }
        return {
          ...pagamento,
          desconto: Number(pagamento.desconto ?? legado.desconto ?? 0),
          saldo_anterior: Number(pagamento.saldo_anterior ?? legado.saldo_anterior ?? 0),
          saldo_final: Number(pagamento.saldo_final ?? legado.saldo_final ?? 0),
        };
      }),
      integracaoGestao: integracaoRes.data || { base_receita: 'recebidos', pode_configurar: false },
      conteudos: conteudosRes.error ? null : (conteudosRes.data || []).filter((conteudo) => conteudo.pagina === 'informacoes' || vinculosComerciais.some((vinculo) => vinculo.empresa_id === conteudo.empresa_id && vinculo.novidades_ativas)),
      divulgacaoPastas: pastasRes.error ? [] : (pastasRes.data || []).filter((pasta) => vinculosComerciais.some((vinculo) => vinculo.empresa_id === pasta.empresa_id && vinculo.divulgacao_ativa)),
      divulgacaoMateriais: materiaisRes.error ? [] : (materiaisRes.data || []),
      moduloAtivo,
      sincronizacaoCatalogo: { adicionados: 0, ja_recebidos: 0 },
      vinculosComerciais,
      vinculoComercialAtivo: vinculoAtivo,
      perfisFinanceiros: perfisFinanceirosRes.data || [],
      ...acessoVendas,
    };
  }

  async function listarPerfisGestaoParaTroca() {
    const { data, error } = await requireClient().rpc('meus_perfis_gestao_para_troca_rpc');
    if (error) throw error;
    return data || [];
  }

  async function saveProduct(product) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const payload = {
      user_id: user.id,
      marca: product.marca || null,
      categoria: product.categoria || null,
      sku: product.sku || null,
      nome: product.nome,
      descricao: product.descricao || null,
      preco: Number(product.preco || 0),
      preco_custo: Number(product.preco_custo || 0),
      estoque: product.estoque === '' || product.estoque == null ? null : Number(product.estoque),
      unidade: product.unidade || 'un',
      imagem_url: product.imagem_url || null,
      estoque_controlado: product.estoque_controlado === true,
      metadados: {
        ...(product.metadados || {}),
        preco_custo: Number(product.preco_custo || 0),
        ...(product.pacote ? { pacote: product.pacote } : {}),
      },
      ativo: product.ativo !== false,
      atualizado_em: new Date().toISOString(),
    };
    const query = product.id && !String(product.id).startsWith('prod_')
      ? client.from('vendas_mobile_produtos').update(payload).eq('id', product.id)
      : client.from('vendas_mobile_produtos').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async function deleteProduct(id) {
    const { error } = await requireClient().from('vendas_mobile_produtos').delete().eq('id', id);
    if (error) throw error;
  }

  async function movimentarEstoque({ produtoId, tipo, quantidade, observacao = '' }) {
    const { data, error } = await requireClient().rpc('movimentar_estoque_vendas_mobile_rpc', {
      p_produto_id: produtoId,
      p_tipo: tipo,
      p_quantidade: Number(quantidade),
      p_observacao: observacao || null,
    });
    if (error) throw error;
    return data;
  }

  async function listarMovimentosEstoque(produtoId) {
    const { data, error } = await requireClient().from('vendas_mobile_estoque_movimentos')
      .select('id,tipo,quantidade,saldo_anterior,saldo_final,observacao,criado_em')
      .eq('produto_id', produtoId).order('criado_em', { ascending: false }).limit(40);
    if (error) throw error;
    return data || [];
  }

  async function createPackage({ nome, numero, origem = 'excel', empresaId = null }) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    return {
      id: `pacote_${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`}`,
      nome, numero, origem, empresa_id: empresaId || null, criado_em: new Date().toISOString(),
    };
  }

  async function saveProductsBulk(products, pacote = null) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const payload = products.map((product) => ({
      user_id: user.id,
      marca: product.marca || null,
      categoria: product.categoria || null,
      sku: product.sku || null,
      nome: product.nome,
      descricao: product.descricao || null,
      preco: Number(product.preco || 0),
      preco_custo: Number(product.preco_custo || 0),
      estoque: product.estoque === '' || product.estoque == null ? null : Number(product.estoque),
      unidade: product.unidade || 'un',
      imagem_url: product.imagem_url || null,
      metadados: { ...(product.metadados || {}), preco_custo: Number(product.preco_custo || 0), ...(pacote ? { pacote } : {}) },
      ativo: product.ativo !== false,
    }));
    const { data, error } = await client.from('vendas_mobile_produtos').insert(payload).select();
    if (error) throw error;
    return data || [];
  }

  async function deletePackage(id) {
    const { error } = await requireClient().from('vendas_mobile_produtos').delete().contains('metadados', { pacote: { id } });
    if (error) throw error;
  }

  async function saveClient(customer) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const payload = {
      id: customer.id,
      user_id: user.id,
      nome: customer.nome,
      telefone: customer.telefone || null,
      email: customer.email || null,
      data_nascimento: customer.data_nascimento || null,
      endereco: {
        endereco: customer.endereco || '', cidade: customer.cidade || '',
        estado: customer.estado || '', cep: customer.cep || '', numero: customer.numero || '', complemento: customer.complemento || '',
      },
      observacoes: customer.observacoes || null,
      ativo: customer.ativo !== false,
      atualizado_em: new Date().toISOString(),
    };
    const { data, error } = await client
      .from('vendas_mobile_clientes')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error('Os dados do cliente não foram confirmados pelo servidor.');
    return { ...data, ...(data.endereco || {}) };
  }

  async function deleteClient(id) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const { error } = await requireClient().from('vendas_mobile_clientes').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
  }

  function itemBonificado(orderItem) {
    if (Object.prototype.hasOwnProperty.call(orderItem || {}, 'bonificado')) {
      const marcado = orderItem.bonificado;
      return marcado === true || marcado === 1 || ['true', '1', 'sim'].includes(String(marcado || '').trim().toLowerCase());
    }
    const quantidade = Number(orderItem?.quantidade || 1);
    const preco = Number(orderItem?.preco ?? orderItem?.preco_unitario ?? 0);
    return preco > 0 && Number(orderItem?.total || 0) === 0 && Number(orderItem?.desconto || 0) >= quantidade * preco;
  }

  function pedidoParaPersistencia(order, incluirId = false) {
    const pedido = {
      cliente_id: order.cliente_id || null,
      status: order.status || 'concluida',
      subtotal: Number(order.subtotal || order.total || 0),
      desconto: Number(order.desconto || 0),
      total: Number(order.total || 0),
      forma_pagamento: order.forma_pagamento || null,
      observacoes: order.observacoes || null,
      criado_em: order.criado_em || new Date().toISOString(),
    };
    if (order.id) pedido.id = order.id;
    const itens = order.itens.map((item) => {
      const quantidade = Number(item.quantidade || 1);
      const preco = Number(item.preco ?? item.preco_unitario ?? 0);
      const bonificado = itemBonificado(item);
      return {
        produto_id: String(item.produto_id || '').startsWith('prod_') ? null : item.produto_id || null,
        produto_nome: item.produto_nome,
        produto_sku: item.produto_sku || null,
        quantidade,
        preco_unitario: preco,
        preco_custo: item.preco_custo == null ? null : Number(item.preco_custo),
        desconto: bonificado ? quantidade * preco : Number(item.desconto || 0),
        total: bonificado ? 0 : quantidade * preco - Number(item.desconto || 0),
      };
    });
    return { pedido, itens };
  }

  async function persistOrder(order, incluirId = false) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const payload = pedidoParaPersistencia(order, incluirId);
    const { data, error } = await client.rpc('salvar_pedido_vendas_mobile_rpc', {
      p_pedido: payload.pedido,
      p_itens: payload.itens,
      p_novo: !incluirId,
    });
    if (error) throw error;
    if (!data?.id || !Array.isArray(data.itens)) throw new Error('O pedido não foi confirmado integralmente pelo servidor.');
    return data;
  }

  async function saveOrder(order) {
    return persistOrder(order, false);
  }

  async function updateOrder(order) {
    return persistOrder(order, true);
  }

  async function deleteOrder(id) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const { error } = await client.from('vendas_mobile_pedidos').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
  }

  async function savePayment(payment) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const payload = {
      id: payment.id,
      user_id: user.id,
      cliente_id: payment.cliente_id || null,
      tipo: 'pagamento',
      forma_pagamento: payment.forma_pagamento || 'Pix',
      valor: Number(payment.valor || 0),
      desconto: Number(payment.desconto || 0),
      saldo_anterior: Number(payment.saldo_anterior || 0),
      saldo_final: Number(payment.saldo_final || 0),
      observacoes: payment.observacoes || null,
      data_pagamento: payment.data_pagamento,
    };
    let { data, error } = await client.from('vendas_mobile_pagamentos').upsert(payload, { onConflict: 'id' }).select().single();
    if (error && /desconto|saldo_anterior|saldo_final|schema cache/i.test(String(error.message || ''))) {
      const legado = {
        id: payload.id,
        user_id: payload.user_id,
        cliente_id: payload.cliente_id,
        tipo: payload.tipo,
        forma_pagamento: payload.forma_pagamento,
        valor: payload.valor,
        data_pagamento: payload.data_pagamento,
        observacoes: JSON.stringify({ avantalab_pagamento: true, desconto: payload.desconto, saldo_anterior: payload.saldo_anterior, saldo_final: payload.saldo_final }),
      };
      ({ data, error } = await client.from('vendas_mobile_pagamentos').upsert(legado, { onConflict: 'id' }).select().single());
    }
    if (error) throw error;
    if (!data?.id) throw new Error('O pagamento não foi confirmado pelo servidor.');
    return { ...data, desconto: payload.desconto, saldo_anterior: payload.saldo_anterior, saldo_final: payload.saldo_final };
  }

  async function updatePayment(payment) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const payload = {
      forma_pagamento: payment.forma_pagamento || 'Pix',
      valor: Number(payment.valor || 0),
      desconto: Number(payment.desconto || 0),
      saldo_anterior: Number(payment.saldo_anterior || 0),
      saldo_final: Number(payment.saldo_final || 0),
      observacoes: payment.observacoes || null,
      data_pagamento: payment.data_pagamento,
    };
    let { data, error } = await client
      .from('vendas_mobile_pagamentos')
      .update(payload)
      .eq('id', payment.id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error && /desconto|saldo_anterior|saldo_final|schema cache/i.test(String(error.message || ''))) {
      const legado = {
        forma_pagamento: payload.forma_pagamento,
        valor: payload.valor,
        data_pagamento: payload.data_pagamento,
        observacoes: JSON.stringify({
          avantalab_pagamento: true,
          desconto: payload.desconto,
          saldo_anterior: payload.saldo_anterior,
          saldo_final: payload.saldo_final,
        }),
      };
      ({ data, error } = await client
        .from('vendas_mobile_pagamentos')
        .update(legado)
        .eq('id', payment.id)
        .eq('user_id', user.id)
        .select()
        .single());
    }
    if (error) throw error;
    if (!data?.id) throw new Error('A alteração do pagamento não foi confirmada pelo servidor.');
    return { ...payment, ...data, desconto: payload.desconto, saldo_anterior: payload.saldo_anterior, saldo_final: payload.saldo_final };
  }

  async function deletePayment(id) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const { error } = await client
      .from('vendas_mobile_pagamentos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
  }

  async function configurarIntegracaoGestao(baseReceita) {
    const { data, error } = await requireClient().rpc('configurar_integracao_gestao_vendas_mobile_rpc', {
      p_base_receita: baseReceita,
    });
    if (error) throw error;
    return data;
  }

  async function atualizarRecursoVinculoComercial(empresaId, recurso, ativo, removerCatalogo = false) {
    const { data, error } = await requireClient().rpc('atualizar_recurso_vinculo_comercial_vendas_mobile_rpc', {
      p_empresa_id: empresaId, p_recurso: recurso, p_ativo: ativo, p_remover_catalogo: removerCatalogo,
    });
    if (error) throw error;
    return data || [];
  }

  async function resetarSistemaVendas() {
    const { data, error } = await requireClient().rpc('resetar_vendas_mobile_rpc', { p_confirmacao: 'RESETAR' });
    if (error) throw error;
    return data;
  }

  async function definirPerfilFinanceiro(empresaId) {
    const { data, error } = await requireClient().rpc('definir_perfil_financeiro_vendas_mobile_rpc', { p_empresa_id: empresaId });
    if (error) throw error;
    return data;
  }

  async function saveFeedback({ empresaId, nomeEmpresa, mensagem }) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const nomeUsuario = user.user_metadata?.nome
      || user.user_metadata?.full_name
      || user.user_metadata?.name
      || user.email
      || null;
    const { data, error } = await client
      .from('feedbacks')
      .insert({
        empresa_id: empresaId,
        usuario_id: user.id,
        acesso_id: null,
        nome_empresa: nomeEmpresa || null,
        nome_usuario: nomeUsuario,
        email_usuario: user.email || null,
        tipo: 'sugestao',
        mensagem: `[App Vendas]\n${mensagem}`,
        status: 'novo',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  window.VendasDb = { client, currentUser, hasSession, getAccessToken, uploadProductImage, signIn, signInPhone, signInWithGoogle, resetPassword, updatePassword, updateUserMetadata, signUp, signOut, solicitarAcesso, buscarAcessoVendas, loadAll, listarCatalogoVendas, sincronizarCatalogoVendas, listarPerfisGestaoParaTroca, saveProduct, deleteProduct, movimentarEstoque, listarMovimentosEstoque, createPackage, saveProductsBulk, deletePackage, saveClient, deleteClient, saveOrder, updateOrder, deleteOrder, savePayment, updatePayment, deletePayment, configurarIntegracaoGestao, atualizarRecursoVinculoComercial, resetarSistemaVendas, definirPerfilFinanceiro, saveFeedback };
})();
