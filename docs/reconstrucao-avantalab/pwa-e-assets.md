# PWA e Assets

Quatro superfícies instaláveis, todas no mesmo domínio.

## Manifests

| Arquivo | App | start_url / scope | theme | Ícones |
|---|---|---|---|---|
| `public/manifest.json` | Web (aponta pro mobile) | `/mobile` / `/` | `#003E73` | `avantalab-icon-192/512.png` (maskable) |
| `public/mobile-manifest.json` | Mobile | `/mobile` / `/` | `#003E73` | idem |
| `public/ponto-manifest.json` | Ponto | `/ponto` / `/ponto` | `#003E73` | `ponto-icon-192/512.png` |
| `vendas_mobile/app/manifest.webmanifest` (→ `public/vendas-mobile/`) | Vendas | `/mobile/vendas` / `/` | `#003E73`, bg `#001827` | `vendas-icon-192/512.png` |

## Service workers e política de atualização

| SW | Cache | Estratégia |
|---|---|---|
| `public/sw.js` | `avantalab-web-v1` | Sem cache de fetch (rede sempre); só push + limpeza de caches antigos. |
| `public/mobile-sw.js` | `avantalab-mobile-vNNN` | Pré-cache do shell (`/mobile-app.js?v=NNN`, supabase, manifest, imagens); network-first para navegação/`/api`/`/mobile`; push handler com título/URL/perfil. |
| `public/ponto-sw.js` | `avantalab-ponto-vN` | Pré-cache do shell do ponto; push com ícone/badge do ponto. |
| `vendas_mobile/app/sw.js` | `avantalab-vendas-mobile-vN` | Network-first com gravação no cache e fallback offline ao cache/`index.html`. |

Atualização de versão (fazer SEMPRE em conjunto):
1. `app/lib/version.ts` (+`CHANGELOG.md`, `public/changelog.json`).
2. Mobile: `?v=` em `app/mobile/page.tsx` + `APP_SHELL`/`CACHE_NAME` em `mobile-sw.js`. O `mobile-app.js` lê a versão do atributo `data-app-version` injetado pela casca (fallback interno `'1.3.6'`), então basta atualizar `app/lib/version.ts`.
3. Ponto: `?v=` em `app/ponto/page.tsx` + `PONTO_CACHE`/`PONTO_SHELL`.
4. Vendas: `assetVersion` em `app/mobile/vendas/page.tsx` + `CACHE_NAME` em `vendas_mobile/app/sw.js`; rodar o sync (`npm run dev/build`).
Como os SWs são network-first, recarregar já traz JS novo — bump de cache só ao fechar pacote.

## Assets (`public/images/`)

- Ícones de app: `avantalab-icon-192/512.png`, `ponto-icon-180/192/512.png`, `vendas-icon-180/192/512.png`.
- Compartilhamento (OG): `avantalab-share-meta-safe-center-v2.jpg` (1200×628), `ponto-share-meta.jpg`.
- Fundos: `bg-avantalab.png/webp` (web), `bg-avantalab-mobile.png/webp`, `bg-avantalab-mobile-1080x1920.png/webp` (mobile/ponto), `Bg web sem logo.png`, `bg Avntalab-sem texto.png` (variantes).
- Logos: ver [interface-e-design-system.md](interface-e-design-system.md). Fonte vetorial: `logo_Ava.ai`.
- `google-logo.svg` (botão Google), `landing/` (hero + logo da landing).
- Vendas (`vendas_mobile/app/assets/` → `public/vendas-mobile/assets/`): ícones da sala de botões (`1_Dashboard.png` … `9_Informações.png`), `home-button.png`, `home-button-house.png`, `icon-192/512.svg`, `icons.svg`, logos claro/escuro, `bg-avantalab-mobile.png`; pacote demo `data/tridium-package.json` e imagens de produtos de referência.

## Como substituir assets sem quebrar

1. Manter caminho e nome (os SWs pré-cacheiam por URL exata) OU atualizar as listas `APP_SHELL`/`PONTO_SHELL`/`ASSETS` + manifests + metadados (`app/mobile/page.tsx`, `app/ponto/page.tsx`, `app/mobile/vendas/page.tsx`).
2. Ícones: manter tamanhos declarados (192/512; 180 para apple-touch) e purpose (`any maskable` no financeiro).
3. Fundos mobile: fornecer par `.png` + `.webp` (o CSS usa `image-set`).
4. Bump do cache do SW correspondente para forçar refresh do pré-cache.
5. Vendas: editar SEMPRE em `vendas_mobile/app/` e sincronizar.
