# Implementação oficial de ações por voz

Esta pasta contém a implementação executável compartilhada do contrato definido
em `docs/padrao-avanta/acoes-por-voz.md`.

- `avanta-voice-actions.js`: máquina de estados, captura de áudio, movimento por
  volume real, desambiguação, catálogo, confirmação, continuidade e resultado.
- `avanta-voice-actions.css`: acionador, ajuda contextual e solicitações salvas.
- `contract.ts`: contrato entre o componente compartilhado e cada produto.

O componente não acessa banco nem credenciais diretamente. Cada sistema fornece
um adaptador autenticado por meio de `window.AvantaVoiceActions.open(options)`.
O adaptador é responsável por transcrever, interpretar, buscar, executar e
compartilhar comprovantes utilizando funções oficiais do produto.

O contrato diferencia complemento e substituição: respostas curtas preservam o
rascunho atual, enquanto uma solicitação claramente nova devolve
`replacesPrevious` e descarta o fluxo anterior antes de montar a nova ação.

O adaptador pode desativar `allowSaveForLater` em sistemas cujo fluxo deve ser
concluído ou cancelado na hora. Também pode ativar `compactShortLists` para
mostrar até cinco escolhas integralmente, sem scroll interno e sem ampliar o
painel.

Ao responder uma pergunta por voz, o controlador mantém o card visível e o
microfone ancorado dentro dele durante gravação, transcrição e interpretação.
Essa continuidade é central e vale para todo sistema que reutiliza o padrão.

Quando a integração devolve `kind: "handoff"`, o controlador encerra o card e
mantém a continuação na tela oficial já preparada pelo adaptador. O handoff não
é uma confirmação de escrita e nunca substitui assinatura ou avaliação.

Não copiar esses arquivos para outro módulo. A rota do sistema deve servir ou
empacotar esta implementação central, para que uma atualização do padrão alcance
todas as integrações.
