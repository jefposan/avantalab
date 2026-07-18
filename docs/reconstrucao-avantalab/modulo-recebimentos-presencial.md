# Implantação — Módulo "Recebimentos Presenciais" (brief para Codex)

Objetivo: transformar o estudo isolado em `app/recebimentos/` num **módulo instalável**
do AvantaLab, espelhando os padrões já existentes de **Controle de Ponto** e
**Vendas Mobile**. Este documento é a especificação de execução: siga as fases na
ordem, valide com `npx tsc --noEmit` ao fim de cada uma e não faça commit/push sem
autorização.

> IMPORTANTE — independência total: o login do colaborador de Recebimentos NÃO tem
> relação alguma com o login por CPF do Controle de Ponto. Tabelas, rotas, PWA,
> sessão e Supabase client são próprios. A referência ao Ponto é apenas para copiar
> o **padrão** (link único, CPF+senha, isolamento do usuário), nunca para compartilhar
> dados/rotas.

Slug do módulo: **`recebimentos_presencial`**. Nome exibido: **"Recebimentos Presenciais"**.

## Estado da implantação

Implantado na versão **1.6.0** (18/07/2026): migration aditiva com RLS e
auditoria, APIs de colaboradores, adapter demo/Supabase, modal no Gestão Web,
PWA independente com CPF e senha, realtime e assets finais.

Na mesma versão **1.6.0**, a integração financeira permite que Gestor Master e
Administrador podem enviar ou atualizar o total baixado de cada mês no
Financeiro, definindo o nome da entrada e o título da etiqueta. A linha criada é
vinculada ao módulo, não duplica no mesmo período e não permite edição ou
exclusão manual. Operadores permanecem sem visibilidade do módulo.

Na versão **1.6.0.01**, o acesso do colaborador passou a reutilizar o background
institucional responsivo de `/ponto` em todos os estados da tela. Os arquivos
WebP e PNG também integram o cache offline versionado do PWA.

Ainda na versão **1.6.0.01**, a tela de login recebeu o mesmo card de instalação do
Controle de Ponto. Ele fica oculto em modo standalone, aciona o prompt nativo
quando disponível e apresenta a orientação de instalação manual nos demais
navegadores, inclusive no iPhone.

Na versão **1.6.0.03**, os cards de valores da Visão geral foram organizados em
coluna. O card Baixado ganhou contraste reforçado na ação e uma área fixa para
mensagens da integração, evitando mudança de altura ao navegar entre meses. O
módulo integrado também passou a consumir o modo escuro do Gestão.

Na versão **1.6.0.04**, o nome exibido foi corrigido em todo o projeto para
**Recebimentos Presenciais**. O slug técnico `recebimentos_presencial` foi
preservado, e uma migration aditiva atualiza o catálogo já instalado.

---

## 0. O que já existe (não recriar)

- Front-end de gestão (demo, em memória): `app/recebimentos/` — `RecebimentosClient.tsx`, `components/PainelAdministrativo.tsx`, `ListaEmpresas`, `ListaColaboradores`, `ListaRecebimentos`, `PainelConferencia`, `ListaInadimplentes`, `GraficoResultados`, `FormularioRecebimento`, `helpers.ts`, `types.ts`, `dadosDemo.ts`, `recebimentos.module.css`.
- App do colaborador (demo): `app/recebimentos/ColaboradorApp.tsx` + `app/recebimentos/colaborador/page.tsx` (casca com metadata/manifest).
- PWA já provisionado: `public/recebimentos-manifest.json`, `public/recebimentos-sw.js`, `public/images/recebimentos-icon-180/192/512.png` (ícone provisório — substituir depois).

O trabalho é **plugar** esse front no sistema (módulo + banco + auth) mantendo o
visual atual. Preserve o comportamento visual já ajustado (scroll fixo, seletor de
mês no platô, hover, formulários, estornar/reabrir, etc.).

---

## 1. Convenções a espelhar (arquivos de referência)

