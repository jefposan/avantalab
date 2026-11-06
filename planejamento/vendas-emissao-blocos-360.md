# Emissão em blocos — avaliação local 3.2.0.360

Estado da avaliação 3.2.0.360: prévia interativa de desenvolvimento aprovada pelo responsável. A integração da entrega 3.2.0.361 está descrita abaixo.

## Comparação realizada

Tela aberta do VHSYS inspecionada em 06/11/2026, somente leitura: identificação; destinatário/vendedor; produtos/lista de preço; totais/retencões; pagamento/parcelas; transporte; detalhes; três tipos de observações. Não houve alteração nem emissão na conta externa.

| Bloco | Incluído na prévia |
|---|---|
| Dados da nota | Natureza com lista e descrição alternativa, finalidade, entrada/saída, série e número; referência condicional para complemento/devolução |
| Destinatário | Cliente, resumo cadastral, vendedor e lista de preços com vínculo demonstrativo por cliente |
| Itens | Componente existente, duas linhas compactas; quantidade, preço, desconto, subtotal e informações fiscais |
| Totais/pagamento | Frete, seguro, despesas, desconto, meio real do pagamento, condição, parcelas e primeiro vencimento; rateio em centavos com ajuste na última parcela |
| Tributos | Área recolhível para totais fiscais; sem valores fictícios de apuração. Área de retenções com PIS, COFINS, CSLL, IRRF e Previdência |
| Transporte | Modalidade, transportador/documento/IE/endereço, veículo/UF/RNTC, volumes/espécie/marca/número e pesos |
| Detalhes | Datas, hora, previsão de entrega, ordem de compra, atendimento, destino, intermediador e informações adicionais do emitente |
| Observações | Texto complementar, texto ao fisco, texto interno e criação/seleção de mensagens por destino |

Trocar lista com itens preenchidos oferece recalcular ou aplicar somente aos novos itens. O recálculo mantém quantidade e desconto. Texto interno é separado do texto complementar e do fiscal.

## Limites desta etapa de avaliação

Dados sintéticos; nenhum acesso ao certificado, banco, estoque ou transmissor fiscal. Mensagens e rascunho são mantidos na página, com opção de baixar o rascunho. Recarregar/reiniciar limpa a avaliação. Salvar e emitir executa somente conferência local e informa explicitamente que não houve envio.

Após aprovação do layout: vincular tabelas/mensagens ao perfil real no servidor, ampliar contratos de criação/revisão e mapear campos aceitos no XML/DANFE com testes de XSD. Mensagem interna não deve compor XML/DANFE. Finalidade, transporte, retenções e demais novos campos ainda não são transmitidos por esta prévia. Os tributos reais continuam sob o motor fiscal, sem inventar alíquotas para completar a interface.

## Fontes

- Tela autenticada aberta do VHSYS (leitura autorizada, sem gravar).
- [Guia de emissão do próprio VHSYS](https://ajuda.vhsys.com.br/categorias/vendas/nota-fiscal-eletronica-nf-e).
- [Mensagens fixas no VHSYS](https://ajuda.vhsys.com.br/categorias/configuracoes-basicas/nota-fiscal-eletronica-mensagens-fixas).
- [MOC 7.0 — Anexo I, CONFAZ](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf): referência estrutural para identificação, transporte e informações adicionais; a integração de envio deverá conservar também as Notas Técnicas e o XSD vigente do emissor.

## Integração 3.2.0.361

Formulário real usa as tabelas de preços ativas do perfil, preferência opcional por cliente, série ativa e mensagens padrão da empresa. Ponte autenticada mantém o token fora do iframe, verifica origem/janela/perfil e usa APIs server-side com permissões fiscal.prepare/fiscal.configure.

A criação e revisão da nota preservam os campos em retratos auditados. Dados fiscais públicos são mapeados para os grupos ide/emit/dest/retTrib/transp/infIntermed/infAdic/compra do leiaute 4.00. Dados internos e identificação da tabela de preços permanecem somente no sistema. Observações extensas possuem continuação no DANFE. O ambiente de homologação e os limites de tributação do emissor permanecem explícitos; finalidade/natureza precisam de regra publicada correspondente. Não há envio de nota pelo agente, nem movimentação financeira ou de estoque por emissão.

Migração 20261106123000: campo opcional de lista do cliente com FK composta por empresa; tabela de mensagens com RLS e runtime restrito ao piloto. Aplicada e registrada sem alterar registros fiscais existentes.

Validação: XSD PL_010e_v1.02, assinatura com certificado sintético, XML/DANFE sem mensagem interna, migração com PostgreSQL local, isolamento entre perfis e consultas reais somente leitura. A prévia /vendas-lab/emissao continua exclusiva do desenvolvimento e não transmite.

Revisão oficial adicional: MOC YA02-04 exige Sem pagamento para finNFe 3/4; finNFe 2 não recebe essa restrição. MOC B25c-20 proíbe indIntermed fora dos indicadores de presença 2/3/4/9; na NF-e, presença 4 é exclusiva da NFC-e e bloqueada no formulário. Testes cobrem os indicadores válidos e a rejeição de combinações incompatíveis.
