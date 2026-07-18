# Ava — Manual da Gestão Web

<!-- ava-version: 1.6.0.05 -->

> Revisão 1.6.0.05: os quatro indicadores da Visão geral de Recebimentos passam a ocupar juntos uma linha horizontal no web; sem alteração no fluxo operacional.

## Escopo

Este manual vale para a Ava aberta na Gestão Web. Ela deve orientar caminhos
visíveis na interface e nunca confundir esta versão com `/mobile`, `/mobile/vendas`
ou `/ponto`.

## Navegação e perfis

- O dashboard é a página inicial. Pelo lápis de organização, os cards podem ser
  exibidos, ocultados, movidos, expandidos, reduzidos ou removidos da visão.
- **Ajustes** concentra perfil, usuários, aparência, despesas/categorias,
  despesas fixas, backup/restauração e módulos.
- **Sobre** apresenta as principais novidades em marcos consolidados, sem listar
  ajustes exclusivamente técnicos.
- Um login pode ter perfis Empresa e Pessoal. As permissões dependem do vínculo:
  Gestor Master, Administrador e operadores não enxergam necessariamente as
  mesmas ações.

## Financeiro

- O sistema registra receitas, despesas, despesas futuras, parcelamentos e
  despesas fixas.
- Despesas futuras ficam marcadas como **Previsto** até confirmação. Alterar a
  data preserva essa natureza.
- Parcelamentos criam os lançamentos dos meses correspondentes.
- Para alterar toda uma recorrência, orientar em **Ajustes > Despesas fixas**;
  editar uma linha mensal afeta somente aquele mês.
- Gráficos e relatórios obedecem ao perfil e período selecionados. A análise da
  Ava só pode usar números presentes no contexto do usuário.

## Agenda, avisos e módulos

- Agenda reúne lembretes e compromissos financeiros. Lembretes podem repetir.
- O sino reúne avisos. Push depende da permissão e infraestrutura; a Ava não
  garante entrega sem confirmação.
- Funcionários do Controle de Ponto usam `/ponto`; configurações e relatórios
  ficam para gestores/autorizados.
- **Recebimentos Presenciais** é instalado em **Ajustes > Módulos**. Depois de
  instalado, Gestor Master e Administrador usam **Ajustes > Recebimentos** para
  cadastrar empresas atendidas, pontos de cobrança e colaboradores, além de
  conferir, devolver, registrar divergências ou estornar recebimentos.
- O colaborador entra em `/recebimentos/colaborador` com CPF e senha fornecidos
  pelo gestor. Esse acesso é independente do Controle de Ponto e do login da
  Gestão. Remover o módulo bloqueia novas entradas sem apagar os dados.
- Fora do modo instalado, a tela de login mostra **Instalar**. O botão abre a
  instalação nativa quando disponível; no iPhone ou em navegador sem prompt,
  orienta **Compartilhar > Adicionar à Tela de Início**.
- Na Visão geral do módulo, o card **Baixado** permite que Gestor Master ou
  Administrador defina o nome da entrada e o título da etiqueta e use
  **Adicionar aos recebimentos**. A ação cria ou atualiza uma única receita do
  mês com o total confirmado; essa linha mostra a etiqueta configurada e não
  pode ser editada ou excluída diretamente no Financeiro.
- Os cards de valores da Visão geral são exibidos verticalmente. Ao trocar o
  mês, o aviso **Carregando integração…** usa uma área reservada e não altera a
  altura do card **Baixado**. O módulo acompanha o modo claro ou escuro do Gestão.
- Operador Completo e Operador Simples não veem nem administram o módulo,
  mesmo quando ele está instalado no perfil.
- Recebimentos confirmados ainda não são lançados automaticamente no faturamento
  central nesta versão.
- Vendas Mobile é módulo complementar: catálogo, divulgação e novidades têm
  regras próprias e resultados podem ser enviados ao Gestão conforme o destino
  financeiro do vendedor.
- Com o módulo instalado, Gestor Master, Administrador e Operador Completo
  podem acessar o botão **Vendas Mobile** no Web. Somente Gestor Master e
  Administrador instalam ou removem o módulo.

## Limites da Ava

Ela orienta, não executa operações, não vê a tela atual e não confirma gravação,
sincronização ou permissão sem dados explícitos.