| Padrão | Copiar de |
|---|---|
| Seed do módulo no catálogo | `modulos_setup.sql` (tabela `modulos`) e migration `20260714183000_divulgacao_vendas_mobile.sql` (insert em `public.modulos`) |
| Ativar/desativar por empresa | `empresa_modulos` + funções `carregarModulos`/`instalarModulo`/`desinstalarModulo` em `app/page.tsx` (l. ~2220–2301) |
| Botão em Ajustes gated por módulo | `app/page.tsx` bloco "Ponto" (l. ~9437) — `modulosAtivos.includes('ponto') && podeGerenciarPonto` |
| Popup de gestão | `app/components/PontoAdminModal.tsx` (usa `DraggableModalCard`, header gradiente, abas, área rolável) |
| Link de acesso "COPIAR" | `PontoAdminModal.tsx` l. ~650 (bloco "Link de acesso dos funcionários") |
| Criar usuário CPF+senha (auth admin) | `app/api/criar-funcionario-ponto/route.ts` |
| Resolver CPF→e-mail no login | `app/api/ponto/resolver-email/route.ts` |
| Verificar módulo ativo (bloqueio) | `app/api/ponto/verificar-acesso/route.ts` |
| Casca PWA + SW + manifest | `app/ponto/page.tsx`, `public/ponto-sw.js`, `public/ponto-manifest.json` |
| Isolamento do usuário no banco | `ponto_isolar_usuarios_setup.sql` |

Regra de card novo: usar `AvantaCard`/AvantaShell quando aplicável (já usado no painel).

---

## 2. Fase 1 — Banco (migration `supabase/migrations/`)

Criar UMA migration nova `AAAAMMDDHHMMSS_recebimentos_presencial.sql`. Nomes de tabela
com prefixo `recebimentos_`. `empresa_id` = perfil AvantaLab dono (FK `public.empresas`).
Cuidado com a ambiguidade: no domínio deste módulo, "empresa" e "subempresa" são o
**tomador** (shopping/loja), NÃO o perfil AvantaLab. Por isso:

### 2.1 Catálogo
```sql
insert into public.modulos (id, nome, descricao, icone, perfis, ordem)
values ('recebimentos_presencial', 'Recebimentos Presenciais',
        'Cobrança em dinheiro em campo, com conferência e baixa pelo gestor.',
        'recebimentos', '{empresa}', 3)
on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao,
  icone = excluded.icone, perfis = excluded.perfis, ordem = excluded.ordem;
```
(Adicionar `'recebimentos'` ao mapa de ícones em `ModulosModal.tsx`.)

### 2.2 Tabelas

`recebimentos_colaboradores` — identidade do colaborador (auth user independente):
```
user_id      uuid  -> auth.users (on delete cascade)
empresa_id   uuid  -> public.empresas
nome         text
cpf          text  not null             -- É o LOGIN (só dígitos). Único global.
celular      text
email        text                       -- e-mail interno sintético gerado no servidor
ativo        boolean default true
criado_em    timestamptz default now()
unique (user_id, empresa_id)
```
- **O CPF é o login** (não há campo "login" separado). Índice único GLOBAL entre
  colaboradores (um CPF = uma conta, para o PWA resolver a empresa sem ambiguidade):
  `create unique index recebimentos_colaboradores_cpf_uidx on recebimentos_colaboradores(cpf);`
- No cadastro (gestão), os campos do colaborador são: **Nome, CPF (login), Senha,
  Confirmar senha, Celular, E-mail** — já ajustado no front (`ListaColaboradores.tsx`,
  `types.ts` usa `cpf` no lugar de `login`; máscara/validação em `helpers.ts`:
  `formatarCpf`, `digitosCpf`, `cpfValido`). O e-mail interno sintético é gerado no
  servidor (ex.: `${cpf}@colaboradores.avantalab.local`), não é digitado.

`recebimentos_empresas` — tomador (ex.: Shopping):
```
id uuid pk, empresa_id uuid -> empresas, nome text, responsavel text,
telefone text, email text, ativo boolean default true,
criado_em timestamptz, atualizado_em timestamptz
```

`recebimentos_subempresas` — ponto de cobrança (ex.: loja/sala):
```
id uuid pk, empresa_id uuid -> empresas, recebimento_empresa_id uuid -> recebimentos_empresas (on delete cascade),
nome text, endereco text, responsavel text,
valor_combinado numeric(12,2) check (valor_combinado > 0),
dia_vencimento smallint check (dia_vencimento between 1 and 31),
ativo boolean default true, criado_em, atualizado_em
```

`recebimentos_lancamentos` — o recebimento em si (a "cobrança/entrada"):
```
id uuid pk,
empresa_id uuid -> empresas,
recebimento_empresa_id uuid -> recebimentos_empresas (on delete cascade),
subempresa_id uuid -> recebimentos_subempresas (on delete cascade),
colaborador_user_id uuid -> auth.users (on delete set null),  -- quem lançou
vencimento date not null,
valor_combinado numeric(12,2) not null,
valor_recebido numeric(12,2),                 -- null enquanto aberto
recebido_em timestamptz,                       -- quando o colaborador lançou
observacao text,
situacao text not null check (situacao in
  ('previsto','aguardando_conferencia','baixado','recebido_a_menor',
   'recebido_a_maior','em_atraso','devolvido_para_correcao')),
baixado_por uuid -> auth.users, baixado_em timestamptz,
criado_em, atualizado_em
```
Índices: `(empresa_id, vencimento)`, `(colaborador_user_id, recebido_em)`, `(situacao)`.

