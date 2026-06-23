# Modelo — Módulo Controle de Ponto (AvantaLab)

Desenho do módulo antes de criar tabelas/telas. **Ainda não rodar SQL** — a tabela muda com este modelo (geolocalização, funcionário com login, imutabilidade).

## 1. Quando o módulo aparece
- Só para perfis do tipo **empresa** (não "pessoal"). No catálogo de Módulos, o "Controle de Ponto" só é ofertado/instalável quando `empresa.tipo_perfil = empresa`.
- Instalado → ativa: cadastro de funcionários, tela de bater ponto (funcionário) e visão administrativa (gestor).

## 2. Quem é o "funcionário" (identidade e login)
- O funcionário é um **usuário de verdade** (Supabase Auth), criado **pelo módulo**, com **papel `funcionario_ponto`** no vínculo com a empresa (`usuarios_empresa`).
- Vantagem: reaproveita a autenticação existente (senha com hash, validação, recuperação) — nada de senha "caseira".
- Criação feita por uma **rota de servidor** (service role), no mesmo padrão das rotas internas já existentes (`criar-usuario-interno`). O gestor cadastra: nome, login/e-mail, senha (com validação), cargo (opcional).
- **Identificação no login (sem opção manual):** ao logar, o sistema olha o papel do vínculo. Se for `funcionario_ponto`, **abre direto a tela de ponto** — o funcionário não entra no app financeiro. (Sem precisar de um botão "Controle de Ponto" no login; o próprio login já direciona.)

## 3. Fluxo do funcionário (mobile)
1. **Login** com seu login/senha.
2. **Tela de boas-vindas:** nome do funcionário, empresa, data de hoje e o status do dia (o que já bateu).
3. **Seleciona a ação** (máquina de estados do dia):
   - Sem nada → **Entrada**
   - Após Entrada → **Saída para refeição** *ou* atalho **Encerrar (Saída)** (sair mais cedo, sem refeição)
   - Após Saída p/ refeição → **Retorno da refeição**
   - Após Retorno → **Saída**
   - Após Saída → dia encerrado
4. Ao tocar na ação, **captura geolocalização** (GPS do navegador), **data e hora**, e a ação.
5. **Salva** o registro (imutável) e mostra um **comprovante** na tela com: empresa, funcionário, ação, data/hora, local e um **código/hash** do registro.
6. Registro fica disponível ao **acesso administrativo** da empresa.

### 3.1 Meus registros (acompanhamento do funcionário)
- O funcionário acessa, no mobile, os **próprios** registros para acompanhamento.
- **Relatórios por período:** diário, semanal, mensal e anual (entradas/saídas, refeições e total de horas trabalhadas).
- **Exportar PDF** do relatório do período selecionado (a definir a forma: biblioteca cliente tipo jsPDF, ou impressão do navegador "salvar como PDF").

## 4. Visão administrativa (gestor)
- **Funcionários:** cadastrar, editar, desativar.
- **Registros:** lista por funcionário/dia, com ação, data/hora e **local** (link de mapa a partir de lat/long). Filtros por período e funcionário.
- (Futuro) Espelho de ponto / relatório de horas, exportação.

## 5. Modelo de dados (revisado)

```text
-- Funcionário = usuário com papel 'funcionario_ponto' em usuarios_empresa
-- (sem tabela nova de auth). Dados extras do módulo, se precisar:
ponto_funcionarios
  user_id       uuid  -> auth.users
  empresa_id    uuid  -> empresas
  cargo         text
  jornada       text  null      -- opcional
  ativo         boolean
  unique(user_id, empresa_id)

ponto_registros            -- imutável (sem update/delete pelo cliente)
  id            uuid PK
  empresa_id    uuid
  user_id       uuid         -- funcionário que bateu
  tipo          text         -- entrada | saida_refeicao | retorno_refeicao | saida
  registrado_em timestamptz
  dia           date         -- referência (fuso de Brasília)
  latitude      double precision null
  longitude     double precision null
  precisao_m    double precision null   -- precisão do GPS
  dispositivo   text null               -- user agent
  hash          text null               -- integridade do registro
  criado_em     timestamptz
```

RLS: funcionário **insere o próprio** registro e **lê os seus**; gestor lê os da empresa. Registros **não podem ser alterados/apagados** pelo cliente (imutabilidade — base para validade futura).

## 6. Geolocalização
- Usa a **Geolocation API** do navegador (pede permissão). Guarda `latitude/longitude/precisao`.
- "Local" legível (endereço) exige geocodificação reversa (serviço externo) — fica para depois; na v1 mostramos o ponto no mapa via link (ex.: Google Maps `?q=lat,long`).
- Se o funcionário **negar** a localização: decidir política (bloquear o registro? permitir registrando "sem localização"?). **Ponto a definir.**

## 7. Nota legal (Portaria 671 / REP-P)
- App de ponto com geolocalização é previsto na **Portaria MTP 671/2021** (categoria **REP-P**), sem necessidade de acordo coletivo.
- Para ter **validade jurídica plena** como REP-P, faltaria: registro do software no **INPI**, **assinatura eletrônica ICP-Brasil** em cada comprovante, **comprovante em PDF assinado** (empresa, local, data/hora, hash), **NSR** sequencial e imutabilidade auditável.
- **Recomendação:** v1 como **controle interno funcional** (não certificado), já com o modelo preparado (imutabilidade, hash, comprovante, geolocalização) para evoluir ao REP-P quando fizer sentido. Deixar isso explícito para o cliente.

## 8. Decisões (confirmadas)
1. **Administração no WEB.** O funcionário bate ponto no **mobile**; o gestor cadastra funcionários e vê registros/relatórios no **web**. A área "Módulos" (instalar/desinstalar) fica no **web**.
2. **Localização obrigatória.** Se o funcionário negar o GPS, o registro é **bloqueado** (não bate ponto sem localização).
3. **Login por login/usuário** (como os acessos internos atuais), sem exigir e-mail real.
4. **Comprovante = só a tela de confirmação** na v1 (sem PDF por enquanto).
5. **Cargo:** opcional no cadastro; jornada fica para depois.

## 9. Roteiro de implementação
- **Fase 1 — Fundação (web):** SQL `modulos`/`empresa_modulos` (+RLS, seed `ponto`); área "Módulos" no web (catálogo filtrado para perfil empresa) com instalar/desinstalar; leitura de módulos ativos.
- **Fase 2 — Ponto admin (web):** SQL `ponto_funcionarios` + `ponto_registros`; rota de servidor para criar funcionário (auth user + vínculo `funcionario_ponto`); telas de cadastro de funcionários e de registros/relatórios.
- **Fase 3 — Bater ponto (mobile):** login de `funcionario_ponto` abre a tela de ponto (boas-vindas + máquina de estados + geolocalização obrigatória + comprovante na tela) **+ "Meus registros"** com relatórios (diário/semanal/mensal/anual) e exportação em PDF.

---

## Sources
- [Aplicativo de ponto eletrônico — mywork](https://www.mywork.com.br/blog/aplicativo-de-ponto-eletronico)
- [Guia prático Portaria 671/2021 — UsePonto](https://useponto.com.br/blog/guia-pratico-portaria-671-2021)
- [Portaria 671: REP-C, REP-A e REP-P — ALLTEC](https://alltec.com.br/blog/portaria-671-controle-de-ponto.html)
- [Controle de ponto por geolocalização — VR Blog](https://blog.vr.com.br/controle-de-ponto-por-geolocalizacao-gerenciando-equipes-externas-de-forma-eficiente/)
