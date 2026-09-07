-- Reaplica de forma idempotente a limpeza do marcador técnico legado.
-- A dollar-quoted string preserva a expressão regular sem ambiguidade de escape.
update public.vendas_mobile_clientes
set observacoes = null,
    atualizado_em = now()
where observacoes ~* $legacy_import_note$^Importado de tridium_mysql_20260715; cliente legado #[0-9]+(; profissão: .+)?\.$legacy_import_note$;
