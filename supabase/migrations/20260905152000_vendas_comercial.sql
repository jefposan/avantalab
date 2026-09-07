-- CONTRATO COMERCIAL OFICIAL DO PILOTO TRIDIUM.
-- Estrutura revisada do modulo Vendas e Servicos. Aplicar somente depois de backup remoto.

begin;

create table public.vendas_clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo bigint not null check (codigo > 0),
  tipo_pessoa text not null default 'juridica' check (tipo_pessoa in ('juridica','fisica')),
  documento_tipo text not null default 'cnpj' check (documento_tipo in ('cnpj','cpf')),
  documento text not null,
  razao_social text not null,
  nome_fantasia text,
  nome_exibicao text not null,
  inscricao_estadual text,
  inscricao_municipal text,
  indicador_ie text not null default 'nao_contribuinte'
    check (indicador_ie in ('contribuinte_icms','contribuinte_isento','nao_contribuinte')),
  email text,
  telefone text,
  contato_principal text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  municipio text,
  municipio_ibge text,
  uf text,
  vendedor_id uuid references auth.users(id) on delete set null,
  condicao_pagamento text,
  observacoes text,
  situacao text not null default 'ativo' check (situacao in ('ativo','revisar_cadastro','inativo')),
  versao integer not null default 1 check (versao > 0),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint vendas_clientes_documento_check check (
    documento ~ '^[0-9]+$'
    and ((documento_tipo='cnpj' and length(documento)=14) or (documento_tipo='cpf' and length(documento)=11))
    and ((tipo_pessoa='juridica' and documento_tipo='cnpj') or (tipo_pessoa='fisica' and documento_tipo='cpf'))
  ),
  constraint vendas_clientes_nome_check check (length(trim(nome_exibicao)) between 2 and 160),
  constraint vendas_clientes_uf_check check (uf is null or uf ~ '^[A-Z]{2}$'),
  constraint vendas_clientes_municipio_ibge_check check (municipio_ibge is null or municipio_ibge ~ '^[0-9]{7}$'),
  unique (empresa_id, id),
  unique (empresa_id, codigo),
  unique (empresa_id, documento_tipo, documento)
);

create table public.vendas_cliente_contatos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cliente_id uuid not null,
  nome text not null,
  cargo text,
  email text,
  telefone text,
  principal boolean not null default false,
  ativo boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (empresa_id, cliente_id) references public.vendas_clientes(empresa_id, id) on delete cascade,
  constraint vendas_cliente_contatos_nome_check check (length(trim(nome)) between 2 and 120)
);

create unique index vendas_cliente_contato_principal_uidx
  on public.vendas_cliente_contatos (empresa_id, cliente_id) where principal and ativo;

create table public.vendas_sequencias (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null check (tipo in ('cliente','orcamento','pedido','venda','ordem_servico','inventario')),
  ano integer not null check ((tipo='cliente' and ano=0) or (tipo<>'cliente' and ano between 2000 and 9999)),
  proximo_numero bigint not null default 1 check (proximo_numero > 0),
  atualizado_em timestamptz not null default now(),
  primary key (empresa_id, tipo, ano)
);

