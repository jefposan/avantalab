# Arquitetura de Módulos — AvantaLab

Documento de desenho para o sistema de módulos opcionais (ex.: CRM/Vendas, Controle de Ponto, Montagem de Custos). Objetivo: módulos que **se fundem** ao sistema base quando ativados — adicionando botões, alimentando gráficos/balanço/relatórios e o contexto da IA — e que possam ser liberados por **assinatura** ou **contratação avulsa**, com código forte, seguro, organizado e fácil de manter.

---

## 1. Princípios

- **Monólito modular.** Um único sistema, com módulos plugáveis. Nada de app/página separada: o módulo injeta suas partes nos pontos certos do sistema base.
- **Ativação por empresa.** Cada perfil financeiro (empresa) tem seu conjunto de módulos ativos. Ativar/desativar é só ligar/desligar um registro — sem deploy.
- **Contrato explícito.** Cada módulo declara, num "manifesto", tudo o que contribui (menu, cards, dados financeiros, contexto da IA, telas, permissões). O sistema base só conhece o contrato, não os detalhes internos do módulo.
- **Segurança no servidor.** A ativação nunca é decidida pelo cliente. O navegador só *lê* o que está ativo (via RLS); quem ativa é o servidor (assinatura/admin/checkout).
- **Isolamento de dados.** Cada módulo tem suas próprias tabelas, com `empresa_id` e RLS. O núcleo financeiro não é poluído com lógica de módulo.
- **Fusão sem reescrever o núcleo.** Resultados de módulos aparecem nos gráficos/balanço através do **livro-caixa central** (com marcação de origem), então os relatórios existentes "já funcionam".

---

## 2. Conceitos

- **Módulo:** unidade funcional opcional (ex.: `vendas`). Tem slug, manifesto (código) e migração (SQL).
- **Catálogo:** lista de módulos que existem no produto.
- **Ativação:** vínculo empresa ↔ módulo (ligado/desligado, origem, validade).
- **Slot / ponto de extensão:** lugar do sistema base onde módulos podem injetar algo (menu, dashboard, relatórios, IA…).
- **Plano:** nível de assinatura, que concede um conjunto de módulos.

---

## 3. Banco de dados (Supabase)

### 3.1 Catálogo e ativação

```text
modulos                      -- catálogo (semeado pelo time)
  id            text  PK     -- slug: 'vendas', 'ponto', 'custos'
  nome          text
  descricao     text
  icone         text
  disponivel    boolean      -- visível no catálogo
  ordem         int

empresa_modulos              -- ativação por empresa
  id            uuid PK
  empresa_id    uuid FK -> empresas
  modulo_id     text FK -> modulos
  ativo         boolean
  origem        text         -- 'plano' | 'avulso' | 'cortesia'
  expira_em     timestamptz null
  criado_em     timestamptz default now()
  unique(empresa_id, modulo_id)
```

### 3.2 Assinaturas (para a fase de cobrança)

```text
planos                       -- níveis de assinatura
  id, nome, preco_mensal, ativo

plano_modulos                -- quais módulos cada plano concede
  plano_id, modulo_id

empresa_assinatura
  empresa_id, plano_id, status, inicio, fim
```

**Módulos efetivos de uma empresa** = módulos do plano vigente **∪** ativações avulsas vigentes. Isso é resolvido por uma **view/função no servidor** (`modulos_ativos_da_empresa`), nunca calculado só no cliente.

### 3.3 RLS (segurança)

- `empresa_modulos`: `SELECT` permitido para usuários vinculados à empresa; `INSERT/UPDATE/DELETE` **somente** via service role (servidor) — o cliente não se autoativa.
- Tabelas de cada módulo: RLS por `empresa_id` (vínculo em `usuarios_empresa`) **e**, como defesa extra, checando que o módulo está ativo para aquela empresa.

---

## 4. Pontos de extensão (os "slots")

O sistema base expõe slots nomeados. Um módulo declara o que injeta em cada um:

