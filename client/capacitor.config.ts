import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.eidola.app',
  appName: 'Eidola',
  webDir: 'dist',
  server: {
    // Load from production URL so Clerk auth works
    // (Clerk production keys only work on approved domains)
    url: 'https://eidola.io',
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    // Allow inline media playback
    allowsLinkPreview: true,
    scrollEnabled: true,
    // Content inset adjustment for safe areas
    contentInset: 'automatic',
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
