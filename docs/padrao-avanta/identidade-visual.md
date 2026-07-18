# Identidade visual e tokens

## Tipografia

- Família oficial: `--av-font-family`, definida em `app/globals.css`.
- A fonte carregada é Inter, com fallback para a pilha nativa do sistema.
- Corpo: peso 400 e altura de linha 1.5.
- Controles e labels: peso 500 e altura de linha 1.2.
- Subtítulos: peso 500 e altura de linha 1.35.
- Títulos: peso 600, altura de linha 1.2 e espaçamento `-0.01em`.
- Não carregar outra família tipográfica em um módulo.

## Cor

- Cor institucional: `#003E73`.
- A cor contextual vem de `corPrimaria` do perfil sempre que disponível.
- Derivar variações com `color-mix`; não espalhar tons hexadecimais equivalentes.
- Cores semânticas: sucesso verde, atenção âmbar, erro vermelho e informação azul.
- Cor nunca pode ser o único meio de comunicar estado.

## Superfícies, bordas e raios

- Usar os tokens compartilhados antes de adicionar um valor local.
- Cards seguem a hierarquia geral de superfícies e raios. Usar AvantaShell apenas
  quando AvantaCard/AvantaShell for solicitado ou exigido pela especificação.
- Quando AvantaShell estiver ativo, subcards usam raio visualmente menor.
- Campos e botões padrão usam raio de 12px.
- Evitar bordas decorativas internas sem função; preferir superfície, espaço e
  hierarquia tipográfica.
- Sombras devem ser discretas e consistentes com a profundidade do elemento.

## Tema escuro

- Consumir o tema do shell; não criar um segundo controlador de tema.
- Manter contraste de texto, campos, bordas, ícones e estados interativos.
- Logos e imagens devem ter variante ou tratamento adequado ao fundo.
