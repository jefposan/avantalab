# Gestão Mobile — atualização de Meus perfis

Entrega local: **3.2.0.459**. PADRÃO AVANTA consultado: **1.23.1**.
Base oficial consultada na rede: `9f5e3dab62710f78fc056cebb374db83af567245`.
Branch isolada: `codex/perfis-novembro-atualizacao`.

## Causa e reprodução

O gráfico usa o estado financeiro atualizado do perfil aberto. Meus perfis
lia um resumo independente, carregado anteriormente, que não era recomposto
ao salvar ou receber a confirmação financeira. A troca de período também
podia conservar esse resumo ou aceitar uma resposta do mês anterior.

O JavaScript público da produção 3.2.0.458 confirmou esse caminho antigo.
Teste com os valores da imagem reproduziu gráfico em R$ 120.790,00 e linha
da Tridium ainda em R$ 51.371,00. Esses valores são uma reprodução sintética;
não foi consultado o banco financeiro do cliente nem alterado lançamento.

## Correção

A linha do perfil aberto deriva do mesmo estado financeiro do gráfico;
o consolidado é recalculado a partir dessas linhas, sem incrementar o cache.
O comparativo conserva o perfil inteiro mesmo com centro de custo selecionado.
A troca de mês recarrega o resumo em segundo plano e rejeita respostas antigas.
Não há consulta extra por renderização, mudança de permissões ou de confirmação
da fila. Atualização visual local não significa confirmação de persistência.

## Validação

- A reprodução falhou antes da correção e passou depois.
- Oito testes específicos: inclusão local, despesas, centro de custo, resposta
  atrasada, mudança de mês, Realtime, cache e restrição de Dashboard.
- Sessenta e nove testes relacionados de abertura, dashboard e fila passaram.
- `npm run test:seguranca`: 768 testes aprovados, nenhuma falha.
- `npm run verificar:padrao-avanta` e `npm run verificar:ava`: aprovados.
- Sintaxe JavaScript, geração do runtime otimizado e `git diff --check`: aprovados.

Escopo: Gestão Mobile/PWA. Não altera o dashboard React Web.
Publicação autorizada pelo responsável. Base de produção conferida pelo domínio:
`dpl_HHAy5HH6eJBrrvAzS8BXfkimcrob`. Integração e envio pelo pipeline oficial.

Primeiro build remoto bloqueado por uma asserção textual anterior em
`centros-custo-mobile.test.mjs`, que exigia a expressão sem a nova opção de
perfil inteiro. O gate executou 2.982 testes e apontou somente essa falha.
A asserção foi atualizada para exigir explicitamente a condição do centro
selecionado junto à exceção de perfil inteiro; a cobertura funcional do
comparativo permanece em `meus-perfis-atualizacao.test.mjs`. Sem dispensa de gate.
