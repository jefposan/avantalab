# AvantaKanban — reordenação estável por encaixes fixos

Esta especificação preserva o comportamento aprovado na Sala de Botões do
AvantaVendas e serve como referência para futuras áreas reordenáveis do projeto
AvantaLab.

Ela se aplica a grades e listas nas quais o usuário muda a ordem de cards. Um
quadro Kanban com mudança de coluna pode reutilizar o mesmo núcleo dentro de cada
coluna, mantendo as regras de negócio próprias para a transferência entre elas.

## Referências do projeto

- Núcleo reutilizável e testável: `app/lib/dnd.ts`.
- Implementação real aprovada: `app/avantavendas/sistema/app.js`, nas funções de
  reordenação da Sala de Botões.
- Recorte e camada flutuante aprovados:
  `app/avantavendas/sistema/styles.css`, nas classes `sala-kanban-*`.
- Testes do núcleo: `tests/modulos/kanban-estavel.test.mjs`.

## Contrato de movimento

1. No início do gesto, fotografar uma única vez os retângulos de todos os cards.
   Esses retângulos são os encaixes fixos até o gesto terminar.
2. Criar uma cópia flutuante transparente do card. O card original fica invisível
   e continua capturando o ponteiro.
3. Durante o movimento, deslocar somente a cópia flutuante e os vizinhos entre
   encaixes conhecidos. Não reordenar o DOM e não medir novamente a grade a cada
   evento.
4. Escolher o encaixe pela distância entre o centro do card flutuante e o centro
   de cada posição.
5. Aplicar histerese de 7% do menor lado do encaixe atual. O destino só muda
   quando o novo encaixe for claramente melhor, evitando oscilação nas divisas.
6. No término, animar a cópia até o encaixe final, aplicar a ordem no DOM/estado
   uma única vez e somente então persistir.
7. Em cancelamento, devolver a cópia ao encaixe inicial e manter a ordem anterior.

## Valores de referência

- Duração: `170ms`.
- Curva: `cubic-bezier(.2,.8,.2,1)`.
- Histerese: `0.07`.
- Elevação durante o gesto: escala discreta próxima de `1.035` e sombra por
  `drop-shadow`, sem criar fundo retangular ao redor da imagem.

Os valores compartilhados ficam exportados por `app/lib/dnd.ts`. A geometria
visual pode variar por módulo, mas a estabilidade dos encaixes e a histerese não
devem ser removidas.

## Regras visuais

- A cópia flutuante precisa reproduzir o recorte real do card; nunca revelar uma
  caixa branca ou bordas da imagem original.
- O espaço de origem permanece ocupado enquanto o card é arrastado.
- Os cards vizinhos deslizam até a nova posição; não saltam, piscam ou mudam de
  tamanho.
- O card flutuante fica acima da navegação comum e abaixo de modais e avisos.
- Tema claro e escuro usam a mesma geometria, variando apenas tokens de cor e
  sombra.

## Acessibilidade

- Cada item reordenável deve ser focalizável e ter nome acessível.
- Usar `aria-roledescription="item reordenável"` e informar as teclas suportadas.
- Setas horizontais movem uma posição; em grades, setas verticais movem a
  quantidade de colunas correspondente.
- Após soltar ou cancelar, devolver o foco ao card movido.
- Respeitar `prefers-reduced-motion`, retirando transições sem retirar a função.
- Não depender exclusivamente de vibração, cor ou animação para indicar sucesso.

## Anti-padrões proibidos

- Usar `document.elementFromPoint()` como motor principal de decisão do destino.
- Reordenar o DOM dentro de cada `pointermove`.
- Recalcular os retângulos depois que os vizinhos já foram transformados.
- Salvar a preferência várias vezes durante o mesmo gesto.
- Ocultar o card sem manter seu encaixe reservado.
- Adicionar borda ou fundo artificial à imagem flutuante para mascarar um recorte
  incorreto.

## Checklist de adoção

- [ ] Encaixes fotografados apenas no início do gesto.
- [ ] Histerese testada perto das divisas, em diagonal e em movimento rápido.
- [ ] Ordem aplicada e persistida somente ao concluir.
- [ ] Cancelamento restaura posição e estado.
- [ ] Card flutuante sem fundo ou bordas indesejadas.
- [ ] Teclado, foco e movimento reduzido verificados.
- [ ] Celular lento e navegador externo testados.
- [ ] Teste de regressão impede retorno ao cálculo instável.
