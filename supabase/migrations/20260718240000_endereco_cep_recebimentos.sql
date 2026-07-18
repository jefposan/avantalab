-- Endereço estruturado de subempresas, preenchido a partir da consulta de CEP.
alter table public.recebimentos_subempresas
  add column if not exists cep text not null default '',
  add column if not exists bairro text not null default '',
  add column if not exists cidade text not null default '',
  add column if not exists estado text not null default '';
