-- Pacotes importados e composição de custo para o Vendas Mobile.
-- Um pacote pertence ao usuário que o importou. Ao excluir o pacote,
-- todos os seus produtos vinculados também são removidos.

alter table public.vendas_mobile_pacotes
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists empresa_id uuid,
  add column if not exists numero text,
  add column if not exists origem text not null default 'manual',
  add column if not exists atualizado_em timestamptz not null default now();

alter table public.vendas_mobile_produtos
  add column if not exists preco_custo numeric(12,2) not null default 0;

-- Mantém o vínculo com um pacote e torna a exclusão do pacote integral.
alter table public.vendas_mobile_produtos
  drop constraint if exists vendas_mobile_produtos_pacote_origem_id_fkey;

alter table public.vendas_mobile_produtos
  add constraint vendas_mobile_produtos_pacote_origem_id_fkey
  foreign key (pacote_origem_id)
  references public.vendas_mobile_pacotes(id)
  on delete cascade;

create unique index if not exists vendas_mobile_pacotes_usuario_numero_uidx
  on public.vendas_mobile_pacotes (user_id, numero)
  where user_id is not null and numero is not null;

create index if not exists vendas_mobile_produtos_pacote_idx
  on public.vendas_mobile_produtos (pacote_origem_id);

drop policy if exists vendas_mobile_pacotes_read on public.vendas_mobile_pacotes;
drop policy if exists vendas_mobile_pacotes_own on public.vendas_mobile_pacotes;

create policy vendas_mobile_pacotes_read
  on public.vendas_mobile_pacotes for select to authenticated
  using (ativo = true and (oficial = true or user_id = auth.uid()));

create policy vendas_mobile_pacotes_own
  on public.vendas_mobile_pacotes for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
