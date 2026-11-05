# 3.2.0.112 — Marketplaces: Novo anúncio limpo, ações alinhadas e correção do timeout das contas

Autorização em 23/10/2026: publicar os ajustes do Novo anúncio junto da correção de “signal timed out”, mantendo restauração. Base confirmada READY/PROMOTED: `dpl_2uonK979nVQpp1orHNwHfjExSuqf`, SHA `e937414163204133463c6f8bb0052c5dc493f836`, produção 3.2.0.109; fila sem envios ativos na preparação.

## Escopo

- Somente revisões locais 3.2.0.110–112: remoção dos avisos repetitivos, botão Validar EAN condicional e validação do código efetivamente editado; Cancelar anúncio descarta somente o rascunho.
- Botões oficiais Cancelar anúncio / Revalidar dados / Publicar à direita, bordas e textos vermelho/azul/verde, hover e afundamento ao clicar. Foco, bloqueios, tema escuro, movimento reduzido e quebra de linha preservados.
- Contas conectadas e Anunciados compartilham uma leitura em andamento por perfil, sem cache permanente de contas/permissões. Prazo de 30 segundos inclui a sessão; falhas preservam contas, recuperam por Atualizar contas e não são tratadas como desconexão. Sucesso limpa erro e troca de perfil ignora resposta antiga.
- Sem alteração de banco, OAuth, login, permissões ou envio de anúncios de produtos. Laboratório de simulação continua fora do pacote publicado. Nenhum trabalho alheio do checkout compartilhado é incluído.

## Pacote e restauração

Pacote isolado: `/private/tmp/avanta112-release-wpCfCI`, clonado da base de produção confirmada. Identidade local Jeff <jefposan@hotmail.com> configurada antes do snapshot; remoto oficial `https://github.com/jefposan/avantalab.git`.

Ponto completo anterior em `output/restauracao-novo-anuncio-320109-9zZi3B/`, com bundle Git, arquivo da árvore versionada e instruções. Recuperação deve ocorrer isoladamente e preservar entregas posteriores; não extrair sobre a raiz compartilhada. Não há rollback automático.

## Estado de entrega

Pacote validado com 59 testes focados e 429 testes de segurança, todos aprovados, além de PADRÃO AVANTA 1.21.0, Ava 3.2.0.112 e diff sem problemas de whitespace. A base publicada não possui o atalho `test:seguranca`; a seleção integral equivalente foi executada por `npm test --` com as mesmas pastas/arquivos definidos na raiz, sem alterar scripts ou reduzir testes. Os 441 testes da raiz compartilhada já foram aprovados durante a implementação; a diferença decorre da preservação da base publicada, sem incorporar trabalhos alheios.

Conferência visual local anterior: botões na ordem solicitada, bordas/textos RGB (180,35,24), (0,62,115) e (4,120,87); alinhamento flex-end e margem direita de Publicar coincidindo com a do grupo, alvos de 44px. Ensaios com dados fictícios e sem envio de anúncios.

Ainda não enviado. Snapshot, recibo e resultado do build serão registrados após o envio. A suíte completa permanece obrigatória no build remoto, sem ignorar tipagem, testes ou verificadores.
