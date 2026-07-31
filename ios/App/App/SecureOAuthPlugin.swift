import AuthenticationServices
import Capacitor
import UIKit

@objc(SecureOAuthPlugin)
public class SecureOAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "SecureOAuthPlugin"
    public let jsName = "SecureOAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)
    ]

    private var authenticationSession: ASWebAuthenticationSession?

    @objc func open(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString) else {
            call.reject("URL de autenticação inválida.", "INVALID_URL")
            return
        }
        guard let callbackScheme = call.getString("callbackScheme"), !callbackScheme.isEmpty else {
            call.reject("Esquema de retorno inválido.", "INVALID_CALLBACK_SCHEME")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Não foi possível iniciar a autenticação.", "AUTH_SESSION_UNAVAILABLE")
                return
            }

            self.authenticationSession?.cancel()
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { [weak self] callbackURL, error in
                self?.authenticationSession = nil

                if let authenticationError = error as? ASWebAuthenticationSessionError,
                   authenticationError.code == .canceledLogin {
                    call.reject("Login cancelado pelo usuário.", "USER_CANCELED", authenticationError)
                    return
                }
                if let error {
                    call.reject("Não foi possível concluir o login social.", "AUTH_SESSION_FAILED", error)
                    return
                }
                guard let callbackURL else {
                    call.reject("O provedor não retornou uma URL de conclusão.", "MISSING_CALLBACK_URL")
                    return
                }

                call.resolve(["callbackUrl": callbackURL.absoluteString])
            }

            session.presentationContextProvider = self
            // Compartilha as contas já autenticadas no Safari, como esperado pelo usuário.
            session.prefersEphemeralWebBrowserSession = false
            self.authenticationSession = session

            if !session.start() {
                self.authenticationSession = nil
                call.reject("Não foi possível apresentar a janela segura de login.", "AUTH_SESSION_START_FAILED")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let window = bridge?.viewController?.view.window {
            return window
        }
        return UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}