create table public.vendas_operacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null check (tipo in ('orcamento','pedido','venda','ordem_servico')),
  canal text not null check (canal in ('vendas','servicos')),
  ano integer,
  numero bigint,
  cliente_id uuid,
  cliente_retrato jsonb not null default '{}'::jsonb check (jsonb_typeof(cliente_retrato)='object'),
  tabela_preco_id uuid references public.custos_tabelas_preco(id) on delete restrict,
  tabela_preco_retrato jsonb not null default '{}'::jsonb check (jsonb_typeof(tabela_preco_retrato)='object'),
  vendedor_id uuid references auth.users(id) on delete set null,
  vendedor_nome text,
  situacao text not null default 'rascunho' check (situacao in (
    'rascunho','salvo','enviado','em_negociacao','aprovado','recusado','vencido',
    'confirmado','em_separacao','faturado','agendado','em_execucao','concluido',
    'cancelado','devolvido','arquivado'
  )),
  validade_em date,
  convertido_de_id uuid,
  subtotal_bruto numeric(14,2) not null default 0 check (subtotal_bruto >= 0),
  desconto_itens numeric(14,2) not null default 0 check (desconto_itens >= 0),
  desconto_geral numeric(14,2) not null default 0 check (desconto_geral >= 0),
  frete numeric(14,2) not null default 0 check (frete >= 0),
  seguro numeric(14,2) not null default 0 check (seguro >= 0),
  outras_despesas numeric(14,2) not null default 0 check (outras_despesas >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  moeda text not null default 'BRL' check (moeda='BRL'),
  pagamento_retrato jsonb not null default '{}'::jsonb check (jsonb_typeof(pagamento_retrato)='object'),
  entrega_retrato jsonb not null default '{}'::jsonb check (jsonb_typeof(entrega_retrato)='object'),
  documento_fiscal_solicitado text not null default 'nenhum'
    check (documento_fiscal_solicitado in ('nenhum','nfe','nfce','nfse')),
  situacao_fiscal text not null default 'nao_preparado'
    check (situacao_fiscal in ('nao_aplicavel','nao_preparado','pendencia_cadastral','pronto','rascunho_criado','emitido','rejeitado','cancelado')),
  situacao_estoque text not null default 'sem_movimentacao'
    check (situacao_estoque in ('sem_movimentacao','reservado','em_separacao','baixado','liberado','devolvido')),
  observacoes_cliente text,
  observacoes_internas text,
  chave_idempotencia text not null,
  conteudo_hash text not null check (conteudo_hash ~ '^[0-9a-f]{64}$'),
  versao integer not null default 1 check (versao > 0),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  confirmado_em timestamptz,
  faturado_em timestamptz,
  concluido_em timestamptz,
  cancelado_em timestamptz,
  constraint vendas_operacoes_numero_check check ((numero is null and ano is null) or (numero > 0 and ano between 2000 and 9999)),
  constraint vendas_operacoes_composicao_check check (
    total = round(subtotal_bruto - desconto_itens - desconto_geral + frete + seguro + outras_despesas, 2)
  ),
  constraint vendas_operacoes_fiscal_tipo_check check (
    not (canal='servicos' and documento_fiscal_solicitado in ('nfe','nfce'))
  ),
  unique (empresa_id, id),
  unique (empresa_id, chave_idempotencia),
  unique (empresa_id, tipo, ano, numero),
  foreign key (empresa_id, cliente_id) references public.vendas_clientes(empresa_id, id) on delete restrict,
  foreign key (empresa_id, convertido_de_id) references public.vendas_operacoes(empresa_id, id) on delete restrict
);

create unique index vendas_operacoes_conversao_uidx
  on public.vendas_operacoes (empresa_id, convertido_de_id)
  where convertido_de_id is not null;

create table public.vendas_operacao_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  operacao_id uuid not null,
  posicao integer not null check (posicao > 0),
  produto_id uuid references public.vendas_mobile_catalogo_produtos(id) on delete restrict,
  tipo_item text not null check (tipo_item in ('produto','servico')),
  sku text,
  nome text not null,
  descricao text,
  unidade text not null,
  quantidade numeric(14,3) not null check (quantidade > 0),
  preco_unitario numeric(14,2) not null check (preco_unitario >= 0),
  desconto_unitario numeric(14,2) not null default 0 check (desconto_unitario >= 0 and desconto_unitario <= preco_unitario),
  valor_bruto numeric(14,2) not null check (valor_bruto >= 0),
  valor_desconto numeric(14,2) not null default 0 check (valor_desconto >= 0),
  valor_liquido numeric(14,2) not null check (valor_liquido >= 0),
  custo_unitario_retrato numeric(14,2) check (custo_unitario_retrato is null or custo_unitario_retrato >= 0),
  fiscal_retrato jsonb not null default '{}'::jsonb check (jsonb_typeof(fiscal_retrato)='object'),
  fiscal_pronto boolean not null default false,
  controla_estoque boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (empresa_id, operacao_id) references public.vendas_operacoes(empresa_id, id) on delete cascade,
  constraint vendas_operacao_itens_totais_check check (
    valor_bruto = round(quantidade * preco_unitario, 2)
    and valor_desconto = round(quantidade * desconto_unitario, 2)
    and valor_liquido = round(valor_bruto - valor_desconto, 2)
  ),
  constraint vendas_operacao_itens_estoque_check check (not controla_estoque or tipo_item='produto'),
  unique (empresa_id, id),
  unique (empresa_id, operacao_id, id),
  unique (empresa_id, operacao_id, posicao)
);

