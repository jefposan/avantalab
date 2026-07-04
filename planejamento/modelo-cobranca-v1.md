# Modelo de Cobrança — AvantaLab (v1)

Documento de referência para a implementação da versão paga. Escopo v1: **uma
assinatura única libera tudo**. Evolução futura: planos básico/completo +
módulos avulsos.

---

## 1. Visão geral

O sistema tem dois caminhos de perfil, com modelos de cobrança diferentes:

- **Pessoal** — grátis para sempre, com um "Premium Pessoal" opcional que
  desbloqueia recursos avançados. Nunca é totalmente travado.
- **Empresa** — "tudo ou nada": 7 dias de trial completo, depois paywall total
  até assinar.

O gancho técnico é a camada de plano **depois do login**. Hoje o `acessoLiberado`
significa apenas "está autenticado". A assinatura entra como uma verificação
adicional: logado → checa plano/assinatura → decide o que liberar. É o mesmo
padrão do bloqueio de acesso que já construímos no módulo de Ponto.

---

## 2. Perfil Pessoal — Grátis vs Premium

Filosofia escolhida: **núcleo grátis, avançados pagos**.

### Sempre grátis (núcleo)
- Lançar receitas e despesas
- Dashboard / Início
- Balanço Geral
- Aba Por Categoria (uso básico)
- Agenda básica
- 1 (um) perfil

### Premium Pessoal (assinantes)
- Assistente **Ava** (IA)
- **Exportação / Backup** em Excel
- **Análises avançadas**: aba Relatório + Gráficos
- **Busca nos lançamentos** (botão pesquisar)
- **Múltiplos perfis**: no grátis, limite de 1 perfil — criar novos perfis e
  trocar entre eles é premium
- **Notificações** (lembretes / push)
- **Organizar atalhos** (personalização)
- **Usuários internos** (criar usuário / equipe)

> Observação: o Controle de Ponto é exclusivo de Empresa, portanto não se aplica
> ao perfil Pessoal.

---

## 3. Perfil Empresa — Trial → Expirado → Pago

Modelo "tudo ou nada" (all-or-nothing):

| Estado | O que acontece |
|--------|----------------|
| **Trial (7 dias)** | Sistema completo liberado, incluindo Ponto, Ava, exportação, análises, notificações e tudo mais. |
| **Expirado (sem assinar)** | Acesso totalmente bloqueado. Após o login, o usuário cai numa **landing page** avisando que o teste de 7 dias venceu e oferecendo os planos de assinatura. |
| **Assinante ativo** | Sistema completo liberado. |

**Início do trial**: conta a partir da **criação do perfil empresa** — cada
empresa tem seu próprio período de 7 dias.

**Notificações**: existem apenas durante o trial ou com assinatura ativa.

**Bloqueio no vencimento**: se não assinar, **todos os acessos vinculados àquele
perfil são bloqueados — inclusive os funcionários do Controle de Ponto**. Ou
seja, o bloqueio do Ponto passa a considerar o estado da assinatura/trial (e não
apenas o `empresa_modulos.ativo`), reaproveitando o mecanismo já construído no
app do funcionário.

---

## 4. Preços

Cobrança em BRL. Regra do anual: paga 10 meses e ganha 2 (≈ 2 mensalidades de
economia).

### Empresa (libera o sistema completo)

| Plano | Preço | Total no ano | Economia vs. mensal |
|-------|-------|--------------|---------------------|
| **Mensal** | R$ 34,90/mês | R$ 418,80 | — |
| **Anual** | R$ 29,00/mês | R$ 348,00 | ~R$ 70,80 (≈ 2 mensalidades) |

### Premium Pessoal (desbloqueia os recursos avançados do perfil Pessoal)

| Plano | Preço | Total no ano | Economia vs. mensal |
|-------|-------|--------------|---------------------|
| **Mensal** | R$ 9,90/mês | R$ 118,80 | — |
| **Anual** | R$ 99,00/ano (R$ 8,25/mês) | R$ 99,00 | R$ 19,80 (2 mensalidades) |

