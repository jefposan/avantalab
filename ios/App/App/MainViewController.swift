import Capacitor
import RevenuecatPurchasesCapacitor

/**
 * Garante que o plugin de compras esteja disponível na ponte Capacitor.
 *
 * Em alguns builds com Swift Package Manager, o framework é incluído, mas a
 * classe Objective-C não é descoberta automaticamente pela lista gerada pelo
 * Capacitor. O fallback abaixo evita o falso "plugin is not implemented" sem
 * duplicar o registro quando a descoberta automática funcionar.
 */
final class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        guard bridge?.plugin(withName: "Purchases") == nil else { return }
        bridge?.registerPluginInstance(PurchasesPlugin())
    }
}