create table public.vendas_ordens_servico (
  operacao_id uuid primary key,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  agendado_para timestamptz,
  duracao_prevista_minutos integer check (duracao_prevista_minutos is null or duracao_prevista_minutos > 0),
  tecnico_id uuid references auth.users(id) on delete set null,
  tecnico_nome text,
  local_execucao text,
  contato_no_local text,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  duracao_real_minutos integer check (duracao_real_minutos is null or duracao_real_minutos >= 0),
  observacoes_execucao text,
  aceite_situacao text not null default 'pendente' check (aceite_situacao in ('pendente','aceito','recusado')),
  aceite_por text,
  aceite_em timestamptz,
  aceite_observacoes text,
  custo_mao_obra numeric(14,2) not null default 0 check (custo_mao_obra >= 0),
  custo_materiais numeric(14,2) not null default 0 check (custo_materiais >= 0),
  custo_real_total numeric(14,2) not null default 0 check (custo_real_total >= 0),
  versao integer not null default 1 check (versao > 0),
  atualizado_por uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, operacao_id),
  foreign key (empresa_id, operacao_id) references public.vendas_operacoes(empresa_id, id) on delete cascade,
  constraint vendas_os_custo_check check (custo_real_total = round(custo_mao_obra + custo_materiais, 2)),
  constraint vendas_os_aceite_check check (
    (aceite_situacao='pendente' and aceite_em is null)
    or (aceite_situacao in ('aceito','recusado') and aceite_em is not null and nullif(trim(aceite_por),'') is not null)
  )
);

create table public.vendas_os_materiais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  operacao_id uuid not null,
  produto_id uuid references public.vendas_mobile_catalogo_produtos(id) on delete restrict,
  origem text not null check (origem in ('catalogo','externo','cliente')),
  sku text,
  nome text not null,
  unidade text not null,
  quantidade_prevista numeric(14,3) not null default 0 check (quantidade_prevista >= 0),
  quantidade_utilizada numeric(14,3) not null default 0 check (quantidade_utilizada >= 0),
  custo_unitario_retrato numeric(14,2) not null default 0 check (custo_unitario_retrato >= 0),
  situacao_estoque text not null default 'nao_aplicavel'
    check (situacao_estoque in ('nao_aplicavel','pendente','reservado','baixado','liberado','estornado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (empresa_id, operacao_id) references public.vendas_ordens_servico(empresa_id, operacao_id) on delete cascade,
  constraint vendas_os_materiais_catalogo_check check ((origem='catalogo' and produto_id is not null) or origem<>'catalogo'),
  unique (empresa_id, id),
  unique (empresa_id, operacao_id, id)
);

create table public.vendas_os_checklist (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  operacao_id uuid not null,
  posicao integer not null check (posicao > 0),
  descricao text not null,
  concluido boolean not null default false,
  concluido_por uuid references auth.users(id) on delete set null,
  concluido_em timestamptz,
  foreign key (empresa_id, operacao_id) references public.vendas_ordens_servico(empresa_id, operacao_id) on delete cascade,
  constraint vendas_os_checklist_conclusao_check check ((not concluido and concluido_em is null) or (concluido and concluido_em is not null)),
  unique (empresa_id, operacao_id, posicao)
);

create table public.vendas_os_anexos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  operacao_id uuid not null,
  nome text not null,
  tipo_mime text not null,
  tamanho_bytes bigint not null check (tamanho_bytes between 1 and 52428800),
  referencia_storage text not null,
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  foreign key (empresa_id, operacao_id) references public.vendas_ordens_servico(empresa_id, operacao_id) on delete cascade,
  unique (empresa_id, referencia_storage)
);

create table public.vendas_estoque_locais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null,
  nome text not null,
  descricao text,
  padrao boolean not null default false,
  ativo boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, codigo)
);

create unique index vendas_estoque_local_padrao_uidx
  on public.vendas_estoque_locais (empresa_id) where padrao and ativo;

create table public.vendas_estoque_saldos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  local_id uuid not null,
  produto_id uuid not null references public.vendas_mobile_catalogo_produtos(id) on delete restrict,
  saldo_fisico numeric(14,3) not null default 0,
  saldo_reservado numeric(14,3) not null default 0 check (saldo_reservado >= 0),
  estoque_minimo numeric(14,3) not null default 0 check (estoque_minimo >= 0),
  permite_negativo boolean not null default false,
  versao integer not null default 1 check (versao > 0),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, local_id, produto_id),
  foreign key (empresa_id, local_id) references public.vendas_estoque_locais(empresa_id, id) on delete restrict,
  constraint vendas_estoque_saldos_negativo_check check (permite_negativo or saldo_fisico >= 0),
  constraint vendas_estoque_saldos_reserva_check check (permite_negativo or saldo_reservado <= saldo_fisico)
);

