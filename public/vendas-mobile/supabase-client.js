(function () {
  const config = window.VENDAS_MOBILE_CONFIG || {};
  const sdk = window.supabase;
  const client = sdk && config.supabaseUrl && config.supabaseAnonKey
    ? sdk.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

  function requireClient() {
    if (!client) throw new Error('Supabase não configurado.');
    return client;
  }

  async function currentUser() {
    const { data, error } = await requireClient().auth.getUser();
    if (error) return null;
    return data.user || null;
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

  async function resetPassword(email, redirectTo) {
    const { error } = await requireClient().auth.resetPasswordForEmail(email, { redirectTo });
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
    if (!user) return { acesso: null, solicitacao: null };
    const [acessosRes, solicitacaoRes] = await Promise.all([
      requireClient().rpc('meus_acessos_vendas_mobile_rpc'),
      requireClient().from('vendas_mobile_solicitacoes_acesso').select('*').eq('user_id', user.id).order('atualizado_em', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (acessosRes.error) throw acessosRes.error;
    if (solicitacaoRes.error) throw solicitacaoRes.error;
    return {
      acesso: (acessosRes.data || []).find((item) => item.status === 'ativo') || null,
      solicitacao: solicitacaoRes.data || null,
    };
  }

  async function loadAll() {
    const user = await currentUser();
    if (!user) return { user: null, produtos: [], clientes: [], vendas: [] };

    const acessoVendas = await buscarAcessoVendas();
    if (!acessoVendas.acesso) {
      return { user, produtos: [], clientes: [], vendas: [], ...acessoVendas };
    }

    const [produtosRes, clientesRes, pedidosRes] = await Promise.all([
      client.from('vendas_mobile_produtos').select('*').order('criado_em', { ascending: false }),
      client.from('vendas_mobile_clientes').select('*').order('nome'),
      client.from('vendas_mobile_pedidos').select('*, itens:vendas_mobile_pedido_itens(*)').order('criado_em', { ascending: false }),
    ]);
    const error = produtosRes.error || clientesRes.error || pedidosRes.error;
    if (error) throw error;

    return {
      user,
      produtos: produtosRes.data || [],
      clientes: (clientesRes.data || []).map((c) => ({
        ...c,
        ...(c.endereco || {}),
      })),
      vendas: (pedidosRes.data || []).map((p) => ({ ...p, itens: p.itens || [] })),
      ...acessoVendas,
    };
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
      preco_promocional: product.preco_promocional ? Number(product.preco_promocional) : null,
      estoque: product.estoque === '' || product.estoque == null ? null : Number(product.estoque),
      unidade: product.unidade || 'un',
      imagem_url: product.imagem_url || null,
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

  async function saveClient(customer) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const payload = {
      user_id: user.id,
      nome: customer.nome,
      telefone: customer.telefone || null,
      email: customer.email || null,
      endereco: {
        endereco: customer.endereco || '', cidade: customer.cidade || '',
        estado: customer.estado || '', cep: customer.cep || '',
      },
      observacoes: customer.observacoes || null,
      ativo: customer.ativo !== false,
      atualizado_em: new Date().toISOString(),
    };
    const query = customer.id && !String(customer.id).startsWith('cli_')
      ? client.from('vendas_mobile_clientes').update(payload).eq('id', customer.id)
      : client.from('vendas_mobile_clientes').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return { ...data, ...(data.endereco || {}) };
  }

  async function deleteClient(id) {
    const { error } = await requireClient().from('vendas_mobile_clientes').delete().eq('id', id);
    if (error) throw error;
  }

  async function saveOrder(order) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const { data: pedido, error } = await client.from('vendas_mobile_pedidos').insert({
      user_id: user.id,
      cliente_id: order.cliente_id || null,
      status: order.status || 'concluida',
      subtotal: Number(order.subtotal || order.total || 0),
      desconto: Number(order.desconto || 0),
      total: Number(order.total || 0),
      forma_pagamento: order.forma_pagamento || null,
      observacoes: order.observacoes || null,
    }).select().single();
    if (error) throw error;
    const items = order.itens.map((item) => ({
      pedido_id: pedido.id,
      produto_id: String(item.produto_id || '').startsWith('prod_') ? null : item.produto_id || null,
      produto_nome: item.produto_nome,
      produto_sku: item.produto_sku || null,
      quantidade: Number(item.quantidade || 1),
      preco_unitario: Number(item.preco || item.preco_unitario || 0),
      desconto: Number(item.desconto || 0),
      total: Number(item.quantidade || 1) * Number(item.preco || item.preco_unitario || 0),
    }));
    const { data: savedItems, error: itemsError } = await client.from('vendas_mobile_pedido_itens').insert(items).select();
    if (itemsError) {
      await client.from('vendas_mobile_pedidos').delete().eq('id', pedido.id);
      throw itemsError;
    }
    return { ...pedido, itens: savedItems || [] };
  }

  window.VendasDb = { client, currentUser, signIn, signInPhone, resetPassword, signUp, signOut, solicitarAcesso, buscarAcessoVendas, loadAll, saveProduct, deleteProduct, saveClient, deleteClient, saveOrder };
})();
