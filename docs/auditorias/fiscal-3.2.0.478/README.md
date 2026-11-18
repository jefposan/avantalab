# 3.2.0.478 — Organização dos padrões fiscais

Base: main 9952c712750aacd4800405473506be0f9c3544da (3.2.0.477).

Dados para emissão organiza ICMS, IPI, PIS/COFINS, IBS/CBS e CFOP em grupos expansíveis, com acesso às regras fiscais existentes. CST do IPI e enquadramento são padrões opcionais da empresa, persistidos no JSON fiscal existente. Exceções preenchidas no produto e no item continuam preservadas. Não houve migração nem alteração dos dados reais da empresa ou da nota.

A referência VHSYS foi consultada sem alterar ou salvar dados. Seus parâmetros de MVA, cálculo de ST, composição de base e DIFAL não foram reproduzidos como controles sem suporte de cálculo. Esta entrega não equivale a implementar todos os regimes e cálculos tributários do VHSYS. O emissor mantém seus limites existentes, inclusive IPI sem destaque.

A combinação de IPI é validada conforme O09-10 do MOC: https://moc.sped.fazenda.pr.gov.br/NFe_NFCe/Leiaute.html. A validação não escolhe benefício fiscal nem substitui a orientação contábil. Campos de IPI vazios não geram o grupo; 52/999 exige revisão e não é corrigido automaticamente.

Validação: integração do resolvedor real até XML e XSD, persistência isolada/CAS, exceções e compatibilidade do IPI, TypeScript, PADRÃO AVANTA e Ava. Prévia local em /vendas-lab/configuracoes-fiscais, porta 3051; salvamento da demonstração não grava a empresa real. Publicação não realizada nesta entrega local.
