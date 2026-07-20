# Assinatura digital do REP-P

## Objetivo desta etapa

Preparar a infraestrutura de assinatura sem expor certificado ou senha e sem
emitir documentos com efeito legal até haver validação criptográfica de um
certificado ICP-Brasil válido.

## Cofre administrativo

O certificado é cadastrado em **`/admin > REP-P`** pelo administrador global.
Antes do primeiro cadastro, configure somente a chave mestra abaixo no ambiente
seguro de execução (por exemplo, Vercel). Nunca adicione este valor ao Git,
Supabase, código-fonte, logs ou chat.

| Variável | Conteúdo |
| --- | --- |
| `REP_P_COFRE_CHAVE_BASE64` | Chave aleatória de 32 bytes em Base64, usada para cifrar o A1 e sua senha com AES-256-GCM. |

O painel administrativo recebe o A1 e sua senha uma única vez, valida o arquivo
e armazena ambos cifrados. Nem o `/admin`, nem o Controle de Ponto exibem ou
permitem baixar a chave privada.

## Homologação com certificado vencido

1. Em `/admin > REP-P`, selecione **Homologação**.
2. Envie o certificado vencido e sua senha diretamente no painel.
3. A aba **Auditoria** confirma se o arquivo foi cadastrado e aponta
   que o certificado está vencido; nenhum conteúdo do certificado é exibido.
4. Não distribua comprovantes, AFD, AEJ ou Atestado Técnico assinados nesse
   modo como documentos legais.

## Entrada em produção

No painel `/admin > REP-P`, envie o novo e-CPF ICP-Brasil válido e selecione
**Produção**. A troca não exige alteração de código nem migração de banco; o
certificado anterior é inativado, preservando-se seu histórico técnico.

## AFD

Em **`/admin > REP-P`**, informe o número de registro do REP-P no INPI e o
CPF/CNPJ do desenvolvedor. Depois selecione empresa e período para baixar o
ZIP com o AFD texto e o arquivo de assinatura destacada `.p7s` (CAdES).

O AFD é gerado diretamente da ARP, ordenado por NSR. Em homologação, o arquivo
recebe o prefixo `HOMOLOGACAO-` e não deve ser usado como documento legal.

## Limite atual

Esta entrega valida a leitura, a senha e a vigência temporal do A1. A geração
PAdES e a geração de AFD com `.p7s` estão implementados. A validação completa
da cadeia ICP-Brasil e o AEJ serão tratados em etapas próprias; a emissão legal
continua condicionada ao certificado ICP-Brasil válido em produção.
