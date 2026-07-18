# PADRÃO AVANTA

Versão oficial: **1.1.0**
Identificador: `PADRAO-AVANTA`
Manifesto: `docs/padrao-avanta/manifest.json`

Este é o padrão oficial para criar ou alterar módulos, sistemas, telas e
componentes do ecossistema AvantaLab. Ele reúne identidade visual, experiência,
formatação de dados, estrutura de código, preferências e critérios de entrega.

## Regra de precedência

1. Segurança, privacidade, legislação e requisitos funcionais.
2. Instruções do `AGENTS.md` mais próximo do arquivo alterado.
3. Este padrão e seus documentos especializados.
4. Convenções locais já consolidadas no módulo.

Quando uma necessidade não estiver coberta, registrar a decisão neste padrão
antes de criar uma convenção isolada. Não duplicar componentes existentes.

## Leitura obrigatória por tipo de trabalho

| Trabalho | Ler antes de implementar |
|---|---|
| Qualquer interface | `identidade-visual.md`, `componentes.md`, `acessibilidade.md` |
| Formulários e dados | `campos-formatacao.md` |
| Página, dashboard ou responsividade | `layouts.md` |
| Card geral | `componentes.md`, `identidade-visual.md` e `acessibilidade.md` |
| AvantaCard/AvantaShell solicitado | documentos de card geral e `planejamento/padrao-avanta-card.md` |
| Preferências do usuário/empresa | `preferencias.md` |
| Novo módulo ou sistema plugado | todos os documentos, especialmente `modulos.md` |
| Revisão de uma tela existente | documentos da área alterada e `checklist.md` |

## Fundamentos já implementados

- Tipografia: `app/lib/fonts.ts` e tokens em `app/globals.css`.
- Card especial disponível sob solicitação: `app/components/AvantaCard.tsx` e
  `app/components/AvantaCard.module.css`.
- Especificação AvantaShell: `planejamento/padrao-avanta-card.md`.
- Formatações compartilhadas: `app/lib/formatters.ts` e `app/lib/telefone.ts`.
- Versão do produto: `app/lib/version.ts`.

## Fluxo obrigatório

1. Informar no início do trabalho: `Aplicando PADRÃO AVANTA vX.Y.Z`.
2. Identificar web, mobile, público, permissões, dados e integrações com a Ava.
3. Reutilizar tokens, formatadores e componentes oficiais.
4. Implementar estados normal, carregando, vazio, erro, sucesso e desabilitado
   quando aplicáveis.
5. Verificar desktop, mobile, teclado, contraste e tema escuro quando suportado.
6. Atualizar documentação, versão do produto, changelog e manuais da Ava conforme
   `AGENTS.md`.
7. Executar `npm run verificar:padrao-avanta` e `npm run verificar:ava`.

## Como invocar em qualquer projeto

- No Codex: `Use $padrao-avanta neste projeto.`
- Por caminho: `Siga o PADRÃO AVANTA em
  /Users/JEFF/avantalab/docs/padrao-avanta/README.md.`
- Em um projeto plugado: incluir no `AGENTS.md` desse projeto o caminho absoluto
  acima e declarar quais partes do AvantaLab ele compartilha.

## Atualização do padrão

- Alterar primeiro os documentos desta pasta.
- Atualizar `manifest.json` e `CHANGELOG.md` do padrão.
- `PATCH`: esclarecimento sem mudar comportamento.
- `MINOR`: nova regra ou componente compatível.
- `MAJOR`: quebra de compatibilidade ou migração obrigatória.
- Atualizar componentes, verificadores e instruções das IAs na mesma entrega.
- Reinstalar/sincronizar a skill pessoal quando o procedimento da skill mudar.