---

## 5. Cupons de acesso

Recurso a construir: permitir distribuir **cupons que liberam o acesso**, sem
depender de pagamento. Casos de uso: avaliadores, parcerias, cortesias, promoções.

Tipos de cupom:
- **Por período** — libera o acesso por N meses (ex.: 3 meses). Ao terminar, cai
  na regra normal (paywall/assinatura).
- **Sem prazo (vitalício)** — libera o acesso por tempo indeterminado.

Pontos de modelagem:
- **Aplica-se somente ao Premium Pessoal.** A Empresa não tem cupom — seu único
  acesso gratuito é o trial de 7 dias.
- Um cupom vira um estado de assinatura tipo **cortesia**, com `valido_ate`
  preenchido (período) ou nulo/infinito (vitalício).
- Estrutura sugerida: tabela `cupons` (código, tipo, duração_meses, limite de usos,
  validade do próprio cupom, ativo) + registro de resgate (quem resgatou, quando,
  vínculo com o perfil/assinatura).
- Reutiliza o mesmo enforcement de acesso — o cupom só muda a origem da liberação.

---

## 6. Estados de assinatura (para a modelagem futura)

- `pessoal_free`
- `pessoal_premium`
- `empresa_trial` (guarda a data de fim do trial)
- `empresa_ativa`
- `empresa_expirada`
- `cortesia` (liberado por cupom — com `valido_ate` para período, ou sem prazo)
- (futuro) `empresa_atrasada` / período de carência para falha de pagamento

---

## 7. Ganchos técnicos no sistema atual

- **`acessoLiberado`** (hoje = logado) → adicionar a camada de plano logo depois.
- **Nova tabela `assinaturas`** (esboço): `empresa_id`/usuário, `tipo_perfil`,
  `plano`, `status`, `trial_fim`, `valido_ate`, ids do gateway
  (`gateway_customer_id`, `gateway_subscription_id`).
- **Helper central** tipo `podeUsar(recurso)` que lê o plano e é chamado nas
  telas/botões — evita espalhar regra de negócio.
- **Reaproveitar** `empresa_modulos` e o padrão de bloqueio do Ponto para o
  enforcement.
- **Webhook** do gateway como fonte da verdade da liberação (nunca liberar só
  pelo retorno do frontend).

---

## 8. Decisões ainda em aberto

1. **Gateway de pagamento**: escolher o processador (Pix/cartão/boleto,
   recorrência) em passo separado.

### Decidido
- Trial da empresa: 7 dias a partir da criação do perfil empresa (por empresa).
- Notificações: só no trial ou com assinatura.
- No vencimento sem assinar: bloqueio total do perfil, incluindo funcionários do
  Ponto.
- Preços Empresa: mensal R$ 34,90 / anual R$ 29,00/mês (R$ 348,00/ano).
- Preços Premium Pessoal: mensal R$ 9,90 / anual R$ 99,00 (paga 10, ganha 2).
- Clientes atuais: **mantêm o acesso como está** (são avaliadores); limitação
  fica para o futuro.
- Cupons de acesso: haverá cupons por período (N meses) e sem prazo (vitalício),
  **exclusivos do Premium Pessoal** (empresa só tem trial).

---

## 9. Próximos passos (por partes)

1. Fechar este modelo (revisar e ajustar). ✅ preços e regras definidos
2. Escolher o gateway de pagamento (Pix/cartão recorrente, taxas).
3. Modelar as tabelas: `assinaturas` (estados) + `cupons`/resgates + o helper
   central `podeUsar()`.
4. Implementar o gating nas telas (reaproveitando o padrão do Ponto).
5. Integrar o gateway + webhook de confirmação.
6. Landing de "trial expirado" e telas de upgrade.
7. Painel para gerar e distribuir cupons.
