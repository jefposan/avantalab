# Padrão AvantaShell — cards do sistema AvantaLab

Nome do padrão: **AvantaShell** ("concha" em duas camadas).
Componente: `app/components/AvantaCard.tsx` + `AvantaCard.module.css`.
Preset aprovado: `criarAvantaShellPreset({ corPrimaria, darkMode })`.
Demo: `/avanta-card-demo`.

Regra central: **AvantaShell não é paleta visual.** Ele fornece somente a
modelagem estrutural do header/recorte. Fundos, textos, bordas, sombras,
estados e cores pertencem à tela que usa o componente.

---

## 1. Anatomia (nomes oficiais das partes)

```
┌───────────────────────────────────────────────┬──────────┐
│  CHAPA (card de trás, largura total)          │  PLATÔ   │ ← controles
│  | TÍTULO                                     │ ⠿    ...  │
├───────────────────────────────────── vale ─╮  └──────────┤
│                                             ╰── curva ───┤
│  CORPO (card da frente)                                  │
│  conteúdo livre (children)                               │
└──────────────────────────────────────────────────────────┘
```

- **CHAPA** (`.cardTras`): card de trás, **largura total**, com o TÍTULO.
  Aparece pelo recorte da frente. A superfície/cor vem da tela consumidora.
- **SILHUETA DA FRENTE** (`.frontShape`): SVG com um único `<path>`, responsável
  por desenhar o topo do corpo, o vale, a subida em "S" e o platô. Essa é a
  superfície visual da frente; não usar soldas CSS separadas.
- **CORPO** (`.body`): área de conteúdo livre (`children`). Ele continua a
  superfície iniciada pelo SVG, mas não desenha a curva superior.
- **PLATÔ** (`.plato`): topo direito (~25%), para controles ou metadado curto
  via `headerRight` (ex.: ano). Nunca conteúdo longo e nunca fundo/curva.
- **CONTORNO/SOMBRA**: quando usados, são fornecidos pela tela consumidora via
  variáveis CSS. O shell apenas permite que acompanhem o recorte.

## 2. Regras de uso

1. **Título só na chapa; controles/metadado curto só no platô.** Nada de
   botões no título nem conteúdo longo no platô.
2. **A subida do vale para o platô é sempre um path SVG contínuo.** Não montar
   a curva com `border-radius`, `radial-gradient`, pseudo-elementos ou peças
   coladas: isso cria emenda/zig-zag no contorno.
3. **AvantaShell não define cor.** Não colocar paleta, fundo, texto ou borda
   fixa dentro do componente. A tela deve aplicar sua própria skin.
4. **Sem bordas de 1px em elementos internos criadas pelo shell.** Se a tela
   precisar de borda/contorno, ela fornece por classe ou variável CSS.
5. Card **não arrastável/configurável**: usar `hideDragHandle` / `hideMenu`
   (o platô permanece, vazio, para manter a silhueta).
6. Conteúdo do corpo é livre (`children`), mas subcards internos usam
   cantos `--raio` menores que o do card (hierarquia de raios).
7. Mobile: o SVG usa `viewBox` + `preserveAspectRatio="none"` e escala com a
   largura/altura da frente; o padrão já reduz `--topo/--raio` no breakpoint
   640px. Não sobrescrever por card.

## 3. Tokens (variáveis CSS em `.card`)

| Token         | Padrão | Função                                    |
|---------------|--------|-------------------------------------------|
| `--topo`      | 78px   | altura do recorte (faixa visível da chapa) |
| `--raio`      | 30px   | cantos convexos                            |
| `--plato-w`   | 25%    | largura do platô                           |

Skin fornecida pela tela consumidora: `--avanta-tras-bg`,
`--avanta-tras-bg-size`, `--avanta-tras-overlay`, `--avanta-tras-shadow`,
`--avanta-front-bg`, `--avanta-body-bg`, `--avanta-body-shadow`,
`--avanta-body-top-left-radius`, `--avanta-title-color`,
`--avanta-accent-bg`, `--avanta-control-color`,
`--avanta-control-hover-bg`, `--avanta-control-hover-color`,
`--avanta-front-filter`.

## 4. Implementação da Frente

A frente tem três responsabilidades separadas:

- `.frontShape`: SVG absoluto, `viewBox="0 0 1000 108"`, com um único `<path>`
  para vale + subida + platô. É a única fonte visual da curva.
- `.plato`: container absoluto dos controles. Não deve ter `background`,
  `border-radius` ou pseudo-elemento de solda.
- `.body`: corpo do card, com conteúdo livre e superfície fornecida pela tela.

Regra crítica: **não recriar a solda com CSS.** Se a curva precisar mudar,
ajustar o `d` do `<path>` em `AvantaCard.tsx`.

## 5. Uso do componente

### Modo simples (padrão para cards novos)

Basta informar título, cor primária e o conteúdo do platô. O card monta o
visual completo internamente via `criarAvantaShellPreset`:

```tsx
import AvantaCard from '@/app/components/AvantaCard';

<AvantaCard
  title="Lançamentos Mensais"
  corPrimaria={corPrimaria}
  darkMode={darkMode}
  plato={<AnoBadge ano={anoSelecionado} />}  // canto superior direito
  onSettingsClick={abrirAjustes}             // menu "..."
>
  {conteudo}
</AvantaCard>
```

### Modo avançado (compatibilidade / skin própria)

`criarAvantaShellPreset` continua exportado e `style`/`bodyStyle` funcionam
como overrides — inclusive combinados com o modo simples:

```tsx
const avantaShell = criarAvantaShellPreset({ corPrimaria, darkMode });

<AvantaCard
  title="Lançamentos Mensais"
  onSettingsClick={abrirAjustes}
  dragHandleProps={listeners}        // dnd-kit (opcional)
  headerRight={<AnoBadge ano={anoSelecionado} />}  // equivalente a `plato`
  className={textStrong}
  bodyClassName={bgCard}
  style={avantaShell.cardStyle}
  bodyStyle={avantaShell.bodyStyle}
>
  {conteudo}
</AvantaCard>
```

### Contorno do card

O contorno é ÚNICO, desenhado por drop-shadows sequenciais de 1px
(`--avanta-front-filter`) que seguem a silhueta inteira — corpo, vale, curva
e platô — com espessura uniforme. **Não combinar com bordas `inset` no corpo**
(`--avanta-body-shadow`): a mistura dos dois sistemas deixava a borda do
platô diferente do restante do card.

## 6. Pendências / evolução

- [x] Separar modelagem estrutural do AvantaShell da skin visual da tela.
- [x] Aplicar no dashboard web em "Lançamentos Mensais" para avaliação.
- [x] Consolidar os ajustes aprovados em `criarAvantaShellPreset`.
- [ ] Depois: Por Categoria, Gráficos, Balanço, Relatório (substituindo a
      antiga faixa `border-t-4`).
