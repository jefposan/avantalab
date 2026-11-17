# Tabela oficial de CFOP — revisão 3.2.0.469

Fonte primária: [Portal NF-e — tabela publicada em 04/09/2026](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=74KmX8poGpM=), IT 2023.002 v2.10. Consulta em 17/11/2026. A planilha oficial possui 619 linhas de códigos; foram extraídos código, título, início/fim de vigência, indNFe e indicadores de devolução/retorno/remessa. O hash SHA-256 da planilha e a URL estão no próprio JSON `app/vendas/lib/data/cfop-oficial.json`.

A busca mostra apenas entradas vigentes na data da nota e autorizadas para NF-e (585 na data desta consulta). O texto oficial completo é exibido na lista; a identificação selecionada respeita o limite de 60 caracteres do campo da NF-e. A lista inclui entradas e saídas; a emissão continua validando tipo, destino e regra publicada correspondente. Não presume que um código presente na tabela seja aplicável a qualquer empresa/operação.

Não há escrita automática em regras fiscais, cadastros, reservas ou notas anteriores. O CFOP escolhido e a edição dos itens pertencem à nota em preparação. O cadastro real do cliente fornece Consumidor final e situação da inscrição estadual. A origem da classificação fiscal permanece auditável na regra publicada.

## Conferência antes da publicação

A suíte local completa passou: 3.028 testes, 3.022 aprovados, seis ignorados e nenhuma falha. A suíte de segurança passou com 804 testes. TypeScript e verificadores do PADRÃO AVANTA/Ava aprovados. No navegador: busca por código e descrição sem acentos, seleção por teclado, reabertura/clique externo, CFOP editável, tema escuro e viewport de 390px sem excesso horizontal.

Na conferência somente leitura da nota em teste do Saldão Aline, o cadastro já informa consumidor final/não contribuinte, os endereços indicam operação interestadual e a matriz possui 5102/6102 publicados. A configuração fiscal do emissor e o item que a herda estão sem CSOSN, CST do PIS e CST da COFINS. Não foi atribuído código por suposição; nenhuma nota foi transmitida ou dado fiscal alterado. A liberação está condicionada à resolução dessa pendência e à validação remota integral.

Fontes primárias da exigência: [Portal NF-e — Simples Nacional](https://www.nfe.fazenda.gov.br/PORTAl/perguntasFrequentes.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=S%2FEAGUrzRyk%3D), CRT/CSOSN; [NT 2025.002](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?AspxAutoDetectCookieSupport=1&conteudo=SA3Qh5Htywo%3D), regras Q01-20/S01-20 e rejeições 745/748 na NF-e normal. Valores zerados não dispensam a classificação. Não alterada a validação existente de tributos.
