# Auditoria de simplificação — Vendas e Serviços

Versão local: **3.2.0.330**. PADRÃO AVANTA **1.23.1**. Revisão em 05/11/2026.

## Conclusão

A interface expõe estados internos de preparação como tarefas do usuário, repete dados e transforma ausência de campos em avisos genéricos. O formulário comercial e a emissão devem compartilhar cliente, produtos e valores; configuração fiscal, certificado e processamento técnico precisam ficar em segundo plano. Simplificar a apresentação não permite ocultar erros, escolher tributos por suposição ou remover controles de segurança.

A auditoria examinou código e fluxo de notas, conferência, catálogo, cadastro fiscal dos produtos, relação com pedidos e configuração da empresa. Não é certificação tributária, teste de autorização na SEFAZ nem auditoria dos demais módulos do AvantaLab. Nenhuma nota foi enviada e nenhum dado online foi alterado nesta revisão.

## Critério de decisão

- **Visível normalmente:** cliente, identificação/situação da nota, produtos, quantidades, preços, descontos, despesas existentes, total e próxima ação.
- **Visível quando impedir continuar:** campo/produto afetado, motivo compreensível e acesso ao local de correção. Homologação, rejeições, resultado incerto e consequências de cancelamento permanecem claros.
- **Sob demanda:** NCM/CEST, origem, CFOP aplicado, CST/CSOSN e demais códigos, chave/protocolo, documentos, histórico e diagnóstico técnico.
- **Retirar da consulta comum:** textos sobre arquitetura, percentuais de preenchimento sem significado operacional, listas de “pronto” repetidas e aviso de pendência criado apenas por campo opcional vazio.

## Achados e encaminhamento

| Achado | Evidência | Decisão e estado |
|---|---|---|
| A01 — Célula tributária ilegível | `FiscalDraftDetailsDialog` reunia origem, unidade, dois CFOPs, ICMS, IBS/CBS e situação, cortados por `white-space: nowrap`/ellipsis. | **Aplicado local:** retirar Classificação da tabela e oferecer ficha por item com rótulos e quebra de linha. |
| A02 — Dados repetidos e rolagem | Empresa, documento, origem e total reapareciam em vários grupos; histórico sempre aberto. | **Aplicado local:** resumo único, itens e despesas relevantes; ficha e histórico recolhidos pelo componente oficial. |
| A03 — Alertas genéricos na consulta | IBS/CBS pendente aparecia mesmo sem avaliar regime/período, junto a outros códigos. | **Aplicado local:** campo ausente não gera aviso na ficha. Bloqueios reais ficam fora do conteúdo recolhido. |
| A04 — Segundo CFOP sem uso | `validateFiscalDraft` exigia interno e interestadual para a mesma NF-e. | **Aplicado local:** quando o contexto da operação está definido, validar o CFOP daquele destino. Sem contexto, manter validação conservadora. |
| A05 — Exceção manual sobrescrita na conferência | Matriz do cliente substituía sempre o CFOP do item. | **Aplicado local:** respeitar exceção guardada no produto. Servidor continua exigindo regra revisada e CFOP compatível com a UF. |
| A06 — IBS/CBS indevido em 2026 | Check de IBS/CBS incondicional em `domain.mjs`. | **Aplicado local:** exceção restrita à NF-e de Simples Nacional/MEI-SIMEI em 2026. Outros regimes, documentos, datas desconhecidas e 2027 mantêm exigência. Revisão fiscal e validação XML no servidor permanecem. |
| A07 — Padrão fiscal não abrangia todos os existentes | Inferência de .329 preservava exceções/importações anteriores. | **Migração preparada:** pedido expresso de adotar a empresa em todos os produtos de todos os catálogos da Tridium, inclusive inativos. Guardar escolha anterior e manter todos os códigos específicos. Outros perfis e serviços não mudam. |
| A08 — Etapas internas viraram ações de usuário | Menu expõe Abrir emissão fiscal, Validar dados fiscais, Revisar para emissão, Confirmar emissão e Continuar emissão. | **Prioridade 0, pendente:** um comando contextual Preparar/Emitir/Consultar; coordenar etapas no servidor, com progresso e confirmação antes da transmissão. Reenvio incerto exige consulta, não nova tentativa cega. Não juntar callbacks locais sem confirmação transacional. |
| A09 — Pendência de mercadoria ainda pode ser genérica | Conferência agrupa classificação de vários produtos numa única mensagem. | **Prioridade 0, pendente:** resultado estruturado por produto/campo e atalho ao cadastro correto; preservar formulário da nota durante correção. Não marcar como pronto por esconder aviso. |
| A10 — Catálogo confunde cadastro com emissão | “Perfis a revisar”, percentuais e estado IBS/CBS não equivalem a aptidão para emitir uma operação específica. | **Prioridade 1, pendente:** no catálogo, apresentar identificação do item; na nota, apresentar resultado da validação daquela operação. |
| A11 — Preferências fiscais misturadas com instalação | Ajustes oferecem conceitos de provedor, rota, laboratório e homologação ao operador comum. | **Prioridade 1, pendente:** configuração inicial guiada do perfil; diagnóstico restrito à área administrativa e às permissões existentes. |
| A12 — Ações previstas ocupam espaço | Algumas ações comerciais exibem recursos futuros sem executar uma função. | **Prioridade 1, pendente:** ocultar recursos previstos no uso diário; manter somente ações disponíveis para situação/permissão atual. |
| A13 — Consulta não deve alterar dados | Abertura de detalhes é leitura; revalidar, faturar, baixar estoque, cancelar e emitir são ações distintas. | **Preservado e testado:** abertura não grava, reserva número, altera estoque ou transmite. Cancelamento fiscal e comercial continuam distintos. |
| A14 — Simplificação não aumenta suporte tributário | Gerador XML atual tem limites de códigos/regimes, incluindo o recorte de CSOSN suportado. | **Permanece bloqueio real:** validar capacidade do emissor e homologar cenários antes de liberar códigos não suportados. Layout mais limpo não comprova prontidão para produção. |

