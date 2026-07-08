<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Versionamento do AvantaLab

- A versao oficial do sistema fica em `app/lib/version.ts`.
- Sempre que uma alteracao funcional, visual relevante, ajuste de banco, backup, importacao, mobile ou web for concluida, avaliar incremento da versao.
- Usar o formato `MAJOR.MINOR.PATCH`.
- `PATCH`: correcoes pequenas, ajustes visuais e bugs. Exemplo: `1.0.0` para `1.0.1`.
- `MINOR`: novo recurso ou melhoria relevante. Exemplo: `1.0.1` para `1.1.0`.
- `MAJOR`: mudanca estrutural, banco, fluxo principal ou incompatibilidade. Exemplo: `1.1.0` para `2.0.0`.
- Atualizar tambem o `CHANGELOG.md` com resumo da alteracao.

## Padrão de cards — AvantaShell

- Todo card novo do sistema deve seguir o padrão **AvantaShell**, documentado
  em `planejamento/padrao-avanta-card.md`.
- Componente pronto: `app/components/AvantaCard.tsx` (+ `AvantaCard.module.css`).
  Não recriar a estrutura; usar o componente e as variáveis CSS documentadas.
- Anatomia resumida: CHAPA (card de trás, largura total, título) + CORPO
  (frente; topo reto no vale, subida ao platô em diagonal "S" contínua) +
  PLATÔ (~25%, só controles: pontinhos 2×3 e menu "..."). Cores sempre
  derivadas da corPrimaria via color-mix; sem bordas de 1px internas.
- Demo de referência: `/avanta-card-demo`.
