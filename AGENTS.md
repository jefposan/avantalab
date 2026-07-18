<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## PADRÃO AVANTA — padrão oficial de desenvolvimento

- Identificador oficial: `PADRAO-AVANTA`.
- Antes de criar ou alterar tela, módulo, sistema, formulário, campo, card,
  modal, tabela, preferência ou componente visual, ler integralmente
  `docs/padrao-avanta/README.md` e os documentos que seu índice indicar.
- No início do trabalho, informar qual versão do PADRÃO AVANTA foi consultada.
- Não criar componente visual local quando houver componente oficial equivalente.
- Projetos ou sistemas plugados devem apontar seu próprio `AGENTS.md` para o
  endereço absoluto do padrão ou invocar a skill pessoal `$padrao-avanta`.
- Antes de concluir, executar `npm run verificar:padrao-avanta`.

## Versionamento do AvantaLab

- A versao oficial do sistema fica em `app/lib/version.ts`.
- Sempre que uma alteracao funcional, visual relevante, ajuste de banco, backup, importacao, mobile ou web for concluida, avaliar incremento da versao.
- Usar o formato `MAJOR.MINOR.PATCH` para versoes base e `MAJOR.MINOR.PATCH.MICRO`
  para micro ajustes dentro da mesma entrega.
- `PATCH`: correcoes pequenas, ajustes visuais e bugs. Exemplo: `1.0.0` para `1.0.1`.
- `MINOR`: novo recurso ou melhoria relevante. Exemplo: `1.0.1` para `1.1.0`.
- `MAJOR`: mudanca estrutural, banco, fluxo principal ou incompatibilidade. Exemplo: `1.1.0` para `2.0.0`.
- `MICRO`: ajustes finos, texto, rótulos, pequenas correcoes visuais ou refinamentos
  da entrega atual. Exemplo: `1.3.6` para `1.3.6.01`, depois `1.3.6.02`.
- Depois da `1.3.5`, agrupar os ajustes grandes atuais na base `1.3.6`;
  micro ajustes subsequentes devem avançar apenas a quarta casa.
- Atualizar tambem o `CHANGELOG.md` com resumo da alteracao.

## Conhecimento da Ava

- Os manuais operacionais da Ava são parte do produto e ficam em `docs/ava/`: `gestao-web.md`, `gestao-mobile.md` e `vendas.md`.
- A versão executável resumida, enviada à IA conforme o ambiente, fica em `app/lib/ava-conhecimento.ts`.
- Sempre que uma alteração criar, remover, mover ou mudar o comportamento de uma funcionalidade, revisar o manual correspondente, o guia executável e o `CHANGELOG.md` no mesmo commit. Se não houver impacto na orientação da Ava, registrar no manual a revisão da versão como “sem impacto operacional”.
- Antes de concluir, executar `npm run verificar:ava`. O comando confere a existência dos três manuais e se todos foram revisados para a versão atual em `app/lib/version.ts`.

## Padrão de cards — AvantaShell

- Usar **AvantaCard/AvantaShell** quando o usuário solicitar esse padrão ou quando
  briefing, manifesto ou especificação o exigir. Sem essa solicitação, manter o
  padrão geral do PADRÃO AVANTA; não impor a geometria AvantaShell.
- Quando AvantaCard/AvantaShell for aplicável, ler integralmente
  `planejamento/padrao-avanta-card.md`.
- Componente pronto: `app/components/AvantaCard.tsx` (+ `AvantaCard.module.css`).
  Não recriar a estrutura; usar o componente e as variáveis CSS documentadas.
- Anatomia resumida: CHAPA (card de trás, largura total, título) + CORPO
  (frente; topo reto no vale, subida ao platô em diagonal "S" contínua) +
  PLATÔ (~25%, só controles: pontinhos 2×3 e menu "..."). Cores sempre
  derivadas da corPrimaria via color-mix; sem bordas de 1px internas.
- Demo de referência: `/avanta-card-demo`.
