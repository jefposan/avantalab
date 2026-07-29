# Histórico do PADRÃO AVANTA

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
