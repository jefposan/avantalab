(function () {
  const config = window.VENDAS_MOBILE_CONFIG || {};
  const sdk = window.supabase;
  // O Vendas compartilha a identidade AvantaLab no servidor, mas mantém sua
  // própria sessão neste aparelho. O Gestão usa outra chave e não autentica o
  // Vendas silenciosamente ao abrir ou trocar de aplicativo.
  const vendasStorageKey = 'avantalab-vendas-mobile-auth';
  const contaAtivaStorageKey = 'avantalab.vendas_mobile.conta_ativa.v1';
  const client = sdk && config.supabaseUrl && config.supabaseAnonKey
    ? sdk.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          storageKey: vendasStorageKey,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
  let canalAtualizacoesVinculo = null;
  let usuarioCanalAtualizacoesVinculo = '';

  function contaAtivaId() { try { return localStorage.getItem(contaAtivaStorageKey) || ''; } catch { return ''; } }
  function definirContaAtiva(contaId) { try { contaId ? localStorage.setItem(contaAtivaStorageKey, contaId) : localStorage.removeItem(contaAtivaStorageKey); } catch { /* armazenamento indisponível */ } }
  async function listarContasVendas() {
    const { data, error } = await requireClient().rpc('minhas_contas_vendas_mobile_rpc');
    if (error) throw error;
    return data || [];
  }
  async function criarContaVendas(nome, empresaId = null) {
    const { data, error } = await requireClient().rpc('criar_conta_vendas_mobile_rpc', { p_nome: nome, p_empresa_id: empresaId || null });
    if (error) throw error;
    return data;
  }
  async function garantirContaVendas() {
    const { data, error } = await requireClient().rpc('garantir_conta_vendas_mobile_rpc');
    if (error) throw error;
    if (!data?.id) throw new Error('Não foi possível preparar sua conta de vendas.');
    return data;
  }
  async function adicionarUsuarioContaVendas(contaId, email, papel) {
    const { data, error } = await requireClient().rpc('adicionar_usuario_conta_vendas_mobile_rpc', { p_conta_id: contaId, p_email: email, p_papel: papel });
    if (error) throw error;
    return data;
  }

  function atualizarProgresso(grupo, concluido, total, rotulo) {
    if (typeof window.__avantalabAtualizarProgressoVendas === 'function') {
      window.__avantalabAtualizarProgressoVendas(grupo, concluido, total, rotulo);
    }
  }

  function requireClient() {
    if (!client) throw new Error('Supabase não configurado.');
    return client;
  }

  const TAMANHO_PAGINA_SUPABASE = 1000;

  async function carregarTodasPaginas(criarConsulta) {
    const registros = [];
    for (let inicio = 0; ; inicio += TAMANHO_PAGINA_SUPABASE) {
      const { data, error } = await criarConsulta().range(inicio, inicio + TAMANHO_PAGINA_SUPABASE - 1);
      if (error) return { data: null, error };
      const pagina = data || [];
      registros.push(...pagina);
      if (pagina.length < TAMANHO_PAGINA_SUPABASE) break;
    }
    return { data: registros, error: null };
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

  async function verificarPremiumVendas(empresaId) {
    if (!empresaId) return { bloqueado: false, estado: null };
    try {
      const token = await getAccessToken();
      if (!token) return { bloqueado: false, estado: null };
      const resposta = await fetch(`/api/cobranca/estado?empresaId=${encodeURIComponent(empresaId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!resposta.ok) return { bloqueado: false, estado: null };
      const json = await resposta.json();
      return {
        bloqueado: json.precisaUpgradeVendas === true,
        estado: json.estado || null,
      };
    } catch (error) {
      console.warn('Não foi possível confirmar o Premium do Vendas; acesso preservado por segurança.', error);
      return { bloqueado: false, estado: null };
    }
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

  async function signInWithApple(redirectTo) {
    const { error } = await requireClient().auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo },
    });
    if (error) throw error;
  }

  async function iniciarOAuthNativo(provider, redirectTo) {
    if (provider !== 'google' && provider !== 'apple') throw new Error('Provedor de acesso inválido.');
    const { data, error } = await requireClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Não foi possível abrir o login social.');
    return data.url;
  }

  async function exchangeCodeForSession(code) {
    const { data, error } = await requireClient().auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (!data?.session) throw new Error('O provedor não retornou uma sessão válida.');
    return data.session;
  }

  async function setSession(accessToken, refreshToken) {
    const { data, error } = await requireClient().auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    if (!data?.session) throw new Error('Não foi possível restaurar a sessão social.');
    return data.session;
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

  function retornoCadastroVendas() {
    const retorno = new URL('/avantavendas', window.location.origin);
    if (window.location.hostname === 'vendas.avantalab.com.br') retorno.pathname = '/';
    return retorno.toString();
  }

  async function signUp({ email, password, nome, telefone }) {
    const { data, error } = await requireClient().auth.signUp({
      email,
      password,
      phone: telefone || undefined,
      options: {
        data: { nome },
        emailRedirectTo: retornoCadastroVendas(),
      },
    });
    if (error) throw error;
    return data.user;
  }

  async function signOut() {
    await cancelarAtualizacoesVinculo();
    // Revoga somente a sessão armazenada pelo AvantaVendas neste aparelho.
    // O mesmo usuário pode manter uma sessão independente no Gestão.
    const { error } = await requireClient().auth.signOut({ scope: 'local' });
    if (error) throw error;
  }

  async function cancelarAtualizacoesVinculo() {
    if (canalAtualizacoesVinculo && client) {
      await client.removeChannel(canalAtualizacoesVinculo).catch(() => undefined);
    }
    canalAtualizacoesVinculo = null;
    usuarioCanalAtualizacoesVinculo = '';
  }

  async function assinarAtualizacoesVinculo(aoAtualizar) {
    const user = await currentUser();
    if (!user || typeof aoAtualizar !== 'function') {
      await cancelarAtualizacoesVinculo();
      return false;
    }
    if (canalAtualizacoesVinculo && usuarioCanalAtualizacoesVinculo === user.id) return true;
    await cancelarAtualizacoesVinculo();
    usuarioCanalAtualizacoesVinculo = user.id;
    canalAtualizacoesVinculo = requireClient()
      .channel(`vendas-vinculo-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'vendas_mobile_solicitacoes_acesso', filter: `user_id=eq.${user.id}`,
      }, aoAtualizar)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'vendas_mobile_acessos', filter: `user_id=eq.${user.id}`,
      }, aoAtualizar)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'vendas_mobile_vinculos_comerciais', filter: `user_id=eq.${user.id}`,
      }, aoAtualizar)
      .subscribe();
    return true;
  }

  async function solicitarAcesso({ codigo, nome, telefone }) {
    const { data, error } = await requireClient().rpc('solicitar_acesso_vendas_mobile_rpc', {
      p_codigo_empresa: codigo,
      p_nome: nome,
      p_telefone: telefone || null,
      p_conta_id: contaAtivaId() || null,
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
    const [acessosRes, solicitacaoRes, vinculosRes] = await Promise.all([
      requireClient().rpc('meus_acessos_vendas_mobile_rpc'),
      requireClient().from('vendas_mobile_solicitacoes_acesso').select('*').eq('user_id', user.id).order('atualizado_em', { ascending: false }).limit(1).maybeSingle(),
      requireClient().rpc('meus_vinculos_comerciais_vendas_mobile_rpc'),
    ]);
    if (acessosRes.error) throw acessosRes.error;
    if (solicitacaoRes.error) throw solicitacaoRes.error;
    atualizarProgresso('access', 3, 4, 'Validando módulos disponíveis');
    const acessosAtivos = (acessosRes.data || []).filter((item) => item.status === 'ativo');
    let empresaContexto = '';
    try {
      empresaContexto = JSON.parse(localStorage.getItem('avantalab_mobile_sistema_contexto') || 'null')?.empresaId || '';
    } catch { /* preferência inválida */ }
    const contasDisponiveis = await listarContasVendas().catch(() => []);
    const contaContexto = contasDisponiveis.find((conta) => conta.id === contaAtivaId()) || contasDisponiveis[0] || null;
    const empresaContaAtiva = contaContexto?.empresa_id || '';
    const contaIndependenteAtiva = Boolean(contaContexto && !contaContexto.empresa_id);
    const candidatos = [...acessosAtivos].sort((a, b) =>
      Number(b.empresa_id === empresaContaAtiva) - Number(a.empresa_id === empresaContaAtiva)
      || Number(b.empresa_id === empresaContexto) - Number(a.empresa_id === empresaContexto));
    const modulos = await Promise.all(candidatos.map((item) => requireClient().rpc('modulo_vendas_mobile_ativo_rpc', {
      p_empresa_id: item.empresa_id,
    })));
    const acessosComModulo = candidatos.filter((_, indice) => !modulos[indice].error && modulos[indice].data === true);
    atualizarProgresso('access', 4, 4, 'Acesso ao Vendas confirmado');
    const moduloAtivo = acessosComModulo.length > 0;
    const vinculoComercialAtivoId = (vinculosRes.data || []).find((item) => item.ativo)?.empresa_id || '';
    // A conta ativa define o contexto comercial. Um perfil independente nao
    // herda assinatura nem catalogo de outro perfil do mesmo login.
    const acessoBase = contaIndependenteAtiva ? null : (
      acessosComModulo.find((item) => item.empresa_id === empresaContaAtiva)
      || acessosComModulo.find((item) => item.empresa_id === vinculoComercialAtivoId)
      || acessosComModulo.find((item) => item.empresa_id === empresaContexto)
      || acessosComModulo[0]
      || null
    );
    const acesso = acessoBase
      ? { ...acessoBase, papel: candidatos.some((item) => item.papel === 'gestor') ? 'gestor' : acessoBase.papel }
      : {
          empresa_id: null,
          empresa_nome: 'Conta independente',
          papel: 'vendedor',
          status: 'ativo',
          autonomo: true,
        };
    const premium = acessoBase
      ? await verificarPremiumVendas(acesso.empresa_id)
      : { bloqueado: false, estado: null };
    return {
      acesso,
      moduloAtivo: acessoBase ? moduloAtivo : true,
      premiumBloqueado: premium.bloqueado,
      estadoAssinatura: premium.estado,
      solicitacao: solicitacaoRes.data || null,
    };
  }

  async function listarCatalogoVendas() {
    const contaId = contaAtivaId();
    if (!contaId) return { produtos: [], pacotes: [] };
    const { data, error } = await carregarTodasPaginas(() => requireClient()
      .from('vendas_mobile_produtos')
      .select('*')
      .eq('conta_id', contaId)
      .order('criado_em', { ascending: false })
      .order('id', { ascending: false }));
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
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const { data, error } = await requireClient().rpc('sincronizar_catalogo_vendas_mobile_rpc', { p_conta_id: contaId });
    if (error) throw error;
    return data || { adicionados: 0, ja_recebidos: 0, sem_preco: 0 };
  }

  async function salvarPreferencias(preferencias, versao = 1) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const { data, error } = await requireClient()
      .from('vendas_mobile_contas_preferencias')
      .upsert({
        conta_id: contaId,
        versao: Math.max(1, Number(versao) || 1),
        preferencias: preferencias && typeof preferencias === 'object' ? preferencias : {},
        atualizado_por: user.id,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'conta_id' })
      .select('versao, preferencias, atualizado_em')
      .single();
    if (error) throw error;
    return data;
  }

  function normalizarPagamentoServidor(pagamento) {
    let legado = {};
    try {
      const observacoes = JSON.parse(pagamento.observacoes || '{}');
      if (observacoes?.avantalab_pagamento) legado = observacoes;
    } catch { /* observação comum, sem metadados financeiros */ }
    const resumoDiretoConfirmado = pagamento.saldo_anterior != null && pagamento.saldo_final != null;
    const resumoLegadoConfirmado = legado.saldo_anterior != null && legado.saldo_final != null;
    return {
      ...pagamento,
      desconto: Number(pagamento.desconto ?? legado.desconto ?? 0),
      saldo_anterior: Number(pagamento.saldo_anterior ?? legado.saldo_anterior ?? 0),
      saldo_final: Number(pagamento.saldo_final ?? legado.saldo_final ?? 0),
      comprovante_financeiro_confirmado: resumoDiretoConfirmado || resumoLegadoConfirmado,
    };
  }

  async function carregarDivulgacao() {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const [vinculosRes, pastasRes, materiaisRes] = await Promise.all([
      requireClient().rpc('meus_vinculos_comerciais_vendas_mobile_rpc', { p_conta_id: contaAtivaId() }),
      requireClient()
        .from('vendas_mobile_divulgacao_pastas')
        .select('id, empresa_id, pasta_pai_id, capa_material_id, capa_arquivo_url, nome, descricao, ordem, criado_em')
        .eq('ativo', true)
        .order('ordem')
        .order('criado_em', { ascending: false }),
      requireClient()
        .from('vendas_mobile_divulgacao_materiais')
        .select('id, pasta_id, titulo, tipo, arquivo_url, miniatura_url, miniatura_status, mime_type, tamanho_bytes, ordem, criado_em')
        .eq('ativo', true)
        .order('ordem')
        .order('criado_em', { ascending: false }),
    ]);
    const error = vinculosRes.error || pastasRes.error || materiaisRes.error;
    if (error) throw error;
    const empresasComDivulgacao = new Set((vinculosRes.data || [])
      .filter((vinculo) => vinculo.divulgacao_ativa)
      .map((vinculo) => vinculo.empresa_id));
    const pastas = (pastasRes.data || []).filter((pasta) => empresasComDivulgacao.has(pasta.empresa_id));
    const pastasPermitidas = new Set(pastas.map((pasta) => pasta.id));
    return {
      divulgacaoPastas: pastas,
      divulgacaoMateriais: (materiaisRes.data || []).filter((material) => pastasPermitidas.has(material.pasta_id)),
    };
  }

  async function loadAll(contextoPreparado = null) {
    const user = contextoPreparado?.user || await currentUser();
    if (!user) return { user: null, produtos: [], pacotes: [], clientes: [], vendas: [], pagamentos: [], conteudos: null, divulgacaoPastas: [], divulgacaoMateriais: [], moduloAtivo: true };

    const acessoVendas = contextoPreparado?.acessoVendas || await buscarAcessoVendas();
    if (!acessoVendas.acesso) {
      atualizarProgresso('data', 1, 1, 'Conta do Vendas não liberada');
      return { user, produtos: [], pacotes: [], clientes: [], vendas: [], pagamentos: [], conteudos: null, divulgacaoPastas: [], divulgacaoMateriais: [], moduloAtivo: true, ...acessoVendas };
    }
    if (acessoVendas.premiumBloqueado === true) {
      atualizarProgresso('data', 1, 1, 'Assinatura necessária');
      return {
        user,
        produtos: [],
        pacotes: [],
        clientes: [],
        vendas: [],
        pagamentos: [],
        conteudos: null,
        divulgacaoPastas: [],
        divulgacaoMateriais: [],
        moduloAtivo: acessoVendas.moduloAtivo !== false,
        integracaoGestao: { base_receita: 'recebidos', pode_configurar: false },
        vinculosComerciais: [],
        vinculoComercialAtivo: null,
        perfisFinanceiros: [],
        ...acessoVendas,
      };
    }

    let contasVendas = await listarContasVendas();
    if (!contasVendas.length) {
      atualizarProgresso('data', 0, 1, 'Preparando sua conta de vendas');
      const contaInicial = await garantirContaVendas();
      definirContaAtiva(contaInicial.id);
      contasVendas = [contaInicial];
      atualizarProgresso('data', 1, 1, 'Conta de vendas pronta');
    }
    let contaId = contextoPreparado?.contaId || contaAtivaId();
    if (!contasVendas.some((conta) => conta.id === contaId)) contaId = contasVendas[0]?.id || '';
    if (!contaId) throw new Error('Nenhuma conta de vendas está disponível para este acesso.');
    definirContaAtiva(contaId);
    const contaVendasAtiva = contasVendas.find((conta) => conta.id === contaId) || null;
    const totalEtapasDados = 12;
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
      acompanharEtapaDados(requireClient().rpc('meus_vinculos_comerciais_vendas_mobile_rpc', { p_conta_id: contaId }), 'Carregando vínculos comerciais'),
      acompanharEtapaDados(requireClient().rpc('meus_perfis_financeiros_vendas_mobile_rpc'), 'Carregando perfis financeiros'),
    ]);
    if (vinculosRes.error) throw vinculosRes.error;
    if (perfisFinanceirosRes.error) throw perfisFinanceirosRes.error;
    const vinculosComerciais = vinculosRes.data || [];
    const vinculoAtivo = vinculosComerciais.find((vinculo) => vinculo.ativo) || null;
    const [catalogoRes, clientesRes, pedidosRes, pagamentosRes, conteudosRes, pastasRes, materiaisRes, integracaoRes, preferenciasRes] = await Promise.all([
      acompanharEtapaDados(listarCatalogoVendas(), 'Carregando produtos'),
      acompanharEtapaDados(carregarTodasPaginas(() => client
        .from('vendas_mobile_clientes')
        .select('*')
        .eq('conta_id', contaId)
        .order('nome')
        .order('id')), 'Carregando clientes'),
      acompanharEtapaDados(carregarTodasPaginas(() => client
        .from('vendas_mobile_pedidos')
        .select('*, itens:vendas_mobile_pedido_itens(*)')
        .eq('conta_id', contaId)
        .order('criado_em', { ascending: false })
        .order('id', { ascending: false })), 'Carregando pedidos'),
      acompanharEtapaDados(carregarTodasPaginas(() => client
        .from('vendas_mobile_pagamentos')
        .select('*')
        .eq('conta_id', contaId)
        .order('data_pagamento', { ascending: false })
        .order('criado_em', { ascending: false })
        .order('id', { ascending: false })), 'Carregando pagamentos'),
      acompanharEtapaDados(client.from('vendas_mobile_conteudos').select('id, empresa_id, pagina, tipo, titulo, descricao, criado_em').eq('ativo', true).order('criado_em', { ascending: false }), 'Carregando novidades'),
      acompanharEtapaDados(client.from('vendas_mobile_divulgacao_pastas').select('id, empresa_id, pasta_pai_id, capa_material_id, capa_arquivo_url, nome, descricao, ordem, criado_em').eq('ativo', true).order('ordem').order('criado_em', { ascending: false }), 'Carregando pastas de divulgação'),
      acompanharEtapaDados(client.from('vendas_mobile_divulgacao_materiais').select('id, pasta_id, titulo, tipo, arquivo_url, miniatura_url, miniatura_status, mime_type, tamanho_bytes, ordem, criado_em').eq('ativo', true).order('ordem').order('criado_em', { ascending: false }), 'Carregando materiais'),
      acompanharEtapaDados(client.rpc('obter_integracao_gestao_vendas_mobile_rpc', { p_conta_id: contaId }), 'Carregando integração financeira'),
      acompanharEtapaDados(client.from('vendas_mobile_contas_preferencias').select('versao, preferencias, atualizado_em').eq('conta_id', contaId).maybeSingle(), 'Carregando preferências'),
    ]);
    const error = clientesRes.error || pedidosRes.error || pagamentosRes.error || integracaoRes.error;
    if (error) throw error;

    const produtos = catalogoRes.produtos;
    const pacotes = catalogoRes.pacotes;
    etapasDadosConcluidas += 1;
    atualizarProgresso('data', etapasDadosConcluidas, totalEtapasDados, 'Organizando seus dados');

    return {
      user,
      contasVendas,
      contaVendasAtiva,
      produtos,
      pacotes,
      clientes: (clientesRes.data || []).map((c) => ({
        ...c,
        ...(c.endereco || {}),
      })),
      vendas: (pedidosRes.data || []).map((p) => ({ ...p, itens: p.itens || [] })),
      pagamentos: (pagamentosRes.data || []).map(normalizarPagamentoServidor),
      integracaoGestao: integracaoRes.data || { base_receita: 'recebidos', pode_configurar: false },
      conteudos: conteudosRes.error ? null : (conteudosRes.data || []).filter((conteudo) => conteudo.pagina === 'informacoes' || vinculosComerciais.some((vinculo) => vinculo.empresa_id === conteudo.empresa_id && vinculo.novidades_ativas)),
      divulgacaoPastas: pastasRes.error ? [] : (pastasRes.data || []).filter((pasta) => vinculosComerciais.some((vinculo) => vinculo.empresa_id === pasta.empresa_id && vinculo.divulgacao_ativa)),
      divulgacaoMateriais: materiaisRes.error ? [] : (materiaisRes.data || []),
      moduloAtivo,
      sincronizacaoCatalogo: { adicionados: 0, ja_recebidos: 0, sem_preco: 0 },
      vinculosComerciais,
      vinculoComercialAtivo: vinculoAtivo,
      perfisFinanceiros: perfisFinanceirosRes.data || [],
      preferencias: preferenciasRes.error ? null : preferenciasRes.data?.preferencias || null,
      preferenciasVersao: preferenciasRes.error ? null : preferenciasRes.data?.versao || null,
      preferenciasServidorDisponivel: !preferenciasRes.error,
      ...acessoVendas,
    };
  }

  async function loadClientFinancial(clienteId) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    if (!clienteId) throw new Error('Cliente não informado.');
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const [pedidosRes, pagamentosRes] = await Promise.all([
      carregarTodasPaginas(() => requireClient()
        .from('vendas_mobile_pedidos')
        .select('*, itens:vendas_mobile_pedido_itens(*)')
        .eq('conta_id', contaId)
        .eq('cliente_id', clienteId)
        .order('criado_em', { ascending: false })
        .order('id', { ascending: false })),
      carregarTodasPaginas(() => requireClient()
        .from('vendas_mobile_pagamentos')
        .select('*')
        .eq('conta_id', contaId)
        .eq('cliente_id', clienteId)
        .order('data_pagamento', { ascending: false })
        .order('criado_em', { ascending: false })
        .order('id', { ascending: false })),
    ]);
    if (pedidosRes.error) throw pedidosRes.error;
    if (pagamentosRes.error) throw pagamentosRes.error;
    return {
      vendas: (pedidosRes.data || []).map((pedido) => ({ ...pedido, itens: pedido.itens || [] })),
      pagamentos: (pagamentosRes.data || []).map(normalizarPagamentoServidor),
    };
  }

  async function saveProduct(product) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const payload = {
      user_id: user.id,
      conta_id: contaId,
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
      ? client.from('vendas_mobile_produtos').update(payload).eq('id', product.id).eq('conta_id', contaId)
      : client.from('vendas_mobile_produtos').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async function deleteProduct(id) {
    const { error } = await requireClient().from('vendas_mobile_produtos').delete().eq('id', id).eq('conta_id', contaAtivaId());
    if (error) throw error;
  }

  async function movimentarEstoque({ produtoId, tipo, quantidade, observacao = '', dataMovimentacao }) {
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const parametros = {
      p_conta_id: contaId,
      p_produto_id: produtoId,
      p_tipo: tipo,
      p_quantidade: Number(quantidade),
      p_observacao: observacao || null,
      p_data: dataMovimentacao,
    };
    let { data, error } = await requireClient().rpc('movimentar_estoque_vendas_mobile_rpc', parametros);
    // Compatibilidade de implantação: enquanto a assinatura por conta ainda
    // não chegou ao banco, a versão oficial anterior continua registrando a
    // data e validando o proprietário. Outros erros nunca são ocultados.
    if (error && (error.code === 'PGRST202' || /function .* was not found|schema cache/i.test(String(error.message || '')))) {
      ({ data, error } = await requireClient().rpc('movimentar_estoque_vendas_mobile_rpc', {
        p_produto_id: produtoId,
        p_tipo: tipo,
        p_quantidade: Number(quantidade),
        p_observacao: observacao || null,
        p_data: dataMovimentacao,
      }));
    }
    if (error) throw error;
    return data;
  }

  async function listarMovimentosEstoque(produtoId) {
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const { data, error } = await requireClient().from('vendas_mobile_estoque_movimentos')
      .select('id,tipo,quantidade,saldo_anterior,saldo_final,observacao,data_movimentacao,criado_em')
      .eq('conta_id', contaId)
      .eq('produto_id', produtoId)
      .order('data_movimentacao', { ascending: false })
      .order('criado_em', { ascending: false })
      .limit(40);
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
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const payload = products.map((product) => ({
      user_id: user.id,
      conta_id: contaId,
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
    const { error } = await requireClient().from('vendas_mobile_produtos').delete().eq('conta_id', contaAtivaId()).contains('metadados', { pacote: { id } });
    if (error) throw error;
  }

  async function saveClient(customer) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const payload = {
      id: customer.id,
      user_id: user.id,
      conta_id: contaId,
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
    const { error } = await requireClient().from('vendas_mobile_clientes').delete().eq('id', id).eq('conta_id', contaAtivaId());
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
      conta_id: contaAtivaId(),
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
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const payload = pedidoParaPersistencia(order, incluirId);
    const { data, error } = await client.rpc('salvar_pedido_vendas_mobile_rpc', {
      p_pedido: payload.pedido,
      p_itens: payload.itens,
      p_novo: !incluirId,
    });
    if (error) throw error;
    if (!data?.id || !Array.isArray(data.itens)) throw new Error('O pedido não foi confirmado integralmente pelo servidor.');
    if (String(data.conta_id || '') !== String(contaId)) {
      throw new Error('O pedido não foi confirmado no perfil de vendas ativo. Atualize a página e tente novamente.');
    }
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
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const { data, error } = await client.rpc('excluir_pedido_vendas_mobile_rpc', {
      p_conta_id: contaId,
      p_pedido_id: id,
    });
    if (error) throw error;
    return data || { pedido_id: id, estoques_atualizados: [] };
  }

  async function savePayment(payment) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const payload = {
      id: payment.id,
      user_id: user.id,
      conta_id: contaAtivaId(),
      cliente_id: payment.cliente_id || null,
      tipo: 'pagamento',
      forma_pagamento: payment.forma_pagamento || 'Pix',
      valor: Number(payment.valor || 0),
      desconto: Number(payment.desconto || 0),
      saldo_anterior: Number(payment.saldo_anterior || 0),
      saldo_final: Number(payment.saldo_final || 0),
      observacoes: JSON.stringify({
        avantalab_pagamento: true,
        comprovante_financeiro_confirmado: true,
        desconto: Number(payment.desconto || 0),
        saldo_anterior: Number(payment.saldo_anterior || 0),
        saldo_final: Number(payment.saldo_final || 0),
      }),
      data_pagamento: payment.data_pagamento,
    };
    let { data, error } = await client.from('vendas_mobile_pagamentos').upsert(payload, { onConflict: 'id' }).select().single();
    if (error && /desconto|saldo_anterior|saldo_final|schema cache/i.test(String(error.message || ''))) {
      const legado = {
        id: payload.id,
        user_id: payload.user_id,
        conta_id: payload.conta_id,
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
    if (
      data.cliente_id !== payload.cliente_id
      || Number(data.valor || 0) !== payload.valor
      || String(data.data_pagamento || '') !== String(payload.data_pagamento || '')
    ) throw new Error('O pagamento retornado pelo servidor não corresponde ao lançamento enviado.');
    return { ...data, desconto: payload.desconto, saldo_anterior: payload.saldo_anterior, saldo_final: payload.saldo_final, comprovante_financeiro_confirmado: true };
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
      observacoes: JSON.stringify({
        avantalab_pagamento: true,
        comprovante_financeiro_confirmado: true,
        desconto: Number(payment.desconto || 0),
        saldo_anterior: Number(payment.saldo_anterior || 0),
        saldo_final: Number(payment.saldo_final || 0),
      }),
      data_pagamento: payment.data_pagamento,
    };
    let { data, error } = await client
      .from('vendas_mobile_pagamentos')
      .update(payload)
      .eq('id', payment.id)
      .eq('conta_id', contaAtivaId())
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
        .eq('conta_id', contaAtivaId())
        .select()
        .single());
    }
    if (error) throw error;
    if (!data?.id) throw new Error('A alteração do pagamento não foi confirmada pelo servidor.');
    return { ...payment, ...data, desconto: payload.desconto, saldo_anterior: payload.saldo_anterior, saldo_final: payload.saldo_final, comprovante_financeiro_confirmado: true };
  }

  async function deletePayment(id) {
    const user = await currentUser();
    if (!user) throw new Error('Sessão expirada.');
    const { error } = await client
      .from('vendas_mobile_pagamentos')
      .delete()
      .eq('id', id)
      .eq('conta_id', contaAtivaId());
    if (error) throw error;
  }

  async function configurarIntegracaoGestao(baseReceita) {
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const { data, error } = await requireClient().rpc('configurar_integracao_gestao_vendas_mobile_rpc', {
      p_conta_id: contaId,
      p_base_receita: baseReceita,
    });
    if (error) throw error;
    return data;
  }

  async function atualizarRecursoVinculoComercial(empresaId, recurso, ativo, removerCatalogo = false) {
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const { data, error } = await requireClient().rpc('atualizar_recurso_vinculo_comercial_vendas_mobile_rpc', {
      p_conta_id: contaId, p_empresa_id: empresaId, p_recurso: recurso, p_ativo: ativo, p_remover_catalogo: removerCatalogo,
    });
    if (error) throw error;
    return data || [];
  }

  async function resetarSistemaVendas() {
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const { data, error } = await requireClient().rpc('resetar_conta_vendas_mobile_rpc', {
      p_conta_id: contaId,
      p_confirmacao: 'RESETAR',
    });
    if (error) throw error;
    return data;
  }

  async function excluirContaVendas() {
    const token = await getAccessToken();
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    const resposta = await fetch('/api/vendas/conta', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmacao: 'EXCLUIR' }),
    });
    const data = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(data?.mensagem || 'Não foi possível excluir a conta do Vendas.');
    definirContaAtiva('');
    return data;
  }

  async function definirPerfilFinanceiro(empresaId, periodo = 'todo_historico', historicoAnterior = 'manter', baseReceita = 'recebidos') {
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const { data, error } = await requireClient().rpc('definir_perfil_financeiro_vendas_mobile_rpc', {
      p_conta_id: contaId,
      p_empresa_id: empresaId,
      p_periodo: periodo,
      p_historico_anterior: historicoAnterior,
      p_base_receita: baseReceita === 'vendidos' ? 'vendidos' : 'recebidos',
    });
    if (error) throw error;
    return data;
  }

  async function desvincularPerfilFinanceiro(historicoAnterior = 'manter') {
    const contaId = contaAtivaId();
    if (!contaId) throw new Error('Selecione uma conta de vendas.');
    const { data, error } = await requireClient().rpc('desvincular_perfil_financeiro_vendas_mobile_rpc', {
      p_conta_id: contaId,
      p_historico_anterior: historicoAnterior,
    });
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

  window.VendasDb = { client, currentUser, hasSession, getAccessToken, verificarPremiumVendas, uploadProductImage, signIn, signInPhone, signInWithGoogle, signInWithApple, iniciarOAuthNativo, exchangeCodeForSession, setSession, resetPassword, updatePassword, updateUserMetadata, signUp, signOut, solicitarAcesso, buscarAcessoVendas, assinarAtualizacoesVinculo, cancelarAtualizacoesVinculo, loadAll, carregarDivulgacao, loadClientFinancial, listarCatalogoVendas, sincronizarCatalogoVendas, salvarPreferencias, saveProduct, deleteProduct, movimentarEstoque, listarMovimentosEstoque, createPackage, saveProductsBulk, deletePackage, saveClient, deleteClient, saveOrder, updateOrder, deleteOrder, savePayment, updatePayment, deletePayment, configurarIntegracaoGestao, atualizarRecursoVinculoComercial, resetarSistemaVendas, excluirContaVendas, definirPerfilFinanceiro, desvincularPerfilFinanceiro, saveFeedback, listarContasVendas, criarContaVendas, garantirContaVendas, adicionarUsuarioContaVendas, contaAtivaId, definirContaAtiva };
})();
