create or replace function public.notificar_solicitacao_vendas_pendente()
returns trigger language plpgsql security definer set search_path = public, extensions, vault as $$
begin
  if new.status = 'pendente' and (tg_op = 'INSERT' or old.status is distinct from 'pendente') then
    perform net.http_post(
      url := 'https://qzewxhdkwettnlmkjoqd.supabase.co/functions/v1/processar-solicitacao-vendas',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_edge_secret'),
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_edge_secret')
      ),
      body := jsonb_build_object('solicitacao_id', new.id),
      timeout_milliseconds := 30000
    );
  end if;
  return new;
end;
$$;

drop trigger if exists vendas_mobile_solicitacao_aviso on public.vendas_mobile_solicitacoes_acesso;
create trigger vendas_mobile_solicitacao_aviso
after insert or update of status on public.vendas_mobile_solicitacoes_acesso
for each row execute function public.notificar_solicitacao_vendas_pendente();
