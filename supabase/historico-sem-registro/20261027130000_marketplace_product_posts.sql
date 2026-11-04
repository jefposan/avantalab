begin;
-- Arquivos privados no Storage; somente metadados e versão no banco transacional.
create table public.marketplace_product_posts (
 id uuid primary key,
 empresa_id uuid not null references public.empresas(id),
 product_id uuid not null,
 revision integer not null check(revision>0),
 draft jsonb not null check(jsonb_typeof(draft)='object' and octet_length(draft::text)<=12000),
 image_path text not null,
 source_path text not null,
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(empresa_id,product_id,revision),
 foreign key(empresa_id,product_id) references public.marketplace_products(empresa_id,id)
);
alter table public.marketplace_product_posts enable row level security;
revoke all on public.marketplace_product_posts from anon,authenticated;
grant select,insert on public.marketplace_product_posts to service_role;

create function public.marketplace_product_post_save(p_empresa uuid,p_product uuid,p_actor uuid,p_request uuid,p_revision integer,p_draft jsonb,p_hash text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare prior public.marketplace_product_posts; latest integer; folder text;
begin
 if not exists(select 1 from public.empresa_modulos where empresa_id=p_empresa and modulo_id='marketplaces' and ativo and (expira_em is null or expira_em>now()))
 or not (exists(select 1 from public.usuarios_empresa where empresa_id=p_empresa and user_id=p_actor and status='ativo')
 or exists(select 1 from public.marketplace_price_users where empresa_id=p_empresa and user_id=p_actor and ativo)) then
 raise exception 'Sem acesso ao AvantaPreços.' using errcode='P0001'; end if;
 if not exists(select 1 from public.marketplace_products where empresa_id=p_empresa and id=p_product and archived_at is null) then
 raise exception 'Produto indisponível nesta empresa.' using errcode='P0001'; end if;
 if p_request is null or p_revision is null or p_revision<0 or p_hash is null or p_draft is null then raise exception 'Post inválido.' using errcode='P0001'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_empresa::text||':'||p_product::text,0));
 select * into prior from public.marketplace_product_posts where id=p_request;
 if found then
 if prior.empresa_id<>p_empresa or prior.product_id<>p_product or prior.created_by is distinct from p_actor or prior.content_hash<>p_hash or prior.draft<>p_draft then
 raise exception 'Esta tentativa já foi usada com outros dados.' using errcode='P0001'; end if;
 return to_jsonb(prior); end if;
 select coalesce(max(revision),0) into latest from public.marketplace_product_posts where empresa_id=p_empresa and product_id=p_product;
 if latest<>p_revision then raise exception 'Outro usuário atualizou o post. Feche e abra novamente antes de editar.' using errcode='P0001'; end if;
 folder:=p_empresa::text||'/'||p_product::text||'/'||p_request::text;
 insert into public.marketplace_product_posts(id,empresa_id,product_id,revision,draft,image_path,source_path,content_hash,created_by)
 values(p_request,p_empresa,p_product,latest+1,p_draft,folder||'/post.png',folder||'/source.jpg',p_hash,p_actor) returning * into prior;
 return to_jsonb(prior);
end $$;
revoke all on function public.marketplace_product_post_save(uuid,uuid,uuid,uuid,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.marketplace_product_post_save(uuid,uuid,uuid,uuid,integer,jsonb,text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('marketplace-product-posts','marketplace-product-posts',false,3145728,array['image/png','image/jpeg'])
on conflict(id) do nothing;
-- Sem políticas de acesso direto: todas as operações passam pela API autorizada.
notify pgrst,'reload schema';

commit;
