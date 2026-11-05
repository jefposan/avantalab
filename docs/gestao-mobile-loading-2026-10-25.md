# Gestão Mobile — loading compartilhado

Versão 3.2.0.160, PADRÃO AVANTA 1.23.0. Aplicado localmente, não publicado.

- `app/mobile/page.tsx`: LoadingPontos oficial no HTML inicial e template inerte fora da raiz imperativa.
- `public/mobile-app.js`: preparação dinâmica reutiliza o template; fallback anterior preservado para ausência do template.
- Não altera card, marca, progresso, fluxo direto, login social, recuperação, dados, plugins ou binários iOS/Android. Não duplica CSS/animação nem cria consultas/timers.
- Testes focados: 39 aprovados, incluindo paridade com a marcação real do componente, PWA/nativo, progresso, recuperação e gates de acesso.
- Segurança: 471 aprovados, zero falhas. Validadores PADRÃO AVANTA e Ava aprovados; sintaxe do JavaScript aprovada.
- Sem teste físico em aparelho nesta etapa. A mudança de conteúdo remoto somente chegará aos ambientes publicados após autorização e confirmação de publicação.
