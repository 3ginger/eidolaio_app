# iOS Native OAuth Debug Log

## Problem Statement
After authenticating in the browser (via ASWebAuthenticationSession), the OAuth callback never returns to the app. The browser stays open after successful login.

---

## Attempted Solutions Log

### Attempt 1: Direct Custom URL Scheme (Original)
**Date**: Before current session
**Approach**:
- Used `redirectUrl: 'eidola://oauth-callback'` in signIn.create()
- ASWebAuthenticationSession with `callbackURLScheme: 'eidola'`

**Result**: FAILED - Browser stayed open after OAuth

**Why it failed**: The custom URL scheme was NOT added to Clerk Dashboard's "Allowlist for mobile SSO redirect". Clerk silently ignores unregistered redirect URLs.

---

### Attempt 2: Server-Side HTTP Redirect
**Date**: 2026-02-02
**Approach**:
- Changed `redirectUrl` to `https://api.eidola.io/api/native-oauth-callback`
- Added API endpoint that returns HTTP 302 redirect to `eidola://oauth-callback`
- Expected ASWebAuthenticationSession to follow the redirect and capture the custom scheme

**Result**: FAILED - Browser stayed open after OAuth

**Why it failed**:
ASWebAuthenticationSession does NOT work with HTTP redirects to custom URL schemes. According to Apple Developer Forums and OAuth documentation:
- ASWebAuthenticationSession only captures URLs that **directly** match the `callbackURLScheme`
- When an HTTP 302 redirect returns a custom URL scheme, the browser follows it internally but ASWebAuthenticationSession doesn't recognize it as the callback
- The session just stays open because it never sees a matching URL

**Evidence**:
- Apple Developer Forums: "If you need to redirect back to your app with an http(s) URL from an external user agent, you'll need to use Universal Links. You will also need to manually cancel your ASWebAuthenticationSession, as it will not complete on an http(s) redirection."
- Source: https://developer.apple.com/forums/thread/658334

---

### Attempt 3: Native Plugin with Direct Custom Scheme (Build 32) ✅ READY FOR TESTING
**Date**: 2026-02-02
**Approach**:
- Fixed `NativeOAuthButtons.tsx` to use the native `NativeAuthPlugin` directly
- Uses `signIn.create()` with `redirectUrl: 'eidola://oauth-callback'`
- Then calls `NativeAuth.authenticate()` for ASWebAuthenticationSession
- After callback, calls `signIn.reload()` and `setActive()`

**Code Flow**:
```typescript
// 1. Create sign-in with custom scheme redirect
const result = await signIn.create({
  strategy,
  redirectUrl: 'eidola://oauth-callback',
  actionCompleteRedirectUrl: 'eidola://oauth-callback'
})

// 2. Get OAuth URL from Clerk
const authUrl = result.firstFactorVerification?.externalVerificationRedirectURL

// 3. Open in ASWebAuthenticationSession via native plugin
const { url: callbackUrl } = await NativeAuth.authenticate({
  url: authUrl.toString(),
  callbackURLScheme: 'eidola'
})

// 4. Complete sign-in
await signIn.reload()
if (signIn.status === 'complete') {
  await setActive({ session: signIn.createdSessionId })
  navigate('/feed', { replace: true })
}
```

**Status**: ✅ DEPLOYED - Build 32 on TestFlight

**Clerk Dashboard Configuration**: ✅ VERIFIED
Checked Clerk Dashboard → Native applications → "Allowlist for mobile SSO redirect"
The following redirect URLs are already configured:
- `eidola://oauth-callback` ✅
- `eidola://oauth-complete`
- `eidola://sso-callback`
- `https://eidola.io/sso-callback`
- `io.eidola.app://callback`

---

## Root Cause Analysis

### The OAuth Flow with ASWebAuthenticationSession

```
1. App calls signIn.create() with redirectUrl
2. Clerk returns externalVerificationRedirectURL (e.g., Google OAuth URL)
3. App opens URL in ASWebAuthenticationSession with callbackURLScheme: 'eidola'
4. User authenticates with Google
5. Google redirects to Clerk's domain
6. Clerk redirects to YOUR redirectUrl
7. ASWebAuthenticationSession ONLY captures if redirectUrl starts with 'eidola://'
```

### Critical Finding: ASWebAuthenticationSession Behavior

ASWebAuthenticationSession monitors navigation events. When it sees a URL that matches the `callbackURLScheme`, it:
1. Cancels the session
2. Returns the URL to your callback handler