Opcional (auditoria imutável, recomendado): `recebimentos_eventos`
`(id, lancamento_id, tipo['lancado'|'baixado'|'devolvido'|'divergencia'|'estornado'], por uuid, motivo text, snapshot jsonb, criado_em)` — insert-only. Registra estorno/devolução/divergência sem perder trilha (equivalente ao carimbo que hoje vai na observação do demo).

### 2.3 RLS (habilitar em todas)

Helper (mesmo espírito de `vendas_mobile_pode_gerir_catalogo`):
```sql
create function recebimentos_pode_gerir(p_empresa_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.usuarios_empresa ue
    join public.empresa_modulos m on m.empresa_id = ue.empresa_id
      and m.modulo_id = 'recebimentos_presencial' and m.ativo
    where ue.empresa_id = p_empresa_id and ue.user_id = auth.uid()
      and ue.status = 'ativo' and ue.perfil in ('gestor_master','administrador'));
$$;
```
Helper "colaborador desta empresa":
```sql
create function recebimentos_e_colaborador(p_empresa_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.recebimentos_colaboradores c
    join public.empresa_modulos m on m.empresa_id = c.empresa_id
      and m.modulo_id = 'recebimentos_presencial' and m.ativo
    where c.empresa_id = p_empresa_id and c.user_id = auth.uid() and c.ativo);
$$;
```

Políticas:
- `recebimentos_empresas` / `recebimentos_subempresas`: **SELECT** para gestor OU colaborador da empresa; **ALL** (insert/update/delete) só gestor (`recebimentos_pode_gerir`).
- `recebimentos_colaboradores`: **SELECT** próprio (`user_id = auth.uid()`) ou gestor; escrita só via rotas service-role (sem policy de insert/update pública).
- `recebimentos_lancamentos`:
  - SELECT: gestor da empresa OU o próprio colaborador (`colaborador_user_id = auth.uid()`).
  - INSERT: colaborador da empresa, com `colaborador_user_id = auth.uid()` e `situacao in ('aguardando_conferencia','recebido_a_menor','recebido_a_maior')` (declara recebimento). Também permitir gestor criar a "cobrança prevista".
  - UPDATE: **só gestor** (baixa, devolução, divergência, estorno). Colaborador não altera após lançar (usa "devolver para correção" pra reabrir). Opcional: permitir colaborador reeditar enquanto `aguardando_conferencia` e for o dono.
  - DELETE: só gestor (ou nenhum — preferir estorno via UPDATE).
- `recebimentos_eventos`: SELECT gestor; INSERT via service-role/RPC.

### 2.4 RPCs (security definer, grant authenticated)
- `recebimentos_baixar(p_lancamento_id, p_motivo)` — situacao='baixado', baixado_por/em; grava evento.
- `recebimentos_devolver(p_lancamento_id, p_motivo)` — situacao='devolvido_para_correcao'; evento.
- `recebimentos_registrar_divergencia(p_lancamento_id, p_motivo)` — baixado com marcação; evento.
- `recebimentos_estornar(p_lancamento_id, p_motivo)` — reabre: `situacao` = `em_atraso` se `vencimento < hoje` senão `previsto`; zera `valor_recebido/colaborador_user_id/recebido_em/baixado_*`; evento com motivo (obrigatório). (Espelha `estornarRecebimento` do `RecebimentosClient.tsx`.)
- Todas validam `recebimentos_pode_gerir(empresa_id do lançamento)`.

### 2.5 (Opcional) Integração financeira
Se as baixas devem entrar no faturamento do Gestão, seguir o padrão de
`20260715213000_integracao_receitas_vendas_mobile.sql` (entrada em `faturamentos_entradas`
com `tipo_obs='recebimentos_sistema'`, protegida contra edição manual). **Decisão
pendente** — deixar como fase separada; por padrão NÃO integrar na v1.

### 2.6 Realtime/isolamento
- Adicionar `recebimentos_lancamentos` à publicação `supabase_realtime` (opcional, para a conferência atualizar sozinha).
- O colaborador é auth user SEM vínculo em `usuarios_empresa`, então o RLS financeiro central já o exclui automaticamente (não precisa do script de isolamento do Ponto). Confirmar que nenhuma policy nova concede acesso indevido.

