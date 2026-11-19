# 3.2.0.495 — Navegar: Dashboard e módulos em um único acesso

Base: main `fe7f4a406c163e6f12b8992e76f8a71c63a1c4b9`, produção
`dpl_JDtDVj9YpvtoBAb3L1wegybfw5LF` (3.2.0.494). Implementação isolada no
pacote de Custos; checkout canônico e trabalhos paralelos preservados.
PADRÃO AVANTA consultado: 1.24.0.

- Nos cinco cabeçalhos Web de página total já atendidos, Navegar (grade e seta)
  ocupa o lugar de Início à esquerda. Seletor da direita removido; logo e demais
  ações preservados. Páginas de erro e prévias sem contexto conservam retorno
  seguro; módulos integrados e runtimes nativos não foram redesenhados.
- `ModuloHeader.navigation` substitui o retorno somente quando fornecido;
  consumidores anteriores mantêm compatibilidade. Nome Navegar fica visível
  também em viewport estreita; painel acompanha o acionador e respeita margens.
- Dashboard é concessão independente: somente `dashboard === true` da empresa
  exata libera sua opção. Não usa liberação de outro perfil, plano de módulo,
  cache visual ou existência de módulos como permissão para o financeiro.
  Destino é `/gestao?inicio=1&empresaId=...`; módulos seguem registro oficial.
- Ao selecionar, reconsulta acessos e confirma política de dispositivo. Mantém
  invalidação de respostas antigas, bloqueio de gravações sinalizadas,
  confirmação de descarte em Custos e `beforeunload` por navegação de documento.
- Testes incluem Dashboard concedida/negada/ausente/de outra empresa, revogação,
  papéis, compatibilidade do header, posição única à esquerda e renderização da
  lista com selo Atual/bloqueio. Nenhum teste de segurança foi removido.
- Navegador: layout em 1280px e 390px, grade/nome/seta visíveis, retirada da
  Dashboard ao mudar a concessão demonstrativa, tema escuro, erro sem sessão e
  Escape com foco devolvido. Prévia usa o apresentador real com dados sintéticos;
  não modifica sessão ou dados de clientes. Rota e tipos temporários removidos.

Sem SQL, nova dependência ou alteração de paralelismo/máquina do build. A proposta
intermediária de rótulo MÓDULOS não foi publicada; esta versão a substitui.