## Fluxo proposto para a próxima etapa

1. **Nova nota** ou **Emitir nota do pedido**: preencher/reaproveitar cliente, produtos e valores.
2. **Conferir**: exibir total, dados principais e somente problemas reais, com acesso direto à correção. Padrões da empresa e da operação aplicados automaticamente.
3. **Emitir**: confirmação única consciente do ambiente; numeração, certificado, assinatura e envio tratados pelo servidor. Mostrar progresso sem exigir conhecimento de XML/XSD.
4. **Resultado**: situação confirmada, DANFE/XML disponíveis, consulta e ações compatíveis. Em resultado incerto, consultar antes de qualquer reenvio.

Pedido, faturamento, recebimento, estoque e emissão fiscal continuam independentes conforme o fluxo aprovado. Abrir ou emitir uma nota avulsa não gera receita nem baixa estoque automaticamente.

## Migração da Tridium

`20261105190000_tridium_adotar_heranca_fiscal_produtos.sql` depende das colunas da .329. Para cada catálogo do perfil `ec9604fd-38f2-429b-9c00-c4bc6c642b0e`, guarda a opção anterior em `custos_importacoes_catalogo_backups` e marca produtos como `usar_fiscal_empresa=true`. Não remove códigos guardados, NCM, CEST, custos, preços ou dados de notas. Não muda serviços ou outras empresas. Marcador por catálogo evita repetir a conversão e desfazer personalizações posteriores. **Migrações 20261105180000 e 20261105190000 aplicadas no Supabase em 05/11/2026, após autorização de publicação. Conferidos 343 produtos atuais usando herança, dois backups e um cadastro excluído preservado. A impressão digital dos códigos fiscais, NCM, CEST e preços permaneceu idêntica antes/depois.**

## Referências consultadas

- [Manual do Emissor Sebrae — referência de organização](https://sebrae.com.br/content/dam/portal-sebrae/na/midias/documentos/pdfs/ebook_manual-usuario-emissor-NFe.pdf). O buscador disponibilizou trechos sobre cadastro e emissão; o PDF integral excedeu o limite de leitura da ferramenta. Não foi feita inspeção autenticada da interface atual do Sebrae nem inferida equivalência funcional.
- [Portal oficial do Emissor Sebrae](https://meuatendimento.sebrae.com.br/sites/PortalSebrae/produtoseservicos/emissornfe): separa ambiente de homologação e produção. Usado como referência, sem copiar identidade visual ou prometer a mesma cobertura fiscal.
- [Receita Federal — cronograma dos documentos fiscais eletrônicos](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/reforma-tributaria-do-consumo/orientacoes-da-reforma-tributaria/cronograma): início da obrigatoriedade dos documentos do Simples em 01/01/2027. Exceção de interface limitada a NF-e/2026; não é dispensa geral para outros contextos.

## Validações

- Segurança: **536 testes aprovados**, sem falhas.
- Cinco testes específicos aprovados: CFOP por operação, aplicabilidade restrita de IBS/CBS, apresentação dos campos, abertura de detalhes sem efeitos e migração integral/isolada da Tridium.
- Migração executada somente em PostgreSQL PGlite descartável: ativos e inativos convertidos, serviços e outra empresa preservados, backup da escolha anterior e reaplicação sem desfazer personalização posterior.
- `next typegen` e `tsc --noEmit --incremental false` aprovados no pacote isolado.
- ESLint do escopo sem erros; 81 avisos existentes nos arquivos abrangidos.
- PADRÃO AVANTA e Ava aprovados para 3.2.0.330.
- Prévia do JSX e CSS reais conferida em desktop e viewport 390 × 844. Resumo compacto, coluna técnica retirada, dados preservados, ações no rodapé alcançáveis e sem transbordamento horizontal. A prévia usa dados fictícios; alternância dos blocos é coberta pelo contrato do componente oficial e pelos handlers de estado.
- Próxima entrega: concentrar comandos internos da emissão em uma ação contextual e encaminhar pendências ao campo/produto correto (A08/A09).

Nenhuma validação local equivale a emissão autorizada. Publicação autorizada pelo responsável; o recibo da entrega registra o estado efetivo da Vercel. As migrações remotas foram aplicadas e verificadas.
