(function () {
  const config = window.VENDAS_MOBILE_CONFIG || {};
  const sdk = window.supabase;
  const client = sdk && config.supabaseUrl && config.supabaseAnonKey
    ? sdk.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          storageKey: 'avantalab-vendas-mobile-auth',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
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
    if (!user) return { user: null, produtos: [], pacotes: [], clientes: [], vendas: [], pagamentos: [], conteudos: null, divulgacaoPastas: [], divulgacaoMateriais: [], moduloAtivo: true };

    const acessoVendas = await buscarAcessoVendas();
    if (!acessoVendas.acesso) {
      return { user, produtos: [], pacotes: [], clientes: [], vendas: [], pagamentos: [], conteudos: null, divulgacaoPastas: [], divulgacaoMateriais: [], moduloAtivo: true, ...acessoVendas };
    }

    const moduloRes = await requireClient().rpc('modulo_vendas_mobile_ativo_rpc', {
      p_empresa_id: acessoVendas.acesso.empresa_id,
    });
    if (moduloRes.error) throw moduloRes.error;
    const moduloAtivo = moduloRes.data === true;
    const vinculosRes = await requireClient().rpc('meus_vinculos_comerciais_vendas_mobile_rpc');
    if (vinculosRes.error) throw vinculosRes.error;
    const vinculosComerciais = vinculosRes.data || [];
    const vinculoAtivo = vinculosComerciais.find((vinculo) => vinculo.ativo) || null;
    let sincronizacaoCatalogo = { adicionados: 0, ja_recebidos: 0 };
    if (moduloAtivo) {
      const sincronizarRes = await requireClient().rpc('sincronizar_catalogo_vendas_mobile_rpc');
      if (sincronizarRes.error) throw sincronizarRes.error;
      sincronizacaoCatalogo = sincronizarRes.data || sincronizacaoCatalogo;
    }

    const [produtosRes, clientesRes, pedidosRes, pagamentosRes, conteudosRes, pastasRes, materiaisRes, integracaoRes] = await Promise.all([
      client.from('vendas_mobile_produtos').select('*').order('criado_em', { ascending: false }),
      client.from('vendas_mobile_clientes').select('*').order('nome'),
      client.from('vendas_mobile_pedidos').select('*, itens:vendas_mobile_pedido_itens(*)').order('criado_em', { ascending: false }),
      client.from('vendas_mobile_pagamentos').select('*').order('data_pagamento', { ascending: false }).order('criado_em', { ascending: false }),
      client.from('vendas_mobile_conteudos').select('id, empresa_id, pagina, tipo, titulo, descricao, criado_em').eq('ativo', true).order('criado_em', { ascending: false }),
      client.from('vendas_mobile_divulgacao_pastas').select('id, empresa_id, pasta_pai_id, nome, descricao, ordem, criado_em').eq('ativo', true).order('ordem').order('criado_em', { ascending: false }),
      client.from('vendas_mobile_divulgacao_materiais').select('id, pasta_id, titulo, tipo, arquivo_url, miniatura_url, miniatura_status, mime_type, tamanho_bytes, ordem, criado_em').eq('ativo', true).order('ordem').order('criado_em', { ascending: false }),
      client.rpc('obter_integracao_gestao_vendas_mobile_rpc'),
    ]);
    const error = produtosRes.error || clientesRes.error || pedidosRes.error || integracaoRes.error;
    if (error) throw error;

    const produtos = (produtosRes.data || []).map((produto) => ({
      ...produto,
      preco_custo: Number(Number(produto.preco_custo || 0) > 0 ? produto.preco_custo : produto.metadados?.preco_custo ?? 0),
      pacote_origem_id: produto.pacote_origem_id ?? produto.metadados?.pacote?.id ?? null,
    }));
    const pacotes = [...new Map(produtos
      .map((produto) => produto.metadados?.pacote)
      .filter((pacote) => pacote?.id)
      .map((pacote) => [pacote.id, pacote])).values()]
      .sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));

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
      sincronizacaoCatalogo,
      vinculosComerciais,
      vinculoComercialAtivo: vinculoAtivo,
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

  function itemBonificado(orderItem) {
    if (Object.prototype.hasOwnProperty.call(orderItem || {}, 'bonificado')) {
      const marcado = orderItem.bonificado;
      return marcado === true || marcado === 1 || ['true', '1', 'sim'].includes(String(marcado || '').trim().toLowerCase());
    }
    const quantidade = Number(orderItem?.quantidade || 1);
    const preco = Number(orderItem?.preco ?? orderItem?.preco_unitario ?? 0);
    return preco > 0 && Number(orderItem?.total || 0) === 0 && Number(orderItem?.desconto || 0) >= quantidade * preco;
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
      criado_em: order.criado_em || new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    const items = order.itens.map((item) => {
      const quantidade = Number(item.quantidade || 1);
      const preco = Number(item.preco ?? item.preco_unitario ?? 0);
      const bonificado = itemBonificado(item);
      return {
      pedido_id: pedido.id,
      produto_id: String(item.produto_id || '').startsWith('prod_') ? null : item.produto_id || null,
      produto_nome: item.produto_nome,
      produto_sku: item.produto_sku || null,
      quantidade,
      preco_unitario: preco,
      preco_custo: item.preco_custo == null ? null : Number(item.preco_custo),
      desconto: bonificado ? quantidade * preco : Number(item.desconto || 0),
      total: bonificado ? 0 : quantidade * preco - Number(item.desconto || 0),
    }; });
    const { data: savedItems, error: itemsError } = await client.from('vendas_mobile_pedido_itens').insert(items).select();
    if (itemsError) {
      await client.from('vendas_mobile_pedidos').delete().eq('id', pedido.id);
      throw itemsError;
    }
    return { ...pedido, itens: savedItems || [] };
  }

  async function updateOrder(order) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const { data: pedido, error } = await client.from('vendas_mobile_pedidos').update({
      cliente_id: order.cliente_id || null,
      status: order.status || 'concluida',
      subtotal: Number(order.subtotal || order.total || 0),
      desconto: Number(order.desconto || 0),
      total: Number(order.total || 0),
      forma_pagamento: order.forma_pagamento || null,
      observacoes: order.observacoes || null,
      criado_em: order.criado_em || new Date().toISOString(),
    }).eq('id', order.id).eq('user_id', user.id).select().single();
    if (error) throw error;
    const { error: deleteItemsError } = await client.from('vendas_mobile_pedido_itens').delete().eq('pedido_id', order.id);
    if (deleteItemsError) throw deleteItemsError;
    if (!order.itens.length) return { ...pedido, itens: [] };
    const items = order.itens.map((item) => {
      const quantidade = Number(item.quantidade || 1);
      const preco = Number(item.preco ?? item.preco_unitario ?? 0);
      const bonificado = itemBonificado(item);
      return {
        pedido_id: order.id,
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
    const { data: savedItems, error: itemsError } = await client.from('vendas_mobile_pedido_itens').insert(items).select();
    if (itemsError) throw itemsError;
    return { ...pedido, itens: savedItems || [] };
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
    let { data, error } = await client.from('vendas_mobile_pagamentos').insert(payload).select().single();
    if (error && /desconto|saldo_anterior|saldo_final|schema cache/i.test(String(error.message || ''))) {
      const legado = {
        user_id: payload.user_id,
        cliente_id: payload.cliente_id,
        tipo: payload.tipo,
        forma_pagamento: payload.forma_pagamento,
        valor: payload.valor,
        data_pagamento: payload.data_pagamento,
        observacoes: JSON.stringify({ avantalab_pagamento: true, desconto: payload.desconto, saldo_anterior: payload.saldo_anterior, saldo_final: payload.saldo_final }),
      };
      ({ data, error } = await client.from('vendas_mobile_pagamentos').insert(legado).select().single());
    }
    if (error) throw error;
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

  window.VendasDb = { client, currentUser, hasSession, getAccessToken, uploadProductImage, signIn, signInPhone, signInWithGoogle, resetPassword, updatePassword, updateUserMetadata, signUp, signOut, solicitarAcesso, buscarAcessoVendas, loadAll, saveProduct, deleteProduct, movimentarEstoque, listarMovimentosEstoque, createPackage, saveProductsBulk, deletePackage, saveClient, deleteClient, saveOrder, updateOrder, deleteOrder, savePayment, updatePayment, deletePayment, configurarIntegracaoGestao, atualizarRecursoVinculoComercial, resetarSistemaVendas, saveFeedback };
})();
