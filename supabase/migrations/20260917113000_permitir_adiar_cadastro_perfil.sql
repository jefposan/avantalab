-- O adiamento é uma decisão explícita do gestor: o perfil permanece utilizável
-- até que ele acione uma funcionalidade que exige dados cadastrais completos.
alter table public.cadastros_perfil
  add column if not exists adiado_em timestamptz;

comment on column public.cadastros_perfil.adiado_em is
  'Data em que o gestor escolheu concluir o cadastro apenas quando uma ação obrigatória o exigir.';