| Slot | O que o módulo fornece | Onde aparece |
|------|------------------------|--------------|
| `menu` | itens de menu / abas | menu lateral (mobile), nav do header (web) |
| `dashboardCards` | cards de resumo | dashboard |
| `telas` | telas/rotas próprias | dentro do app (não página separada) |
| `provedorFinanceiro` | receitas/despesas do período | gráficos, balanço, relatórios |
| `contextoIA` | resumo textual dos dados do módulo | contexto enviado à Ava |
| `permissoes` | perfis que podem usar | gating por papel do usuário |

O app, ao carregar, lê os **módulos ativos** da empresa e renderiza/registra **apenas** as contribuições desses módulos.

---

## 5. Manifesto do módulo (contrato no código)

Cada módulo é um objeto que implementa o contrato. Esboço (desktop/React, TypeScript):

```ts
export interface ModuloAvantaLab {
  id: string;                       // 'vendas'
  nome: string;
  icone: React.ReactNode;
  perfisPermitidos?: PerfilUsuario[]; // controle por papel

  // UI injetada
  itensMenu?: () => MenuItem[];
  cardsDashboard?: () => React.ReactNode[];
  telas?: Record<string, React.ComponentType>;

  // Integração de dados
  provedorFinanceiro?: (params: { empresaId: string; ano: number; mes?: string })
    => Promise<{ receitas: number; despesas: number; detalhe?: LinhaFinanceira[] }>;

  // Integração com a IA
  contextoIA?: (params: { empresaId: string; mes: string; ano: number })
    => Promise<string>;
}
```

Um **registro central** (`registroModulos`) lista todos os módulos do produto. O app filtra esse registro pelos módulos ativos da empresa e usa só esses.

```ts
const registroModulos: ModuloAvantaLab[] = [ moduloVendas, moduloPonto, ... ];
// ativos = registroModulos.filter(m => modulosAtivosDaEmpresa.includes(m.id))
```

Assim, **adicionar um módulo ao código = adicionar um objeto** que respeita o contrato; o sistema base não muda.

---

## 6. Integração financeira (o ponto mais importante)

Como fazer as vendas (ou qualquer resultado de módulo) entrarem em gráficos, balanço e relatórios **sem reescrever cada relatório**?

**Abordagem recomendada — livro-caixa central com marcação de origem.**
- O módulo mantém seus dados detalhados nas tabelas dele (`vendas_pedidos`, etc.).
- Ao gerar um resultado financeiro, o módulo grava um **lançamento resumido** nas tabelas centrais (`faturamentos_entradas` para receita, `lancamentos` para despesa), com:
  - `origem_modulo` = 'vendas'
  - `origem_ref` = id do registro no módulo (para deduplicar/sincronizar/estornar)
- Resultado: todos os relatórios, gráficos e balanço **já existentes** passam a incluir o módulo automaticamente, porque leem o livro-caixa central.

Vantagens: zero alteração nas telas de análise; rastreável pela origem; reversível.
Cuidado: manter sincronizado (criar/editar/excluir no módulo reflete no lançamento de origem) — encapsular numa única função de serviço `registrarLancamentoDeModulo()`.

**Alternativa — provedores de dados.** O agregador financeiro do base itera os módulos ativos e soma o `provedorFinanceiro` de cada um. Mais desacoplado, porém exige tocar em cada relatório para chamar os provedores. Pode ser usado em conjunto (ledger para totais, provedor para detalhamentos específicos).

---

## 7. Integração com a IA (Ava)

O contexto enviado à Ava hoje é montado no app (web: rota `/api/ava/chat`; mobile: função `chat-ia`). Basta o montador de contexto **concatenar a contribuição de cada módulo ativo** (`contextoIA()`). Assim a Ava passa a conhecer vendas, ponto, etc., sem mudar o prompt base. Como o módulo financeiro já entra no livro-caixa, parte disso a Ava enxerga de imediato; o `contextoIA` cobre o detalhe que não está no ledger.

---

## 8. Assinaturas e cobrança

