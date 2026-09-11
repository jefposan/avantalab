# Ações por voz com IA

Este documento define o padrão oficial para comandos de voz que consultam ou
executam funções nos sistemas AvantaLab. O componente executável de referência é
`app/padrao-avanta/acoes-por-voz/avanta-voice-actions.js`, com superfícies
externas em `avanta-voice-actions.css` e contrato em `contract.ts`.

## Princípio

O fluxo é direto: **tocar, falar, aguardar, esclarecer apenas o necessário,
confirmar alterações e concluir**. Ele não abre chat, não exige seleção prévia de
módulo e não mostra a transcrição ao usuário. A IA interpreta linguagem humana;
ela nunca recebe liberdade para consultar ou alterar o banco arbitrariamente.

Todo sistema deve usar a implementação central e fornecer somente um adaptador
de produto. É proibido copiar o JavaScript, seus cards, estilos, movimentos ou
máquina de estados para uma pasta local. Correções no componente central devem
alcançar todas as integrações do mesmo projeto na publicação seguinte.

## Anatomia obrigatória

1. Acionador circular azul, com ícone de microfone e texto curto abaixo.
2. Ajuda contextual opcional no ícone oficial de informação, sem competir com o
   acionador e fechada ao tocar fora ou pressionar `Escape`.
3. Ondas ao redor do círculo somente durante a gravação e proporcionais à
   intensidade real captada pelo analisador de áudio. Sem voz, sem movimento.
4. O mesmo botão encerra a gravação; durante transcrição ou interpretação ele se
   torna cancelável, mostra `X`, anel de progresso e mensagem curta.
5. Dúvidas, catálogo, edição e confirmação usam o painel central oficial. Em
   telas baixas, o conteúdo interno rola e nunca cobre a navegação fixa.
   Listas curtas de escolhas simples, como as formas de pagamento, devem caber
   integralmente sem scroll próprio; a rolagem fica reservada a listas longas.
   Quando a dúvida for respondida por voz, o card permanece aberto e o mesmo
   microfone continua ancorado nele durante gravação, transcrição e
   interpretação; a interface não volta ao acionador principal nesse intervalo.
   Quando a confirmação permitir edição, o microfone fica dentro do editor e a
   fala complementa o rascunho atual. Gravação, envio e cancelamento permanecem
   nesse mesmo local até a resposta atualizada.
6. Resultado confirmado usa o aviso temporário padrão no rodapé. Quando houver
   comprovante, o aviso oferece **Compartilhar comprovante** antes de desaparecer.
7. Solicitações incompletas podem ser salvas quando o sistema habilitar essa
   capacidade. Quando desabilitada no adaptador, o botão não aparece e o
   controlador não mantém pendências ocultas. Onde estiver habilitada, o
   acionador sempre inicia uma nova fala; pendências ficam em indicador separado
   e podem ser retomadas ou canceladas individualmente.
8. Se uma nova solicitação completa for gravada antes da conclusão da atual, o
   rascunho em andamento é cancelado e substituído. Respostas curtas à pergunta
   exibida continuam o fluxo atual e não são tratadas como uma nova ação.
9. Quando uma ação exigir assinatura, avaliação, biometria ou outro gesto humano,
   a voz pode resolver as escolhas anteriores e entregar o fluxo já preenchido à
   tela oficial. Esse handoff encerra o card de voz, não grava dados e não pode
   substituir as confirmações obrigatórias da tela de destino.
10. Consultas e comandos não suportados sempre exibem um card informativo com
    fechamento explícito. Respostas desconhecidas viram erro recuperável; a
    camada escura jamais permanece aberta sem conteúdo ou ação disponível.

Não inserir cabeçalhos redundantes como “experimental”, nome do usuário,
“confirmação obrigatória” ou explicações sobre o que o botão **Confirmar** já
comunica. A pergunta deve ser curta e contextual, por exemplo “Confirme a forma
de pagamento”.

## Estados oficiais

| Estado | Comportamento |
|---|---|
| Inicial | Microfone disponível e convite curto para falar. |
| Gravando | Microfone vermelho, encerramento no mesmo botão e onda por áudio real. |
| Transcrevendo | Controle cancelável e indicação contínua de atividade. |
| Interpretando | Controle cancelável e indicação contínua de atividade. |
| Esclarecimento | Somente a dúvida atual, opções pertinentes, fala complementar e busca manual quando aplicável. |
| Confirmação | Resumo validado, cancelar, confirmar, editar quando suportado e salvar para depois quando habilitado. |
| Resposta | Consulta ou comando não suportado apresentado em card informativo, com fechamento explícito. |
| Erro | Mensagem humana, sem detalhe técnico sensível, com tentar novamente ou cancelar. |
| Sucesso | Aviso temporário inferior e ação de comprovante quando disponível. |

O botão não muda de posição entre estados. O conjunto botão + texto é um único
corpo, centralizado no espaço livre informado pelo módulo. O painel usa safe
areas, alvo de toque mínimo de 44 × 44 px e restaura o foco ao acionador.
`prefers-reduced-motion` deve reduzir animações decorativas, preservando feedback
de estado.

## Contrato técnico

O módulo chama `window.AvantaVoiceActions.open(adapter)`. O adaptador fornece:

