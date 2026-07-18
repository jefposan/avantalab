# Checklist de entrega

## Produto e arquitetura

- [ ] Escopo, público, permissões e estados foram definidos.
- [ ] Componentes existentes foram reutilizados.
- [ ] Módulo possui manifesto e limites claros.
- [ ] Segurança, RLS, dados sensíveis e recuperação foram revisados.

## Interface

- [ ] Tipografia, cores, espaçamentos e raios seguem o padrão.
- [ ] Cards seguem o padrão geral; quando AvantaCard/AvantaShell foi solicitado,
      usam o componente oficial e sua anatomia completa.
- [ ] Campos usam formato, máscara, validação e mensagens corretos.
- [ ] Carregamento, vazio, erro, sucesso e desabilitado foram tratados.
- [ ] Desktop, mobile e tema escuro aplicável foram verificados.
- [ ] Teclado, foco, contraste, labels e redução de movimento foram verificados.

## Integrações e entrega

- [ ] Preferências possuem namespace, versão e fallback.
- [ ] Ava e manuais operacionais foram revisados.
- [ ] `app/lib/version.ts` e `CHANGELOG.md` foram avaliados/atualizados.
- [ ] `npm run verificar:padrao-avanta` passou.
- [ ] `npm run verificar:ava` passou.
- [ ] Build, lint e testes proporcionais ao risco passaram.
