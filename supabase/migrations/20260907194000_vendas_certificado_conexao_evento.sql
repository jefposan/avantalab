-- Permite auditar a consulta de disponibilidade fiscal feita com um A1 ativo.
-- O evento guarda apenas data e booleanos; certificado, senha e resposta SOAP
-- continuam proibidos pelo contrato do cofre e ausentes do payload público.
begin;

alter table fiscal_private.certificate_events
  drop constraint if exists nfe_certificate_events_type_check;

alter table fiscal_private.certificate_events
  add constraint nfe_certificate_events_type_check check (
    event_type in (
      'certificate.installed',
      'certificate.replaced',
      'certificate.activated',
      'certificate.blocked',
      'certificate.connection_checked'
    )
  );

commit;
