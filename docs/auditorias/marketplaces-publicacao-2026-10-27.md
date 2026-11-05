# Publicação e edição no Mercado Livre — auditoria de 27/10/2026

Escopo: empresa do caso Lenoxx PMP435, EAN 7897181903311. Consultas ao banco e à Vercel foram somente de leitura. Não houve rollback, alteração de credenciais nem criação de anúncio durante a auditoria.

## Evidência histórica

- Últimas quatro criações confirmadas no histórico da empresa: 23/10/2026, de 16:41:11 a 16:41:25 (São Paulo), EAN 7892022127826, uma por conta. Àquela altura a versão 3.2.0.118 já havia sido enviada; a associação exata de cada requisição ao deployment não consta da auditoria de publicações.
- Desde 23/10, o histórico consultado contém 29 edições confirmadas: 24 de fotos e 5 de características, sem falha registrada nessa seleção. Em 27/10 há fotos confirmadas às 02:34:23. Isso não demonstra sucesso de edição de título nem inclui recusas anteriores à auditoria de envio, mas refuta uma interrupção geral de todas as escritas da integração.
- Para o Lenoxx, o cadastro local possui nome de 67 caracteres, revisão 5 na leitura. As recusas de `/items/validate` ocorrem antes do registro em `marketplace_publications`; portanto a ausência de novas linhas não fornece a data da primeira recusa.

## Regressões localizadas nos snapshots

| Alteração | Origem no código | Deployment e confirmação |
| --- | --- | --- |
| Atalho de título procura `destination-CONTA-title`, inexistente, e cai no próprio aviso | 3.2.0.143, commit `4f8080acdb56b52e8f9cd708b5ac31f80c405f55` | `dpl_HUFQU8S5WoD9SkffwgY4X6dbTfiV`, READY, criado 24/10 às 11:45:00 |
| Conferência de frete por conta retirada; backend continua exigindo token específico da conta | 3.2.0.163, commit `58a6a1cd3cf6744dd78d5c9f97a31b620385e75f` | O build .163 `dpl_3kwa7EKYVKF4CV6tdqEhh7Fx8y7J` falhou. Primeiro deployment READY contendo o código: **3.2.0.164**, commit `9772add944c2f7f1f7f82c2bcd71f196acd0d8d9`, `dpl_FbCtHckLhb1Eu7aQ1AdbxySzNt4q`, criado 25/10 às 19:20:42 |
| Diagnóstico sanitizado do provedor descartado no envio multiconta | Presente na implementação multiconta anterior; mantido na .143 e posteriores | A tela solicita detalhes técnicos que ela própria não oferece |

O servidor ainda chama `reviewPublicationShipping` antes de criar o item. Sem o componente retirado, novos destinos Mercado Envios não conseguem obter sua própria prova de conferência. O teste de regressão exige que uma conta sem cotação não chegue ao envio e que uma cotação sem custo requeira a ciência correspondente.

## Recusa específica do título

O envio já selecionava `family_name` para `user_product_seller` e `title` para contas legadas antes dessas alterações. Não foi encontrada uma troca desse contrato nos deployments recentes. O código não propagava `settings.max_title_length` nem validava o tamanho do nome na preparação. A documentação oficial exige respeitar esse limite, inclusive para `family_name`. Consulta pública real a `GET https://api.mercadolibre.com/categories/MLB31674` em 27/10 confirmou categoria Processadores e `settings.max_title_length: 60`; portanto o nome atual de 67 caracteres ultrapassa o limite confirmado.

Não atribuir a recusa específica deste nome ao deployment .164 sem a resposta do provedor: a regressão de frete é demonstrável e independente. A versão .235 passa a usar o limite real da categoria e a conservar os detalhes sanitizados da recusa por conta.

Fontes oficiais: [User Products](https://developers.mercadolivre.com.br/pt_br/user-products) e [Publicar produtos](https://developers.mercadolivre.com.br/pt_br/publicacao-de-produtos).

## Correção 3.2.0.235

- Restaurar o componente de frete existente por destino, sem remover a validação do servidor.
- Direcionar título e campos compartilhados aos controles da preparação; nome local editável com salvamento transacional e nova revisão. Catálogo oficial protegido.
- Validar limite retornado pela categoria, sem cortar ou substituir o nome automaticamente.
- Preservar detalhes técnicos por conta e erros de título durante atualizações de cotação.
- Revalidar destinos após salvar uma revisão do cadastro, mantendo as contas selecionadas.

Validação local: testes de publicação, preparação, edição, frete, recusa, foco, revisão e identidade; suíte de segurança, PADRÃO AVANTA e Ava. Confirmação de produção e publicação real do produto são etapas distintas e devem ser registradas após verificação externa.

Refinamento .236: enviar nome no salvamento somente quando a preparação permite editar o nome local. Ficha oficial com nome diferente do cadastro continua salvando fotos/descrição sem tentativa implícita de renomear. Teste cobre a preservação e o uso da mesma transação existente.
