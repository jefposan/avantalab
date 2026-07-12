create table if not exists public.cadastros_perfil (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  nome_fantasia text,
  nome_responsavel text,
  razao_social text,
  tipo_documento text check (tipo_documento in ('cpf', 'cnpj')),
  documento text check (
    documento is null
    or (tipo_documento = 'cpf' and documento ~ '^[0-9]{11}$')
    or (tipo_documento = 'cnpj' and documento ~ '^[0-9]{14}$')
  ),
  tipo_empresa text check (tipo_empresa in ('autonomo', 'mei', 'me', 'epp', 'ltda', 'sa', 'associacao', 'cooperativa', 'outro')),
  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  telefone text,
  whatsapp text,
  email_empresa text,
  site text,
  instagram text,
  inscricao_estadual text,
  inscricao_estadual_isento boolean not null default false,
  inscricao_municipal text,
  inscricao_municipal_isento boolean not null default false,
  regime_tributario text check (regime_tributario in ('mei_simei', 'simples_nacional', 'lucro_presumido', 'lucro_real', 'lucro_arbitrado', 'imune', 'isenta', 'nao_aplicavel', 'outro')),
  obrigatorio_em timestamptz not null default (now() + interval '7 days'),
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists cadastros_perfil_cnpj_unique_idx
  on public.cadastros_perfil (documento)
  where tipo_documento = 'cnpj' and documento is not null and documento <> '';

create index if not exists cadastros_perfil_documento_idx
  on public.cadastros_perfil (documento);

alter table public.cadastros_perfil enable row level security;

drop policy if exists "cadastros_perfil_select_vinculado" on public.cadastros_perfil;
create policy "cadastros_perfil_select_vinculado"
  on public.cadastros_perfil for select
  using (
    empresa_id in (
      select ue.empresa_id from public.usuarios_empresa ue
      where ue.user_id = auth.uid() and ue.status = 'ativo'
    )
  );

-- Escritas passam exclusivamente pela API, que valida vínculo e papel. Sem
-- policy de insert/update, o RLS bloqueia alterações diretas pelo navegador.
drop policy if exists "cadastros_perfil_insert_gestor" on public.cadastros_perfil;
drop policy if exists "cadastros_perfil_update_gestor" on public.cadastros_perfil;

create or replace function public.inicializar_cadastro_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cadastros_perfil (empresa_id, nome_fantasia, obrigatorio_em)
  values (new.id, new.nome, now() + interval '7 days')
  on conflict (empresa_id) do nothing;
  return new;
end;
$$;

drop trigger if exists empresas_inicializar_cadastro_perfil on public.empresas;
create trigger empresas_inicializar_cadastro_perfil
  after insert on public.empresas
  for each row execute function public.inicializar_cadastro_perfil();

-- A base existente recebe sete dias completos a partir da publicacao.
insert into public.cadastros_perfil (empresa_id, nome_fantasia, obrigatorio_em)
select e.id, e.nome, now() + interval '7 days'
from public.empresas e
on conflict (empresa_id) do nothing;
