# Novos módulos e sistemas plugados

## Estrutura recomendada

```text
app/modules/<slug>/
├── manifest.ts
├── permissions.ts
├── routes.ts
├── types.ts
├── components/
├── screens/
├── services/
├── formatters/
├── ava-context.ts
└── README.md
```

Adaptar somente quando a plataforma exigir, preservando os mesmos contratos.

## Manifesto mínimo

Declarar identificador estável, nome, versão, público, permissões, menus, rotas,
cards, preferências, suporte web/mobile, integrações financeiras e contribuição
para a Ava. Ativação e autorização devem ser validadas no servidor.

O manifesto também declara obrigatoriamente:

- `modoNavegacao`: `integrado` ou `pagina_total`;
- rota e destino de retorno quando usar página total;
- superfícies suportadas (`web`, `pwa`, `android`, `ios`);
- escopo dos dados, normalmente `empresa`;
- preço, elegibilidade por plano e política de cancelamento;
- comportamento de remoção e retenção de dados;
- nível efetivo de cada perfil de usuário.

## Contrato comercial padrão

- Módulos avulsos possuem preço mensal definido no catálogo central. Enquanto
  a política inicial estiver vigente, todos usam **R$ 14,90 por mês**.
- O plano Business permite contratação avulsa. O Business Pro inclui os módulos,
  mas Gestor Master ou Administrador ainda escolhe o que instalar.
- Uma cortesia empresarial vigente equivale à liberação total do Business Pro
  para módulos: não gera cobrança adicional e permite instalar ou remover todos
  os módulos disponíveis. A cortesia não instala módulos automaticamente e não
  amplia a permissão de Operador Completo ou Operador Simples.
- Gestor Master e Administrador instalam, removem e controlam a visibilidade.
- Operador Completo executa todas as operações internas permitidas pelo módulo,
  mas não instala, oculta nem remove o módulo.
- Operador Simples somente visualiza.
- Cancelar uma assinatura interrompe a renovação, mantendo o acesso até o fim do
  período pago. A data final fica registrada na ativação e é validada no servidor.
- Remover ou expirar um módulo nunca apaga seus dados. Reinstalar recupera o
  mesmo conteúdo, salvo solicitação administrativa separada e explícita de
  exclusão de dados.

## Modos de navegação

### Integrado

O módulo injeta seus controles em um ponto de extensão da Gestão e reutiliza a
casca existente.

### Página total

O módulo abre uma rota própria por navegação interna, na mesma guia. A tela usa
todo o viewport, não replica nem mantém o menu da Gestão e apresenta uma ação
compacta **Voltar ao AvantaLab**. O botão Voltar do navegador também deve
preservar o comportamento esperado. O perfil ativo acompanha a navegação, mas
qualquer identificador de rota é apenas contexto: servidor e RLS reconfirmam
vínculo, instalação, validade e hierarquia.

Um módulo exclusivo Web não é registrado em menus, scripts ou pacotes mobile.

## Dados e segurança

- Dados do módulo usam tabelas e serviços próprios, com `empresa_id` e RLS quando
  aplicável.
- A instalação pertence à empresa/perfil ativo, não ao usuário que a solicitou.
- Tabelas do módulo verificam vínculo, papel, módulo ativo e eventual validade.
- `empresa_modulos` não aceita escrita direta do cliente; instalação e remoção
  passam por rota segura do servidor.
- Nunca expor segredo ou service role ao cliente.
- Integração financeira usa o contrato central e origem rastreável.
- Mudança de banco entrega migração, índices, políticas, rollback ou estratégia
  explícita de recuperação.

## Integração visual

- Consumir tipografia, tema, `corPrimaria`, campos e componentes oficiais.
- Cards seguem o padrão geral do módulo e do PADRÃO AVANTA. Usar AvantaShell
  somente quando solicitado ou declarado no manifesto/especificação.
- Não copiar header, menu, autenticação ou preferências do núcleo.
- Entregar estados responsivos e acessíveis.

## Integração com a Ava

Definir o que a Ava precisa conhecer, quais ações pode orientar e quais dados não
podem entrar no contexto. Atualizar manual operacional e conhecimento executável
quando houver impacto.

## Sistema externo ou novo projeto

Adicionar ao `AGENTS.md` do projeto:

```md
Este projeto segue o PADRÃO AVANTA.
Antes de escrever código, leia integralmente:
/Users/JEFF/avantalab/docs/padrao-avanta/README.md
e os documentos indicados para o trabalho.
```

Registrar também diferenças inevitáveis de tecnologia sem redefinir a identidade.
