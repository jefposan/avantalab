package br.com.avantalab.app;

import android.Manifest;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "PushNotifications",
    permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "receive")
)
public class SafePushNotificationsPlugin extends PushNotificationsPlugin {
    @Override
    @PluginMethod
    public void register(PluginCall call) {
        if (!AvantaPushSupportPlugin.isConfigured(getContext())) {
            call.reject("As notificações estão temporariamente indisponíveis neste aplicativo.", "PUSH_UNAVAILABLE");
            return;
        }
        try {
            super.register(call);
        } catch (RuntimeException error) {
            // Uma falha do Firebase não pode escapar para CapacitorPlugins e
            // encerrar a Gestão. O JavaScript recebe uma rejeição tratável.
            call.reject("Não foi possível ativar as notificações. Você pode continuar usando a Gestão.", "PUSH_UNAVAILABLE");
        }
    }

    @Override
    @PluginMethod
    public void unregister(PluginCall call) {
        if (!AvantaPushSupportPlugin.isConfigured(getContext())) {
            call.resolve();
            return;
        }
        try {
            super.unregister(call);
        } catch (RuntimeException error) {
            call.reject("Não foi possível atualizar as notificações neste momento.", "PUSH_UNAVAILABLE");
        }
    }
}
