# Vendas e Serviços

Este diretório contém o contrato oficial do módulo Web `vendas`, distinto do
`vendas_mobile` (AvantaVendas).

O manifesto define rota, dependências, integrações e a matriz granular de
permissões. A página `/vendas` está incorporada à Gestão e aparece no menu após
a instalação oficial no perfil empresarial.

## Estado do piloto

Na versão 1.13.0.85, a disponibilidade é restrita no servidor à empresa
Tridium (`ec9604fd-38f2-429b-9c00-c4bc6c642b0e`). A trava usa a empresa e é
repetida no catálogo, na instalação, na assinatura e no runtime do módulo; não
há liberação por e-mail ou usuário. O contrato definitivo continua sendo:
incluído no Business Pro, avulso no Business e inexistente no perfil pessoal.

Todo registro comercial e fiscal possui `empresa_id`/`company_id`. O emissor é
resolvido exclusivamente em `cadastros_perfil`; certificado, eventos e
referências de XML/DANFE ficam no schema fiscal privado da mesma empresa. IDs de
usuário existem somente para autorização e trilha de auditoria.

O piloto mantém emissão, numeração, assinatura, transmissão e cancelamento
desligados. Somente a custódia/validação protegida do certificado A1 e o
`NfeStatusServico` da SEFAZ-SP em homologação podem ser ativados pelas travas de
ambiente documentadas no runtime.

Com o A1 ativo, **Verificar conexão** repete exclusivamente o
`NfeStatusServico` em homologação. O resultado público é persistido na evidência
protegida da empresa e pode ser relido sem reabrir o arquivo nem informar a
senha; a ação não recebe XML e não participa da emissão.

As seções seguintes preservam o histórico das validações realizadas antes da
incorporação ao sistema principal.

O cadastro de produtos e serviços continuará pertencendo a Custos e
Precificação. Vendas apenas consumirá o catálogo autorizado desse módulo.

## Laboratório local do catálogo

Em desenvolvimento, `/vendas-lab` permite validar essa fronteira sem registrar
o módulo no menu. A página exige a sessão da Gestão, deixa o usuário escolher o
perfil empresarial e uma tabela de preços e então envia ao protótipo separado o
resultado de `GET /api/modulos/vendas/catalogo`.

A resposta contém apenas os campos comerciais e fiscais necessários aos itens
ativos e publicados. Ela não contém preço de custo, não permite escrita e marca
o estoque como não integrado. Enquanto a ponte estiver ativa, o protótipo não
permite editar o catálogo nem movimentar o estoque demonstrativo. A rota retorna
indisponível em produção.

O laboratório também possui uma ponte autenticada candidata para pedidos. Ao
confirmar, separar ou faturar, a Gestão preserva o token fora do iframe e envia
o conteúdo comercial à rota local protegida. O backend relê ou registra o
cliente por CNPJ, relê os itens pelos UUIDs oficiais e aplica idempotência e
controle de versão. Faturar gera parcelas e um rascunho fiscal; não movimenta
estoque, não reserva número fiscal e não transmite documento.

As decisões de acesso são resolvidas nesta ordem:

1. padrão do tipo de usuário;
2. exceção configurada para o tipo de usuário na empresa;
3. exceção individual do usuário.

A matriz oficial possui 45 permissões. Gestor Master e Administrador recebem as
45 por padrão; Operador completo recebe 35 permissões operacionais; Operador
simples recebe 10 permissões básicas e pode criar ou salvar rascunhos, mas não
confirmar, separar, faturar ou movimentar estoque sem liberação explícita. A
permissão individual prevalece sobre a exceção do perfil, que prevalece sobre o
padrão.

Gestor Master e Administrador não podem perder as permissões críticas de
configuração fiscal, homologação, gestão de acessos e auditoria. Toda alteração
persistente deverá ser realizada no servidor e registrada em histórico
imutável.

Em **Ajustes > Empresa e notas > Regras fiscais**, o laboratório consulta a
versão publicada por uma rota protegida da Gestão. O iframe recebe somente a
matriz, a versão e os estados necessários à interface; sessão, token e empresa
ativa permanecem na Gestão. A publicação exige `fiscal.configure`, versão
esperada, revisão integral e chave idempotente. Sem runtime ou tabela local, a
tela informa a indisponibilidade e não simula publicação.

O laboratório integrado já consulta essa matriz por
`GET /api/modulos/permissoes`. A Gestão preserva o token e o identificador do
perfil fora do iframe e entrega somente perfis, usuários, decisões e auditoria
necessários à tela. Alterações usam um contrato de diferenças e a rota
protegida, mas a ponte mantém a escrita remota desligada por padrão por meio de
`NEXT_PUBLIC_VENDAS_LAB_PERMISSION_WRITES`. Sem a persistência preparada, a
tela fica em consulta e não simula uma gravação bem-sucedida.

