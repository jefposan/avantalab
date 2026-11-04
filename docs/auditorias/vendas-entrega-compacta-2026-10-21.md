# AvantaVendas — entrega compacta 3.2.0.30-av190

PADRÃO AVANTA v1.20.0. Escopo: compactar scripts próprios sem alterar login,
permissões ou dados; testar rede lenta e publicar sobre a produção .29.

- Mesmo redutor conservador da Gestão: compress=false, mangle=false, Unicode e
  licenças preservados. Fontes em sistema/ intactas, sem nova dependência.
- Cinco arquivos: config, cliente Supabase, aplicativo e dois comprovantes.
  Bibliotecas já minificadas, CSS, voz, bootstrap e SW não alterados.
- Artefatos gerados em runtime-compacto/, incluídos explicitamente no tracing
  serverless. Rota mantém validação de caminho/MIME/nosniff/cache.
- Revisão atual (ou sem versão) recebe compacto; URLs versionadas anteriores
  conservam o original e seu cache. Ausência do gerado usa o original, sem
  impedir acesso. Não altera armazenamento, autenticação ou validação de acesso.
- Gestão compactada na .29 preservada. Sem migração, dados reais alterados ou
  novo binário nativo. Teste no aparelho não é substituído por simulação.

## Verificações previstas

Equivalência integral dos cinco programas; rota real com revisão atual/antiga,
desenvolvimento, falta de artefato e traversal; regressões de OAuth e retomada;
Chrome isolado em rede/CPU lentas com backend fictício; build; hashes e cache
nos domínios publicados. Resultados e limites serão registrados após execução.

## Recuperação

Promover a produção .29 restaura a entrega anterior sem rollback de dados.
Não reinstalar, limpar sessão ou apagar pendências do usuário.
