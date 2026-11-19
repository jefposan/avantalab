-- Manutenção pontual autorizada pelo titular em 19/11/2026.
-- Arquivamento operacional: só insere marcações e auditoria. Não cancela NF-e,
-- não altera emissão/reservas/rascunhos e não remove arquivos/históricos.
begin;
set local lock_timeout='5s';
set local statement_timeout='15s';
do $$
declare
 c constant uuid := 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
 ids constant uuid[] := array['8963fceb-8bd7-4dc6-9b96-4f3ecfdf5c48','9303eac3-ccfe-41b8-99b7-df2ee91a7c87']::uuid[];
 antes jsonb;
 depois jsonb;
 n integer;
begin
 perform 1 from public.vendas_fiscal_rascunhos where empresa_id=c and id=any(ids) order by id for update;
 perform 1 from fiscal_private.emissions where company_id=c and draft_id=any(ids::text[]) order by id for update;
 select count(*) into n from fiscal_private.emissions e
 where e.company_id=c and e.id=any(ids) and e.draft_id=e.id::text
 and e.environment='homologacao' and e.state='danfe_ready' and e.status_code='100'
 and e.series='2' and (e.authorized_at at time zone 'America/Sao_Paulo')::date=date '2026-11-06'
 and ((e.id=ids[1] and e.number=1 and e.protocol_number='135260009867036')
   or (e.id=ids[2] and e.number=2 and e.protocol_number='135260009867182'));
 if n<>2 then raise exception 'As duas notas não correspondem exatamente à homologação autorizada. Nenhuma alteração.'; end if;
 if exists(select 1 from fiscal_private.draft_deletions where company_id=c and draft_id=any(ids)) then
  raise exception 'Já existe marcação operacional; conferir o recibo antes de repetir.';
 end if;
 select count(*) into n from fiscal_private.artifacts where company_id=c and emission_id=any(ids);
 if n<>8 then raise exception 'Inventário de arquivos divergente. Nenhuma alteração.'; end if;
 if exists(select 1 from unnest(ids) target(id) where not exists(select 1 from fiscal_private.artifacts a where a.company_id=c and a.emission_id=target.id and a.artifact_type='processed_xml') or not exists(select 1 from fiscal_private.artifacts a where a.company_id=c and a.emission_id=target.id and a.artifact_type='danfe_pdf')) then
  raise exception 'XML protocolado ou DANFE ausente. Nenhuma alteração.';
 end if;
 select jsonb_build_object(
  'emissoes', (select md5(coalesce(jsonb_agg(to_jsonb(e) order by e.id)::text,'[]')) from fiscal_private.emissions e where e.company_id=c),
  'producao', (select md5(coalesce(jsonb_agg(to_jsonb(e) order by e.id)::text,'[]')) from fiscal_private.emissions e where e.company_id=c and e.environment='producao'),
  'arquivos', (select md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,'[]')) from fiscal_private.artifacts a where a.company_id=c),
  'reservas', (select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.id)::text,'[]')) from fiscal_private.number_reservations r where r.company_id=c),
  'rascunhos', (select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.id)::text,'[]')) from public.vendas_fiscal_rascunhos r where r.empresa_id=c)
 ) into antes;
 insert into fiscal_private.draft_deletions(company_id,draft_id,emission_id,actor_id,previous_state,series,number)
 select c,e.id,e.id,null,e.state,e.series,e.number from fiscal_private.emissions e where e.company_id=c and e.id=any(ids);
 get diagnostics n=row_count;
 if n<>2 then raise exception 'Quantidade de marcações divergente; revertendo.'; end if;
 select jsonb_build_object(
  'emissoes', (select md5(coalesce(jsonb_agg(to_jsonb(e) order by e.id)::text,'[]')) from fiscal_private.emissions e where e.company_id=c),
  'producao', (select md5(coalesce(jsonb_agg(to_jsonb(e) order by e.id)::text,'[]')) from fiscal_private.emissions e where e.company_id=c and e.environment='producao'),
  'arquivos', (select md5(coalesce(jsonb_agg(to_jsonb(a) order by a.id)::text,'[]')) from fiscal_private.artifacts a where a.company_id=c),
  'reservas', (select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.id)::text,'[]')) from fiscal_private.number_reservations r where r.company_id=c),
  'rascunhos', (select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.id)::text,'[]')) from public.vendas_fiscal_rascunhos r where r.empresa_id=c)
 ) into depois;
 if antes is distinct from depois then raise exception 'Registro fiscal ou arquivo alterado; revertendo todo o arquivamento.'; end if;
 insert into public.vendas_eventos(empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,criado_por)
 select c,'configuracao_fiscal',e.id,'nota_homologacao_arquivada',
 'Arquivamento operacional de nota de homologação autorizado pelo titular. Arquivos e histórico preservados; não é cancelamento nem exclusão fiscal.',
 jsonb_build_object('origem','manutencao_administrativa_autorizada','autorizacao','titular_chat_2026-11-19','ambiente',e.environment,'serie',e.series,'numero',e.number,'emissao_preservada',true,'arquivos_preservados',8,'arquivadas_no_lote',2,'producao_alterada',false,'hashes_antes',antes,'hashes_depois',depois),null
 from fiscal_private.emissions e where e.company_id=c and e.id=any(ids);
 get diagnostics n=row_count;
 if n<>2 then raise exception 'Auditoria incompleta; revertendo.'; end if;
end $$;
commit;
select recurso_id,metadados from public.vendas_eventos where empresa_id='ec9604fd-38f2-429b-9c00-c4bc6c642b0e' and evento='nota_homologacao_arquivada' and recurso_id in ('8963fceb-8bd7-4dc6-9b96-4f3ecfdf5c48','9303eac3-ccfe-41b8-99b7-df2ee91a7c87') order by recurso_id;

