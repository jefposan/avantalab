# Contexto para ajustes do HEADER do mobile (AvantaLab)

Cole este resumo no início do novo chat. O foco desse chat é **apenas o header do app mobile**.

## Projeto
- App de gestão financeira **AvantaLab**. Stack: Next.js + Supabase. Pasta do projeto: `~/avantalab`.
- O **app mobile** é renderizado por um único arquivo JS vanilla: **`public/mobile-app.js`** (monta HTML em strings; a função `render()` reconstrói o `innerHTML` a cada mudança).
- A página que carrega esse JS é `app/mobile/page.tsx` (lá fica também um bloco `<style>` com CSS custom e regras de dark mode `.mobile-dark`).
- Tailwind está disponível nas classes usadas no mobile; também há estilos inline.

## Onde fica o header
- No `public/mobile-app.js`, dentro da função que monta a tela principal (`telaApp`/`menuLateralHtml` não — é a função que retorna o `<div ...><header ...>`). Procure por `'<header class="fixed inset-x-0 top-0 z-40 ...'` e por `Bem-vindo ao AvantaLab`.
- O card do seletor de **ano** é montado pela função `anoHeaderHtml()`.

## Estado atual do header (recém-redesenhado)
- Linha do topo: hambúrguer circular (id `menu-toggle`) + **"Olá, [nome]"** (`text-lg`) + **"Bem-vindo ao AvantaLab"** (subtítulo `text-[11px]`), alinhado à esquerda. À direita, o **sino** de avisos (id `avisos-dashboard`) — deve permanecer igual e no mesmo lugar.
- Abaixo: grid `grid-cols-[84px_minmax(0,1fr)]` com o **card de ano** (`anoHeaderHtml()`, com ícone de calendário + ano + "ANO") e o **seletor de mês** (botões id `mes-anterior` / `mes-proximo` + nome do mês).
- Linha "**ⓘ Período ativo • Mês/Ano**".
- O conteúdo abaixo do header usa um `padding-top` para não sobrepor o header fixo: hoje **`152px`** (dashboard) / **`168px`** (agenda). Se mudar a altura do header, ajuste esse valor (na linha do `<div class="mx-auto grid max-w-md gap-3 px-4" style="padding-top:calc(env(safe-area-inset-top) + ...">`).

## Regras importantes (não quebrar)
- **Preserve os ids**: `menu-toggle`, `ano`, `mes-anterior`, `mes-proximo`, `avisos-dashboard` — eles têm handlers (binds) ligados. Trocar o id quebra a ação.
- **Sino igual e no mesmo lugar** (topo direito).
- O seletor de ano é um `<select id="ano">` posicionado por cima do card (transparente) — mantenha-o pra o seletor nativo funcionar.

## Validar e publicar
- Validar sintaxe: `node --check public/mobile-app.js`.
- Publicar (o app é network-first, então recarregar já traz o JS novo — **não precisa** bumpar versão a cada tentativa):
  ```bash
  cd ~/avantalab
  rm -f .git/index.lock
  git add -A
  git commit -m "ui mobile: ajuste header"
  git push origin main
  ```
- Testar: recarregar o PWA/app no celular.

## ⚠️ Atenção: edição em paralelo
- O outro chat (módulos) também edita `public/mobile-app.js`. Para evitar conflito de Git:
  - Faça **um push de cada vez** e, antes de editar/subir, rode `git pull --rebase origin main` para trazer o que o outro chat já subiu.
  - Header e módulo mexem em partes diferentes do arquivo, então conflitos, se houver, são pequenos e localizados.

## Versão atual
- App em **1.3.1** (a versão fica em `public/mobile-app.js` `var APP_VERSION`, em `app/lib/version.ts`, e o cache do service worker em `public/mobile-sw.js` `CACHE_NAME`). Só bumpar quando fechar um pacote de ajustes confirmados.
