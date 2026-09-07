# NF-e 4.00 — PL_010e_v1.02

Pacote congelado para a validação local do pré-XML NF-e do piloto paulista.

- O Portal Nacional da NF-e lista `PL_010e_v1.02` como versão oficial em uso,
  publicada em 10/07/2026.
- Como o download do Portal apresentou redirecionamento circular durante a
  incorporação, os cinco arquivos encadeados foram recuperados do espelho público
  do Projeto ACBr no commit fixo registrado em `manifest.json`.
- Os hashes SHA-256 também estão no manifesto e impedem atualização silenciosa.
- O arquivo raiz é `nfe_v4.00.xsd`; nenhuma URL externa é consultada durante a
  validação.

O tipo oficial `TNFe` exige o elemento XMLDSig. Para conferir o payload antes da
assinatura real, o backend acrescenta somente em memória um envelope estrutural
mínimo, executa o XSD e o descarta. Esse envelope não contém certificado, chave,
assinatura criptográfica ou valor fiscal e nunca aparece no XML devolvido.
