import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.eidola.app',
  appName: 'Eidola',
  webDir: 'dist',
  // Load from production URL to fix Clerk CORS issues on iOS
  // (capacitor://localhost origin is blocked by Clerk)
  // NOTE: With server.url, Capacitor.isNativePlatform() returns false,
  // so we use path-based detection in nativeAuth.ts instead
  // Using /native path instead of ?native=true query param because
  // WKWebView may strip query params from the initial URL
  server: {
    url: 'https://eidola.io/native',
    cleartext: false
  },
  ios: {
    // Allow inline media playback
    allowsLinkPreview: true,
    // Disable native WKWebView scrolling so CSS fixed positioning works correctly
    // (web content handles its own scrolling via CSS overflow)
    scrollEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#f8f6f3', // eidola-bg color
      androidSplashResourceName: 'splash',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'light', // light text on dark background
      backgroundColor: '#ff8c42', // eidola-orange
    },
    Camera: {
      // iOS requires these permissions
    },
    Geolocation: {
      // iOS requires these permissions
    },
  },
};

export default config;
