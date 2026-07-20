-- Base técnica da ARP: espelho imutável das marcações com NSR sequencial por empresa.
create table public.ponto_nsr_contadores (
  empresa_id uuid primary key references public.empresas(id) on delete restrict,
  proximo_nsr bigint not null default 1 check (proximo_nsr > 0),
  atualizado_em timestamptz not null default now()
);

create table public.ponto_arp (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  nsr bigint not null check (nsr > 0),
  ponto_registro_id uuid not null unique references public.ponto_registros(id) on delete restrict,
  trabalhador_user_id uuid not null references auth.users(id) on delete restrict,
  tipo text not null,
  data_hora timestamptz not null,
  dados_registro jsonb not null,
  criado_em timestamptz not null default now(),
  unique (empresa_id, nsr)
);
create index ponto_arp_empresa_nsr_idx on public.ponto_arp(empresa_id, nsr);

alter table public.ponto_arp enable row level security;
create policy "ponto_arp_select_gestores" on public.ponto_arp for select using (
  empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid() and status = 'ativo' and perfil in ('gestor_master', 'administrador'))
);

create function public.ponto_arp_sem_alteracao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  raise exception 'A ARP é imutável.';
end;
$$;
create trigger ponto_arp_sem_update before update on public.ponto_arp for each row execute function public.ponto_arp_sem_alteracao();
create trigger ponto_arp_sem_delete before delete on public.ponto_arp for each row execute function public.ponto_arp_sem_alteracao();

create function public.ponto_gerar_arp()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nsr bigint;
begin
  insert into public.ponto_nsr_contadores (empresa_id, proximo_nsr)
  values (new.empresa_id, 2)
  on conflict (empresa_id) do update
    set proximo_nsr = public.ponto_nsr_contadores.proximo_nsr + 1,
        atualizado_em = now()
  returning proximo_nsr - 1 into v_nsr;

  insert into public.ponto_arp (empresa_id, nsr, ponto_registro_id, trabalhador_user_id, tipo, data_hora, dados_registro)
  values (new.empresa_id, v_nsr, new.id, new.user_id, new.tipo, new.registrado_em,
    jsonb_build_object('dia', new.dia, 'latitude', new.latitude, 'longitude', new.longitude, 'precisao_m', new.precisao_m, 'dispositivo', new.dispositivo, 'hash_legado', new.hash));
  return new;
end;
$$;

create trigger ponto_registros_gerar_arp after insert on public.ponto_registros
for each row execute function public.ponto_gerar_arp();

with ordenados as (
  select id, empresa_id, row_number() over (partition by empresa_id order by registrado_em, criado_em, id) as nsr
  from public.ponto_registros
)
insert into public.ponto_arp (empresa_id, nsr, ponto_registro_id, trabalhador_user_id, tipo, data_hora, dados_registro)
select r.empresa_id, o.nsr, r.id, r.user_id, r.tipo, r.registrado_em,
  jsonb_build_object('dia', r.dia, 'latitude', r.latitude, 'longitude', r.longitude, 'precisao_m', r.precisao_m, 'dispositivo', r.dispositivo, 'hash_legado', r.hash)
from ordenados o join public.ponto_registros r on r.id = o.id;

insert into public.ponto_nsr_contadores (empresa_id, proximo_nsr)
select empresa_id, max(nsr) + 1 from public.ponto_arp group by empresa_id
on conflict (empresa_id) do update set proximo_nsr = excluded.proximo_nsr, atualizado_em = now();
