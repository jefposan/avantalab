# Fechamento da auditoria — candidata 3.2.0.310

As causas das 19 diferenças foram identificadas e documentadas. **Nenhum SQL de migração
foi executado no Supabase: as consultas remotas foram somente de leitura.
Nenhum histórico remoto foi reparado e nenhuma publicação foi feita nesta etapa.** O envio da branch e a abertura de PR ainda
exigem autorização explícita do responsável.

Produção de referência: 3.2.0.309, `dpl_Dq1wCBwU92G354cov6BCiN4qrYt9`.
Main de partida: `027fd1e85dbad471146d0b1bb7556106f5787ced`.
O espelho de 2.314 fontes dessa produção permanece separado e intacto.

## Resultado dos 19 casos

| Migração | Causa/evidência | Tratamento local |
|---|---|---|
| 20260708143000 | Saldo inicial e índice foram incorporados retroativamente ao arquivo antigo; a migração 20260708150000 registra esses acréscimos e o estado atual os confirma. | Restaurada a sequência originalmente registrada. |
| 20260718123000 | Nome plural alterado depois. O registro confere com o blob histórico do commit 3b691f1; a correção de nome está em 20260718210000. | Restaurado o SQL registrado, preservando a correção posterior. |
| 20260718173000 | Texto de Recebimentos foi alterado no arquivo histórico; o registro confere com 3b691f1. Funções evoluíram em migrações posteriores. | Restaurado o SQL registrado. |
| 20260801090000 | O registro inclui índice idempotente, também previsto em 20260801091000; índice atual confirmado. | Restaurado o SQL registrado. |
| 20260807190000 | Registro manual guardou somente versão/nome. Fonte reconstruída das edições do chat coincide byte a byte com o arquivo publicado; objetos atuais conferidos. | Fonte preservada; provas externas anexadas. |
| 20260820160000 | Aplicação por `--file` e registro separado sem statements, ambos com saída 0. Patch original coincide byte a byte com a fonte publicada. | Fonte preservada; transcrição histórica anexada. |
| 20260905152000 | Diferença em COMMENT ON COLUMN sobre documento CPF/CNPJ, não em regras de validação da aplicação. | Restaurado o comentário histórico registrado. |
| 20260907143000 | O SQL remoto corresponde ao rascunho original `.sql.pending`, com duas barras; o arquivo final foi salvo com uma. | Restaurado o SQL registrado. Nenhuma limpeza de clientes foi repetida. |
| 20261005200000 | Comando concluído com saída 0 aplicou o arquivo e depois registrou `array[]::text[]`. Blob aplicado 7c08509 coincide com o publicado. | Fonte preservada; execução e vínculo Git documentados. |
| 20261016190000 | Texto do registro sofreu expansão de tokens `$` pelo segundo argumento string de String.replace. Gerador histórico recuperado. | Fonte válida preservada; corrupção do registro reproduzida byte a byte. |
| 20261022010000 | Instalador guardou deliberadamente uma descrição, não o SQL. Leitura do arquivo, resultado migrationApplied=true e deployment promovido identificados. A fonte da primeira publicação confere com a atual. | Fonte preservada; script/resultado e hash da primeira publicação vinculados. |
| 20261023050000 | Registro sem statements. Aplicação documentada na entrega 3.2.0.114; fonte da primeira publicação inalterada, estrutura/RLS/ACL atuais corroboram todo o DDL. | Fonte preservada; ressalva sobre ausência do log SQL original explícita. |
| 20261024050000 | Expansão de tokens `$` no registro. | Fonte preservada; reprodução exata do registro danificado. |
| 20261026020000 | Formatação da função produzida pelo PostgreSQL, rótulo do dollar-quote e sintaxe equivalente do search_path. | Nenhuma mudança SQL; equivalência de corpo, cabeçalho e permissões verificada. |
| 20261026030000 | Mesma normalização de formatação do PostgreSQL. | Nenhuma mudança SQL; equivalência verificada. |
| 20261026220000 | Expansão de tokens `$` no registro do bloco de transformação de funções. | Fonte preservada; reprodução exata do registro danificado. |
| 20261027010000 | Expansão de `$$` e `$'` danificou o texto armazenado, inclusive finais de regex. Evolução das funções de claim registrada nas migrações seguintes. | Fonte preservada; reprodução exata e cadeia posterior identificada. |
| 20261027020000 | Mesma corrupção; migração 20261027030000 explica as definições posteriores de confirmação, aplicação e claim. | Fonte preservada; reprodução exata e evolução identificada. |
| 20261104160000 | Registro descritivo. O núcleo SQL do literal no chat equivale à fonte publicada, retirados somente o guard e o INSERT de registro; objetos atuais conferidos. | Fonte preservada; extração sintática documentada, sem executar o código do chat. |

