# AvantaVendas — marca e loading — 3.2.0.159-av196

## Escopo

Marca fornecida pelo titular em 25/10/2026, sem slogan; recorte técnico, sem IA,
mudança de fonte ou reconstrução dos traços. Mesma máscara e proporção nos temas.
O acesso institucional permanece claro; a negativa é usada no cabeçalho escuro.

O loading usa `LoadingPontos.tsx` no HTML inicial e em um template inerte fora
do `#app`. O renderizador existente reutiliza esse HTML. A animação permanece
somente no CSS global já usado pelo Web, inclusive movimento reduzido. Fallback
para carregador anterior continua disponível caso um contexto legado não forneça
o template. Textos, progresso, autenticação, dados e navegação não mudam.

## Publicação nativa e limites da confirmação

- iOS local: AvantaVendas 1.0.1, build 6; Android local: 1.0.4, código 5.
- Ambos os projetos nativos gerados configuram o servidor HTTPS
  `https://vendas.avantalab.com.br`, sem cleartext. Configurações nativas intactas.
- Marca e animação pertencem ao conteúdo remoto. Esta entrega não exige plugin,
  permissão ou nova funcionalidade nativa e não gera, assina ou envia binários.
- Nenhum envio à App Store/Google Play foi realizado nesta tarefa. Não declarar
  as versões de loja acima como confirmadas no aparelho; são valores dos fontes.
- PWA e conteúdo remoto somente serão considerados publicados após READY,
  promoção e conferência do domínio, versão e hashes.
- Teste de navegador não equivale a teste físico autenticado em iPhone/Android.

## Status

Implementação em validação; publicação ainda não confirmada.
