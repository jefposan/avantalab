-- Exemplos para criar cupons (rodar no Supabase → SQL Editor).
-- Os cupons já valem para qualquer perfil (empresa ou pessoal) que resgatar.

-- 1) Cupom VITALÍCIO (sem prazo) — ideal para avaliadores/testadores.
insert into public.cupons (codigo, tipo, ativo)
values ('AVALIADOR', 'vitalicio', true);

-- 2) Cupom por PERÍODO (ex.: 3 meses grátis), com limite de 50 usos.
insert into public.cupons (codigo, tipo, duracao_meses, max_usos, ativo)
values ('TESTE3MESES', 'periodo', 3, 50, true);

-- 3) Cupom por período com validade do próprio cupom (só resgatável até a data).
insert into public.cupons (codigo, tipo, duracao_meses, validade, ativo)
values ('LANCAMENTO', 'periodo', 1, '2026-12-31T23:59:59Z', true);

-- Consultar cupons e resgates:
-- select * from public.cupons order by criado_em desc;
-- select * from public.cupons_resgates order by resgatado_em desc;
