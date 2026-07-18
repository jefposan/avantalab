# Campos, validação e formatação

## Anatomia

Cada campo possui, conforme necessário: label, controle, ajuda e mensagem de
erro. Placeholder é exemplo, não substitui label. Associar label e controle por
`htmlFor`/`id`; associar ajuda/erro com `aria-describedby`.

## Medidas e comportamento

- Altura padrão web: 44px; alvo de toque mobile: mínimo 48px.
- Fonte: 14px; label, ajuda e erro: 12px.
- Raio: 12px; padding horizontal: 12px.
- Estados: normal, hover, foco visível, preenchido, desabilitado, somente leitura
  e erro.
- Uma coluna no mobile; no desktop, agrupar apenas campos relacionados.
- Campos longos ocupam a largura disponível; data, UF, CEP e documento podem ser
  curtos sem perder legibilidade.

## Regras por tipo

- Moeda: exibir em `pt-BR` (`R$ 1.234,56`) e manter valor numérico normalizado.
- Datas: persistir em ISO e apresentar em `dd/MM/aaaa` quando não for campo
  nativo de edição.
- Hora: `HH:mm`, respeitando o fuso definido pelo domínio.
- CPF/CNPJ, telefone e CEP: máscara visual; gravação normalizada conforme contrato
  de banco/API.
- Percentual: valor numérico; símbolo apenas na interface.
- E-mail, senha, URL, código e identificador: nunca capitalizar automaticamente.
- Nome e descrição: aplicar formatador compartilhado apenas quando semanticamente
  correto; não alterar silenciosamente o conteúdo durante digitação.
- Busca: não formatar o termo; normalizar somente para comparação.

## Validação

- Validar no cliente para orientar e no servidor para proteger.
- Mensagem deve dizer o que ocorreu e como corrigir.
- Não apagar valor inválido; manter o contexto para correção.
- Colocar o foco no primeiro erro após submissão.
- Evitar alertas genéricos quando o erro pertence a um campo específico.
