# AvantaProjetos — módulo oficial Web

Implementação original do **Mapa de Projetos**, inspirada apenas na experiência
funcional de ferramentas profissionais de mapas mentais. Não utiliza código,
marca, DOM, imagens, textos comerciais ou identidade visual do ClickUp.

## Integração

- Pasta exclusiva: `app/projetos`.
- Rota oficial: `/projetos`, em página total na mesma guia.
- O botão **Projetos** aparece no menu da Gestão quando o módulo está instalado.
- O botão **‹ Início** retorna à Gestão preservando o perfil ativo.
- Dados são persistidos no Supabase por `empresa_id` e preservados ao remover.
- Acesso, instalação, validade e hierarquia são validados no servidor e por RLS.
- Superfície suportada: somente navegador Web; não integra o mobile.

## Arquitetura

```text
app/projetos/
├── components/       interface e visualizações
├── data/             modelos e dados usados pelos testes de domínio
├── database/         estudo histórico da modelagem normalizada
├── domain/           hierarquia, ciclos, progresso, layout e importação
├── hooks/            estado compartilhado, histórico e autosave
├── services/         persistência Supabase e adaptador local de compatibilidade
├── tests/            regras de domínio do módulo
├── manifest.ts       contrato oficial do módulo
├── permissions.ts    matriz efetiva de perfis
├── types.ts          contratos compartilhados
└── page.tsx          rota isolada
```

O mapa usa React e SVG/DOM nativos. `@xyflow/react` e Dagre/ELK foram avaliados,
mas não adicionados: não estão instalados e alterariam dependências globais para
um módulo que ainda precisa permanecer isolado. O layout automático implementa
uma árvore determinística nas direções horizontal e vertical.

## Funcionalidades implementadas

- Gestão de projetos em cards e lista: criação, edição dos dados gerais, modelos,
  participantes, duplicação, favoritos, arquivamento, restauração e exclusão
  definitiva com confirmação.
- Canvas com pan, zoom, ajuste à tela, mini mapa, grade, seleção múltipla,
  arraste, edição rápida e menu de contexto.
- Nós raiz, filhos e irmãos; duplicação, copiar/colar, recolher/expandir,
  reorganização automática, undo/redo e confirmação de exclusão com descendentes.
- Conexões hierárquicas e livres, prevenção de ciclos e reconexão de destino.
- Painel lateral com dados, status, prioridade, responsáveis, datas, progresso,
  etiquetas, checklist, comentários, histórico e preparação para anexos.
- Mapa, lista hierárquica e Kanban usando os mesmos registros.
- Selecione uma conexão criada por **Relacionar** no mapa para removê-la sem
  apagar os cards envolvidos.
- Ao excluir um nó com dependentes, escolha entre preservar a sequência ou
  removê-la junto; ao preservar, selecione o card sucessor na etapa seguinte.
- Busca por título, descrição, etiqueta e responsável, com centralização do mapa.
- Importação JSON validada/sanitizada e exportação JSON versionada.
- Autosave com debounce e indicador de salvamento no perfil empresarial.
- Layout responsivo, navegação por teclado, alvos de toque e movimento reduzido.

## Regra de progresso

Centralizada em `domain/project.ts`:

1. nó concluído = 100%; cancelado = 0%;
2. checklist presente = itens concluídos ÷ total;
3. sem checklist = percentual manual;
4. ramo com filhos = média do progresso dos filhos;
5. projeto = média de tarefas e marcos; sem esses tipos, média dos nós raiz.

## Executar

```bash
cd /Users/JEFF/avantalab
npm run dev
```

Abrir pela Gestão após instalar o módulo. A rota inclui o perfil ativo:
`http://localhost:3000/projetos?empresaId=<id-do-perfil>`.

Testes do domínio:

```bash
node --test app/projetos/tests/project-domain.test.mjs
```

## Evoluções

Anexos privados, colaboração em tempo real, PNG/PDF, calendário, Gantt e
automações permanecem como evoluções futuras, sem controles falsos nesta versão.

## Ponto de restauração

O estado-base foi marcado por `codex/checkpoint-pre-projetos-20260807`, apontando
para `e3b72ee21885195a6ff10e1b2322f4041b81c16a`. Como havia mudanças locais do
usuário, elas não foram incluídas em commit nem movidas. Para retirar apenas este
experimento, remova `app/projetos`; nenhum outro arquivo é necessário para ele.
