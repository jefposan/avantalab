-- O contador do NSR e interno ao trigger REP-P e nao deve ser exposto pela Data API.
alter table public.ponto_nsr_contadores enable row level security;

revoke all privileges
on table public.ponto_nsr_contadores
from anon, authenticated;
