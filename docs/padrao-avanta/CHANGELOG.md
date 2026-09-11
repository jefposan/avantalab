# Histórico do PADRÃO AVANTA

## 1.13.0 - 2026-09-11

- O card de confirmação pode abrir edição por voz sem perder o rascunho nem
  deslocar o microfone para fora do painel.
- Alterações faladas voltam obrigatoriamente à validação e a uma nova
  confirmação. Valores derivados, como descontos e totais, são recalculados
  pela camada oficial do sistema com dados atuais.

## 1.12.2 - 2026-09-11

- A liberação de ações por voz pode ser restringida por usuário quando o
  produto exigir controle individual, sempre com validação no servidor.
- Ao retirar a permissão, acionador, ajuda e faixa reservada desaparecem sem
  apagar dados nem alterar as demais permissões operacionais.

## 1.12.1 - 2026-09-11

- Respostas de consulta e comandos não suportados passam a usar um card
  informativo com fechamento explícito no controlador compartilhado.
- Um tipo de retorno desconhecido é convertido em erro recuperável e nunca pode
  deixar somente a camada escura aberta.

## 1.12.0 - 2026-09-11

- Adicionadas opções oficiais para desativar **Salvar para depois** junto com a
  persistência correspondente e para compactar listas de até cinco escolhas sem
  scroll interno.
- As opções ficam no adaptador, permitindo experiências distintas sem copiar ou
  alterar o controlador compartilhado.

## 1.11.1 - 2026-09-11

- Corrigida a continuidade das dúvidas respondidas por voz: o card permanece
  aberto e o microfone fica no mesmo ponto durante gravação, transcrição e
  interpretação em todas as integrações do controlador compartilhado.

## 1.11.0 - 2026-09-11

- Adicionada a continuação guiada: a voz pode resolver escolhas e entregar o
  fluxo à tela oficial quando assinatura, avaliação ou outro gesto humano ainda
  for obrigatório, sem simular conclusão nem criar uma escrita paralela.
- O controlador encerra a solicitação de voz após o handoff e preserva a tela
  oficial como única responsável pelas etapas e confirmações restantes.

## 1.10.1 - 2026-09-11

- Listas curtas de escolhas simples, como formas de pagamento, usam linhas
  compactas acessíveis e aparecem integralmente sem scroll interno desnecessário.
- Listas extensas de clientes, produtos e catálogo preservam rolagem própria e
  o limite seguro do painel em telas baixas.

## 1.10.0 - 2026-09-11

- Padronizado o catálogo fixo de funções por sistema, com intenção e campos
  obrigatórios validados antes de qualquer regra de negócio.
- Novos clientes e locais passam a participar automaticamente da transcrição e
  da resolução autenticada, sem aliases preenchidos pelo usuário ou catálogo
  completo enviado ao modelo.
- Uma solicitação claramente nova cancela e substitui o rascunho em andamento;
  respostas curtas à dúvida atual continuam complementando o mesmo fluxo.

## 1.9.0 - 2026-09-11

- Adicionado o dock React oficial para montar acionador, ajuda contextual,
  feedback temporário e adaptador sem duplicar a experiência entre sistemas.
- Os ativos centrais passam a ter um endereço neutro do PADRÃO AVANTA, sem
  obrigar novos módulos a depender da rota de recursos do AvantaVendas.
- Operações de Campo torna-se a segunda integração oficial, com textos e
  permissões próprios e as mesmas garantias visuais e de confirmação.

## 1.8.0 - 2026-09-10

- A experiência completa de ações por voz com IA passa a ser um padrão oficial
  reutilizável: acionador, ajuda, onda reativa ao áudio, estados, cards,
  desambiguação, confirmação, pendências, resultado e comprovante.
- Criados controlador, estilos e contrato centrais. Sistemas integrados fornecem
  apenas adaptadores autenticados e não podem manter cópias locais do fluxo.
- Formalizados indexação oculta e automática de catálogos, aliases semânticos,
  aprendizado controlado por correções confirmadas e pesquisa manual segura.

## 1.7.0 - 2026-08-07

- Cortesia empresarial vigente passa a equivaler à liberação total dos módulos,
  sem cobrança e sem instalação automática.
- Mantida a hierarquia padrão: somente Gestor Master e Administrador instalam ou
  removem; operadores conservam apenas as permissões internas do módulo.

## 1.6.0 - 2026-08-07

- Formalizado o contrato comercial e operacional reutilizável de módulos:
  ativação por empresa, preço avulso padrão, inclusão por plano, hierarquia,
  preservação de dados e cancelamento ao fim do período pago.
- Criados os modos oficiais de navegação `integrado` e `pagina_total`; uma
  página total permanece na mesma guia, não carrega o menu da Gestão e oferece
  retorno explícito ao AvantaLab.
- Instalação, remoção e autorização passam a ser obrigatoriamente validadas no
  servidor; preferências visuais e rotas não podem conceder acesso.

## 1.5.0 - 2026-07-31

- Formalizada a composição obrigatória das cenas mobile de acesso: fundo sem
  logo incorporado, grade de três faixas e marca centralizada no espaço entre a
  área segura superior e o card.
- A regra passa a abranger login, cadastro, recuperação, bloqueio e carregamento
  em PWA, WebView, Android e iOS; dashboards e modais autenticados ficam fora
  desse escopo.

## 1.4.0 - 2026-07-29

- O modelo validado de login da Gestão e do AvantaVendas passa a ser o padrão
  oficial para novos acessos do ecossistema.
- Formalizados a máquina única de estado para Google/Apple, a tela
  **Preparando acesso**, o cancelamento recuperável e os contratos distintos de
  retorno para Web/PWA e Capacitor.
- Documentados deep link, conclusão da sessão Supabase, origem do acesso,
  persistência por Lembrar-me, safe areas, status bar e matriz mínima de testes.

## 1.3.0 - 2026-07-29

- Formalizado o padrão de autenticação mobile: face visual de 32 px, botão
  primário no azul `#1687D9` e variantes oficiais para Google e Apple.
- Mantida a exigência de alvo de toque acessível, sem obrigar o card visual a
  ficar mais alto.

## 1.2.1 - 2026-07-26

- O botão de próxima rolagem em containers passa a acompanhar a parte visível da
  área rolável, sem ficar fora da tela.
- Padronizados o limite pelas bordas do container e a distância mínima de 28 px
  antes do rodapé, inclusive em cards expansíveis.

## 1.2.0 - 2026-07-26

- O botão de próxima rolagem aprovado na landing page passa a ser um componente
  oficial reutilizável.
- Padronizados os comportamentos para página e área rolável, incluindo exibição
  somente quando há conteúdo abaixo e ocultação ao chegar ao final.

## 1.1.0 - 2026-07-18

- Incorporado formalmente o AvantaCard/AvantaShell como padrão especial de card.
- AvantaCard passa a ser obrigatório quando o usuário, briefing, manifesto ou
  especificação solicitar explicitamente AvantaCard/AvantaShell.
- Cards sem essa solicitação seguem o padrão visual geral do PADRÃO AVANTA, sem
  obrigação de usar a geometria CHAPA + CORPO + PLATÔ.

## 1.0.0 - 2026-07-17

- Primeira versão oficial do padrão de desenvolvimento AvantaLab.
- Consolidadas identidade, campos, formatação, layouts, componentes,
  preferências, módulos, acessibilidade e checklist.
- Definidos o identificador `PADRAO-AVANTA` e a invocação `$padrao-avanta`.
- Adicionada validação automática da integridade da documentação.
