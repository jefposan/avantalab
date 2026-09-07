# Auditoria de prontidão — Vendas e Serviços (atualizada na 1.14.3.12)

Data da revisão: 06/09/2026  
Escopo: perfil empresarial piloto Tridium, operação Web integrada.

## Atualização 1.14.3.12

- A busca empresarial de CNPJ deixou de consultar dados demonstrativos e usa a
  rota cadastral real do AvantaLab. A busca de CEP agora preserva também o
  código IBGE retornado pelo provedor para uso fiscal.
- Cadastros de cliente e fornecedor, recebimentos, estornos e movimentos de
  estoque aguardam a confirmação protegida do servidor. Durante o envio a ação
  fica desabilitada; em falha ou timeout o formulário permanece preenchido.
- Operações que não recebem confirmação do repositório são retiradas da tela e
  o modo integrado não grava esses registros no `localStorage`.
- Carteira, faturamento, valores em aberto e relatório do cliente derivam dos
  documentos e parcelas carregados para o perfil, sem históricos de exemplo.

## Resultado executivo

O núcleo comercial está preparado em código para persistência por perfil:
clientes, fornecedores, catálogo, saldo e razão de estoque, orçamentos, pedidos,
agenda de ordens de serviço, parcelas de pedidos, recebimentos, estornos e
entrada mensal da Gestão.
O usuário autenticado é somente autorizador e autor de eventos; todas as chaves
de domínio usam `empresa_id`.

A liberação em um ambiente real exige aplicar as migrações e executar o roteiro
de aceite abaixo. NF-e, NFC-e e NFS-e não devem ser transmitidas em produção
antes dos bloqueios externos listados ao final. A revisão local não utilizou
certificado real nem rede de autorizador.

## Matriz validada em código

| Área | Garantia aplicada | Evidência |
|---|---|---|
| Perfil | Dados e consultas filtrados por `empresa_id`; RLS forçada | migrações comerciais e handlers autenticados |
| Clientes | CPF/CNPJ, duplicidade por perfil, endereço fiscal, contato, versão otimista | serviço e API de clientes |
| Recarga | Itens e execução completa da OS são recompostos a partir do repositório | repositório de operações e snapshot integrado |
| Anexos da OS | Bucket privado, assinatura real, 10 MB, cinco por ordem, SHA-256 e URL temporária | API de anexos e gatilho transacional |
| Fornecedores | CNPJ opcional validado, duplicidade, sequência e auditoria | `vendas_fornecedores` e API protegida |
| Catálogo | Somente itens ativos e publicados; preço/custo em retrato | resolvedor do catálogo comercial |
| Estoque | Saldo inicial zero; local principal; entradas, saídas, inventário e reservas transacionais | saldo, razão imutável e chaves idempotentes |
| Orçamentos | Numeração por empresa, itens em retrato, validade e recarga após atualização | serviço de operações comerciais |
| Pedidos | Confirmação, reserva, separação, baixa, parcelas, rascunho fiscal, cancelamento e devolução total coordenados | workflow comercial transacional |
| Serviços | Agenda, início, materiais, conclusão, checklist, parcelas, cancelamento, estorno da conclusão e rascunho de NFS-e em transação única | workflow protegido de serviços |
| Recebimentos | Parcial, total, estorno, concorrência, limite de saldo e data não futura | serviço de contas a receber |
| Gestão | Receita líquida por competência e regime de caixa | `vendas_sincronizar_receita_mes` |
| Fiscal | Emitente, certificado, XML e DANFE vinculados à empresa | runtime e armazenamento fiscal protegido |

## Casos de borda cobertos

- datas inexistentes, ano bissexto, entrega/vencimento fora de sequência e data
  financeira futura;
- CPF/CNPJ com dígito incorreto ou sequência repetida;
- pedido sem cliente, pagamento ou item; quantidade/preço inválidos; desconto
  acima do item ou do total; mais de 120 parcelas;
- estoque físico insuficiente, consumo de saldo reservado, inventário abaixo da
  reserva, produto/local de outro perfil e repetição de comando;
- recebimento acima do saldo, estorno acima do valor líquido recebido,
  concorrência por versão e repetição idempotente;
- item removido, inativo ou não publicado após sua seleção;
- cliente ou fornecedor repetido dentro do mesmo perfil;
- falha entre orçamento de serviço e conversão: repetir o mesmo comando recupera
  o orçamento pela chave idempotente, sem duplicá-lo.

## Roteiro obrigatório após aplicar a migração

1. Abrir pelo perfil Tridium e confirmar que outro perfil não instala nem acessa
   o módulo durante o piloto.
2. Criar um cliente pessoa física e um cliente pessoa jurídica; atualizar um e
   confirmar que ambos reaparecem após recarregar.
3. Criar fornecedor, publicar um produto em Custos e conferir saldo inicial zero.
4. Registrar inventário e entrada de compra; tentar saída acima do disponível e
   confirmar o bloqueio.
5. Criar orçamento, recarregar, criar pedido, confirmar, separar e faturar;
   conferir reserva, baixa e parcelas.
6. Registrar recebimento parcial, restante e estorno; conferir conta a receber e
   a entrada mensal correspondente na Gestão.
7. Criar e recarregar ordem de serviço; iniciar, concluir e conferir materiais,
   estoque, parcelas, NFS-e em rascunho, agenda, PDF e anexos privados. Abrir um
   anexo recarregado e repetir o mesmo comando para confirmar que não há
   duplicidade.
8. Executar cada cenário fiscal em homologação antes de qualquer produção.

## Bloqueios externos para emissão real

- aplicar e conferir todas as migrações no banco do ambiente escolhido;
- instalar certificado A1 válido do perfil e configurar a chave mestra protegida;
- publicar matriz fiscal revisada por responsável tributário;
- configurar credenciais e endpoints do autorizador de NF-e/NFC-e;
- selecionar e homologar o padrão nacional ou provedor municipal de NFS-e;
- executar casos de autorização, rejeição, inutilização, cancelamento,
  contingência, consulta de recibo, XML e DANFE em homologação;
- liberar produção somente após aceite fiscal formal. Até lá, a trava de produção
  deve permanecer ativa.

## Pendências internas que impedem declarar go-live integral

- homologar em banco os cenários de devolução e estorno. A aplicação bloqueia
  corretamente operações com recebimento líquido ou documento fiscal ativo e
  exige que essas pendências sejam regularizadas antes do estorno integrado;
- executar os fluxos contra um banco restaurado com todas as migrações, pois
  nesta revisão local não havia instância Supabase disponível;
- decompor gradualmente o protótipo monolítico; o escopo Vendas já passa no
  ESLint sem erros, mantendo os padrões históricos de inicialização React e os
  contratos JSON dinâmicos como avisos visíveis e restritos aos componentes;
- homologar a NFS-e do município/provedor escolhido e validar NF-e/NFC-e com as
  credenciais reais do perfil.

Enquanto esses itens não forem concluídos, a versão 1.14.3.01 deve ser tratada como
pacote local de integração e aceite, não como autorização para operar produção.

## Verificações locais

- TypeScript sem erros;
- 133 testes de módulos aprovados, incluindo contratos de prontidão, consultas cadastrais, confirmação assíncrona, anexos e workflow de serviços;
- ESLint do escopo Vendas aprovado sem erros;
- verificadores PADRÃO AVANTA e Ava;
- ensaios locais do orquestrador fiscal e resiliência, sem rede externa;
- build Next.js de produção.
