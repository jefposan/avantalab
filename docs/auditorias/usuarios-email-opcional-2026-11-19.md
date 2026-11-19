# 3.2.0.505 — Usuários: e-mail opcional e edição dos acessos

## Base e preservação

- Trabalho isolado em branch `codex/usuarios-email-opcional-20261119`, criado da main oficial `b757fb31c67b6cd1c25b21c8b374dc68090db702` (3.2.0.504).
- Produção-base conferida no alias `avantalab.com.br`: `dpl_GJfZNJpPZBvVeJm4zweFM8WR17AC`, READY. Sem publicação concorrente nessa conferência.
- Checkout canônico, arquivos pendentes do outro chat, fontes fiscais e migração da 504 preservados. Esta entrega não contém SQL nem altera usuários existentes para teste.
- PADRÃO AVANTA 1.24.0 na base oficial; componentes existentes, sem novo layout.

## Decisões

- Equipe: e-mail pessoal opcional; nome completo, login, senha e tipo continuam obrigatórios. Preenchido, e-mail mantém validação e unicidade.
- Auth precisa de identificador interno: servidor gera UUID aleatório no domínio técnico já utilizado pelo produto. Não é contato, não recebe recuperação e fica oculto na interface; login continua resolvendo o diretório global para a mesma autenticação Supabase.
- Titular/Gestor Master mantém contato obrigatório. Remoção do próprio e-mail verifica também titularidade em outros perfis, com falha fechada. Promoção a Master exige contato real previamente cadastrado.
- Na edição de outra pessoa, e-mail vazio/omitido preserva o existente. Nome e acessos podem ser gravados sem trocar identidade global. Mudanças de credenciais de terceiros continuam proibidas; não foi criada redefinição administrativa de senhas.
- Web e Mobile aplicam a mesma regra. Recuperação por SMS em celular confirmado permanece inalterada. OAuth, sessão, planos e concessões existentes não foram modificados.

## Verificações

- Testes de rotas com Supabase simulado: criação sem contato, UUIDs diferentes, campos obrigatórios, domínio reservado, duplicidade, equipe editando seu contato, acessos de terceiros, titular em outro perfil e reconciliação de falhas.
- Testes do Mobile executam funções reais extraídas: criar usuário e salvar acessos com contato vazio. Controles Web conferidos por testes da marcação real: required apenas para o titular na própria edição; readonly para terceiros e detecção correta de alteração somente dos acessos.
- Suíte de segurança local: 937 testes aprovados, zero falhas; regressões adicionadas posteriormente verificadas separadamente. TypeScript sem emissão, sintaxe Mobile, ESLint das rotas/helper e verificadores de acesso Web/Mobile aprovados.
- PADRÃO AVANTA e Ava revisados para 3.2.0.505. Suíte completa e build permanecem obrigatórios no pipeline da Vercel; promoção somente após aprovação.
- Não foi realizado cadastro, troca de senha/e-mail ou edição de acessos de pessoa real como QA. Não houve upload às lojas.
