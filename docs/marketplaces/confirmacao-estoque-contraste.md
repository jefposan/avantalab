# Contraste da confirmação de estoque físico

Revisão local 3.1.0.55, PADRÃO AVANTA 1.20.0. Não publicada.

O texto Confirmar existia, mas a regra `.listingsPanel button:not(.primary)…` sobrepunha `text-white` do ModalConfirmacao. Reprodução local com a mesma estrutura confirmou texto e fundo em `rgb(208, 0, 0)`, tornando o rótulo invisível.

A correção usa `corTextoSobreFundo` compartilhado e declara `color` junto com `backgroundColor` no botão oficial. O cabeçalho segue o mesmo contraste; cor explícita fornecida pelo consumidor continua respeitada nas variantes primária/alerta. A destrutiva conserva vermelho e texto contrastante. Não muda ações, permissões, espera, cancelamento, foco, quantidade ou gravação de estoque.

Prévia `/marketplaces/validacao-confirmacao-estoque` restrita a desenvolvimento, sem banco: vermelho usa texto branco nos temas claro/noturno; amarelo usa preto. Cancelar e uma confirmação simulada conferidos, com retorno do foco. Nenhum saldo produtivo alterado. Evidência em `output/marketplaces/confirmacao-estoque-contraste-55.jpg`.

Suíte completa: 1.375 testes aprovados, zero falhas, incluindo regressão de contraste, cores explícitas, variante destrutiva e estado Aguarde/bloqueio. Lint e verificadores PADRÃO AVANTA/Ava aprovados.
