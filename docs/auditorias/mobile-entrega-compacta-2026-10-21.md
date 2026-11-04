# Gestão Mobile — entrega compacta 3.2.0.29

PADRÃO AVANTA consultado: v1.20.0. Escopo autorizado: reduzir scripts,
testar conexão lenta e publicar sem comprometer login/permissões.

## Implementação

- `scripts/gerar-mobile-otimizado.mjs` usa o Terser já distribuído pelo Next,
  com **compress=false e mangle=false**. Remove formatação/comentários comuns;
  preserva avisos de licença, nomes, chamadas, ordem e programa completo.
- Fonte `public/mobile-app.js` preservada: SHA-256
  `7656a1aa0375af1a9b643c436a7464be5f8dc028e46599530093f002ea5b78b9`.
- Saída gerada no build: `public/mobile-runtime/mobile-app.js`; manifesto com
  versão, hashes e medidas. Diretório ignorado no Git; não é fonte de edição.
- `beforeFiles` substitui internamente `/mobile-app.js` só em produção,
  preservando query, URLs antigas, bootstrap, OAuth, pontes, versão e SW.
  Desenvolvimento continua com código legível. Original e destino sem cache.
- Sem nova dependência, migração, alteração de dados ou upload às lojas.
  Supabase e AvantaVendas não são minificados novamente nem alterados.
- Publicação isolada derivada da produção .28, não de todo o checkout sujo.

## Medidas locais reproduzíveis

| Programa | Original | Compactado | Redução |
| --- | ---: | ---: | ---: |
| JavaScript descompactado | 1.073.645 B | 873.494 B | 18,64% |
| gzip local | 226.573 B | 193.832 B | 14,45% |
| Brotli local, nível máximo | 166.172 B | 145.271 B | 12,58% |

Compressão local não equivale ao nível usado pela CDN. O objetivo desta etapa
é redução conservadora de transferência/análise, não promessa de resolver toda
latência de consultas/login ou reduzir a quantidade de operações do programa.

## Verificações

- Programa inteiro normalizado pelo parser/impressor é idêntico antes/depois.
  Testes de nomes, Unicode, licenças, permissões, cache, URLs e pipeline.
- Regressões existentes de OAuth Google/Apple, retomada, abertura progressiva,
  restrições por perfil e ausência de leitura financeira antes da autorização.
- `scripts/testar-mobile-rede-lenta.cjs`: Chrome isolado, runtime inteiro,
  backend fictício, cache frio, 1.500 ms de latência, 40.000 B/s de download,
  20.000 B/s de upload e CPU 6×. Compara original/compactado em login sem sessão,
  sessão restaurada, financeiro bloqueado, acesso negado e falha de rede.
  Não usa conta, token válido ou dado financeiro real; saída em `output/`.
- Teste físico no Samsung/iPhone com Google/Apple e biometria é do titular:
  simulação de CPU/rede não reproduz hardware, WebView ou o provedor real.

## Resultado local antes do envio

- Dez cenários completos passaram (cinco no original e cinco no compactado),
  sem erro JavaScript, logout automático ou retorno indevido ao login. Perfil
  sem financeiro e acesso negado: nenhuma consulta a lançamentos/receitas.
- Download gzip na simulação: cerca de 7,2 s → 6,4 s (cache frio). Variações
  no tempo total de abertura não são atribuídas apenas à minificação.
- 76 regressões focadas de OAuth/abertura/permissões passaram. Suíte completa:
  1.567 testes, 1.566 aprovados, um ignorado e zero falhas. PADRÃO AVANTA/Ava
  aprovados. Build produção compilado e TypeScript aprovado com configuração
  local excluída do pacote; tentativas sem rede/fonte ou sem configuração
  não são falhas do app e não foram usadas para publicar.
- HTTP do build de produção: URL original com query e destino interno retornam
  exatamente o hash compacto e no-store; versão .29 disponível localmente.
- Medida pública anterior: 230.034 B via Brotli na CDN, fonte 1.073.645 B,
  hash idêntico ao original preservado. Comparação final após publicação.

## Recuperação

Reverter somente geração/rewrite (ou promover o deploy .28) restaura a entrega
anterior, sem rollback de banco. Não apagar armazenamento, pendências, sessão
ou dados do usuário; não reinstalar o aplicativo.
