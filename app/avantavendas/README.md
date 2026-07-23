# AvantaVendas

Fonte oficial do PWA de vendas do ecossistema AvantaLab.

## Endereços

- Público: `https://vendas.avantalab.com.br`
- Rota interna oficial: `/avantavendas`
- Compatibilidade: `/mobile/vendas` redireciona para `/avantavendas`

## Estrutura

- `page.tsx`: página e metadados do PWA.
- `AvantaVendasBootstrap.tsx`: carregamento dos recursos, progresso e registro
  do service worker.
- `manifest.webmanifest/`: manifesto servido pela aplicação.
- `sw.js/`: service worker próprio.
- `versao/`: endpoint sem cache para confirmação da versão publicada.
- `recursos/`: entrega controlada dos arquivos do sistema.
- `sistema/`: código, estilos, bibliotecas e recursos oficiais do AvantaVendas.
- `documentacao/historico/`: documentos preservados da fase inicial do produto.
- `documentacao/referencia_tridium/`: referência local histórica, ignorada pelo
  Git e sem participação no build ou na produção.

## Integração

O AvantaVendas usa a mesma autenticação e o mesmo projeto Supabase do AvantaLab.
As tabelas mantêm o prefixo histórico `vendas_mobile_`; esse nome pertence ao
banco e não representa uma segunda cópia do aplicativo.

O subdomínio é resolvido pelo `proxy.ts`. As trocas de sistema na Gestão e no
Vendas apontam para `/avantavendas`. O retorno à Gestão usa
`/avantavendas/gestao`, que renderiza a tela oficial de `/mobile` dentro do
escopo instalado do AvantaVendas e evita a abertura da interface do navegador.

## Desenvolvimento

O build usa diretamente os arquivos de `app/avantavendas/sistema`. Não existe
mais sincronização para `public/vendas-mobile` nem projeto separado em
`vendas_mobile`.
