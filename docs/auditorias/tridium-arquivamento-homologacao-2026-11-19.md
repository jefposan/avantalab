# Arquivamento administrativo de homologação — Tridium

Autorização expressa do titular em 19/11/2026: somente duas notas, sem botão, preservando arquivos/históricos e produção. Aplicando PADRÃO AVANTA 1.24.0. Operação de dados sobre produção Web 3.2.0.497; registro acompanha a entrega 3.2.0.498, sem migração automática.

## Escopo exato

Empresa `ec9604fd-38f2-429b-9c00-c4bc6c642b0e`. NF-e série 2/número 1, rascunho/emissão `8963fceb-8bd7-4dc6-9b96-4f3ecfdf5c48`, e série 2/número 2, `9303eac3-ccfe-41b8-99b7-df2ee91a7c87`. Ambas `homologacao`, `danfe_ready`, cStat 100, autorizadas em 06/11/2026, protocolos respectivamente `135260009867036` e `135260009867182`.

## Execução e evidência

- A Vercel devolveu `decrypted:false` para a conexão sensível autorizada; não foi contornada essa proteção nem exibida credencial. Usada a sessão administrativa existente do titular no SQL Editor do Supabase, projeto `qzewxhdkwettnlmkjoqd`.
- Executado o SQL em `scripts/manutencao/2026-11-19-arquivar-duas-notas-tridium.sql`, fora da fila de migrações. Não reexecutar automaticamente; guardas bloqueiam ambiente, protocolo, série, número, data, arquivos ou marcações divergentes.
- Inseridas somente duas marcações de retirada operacional na infraestrutura existente `fiscal_private.draft_deletions`, sem executar o serviço de exclusão/cancelamento e sem modificar emissões. `previous_state=danfe_ready` conserva a situação real. Exceção administrativa de arquivamento explicitamente autorizada para homologação; não relaxa a regra de exclusão de notas autorizadas na aplicação.
- Dois eventos `nota_homologacao_arquivada` em `public.vendas_eventos` registram finalidade, autorização, ambiente, números e hashes antes/depois; ator nulo, pois a manutenção ocorreu na sessão administrativa e não deve personificar usuário da aplicação.
- Hashes antes/depois idênticos: emissões `f6a19b435005eaf92b9d827637d076d5`; arquivos `18d92c1a2f790647d83473a7d61bc5ba`; produção `d751713988987e9331980363e24189ce`; reservas `edfe6965a935f554cb14052daa073e6f`; rascunhos `4ec09ff3ae9bf0e7de6d5c4aa7d2556a`.
- Oito registros de arquivos preservados (quatro por emissão, incluindo XML protocolado e DANFE); nenhum acesso de escrita ao Storage. Documentos continuam disponíveis pela guarda fiscal/backup existente. Nenhuma reserva liberada ou número reutilizado.
- Conferência na tela autenticada após recarregar: Documentos passou de 4 para 2; notas 2/1 e 2/2 não aparecem, enquanto os outros dois registros permanecem. Sem alterar outras empresas, vendas, recebimentos, estoque ou permissões.

## Validação e limites

Teste PostgreSQL/WASM do script: somente dois alvos e dois eventos; produção e oito arquivos preservados. Ambiente de produção em um alvo, protocolo divergente ou falta de DANFE causam rollback integral sem marcações. Operação não é exclusão física nem cancelamento junto à SEFAZ; não cria botão, endpoint ou novo mecanismo automático. Não foi tentado desfazer as marcações imutáveis nem desabilitar gatilhos/RLS.
