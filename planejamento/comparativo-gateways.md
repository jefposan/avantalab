# Comparativo de Gateways de Pagamento — AvantaLab

Objetivo: escolher o processador para a versão paga (assinatura recorrente, em
BRL). Valores de referência coletados em **julho/2026** — são taxas de tabela,
**aproximadas e negociáveis**; confirme na página oficial antes de fechar.

## Contexto do nosso caso

- Assinatura **recorrente** (mensal e anual).
- Tickets **baixos**: Premium Pessoal R$ 9,90/mês (R$ 99/ano) e Empresa
  R$ 34,90/mês (R$ 348/ano).
- Mercado **100% Brasil**, em Reais.
- Meios desejados: **Pix** (idealmente Pix Automático, para recorrência) e
  **cartão de crédito recorrente**. Boleto é opcional.
- **NFS-e** (nota fiscal de serviço) é desejável — vende para empresas.

> Ponto crítico para tickets baixos: **taxa fixa de Pix** (ex.: R$ 1,50–1,99 por
> cobrança) pesa muito no plano de R$ 9,90 (vira 15–20%!), mas é irrelevante no
> plano anual. Taxa **percentual** de Pix (ex.: Stripe ~1,19%) é muito melhor
> para ticket baixo. Isso influencia bastante a escolha.

## Efeito das taxas nos nossos tickets

| Cobrança | Pix taxa fixa R$1,99 | Pix taxa fixa R$1,50 | Pix % (~1,19%) | Cartão ~3% + R$0,49 |
|----------|----------------------|----------------------|----------------|----------------------|
| **R$ 9,90** (pessoal mês) | ~R$1,99 = **20%** | ~R$1,50 = **15%** | ~R$0,12 = **1,2%** | ~R$0,79 = **8%** |
| **R$ 34,90** (empresa mês) | ~R$1,99 = **5,7%** | ~R$1,50 = **4,3%** | ~R$0,42 = **1,2%** | ~R$1,53 = **4,4%** |
| **R$ 99** (pessoal ano) | ~R$1,99 = **2,0%** | ~R$1,50 = **1,5%** | ~R$1,18 = **1,2%** | ~R$3,45 = **3,5%** |
| **R$ 348** (empresa ano) | ~R$1,99 = **0,6%** | ~R$1,50 = **0,4%** | ~R$4,14 = **1,2%** | ~R$10,9 = **3,1%** |

Conclusão: **incentivar o plano anual** resolve o problema de taxa fixa no Pix
(no anual ela vira <1%) e ainda melhora o caixa. No mensal de R$ 9,90, ou usa Pix
com taxa percentual, ou aceita ~8% no cartão, ou negocia a taxa fixa.

## Comparativo

| Gateway | Recorrência | Pix / Pix Automático | Cartão (assinatura) | NFS-e | Integração (DX) |
|---------|-------------|----------------------|---------------------|-------|-----------------|
| **Asaas** | Sim, nativa; setup único ~R$9,90 | Pix ~R$1,99 fixo (promo R$0,99 nos 1ºs meses); Pix Automático p/ PJ | ~2,99% + R$0,49 | Sim (emite) | Boa, API + no-code; foco PME BR |
| **Iugu** | Sim, nativa (assinaturas por API) | Pix ~R$1,50 fixo; Pix Automático via API | ~2,51% à vista / ~3,21% parcelado | Sim (emissão automática) | Boa, API madura p/ SaaS |
| **Vindi** | Sim, especialista em recorrência | Pix recorrente/automático | MDR ~2–3,5% | Sim (integra fiscal) | Focada em billing recorrente |
| **Mercado Pago** | Sim (planos de assinatura) | Pix; Pix Automático (custo ~50% menor que cartão) | Cartão na hora ~4,98% | Limitado/via integração | Boa; checkout com **alta confiança** do consumidor |
| **Stripe** | Excelente (Stripe Billing) | Pix ~**1,19%** (percentual!) mas **invite-only** p/ empresa BR | ~3,99% + R$0,50 (assinatura) | **Não emite** NFS-e | Melhor DX/documentação; ideal p/ dev |
| **Pagar.me** (Stone) | Sim | Pix; recorrência | MDR ~2–3,5% | Via integração | Boa; infra Stone |

## Leitura para decisão

**Locais especialistas em recorrência + NFS-e (Asaas, Iugu, Vindi)** — melhor
encaixe para SaaS brasileiro que vende para empresa: emitem nota, têm assinatura
nativa, cartão mais barato que Mercado Pago e já suportam Pix Automático (que
reduz o churn involuntário de cartão). O ponto fraco é a taxa fixa de Pix no
ticket de R$ 9,90 — contornável com plano anual ou cartão.

**Stripe** — melhor experiência de desenvolvimento e a **melhor taxa de Pix
(~1,19% percentual)**, o que seria ótimo para o ticket de R$ 9,90. Porém: Pix
para empresa BR é **invite-only** (pode não liberar de imediato), **não emite
NFS-e** e o cartão é mais caro. Bom se formos card-first ou tivermos ambição
internacional.

**Mercado Pago** — maior familiaridade/confiança do consumidor final (pode
aumentar conversão), Pix Automático com bom custo, mas cartão mais caro (~4,98%)
e fiscal mais limitado.

## Recomendação (para validar)

Shortlist de 2 finalistas: **Asaas** e **Iugu**. Ambos entregam o essencial do
nosso caso (recorrência nativa, Pix Automático, cartão recorrente, NFS-e) com
custo de cartão competitivo. Iugu tende a ter Pix fixo um pouco menor e API bem
orientada a SaaS; Asaas é muito forte em PME e cobrança, com bom ecossistema.

Estratégia de meios: **puxar Pix Automático e plano anual** (taxa baixa,
churn baixo), deixando **cartão** como alternativa para quem prefere mensal.

Próximo passo sugerido: abrir conta sandbox nos dois finalistas, testar o fluxo
de assinatura + webhook, e confirmar as taxas reais no comercial (são
negociáveis por volume).
