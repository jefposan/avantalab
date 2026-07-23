# Referência Tridium usada na recodificação

O protótipo atual do Vendas Mobile foi inspirado principalmente no fluxo do representante do Tridium App.

## Partes consideradas como base

## Análise do sistema publicado

Foi iniciado o mapeamento visual pelo sistema publicado:

```txt
https://app.tridiumcosmeticos.com.br/login
```

Arquivos públicos salvos para referência:

- `referencia_tridium/assets/login.html`
- `referencia_tridium/assets/index.css`
- `referencia_tridium/assets/index.js`
- `app/assets/logo_tridium.png`

Inicialmente, o login temporário informado retornou a mensagem:

```txt
Usuário aguardando aprovação ou bloqueado
```

Depois o usuário foi ativado e a autenticação passou a funcionar como perfil:

```txt
representative
```

Foi possível consultar APIs autenticadas usando headers de navegador.

### Dados autenticados coletados

Foram salvas amostras em:

```txt
referencia_tridium/api
```

Arquivos principais:

- `products.json`
- `pricing_data.json`
- `categories.json`
- `pedidos.json`
- `professionals.json`
- `dashboard_kpis.json`
- `configuracoes.json`
- `agenda.json`
- `novidades.json`
- `informacoes.json`
- `divulgacao.json`

O usuário de teste não possui clientes, pedidos, agenda ou histórico relevante, mas possui acesso ao catálogo.

Dados úteis encontrados:

- 24 produtos na primeira página de produtos;
- 144 produtos no endpoint de pricing data;
- 6 categorias;
- imagens reais de produtos disponíveis.

Também foram baixadas imagens de produtos para:

```txt
referencia_tridium/produtos_imagens
```

E copiadas imagens de referência para o protótipo em:

```txt
app/assets/produtos
```

O pacote do protótipo foi atualizado em:

```txt
app/data/tridium-package.json
```

Agora ele usa produtos reais consultados no Tridium publicado.

### Identidade visual extraída

O app publicado usa:

- fundo principal claro `#f8fafc`;
- cards brancos;
- bordas claras `#e5e7eb` / `hsl(214 32% 91%)`;
- raio padrão próximo de `12px`;
- primário ciano/verde-água `hsl(177 100% 35%)`;
- hover primário `hsl(177 100% 30%)`;
- gradiente hero `hsl(177 100% 35%) → hsl(196 100% 42%)`;
- botão/carrinho flutuante em `#30c7d6`;
- botões principais em gradiente;
- cards com sombra suave `shadow-tridium-*`;
- componentes no padrão shadcn/Tailwind.

### Rotas identificadas

Perfil representante:

- `/representante/dashboard`
- `/representante/produtos`
- `/representante/pedidos`
- `/representante/clientes`
- `/representante/lancar-pagamento`
- `/representante/agenda`
- `/representante/novidades`
- `/representante/divulgacao`
- `/representante/Informacoes`
- `/representante/configuracoes`

Perfil profissional:

- `/profissionais/dashboard`
- `/profissionais/pedidos`
- `/profissionais/ponto-venda`
- `/profissionais/Treinamento`
- `/profissionais/configuracoes-profissional`

Perfil consumidor:

- `/consumidor/dashboard`
- `/consumidor/revendedor`

### Dashboard do representante

Referências:

- `DashboardRepresentante.tsx`
- `DashboardRepresentante.py`

Recriado no protótipo como:

- resumo do mês;
- total vendido;
- quantidade de pedidos;
- ticket médio;
- unidades vendidas;
- produto mais vendido;
- cliente destaque.

### Produtos

Referências:

- `Products.tsx`
- `product_api.py`
- `product_profissionais.py`
- `product_consumidor.py`

Recriado no protótipo como:

- cadastro simples de produto;
- marca;
- categoria;
- SKU;
- preço;
- preço promocional;
- estoque opcional;
- pacote Tridium demonstrativo.

### Clientes

Referências:

- `Clientes.tsx`
- `client_professionals_api.py`
- `client_consumers_api.py`

Recriado no protótipo como:

- cadastro simples de cliente;
- telefone/WhatsApp;
- e-mail;
- observações;
- total vendido por cliente.

### Pedidos/Vendas

Referências:

- `PedidoModal.tsx`
- `Pedidos.tsx`
- `pedido.py`
- `pedido_profissional.py`
- `pedido_consumidor.py`

Recriado no protótipo como:

- carrinho simples;
- seleção de produtos;
- quantidade;
- desconto;
- cliente;
- forma de pagamento informativa;
- finalização da venda;
- histórico de vendas.

## O que foi simplificado nesta fase

O Tridium antigo separava alguns fluxos por:

- representante;
- profissional;
- consumidor;
- pedido profissional;
- pedido consumidor;
- pagamento;
- consignado;
- dashboard avançado.

No Vendas Mobile V1, isso foi reduzido para:

- vendedor único;
- clientes simples;
- produtos simples;
- vendas simples;
- relatórios básicos.

Essa simplificação combina melhor com o público definido:

- vendedor autônomo;
- porta a porta;
- revendedor;
- operação sem nota fiscal/cupom fiscal.

## Próximos reaproveitamentos possíveis

Depois do protótipo local, podemos trazer:

- venda consignada;
- contas a receber;
- comprovante simples;
- agenda de visitas;
- metas mensais;
- dashboard por período;
- exportação XLS/PDF;
- importação XLSX real;
- sincronização Supabase;
- autenticação AvantaLab.