- **Por plano:** `plano_modulos` define o que cada assinatura concede. Ao assinar, o servidor preenche `empresa_modulos` (origem 'plano') conforme o plano.
- **Avulso:** o usuário contrata um módulo específico → checkout no servidor → `empresa_modulos` (origem 'avulso', com validade).
- **Gating:** sempre resolvido no servidor (view de módulos efetivos + RLS). O cliente só reflete visualmente.
- A cobrança em si (gateway de pagamento) é um passo separado; o desenho aqui já deixa o "ligar/desligar" pronto para plugar nela.

---

## 9. Permissões

Além de "a empresa tem o módulo", cada módulo declara **quais papéis** de usuário podem usá-lo (`perfisPermitidos`). Ex.: CRM acessível a Gestor/Administrador, mas não a Operador Simples. Validado tanto na UI quanto via RLS/servidor.

---

## 10. Mobile × Web

- **Web (Next.js/React):** ideal para módulos — cada módulo é um conjunto de componentes carregados sob demanda; o registro central faz a fusão naturalmente.
- **Mobile (`mobile-app.js`, JS único):** hoje é um arquivo grande. Dá para aplicar o mesmo conceito de "registro de módulos" dentro dele, mas, à medida que crescer, vale um passo de build/divisão em arquivos. **Recomendação:** módulos primeiro no **web**, levando ao mobile os que fizerem sentido.

---

## 11. Versionamento e migrações por módulo

- Cada módulo entrega seu **SQL versionado** (tabelas, índices, RLS, policies) e um número de versão.
- Uma tabela `modulo_migracoes(modulo_id, versao, aplicado_em)` controla o que já rodou.
- Atualizar um módulo = nova migração + nova versão do manifesto; o base não é afetado.

---

## 12. Roadmap de implementação

1. **Fundação (sem nenhum módulo ainda):** tabelas `modulos`, `empresa_modulos`, `planos`, `plano_modulos`; view `modulos_ativos_da_empresa`; RLS. Área "Módulos" no app (catálogo + ligar/desligar, inicialmente via admin).
2. **Framework de extensão no código:** o registro central + os slots (menu, dashboardCards, contextoIA, provedorFinanceiro, ledger com `origem_modulo`). Tudo funcionando com zero módulos.
3. **Primeiro módulo — Vendas/CRM:** plugar nos slots, validando ponta a ponta (botões aparecem, vendas viram receita nos gráficos/balanço, Ava conhece as vendas).
4. **Assinaturas/cobrança:** planos × módulos, contratação avulsa, checkout, gating.

---

## 13. Exemplo concreto — Módulo Vendas/CRM

1. **SQL do módulo:** `vendas_clientes`, `vendas_pedidos`, `vendas_itens` (todas com `empresa_id` + RLS por empresa e por módulo ativo).
2. **Manifesto `moduloVendas`:**
   - `itensMenu`: "Vendas" (lista/registro de pedidos), "Clientes".
   - `cardsDashboard`: card "Vendas do mês".
   - `provedorFinanceiro`: soma das vendas do período como **receita**.
   - `contextoIA`: "Vendas do mês: R$ X em N pedidos; ticket médio R$ Y; cliente top: …".
3. **Fusão financeira:** ao registrar uma venda, grava também uma entrada em `faturamentos_entradas` com `origem_modulo='vendas'` e `origem_ref=<pedido_id>`. Gráficos e balanço passam a incluir automaticamente.
4. **Ativação:** ligar o módulo `vendas` para a empresa (plano ou avulso) faz tudo isso aparecer; desligar, some — sem código a mais.

---

## 14. Resumo

A integração "por um botão" é trivial **depois** que a fundação existe: ativar um módulo é ligar um registro. O esforço fica em (a) construir a fundação + framework **uma vez**, e (b) desenvolver cada módulo respeitando o contrato. A chave para "fundir sem bagunçar o núcleo" é: **dados detalhados nas tabelas do módulo + impacto financeiro no livro-caixa central com marcação de origem + contribuições declaradas via manifesto nos slots do sistema**.
