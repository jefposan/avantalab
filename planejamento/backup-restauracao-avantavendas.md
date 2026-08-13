# Backup e restauração por perfil no AvantaVendas

Status: proposta estruturada para implementação

## Objetivo

Adicionar em **Configurações > Dados e segurança** os recursos **Backup**,
**Restaurar backup** e **Pontos de restauração**, seguindo a experiência da
Gestão Mobile e respeitando as contas compartilháveis do AvantaVendas.

A unidade de isolamento é sempre a **conta de vendas ativa** (`conta_id`), não o
usuário autenticado. Um mesmo login pode, portanto, manter backups independentes
para “Pessoal”, “Bóra Bebidas” ou qualquer outro perfil.

## Posição na interface

Criar um card de Configurações com o cabeçalho padrão já utilizado pelo
AvantaVendas:

**Dados e segurança**  
`Backup e restauração da conta: {nome da conta ativa}`

O corpo terá três linhas de ação, nesta ordem:

1. **Fazer backup** — Baixar uma cópia completa desta conta.
2. **Restaurar backup** — Selecionar e validar um arquivo compatível.
3. **Pontos de restauração** — Criar, consultar e restaurar cópias mantidas no
   servidor.

O card fica depois de **Conta de vendas** e antes de integrações, catálogo,
reset e exclusão. Ações perigosas nunca ficam no mesmo grupo visual da ação de
baixar.

### Estados obrigatórios

- Carregando no local da ação acionada, bloqueando submissão duplicada.
- Vazio: “Nenhum ponto criado ainda”.
- Erro no padrão de aviso sobre o card, com botão **Voltar**.
- Sucesso com resumo do que foi protegido ou restaurado.
- Sem permissão: explicar quem pode realizar a ação; não apenas desabilitar.

## Escopo do backup

O snapshot completo da conta inclui:

- clientes e endereços;
- produtos, preços, custo, estoque e metadados;
- movimentos de estoque;
- pedidos e itens de pedido;
- pagamentos;
- agenda;
- configurações operacionais próprias da conta, depois de migradas para escopo
  por `conta_id`.

Não entram no snapshot:

- senha, sessão ou identidade da conta AvantaLab;
- membros, convites e permissões da conta de vendas;
- vínculo empresarial de conteúdo, notícias, divulgação e catálogo publicado;
- destino financeiro e lançamentos já enviados à Gestão;
- arquivos de divulgação pertencentes à empresa publicadora;
- dados de outras contas acessíveis pelo mesmo login.

Essa separação impede que uma restauração altere autorizações, conceda acesso a
outra pessoa ou replique conteúdo que não pertence à conta operacional.

## Formato baixável

Usar um pacote versionado com extensão `.avantavendas`:

- `manifest.json`: versão do formato, aplicação, conta de origem, data, totais e
  checksum;
- `dados.json`: snapshot completo e normalizado;
- `resumo.xlsx`: cópia legível para conferência humana, mantendo a exportação
  que já existe hoje.

Nome sugerido:

`backup-avantavendas-{conta}-{AAAA-MM-DD-HHmm}.avantavendas`

O importador deve rejeitar arquivo alterado, incompleto, de versão futura ou de
outro produto. Nunca executar restauração diretamente a partir das planilhas do
resumo.

## Restauração de arquivo

Depois de selecionar o arquivo, apresentar um resumo antes de qualquer mudança:

- perfil e data de origem;
- totais de clientes, produtos, pedidos, pagamentos e agenda;
- versão do backup;
- conta de destino atualmente selecionada.

Oferecer dois modos:

### Atualizar dados

- Mantém os dados atuais.
- Atualiza registros que tenham o mesmo identificador estável.
- Adiciona registros ausentes.
- Não remove registros que existam somente na conta atual.

### Substituir dados desta conta

- Substitui apenas os dados operacionais da conta ativa.
- Exige digitar **SUBSTITUIR**.
- Cria automaticamente um ponto **Segurança antes da restauração**.
- Preserva nome da conta, membros, papéis, vínculos e integrações.

As duas operações rodam em transação no servidor. Se qualquer etapa falhar,
nenhuma alteração parcial permanece.

## Pontos de restauração

Criar estruturas específicas, sem reutilizar a tabela da Gestão:

### `vendas_mobile_pontos_restauracao`

- `id uuid`;
- `conta_id uuid` com exclusão em cascata;
- `nome text` opcional;
- `origem`: `manual`, `automatico_diario`, `pre_acao_destrutiva` ou
  `pre_restauracao`;
- `criado_por uuid`;
- `schema_versao integer`;
- `snapshot jsonb`;
- `checksum text`;
- `tamanho_bytes integer`;
- `criado_em timestamptz`.