O SQL correspondente está em
`supabase/drafts/20260903170000_modulos_permissoes_granulares_NOT_APPLIED.sql`.
Ele não é uma migração ativa e não deve ser aplicado a ambiente remoto sem
revisão e autorização de implantação.

O mesmo contrato foi exercitado no PostgreSQL/Supabase local descartável com
decisões `allow`, `deny` e `inherit`, bloqueio de permissão administrativa,
auditoria append-only, isolamento e rollback. Esse ensaio não cria vínculo com
projeto remoto.

## Persistência comercial candidata

O protótipo separado mantém o rascunho
`database/drafts/0005_commercial_core_NOT_APPLIED.sql`. Ele modela 20 tabelas
para clientes, documentos comerciais, ordens de serviço, estoque, inventário,
contas a receber e eventos. O navegador não possui privilégios diretos; futuras
gravações deverão atravessar serviços server-side que reconfirmem empresa,
módulo e cada permissão efetiva.

O rascunho foi aplicado e revertido apenas no Supabase local descartável. A
validação comprovou isolamento entre empresas, numeração interna idempotente,
razões imutáveis, precisão até `9.999.999,99` e rollback. Ele não é uma migração
da Gestão e não autoriza implantação remota.

## Serviço candidato de clientes

O protótipo separado possui agora um serviço e um repositório PostgreSQL em
`lib/server/commercial-customer-service.mjs` e
`lib/server/commercial-customer-repository.mjs`. Essa é a primeira gravação
comercial executável, porém ela só é instanciada pelo ensaio fechado do banco
local e ainda não está conectada à tela nem a uma API da Gestão.

O serviço usa somente CNPJ nesta etapa, reconfirma empresa, módulo e permissão,
normaliza o cadastro e sinaliza `revisar_cadastro` quando os dados fiscais estão
incompletos. O repositório faz inclusão, edição com versão esperada, inativação,
busca e listagem na mesma empresa, além de registrar os eventos imutáveis. Não
há exclusão, gravação pelo navegador, migração ativa ou conexão remota.

## Serviço candidato de orçamentos e pedidos

O protótipo também possui
`lib/server/commercial-operation-service.mjs` e
`lib/server/commercial-operation-repository.mjs`. Eles salvam orçamentos nos
canais Vendas e Serviços e pedidos no canal Vendas, sempre depois de conferir a
empresa e a permissão específica do canal.

Cliente, tabela de preços e itens são resolvidos no servidor e gravados como
retratos históricos. Valores são calculados em centavos e quantidades em
milésimos; o documento recebe numeração por tipo e ano, hash de conteúdo,
idempotência, versão concorrente e eventos imutáveis. A conversão de orçamento
de venda em pedido preserva exatamente esses retratos e só pode ocorrer uma vez.

O orçamento de serviços já preserva o contrato comercial e pode indicar NFS-e,
mas sua transformação em ordem de serviço será tratada no fluxo operacional
específico. Essa camada agora possui uma API candidata ligada somente ao
laboratório local. Ela continua fechada sem runtime, tabelas e permissões
efetivas e não integra a interface publicada da Gestão.

## Ordem de Serviço candidata

O serviço `lib/server/commercial-service-order.mjs` converte uma única vez o
orçamento de Serviços em OS e preserva o retrato comercial. Agenda, responsável,
checklist e materiais são gravados na mesma transação. O ciclo local cobre
início, conclusão, duração, relato, custo e aceite.

## Estoque de materiais da Ordem de Serviço

O serviço `lib/server/commercial-service-stock.mjs` liga cada material de
catálogo da OS à sua própria reserva. Ele reserva antes da execução, baixa
somente o consumo informado depois da conclusão, libera automaticamente a sobra
e permite estornar a baixa com recomposição do saldo físico.

Reserva, baixa, liberação e devolução usam transação serializável, chave
idempotente, isolamento por empresa e movimentos/eventos imutáveis. O serviço
também exige as permissões efetivas de saída ou ajuste antes de consultar o
repositório. A prova permanece limitada ao PostgreSQL descartável: ainda não há
API, tela, migração ativa nem estoque oficial da Gestão conectado a esse fluxo.

## Confirmação e separação do pedido de venda

O serviço `lib/server/commercial-sales-order-lifecycle.mjs` confirma um pedido
salvo depois de conferir cliente ativo, forma de pagamento, versão, permissões e
saldo. Os produtos que controlam estoque são reservados no local escolhido na
mesma transação; itens sem controle não criam saldo fictício.

O início da separação confere se existe uma reserva íntegra para cada item e não
reduz o saldo físico. O cancelamento permitido antes do faturamento libera as
reservas e recompõe a disponibilidade. Todas as ações são idempotentes,
isoladas por empresa e auditadas em razões imutáveis. A ponte local pode acionar
confirmação e separação, mas permanece sem migração ativa ou publicação.

