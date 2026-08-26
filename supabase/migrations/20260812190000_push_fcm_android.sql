-- Inscrições nativas do Android. O token FCM é separado do endpoint Web Push
-- para que a mesma pessoa possa receber avisos no PWA, iPhone e Android.
alter table public.push_subscriptions
  add column if not exists fcm_token text;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_canal_check;

alter table public.push_subscriptions
  add constraint push_subscriptions_canal_check check (canal in ('web', 'apns', 'fcm'));

create unique index if not exists push_subscriptions_fcm_token_uidx
  on public.push_subscriptions (fcm_token)
  where fcm_token is not null;
