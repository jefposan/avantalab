update public.modulos
set disponivel = true,
    nome = 'Custos e Precificação',
    descricao = 'Cadastro de produtos, composição de custos, histórico e simulações de preço.',
    icone = 'custos',
    perfis = array['empresa'],
    ordem = 5,
    preco_mensal = 14.90,
    vendavel_business = true,
    incluido_business_pro = true,
    modo_navegacao = 'pagina_total',
    rota_web = '/custos',
    superficies = array['web']
where id = 'custos';
