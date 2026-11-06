# Pipeline de entregas — 3.2.0.85

Atualização 26/10/2026 — entrega 3.2.0.190: titular autorizou expressamente Enhanced fixa (8 vCPUs/16 GB), substituindo Elastic/Turbo automático. A guarda aceita somente esse tipo fixo adicional; Turbo continua bloqueado. Nenhum aumento de plano ou concorrência, dispensa de testes, fila ou conferência da base.

## Garantias

Sem mudança em autenticação, cookies, sessão, OAuth, permissões, RLS ou dados.
Não aumenta máquina/plano/concorrência paga da Vercel. Não desativa tipagem,
testes ou validadores para acelerar. O build continua falhando se um deles falhar.

Autorização do titular em 23/10/2026: aceitar também a configuração existente
Elastic/Standard (4 vCPUs, 8 GB), sem modificá-la. A verificação é somente de
leitura e mantém o build completo obrigatório. Basic continua aceita; máquina
maior, configuração desconhecida ou comando que pule o gate bloqueiam o envio.

## Testes e build

Autorização expressa em 24/10/2026: aceitar também Elastic/Enhanced já ativada
automaticamente pela Vercel (8 vCPUs, 16 GB). Verificação somente de leitura,
sem mudar plano, recursos ou concorrência. Configurações superiores ou distintas
continuam bloqueadas. Build completo permanece obrigatório.

- Durante edição: `npm test -- tests/pasta/arquivo.test.mjs` e
  `npm run test:seguranca`. Essa seleção não substitui o gate completo.
- Entrega: `npm run build` executa todos os testes, validadores, geração dos
  scripts próprios compactos e `next build --webpack`, com TypeScript obrigatório.
- O runner descobre arquivos `.test.mjs` na raiz de tests e em toda subpasta,
  sem depender do glob do shell. Um teste falho mantém saída não zero.
- Em dois núcleos usa dois processos isolados, em vez do padrão Node de um.
  Localmente limita também a dois para evitar pressão de memória em Macs de
  8 GB (PostgreSQL/WASM por processo); um núcleo continua com um processo.
  `AVANTA_TEST_CONCURRENCY=1` ou `2` permite reproduzir medições.
- Não há cache de aprovação: todos os testes executam sempre. Cache adicional
  de compilação do Node foi experimentado, mas não ativado por padrão porque
  não demonstrou ganho consistente. Um opt-in externo do Node é preservado;
  cobertura V8 o desativa para não prejudicar a precisão das métricas.
- Não apagar `.next/cache` por rotina, nem copiar `.next` inteiro para pacotes.
  A Vercel já restaura o cache do framework. Não fazer builds adicionais apenas
  para aquecer cache; medir no próximo build necessário.
- `tsconfig.json` mantém todo código da aplicação e tipos gerados do Next;
  exclui somente saídas/SDKs/projetos nativos. Testes nativos continuam explícitos.
- `.vercelignore` não envia outputs, backups ou binários. Uma allowlist de nove
  arquivos-fonte iOS permite validar cenas/deep link/idioma/privacidade sem
  subir SDK, certificados, configuração gerada ou DerivedData.

## Uma publicação por vez, sem pacote antigo

Na produção, confirmar `avantalab.com.br` pela API de aliases e conferir que o
deployment pertence ao projeto oficial e está `READY`. `targets.production`
pode apontar a última tentativa falha, sem que ela tenha substituído o domínio.
A base do pacote deve coincidir com o deployment realmente servido; falha de
leitura, identidade ou estado bloqueia o envio. A fila continua obrigatória.

1. Conferir a fila e a produção vigente antes de preparar um pacote isolado.
   Não publicar todo o checkout compartilhado, que contém trabalhos pendentes.
2. Registrar no pacote `avanta-entrega.json` com
   `{"baseDeploymentId":"dpl_IDENTIFICADOR_DA_PRODUCAO_USADA_COMO_BASE"}`.
   Copiar somente o escopo autorizado sobre essa base e conferir o diff.
3. Fazer os testes locais proporcionais ao risco. Não repetir a suíte completa
   local e remotamente por rotina; a completa remota permanece obrigatória.
4. Criar snapshot Git **no pacote**, sem alterar Git da raiz, com mensagem
   `VERSÃO — Módulo: resumo`. Não rastrear `.env`, backups ou certificados.
   `.vercel/project.json` deve apontar para o projeto/equipe AvantaLab.
5. A partir da raiz compartilhada:
   `npm run publicar:vercel -- --diretorio /pacote/absoluto --producao`.
   Sem `--producao`, o destino é preview, não produção.
   Se o CLI não estiver no PATH, `AVANTA_VERCEL_CLI` aceita seu executável ou
   caminho absoluto de `vercel/dist/index.js`, sem passar token na linha.
6. O comando verifica snapshot limpo, identificação, projeto/equipe, ausência
   de segredos rastreados, gate completo, trava local, fila remota e base atual.
   Falha de leitura bloqueia envio. Não remove trava existente, não cancela
   outra publicação e não usa `--force`, `--prebuilt` ou máquina maior.
7. Depois do upload devolve URL/id/estado e confere a descrição Git reconhecida
   pela Vercel. Recibo em `output/pipeline/`, ignorado pelo Git e pelo upload.
   Avisar imediatamente **enviado/em build**. `--producao` promove automaticamente
   após build aprovado; preview não recebe autorização de promoção implícita.
8. Conferir READY, descrição no provedor e domínios antes de dizer publicado.
   Se upload for incerto ou falhar após recebimento, consultar histórico antes
   de repetir. A fila impede novo envio enquanto houver BUILDING/QUEUED.

O mutex coordena comandos deste workspace, não outros computadores nem envios
manuais fora do procedimento. Todos os chats devem usar o mesmo comando.
Os testes de upload são simulados e não publicam nem alteram a Vercel.

## Medição

Comparações e limites da medição estão em
`docs/auditorias/pipeline-desempenho-2026-10-22.md`.
Não extrapolar um benchmark local como tempo já comprovado na Vercel.
