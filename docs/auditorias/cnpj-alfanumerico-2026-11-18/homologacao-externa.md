# Teste externo autorizado — 18/11/2026

Resultado: **impedido antes da assinatura e da transmissão por indisponibilidade do acesso protegido no ambiente local**. Não é rejeição da SEFAZ nem teste externo concluído.

## Preparação conferida

- Emitente localizado por leitura autenticada: SALDAO ALINE COMERCIO VAREJISTA LTDA, CNPJ 69.758.267/0001-49, UF SP, perfil baa8c115-634a-41d3-9e2a-8666dce11454.
- Destinatário retirado da tabela oficial de CNPJs/IE do CCC de homologação: RJ, CNPJ `8Z.T3V.XKX/0001-40`, IE `99107014` (linha 5 de Planilha1). O CNPJ passou pela validação compartilhada de formato e dígitos.
- [Comunicado oficial de uso nos campos destinatário/transporte/autXML](https://www.nfe.fazenda.gov.br/portal/informe.aspx?AspxAutoDetectCookieSupport=1&Informe=oWHSn13fDzw%3D&ehCTG=false).
- [Tabela oficial](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=n717OW6zQ7Q%3D), SHA-256 `0eb77b381b7f0976ced798dba9ecf2b0f52103870c9c0bca37c4cdfa6831bacb`, 12.366 bytes, Planilha1 com 36 linhas e três colunas. Somente leitura; arquivo inalterado.

## Impedimento confirmado

A API autenticada da Vercel identifica `FISCAL_DATABASE_URL` e `FISCAL_CERTIFICATE_MASTER_KEY` como `type=sensitive`, `decrypted=false`, sem propriedade `value`. Os parâmetros protegidos do pooler também não foram disponibilizados. Esses valores não foram impressos, exportados, substituídos ou reconfigurados. O arquivo temporário de ambiente usado na entrega anterior contém valores redigidos e não é credencial funcional.

Sem conexão fiscal e acesso ao cofre não foi possível confirmar/reservar a sequência de homologação ou usar o certificado ativo para assinar. Não foi feita tentativa de contornar a proteção ou de alterar o ambiente global de produção.

## Preservação verificada

- Consulta somente leitura de `cadastros_perfil` e `vendas_fiscal_perfis` do Saldão Aline antes/depois: mesmo hash SHA-256 `bdbad26754299929d0eb81c4ada9fc8bdf9243b1c61376f8add22d89c6f957a9`.
- Nenhuma gravação SQL, chamada REST de alteração, reserva numérica, criação de cliente/rascunho, emissão, cancelamento, alteração de variável Vercel ou publicação realizada.
- Nenhuma autorização, chave nova ou protocolo da SEFAZ existe para este teste.
- A aba de produção foi somente inspecionada; não foi trocado o perfil nem alterado o módulo aberto pelo responsável.

## Para concluir

Disponibilizar um ambiente separado de homologação com acesso seguro ao certificado existente e à persistência/numeração isolada por ambiente. Não é necessário outro CNPJ nem certificado do destinatário. Os segredos podem ser fornecidos ao ambiente por seu responsável, sem publicação em chat, logs ou Git. Em seguida: reservar número em homologação, preencher o endereço fictício compatível com a UF do destinatário, validar XSD/assinatura, transmitir exclusivamente com tpAmb=2, consultar o protocolo e conferir XML/DANFE. Não mudar a configuração de produção para realizar esse ensaio.