### `vendas_mobile_pontos_restauracao_estado`

- `conta_id uuid` como chave;
- `alterado_em timestamptz`;
- `ultimo_diario_em timestamptz`.

### Retenção

- até 10 pontos manuais por conta;
- pontos automáticos diários por 30 dias;
- pontos de segurança por 90 dias;
- limpeza sempre restrita à mesma `conta_id`.

Alterações em clientes, produtos, estoque, pedidos, itens, pagamentos, agenda e
configurações marcam a conta como pendente. O processo diário cria um novo ponto
somente quando houve alteração desde o último automático.

## Permissões

| Ação | Proprietário | Administrador | Vendedor | Consulta |
|---|---:|---:|---:|---:|
| Baixar backup | Sim | Sim | Não | Não |
| Criar ponto manual | Sim | Sim | Não | Não |
| Ver pontos | Sim | Sim | Não | Não |
| Restaurar arquivo | Sim | Não | Não | Não |
| Restaurar ponto | Sim | Não | Não | Não |
| Excluir ponto | Sim | Não | Não | Não |

As regras são validadas no servidor usando
`vendas_mobile_papel_conta(conta_id)`. A interface apenas reflete a autorização;
ela não é a barreira de segurança.

## Operações no servidor

Criar funções transacionais `security definer`, com `search_path` fixo e
permissão apenas para `service_role`:

- `criar_ponto_restauracao_vendas_mobile`;
- `restaurar_ponto_restauracao_vendas_mobile`;
- `exportar_snapshot_conta_vendas_mobile`;
- `restaurar_snapshot_conta_vendas_mobile`;
- `marcar_ponto_restauracao_vendas_pendente`.

Criar API autenticada em `/api/vendas/backup` e
`/api/vendas/pontos-restauracao`. Toda chamada deve confirmar que o token atual
possui o papel necessário na `conta_id` enviada.

Durante a restauração:

1. bloquear concorrentemente a conta com advisory lock;
2. validar versão e checksum;
3. criar ponto de segurança;
4. desabilitar temporariamente sincronizações externas da conta;
5. aplicar os dados respeitando a ordem das dependências;
6. recalcular estoque e saldos derivados;
7. registrar auditoria com usuário, conta, origem e totais;
8. liberar a conta e solicitar recarga completa aos usuários conectados.

## Atualização em aparelhos abertos

Após restaurar, emitir evento Realtime por `conta_id`. Aparelhos que estejam na
mesma conta devem:

- bloquear ações enquanto recarregam;
- limpar somente o cache daquela conta;
- reler clientes, produtos, pedidos, pagamentos, agenda e preferências;
- mostrar **Conta restaurada com sucesso**;
- não afetar outra conta aberta pelo mesmo usuário em outro aparelho.

## Correção obrigatória do legado

As funções atuais `resetar_vendas_mobile_rpc` e a tabela
`vendas_mobile_backups_reset` foram criadas quando o Vendas ainda trabalhava por
usuário. Antes de expor restauração por perfil, substituir esse fluxo por versões
obrigatoriamente filtradas por `conta_id`.

O card **Resetar sistema** deve passar a dizer **Resetar esta conta de vendas**,
criar um ponto `pre_acao_destrutiva` e apagar somente os dados da conta ativa.
Nenhuma função nova pode usar `where user_id = auth.uid()` como limite do
snapshot ou da exclusão.

## Sequência de implantação

1. Criar tabelas, funções, triggers, auditoria e políticas no Supabase.
2. Corrigir o reset legado para escopo por conta.
3. Criar APIs de backup, análise, restauração e pontos.
4. Implementar pacote `.avantavendas` e resumo Excel.
5. Inserir o card **Dados e segurança** em Configurações.
6. Implementar os três fluxos em cards/modais no padrão visual atual.
7. Adicionar Realtime e limpeza de cache por conta.
8. Testar com duas contas no mesmo login e com uma conta compartilhada.
9. Testar restauração interrompida, arquivo inválido e rollback transacional.
10. Validar localmente antes de publicar Supabase e Vercel.

## Critérios de aceite

- Um backup de “Pessoal” nunca contém registros de “Bóra Bebidas”.
- Um usuário compartilhado gera backup somente da conta ativa autorizada.
- Administrador não consegue restaurar nem excluir pontos por chamada direta.
- Toda restauração cria um ponto de segurança anterior.
- Falha no meio da restauração mantém o estado original integral.
- Membros, papéis, vínculos comerciais e integração com a Gestão permanecem.
- Outra sessão aberta recebe a atualização automaticamente.
- Reset, arquivo baixável e pontos de restauração usam a mesma função canônica de
  snapshot; não existem três definições divergentes de “backup completo”.
