# Manuais operacionais da Ava

Estes documentos são a fonte legível das orientações da Ava. Cada chat recebe o
guia do ambiente em que foi aberto, evitando instruções equivocadas entre Gestão
Web, Gestão Mobile e Vendas Mobile.

| Ambiente | Manual | Enviado pelo chat como |
|---|---|---|
| Gestão Web | [gestao-web.md](gestao-web.md) | `gestao-web` |
| Gestão Mobile | [gestao-mobile.md](gestao-mobile.md) | `gestao-mobile` |
| Vendas Mobile | [vendas.md](vendas.md) | `vendas` |

## Regra de manutenção

Toda alteração funcional deve revisar o manual correspondente e
`app/lib/ava-conhecimento.ts`. Depois de atualizar `APP_VERSION`, cada manual
precisa receber o marcador `<!-- ava-version: X -->` com a mesma versão.

Execute `npm run verificar:ava` antes de concluir. A checagem impede um build
quando um manual está ausente ou não foi revisado para a versão atual.
