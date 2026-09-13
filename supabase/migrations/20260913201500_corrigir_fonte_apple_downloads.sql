-- A versão v2 representa a leitura corrigida de instalações iniciais da Apple.
-- Mantemos a fonte no registro para permitir reprocessamentos auditáveis.

alter table public.lojas_downloads_diarios
  drop constraint if exists lojas_downloads_diarios_fonte_check;

alter table public.lojas_downloads_diarios
  add constraint lojas_downloads_diarios_fonte_check
  check (fonte in ('apple_sales_report', 'apple_sales_report_v2', 'google_play_bulk_report'));