create table public.vendas_estoque_reservas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  saldo_id uuid not null,
  operacao_id uuid not null,
  operacao_item_id uuid,
  os_material_id uuid,
  quantidade numeric(14,3) not null check (quantidade > 0),
  situacao text not null default 'ativa' check (situacao in ('ativa','consumida','liberada','devolvida')),
  chave_idempotencia text not null,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, chave_idempotencia),
  foreign key (empresa_id, saldo_id) references public.vendas_estoque_saldos(empresa_id, id) on delete restrict,
  foreign key (empresa_id, operacao_id) references public.vendas_operacoes(empresa_id, id) on delete restrict,
  foreign key (empresa_id, operacao_item_id) references public.vendas_operacao_itens(empresa_id, id) on delete restrict,
  foreign key (empresa_id, os_material_id) references public.vendas_os_materiais(empresa_id, id) on delete restrict,
  foreign key (empresa_id, operacao_id, operacao_item_id) references public.vendas_operacao_itens(empresa_id, operacao_id, id) on delete restrict,
  foreign key (empresa_id, operacao_id, os_material_id) references public.vendas_os_materiais(empresa_id, operacao_id, id) on delete restrict,
  constraint vendas_estoque_reservas_origem_check check (
    (operacao_item_id is not null and os_material_id is null)
    or (operacao_item_id is null and os_material_id is not null)
  )
);

create table public.vendas_estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  saldo_id uuid not null,
  reserva_id uuid references public.vendas_estoque_reservas(id) on delete restrict,
  operacao_id uuid,
  tipo text not null check (tipo in ('entrada_compra','entrada_producao','entrada_devolucao','saida_venda','saida_servico','ajuste','inventario','reserva','liberacao','devolucao')),
  quantidade numeric(14,3) not null check (quantidade <> 0),
  saldo_fisico_anterior numeric(14,3) not null,
  saldo_fisico_final numeric(14,3) not null,
  saldo_reservado_anterior numeric(14,3) not null check (saldo_reservado_anterior >= 0),
  saldo_reservado_final numeric(14,3) not null check (saldo_reservado_final >= 0),
  parceiro_retrato jsonb not null default '{}'::jsonb check (jsonb_typeof(parceiro_retrato)='object'),
  documento_referencia text,
  lote text,
  validade date,
  observacoes text,
  chave_idempotencia text not null,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (empresa_id, chave_idempotencia),
  foreign key (empresa_id, saldo_id) references public.vendas_estoque_saldos(empresa_id, id) on delete restrict,
  foreign key (empresa_id, reserva_id) references public.vendas_estoque_reservas(empresa_id, id) on delete restrict,
  foreign key (empresa_id, operacao_id) references public.vendas_operacoes(empresa_id, id) on delete restrict
);

create unique index vendas_estoque_reserva_os_ativa_uidx
  on public.vendas_estoque_reservas (empresa_id, os_material_id)
  where os_material_id is not null and situacao='ativa';

create unique index vendas_estoque_reserva_item_ativa_uidx
  on public.vendas_estoque_reservas (empresa_id, operacao_item_id)
  where operacao_item_id is not null and situacao='ativa';

create table public.vendas_inventarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  local_id uuid not null,
  ano integer,
  numero bigint,
  situacao text not null default 'rascunho' check (situacao in ('rascunho','em_contagem','conferido','aplicado','cancelado')),
  motivo text not null,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  aplicado_em timestamptz,
  versao integer not null default 1 check (versao > 0),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, ano, numero),
  foreign key (empresa_id, local_id) references public.vendas_estoque_locais(empresa_id, id) on delete restrict,
  constraint vendas_inventarios_numero_check check ((numero is null and ano is null) or (numero > 0 and ano between 2000 and 9999))
);

create table public.vendas_inventario_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  inventario_id uuid not null,
  saldo_id uuid not null,
  produto_id uuid not null references public.vendas_mobile_catalogo_produtos(id) on delete restrict,
  saldo_sistema numeric(14,3) not null,
  quantidade_contada numeric(14,3),
  divergencia numeric(14,3),
  observacoes text,
  contado_por uuid references auth.users(id) on delete set null,
  contado_em timestamptz,
  foreign key (empresa_id, inventario_id) references public.vendas_inventarios(empresa_id, id) on delete cascade,
  foreign key (empresa_id, saldo_id) references public.vendas_estoque_saldos(empresa_id, id) on delete restrict,
  constraint vendas_inventario_itens_contagem_check check (
    (quantidade_contada is null and divergencia is null and contado_em is null)
    or (quantidade_contada is not null and divergencia = quantidade_contada - saldo_sistema and contado_em is not null)
  ),
  unique (empresa_id, inventario_id, produto_id)
);

