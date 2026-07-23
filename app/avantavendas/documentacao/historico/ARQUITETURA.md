# Arquitetura proposta — Vendas Mobile

## Isolamento inicial

Por decisão atual, o desenvolvimento ficará separado do código principal do AvantaLab.

Diretório:

```txt
/Users/JEFF/avantalab/vendas_mobile
```

Nada do código atual do AvantaLab deve ser alterado nesta fase.

## Stack desejada

A definir na implementação, mas o alvo é compatível com:

- GitHub;
- Vercel;
- Supabase;
- PWA;
- login AvantaLab/Supabase Auth;
- banco PostgreSQL/Supabase;
- importação XLS/XLSX.

## Integração futura com AvantaLab

No futuro, o Vendas Mobile deverá conversar com o AvantaLab por:

- autenticação compartilhada;
- tabelas Supabase compatíveis;
- vínculo com usuário/perfil financeiro;
- botão de retorno para `/mobile`;
- possível instalação via sistema de módulos.

## Rotas conceituais

Sugestão para o PWA:

```txt
/vendas
/vendas/produtos
/vendas/clientes
/vendas/nova-venda
/vendas/vendas
/vendas/relatorios
/vendas/configuracoes
```

Se a rota `/vendas` conflitar futuramente com o módulo web, podemos usar:

```txt
/vendas-mobile
```

ou:

```txt
/mobile/vendas
```

## Separação entre mobile e web

Este produto é o **Vendas Mobile**.

O futuro **Vendas Web** será outro módulo, com escopo maior.

Diferença:

| Produto | Público | Interface | Escopo |
|---|---|---|---|
| Vendas Mobile | vendedor autônomo/porta a porta | celular/PWA | registrar produtos, clientes e vendas |
| Vendas Web | empresa/gestor | web AvantaLab | gestão comercial completa |

