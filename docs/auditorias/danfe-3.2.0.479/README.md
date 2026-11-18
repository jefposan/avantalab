# DANFE 3.2.0.479

Base: main ddc62707ec24667ae973b49f83f1b9351ddb70e5 / produção 3.2.0.478.
PADRÃO AVANTA 1.24.0; MOC DANFE consultado em https://moc.sped.fazenda.pr.gov.br/NFe_NFCe/DanfeCodigoBarras.html.

## Escopo

Layout aprovado com margens de 5 mm, blocos separados, logo proporcional e razão social do XML sem repetição. Nome fantasia somente quando presente no XML e diferente da razão social; não se completa a identidade fiscal de notas históricas com o cadastro atual. O nome representado graficamente no logo é apenas a marca. A natureza da operação é integralmente preservada e pode aumentar a altura do bloco. Paginação considera o espaço disponível.

Aparência do DANFE em Dados para emissão: herdar logo do perfil, enviar PNG/JPEG/WebP até 250 KB ou não usar logo. Caixa máxima de impressão 23 × 17 mm, sugestão 600 × 450 px, sem deformar. Preferência em configuracao_fiscal.danfe_logo (JSON existente), com CAS, permissão fiscal.configure e normalização preservada no cadastro da empresa. Nenhuma migração.

O download mantém a autorização fiscal existente. Depois de verificar empresa, permissão e artefato, carrega o XML processado privado por referência e checksum. Renderiza e grava somente uma nova versão por hash, no bucket privado, e entrega acesso temporário auditado. Não altera o XML, o registro original do DANFE, a emissão, protocolo, número ou série. O serviço não possui operação de retransmissão. Falhas não retornam um PDF desatualizado como se refletisse a configuração nova.

Logo remoto: somente origem Supabase configurada na rota de objetos ou imagens oficiais em /ofertas/; sem redirects, até 2 MB e limite de pixels. Imagens específicas passam por validação e decodificação raster, sem SVG. Sem upload a serviços externos de conversão.

## Verificação

Testes reais do gerador: chave/protocolo, XML intacto, PDF determinístico, múltiplas páginas e todos os itens presentes; medidas de texto dentro das margens. Testes de versão sem sobrescrita, isolamento entre empresas, permissão negada sem acesso ao XML e bloqueio de URL arbitrária. UI demonstrativa: alternar Sem logo / Usar logo da empresa e salvar localmente. TypeScript, PADRÃO AVANTA, Ava e suíte geral.

O PDF da nota real nº 2 / série 1 foi reconstruído localmente a partir do procNFe baixado na sessão autorizada. XML/PDF privados não são versionados no Git. O XML foi preservado byte a byte; chave e protocolo conferidos no gerador e no PDF extraído.
