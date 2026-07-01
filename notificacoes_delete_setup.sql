-- ─────────────────────────────────────────────────────────────
-- Permite que o usuario APAGUE avisos/notificacoes que ele enxerga.
-- Rode no SQL Editor do Supabase.
--
-- Observacao: notificacoes "gerais da empresa" (user_id nulo) sao
-- compartilhadas — apagar remove para todos da empresa. As pessoais
-- (user_id = voce) sao apagadas so para voce.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "notificacoes_delete" on public.notificacoes;

create policy "notificacoes_delete" on public.notificacoes
  for delete using (
    (user_id = auth.uid())
    or (
      user_id is null
      and empresa_id in (
        select empresa_id from public.usuarios_empresa
        where user_id = auth.uid()
      )
    )
  );
