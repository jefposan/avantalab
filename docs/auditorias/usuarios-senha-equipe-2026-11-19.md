# 3.2.0.506 — Redefinição de senha da equipe

Base: main oficial `f0aacb8f9e8b9228e291a99661855b763894da76`, produção 3.2.0.505 `dpl_6Qd4cb2A4wZZPUi3NmDHYTgnLSZs`, READY/HTTP 200. Checkout canônico e trabalho paralelo preservados. PADRÃO AVANTA 1.24.0.

## Limites

- Não recupera senha antiga nem cria banco de senhas legíveis/reversíveis. Exibição somente do que está sendo digitado no cadastro ou na nova senha.
- Equipe interna originada na empresa, ativa e exclusiva. Master redefine administradores/operadores; administrador somente operadores. Protege Master, contas pessoais, outras origens/provedores e qualquer vínculo com outra empresa.
- Compatibilidade legada: origem `usuario_interno` comprovada no diretório, sem empresa de origem atribuída e sem origem contrária no Auth, exige todos os vínculos na empresa atual. Conferência somente leitura da conta indicada na imagem identificou exatamente esse legado; nenhuma credencial real foi alterada.
- Política compartilhada calcula a indicação visual; POST revalida todas as condições no servidor e consulta origem protegida no Auth. Falha de leitura bloqueia redefinição. Listagem não revela vínculos externos e falha da indicação não impede editar acessos.
- Alteração muda somente senha e metadado protegido com ator/empresa/data da última redefinição. Nenhuma senha é incluída em metadados, resposta, rascunho ou log de aplicação.
- Web/Mobile usam confirmação oficial, bloqueio de repetição e contexto. Salvar nome/acessos não redefine senha de terceiro implicitamente; nova senha divergente é rejeitada. Cadastro original continua oferecendo olho para conferir a senha inicial.

## Verificação

Testes de API simulam matriz completa de papéis, contas externas e compartilhadas, origem divergente, vínculo inativo em outra empresa, falhas de Auth/leitura/gravação e ausência de senha nas respostas/metadados. Testes Web/Mobile executam os controladores reais para confirmação, cancelamento, repetição, contexto alterado, limpeza após sucesso e erro/rede. TypeScript e verificadores oficiais permanecem obrigatórios. QA não redefine credenciais reais; nenhuma migração ou publicação nas lojas.

A autorização posterior inclui no mesmo pacote a busca digitável de clientes e correções do pedido. Ver `pedidos-clientes-estoque-2026-11-19.md`. A migração restrita de políticas comerciais foi autorizada explicitamente junto à publicação.