---

## 3. Fase 2 — Rotas de API (`app/api/recebimentos/`)

Espelhar as rotas do Ponto, trocando tabela/slug:

- `POST /api/recebimentos/criar-colaborador` — cópia de `criar-funcionario-ponto`:
  recebe `{ empresaId, nome, cpf, senha, celular, email }`; valida gestor/admin + módulo
  `recebimentos_presencial` ativo; CPF válido (mesma validação do front) e único global;
  cria auth user (`auth.admin.createUser`, e-mail interno derivado do CPF —
  ex.: `${cpfDigitos}@colaboradores.avantalab.local` —, senha, `user_metadata`:
  `{ nome, cpf, celular, empresa_id, tipo:'colaborador_recebimentos' }`); insere em
  `recebimentos_colaboradores` (com `cpf` só dígitos). **NÃO** inserir em `usuarios_empresa`.
  O `cpf` é o login; não há campo "login" separado.
- `POST /api/recebimentos/atualizar-colaborador`, `POST /api/recebimentos/excluir-colaborador`, `POST /api/recebimentos/redefinir-senha-colaborador` — espelhar equivalentes do ponto.
- `POST /api/recebimentos/resolver-email` — cópia de `ponto/resolver-email`: CPF→e-mail consultando `recebimentos_colaboradores` (ativo) + checando módulo ativo (bloqueio se desativado). Resposta genérica em falha.
- `POST /api/recebimentos/verificar-acesso` — `{ativo:boolean}` conforme `empresa_modulos`.

Todas em `runtime = 'nodejs'`, service role, validando `Authorization` do chamador quando for ação de gestor.

---

## 4. Fase 3 — Camada de dados (adapter)

Criar `app/recebimentos/data/repo.ts` com uma interface única usada pelo painel e pelo app do colaborador:
```ts
export interface RecebimentosRepo {
  carregar(empresaId: string): Promise<{ empresas; subempresas; colaboradores; recebimentos }>;
  salvarEmpresa / editarEmpresa / excluirEmpresa / alternarEmpresa;
  salvarSubempresa / editarSubempresa / excluirSubempresa / alternarSubempresa;
  criarColaborador / editarColaborador / excluirColaborador / alternarColaborador; // via /api/recebimentos/*
  registrarRecebimento(subId, valor, obs);      // colaborador
  receberCobranca(lancId, valor, obs);           // baixa de parcela em atraso
  confirmarBaixa / devolver / divergencia / estornar; // via RPC
}
```
- `repoDemo` = comportamento atual (in-memory, `dadosDemo`) — mantém `/recebimentos` funcionando standalone sem login (útil para dev/preview).
- `repoSupabase(empresaId)` = usa `supabase` (browser client) para SELECT/insert/update e as RPCs; ações de colaborador (CRUD) chamam as rotas `/api/recebimentos/*`.

Refatorar `RecebimentosClient.tsx` e `ColaboradorApp.tsx` para receber o repo (prop) em vez de mutar estado local diretamente. Manter os mesmos tipos de `types.ts` (mapear colunas snake_case do banco ↔ camelCase do front no repo).

---

## 5. Fase 4 — Integração no Gestão Web (`app/page.tsx`)

1. **Ícone**: adicionar `recebimentos: '💵'` (ou SVG) ao mapa em `ModulosModal.tsx`.
2. **Estado do módulo**: `modulosAtivos` já carrega de `empresa_modulos`; nada a fazer além do seed.
3. **Botão em Ajustes** (ao lado de Ponto / Vendas Mobile):
   ```tsx
   {modulosAtivos.includes('recebimentos_presencial') && podeGerenciarRecebimentos && (
     <Tooltip texto="Gerencie empresas, colaboradores e a conferência dos recebimentos em campo." posicao="bottom">
       <button onClick={() => { setAjustesAberto(false); setModalRecebimentos(true); }} className="...mesmo estilo...">
         <svg .../> Recebimentos
       </button>
     </Tooltip>
   )}
   ```
   `podeGerenciarRecebimentos` = mesma regra de `podeGerenciarPonto` (gestor_master/administrador).
