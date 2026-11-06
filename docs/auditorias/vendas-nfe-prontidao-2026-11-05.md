# NF-e — conferência de prontidão em 05/11/2026

Versão examinada em produção: 3.2.0.326. Correção preparada: 3.2.0.327.

## Evidências da conferência

- Perfil empresarial Tridium: certificado A1 ativo, validade até 17/07/2027. Consultados somente metadados, sem ler senha ou material criptográfico.
- Cadastro do emitente: CNPJ, razão social, inscrição estadual, regime Simples Nacional e endereço em SP preenchidos.
- Perfil fiscal: NF-e habilitada em homologação. A interface autenticada confirma certificado e executor de homologação prontos; série 1, próximo número 1, sem reserva feita pela consulta.
- Ainda não havia regras publicadas, rascunhos ou emissões fiscais persistidos para esse perfil no momento da leitura.
- Os códigos tributários da configuração do emitente ainda estavam ausentes no cadastro persistido.
- Catálogo: 344 itens, 223 com NCM de oito dígitos e 23 com unidade tributável explícita. A preparação deverá validar os itens efetivamente escolhidos; esses totais não significam que todos os itens precisam ser corrigidos para testar uma nota.
- Um cliente cadastrado, com documento e endereço fiscal preenchidos. Isso não substitui a validação completa da nota escolhida.

## Correções da versão 3.2.0.327

- Regras inativas ou fora do escopo não exigem preenchimento de CFOP. Ativação e habilitação do tipo restauram a exigência; inativas não participam do enquadramento.
- A mesma validação de publicação é utilizada pela interface e pelo serviço: estrutura, responsável, data válida, confirmações e revisão de cada regra ativa.
- Publicar com pendências não envia a configuração: seleciona a regra correspondente e foca o primeiro campo pendente. A lista permite acessar os demais campos e associa cada erro ao controle.
- Conferido no navegador local: foco no CFOP ao submeter; troca para outra regra ao selecionar sua pendência; foco no responsável ao selecionar a pendência global. Dados demonstrativos, sem efeitos externos.

## Validação e limite da evidência

- Testes de regras, publicação e ação real de submissão cobrem ausência de campos, data inválida/futura, desativação, reativação, escopo, preservação do CFOP e bloqueio antes de qualquer escrita.
- Suíte de segurança: 523 testes aprovados. Tipagem aprovada no pacote isolado; lint sem erros, mantendo avisos preexistentes do componente. PADRÃO AVANTA e Ava aprovados.
- Ensaio local do orquestrador chegou a `danfe_ready`, com quatro artefatos. Resiliência: quatro cenários, sem retransmissões. Ambos usam transportes sintéticos, com zero chamadas de rede.
- Nenhuma NF-e foi transmitida nesta conferência. Autorização, rejeição, XML protocolado e DANFE reais ainda devem ser verificados no primeiro envio de homologação, após configuração fiscal e seleção dos itens. Não foi habilitada emissão em produção fiscal.
