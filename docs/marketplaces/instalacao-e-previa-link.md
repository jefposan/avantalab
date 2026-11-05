# AvantaPreços — instalação e prévia do link

Revisão: 3.2.0.21. Instalação e arte aprovadas, publicação autorizada. Não confundir envio/em build com publicação concluída.

O botão Instalar AvantaPreços fica imediatamente abaixo do card de login, fora do formulário. O controlador compartilha a infraestrutura oficial de botões e captura disponibilidade desde o início da página, sem exigir sessão. Android compatível abre o prompt somente após clique. Quando o navegador não disponibiliza prompt, mostra instruções; no iPhone/iPad orienta Safari → Compartilhar → Adicionar à Tela de Início → Abrir como App da Web, quando disponível → Adicionar. No Safari com menu da página, Compartilhar pode estar dentro desse menu. Em navegador interno de outro app, orientar abrir no Safari/Chrome. Não há instalação silenciosa nem pedido de notificações.

Modo standalone e evento appinstalled ocultam a ação. Aceitar prompt não comprova instalação; cancelamento não anuncia sucesso. Erro/timeout permite instruções, sem bloquear acesso nem alterar credenciais. Testes cobrem detecção iPad com identidade desktop, bloqueio de repetição, limpeza de listeners e resposta após desmontagem. Prévia visual local: `output/marketplaces/avantaprecos-instalar-login-32021.jpg`.

Referências consultadas: [Apple — Transforme um site em app no Safari do iPhone](https://support.apple.com/pt-br/guide/iphone/iphea86e5236/ios) e [MDN — beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event). A disponibilidade do prompt depende do navegador; não afirmar suporte universal.

## Arte aprovada

`output/imagegen/avantaprecos-whatsapp-proposta-01.png` é o banner aprovado para a imagem que o WhatsApp mostra ao compartilhar `https://avantalab.com.br/marketplaces/consulta`, não um ícone de instalação. Gerado com o recurso integrado de imagem; prompt exato em `output/imagegen/avantaprecos-whatsapp-proposta-01-prompt.txt`. Textos: AvantaPreços / Consulta rápida de produtos e preços; azul institucional/ciano/branco, celular lendo código de barras. Exportado em JPEG leve (274 KB), sem redesenhar ou cortar, para `public/images/avantaprecos-link-v1.jpg`, mesmas dimensões 1731×909, com Open Graph/Twitter específicos da rota. PNG original aprovado preservado fora dos recursos públicos.

Os ícones do manifesto e apple-touch-icon atuais foram mantidos. A imagem anterior pode permanecer temporariamente no cache do WhatsApp; não prometer atualização imediata das mensagens já enviadas. A instalação depende da confirmação no aparelho, não há envio de mensagem, concessão de permissão ou gravação em dados de perfil nesta entrega.
