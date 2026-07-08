# Padrão AvantaShell — cards do sistema AvantaLab

Nome do padrão: **AvantaShell** ("concha" em duas camadas).
Componente: `app/components/AvantaCard.tsx` + `AvantaCard.module.css`.
Demo: `/avanta-card-demo`.

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

- **CHAPA** (`.cardTras`): card de trás, **largura total**, tom mais claro
  (mais tinta da corPrimaria), com o TÍTULO. Aparece pelo recorte da frente.
- **CORPO** (`.frente` + `.body`): card da frente. O topo dele corre **reto**
  pelo vale e sobe ao platô por uma **diagonal em "S" contínua**: metade
  côncava (vale) + metade convexa (platô), com o mesmo raio (`--topo/2`),
  tangentes — nunca um degrau reto vertical.
- **PLATÔ** (`.plato`): topo direito da frente (~25%), mesma superfície do
  corpo (sem emenda). Contém SOMENTE controles: pontinhos de arrastar (2×3)
  e menu `...`. Nunca conteúdo.
- **CONTORNO**: traço fino que segue o recorte (drop-shadow de 0,5px no
  conjunto da frente) + sombra profunda que também acompanha a silhueta.

## 2. Regras de uso

1. **Título só na chapa; controles só no platô.** Nada de botões no título
   nem texto no platô.
2. **A subida do vale para o platô é sempre a diagonal em "S"** (côncava +
   convexa com raios iguais de `--topo/2`, tangentes). O lado esquerdo do
   vale é sempre reto — sem "bico" e sem segmento vertical na subida.
3. **Cores sempre derivadas da `corPrimaria`** via `color-mix`. Nenhuma cor
   fixa de marca dentro do card; o tema do perfil comanda.
4. **Sem bordas de 1px em elementos internos.** Profundidade = tom + luz
   interna (inset) + sombra. O único traço é o contorno do recorte.
5. Card **não arrastável/configurável**: usar `hideDragHandle` / `hideMenu`
   (o platô permanece, vazio, para manter a silhueta).
6. Conteúdo do corpo é livre (`children`), mas subcards internos usam
   cantos `--raio` menores que o do card (hierarquia de raios).
7. Mobile: o padrão já reduz `--topo/--raio/--curva` no breakpoint 640px.
   Não sobrescrever por card.

## 3. Tokens (variáveis CSS em `.card`)

| Token         | Padrão | Função                                        |
|---------------|--------|-----------------------------------------------|
| `--cp`        | #3b82f6| corPrimaria do perfil (via prop `corPrimaria`) |
| `--topo`      | 78px   | altura do recorte (faixa visível da chapa)     |
| `--raio`      | 30px   | cantos convexos                                |
| `--curva`     | `--topo/2` | raio do "S" do vale (derivado; não fixar em px) |
| `--plato-w`   | 25%    | largura do platô                               |

Tons derivados (não alterar por card): `--cor-tras-*` (chapa),
`--cor-corpo-*` (frente), `--cor-contorno`, `--cor-texto`, `--cor-texto-2`.

## 4. Uso do componente

```tsx
import AvantaCard from '@/app/components/AvantaCard';

<AvantaCard
  title="Lançamentos Mensais"
  corPrimaria={corPrimaria}          // tema do perfil
  onSettingsClick={abrirAjustes}     // menu "..."
  dragHandleProps={listeners}        // dnd-kit (opcional)
>
  {conteudo}
</AvantaCard>
```

## 5. Pendências / evolução

- [ ] Variante light (o padrão atual é dark premium; derivar tons claros
      da mesma corPrimaria quando aplicar no tema claro do sistema).
- [ ] Aplicar no dashboard web (começar por "Lançamentos Mensais").
- [ ] Depois: Por Categoria, Gráficos, Balanço, Relatório (substituindo a
      antiga faixa `border-t-4`).
