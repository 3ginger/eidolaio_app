import UIKit
import WebKit
import Capacitor
import AuthenticationServices

class EidolaViewController: CAPBridgeViewController, WKScriptMessageHandler, ASWebAuthenticationPresentationContextProviding {

    private var authSession: ASWebAuthenticationSession?

    override open func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        configuration.limitsNavigationsToAppBoundDomains = true
        print("[EidolaVC] Set limitsNavigationsToAppBoundDomains = true")

        configuration.userContentController.add(self, name: "startOAuth")
        print("[EidolaVC] Registered startOAuth on userContentController (pre-WKWebView init)")

        let diagnostic = WKUserScript(
            source: "console.log('[EidolaVC] startOAuth handler available:', !!window.webkit?.messageHandlers?.startOAuth);",
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        configuration.userContentController.addUserScript(diagnostic)

        return super.webView(with: frame, configuration: configuration)
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "startOAuth" else { return }

        print("[EidolaVC] Received startOAuth message")

        guard let body = message.body as? [String: Any],
              let urlString = body["url"] as? String,
              let url = URL(string: urlString) else {
            print("[EidolaVC] ERROR: Invalid message body, expected {url: string}")
            sendCallbackToJS(success: false, error: "Invalid URL provided")
            return
        }

        let callbackHost = (body["callbackHost"] as? String) ?? "eidola.io"
        let callbackPath = (body["callbackPath"] as? String) ?? "/sso-callback"
        print("[EidolaVC] URL: \(urlString.prefix(100))...")
        print("[EidolaVC] callback: https://\(callbackHost)\(callbackPath)")

        startAuthSession(url: url, callbackHost: callbackHost, callbackPath: callbackPath)
    }

    // MARK: - ASWebAuthenticationSession

    private func startAuthSession(url: URL, callbackHost: String, callbackPath: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.launchAuthSession(url: url, callbackHost: callbackHost, callbackPath: callbackPath)
        }
    }

    private func launchAuthSession(url: URL, callbackHost: String, callbackPath: String) {
        print("[EidolaVC] Creating ASWebAuthenticationSession with HTTPS callback...")

        if #available(iOS 17.4, *) {
            let callback = ASWebAuthenticationSession.Callback.https(host: callbackHost, path: callbackPath)
            self.authSession = ASWebAuthenticationSession(
                url: url,
                callback: callback
            ) { [weak self] callbackURL, error in
                self?.handleAuthResult(callbackURL: callbackURL, error: error)
            }
        } else {
            // Fallback for older iOS: use custom URL scheme
            self.authSession = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: "eidola"
            ) { [weak self] callbackURL, error in
                self?.handleAuthResult(callbackURL: callbackURL, error: error)
            }
        }

        self.authSession?.presentationContextProvider = self
        self.authSession?.prefersEphemeralWebBrowserSession = false

        print("[EidolaVC] Starting auth session...")
        if self.authSession?.start() == true {
            print("[EidolaVC] Auth session started successfully")
        } else {
            print("[EidolaVC] ERROR: Failed to start auth session")
            self.sendCallbackToJS(success: false, error: "Failed to start authentication session")
        }
    }

    private func handleAuthResult(callbackURL: URL?, error: Error?) {
        if let error = error {
            let nsError = error as NSError
            if nsError.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                print("[EidolaVC] User cancelled authentication")
                sendCallbackToJS(success: false, error: "USER_CANCELLED")
            } else {
                print("[EidolaVC] Auth error: \(error.localizedDescription)")
                sendCallbackToJS(success: false, error: error.localizedDescription)
            }
            return
        }

        guard let callbackURL = callbackURL else {
            print("[EidolaVC] ERROR: No callback URL received")
            sendCallbackToJS(success: false, error: "No callback URL received")
            return
        }

        print("[EidolaVC] SUCCESS! Callback URL: \(callbackURL.absoluteString.prefix(200))...")
        sendCallbackToJS(success: true, url: callbackURL.absoluteString)
    }

    // MARK: - JS Callback via evaluateJavaScript

    private func sendCallbackToJS(success: Bool, url: String? = nil, error: String? = nil) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let webView = self.webView else { return }

            let urlValue = url != nil ? "'\(url!.replacingOccurrences(of: "'", with: "\\'"))'" : "null"
            let errorValue = error != nil ? "'\(error!.replacingOccurrences(of: "'", with: "\\'"))'" : "null"

            let js = """
            (function() {
                var event = new CustomEvent('nativeOAuthCallback', {
                    detail: { success: \(success), url: \(urlValue), error: \(errorValue) }
                });
                window.dispatchEvent(event);
            })();
            """

            print("[EidolaVC] Dispatching nativeOAuthCallback event to JS (success: \(success))")
            webView.evaluateJavaScript(js) { _, evalError in
                if let evalError = evalError {
                    print("[EidolaVC] JS evaluation error: \(evalError)")
                } else {
                    print("[EidolaVC] JS callback dispatched successfully")
                }
            }
        }
    }

    // MARK: - ASWebAuthenticationPresentationContextProviding

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first(where: { $0.isKeyWindow }) {
            return window
        }
        return ASPresentationAnchor()
    }
}
