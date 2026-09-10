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

Não copiar esses arquivos para outro módulo. A rota do sistema deve servir ou
empacotar esta implementação central, para que uma atualização do padrão alcance
todas as integrações.
