alter table public.push_subscriptions
  add column if not exists app_origem text;

update public.push_subscriptions
set app_origem = case
  when user_id in (
    select user_id
    from public.ponto_funcionarios
    where user_id is not null
  ) then 'ponto'
  else 'mobile'
end
where app_origem is null;

alter table public.push_subscriptions
  alter column app_origem set default 'mobile';

alter table public.push_subscriptions
  alter column app_origem set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_app_origem_check'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_app_origem_check
      check (app_origem in ('mobile', 'ponto'));
  end if;
end $$;

create index if not exists push_subscriptions_app_origem_idx
  on public.push_subscriptions (app_origem);
