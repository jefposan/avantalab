# Correção fiscal 3.2.0.525

Base: main 48363f68709597edb5b5212b77d676812f666603, versão 3.2.0.524,
publicada no deployment dpl_2tuh7ydf3E7tmahBPdNh1bNDqofB e confirmada
READY no alias avantalab.com.br (HTTP 200).

## Diagnóstico

A ponte de Abrir emissão fiscal não enviava corpo JSON, embora o handler
exigisse JSON e idempotencyKey. Validação apresentava o mesmo descompasso;
reserva e continuação omitiam a chave, e cancelamento omitia também a confirmação.
O cartão tinha descrição fixa de homologação. Parsers da ponte recusavam produção;
três respostas HTTP também fixavam homologação independentemente da emissão.

O perfil genérico da Tridium ainda registra homologação desde 11/09/2026.
A execução efetiva é selecionada pelas guardas do servidor, não por esse texto.
Metadados das variáveis protegidas de ativação de produção continuam datados
de 10/11/2026. Seus valores sensíveis não foram expostos nem alterados.
Essa consulta não substitui uma confirmação autenticada de fiscalExecution.

## Correção e verificação

JSON e chaves da solicitação enviados para os handlers existentes; permissões,
validação, contexto e controles de estado preservados. Ambiente propagado a partir
da emissão e aceito pela ponte somente como producao ou homologacao.
Mensagens de abertura deixam de presumir homologação.

43 testes direcionados aprovados, com transporte e serviços simulados, incluindo
contrato da ponte com os handlers reais, checkout de produção, isolamento de
ambiente, retorno incerto, recuperação sem retransmissão e restauração da cópia
independente. Next typegen + TypeScript, PADRÃO AVANTA 1.24.0 e Ava aprovados.
O build completo obrigatório executa novamente na Vercel.

Nenhum número reservado, documento fiscal transmitido, dado comercial alterado,
configuração remota modificada ou migração aplicada durante esta correção.
Inspeção visual autenticada interrompida por indisponibilidade da janela do navegador;
a disponibilidade real da emissão não foi inferida apenas dos testes simulados.
