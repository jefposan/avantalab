# Testes de validação (equivalência funcional)

Não há testes automatizados no repositório; os casos abaixo validam manualmente (ou
por automação futura) que a reconstrução equivale ao original. Formato:
pré-condições → passos → resultado esperado (dados envolvidos).

## 1. Autenticação e perfis

1.1 Cadastro completo — sem conta → cadastrar com nome/e-mail/telefone/senha, verificar SMS, aceitar termos, criar perfil "empresa" → login automático, perfil criado com despesas padrão, `cadastros_perfil.obrigatorio_em = +7 dias`, código `AVA-` gerado (`empresas`, `usuarios_empresa`, `configuracoes`, `despesas_cadastradas`, `codigos_vinculo_empresa`).
1.2 Duplo clique no cadastro → apenas UM perfil criado (RPC idempotente, `criado:false` na segunda).
1.3 Login por login interno → `buscar_email_por_login_rpc` resolve e autentica; com credencial de `funcionario_ponto` → NÃO resolve (erro), e sessão dele no `/mobile` redireciona para `/ponto`.
1.4 Recuperação de senha: informar login → SMS chega no telefone vinculado → código correto troca a senha; código errado → erro sem troca.
1.5 Múltiplos perfis: usuário com 2 empresas → tela de seleção; troca de perfil recarrega configurações/cor/logo.
1.6 Sem vínculo ativo (bloqueado) → login não entra no sistema.

## 2. Lançamentos financeiros

2.1 Despesa avulsa hoje → aparece no mês corrente, status null, entra nos totais.
2.2 Despesa futura → badge Previsto (`status='prevista'`, `tipo_obs='previsto'`); no dia: notificação "Despesa para confirmar hoje" (job), confirmar remove o previsto; cancelar → `status='cancelada'` fora dos totais; mudar a data mantém prevista.
2.3 Parcelamento em 3× → 3 lançamentos `tipo_obs='parcela'` nos meses corretos; sem pedido de confirmação; notificação de pagamento no dia.
2.4 Despesa fixa dia 10, projetar 2 meses → recorrência criada + lançamentos `fixa` no mês atual(+opção) e futuros; reabrir o mês NÃO duplica (índice único); editar linha do mês não altera recorrência; excluir recorrência trata lançamentos vinculados.
2.5 Receita: entrada diária soma no dia e no total mensal (`faturamentos_entradas` + `faturamentos`); entrada futura vira prevista.
2.6 Caixinha: definir saldo inicial (2ª tentativa falha — único), aporte/resgate refletem no card.
2.7 Nota por foto: foto legível → campos sugeridos; anexo salvo no bucket; excluir lançamento remove o arquivo (trigger).
2.8 Duplicados: com `duplicados_ativo`, lançar despesa igual → alerta.
2.9 Web × mobile: lançar no mobile aparece no web (realtime/recarga) e vice-versa.

## 3. Cobrança (com `NEXT_PUBLIC_COBRANCA_ATIVA=true` em preview)

3.1 Perfil empresa novo modo trial → 7 dias liberado; expirar `trial_fim` → paywall bloqueia tudo.
3.2 Modo assinar → paywall imediato; assinar → link Asaas; webhook PAYMENT_RECEIVED → status ativa, app libera.
3.3 Cupom vitalício → cortesia sem prazo; cupom período 3 meses → `valido_ate` correto; cupom esgotado/vencido → erro.
3.4 Pessoal grátis: tocar Ava/exportação/análises → modal Premium (403 premium no chat); Pessoal premium → liberado.
3.5 Inadimplência: fatura OVERDUE na conciliação → status inadimplente com 3 dias de carência; depois bloqueia.
3.6 Flag desligada → nada disso aparece; tudo liberado.

## 4. Vendas Mobile