create table public.vendas_contas_receber (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  operacao_id uuid not null,
  cliente_id uuid,
  parcela integer not null check (parcela > 0),
  total_parcelas integer not null check (total_parcelas > 0 and parcela <= total_parcelas),
  vencimento date not null,
  valor_original numeric(14,2) not null check (valor_original > 0),
  valor_recebido numeric(14,2) not null default 0 check (valor_recebido >= 0),
  valor_estornado numeric(14,2) not null default 0 check (valor_estornado >= 0),
  saldo_aberto numeric(14,2) not null check (saldo_aberto >= 0),
  meio_pagamento text not null,
  conta_destino_referencia text,
  situacao text not null default 'aberto' check (situacao in ('aberto','parcial','recebido','atrasado','estornado','cancelado')),
  integracao_financeira_referencia uuid,
  chave_idempotencia text not null,
  versao integer not null default 1 check (versao > 0),
  criado_por uuid references auth.users(id) on delete set null,
  atualizado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, operacao_id, parcela),
  unique (empresa_id, chave_idempotencia),
  foreign key (empresa_id, operacao_id) references public.vendas_operacoes(empresa_id, id) on delete restrict,
  foreign key (empresa_id, cliente_id) references public.vendas_clientes(empresa_id, id) on delete restrict,
  constraint vendas_contas_receber_saldo_check check (
    saldo_aberto = round(valor_original - valor_recebido + valor_estornado, 2)
  )
);

create table public.vendas_contas_receber_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  conta_receber_id uuid not null,
  tipo text not null check (tipo in ('geracao','recebimento','estorno_recebimento','estorno_parcela','cancelamento')),
  valor numeric(14,2) not null check (valor >= 0),
  meio_pagamento text,
  conta_destino_referencia text,
  descricao text,
  chave_idempotencia text not null,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (empresa_id, chave_idempotencia),
  foreign key (empresa_id, conta_receber_id) references public.vendas_contas_receber(empresa_id, id) on delete restrict
);

create table public.vendas_fiscal_configuracoes (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  situacao text not null default 'rascunho' check (situacao in ('rascunho','publicada')),
  matriz_versao text not null,
  matriz jsonb not null check (jsonb_typeof(matriz)='object'),
  revisao_tributaria_confirmada boolean not null default false,
  reforma_tributaria_confirmada boolean not null default false,
  responsavel_fiscal text not null,
  revisado_em timestamptz,
  publicado_por uuid references auth.users(id) on delete set null,
  publicado_em timestamptz,
  conteudo_hash text not null check (conteudo_hash ~ '^[0-9a-f]{64}$'),
  chave_idempotencia text not null,
  versao integer not null default 1 check (versao > 0),
  atualizado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint vendas_fiscal_configuracoes_publicacao_check check (
    situacao<>'publicada' or (
      revisao_tributaria_confirmada and reforma_tributaria_confirmada
      and revisado_em is not null and publicado_em is not null
      and nullif(trim(responsavel_fiscal),'') is not null
    )
  )
);

create table public.vendas_fiscal_rascunhos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  operacao_id uuid not null,
  origem_tipo text not null check (origem_tipo in ('pedido','ordem_servico')),
  documento_tipo text not null check (documento_tipo in ('nfe','nfce','nfse')),
  situacao text not null check (situacao in ('pendencia_cadastral','pronto')),
  emitente_retrato jsonb not null default '{}'::jsonb check (jsonb_typeof(emitente_retrato)='object'),
  destinatario_retrato jsonb not null default '{}'::jsonb check (jsonb_typeof(destinatario_retrato)='object'),
  itens_retrato jsonb not null default '[]'::jsonb check (jsonb_typeof(itens_retrato)='array'),
  totais_retrato jsonb not null default '{}'::jsonb check (jsonb_typeof(totais_retrato)='object'),
  pagamento_retrato jsonb not null default '{}'::jsonb check (jsonb_typeof(pagamento_retrato)='object'),
  conteudo_hash text not null check (conteudo_hash ~ '^[0-9a-f]{64}$'),
  chave_idempotencia text not null,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, operacao_id),
  unique (empresa_id, chave_idempotencia),
  foreign key (empresa_id, operacao_id) references public.vendas_operacoes(empresa_id, id) on delete restrict
);

