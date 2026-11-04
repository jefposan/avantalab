# Publicação 3.2.0.79 — 2026-10-22

Identificação: **3.2.0.79 — Marketplaces: tarjas unificadas, exclusão simplificada e revisão de anúncios após editar produto**.

Tarja compartilhada em Anunciados, Estoques e Produtos cadastrados; Vendas sem tarja. Ao menos um vínculo ativo mantém Anunciado no produto local, independentemente do saldo/filtro. Preserva outras situações e ignora excluídos.

Inclui pendências .77–.78: exclusão simplificada sem bloqueio por saldo desconhecido, histórico preservado, busca sem acentos e revisão explícita por conta/anúncio após salvar cadastro. Preço de referência não vira preço anunciado automaticamente. Link de abertura recuperado.

Pacote isolado a partir da .76, sem mudanças não relacionadas do diretório principal. Migrações 20261022180000/20261022181000 necessárias; registro da execução no recibo local. Nenhum produto/anúncio publicado, editado ou excluído nos testes. Publicação de produção com promoção automática depois do build, sem declarar no ar antes de confirmação.

Validação: 1.794 testes aprovados, nenhum erro, um ignorado; tarjas renderizadas em testes React; TypeScript do escopo, lint dos componentes novos, PADRÃO AVANTA 1.21.0 e Ava aprovados.

Aviso de pesquisa de preços investigado separadamente: logs apontam ausência de créditos na API OpenAI, não um intervalo temporário. Nenhuma compra, mudança de plano, limite ou correção de mensagens da IA incluída nesta entrega.
