# 3.2.0.487 — Adequação da NF-e ao CNPJ alfanumérico

Entrega local na branch `codex/nfe-cnpj-alfanumerico`, criada de `origin/main` bf23417f89c90e8ac9ea246f94da9ed7227c2fda, versão 3.2.0.486. PADRÃO AVANTA 1.24.0. Não publicada; migração hospedada não executada.

## Alteração e preservação

- CNPJ `[A-Z0-9]{12}[0-9]{2}`; chave `[0-9]{6}[A-Z0-9]{12}[0-9]{26}`. A chave continua com 44 posições. DV usa ASCII menos 48 e módulo 11, com o mesmo resultado para chaves numéricas.
- Preparação, identidade do certificado, XMLDSig, envio/consulta/recuperação, guarda privada, download e DANFE preservam letras. Não são removidas para fazer uma identidade passar pela validação.
- DANFE conserva geometria, textos, margens, logo e regras anteriores. Apenas CNPJ/chave e codificação Code128 passam a suportar letras. Chaves numéricas conservam Code C e o PDF anterior, comprovado por hash.
- Cancelamento alfanumérico usa pacote oficial NT 2026.004 v1.01, com hash/proveniência em `schemas/nfe/Evento_CNPJAlfa_NT2026.004_v1.01/SOURCE.md`; os originais não foram editados. O detalhe 110111 continua passando pelo XSD específico. O pacote histórico numérico permanece intacto.
- Migração `20261118190000_nfe_identificadores_alfanumericos.sql` altera somente três CHECKs de identificadores. Não atualiza registros. Permissões, RLS, vínculos, índices, regras fiscais, CFOP, impostos, configuração, séries e reservas não são modificados.
- Campo de chave referenciada aceita texto de 44 posições sem apagar letras. Sem alteração de layout ou dos demais campos.
- Base inclui todas as entregas anteriores até 3.2.0.486, inclusive os ajustes paralelos de Custos e Precificação. Checkout canônico preservado.

## Evidências locais

- Suíte completa: 3.078 testes, 3.072 aprovados, seis ignorados, nenhuma falha (142,7 s).
- Após o tratamento de CNPJ com DV malformado, 37 testes direcionados passaram; a suíte alfanumérica foi ampliada e seus 12 testes passaram ao final.
- Seis XMLs/chaves numéricos anteriores idênticos byte a byte, dois PDFs numéricos idênticos por SHA-256. Proveniência em `tests/fixtures/fiscal/README.md`.
- Fluxo simulado de checkout → reserva única de número → assinatura → protocolo → procNFe → DANFE concluído para CNPJ numérico e alfanumérico, em homologação e produção simulada, sem chamadas externas. XML assinado validado pelo XSD oficial PL_010e_v1.02.
- Certificado PKCS#12 sintético: titular com letras preservado; titular divergente, senha incorreta e validade expirada recusados. As verificações de cadeia ICP-Brasil e revogação permanecem obrigatórias no adaptador protegido; o certificado sintético não representa uma credencial real.
- Evento, lote, retorno e procEvento alfanuméricos validados. Evento indevido, justificativa curta, alteração de conteúdo assinado e DOCTYPE recusados.
- Code128 híbrido decodificado por ZXing com diferentes combinações de letras/pares numéricos. PDFs numérico e alfanumérico renderizados pelo Poppler e inspecionados visualmente, sem corte da chave/CNPJ ou mudança de layout.
- Guarda local e Supabase simulada conservam versões/checksum e rejeitam rota de outro CNPJ/chave. Schemas oficiais e espelho do módulo conferidos por hash.
- Migração executada somente em PostgreSQL/PGlite local: registros numéricos conservados; novos formatos válidos aceitos; letras fora das posições autorizadas recusadas.
- `verificar:padrao-avanta`, `verificar:ava`, TypeScript e verificações de acesso Web/Mobile, agenda, interface e revisão AvantaVendas aprovados.
- Build Next/Webpack aprovado: compilação, TypeScript e 245 páginas. Usou URL `.invalid` e chaves fictícias, sem credenciais reais. Downloads públicos das fontes foram necessários; primeiras tentativas esbarraram em rede, variáveis ausentes e espaço em disco. O cache deste checkout foi limpo e o build final usou cache persistente desativado temporariamente. `next.config.ts` foi restaurado byte a byte, sem alteração na entrega.
- Pacote compilado inclui os novos schemas nas rotas fiscais por output-file tracing.

## Referências oficiais

- [NT Conjunta DFe 2025.001](https://portalsped.fazenda.mg.gov.br/spedmg/export/sites/spedmg/nfag/downloads/DFe-NTCJ-2025.001_CNPJ-Alfa_v1.00.pdf): estrutura, DV e representação da chave.
- [Portal NF-e: schemas de eventos NT 2026.004 v1.01](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=FOEnx2KAsCk%3D).
- [ITI: DOC-ICP-04.01](https://www.gov.br/iti/pt-br/assuntos/legislacao/documentos-principais/IN2020_15_DOCICP_04.01.pdf): identificação CNPJ no otherName 2.16.76.1.3.3.

## Limites da validação inicial (18/11/2026)

Não foi emitida/cancelada nota real, acessado certificado privado de cliente, alterado banco hospedado, integrado à main ou enviado pacote à Vercel. Testes locais não equivalem à autorização externa da SEFAZ para emitente alfanumérico.

Antes de liberar o novo formato: validar em homologação com CNPJ/certificado alfanumérico legítimos e autorizador apto, reconciliar com a main atual e aplicar/publicar a entrega pelo pipeline oficial quando autorizado. Preservar o fluxo numérico atual e os artefatos históricos durante essa etapa. Não fabricar um CNPJ ou instalar certificado de teste no cadastro real para transmitir.

## Entrega 3.2.0.504 — 19/11/2026

Integração realizada sobre main 3.2.0.503 (bf2b0f3), preservando as entregas posteriores. Resultado externo em homologacao-externa.md: destinatário alfanumérico oficial autorizado, cStat 100/protocolo 135260010146989. Não comprova emitente alfanumérico ou cancelamento externo. Laboratório, certificado e snapshots locais não pertencem ao pacote.

Inspeção do banco real identificou a restrição de chave em transmission_attempts (artefatos não possuem tal coluna). Migração e teste corrigidos antes da aplicação: emissions, transmission_attempts e certificates aceitam letras somente nas posições oficiais. Migração aplicada em transação com limites de bloqueio/execução, registrada no histórico e três definições conferidas depois; nenhum UPDATE comercial/fiscal ou alteração de configuração.
