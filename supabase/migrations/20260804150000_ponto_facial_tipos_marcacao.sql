alter table public.ponto_config
  add column if not exists reconhecimento_facial_tipos text[] not null default array['entrada']::text[]
  check (reconhecimento_facial_tipos <@ array['entrada', 'saida_refeicao', 'retorno_refeicao', 'saida']::text[]);
