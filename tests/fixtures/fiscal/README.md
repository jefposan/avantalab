# Regressão de NF-e numérica anterior ao CNPJ alfanumérico

`nfe-numerico-pre-alfa.json` contém seis entradas sintéticas e os XMLs/chaves gerados pela implementação anterior: homologação e produção, séries 1, 2 e 123. Origem: `origin/main` bf23417f89c90e8ac9ea246f94da9ed7227c2fda (3.2.0.486).

SHA-256 do gerador anterior `app/vendas/lib/nfe-sp-xml.mjs`: `f3b1c3ab9ded1ddb3d327aaddb1f86689cbf9d3edb0780955160d39531263330`.

O teste compara o XML e a chave byte a byte, sem normalizar diferenças. A prova de compatibilidade do DANFE usa o mesmo procNFe sintético do laboratório nos dois ambientes e compara o hash do PDF com o gerador anterior. SHA-256 desse gerador: `472befa874638e52d9dd17c8503e0d760b2fb835a4d3749a53ac87313f5a8baa`.

PDF numérico esperado:
- homologação: `70bcfe5f66d877d5f2af55fbcc21c2098cf8cc820ebb9a56a36f3ce57e61bb79`;
- produção simulada: `acd7630bcb7c22a74662c15e2c41b2c0aae89c2b8edacbde4621925ce4774af2`.

Todos os dados são sintéticos. Não há certificado, senha, chave privada ou documento fiscal de cliente nesta pasta.
