# Novos módulos e sistemas plugados

## Estrutura recomendada

```text
app/modules/<slug>/
├── manifest.ts
├── permissions.ts
├── routes.ts
├── types.ts
├── components/
├── screens/
├── services/
├── formatters/
├── ava-context.ts
└── README.md
```

Adaptar somente quando a plataforma exigir, preservando os mesmos contratos.

## Manifesto mínimo

Declarar identificador estável, nome, versão, público, permissões, menus, rotas,
cards, preferências, suporte web/mobile, integrações financeiras e contribuição
para a Ava. Ativação e autorização devem ser validadas no servidor.

## Dados e segurança

- Dados do módulo usam tabelas e serviços próprios, com `empresa_id` e RLS quando
  aplicável.
- Nunca expor segredo ou service role ao cliente.
- Integração financeira usa o contrato central e origem rastreável.
- Mudança de banco entrega migração, índices, políticas, rollback ou estratégia
  explícita de recuperação.

## Integração visual

- Consumir tipografia, tema, `corPrimaria`, campos e componentes oficiais.
- Cards seguem o padrão geral do módulo e do PADRÃO AVANTA. Usar AvantaShell
  somente quando solicitado ou declarado no manifesto/especificação.
- Não copiar header, menu, autenticação ou preferências do núcleo.
- Entregar estados responsivos e acessíveis.

## Integração com a Ava

Definir o que a Ava precisa conhecer, quais ações pode orientar e quais dados não
podem entrar no contexto. Atualizar manual operacional e conhecimento executável
quando houver impacto.

## Sistema externo ou novo projeto

Adicionar ao `AGENTS.md` do projeto:

```md
Este projeto segue o PADRÃO AVANTA.
Antes de escrever código, leia integralmente:
/Users/JEFF/avantalab/docs/padrao-avanta/README.md
e os documentos indicados para o trabalho.
```

Registrar também diferenças inevitáveis de tecnologia sem redefinir a identidade.