**What it does NOT do:**
- Follow HTTP redirects and then check the resulting URL
- Capture custom URL schemes that are the result of HTTP 302 redirects
- Handle any HTTPS redirects (even with Universal Links)

### Clerk's Requirements

Clerk requires redirect URLs to be whitelisted in the Dashboard:
- Location: Dashboard → Native applications → "Allowlist for mobile SSO redirect"
- Default format: `<YOUR-SCHEME>://sso-callback`
- Purpose: Security - Clerk only passes security-critical nonces to allowlisted URLs

---

## Correct Solution (Implemented ✅)

### Why This Works

1. **Clerk explicitly supports custom URL schemes for native apps**
   - Documented at: https://clerk.com/docs/deployments/deploy-expo
   - Has dedicated "Allowlist for mobile SSO redirect" section

2. **ASWebAuthenticationSession captures direct custom scheme URLs**
   - This is the documented behavior from Apple
   - Example: If Clerk redirects to `eidola://oauth-callback?code=xxx`, ASWebAuthenticationSession will capture it

3. **The URL format `scheme://sso-callback` is Clerk's default**
   - This matches what Clerk expects and has tested

### Implementation (Completed 2026-02-02)

#### Step 1: Clerk Dashboard ✅
Verified `eidola://oauth-callback` is in Clerk Dashboard allowlist at:
**Configure → Developers → Native applications → "Allowlist for mobile SSO redirect"**

#### Step 2: Code Updated ✅
`client/src/components/auth/NativeOAuthButtons.tsx` now:
- Uses `signIn.create()` with `redirectUrl: 'eidola://oauth-callback'`
- Calls native `NativeAuth.authenticate()` plugin for ASWebAuthenticationSession
- Handles callback with `signIn.reload()` and `setActive()`
- Falls back to redirect-based OAuth with `?native=true` if plugin unavailable

#### Step 3: Deployed ✅
- Web app: Vercel (eidola.io)
- iOS app: TestFlight Build 32

---

## Verification Checklist

### Pre-deployment (All Complete ✅)
- [x] `eidola://oauth-callback` is in Clerk Dashboard allowlist
- [x] `redirectUrl` in code matches exactly what's in allowlist
- [x] Info.plist has `eidola` in CFBundleURLSchemes
- [x] NativeAuthPlugin.swift uses `callbackURLScheme: 'eidola'`
- [x] Web app deployed to Vercel (eidola.io)
- [x] iOS app deployed to TestFlight (Build 32)

### Post-deployment Testing (Pending)
- [ ] Tap OAuth button → system browser modal opens (NOT Safari/Chrome)
- [ ] Complete authentication with Apple/Google
- [ ] Browser modal closes automatically
- [ ] App receives callback URL
- [ ] signIn.reload() returns complete status
- [ ] User navigates to /feed
- [ ] No external browser left open

---

### Build 41: Global Debug Trigger + Sentry
**Date**: 2026-02-02
**Changes**:
- Global triple-tap zone in top-left corner (works on ANY screen, not tied to Header)
- Sentry error tracking integration for production error monitoring
- Clerk loading timeout (10s) logs critical error to console and Sentry
- Removed Header-based debug trigger (now global)

**Files Changed**:
- `client/src/components/debug/GlobalDebugTrigger.tsx` (NEW)
- `client/src/main.tsx` - Added GlobalDebugTrigger at root, Sentry init
- `client/src/App.tsx` - Added Sentry ErrorBoundary, Clerk timeout logging
- `client/src/utils/api.ts` - Report API errors to Sentry
- `client/src/components/layout/Header.tsx` - Removed triple-tap code

**Why This Helps**:
The previous debug console required triple-tapping the logo in Header, but Header is inside ProtectedRoute. When Clerk is stuck loading (isLoaded=false forever), Header never renders, making the debug console inaccessible.

The new GlobalDebugTrigger is rendered at the root level in main.tsx, OUTSIDE all routes and providers. It has z-[200] so it's always on top. Triple-tapping the 80x80px invisible zone in the top-left corner opens the debug console, regardless of what screen the app is stuck on.

**Result**: PENDING TEST

---

### Attempt 5: Fix WKScriptMessageHandler Registration Timing (Build 51)
**Date**: 2026-02-03
**Problem**: `window.webkit.messageHandlers.startOAuth` is `undefined` in JS despite the handler being registered in Swift.

