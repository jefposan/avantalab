# Vendas Mobile — AvantaLab

Área isolada para desenho e preparação do futuro módulo/PWA de vendas mobile do AvantaLab.

Este diretório foi criado para manter o novo sistema separado do código atual do AvantaLab enquanto ele ainda está em fase de definição.

## Decisão atual

O antigo backup Tridium será usado apenas como referência funcional.

O novo produto será um sistema de vendas mobile para:

- vendedor autônomo;
- vendedor porta a porta;
- representante independente;
- vendedor que trabalha com várias marcas;
- operação simples sem emissão de nota fiscal ou cupom fiscal.

## O que este sistema precisa resolver

O vendedor precisa conseguir:

- cadastrar seus clientes;
- carregar produtos de uma marca/pacote;
- importar produtos por planilha;
- registrar vendas;
- acompanhar relatórios;
- consultar histórico de clientes;
- usar no celular como PWA;
- acessar uma gestão simples das vendas.

## O que não entra na primeira versão

- emissão de nota fiscal;
- emissão de cupom fiscal;
- ERP completo;
- controle fiscal;
- integrações contábeis;
- marketplace;
- checkout online;
- estoque avançado;
- gestão web completa dentro do AvantaLab.

## Relação futura com o AvantaLab

No futuro existirão dois produtos relacionados:

1. **Vendas Mobile**
   - foco em vendedor autônomo/porta a porta;
   - uso principal no celular;
   - registro simples de clientes, produtos e vendas.

2. **Vendas Web**
   - futuro módulo completo dentro do sistema web AvantaLab;
   - gestão mais ampla para empresas;
   - relatórios, equipe, funil, vendas e análises mais avançadas.

Este diretório trata apenas do **Vendas Mobile**.

## Protótipo atual

Foi criado um protótipo estático/PWA em:

```txt
app/index.html
```

Ele ainda não usa Supabase. Nesta fase, os dados ficam no `localStorage` do navegador para validar fluxo e telas rapidamente.

O protótipo já possui:

- resumo/dashboard;
- produtos;
- pacote Tridium demonstrativo;
- clientes;
- carrinho;
- registro de venda;
- histórico de vendas;
- importação simples por CSV;
- modelo de PWA com manifest e service worker.

## Como visualizar

Abrir localmente o arquivo:

```txt
/Users/JEFF/avantalab/vendas_mobile/app/index.html
```

Ou servir a pasta `app` com um servidor estático local.

## Integração real

O app já contém uma camada de integração com o Supabase do AvantaLab:

- login pela mesma conta Supabase usada no AvantaLab;
- leitura e gravação de clientes;
- leitura e gravação de produtos;
- registro de pedidos e itens;
- isolamento dos dados por usuário através de RLS;
- configuração de publicação estática na Vercel.

O esquema deve ser aplicado a partir de:

```txt
supabase/schema_vendas_mobile.sql
```

## Próximas etapas técnicas

- validar o fluxo CRUD em homologação;
- conectar pagamentos e agenda ao banco;
- configurar Storage de imagens;
- importação XLS/XLSX;
- integração futura com o módulo do AvantaLab.
