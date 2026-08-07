# Histórico do PADRÃO AVANTA

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
