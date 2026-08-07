# AvantaProjetos — módulo oficial Web

Este diretório segue o `PADRAO-AVANTA`.

Antes de escrever código, leia integralmente:

`/Users/JEFF/avantalab/docs/padrao-avanta/README.md`

e os documentos indicados para novos módulos.

## Contrato

- A rota é `/projetos`, exclusiva de navegador e aberta em tela total na mesma guia.
- O módulo recebe `empresaId` como contexto, mas servidor e RLS sempre validam
  vínculo, instalação, validade e hierarquia.
- Persistência oficial usa `projetos_documentos`, por empresa, com RLS.
- Gestor Master, Administrador e Operador Completo editam; Operador Simples
  somente visualiza. Instalação e remoção são exclusivas de Gestor/Administrador.
- A migration histórica em `database/` permanece apenas como registro do estudo
  normalizado. A migration oficial fica em `supabase/migrations`.
- Não integrar este módulo ao aplicativo mobile.
