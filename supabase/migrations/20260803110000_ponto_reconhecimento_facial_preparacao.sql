-- Controle de Ponto — preparação segura do adicional de reconhecimento facial.
-- Esta migração não armazena fotos, vídeos ou templates biométricos no banco
-- AvantaLab. A integração de captura somente poderá ser ativada após a
-- configuração da infraestrutura do provedor, retenção e revisão jurídica.

alter table public.ponto_config
  add column if not exists reconhecimento_facial_status text not null default 'desativado'
    check (reconhecimento_facial_status in ('desativado', 'preparacao', 'ativo', 'suspenso')),
  add column if not exists reconhecimento_facial_valor_centavos integer not null default 1490
    check (reconhecimento_facial_valor_centavos = 1490),
  add column if not exists reconhecimento_facial_franquia_mensal integer not null default 120
    check (reconhecimento_facial_franquia_mensal between 1 and 10000),
  add column if not exists reconhecimento_facial_aceite_versao text,
  add column if not exists reconhecimento_facial_aceite_em timestamptz,
  add column if not exists reconhecimento_facial_aceite_por uuid references auth.users(id) on delete set null;

alter table public.ponto_auditoria
  drop constraint if exists ponto_auditoria_evento_check;
alter table public.ponto_auditoria
  add constraint ponto_auditoria_evento_check check (evento in (
    'marcacao_registrada', 'funcionario_inativado', 'funcionario_reativado',
    'funcionario_cadastrado', 'reconhecimento_facial_preparado'
  ));

create table if not exists public.ponto_facial_funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  funcionario_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pendente_cadastro'
    check (status in ('pendente_cadastro', 'ativo', 'suspenso', 'removido')),
  consentimento_versao text,
  consentimento_em timestamptz,
  referencia_provedor_id text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  removido_em timestamptz,
  unique (empresa_id, funcionario_user_id)
);

create index if not exists ponto_facial_funcionarios_empresa_status_idx
  on public.ponto_facial_funcionarios (empresa_id, status);

create table if not exists public.ponto_facial_verificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  funcionario_user_id uuid not null references auth.users(id) on delete restrict,
  ponto_registro_id uuid references public.ponto_registros(id) on delete restrict,
  tipo text not null check (tipo in ('cadastro', 'marcacao')),
  provedor text not null default 'aws_rekognition',
  sessao_provedor_id text,
  status text not null check (status in ('iniciada', 'aprovada', 'reprovada', 'erro', 'dispensada')),
  confianca_prova_vida numeric(5,2),
  similaridade numeric(5,2),
  motivo text,
  criado_em timestamptz not null default now(),
  concluido_em timestamptz
);

create index if not exists ponto_facial_verificacoes_empresa_criado_idx
  on public.ponto_facial_verificacoes (empresa_id, criado_em desc);
create index if not exists ponto_facial_verificacoes_funcionario_criado_idx
  on public.ponto_facial_verificacoes (funcionario_user_id, criado_em desc);

alter table public.ponto_facial_funcionarios enable row level security;
alter table public.ponto_facial_verificacoes enable row level security;

drop policy if exists "ponto_facial_funcionarios_select_gestores" on public.ponto_facial_funcionarios;
create policy "ponto_facial_funcionarios_select_gestores" on public.ponto_facial_funcionarios
  for select using (
    exists (
      select 1 from public.usuarios_empresa ue
      where ue.empresa_id = ponto_facial_funcionarios.empresa_id
        and ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

drop policy if exists "ponto_facial_verificacoes_select_gestores" on public.ponto_facial_verificacoes;
create policy "ponto_facial_verificacoes_select_gestores" on public.ponto_facial_verificacoes
  for select using (
    exists (
      select 1 from public.usuarios_empresa ue
      where ue.empresa_id = ponto_facial_verificacoes.empresa_id
        and ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

-- Escritas são exclusivamente feitas por rota de servidor com service role.
-- Isso impede que funcionário habilite a si mesmo ou altere consentimentos.
