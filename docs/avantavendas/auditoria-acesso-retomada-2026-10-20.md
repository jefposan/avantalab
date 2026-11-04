# AvantaVendas — auditoria local de acesso e retomada

Data: 20/10/2026. Candidata local: **3.2.0.07-av189**. **Não publicada.**
Padrão consultado: PADRÃO AVANTA 1.20.0.

## Escopo implementado

- Confirmação remota de usuário compartilhada apenas enquanto a consulta está em andamento. Não existe cache permanente de autorização. Invalidação de consulta antiga em logout, troca de identidade e atualização de usuário. Abertura aproveita a confirmação recém-feita para acesso/canais; listagem de contas recém-obtida evita consulta repetida.
- Retomada sem reinicializar login/Sala: eventos de foco, visibilidade e Capacitor são agrupados em 350 ms. A renovação continua exclusivamente no SDK, quando o token exige. Atualização operacional tem intervalo mínimo de 30 segundos; reconexão e atualização adiada antecipam a consulta.
- Atualização não sobrescreve campo focado, sheet, pedido em edição, lançamento, agenda ou organização em andamento. Respostas anteriores a alteração operacional/troca de perfil são descartadas. Perda efetiva da sessão bloqueia o acesso; erro de rede não equivale a revogação.
- Imagens deixam de bloquear toda a Sala. Botões apresentam rótulo enquanto carregam e recuperam imagem tardia. Geometria, encaixes e lógica de arraste do AvantaKanban permanecem preservados.
- Notificações e atividade são complementos posteriores, não pré-requisitos da tela operacional. Agenda integra o cache existente. Navegação recente, por usuário/conta e válida por seis horas, pode retornar após autorização e cache válido; campos, senhas e rascunhos não são incluídos nesse registro.
- Cache-first restrito a recursos estáticos com URL versionada e correspondência exata. HTML continua consultando rede. Cache indisponível não impede entrega pela rede; mantém publicação anterior para páginas já abertas e não apaga caches de outros sistemas.

## Limites de segurança e compatibilidade

Não houve migração, escrita em Supabase de produção, mudança de RLS, prazo do lembrar-me, armazenamento de tokens, regras financeiras, plugins, permissões, pacotes ou código Swift/Java/Kotlin. Alterações partiram do estado atual do projeto, preservando modificações pré-existentes.

O observador `appStateChange` usa o plugin App existente; é opcional e **não é aguardado para abrir o aplicativo ou concluir OAuth**. Falha ou ausência de resposta desse observador conserva o fluxo web de foco/visibilidade. Remove somente seus próprios listeners, sem `removeAllListeners`, `exitApp`, recarga automática ou alteração do tratamento nativo de WebView.

Se iOS/Android descartar o processo/WebView, a abertura ainda depende da confirmação segura da sessão e da conta. Esta implementação não tenta impedir o gerenciamento de memória do sistema operacional e não promete permanência eterna da tela.

O SDK foi mantido. Troca para validação por claims, sincronização incremental de histórico e desacoplamento da versão dos recursos são etapas posteriores, não incluídas nesta entrega cautelosa.

## Evidências

- `npm test`: **1.471 aprovados; zero falhas**, incluindo testes locais com dados fictícios. Não são testes de gravação em produção.
- Sintaxe dos dois scripts principais aprovada.
- Verificações Padrão Avanta, Ava, revisão av189, interface, acesso mobile/web, agenda e notificações por perfil aprovadas.
- Testes de sessão concorrente/vencida/revogada, rede indisponível, Google/Apple, lembrar-me, eventos repetidos, troca de perfil, respostas tardias, formulário aberto e observador nativo sem resposta aprovados.
- Service worker testado com versões distintas, HTML pela rede, APIs/identidade fora do cache estático, erro HTTP, quota indisponível e preservação de caches de outros sistemas.
- Chrome isolado em viewport 390×844, aplicação atual e banco **fictício**: Sala utilizável com as 11 imagens ainda pendentes; três eventos de retorno produziram uma carga; rascunhos preservados antes/durante leitura; posição da mesma conta recuperada após recarga autorizada; zero exceções JavaScript. Não mede autenticação real, iPhone ou Android físicos, nem fundamenta percentual de ganho.
- TypeScript do código-fonte aprovado com configuração temporária que exclui apenas `output/`, `outputs/` e `.next/dev/types/app/page.ts`, além das exclusões originais. A verificação irrestrita da árvore encontrou erros em fontes de terceiros de DerivedData/Xcode e nesse tipo gerado da página inicial (`AvantaLandingPage`); nenhum desses arquivos foi alterado. **Não há build de publicação aprovado nesta etapa.**

## Antes de publicar

1. Resolver/separar os artefatos locais que contaminam a checagem geral e executar o build da candidata a partir dos arquivos atuais, sem retroceder para versão publicada antiga.
2. Validar iPhone e Android reais: senha/Google/Apple, lembrar-me ligado/desligado, retorno rápido/prolongado, retorno durante pedido/pagamento, sem rede, token vencido, troca de perfil e recuperação após descarte da WebView. Não apagar dados nem reinstalar para testar.
3. Só depois de autorização, publicar a revisão av189 e conferir HTML, recursos versionados, SW e versão nos domínios. Nenhum envio às lojas foi feito nesta tarefa.

## Referências técnicas oficiais

- [Capacitor App — ciclo de vida e appStateChange](https://capacitorjs.com/docs/apis/app).
- [Supabase — renovação automática da sessão](https://supabase.com/docs/reference/javascript/auth-startautorefresh).
- [MDN — cache e ciclo de vida de service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

## Arquivos executáveis principais auditados — SHA-256

```text
405d1cdbdec85231d28d2376057961f8f13d21db27820ffddb28b24a8082e336  app/avantavendas/sistema/app.js
eef8e025b0885bd0eb49068a68ff073c13a3d7c3a89aaaa804f5b89b7b69833c  app/avantavendas/sistema/supabase-client.js
cc66f29d990a7a8084bde65a00643a76c14f7105b88ca3102c49a7cc6f0eb2e3  app/avantavendas/sistema/styles.css
c9ab0e6bbf714c35f26faf4b9392ca7e43ffd05ad34941027a1233bdc223e462  app/avantavendas/sw.js/route.ts
```