**Root Cause**:
The `startOAuth` message handler was being added in `capacitorDidLoad()`, which runs **after** the WKWebView is already created. In Capacitor's lifecycle:
1. `prepareWebView()` → creates `WKWebViewConfiguration` → instantiates `WKWebView`
2. `capacitorDidLoad()` → called AFTER webview exists

WKWebView's `userContentController` message handlers must be added to the configuration **before** the WKWebView is instantiated. Adding them to `webView.configuration.userContentController` after creation has no effect — the handlers never appear in `window.webkit.messageHandlers`.

**Fix**:
Override `webViewConfiguration(for:)` instead of `capacitorDidLoad()`. This method is called by Capacitor **before** the WKWebView is created, so the handler is part of the configuration used to instantiate the webview.

```swift
// BEFORE (broken - too late):
override open func capacitorDidLoad() {
    super.capacitorDidLoad()
    if let webView = self.webView {
        webView.configuration.userContentController.add(self, name: "startOAuth")
    }
}

// AFTER (correct - pre-creation):
override open func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
    let config = super.webViewConfiguration(for: instanceConfiguration)
    config.userContentController.add(self, name: "startOAuth")
    return config
}
```

**Files Changed**:
- `client/ios/App/App/EidolaViewController.swift` — Moved handler registration from `capacitorDidLoad()` to `webViewConfiguration(for:)`

**Result**: PENDING TEST

---

### Attempt 6: Fix WKScriptMessageHandler — Correct Hook Point (Build 52+)
**Date**: 2026-02-03
**Problem**: Attempt 5 registered the handler in `webViewConfiguration(for:)`, but Capacitor's `prepareWebView()` replaces `userContentController` AFTER that call:

```
296: let webConfig = webViewConfiguration(for: configuration)  ← handler added here
298: webConfig.userContentController = delegationHandler.contentController  ← REPLACES IT
300: let aWebView = webView(with: .zero, configuration: webConfig)
```

Our handler was added at line 296, then thrown away at line 298.

**Fix**:
Override `webView(with:configuration:)` instead. This is called at line 300 — AFTER the `userContentController` replacement, BEFORE `WKWebView` is instantiated. The configuration passed to this method has Capacitor's final `userContentController` (the one with the "bridge" handler), so our handler is added to the same controller that actually ends up in the webview.

```swift
// BEFORE (broken — handler replaced before WKWebView creation):
override open func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
    let config = super.webViewConfiguration(for: instanceConfiguration)
    config.userContentController.add(self, name: "startOAuth")
    return config
}

// AFTER (correct — added after replacement, before WKWebView init):
override open func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
    configuration.userContentController.add(self, name: "startOAuth")
    let diagnostic = WKUserScript(
        source: "console.log('[EidolaVC] startOAuth handler available:', !!window.webkit?.messageHandlers?.startOAuth);",
        injectionTime: .atDocumentEnd,
        forMainFrameOnly: true
    )
    configuration.userContentController.addUserScript(diagnostic)
    return super.webView(with: frame, configuration: configuration)
}
```

Also added a diagnostic `WKUserScript` that logs to JS console at document end whether the handler is available.

**Files Changed**:
- `client/ios/App/App/EidolaViewController.swift` — Changed override from `webViewConfiguration(for:)` to `webView(with:configuration:)`

**Verification Steps**:
1. Build in Xcode → check console for `[EidolaVC] Registered startOAuth on userContentController (pre-WKWebView init)`
2. Check Safari Web Inspector console for `[EidolaVC] startOAuth handler available: true`
3. In Safari JS console: `typeof window.webkit?.messageHandlers?.startOAuth` → should be `"object"`
4. Navigate to `/native-login`, tap OAuth button → system auth sheet should open

**Result**: PENDING TEST

---

## References

- [Clerk: Deploy Expo App](https://clerk.com/docs/deployments/deploy-expo) - Mobile redirect URL allowlist
- [Clerk: Customize Redirect URLs](https://clerk.com/docs/guides/development/customize-redirect-urls) - URL format docs
- [Apple Developer Forums: ASWebAuthenticationSession](https://developer.apple.com/forums/thread/658334) - HTTP redirect limitations
- [OAuth.com: Redirect URIs for Native Apps](https://www.oauth.com/oauth2-servers/redirect-uris/redirect-uris-native-apps/) - Best practices
- [DEV: Expo + Clerk + iOS OAuth](https://dev.to/cathylai/login-with-google-oauth-using-expo-clerk-and-ios-finally-demystified-1io6) - Complete guide
