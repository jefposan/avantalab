package br.com.avantalab.app;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AvantaPushSupport")
public class AvantaPushSupportPlugin extends Plugin {
    static boolean isConfigured(Context context) {
        int appId = context.getResources().getIdentifier("google_app_id", "string", context.getPackageName());
        return appId != 0 && !context.getString(appId).trim().isEmpty();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", isConfigured(getContext()));
        call.resolve(result);
    }
}
