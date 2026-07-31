import Capacitor

// O Capacitor registra PurchasesPlugin pela packageClassList gerada no sync.
// Manter somente o controlador referenciado pelo storyboard evita registro
// duplicado e preserva a descoberta automática dos plugins nativos.
final class MainViewController: CAPBridgeViewController {}
