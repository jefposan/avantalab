create table if not exists public.vendas_mobile_conteudos (
  id uuid primary key default gen_random_uuid(),
  chave text unique,
  empresa_id uuid references public.empresas(id) on delete cascade,
  pagina text not null check (pagina in ('novidades', 'informacoes')),
  tipo text not null,
  titulo text not null,
  descricao text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists vendas_mobile_conteudos_pagina_data_idx
  on public.vendas_mobile_conteudos(pagina, criado_em desc);
create index if not exists vendas_mobile_conteudos_empresa_data_idx
  on public.vendas_mobile_conteudos(empresa_id, criado_em desc);

alter table public.vendas_mobile_conteudos enable row level security;

drop policy if exists vendas_mobile_conteudos_leitura on public.vendas_mobile_conteudos;
create policy vendas_mobile_conteudos_leitura
  on public.vendas_mobile_conteudos for select to authenticated
  using (
    ativo = true
    and (
      (pagina = 'informacoes' and empresa_id is null)
      or (
        pagina = 'novidades'
        and empresa_id in (
          select a.empresa_id from public.vendas_mobile_acessos a
          where a.user_id = auth.uid() and a.status = 'ativo'
          union
          select ue.empresa_id from public.usuarios_empresa ue
          where ue.user_id = auth.uid() and ue.status = 'ativo'
        )
      )
    )
  );

drop policy if exists vendas_mobile_conteudos_empresa_insert on public.vendas_mobile_conteudos;
create policy vendas_mobile_conteudos_empresa_insert
  on public.vendas_mobile_conteudos for insert to authenticated
  with check (
    pagina = 'novidades'
    and empresa_id in (
      select ue.empresa_id from public.usuarios_empresa ue
      where ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

drop policy if exists vendas_mobile_conteudos_empresa_delete on public.vendas_mobile_conteudos;
create policy vendas_mobile_conteudos_empresa_delete
  on public.vendas_mobile_conteudos for delete to authenticated
  using (
    pagina = 'novidades'
    and empresa_id in (
      select ue.empresa_id from public.usuarios_empresa ue
      where ue.user_id = auth.uid()
        and ue.status = 'ativo'
        and ue.perfil in ('gestor_master', 'administrador')
    )
  );

insert into public.vendas_mobile_conteudos (chave, empresa_id, pagina, tipo, titulo, descricao, criado_em)
values
  ('informacao-versao-vendas', null, 'informacoes', 'versao', 'Vendas AvantaLab', 'Aplicativo web progressivo com atualização contínua. As novas versões são disponibilizadas sem necessidade de reinstalar o aplicativo.', '2026-07-13T17:00:00-03:00'),
  ('informacao-evolucao-permanente', null, 'informacoes', 'melhorias', 'Evolução permanente', 'Os módulos de clientes, produtos, pedidos, pagamentos, agenda e dashboard recebem ajustes graduais de desempenho, segurança e experiência de uso.', '2026-07-13T16:00:00-03:00'),
  ('informacao-acompanhar-mudancas', null, 'informacoes', 'atualizacoes', 'Como acompanhar mudanças', 'Consulte a página Novidades para ver lançamentos, eventos e comunicados publicados pela sua empresa.', '2026-07-13T15:00:00-03:00'),
  ('informacao-participe', null, 'informacoes', 'participe', 'Dicas e sugestões', 'Ajude a melhorar o aplicativo compartilhando sua experiência com nossa equipe.', '2026-07-13T14:00:00-03:00')
on conflict (chave) do nothing;
