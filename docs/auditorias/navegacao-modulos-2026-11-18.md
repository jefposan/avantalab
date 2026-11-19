# 3.2.0.494 — Navegação entre módulos

Base: main `d036602ac710414d197e3e479c63ffb5650ad84b`, produção
`dpl_Db9ssTuJQx6LrVtsQLaeJ3XnUiyK` (3.2.0.493). Trabalho isolado em
`/private/tmp/avanta-custos-catalogos-20261118`; checkout canônico preservado.
PADRÃO AVANTA consultado: 1.24.0. Nenhuma migração ou mudança de cobrança.

## Escopo

- Seletor compartilhado nos cabeçalhos Web de página total: Custos, Projetos,
  Operações de Campo, Vendas e Serviços e Marketplaces. À direita, antes dos
  ajustes quando existentes; não muda logo central ou retorno à esquerda.
- Os destinos incluem também Controle de Ponto e Conteúdo AvantaVendas quando
  autorizados, reutilizando suas superfícies integradas existentes. Não altera
  os cabeçalhos internos desses popups nem os runtimes nativos/AvantaVendas.
- Fonte de acesso: API autenticada, sem cache; empresa exata, papel, plano e
  identificadores registrados. Revalidação ao selecionar e política de
  dispositivo. Não usa contexto visual para conceder acesso.
- Navegação de documento na mesma guia, inclusive saindo de iframe: preserva
  `beforeunload` dos editores; não injeta URL arbitrária em mensagens do host.
  Não mantém o estado não salvo da página abandonada. Custos confirma descarte
  de edição sinalizada; Projetos aguarda sincronização; Vendas bloqueia troca
  dentro do editor de novo pedido; operações sinalizadas de Campo/Marketplaces
  bloqueiam o acionador e são conferidas novamente após consulta.

## Verificação local

- 678 testes de módulos aprovados, sem falhas. Cinco regressões novas cobrem
  empresa, papel/plano, revogação, rotas oficiais e posição antes dos ajustes.
- TypeScript, PADRÃO AVANTA e revisão da Ava aprovados.
- ESLint dos novos componentes e cabeçalhos leves aprovado; arquivos grandes
  de Marketplaces/Vendas já possuem avisos/erros anteriores fora deste diff,
  que não foram mascarados ou convertidos em exceções.
- Navegador: posição à direita em 1280px e 390px, estado de sessão ausente,
  Escape/restauração de foco e tema escuro. Ajustado o limite horizontal do
  painel para preservar margem em viewport estreito. Rota temporária de teste
  removida antes do snapshot; nenhuma empresa/credencial simulada persistida.
- O teste visual não operou registros de cliente nem uma sessão empresarial;
  casos de autorização foram exercitados em testes automatizados. A suíte
  completa/compilação remota continua obrigatória no pipeline oficial.

Build mantém a máquina atual e a política de paralelismo da 3.2.0.492. Sem
publicações extras para benchmark, sem testes omitidos, sem alteração de cache.
