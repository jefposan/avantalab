# Handoff — Sistema de Módulos + Controle de Ponto (AvantaLab)

Documento para continuar a implementação em outra ferramenta (ex.: Codex). Reúne contexto, decisões, SQL pronto e o roteiro.

## Projeto e stack
- **AvantaLab** — gestão financeira. Pasta: `~/avantalab`. Repo Git no GitHub (`jefposan/avantalab`), deploy automático na **Vercel**. Banco/Auth/Functions no **Supabase**.
- **Web (desktop):** Next.js 16 / React. Tela principal: `app/page.tsx` (grande). Componentes em `app/components/`. Rotas de API em `app/api/` (usam `SUPABASE_SERVICE_ROLE_KEY` para ações admin; ex.: `app/api/criar-usuario-interno/route.ts`).
- **Mobile (PWA):** um único arquivo JS vanilla `public/mobile-app.js` (monta HTML em strings; `render()` reconstrói o `innerHTML`). Carregado por `app/mobile/page.tsx` (que tem um `<style>` com CSS custom e dark mode `.mobile-dark`). Service worker: `public/mobile-sw.js`.
- **Auth/perfis:** usuários ficam em `auth.users`; vínculo usuário↔empresa em `public.usuarios_empresa` (`user_id`, `empresa_id`, e papel — o app usa papéis como `gestor_master`, `administrador`, `operador_completo`, `operador_simples`). Login interno por **login/usuário** (não exige e-mail real) — ver as rotas `app/api/*usuario*`.
- **Empresas/perfis financeiros:** `public.empresas` (tem `tipo_perfil` = `empresa` | `pessoal`).
- **Versão atual:** 1.3.1 (em `public/mobile-app.js` `var APP_VERSION`, `app/lib/version.ts`, e cache do SW em `public/mobile-sw.js` `CACHE_NAME='avantalab-mobile-v134'`).

## Convenções de trabalho
- **Validar antes de subir:** `node --check public/mobile-app.js` (mobile) e `npx tsc --noEmit` (web).
- **Deploy:** `git add -A && git commit -m "..." && git push origin main` (se travar, `rm -f .git/index.lock` antes). O SW é network-first → recarregar já traz o JS novo; **não bumpar versão a cada tentativa**, só ao fechar um pacote confirmado.
- **SQL/Edge Functions:** aplicados manualmente pelo **painel do Supabase** (SQL Editor / Edge Functions). Já existem secrets: `VAPID_*`, `ADMIN_FEEDBACKS_TOKEN`, `OPENAI_API_KEY`.
- **RLS padrão:** "usuário enxerga o que é da empresa a que tem vínculo" → `empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())`.
- ⚠️ Há outro fluxo de trabalho mexendo no **header do mobile** (`public/mobile-app.js`). Para evitar conflito de Git: `git pull --rebase origin main` antes de editar/subir.

## Objetivo: sistema de módulos
Módulos opcionais que se **fundem** ao sistema quando ativados (não páginas separadas). Ver `docs/arquitetura-modulos.md` (desenho geral). Primeiro módulo: **Controle de Ponto**.

### Princípios
- Catálogo `modulos` + ativação por empresa `empresa_modulos`. Ativar = ligar registro (futuramente via assinatura/avulso).
- Cada módulo declara o que injeta (menu, cards, provedor financeiro, contexto da IA) num **registro/manifesto** no código.
- Resultado financeiro de módulos entraria no **livro-caixa central** com `origem_modulo`/`origem_ref` (faz gráficos/balanço/IA "já funcionarem"). **Não se aplica ao Ponto v1** (só registra horas).
- Ativação resolvida no servidor; cliente só reflete (RLS).

## Módulo Controle de Ponto — decisões (ver `docs/modelo-modulo-ponto.md`)
- **Só para perfil `empresa`** (catálogo já marca `perfis = '{empresa}'`).
- **Funcionário = usuário Supabase Auth** com papel `funcionario_ponto` em `usuarios_empresa`, **login/usuário**, criado por **rota de servidor** (mesmo padrão de `criar-usuario-interno`).
- **Login direciona:** ao logar, se o papel for `funcionario_ponto`, abre **direto a tela de ponto** (não entra no app financeiro).
- **Admin no WEB:** gestor cadastra funcionários e vê registros/relatórios no web; a área "Módulos" (instalar/desinstalar) fica no web.
- **Bater ponto no MOBILE.** GPS **obrigatório** (negou → bloqueia). Ações do dia (máquina de estados): Entrada → (Saída p/ refeição **ou** atalho Encerrar/Saída) → Retorno da refeição → Saída.
- **Comprovante:** só a tela de confirmação (sem PDF na v1).
- **Funcionário vê os próprios registros** no mobile, com relatórios **diário/semanal/mensal/anual** e **exportar PDF** (forma do PDF a decidir: jsPDF ou print do navegador).
- **Imutabilidade:** `ponto_registros` só permite SELECT/INSERT (sem update/delete) — base para futura validade REP-P (Portaria 671). v1 = controle interno funcional (não certificado).

## SQL pronto (rodar no Supabase, nesta ordem)
1. `modulos_setup.sql` — catálogo `modulos` (+coluna `perfis`) e `empresa_modulos` (+RLS, seed `ponto` para `{empresa}`).
2. `ponto_setup.sql` — `ponto_funcionarios` e `ponto_registros` (imutável, com lat/long/precisão/hash) +RLS.

(Ambos os arquivos estão na raiz do projeto.)

## Roteiro de implementação
- **Fase 1 — Fundação (web):** rodar `modulos_setup.sql`; criar área **"Módulos"** no web (catálogo filtrado por `empresa.tipo_perfil`, instalar/desinstalar → escreve em `empresa_modulos`); ler "módulos ativos" da empresa e expor isso ao app.
- **Fase 2 — Ponto admin (web):** rodar `ponto_setup.sql`; rota de servidor `criar-funcionario-ponto` (cria auth user + vínculo `funcionario_ponto` + `ponto_funcionarios`); telas de **cadastro de funcionários** e de **registros/relatórios** (filtros por funcionário/período, local via link de mapa a partir de lat/long).
- **Fase 3 — Bater ponto (mobile):** detectar login `funcionario_ponto` → tela de ponto (boas-vindas com nome/empresa/data + status do dia + botão da próxima ação + atalho Encerrar) com **geolocalização obrigatória** (Geolocation API) + comprovante na tela; **"Meus registros"** com relatórios (diário/semanal/mensal/anual) e PDF.

## Arquivos de referência no projeto
- `docs/arquitetura-modulos.md` — desenho geral do sistema de módulos.
- `docs/modelo-modulo-ponto.md` — modelo detalhado do Ponto (decisões confirmadas).
- `modulos_setup.sql`, `ponto_setup.sql` — SQL pronto.
- `docs/contexto-header-mobile.md` — contexto do trabalho paralelo no header (não é deste escopo).
