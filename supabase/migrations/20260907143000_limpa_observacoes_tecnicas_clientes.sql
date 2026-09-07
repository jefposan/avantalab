-- Remove somente a anotação técnica criada pelo importador MySQL legado.
-- Observações manuais e qualquer texto fora deste formato permanecem intactos.
update public.vendas_mobile_clientes
set observacoes = null,
    atualizado_em = now()
where observacoes ~* '^Importado de tridium_mysql_20260715; cliente legado #[0-9]+(; profissão: .+)?\.$';