## Faturamento candidato do pedido

O serviço `lib/server/commercial-sales-order-billing.mjs` fatura somente um
pedido em separação e exige a permissão específica `sales.invoice`, além das
permissões de saída de estoque e preparação fiscal. Na mesma transação ele
consome as reservas, cria as parcelas exatas em contas a receber, congela o
rascunho fiscal e registra o evento do pedido.

O rascunho comercial aceita NF-e, NFC-e ou NFS-e e contém somente o retrato
necessário do emitente resolvido no servidor, destinatário, itens, totais e
pagamento. Ele é imutável e não reserva número, não assina, não transmite e não
indica autorização governamental. Uma pendência cadastral permanece explícita
para revisão. A ponte candidata liga esse serviço ao laboratório local, mas
continua indisponível sem as tabelas e permissões explícitas e não foi publicada.

## Ponte do rascunho comercial para a NF-e privada

O serviço `lib/server/commercial-fiscal-emission-bridge.mjs` consome somente um
rascunho de NF-e marcado como pronto. Antes de abrir o ciclo fiscal, ele confere
empresa e permissão efetiva, pedido faturado, vínculo de origem, emissor interno
e a impressão SHA-256 de todos os retratos congelados.

A emissão é criada no schema `fiscal_private`, em homologação e no estado
inicial `draft`, usando o identificador do rascunho para tornar a repetição
determinística. O retorno público não apresenta o estabelecimento técnico. A
operação não reserva número, não gera XML, não acessa certificado, não assina e
não transmite. O piloto recusa NFC-e e NFS-e de forma explícita, mantendo seus
rascunhos comerciais intactos para conectores próprios futuros.

O ensaio integrado aplicou e reverteu os dois contratos em um banco local
descartável, confirmou um único registro, evento e comando idempotente e negou
acesso direto ao schema privado para o papel autenticado. Nenhum projeto remoto,
API, tela ou migração ativa foi usado.

## Preparação interna da NF-e

O serviço `lib/server/commercial-nfe-preparation.mjs` relê a emissão privada e o
rascunho comercial, reconfirma todos os vínculos e a impressão SHA-256 e exige
uma regra tributária aprovada por resolvedor exclusivamente server-side. O
resolvedor fornece natureza da operação, presença, revisão responsável e os
códigos aplicáveis a cada item; o serviço não presume CSOSN/CST, origem, PIS ou
COFINS quando esses dados estiverem ausentes.

Com a regra válida, a preparação consulta a sequência apenas para identificar o
próximo candidato, monta o pré-XML de homologação e executa o XSD versionado. O
ciclo avança de `draft` para `prepared`, gravando somente metadados, digest e a
referência da regra no evento privado. O pré-XML não é persistido. A sequência
continua intacta, e série, número, chave, assinatura e lote permanecem nulos.

O laboratório integrado comprovou repetição idempotente, XSD válido e rollback
dos contratos. Certificado, reserva, assinatura, transmissão, SEFAZ, API, tela e
migração ativa continuam fora desta etapa.

## Reserva transacional da numeração da NF-e

O serviço `lib/server/commercial-nfe-number-reservation.mjs` exige a permissão
efetiva `fiscal.issue` e confirma somente uma emissão no estado `prepared`. Em
uma única transação serializável, o repositório fiscal bloqueia a sequência
ativa, ignora números já reservados ou em inutilização, grava a reserva, avança
o próximo número, vincula série e número à emissão e registra evento e operação.

A chave idempotente reaproveita a mesma reserva sem consumir outro número.
Versão desatualizada, estado incorreto, série ausente ou conflito encerram o
trabalho sem gravação parcial. O laboratório confirmou o estado
`number_reserved`, mantendo chave de acesso, assinatura e lote nulos. Não há
certificado, XML assinado, transmissão, SEFAZ, API, tela ou migração ativa.

## Preparação protegida da assinatura da NF-e

O serviço `lib/server/commercial-nfe-signing-preparation.mjs` relê a emissão
`number_reserved`, seu rascunho, a reserva e a evidência da preparação. Ele
reconfirma a permissão `fiscal.issue`, a versão concorrente, todos os vínculos,
o hash comercial, a versão da regra e o digest dos parâmetros tributários.

O XML definitivo usa exatamente a série, número, data, cNF e versão do gerador
congelados. Depois do XSD, uma credencial efêmera prova em memória referência,
digest, RSA e XSD assinado. XML, certificado e chave não são retornados nem
gravados. A emissão permanece `number_reserved`; não há certificado A1 real,
assinatura persistente, artefato, transmissão, SEFAZ, API, tela ou migração
ativa.
