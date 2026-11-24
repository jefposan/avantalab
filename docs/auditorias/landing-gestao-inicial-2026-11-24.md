# Landing — Gestão Financeira como entrada

Entrega: **3.2.0.513 — Landing: Gestão Financeira à esquerda e selecionada ao abrir**.
PADRÃO AVANTA: **1.24.0**.
Base oficial consultada na rede: `2cda1df0205b3d3e2655f4e461c16ff5d8103fdc`.
Clone isolado: `/private/tmp/avanta-landing-financeira-20261124`.
Produção usada como base: `dpl_EQNf8oqLWEMSj643h3346n3SqMXm`.

## Escopo autorizado

- Gestão Financeira é a primeira opção, à esquerda, e o conteúdo inicial da raiz.
- Laboratório de Marcas fica à direita, preservado em `/laboratorio-de-marcas`.
- `/gestao-financeira` continua atendendo links existentes, com referência canônica
  para a raiz. Sitemap e metadados seguem os destinos; a seleção usa aria-current.
- Mesmo componente compartilhado e mesma proteção de sessão/retorno OAuth.
- Nenhuma mudança em dados, banco, planos ou aplicativos nativos.
- Implementação, validação, integração e publicação autorizadas pelo responsável.
  Checkout principal com alterações existentes preservado, sem troca de branch.

## Validação anterior ao envio

- Oito testes da landing aprovados: delegação das três rotas, conteúdo inicial,
  Laboratório distinto, metadados, ordem dos links, seleção única e proteção
  compartilhada de acesso. Ajustado o contrato anterior que exigia Laboratório
  como conteúdo inicial; a verificação de acesso permanece obrigatória.
- Segurança: 987 testes aprovados, nenhuma falha.
- PADRÃO AVANTA e Ava: aprovados para 3.2.0.513.
- `next typegen` e `tsc --noEmit --incremental false`: aprovados.
- Chrome isolado sobre o servidor local real: 1365, 393 e 320 px, sem overflow.
  Confirmados posicionamento esquerda/direita, seleção inicial, clique para o
  Laboratório e retorno para Gestão. Sessão do usuário não utilizada.
- Capturas locais em `/private/tmp/landing-validacao/`; sem incluí-las no pacote.
- `git diff --check`: aprovado.

Publicação exige gate completo remoto, identificação Git reconhecida pelo provedor,
READY e conferência do domínio oficial. Recibo e medição de máquina/processos,
suíte e duração do build ficam no registro ignorado `output/pipeline/`.
