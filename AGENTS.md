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
