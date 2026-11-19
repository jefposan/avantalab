# Clientes Excel — 3.2.0.496

Reenvio 3.2.0.497: candidata 496 bloqueada, sem promoção, por teste determinístico de seletor genérico `span` no breakpoint de 380 px. Corrigido para ação oficial compacta com exclusão de `.badge`. Suite completa da tentativa: 3.111 testes, 3.104 aprovados, 6 ignorados e 1 falho, 161.941 ms, Enhanced fixa 8 CPU/16 GB, 4 processos. Mantém concorrência e todos os testes; falha não é instabilidade do executor.

PADRÃO AVANTA 1.24.0. Entrega conjunta autorizada com Navegar compacto/imediato.

## Contrato e segurança

- Modelo vazio, 23 campos de identificação, contato, endereço e fiscal, com instruções e escolhas. Dados textuais preservam zeros. Download direto confirmado no navegador local; planilha gerada importada/renderizada com artifact-tool para inspeção visual.
- Somente criação de clientes. CPF/CNPJ existente no perfil é ignorado, nunca sobrescrito; repetido no arquivo bloqueia lote. Inativos preservados mesmo com dados fiscais incompletos. Relacionamento com vendedor/tabela de preço feito depois no cadastro existente.
- Prévia não grava. Confirmação vincula hash dos dados normalizados, usuário, empresa e documentos existentes; revalida concorrência sob lock transacional compartilhado com o cadastro individual. Código automático, inserção em lote e eventos de auditoria na mesma transação.
- Requer sessão válida, vínculo/módulo ativos, consultar e cadastrar clientes; empresa do contexto autoritativo igual ao destino. Bridge restrita ao iframe/origem atual e MessageChannel correlacionado; troca de perfil bloqueia resposta antiga. Credenciais nunca entram na planilha/iframe.
- Arquivo .xlsx até 5 MB, 1.000 clientes, rejeição de fórmulas/erros, estrutura desconhecida, dados inválidos e modelo de outro perfil. Erro de confirmação bloqueia nova confirmação até revalidar; documentos já gravados são reconhecidos como existentes.
- Nenhuma alteração de RLS, permissão concedida, migração SQL, importação real ou escrita em cadastro de produção para teste. Pedidos, saldos, históricos, AvantaVendas e catálogo preservados.

## Verificações

Testes dedicados cobrem modelo, leitura, escolhas, zeros, fórmula/cabeçalho, duplicidade, permissões, hash, SQL em PostgreSQL WASM, isolamento, código sequencial e rollback com falha de auditoria. Suítes relacionadas de módulos, usuários e cobrança, TypeScript e validadores oficiais executados antes do envio. Gate completo obrigatório na Vercel; nenhuma dispensa de testes/paralelismo/máquina.

Limite: sem arquivo VHSYS fornecido; o usuário deve copiar os dados para o modelo AvantaLab. Não foi executada importação de dados pessoais reais para validar a funcionalidade.
