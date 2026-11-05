# Retornos de catálogo dos marketplaces

Revisão: 16/10/2026.

Toda integração traduz o retorno próprio do provedor para o contrato de apresentação em `app/marketplaces/catalog-feedback.ts`. A pessoa vê a mesma categoria de resultado em qualquer plataforma; um detalhe pode nomear o provedor e esclarecer limitações específicas sem trocar o significado do estado.

| Estado | Quando usar | Nunca confundir com |
| --- | --- | --- |
| `checking` | Consulta em andamento | Vazio confirmado |
| `empty` | Consulta completa e válida sem itens nem indicação de próxima página; no ML, sincronização concluída e seleção sem filtros | Erro, lista local ainda não sincronizada, filtro sem resultado |
| `found` | Presença de itens confirmada pela plataforma | Importação ou publicação concluída, se o conector só verificou presença |
| `denied` | Plataforma negou acesso à consulta | Conta sem anúncios |
| `failed` | Rede, resposta incompleta ou outra falha técnica | Conta sem anúncios |
| `unverified` | Nenhuma consulta conclusiva disponível | Conta sem anúncios |

Filtros locais sem linhas exibem “Nenhum anúncio nos filtros selecionados”, sem alterar o estado da conta. O adaptador de cada conector mapeia códigos e formatos técnicos para esses estados; a mensagem exibida não reproduz payloads, tokens nem erros brutos do provedor. A Magalu mapeia `has_skus` para `found`, esclarecendo que a listagem ainda não está integrada. O ML só afirma `empty` com `last_synced_at` da conta após o fluxo completo de sincronização. Novos conectores devem seguir esse contrato e ter testes para vazio, permissão negada, falha e resposta incompleta.
