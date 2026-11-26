begin;
-- Rotina exclusiva de preços: não recebe nem aplica campos cadastrais.
-- Planilhas antigas são aceitas; a revisão captura o estado ATUAL do servidor.
create or replace function public.custos_importar_somente_precos_rpc(
 p_empresa_id uuid,p_arquivo_nome text,p_precos jsonb,p_revisao text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 item jsonb;produto public.vendas_mobile_catalogo_produtos;tabela public.custos_tabelas_preco;
 valor numeric;anterior numeric;explicito numeric;padrao_novo numeric;alterado boolean;
 estado jsonb:='[]';mudancas jsonb:='[]';padroes jsonb;revisao text;
 alterados int:=0;preservados int:=0;produtos int:=0;
begin
 if not public.custos_pode_acessar_empresa(p_empresa_id,true) then
  raise exception 'Sem permissão para importar preços.' using errcode='42501';
 end if;
 if auth.uid() is not null and not public.usuario_area_rpc_restricao('custos',jsonb_build_object('p_empresa_id',p_empresa_id)) then
  raise exception 'Esta área não foi liberada.' using errcode='42501';
 end if;
 if jsonb_typeof(p_precos) is distinct from 'array' or jsonb_array_length(p_precos)=0 or jsonb_array_length(p_precos)>50000 then raise exception 'Selecione preços para importar (máximo 50 mil células).';end if;
 if exists(select 1 from jsonb_array_elements(p_precos) x where jsonb_typeof(x) is distinct from 'object'
  or coalesce(x->>'produto_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  or exists(select 1 from jsonb_object_keys(x) k where k not in ('produto_id','sku','tabela_codigo','preco'))) then raise exception 'Estrutura de preços inválida.';end if;
 if exists(select 1 from jsonb_array_elements(p_precos) x group by (x->>'produto_id')::uuid,upper(trim(x->>'tabela_codigo')) having count(*)>1) then raise exception 'Produto repetido na mesma tabela.';end if;
 -- Ordem compatível com reajustes. Trava também inserções concorrentes de preços
 -- específicos ainda inexistentes, incluindo gravações feitas por outras rotinas.
 perform 1 from public.custos_tabelas_preco where empresa_id=p_empresa_id order by id for update;
 perform 1 from public.vendas_mobile_catalogo_produtos p join public.vendas_mobile_catalogos c on c.id=p.catalogo_id
  where c.empresa_id=p_empresa_id and p.id in(select (x->>'produto_id')::uuid from jsonb_array_elements(p_precos) x) order by p.id for update of p;
 lock table public.custos_tabela_preco_itens in share row exclusive mode;
 select coalesce(jsonb_object_agg(lower(x->>'produto_id'),round((x->>'preco')::numeric,2)),'{}') into padroes
 from jsonb_array_elements(p_precos) x join public.custos_tabelas_preco t
 on t.empresa_id=p_empresa_id and t.codigo=upper(trim(x->>'tabela_codigo')) and t.padrao where x->>'preco' is not null;
 for item in select value from jsonb_array_elements(p_precos) order by value->>'tabela_codigo',value->>'produto_id' loop
  select p.* into produto from public.vendas_mobile_catalogo_produtos p join public.vendas_mobile_catalogos c on c.id=p.catalogo_id
   where p.id=(item->>'produto_id')::uuid and c.empresa_id=p_empresa_id and c.excluido_em is null and p.excluido_em is null;
  if not found or upper(trim(produto.sku))<>upper(trim(coalesce(item->>'sku',''))) then raise exception 'Produto não localizado com segurança nesta empresa.';end if;
  select * into tabela from public.custos_tabelas_preco where empresa_id=p_empresa_id and codigo=upper(trim(item->>'tabela_codigo')) and (ativo or padrao);
  if not found then raise exception 'Tabela não disponível nesta empresa.';end if;
  explicito:=null;
  select preco into explicito from public.custos_tabela_preco_itens where tabela_preco_id=tabela.id and produto_id=produto.id;
  anterior:=case when tabela.padrao then produto.preco_venda else coalesce(explicito,produto.preco_venda,0) end;
  valor:=null;
  if item->>'preco' is not null then
   valor:=(item->>'preco')::numeric;
   if valor<0 or valor>9999999999.99 or valor::text in('NaN','Infinity','-Infinity') then raise exception 'Preço inválido para %.',produto.sku;end if;
   valor:=round(valor,2);
  end if;
  padrao_novo:=coalesce((padroes->>produto.id::text)::numeric,produto.preco_venda);
  alterado:=valor is not null and (anterior is distinct from valor
   or (not tabela.padrao and explicito is null and padrao_novo is distinct from valor));
  -- Inclui a entrada e o retrato anterior, mas nunca a data antiga da exportação.
  estado:=estado||jsonb_build_array(jsonb_build_object('entrada',item,'anterior',anterior,'explicito',explicito,'produto_revisao',produto.atualizado_em,'tabela',to_jsonb(tabela)));
  if alterado then
   alterados:=alterados+1;
   mudancas:=mudancas||jsonb_build_array(jsonb_build_object('produto_id',produto.id,'sku',produto.sku,'tabela_id',tabela.id,'tabela',tabela.nome,'padrao',tabela.padrao,'anterior',anterior,'novo',valor));
  else preservados:=preservados+1;end if;
 end loop;
 revisao:=md5(jsonb_build_object('empresa',p_empresa_id,'estado',estado)::text);
 if p_revisao is not null and p_revisao<>revisao then raise exception 'Os preços ou produtos mudaram após a revisão. Revise novamente antes de confirmar.' using errcode='40001';end if;
 if p_revisao is not null then
  for item in select value from jsonb_array_elements(mudancas) loop
   if (item->>'padrao')::boolean then
    update public.vendas_mobile_catalogo_produtos set preco_venda=(item->>'novo')::numeric,atualizado_em=now() where id=(item->>'produto_id')::uuid;
   else
    insert into public.custos_tabela_preco_itens(tabela_preco_id,produto_id,preco) values((item->>'tabela_id')::uuid,(item->>'produto_id')::uuid,(item->>'novo')::numeric)
     on conflict(tabela_preco_id,produto_id) do update set preco=excluded.preco,atualizado_em=now();
   end if;
   insert into public.custos_tabela_preco_historico(empresa_id,tabela_preco_id,produto_id,preco_anterior,preco_novo,origem)
    values(p_empresa_id,(item->>'tabela_id')::uuid,(item->>'produto_id')::uuid,(item->>'anterior')::numeric,(item->>'novo')::numeric,'importacao');
  end loop;
  if alterados>0 then
   insert into public.custos_importacoes_produtos_precos(empresa_id,arquivo_nome,exportado_em,produtos_criados,produtos_atualizados,precos_atualizados)
    values(p_empresa_id,coalesce(nullif(trim(p_arquivo_nome),''),'planilha.xlsx'),null,0,0,alterados);
  end if;
 end if;
 select count(distinct x->>'produto_id') into produtos from jsonb_array_elements(p_precos) x;
 return jsonb_build_object('revisao',revisao,'alterados',alterados,'preservados',preservados,'produtos',produtos,'mudancas',mudancas,'aplicado',p_revisao is not null);
end;$$;
revoke all on function public.custos_importar_somente_precos_rpc(uuid,text,jsonb,text) from public,anon;
grant execute on function public.custos_importar_somente_precos_rpc(uuid,text,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;
