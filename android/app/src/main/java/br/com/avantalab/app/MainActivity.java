package br.com.avantalab.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void load() {
        // Acrescentar depois da lista automática para substituir o plugin
        // padrão pela versão que transforma erros de configuração em rejeição.
        registerPlugin(SafePushNotificationsPlugin.class);
        registerPlugin(AvantaPushSupportPlugin.class);
        super.load();
    }
}
