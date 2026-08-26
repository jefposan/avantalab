# Auditoria — contas de primeira classe do AvantaVendas

Data: 24/08/2026  
Versão: 1.7.3.25-av72

## Regra de domínio

Toda conta de vendas é uma unidade operacional normal. O fato de ter sido
criada depois do primeiro acesso não altera direitos, isolamento, persistência
ou integrações. `user_id` identifica o autor da ação; `conta_id` identifica o
dono do dado.

## Escopo verificado

- clientes, pedidos, itens e pagamentos;
- produtos e pacotes importados;
- catálogo empresarial recebido;
- saldo e histórico de estoque;
- preferências e dashboard;
- novidades e materiais de divulgação;
- cache local e troca de perfil;
- comprovantes;
- backup automático e reset.

## Correções aplicadas

1. O servidor rejeita gravações sem conta ativa e não escolhe mais a primeira
   conta do usuário.
2. Catálogo, preferências, movimentos de estoque e backups ganharam vínculo
   explícito com a conta.
3. Operações compartilhadas validam o papel do participante na conta, sem
   depender de quem criou originalmente o produto ou lançamento.
4. A sincronização de catálogo considera somente a empresa vinculada ao perfil
   ativo.
5. Reset e backup são limitados ao perfil selecionado.
6. Conteúdo, divulgação e nome dos comprovantes acompanham a conta ativa.

## Invariantes de segurança

- nenhuma migração desta revisão exclui clientes, pedidos, pagamentos ou
  produtos existentes;
- o reset só remove dados quando o usuário confirma a ação no perfil ativo;
- as assinaturas antigas de RPC sem `conta_id` são preservadas para auditoria,
  mas perdem a permissão de execução para impedir novos desvios silenciosos;
- alterações estruturais preservam `user_id` como trilha de autoria.
