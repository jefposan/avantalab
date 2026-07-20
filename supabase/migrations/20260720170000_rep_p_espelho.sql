alter table public.rep_p_documentos_gerados drop constraint rep_p_documentos_gerados_tipo_check;
alter table public.rep_p_documentos_gerados add constraint rep_p_documentos_gerados_tipo_check check (tipo in ('afd', 'manual', 'espelho'));