create table public.vendas_eventos (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  recurso_tipo text not null check (recurso_tipo in ('cliente','operacao','ordem_servico','estoque','inventario','conta_receber','configuracao_fiscal')),
  recurso_id uuid not null,
  evento text not null,
  resumo text not null,
  metadados jsonb not null default '{}'::jsonb check (jsonb_typeof(metadados)='object'),
  chave_idempotencia text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

create unique index vendas_eventos_idempotencia_uidx
  on public.vendas_eventos (empresa_id, chave_idempotencia)
  where chave_idempotencia is not null;

create index vendas_clientes_busca_idx on public.vendas_clientes (empresa_id, situacao, nome_exibicao);
create index vendas_operacoes_lista_idx on public.vendas_operacoes (empresa_id, tipo, situacao, criado_em desc);
create index vendas_operacoes_cliente_idx on public.vendas_operacoes (empresa_id, cliente_id, criado_em desc);
create index vendas_operacao_itens_produto_idx on public.vendas_operacao_itens (empresa_id, produto_id, criado_em desc);
create index vendas_os_agenda_idx on public.vendas_ordens_servico (empresa_id, agendado_para);
create index vendas_estoque_saldos_alerta_idx on public.vendas_estoque_saldos (empresa_id, local_id, saldo_fisico, estoque_minimo);
create index vendas_estoque_reservas_operacao_idx on public.vendas_estoque_reservas (empresa_id, operacao_id, situacao);
create index vendas_estoque_movimentos_extrato_idx on public.vendas_estoque_movimentos (empresa_id, saldo_id, criado_em desc);
create index vendas_contas_receber_agenda_idx on public.vendas_contas_receber (empresa_id, situacao, vencimento);
create index vendas_contas_receber_cliente_idx on public.vendas_contas_receber (empresa_id, cliente_id, vencimento desc);
create unique index vendas_fiscal_configuracoes_idempotencia_uidx on public.vendas_fiscal_configuracoes (empresa_id, chave_idempotencia);
create index vendas_fiscal_rascunhos_lista_idx on public.vendas_fiscal_rascunhos (empresa_id, situacao, criado_em desc);
create index vendas_eventos_recurso_idx on public.vendas_eventos (empresa_id, recurso_tipo, recurso_id, criado_em desc);

create or replace function public.vendas_touch_version()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.empresa_id := old.empresa_id;
  new.versao := old.versao + 1;
  new.atualizado_em := now();
  return new;
end $$;

create or replace function public.vendas_rejeitar_alteracao_imutavel()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'O histórico comercial é imutável; registre um novo evento de correção.' using errcode='23514';
end $$;

create or replace function public.vendas_validar_produto_empresa()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_produto_id uuid;
begin
  v_produto_id := (to_jsonb(new)->>'produto_id')::uuid;
  if v_produto_id is null then return new; end if;
  if not exists (
    select 1 from public.vendas_mobile_catalogo_produtos produto
    join public.vendas_mobile_catalogos catalogo on catalogo.id=produto.catalogo_id
    where produto.id=v_produto_id and catalogo.empresa_id=new.empresa_id
  ) then raise exception 'O item do catálogo não pertence à empresa da operação.' using errcode='23514'; end if;
  return new;
end $$;

create or replace function public.vendas_validar_item_editavel()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_empresa_id uuid; v_operacao_id uuid;
begin
  v_empresa_id := case when tg_op='DELETE' then old.empresa_id else new.empresa_id end;
  v_operacao_id := case when tg_op='DELETE' then old.operacao_id else new.operacao_id end;
  if not exists (
    select 1 from public.vendas_operacoes operacao
    where operacao.empresa_id=v_empresa_id and operacao.id=v_operacao_id
      and operacao.situacao in ('rascunho','salvo')
  ) then raise exception 'Os itens só podem ser alterados enquanto o documento estiver em rascunho ou salvo.' using errcode='23514'; end if;
  if tg_op='DELETE' then return old; end if;
  new.atualizado_em := now();
  return new;
end $$;

create or replace function public.vendas_validar_tabela_preco_empresa()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.tabela_preco_id is null then return new; end if;
  if not exists (
    select 1 from public.custos_tabelas_preco tabela
    where tabela.id=new.tabela_preco_id and tabela.empresa_id=new.empresa_id and tabela.ativo
  ) then raise exception 'A tabela de preços não pertence à empresa da operação ou está inativa.' using errcode='23514'; end if;
  return new;
end $$;

create or replace function public.vendas_validar_ordem_servico()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (
    select 1 from public.vendas_operacoes operacao
    where operacao.empresa_id=new.empresa_id and operacao.id=new.operacao_id
      and operacao.tipo='ordem_servico' and operacao.canal='servicos'
  ) then raise exception 'A execução precisa pertencer a uma ordem de serviço da mesma empresa.' using errcode='23514'; end if;
  return new;
end $$;

create or replace function public.vendas_reservar_numero_operacao(p_empresa_id uuid, p_operacao_id uuid)
returns table(operacao_tipo text, operacao_ano integer, operacao_numero bigint)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_operacao public.vendas_operacoes; v_numero bigint; v_ano integer;
begin
  select * into v_operacao from public.vendas_operacoes
   where empresa_id=p_empresa_id and id=p_operacao_id for update;
  if not found then raise exception 'Operação comercial não localizada.' using errcode='P0002'; end if;
  if v_operacao.numero is not null then
    return query select v_operacao.tipo, v_operacao.ano, v_operacao.numero;
    return;
  end if;
  if v_operacao.situacao not in ('rascunho','salvo') then
    raise exception 'Somente um documento em preparação pode receber número.' using errcode='23514';
  end if;
  v_ano := extract(year from timezone('America/Sao_Paulo', v_operacao.criado_em))::integer;
  insert into public.vendas_sequencias(empresa_id,tipo,ano,proximo_numero)
  values (p_empresa_id,v_operacao.tipo,v_ano,1)
  on conflict on constraint vendas_sequencias_pkey do nothing;
  select sequencia.proximo_numero into v_numero from public.vendas_sequencias sequencia
   where sequencia.empresa_id=p_empresa_id and sequencia.tipo=v_operacao.tipo and sequencia.ano=v_ano for update;
  update public.vendas_sequencias sequencia set proximo_numero=v_numero+1, atualizado_em=now()
   where sequencia.empresa_id=p_empresa_id and sequencia.tipo=v_operacao.tipo and sequencia.ano=v_ano;
  update public.vendas_operacoes set ano=v_ano, numero=v_numero, atualizado_em=now()
   where empresa_id=p_empresa_id and id=p_operacao_id;
  return query select v_operacao.tipo, v_ano, v_numero;
end $$;

create trigger vendas_clientes_touch before update on public.vendas_clientes
for each row execute function public.vendas_touch_version();
create trigger vendas_operacoes_touch before update on public.vendas_operacoes
for each row execute function public.vendas_touch_version();
create trigger vendas_operacoes_tabela_preco before insert or update on public.vendas_operacoes
for each row execute function public.vendas_validar_tabela_preco_empresa();
create trigger vendas_os_touch before update on public.vendas_ordens_servico
for each row execute function public.vendas_touch_version();
create trigger vendas_estoque_saldos_touch before update on public.vendas_estoque_saldos
for each row execute function public.vendas_touch_version();
create trigger vendas_inventarios_touch before update on public.vendas_inventarios
for each row execute function public.vendas_touch_version();
create trigger vendas_contas_receber_touch before update on public.vendas_contas_receber
for each row execute function public.vendas_touch_version();
create trigger vendas_fiscal_configuracoes_touch before update on public.vendas_fiscal_configuracoes
for each row execute function public.vendas_touch_version();

create trigger vendas_operacao_itens_editavel before insert or update or delete on public.vendas_operacao_itens
for each row execute function public.vendas_validar_item_editavel();
create trigger vendas_operacao_itens_empresa before insert or update on public.vendas_operacao_itens
for each row execute function public.vendas_validar_produto_empresa();
create trigger vendas_os_validar before insert or update on public.vendas_ordens_servico
for each row execute function public.vendas_validar_ordem_servico();
create trigger vendas_os_materiais_empresa before insert or update on public.vendas_os_materiais
for each row execute function public.vendas_validar_produto_empresa();
create trigger vendas_estoque_saldos_empresa before insert or update on public.vendas_estoque_saldos
for each row execute function public.vendas_validar_produto_empresa();
create trigger vendas_inventario_itens_empresa before insert or update on public.vendas_inventario_itens
for each row execute function public.vendas_validar_produto_empresa();

create trigger vendas_estoque_movimentos_immutable before update or delete on public.vendas_estoque_movimentos
for each row execute function public.vendas_rejeitar_alteracao_imutavel();
create trigger vendas_contas_receber_eventos_immutable before update or delete on public.vendas_contas_receber_eventos
for each row execute function public.vendas_rejeitar_alteracao_imutavel();
create trigger vendas_fiscal_rascunhos_immutable before update or delete on public.vendas_fiscal_rascunhos
for each row execute function public.vendas_rejeitar_alteracao_imutavel();
create trigger vendas_eventos_immutable before update or delete on public.vendas_eventos
for each row execute function public.vendas_rejeitar_alteracao_imutavel();

alter table public.vendas_clientes enable row level security;
alter table public.vendas_clientes force row level security;
alter table public.vendas_cliente_contatos enable row level security;
alter table public.vendas_cliente_contatos force row level security;
alter table public.vendas_sequencias enable row level security;
alter table public.vendas_sequencias force row level security;
alter table public.vendas_operacoes enable row level security;
alter table public.vendas_operacoes force row level security;
alter table public.vendas_operacao_itens enable row level security;
alter table public.vendas_operacao_itens force row level security;
alter table public.vendas_ordens_servico enable row level security;
alter table public.vendas_ordens_servico force row level security;
alter table public.vendas_os_materiais enable row level security;
alter table public.vendas_os_materiais force row level security;
alter table public.vendas_os_checklist enable row level security;
alter table public.vendas_os_checklist force row level security;
alter table public.vendas_os_anexos enable row level security;
alter table public.vendas_os_anexos force row level security;
alter table public.vendas_estoque_locais enable row level security;
alter table public.vendas_estoque_locais force row level security;
alter table public.vendas_estoque_saldos enable row level security;
alter table public.vendas_estoque_saldos force row level security;
alter table public.vendas_estoque_reservas enable row level security;
alter table public.vendas_estoque_reservas force row level security;
alter table public.vendas_estoque_movimentos enable row level security;
alter table public.vendas_estoque_movimentos force row level security;
alter table public.vendas_inventarios enable row level security;
alter table public.vendas_inventarios force row level security;
alter table public.vendas_inventario_itens enable row level security;
alter table public.vendas_inventario_itens force row level security;
alter table public.vendas_contas_receber enable row level security;
alter table public.vendas_contas_receber force row level security;
alter table public.vendas_contas_receber_eventos enable row level security;
alter table public.vendas_contas_receber_eventos force row level security;
alter table public.vendas_fiscal_configuracoes enable row level security;
alter table public.vendas_fiscal_configuracoes force row level security;
alter table public.vendas_fiscal_rascunhos enable row level security;
alter table public.vendas_fiscal_rascunhos force row level security;
alter table public.vendas_eventos enable row level security;
alter table public.vendas_eventos force row level security;

revoke all on table public.vendas_clientes, public.vendas_cliente_contatos,
  public.vendas_sequencias, public.vendas_operacoes, public.vendas_operacao_itens,
  public.vendas_ordens_servico, public.vendas_os_materiais, public.vendas_os_checklist,
  public.vendas_os_anexos, public.vendas_estoque_locais, public.vendas_estoque_saldos,
  public.vendas_estoque_reservas, public.vendas_estoque_movimentos,
  public.vendas_inventarios, public.vendas_inventario_itens,
  public.vendas_contas_receber, public.vendas_contas_receber_eventos, public.vendas_fiscal_configuracoes, public.vendas_fiscal_rascunhos,
  public.vendas_eventos from public, anon, authenticated;
grant select,insert,update on table public.vendas_clientes, public.vendas_cliente_contatos,
  public.vendas_sequencias, public.vendas_operacoes, public.vendas_operacao_itens,
  public.vendas_ordens_servico, public.vendas_os_materiais, public.vendas_os_checklist,
  public.vendas_os_anexos, public.vendas_estoque_locais, public.vendas_estoque_saldos,
  public.vendas_estoque_reservas, public.vendas_inventarios,
  public.vendas_inventario_itens, public.vendas_contas_receber,
  public.vendas_fiscal_configuracoes to service_role;
grant delete on table public.vendas_cliente_contatos, public.vendas_operacao_itens,
  public.vendas_os_materiais, public.vendas_os_checklist, public.vendas_os_anexos to service_role;
grant select,insert on table public.vendas_estoque_movimentos,
  public.vendas_contas_receber_eventos, public.vendas_fiscal_rascunhos,
  public.vendas_eventos to service_role;
grant usage,select on sequence public.vendas_eventos_id_seq to service_role;

revoke all on function public.vendas_touch_version() from public, anon, authenticated;
revoke all on function public.vendas_rejeitar_alteracao_imutavel() from public, anon, authenticated;
revoke all on function public.vendas_validar_produto_empresa() from public, anon, authenticated;
revoke all on function public.vendas_validar_item_editavel() from public, anon, authenticated;
revoke all on function public.vendas_validar_tabela_preco_empresa() from public, anon, authenticated;
revoke all on function public.vendas_validar_ordem_servico() from public, anon, authenticated;
revoke all on function public.vendas_reservar_numero_operacao(uuid,uuid) from public, anon, authenticated;
grant execute on function public.vendas_reservar_numero_operacao(uuid,uuid) to service_role;

comment on table public.vendas_operacoes is 'Orcamentos, pedidos, vendas e ordens de servico com retratos historicos do cliente, preco e pagamento.';
comment on column public.vendas_operacao_itens.custo_unitario_retrato is 'Dado interno; nunca deve ser devolvido sem a permissao catalog.view_cost.';
comment on table public.vendas_estoque_movimentos is 'Razao imutavel do estoque; saldo e reserva sao atualizados apenas por transacao server-side.';
comment on table public.vendas_contas_receber_eventos is 'Historico financeiro append-only; correcoes sao novos eventos, nunca alteracao retroativa.';
comment on table public.vendas_fiscal_configuracoes is 'Matriz fiscal versionada da empresa; somente uma publicacao revisada pode alimentar a preparacao server-side e cada publicacao gera o evento configuracao_fiscal_publicada.';
comment on table public.vendas_fiscal_rascunhos is 'Retrato fiscal comercial imutavel; nao reserva numero, nao assina e nao representa documento autorizado.';
comment on column public.vendas_clientes.documento_tipo is 'CPF e CNPJ são validados no servidor e permanecem vinculados exclusivamente ao perfil empresarial.';

commit;
