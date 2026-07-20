create table public.rep_p_certificados (
  id uuid primary key default gen_random_uuid(),
  modo text not null check (modo in ('homologacao', 'producao')),
  arquivo_criptografado text not null,
  senha_criptografada text not null,
  impressao_sha256 text not null,
  validade_inicio timestamptz not null,
  validade_fim timestamptz not null,
  ativo boolean not null default false,
  criado_em timestamptz not null default now(),
  substituido_em timestamptz
);

create unique index rep_p_certificados_um_ativo_idx on public.rep_p_certificados ((ativo)) where ativo;
create index rep_p_certificados_criado_em_idx on public.rep_p_certificados (criado_em desc);
alter table public.rep_p_certificados enable row level security;

create table public.rep_p_certificados_auditoria (
  id uuid primary key default gen_random_uuid(),
  certificado_id uuid references public.rep_p_certificados(id) on delete restrict,
  evento text not null check (evento in ('certificado_cadastrado', 'certificado_substituido')),
  modo text not null check (modo in ('homologacao', 'producao')),
  validade_fim timestamptz not null,
  impressao_sha256 text not null,
  ocorrido_em timestamptz not null default now()
);
create index rep_p_certificados_auditoria_ocorrido_idx on public.rep_p_certificados_auditoria (ocorrido_em desc);
alter table public.rep_p_certificados_auditoria enable row level security;

create function public.rep_p_certificados_sem_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  raise exception 'O histórico de certificados REP-P não pode ser apagado.';
end;
$$;
create trigger rep_p_certificados_sem_delete before delete on public.rep_p_certificados for each row execute function public.rep_p_certificados_sem_delete();
create trigger rep_p_certificados_auditoria_sem_update before update on public.rep_p_certificados_auditoria for each row execute function public.rep_p_certificados_sem_delete();
create trigger rep_p_certificados_auditoria_sem_delete before delete on public.rep_p_certificados_auditoria for each row execute function public.rep_p_certificados_sem_delete();
