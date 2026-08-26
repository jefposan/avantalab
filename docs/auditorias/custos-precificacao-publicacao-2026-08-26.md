# Auditoria de publicação — Custos e Precificação

Data: 26/08/2026  
Versão: 1.12.0  
PADRÃO AVANTA consultado: 1.7.0

## Escopo auditado

- Catálogo comercial de módulos, instalação e contratação por plano.
- Hierarquia de Gestor Master, Administrador, Operador Completo e Operador Simples.
- Página total `/custos` e retorno à Gestão.
- Cadastro mestre compartilhado com o Catálogo empresarial.
- Inativação sem exclusão, composição, simulações e histórico.
- Políticas RLS, vigência do módulo, autoria e revisão concorrente dos documentos.
- Vercel, Supabase e rotas públicas de produção.

## Validações concluídas

- `npx tsc --noEmit`: aprovado.
- Lint direcionado aos arquivos da entrega: aprovado sem erros ou avisos.
- Testes da Ava: 11 aprovados.
- Testes de módulos e integrações: 50 aprovados.
- Verificadores de acesso Web e Mobile, agenda, interface do Vendas e notificações: aprovados.
- `npm run verificar:padrao-avanta`: aprovado.
- `npm run verificar:ava`: aprovado.
- `npm run build`: aprovado com Next.js 16.2.6 e rota dinâmica `/custos` gerada.
- Supabase: histórico de migrações sincronizado, sem pendências após a publicação.
- Vercel: deploy de produção concluído e associado aos domínios oficiais.
- Produção: `/gestao` e `/custos` responderam HTTP 200; acesso ao módulo sem autorização respondeu HTTP 403.

## Segurança e integridade

- O módulo só lê e grava dados quando a empresa possui plano vigente e instalação ativa.
- Gestor Master e Administrador gerenciam a instalação; Operador Completo edita e Operador Simples somente visualiza.
- O Catálogo e Custos usam a mesma linha de produto ou serviço, sem sincronização por cópia.
- Itens Em estudo não entram na divulgação; inativação preserva o registro e o histórico.
- Documentos de custos não podem ser excluídos pelo cliente autenticado.
- O gatilho do banco registra o autor e incrementa a revisão a cada alteração.
- O salvamento usa a revisão esperada e bloqueia sobrescrita silenciosa entre usuários.
- Dados e modo demonstrativos foram removidos da entrega oficial.

## Observação de manutenção

A varredura global de lint do repositório continua acusando dívida técnica anterior
à versão 1.12.0, concentrada em arquivos legados e bibliotecas distribuídas. Os
arquivos desta entrega passaram em lint direcionado, e o pipeline oficial completo
de build passou sem regressões. Essa dívida não foi ampliada por este módulo.

## Conclusão

Publicação aprovada. Custos e Precificação está disponível no catálogo oficial de
Módulos para perfis Empresa, conforme as regras comerciais e de acesso definidas.
