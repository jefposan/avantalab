# Gestão Mobile — release Android

O aplicativo Android da Gestão usa o pacote `br.com.avantalab.app` e abre
diretamente `https://app.avantalab.com.br/mobile`. Ele é um shell Capacitor:
as atualizações web continuam publicadas normalmente, enquanto alterações de
plugins, permissões, versão nativa ou loja exigem novo AAB.

## Antes do primeiro teste fechado

1. Criar no Play Console o aplicativo **AvantaLab Gestão** com o pacote
   `br.com.avantalab.app` e registrar esse pacote em **Verificação de
   desenvolvedor Android**.
2. Criar o projeto Firebase do Android, baixar `google-services.json` para
   `android/app/` sem incluí-lo no Git e configurar os segredos da Edge
   Function: `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL` e `FCM_PRIVATE_KEY`.
3. Criar no Google Play e no RevenueCat os produtos
   `br.com.avantalab.app.pessoalpremium.monthly` e
   `br.com.avantalab.app.pessoalpremium.yearly`, associados ao entitlement
   `pessoal_premium`. Configurar `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY` no
   ambiente de publicação.
4. Preencher Conteúdo do app, Dados de segurança, política de privacidade,
   acesso de revisão e formulário de exclusão de conta exigidos pelo Play.

## Gerar um AAB

Sempre executar, nesta ordem:

```bash
npm run android:sincronizar
npm run verificar:android-gestao
cd android && ./gradlew bundleRelease
```

O AAB final fica em `android/app/build/outputs/bundle/release/`. Antes de
enviar, conferir assinatura de release, `versionCode` maior que o último do
Console e os fluxos: login social, microfone da Ava, foto de nota, notificações
com o aplicativo fechado, Pessoal Premium e exclusão de perfil/usuário.

## Exclusões

- **Configurações > Excluir este perfil** exclui somente o perfil atual, com
  retenção e possibilidade de restauração por 30 dias; o login permanece.
- **Usuários > Excluir usuário** remove o acesso daquele usuário à empresa. Se
  o login foi criado internamente e não possui outro vínculo ou histórico, ele
  também é removido definitivamente.

Essas ações não devem ser confundidas nem unificadas durante a adaptação
nativa.
