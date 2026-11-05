# Diagnóstico de preços direto no Mercado Livre — 27/10/2026

Versão 3.2.0.246. Base efetivamente em produção: dpl_9XGHuysiXjuL8rDnEiCqK9gzXMRd, snapshot eeb94ca8dcc4927acb9042a58bb2de96943166b2 (3.2.0.243).

Autorização expressa: preparar diagnóstico no servidor e testar a API sem OpenAI e sem alterar anúncios. Nenhuma chave foi extraída: a variável sensível permanece no ambiente da Vercel. Diagnóstico usa o controlador normal de conexão e sua renovação OAuth, quando necessária.

Rota POST /api/modulos/marketplaces/diagnostico-precos exige autenticação, vínculo na empresa, módulo ativo e gestor/administrador. Somente caminhos GET definidos internamente são encaminhados ao ML. Entradas e volume limitados a duas fichas e vinte ofertas por amostra. Erros, identidade e preços usam campos selecionados, sem tokens, dados pessoais, mensagens brutas ou chaves. Nenhum preço é salvo. Nenhuma chamada OpenAI ocorre neste fluxo. A pesquisa de preços atual permanece independente.

Tela administrativa /marketplaces/diagnostico-precos consulta até quatro contas conectadas. Médias são identificadas como amostra sem validação de equivalência. Empresa, EAN e modelo podem ser informados por parâmetros; nenhuma credencial na URL.

Validação local: cinco testes específicos e 471 testes de segurança aprovados; padrão 1.23.1 e Ava revisados. Tipos de rota gerados antes da verificação TypeScript. Build remoto completo obrigatório antes do teste real.

Pacote isolado /private/tmp/avanta246-price-diagnostic. Ajustes locais .244 e .245 não incluídos nesta entrega. Resultado ao vivo será registrado após a publicação.
