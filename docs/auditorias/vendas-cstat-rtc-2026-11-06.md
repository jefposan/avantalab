# 3.2.0.371 — Retornos RTC e retomada da edição

Base: main 9b4468d566b3896e05da53ac6aa42d3107fef6bf, produção dpl_8cwmi52rXMLXQdZXRqskH4yuYSou. Worktree isolada; checkout compartilhado e preservações anteriores intactos.

## Evidência e limite

A NT 2025.002-RTC define cStat com 3–4 dígitos. Fonte oficial: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=bBbBVKSai3U%3D . O próprio XSD versionado em schemas/nfe/PL_010e_v1.02/tiposBasico_v4.00.xsd, tipo TStat, contém [0-9]{3,4}. O parser, submissão, ciclo, recuperação, contrato de correção e três checks do banco restringiam a três dígitos. Teste reproduziu lote 104 com rejeição 1040 sendo interpretado como ausência de resultado individual. Não há preservação do SOAP original dessa tentativa: seu código individual exato não foi recuperado nem presumido.

Consulta somente de leitura confirmou os três checks em produção e a nota selecionada no estado signed/217, sem autorização/protocolo. Nenhum XML foi retransmitido por esta auditoria. A assinatura guardada foi examinada em memória: checksum e namespaces de NFe, infNFe e Signature corretos, sem exportar conteúdo ou certificado.

## Correção

Retornos de 3–4 dígitos mantêm código e motivo até a rejeição e edição. Para tentativa signed/217, Salvar ou Salvar e emitir solicita retomada transacional: mesma empresa/versão, ambiente de homologação, ausência de protocolo/recibo/autorização, checksum íntegro e evento imutável emission.not_received_confirmed da mesma versão. A nova revisão conserva série, número, reserva, artefatos e histórico; limpa somente o vínculo da assinatura anterior e exige nova validação antes de assinar. Tentativas incertas continuam protegidas.

A migração 20261106180000 amplia somente três CHECKs. Não atualiza registros, permissões ou numeração. Sua execução e seu registro remoto exigem autorização específica; não executar toda a fila histórica.

## Validação

Testes sintéticos sem rede e PostgreSQL local verificam rejeição de quatro dígitos, persistência real, recusa de códigos inválidos e isolamento da prova 217. Testes do editor verificam edição/Salvar em signed/217, rejeição e bloqueio de estados incertos. Segurança, tipagem com next typegen, PADRÃO AVANTA e Ava conferidos. A autorização real da nota permanece dependente do retorno oficial; não foi inventada nem simulada em produção.

## Aplicação autorizada em produção

O titular autorizou expressamente a migração e seu registro em 06/11/2026. A transação aplicou somente os seis ALTERs previstos e incluiu a versão 20261106180000, nome vendas_cstat_rtc, no histórico oficial. Consulta posterior confirmou os três checks com 3–4 dígitos e igualdade integral entre o SQL registrado e a fonte versionada. Não houve alteração de registros fiscais, numeração ou permissões.
