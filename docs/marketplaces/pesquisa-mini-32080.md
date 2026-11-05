# Pesquisa econômica — 3.2.0.80 — validação não aprovada

Estado: preparação local. Não aplicar migração nem publicar até resolver a conferência de preço/disponibilidade na origem. Produção continua na entrega anterior; não alterar outros modelos da Ava, voz ou importador.

## Implementação preparada

- Somente `gpt-5.4-mini`; não respeitar override para 5.5 nem fazer fallback automático. Responses, saída JSON estruturada, raciocínio baixo, contexto web baixo e 2.500 tokens de saída.
- Até cinco ofertas. `max_tool_calls=2` é enviado, mas na avaliação houve duas ações search e uma open_page; contabilizar tudo que o provedor retornar, sem prometer custo exato ou duas ações totais.
- Exigir citação da URL direta, rejeitar páginas de busca/listagem, conferir modelo/voltagem/capacidade do título. Nunca preencher a amostra com variante aproximada.
- Cache por empresa/hash da identidade (inclui EAN e nome/variante). Resultado com oferta por seis horas; sem oferta, dez minutos. Consulta somente de preço pode usar resultado completo; consulta completa não usa ficha parcial.
- Reserva serializada no PostgreSQL evita custo simultâneo duplicado entre instâncias. Limites de 5 chamadas/minuto por usuário, 30/hora e 100/24h por empresa; cache retorna antes dos contadores. Falha de reserva impede o fetch pago.
- Lease de dois minutos para requisição interrompida; não repetir automaticamente. Finalização registra sucesso/falha/cancelamento, tokens, ações web, modelo, identidade consultada e estimativa em US$. Sem uso retornado, estimativa desconhecida — não custo zero.
- Sinal HTTP encaminhado ao fetch OpenAI em todas as entradas pagas. Cancelamento é melhor esforço e não garante estorno do que já foi processado. Cadastro/preços/saldo não são apagados.
- Atualização de ficha já preenchida pede apenas preços. Crédito/cota indisponível não recebe mais instrução enganosa de apenas aguardar.

## Avaliação real — 22/10/2026

Seis requisições, em duas amostras de três, todas exclusivamente mini. Nenhuma alteração em produtos, saldos ou anúncios. Custo estimado pelas métricas retornadas: US$ 0,22279175, não uma fatura oficial. Não fazer novas tentativas pagas automaticamente.

1. Primeira amostra trouxe páginas de busca como ofertas e não respeitou o caso de teste com voltagem inexistente. Implementados filtros determinísticos.
2. Segunda amostra: calculadora Elgin MB7142 e chaleira Oster com URL direta, e caso 999V sem oferta após filtros. Porém isso não aprova preço atual.
3. Na conferência independente no Chrome, `MLB2757241089` estava **pausado**, com preço de R$ 1.437,91. O modelo havia informado **R$ 841,27**. Não existe comprovação de que essa oferta esteja disponível por esse valor.
4. Abertura independente da fonte Fastshop não foi confirmada pelo leitor web. Não presumir que preço/estoque sejam atuais nem afirmar que o EAN/voltagem foi comprovado.

Conclusão: filtros locais melhoraram identidade, mas pesquisa generativa/citação não substitui validação de preço e disponibilidade no anúncio/página. A aprovação de qualidade bloqueia a publicação conforme solicitado. Próximo trabalho: conferir oferta na origem por leitura autorizada/estruturada e rejeitar oferta sem comprovação, sem elevar modelo automaticamente.

Relatórios privados de execução: `/private/tmp/avanta80-quality.json` e `/private/tmp/avanta80-quality-refined.json`. Migração `20261022200000_marketplace_price_ai_controls.sql` somente preparada e testada em PostgreSQL isolado.

## Verificações locais concluídas

- Pacote isolado baseado no snapshot .79 confirmado READY na Vercel; sem incorporar alterações não relacionadas da raiz.
- 1.800 testes aprovados, nenhum erro e um ignorado; inclui a migração executada em PGlite e verificação de cache, reserva, limites, usuário dedicado, RLS e bloqueio de acesso cruzado.
- TypeScript do escopo, lint dos novos serviços/filtros, PADRÃO AVANTA 1.21.0 e manuais Ava 3.2.0.80 aprovados.
- Teste automatizado aprovado não substitui a aprovação de qualidade comercial: preço e disponibilidade reais continuam como bloqueio de publicação. Nenhuma migração de produção, deploy ou troca de modelo em produção executada nesta entrega.
