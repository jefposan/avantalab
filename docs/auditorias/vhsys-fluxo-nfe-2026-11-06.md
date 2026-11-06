# Referência observada para emissão NF-e — 3.2.0.346

Sessão aberta do vhsys inspecionada em 06/11/2026, por solicitação do responsável. Navegação somente de leitura: abertura de documento já autorizado e formulário vazio de nova nota. O formulário foi fechado por Cancelar, sem preencher ou salvar. Nenhuma emissão ou cancelamento foi executado no sistema de referência.

## Comportamentos efetivamente observados

- Lista de notas com número, data, cliente, total, situação e ações.
- Documento já autorizado abre confirmação de sucesso, chave e protocolo. Oferece Imprimir DANFE, Baixar XML e ações financeiras/de estoque separadas.
- Visualizar a situação da NF-e abre outra aba no Portal Nacional. A consulta pública não é uma etapa para concluir o envio dentro do vhsys.
- Adicionar nota fiscal abre formulário único com natureza/finalidade/tipo, série/número, cliente, produtos, valores/tributação, pagamento, transporte e dados complementares. Rodapé: Salvar, Salvar e emitir, Cancelar.
- Não foi executado um novo envio no vhsys; portanto não se afirma ter medido o tempo de autorização ou reproduzido uma rejeição nessa sessão.

## Consulta pública oficial conferida

O menu Serviços → Consultar NF-e do Portal Nacional abriu campo de chave de 44 dígitos e CAPTCHA. Foram conferidos os ambientes de produção e homologação. Não foram preenchidas chaves reais nem resolvidos desafios.

- Produção: https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ%2BgAVw2g%3D
- Homologação: https://hom.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ%2BgAVw2g%3D

## Aplicação no AvantaLab

Uma conferência e uma confirmação de emissão. Salvar não transmite; Cancelar fecha e preserva o rascunho. Autorização confirmada abre documentos já guardados no perfil. Rejeição mostra o motivo para correção; falha de comunicação permanece no formulário, sem inferir autorização ou rejeição fiscal e sem botão de consultar envio. A reconciliação por Web Service é controle interno de segurança contra duplicação, executado em uma nova ação explícita Salvar e emitir quando necessário. Só retorno 217 válido da mesma nota permite seguir com o mesmo XML/chave/número. A consulta pública é separada e abre em outra aba.

As regras técnicas de comunicação continuam seguindo MOC 7.0 e NT 2025.001 v1.03 registrados na auditoria de retorno oficial. A referência visual não substitui o contrato da SEFAZ. Não se alteram certificados, credenciamento, tributação, permissões ou faturamento/estoque para simplificar a interface.
