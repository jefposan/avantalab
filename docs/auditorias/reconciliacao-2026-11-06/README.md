# Reconciliação de fontes — 06/11/2026

Versão candidata 3.2.0.363, sem publicação. Base: produção 3.2.0.362, deployment dpl_8mj2opjedu3HUfvfSg3RYc1BQ4DB, snapshot 306ca7b910d37d4ff03a63e0627af7ebf544a840. O inventário da Vercel foi comparado aos bytes do snapshot; detalhes em fontes-362-verificadas.json.

A main anterior 9d1328b9 conserva a reconciliação 3.2.0.310. As fontes publicadas recentes foram incorporadas preservando sua ancestralidade, os arquivos nativos omitidos do pacote web e os controles de publicação já integrados. git.deploymentEnabled permanece false. O pipeline exige main remota e identidade oficial; a configuração de API createDeployments não deve ser confundida com bloqueio de builds.

Os 15 SQLs auditados em 04/11 mantêm os bytes e a localização histórica. A concessão operacional de UPDATE do runtime fiscal, publicada sem ID registrado, também foi preservada fora da fila automática, com proveniência separada. O registro remoto possui 284 entradas. As seis fontes históricas já reconciliadas permanecem como estavam na main. Nenhum SQL remoto, repair, push de banco ou alteração de permissões foi executado. As consultas remotas foram somente de leitura.

Os arquivos locais pendentes devem ser preservados integralmente antes da troca da pasta compartilhada, em stash identificado, branch/worktree local de preservação e arquivo tar verificado. Pacotes gerados em output/ e outputs/ ficam intactos no local. Configurações ignoradas, credenciais e worktrees de outros chats não são apagados. A cópia local de pendências não é uma base de publicação nem deve ser aplicada inteira sobre main: pode conter versões antigas de arquivos já publicados. Retomar cada escopo a partir da main e comparar somente suas alterações.

Esta integração não publica o candidato. O manifesto mantém bloqueio de auditoria e lista de migrations vazia. Para uma publicação posterior, conferir nova produção, base, fila, SHA e autorização do escopo.

Validação: 2.719 testes aprovados, zero falhas, seis ignorados; 656 testes de segurança e 49 de infraestrutura. Compilação, TypeScript e 236 páginas aprovados. A primeira tentativa de compilação falhou por DNS das fontes do Google na sandbox; somente a etapa de compilação foi retomada com rede, sem remover ou dispensar testes.

Preservação local: branch codex/pendencias-pre-main-20261106, snapshot 2f0500961a4399b7484ef3b5bc07817d5d90e257, pasta /Users/JEFF/AvantaLab Projetos/espelhos/pendencias-raiz-20261106, backup tar e manifestos em /Users/JEFF/AvantaLab Projetos/espelhos/preservacao-raiz-20261106. 2.661 arquivos de fontes verificados sem divergências.