## O que a prova permite afirmar

- Após o ajuste local, 258 dos 271 arquivos de migração conferem lexicalmente
  com o SQL remoto registrado. Dois outros têm equivalência de formatação
  comprovada; cinco registros danificados são reproduzidos exatamente pelo
  mecanismo de substituição JavaScript observado no gerador histórico.
- Os seis registros restantes não guardam SQL integral. As fontes foram
  recuperadas/corroboradas por Git, transcrições, fontes dos deployments e
  estrutura atual. **Isso não transforma um registro ausente em prova de bytes
  que o Supabase não arquivou.** Em especial, a publicação multiconta tem prova
  estrutural e de entrega, mas não um log recuperado dos bytes da chamada SQL.
- O efeito atual do banco é preservado: esta reconciliação não aplica migrações,
  não altera permissões e não repete comandos de limpeza de dados.
- A [auditoria específica dos 15 SQLs](AUDITORIA-15-SQL.md) confirma recursos
  presentes e uso publicado. São fontes históricas do produto preservadas em
  `supabase/historico-sem-registro`, não apenas fixtures; nenhuma função ativa
  foi removida e os originais da raiz compartilhada permanecem intactos.
- Não foi criada nenhuma nova migração. Os seis ajustes são restaurações de
  arquivos históricos já registrados, sem execução remota.

## Verificação reproduzível

`npm run verificar:historico-migracoes` lê os arquivos e os registros anexados,
confere os 19 hashes e executa somente comparações de strings/tokens. Não usa
rede nem conexão SQL. O código histórico anexado é dado de auditoria, não uma
instrução de execução.

As provas estão em `evidencias-registros-remotos.json`,
`provas-execucao-historica.json`, `provas-variantes-historicas.json`,
`prova-gerador-registro.json` e `ajustes-historicos.json`.

O teste também verifica que mudanças de permissões, literais, corpos SQL,
fontes ou registros rompem a comparação. Uma substituição por callback
(`replace(..., () => record)`) preserva os dólares; a variante histórica com
argumento string os interpreta. Essa reprodução não aplica nenhuma migração.

## Proposta de integração e restauração

1. Obter aceite explícito das ressalvas documentais e autorização para enviar
   **somente a branch isolada e abrir um PR em rascunho**, sem merge, promoção
   ou operação de banco. A descrição do PR deve levar este inventário e os testes.
2. Revisar o PR antes de autorizar integração. Reconfirmar produção vigente,
   main, versão e fila. A raiz canônica continua preservando os trabalhos paralelos.
3. A integração é por commits normais que preservam a main, sem force. Antes
   de autorizar merge, conferir se ele dispara produção automática no provedor;
   não tratar aprovação de PR como autorização implícita para publicar.
4. Publicação posterior exige autorização própria e SHA exato da main vigente.
   Plano SQL desta entrega: `migrations: []`. O bloqueio de envio do candidato
   permanece até o aceite do responsável.

Antes de integrar, restauração consiste em não incorporar o candidato: main e
produção continuam intactas. Depois de alinhar a main, **não reverter a importação
inteira**, pois isso devolveria o Git ao código antigo 3.1.0. Corrigir por novo
commit sobre a linha atual, usando o espelho 3.2.0.309 como referência funcional
e mantendo versão crescente. Não executar down, repair, reaplicação de limpeza
ou alteração de dados para acompanhar uma restauração de código.
