import Foundation
import Capacitor
import AuthenticationServices

@objc(NativeAuthPlugin)
public class NativeAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "NativeAuthPlugin"
    public let jsName = "NativeAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    private var authSession: ASWebAuthenticationSession?

    /// Opens ASWebAuthenticationSession for OAuth authentication
    /// - Parameters:
    ///   - url: The OAuth authorization URL
    ///   - callbackURLScheme: The URL scheme to listen for (e.g., "eidola")
    /// - Returns: The full callback URL with OAuth tokens/codes
    @objc func authenticate(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.reject("Invalid URL provided")
            return
        }

        guard let callbackURLScheme = call.getString("callbackURLScheme") else {
            call.reject("callbackURLScheme is required")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.authSession = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackURLScheme
            ) { callbackURL, error in
                if let error = error {
                    // Check if user cancelled
                    if (error as NSError).code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        call.reject("User cancelled authentication", "USER_CANCELLED")
                    } else {
                        call.reject("Authentication failed: \(error.localizedDescription)")
                    }
                    return
                }

                guard let callbackURL = callbackURL else {
                    call.reject("No callback URL received")
                    return
                }

                // Return the full callback URL to JavaScript
                call.resolve([
                    "url": callbackURL.absoluteString
                ])
            }

            // Required for iOS 13+
            self.authSession?.presentationContextProvider = self

            // Prefer ephemeral session (no shared cookies) for better privacy
            // Set to false if you need SSO with Safari
            self.authSession?.prefersEphemeralWebBrowserSession = false

            // Start the authentication session
            if self.authSession?.start() != true {
                call.reject("Failed to start authentication session")
            }
        }
    }

    // MARK: - ASWebAuthenticationPresentationContextProviding

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Return the app's main window as the anchor for the auth sheet
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first(where: { $0.isKeyWindow }) {
            return window
        }
        return ASPresentationAnchor()
    }
}