4.1 Solicitar acesso com código válido → pendente; gestor aprova → app carrega; rejeitar → mensagem e possibilidade de nova solicitação.
4.2 Aprovação em NOVA empresa → vínculo comercial antigo desativado (`desvinculado_em`) e acesso antigo bloqueado; novidades/divulgação antigas visíveis só até a data (histórico congelado).
4.3 Catálogo mestre: gestor cadastra produto → login do vendedor sincroniza (1×, dedup); vendedor exclui a cópia → não retorna (recebimento `removido`).
4.4 Pedido com desconto + item bonificado → totais corretos; consignado → não vira receita; conversão → pedido `convertida` + venda conta.
4.5 Pagamento de cliente → saldo anterior/final corretos; edição/exclusão recalculam a receita do dia no Gestão.
4.6 Integração de receitas: base `recebidos` → entrada "Vendas Mobile" do dia = soma dos pagamentos; trocar para `vendidos` → histórico recalculado; editar manualmente a entrada no Gestão → erro "atualizada automaticamente"; zerar o dia → entrada removida e `faturamentos` ajustado.
4.7 Destino financeiro: sem perfil financeiro → lançamento falha com mensagem; definir perfil (só onde é gestor) → lançamentos vão para a empresa certa.
4.8 Suspensão: desinstalar módulo → vendedor lê tudo, mas criar/editar/excluir/upload falham (RLS); reinstalar → volta ao normal.
4.9 Reset: digitar "RESETAR" → backup em `vendas_mobile_backups_reset` com todas as coleções; dados zerados; vínculo ativo preservado com flags religadas.
4.10 Estoque: ativar controle, entrada 10, venda 2 → saldo 8 com movimentos rastreados; movimentar sem controle ativo → erro.
4.11 Divulgação: upload de vídeo → material aparece imediatamente com capa `pendente`; capa gerada em segundo plano (worker); falha 3× → status erro com mensagem.

## 5. Controle de Ponto

5.1 Criar funcionário (CPF válido, único global) → login em `/ponto` por CPF+senha; CPF inválido/duplicado → erro.
5.2 Máquina de estados: entrada → saída almoço → retorno → saída; atalho Encerrar após entrada; quinta batida no dia → indisponível.
5.3 GPS negado → registro bloqueado; fora do raio → comportamento de bloqueio/aviso conforme `raio_m` (validar contra original).
5.4 Imutabilidade: UPDATE/DELETE em `ponto_registros` via API com token do funcionário → negado por RLS.
5.5 Funcionário NÃO acessa dados financeiros (queries diretas negadas) nem aparece na lista de usuários do sistema.
5.6 Lembretes: horário 08:00, sem batida → push ~07:50 e ~08:00 (uma vez cada); com batida → sem push; almoço nunca notifica.
5.7 Relatórios web: mês/período, por funcionário/todos, exportações Excel/PDF; card do dashboard mostra Atraso/Falta/Incompleto do dia e abre o detalhe.
5.8 Desinstalar módulo → sessão do funcionário bloqueia; reinstalar → volta.
5.9 Dia não útil cadastrado → não conta falta.

## 6. Agenda e notificações

6.1 Lembrete hoje → notificação no sino + push (1× por dia, dedup); repetição semanal → reaparece 7 dias depois; excluir só uma ocorrência → não notifica naquele dia, mantém as próximas.
6.2 Broadcast do /admin → sino de todos os usuários + push mobile; histórico em `admin_disparos`.
6.3 Apagar notificação pessoal → some só para o usuário; geral da empresa → some para todos.
6.4 Inscrição push expirada (410) → removida automaticamente no próximo envio.

## 7. Ava

7.1 Sem login → 401. Com login → resposta em pt-BR, streaming.
7.2 Com contexto financeiro → análise usa os números; sem contexto → orientação de uso sem inventar valores.
7.3 Ambiente vendas → respostas focadas no app de vendas.
7.4 Áudio ≤10 MB → transcrito e enviado; >10 MB → erro 413.

## 8. Admin

8.1 Token errado → 401 em todas as rotas. Senha personalizada definida → passa a valer junto do token.
8.2 CRUD de cupons; publicação de Informações do Vendas aparece no app; feedbacks mudam de status; consumo mostra plataformas configuradas.

## 9. PWA/infra

9.1 Instalação dos 3 PWAs (mobile, ponto, vendas) com ícones/nomes corretos; offline: vendas abre com cache; mobile mostra shell.
9.2 Atualização: publicar nova versão → recarga traz JS novo sem reinstalar (network-first).
9.3 `/mobile` em desktop largo → redireciona para `/`.
9.4 Webhook Asaas com token errado → 401; evento repetido → processado uma única vez.
