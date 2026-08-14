# Serviços de consultas cadastrais

Camada usada pelo AvantaLab oficial. As telas experimentais da Central de
Consultas foram preservadas fora da publicação, em AvantaLab Projetos.

## Fluxo atual

Cadastro de perfil → `POST /api/consultas/cnpj` → `providers/cnpjws.ts` →
`normalizers/cnpj.ts` → `EmpresaConsultada`.

A interface consome apenas `EmpresaConsultada` e nunca conhece o JSON original
do provedor. Validação e sanitização ficam centralizadas em
`validators/cnpj.ts`, inclusive a preparação para CNPJ alfanumérico.

## Limites desta versão

- Somente o CNPJ.ws é consultado.
- Não há consulta funcional de CPF, crédito, protestos ou restrições.
- Não há cache. Se necessário futuramente, ele deve entrar em uma camada de
  serviço server-side entre a rota e o provider, com chave pelo documento
  normalizado, TTL curto e sem cache público compartilhado.
- Não há persistência própria. A consulta cadastral apenas devolve dados
  normalizados para o fluxo que a solicitou e não cria tabela ou política RLS.

## Evolução segura

Quando existir um contexto oficial de empresa ativa, o contrato
`ConsultaCadastralParaSalvar` poderá alimentar uma tabela própria, vinculada a
`empresa_id` e `user_id`, com RLS baseada em `usuarios_empresa`. O mesmo serviço
deverá concentrar idempotência, histórico, reabertura, reimpressão e filtros por
documento, empresa, período, tipo e usuário.
