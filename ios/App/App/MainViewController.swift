import Capacitor
import UIKit

@objc(NativeBadgePlugin)
final class NativeBadgePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "NativeBadgePlugin"
    let jsName = "NativeBadge"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
    ]

    @objc func set(_ call: CAPPluginCall) {
        let count = max(0, call.getInt("count", 0))
        DispatchQueue.main.async {
            UIApplication.shared.applicationIconBadgeNumber = count
            call.resolve(["count": count])
        }
    }
}

// O Capacitor registra PurchasesPlugin pela packageClassList gerada no sync.
// Manter somente o controlador referenciado pelo storyboard evita registro
// duplicado e preserva a descoberta automática dos plugins nativos.
final class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginType(NativeBadgePlugin.self)
    }
}
