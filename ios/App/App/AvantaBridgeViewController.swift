import Capacitor

@objc(AvantaBridgeViewController)
class AvantaBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginType(SecureOAuthPlugin.self)
    }
}