4. **Popup de gestão**: criar `app/components/RecebimentosAdminModal.tsx` (base em `DraggableModalCard`, header gradiente `#020617→#003E73`, `z-[2000]`, `max-h-[88vh]`, scroll lock via `WebPopupScrollLock`) que renderiza o `RecebimentosClient` (perfil gestor/admin) já com `repoSupabase(empresaId)`. Reaproveitar `PainelAdministrativo` — sem o seletor de perfil da versão standalone. Montar/desmontar por `modalRecebimentos`.
   - Dentro do modal, na aba **Colaboradores**, adicionar o bloco **"Link de acesso dos colaboradores"** (copiar visual do Ponto): mostra `https://avantalab.com.br/recebimentos/colaborador`, subtítulo "Entram com CPF e senha · mesmo link p/ todas as empresas." e botão **COPIAR** (`navigator.clipboard`). O CRUD de colaborador passa a usar as rotas `/api/recebimentos/*` (não mais o estado demo).

---

## 6. Fase 5 — PWA do colaborador (`/recebimentos/colaborador`)

Converter `ColaboradorApp.tsx` de demo para o app real, espelhando `ponto-app.js`/`app/ponto/page.tsx` (mas em React, mantendo o estilo atual):

1. **Supabase client próprio** com `storageKey: 'avantalab-recebimentos-colaborador-auth'` (sessão isolada, sem relação com o app financeiro nem com o ponto).
2. **Tela de login CPF + senha**:
   - CPF (máscara) + senha → `POST /api/recebimentos/resolver-email` → recebe e-mail interno → `supabase.auth.signInWithPassword({ email, password })`.
   - Tratar `bloqueado` (módulo desativado) com mensagem "fale com o gestor".
3. **Após login**: `repoSupabase(empresaIdDoColaborador)` carrega empresas/subempresas/recebimentos do próprio colaborador; renderiza o `PainelColaborador` atual (registrar recebimento, parcelas em atraso, histórico).
4. **Bloqueio de sessão**: ao abrir, checar `POST /api/recebimentos/verificar-acesso`; se inativo, encerra a sessão e mostra aviso (padrão `pontoAcessoAtivo`).
5. **Sair**: `supabase.auth.signOut()` só desta sessão.
6. **PWA**: já existem `public/recebimentos-manifest.json` (start_url `/recebimentos/colaborador`, scope próprio) e `public/recebimentos-sw.js` + ícones. Conferir/atualizar: `start_url`, `scope`, `theme_color #003E73`, ícones 192/512 (`purpose any`), apple-touch 180. Registro do SW já ocorre no `ColaboradorApp` (`/recebimentos-sw.js?v=1`). Versionar `?v=` ao mexer.
7. **noindex** já está na metadata.

`app/recebimentos/page.tsx` (gestão standalone) pode permanecer para dev usando `repoDemo`, mas a **entrada oficial de produção é o popup** (Fase 5). Manter `robots: noindex`.

---

## 7. Fase 6 — Assets (pendente do usuário)

- Ícone próprio do módulo/PWA: substituir `public/images/recebimentos-icon-180/192/512.png` (hoje provisórios).
- "Imagem de link" (share/preview) do colaborador: criar `public/images/recebimentos-share-meta.jpg` e referenciar em `openGraph`/`twitter` da metadata de `/recebimentos/colaborador` (padrão do `/ponto`).
- `PENDENTE DE CONFIRMAÇÃO`: arte final e cor do PWA do colaborador.

---

## 8. Ordem de execução e validação

1. Migration (Fase 1) → aplicar em Supabase local (`supabase db push`) e conferir RLS: gestor de A não vê dados de B; colaborador só vê a própria empresa e os próprios lançamentos; colaborador não acessa nenhuma tabela financeira.
2. Rotas API (Fase 2) → testar criar colaborador (CPF único), resolver-email, verificar-acesso.
3. Adapter (Fase 3) → `repoDemo` mantém `/recebimentos` igual; `repoSupabase` lê/grava real.
4. Integração web (Fase 4) → instalar módulo pelo botão Módulos faz surgir o botão "Recebimentos" em Ajustes; popup abre o painel plugado no Supabase; desinstalar remove o botão e bloqueia o colaborador.
5. PWA colaborador (Fase 5) → login CPF+senha, lançar recebimento, ver na conferência do gestor; instalar como app.
6. Rodar `npx tsc --noEmit` e os casos equivalentes de `testes-de-validacao.md` (adaptados a este módulo).

## 9. Regras invioláveis (repetir ao Codex)
- Recebimentos e Ponto são independentes: nenhuma tabela/rota/sessão compartilhada.
- RLS em todas as tabelas; escrita de colaborador via service-role nas rotas; baixa/estorno só gestor via RPC.
- Preservar 100% do visual/UX já ajustado no front (`app/recebimentos/`).
- Migrations aditivas e idempotentes; não editar migrations aplicadas.
- Sem commit/push sem autorização; versionar `app/lib/version.ts` + `CHANGELOG.md` ao fechar o pacote.
