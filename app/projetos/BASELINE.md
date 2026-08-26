# Registro inicial — AvantaProjetos

Diagnóstico realizado em 07/08/2026 antes da criação do módulo.

- Repositório: `/Users/JEFF/avantalab`.
- Branch ativo: `main`.
- Commit-base: `e3b72ee21885195a6ff10e1b2322f4041b81c16a`.
- Situação remota no início: `main` estava 26 commits atrás de `origin/main`.
- Checkpoint criado: `codex/checkpoint-pre-projetos-20260807`.
- O worktree já continha alterações do usuário em módulos de Vendas, Ponto,
  Mobile, Consultas, privacidade, Ava e arquivos correlatos, além de arquivos
  novos. Nenhuma dessas alterações foi incluída em commit, stash ou patch do
  AvantaProjetos.

## Precedentes analisados

- `custos`: posteriormente movido para o repositório local **AvantaLab
  Projetos**, preservando o protótipo sem integração com banco ou menu.
- Central de Consultas: as telas experimentais foram movidas para **AvantaLab
  Projetos**. `lib/consultas` continua no produto por apoiar o cadastro de
  perfil, com contratos de fornecedor isolados.
- Módulo oficial existente: `app/modules/importador-despesas`, usado para
  conferir manifesto e separação entre telas, componentes, tipos e domínio.

## Tecnologias verificadas

- Next.js 16.2.6, React 19.2.4 e TypeScript 5 em modo estrito.
- Tailwind 4 e CSS Modules.
- Supabase JS 2.106.2.
- `@dnd-kit` já instalado; usado por outras áreas, não necessário no canvas.
- `@xyflow/react`, Dagre, ELK e Zustand não instalados.

## Decisões de isolamento

- Todo o novo código, documentação, testes e SQL ficam em `app/projetos`.
- Nenhuma dependência foi adicionada.
- Nenhum arquivo preexistente foi alterado pelo módulo.
- A versão global, o changelog global e a Ava não foram alterados: o módulo é
  experimental, não aparece na navegação e não faz parte da orientação oficial.

## Evolução oficial

Em 07/08/2026, após a validação do protótipo, o usuário autorizou a integração
oficial Web. O módulo passou a usar persistência por empresa, catálogo comercial,
menu condicionado à instalação, página total, hierarquia e documentação da Ava.
As decisões acima permanecem como registro do ponto de partida, não como estado
atual do produto.
