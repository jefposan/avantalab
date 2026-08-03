alter table public.push_subscriptions
  add column if not exists canal text not null default 'web',
  add column if not exists apns_token text;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_canal_check;

alter table public.push_subscriptions
  add constraint push_subscriptions_canal_check check (canal in ('web', 'apns'));

create unique index if not exists push_subscriptions_apns_token_uidx
  on public.push_subscriptions (apns_token)
  where apns_token is not null;
