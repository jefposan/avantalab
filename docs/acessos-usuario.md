# Dashboard e módulos por usuário

Entrega 4.0.0 — PADRAO-AVANTA 1.18.0.

## Contrato

As liberações pertencem a `usuarios_empresa`, portanto o mesmo login pode ter
Dashboard numa empresa e somente Projetos em outra. `dashboard_liberada` começa
em `true`; `modulos_liberados = NULL` mantém o conjunto legado. Ao salvar a
seleção, o servidor grava uma lista explícita. O papel define o nível interno,
independentemente da concessão, instalação e validade comercial.

Gestor Master mantém Dashboard e todos os módulos. Administrador com Dashboard
pode editar liberações de operadores; somente Master altera outros gestores.
Um administrador restrito a módulos não ganha a administração da empresa.
Ponto conserva a administração exclusiva de gestores. Operações de Campo
conserva o contrato atual da página, que exige Gestor Master/Administrador.
Conteúdo AvantaVendas conserva a exigência de Operador Completo ou gestor.

## Entrada e retorno

- A lista do login já inclui as concessões dos vínculos. Confirmar perfil exibe
  carregamento imediatamente e consulta somente o selecionado; a revalidação
  periódica também fica limitada a ele. Permissões em cache não substituem
  autorização das operações pelas APIs e pelo RLS.
- Dashboard concedida: abre a Gestão e mostra os módulos permitidos.
- Sem Dashboard e com um módulo disponível: abre diretamente o módulo.
- Sem Dashboard e com vários módulos disponíveis: abre `/modulos`.
- Sem módulo disponível: mostra orientação ao gestor; não abre o financeiro.
- Início retorna à Dashboard ou à seleção, mesmo com um único módulo.
- Ponto e Conteúdo AvantaVendas reutilizam os popups existentes numa casca sem
  Dashboard. Não duplicam controlador, formulários ou lógica de persistência.
- Mobile confirma a concessão antes da leitura financeira. Módulos exclusivos
  Web não passam a integrar o pacote nativo.

## Publicação

1. Aplicar `supabase/migrations/20261014050000_usuario_areas_liberadas.sql` antes
   de publicar o código. A migração é transacional e preserva dados/acessos.
2. Publicar a aplicação. Ausência da migração produz erro de validação, nunca
   libera acesso por conveniência.
3. Conferir num perfil de teste os quatro destinos, retorno, tema escuro,
   usuário com vínculos diferentes, URL direta e revogação durante sessão.

Em 14/10/2026, mediante autorização do responsável, a migração foi aplicada
no SQL Editor do projeto de produção AvantaLab. Conferência pós-aplicação:
89 vínculos preservados com Dashboard e módulos legados, 137 policies novas,
83 RPCs protegidas com suas definições anteriores guardadas e nenhuma
alteração individual de acesso. A tabela de recuperação tem RLS e permissões
revogadas para clientes. O rollback foi ensaiado integralmente numa transação
descartada, com conferência das definições restauradas; a migração permaneceu
ativa após o ensaio. A aplicação Web em produção ainda não foi publicada por
esta entrega; o código local já pode ser testado contra o banco real.

## Fronteira de segurança

O Proxy reconfirma concessões inclusive nas APIs legadas com service role;
os serviços centrais confirmam a mesma regra. Uma operação sem empresa não
herda os direitos de outro vínculo: quando há vínculos restritos, operações
ambíguas são negadas. Notas financeiras resolvem a empresa pelo lançamento.

As policies restritivas acrescentam a concessão às policies existentes, sem
substituir papel/vínculo. RPCs empresariais PL/pgSQL SECURITY DEFINER recebem
a checagem na entrada; as definições anteriores ficam em
`usuario_areas_rpc_backup`. A auditoria registra a concessão anterior, a nova,
o vínculo e o autor. Contas independentes de funcionários de Ponto e vendedores
AvantaVendas mantêm suas políticas próprias.

## Recuperação

Em caso de rollback, publicar o código anterior e executar, por um operador do
banco, `supabase/operations/rollback_usuario_areas.sql`. O script restaura RPCs e
retira apenas as novas policies/trigger; as colunas e a auditoria ficam
preservadas. O rollback restaura as permissões anteriores da aplicação;
portanto não deve ser executado mantendo o novo código em produção.

## Verificação

Os testes `tests/modulos/acessos-usuario*.test.mjs` cobrem destinos, API e
PostgreSQL em memória: negação financeira, RPC privilegiada, módulo permitido,
revogação, herança indevida entre empresas, Master e alteração direta negada.
`scripts/validar-area-modulos.mjs <pasta-temporaria>` renderiza o componente real
com dados fictícios para verificar desktop, mobile, tema e contraste.

Para teste interativo, iniciar `npm run dev` e abrir
`http://127.0.0.1:3000/teste/acessos-modulos`. O laboratório reutiliza os campos,
o seletor e as decisões de entrada reais, com três usuários fictícios. Permite
alterar liberações, simular login e conferir Início. Login, persistência e
conteúdo dos destinos são simulados; não há acesso ao Supabase. A rota retorna
404 fora de desenvolvimento. Isso não substitui o teste integrado com a
migração aplicada em um Supabase local separado.
