import NativeOAuthButtons from '../components/auth/NativeOAuthButtons'

/**
 * Native login page with Eidola branding
 * Shown to unauthenticated users in the native iOS app
 * Uses ASWebAuthenticationSession for OAuth (system browser modal)
 */
export default function NativeLoginPage() {
  return (
    <div className="min-h-screen bg-eidola-bg relative overflow-hidden">
      {/* Gradient background - matching LandingPage style */}
      <div className="absolute inset-0 bg-gradient-to-br from-eidola-orange/20 via-eidola-magenta/20 to-eidola-teal/20" />

      {/* Animated shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-eidola-orange/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 -right-20 w-96 h-96 bg-eidola-magenta/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-eidola-teal/30 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo */}
        <img
          src="/logo-with-title.png"
          alt="Eidola"
          className="h-40 w-auto drop-shadow-xl mb-8"
        />

        {/* Welcome text */}
        <h1 className="text-3xl font-bold text-center text-eidola-text mb-3">
          Welcome to Eidola
        </h1>
        <p className="text-lg text-center text-gray-600 max-w-sm mb-10">
          Share the faces and patterns you see in everyday objects
        </p>

        {/* OAuth buttons */}
        <NativeOAuthButtons />

        {/* Footer text */}
        <p className="text-sm text-gray-500 text-center mt-8 max-w-xs">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
