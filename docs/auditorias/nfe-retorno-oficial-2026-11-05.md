# Emissão NF-e: conferência do contrato oficial — 05/11/2026

Escopo: autorização de uma NF-e modelo 55, retorno, consulta por chave e entrega dos documentos em homologação paulista. Esta revisão não equivale à liberação de produção nem à certificação de todas as regras tributárias.

| Contrato oficial | Fonte primária | Aplicação e evidência |
| --- | --- | --- |
| Integração, processamento síncrono, protocolo e situações de resposta | [MOC 7.0, Visão Geral, seções 5.1 e 5.2](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=LrBx7WT9PuA%3D) | Uma tentativa não equivale à autorização. Estado autorizado depende do protocolo correspondente. Rejeições de lote e de documento devolvem código e motivo. |
| Uma NF-e por lote usa resposta síncrona | [NT 2025.001 v1.03, seção 03.2, GAP03a-3](https://hom.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=uthum2eC3is%3D) | `buildNfeAuthorizationSoapRequest` exige `indSinc=1`. Resposta com recibo permanece suportada somente para reconciliação defensiva de retorno existente. |
| Endereços oficiais por ambiente | [SEFAZ-SP, URLs dos Web Services](https://portal.fazenda.sp.gov.br/servicos/nfe/Paginas/URL-WEBSERVICES.aspx) | Autorização e consulta do piloto usam os serviços 4.00 de homologação. Produção permanece bloqueada. |
| Prazo ordinário paulista e processo fora do prazo são distintos | [SEFAZ-SP, perguntas frequentes sobre cancelamento](https://www.fazenda.sp.gov.br/nfe/perguntas_frequentes/respostas_V.asp) | O fluxo ordinário do piloto verifica 24 horas; procedimento extemporâneo não é confundido com cancelamento comercial. |

## Achados comprovados no código e no banco

- O registro da tentativa anterior existia sem protocolo: não havia fundamento para exibir emissão concluída.
- O atalho de situação apenas navegava, sem abrir o documento.
- O executor de recuperação era chamado sem identificação de executor; não processava a fila. Agora recebe identificação e escopo da empresa/nota.
- O protocolo recuperado usava `versionId`, mas o serviço de guarda devolve `storageVersion`. A leitura de produção exige versão imutável; o ensaio local agora também exige esse contrato.
- Erros de HTTP e TLS eram reduzidos a falha genérica. O diagnóstico preserva somente código padronizado e status HTTP, sem corpo SOAP, XML, certificado ou credencial. A consulta preserva ausência de confirmação em falha de rede; não presume rejeição nem retransmite.

## Evidências e limites

Testes executam certificados efêmeros e respostas sintéticas controladas: autorização, rejeição, perda de conexão, consulta sem retransmissão, XML/DANFE e metadado legado. Eles verificam o código e o isolamento, mas não comprovam que a nota real foi autorizada. Essa conclusão depende da consulta oficial da chave e do protocolo recebido.

O índice oficial de [notas técnicas vigentes](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY%3D) também foi consultado. Cronogramas e regras tributárias novas exigem conferência do texto integral e de sua vigência; esta revisão não presume que uma versão de schema antiga valide todas as notas técnicas atuais.

## Correção 3.2.0.344 — confiança SSL e leitura do resultado salvo

A consulta real registrou `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`. A cadeia pública do host de homologação SP contém o servidor e AC SOLUTI SSL EV G4, emitida pela raiz ICP-Brasil v10 (SSL). O servidor não envia a raiz, que não faz parte das raízes padrão do Node. O ITI publica essa raiz em [seu repositório oficial](https://www.gov.br/iti/pt-br/assuntos/repositorio/repositorio-ac-raiz), arquivo `https://acraiz.icpbrasil.gov.br/credenciadas/RAIZ/ICP-Brasilv10.crt`.

Raiz SHA-256: `6E0BFF069A26994C15DE2C4888CC54AF84882E5495B7FBF66BE9CCFFEC7489F6`. A cadeia foi verificada contra essa raiz, e um handshake TLS Node sem certificado privado retornou `authorized: true`, TLSv1.2. Isso comprova a confiança HTTPS, não a autorização fiscal de uma nota. Hostname diferente e cadeia sem a raiz são recusados nos testes offline.

Os quatro transportes fiscais usam raízes padrão mais essa raiz SSL, sem alterar confiança global ou `rejectUnauthorized`. A raiz SSL permanece separada das raízes de assinatura A1. Referência Node: [TLS createSecureContext, opção ca](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions).

GET da situação não realiza mais consulta externa nem trabalha filas. POST explícito autentica, valida fiscal.view e o perfil antes de consultar somente a emissão pedida. A abertura reutiliza resultado já carregado; a resposta de emitir inclui o resultado persistido. Documentos confirmados permanecem disponíveis durante leituras posteriores. Não há alteração de numeração, retransmissão ou inferência de autorização/rejeição por ausência de resposta.

## Tratamento 3.2.0.345 — retorno oficial sem autorização localizada

A primeira consulta após corrigir TLS chegou ao autorizador, mas o código interno NOT-FOUND conservava o estado anterior, sem apresentar decisão ao usuário. Esse código interno era amplo; não permite inferir qual cStat foi recebido anteriormente. A correção consulta novamente e só libera retomada se o retorno oficial for exatamente 217, em homologação SP, vinculado à chave enviada na consulta. Os demais retornos mantêm código/motivo e não liberam reenvio.

Fonte primária: [MOC 7.0 no CONFAZ](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf), seção 5.4.4, tabela 5-16, regra J03 (consulta ao autorizador, mensagem 217). Não se trata 217 como autorização nem como cancelamento fiscal. A tentativa só volta à condição assinada por método interno específico, com versão, perfil, ausência de recibo/protocolo e checksum do artefato verificados sob transação. Não altera a máquina de transições genérica. O usuário precisa confirmar novo envio do mesmo XML/chave/número; a consulta nunca transmite.

Testes sintéticos: timeout → consulta 217 → retomada sem transmitir → ação explícita → autorização → XML/DANFE; e bloqueios para resultado incerto, outra chave/ambiente/empresa/versão, protocolo e transição genérica. Não comprovam a autorização da nota real.

## Correção 3.2.0.347 — rejeição real 588

A nota de homologação retornou 588, com motivo sobre caracteres de edição no início/fim ou entre tags. A tela apontava indevidamente revisão de produtos. Reprodução local com o gerador/assinador anterior encontrou 159 caracteres de quebra/tabulação e 159 trechos formatados entre tags. O XSD e a verificação isolada de assinatura aprovavam esse arquivo, mas não verificavam o requisito lexical.

Fonte primária: [MOC 7.0, §4.2.1.2 e §4.2.1.3, páginas 50–51](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf): montagem sem caracteres de formatação e declaração de namespace da assinatura no elemento Signature. O XML passa a ser compacto antes do digest e da assinatura; SignedInfo/Signature também são serializados sem indentação e com namespace padrão. Arquivo assinado com edição é bloqueado, nunca alterado no transporte.

A validação independente constrói o contexto de namespaces da árvore completa, canonicaliza por libxml2 e verifica SHA-1/RSA com a chave pública do certificado, além do XSD e da ausência lexical de edição. Evita que a mesma extração de fragmentos reproduza um erro de namespace no assinador e no teste.

Para a rejeição 588 confirmada, o próximo Salvar e emitir usa a revisão fiscal já existente, sem substituir os retratos de emitente/destinatário/itens/valores/pagamento por dados inventados. As transições e versões preservam reserva e histórico. Salvar sem emitir não revisa nem transmite; outros códigos de rejeição continuam exigindo correção correspondente. As permissões de SELECT/INSERT em emission_corrections e UPDATE em emissions já estavam presentes no papel técnico; nenhuma permissão ou RLS foi alterada.

## Conferência real 3.2.0.348

Na 3.2.0.347 publicada, o card abriu com correção 588, mas a prévia recalculou credenciamento a partir do cadastro local de demonstração, substituindo os checks do retrato já validado no servidor. O botão de emissão ficou desabilitado. A prévia agora preserva o retrato de nota persistida e rejeitada. O serviço de revisão continua relendo a mesma nota/empresa/versão, validando regras e schema, reaproveitando reserva e exigindo permissões; não há liberação de credenciamento inventada nem alteração de cadastro ou banco.

A leitura SQL do rascunho também omitia status_code/status_reason da emissão, impedindo os ramos 588/217 e devolvendo motivo genérico. A projeção e o mapeamento incluem esses campos internos. Um teste com PGlite executa o SQL real e o checkout sobre o mesmo registro, comprovando correção 588, retomada 217 e isolamento da outra empresa. Não há mudança de schema.

## Validação estrutural 3.2.0.349

O próximo teste real da correção 588 parou antes da assinatura/envio: o validador de pré-XML procurava uma quebra de linha antes de </NFe>, incompatível com a serialização compacta. O teste anterior exercitava assinatura/XSD, mas substituía o preparador da revisão por uma resposta simulada e não detectou esse conflito. O teste ampliado reproduziu AV-NFE-XSD-ROOT, e agora usa o preparador real na correção 588. A inclusão da assinatura estrutural somente na cópia de validação aceita fechamento compacto ou formatado; nenhuma assinatura fictícia é retornada/transmitida, e o XSD continua recusando estrutura inválida.
