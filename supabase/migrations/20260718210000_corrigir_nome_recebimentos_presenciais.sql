-- Corrige somente o nome exibido; o identificador técnico permanece estável.
update public.modulos
set nome = 'Recebimentos Presenciais'
where id = 'recebimentos_presencial'
  and nome is distinct from 'Recebimentos Presenciais';
