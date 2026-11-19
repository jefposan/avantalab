# 3.2.0.507 — Navegação com edição pendente

Base origin/main f370211d3c315fbb82f83cd51af2c6f4ed02766d (3.2.0.506), worktree isolado. PADRÃO AVANTA 1.24.0, confirmação oficial reutilizada, sem componente visual equivalente duplicado.

Escopo: Navegar durante novo pedido/continuação e nova nota avulsa em Vendas Web. Escolher outro destino abre Cancelar / Salvar e sair / Sair sem salvar. Apenas escrita real bloqueia o seletor. Não muda aplicativos nativos, política de acesso, banco ou emissão.

Salvar pedido usa Rascunho e aguarda OPERATION_SAVE_RESPONSE; salvar nota usa saveOnly e nunca issue. O formulário permanece montado até a navegação. Erros e timeout retornam para correção, sem saída. ID/versão do rascunho confirmado ficam disponíveis para uma nova gravação se a navegação for negada. Acesso ao destino e sessão de dispositivo sempre revalidados, inclusive após salvar. Troca de empresa/usuário invalida continuação antiga.

Testes executam controlador real do seletor: três ações, cancelamento sem rede, descarte sem gravação, salvamento aguardado, repetição/concorrência, falha/validação, perda de acesso e bloqueio de escrita. Controlador comercial real testado para ACK de rascunho e falha sem efeito de estoque. Sem clientes, notas, pedidos ou saldos reais criados no QA. Publicação autorizada posteriormente, com conferência da main/produção 3.2.0.506 e preservação do checkout compartilhado.
