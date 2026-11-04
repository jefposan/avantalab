# Editar estoque — AvantaPreços

Refinamento local 3.1.0.62, ainda não publicado: editor identifica o usuário por nome/login, conserva o estado confirmado após salvar e a lista informa a permissão individual. Cancelar retorna ao cadastro novo desmarcado. API já grava por id e empresa; testes com dois usuários confirmam concessão e revogação independentes, além do fluxo real do formulário com dados fictícios. Consulta somente leitura encontrou os três acessos produtivos desmarcados e nenhum trigger de propagação; nenhuma permissão real foi modificada.

Versão publicada 3.1.0.60, PADRÃO AVANTA 1.20.0. Migração instalada em produção e conferida, sem liberação automática dos acessos existentes. Relatório: `publicacao-avisos-estoque-2026-10-19.md`.

Em Configurações → Usuários da consulta, criar/editar tem somente a caixa **Editar estoque**. Desmarcada por padrão, inclusive para usuários existentes. Marcar permite confirmar/ajustar quantidades do mesmo perfil no resultado e no histórico PWA. Não concede Gestão, preço, anúncio, conexão, administração de usuários ou outra empresa. Desmarcar mantém produtos/saldos e impede novas gravações.

O campo `can_edit_stock` pertence ao vínculo dedicado por empresa. GET/POST/PATCH de usuários seguem restritos a gestores master/administradores autorizados. Aceita somente booleano; POST ausente é falso, PATCH ausente preserva a opção existente para compatibilidade. A caixa não vira papel nem metadata de autenticação; servidor relê vínculo ativo e módulo a cada operação. Acesso regular de Gestão conserva suas regras anteriores.

Migração `20261019210000_marketplace_price_stock_permission.sql`: aditiva, padrão false; helper restrito ao service_role e à ação `confirm_stock`. O guard original do núcleo de produtos é ampliado apenas para essa ação, com assinatura/trecho esperado verificados; mudança desconhecida aborta a migração. Mantém wrappers, validação, revisão concorrente, recibo idempotente, ator/histórico e gatilhos existentes. Leitura do vínculo com FOR SHARE serializa confirmação com revogação/exclusão. Clientes não recebem EXECUTE sobre helper/núcleo.

Publicar exige instalar a migração antes de disponibilizar o código que consulta o campo. Não conceder permissão automaticamente a usuário real no deploy; o responsável marca e salva os acessos desejados. Nenhum login real criado, senha alterada, acesso ampliado ou saldo movimentado pelo agente nesta etapa. Prévia de Configurações usa somente dados fictícios em memória.

Validação: 1.411 testes da suíte completa aprovados (concorrência limitada a dois processos), zero falhas; nove testes direcionados de formulário/API/autorização e SQL real aprovados. PGlite confirmou padrão false para acesso existente, confirmação autorizada com autoria, idempotência, revisão concorrente, bloqueio de outros comandos/empresa, desativação, revogação e módulo expirado. TypeScript, lint e verificadores PADRÃO AVANTA/Ava aprovados. Prévia no navegador confirmou caixa desmarcada, marcação/salvamento/reabertura e revogação persistida sem alterar o fluxo das demais configurações.

Formulário conferido nos temas claro/noturno, na mesma linha dos campos e com rótulo nativo clicável. Evidência da prévia fictícia: `output/marketplaces/editar-estoque-permissao-60.png`.