- conta e contexto autenticado;
- elemento de montagem e namespace de persistência do sistema;
- operações `transcribe`, `process`, `catalog`, `execute` e `log`;
- atualização da tela após execução;
- aviso temporário e compartilhamento de comprovante;
- atualização do contador de pendências.
- opções de experiência, como salvar para depois e compactar listas curtas.

O componente nunca acessa Supabase, OpenAI, tokens ou regras comerciais
diretamente. Endpoints do módulo validam usuário, empresa ativa, permissão,
schema e dados novamente. Qualquer escrita exige confirmação explícita e utiliza
service, RPC, server action ou API oficial. Consultas podem concluir sem
confirmação.

Edições feitas antes da confirmação são alterações do rascunho, não de um
registro persistido. Campos derivados nunca são aceitos como cálculo da IA: a
camada de negócio relê preços, saldos e demais referências atuais, recalcula os
valores e devolve uma nova confirmação. Editar um registro já gravado exige uma
intenção e um executor próprios do sistema.

Quando o produto possuir liberação individual, a permissão de voz deve nascer
no padrão documentado pelo sistema, ser administrada junto às demais permissões
do usuário e ser revalidada em todos os endpoints de voz. Ao desativá-la,
acionador, ajuda e faixa reservada desaparecem por completo; os outros acessos e
os dados já gravados permanecem inalterados.

Em módulos React, reutilizar `AvantaVoiceActionDock.tsx`; ele monta o acionador,
a ajuda acessível e o aviso temporário, e carrega o controlador pelo endereço
neutro `/recursos/padrao-avanta/`. O consumidor fornece somente o adaptador e a
faixa de layout reservada.

`allowSaveForLater: false` remove a ação e desativa a persistência da integração.
`compactShortLists: true` apresenta integralmente listas de até cinco opções,
usando o espaço do próprio card e preservando o alvo de toque mínimo.

Cada integração deve informar `storageNamespace` estável e específico do
sistema. Alterar esse namespace exige migração compatível para não perder
solicitações salvas.

## Interpretação e catálogo

A transcrição recebe apenas vocabulário curto e relevante, nunca o catálogo
inteiro. A IA devolve intenção estruturada validada por schema. O servidor então
resolve clientes e produtos dentro da empresa ativa.

Cada integração declara um catálogo pequeno e fixo de funções, com exemplos de
linguagem e campos obrigatórios. O modelo apenas escolhe uma dessas funções e
extrai os dados. A aplicação pergunta somente o campo obrigatório ausente e
recusa operações fora do catálogo, sem inventar execução.

Clientes, empresas e locais são resolvidos em dados vivos da conta autenticada.
Cadastros novos devem entrar automaticamente no vocabulário curto da próxima
transcrição e no resolvedor local, com atualização em tempo real quando o módulo
já estiver aberto. Não exigir aliases ou manutenção manual para cada cadastro.

Produtos devem possuir índice de voz oculto, construído automaticamente com:

- nome oficial, marca, categoria, apresentação e características estruturadas;
- aliases determinísticos derivados do cadastro;
- aliases semânticos gerados por IA em segundo plano, sempre ancorados nos dados
  reais e sem inventar propriedades;
- associações aprendidas após correções manuais confirmadas.

O usuário não precisa preencher nomes alternativos manualmente. Ao criar ou
editar um produto, o índice determinístico é atualizado imediatamente e a
expansão semântica pode ser refeita em segundo plano. Uma associação aprendida
só ganha prioridade após confirmações suficientes e permanece isolada por
empresa.

A resolução combina normalização, aproximação textual e fonética, tokens,
aliases e contexto comercial. Similaridade fraca nunca autoriza escolha
silenciosa: o sistema sugere candidatos pertinentes e sempre oferece pesquisa
manual no catálogo sem perder o restante da solicitação.

## Persistência e conectividade

Pendências são separadas por sistema e empresa. O protótipo pode usar
armazenamento local versionado; uma integração multi-dispositivo deve adotar
persistência autenticada no servidor sem alterar a experiência visual.

A captura de áudio funciona no navegador, mas transcrição, interpretação,
pesquisa e execução dependem de conexão. Em rede ruim, conservar a gravação ou
pendência quando tecnicamente possível, encerrar o carregamento com erro
recuperável e nunca simular sucesso.

## Segurança e observabilidade

- Credenciais de IA permanecem exclusivamente no servidor.
- Nenhum resultado cru da IA chega à execução sem validação de schema.
- IDs escolhidos são relidos e validados na empresa ativa.
- Logs registram tempos, intenção, desambiguação, resultado e uso disponível,
  evitando dados sensíveis desnecessários.
- Cancelamento aborta chamadas em andamento quando possível.
- Erros técnicos são registrados no servidor e apresentados ao usuário em texto
  claro e acionável.

## Critérios de adoção

Antes de liberar em outro sistema, validar iPhone/Safari, Android/Chrome, PWA,
tema claro e escuro, telas baixas, safe areas, teclado na pesquisa, áudio
silencioso e audível, cancelamento, ambiguidades, edição, pendências, confirmação,
comprovante, perda de rede, sessão expirada e ação não suportada.

O verificador do PADRÃO AVANTA deve confirmar que a integração aponta para os
ativos centrais e não mantém uma cópia local do controlador.
